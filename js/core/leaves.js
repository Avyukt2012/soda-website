import * as THREE from 'three';
import { ASSETS, isMobile } from '../config.js';
import { loadModel } from './assets.js';
import { scene } from './stage.js';
import { onFrame } from './loop.js';

const COUNT = isMobile ? 5 : 11;

const dummy = new THREE.Object3D();
const leaves = [];
let meshes = [];

export const leafState = { spread: 1, opacity: 1, drift: 1 };

export async function initLeaves() {
    const gltf = await loadModel(ASSETS.leaves);
    const root = gltf.scene;
    root.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const norm = 0.34 / Math.max(size.x, size.y, size.z);

    const offset = new THREE.Matrix4()
        .makeScale(norm, norm, norm)
        .multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));

    root.traverse((child) => {
        if (!child.isMesh) return;
        const geo = child.geometry.clone();
        geo.applyMatrix4(child.matrixWorld);
        geo.applyMatrix4(offset);

        const mat = child.material.clone();
        mat.transparent = true;
        mat.side = THREE.DoubleSide;

        const inst = new THREE.InstancedMesh(geo, mat, COUNT);
        inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        inst.frustumCulled = false;
        scene.add(inst);
        meshes.push(inst);
    });

    for (let i = 0; i < COUNT; i++) {
        leaves.push({
            home: new THREE.Vector3(
                (Math.random() - 0.5) * 4.4,
                (Math.random() - 0.5) * 2.8,
                -0.9 - Math.random() * 1.4
            ),
            axis: new THREE.Vector3(Math.random() - 0.3, 1, Math.random() - 0.3).normalize(),
            rate: 0.18 + Math.random() * 0.3,
            phase: Math.random() * Math.PI * 2,
            swayX: 0.16 + Math.random() * 0.2,
            swayY: 0.12 + Math.random() * 0.22,
            scale: 0.55 + Math.random() * 0.85,
        });
    }
}

onFrame((delta, elapsed) => {
    if (!leaves.length) return;

    for (let i = 0; i < COUNT; i++) {
        const l = leaves[i];
        const t = elapsed * l.rate + l.phase;

        dummy.position.set(
            l.home.x * leafState.spread + Math.cos(t * 0.8) * l.swayX * leafState.drift,
            l.home.y * leafState.spread + Math.sin(t) * l.swayY * leafState.drift,
            l.home.z * leafState.spread
        );
        dummy.quaternion.setFromAxisAngle(l.axis, t * 1.3);
        dummy.scale.setScalar(l.scale);
        dummy.updateMatrix();

        for (const m of meshes) m.setMatrixAt(i, dummy.matrix);
    }

    for (const m of meshes) {
        m.instanceMatrix.needsUpdate = true;
        m.material.opacity = leafState.opacity;
    }
});
