import { renderer, scene, camera } from './core/stage.js';
import './core/background.js';
import { renderPost, postState, liquidPass } from './core/post.js';
import { onFrame, start } from './core/loop.js';
import { initCan, canScroll, canPivot, warmCanTextures, settleCanTexture, setFlavorTexture } from './core/can.js';
import { initBerries, warmBerries, settleBerries, setBerryFlavor } from './core/berries.js';
import { initLeaves } from './core/leaves.js';
import { setParticleColor, warmParticles } from './core/particles.js';
import { initBubbles } from './ui/bubbles.js';
import { createLoader } from './ui/loader.js';
import { initCursor } from './ui/cursor.js';
import { initNav } from './ui/nav.js';
import { initTheme, refreshTheme } from './ui/theme.js';
import { initAudio, tick } from './ui/audio.js';
import { ScrollTrigger, lenis } from './scroll/smooth.js';
import { initChoreography } from './acts/choreography.js';
import { initFlavour, onFlavorChange } from './acts/flavour.js';
import { initAnatomy } from './acts/anatomy.js';
import { initTextReveals, initHeroIntro, initMarquee, initMagnetic, initScore } from './ui/text.js';

function initPerfOverlay() {
    if (!new URLSearchParams(location.search).has('debug')) return;
    const el = document.createElement('div');
    el.id = 'perf';
    el.textContent = 'booting…';
    document.body.appendChild(el);

    let frames = 0;
    let acc = 0;
    let worst = 999;
    onFrame((delta) => {
        frames++;
        acc += delta;
        if (acc >= 0.5) {
            const fps = Math.round(frames / acc);
            worst = Math.min(worst, fps);
            const info = renderer.info.render;
            el.textContent = `${fps} fps (min ${worst}) · ${info.calls} calls · ${info.triangles.toLocaleString()} tris`;
            frames = 0;
            acc = 0;
        }
    });
}

const TEXTURE_SLOTS = [
    'map', 'normalMap', 'roughnessMap', 'metalnessMap',
    'aoMap', 'emissiveMap', 'alphaMap',
];

function nextFrameOrTimeout(ms) {
    return new Promise((resolve) => {
        let settled = false;
        const done = () => { if (!settled) { settled = true; resolve(); } };
        requestAnimationFrame(done);
        setTimeout(done, ms);
    });
}

function primeTextures() {
    const seen = new Set();
    scene.traverse((node) => {
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        mats.forEach((mat) => {
            if (!mat) return;
            TEXTURE_SLOTS.forEach((slot) => {
                const tex = mat[slot];
                if (tex && !seen.has(tex.uuid)) {
                    seen.add(tex.uuid);
                    renderer.initTexture(tex);
                }
            });
        });
    });
    return seen.size;
}

async function boot() {
    const loader = createLoader();

    onFrame(renderPost);
    start();
    initPerfOverlay();
    initCursor();
    initBubbles();
    initMarquee();
    initMagnetic();
    initAudio();
    initTheme();

    lenis.stop();

    try {
        await Promise.all([initCan(), initBerries(), initLeaves()]);
    } catch (err) {
        console.error('[boot] scene failed to load', err);
        document.body.dataset.bootError = String(err);
        loader.fail();
    }

    try {
        await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
    } catch { /* fall through on fallback metrics rather than block boot */ }

    initChoreography();
    initNav();
    initFlavour();
    initAnatomy();
    initTextReveals();
    initScore();

    onFlavorChange(() => {
        tick(1);
        refreshTheme();
    });

    await nextFrameOrTimeout(250);

    postState.fill = 0.001;
    warmBerries();
    warmParticles();
    warmCanTextures();
    try {
        await Promise.race([
            renderer.compileAsync(scene, camera),
            new Promise((r) => setTimeout(r, 4000)),
        ]);
    } catch {
        try { renderer.compile(scene, camera); } catch { /* non-fatal */ }
    }

    primeTextures();

    renderPost();
    postState.fill = 0;
    settleBerries();
    settleCanTexture();

    if (new URLSearchParams(location.search).has('debug')) {
        window.__can = canScroll;
        window.__post = postState;
        window.__rotY = () => canPivot.rotation.y;
        window.__probe = { setFlavorTexture, setBerryFlavor, setParticleColor, renderPost };
    }

    document.body.classList.add('is-ready');
    ScrollTrigger.refresh();

    await loader.finish();
    lenis.start();
    initHeroIntro();
}

boot();
