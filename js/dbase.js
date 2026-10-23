/* Lumi 17.4: food data (data/, img/w/) is hosted on Cloudflare Pages (lumi-data) to get past the 1 GB GitHub Pages limit.
   Relative 'data/...' and 'img/w/...' fetches go to DATA_BASE first, then fall back to the same-origin path. */
(function () {
  const BASE = 'https://lumi-data-cky.pages.dev/';
  self.DATA_BASE = BASE;
  const isData = u => typeof u === 'string' && /^(\.\/)?(data|img\/w)\//.test(u);
  self.dataURL = u => isData(u) ? BASE + u.replace(/^\.\//, '') : u;
  if (typeof fetch !== 'function') return;
  const f0 = fetch.bind(self);
  self.fetch = function (input, init) {
    if (!isData(input)) return f0(input, init);
    const local = () => f0(input, init);
    return f0(self.dataURL(input), Object.assign({}, init, { mode: 'cors', credentials: 'omit' }))
      .then(r => r.ok ? r : local().then(l => l.ok ? l : r).catch(() => r))
      .catch(e => (init && init.signal && init.signal.aborted) ? Promise.reject(e) : local());
  };
})();
