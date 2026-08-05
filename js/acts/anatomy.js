import { gsap, SCRUB } from '../scroll/smooth.js';
import DrawSVGPlugin from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(DrawSVGPlugin);

export function initAnatomy() {
    const section = document.getElementById('act-anatomy');
    if (!section) return;

    const labels = [...section.querySelectorAll('.anatomy-label')];
    if (!labels.length) return;

    gsap.set(labels.map((l) => l.querySelector('path')), { drawSVG: '0%' });
    gsap.set(labels.map((l) => l.querySelector('.anatomy-label__text')), { xPercent: -8, opacity: 0 });

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom bottom',
            scrub: SCRUB,
        },
    });

    const ENTER = 0.105;
    const HOLD_FROM = 0.05 + labels.length * ENTER + 0.24;

    labels.forEach((label, i) => {
        const at = 0.05 + i * ENTER;
        tl.to(label, { opacity: 1, duration: 0.08, ease: 'none' }, at)
            .to(label.querySelector('path'), {
                drawSVG: '100%',
                duration: 0.22,
                ease: 'power2.out',
            }, at)
            .to(label.querySelector('.anatomy-label__text'), {
                xPercent: 0,
                opacity: 1,
                duration: 0.22,
                ease: 'power3.out',
            }, at + 0.06);
    });

    tl.to(labels, { opacity: 1, duration: 0.86 - HOLD_FROM }, HOLD_FROM);

    tl.to(labels, {
        opacity: 0,
        duration: 0.12,
        ease: 'none',
        stagger: 0.015,
    }, 0.86);
}
