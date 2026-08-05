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
    scrollSpin: 0,
    flavourSpin: 0,
    bob: true,
};

export const canScroll = {
    x: 0,
    y: 0,
    z: 0,
    roll: STAGE.roll,
    pitch: 0,
    scale: 1,
    punch: 1,
    bobAmount: 1,
    opacity: 1,
    fade: 1,
    dim: 1,
};

let baseMaterials = [];
let allMaterials = [];
let framed = null;
let warmedTextures = false;

function currentFill() {
    return matchMedia('(max-width: 900px)').matches ? 0.4 : 0.71;
}

function applyFraming() {
    if (!framed) return;
    const visibleHeight = 2 * STAGE.distance * Math.tan((STAGE.fov * Math.PI / 180) / 2);
    const rollSpread = Math.cos(-STAGE.roll) + framed.aspect * Math.sin(-STAGE.roll);
    framed.model.scale.setScalar((currentFill() * visibleHeight / rollSpread) / framed.maxDim);
}

window.addEventListener('resize', applyFraming);

const textures = {};

export async function initCan() {
    const gltf = await loadModel(ASSETS.can);
    const model = gltf.scene;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    framed = {
        model,
        maxDim: Math.max(size.x, size.y, size.z),
        aspect: Math.max(size.x, size.z) / size.y,
    };
    applyFraming();

    canPivot.add(model);
    canRig.rotation.z = STAGE.roll;

    allMaterials = collectMeshes(model).map((m) => m.material).filter(Boolean);
    allMaterials.forEach((m) => { m.transparent = true; });

    baseMaterials = allMaterials.filter((m) => m.map);

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
    warmedTextures = true;

    return model;
}

export function setFlavorTexture(flavor) {
    const tex = textures[flavor];
    if (!tex) return;
    for (const mat of baseMaterials) {
        mat.map = tex;
        if (!warmedTextures) mat.needsUpdate = true;
    }
}

export function warmCanTextures() {
    if (!textures.blue) return;
    for (const mat of baseMaterials) mat.map = textures.blue;
}

export function settleCanTexture() {
    if (!textures.classic) return;
    for (const mat of baseMaterials) mat.map = textures.classic;
}

export function setSpin(radians) {
    state.scrollSpin = radians;
}

export function setFlavourSpin(radians) {
    state.flavourSpin = radians;
}

window.addEventListener('mousemove', (e) => {
    state.mouseX = (e.clientX / window.innerWidth) - 0.5;
    state.mouseY = (e.clientY / window.innerHeight) - 0.5;
});

onFrame((delta, elapsed) => {
    state.smoothX = damp(state.smoothX, state.mouseX, MOTION.mouseEase, delta);
    state.smoothY = damp(state.smoothY, state.mouseY, MOTION.mouseEase, delta);

    canPivot.rotation.y = state.smoothX * MOTION.orbitAzimuth
        + state.scrollSpin + state.flavourSpin;
    canPivot.rotation.x = state.smoothY * MOTION.orbitPolar + canScroll.pitch;

    const phase = (elapsed / MOTION.bobPeriod) * Math.PI * 2;
    const bob = Math.sin(phase) * MOTION.bobAmplitude * canScroll.bobAmount;

    canRig.position.set(canScroll.x, canScroll.y + bob, canScroll.z);
    canRig.rotation.z = canScroll.roll;
    canRig.scale.setScalar(canScroll.scale * canScroll.punch);

    const shown = canScroll.opacity * canScroll.fade * canScroll.dim;
    for (const mat of allMaterials) mat.opacity = shown;
    canRig.visible = shown > 0.01;
});
