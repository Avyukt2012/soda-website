import { gsap, ScrollTrigger, scrollState } from '../scroll/smooth.js';
import SplitText from 'gsap/SplitText';
import { onFrame } from '../core/loop.js';

gsap.registerPlugin(SplitText);

const EASE_OUT = 'power4.out';

export function initTextReveals() {
    document.querySelectorAll('[data-split]').forEach((el) => {
        const split = new SplitText(el, { type: 'chars,lines', linesClass: 'split-line' });
        gsap.set(split.chars, { yPercent: 118, rotate: 7, opacity: 0 });

        gsap.to(split.chars, {
            yPercent: 0,
            rotate: 0,
            opacity: 1,
            duration: 1.15,
            ease: EASE_OUT,
            stagger: { each: 0.028, from: 'start' },
            scrollTrigger: { trigger: el, start: 'top 82%', once: true },
        });
    });

    document.querySelectorAll('[data-fade]').forEach((el) => {
        gsap.fromTo(el,
            { y: 24, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 0.95,
                ease: EASE_OUT,
                scrollTrigger: { trigger: el, start: 'top 88%', once: true },
            }
        );
    });
}

export function initHeroIntro() {
    const targets = [
        ...document.querySelectorAll('.main-title, .side-title'),
    ];
    targets.forEach((el) => {
        const split = new SplitText(el, { type: 'chars' });
        gsap.from(split.chars, {
            yPercent: 120,
            opacity: 0,
            rotate: 8,
            duration: 1.3,
            ease: EASE_OUT,
            stagger: { each: 0.03 },
            delay: 0.15,
        });
    });

    gsap.from('.header, .description, .cta-group, .award-badge, .product-carousel', {
        y: 18,
        opacity: 0,
        duration: 1,
        ease: EASE_OUT,
        stagger: 0.08,
        delay: 0.35,
    });
}

export function initMarquee() {
    const rows = [...document.querySelectorAll('.marquee__row')];
    if (!rows.length) return;

    const state = rows.map((row) => ({
        el: row,
        dir: Number(row.dataset.marquee) || 1,
        offset: 0,
        width: row.scrollWidth / 2,
    }));

    const remeasure = () => state.forEach((s) => { s.width = s.el.scrollWidth / 2; });
    window.addEventListener('resize', remeasure);
    ScrollTrigger.addEventListener('refreshInit', remeasure);

    onFrame((delta) => {
        const boost = Math.min(Math.abs(scrollState.smoothVelocity) * 0.35, 26);
        const skew = gsap.utils.clamp(-9, 9, scrollState.smoothVelocity * 0.22);

        state.forEach((s) => {
            s.offset -= (34 + boost) * s.dir * delta;
            if (s.width > 0) s.offset = ((s.offset % s.width) + s.width) % s.width;
            s.el.style.transform = `translate3d(${-s.offset}px,0,0) skewX(${skew}deg)`;
        });
    });
}

export function initMagnetic() {
    document.querySelectorAll('.magnetic').forEach((el) => {
        const target = { x: 0, y: 0 };
        const current = { x: 0, y: 0 };
        let inside = false;

        el.addEventListener('pointerenter', () => { inside = true; });
        el.addEventListener('pointerleave', () => {
            inside = false;
            target.x = 0;
            target.y = 0;
        });
        el.addEventListener('pointermove', (e) => {
            if (!inside) return;
            const r = el.getBoundingClientRect();
            target.x = (e.clientX - (r.left + r.width / 2)) * 0.32;
            target.y = (e.clientY - (r.top + r.height / 2)) * 0.42;
        });

        onFrame((delta) => {
            const k = 1 - Math.pow(0.0015, delta);
            current.x += (target.x - current.x) * k;
            current.y += (target.y - current.y) * k;
            el.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
        });
    });
}
