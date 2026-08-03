import * as THREE from 'three';
import { ASSETS, MOTION, STAGE } from '../config.js';
import { loadModel, loadTexture, collectMeshes } from './assets.js';
import { scene, camera } from './stage.js';
import { damp, onFrame } from './loop.js';

export const canRig = new THREE.Group();
export const canPivot = new THREE.Group();
canRig.add(canPivot);
scene.add(canRig);

const state = {
    mouseX: 0,
    mouseY: 0,
    smoothX: 0,
    smoothY: 0,
    spin: 0,
    bob: true,
};

let baseMaterials = [];
const textures = {};

export async function initCan() {
    const gltf = await loadModel(ASSETS.can);
    const model = gltf.scene;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    // Frame to a fixed fraction of viewport height, accounting for the 25deg roll
    // which widens the can's projected vertical extent.
    const visibleHeight = 2 * STAGE.distance * Math.tan((STAGE.fov * Math.PI / 180) / 2);
    const maxDim = Math.max(size.x, size.y, size.z);
    const aspect = Math.max(size.x, size.z) / size.y;
    const rollSpread = Math.cos(-STAGE.roll) + aspect * Math.sin(-STAGE.roll);
    const scale = (STAGE.fill * visibleHeight / rollSpread) / maxDim;
    model.scale.setScalar(scale);

    canPivot.add(model);
    canRig.rotation.z = STAGE.roll;

    baseMaterials = collectMeshes(model)
        .map((m) => m.material)
        .filter((m) => m && m.map);

    const [green, blue] = await Promise.all([
        loadTexture(ASSETS.texGreen),
        loadTexture(ASSETS.texBlue),
    ]);
    textures.classic = green;
    textures.blue = blue;

    for (const mat of baseMaterials) {
        mat.map = green;
        mat.needsUpdate = true;
    }

    return model;
}

export function setFlavorTexture(flavor) {
    const tex = textures[flavor];
    if (!tex) return;
    for (const mat of baseMaterials) {
        mat.map = tex;
        mat.needsUpdate = true;
    }
}

export function setSpin(radians) {
    state.spin = radians;
}

window.addEventListener('mousemove', (e) => {
    state.mouseX = (e.clientX / window.innerWidth) - 0.5;
    state.mouseY = (e.clientY / window.innerHeight) - 0.5;
});

onFrame((delta, elapsed) => {
    state.smoothX = damp(state.smoothX, state.mouseX, MOTION.mouseEase, delta);
    state.smoothY = damp(state.smoothY, state.mouseY, MOTION.mouseEase, delta);

    canPivot.rotation.y = state.smoothX * MOTION.orbitAzimuth + state.spin;
    canPivot.rotation.x = state.smoothY * MOTION.orbitPolar;

    if (state.bob) {
        const phase = (elapsed / MOTION.bobPeriod) * Math.PI * 2;
        canRig.position.y = Math.sin(phase) * MOTION.bobAmplitude;
    }
});
