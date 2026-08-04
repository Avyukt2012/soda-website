import { gsap, ScrollTrigger, SCRUB } from '../scroll/smooth.js';
import { setFlavorTexture, setFlavourSpin, canScroll } from '../core/can.js';
import { setBerryFlavor } from '../core/berries.js';
import { setBackgroundFlavor } from '../core/background.js';
import { setLiquidColor } from '../core/post.js';
import { FLAVORS, isMobile } from '../config.js';

const ORDER = ['classic', 'blue'];
let current = 'classic';
let switching = false;

const listeners = new Set();
export function onFlavorChange(fn) { listeners.add(fn); }

export function getFlavor() { return current; }

export function applyFlavor(flavor, { instant = false } = {}) {
    if (!FLAVORS[flavor] || flavor === current) return;
    current = flavor;

    document.querySelectorAll('.card').forEach((c) => {
        c.classList.toggle('active', c.dataset.flavor === flavor);
    });

    setBackgroundFlavor(flavor, instant ? 0 : 1.25, instant ? null : gsap);
    setLiquidColor(FLAVORS[flavor].tint);
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

    // A full turn, swapped at the fastest part of the rotation. Runs on its
    // own spin channel so it sums with the scroll journey rather than
    // fighting it, and unwinds to zero instead of being slammed there.
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
            const next = ORDER[(ORDER.indexOf(current) + dir + ORDER.length) % ORDER.length];
            applyFlavor(next);
        });
    });

    // Act 4 - horizontal panel scroll. Each panel that reaches centre takes
    // the whole scene with it.
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
            duration: 1,
            ease: 'power3.out',
            stagger: 0.12,
            scrollTrigger: { trigger: section, start: 'top 70%', once: true },
        });
    }
}
