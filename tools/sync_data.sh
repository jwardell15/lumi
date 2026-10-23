#!/usr/bin/env bash
# Lumi 17.4: publish local data/ and img/w/ to the Cloudflare Pages project "lumi-data" (https://lumi-data-cky.pages.dev/).
# These folders are no longer tracked in git (1 GB GitHub Pages limit). Requires `wrangler login` on this machine.
# usage: tools/sync_data.sh [--verify]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; STAGE="${STAGE:-/tmp/lumi-data-stage}"
rm -rf "$STAGE"; mkdir -p "$STAGE/img"
cp -a "$ROOT/data" "$STAGE/data"; cp -a "$ROOT/img/w" "$STAGE/img/w"
find "$STAGE" -name '*.png' -delete
cat > "$STAGE/_headers" <<'H'
/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
  X-Content-Type-Options: nosniff
H
N=$(find "$STAGE" -type f ! -name _headers | wc -l); echo "files: $N (Cloudflare Pages limit 20000, 25 MiB each)"
find "$STAGE" -type f -size +25M -print | sed 's/^/TOO BIG: /' | grep . && exit 1 || true
mkdir -p /tmp/lumi-wr && cd /tmp/lumi-wr && [ -f package.json ] || echo '{}' > package.json
WRANGLER_CACHE_DIR=/tmp/lumi-wr/.wc npx -y wrangler pages deploy "$STAGE" --project-name lumi-data --branch main --commit-dirty=true
if [ "${1:-}" = "--verify" ]; then
  cd "$STAGE" && find data img -type f | python3 -c '
import sys,hashlib,urllib.request,concurrent.futures as cf
B="https://lumi-data-cky.pages.dev/"; fs=sys.stdin.read().split()
def c(f):
  try: r=urllib.request.urlopen(urllib.request.Request(B+f,headers={"Accept-Encoding":"identity","User-Agent":"lumi-sync"}),timeout=60).read()
  except Exception as e: return f,False
  return f,hashlib.sha256(r).digest()==hashlib.sha256(open(f,"rb").read()).digest()
bad=[f for f,ok in cf.ThreadPoolExecutor(16).map(c,fs) if not ok]
print(len(fs),"checked,",len(bad),"mismatched",bad[:10]); sys.exit(1 if bad else 0)'
fi
