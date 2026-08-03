import { renderer } from './core/stage.js';
import './core/background.js';
import { renderPost } from './core/post.js';
import { onFrame, start } from './core/loop.js';
import { initCan } from './core/can.js';
import { initBerries } from './core/berries.js';
import { initLeaves } from './core/leaves.js';
import { initBubbles } from './ui/bubbles.js';
import { ScrollTrigger } from './scroll/smooth.js';
import { initChoreography } from './acts/choreography.js';
import { initFlavour } from './acts/flavour.js';
import { initTextReveals, initHeroIntro, initMarquee, initMagnetic } from './ui/text.js';

function initPerfOverlay() {
    if (!new URLSearchParams(location.search).has('debug')) return;
    const el = document.createElement('div');
    el.id = 'perf';
    el.textContent = 'booting…';
    document.body.appendChild(el);

    let frames = 0;
    let acc = 0;
    onFrame((delta) => {
        frames++;
        acc += delta;
        if (acc >= 0.5) {
            const info = renderer.info.render;
            el.textContent = `${Math.round(frames / acc)} fps · ${info.calls} calls · ${info.triangles.toLocaleString()} tris`;
            frames = 0;
            acc = 0;
        }
    });
}

async function boot() {
    // Registered last so every scene update for the frame has already run.
    onFrame(renderPost);
    start();
    initPerfOverlay();
    initBubbles();
    initMarquee();
    initMagnetic();

    try {
        await Promise.all([initCan(), initBerries(), initLeaves()]);
    } catch (err) {
        console.error('[boot] scene failed to load', err);
        document.body.dataset.bootError = String(err);
    }

    initChoreography();
    initFlavour();
    initTextReveals();
    initHeroIntro();

    document.body.classList.add('is-ready');
    ScrollTrigger.refresh();
}

boot();
