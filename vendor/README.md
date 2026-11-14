# vendor/
Third-party code Lumi serves itself (so a CDN outage or the service worker can never break a feature).

- `html5-qrcode-2.3.8.min.js` - html5-qrcode 2.3.8 (Apache-2.0, see `LICENSE-html5-qrcode.txt`), unmodified from `https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js`.
  sha256 `660b12437b1d747e3e68b8be0685c08cb728140110ad213f167b14b66f8b1d8e`, 375,364 bytes. Loaded on first use of the barcode scanner (`loadScanLib` in js/app.js); it is in the service worker's shell precache.
  To upgrade: download the new version under a NEW file name (version in the name), update `loadScanLib`, `EXTRA` in tools/build_shell.py, and this README, then run tools/release.sh.
