import { render, renderer } from './core/stage.js';
import { onFrame, start } from './core/loop.js';
import { initCan } from './core/can.js';
import { initBubbles } from './ui/bubbles.js';
import { ScrollTrigger } from './scroll/smooth.js';
import { initChoreography } from './acts/choreography.js';
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
    onFrame(render);
    start();
    initPerfOverlay();
    initBubbles();
    initMarquee();
    initMagnetic();

    try {
        await initCan();
    } catch (err) {
        console.error('[boot] can failed to load', err);
        document.body.dataset.bootError = String(err);
    }

    initChoreography();
    initTextReveals();
    initHeroIntro();

    document.body.classList.add('is-ready');
    ScrollTrigger.refresh();
}

boot();
