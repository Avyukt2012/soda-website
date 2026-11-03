import { readFileSync } from 'node:fs';

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

export function readGlb(bytes) {
    const buffer = Buffer.isBuffer(bytes) ? bytes : readFileSync(bytes);
    if (buffer.readUInt32LE(0) !== GLB_MAGIC) throw new Error('not a GLB');
    const jsonLength = buffer.readUInt32LE(12);
    const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
    const bin = buffer.subarray(20 + jsonLength + 8);
    const views = json.bufferViews.map((view) => {
        const start = view.byteOffset ?? 0;
        return bin.subarray(start, start + view.byteLength);
    });
    return { json, views };
}

const pad = (buffer, fill) => {
    const padding = (4 - (buffer.length % 4)) % 4;
    return padding ? Buffer.concat([buffer, Buffer.alloc(padding, fill)]) : buffer;
};

export function writeGlb({ json, views }) {
    let offset = 0;
    const parts = [];
    json.bufferViews = json.bufferViews.map((view, index) => {
        const next = { ...view, byteOffset: offset };
        const bytes = pad(views[index], 0);
        parts.push(bytes);
        offset += bytes.length;
        return next;
    });
    const bin = Buffer.concat(parts);
    json.buffers = [{ byteLength: bin.length }];
    const jsonBytes = pad(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
    const header = Buffer.alloc(12);
    header.writeUInt32LE(GLB_MAGIC, 0);
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(12 + 8 + jsonBytes.length + 8 + bin.length, 8);
    const chunk = (type, body) => {
        const head = Buffer.alloc(8);
        head.writeUInt32LE(body.length, 0);
        head.writeUInt32LE(type, 4);
        return Buffer.concat([head, body]);
    };
    return Buffer.concat([header, chunk(JSON_CHUNK, jsonBytes), chunk(BIN_CHUNK, bin)]);
}

const remapper = (used) => {
    const order = [...used].sort((a, b) => a - b);
    const map = new Map(order.map((oldIndex, newIndex) => [oldIndex, newIndex]));
    return { order, of: (index) => map.get(index) };
};

const textureSlots = (material) => [
    material.pbrMetallicRoughness?.baseColorTexture,
    material.pbrMetallicRoughness?.metallicRoughnessTexture,
    material.normalTexture,
    material.occlusionTexture,
    material.emissiveTexture,
].filter(Boolean);

const imageOf = (texture) => texture.extensions?.EXT_texture_webp?.source ?? texture.source;

export function keepDefaultSceneOnly({ json, views }) {
    const scene = json.scenes[json.scene ?? 0];
    const nodes = new Set();
    const walk = (index) => {
        nodes.add(index);
        (json.nodes[index].children ?? []).forEach(walk);
    };
    (scene.nodes ?? []).forEach(walk);

    const meshes = new Set([...nodes].map((index) => json.nodes[index].mesh).filter((mesh) => mesh !== undefined));
    const primitives = [...meshes].flatMap((index) => json.meshes[index].primitives);
    const materials = new Set(primitives.map((primitive) => primitive.material).filter((material) => material !== undefined));
    const textures = new Set([...materials].flatMap((index) => textureSlots(json.materials[index]).map((slot) => slot.index)));
    const images = new Set([...textures].map((index) => imageOf(json.textures[index])));
    const accessors = new Set(primitives.flatMap((primitive) => [
        ...Object.values(primitive.attributes),
        ...(primitive.indices === undefined ? [] : [primitive.indices]),
    ]));
    const bufferViews = new Set([
        ...[...images].map((index) => json.images[index].bufferView),
        ...[...accessors].map((index) => json.accessors[index].bufferView).filter((view) => view !== undefined),
        ...primitives.map((primitive) => primitive.extensions?.KHR_draco_mesh_compression?.bufferView).filter((view) => view !== undefined),
    ]);

    const nodeMap = remapper(nodes);
    const meshMap = remapper(meshes);
    const materialMap = remapper(materials);
    const textureMap = remapper(textures);
    const imageMap = remapper(images);
    const accessorMap = remapper(accessors);
    const viewMap = remapper(bufferViews);

    const out = { ...json };
    out.scene = 0;
    out.scenes = [{ ...scene, nodes: (scene.nodes ?? []).map(nodeMap.of) }];
    out.nodes = nodeMap.order.map((index) => {
        const node = { ...json.nodes[index] };
        if (node.children) node.children = node.children.map(nodeMap.of);
        if (node.mesh !== undefined) node.mesh = meshMap.of(node.mesh);
        return node;
    });
    out.meshes = meshMap.order.map((index) => ({
        ...json.meshes[index],
        primitives: json.meshes[index].primitives.map((primitive) => {
            const next = {
                ...primitive,
                attributes: Object.fromEntries(Object.entries(primitive.attributes).map(([key, value]) => [key, accessorMap.of(value)])),
            };
            if (next.indices !== undefined) next.indices = accessorMap.of(next.indices);
            if (next.material !== undefined) next.material = materialMap.of(next.material);
            const draco = next.extensions?.KHR_draco_mesh_compression;
            if (draco) next.extensions = { ...next.extensions, KHR_draco_mesh_compression: { ...draco, bufferView: viewMap.of(draco.bufferView) } };
            return next;
        }),
    }));
    out.materials = materialMap.order.map((index) => {
        const material = structuredClone(json.materials[index]);
        textureSlots(material).forEach((slot) => { slot.index = textureMap.of(slot.index); });
        return material;
    });
    out.textures = textureMap.order.map((index) => {
        const texture = structuredClone(json.textures[index]);
        if (texture.extensions?.EXT_texture_webp) texture.extensions.EXT_texture_webp.source = imageMap.of(texture.extensions.EXT_texture_webp.source);
        else texture.source = imageMap.of(texture.source);
        return texture;
    });
    out.images = imageMap.order.map((index) => ({ ...json.images[index], bufferView: viewMap.of(json.images[index].bufferView) }));
    out.accessors = accessorMap.order.map((index) => {
        const accessor = { ...json.accessors[index] };
        if (accessor.bufferView !== undefined) accessor.bufferView = viewMap.of(accessor.bufferView);
        return accessor;
    });
    out.bufferViews = viewMap.order.map((index) => json.bufferViews[index]);
    return { json: out, views: viewMap.order.map((index) => views[index]) };
}

export function replaceImage({ json, views }, imageIndex, bytes, mimeType = 'image/webp') {
    const viewIndex = json.images[imageIndex].bufferView;
    views[viewIndex] = bytes;
    json.bufferViews[viewIndex] = { ...json.bufferViews[viewIndex], byteLength: bytes.length };
    json.images[imageIndex] = { ...json.images[imageIndex], mimeType };
}

export function useWebpTextures({ json }) {
    json.textures.forEach((texture) => {
        if (texture.source === undefined) return;
        texture.extensions = { ...texture.extensions, EXT_texture_webp: { source: texture.source } };
        delete texture.source;
    });
    for (const list of ['extensionsUsed', 'extensionsRequired']) {
        json[list] = [...new Set([...(json[list] ?? []), 'EXT_texture_webp'])];
    }
}
