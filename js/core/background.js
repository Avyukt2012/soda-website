import * as THREE from 'three';
import { scene, camera } from './stage.js';
import { onFrame } from './loop.js';
import { FLAVORS } from '../config.js';

// The page gradient lives in the scene rather than in CSS so it sits under the
// liquid pass and bloom, and so it can morph with flavour in one place.
const uniforms = {
    uInner: { value: new THREE.Color(FLAVORS.classic.inner) },
    uMid: { value: new THREE.Color(FLAVORS.classic.mid) },
    uOuter: { value: new THREE.Color(FLAVORS.classic.outer) },
    uTime: { value: 0 },
    uAspect: { value: window.innerWidth / window.innerHeight },
};

const material = new THREE.ShaderMaterial({
    uniforms,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
    fragmentShader: `
        precision mediump float;
        uniform vec3 uInner;
        uniform vec3 uMid;
        uniform vec3 uOuter;
        uniform float uTime;
        uniform float uAspect;
        varying vec2 vUv;

        void main() {
            vec2 p = vUv - 0.5;
            p.x *= uAspect;

            // Slow breathing on the core so the backdrop is never fully static.
            float breathe = 0.5 + 0.5 * sin(uTime * 0.18);
            float r = length(p) / (0.62 + breathe * 0.05);

            vec3 col = mix(uInner, uMid, smoothstep(0.0, 0.62, r));
            col = mix(col, uOuter, smoothstep(0.55, 1.18, r));

            // ACESFilmic pulls midtones down; pre-lift so the gradient reads
            // at the same weight it did as a CSS background.
            col *= 1.45;

            gl_FragColor = vec4(col, 1.0);
        }`,
});

const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
quad.frustumCulled = false;
quad.renderOrder = -1000;

// Parented to the camera so it always fills the frame regardless of the
// camera pushes the choreography performs.
const holder = new THREE.Object3D();
camera.add(holder);
scene.add(camera);

function fit() {
    const dist = 12;
    const h = 2 * dist * Math.tan((camera.fov * Math.PI / 180) / 2);
    quad.scale.set((h * camera.aspect) / 2, h / 2, 1);
    quad.position.set(0, 0, -dist);
    uniforms.uAspect.value = camera.aspect;
}

holder.add(quad);
fit();
window.addEventListener('resize', fit);

export function setBackgroundFlavor(flavor, duration = 1.2, gsapRef = null) {
    const target = FLAVORS[flavor] || FLAVORS.classic;
    if (!gsapRef) {
        uniforms.uInner.value.set(target.inner);
        uniforms.uMid.value.set(target.mid);
        uniforms.uOuter.value.set(target.outer);
        return;
    }
    gsapRef.to(uniforms.uInner.value, { ...new THREE.Color(target.inner), duration, ease: 'power2.inOut' });
    gsapRef.to(uniforms.uMid.value, { ...new THREE.Color(target.mid), duration, ease: 'power2.inOut' });
    gsapRef.to(uniforms.uOuter.value, { ...new THREE.Color(target.outer), duration, ease: 'power2.inOut' });
}

export const backgroundUniforms = uniforms;

onFrame((delta, elapsed) => {
    uniforms.uTime.value = elapsed;
});
