#!/bin/zsh
set -euo pipefail

ROOT="${0:A:h:h}"
THREE_DIR="$ROOT/vendor/three-0.170.0"
GSAP_DIR="$ROOT/vendor/gsap-3.13.0"
LENIS_DIR="$ROOT/vendor/lenis-1.1.0"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$THREE_DIR/draco" "$GSAP_DIR" "$LENIS_DIR"

cd "$WORK"
npm init -y >/dev/null
npm install --silent --no-audit --no-fund three@0.170.0 esbuild@0.28.2

cp node_modules/three/build/three.module.min.js "$THREE_DIR/"
cp node_modules/three/examples/jsm/libs/draco/draco_wasm_wrapper.js "$THREE_DIR/draco/"
cp node_modules/three/examples/jsm/libs/draco/draco_decoder.wasm "$THREE_DIR/draco/"

cat > addons.js <<'ADDONS'
export { GLTFLoader } from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
export { DRACOLoader } from './node_modules/three/examples/jsm/loaders/DRACOLoader.js';
export { EffectComposer } from './node_modules/three/examples/jsm/postprocessing/EffectComposer.js';
export { RenderPass } from './node_modules/three/examples/jsm/postprocessing/RenderPass.js';
export { ShaderPass } from './node_modules/three/examples/jsm/postprocessing/ShaderPass.js';
export { UnrealBloomPass } from './node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js';
export { OutputPass } from './node_modules/three/examples/jsm/postprocessing/OutputPass.js';
export { RoomEnvironment } from './node_modules/three/examples/jsm/environments/RoomEnvironment.js';
ADDONS
npx esbuild addons.js --bundle --format=esm --minify --external:three --target=es2020 --outfile="$THREE_DIR/addons.min.js" --log-level=warning

for module in gsap ScrollTrigger SplitText DrawSVGPlugin; do
    curl -fsSL "https://esm.sh/gsap@3.13.0/es2022/$module.mjs" | sed '/^\/\/# sourceMappingURL=/d' > "$GSAP_DIR/$module.mjs"
done

curl -fsSL "https://unpkg.com/lenis@1.1.0/dist/lenis.mjs" | sed '/^\/\/# sourceMappingURL=/d' > "$LENIS_DIR/lenis.mjs"
