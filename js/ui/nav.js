import { gsap, ScrollTrigger } from '../scroll/smooth.js';
import { lenis } from '../scroll/smooth.js';

const MAP = [
    { label: 'Home', target: '#act-hero' },
    { label: 'Ingredients', target: '#act-anatomy' },
    { label: 'Taste', target: '#act-pour' },
    { label: 'Eco', target: '#act-eco' },
    { label: 'Reviews', target: '#act-reviews' },
];

export function initNav() {
    const items = [...document.querySelectorAll('.nav-item')];
    if (!items.length) return;

    items.forEach((item, i) => {
        const entry = MAP[i];
        if (!entry) return;

        item.dataset.target = entry.target;
        item.setAttribute('href', entry.target);
        item.dataset.cursor = 'Go';

        item.addEventListener('click', (e) => {
            e.preventDefault();
            const el = document.querySelector(entry.target);
            if (!el) return;
            lenis.scrollTo(el, {
                offset: entry.target === '#act-hero' ? 0 : -1,
                duration: 1.5,
                easing: (t) => 1 - Math.pow(1 - t, 4),
            });
        });
    });

    const setActive = (target) => {
        items.forEach((item) => {
            item.classList.toggle('active', item.dataset.target === target);
        });
    };

    MAP.forEach(({ target }) => {
        const el = document.querySelector(target);
        if (!el) return;
        ScrollTrigger.create({
            trigger: el,
            start: 'top center',
            end: 'bottom center',
            onToggle: (self) => { if (self.isActive) setActive(target); },
        });
    });

    const header = document.querySelector('.header');
    if (!header) return;

    const show = gsap.quickTo(header, 'yPercent', { duration: 0.55, ease: 'power3.out' });
    let hidden = false;
    let nearTop = false;
    let scrolledPast = false;
    let goingDown = false;

    const apply = () => {
        const shouldHide = goingDown && scrolledPast && !nearTop;
        if (shouldHide === hidden) return;
        hidden = shouldHide;
        show(hidden ? -140 : 0);
    };

    ScrollTrigger.create({
        start: 'top top',
        end: 'max',
        onUpdate: (self) => {
            goingDown = self.direction === 1;
            scrolledPast = self.scroll() > window.innerHeight * 0.6;
            apply();
        },
    });

    window.addEventListener('mousemove', (e) => {
        const next = e.clientY < 110;
        if (next === nearTop) return;
        nearTop = next;
        apply();
    });
}
