/* =========================================================
HUFA SEARCH INTENT LAYER (ADDITIVE)
=========================================================
A shared, LOCAL, lightweight natural-language intent
interpreter used by BOTH the Homepage search bar and the
Browse page search bar.

Design rules (per HUFA intelligent-search spec):
  • It sits ON TOP of the existing search system. It never
    replaces keyword/make/model/body/fuel/transmission
    matching — it only translates natural language INTO the
    existing filters + ranking preferences.
  • Explicit price constraints ("under R100k") become real
    hard filters via the existing priceMin/priceMax.
  • Standalone numbers become "search AROUND that price"
    using a proportional ±20% band (never an arbitrary hard
    ceiling).
  • Budget/cheap/affordable wording becomes a soft RANKING
    preference — never an invented hard price limit.
  • No database fields are created; everything maps onto
    EXISTING vehicle data and Browse filter mappings.
  • Zero network requests — pure string parsing, safe to
    run on every keystroke.

This module is intentionally dependency-light (only
js/searchData.js) so it can also be unit-tested in Node.
========================================================= */

import { MAKES, MODELS } from "./searchData.js";

/* =========================================================
PUBLIC HELPERS
========================================================= */

/* Formats a number as a South-African-style rand string:
   50000 -> "R50,000" */
export function formatRand(n){
  n = Math.round(Number(n) || 0);
  return "R" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/* Proportional "search around this price" band.
   Used for standalone prices and "around R150k" queries.
   The band scales with the price magnitude (±20%) instead
   of being an arbitrary fixed range. */
export function aroundBand(target){
  const t = Math.max(1000, Math.round(Number(target) || 0));
  let min = Math.round((t * 0.8) / 1000) * 1000;
  let max = Math.round((t * 1.2) / 1000) * 1000;
  max = Math.min(max, 2000000); /* existing global ceiling */
  if(min >= max) min = Math.max(0, max - 10000);
  return { min, max };
}

/* =========================================================
NORMALIZATION
========================================================= */

function escapeRegExp(s){
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Normalizes a query for parsing:
   - lowercase
   - unify dashes
   - join spaced / comma-grouped thousands ("50 000", "50,000" -> "50000")
   - collapse whitespace */
export function normalizeQuery(s){
  let out = String(s || "").toLowerCase();
  out = out.replace(/[\u2013\u2014]/g, "-");
  /* hyphens become spaces so "Mercedes-Benz", "C-Class",
     "S-Presso", "R100k-R200k" all match naturally */
  out = out.replace(/-/g, " ");
  out = out.replace(/(\d),(\d{3})\b/g, "$1$2");
  out = out.replace(/(\d),(\d{3})\b/g, "$1$2");
  out = out.replace(/(\d) (\d{3})\b/g, "$1$2");
  out = out.replace(/(\d) (\d{3})\b/g, "$1$2");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

/* =========================================================
CATALOG INDEXES (built once from the existing catalog data)
========================================================= */

const MAKE_INDEX = MAKES.map(m => ({
  make: m,
  lower: m.toLowerCase()
})).sort((a,b) => b.lower.length - a.lower.length);

const MODEL_INDEX = [];
Object.entries(MODELS).forEach(([make, models]) => {
  (models || []).forEach(model => {
    MODEL_INDEX.push({ make, model, lower: String(model).toLowerCase() });
  });
});
MODEL_INDEX.sort((a,b) => b.lower.length - a.lower.length);

const MODEL_TO_MAKE = {};
MODEL_INDEX.forEach(e => {
  if(!MODEL_TO_MAKE[e.lower]) MODEL_TO_MAKE[e.lower] = e.make;
});

/* =========================================================
VOCABULARIES (synonym -> existing canonical filter value)
========================================================= */

/* Body types map onto the EXISTING body_type values used by
   the Browse body filter and the vehicle catalog. */
const BODY_PATTERNS = [
  { canon: "SUV",          re: /\bsuvs?\b/g },
  { canon: "Crossover",    re: /\bcrossovers?\b/g },
  /* PHASE 2 ADDITIVE body-type synonyms (placed BEFORE their
     generic counterparts so the more specific phrase wins) */
  { canon: "Wagon",        re: /\bstation wagons?\b/g },
  { canon: "Sedan",        re: /\b(sedans?|saloons?)\b/g },
  { canon: "Hatchback",    re: /\b(hatchbacks?|hatches?|hatch)\b/g },
  { canon: "Bakkie",       re: /\bbakkies?\b/g },
  { canon: "Bakkie",       re: /\b(pickups?|pick[- ]?ups?|pick[- ]?up trucks?)\b/g },
  { canon: "MPV",          re: /\b(mpvs?|minivans?|people carriers?)\b/g },
  { canon: "Coupe",        re: /\bcoup[eé]s?\b/g },
  { canon: "Convertible",  re: /\b(convertibles?|cabriolets?|cabrio)\b/g },
  { canon: "Wagon",        re: /\b(wagons?|estates?)\b/g },
  { canon: "Van",          re: /\bvans?\b/g },
  { canon: "Double Cab",   re: /\bdouble cabs?\b/g },
  { canon: "Single Cab",   re: /\bsingle cabs?\b/g },
  { canon: "Crew Cab",     re: /\bcrew cabs?\b/g },
  { canon: "Light Truck",  re: /\b(light trucks?|trucks?)\b/g }
];

const FUEL_PATTERNS = [
  { canon: "Plug-In Hybrid", re: /\bplug[- ]?in hybrids?\b/g },
  { canon: "Petrol",         re: /\b(petrol|gasoline)\b/g },
  { canon: "Diesel",         re: /\bdiesel\b/g },
  { canon: "Hybrid",         re: /\bhybrids?\b/g },
  { canon: "Electric",       re: /\b(electric|evs?|bevs?)\b/g }
];

const TRANS_PATTERNS = [
  { canon: "Automatic", re: /\b(automatics?|auto|automatic transmission)\b/g },
  { canon: "Manual",    re: /\b(manuals?|stick shift)\b/g }
];

const DRIVE_PATTERNS = [
  { canon: "AWD", re: /\b(4x4|4wd|awd|all[- ]wheel drive|four[- ]wheel drive|4 by 4)\b/g },
  { canon: "FWD", re: /\b(fwd|front[- ]wheel drive)\b/g },
  { canon: "RWD", re: /\b(rwd|rear[- ]wheel drive)\b/g }
];

/* Preference concepts — soft ranking signals only. */
const PREF_PATTERNS = [
  ["budget",      /\b(budget|budget[- ]?friendly|cheap|cheapest|affordable|inexpensive|low[- ]?cost|low[- ]?priced|good value|value for money)\b/g],
  ["budget",      /\beconomical\b/g],
  /* PHASE 2 ADDITIVE — running-cost wording maps onto the
     EXISTING efficiency preference (never invented DB values) */
  ["efficiency",  /\b(cheap to run|cheap running costs|low running costs|running costs|good on fuel|uses little fuel|low fuel consumption|fuel consumption)\b/g],
  ["family",      /\b(famil(y|ies)|family[- ]?friendly)\b/g],
  ["firstCar",    /\b(first[- ](time[- ] )?(car|buyer|driver)|new driver|student (car|driver))\b/g],
  ["luxury",      /\b(luxur(y|ious|iously)|premium|executive|high[- ]?end|top[- ]?end|upscale)\b/g],
  ["performance", /\b(sports?|sporty|performance|powerful|fast(est)?|quick|turbo(charged)?)\b/g],
  ["efficiency",  /\b(fuel[- ]?(efficient|efficiency|saver|saving)|efficient|economical|economy|low consumption|frugal)\b/g],
  ["reliability", /\b(reliab(le|ility|ly)|dependable)\b/g],
  ["safety",      /\b(safe(st)?|safety)\b/g],
  ["compact",     /\b(small(est)?|compact|tiny|little|city car)\b/g],
  ["spacious",    /\b(big|large(st)?|spacious|roomy)\b/g],
  ["practical",   /\b(practical|versatile)\b/g],
  /* PHASE 2 ADDITIVE — vehicle USE-CASE preferences (soft
     ranking signals only; no new database fields) */
  ["performance", /\b(good acceleration|high performance)\b/g],
  ["commuter",    /\b(commuter|commuting|city driving|car for town|school run|school car|school runs?)\b/g],
  ["roadTrip",    /\b(long distance|road trips?|highway driving|holiday car|holidays?|holiday)\b/g],
  ["offRoad",     /\b(off[- ]?road|adventure vehicle|adventure|overland(er|ing)?)\b/g],
  ["towing",      /\b(good for towing|tow a (caravan|trailer|boat)|towing vehicle|towing)\b/g],
  /* commercial/work intent reuses the existing commercialVehicle
     flag vocabulary plus natural workhorse variations */
  ["commercial",  /\b(work bakkie|workhorse|load vehicle|delivery vehicle|load bakkie)\b/g]
];

/* Verification / listing flags — mapped onto the EXISTING
   boolean filters on Browse (no new fields). */
const FLAG_PATTERNS = [
  ["certifiedPreOwned",       /\b(certified( pre[- ]?owned| used)?|cpo)\b/g],
  ["roadworthyCertified",     /\broadworthy( certificate)?\b/g],
  ["accidentFree",            /\b(accident[- ]free|no accidents?|never crashed)\b/g],
  ["ownershipVerified",       /\b(ownership[- ]verified|verified ownership)\b/g],
  ["warrantyIncluded",        /\bwarrant(y|ied)\b/g],
  ["servicePlanIncluded",     /\bservice plan\b/g],
  ["maintenancePlanIncluded", /\b(maintenance plan|covered by maintenance)\b/g],
  ["financeAvailable",        /\b(finance available|financing available)\b/g],
  ["fastCharge",              /\bfast[- ]charg(e|ing)\b/g],
  ["priceNegotiable",         /\b(best value|price reduced|reduced price|negotiable)\b/g],
  ["special",                 /\b(specials?|on special)\b/g],
  ["featured",                /\bfeatured\b/g],
  ["commercialVehicle",       /\b(commercial vehicle|work vehicle)\b/g],
  /* PHASE 2 ADDITIVE — full service history wording maps onto
     the EXISTING service_history boolean via Browse */
  ["fullServiceHistory",      /\b((full|complete)( service)? history|(full |complete )?service history|fsh)\b/g],
  ["evOnly",                  /\b(evs?|bevs?)\b/g]
];

const CONDITION_NEW_RE  = /\b(brand[- ]new|demonstrator|demo|new cars?)\b/g;
const CONDITION_USED_RE = /\b(used|pre[- ]?owned|preowned|second[- ]?hand|secondhand)\b/g;

const SELLER_DEALER_RE  = /\bdealers?\b/g;
const SELLER_PRIVATE_RE = /\bprivate\b/g;

const SEATS_PATTERNS = [
  /\b(\d{1})[\s-]?seaters?\b/g,
  /\b(\d{1})[\s-]?seats?\b/g,
  /* PHASE 2 ADDITIVE — natural capacity phrasing */
  /\bfor (\d{1}) people\b/g,
  /\bfamil(?:y|ies) of (\d{1})\b/g
];

/* PHASE 2 ADDITIVE — ownership/history natural-language
   variations (mapped onto the EXISTING owners field). Longer,
   more specific patterns are tried first. */
const OWNERS_PATTERNS = [
  { value: "1", re: /\bonly (one|single|1)( previous)?[ -]?owners?\b/g },
  { value: "1", re: /\b(one|single|1) previous[ -]?owners?\b/g },
  { value: "1", re: /\b(one|single|1)[ -]?owners?\b/g },
  { value: "2", re: /\btwo[ -]?owners?\b|\b2[ -]?owners?\b/g },
  { value: "3", re: /\b(three|\d)[ -]?owners\b/g }
];

/* PHASE 2 ADDITIVE — LOCATION intelligence (existing province /
   city columns on the vehicles table; no new fields, no
   network requests — pure string matching). */
const PROVINCE_PATTERNS = [
  ["Gauteng",         /\bgauteng\b/g],
  ["Western Cape",    /\bwestern cape\b/g],
  ["KwaZulu-Natal",   /\bkwa ?zulu[ -]?natal\b/g],
  ["Eastern Cape",    /\beastern cape\b/g],
  ["Free State",      /\bfree state\b/g],
  ["Mpumalanga",      /\bmpumalanga\b/g],
  ["Limpopo",         /\blimpopo\b/g],
  ["North West",      /\bnorth west\b/g],
  ["Northern Cape",   /\bnorthern cape\b/g]
];

const CITY_PATTERNS = [
  ["Johannesburg","Gauteng"], ["Pretoria","Gauteng"], ["Centurion","Gauteng"],
  ["Sandton","Gauteng"], ["Soweto","Gauteng"], ["Midrand","Gauteng"],
  ["Cape Town","Western Cape"], ["Stellenbosch","Western Cape"], ["George","Western Cape"],
  ["Durban","KwaZulu-Natal"], ["Pietermaritzburg","KwaZulu-Natal"],
  ["Port Elizabeth","Eastern Cape"], ["Gqeberha","Eastern Cape"], ["East London","Eastern Cape"],
  ["Bloemfontein","Free State"], ["Nelspruit","Mpumalanga"], ["Polokwane","Limpopo"],
  ["Kimberley","Northern Cape"], ["Rustenburg","North West"]
].map(([city, prov]) => ({ city, prov, re: new RegExp("\\b" + city.toLowerCase().replace(/-/g," ") + "\\b", "g") }));

/* PHASE 2 ADDITIVE — MILEAGE intelligence.
   "under R100 000" stays a PRICE; only an explicit km unit or
   mileage wording triggers these patterns. */
const MILEAGE_LOW_RE =
  /\blow[- ]?(mileage|kilometres?|kilometers?|kms?|km)\b/g;
const MILEAGE_NUM_RE =
  /\b(?:(under|below|less than|up to|upto|max(?:imum)?|over|above|more than|around|about|roughly|with)\s+)?(\d+(?:\.\d+)?)\s*(k?)\s*(?:kms?|kilometres?|kilometers?)\b/g;
const MILEAGE_PRE_RE =
  /\bmileage\s+(under|below|less than|over|above)\s+(\d+(?:\.\d+)?)\s*(k)?\s*(?:kms?|kilometres?|kilometers?)\b/g;

/* PHASE 2 ADDITIVE — ENGINE capacity intelligence.
   Only explicit litre/cc/engine wording is parsed, so model
   names like 320i / C200 / 911 are never touched. */
const ENGINE_CC_RES = [
  { re: /\b(\d+(?:\.\d+)?)\s*(?:litre|liter)s?\b/g, scaled: true },
  { re: /\b(\d+(?:\.\d+)?)\s*engine\b/g,            scaled: true },
  { re: /\b(\d{3,4})\s*cc\b/g,                      scaled: false }
];
const SMALL_ENGINE_RE = /\bsmall(er)? engines?\b/g;
const LARGE_ENGINE_RE = /\b(large|big)(r)? engines?\b/g;

/* Filler words removed from the residual free-text so the
   remaining text never poisons the ilike keyword search. */
const FILLER_RES = [
  /\b(cars?|vehicles?|motors?|for|my|the|me|to|buy|want|need|looking|show|find|please|with|and|or|in|on|under|below|above|over|around|about|approx|approximately|roughly|less|more|than|up|upto|max|maximum|minimum|at|least|most|from|between|price|prices|priced|worth|cost|costs|costing|range|cheaper|closest|near|seaters?)\b/g,
  /\br\b/g,
  /\b(?:per\s*month|monthly|p\/m|pm)\b/g,
  /\b\d{1,2}\b/g,
  /* PHASE 2 ADDITIVE — leftover vocabulary from the new
     mileage / history / capacity phrasing */
  /\b(mileage|kilometres?|kilometers?|kms?|km|people|persons?|history|certificate|previous|only|full|complete|included|covered|has|have|plan)\b/g
];

/* =========================================================
PRICE PARSING
========================================================= */

const MODIFIER_PATTERNS = [
  [/\b(under|below|lesser than|less than|up to|upto|no more than|at most|max\.?|maximum|cheaper than|within)\s*$/i, "max"],
  [/\b(over|above|more than|at least|min\.?|minimum|from|starting from|starting at|onwards|and up)\s*$/i,        "min"],
  [/\b(around|about|approx|approximately|roughly|circa|close to|near)\s*$/i,                                     "around"]
];

const SUFFIX_MAX_RE  = /\s*(and under|or less|or below|max\.?|maximum)\s*$/i;
const NUM_TOKEN_RE   = /(\d+(?:\.\d+)?)\s*(k\b|m\b|mil\b|million|thousand)?/g;
/* range separators may carry the second number's currency symbol:
   "R100k - R200k", "R50k to R100k", "between R150k and R250k",
   or a bare space ("100000 200000") after dash normalization */
const RANGE_GAP_RE   = /^\s*(?:to|and|-|until|till)?\s*r?\s*$/i;

function detectModifier(str, idx){
  /* Look at up to 18 chars before the number for an adjacent
     constraint word ("under", "around", ...). A trailing lone
     currency "r" is skipped ("under r100k"). */
  const start = Math.max(0, idx - 18);
  let pre = str.slice(start, idx);
  /* strip a trailing STANDALONE currency "r" ("under r100k") -
     never the final "r" of a word like "under"/"over"/"near" */
  const trimmedPre = pre.replace(/\s+$/, "");
  if(/(^|[^a-z0-9])r$/i.test(trimmedPre)){
    pre = trimmedPre.slice(0, trimmedPre.length - 1);
  }
  let best = null;
  let bestIdx = -1;
  MODIFIER_PATTERNS.forEach(([re, kind]) => {
    const m = pre.match(re);
    if(m){
      const at = pre.toLowerCase().indexOf(m[1].toLowerCase());
      if(at > bestIdx){ bestIdx = at; best = kind; }
    }
  });
  return best;
}

function hasCurrencyPrefix(str, idx){
  let i = idx - 1;
  while(i >= 0 && str[i] === " ") i--;
  if(i >= 0 && str[i] === "r"){
    const j = i - 1;
    if(j < 0 || !/[a-z0-9]/.test(str[j])) return true;
  }
  return false;
}

function tokenSpanStart(str, idx, mod){
  let s = idx;
  /* include a directly-attached currency symbol */
  let i = idx - 1;
  while(i >= 0 && str[i] === " ") i--;
  if(i >= 0 && str[i] === "r" && (i === 0 || !/[a-z0-9]/.test(str[i - 1]))) s = i;
  /* include an adjacent modifier word */
  if(mod){
    const pre = str.slice(Math.max(0, s - 20), s);
    const m = pre.match(/\b(under|below|lesser than|less than|up to|upto|no more than|at most|max\.?|maximum|cheaper than|within|over|above|more than|at least|min\.?|minimum|from|starting from|starting at|onwards|and up|around|about|approx|approximately|roughly|circa|close to|near|between)\s*$/i);
    if(m) s = s - m[0].length;
  }
  return s;
}

function isStandaloneNumberQuery(normalized, numStr){
  const residue = normalized.replace(/\b(cars?|vehicles?|motors?|for|my|the|me|to|buy|want|find|show|please|price|worth|cost|r)\b/g, " ").replace(/\s+/g, " ").trim();
  return new RegExp("^r?" + escapeRegExp(numStr) + "(k|m|mil|million|thousand)?$").test(residue);
}

/* =========================================================
MAIN PARSER
========================================================= */

export function parseSearchIntent(rawQuery){

  const original = String(rawQuery || "");
  if(!original.trim()) return emptyIntent(original);

  const normalized = normalizeQuery(original);
  if(!normalized) return emptyIntent(original);

  const consumedSpans = []; /* {start,end} removed from free-text */

  const intent = emptyIntent(original);
  intent.normalized = normalized;

  /* ---------- 1. MAKE / MODEL (existing catalog values) ---------- */

  for(const entry of MAKE_INDEX){
    const re = new RegExp("\\b" + escapeRegExp(entry.lower.replace(/-/g, " ")) + "\\b");
    const m = normalized.match(re);
    if(m){
      intent.make = entry.make;
      consumedSpans.push({ start: m.index, end: m.index + m[0].length });
      break;
    }
  }

  for(const entry of MODEL_INDEX){
    const re = new RegExp("\\b" + escapeRegExp(entry.lower.replace(/-/g, " ")) + "\\b");
    const m = normalized.match(re);
    if(m){
      intent.model = entry.model;
      if(!intent.make) intent.make = MODEL_TO_MAKE[entry.lower] || "";
      consumedSpans.push({ start: m.index, end: m.index + m[0].length });
      break;
    }
  }

  /* ---------- 1b. MILEAGE (PHASE 2, ADDITIVE) ----------
     Consumed BEFORE generic number scanning so an explicit km
     figure is never misread as a price. "under R100 000"
     remains a PRICE — only a km unit / mileage wording matches. */

  let mM;
  MILEAGE_LOW_RE.lastIndex = 0;
  while((mM = MILEAGE_LOW_RE.exec(normalized)) !== null){
    intent.preferences.lowMileage = true;
    consumedSpans.push({ start: mM.index, end: mM.index + mM[0].length });
  }

  const applyMileageMatch = (value, mod, span) => {
    if(intent.mileageMax != null || intent.mileageMin != null) return;
    if(mod === "over" || mod === "above" || mod === "more than"){
      intent.mileageMin = value;
    } else if(mod === "around" || mod === "about" || mod === "roughly"){
      intent.mileageMax = Math.round((value * 1.1) / 1000) * 1000;
    } else {
      /* "under/below/less than/up to/max" AND bare figures
         ("cars with 60 000 km") act as a ceiling */
      intent.mileageMax = value;
    }
    consumedSpans.push(span);
  };

  let mFound = false;
  MILEAGE_NUM_RE.lastIndex = 0;
  while(!mFound && (mM = MILEAGE_NUM_RE.exec(normalized)) !== null){
    const v = parseFloat(mM[2]) * (mM[3] === "k" ? 1000 : 1);
    if(!isFinite(v) || v < 1000 || v > 1000000) continue;   /* sanity band */
    mFound = true;
    applyMileageMatch(v, mM[1] || "", { start: mM.index, end: mM.index + mM[0].length });
  }

  MILEAGE_PRE_RE.lastIndex = 0;
  while(!intent.mileageMax && !intent.mileageMin && (mM = MILEAGE_PRE_RE.exec(normalized)) !== null){
    const v = parseFloat(mM[2]) * (mM[3] === "k" ? 1000 : 1);
    if(!isFinite(v) || v < 1000 || v > 1000000) continue;
    applyMileageMatch(v, mM[1], { start: mM.index, end: mM.index + mM[0].length });
  }

  /* ---------- 1c. ENGINE CAPACITY (PHASE 2, ADDITIVE) ----------
     Only explicit litre/cc/engine wording — model names such as
     320i / C200 / 911 are never touched. */
  if(SMALL_ENGINE_RE.test(normalized)){
    intent.preferences.efficiency = true;
    matchedSpansFromPattern(normalized, SMALL_ENGINE_RE, consumedSpans);
  }
  SMALL_ENGINE_RE.lastIndex = 0;

  if(LARGE_ENGINE_RE.test(normalized)){
    intent.preferences.performance = true;
    matchedSpansFromPattern(normalized, LARGE_ENGINE_RE, consumedSpans);
  }
  LARGE_ENGINE_RE.lastIndex = 0;

  for(const ep of ENGINE_CC_RES){
    const em = normalized.match(ep.re);
    if(em){
      /* NOTE: String.match with /g returns no capture groups —
         re-extract the numeric part from the full match text */
      const numPart = em[0].match(/(\d+(?:\.\d+)?)/);
      let cc = numPart ? parseFloat(numPart[1]) : NaN;
      if(ep.scaled && cc < 20) cc = Math.round(cc * 1000);   /* 2 litre → 2000 */
      if(isFinite(cc) && cc >= 600 && cc <= 7000 && intent.engineCc == null){
        intent.engineCc = Math.round(cc);
      }
      matchedSpansFromPattern(normalized, ep.re, consumedSpans);
    }
    ep.re.lastIndex = 0;
  }

  /* ---------- 2. NUMBERS → PRICE / YEAR ---------- */

  const numTokens = [];
  let nm;
  NUM_TOKEN_RE.lastIndex = 0;
  while((nm = NUM_TOKEN_RE.exec(normalized)) !== null){

    const tokStart = nm.index;
    const tokEnd = nm.index + nm[0].length;

    /* skip numbers already consumed as make/model (e.g. "911", "3008") */
    if(consumedSpans.some(sp => tokStart < sp.end && tokEnd > sp.start)) continue;

    const num = parseFloat(nm[1]);
    if(!isFinite(num)) continue;

    const suffix = (nm[2] || "").trim().toLowerCase();
    let mult = 1;
    if(suffix === "k" || suffix === "thousand") mult = 1000;
    else if(suffix === "m" || suffix === "mil" || suffix === "million") mult = 1000000;

    const mod = detectModifier(normalized, tokStart);
    const currency = hasCurrencyPrefix(normalized, tokStart);

    /* genuine monthly-budget phrasing ("R5000 per month")
       is finance intent, not a vehicle price */
    const afterCtx = normalized.slice(tokEnd, tokEnd + 12);
    const isMonthly = /\s*(per\s*month|monthly|p\/m|pm)\b/.test(afterCtx);

    let kind = "ignore";
    let value = num * mult;

    if(isMonthly) kind = "monthly";
    else if(mult > 1) kind = "price";
    else if(currency) kind = "price";
    else if(num >= 1900 && num <= 2039) kind = "year";
    else if(num >= 1000) kind = "price";
    else if(mod){ value = num * 1000; kind = "price"; }           /* "under 50" -> R50,000 */
    else if(isStandaloneNumberQuery(normalized, nm[1])){
      value = num * 1000;
      kind = value >= 5000 ? "price" : "ignore";                   /* "50" -> R50,000 */
    }

    /* trailing "… and under" / "… or less" */
    let effMod = mod;
    if(kind === "price" && !effMod){
      const after = normalized.slice(tokEnd, tokEnd + 14);
      if(SUFFIX_MAX_RE.test(after)) effMod = "max";
    }

    numTokens.push({
      start: tokStart,
      end: tokEnd,
      raw: nm[0],
      num,
      mult,
      value,
      kind,
      mod: effMod
    });
  }

  /* explicit year (not currency/k-attached) */
  const yearRe = /\b(19[89]\d|20[0-3]\d)\b/g;
  let ym;
  while((ym = yearRe.exec(normalized)) !== null){
    const claimed = numTokens.some(t =>
      t.kind === "price" && ym.index < t.end && (ym.index + ym[0].length) > t.start
    );
    if(!claimed && intent.yearFrom == null){
      intent.yearFrom = parseInt(ym[1], 10);
      consumedSpans.push({ start: ym.index, end: ym.index + ym[0].length });
      break;
    }
  }

  /* pair consecutive prices into ranges: "R100k - R200k",
     "between R150k and R250k", "R50k to R100k" */
  const prices = numTokens.filter(t => t.kind === "price");
  const paired = new Set();

  for(let i = 0; i < prices.length - 1; i++){
    const a = prices[i];
    const b = prices[i + 1];
    if(paired.has(a) || paired.has(b)) continue;
    const gap = normalized.slice(a.end, b.start);
    if(RANGE_GAP_RE.test(gap)){
      /* a hard maximum stays a hard maximum even when followed
         by another number ("under 50k … 60k" edge) */
      if(a.mod === "max" || b.mod === "min" && false) continue;
      const lo = Math.min(a.value, b.value);
      const hi = Math.max(a.value, b.value);
      intent.price = {
        kind: "range",
        min: lo,
        max: hi,
        display: formatRand(lo) + " - " + formatRand(hi)
      };
      paired.add(a); paired.add(b);
      consumedSpans.push({
        start: tokenSpanStart(normalized, a.start, a.mod),
        end: b.end
      });
      i++; /* consume the pair */
    }
  }

  /* monthly-budget finance intent */
  const monthlyTok = numTokens.find(t => t.kind === "monthly");
  if(monthlyTok && !intent.price){
    intent.finance = {
      monthlyTarget: Math.round(monthlyTok.value),
      term: 72,
      interest: 10
    };
    consumedSpans.push({
      start: tokenSpanStart(normalized, monthlyTok.start, monthlyTok.mod),
      end: monthlyTok.end
    });
  }

  /* unpaired prices */
  for(const t of prices){
    if(paired.has(t)) continue;
    if(intent.price) break; /* first explicit instruction wins */

    if(t.mod === "max"){
      intent.price = { kind: "max", min: 0, max: t.value, target: 0, display: "Under " + formatRand(t.value) };
    } else if(t.mod === "min"){
      intent.price = { kind: "min", min: t.value, max: 0, target: 0, display: "From " + formatRand(t.value) };
    } else if(t.mod === "around"){
      intent.price = { kind: "around", min: 0, max: 0, target: t.value, display: "Around " + formatRand(t.value) };
    } else {
      /* standalone price → search AROUND it (spec §3/§4),
         never a silent hard ceiling */
      intent.price = { kind: "around", min: 0, max: 0, target: t.value, display: "Around " + formatRand(t.value) };
    }
    consumedSpans.push({ start: tokenSpanStart(normalized, t.start, t.mod), end: t.end });
  }

  /* ---------- 3. BODY / FUEL / TRANSMISSION / DRIVE ---------- */

  for(const p of BODY_PATTERNS){
    if(p.re.test(normalized)){
      if(!intent.bodyType) intent.bodyType = p.canon;
      matchedSpansFromPattern(normalized, p.re, consumedSpans);
    }
    p.re.lastIndex = 0;
  }

  for(const p of FUEL_PATTERNS){
    if(p.re.test(normalized)){
      if(!intent.fuel) intent.fuel = p.canon;
      if(p.canon === "Electric") intent.flags.evOnly = true; /* legacy parity */
      matchedSpansFromPattern(normalized, p.re, consumedSpans);
    }
    p.re.lastIndex = 0;
  }

  for(const p of TRANS_PATTERNS){
    if(p.re.test(normalized)){
      if(!intent.transmission) intent.transmission = p.canon;
      matchedSpansFromPattern(normalized, p.re, consumedSpans);
    }
    p.re.lastIndex = 0;
  }

  for(const p of DRIVE_PATTERNS){
    if(p.re.test(normalized)){
      if(!intent.drive) intent.drive = p.canon;
      matchedSpansFromPattern(normalized, p.re, consumedSpans);
    }
    p.re.lastIndex = 0;
  }

  /* ---------- 4. SEATS ---------- */

  for(const re of SEATS_PATTERNS){
    let sm;
    re.lastIndex = 0;
    while((sm = re.exec(normalized)) !== null){
      const n = parseInt(sm[1], 10);
      if(n >= 2 && n <= 12){
        if(intent.seatsMin == null || n > intent.seatsMin) intent.seatsMin = n;
        consumedSpans.push({ start: sm.index, end: sm.index + sm[0].length });
      }
    }
  }

  /* ---------- 5. FLAGS / CONDITION / SELLER / OWNERS ---------- */

  FLAG_PATTERNS.forEach(([key, re]) => {
    if(re.test(normalized)) intent.flags[key] = true;
    matchedSpansFromPattern(normalized, re, consumedSpans);
    re.lastIndex = 0;
  });

  if(CONDITION_NEW_RE.test(normalized)){ intent.condition = "new"; }
  matchedSpansFromPattern(normalized, CONDITION_NEW_RE, consumedSpans);
  CONDITION_NEW_RE.lastIndex = 0;

  if(!intent.condition && CONDITION_USED_RE.test(normalized)){ intent.condition = "pre-owned"; }
  matchedSpansFromPattern(normalized, CONDITION_USED_RE, consumedSpans);
  CONDITION_USED_RE.lastIndex = 0;

  if(SELLER_DEALER_RE.test(normalized)) intent.seller = "dealer";
  matchedSpansFromPattern(normalized, SELLER_DEALER_RE, consumedSpans);
  SELLER_DEALER_RE.lastIndex = 0;

  if(SELLER_PRIVATE_RE.test(normalized)) intent.seller = "private";
  matchedSpansFromPattern(normalized, SELLER_PRIVATE_RE, consumedSpans);
  SELLER_PRIVATE_RE.lastIndex = 0;

  for(const op of OWNERS_PATTERNS){
    if(op.re.test(normalized)){
      intent.flags.owners = op.value;
      matchedSpansFromPattern(normalized, op.re, consumedSpans);
    }
    op.re.lastIndex = 0;
  }

  /* ---------- 5b. LOCATION (PHASE 2, ADDITIVE) ---------- */

  for(const [prov, re] of PROVINCE_PATTERNS){
    if(re.test(normalized)){
      if(!intent.province) intent.province = prov;
      matchedSpansFromPattern(normalized, re, consumedSpans);
    }
    re.lastIndex = 0;
  }

  for(const c of CITY_PATTERNS){
    if(c.re.test(normalized)){
      if(!intent.city) intent.city = c.city;
      if(!intent.province) intent.province = c.prov;
      matchedSpansFromPattern(normalized, c.re, consumedSpans);
    }
    c.re.lastIndex = 0;
  }

  /* ---------- 6. PREFERENCES (soft ranking signals) ---------- */

  PREF_PATTERNS.forEach(([key, re]) => {
    if(re.test(normalized)) intent.preferences[key] = true;
    matchedSpansFromPattern(normalized, re, consumedSpans);
    re.lastIndex = 0;
  });

  /* ---------- 7. RESIDUAL FREE-TEXT ---------- */

  intent.cleanedQuery = buildCleanedQuery(normalized, consumedSpans);

  return intent;
}

function matchedSpansFromPattern(str, re, spans){
  /* collect match spans without disturbing caller's lastIndex use */
  const saved = re.lastIndex;
  re.lastIndex = 0;
  let m;
  while((m = re.exec(str)) !== null){
    spans.push({ start: m.index, end: m.index + m[0].length });
    if(m.index === re.lastIndex) re.lastIndex++;
  }
  re.lastIndex = saved;
}

function buildCleanedQuery(normalized, spans){

  /* splice out all understood spans */
  const merged = mergeSpans(spans);
  let out = "";
  let cursor = 0;
  for(const sp of merged){
    if(sp.start > cursor) out += normalized.slice(cursor, sp.start);
    cursor = Math.max(cursor, sp.end);
  }
  out += normalized.slice(cursor);

  /* strip leftover vocabulary + filler words */
  const removals = [
    ...BODY_PATTERNS.map(p => p.re),
    ...FUEL_PATTERNS.map(p => p.re),
    ...TRANS_PATTERNS.map(p => p.re),
    ...DRIVE_PATTERNS.map(p => p.re),
    ...FLAG_PATTERNS.map(([, re]) => re),
    CONDITION_NEW_RE,
    CONDITION_USED_RE,
    SELLER_DEALER_RE,
    SELLER_PRIVATE_RE,
    ...PREF_PATTERNS.map(([, re]) => re),
    MILEAGE_LOW_RE,
    MILEAGE_NUM_RE,
    MILEAGE_PRE_RE,
    SMALL_ENGINE_RE,
    LARGE_ENGINE_RE,
    ...ENGINE_CC_RES.map(p => p.re),
    ...PROVINCE_PATTERNS.map(([, re]) => re),
    ...CITY_PATTERNS.map(c => c.re),
    ...FILLER_RES
  ];

  removals.forEach(re => {
    re.lastIndex = 0;
    out = out.replace(re, " ");
    re.lastIndex = 0;
  });

  return out.replace(/\s+/g, " ").replace(/^[\s,\-]+|[\s,\-]+$/g, "").trim();
}

function mergeSpans(spans){
  if(!spans.length) return [];
  const sorted = [...spans].sort((a,b) => a.start - b.start);
  const merged = [{ ...sorted[0] }];
  for(let i = 1; i < sorted.length; i++){
    const last = merged[merged.length - 1];
    const cur = sorted[i];
    if(cur.start <= last.end) last.end = Math.max(last.end, cur.end);
    else merged.push({ ...cur });
  }
  return merged;
}

function emptyIntent(original){
  return {
    original: original || "",
    normalized: "",
    cleanedQuery: "",
    make: "",
    model: "",
    bodyType: "",
    fuel: "",
    transmission: "",
    drive: "",
    yearFrom: null,
    seatsMin: null,
    /* PHASE 2 ADDITIVE fields */
    mileageMax: null,
    mileageMin: null,
    engineCc: null,
    province: "",
    city: "",
    price: null,
    finance: { monthlyTarget: 0, term: 72, interest: 10 },
    condition: "",
    seller: "",
    flags: {
      certifiedPreOwned: false,
      roadworthyCertified: false,
      accidentFree: false,
      ownershipVerified: false,
      warrantyIncluded: false,
      servicePlanIncluded: false,
      maintenancePlanIncluded: false,
      financeAvailable: false,
      fastCharge: false,
      priceNegotiable: false,
      special: false,
      featured: false,
      commercialVehicle: false,
      fullServiceHistory: false,
      evOnly: false,
      owners: ""
    },
    preferences: {
      budget: false,
      family: false,
      firstCar: false,
      luxury: false,
      performance: false,
      efficiency: false,
      reliability: false,
      safety: false,
      compact: false,
      spacious: false,
      practical: false,
      /* PHASE 2 ADDITIVE use-case / mileage preferences */
      lowMileage: false,
      commuter: false,
      roadTrip: false,
      offRoad: false,
      towing: false,
      commercial: false
    }
  };
}

/* =========================================================
INTELLIGENT AUTOCOMPLETE
=========================================================
Local-only suggestion engine used by BOTH search bars.
Combines:
  1. Prefix completions of known smart searches
  2. Context-aware completions from the partial intent
     (make/model/body/fuel/trans/price detected so far)
  3. Catalog-backed makes/models (passed in by the caller —
     the authoritative catalog is fetched+cached elsewhere)
  4. Price-ladder completions for "under 5…" style typing
No Supabase request is ever made here.
========================================================= */

const SMART_PREFIX_BASES = [
  "Budget Cars",
  "Cheap Cars",
  "Affordable Cars",
  "Affordable Family Cars",
  "Budget SUVs",
  "Budget Hatchbacks",
  "Family Cars",
  "Family SUVs",
  "Practical Family Cars",
  "7 Seater Cars",
  "7 Seater SUVs",
  "First Car",
  "Reliable First Cars",
  "Small Cars",
  "Compact Cars",
  "Luxury Cars",
  "Luxury SUVs",
  "Performance Cars",
  "Fuel Efficient Cars",
  "Economy Cars",
  "Diesel SUVs",
  "Diesel Bakkies",
  "Automatic Family Cars",
  "Automatic SUVs",
  "Certified Pre-Owned Cars",
  "One Owner Cars",
  "Accident Free Cars",
  /* PHASE 2 ADDITIVE bases */
  "Low Mileage Cars",
  "Low Mileage SUVs",
  "Low Mileage Toyota",
  "Affordable SUVs",
  "Fuel Efficient Family Cars",
  "Economical Family Cars",
  "7 Seater Family Cars",
  "Family Cars Under R300,000",
  "SUVs Under R300,000",
  "Commuter Cars",
  "Work Bakkies"
];

const SMART_STARTERS = [
  "Budget Cars",
  "Family SUVs",
  "First Car",
  "Cars Under R100,000",
  "Diesel SUVs",
  "Automatic Family Cars",
  "Luxury SUVs",
  "Fuel Efficient Cars"
];

const BODY_PLURALS = {
  "SUV": "SUVs",
  "Sedan": "Sedans",
  "Hatchback": "Hatchbacks",
  "Bakkie": "Bakkies",
  "Coupe": "Coupes",
  "Convertible": "Convertibles",
  "Wagon": "Wagons",
  "MPV": "MPVs",
  "Van": "Vans",
  "Crossover": "Crossovers",
  "Double Cab": "Double Cabs",
  "Single Cab": "Single Cabs",
  "Crew Cab": "Crew Cabs",
  "Light Truck": "Light Trucks"
};

const PREMIUM_MAKES = new Set([
  "bmw", "mercedes-benz", "audi", "lexus", "volvo",
  "jaguar", "land rover", "porsche"
]);

const PRICE_LADDER_K = [
  10, 15, 20, 30, 40, 50, 60, 75, 80, 90, 100, 120, 150, 180,
  200, 250, 300, 350, 400, 500, 600, 750, 850, 1000, 1200, 1500, 2000
];

function smartItem(phrase, sublabel){
  return { type: "smart", value: phrase, label: phrase, sublabel: sublabel || "Smart search" };
}

function pluralBody(body){
  return BODY_PLURALS[body] || body;
}

function resolvePartialMake(prefix, extraMakes){
  const pool = new Set(MAKES.map(m => m.toLowerCase()));
  (extraMakes || []).forEach(m => pool.add(String(m).toLowerCase()));
  const tokens = prefix.toLowerCase().split(/\s+/).filter(Boolean);
  if(!tokens.length) return "";
  const last = tokens[tokens.length - 1];
  if(last.length < 2) return "";
  for(const candidate of [...pool].sort((a,b) => b.length - a.length)){
    if(candidate.startsWith(last)) return candidate;
  }
  return "";
}

function tierLadder(makeLower){
  return PREMIUM_MAKES.has(makeLower) ? [300000, 500000] : [100000, 150000, 200000];
}

function matchPrefixBases(p){
  const pt = p.split(/\s+/).filter(Boolean);
  return SMART_PREFIX_BASES.filter(base => {
    const bt = base.toLowerCase().split(/\s+/);
    if(pt.length > bt.length) return false;
    for(let i = 0; i < pt.length; i++){
      if(!bt[i].startsWith(pt[i])) return false;
    }
    return true;
  });
}

/* Price-completion branch: "under", "below", "around", "over"…
   with a partially typed number. */
function priceCompletions(p, makeLabel){
  const m = p.match(/\b(under|below|up to|upto|max|maximum|over|above|from|around|about|approx|roughly)\s*r?\s*([\d.]*)$/);
  if(!m) return [];

  const word = m[1];
  const digits = m[2];
  const isAround = /around|about|approx|roughly/.test(word);
  const isMin = /over|above|from/.test(word);
  const verb = isAround ? "Around" : isMin ? "Over" : "Under";

  let values = [];
  if(!digits){
    values = [50000, 100000];
  } else if(digits.indexOf(".") >= 0){
    const v = parseFloat(digits) * (digits.split(".")[1] && digits.split(".")[1].length === 1 ? 100000 : 1000000);
    if(v > 0) values = [Math.round(v)];
  } else if(digits.length >= 4){
    const v = parseInt(digits, 10);
    if(v >= 5000) values = [v];
  } else {
    values = PRICE_LADDER_K
      .filter(v => String(v).startsWith(digits))
      .slice(0, 2)
      .map(v => v * 1000);
    if(!values.length){
      const v = parseInt(digits, 10);
      if(v >= 5) values = [v * 1000];
    }
  }

  const items = [];
  values.slice(0, 2).forEach(v => {
    const amt = formatRand(v);
    if(makeLabel){
      items.push(smartItem(makeLabel + " " + verb + " " + amt));
    } else {
      /* PHASE 3 ADDITIVE: bare completion too ("under 100" ->
         "Under R100,000") alongside the existing Cars/SUVs forms.
         All three parse through the SAME applySmartPhrase pipeline
         into the single priceMax token — no duplicate filters. */
      items.push(smartItem(verb.charAt(0).toUpperCase() + verb.slice(1) + " " + amt));
      items.push(smartItem("Cars " + verb + " " + amt));
      if(items.length < 4) items.push(smartItem("SUVs " + verb + " " + amt));
    }
  });
  return items;
}

/**
 * getSmartSuggestions(prefix, opts)
 * opts.makes — optional array of authoritative catalog makes
 *              (already cached by js/catalog.js).
 * Returns [{type:'smart', value, label, sublabel}]
 */
export function getSmartSuggestions(prefix, opts = {}){

  const raw = String(prefix || "").trim();
  const p = normalizeQuery(raw);

  /* Empty input → capability starters (shown on focus) */
  if(!p) return SMART_STARTERS.map(s => smartItem(s, "Popular search"));

  const items = [];
  const seen = new Set();
  const push = (phrase, sublabel) => {
    const key = phrase.toLowerCase();
    if(seen.has(key)) return;
    seen.add(key);
    items.push(smartItem(phrase, sublabel));
  };

  const normPrefix = p.replace(/\s+/g, " ");
  /* Comma-insensitive prefix matching so a fully typed amount such as
     "cars under r100,000" still matches the canonical completion
     "Cars Under R100,000". */
  const stripCommas = s => String(s).replace(/,/g, "");
  const startsWithPrefix = phrase =>
    stripCommas(phrase.toLowerCase()).replace(/\s+/g, " ").startsWith(stripCommas(normPrefix));

  /* ---- 1. Price completions ("under 5", "around 150", "toyota under r150") */
  const partialMake = resolvePartialMake(p, opts.makes);
  const detected = parseSearchIntent(p);
  const partialCanon = partialMake
    ? MAKES.find(m => m.toLowerCase() === partialMake)
    : "";
  const makeLabel =
    detected.make ||
    partialCanon ||
    "";

  const isPricePrefix =
    /^\s*(?:under|below|up to|upto|max|maximum|over|above|from|around|about|approx|roughly)\s*r?\s*[0-9]*\s*$/i.test(p);

  priceCompletions(p, makeLabel).forEach(it => {
    if(startsWithPrefix(it.label) || makeLabel || isPricePrefix) push(it.label, "Price");
  });

  /* ---- 1b. FULLY-TYPED SMART PHRASES → LIVE RECOMMENDATION ----
     When the text typed so far is ALREADY a complete recognized
     natural-language phrase (price ceiling/range/around, mileage
     cap, finance target, engine size), surface the phrase itself
     as a clickable Smart Search row — exactly like make/model
     suggestions. No Enter press is needed to discover or apply it.
     Clicking routes through the EXISTING applySmartPhrase pipeline.
     A sanity band avoids offering nonsense like "under 5". */
  const priceRepVal = detected.price
    ? (detected.price.kind === "range"
        ? Math.max(detected.price.min || 0, detected.price.max || 0)
        : (detected.price.max || detected.price.target || detected.price.min || 0))
    : 0;
  /* PHASE 3 FIX (additive): multi-part natural phrases such as
     "Toyota low mileage", "BMW automatic" or "electric SUV" contain
     NO numbers, so they were previously never offered as a finished
     clickable phrase while typing — the user had to press Enter to
     discover HUFA understood them. They now surface themselves as a
     live Smart Search row too. Partial typing like "under 5" is still
     guarded by requiring a real rand figure for price-only phrases. */
  const hasPrefOrFlag =
    Object.values(detected.preferences || {}).some(Boolean) ||
    Object.values(detected.flags || {}).some(Boolean);
  const intentPartCount = [
    detected.make, detected.model, detected.bodyType, detected.fuel,
    detected.transmission, detected.drive
  ].filter(Boolean).length;
  const isRecognizedStructuredPhrase =
    (detected.price && priceRepVal >= 5000 &&
     /* the typed amount must look like a real rand figure (4+ digits
        or an explicit k/m suffix) so partial typing like "under 5"
        never gets offered as a finished phrase */
     (/\d{4,}/.test(p) || /\b\d{1,3}(\.\d+)?\s*(k|m|mil|million|thousand)\b/.test(p))) ||
    detected.mileageMax != null ||
    detected.mileageMin != null ||
    (detected.finance && detected.finance.monthlyTarget >= 500) ||
    detected.engineCc != null ||
    (hasPrefOrFlag && (intentPartCount > 0 || p.split(/\s+/).filter(Boolean).length > 1)) ||
    intentPartCount >= 2;
  if(isRecognizedStructuredPhrase && raw.trim()){
    /* Sublabel describes WHICH filters the intent maps onto, e.g.
       "Make + Mileage" for "Toyota low mileage". */
    const subParts = [];
    if(detected.make || detected.model) subParts.push("Make");
    if(detected.bodyType) subParts.push("Body Type");
    if(detected.fuel) subParts.push("Fuel");
    if(detected.transmission) subParts.push("Transmission");
    if(detected.drive) subParts.push("Drive");
    if(detected.price && !subParts.includes("Mileage")) subParts.push("Price");
    if(detected.mileageMax != null || detected.mileageMin != null) subParts.push("Mileage");
    else if(detected.preferences.lowMileage && !subParts.includes("Mileage")) subParts.push("Mileage");
    if(detected.finance && detected.finance.monthlyTarget >= 500 && !detected.price) subParts.push("Finance");
    if(detected.engineCc != null) subParts.push("Engine");
    if(!subParts.length){
      const F = detected.flags || {};
      if(Object.keys(F).length && Object.values(F).some(Boolean)) subParts.push("Filters");
    }
    const sub = subParts.length ? subParts.join(" + ") : "Smart Search";
    push(raw.trim(), sub);
  }

  /* ---- 2. Context-aware make/body/fuel/trans completions */
  if(makeLabel){
    const ladder = tierLadder(makeLabel.toLowerCase());
    if(!detected.bodyType && !detected.fuel && !detected.transmission){
      if(startsWithPrefix(makeLabel) || !detected.make) push(makeLabel, "Make");
      push(makeLabel + " SUVs");
      push(makeLabel + " Automatic");
      push(makeLabel + " Under " + formatRand(ladder[0]));
      /* PHASE 2 ADDITIVE context combos */
      push(makeLabel + " Family Cars");
      push(makeLabel + " Low Mileage");
    } else {
      if(detected.bodyType){
        push(makeLabel + " " + pluralBody(detected.bodyType));
        push(makeLabel + " " + detected.bodyType + " Under " + formatRand(ladder[0]));
        /* PHASE 2 ADDITIVE context combos */
        push("Affordable " + makeLabel + " " + pluralBody(detected.bodyType));
        push(makeLabel + " Family " + pluralBody(detected.bodyType));
      }
      if(detected.fuel) push(makeLabel + " " + detected.fuel);
      if(detected.transmission){
        const base = detected.bodyType
          ? makeLabel + " " + detected.transmission + " " + pluralBody(detected.bodyType)
          : makeLabel + " " + detected.transmission;
        push(base);
      }
    }
    /* models for this make matching the residual tail */
    const tokens = p.split(/\s+/);
    const tail = tokens[tokens.length - 1] || "";
    if(tail.length >= 1 && (!detected.model)){
      const models = MODELS[makeLabel] || [];
      models.filter(mo => mo.toLowerCase().startsWith(tail)).slice(0, 2)
        .forEach(mo => push(makeLabel + " " + mo, "Model"));
    }
  }

  /* ---- 3. Body-type-only completions */
  if(!makeLabel && detected.bodyType){
    const bp = pluralBody(detected.bodyType);
    push(bp);
    push("Affordable " + bp);
    push("Family " + bp);
    push("Diesel " + bp);
    /* PHASE 2 ADDITIVE body-type context combos */
    push("Automatic " + bp);
    push("Fuel Efficient " + bp);
    push(bp + " Under R300,000");
  }

  /* ---- 4. Fuel / trans-only completions */
  if(!makeLabel && detected.fuel){
    push(detected.fuel + " Cars");
    push(detected.fuel + " SUVs");
  }
  if(!makeLabel && detected.transmission){
    push(detected.transmission + " Cars");
    push(detected.transmission + " Family Cars");
  }

  /* ---- 5. Preference completions ("bud", "fam", "first", "lux"…) */
  matchPrefixBases(p).forEach(base => push(base));

  /* single-token prefixes also match any base WORD ("fam" ->
     "Practical Family Cars") as related suggestions */
  const ptTokens = p.split(/\s+/).filter(Boolean);
  if(ptTokens.length === 1){
    const t0 = ptTokens[0];
    SMART_PREFIX_BASES.forEach(base => {
      const bt = base.toLowerCase().split(/\s+/);
      if(bt.some(w => w.startsWith(t0)) &&
         !bt.every(w => w.startsWith(t0))){
        push(base, "Related search");
      }
    });
  }

  /* ---- 6. Seats completions */
  if(detected.seatsMin){
    push(detected.seatsMin + " Seater Cars");
    push(detected.seatsMin + " Seater SUVs");
  }

  /* ---- 6b. PHASE 2 ADDITIVE — low-mileage completions */
  if(/(^|\s)low/.test(normPrefix) || detected.preferences.lowMileage){
    push("Low Mileage Cars");
    push("Low Mileage SUVs");
    if(makeLabel){
      push(makeLabel + " Low Mileage");
    } else {
      push("Low Mileage Toyota");
      push("Cars Under R200,000 With Low Mileage");
    }
  }

  /* ---- 6c. PHASE 2 ADDITIVE — bare single-digit → seating ----
     Typing "7" is far more likely a capacity question than a
     price; existing numeric behaviour elsewhere is untouched. */
  if(/^[2-9]$/.test(p)){
    const n = parseInt(p, 10);
    push(n + " Seater Cars");
    push(n + " Seater SUVs");
    push("Affordable " + n + " Seater Cars");
  }

  /* ---- 6d. PHASE 2 ADDITIVE — standalone-price context ("80k",
     "80k suv") reuses the EXISTING around-band intent output. */
  if(detected.price && detected.price.kind === "around" && detected.price.target &&
     !isPricePrefix){
    const amt = formatRand(detected.price.target);
    if(detected.bodyType){
      const bp = pluralBody(detected.bodyType);
      push(bp + " Around " + amt);
      if(makeLabel) push(makeLabel + " " + bp + " Around " + amt);
    } else if(!makeLabel && !detected.fuel && !detected.transmission && !detected.seatsMin){
      push("Cars Around " + amt);
      push("SUVs Around " + amt);
      const up = PRICE_LADDER_K.find(k => k * 1000 >= detected.price.target * 1.05);
      if(up) push("Cars Under " + formatRand(up * 1000));
    }
  }

  /* ---- 7. Semantic fallback when nothing prefix-matches */
  if(!items.length){
    const semantic = [];
    if(detected.preferences.budget) semantic.push("Affordable Family Cars", "Budget SUVs");
    if(detected.preferences.family) semantic.push("Practical Family Cars", "Affordable Family Cars");
    if(detected.preferences.firstCar) semantic.push("First Car Under R150,000", "Reliable First Cars");
    if(detected.preferences.luxury) semantic.push("Luxury SUVs", "Performance Cars");
    if(detected.preferences.efficiency) semantic.push("Economy Cars", "Fuel Efficient Cars");
    if(detected.preferences.compact) semantic.push("Small Cars", "Compact Cars");
    if(detected.preferences.spacious) semantic.push("7 Seater SUVs", "Family SUVs");
    if(makeLabel) semantic.push(makeLabel + " SUVs", makeLabel + " Automatic");
    semantic.forEach(ph => push(ph, "Related search"));
  }

  /* PHASE 3 FIX: cap raised 8 -> 10 so the fully-typed phrase row
     never crowds existing context completions out of the dropdown. */
  return items.slice(0, 10);
}