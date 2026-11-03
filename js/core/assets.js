import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('vendor/three-0.170.0/draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const decodesOffThread = typeof createImageBitmap === 'function'
    && !/^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const bitmapLoader = decodesOffThread ? new THREE.ImageBitmapLoader() : null;
const texLoader = new THREE.TextureLoader();
const cache = new Map();

function once(key, load) {
    if (!cache.has(key)) {
        const pending = load();
        pending.catch(() => cache.delete(key));
        cache.set(key, pending);
    }
    return cache.get(key);
}

export function loadModel(url) {
    return once(url, () => new Promise((resolve, reject) => {
        gltfLoader.load(url, (gltf) => resolve(gltf), undefined, reject);
    }));
}

function loadLabelImage(url) {
    return new Promise((resolve, reject) => {
        if (bitmapLoader) {
            bitmapLoader.load(url, (bitmap) => {
                const tex = new THREE.Texture(bitmap);
                tex.needsUpdate = true;
                resolve(tex);
            }, undefined, reject);
        } else {
            texLoader.load(url, resolve, undefined, reject);
        }
    });
}

export function loadTexture(url) {
    return once(`tex:${url}`, async () => {
        const tex = await loadLabelImage(url);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = false;
        tex.anisotropy = 8;
        return tex;
    });
}

export function collectMeshes(root) {
    const meshes = [];
    root.traverse((child) => {
        if (child.isMesh) meshes.push(child);
    });
    return meshes;
}
