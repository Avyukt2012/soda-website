import { gsap, ScrollTrigger, SCRUB } from '../scroll/smooth.js';
import { canScroll, setSpin } from '../core/can.js';
import { berryState } from '../core/berries.js';
import { leafState } from '../core/leaves.js';
import { camera } from '../core/stage.js';
import { postState } from '../core/post.js';
import { ecoState } from '../core/particles.js';
import { STAGE, isMobile } from '../config.js';

const TAU = Math.PI * 2;

function pin(selector) {
    return {
        trigger: selector,
        start: 'top top',
        end: 'bottom bottom',
        pin: `${selector} .act__pin`,
        pinSpacing: false,
        scrub: SCRUB,
    };
}

export function initChoreography() {
    const spin = { value: 0 };
    const applySpin = () => setSpin(spin.value);

    // One timeline owns every canScroll transform channel for the whole
    // document. Two timelines writing the same property with different scrub
    // lag is what made the can judder through the pour.
    //
    // Every tween is duration 1 at an integer position, so each segment ends
    // exactly where the next begins - no dead gaps where the can freezes.
    //
    // The easing matters as much as the timing. Linear kept position
    // continuous but let velocity flip sign instantly at each join, so the can
    // snapped from travelling right to travelling left with no slow-down.
    // power2.inOut brings velocity to zero at every boundary: the can settles
    // into an act and accelerates out of it.
    const journey = gsap.timeline({
        scrollTrigger: {
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            scrub: SCRUB,
        },
        defaults: { duration: 1, ease: 'power2.inOut' },
    });

    // 0 -> 1  Hero into the handoff: drifts left, one slow turn.
    journey
        .to(canScroll, { x: isMobile ? 0 : -0.42, z: -0.3, scale: 0.94, roll: -0.2, bobAmount: 0.65 }, 0)
        .to(spin, { value: TAU * 0.6, onUpdate: applySpin }, 0)
        .to(camera.position, { z: STAGE.distance * 0.88 }, 0)

        // 1 -> 2  Anatomy: stands upright on the right for inspection.
        .to(canScroll, { x: isMobile ? 0 : 0.5, z: 0, y: 0.04, roll: 0, pitch: 0.05, scale: 0.86 }, 1)
        .to(spin, { value: TAU * 1.15, onUpdate: applySpin }, 1)
        .to(camera.position, { z: STAGE.distance * 0.95 }, 1)

        // 2 -> 3  Descends into the rising liquid, tipping as it goes.
        .to(canScroll, { x: 0, z: -0.22, y: -0.14, roll: -0.55, pitch: 0.1, scale: 0.96, bobAmount: 0.18 }, 2)
        .to(spin, { value: TAU * 1.62, onUpdate: applySpin }, 2)
        .to(camera.position, { z: STAGE.distance * 0.84 }, 2)

        // 3 -> 4  Lifts clear as the liquid drains, squares up for the panels.
        .to(canScroll, { x: isMobile ? 0 : -0.12, z: 0, y: 0.02, roll: -0.28, pitch: 0, scale: 0.9, bobAmount: 0.5 }, 3)
        .to(spin, { value: TAU * 2.1, onUpdate: applySpin }, 3)
        .to(camera.position, { z: STAGE.distance }, 3)

        // 4 -> 5  Rises and shrinks toward the dissolve.
        .to(canScroll, { x: 0, z: -0.18, y: 0.2, roll: -0.46, scale: 0.62, bobAmount: 1 }, 4)
        .to(spin, { value: TAU * 2.75, onUpdate: applySpin }, 4)

        // 5 -> 6  Settles small and centred above the wordmark.
        .to(canScroll, { z: 0, y: 0.5, roll: -0.24, scale: 0.42 }, 5)
        .to(spin, { value: TAU * 3.1, onUpdate: applySpin }, 5)
        .to(camera.position, { z: STAGE.distance * 1.06 }, 5);

    // Berries and leaves ride the same timeline, so they never lag the can.
    journey
        .to(berryState, { capture: 1, repel: 0.55 }, 0)
        .to(berryState, { explode: 1, capture: 0.25 }, 1)
        .to(berryState, { explode: 0, capture: 1, spread: 0.8 }, 2)
        .to(berryState, { capture: 1, spread: 0.62 }, 3)
        .to(berryState, { dissolve: 1, opacity: 0.15 }, 4)
        .to(berryState, { dissolve: 0.82, opacity: 0.35 }, 5)

        .to(leafState, { spread: 1.25, drift: 1.5 }, 0)
        .to(leafState, { spread: 1.5, opacity: 0.55 }, 2)
        .to(leafState, { spread: 1.9, opacity: 0.2 }, 4);

    // Act 3 owns the liquid level only - never the can.
    gsap.timeline({
        scrollTrigger: {
            trigger: '#act-pour',
            start: 'top bottom',
            end: 'bottom top',
            scrub: SCRUB,
        },
        defaults: { ease: 'none' },
    })
        .fromTo(postState, { fill: 0 }, { fill: 0.58, duration: 1.15, ease: 'power1.out' })
        .to(postState, { fill: 1.02, duration: 0.75, ease: 'power1.in' })
        .to(postState, { fill: 0.94, duration: 0.35 })
        .to(postState, { fill: 0, duration: 1.0, ease: 'power2.in' });

    // Act 5 owns particle state and can opacity - both untouched by journey.
    gsap.timeline({
        scrollTrigger: {
            trigger: '#act-eco',
            start: 'top bottom',
            end: 'bottom top',
            scrub: SCRUB,
        },
    })
        .fromTo(ecoState, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' })
        .fromTo(ecoState, { progress: 0 }, { progress: 1, duration: 2.2, ease: 'none' }, 0)
        .to(canScroll, { opacity: 0, duration: 0.5, ease: 'power2.in' }, 0.25)
        .to(canScroll, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 1.85)
        .to(ecoState, { opacity: 0, duration: 0.4, ease: 'power2.in' }, 2.0);

    ['#act-handoff', '#act-anatomy', '#act-pour', '#act-flavour', '#act-eco'].forEach((sel) => {
        if (document.querySelector(sel)) ScrollTrigger.create(pin(sel));
    });

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
