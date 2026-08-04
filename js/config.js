const BASE = 'assets';

export const ASSETS = {
    can: `${BASE}/can.glb`,
    cherry: `${BASE}/cherry.glb`,
    blueberry: `${BASE}/blueberry.glb`,
    leaves: `${BASE}/leaves.glb`,
    texGreen: `${BASE}/tex-green.jpg`,
    texBlue: `${BASE}/tex-blue.jpg`,
    bubble: `${BASE}/bubble.png`,
    cardGreen: `${BASE}/card-green.png`,
    cardBlue: `${BASE}/card-blue.png`,
};

export const FLAVORS = {
    classic: {
        dark:  { inner: '#0b8a78', mid: '#044e3b', outer: '#011411' },
        light: { inner: '#ffffff', mid: '#c7ede0', outer: '#63b89b' },
        tint: 0x10b981,
        tintLight: 0x34d399,
        particle: 0xdfe8ee,
        particleLight: 0x0f766e,
        berry: 'cherry',
    },
    blue: {
        dark:  { inner: '#0b4f8a', mid: '#04294e', outer: '#010c14' },
        light: { inner: '#ffffff', mid: '#cfe2f7', outer: '#6ba3d8' },
        tint: 0x3b82f6,
        tintLight: 0x60a5fa,
        particle: 0xd6e4f0,
        particleLight: 0x1d4ed8,
        berry: 'blueberry',
    },
};

export const THEME = {
    dark:  { exposure: 1.15, bloom: 0.45, grain: 0.045, vignette: 0.9,  bgLift: 1.45 },
    light: { exposure: 1.0,  bloom: 0.12, grain: 0.022, vignette: 0.35, bgLift: 1.0 },
};

export const STAGE = {
    fov: 30,
    distance: 3.8,
    roll: -25 * Math.PI / 180,
    fill: matchMedia('(max-width: 900px)').matches ? 0.4 : 0.71,
    exposure: 1.15,
    maxDpr: 1.5,
};

export const MOTION = {
    mouseEase: 0.05,
    orbitAzimuth: 40 * Math.PI / 180,
    orbitPolar: 20 * Math.PI / 180,
    bobAmplitude: 0.075,
    bobPeriod: 6,
};

export const isMobile = matchMedia('(max-width: 900px)').matches;
