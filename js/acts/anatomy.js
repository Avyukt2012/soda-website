import { gsap } from '../scroll/smooth.js';
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
            scrub: 1,
        },
    });

    labels.forEach((label, i) => {
        const at = 0.12 + i * 0.16;
        tl.to(label, { opacity: 1, duration: 0.12, ease: 'none' }, at)
            .to(label.querySelector('path'), {
                drawSVG: '100%',
                duration: 0.3,
                ease: 'power2.out',
            }, at)
            .to(label.querySelector('.anatomy-label__text'), {
                xPercent: 0,
                opacity: 1,
                duration: 0.3,
                ease: 'power3.out',
            }, at + 0.08);
    });

    // Hold, then retire the whole set before the pour arrives.
    tl.to(labels, {
        opacity: 0,
        xPercent: 6,
        duration: 0.22,
        ease: 'power2.in',
        stagger: 0.04,
    }, 0.76);
}
