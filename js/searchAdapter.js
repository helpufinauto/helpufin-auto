import { supabase } from "./api.js";
import { parseIntent } from "./aiEngine.js";
import { buildVehicleQuery } from "../pages/browse.js";
import { rankVehicles, getUserProfile, getPopularityMap } from "./aiEngine.js";
import { parseSearchIntent, aroundBand } from "./searchIntent.js";

/* ==========================
🔥 MAP HOMEPAGE → BROWSE FILTERS

ADDITIVE UPGRADE: the natural-language intent layer
(js/searchIntent.js) now interprets the free-text query.
Every output key from the previous version is still
produced with the same meaning; the upgrades are:

• explicit price constraints ("under R100k") → hard
  priceMin/priceMax filters (existing query builder)
• standalone numbers / "around R150k" → proportional
  ±20% price band (never a silent hard ceiling)
• price ranges ("R100k - R200k") → priceMin + priceMax
• budget/cheap/affordable wording → soft ranking
  preference (intentPrefs.budget) + price_low sort hint
  instead of an arbitrary hard price limit
• family/first-car/luxury/etc. → soft ranking
  preferences consumed by rankVehicles
• residual free-text (cleanedQuery) keeps only words the
  intent layer did NOT understand, so the existing ilike
  keyword search is never poisoned by intent words
========================== */
export function mapToBrowseFilters(input = {}) {

const rawQ = input.q || "";
const intent = parseSearchIntent(rawQ);

/* 🔥 CLEAN TEXT QUERY — only genuinely unknown words remain */
const q = (intent.cleanedQuery || "").trim();

  /* ==========================
  🔥 MERGE INPUT + AI INTENT
  (manual filter inputs always win)
  ========================== */

 const make = (input.make || intent.make || "").toLowerCase();
  const body = input.body || intent.bodyType || "";
  const trans = input.trans || intent.transmission || "";

  /* ==========================
  🔥 PRICE LOGIC
  ========================== */

  let priceMin = input.priceMin || 0;
  let priceMax = input.priceMax || 0;

  /* 💡 MONTHLY → PRICE CONVERSION (legacy finance flow kept) */
if(intent.finance && intent.finance.monthlyTarget > 0){
  priceMax = intent.finance.monthlyTarget * 120;
}

  /* 💡 NATURAL-LANGUAGE PRICE INTENT
     Explicit constraints become hard filters; approximate
     prices become a proportional ±20% band. */
  if(!priceMax && !priceMin && intent.price){
    const p = intent.price;
    if(p.kind === "max"){
      priceMax = p.max;
    } else if(p.kind === "min"){
      priceMin = p.min;
    } else if(p.kind === "range"){
      priceMin = p.min;
      priceMax = p.max;
    } else if(p.kind === "around" && p.target){
      const band = aroundBand(p.target);
      priceMin = band.min;
      priceMax = band.max;
    }
  }

  /* 🔥 SOFT RANKING PREFERENCES (consumed by rankVehicles) */
  const intentPrefs = { ...(intent.preferences || {}) };
  if(intent.seatsMin) intentPrefs.minSeats = intent.seatsMin;
  if(intent.price && intent.price.target) intentPrefs.priceTarget = intent.price.target;
  /* PHASE 2 ADDITIVE ranking hints */
  if(intent.engineCc) intentPrefs.engineCcTarget = intent.engineCc;
  if(intent.mileageMax) intentPrefs.mileageCeiling = intent.mileageMax;

  /* 🔥 SORT HINT — only when the caller did not choose a sort */
  const sortHint =
    input.sort ||
    (intentPrefs.budget ? "price_low" :
     intentPrefs.lowMileage ? "mileage_low" :
     intentPrefs.luxury ? "price_high" :
     "latest");

  return {

    q,

    make: make ? make.charAt(0).toUpperCase() + make.slice(1) : "",
    model: input.model || intent.model || "",

    body,
    fuel: input.fuel || intent.fuel || "",
    trans,
    drive: input.drive || intent.drive || "",
    seller: input.seller || intent.seller || "",

    priceMin: priceMin || 0,
    priceMax: priceMax || 2000000,

    financeMode: intent.affordableOnly || input.affordableOnly || false,
    monthlyBudget: (intent.finance && intent.finance.monthlyTarget) || 0,
    term: input.term || (intent.finance && intent.finance.term) || 72,
    interest: input.interest || (intent.finance && intent.finance.interest) || 10,

    yearFrom: input.yearFrom || (intent.yearFrom ? String(intent.yearFrom) : ""),
    yearTo: input.yearTo || "",

    /* PHASE 2 ADDITIVE — mileage intent maps onto the EXISTING
       mileage filter (lte ceiling). Never 0 (0 means brand new). */
    mileage: input.mileage !== "" && input.mileage != null
      ? input.mileage
      : (intent.mileageMax ? String(intent.mileageMax) : ""),

    colours: input.colours || "",

    /* PHASE 2 ADDITIVE — location intent maps onto the EXISTING
       province/city Browse filters */
    province: input.province || intent.province || "",
    city: input.city || intent.city || "",

    condition: input.condition || intent.condition || "",
    special: !!input.special,
    featured: !!input.featured,

    /* PHASE 2 FIX: pass through explicit seat selections (homepage
       chips) instead of always discarding them */
    seats: Array.isArray(input.seats) && input.seats.length ? input.seats.map(String) : [],
    features: [],

    doors: "",
    owners: input.owners || (intent.flags && intent.flags.owners) || "",
    /* PHASE 2 ADDITIVE — "full service history" wording maps onto
       the EXISTING serviceHistory boolean filter */
    serviceHistory: input.serviceHistory === true || input.serviceHistory === "__NO__"
      ? input.serviceHistory
      : ((intent.flags && intent.flags.fullServiceHistory) ? true : false),

    ownershipVerified: !!(input.ownershipVerified || (intent.flags && intent.flags.ownershipVerified)),
    accidentFree: !!(input.accidentFree || (intent.flags && intent.flags.accidentFree)),
    certifiedPreOwned: !!(input.certifiedPreOwned || intent.certifiedPreOwned || (intent.flags && intent.flags.certifiedPreOwned)),
    warrantyIncluded: !!(input.warrantyIncluded || intent.warrantyIncluded || (intent.flags && intent.flags.warrantyIncluded)),
    roadworthyCertified: !!(input.roadworthyCertified || intent.roadworthyCertified || (intent.flags && intent.flags.roadworthyCertified)),
    servicePlanIncluded: !!(input.servicePlanIncluded || (intent.flags && intent.flags.servicePlanIncluded)),
    maintenancePlanIncluded: !!(input.maintenancePlanIncluded || (intent.flags && intent.flags.maintenancePlanIncluded)),
    financeAvailable: !!(input.financeAvailable || (intent.flags && intent.flags.financeAvailable)),
    fastCharge: !!(input.fastCharge || (intent.flags && intent.flags.fastCharge)),
    priceNegotiable: !!(input.priceNegotiable || intent.priceNegotiable || (intent.flags && intent.flags.priceNegotiable)),
    evOnly: !!(input.evOnly || intent.evOnly || (intent.flags && intent.flags.evOnly)),

    /* internal ranking hints — stripped before URL serialization */
    intentPrefs,

    sort: sortHint
  };
}
/* ==========================
🔥 RUN SEARCH (USES BROWSE LOGIC)
========================== */

