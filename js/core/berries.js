import * as THREE from 'three';
import { ASSETS, isMobile } from '../config.js';
import { loadModel } from './assets.js';
import { scene, camera } from './stage.js';
import { onFrame } from './loop.js';

export const COUNT = isMobile ? 12 : 26;

const berryGroup = new THREE.Group();
scene.add(berryGroup);

const sets = { cherry: [], blueberry: [] };
let active = 'cherry';

const dummy = new THREE.Object3D();
const instances = [];

export const berryState = {
    capture: 0,
    explode: 0,
    dissolve: 0,
    spread: 1,
    opacity: 1,
    repel: 1,
    orbitScale: 1,
    orbitLift: 1,
};

const pointer = new THREE.Vector2(-10, -10);
const pointerWorld = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

window.addEventListener('mousemove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

function buildInstanced(gltf, key) {
    const root = gltf.scene;
    root.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const norm = 0.17 / Math.max(size.x, size.y, size.z);

    const offset = new THREE.Matrix4()
        .makeScale(norm, norm, norm)
        .multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));

    const built = [];
    root.traverse((child) => {
        if (!child.isMesh) return;
        const geo = child.geometry.clone();
        geo.applyMatrix4(child.matrixWorld);
        geo.applyMatrix4(offset);

        const mat = child.material.clone();
        mat.transparent = true;

        const inst = new THREE.InstancedMesh(geo, mat, COUNT);
        inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        inst.frustumCulled = false;
        inst.visible = key === active;
        berryGroup.add(inst);
        built.push(inst);
    });
    sets[key] = built;
}

export async function initBerries() {
    const [cherry, blueberry] = await Promise.all([
        loadModel(ASSETS.cherry),
        loadModel(ASSETS.blueberry),
    ]);
    buildInstanced(cherry, 'cherry');
    buildInstanced(blueberry, 'blueberry');

    for (let i = 0; i < COUNT; i++) {
        const ring = i / COUNT;
        const angle = ring * Math.PI * 2 * 3.3;

        instances.push({
            home: new THREE.Vector3(
                (Math.random() - 0.5) * 4.6,
                (Math.random() - 0.5) * 2.8,
                Math.random() * 1.5 - 1.25
            ),
            orbitRadius: 0.72 + (i % 3) * 0.26,
            orbitAngle: angle,
            orbitY: (Math.random() - 0.5) * 1.05,
            orbitSpeed: 0.16 + Math.random() * 0.2,
            burst: new THREE.Vector3(
                (Math.random() - 0.5) * 2.2,
                (Math.random() - 0.5) * 2.6,
                (Math.random() - 0.5) * 1.4
            ),
            spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
            spinRate: 0.4 + Math.random() * 1.1,
            phase: Math.random() * Math.PI * 2,
            bobRate: 0.5 + Math.random() * 0.7,
            scale: 0.34 + Math.pow(Math.random(), 2.1) * 1.5,
            repel: new THREE.Vector3(),
        });
    }
}

export function warmBerries() {
    const src = sets.cherry[0];
    sets.blueberry.forEach((m) => {
        if (src && m.instanceMatrix.array.length === src.instanceMatrix.array.length) {
            m.instanceMatrix.array.set(src.instanceMatrix.array);
            m.instanceMatrix.needsUpdate = true;
        }
        m.visible = true;
    });
    sets.cherry.forEach((m) => { m.visible = true; });
}

export function settleBerries() {
    sets.cherry.forEach((m) => { m.visible = active === 'cherry'; });
    sets.blueberry.forEach((m) => { m.visible = active === 'blueberry'; });
}

export function setBerryFlavor(flavor) {
    const key = flavor === 'blue' ? 'blueberry' : 'cherry';
    if (key === active) return;
    active = key;
    sets.cherry.forEach((m) => { m.visible = key === 'cherry'; });
    sets.blueberry.forEach((m) => { m.visible = key === 'blueberry'; });
}

const tmp = new THREE.Vector3();
const away = new THREE.Vector3();

onFrame((delta, elapsed) => {
    if (!instances.length) return;

    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(plane, pointerWorld);

    const meshes = sets[active];
    const cap = berryState.capture;
    const exp = berryState.explode;

    for (let i = 0; i < COUNT; i++) {
        const b = instances[i];

        const bobY = Math.sin(elapsed * b.bobRate + b.phase) * 0.09;
        tmp.set(
            b.home.x * berryState.spread,
            b.home.y * berryState.spread + bobY,
            b.home.z * berryState.spread
        );

        if (cap > 0.001) {
            const a = b.orbitAngle + elapsed * b.orbitSpeed;
            const rad = b.orbitRadius * berryState.orbitScale;
            tmp.x += (Math.cos(a) * rad - tmp.x) * cap;
            tmp.y += (b.orbitY * berryState.orbitLift + bobY * 0.4 - tmp.y) * cap;
            tmp.z += (Math.sin(a) * rad - tmp.z) * cap;
        }

        if (exp > 0.001) {
            tmp.x += (b.burst.x - tmp.x) * exp;
            tmp.y += (b.burst.y - tmp.y) * exp;
            tmp.z += (b.burst.z - tmp.z) * exp;
        }

        if (berryState.repel > 0.001 && pointerWorld.lengthSq() > 0) {
            away.subVectors(tmp, pointerWorld);
            const d = away.length();
            if (d < 1.05 && d > 0.0001) {
                const force = (1.05 - d) / 1.05;
                away.multiplyScalar((force * 0.62 * berryState.repel) / d);
                b.repel.lerp(away, 0.09);
            } else {
                b.repel.lerp(away.set(0, 0, 0), 0.06);
            }
        } else {
            b.repel.lerp(away.set(0, 0, 0), 0.08);
        }
        tmp.add(b.repel);

        dummy.position.copy(tmp);
        dummy.quaternion.setFromAxisAngle(b.spin, elapsed * b.spinRate + b.phase);

        const s = b.scale * (1 - berryState.dissolve);
        dummy.scale.setScalar(Math.max(s, 0.0001));
        dummy.updateMatrix();

        for (const m of meshes) m.setMatrixAt(i, dummy.matrix);
    }

    for (const m of meshes) {
        m.instanceMatrix.needsUpdate = true;
        m.material.opacity = berryState.opacity;
    }
});
