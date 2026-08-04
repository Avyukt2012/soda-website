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
    for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
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

        // Layered surface: a slow swell, a mid roll, and a fine chop. One
        // frequency alone is what made this read as a drawn line.
        float surfaceAt(float x) {
            float s = uFill * 1.16 - 0.09;
            s += (fbm(vec2(x * 1.9 + uTime * 0.11, uTime * 0.08)) - 0.5) * 0.085;
            s += sin(x * 7.0 - uTime * 0.62) * 0.016;
            s += sin(x * 19.0 + uTime * 1.25) * 0.0055;
            return s;
        }

        void main() {
            vec2 uv = vUv;
            vec3 base = texture2D(tDiffuse, uv).rgb;

            if (uFill <= 0.001) {
                gl_FragColor = vec4(base, 1.0);
                return;
            }

            float surface = surfaceAt(uv.x);
            float d = surface - uv.y;

            // Everything well clear of the waterline skips the expensive work.
            if (d < -0.07) {
                gl_FragColor = vec4(base, 1.0);
                return;
            }

            float inside = smoothstep(-0.0035, 0.0035, d);
            float depth = clamp(d / max(uFill, 0.08), 0.0, 1.0);

            // Refraction strengthens with depth and carries a noise wobble so
            // it distorts organically instead of shearing uniformly.
            float warp = fbm(vec2(uv.x * 5.5, uv.y * 5.5 - uTime * 0.45)) - 0.5;
            vec2 disp = vec2(
                sin(uv.y * 20.0 + uTime * 1.05) * 0.011 + warp * 0.022,
                cos(uv.x * 13.0 - uTime * 0.85) * 0.007
            ) * (0.22 + depth * 1.5) * inside;

            // Chromatic split, strongest right under the surface
            float ca = 0.0022 * inside * (1.0 - depth * 0.55);
            vec3 refr;
            refr.r = texture2D(tDiffuse, uv + disp + vec2(ca, 0.0)).r;
            refr.g = texture2D(tDiffuse, uv + disp).g;
            refr.b = texture2D(tDiffuse, uv + disp - vec2(ca, 0.0)).b;

            // Absorption: light falls off and colour saturates with depth
            vec3 liquid = refr * mix(vec3(1.0), uColor * 2.0, 0.34 + depth * 0.38);
            liquid *= exp(-depth * 1.15);
            liquid += uColor * depth * 0.12;

            // Caustics gathering just beneath the waterline
            float caust = fbm(vec2(uv.x * 6.5 + uTime * 0.33, uv.y * 6.5 - uTime * 0.5));
            liquid += uColor * pow(max(caust, 0.0), 3.0) * (1.0 - depth) * inside * 0.7;

            // Carbonation rising inside the liquid
            float bub = fbm(vec2(uv.x * 24.0, uv.y * 24.0 + uTime * 1.5));
            liquid += smoothstep(0.76, 0.94, bub) * inside * (0.3 - depth * 0.18);

            // Meniscus: a crisp highlight plus a soft bloom, never a hard band
            float edge = abs(uv.y - surface);
            liquid += smoothstep(0.0032, 0.0, edge) * 0.5;
            liquid += smoothstep(0.055, 0.0, edge) * 0.14;

            gl_FragColor = vec4(mix(base, liquid, inside), 1.0);
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
            float vig = smoothstep(1.15, 0.1, dot(d, d) * uVignette * 2.4);
            col *= mix(0.88, 1.0, vig);

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