export async function searchVehicles(filters, options = {}) {

  let query = supabase
    .from("vehicles")
    .select("*", { count: "exact" });

  query = buildVehicleQuery(query, filters); // 🔥 SAME AS BROWSE

  // Sorting (match browse behavior)
  if(filters.sort === "price_low"){
    query = query.order("price", { ascending: true });
  }
  else if(filters.sort === "price_high"){
    query = query.order("price", { ascending: false });
  }
  else{
    query = query.order("created_at", { ascending: false });
  }

  if(options.limit){
    query = query.limit(options.limit);
  }

  const { data, count, error } = await query;

  if(error){
    console.error("Search error:", error);
    return { data: [], count: 0 };
  }

let results = data || [];

/* ==========================
🔥 AI RANKING SYSTEM
========================== */


/* ==========================
🔥 PERSONALIZATION + AI RANKING
========================== */

const [userProfile, popularity] = await Promise.all([
  getUserProfile(),
  getPopularityMap()
]);

results = rankVehicles(results, {
  query: filters.q,
  filters,
  user: userProfile,
  popularity
});
/* =========================================
COMMERCIAL MARKETPLACE SORTING
========================================= */

results.sort((a,b)=>{

  /* =====================================
  SPONSORED PRIORITY
  ===================================== */

  if(
    a.is_sponsored &&
    !b.is_sponsored
  ){
    return -1;
  }

  if(
    !a.is_sponsored &&
    b.is_sponsored
  ){
    return 1;
  }

  /* =====================================
  HOMEPAGE BOOST
  ===================================== */

  if(
    a.homepage_boost &&
    !b.homepage_boost
  ){
    return -1;
  }

  if(
    !a.homepage_boost &&
    b.homepage_boost
  ){
    return 1;
  }

  /* =====================================
  PREMIUM DEALER PRIORITY
  ===================================== */

  if(
    a.premium_dealer &&
    !b.premium_dealer
  ){
    return -1;
  }

  if(
    !a.premium_dealer &&
    b.premium_dealer
  ){
    return 1;
  }

  /* =====================================
  FINAL AI SCORE
  ===================================== */

  return (
    (b._score || 0) -
    (a._score || 0)
  );

});

/* 🔥 LIMIT AFTER RANKING */
if(options.limit){
  results = results.slice(0, options.limit);
}

return {
  data: results,
  count: count || 0
}}