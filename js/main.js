import { renderer, scene } from './core/stage.js';
import './core/background.js';
import { renderPost, postState, compileForComposer } from './core/post.js';
import { onFrame, start } from './core/loop.js';
import { initCan, canScroll, canPivot, setFlavorTexture } from './core/can.js';
import { initBerries, setBerryFlavor } from './core/berries.js';
import { initLeaves } from './core/leaves.js';
import { fetchBlue, warmBlue } from './core/blue.js';
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

const LOADER_HOLD_MS = 600;

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

function cardsDecoded() {
    return Promise.allSettled(
        [...document.querySelectorAll('.card img')].map((img) => img.decode()),
    );
}

async function switzerReady() {
    const link = document.getElementById('switzer');
    if (!link.sheet) {
        await new Promise((resolve) => {
            link.addEventListener('load', resolve, { once: true });
            link.addEventListener('error', resolve, { once: true });
        });
    }
    void document.body.offsetHeight;
    await document.fonts.ready;
}

function prepareBlueUnderCurtain() {
    const coveredUntil = performance.now() + LOADER_HOLD_MS;
    fetchBlue()
        .then(() => (performance.now() < coveredUntil ? warmBlue() : null))
        .catch((err) => console.error('[boot] blue flavour failed to load', err));
}

async function boot() {
    removeEventListener('error', window.dropLoader);
    const loader = createLoader();

    start();
    initPerfOverlay();
    initCursor();
    initBubbles();
    initMarquee();
    initMagnetic();
    initAudio();
    initTheme();

    lenis.stop();
    renderPost();

    try {
        await Promise.all([initCan(), initBerries(initLeaves()), cardsDecoded()]);
    } catch (err) {
        console.error('[boot] scene failed to load', err);
        document.body.dataset.bootError = String(err);
        loader.fail();
    }

    try {
        await Promise.race([switzerReady(), new Promise((r) => setTimeout(r, 2500))]);
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
    warmParticles();
    try {
        await Promise.race([
            compileForComposer(),
            new Promise((r) => setTimeout(r, 4000)),
        ]);
    } catch { /* first render compiles anything missed */ }

    primeTextures();

    renderPost();
    postState.fill = 0;
    onFrame(renderPost);

    if (new URLSearchParams(location.search).has('debug')) {
        window.__can = canScroll;
        window.__post = postState;
        window.__rotY = () => canPivot.rotation.y;
        window.__probe = { setFlavorTexture, setBerryFlavor, setParticleColor, renderPost };
    }

    document.body.classList.add('is-ready');
    ScrollTrigger.refresh();

    const curtainLifted = loader.finish();
    prepareBlueUnderCurtain();
    await curtainLifted;
    lenis.start();
    initHeroIntro();
}

boot().catch((err) => {
    console.error('[boot] failed', err);
    window.dropLoader();
});
