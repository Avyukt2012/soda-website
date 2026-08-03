import * as THREE from 'three';

const clock = new THREE.Clock();
const callbacks = new Set();

export function damp(current, target, ease, delta) {
    return current + (target - current) * (1 - Math.pow(1 - ease, delta * 60));
}

export function dampVec(vec, target, ease, delta) {
    vec.x = damp(vec.x, target.x, ease, delta);
    vec.y = damp(vec.y, target.y, ease, delta);
    if ('z' in vec && 'z' in target) vec.z = damp(vec.z, target.z, ease, delta);
    return vec;
}

export function onFrame(fn) {
    callbacks.add(fn);
    return () => callbacks.delete(fn);
}

export function start() {
    let raf = 0;
    const tick = () => {
        raf = requestAnimationFrame(tick);
        const delta = Math.min(clock.getDelta(), 1 / 20);
        const elapsed = clock.elapsedTime;
        for (const fn of callbacks) fn(delta, elapsed);
    };
    raf = requestAnimationFrame(tick);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(raf);
        } else {
            clock.getDelta();
            raf = requestAnimationFrame(tick);
        }
    });
}
