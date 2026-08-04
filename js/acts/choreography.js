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

    const journey = gsap.timeline({
        scrollTrigger: {
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            scrub: SCRUB,
        },
        defaults: { duration: 1, ease: 'power2.inOut' },
    });

    const step = isMobile
        ? [
            { x: 0,  y: -0.16, z: -0.45, roll: -0.30, pitch: 0.04, scale: 0.82, bob: 0.7,  spin: 0.6  },
            { x: 0,  y: 0.34,  z: -0.15, roll: 0.05,  pitch: 0.06, scale: 0.58, bob: 0.35, spin: 1.15 },
            { x: 0,  y: -0.05, z: -0.55, roll: -0.5,  pitch: 0.1,  scale: 0.92, bob: 0.18, spin: 1.62 },
            { x: 0,  y: 0.30,  z: -0.1,  roll: -0.22, pitch: 0,    scale: 0.6,  bob: 0.5,  spin: 2.1  },
            { x: 0,  y: 0.12,  z: -0.3,  roll: -0.4,  pitch: 0,    scale: 0.5,  bob: 1,    spin: 2.75 },
            { x: 0,  y: 0.46,  z: 0,     roll: -0.2,  pitch: 0,    scale: 0.36, bob: 1,    spin: 3.1  },
        ]
        : [
            { x: -0.42, y: 0,     z: -0.3,  roll: -0.2,  pitch: 0,    scale: 0.94, bob: 0.65, spin: 0.6  },
            { x: 0.5,   y: 0.04,  z: 0,     roll: 0,     pitch: 0.05, scale: 0.86, bob: 0.65, spin: 1.15 },
            { x: 0,     y: -0.14, z: -0.22, roll: -0.55, pitch: 0.1,  scale: 0.96, bob: 0.18, spin: 1.62 },
            { x: -0.12, y: 0.02,  z: 0,     roll: -0.28, pitch: 0,    scale: 0.9,  bob: 0.5,  spin: 2.1  },
            { x: 0,     y: 0.2,   z: -0.18, roll: -0.46, pitch: 0,    scale: 0.62, bob: 1,    spin: 2.75 },
            { x: 0,     y: 0.5,   z: 0,     roll: -0.24, pitch: 0,    scale: 0.42, bob: 1,    spin: 3.1  },
        ];

    const zoom = isMobile
        ? [0.95, 1.02, 0.9, 1.05, 1.05, 1.1]
        : [0.88, 0.95, 0.84, 1, 1, 1.06];

    step.forEach((k, i) => {
        journey
            .to(canScroll, {
                x: k.x, y: k.y, z: k.z,
                roll: k.roll, pitch: k.pitch,
                scale: k.scale, bobAmount: k.bob,
            }, i)
            .to(spin, { value: TAU * k.spin, onUpdate: applySpin }, i)
            .to(camera.position, { z: STAGE.distance * zoom[i] }, i);
    });

    journey
        .to(berryState, { capture: 1, repel: isMobile ? 0 : 0.55, spread: isMobile ? 0.72 : 1 }, 0)
        .to(berryState, { explode: 1, capture: 0.25, spread: isMobile ? 0.6 : 1 }, 1)
        .to(berryState, { explode: 0, capture: 1, spread: isMobile ? 0.55 : 0.8 }, 2)
        .to(berryState, { capture: 1, spread: 0.62 }, 3)
        .to(berryState, { dissolve: 1, opacity: 0.15 }, 4)
        .to(berryState, { dissolve: 0.82, opacity: 0.35 }, 5)

        .to(leafState, { spread: 1.25, drift: 1.5 }, 0)
        .to(leafState, { spread: 1.5, opacity: 0.55 }, 2)
        .to(leafState, { spread: 1.9, opacity: 0.2 }, 4);

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

    gsap.timeline({
        scrollTrigger: {
            trigger: '#act-eco',
            start: 'top bottom',
            end: 'bottom top',
            scrub: SCRUB,
        },
    })
        .fromTo(ecoState, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' })
        .fromTo(ecoState, { progress: 0 }, { progress: 1, duration: 1.35, ease: 'power2.inOut' }, 0)
        .to(ecoState, { progress: 1, duration: 0.75 })
        .to(canScroll, { opacity: 0, duration: 0.45, ease: 'power2.in' }, 0.2)
        .to(canScroll, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 2.25)
        .to(ecoState, { opacity: 0, duration: 0.45, ease: 'power2.in' }, 2.35);

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
