import { renderer } from './stage.js';
import { onFrame } from './loop.js';
import { compileForComposer } from './post.js';
import { loadBlueLabel } from './can.js';
import { loadBlueberries, blueberryMaterials } from './berries.js';

const MATERIAL_MAPS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap'];

let downloading = null;
let warming = null;

function nextFrame() {
    return new Promise((resolve) => {
        const stop = onFrame(() => {
            stop();
            resolve();
        });
    });
}

async function download() {
    const [label, berries] = await Promise.all([loadBlueLabel(), loadBlueberries()]);
    return { label, berries };
}

async function warm({ label, berries }) {
    const maps = new Set([label]);
    for (const material of blueberryMaterials()) {
        for (const slot of MATERIAL_MAPS) if (material[slot]) maps.add(material[slot]);
    }
    for (const map of maps) {
        await nextFrame();
        renderer.initTexture(map);
    }
    await nextFrame();
    await compileForComposer(berries);
}

export function fetchBlue() {
    downloading ??= download().catch((err) => {
        downloading = null;
        throw err;
    });
    return downloading;
}

export function warmBlue() {
    warming ??= fetchBlue().then(warm).catch((err) => {
        warming = null;
        throw err;
    });
    return warming;
}

export function flavorReady(flavor) {
    return flavor === 'blue' ? warmBlue() : Promise.resolve();
}
