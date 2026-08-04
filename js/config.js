// Vendored locally: the origin CDN throttles under repeated loads, and a
// self-contained asset folder is what makes this deployable.
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
    // The can has to share a phone screen with the whole hero stack, so it
    // takes a much smaller share of the frame there.
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
