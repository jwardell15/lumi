#!/usr/bin/env bash
# Release build: bundle + minify (index.src.html -> index.html, dist/), then the service worker's shell manifest. Run before every commit that touches css/, js/ or index.src.html.
set -e; cd "$(dirname "$0")/.."
[ -d tools/build/node_modules/esbuild ] || (cd tools/build && npm ci --no-audit --no-fund)
node tools/build/build.mjs
python3 tools/build_shell.py
