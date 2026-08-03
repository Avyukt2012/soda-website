import { gsap, ScrollTrigger } from '../scroll/smooth.js';
import { setFlavorTexture, setSpin, canScroll } from '../core/can.js';
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

    if (instant) {
        setFlavorTexture(flavor);
        setBerryFlavor(flavor);
        return;
    }

    // Spin the can and swap the label at the peak, so the change is hidden by
    // the fastest part of the rotation.
    if (switching) return;
    switching = true;

    const spin = { value: 0 };
    gsap.timeline({ onComplete: () => { switching = false; setSpin(0); } })
        .to(spin, {
            value: Math.PI * 2,
            duration: 0.55,
            ease: 'power2.in',
            onUpdate: () => setSpin(spin.value),
            onComplete: () => {
                setFlavorTexture(flavor);
                setBerryFlavor(flavor);
            },
        })
        .to(spin, {
            value: Math.PI * 4,
            duration: 1.25,
            ease: 'back.out(0.7)',
            onUpdate: () => setSpin(spin.value),
        })
        .to(canScroll, { scale: canScroll.scale * 1.05, duration: 0.4, ease: 'power2.out' }, 0)
        .to(canScroll, { scale: canScroll.scale, duration: 1.2, ease: 'elastic.out(1, 0.6)' }, 0.4);
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

    gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${distance() + window.innerHeight}`,
            scrub: 1,
            invalidateOnRefresh: true,
        },
    });

    panels.forEach((panel) => {
        ScrollTrigger.create({
            trigger: panel,
            containerAnimation: gsap.getTweensOf(track)[0],
            start: 'left center',
            end: 'right center',
            onEnter: () => applyFlavor(panel.dataset.flavour),
            onEnterBack: () => applyFlavor(panel.dataset.flavour),
        });
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
