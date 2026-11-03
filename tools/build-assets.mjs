#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { keepDefaultSceneOnly, readGlb, replaceImage, useWebpTextures, writeGlb } from './glb.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const ASSETS = join(ROOT, 'assets');
const ORIGINALS_COMMIT = '88b4097';
const HEADLESS_SHELL = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const CARD_RENDER_SIZE = 1400;
const CARD_PNG_SIZE = 700;
const CARD_WEBP_SIZE = 420;

const COLOURWAYS = { classic: 'green', blue: 'blue' };
const TEXTURE_ENCODING = {
    2048: { quality: 88 },
    1024: { quality: 92 },
};
const SURFACE_SIZE = 1024;
const BERRY_MAP_SIZE = 1024;
const LEAF_MAP_SIZE = 1024;

const work = mkdtempSync(join(tmpdir(), 'soda-assets-'));
const scratch = (name) => join(work, name);
const original = (name) => execFileSync('git', ['show', `${ORIGINALS_COMMIT}:assets/${name}`], { cwd: ROOT, maxBuffer: 1 << 28 });

let counter = 0;
function webp(input, { size, quality = 88, alphaQuality = 100, exact = false, sharp = true, lossless = false } = {}) {
    const source = scratch(`in-${counter}.png`);
    const output = scratch(`out-${counter}.webp`);
    counter++;
    const resize = size ? ['-filter', 'Lanczos', '-resize', `${size}x${size}`] : [];
    execFileSync('magick', ['-', '-strip', ...resize, `PNG32:${source}`], { input, maxBuffer: 1 << 28, stdio: ['pipe', 'ignore', 'ignore'] });
    const flags = ['-quiet', '-m', '6', '-q', String(quality), '-alpha_q', String(alphaQuality), '-metadata', 'none'];
    if (lossless) flags.push('-lossless');
    if (sharp) flags.push('-sharp_yuv');
    if (exact) flags.push('-exact');
    execFileSync('cwebp', [...flags, source, '-o', output]);
    return readFileSync(output);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.woff2': 'font/woff2' };

function serve() {
    return new Promise((done) => {
        const server = createServer((request, response) => {
            const path = normalize(decodeURIComponent(request.url.split('?')[0]));
            const file = path.startsWith('/__work/') ? join(work, path.slice(8)) : join(ROOT, path);
            if (!existsSync(file)) {
                response.writeHead(404);
                response.end();
                return;
            }
            response.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
            response.end(readFileSync(file));
        });
        server.listen(0, '127.0.0.1', () => done({ origin: `http://127.0.0.1:${server.address().port}`, close: () => server.close() }));
    });
}

async function renderLabelLayers(browser, origin) {
    const page = await (await browser.newContext({ viewport: { width: 2048, height: 2048 }, deviceScaleFactor: 1 })).newPage();
    const layers = {};
    for (const flavour of Object.keys(COLOURWAYS)) {
        await page.goto(`${origin}/tools/label.html?flavour=${flavour}&layer=colour`);
        await page.evaluate(() => window.labelReady);
        layers[flavour] = await page.screenshot({ type: 'png' });
    }
    await page.goto(`${origin}/tools/label.html?flavour=classic&layer=surface`);
    await page.evaluate(() => window.labelReady);
    layers.surface = await page.screenshot({ type: 'png' });
    await page.context().close();
    return layers;
}

function packCan(surface) {
    const glb = readGlb(original('can.glb'));
    const material = glb.json.materials[0];
    material.name = 'Soda_Can';
    delete material.pbrMetallicRoughness.baseColorTexture;
    const pruned = keepDefaultSceneOnly(glb);
    pruned.json.images.forEach((image, index) => {
        const isNormal = /normal/i.test(image.name);
        const encoded = isNormal
            ? webp(pruned.views[image.bufferView], { size: SURFACE_SIZE, quality: 80, sharp: false })
            : webp(surface, { size: SURFACE_SIZE, lossless: true, sharp: false });
        replaceImage(pruned, index, encoded);
        pruned.json.images[index].name = isNormal ? 'Soda_Can_Normal' : 'Soda_Can_Surface';
    });
    return writeGlb(pruned);
}

const imageWidth = (bytes) => Number(execFileSync('magick', ['identify', '-format', '%w', '-'], { input: bytes, stdio: ['pipe', 'pipe', 'ignore'] }).toString());

function repackMaps(name, { size, exactAlpha = false, quality = 86, webpTextures = false }) {
    const pruned = keepDefaultSceneOnly(readGlb(original(name)));
    pruned.json.images.forEach((image, index) => {
        const bytes = pruned.views[image.bufferView];
        if (image.mimeType === 'image/webp' && imageWidth(bytes) === size) return;
        const isColour = /base|image_0/i.test(image.name);
        replaceImage(pruned, index, webp(bytes, {
            size,
            quality: isColour ? quality : quality - 6,
            exact: exactAlpha && isColour,
            sharp: isColour,
        }));
    });
    if (webpTextures) useWebpTextures(pruned);
    return writeGlb(pruned);
}

async function renderCard(browser, origin, flavour, texture) {
    writeFileSync(scratch(`card-${flavour}.png`), texture);
    const context = await browser.newContext({ viewport: { width: CARD_RENDER_SIZE, height: CARD_RENDER_SIZE }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('pageerror', (error) => console.error(error));
    await page.goto(`${origin}/tools/card.html?texture=/__work/card-${flavour}.png`);
    await page.waitForFunction(() => window.cardReady === true, null, { timeout: 60000 });
    const shot = await page.screenshot({ type: 'png', omitBackground: true });
    await context.close();
    return execFileSync('magick', ['-', '-filter', 'Lanczos', '-resize', `${CARD_PNG_SIZE}x${CARD_PNG_SIZE}`, 'PNG32:-'], { input: shot, maxBuffer: 1 << 28 });
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || HEADLESS_SHELL, headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const server = await serve();
const report = (name, bytes) => console.log(`${name.padEnd(26)} ${String(Math.round(bytes.length / 1024)).padStart(5)} KB`);
const save = (name, bytes) => {
    writeFileSync(join(ASSETS, name), bytes);
    report(name, bytes);
};

try {
    const layers = await renderLabelLayers(browser, server.origin);
    if (process.env.KEEP_LABELS) {
        for (const [name, bytes] of Object.entries(layers)) writeFileSync(join(process.env.KEEP_LABELS, `label-${name}.png`), bytes);
    }
    for (const [flavour, colour] of Object.entries(COLOURWAYS)) {
        for (const [size, encoding] of Object.entries(TEXTURE_ENCODING)) {
            save(`tex-${colour}-${size}.webp`, webp(layers[flavour], { size: Number(size), ...encoding }));
        }
    }
    save('can.glb', packCan(layers.surface));
    save('cherry.glb', repackMaps('cherry.glb', { size: BERRY_MAP_SIZE }));
    save('leaves.glb', repackMaps('leaves.glb', { size: LEAF_MAP_SIZE }));
    save('blueberry.glb', repackMaps('blueberry.glb', { size: BERRY_MAP_SIZE, exactAlpha: true, quality: 90, webpTextures: true }));
    for (const [flavour, colour] of Object.entries(COLOURWAYS)) {
        const card = await renderCard(browser, server.origin, flavour, layers[flavour]);
        if (flavour === 'classic') save(`card-${colour}.png`, card);
        if (process.env.KEEP_LABELS) writeFileSync(join(process.env.KEEP_LABELS, `card-${colour}.png`), card);
        save(`card-${colour}.webp`, webp(card, { size: CARD_WEBP_SIZE, quality: 88, alphaQuality: 95 }));
    }
} finally {
    await browser.close();
    server.close();
    rmSync(work, { recursive: true, force: true });
}
