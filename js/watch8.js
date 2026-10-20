/* Lumi 8.1 — ingredient watchlist presets. Bit i of a doc's d[15] = preset i matched its ingredient text at build time. */
var WATCH8 = [
  ['sugars', 'Hidden sugars', /\b(dextrose|maltose|sucrose|glucose(?![- ]?oxidase)|fructose|corn syrup|high[- ]fructose|rice syrup|brown rice syrup|malt syrup|barley malt|cane (sugar|juice)|evaporated cane|invert sugar|agave|molasses|treacle|honey|maple syrup|coconut sugar|date syrup|fruit juice concentrate|golden syrup|caramel(?! colou?r)|lactose|galactose|trehalose|isomaltulose)\b/gi],
  ['malto', 'Maltodextrin', /\bmaltodextrins?\b/gi],
  ['seed', 'Seed oils', /\b(canola|rapeseed|soybean|soya bean|sunflower|safflower|cottonseed|corn|grapeseed|rice bran|vegetable) oils?\b/gi],
  ['sweet', 'Artificial sweeteners', /\b(aspartame|sucralose|acesulfame(?:[- ]?k| potassium)?|saccharin|neotame|advantame|cyclamate|e951|e955|e950|e954|e961|e969|e952)\b/gi],
];
if (typeof module !== 'undefined') module.exports = WATCH8;
