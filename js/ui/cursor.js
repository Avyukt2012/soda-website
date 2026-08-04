import { onFrame } from '../core/loop.js';

const HOVER_SELECTOR = 'a, button, .card, .nav-arrow, .magnetic';

export function initCursor() {
    if (matchMedia('(hover: none)').matches) return;

    const root = document.createElement('div');
    root.className = 'cursor';
    root.innerHTML = `
        <span class="cursor__dot"></span>
        <span class="cursor__ring"></span>
        <span class="cursor__label"></span>
    `;
    document.body.appendChild(root);
    document.body.classList.add('has-cursor');

    const dot = root.querySelector('.cursor__dot');
    const ring = root.querySelector('.cursor__ring');
    const label = root.querySelector('.cursor__label');

    const target = { x: innerWidth / 2, y: innerHeight / 2 };
    const fast = { x: target.x, y: target.y };
    const slow = { x: target.x, y: target.y };
    const scale = { current: 1, target: 1 };

    window.addEventListener('mousemove', (e) => {
        target.x = e.clientX;
        target.y = e.clientY;
    });

    document.addEventListener('mouseover', (e) => {
        const hit = e.target.closest(HOVER_SELECTOR);
        scale.target = hit ? 2.15 : 1;
        root.classList.toggle('is-active', Boolean(hit));

        const text = hit?.dataset.cursor || '';
        label.textContent = text;
        root.classList.toggle('has-label', Boolean(text));
    });

    document.addEventListener('mousedown', () => root.classList.add('is-down'));
    document.addEventListener('mouseup', () => root.classList.remove('is-down'));
    document.addEventListener('mouseleave', () => root.classList.add('is-hidden'));
    document.addEventListener('mouseenter', () => root.classList.remove('is-hidden'));

    onFrame((delta) => {
        const kFast = 1 - Math.pow(0.0005, delta);
        const kSlow = 1 - Math.pow(0.02, delta);

        fast.x += (target.x - fast.x) * kFast;
        fast.y += (target.y - fast.y) * kFast;
        slow.x += (target.x - slow.x) * kSlow;
        slow.y += (target.y - slow.y) * kSlow;
        scale.current += (scale.target - scale.current) * kSlow;

        dot.style.transform = `translate3d(${fast.x}px, ${fast.y}px, 0) translate(-50%, -50%)`;
        ring.style.transform =
            `translate3d(${slow.x}px, ${slow.y}px, 0) translate(-50%, -50%) scale(${scale.current})`;
        label.style.transform = `translate3d(${slow.x}px, ${slow.y}px, 0) translate(-50%, -50%)`;
    });
}
