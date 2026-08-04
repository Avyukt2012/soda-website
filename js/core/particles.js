import * as THREE from 'three';
import { scene } from './stage.js';
import { onFrame } from './loop.js';
import { isMobile, FLAVORS } from '../config.js';

const COUNT = isMobile ? 700 : 1600;

export const ecoState = { progress: 0, opacity: 0 };

const positions = new Float32Array(COUNT * 3);
const ringTargets = new Float32Array(COUNT * 3);
const seeds = new Float32Array(COUNT);

for (let i = 0; i < COUNT; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.28 + Math.random() * 0.1;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.95;
    positions[i * 3 + 2] = Math.sin(a) * r;

    const t = (i / COUNT) * Math.PI * 2;
    const tube = 0.055 + Math.pow(Math.random(), 1.6) * 0.075;
    const phi = Math.random() * Math.PI * 2;
    const R = 0.95;
    ringTargets[i * 3] = (R + tube * Math.cos(phi)) * Math.cos(t);
    ringTargets[i * 3 + 1] = tube * Math.sin(phi) * 0.55;
    ringTargets[i * 3 + 2] = (R + tube * Math.cos(phi)) * Math.sin(t);

    seeds[i] = Math.random();
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('aStart', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('aRing', new THREE.BufferAttribute(ringTargets, 3));
geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
geometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));

const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
        uProgress: { value: 0 },
        uOpacity: { value: 0 },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xdfe8ee) },
        uSize: { value: isMobile ? 4.5 : 6.5 },
        uDpr: { value: Math.min(window.devicePixelRatio, 1.5) },
    },
    vertexShader: `
        precision mediump float;
        attribute vec3 aStart;
        attribute vec3 aRing;
        attribute float aSeed;
        uniform float uProgress;
        uniform float uTime;
        uniform float uSize;
        uniform float uDpr;
        varying float vFade;

        void main() {
            // Stagger each particle so the cloud disperses and reforms in waves
            float local = clamp((uProgress - aSeed * 0.35) / 0.65, 0.0, 1.0);
            float burst = sin(local * 3.14159);

            vec3 scatter = normalize(aStart + vec3(0.001)) * burst * (0.16 + aSeed * 0.26);
            vec3 pos = mix(aStart, aRing, smoothstep(0.0, 1.0, local)) + scatter;

            pos.y += sin(uTime * 0.6 + aSeed * 6.28) * 0.04;

            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = uSize * uDpr * (0.35 + pow(aSeed, 2.4) * 3.0) * (3.0 / -mv.z);

            vFade = (0.45 + burst * 0.55) * (0.5 + aSeed * 0.9);
        }`,
    fragmentShader: `
        precision mediump float;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vFade;

        void main() {
            vec2 c = gl_PointCoord - 0.5;
            float d = dot(c, c);
            if (d > 0.25) discard;
            float alpha = smoothstep(0.25, 0.0, d) * vFade * uOpacity;
            gl_FragColor = vec4(uColor, alpha);
        }`,
});

const points = new THREE.Points(geometry, material);
points.frustumCulled = false;
points.visible = false;
scene.add(points);

export function warmParticles() {
    points.visible = true;
}

export function setParticleColor(hexOrKey) {
    if (typeof hexOrKey === 'number') {
        material.uniforms.uColor.value.setHex(hexOrKey);
        return;
    }
    material.uniforms.uColor.value.setHex(currentPalette[hexOrKey] ?? currentPalette.particle);
}

let currentPalette = FLAVORS.classic;

export function setParticlePalette(flavor, theme) {
    currentPalette = FLAVORS[flavor] || FLAVORS.classic;
    material.uniforms.uColor.value.setHex(
        theme === 'light' ? currentPalette.particleLight : currentPalette.particle
    );
}

points.rotation.x = -0.62;

onFrame((delta, elapsed) => {
    material.uniforms.uTime.value = elapsed;
    material.uniforms.uProgress.value = ecoState.progress;
    material.uniforms.uOpacity.value = ecoState.opacity;
    points.visible = ecoState.opacity > 0.01;
    points.rotation.y = elapsed * 0.16;
    points.rotation.x = -0.62 + Math.sin(elapsed * 0.25) * 0.06;
});
