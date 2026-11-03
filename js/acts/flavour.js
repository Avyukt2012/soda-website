import { gsap, ScrollTrigger, SCRUB } from '../scroll/smooth.js';
import { setFlavorTexture, setFlavourSpin, canScroll } from '../core/can.js';
import { setBerryFlavor } from '../core/berries.js';
import { flavorReady } from '../core/blue.js';
import { setBackgroundFlavor } from '../core/background.js';
import { liquidPass } from '../core/post.js';
import { FLAVORS, isMobile } from '../config.js';

const ORDER = ['classic', 'blue'];
let current = 'classic';
let requested = 'classic';
let switching = false;

const listeners = new Set();
export function onFlavorChange(fn) { listeners.add(fn); }

export function getFlavor() { return current; }

function markActiveCard(flavor) {
    document.querySelectorAll('.card').forEach((c) => {
        c.classList.toggle('active', c.dataset.flavor === flavor);
    });
}

export function applyFlavor(flavor, options) {
    if (!FLAVORS[flavor] || flavor === requested) return;
    requested = flavor;
    markActiveCard(flavor);

    flavorReady(flavor).then(() => {
        if (flavor === requested) switchFlavor(flavor, options);
    }, () => {
        if (flavor !== requested) return;
        requested = current;
        markActiveCard(current);
    });
}

function switchFlavor(flavor, { instant = false } = {}) {
    if (flavor === current) return;
    current = flavor;

    setBackgroundFlavor(flavor, instant ? 0 : 1.25, instant ? null : gsap);

    listeners.forEach((fn) => fn(flavor));

    const swap = () => {
        setFlavorTexture(flavor);
        setBerryFlavor(flavor);
    };

    if (instant) {
        swap();
        return;
    }

    if (switching) {
        swap();
        return;
    }
    switching = true;

    const spin = { value: 0 };
    const apply = () => setFlavourSpin(spin.value);

    gsap.timeline({ onComplete: () => { switching = false; } })
        .to(spin, {
            value: Math.PI,
            duration: 0.5,
            ease: 'power2.in',
            onUpdate: apply,
            onComplete: swap,
        })
        .to(spin, {
            value: Math.PI * 2,
            duration: 1.15,
            ease: 'power2.out',
            onUpdate: apply,
        })
        .set(spin, { value: 0, onComplete: apply })
        .to(canScroll, { punch: 1.06, duration: 0.4, ease: 'power2.out' }, 0)
        .to(canScroll, { punch: 1, duration: 1.2, ease: 'elastic.out(1, 0.6)' }, 0.4);
}

export function initFlavour() {
    document.querySelectorAll('.card').forEach((card) => {
        card.addEventListener('click', () => applyFlavor(card.dataset.flavor));
    });

    document.querySelectorAll('.nav-arrow').forEach((btn) => {
        btn.addEventListener('click', () => {
            const dir = Number(btn.dataset.dir) || 1;
            const next = ORDER[(ORDER.indexOf(requested) + dir + ORDER.length) % ORDER.length];
            applyFlavor(next);
        });
    });

    const track = document.getElementById('flavour-track');
    const section = document.getElementById('act-flavour');
    if (!track || !section) return;

    const panels = track.querySelectorAll('.flavour-panel');
    const distance = () => track.scrollWidth - window.innerWidth;

    const trackTween = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${distance() + window.innerHeight}`,
            scrub: SCRUB,
            invalidateOnRefresh: true,
        },
    });

    if (!isMobile) {
        gsap.from(panels, {
            y: 60,
            opacity: 0,
            ease: 'none',
            stagger: 0.3,
            scrollTrigger: {
                trigger: section,
                start: 'top 85%',
                end: 'top 40%',
                scrub: SCRUB,
            },
        });
    }
}
