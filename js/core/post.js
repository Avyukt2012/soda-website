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
        uAspect: { value: window.innerWidth / window.innerHeight },
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
        uniform float uAspect;
        varying vec2 vUv;
        ${NOISE}

        // Two low frequencies only. Heavy fbm on the surface is what turned
        // the waterline into a fog bank.
        float surfaceAt(float x) {
            float s = uFill * 1.14 - 0.07;
            s += sin(x * 4.3 - uTime * 0.45) * 0.013;
            s += sin(x * 9.7 + uTime * 0.78) * 0.006;
            s += (noise(vec2(x * 2.1, uTime * 0.13)) - 0.5) * 0.022;
            return s;
        }

        // Aspect-corrected cells with staggered rows and jittered centres.
        // Square cells keep them round; the stagger stops it reading as a
        // lattice. Rim-lit rather than filled, so they look like gas not paint.
        float bubbles(vec2 uv, float t) {
            vec2 p = vec2(uv.x * uAspect, uv.y) * 10.5;
            p.y += t * 0.8;

            float row = floor(p.y);
            p.x += fract(sin(row * 91.37) * 43758.5453) * 1.7;

            vec2 cell = floor(p);
            vec2 f = fract(p);
            float h = hash(cell);
            if (h < 0.74) return 0.0;

            vec2 c = vec2(0.25 + hash(cell + 1.7) * 0.5, 0.25 + hash(cell + 5.3) * 0.5);
            float rad = 0.055 + hash(cell + 9.1) * 0.085;
            float dd = length(f - c);

            // Soft-edged rim; a hard ring reads as a drawn circle, not gas.
            float body = smoothstep(rad, rad * 0.35, dd);
            float rim = smoothstep(rad * 1.05, rad * 0.78, dd) - smoothstep(rad * 0.78, rad * 0.42, dd);
            float fade = 0.55 + hash(cell + 21.4) * 0.45;
            return (body * 0.07 + max(rim, 0.0) * 0.3) * fade;
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

            if (d < -0.02) {
                gl_FragColor = vec4(base, 1.0);
                return;
            }

            float inside = smoothstep(-0.0012, 0.0012, d);
            float depth = clamp(d / max(uFill, 0.08), 0.0, 1.0);

            // Refraction: travelling ripples plus a vertical lift, strong
            // enough that the can and cherries visibly bend through it.
            float ripple = sin(uv.y * 38.0 - uTime * 1.9) * 0.0052
                         + sin(uv.x * 23.0 + uTime * 1.25) * 0.0034;
            vec2 disp = vec2(ripple * (0.5 + depth * 1.3), -depth * 0.022);
            vec3 refr = texture2D(tDiffuse, uv + disp).rgb;

            // Surface reflection: mirror the scene about the waterline and mix
            // in by a Fresnel-ish term. This is what actually sells water.
            float mirrorY = 2.0 * surface - uv.y;
            vec3 refl = texture2D(tDiffuse, vec2(uv.x + ripple * 1.6, clamp(mirrorY, 0.0, 1.0))).rgb;
            float fres = pow(1.0 - clamp(depth * 3.2, 0.0, 1.0), 2.5);

            // Tinted, absorbing body
            vec3 liquid = mix(refr, refr * uColor * 1.9, 0.3 + depth * 0.34);
            liquid *= mix(1.0, 0.74, depth);
            liquid = mix(liquid, refl * mix(vec3(1.0), uColor * 1.6, 0.5), fres * 0.32);
            liquid += uColor * depth * 0.07;

            liquid += bubbles(uv, uTime) * inside * (1.0 - depth * 0.35);

            // Thin crisp waterline plus a tight highlight - no wide glow
            float edge = abs(uv.y - surface);
            liquid += smoothstep(0.0022, 0.0, edge) * 0.55;
            liquid += smoothstep(0.012, 0.0, edge) * 0.12;

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

export const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    isMobile ? 0.28 : 0.45,
    0.4,
    0.82
);
composer.addPass(bloomPass);

composer.addPass(new OutputPass());

// Liquid runs AFTER OutputPass, in tone-mapped LDR space. Upstream it was
// operating on linear HDR values, so its highlights blew out through ACES and
// got smeared by bloom - that is what made the water look like fog.
export const liquidPass = new ShaderPass(LiquidShader);
composer.addPass(liquidPass);

const grainPass = new ShaderPass(GrainVignetteShader);
composer.addPass(grainPass);

export const postState = { fill: 0 };

export function setLiquidColor(hex) {
    liquidPass.uniforms.uColor.value.setHex(hex);
}

function sizeComposer() {
    const dpr = renderer.getPixelRatio();
    liquidPass.uniforms.uAspect.value = window.innerWidth / window.innerHeight;
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.setPixelRatio(dpr);
    bloomPass.resolution.set(window.innerWidth, window.innerHeight);
}
sizeComposer();

// Reallocating the composer's render targets and the bloom mip chain is the
// expensive part of a resize. Coalesce it so dragging a window edge does not
// realloc every frame.
let resizeTimer = 0;
window.addEventListener('resize', () => {
    liquidPass.uniforms.uAspect.value = window.innerWidth / window.innerHeight;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sizeComposer, 140);
});

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
