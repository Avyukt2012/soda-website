import Lenis from 'lenis';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { onFrame } from '../core/loop.js';
import { isMobile } from '../config.js';

gsap.registerPlugin(ScrollTrigger);

const params = new URLSearchParams(location.search);
const num = (key, fallback) => {
    const v = parseFloat(params.get(key));
    return Number.isFinite(v) ? v : fallback;
};

export const LERP = num('lerp', isMobile ? 0.12 : 0.1);
export const SCRUB = num('scrub', isMobile ? 0.3 : 0.35);

export const lenis = new Lenis({
    lerp: LERP,
    smoothWheel: true,
    syncTouch: false,
    touchMultiplier: 1.6,
});

export const scrollState = {
    velocity: 0,
    smoothVelocity: 0,
    progress: 0,
};

lenis.on('scroll', ({ velocity, progress }) => {
    scrollState.velocity = velocity;
    scrollState.progress = progress;
    ScrollTrigger.update();
});

gsap.ticker.lagSmoothing(0);

onFrame((delta, elapsed) => {
    lenis.raf(elapsed * 1000);
    scrollState.smoothVelocity += (scrollState.velocity - scrollState.smoothVelocity)
        * (1 - Math.pow(0.001, delta));
});

export { gsap, ScrollTrigger };
