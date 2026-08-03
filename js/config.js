const BASE = 'https://api.getlayers.ai/storage/v1/object/public/public/assets/soda-14ff8a788d';

export const ASSETS = {
    can: `${BASE}/deit_soda2.glb`,
    cherry: `${BASE}/cherry.glb`,
    blueberry: `${BASE}/blueberry.glb`,
    leaves: `${BASE}/leaves.glb`,
    texGreen: `${BASE}/green%20base%20color.jpg`,
    texBlue: `${BASE}/blue%20base%20color.jpg`,
    bubble: `${BASE}/bubble.png`,
    cardGreen: `${BASE}/Green%20Soda.png`,
    cardBlue: `${BASE}/Blue%20Soda.png`,
};

export const FLAVORS = {
    classic: {
        inner: '#0b8a78',
        mid: '#044e3b',
        outer: '#011411',
        tint: 0x10b981,
        berry: 'cherry',
    },
    blue: {
        inner: '#0b4f8a',
        mid: '#04294e',
        outer: '#010c14',
        tint: 0x3b82f6,
        berry: 'blueberry',
    },
};

export const STAGE = {
    fov: 30,
    distance: 3.8,
    roll: -25 * Math.PI / 180,
    fill: 0.71,
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
