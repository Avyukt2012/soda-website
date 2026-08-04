import * as THREE from 'three';
import { scene, camera } from './stage.js';
import { onFrame } from './loop.js';
import { FLAVORS, THEME } from '../config.js';

const uniforms = {
    uInner: { value: new THREE.Color(FLAVORS.classic.dark.inner) },
    uMid: { value: new THREE.Color(FLAVORS.classic.dark.mid) },
    uOuter: { value: new THREE.Color(FLAVORS.classic.dark.outer) },
    uLift: { value: THEME.dark.bgLift },
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
        uniform float uLift;
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
            col *= uLift;

            gl_FragColor = vec4(col, 1.0);
        }`,
});

const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
quad.frustumCulled = false;
quad.renderOrder = -1000;

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

let activeTheme = 'dark';

function applyPalette(flavor, theme, gsapRef, duration) {
    const entry = FLAVORS[flavor] || FLAVORS.classic;
    const target = entry[theme] || entry.dark;
    const lift = THEME[theme].bgLift;

    const set = (uniform, hex) => {
        const c = new THREE.Color(hex);
        if (!gsapRef) { uniform.value.copy(c); return; }
        gsapRef.to(uniform.value, { r: c.r, g: c.g, b: c.b, duration, ease: 'power2.inOut' });
    };

    set(uniforms.uInner, target.inner);
    set(uniforms.uMid, target.mid);
    set(uniforms.uOuter, target.outer);

    if (!gsapRef) uniforms.uLift.value = lift;
    else gsapRef.to(uniforms.uLift, { value: lift, duration, ease: 'power2.inOut' });
}

export function setBackgroundFlavor(flavor, duration = 1.2, gsapRef = null) {
    applyPalette(flavor, activeTheme, gsapRef, duration);
}

export function applyThemeToBackground(flavor, theme, gsapRef = null) {
    activeTheme = theme;
    applyPalette(flavor, theme, gsapRef, 0.9);
}

export const backgroundUniforms = uniforms;

onFrame((delta, elapsed) => {
    uniforms.uTime.value = elapsed;
});
