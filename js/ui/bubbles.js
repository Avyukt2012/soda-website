import { ASSETS } from '../config.js';

export function initBubbles() {
    const container = document.getElementById('bubbles-container');
    if (!container) return;

    const spawn = () => {
        if (document.hidden) return;
        const bubble = document.createElement('img');
        bubble.src = ASSETS.bubble;
        bubble.className = 'bubble-img';
        bubble.style.width = `${Math.random() * 20 + 10}px`;
        bubble.style.left = `${Math.random() * 100}%`;
        bubble.style.opacity = Math.random() * 0.4 + 0.2;

        const duration = Math.random() * 6 + 4;
        bubble.style.animationDuration = `${duration}s`;

        container.appendChild(bubble);
        setTimeout(() => bubble.remove(), duration * 1000);
    };

    setInterval(spawn, 400);
}
