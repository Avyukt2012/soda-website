import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { STAGE } from '../config.js';

export const scene = new THREE.Scene();

export const camera = new THREE.PerspectiveCamera(
    STAGE.fov,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(0, 0, STAGE.distance);

export const canvas = document.getElementById('gl');

export const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, STAGE.maxDpr));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = STAGE.exposure;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(2.5, 3.5, 3);
scene.add(key);

const rim = new THREE.DirectionalLight(0xbfe9ff, 0.9);
rim.position.set(-3, 1.5, -2.5);
scene.add(rim);

export function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, STAGE.maxDpr));
    renderer.setSize(w, h);
}

window.addEventListener('resize', resize);

export function render() {
    renderer.render(scene, camera);
}

export function frameObject(object, distanceScale = 1) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fitDist = (maxDim / 2) / Math.tan((camera.fov * Math.PI / 180) / 2);
    return fitDist * distanceScale;
}
