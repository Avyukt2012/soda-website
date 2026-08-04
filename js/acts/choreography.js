import { gsap, ScrollTrigger } from '../scroll/smooth.js';
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

        // Eco -> Footer: can settles above the wordmark. Sits high and small
        // so it clears the type on tall viewports, not just 16:9.
        .to(canScroll, { y: 0.62, roll: -0.25, scale: 0.4, ease: 'power2.out' }, 5)
        .to(spin, { value: TAU * 3.75, ease: 'power2.out', onUpdate: applySpin }, 5)
        .to(camera.position, { z: STAGE.distance * 1.08, ease: 'power2.out' }, 5);

    // Berries: scattered -> captured into orbit -> burst for inspection ->
    // recaptured -> dissolved into the eco act.
    journey
        .to(berryState, { capture: 1, repel: 0.55, ease: 'power2.inOut' }, 0)
        .to(berryState, { explode: 1, capture: 0.25, ease: 'power1.inOut' }, 1)
        .to(berryState, { explode: 0, capture: 1, spread: 0.8, ease: 'power2.inOut' }, 2)
        .to(berryState, { capture: 1, spread: 0.62, ease: 'power2.inOut' }, 3)
        .to(berryState, { dissolve: 1, opacity: 0.15, ease: 'power2.in' }, 4)
        .to(berryState, { dissolve: 0.82, opacity: 0.35, ease: 'power2.out' }, 5);

    journey
        .to(leafState, { spread: 1.25, drift: 1.5, ease: 'none' }, 0)
        .to(leafState, { spread: 1.5, opacity: 0.55, ease: 'none' }, 2)
        .to(leafState, { spread: 1.9, opacity: 0.2, ease: 'none' }, 4);

    // Act 3 - the pour. Liquid floods the frame, then drains away as the
    // flavour panels arrive.
    gsap.timeline({
        scrollTrigger: {
            trigger: '#act-pour',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
        },
    })
        // Liquid climbs, briefly closes over the can, then drains away.
        .fromTo(postState, { fill: 0 }, { fill: 0.55, ease: 'power1.out', duration: 1.1 })
        .to(postState, { fill: 1.04, ease: 'power2.in', duration: 0.7 })
        .to(postState, { fill: 0.92, ease: 'power1.inOut', duration: 0.35 })
        .to(postState, { fill: 0, ease: 'power3.in', duration: 0.95 })
        // The can settles into the rising liquid rather than being crossed by
        // a line, then lifts clear as it drains.
        .to(canScroll, { y: -0.16, roll: -0.78, duration: 1.5, ease: 'power1.inOut' }, 0)
        .to(canScroll, { y: 0.12, roll: -0.42, duration: 1.3, ease: 'power2.out' }, 1.8);

    // Act 5 - the can breaks into particles that reform as a loop.
    gsap.timeline({
        scrollTrigger: {
            trigger: '#act-eco',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
        },
    })
        .fromTo(ecoState, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' })
        .fromTo(ecoState, { progress: 0 }, { progress: 1, duration: 2.2, ease: 'none' }, 0)
        // The can hands itself over to the particles rather than sitting
        // behind them, then reassembles for the footer.
        .to(canScroll, { opacity: 0, duration: 0.5, ease: 'power2.in' }, 0.25)
        .to(canScroll, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 1.85)
        .to(ecoState, { opacity: 0, duration: 0.4, ease: 'power2.in' }, 2.0);

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
