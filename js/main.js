import { renderer } from './core/stage.js';
import './core/background.js';
import { renderPost, postState, liquidPass } from './core/post.js';
import { onFrame, start } from './core/loop.js';
import { initCan, canScroll, warmCanTextures, settleCanTexture } from './core/can.js';
import { initBerries, warmBerries, settleBerries } from './core/berries.js';
import { initLeaves } from './core/leaves.js';
import { setParticleColor, warmParticles } from './core/particles.js';
import { initBubbles } from './ui/bubbles.js';
import { createLoader } from './ui/loader.js';
import { initCursor } from './ui/cursor.js';
import { initAudio, tick } from './ui/audio.js';
import { ScrollTrigger, lenis } from './scroll/smooth.js';
import { initChoreography } from './acts/choreography.js';
import { initFlavour, onFlavorChange } from './acts/flavour.js';
import { initAnatomy } from './acts/anatomy.js';
import { initTextReveals, initHeroIntro, initMarquee, initMagnetic } from './ui/text.js';

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

async function boot() {
    const loader = createLoader();

    // Registered last so every scene update for the frame has already run.
    onFrame(renderPost);
    start();
    initPerfOverlay();
    initCursor();
    initBubbles();
    initMarquee();
    initMagnetic();
    initAudio();

    lenis.stop();

    try {
        await Promise.all([initCan(), initBerries(), initLeaves()]);
    } catch (err) {
        console.error('[boot] scene failed to load', err);
        document.body.dataset.bootError = String(err);
        loader.fail();
    }

    initChoreography();
    initFlavour();
    initAnatomy();
    initTextReveals();

    onFlavorChange((flavor) => {
        tick(1);
        setParticleColor(flavor === 'blue' ? 0xbfdbfe : 0xfbcfe8);
    });

    // Force one frame through the liquid branch so its shader variant is
    // compiled before the user ever reaches the pour, instead of stalling a
    // frame mid-scroll.
    postState.fill = 0.001;
    warmBerries();
    warmParticles();
    warmCanTextures();
    renderPost();
    postState.fill = 0;
    settleBerries();
    settleCanTexture();

    if (new URLSearchParams(location.search).has('debug')) {
        window.__can = canScroll;
        window.__post = postState;
    }

    document.body.classList.add('is-ready');
    ScrollTrigger.refresh();

    await loader.finish();
    lenis.start();
    initHeroIntro();
}

boot();
