import Lenis from 'lenis';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { onFrame } from '../core/loop.js';
import { isMobile } from '../config.js';

gsap.registerPlugin(ScrollTrigger);

export const lenis = new Lenis({
    duration: isMobile ? 0.9 : 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
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

// Lenis drives native window scroll; ScrollTrigger reads it directly.
// One rAF owner only - GSAP's own ticker lag smoothing is disabled so it
// never fights our clock.
gsap.ticker.lagSmoothing(0);

onFrame((delta, elapsed) => {
    lenis.raf(elapsed * 1000);
    scrollState.smoothVelocity += (scrollState.velocity - scrollState.smoothVelocity)
        * (1 - Math.pow(0.001, delta));
});

export { gsap, ScrollTrigger };
