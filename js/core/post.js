import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { scene, camera, renderer } from './stage.js';
import { onFrame } from './loop.js';
import { isMobile } from '../config.js';

const NOISE = `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
}`;

// Liquid rises from the bottom of the frame, refracting and tinting whatever
// has already been rendered behind it. Passthrough when uFill is 0.
const LiquidShader = {
    uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uFill: { value: 0 },
        uColor: { value: new THREE.Color(0x10b981) },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
    fragmentShader: `
        precision mediump float;
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uFill;
        uniform vec3 uColor;
        varying vec2 vUv;
        ${NOISE}

        void main() {
            vec2 uv = vUv;
            vec3 base = texture2D(tDiffuse, uv).rgb;

            if (uFill <= 0.001) {
                gl_FragColor = vec4(base, 1.0);
                return;
            }

            float wave = fbm(vec2(uv.x * 3.4 + uTime * 0.22, uTime * 0.16)) - 0.5;
            float ripple = sin(uv.x * 17.0 - uTime * 1.05) * 0.008;
            float surface = uFill * 1.12 - 0.06 + wave * 0.05 + ripple;

            float below = step(uv.y, surface);
            float depth = clamp((surface - uv.y) / max(surface, 0.001), 0.0, 1.0);

            vec2 disp = vec2(
                sin(uv.y * 26.0 + uTime * 1.35) * 0.0065,
                cos(uv.x * 21.0 - uTime * 1.0) * 0.0042
            ) * depth * below;

            vec3 refracted = texture2D(tDiffuse, uv + disp).rgb;
            vec3 liquid = mix(refracted, refracted * uColor * 1.75, 0.5);
            liquid *= mix(1.0, 0.68, depth);

            float band = smoothstep(0.014, 0.0, abs(uv.y - surface));
            liquid += band * 0.4;

            float meniscus = smoothstep(0.045, 0.0, surface - uv.y) * below;
            liquid += meniscus * 0.14;

            gl_FragColor = vec4(mix(base, liquid, below), 1.0);
        }`,
};

const GrainVignetteShader = {
    uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uGrain: { value: isMobile ? 0.028 : 0.045 },
        uVignette: { value: 0.9 },
    },
    vertexShader: LiquidShader.vertexShader,
    fragmentShader: `
        precision mediump float;
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uGrain;
        uniform float uVignette;
        varying vec2 vUv;

        float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }

        void main() {
            vec3 col = texture2D(tDiffuse, vUv).rgb;

            vec2 d = vUv - 0.5;
            float vig = smoothstep(0.86, 0.22, dot(d, d) * uVignette * 2.4);
            col *= mix(0.72, 1.0, vig);

            float g = rand(vUv + fract(uTime)) - 0.5;
            col += g * uGrain;

            gl_FragColor = vec4(col, 1.0);
        }`,
};

export const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

export const liquidPass = new ShaderPass(LiquidShader);
composer.addPass(liquidPass);

export const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    isMobile ? 0.28 : 0.45,
    0.4,
    0.82
);
composer.addPass(bloomPass);

composer.addPass(new OutputPass());

const grainPass = new ShaderPass(GrainVignetteShader);
composer.addPass(grainPass);

export const postState = { fill: 0 };

export function setLiquidColor(hex) {
    liquidPass.uniforms.uColor.value.setHex(hex);
}

function sizeComposer() {
    const dpr = renderer.getPixelRatio();
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.setPixelRatio(dpr);
    bloomPass.resolution.set(window.innerWidth, window.innerHeight);
}
sizeComposer();
window.addEventListener('resize', sizeComposer);

onFrame((delta, elapsed) => {
    liquidPass.uniforms.uTime.value = elapsed;
    liquidPass.uniforms.uFill.value = postState.fill;
    grainPass.uniforms.uTime.value = elapsed;
});

// info.autoReset would clear counters between composer passes, leaving only
// the final fullscreen triangle. Reset once per frame instead so the debug
// overlay reports true whole-frame totals.
renderer.info.autoReset = false;

export function renderPost() {
    renderer.info.reset();
    composer.render();
}
