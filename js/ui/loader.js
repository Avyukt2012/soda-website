import * as THREE from 'three';
import gsap from 'gsap';

export function createLoader() {
    const el = document.createElement('div');
    el.className = 'loader';
    el.innerHTML = `
        <div class="loader__inner">
            <span class="loader__mark">Soda</span>
            <span class="loader__count"><em>0</em><i>%</i></span>
        </div>
        <div class="loader__bar"><span></span></div>
        <div class="loader__curtain"></div>
    `;
    document.body.appendChild(el);

    const countEl = el.querySelector('.loader__count em');
    const barEl = el.querySelector('.loader__bar span');
    const shown = { value: 0 };
    let real = 0;

    const paint = () => {
        countEl.textContent = Math.round(shown.value);
        barEl.style.transform = `scaleX(${shown.value / 100})`;
    };

    const push = (target) => {
        real = Math.max(real, target);
        gsap.to(shown, {
            value: real,
            duration: 0.6,
            ease: 'power2.out',
            onUpdate: paint,
            overwrite: true,
        });
    };

    THREE.DefaultLoadingManager.onProgress = (_url, loaded, total) => {
        push(total > 0 ? (loaded / total) * 95 : 0);
    };

    return {
        finish() {
            return new Promise((resolve) => {
                gsap.timeline({ onComplete: () => { el.remove(); resolve(); } })
                    .to(shown, { value: 100, duration: 0.45, ease: 'power2.out', onUpdate: paint })
                    .to('.loader__inner', { yPercent: -120, opacity: 0, duration: 0.7, ease: 'power3.inOut' }, '+=0.15')
                    .to('.loader__bar', { scaleY: 0, opacity: 0, duration: 0.4, ease: 'power2.in' }, '<')
                    .to('.loader__curtain', {
                        scaleY: 0,
                        transformOrigin: 'top',
                        duration: 1.1,
                        ease: 'expo.inOut',
                    }, '<0.1')
                    .set(el, { pointerEvents: 'none' });
            });
        },
        fail() {
            el.remove();
        },
    };
}
