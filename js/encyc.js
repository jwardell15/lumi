/* Lumi encyclopedia: food additives + cosmetic ingredients, each with sources (verified links only). Informational only. */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.LumiEncyc = f(); })(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const SRC = {
  efsaTiO2: ['EFSA (2021). Titanium dioxide: E171 no longer considered safe when used as a food additive.', 'https://www.efsa.europa.eu/en/news/titanium-dioxide-e171-no-longer-considered-safe-when-used-food-additive'],
  euTiO2: ['Commission Regulation (EU) 2022/63, which removed E171 from the EU list of food additives.', 'https://eur-lex.europa.eu/eli/reg/2022/63/oj'],
  iarcMeat: ['IARC Monographs Vol. 114 (2015) press release: processed meat classified as carcinogenic to humans (Group 1).', 'https://www.iarc.who.int/wp-content/uploads/2018/07/pr240_E.pdf'],
  efsaNitrite: ['EFSA (2017). Re-evaluation of sodium and potassium nitrite (E249–250). EFSA Journal 15(6):4786.', 'https://doi.org/10.2903/j.efsa.2017.4786'],
  whoAsp: ['WHO/IARC/JECFA (2023). Aspartame hazard and risk assessment results released (IARC Group 2B, ADI unchanged).', 'https://www.who.int/news/item/14-07-2023-aspartame-hazard-and-risk-assessment-results-released'],
  iarcList: ['IARC Monographs. List of classifications (e.g., BHA Group 2B, potassium bromate Group 2B, 4-MEI Group 2B, formaldehyde Group 1).', 'https://monographs.iarc.who.int/list-of-classifications/'],
  fdaBVO: ['FDA (2024). Brominated vegetable oil (BVO): authorization revoked.', 'https://www.fda.gov/food/food-additives-petitions/brominated-vegetable-oil-bvo'],
  fdaRed3: ['FDA. FD&C Red No. 3: food use revoked, effective January 15, 2027.', 'https://www.fda.gov/industry/color-additives/fdc-red-no-3'],
  mccann: ['McCann D. et al. (2007). Food additives and hyperactive behaviour in 3-year-old and 8/9-year-old children. The Lancet 370:1560–1567.', 'https://doi.org/10.1016/S0140-6736(07)61306-3'],
  euAzo: ['Regulation (EC) No 1333/2008, Annex V: these colours must carry the label "may have an adverse effect on activity and attention in children".', 'https://eur-lex.europa.eu/eli/reg/2008/1333/oj'],
  efsaCaramel: ['EFSA (2011). Re-evaluation of caramel colours (E150a–d). EFSA Journal 9(3):2004.', 'https://doi.org/10.2903/j.efsa.2011.2004'],
  fdaSweet: ['FDA. Aspartame and other sweeteners in food.', 'https://www.fda.gov/food/food-additives-petitions/aspartame-and-other-sweeteners-food'],
  whoNSS: ['WHO (2023). Use of non-sugar sweeteners: WHO guideline (advises against using them for weight control).', 'https://www.who.int/publications/i/item/9789240073616'],
  schiffman: ['Schiffman S.S. et al. (2023). Toxicological and pharmacokinetic properties of sucralose-6-acetate and its parent sucralose. J Toxicol Environ Health B 26(6):307–341.', 'https://doi.org/10.1080/10937404.2023.2213903'],
  efsaPhos: ['EFSA (2019). Re-evaluation of phosphoric acid–phosphates (E338–341, E343, E450–452). EFSA Journal 17(6):5674.', 'https://doi.org/10.2903/j.efsa.2019.5674'],
  efsaCarr: ['EFSA (2018). Re-evaluation of carrageenan (E407) and processed Eucheuma seaweed (E407a). EFSA Journal 16(4):5238.', 'https://doi.org/10.2903/j.efsa.2018.5238'],
  chassaing15: ['Chassaing B. et al. (2015). Dietary emulsifiers impact the mouse gut microbiota, promoting colitis and metabolic syndrome. Nature 519:92–96.', 'https://doi.org/10.1038/nature14232'],
  chassaing22: ['Chassaing B. et al. (2022). Randomized controlled-feeding study of dietary emulsifier carboxymethylcellulose. Gastroenterology 162(3):743–756.', 'https://doi.org/10.1053/j.gastro.2021.11.006'],
  sellem: ['Sellem L. et al. (2023). Food additive emulsifiers and risk of cardiovascular disease in the NutriNet-Santé cohort. BMJ 382:e076058.', 'https://doi.org/10.1136/bmj-2023-076058'],
  efsaBenz: ['EFSA (2016). Re-evaluation of benzoic acid and its salts (E210–213). EFSA Journal 14(3):4433.', 'https://doi.org/10.2903/j.efsa.2016.4433'],
  fdaBenzene: ['FDA. Questions and answers on the occurrence of benzene in soft drinks and other beverages.', 'https://www.fda.gov/food/environmental-contaminants-food/questions-and-answers-occurrence-benzene-soft-drinks-and-other-beverages'],
  efsaGlu: ['EFSA (2017). Re-evaluation of glutamic acid and glutamates (E620–625). EFSA Journal 15(7):4910.', 'https://doi.org/10.2903/j.efsa.2017.4910'],
  efsaStarch: ['EFSA (2017). Re-evaluation of oxidised starch and modified starches (E1404–E1452). EFSA Journal 15(10):4911.', 'https://doi.org/10.2903/j.efsa.2017.4911'],
  efsaAl: ['EFSA (2008). Safety of aluminium from dietary intake. EFSA Journal 754.', 'https://doi.org/10.2903/j.efsa.2008.754'],
  witkowski: ['Witkowski M. et al. (2023). The artificial sweetener erythritol and cardiovascular event risk. Nature Medicine 29:710–718.', 'https://doi.org/10.1038/s41591-023-02223-9'],
  euPolyol: ['Regulation (EU) No 1169/2011, Annex V/III: polyols must carry "excessive consumption may produce laxative effects".', 'https://eur-lex.europa.eu/eli/reg/2011/1169/oj'],
  ecfrTBHQ: ['US 21 CFR 172.185: TBHQ, permitted at up to 0.02% of the oil or fat content.', 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-172/subpart-B/section-172.185'],
  ecfrEDTA: ['US 21 CFR 172.120: calcium disodium EDTA, permitted uses and limits.', 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-172/subpart-B/section-172.120'],
  ecfrSulf: ['US 21 CFR 101.100(a)(4): sulfites at 10 ppm or more must be declared, since they can trigger reactions in sulfite-sensitive people.', 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-G/section-101.100'],
  fdaColor: ['FDA. Color additives: questions and answers for consumers.', 'https://www.fda.gov/food/color-additives-information-consumers/color-additives-questions-and-answers-consumers'],
  euDb: ['European Commission. Food additives database (authorised uses and E-numbers).', 'https://food.ec.europa.eu/food-safety/food-improvement-agents/additives/database_en'],
  fdaSub: ['FDA. Substances Added to Food inventory.', 'https://www.fda.gov/food/food-additives-petitions/substances-added-food-formerly-eafus'],
  // cosmetics
  fdaTriclosan: ['FDA (2016). Final rule: 19 antibacterial ingredients, including triclosan, are no longer allowed in consumer antiseptic washes.', 'https://www.fda.gov/consumers/consumer-updates/skip-antibacterial-soap-use-plain-soap-and-water'],
  matta: ['Matta M.K. et al. (2020). Effect of sunscreen application on plasma concentration of sunscreen active ingredients. JAMA 323(3):256–267.', 'https://doi.org/10.1001/jama.2019.20747'],
  fdaSun: ['FDA. Questions and answers: FDA posts deemed final order and proposed order for OTC sunscreen (only zinc oxide and titanium dioxide proposed as GRASE).', 'https://www.fda.gov/drugs/understanding-over-counter-medicines/questions-and-answers-fda-posts-deemed-final-order-and-proposed-order-over-counter-sunscreen'],
  euFormRel: ['Commission Regulation (EU) 2022/1181: products with formaldehyde releasers must be labelled "releases formaldehyde" above 0.001%.', 'https://eur-lex.europa.eu/eli/reg/2022/1181/oj'],
  euParab: ['Commission Regulation (EU) No 1004/2014: propyl- and butylparaben limited to 0.14% and banned in leave-on products for the nappy area of children under 3.', 'https://eur-lex.europa.eu/eli/reg/2014/1004/oj'],
  euParabBan: ['Commission Regulation (EU) No 358/2014: isopropyl-, isobutyl-, phenyl-, benzyl- and pentylparaben banned.', 'https://eur-lex.europa.eu/eli/reg/2014/358/oj'],
  euMI: ['Commission Regulation (EU) 2016/1198: MCI/MI mixture banned in leave-on cosmetics.', 'https://eur-lex.europa.eu/eli/reg/2016/1198/oj'],
  euMI2: ['Commission Regulation (EU) 2017/1224: methylisothiazolinone banned in leave-on cosmetics and limited in rinse-off ones.', 'https://eur-lex.europa.eu/eli/reg/2017/1224/oj'],
  euLilial: ['Commission Regulation (EU) 2021/1902: butylphenyl methylpropional (Lilial) banned as CMR 1B.', 'https://eur-lex.europa.eu/eli/reg/2021/1902/oj'],
  euD4D5: ['Commission Regulation (EU) 2018/35: D4 and D5 limited to under 0.1% in wash-off cosmetics.', 'https://eur-lex.europa.eu/eli/reg/2018/35/oj'],
  euCosm: ['Regulation (EC) No 1223/2009 on cosmetic products (Annex II prohibited and Annex III restricted substances).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj'],
  euFrag: ['Commission Regulation (EU) 2023/1545: expands mandatory labelling of individual fragrance allergens.', 'https://eur-lex.europa.eu/eli/reg/2023/1545/oj'],
  fdaFrag: ['FDA. Fragrances in cosmetics.', 'https://www.fda.gov/cosmetics/cosmetic-ingredients/fragrances-cosmetics'],
  fdaPhth: ['FDA. Phthalates in cosmetics.', 'https://www.fda.gov/cosmetics/cosmetic-ingredients/phthalates-cosmetics'],
  fdaDiox: ['FDA. 1,4-Dioxane in cosmetics: a manufacturing byproduct.', 'https://www.fda.gov/cosmetics/potential-contaminants-cosmetics/14-dioxane-cosmetics-manufacturing-byproduct'],
  fdaHair: ['FDA. Hair dyes.', 'https://www.fda.gov/cosmetics/cosmetic-products/hair-dyes'],
  iarcTalc: ['IARC (2024). Monographs Vol. 136: talc classified as probably carcinogenic to humans (Group 2A).', 'https://monographs.iarc.who.int/news-events/volume-136-talc-and-acrylonitrile/'],
  fdaHQ: ['FDA (2022). FDA works to protect consumers from potentially harmful OTC skin lightening products (hydroquinone).', 'https://www.fda.gov/drugs/drug-safety-communications/fda-works-protect-consumers-potentially-harmful-otc-skin-lightening-products'],
  cir: ['Cosmetic Ingredient Review (CIR): ingredient safety assessments.', 'https://www.cir-safety.org/ingredients']
};
// Food additives keyed by E-number (names/tiers live in health.js). fn = function, why = why flagged, ev = evidence strength note.
const FOOD = {
  e171: ['Whitening colour', 'EFSA could no longer rule out genotoxicity, and the EU banned it in 2022. It is still permitted in the US.', 'moderate', ['efsaTiO2', 'euTiO2']],
  e249: ['Preservative (cured meats)', 'Nitrites can form nitrosamines. Processed meat is an IARC Group 1 carcinogen. EFSA found current ADIs are not exceeded for most people.', 'moderate', ['iarcMeat', 'efsaNitrite']], e250: 0, e251: 0, e252: 0,
  e320: ['Antioxidant preservative', 'IARC classifies BHA as possibly carcinogenic (Group 2B), based on animal studies.', 'thin in humans', ['iarcList']],
  e319: ['Antioxidant for fats and oils', 'Allowed at low levels. Evidence of harm at permitted levels is limited, and it is flagged as a precaution.', 'thin', ['ecfrTBHQ']],
  e951: ['Sweetener', 'IARC rated aspartame "possibly carcinogenic" (2B) in 2023. JECFA kept the ADI at 40 mg/kg. Not for people with PKU.', 'limited', ['whoAsp', 'fdaSweet']],
  e962: ['Sweetener (aspartame + acesulfame salt)', 'Contains aspartame, so the same notes apply.', 'limited', ['whoAsp']],
  e924: ['Flour improver', 'IARC Group 2B. It is not permitted in the EU, and California has banned it starting in 2027.', 'moderate', ['iarcList']],
  e443: ['Emulsifier for citrus drinks (BVO)', 'The FDA revoked its authorization in 2024 over thyroid effects seen in animal studies.', 'moderate', ['fdaBVO']],
  e127: ['Red colour (Red 3)', 'The FDA revoked food use, effective January 2027, under the Delaney Clause because it caused cancer in male rats. The FDA says the mechanism is rat-specific and that there is no evidence of cancer in humans.', 'limited in humans', ['fdaRed3']],
  e102: ['Azo colour (Yellow 5)', 'Linked to hyperactivity in some children. The EU requires a warning label.', 'moderate', ['mccann', 'euAzo', 'fdaColor']], e110: 0, e129: 0, e124: 0, e122: 0, e104: 0,
  e133: ['Blue colour (Blue 1)', 'A synthetic dye. Evidence of harm at permitted levels is limited, and it is flagged as a precaution.', 'thin', ['fdaColor', 'euDb']], e132: 0,
  e150c: ['Caramel colour (class III)', 'Can contain 4-MEI (IARC Group 2B). EFSA set an ADI for these classes.', 'limited', ['efsaCaramel', 'iarcList']], e150d: ['Caramel colour (class IV, sulphite ammonia)', 'Can contain 4-MEI (IARC Group 2B). EFSA set an ADI. Common in colas.', 'limited', ['efsaCaramel', 'iarcList']],
  e950: ['Sweetener', 'Approved as safe by the FDA. WHO advises against non-sugar sweeteners for weight control. Long-term evidence is limited.', 'thin', ['fdaSweet', 'whoNSS']], e954: 0,
  e955: ['Sweetener', 'Approved by the FDA. A 2023 lab study raised genotoxicity questions about the impurity sucralose-6-acetate. WHO advises against non-sugar sweeteners for weight control.', 'limited', ['fdaSweet', 'schiffman', 'whoNSS']],
  e338: ['Acidifier (colas)', 'EFSA set a group ADI for phosphates. High phosphate intake is a concern for kidney disease.', 'moderate', ['efsaPhos']], e339: 0, e340: 0, e341: 0, e450: 0, e451: 0, e452: 0,
  e541: ['Raising agent', 'A source of aluminium. EFSA\'s tolerable weekly intake may be exceeded by high consumers.', 'moderate', ['efsaAl']],
  e407: ['Thickener', 'EFSA called for more data, and its ADI is temporary. Animal studies suggest gut inflammation.', 'limited', ['efsaCarr']],
  e433: ['Emulsifier', 'Altered gut microbiota and promoted inflammation in mice. Human data are limited.', 'limited', ['chassaing15', 'sellem']],
  e466: ['Thickener', 'Mouse studies, and a small 2022 human feeding study, showed changes to the gut microbiota.', 'limited', ['chassaing15', 'chassaing22']],
  e211: ['Preservative', 'With vitamin C, it can form small amounts of benzene in drinks. EFSA confirmed the ADI.', 'limited', ['efsaBenz', 'fdaBenzene']], e210: 0,
  e385: ['Sequestrant', 'Permitted at low levels. Evidence of harm is limited, and it is flagged as a precaution.', 'thin', ['ecfrEDTA']],
  e310: ['Antioxidant', 'Mixed animal data. Evidence at permitted levels is limited.', 'thin', ['fdaSub', 'euDb']],
  e220: ['Preservative (sulphites)', 'Can trigger asthma or allergy-like reactions in sulphite-sensitive people, so it must be labelled.', 'moderate', ['ecfrSulf']], e221: 0, e222: 0, e223: 0, e224: 0,
  e621: ['Flavour enhancer', 'EFSA lowered the group ADI in 2017. Typical intakes may exceed it for some people.', 'limited', ['efsaGlu']], e627: ['Flavour enhancer', 'Usually used with MSG. Little evidence of harm.', 'thin', ['euDb']], e631: 0, e635: 0,
  e471: ['Emulsifier', 'A 2023 cohort study linked higher intake of some emulsifiers, including E471, with cardiovascular disease. This is an association, not proof.', 'limited', ['sellem']], e472e: ['Emulsifier', 'Associated with cardiovascular risk in one cohort. Evidence is limited.', 'limited', ['sellem']], e481: ['Emulsifier', 'Little evidence of harm at permitted levels.', 'thin', ['euDb']],
  e202: ['Preservative', 'Little evidence of harm at permitted levels.', 'thin', ['euDb', 'fdaSub']], e200: 0, e282: ['Preservative (bread)', 'Little evidence of harm at permitted levels.', 'thin', ['euDb']],
  e965: ['Sugar alcohol sweetener', 'Can cause laxative effects, and it still raises blood glucose somewhat.', 'moderate', ['euPolyol']], e420: 0,
  e160b: ['Colour (annatto)', 'Rare allergic reactions have been reported.', 'thin', ['euDb']],
  e1442: ['Modified starch thickener', 'EFSA found no safety concern at reported uses.', 'moderate', ['efsaStarch']], e1422: 0, e1450: 0,
  e968: ['Sweetener (erythritol)', 'A 2023 observational study linked blood erythritol with cardiovascular events. This is emerging evidence.', 'limited', ['witkowski']]
};
const GEN = ['No specific concern found at permitted levels in Lumi\'s review of regulatory listings.', 'thin', ['euDb', 'fdaSub']];
const FN0 = { e415: 'Thickener', e412: 'Thickener', e322: 'Emulsifier', e330: 'Acidifier', e300: 'Antioxidant (vitamin C)', e306: 'Antioxidant (vitamin E)', e440: 'Gelling agent', e500: 'Raising agent', e270: 'Acidifier', e160a: 'Colour', e170: 'Colour/firming agent', e410: 'Thickener', e414: 'Thickener', e967: 'Sweetener (polyol)', e960: 'Sweetener (stevia)' };
function food(e, H) {
  e = String(e).toLowerCase(); const meta = H && H.ADD[e]; if (!meta) return null;
  let d = FOOD[e]; if (d === 0) { const keys = Object.keys(FOOD); for (let i = keys.indexOf(e); i >= 0; i--) if (FOOD[keys[i]]) { d = FOOD[keys[i]]; break; } }
  if (!d) d = [FN0[e] || 'Food additive', GEN[0], GEN[1], GEN[2]];
  return { id: e, code: e.toUpperCase(), name: meta[0], tier: meta[1], fn: d[0], why: d[1], ev: d[2], src: d[3].map(k => SRC[k]).filter(Boolean) };
}
// Cosmetic ingredients: [id, name, regex, tier, function, why, evidence, sources]
const COS = [
  ['triclosan', 'Triclosan', /triclosan|triclocarban/, 3, 'Antibacterial', 'The FDA removed it from consumer antiseptic washes in 2016, and there are endocrine and resistance concerns.', 'moderate', ['fdaTriclosan']],
  ['oxybenzone', 'Oxybenzone (benzophenone-3)', /oxybenzone|benzophenone-3/, 3, 'UV filter', 'Absorbed into the blood well above the FDA\'s threshold. The FDA said the data were insufficient to call it GRASE, and the EU restricts concentrations.', 'moderate', ['matta', 'fdaSun']],
  ['formaldehyde', 'Formaldehyde', /\bformaldehyde\b|formalin|methylene glycol/, 3, 'Preservative', 'IARC Group 1 carcinogen and a strong contact allergen.', 'strong', ['iarcList', 'euCosm']],
  ['dmdm', 'DMDM hydantoin', /dmdm hydantoin/, 3, 'Preservative (formaldehyde releaser)', 'Releases formaldehyde (IARC Group 1). The EU requires a "releases formaldehyde" label.', 'moderate', ['euFormRel', 'iarcList']],
  ['quaternium15', 'Quaternium-15', /quaternium-15/, 3, 'Preservative (formaldehyde releaser)', 'Releases formaldehyde and is a common contact allergen. Banned in EU cosmetics.', 'moderate', ['euFormRel', 'euCosm']],
  ['imidazolidinyl', 'Imidazolidinyl / diazolidinyl urea', /(imidazolidinyl|diazolidinyl) urea/, 3, 'Preservative (formaldehyde releaser)', 'Releases formaldehyde and is a known contact allergen.', 'moderate', ['euFormRel', 'iarcList']],
  ['bronopol', 'Bronopol (2-bromo-2-nitropropane-1,3-diol)', /bronopol|2-bromo-2-nitropropane/, 3, 'Preservative (formaldehyde releaser)', 'Releases formaldehyde and can form nitrosamines.', 'moderate', ['euFormRel']],
  ['shmg', 'Sodium hydroxymethylglycinate', /sodium hydroxymethylglycinate/, 3, 'Preservative (formaldehyde releaser)', 'Releases formaldehyde.', 'moderate', ['euFormRel']],
  ['butylparaben', 'Butylparaben / propylparaben', /\b(butyl|propyl)paraben/, 3, 'Preservative', 'Possible endocrine disruptors. The EU caps them at 0.14% and bans them in nappy-area products for under-3s.', 'moderate', ['euParab']],
  ['isoparaben', 'Isobutyl/isopropyl/benzyl/phenyl paraben', /\b(isobutyl|isopropyl|benzyl|phenyl|pentyl)paraben/, 3, 'Preservative', 'Banned in the EU, because safety data were lacking.', 'moderate', ['euParabBan']],
  ['methylparaben', 'Methylparaben / ethylparaben', /\b(methyl|ethyl)paraben/, 1, 'Preservative', 'Considered safe at regulated concentrations, with weak endocrine activity.', 'moderate', ['euParab', 'cir']],
  ['bha', 'BHA (butylated hydroxyanisole)', /\bbha\b|butylated hydroxyanisole/, 3, 'Antioxidant', 'IARC Group 2B and a suspected endocrine disruptor.', 'limited', ['iarcList']],
  ['mit', 'Methylisothiazolinone (MIT) / MCI', /methyl(chloro)?isothiazolinone|\bmci\b|\bmit\b/, 3, 'Preservative', 'A major cause of contact allergy. The EU banned it in leave-on products.', 'strong', ['euMI', 'euMI2']],
  ['lilial', 'Butylphenyl methylpropional (Lilial)', /butylphenyl methylpropional|lilial/, 3, 'Fragrance', 'Banned in the EU since 2022 as toxic to reproduction (CMR 1B).', 'moderate', ['euLilial']],
  ['d4', 'Cyclotetrasiloxane (D4)', /cyclotetrasiloxane/, 3, 'Silicone emollient', 'A suspected endocrine disruptor and persistent in the environment. Restricted in the EU.', 'moderate', ['euD4D5']],
  ['d5', 'Cyclopentasiloxane (D5)', /cyclopentasiloxane|cyclomethicone/, 2, 'Silicone emollient', 'Environmentally persistent. Restricted in EU wash-off products.', 'limited', ['euD4D5']],
  ['hydroquinone', 'Hydroquinone', /hydroquinone/, 3, 'Skin lightener', 'The FDA warns against over-the-counter products containing it (can cause skin damage). Banned in EU cosmetics.', 'moderate', ['fdaHQ', 'euCosm']],
  ['phthalate', 'Phthalates (DBP, DEHP, DEP)', /phthalate|\bdbp\b|\bdehp\b/, 3, 'Plasticizer/solvent', 'DBP and DEHP are banned in EU cosmetics as reproductive toxicants. DEP is still permitted.', 'moderate', ['fdaPhth', 'euCosm']],
  ['coaltar', 'Coal tar', /coal tar/, 3, 'Anti-dandruff / colour', 'Coal-tar pitch is an IARC Group 1 carcinogen. Banned in EU cosmetics.', 'moderate', ['iarcList', 'euCosm']],
  ['toluene', 'Toluene', /\btoluene\b/, 3, 'Solvent (nail polish)', 'A reproductive toxicant. Banned in EU cosmetics.', 'moderate', ['euCosm']],
  ['talc', 'Talc', /\btalc\b/, 2, 'Absorbent/texture', 'IARC Group 2A (probably carcinogenic) since 2024. Asbestos contamination is a concern.', 'limited', ['iarcTalc']],
  ['octinoxate', 'Octinoxate (ethylhexyl methoxycinnamate)', /octinoxate|ethylhexyl methoxycinnamate|octyl methoxycinnamate/, 2, 'UV filter', 'Systemically absorbed. The FDA requested more safety data.', 'limited', ['matta', 'fdaSun']],
  ['homosalate', 'Homosalate', /homosalate/, 2, 'UV filter', 'Systemically absorbed. The FDA requested more data. Possible endocrine activity.', 'limited', ['matta', 'fdaSun']],
  ['octocrylene', 'Octocrylene', /octocr?ylene/, 2, 'UV filter', 'Systemically absorbed. The FDA requested more data.', 'limited', ['matta', 'fdaSun']],
  ['dea', 'DEA / cocamide DEA', /\b(cocamide |lauramide )?dea\b|diethanolamine/, 2, 'Foaming agent', 'Diethanolamine is IARC Group 2B and can form nitrosamines. Restricted in the EU.', 'limited', ['iarcList', 'euCosm']],
  ['ppd', 'p-Phenylenediamine (PPD)', /phenylenediamine|\bppd\b/, 2, 'Hair dye', 'A strong contact allergen.', 'moderate', ['fdaHair', 'euCosm']],
  ['resorcinol', 'Resorcinol', /resorcinol/, 2, 'Hair dye', 'Irritant, possible thyroid effects. Restricted in the EU. Evidence is limited.', 'thin', ['euCosm']],
  ['parfum', 'Fragrance (parfum)', /\bfragrance\b|\bparfum\b|\baroma\b/, 2, 'Scent', 'An undisclosed mix and one of the most common causes of cosmetic contact allergy.', 'moderate', ['fdaFrag', 'euFrag']],
  ['fragallergen', 'Fragrance allergens (limonene, linalool, citral, etc.)', /\b(limonene|linalool|citral|geraniol|eugenol|isoeugenol|coumarin|cinnamal|hydroxycitronellal|citronellol|hexyl cinnamal|benzyl salicylate|farnesol|amyl cinnamal|benzyl cinnamate)\b/, 1, 'Scent', 'Listed EU fragrance allergens that may sensitize some people.', 'moderate', ['euFrag']],
  ['sls', 'Sodium lauryl sulfate', /sodium lauryl sulfate/, 1, 'Surfactant', 'Can irritate skin and eyes, especially in leave-on products.', 'moderate', ['cir']],
  ['ethoxylated', 'Ethoxylated ingredients (PEG, laureth)', /\bpeg-\d|laureth|ceteareth|polysorbate|-eth sulfate|\b\w+eth-\d/, 1, 'Surfactant/emulsifier', 'Can contain trace 1,4-dioxane, a manufacturing byproduct.', 'limited', ['fdaDiox']],
  ['phenoxyethanol', 'Phenoxyethanol', /phenoxyethanol/, 1, 'Preservative', 'Considered safe up to 1%. Some irritation reports.', 'moderate', ['euCosm']],
  ['bht', 'BHT', /\bbht\b|butylated hydroxytoluene/, 1, 'Antioxidant', 'Evidence at cosmetic levels is limited.', 'thin', ['cir']],
  ['tea', 'Triethanolamine (TEA)', /triethanolamine|\btea\b(?! tree|-tree| leaf| extract)/, 1, 'pH adjuster', 'Can form nitrosamines with nitrosating agents. Restricted in the EU.', 'thin', ['euCosm']],
  ['capb', 'Cocamidopropyl betaine', /cocamidopropyl betaine/, 1, 'Surfactant', 'An occasional contact allergen.', 'limited', ['cir']],
  ['benzalk', 'Benzalkonium chloride', /benzalkonium chloride/, 1, 'Preservative/antiseptic', 'An irritant at higher concentrations.', 'limited', ['cir']],
  ['mineraloil', 'Mineral oil / petrolatum', /mineral oil|paraffinum liquidum|petrolatum/, 1, 'Emollient', 'Highly refined grades are considered safe. Poorly refined oils can contain impurities.', 'limited', ['iarcList']],
  ['aluminum', 'Aluminum salts', /aluminum (chlorohydrate|zirconium|chloride)|aluminium chlorohydrate/, 1, 'Antiperspirant', 'Some uncertainty about long-term exposure. Evidence of harm is thin.', 'thin', ['efsaAl']],
  ['retinyl', 'Retinyl palmitate / retinol', /retinyl palmitate|retinol\b/, 1, 'Skin conditioning', 'Concern with high total vitamin A exposure. Limited at regulated levels.', 'thin', ['euCosm']],
  ['zno', 'Zinc oxide / titanium dioxide (sunscreen)', /zinc oxide|titanium dioxide/, 0, 'Mineral UV filter', 'The only two filters the FDA proposed as GRASE.', 'moderate', ['fdaSun']]
];
function cosMatch(ing) {
  const i = String(ing || '').toLowerCase().replace(/\s+/g, ' '); if (i.length < 4) return null;
  return COS.filter(c => c[2].test(i)).map(c => ({ id: c[0], name: c[1], tier: c[3] }));
}
function cosRate(ing) {
  const m = cosMatch(ing); if (!m) return { score: null, reason: 'No ingredient list on file', hits: [] };
  const n = t => m.filter(x => x.tier === t).length; let s;
  if (n(3)) s = Math.max(0, 24 - 6 * (n(3) - 1) - 2 * n(2)); else if (n(2)) s = Math.max(25, 49 - 5 * (n(2) - 1) - n(1)); else if (n(1)) s = Math.max(50, 74 - 3 * (n(1) - 1)); else s = 100;
  return { score: s, hits: m.sort((a, b) => b.tier - a.tier) };
}
function cos(id) { const c = COS.find(x => x[0] === id); if (!c) return null; return { id: c[0], name: c[1], tier: c[3], fn: c[4], why: c[5], ev: c[6], src: c[7].map(k => SRC[k]).filter(Boolean) }; }
const TIER = ['No risk', 'Low risk', 'Moderate risk', 'High risk'];
return { SRC, FOOD, COS, food, cos, cosMatch, cosRate, TIER };
});
