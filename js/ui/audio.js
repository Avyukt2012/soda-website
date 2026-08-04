import { onFrame } from '../core/loop.js';
import { postState } from '../core/post.js';

const STORE_KEY = 'soda-audio';

let ctx = null;
let master = null;
let ambient = null;
let enabled = false;
let started = false;

function noiseBuffer(context, seconds = 2) {
    const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
    }
    return buffer;
}

function buildAmbient() {
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.connect(master);

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx, 4);
    noise.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 340;
    lp.Q.value = 0.6;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.34;
    noise.connect(lp).connect(noiseGain).connect(bus);
    noise.start();

    const drone = ctx.createGain();
    drone.gain.value = 0.09;
    drone.connect(bus);

    [55, 82.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.05 + i * 0.03;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 1.4;
        lfo.connect(lfoGain).connect(osc.detune);
        lfo.start();

        osc.connect(drone);
        osc.start();
    });

    const swell = ctx.createGain();
    swell.gain.value = 0;
    swell.connect(bus);

    const swellNoise = ctx.createBufferSource();
    swellNoise.buffer = noiseBuffer(ctx, 3);
    swellNoise.loop = true;
    const swellFilter = ctx.createBiquadFilter();
    swellFilter.type = 'bandpass';
    swellFilter.frequency.value = 700;
    swellFilter.Q.value = 0.9;
    swellNoise.connect(swellFilter).connect(swell);
    swellNoise.start();

    return { bus, swell, swellFilter };
}

export function tick(pitch = 1) {
    if (!enabled || !ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(190 * pitch, now + 0.14);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.25);
}

function ensureContext() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    ambient = buildAmbient();

    onFrame((delta) => {
        if (!ambient || !enabled) return;
        const t = ctx.currentTime;
        ambient.swell.gain.setTargetAtTime(Math.min(postState.fill, 1) * 0.2, t, 0.35);
        ambient.swellFilter.frequency.setTargetAtTime(420 + postState.fill * 900, t, 0.4);
    });
}

function setEnabled(on) {
    enabled = on;
    localStorage.setItem(STORE_KEY, on ? 'on' : 'off');
    document.body.classList.toggle('audio-on', on);

    if (!on) {
        if (master) master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
        return;
    }
    ensureContext();
    if (ctx.state === 'suspended') ctx.resume();
    master.gain.setTargetAtTime(0.5, ctx.currentTime, 0.6);
    if (ambient) ambient.bus.gain.setTargetAtTime(0.55, ctx.currentTime, 1.2);
}

export function initAudio() {
    const btn = document.createElement('button');
    btn.className = 'audio-toggle';
    btn.setAttribute('type', 'button');
    btn.innerHTML = `<span class="audio-toggle__bars">${'<i></i>'.repeat(4)}</span><span class="audio-toggle__text">Sound</span>`;
    document.body.appendChild(btn);

    btn.addEventListener('click', () => {
        started = true;
        setEnabled(!enabled);
        if (enabled) tick(1.2);
    });

    const remembered = localStorage.getItem(STORE_KEY) === 'on';
    if (remembered) {
        const resume = () => {
            if (started) return;
            started = true;
            setEnabled(true);
            window.removeEventListener('pointerdown', resume);
            window.removeEventListener('wheel', resume);
        };
        window.addEventListener('pointerdown', resume, { once: true });
        window.addEventListener('wheel', resume, { once: true });
    }

    document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.hidden) ctx.suspend();
        else if (enabled) ctx.resume();
    });
}
