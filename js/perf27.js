/* Lumi 26.4: the product page's older swap cards (Better swaps #swapsCard, #better9, #du14p, #sw20, .card.better) are hidden by css/v24.css since 24.0 (the "Better choice"
   card #bc24 replaced them) but still computed, each one building the 167k-doc index and scanning it. They are now no-ops; #bc24 is untouched. */
['renderSwaps', 'drawBetter', 'betterCard9', 'prodDual14'].forEach(n => { if (typeof self[n] === 'function') self[n] = function () { return typeof n === 'string' && /^(renderSwaps|drawBetter)$/.test(n) ? Promise.resolve() : undefined; }; });
