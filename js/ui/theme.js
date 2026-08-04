import * as THREE from 'three';
import { gsap } from '../scroll/smooth.js';
import { THEME, FLAVORS } from '../config.js';
import { renderer } from '../core/stage.js';
import { bloomPass, grainPass, liquidPass } from '../core/post.js';
import { applyThemeToBackground } from '../core/background.js';
import { setParticlePalette } from '../core/particles.js';
import { getFlavor } from '../acts/flavour.js';

const STORE_KEY = 'soda-theme';
let current = 'dark';
const listeners = new Set();

export function onThemeChange(fn) { listeners.add(fn); }
export function getTheme() { return current; }

function paint(theme, animate) {
    const t = THEME[theme];
    const d = animate ? 0.9 : 0;

    gsap.to(renderer, { toneMappingExposure: t.exposure, duration: d, ease: 'power2.inOut' });
    gsap.to(bloomPass, { strength: t.bloom, duration: d, ease: 'power2.inOut' });
    gsap.to(grainPass.uniforms.uGrain, { value: t.grain, duration: d, ease: 'power2.inOut' });
    gsap.to(grainPass.uniforms.uVignette, { value: t.vignette, duration: d, ease: 'power2.inOut' });

    const flavor = getFlavor();
    applyThemeToBackground(flavor, theme, animate ? gsap : null);
    setParticlePalette(flavor, theme);

    const entry = FLAVORS[flavor] || FLAVORS.classic;
    const tint = new THREE.Color(theme === 'light' ? entry.tintLight : entry.tint);
    gsap.to(liquidPass.uniforms.uColor.value, {
        r: tint.r, g: tint.g, b: tint.b, duration: d, ease: 'power2.inOut',
    });

    listeners.forEach((fn) => fn(theme));
}

export function setTheme(theme, { animate = true } = {}) {
    current = theme;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORE_KEY, theme);
    paint(theme, animate);
}

export function refreshTheme() {
    paint(current, true);
}

export function initTheme() {
    const stored = localStorage.getItem(STORE_KEY);
    const prefersLight = matchMedia('(prefers-color-scheme: light)').matches;
    setTheme(stored || (prefersLight ? 'light' : 'dark'), { animate: false });

    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Toggle light and dark');
    btn.dataset.cursor = 'Theme';
    btn.innerHTML = `
        <span class="theme-toggle__track">
            <span class="theme-toggle__knob"></span>
        </span>
        <span class="theme-toggle__label">${current === 'light' ? 'Light' : 'Dark'}</span>
    `;
    document.body.appendChild(btn);

    const label = btn.querySelector('.theme-toggle__label');
    btn.addEventListener('click', () => {
        setTheme(current === 'light' ? 'dark' : 'light');
        label.textContent = current === 'light' ? 'Light' : 'Dark';
    });
}
