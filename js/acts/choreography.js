import { gsap, ScrollTrigger } from '../scroll/smooth.js';
import { canScroll, setSpin } from '../core/can.js';
import { camera } from '../core/stage.js';
import { STAGE, isMobile } from '../config.js';

const TAU = Math.PI * 2;

function pin(selector) {
    return {
        trigger: selector,
        start: 'top top',
        end: 'bottom bottom',
        pin: `${selector} .act__pin`,
        pinSpacing: false,
        scrub: 1,
    };
}

export function initChoreography() {
    const spin = { value: 0 };
    const applySpin = () => setSpin(spin.value);

    // The can's journey is one continuous timeline across the whole document,
    // so every act hands off to the next without a reset.
    const journey = gsap.timeline({
        scrollTrigger: {
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.1,
        },
    });

    // Hero -> Handoff: can drifts left and spins a full turn as the headline leaves.
    journey
        .to(canScroll, { x: isMobile ? 0 : -0.55, scale: 0.92, roll: -0.18, bobAmount: 0.6, ease: 'power2.inOut' }, 0)
        .to(spin, { value: TAU, ease: 'power2.inOut', onUpdate: applySpin }, 0)
        .to(camera.position, { z: STAGE.distance * 0.86, ease: 'power2.inOut' }, 0)

        // Handoff -> Anatomy: can stands upright on the right, opened for inspection.
        .to(canScroll, { x: isMobile ? 0 : 0.62, y: 0.05, roll: 0, pitch: 0.05, scale: 0.86, ease: 'power1.inOut' }, 1)
        .to(spin, { value: TAU * 1.5, ease: 'power1.inOut', onUpdate: applySpin }, 1)
        .to(camera.position, { z: STAGE.distance * 0.94, ease: 'power1.inOut' }, 1)

        // Anatomy -> Pour: can returns to centre and tilts to pour.
        .to(canScroll, { x: 0, y: 0.1, roll: -0.62, pitch: 0.12, scale: 0.98, bobAmount: 0.25, ease: 'power2.inOut' }, 2)
        .to(spin, { value: TAU * 2.15, ease: 'power2.inOut', onUpdate: applySpin }, 2)
        .to(camera.position, { z: STAGE.distance * 0.8, ease: 'power2.inOut' }, 2)

        // Pour -> Flavour: can squares up, camera pulls back for the panels.
        .to(canScroll, { x: isMobile ? 0 : -0.15, y: 0, roll: -0.3, pitch: 0, scale: 0.9, bobAmount: 0.5, ease: 'power2.inOut' }, 3)
        .to(spin, { value: TAU * 2.5, ease: 'power2.inOut', onUpdate: applySpin }, 3)
        .to(camera.position, { z: STAGE.distance, ease: 'power2.inOut' }, 3)

        // Flavour -> Eco: can shrinks and lifts as it dissolves.
        .to(canScroll, { x: 0, y: 0.22, roll: -0.5, scale: 0.62, bobAmount: 1, ease: 'power2.inOut' }, 4)
        .to(spin, { value: TAU * 3.4, ease: 'power2.inOut', onUpdate: applySpin }, 4)

        // Eco -> Footer: can settles small and centred behind the wordmark.
        .to(canScroll, { y: -0.05, roll: -0.25, scale: 0.52, ease: 'power2.out' }, 5)
        .to(spin, { value: TAU * 3.75, ease: 'power2.out', onUpdate: applySpin }, 5)
        .to(camera.position, { z: STAGE.distance * 1.08, ease: 'power2.out' }, 5);

    ['#act-handoff', '#act-anatomy', '#act-pour', '#act-flavour', '#act-eco'].forEach((sel) => {
        if (document.querySelector(sel)) ScrollTrigger.create(pin(sel));
    });

    // Scroll cue retires once the journey starts.
    const cue = document.getElementById('scroll-cue');
    if (cue) {
        gsap.to(cue, {
            autoAlpha: 0,
            y: 14,
            ease: 'power2.out',
            scrollTrigger: { trigger: document.body, start: '60px top', end: '25% top', scrub: true },
        });
    }
}
