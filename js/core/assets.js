import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://unpkg.com/three@0.170.0/examples/jsm/libs/draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const texLoader = new THREE.TextureLoader();
const cache = new Map();

export function loadModel(url) {
    if (!cache.has(url)) {
        cache.set(url, new Promise((resolve, reject) => {
            gltfLoader.load(url, (gltf) => resolve(gltf), undefined, reject);
        }));
    }
    return cache.get(url);
}

export function loadTexture(url) {
    const key = `tex:${url}`;
    if (!cache.has(key)) {
        cache.set(key, new Promise((resolve, reject) => {
            texLoader.load(url, (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.flipY = false;
                tex.anisotropy = 8;
                resolve(tex);
            }, undefined, reject);
        }));
    }
    return cache.get(key);
}

export function collectMeshes(root) {
    const meshes = [];
    root.traverse((child) => {
        if (child.isMesh) meshes.push(child);
    });
    return meshes;
}
