import { renderVehicleCard } from "../components/vehicleCard.js";
import { supabase } from "../js/api.js";
import { isAllowed } from "../js/consent.js";
import { navigate } from "../js/router.js";
import { route } from "../js/basePath.js";
import {
  pager,
  skeleton,
  toast,
  compareButton,
  toggleCompare,
  getCompare
} from "../js/ui.js";
import {
  getMakes,
  getModels,
  getVariants,
  getColours,
  getFeatures,
  getBodyTypes,
  getFuelTypes,
  getTransmissionTypes,
  getDriveTypes,
  getConditions,
  getSellerTypes,
  getProvinces,
  getCities,
  getBatteryCapacities,
  getBatteryRanges,
  getChargingTimes,
  getEngineCapacities,
  getCommercialCategories
} from "../js/catalog.js";
import { parseIntent, rankVehicles, getUserProfile } from "../js/aiEngine.js";
import { getPopularityMap } from "../js/aiEngine.js";
import { parseSearchIntent, getSmartSuggestions, aroundBand } from "../js/searchIntent.js";
import { MAKES, MODELS } from "../js/searchData.js";
import { savePageState, loadPageState } from "../js/stateManager.js";
import {
  SORT_OPTIONS,
  SORT_REGISTRY,
  getSortOption,
  getSortComparator,
  getSupabaseOrder
} from "../js/sortRegistry.js";
import {
  renderViewToggle,
  loadViewPreference
} from "../components/viewToggle.js";
/* ==========================
ðŸ”¥ NORMALIZATION HELPERS
========================== */

function normalize(text){
  return (text || "")
    .toLowerCase()
    .trim();
}

/* ========================== */
/* 🔥 MAKE-ONLY SEARCH DETECTOR
   Returns true ONLY when the active filter state represents
   a specific Make selection with NO model/variant constraint
   and NO other filters active.  This gates the featured-first
   make ranking so it never fires for model searches,
   multi-term searches, or filtered searches.
========================= */
function isMakeOnlySearch(){

  // Must have a make selected
  if(!filters.make || !filters.make.trim()) return false;

  // Must NOT have a model selected
  if(filters.model && filters.model.trim()) return false;

  // Must NOT have a text search query
  if(filters.q && filters.q.trim()) return false;

  // Must NOT have other filters active (checked against defaults)
  if(filters.variant && filters.variant.trim()) return false;
  if(filters.condition) return false;
  if(filters.fuel) return false;
  if(filters.trans) return false;
  if(filters.drive) return false;
  if(filters.body) return false;
  if(filters.vehicleType) return false;
  if(filters.motorcycleType) return false;
  if(filters.colours) return false;
  if(filters.seller) return false;
  if(filters.province) return false;
  if(filters.city) return false;
  if(filters.mileage) return false;
  if(filters.yearFrom) return false;
  if(filters.yearTo) return false;
  if(filters.priceMin > 0) return false;
  if(filters.priceMax < 2000000) return false;
  if(filters.seats) return false;
  if(filters.doors) return false;
  if(filters.features && filters.features.length) return false;
  if(filters.owners) return false;
  if(filters.serviceHistory) return false;
  if(filters.evOnly) return false;
  if(filters.fastCharge) return false;
  if(filters.batteryRange) return false;
  if(filters.chargingTime) return false;
  if(filters.batteryCapacity) return false;
  if(filters.engineCapacity) return false;
  if(filters.batteryWarranty) return false;
  if(filters.ownershipVerified) return false;
  if(filters.accidentFree) return false;
  if(filters.fullServiceHistory) return false;
  if(filters.roadworthyCertified) return false;
  if(filters.certifiedPreOwned) return false;
  if(filters.verifiedDealer) return false;
  if(filters.franchiseDealer) return false;
  if(filters.independentDealer) return false;
  if(filters.premiumDealer) return false;
  if(filters.commercialVehicle) return false;
  if(filters.commercialCategory) return false;
  if(filters.cabConfiguration) return false;
  if(filters.payloadMin) return false;
  if(filters.towingMin) return false;
  if(filters.warrantyIncluded) return false;
  if(filters.servicePlanIncluded) return false;
  if(filters.maintenancePlanIncluded) return false;
  if(filters.financeAvailable) return false;
  if(filters.vatIncluded) return false;
  if(filters.priceNegotiable) return false;
  if(filters.special) return false;
  if(filters.featured) return false;
  if(filters.financeMode) return false;

  return true;
}

/* ========================== */
/* ðŸ”¥ STATE */
/* ========================== */

/* ==========================
ðŸ”¥ NEW FILTER STATE (CORE)
========================== */

/* =============================================
   Province/City options come from the shared
   DB-backed catalogue (js/catalog.js) via
   getProvinces() / getCities(province) — the same
   source of truth used by upload & manage.
   ============================================= */

let filters = {
  q: "",
  make: "",
  model: "",

  priceMin: 0,
  priceMax: 2000000,

  yearFrom: "",
  yearTo: "",
  mileage: "",

  fuel: "",
  trans: "",
  drive: "",
  body: "",
  variant: "",
  vehicleType: "",
  motorcycleType: "",

  colours: "", // âœ… SOUTH AFRICA

  seller: "",
  condition: "",

  province: "",
  city: "",

  special: false,
  featured: false,

  seats: "",
  doors: "",
  features: [],

owners: "",
serviceHistory: false,

warrantyIncluded: false,
servicePlanIncluded: false,
maintenancePlanIncluded: false,

financeAvailable: false,
vatIncluded: false,
priceNegotiable: false,

evOnly: false,
fastCharge: false,
batteryWarranty: false,

batteryCapacity: "",
batteryRange: "",
chargingTime: "",
engineCapacity: "",
cabConfiguration: "",

ownershipVerified: false,
accidentFree: false,
fullServiceHistory: false,
roadworthyCertified: false,
certifiedPreOwned: false,

verifiedDealer: false,
franchiseDealer: false,
independentDealer: false,
premiumDealer: false,

commercialVehicle: false,
commercialCategory: "",
payloadMin: "",
towingMin: "",

financeMode: false,
  monthlyBudget: 0,
  deposit: 0,
  term: 72,
 interest: 10.25,
sort: "latest"
};

/* ========================== */
/* ðŸ”¥ SHARED QUERY BUILDER (PHASE 4)
========================== */


export function buildVehicleQuery(query, filters){

  /* ========================== */
  /* TEXT SEARCH */
  /* ========================== */

/* ========================== */
/* TEXT SEARCH (SMART + NON-CONFLICTING) */
/* ========================== */

if(filters.q && filters.q.length >= 2){

  const q = filters.q.trim();

  // ðŸ”¥ Only apply OR search if no exact make/model selected
  if(!filters.make && !filters.model){

    query = query.or(
      [
        `make.ilike.%${q}%`,
        `model.ilike.%${q}%`,
        `title.ilike.%${q}%`,
        `description.ilike.%${q}%`,
        `body_type.ilike.%${q}%`,
        `fuel_type.ilike.%${q}%`
      ].join(",")
    );

  }

}

  /* ========================== */
  /* EXACT */
  /* ========================== */

if(filters.make){
  query = query.ilike("make", `%${filters.make}%`);
}

if(filters.model && filters.model.trim() !== ""){
  query = query.ilike("model", `%${filters.model.trim()}%`);
}

  /* ========================== */
  /* RANGE */
  /* ========================== */

if(filters.financeMode){

  if(filters.priceMax){
    query = query.lte("price", filters.priceMax);
    query = query.gte("price", filters.priceMax * 0.2);
  }

} else {

if(filters.priceMin > 0){
  query = query.gte("price", filters.priceMin);
}

if(filters.priceMax < 2000000){
  query = query.lte("price", filters.priceMax);
}

}


if(filters.yearFrom){
  query = query.gte("year", Number(filters.yearFrom));
}

if(filters.yearTo){
  query = query.lte("year", Number(filters.yearTo));
}

if(filters.mileage){

  const mileage = Number(filters.mileage);

  if(mileage === 0){

    query = query.eq("mileage", 0);

  }
  else if(mileage === 200001){

    query = query.gte("mileage", 200000);

  }
  else{

    query = query.lte("mileage", mileage);

  }

}

  /* ========================== */
  /* SELECTS */
  /* ========================== */

if(filters.fuel){

  const fuel =
    String(filters.fuel)
      .replace(/\s*\(\d+\)\s*$/, "")
      .trim();

  if(fuel === "Electric"){

    query = query.or(
      [
        "fuel_type.ilike.%Electric%",
        "fuel_type.ilike.%EV%",
        "fuel_type.ilike.%BEV%",
        "fuel_type.ilike.%Battery Electric%"
      ].join(",")
    );

  } else {

    query = query.ilike(
      "fuel_type",
      `%${fuel}%`
    );

  }

}

if(filters.trans){
  query = query.ilike("transmission", `%${filters.trans}%`);
}

if(filters.drive){
  query = query.ilike("drive_type", `%${filters.drive}%`);
}

if(filters.motorcycleType){
  query = query.ilike(
    "motorcycle_type",
    `%${filters.motorcycleType}%`
  );
}

if(filters.body){
  query = query.ilike(
    "body_type",
    `%${filters.body}%`
  );
}

if(filters.variant){
  query = query.ilike(
    "variant",
    `%${filters.variant}%`
  );
}

if(filters.vehicleType){

  query = query.eq(
    "vehicle_category",
    filters.vehicleType
  );

}

if(filters.colours){
  const c = filters.colours.toLowerCase();
  query = query.ilike("color", `%${c}%`);
}

if(filters.seller){
  query = query.ilike("seller_type", `%${filters.seller}%`);
}

if(filters.condition){

  if(filters.condition === "pre-owned"){

    query = query.or(
      [
        "condition.ilike.%pre-owned%",
        "condition.ilike.%used%"
      ].join(",")
    );

  }else{

    query = query.ilike(
      "condition",
      `%${filters.condition}%`
    );

  }

}

if(filters.province){
  query = query.ilike(
    "province",
    `%${filters.province}%`
  );
}

if(filters.city){
  query = query.ilike(
    "city",
    `%${filters.city}%`
  );
}

  /* ========================== */
  /* ðŸ”¥ NEW: MULTI SELECT */
  /* ========================== */

  if (filters.seats?.length) {

    const exactSeats = filters.seats
      .filter(s => s !== "9+")
      .map(Number);

    const hasNinePlus =
      filters.seats.includes("9+");

    if (exactSeats.length && hasNinePlus) {

      query = query.or(
        [
          `seats.in.(${exactSeats.join(",")})`,
          "seats.gte.9"
        ].join(",")
      );

    } else if (hasNinePlus) {

      query = query.gte(
        "seats",
        9
      );

    } else {

      query = query.in(
        "seats",
        exactSeats
      );

    }

  }

  if (filters.doors?.length) {
    query = query.in(
      "doors",
      filters.doors.map(n => Number(n))
    );
  }

  if (filters.features?.length) {
    filters.features.forEach(feature => {
      query = query.ilike(
        "features",
        `%${feature}%`
      );
    });
  }

  /* ========================== */
  /* FLAGS */
  /* ========================== */

  if(filters.special){
    query = query.eq("is_special", true);
  }

  if(filters.featured){
    query = query.eq("is_featured", true);
  }

if(filters.owners){

  if(filters.owners === "3"){

    query = query.gte("owners", 3);

  }else{

    query = query.eq(
      "owners",
      Number(filters.owners)
    );

  }

}

if(filters.serviceHistory === true){
  query = query.eq("service_history", true);
}

if(filters.serviceHistory === "__NO__"){
  query = query.eq("service_history", false);
}

/* EV FILTERS */

if(filters.evOnly){
  query = query.or(
    [
      "fuel_type.ilike.%Electric%",
      "fuel_type.ilike.%EV%",
      "fuel_type.ilike.%BEV%",
      "fuel_type.ilike.%Battery Electric%"
    ].join(",")
  );
}

if(filters.fastCharge){
  query = query.eq("fast_charge", true);
}

if(filters.batteryRange){
  query = query.gte(
    "battery_range_km",
    Number(filters.batteryRange)
  );
}

if(filters.chargingTime){
  query = query.lte(
    "charging_time_hours",
    Number(filters.chargingTime)
  );
}

if(filters.batteryCapacity){
  query = query.eq(
    "battery_capacity_kwh",
    Number(filters.batteryCapacity)
  );
}

/* PHASE 2 FIX: the Battery Range control is a minimum-range
   selector ("Battery Range: 100 km+") so `gte` above carries the
   intended semantics. The old later `eq` branch silently overrode
   it (and did the same for Charging Time) — removed here. */
if(filters.engineCapacity){
  query = query.eq(
    "engine_capacity_cc",
    Number(filters.engineCapacity)
  );
}

if(filters.batteryWarranty){
  query = query.eq("battery_warranty", true);
}

if(filters.ownershipVerified){
  query = query.eq("ownership_verified", true);
}

if(filters.accidentFree){
  query = query.eq("accident_free", true);
}

if(filters.fullServiceHistory){
  query = query.eq("service_history", true);
}

if(filters.roadworthyCertified){
  query = query.eq("roadworthy_certificate", true);
}

if(filters.certifiedPreOwned){
  query = query.eq("certified_pre_owned", true);
}

if(filters.verifiedDealer){
  query = query.eq("verified_dealer", true);
}

if(filters.franchiseDealer){
  query = query.eq("franchise_dealer", true);
}

if(filters.independentDealer){
  query = query.eq("independent_dealer", true);
}

if(filters.premiumDealer){
  query = query.eq("premium_dealer", true);
}

if(filters.commercialVehicle){
  query = query.eq("commercial_vehicle", true);
}

if(filters.commercialCategory){
  query = query.ilike(
    "commercial_category",
    `%${filters.commercialCategory}%`
  );
}

if(filters.cabConfiguration){
  query = query.ilike(
    "cab_configuration",
    `%${filters.cabConfiguration}%`
  );
}

if(filters.payloadMin){
  query = query.gte(
    "payload_capacity_kg",
    Number(filters.payloadMin)
  );
}

if(filters.towingMin){
  query = query.gte(
    "towing_capacity_kg",
    Number(filters.towingMin)
  );
}

/* Commercial URL sync removed from query builder */

if(filters.warrantyIncluded){
  query = query.eq("warranty_included", true);
}

if(filters.servicePlanIncluded){
  query = query.eq("service_plan_included", true);
}

if(filters.maintenancePlanIncluded){
  query = query.eq("maintenance_plan_included", true);
}


if(filters.financeAvailable){
  query = query.eq("finance_available", true);
}

if(filters.vatIncluded){
  query = query.eq("vat_included", true);
}

if(filters.priceNegotiable){
  query = query.eq("price_negotiable", true);
}

return query;
}
/* ========================== */
/* ðŸ”¥ LIVE RESULT COUNT
========================== */

let countDebounce;
let timer;
let filterCountDebounce;

function updateResultsCount(){

  clearTimeout(countDebounce);

  countDebounce = setTimeout(async ()=>{

/* PHASE 3: single state synchronization per interaction — the extra
   syncFiltersFromUI() below was running the same DOM read twice and was
   removed. renderActiveFilterChips() reflects the synced state. */
syncFiltersFromUI();
renderActiveFilterChips();

if(!window.__filterUpdateInProgress){

  window.__filterUpdateInProgress = true;

  try{

    await updateFilterCounts();

  }finally{

    window.__filterUpdateInProgress = false;

  }

}

/* ==========================
ðŸ”¥ AI INTENT PARSING
(Upgraded additively: shared natural-language intent layer -
js/searchIntent.js. Existing manual filters always take
priority; intent only fills gaps, exactly as before.)
========================== */

applySearchIntentToFilters();
const currentFilters = filters;

    if(currentFilters.financeMode){

  calculatePriceFromFinance();

  filters.priceMax = priceMax;

  updateSliderTrack(
    priceMin,
    priceMax
  );

  renderActiveFilterChips();

}
let query = supabase
  .from("vehicles")
  .select("*", { count: "exact", head: true });

query = buildVehicleQuery(query, filters);

let count = 0;

try{
  const { count: c, error } = await query;

  if(error){
    console.error("Count error:", error);
    return;
  }

  count = c || 0;
totalCount = count;

}catch(e){
  console.warn("Count failed:", e);
}
    updateSearchButton(count);

  }, 250);
}

window.updateResultsCount = updateResultsCount;

function updateSearchButton(count){

  const btn = document.getElementById("applyFilters");
  if(!btn) return;

  let text = "";

  if(count === 0){
    text = "No vehicles found";
    btn.disabled = true;
    btn.classList.add("opacity-50","cursor-not-allowed");
  }
  else if(count === 1){
    text = "Search 1 vehicle";
    btn.disabled = false;
    btn.classList.remove("opacity-50","cursor-not-allowed");
  }
  else{
    text = `Search ${count} vehicles`;
    btn.disabled = false;
    btn.classList.remove("opacity-50","cursor-not-allowed");
  }

  /* ðŸ”¥ PREVENT UNNECESSARY DOM UPDATES */
  if(btn.dataset.lastText === text) return;

  btn.dataset.lastText = text;

  /* ðŸ”¥ MICRO-ANIMATION */
  btn.style.transform = "scale(0.96)";
  btn.style.opacity = "0.8";

  setTimeout(()=>{
    btn.innerText = text;
    btn.style.transform = "scale(1)";
    btn.style.opacity = "1";
  }, 120);
}

let currentPage = 1;
const limit = 20;
let totalCount = 0;

/* PHASE 2: exact filtered total from the server-side count query.
   Drives pagination + result metadata — never the current page length. */
let filteredTotal = 0;

let priceMin = 0;
let priceMax = 2000000;

let affordabilityProfile = null;
let recommendedVehicles = [];
let savedIds = [];

let viewMode = "grid";

/* ==========================
ðŸ”¥ SELLER VISUAL HELPERS
========================== */

function isDealer(v){

  return (
    v?.seller_type ||
    ""
  )
  .toLowerCase()
  .includes("dealer");

}

function getSellerBadge(v){

  if(isDealer(v)){

    return `
      <div class="
      inline-flex
      items-center
      gap-2
      px-3
      py-1
      rounded-full
      bg-[#C6A75D]/15
      border
      border-[#C6A75D]/30
      text-[#C6A75D]
      text-[11px]
      font-semibold
      tracking-[0.08em]
      uppercase
      ">
        <span class="
        w-2
        h-2
        rounded-full
        bg-[#C6A75D]
        "></span>

        Verified Dealer
      </div>
    `;

  }

  return `
    <div class="
    inline-flex
    items-center
    gap-2
    px-3
    py-1
    rounded-full
    bg-white/5
    border
    border-white/10
    text-white/70
    text-[11px]
    font-semibold
    tracking-[0.08em]
    uppercase
    ">
      Private Seller
    </div>
  `;

}

/* ========================== */
/* ðŸ”¥ SECTION 6 PERFORMANCE ADDITIONS */
/* ========================== */

let perfCache = new Map();
let activeRequest = 0;
let currentRequestToken = 0;

/* =========================================
PHASE 5 — STALE-WHILE-REVALIDATE CACHE
(public vehicle results only — never caches
private user data such as affordability
profiles or saved-vehicle IDs)

Keyed by (filters signature + page). A short
TTL keeps stale data from persisting and a
background re-fetch keeps the UI fresh.

The cache is also used to coalesce rapid,
identical-signature Browse requests so that
a flurry of filter changes does not spawn
multiple live Supabase queries for the same
view.
======================================== */

const BROWSER_CACHE_TTL_MS = 30_000;     // 30s — brief, marketplace moves fast
const SECTION_CACHE_TTL_MS = 60_000;     // 60s — featured/new/pre-owned change slowly

function cacheKey(...parts){
  return parts.join("::");
}

function signatureForFilters(){
  return cacheKey(
    filters.q || "",
    filters.make || "",
    filters.model || "",
    filters.variant || "",
    filters.condition || "",
    filters.fuel || "",
    filters.trans || "",
    filters.drive || "",
    filters.body || "",
    filters.vehicleType || "",
    filters.seller || "",
    filters.province || "",
    filters.city || "",
    filters.priceMin,
    filters.priceMax,
    filters.sort || "latest",
    filters.ownershipVerified,
    filters.accidentFree,
    filters.fullServiceHistory,
    filters.roadworthyCertified,
    filters.certifiedPreOwned,
    filters.verifiedDealer,
    filters.premiumDealer,
    filters.commercialVehicle,
    filters.owners || "",
    filters.serviceHistory === true ? "sh-yes"
      : filters.serviceHistory === "__NO__" ? "sh-no"
      : "sh-no",
    filters.special,
    filters.featured,
    filters.listingsOnly,
    filters.doors ? filters.doors.join(",") : "",
    filters.features ? filters.features.join(",") : "",
    filters.colours || "",
    filters.motorcycleType || "",
    filters.engineCapacity || "",
    filters.cabConfiguration || "",
    filters.evOnly,
    filters.fastCharge,
    filters.batteryCapacity || "",
    filters.batteryRange || "",
    filters.chargingTime || "",
    filters.batteryWarranty,
    filters.cabConfiguration ? "cc-yes" : "cc-no"
  );
}

/* Browse results cache. Each entry:
   {
     sig, page,
     ranked: Vehicle[],
     total: number,
     fetchedAt: number,
     backgroundRefresh: Promise<void> | null
   }
*/
const browseCache = new Map();
let currentBrowseRefresh = null; // only one background refresh at a time per sig+page

function browseCacheEntry(sig, page){
  return browseCache.get(cacheKey(sig, page));
}

function browseCacheSet(sig, page, ranked, total){
  browseCache.set(
    cacheKey(sig, page),
    {
      sig,
      page,
      ranked,
      total,
      fetchedAt: Date.now(),
      backgroundRefresh: null
    }
  );
}

function browseCacheGet(sig, page){
  const entry = browseCacheEntry(sig, page);
  if(!entry){
    return null;
  }
  if(Date.now() - entry.fetchedAt > BROWSER_CACHE_TTL_MS){
    browseCache.delete(cacheKey(sig, page));
    return null;
  }
  return entry;
}

function browseCacheInvalidateAll(){
  browseCache.clear();
}

/* Section cache for featured/new/pre-owned.
   These are small, public, slow-changing slices.
*/
const sectionCache = new Map();

function sectionCacheGet(sectionId){
  const entry = sectionCache.get(sectionId);
  if(!entry) return null;
  if(Date.now() - entry.fetchedAt > SECTION_CACHE_TTL_MS){
    sectionCache.delete(sectionId);
    return null;
  }
  return entry;
}

/* Only cache successful, non-empty section results so an empty
   section never persists and hides real content. */
function sectionCacheSet(sectionId, html){
  sectionCache.set(sectionId, {
    html,
    fetchedAt: Date.now()
  });
}

/* ==========================
ðŸ”¥ LOADING STATE (PHASE 1)
Controls ONLY the loading UI.
Never inferred from vehicle count.
========================== */
let isLoadingVehicles = false;

/* =========================================
PERFORMANCE: user-scoped data (affordability
profile + saved vehicle IDs) is fetched in
PARALLEL with the vehicle query. load() awaits
this promise only when applying the final
render, so vehicles never wait for auth
round-trips before their query starts.
======================================== */

let pendingUserDataPromise = null;

/* ==========================
ðŸ”¥ SEARCH SUGGESTION CACHE (PHASE 2)
========================== */

let suggestionCache = {};

/* =========================================
PHASE 5 — BROWSE CACHING (SWR-lite)
small, safe, short-lived, public-data only.
======================================== */

const BROWSE_CACHE_TTL_MS = 25_000;    // short-lived (Phase 5 SWR-lite; unused-by-live-load but retained for the dead helper block)

const browseSWR = {
  data: null,        // { signature, page, vehicles, filteredTotal, ts }
  timer: null
};

const sectionSWR = {
  featured: null,
  new: null,
  preowned: null
};

function browseSignature(){
  /* Deterministic key from filters + page + sort.
     Does NOT include per-user state (affordabilityProfile /
     savedIds) because those are applied at render time only
     and must never be cached or exposed. */
  const qs = [
    filters.q || "",
    filters.make || "",
    filters.model || "",
    filters.variant || "",
    filters.condition || "",
    filters.fuel || "",
    filters.trans || "",
    filters.drive || "",
    filters.body || "",
    filters.seller || "",
    filters.vehicleType || "",
    filters.colours || "",
    filters.province || "",
    filters.city || "",
    filters.sort || "latest",
    String(Boolean(filters.special)),
    String(Boolean(filters.featured)),
    String(filters.owners || ""),
    String(filters.serviceHistory === true ? 1 : filters.serviceHistory === "__NO__" ? 0 : ""),
    String(filters.priceMin || 0),
    String(filters.priceMax || 0),
    String(filters.yearFrom || 0),
    String(filters.yearTo || 0),
    String(filters.mileage || 0),
    String(filters.seats || []).slice(0, 20).join(","),
    String(filters.features || []).slice(0, 20).join(","),
    String(filters.doors || []).slice(0, 20).join(","),
    String(filters.ownershipVerified),
    String(filters.accidentFree),
    String(filters.fullServiceHistory),
    String(filters.certifiedPreOwned),
    String(filters.verifiedDealer),
    String(filters.franchiseDealer),
    String(filters.independentDealer),
    String(filters.premiumDealer),
    String(filters.roadworthyCertified),
    String(filters.commercialVehicle),
    String(filters.commercialCategory || ""),
    String(filters.payloadMin || 0),
    String(filters.towingMin || 0),
    String(Boolean(filters.financeAvailable)),
    String(Boolean(filters.priceNegotiable)),
    String(Boolean(filters.vatIncluded)),
    String(Boolean(filters.batteryWarranty)),
    String(Boolean(filters.ownershipVerified)),
    String(Boolean(filters.roadworthyCertified)),
    String(Boolean(filters.warrantyIncluded)),
    String(Boolean(filters.warrantyActive)),
    String(Boolean(filters.servicePlanIncluded)),
    String(Boolean(filters.servicePlanActive)),
    String(Boolean(filters.maintenancePlanIncluded)),
    String(Boolean(filters.maintenancePlanActive)),
    String(filters.financeMode),
    String(filters.monthlyBudget),
    String(filters.deposit),
    String(filters.term),
    String(filters.interest),
    String(filters.evOnly),
    String(filters.fastCharge),
    String(filters.batteryCapacity || ""),
    String(filters.batteryRange || ""),
    String(filters.chargingTime || ""),
    String(filters.engineCapacity || ""),
    String(filters.cabConfiguration || ""),
    currentPage
  ].join("||");
  return qs;
}

function browseCacheValid(entry, signature, page){
  return entry && entry.signature === signature
    && entry.page === page
    && Date.now() - entry.ts < BROWSE_CACHE_TTL_MS;
}

function sectionCacheValid(entry){
  return entry && (Date.now() - entry.ts < SECTION_CACHE_TTL_MS);
}

function renderBrowseSWR(entry, signature, page){
  /* Re-render from a cached snapshot. The cached vehicles are
     public records only; per-user badges (saved, affordability)
     are recomputed live inside renderCard by reading the
     current affordabilityProfile + savedIds at render time, so
     the cached snapshot does not need to store them. */
  if(!entry) return;
  render(entry.vehicles);

  if(typeof filteredTotal !== "number" || filteredTotal < 0){
    filteredTotal = entry.filteredTotal;
  }
  if(typeof entry.filteredTotal === "number" && entry.filteredTotal >= 0){
    totalCount = entry.filteredTotal;
  }

  const meta = document.getElementById("resultMeta");
  if(meta){
    meta.innerText =
      `${totalCount.toLocaleString()} Vehicles Found`;
  }

  const pagesEl = document.getElementById("pages");
  if(pagesEl){
    const totalPages =
      Math.max(1, Math.ceil(totalCount / limit));
    pagesEl.innerHTML = pager(
      page,
      totalPages,
      (p)=>{
        currentPage = p;
        load();
      }
    );
  }

  scheduleBrowseRefresh(signature, page);
}

function scheduleBrowseRefresh(signature, page){
  if(browseSWR.timer){
    clearTimeout(browseSWR.timer);
  }
  browseSWR.timer = setTimeout(()=>{
    browseSWR.timer = null;
    refreshBrowseInBackground(signature, page);
  }, 120);
}

async function refreshBrowseInBackground(signature, page){
  /* Background refresh: re-fetch fresh data for the same
     signature+page. If the user has already navigated away
     (signature changed) or a newer request started, discard
     the result. Otherwise update the cache + UI. */
  const currentSig = browseSignature();
  if(currentSig !== signature){
    return;
  }
  if(currentPage !== page){
    return;
  }

  try{
    const query = supabase
      .from("vehicles")
      .select("*")
      .range((page - 1) * limit, page * limit - 1);

    const q = buildVehicleQuery(query, filters);

    const orderClause = getSupabaseOrder(filters.sort);
    const finalQuery = orderClause
      ? q.order(orderClause.column, { ascending: orderClause.ascending })
      : q.order("created_at", { ascending: false });

    const countQuery = buildVehicleQuery(
      supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true }),
      filters
    );

    const [{ data: freshData, error: freshError }, freshCountResult] =
      await Promise.all([
        finalQuery,
        countQuery.then(r => ({ count: r.count, error: r.error }))
          .catch(e => ({ count: null, error: e }))
      ]);

    if(freshError){
      return;
    }
    if(!freshData || !freshData.length){
      return;
    }

    const freshTotal =
      (freshCountResult && typeof freshCountResult.count === "number" && freshCountResult.count >= 0)
        ? freshCountResult.count
        : freshData.length;

    const ranked = [...freshData];

    let updated = ranked;
    try{
      const rankingInputsPromise = Promise.allSettled([
        getUserProfile(),
        getPopularityMap()
      ]);
      const [profileResult, popularityResult] =
        await rankingInputsPromise;

      const safeProfile =
        profileResult.status === "fulfilled" ? profileResult.value : null;
      const safePopularity =
        popularityResult.status === "fulfilled" ? popularityResult.value : {};

      updated = rankVehicles(updated, {
        query: filters.q || "",
        filters,
        user: safeProfile,
        popularity: safePopularity
      });
    }catch(e){
      console.warn("Background ranking failed:", e);
    }

    browseSWR.data = {
      signature,
      page,
      vehicles: updated,
      filteredTotal: freshTotal,
      ts: Date.now()
    };

    /* Update UI only if the user hasn't already moved on. */
    render(updated);
    if(typeof filteredTotal === "number" && filteredTotal >= 0){
      totalCount = filteredTotal;
    } else {
      totalCount = freshTotal;
    }
    filteredTotal =
      (typeof freshTotal === "number" && freshTotal >= 0) ? freshTotal : filteredTotal;

    const meta = document.getElementById("resultMeta");
    if(meta){
      meta.innerText =
        `${totalCount.toLocaleString()} Vehicles Found`;
    }

    const pagesEl = document.getElementById("pages");
    if(pagesEl){
      const totalPages =
        Math.max(1, Math.ceil(totalCount / limit));
      pagesEl.innerHTML = pager(
        page,
        totalPages,
        (p)=>{
          currentPage = p;
          load();
        }
      );
    }

  }catch(e){
    console.warn("Background browse refresh failed:", e);
  }
}

/* =========================================
   suggestion dropdown. Mirrors the Homepage search bar's
   ArrowUp/ArrowDown/Tab/Escape behaviour WITHOUT introducing a
   second suggestion engine - the rows rendered by
   renderDropdown() are reused directly. */
let activeBrowseIndex = -1;
function getBrowseRows(){
  return Array.from(
    document.querySelectorAll("#searchDropdown [data-suggestion]")
  );
}
function updateActiveBrowseRow(){
  const rows = getBrowseRows();
  rows.forEach((el, idx) => {
    el.classList.toggle("bg-[#eef3f9]", idx === activeBrowseIndex);
  });
  const active = rows[activeBrowseIndex];
  if(active) active.scrollIntoView({ block: "nearest" });
}
/* Safe attribute context escaping for suggestion row data-* values */
function attrEsc(v){
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
/* ========================== */

/* =========================================
PHASE 5 — HUFA BROWSE PERFORMANCE OPTIMISATION
Small, safe client-side caches. In-memory only;
never persisted; never contain private user data.
======================================== */

const PHASE5 = {
  browseTTLMs: 25_000,   // short-lived â 25s browse result cache (spec P5-1)
  sectionTTLMs: 60_000,
  browse: new Map(),
  sections: new Map(),
  inFlight: new Map()
};

function phase5Now(){ return Date.now(); }
function phase5IsStale(entry, ttlMs){
  return !entry || (phase5Now() - entry.ts > ttlMs);
}

/* Browse cache key — must mirror every input that
   buildVehicleQuery() and the Supabase order both
   consume, plus the current page. A single change
   produces a new key -> cache miss -> fresh load. */
function browseCacheKey(){
  return [
    filters.q, filters.make, filters.model, filters.variant,
    filters.condition, filters.fuel, filters.trans, filters.drive,
    filters.body, filters.vehicleType, filters.colours, filters.seller,
    filters.province, filters.city,
    String(filters.mileage), String(filters.yearFrom), String(filters.yearTo),
    String(filters.priceMin), String(filters.priceMax),
    String(filters.seats), String(filters.doors), String(filters.features),
    String(filters.owners), String(filters.serviceHistory),
    String(filters.evOnly), String(filters.fastCharge),
    String(filters.batteryRange), String(filters.chargingTime),
    String(filters.batteryCapacity), String(filters.engineCapacity),
    String(filters.batteryWarranty), String(filters.ownershipVerified),
    String(filters.accidentFree), String(filters.fullServiceHistory),
    String(filters.roadworthyCertified), String(filters.certifiedPreOwned),
    String(filters.verifiedDealer), String(filters.franchiseDealer),
    String(filters.independentDealer), String(filters.premiumDealer),
    String(filters.commercialVehicle), String(filters.commercialCategory),
    String(filters.cabConfiguration), String(filters.payloadMin),
    String(filters.pullType), String(filters.pullCapacity),
    String(filters.warrantyIncluded), String(filters.servicePlanIncluded),
    String(filters.maintenancePlanIncluded), String(filters.financeAvailable),
    String(filters.vatIncluded), String(filters.priceNegotiable),
    String(filters.special), String(filters.featured),
    String(filters.sort), String(currentPage), String(limit)
  ].join("|||");
}

function phase5ReadBrowse(){
  const entry = PHASE5.browse.get(browseCacheKey());
  if(phase5IsStale(entry, PHASE5.browseTTLMs)) return null;
  return entry;
}
function phase5WriteBrowse(vehicles, filteredTotal){
  if(PHASE5.browse.size > 200){
    const first = PHASE5.browse.keys().next().value;
    if(first != null) PHASE5.browse.delete(first);
  }
  PHASE5.browse.set(browseCacheKey(), {
    vehicles, filteredTotal, ts: phase5Now(), _key: browseCacheKey()
  });
}
function phase5ClearBrowse(){ PHASE5.browse.clear(); }

function phase5ReadSection(sectionId){
  const entry = PHASE5.sections.get(sectionId);
  if(phase5IsStale(entry, PHASE5.sectionTTLMs)) return null;
  return entry;
}
function phase5WriteSection(sectionId, html){
  if(PHASE5.sections.size > 12){
    const first = PHASE5.sections.keys().next().value;
    if(first != null) PHASE5.sections.delete(first);
  }
  PHASE5.sections.set(sectionId, { html, ts: phase5Now() });
}

/* =========================================
   P5-5 — HUFA BROWSE CATALOGUE MEMOIZATION
   Short-lived in-memory memoization around
   repeated PUBLIC Browse catalogue requests.
   60s TTL. In-memory only; never persisted.
   Transparent to existing filter logic.
   ======================================== */

const CATALOG_MEMO_TTL_MS = 60_000;

const catalogMemoCache = new Map();
const catalogMemoInFlight = new Map();

function catalogMemoKey(fnName, ...args){
  return fnName + "::" + args.map(a => a == null ? "_" : String(a)).join("::");
}

function catalogMemoGet(key){
  const entry = catalogMemoCache.get(key);
  if(!entry) return null;
  if(Date.now() - entry.ts > CATALOG_MEMO_TTL_MS){
    catalogMemoCache.delete(key);
    return null;
  }
  return entry.value;
}

async function catalogMemoWrap(fnName, fn, ...args){
  const key = catalogMemoKey(fnName, ...args);

  const cached = catalogMemoGet(key);
  if(cached !== null) return cached;

  if(catalogMemoInFlight.has(key)){
    return catalogMemoInFlight.get(key);
  }

  const promise = fn(...args).then(result => {
    if(Array.isArray(result)){
      catalogMemoCache.set(key, { value: result, ts: Date.now() });
    }
    catalogMemoInFlight.delete(key);
    return result;
  }).catch(error => {
    catalogMemoInFlight.delete(key);
    throw error;
  });

  catalogMemoInFlight.set(key, promise);
  return promise;
}

async function memoGetMakes(...args){ return catalogMemoWrap("getMakes", getMakes, ...args); }
async function memoGetModels(...args){ return catalogMemoWrap("getModels", getModels, ...args); }
async function memoGetVariants(...args){ return catalogMemoWrap("getVariants", getVariants, ...args); }
async function memoGetProvinces(...args){ return catalogMemoWrap("getProvinces", getProvinces, ...args); }
async function memoGetCities(...args){ return catalogMemoWrap("getCities", getCities, ...args); }
async function memoGetColours(...args){ return catalogMemoWrap("getColours", getColours, ...args); }
async function memoGetFeatures(...args){ return catalogMemoWrap("getFeatures", getFeatures, ...args); }

/* stale-while-revalidate render helpers */

function phase5RenderCachedBrowse(){
  const cached = phase5ReadBrowse();
  if(!cached) return null;
  if(cached._key !== browseCacheKey()) return null;
  if(!Array.isArray(cached.vehicles) || !cached.vehicles.length){
    /* Never serve a stale empty cache — an empty result is not
       "safe to show immediately" because inventory moves and the
       user may miss newly listed vehicles. Force a fresh load. */
    return null;
  }
  filteredTotal = cached.filteredTotal;
  totalCount = cached.filteredTotal;
  render(cached.vehicles);
  const meta = document.getElementById("resultMeta");
  if(meta){
    const shownTotal =
      typeof filteredTotal === "number" && filteredTotal > 0
        ? filteredTotal
        : cached.vehicles.length;
    meta.innerText =
      `${shownTotal.toLocaleString()} Vehicle${shownTotal === 1 ? "" : "s"} Found`;
  }
  const pagesEl = document.getElementById("pages");
  if(pagesEl){
    const totalPages = Math.max(1, Math.ceil(filteredTotal / limit));
    pagesEl.innerHTML = pager(currentPage, totalPages, (p)=>{
      currentPage = p;
      load();
    });
  }
  return cached;
}

function phase5UpdateBrowseFromFresh(ranked, filteredTotal){
  if(!document.getElementById("results")) return;
  if(phase5ReadBrowse()?. _key !== browseCacheKey()) return;
  /* Reflect the fresh total so pagination stays correct. */
  const ft =
    (typeof filteredTotal === "number" && filteredTotal >= 0)
      ? filteredTotal
      : (Array.isArray(ranked) ? ranked.length : 0);
  filteredTotal = ft;
  totalCount = ft;
  render(ranked);
  const meta = document.getElementById("resultMeta");
  if(meta){
    const shown =
      typeof ft === "number" && ft > 0 ? ft : (ranked ? ranked.length : 0);
    meta.innerText =
      `${shown.toLocaleString()} Vehicle${shown === 1 ? "" : "s"} Found`;
  }
  const pagesEl = document.getElementById("pages");
  if(pagesEl){
    const totalPages = Math.max(1, Math.ceil(ft / limit));
    pagesEl.innerHTML = pager(currentPage, totalPages, (p)=>{
      currentPage = p;
      load();
    });
  }
}

function phase5ClearBrowseOnFilterChange(){ PHASE5.browse.clear(); }

/* stale-while-revalidate for the static-ish featured/new/pre-owned sections */
async function phase5LoadSection(sectionId, fetchHtml, boxSelector){
  const box = document.getElementById(boxSelector);
  if(!box) return;
  const cached = phase5ReadSection(sectionId);
  if(cached && cached.html){
    box.innerHTML = cached.html;
  }
  try{
    const html = await fetchHtml();
    if(!html) return;
    phase5WriteSection(sectionId, html);
    if(cached && cached.html){
      /* background refresh finished — update only if box still shows
         the cached content we overwrote above (i.e. user hasn't
         navigated away mid-refresh). */
      if(box.innerHTML === cached.html){
        box.innerHTML = html;
      }
    } else {
      box.innerHTML = html;
    }
  }catch(e){
    console.warn("Browse section background refresh failed:", e);
  }
}

/* ========================================== */

/* ðŸ”¥ ELIGIBILITY */
/* ========================== */

async function loadAffordabilityProfile(){

  const { data:userData } =
  await supabase.auth.getUser();

  if(!userData.user){
    return null;
  }

  const { data } =
  await supabase
  .from("affordability_profiles")
  .select("*")
  .eq("user_id", userData.user.id)
  .single();

  return data || null;

}

function getRecommendedVehicles(
  vehicles,
  profile
){

  if(!profile){
    return [];
  }

  const maxPrice =
  Number(
    profile.max_vehicle_price || 0
  );

  return vehicles
    .filter(v =>
      Number(v.price || 0) <= maxPrice
    )
    .sort((a,b)=>{

      const aGap =
      maxPrice -
      Number(a.price || 0);

      const bGap =
      maxPrice -
      Number(b.price || 0);

      return aGap - bGap;

    })
    .slice(0,8);

}

function checkEligibility(profile, price){

  if(!profile){
    return null;
  }

  return price <=
  Number(
    profile.max_vehicle_price || 0
  );

}

function getAffordabilityMatch(
  profile,
  vehiclePrice
){

  if(!profile){
    return null;
  }

  const maxPrice =
  Number(profile.max_vehicle_price || 0);

  if(!maxPrice){
    return null;
  }

  const ratio =
  vehiclePrice / maxPrice;

  let score =
  Math.round(
    100 - (ratio * 100)
  );

  score = Math.max(
    0,
    Math.min(100, score)
  );

  return score;

}

/* ========================== */
/* ðŸ”¥ SAVE VEHICLES */
/* ========================== */

async function loadSaved(){
  const { data:userData } = await supabase.auth.getUser();
  if(!userData.user) return;

  const { data } = await supabase
    .from("saved_vehicles")
    .select("vehicle_id")
    .eq("user_id", userData.user.id);

  savedIds = (data || []).map(x=>x.vehicle_id);
}

async function toggleSave(id){

  const { data:userData } = await supabase.auth.getUser();

  if(!userData.user){
    navigate("/login");
    return;
  }

  if(savedIds.includes(id)){

    const { error } = await supabase
  .from("saved_vehicles")
  .delete()
  .eq("vehicle_id", id)
  .eq("user_id", userData.user.id);

if(error){

  console.error(
    "Remove saved error:",
    error
  );

  toast("Failed to remove vehicle");
  return;

}

savedIds =
savedIds.filter(x => x !== id);

toast("Removed from saved");

  } else {

    const { error } = await supabase
  .from("saved_vehicles")
  .upsert({
    user_id: userData.user.id,
    vehicle_id: id
  }, {
    onConflict: "user_id,vehicle_id"
  });

if(error){

  console.error(
    "Save vehicle error:",
    error
  );

  toast("Failed to save vehicle");
  return;

}

if(!savedIds.includes(id)){
  savedIds.push(id);
}

toast("Saved vehicle");
  }

window.__allowUrlSync = false;

await load();

window.__allowUrlSync = true;
}


async function loadFeaturedSection(){

  const box = document.getElementById("featuredSection");
  if(!box) return;

  /* ðŸ”¥ FETCH FEATURED */
  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .eq("is_featured", true) // keep
.limit(12)


if(!data?.length){
  box.innerHTML = "<p>No featured vehicles</p>";
  return;
}
  box.innerHTML = `
    <div class="mb-6">

      <h2 class="text-2xl font-bold mb-4">
        Featured Vehicles
      </h2>

      <div class="vehicle-grid">

  ${data.map(v => renderCard(v, 0)).join("")}

</div>

    </div>
  `;
}

/* ========================== */
/* ðŸ”¥ NEW + PRE-OWNED SECTIONS */
/* ========================== */

async function loadNewSection(){

  const box = document.getElementById("newSection");
  if(!box) return;

  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .eq("condition", "new")
    .neq("is_featured", true)
    .limit(12);

  if(!data || !data.length){
    box.style.transition =
"opacity .2s ease";

box.style.opacity = "0";

requestAnimationFrame(()=>{

box.innerHTML = "";

});
    return;
  }

  box.innerHTML = `
<div class="vehicle-grid">

${data.map(v => renderCard(v,0)).join("")}

</div>
`;
}

async function loadPreOwnedSection(){

  const box = document.getElementById("preOwnedSection");
  if(!box) return;

  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .eq("condition", "pre-owned")
    .neq("is_featured", true)
    .limit(12);

  if(!data || !data.length){
    box.innerHTML = "";
    return;
  }

  box.innerHTML = `
<div class="vehicle-grid">

${data.map(v => renderCard(v,0)).join("")}

</div>
`;
}

function renderMiniCard(v){

  return renderCard(v, 0);

}

function renderRecommendedSection(){

  if(
    !recommendedVehicles.length
  ){
    return "";
  }

  return `

<section
class="
mb-6
bg-white
border
border-slate-200
rounded-2xl
p-4
"
>

<div class="mb-5">

<h2
class="
text-xl
font-bold
text-slate-900
"
>
Recommended For You
</h2>

<p
class="
text-slate-500
mt-1
"
>
Based on your affordability profile
</p>

</div>

<div
class="
grid
grid-cols-1
md:grid-cols-2
xl:grid-cols-4
gap-4
"
>

${recommendedVehicles
.map(v => renderMiniCard(v))
.join("")}

</div>

</section>

`;

}

/* ========================== */
/* ðŸ”¥ RECENT SEARCHES */
/* ========================== */

async function saveSearch(){

  const { data:userData } = await supabase.auth.getUser();
  if(!userData.user) return;

  const filters = getFilters();

  if(!filters.q && !filters.make && !filters.model) return;

  await supabase
    .from("saved_searches")
    .insert({
      user_id:userData.user.id,
      query: JSON.stringify(filters)
    });
}

/* ========================== */

export function BrowsePage(){

  requestAnimationFrame(init);
/* ========================== */
/* ðŸ”¥ SECTION HELPER (FIX) */
/* ========================== */

function section(title, content, open = false){
  return `
  <div class="filter-section filter-hover-card">

    <button
      class="
      filter-section-title
      w-full
      flex
      items-center
      justify-between
      text-left
      font-semibold
      text-slate-900
      py-2
      "
      onclick="toggleSection(this)"
    >

      <span>${title}</span>

<span
class="
sectionChevron
flex
items-center
justify-center
w-6
h-6
rounded-lg
bg-slate-100
text-slate-700
transition-all
duration-200
"
>
<svg
class="
w-3.5
h-3.5
transition-transform
duration-200
${open ? "rotate-90" : ""}
"
fill="none"
stroke="currentColor"
stroke-width="2.5"
viewBox="0 0 24 24"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M9 5l7 7-7 7"
/>
</svg>
</span>

    </button>

    <div class="sectionContent ${open ? "" : "hidden"}">
      ${content}
    </div>

  </div>
  `;
}
window.toggleSection = (btn)=>{

  const content =
  btn.nextElementSibling;

  const chevron =
  btn.querySelector(".sectionChevron");

  const icon =
  chevron?.querySelector("svg");

  content.classList.toggle("hidden");

  if(!icon) return;

  if(content.classList.contains("hidden")){

    icon.classList.remove("rotate-90");

  }else{

    icon.classList.add("rotate-90");

  }

};

window.toggleInventorySection = (id)=>{

  const el =
  document.getElementById(id);

  if(!el) return;

  el.classList.toggle("hidden");

  const icon =
  document.getElementById(id + "Icon");

  if(icon){

    icon.textContent =
    el.classList.contains("hidden")
      ? "›"
      : "⌄";

  }

};
  return `
  <div class="browse-bg">
  <div class="max-w-[1240px] mx-auto px-1.5 py-1">

<!-- PAGE HEADER -->

<div class="mb-2 browse-heading">

<h1 class="text-[25px] font-bold tracking-tight mb-0.5 browse-title">
Browse Vehicles
</h1>

<p class="text-slate-600 text-[11px] browse-subtitle">
Find the perfect vehicle from dealerships and private sellers across South Africa
</p>

</div>

<!-- PRIMARY SEARCH -->

<div class="mb-2">

<div
class="
rounded-xl
border
border-white/10
bg-white/5
backdrop-blur-xl
p-1
browse-search-shell
"
>

<div class="relative">

<div
class="
flex
md:flex-row
items-stretch
gap-2
"
>

<div
class="
relative
flex-1
"
>

<svg
class="
absolute
left-3.5
top-1/2
-translate-y-1/2
w-4
h-4
text-slate-400
pointer-events-none
browse-search-icon
"
fill="none"
stroke="currentColor"
stroke-width="2"
viewBox="0 0 24 24"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
/>
</svg>

<input
id="q"
placeholder="Search make, model or keyword..."
class="
w-full
h-9
pl-9
pr-3
rounded-lg
border
border-slate-200
bg-white
text-slate-900
text-[13px]
shadow-sm
focus:outline-none
focus:ring-4
focus:ring-[#3B82F6]/10
focus:border-[#3B82F6]
transition-all
browse-search-input
"
/>

<div
id="searchDropdown"
class="
search-dropdown
absolute
top-full
left-0
w-full
mt-2
hidden
z-50
"
></div>

</div>

<button
id="heroSearchBtn"
class="
h-11
md:h-9
w-9
md:w-auto
md:px-3
px-0
rounded-lg
bg-[#E48A2F]
text-white
font-semibold
text-[13px]
shadow-lg
hover:bg-[#d67f28]
hover:shadow-xl
transition-all
duration-300
whitespace-nowrap
flex
items-center
justify-center
min-w-[44px]
md:min-w-0
shrink-0
"
aria-label="Search vehicles"
title="Search vehicles"
>

<svg
class="w-4 h-4 md:hidden"
fill="none"
stroke="currentColor"
stroke-width="2.5"
viewBox="0 0 24 24"
aria-hidden="true"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
/>
</svg>

<span class="hidden md:inline">Search Vehicles</span>

</button>

</div>

</div>

</div>

</div>

<!-- ACTIVE FILTER CHIPS -->

<div
id="chips"
class="flex flex-wrap gap-1.5 mb-3"
></div>

<!-- CATEGORY SUMMARY CARDS -->

<div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">

<div
class="
bg-gradient-to-br
from-[#3B82F6]/5
to-white
rounded-xl
border
border-[#3B82F6]/20
p-1.5
cursor-pointer
hover:border-[#3B82F6]
hover:shadow-lg
hover:-translate-y-1
transition-all
duration-300
"
id="featuredCard"
>

<div class="flex items-center justify-between">

<div>

<div class="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">
Premium Inventory
</div>

<div class="font-bold text-[#3B82F6] text-[13px]">
Featured Vehicles
</div>

<div
id="featuredCount"
class="text-[11px] text-slate-500 mt-0.5"
>
Live Inventory
</div>

</div>

<div
class="
w-7
h-7
rounded-lg
bg-[#3B82F6]/10
text-[#3B82F6]
flex
items-center
justify-center
"
>
<svg
class="w-4 h-4"
fill="none"
stroke="currentColor"
stroke-width="1.8"
viewBox="0 0 24 24"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M3 8l4.5 4L12 4l4.5 8L21 8l-2 11H5L3 8z"
/>
</svg>
</div>

</div>

</div>

<div
class="
bg-gradient-to-br
from-[#3B82F6]/5
to-white
rounded-xl
border
border-[#3B82F6]/20
p-1.5
cursor-pointer
hover:border-[#3B82F6]
hover:shadow-lg
hover:-translate-y-1
transition-all
duration-300
"
id="newCard"
>

<div class="flex items-center justify-between">

<div>

<div class="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">
Latest Arrivals
</div>

<div class="font-semibold text-slate-900 text-[13px]">
New Vehicles
</div>

<div
id="newCount"
class="text-[11px] text-slate-500 mt-0.5"
>
Latest Stock
</div>

</div>

<div
class="
w-7
h-7
rounded-lg
bg-[#3B82F6]/10
text-[#3B82F6]
flex
items-center
justify-center
"
>
<svg
class="w-4 h-4"
fill="none"
stroke="currentColor"
stroke-width="1.8"
viewBox="0 0 24 24"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z"
/>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M19 3v3M20.5 4.5h-3M5 18v3M6.5 19.5h-3"
/>
</svg>
</div>

</div>

</div>

<div
class="
bg-gradient-to-br
from-[#3B82F6]/5
to-white
rounded-xl
border
border-[#3B82F6]/20
p-1.5
cursor-pointer
hover:border-[#3B82F6]
hover:shadow-lg
hover:-translate-y-1
transition-all
duration-300
"
id="preOwnedCard"
>

<div class="flex items-center justify-between">

<div>

<div class="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">
Quality Assured
</div>

<div class="font-semibold text-slate-900 text-[13px]">
Pre-Owned Vehicles
</div>

<div
id="preOwnedCount"
class="text-[11px] text-slate-500 mt-0.5"
>
Quality Used
</div>

</div>

<div
class="
w-7
h-7
rounded-lg
bg-[#3B82F6]/10
text-[#3B82F6]
flex
items-center
justify-center
"
>
<svg
class="w-4 h-4"
fill="none"
stroke="currentColor"
stroke-width="1.8"
viewBox="0 0 24 24"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"
/>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M9 12l2 2 4-4"
/>
</svg>
</div>

</div>

</div>

</div>

<!-- RESULTS TOOLBAR REMOVED -->

<div
id="filterOverlay"
class="
fixed
inset-0
bg-black/50
backdrop-blur-sm
z-[80]
hidden
lg:hidden
"
></div>

<div class="
grid
grid-cols-1
lg:grid-cols-[240px_minmax(0,1fr)]
xl:grid-cols-[250px_minmax(0,1fr)]
2xl:grid-cols-[260px_minmax(0,1fr)]
gap-2
items-start
"
>


  <!-- FILTER PANEL -->
<div
id="filterDrawer"
class="
filter-panel
space-y-4

fixed
lg:sticky

top-0
lg:top-4

left-0

w-[88%]
max-w-[380px]

lg:w-full
lg:max-w-none

h-auto

overflow-y-auto

p-4

z-[90]

translate-x-[-105%]
lg:translate-x-0

transition-transform
duration-300

bg-white

rounded-none
lg:rounded-[22px]

border
border-slate-200

shadow-xl
shadow-slate-200/50

self-start

max-h-[calc(100vh-32px)]
"
>

<!-- MOBILE DRAWER HEADER (STICKY) -->
<div class="
lg:hidden
filter-drawer-header
flex
items-center
justify-between
pb-3
mb-3
border-b
border-slate-200
"
>
<div class="
flex
items-center
gap-2
"
>
<svg
class="w-4 h-4 text-[#3B82F6]"
fill="none"
stroke="currentColor"
stroke-width="2"
viewBox="0 0 24 24"
aria-hidden="true"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M3 6h18M6 12h12M10 18h4"
/>
</svg>
<span class="
text-[15px]
font-bold
text-slate-900
"
>
Filters
</span>
</div>

<button
type="button"
id="mobileFilterClose"
class="
w-10
h-10
rounded-xl
bg-slate-100
text-slate-600
flex
items-center
justify-center
transition
hover:bg-slate-200
active:scale-95
"
aria-label="Close filters"
title="Close filters"
>
<svg
class="w-4 h-4"
fill="none"
stroke="currentColor"
stroke-width="2.5"
viewBox="0 0 24 24"
aria-hidden="true"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M6 18L18 6M6 6l12 12"
/>
</svg>
</button>

</div>

<!-- ACTIVE FILTER SUMMARY (DRAWER) -->
<div
id="drawerChips"
class="
lg:hidden
hidden
mb-3
"
></div>

      <!-- =========================================
      PRIMARY FILTERS (Always Visible)
      ========================================= -->

<div class="space-y-2.5">

<!-- VEHICLE TYPE -->
<div>
<label class="block text-[10px] font-medium uppercase tracking-[0.15em] text-slate-500 mb-1.5 font-semibold">
Vehicle Type
</label>
<select id="vehicleType" class="premium-select premium-select-sm w-full">
<option value="">All Vehicle Types</option>
</select>
</div>

<!-- PRICE -->
<div>
<label class="block text-[10px] font-medium uppercase tracking-[0.15em] text-slate-500 mb-1.5 font-semibold">
Price
</label>
<div class="premium-price-filter">
  <div class="flex items-center justify-between mb-2.5">
    <div class="price-live-badge">
      <span id="priceLive">R 0 - R 2 000 000</span>
    </div>
  </div>
  <div class="premium-slider-shell">
    <div class="slider-track-base"></div>
    <div class="slider-track-fill" id="sliderFill"></div>
    <input type="range" id="minRange" min="0" max="2000000" step="10000" class="premium-range">
    <input type="range" id="maxRange" min="0" max="2000000" step="10000" class="premium-range">
  </div>
  <div class="flex items-center justify-between mt-1.5">
    <span id="minLabel" class="text-[11px] font-medium text-slate-500">R 0</span>
    <span id="maxLabel" class="text-[11px] font-medium text-slate-500">R 2 000 000</span>
  </div>
</div>
</div>

<!-- MAKE -->
<div>
<label class="block text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500 mb-2 font-semibold">
Make
</label>
<select id="make" class="premium-select premium-select-sm w-full">
<option value="">All Makes</option>
</select>
</div>

<!-- MODEL -->
<div>
<label class="block text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500 mb-2 font-semibold">
Model
</label>
<select id="model" class="premium-select w-full">
<option value="">All Models</option>
</select>
</div>

<!-- YEAR -->
<div>
<label class="block text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500 mb-2 font-semibold">
Year
</label>
<div class="grid grid-cols-2 gap-2">
<select id="yearFrom" class="premium-select w-full">
<option value="">From</option>
${Array.from({length:26},(_,i)=>2025-i).map(year=>`<option value="${year}">${year}</option>`).join("")}
</select>
<select id="yearTo" class="premium-select w-full">
<option value="">To</option>
${Array.from({length:26},(_,i)=>2025-i).map(year=>`<option value="${year}">${year}</option>`).join("")}
</select>
</div>
</div>

<!-- BODY TYPE -->
<div>
<label class="block text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500 mb-2 font-semibold">
Body Type
</label>
<div id="bodyTiles" class="grid grid-cols-2 gap-2">
${["SUV","Crossover","Sedan","Hatchback","Coupe","Convertible","Wagon","MPV","Van","Bakkie","Double Cab","Light Truck","Bus","Motorhome","Camper"].map(type => `
<div class="body-tile h-10 rounded-xl border border-slate-200 bg-white px-2 text-center cursor-pointer transition-all hover:border-[#E48A2F] flex items-center justify-center" data-value="${type}" onclick="selectBody('${type}')">
<div class="body-tile-label text-xs font-medium">${type}</div>
</div>`).join("")}
</div>
</div>

<!-- FUEL -->
<div>
<label class="block text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500 mb-2 font-semibold">
Fuel
</label>
<select id="fuel" class="premium-select premium-select-sm w-full">
<option value="">Fuel</option>
<option>Petrol</option>
<option>Diesel</option>
<option>Hybrid</option>
<option>Plug-In Hybrid</option>
<option>Electric</option>
</select>
</div>

<!-- TRANSMISSION -->
<div>
<label class="block text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500 mb-2 font-semibold">
Transmission
</label>
<select id="trans" class="premium-select premium-select-sm w-full">
<option value="">Transmission</option>
<option value="Automatic">Automatic</option>
<option value="Manual">Manual</option>
</select>
</div>

</div>

<!-- =========================================
SECONDARY FILTERS (Collapsible Sections)
========================================= -->

${section("Details", `

<div class="space-y-3">

<div>

<label class="block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 mb-2">
Mileage
</label>

<select
id="mileage"
class="premium-select w-full"
>

<option value="">
Any Mileage
</option>

<option value="0">
Brand New (0 km)
</option>

<option value="10000">
Under 10 000 km
</option>

<option value="20000">
Under 20 000 km
</option>

<option value="30000">
Under 30 000 km
</option>

<option value="50000">
Under 50 000 km
</option>

<option value="75000">
Under 75 000 km
</option>

<option value="100000">
Under 100 000 km
</option>

<option value="150000">
Under 150 000 km
</option>

<option value="200000">
Under 200 000 km
</option>

<option value="200001">
200 000 km+
</option>

</select>

</div>

</div>

`)}

${section("Specifications", `

<div class="space-y-2">

<select
id="batteryCapacity"
class="
premium-select
premium-select-sm
w-full
"
>

<option value="">
Battery Capacity
</option>

<option value="10">10 kWh</option>
<option value="20">20 kWh</option>
<option value="30">30 kWh</option>
<option value="40">40 kWh</option>
<option value="50">50 kWh</option>
<option value="60">60 kWh</option>
<option value="70">70 kWh</option>
<option value="80">80 kWh</option>
<option value="90">90 kWh</option>
<option value="100">100 kWh</option>
<option value="110">110 kWh</option>
<option value="120">120 kWh</option>
<option value="130">130 kWh</option>
<option value="140">140 kWh</option>
<option value="150">150 kWh</option>
<option value="160">160 kWh</option>
<option value="170">170 kWh</option>
<option value="180">180 kWh</option>
<option value="190">190 kWh</option>
<option value="200">200 kWh</option>

</select>

<select
id="batteryRange"
class="
premium-select
premium-select-sm
w-full
"
>

<option value="">
Battery Range
</option>

<option value="50">50 km</option>
<option value="100">100 km</option>
<option value="150">150 km</option>
<option value="200">200 km</option>
<option value="250">250 km</option>
<option value="300">300 km</option>
<option value="350">350 km</option>
<option value="400">400 km</option>
<option value="450">450 km</option>
<option value="500">500 km</option>
<option value="550">550 km</option>
<option value="600">600 km</option>
<option value="650">650 km</option>
<option value="700">700 km</option>
<option value="750">750 km</option>
<option value="800">800 km</option>

</select>

<select
id="chargingTime"
class="
premium-select
premium-select-sm
w-full
"
>

<option value="">
Charging Time
</option>

<option value="0.5">30 Minutes</option>
<option value="1">1 Hour</option>
<option value="2">2 Hours</option>
<option value="3">3 Hours</option>
<option value="4">4 Hours</option>
<option value="5">5 Hours</option>
<option value="6">6 Hours</option>
<option value="7">7 Hours</option>
<option value="8">8 Hours</option>
<option value="9">9 Hours</option>
<option value="10">10 Hours</option>
<option value="12">12 Hours</option>
<option value="14">14 Hours</option>
<option value="16">16 Hours</option>
<option value="18">18 Hours</option>
<option value="20">20 Hours</option>
<option value="24">
Under 24 Hours
</option>

<option value="25">
24 Hours+
</option>

</select>

<select
id="drive"
class="
premium-select
premium-select-sm
w-full
"
>
  <option value="">Drive</option>
  <option>FWD</option>
  <option>RWD</option>
  <option>AWD</option>
</select>

<select
id="motorcycleType"
class="
premium-select
premium-select-sm
w-full
"
>
  <option value="">Motorcycle Type</option>
  <option>Sport Bike</option>
  <option>Naked Bike</option>
  <option>Adventure Bike</option>
  <option>Cruiser</option>
  <option>Touring</option>
  <option>Dual Sport</option>
  <option>Off Road</option>
  <option>Scooter</option>
  <option>Moped</option>
  <option>Quad Bike / ATV</option>
</select>

<select
id="engineCapacity"
class="
premium-select
premium-select-sm
w-full
"
>
<option value="">
Engine Capacity
</option>

<option value="50">
50 cc
</option>

<option value="100">
100 cc
</option>

<option value="125">
125 cc
</option>

<option value="150">
150 cc
</option>

<option value="200">
200 cc
</option>

<option value="250">
250 cc
</option>

<option value="300">
300 cc
</option>

<option value="400">
400 cc
</option>

<option value="500">
500 cc
</option>

<option value="600">
600 cc
</option>

<option value="650">
650 cc
</option>

<option value="700">
700 cc
</option>

<option value="750">
750 cc
</option>

<option value="800">
800 cc
</option>

<option value="900">
900 cc
</option>

<option value="1000">
1000 cc
</option>

<option value="1100">
1100 cc
</option>

<option value="1200">
1200 cc
</option>

<option value="1250">
1250 cc
</option>

<option value="1300">
1300 cc
</option>

<option value="1400">
1400 cc
</option>

<option value="1500">
1500 cc
</option>

<option value="1800">
1800 cc
</option>

<option value="2000">
2000 cc
</option>
</select>

<select
id="cabConfiguration"
class="
premium-select
premium-select-sm
w-full
"
>
  <option value="">Cab Configuration</option>
  <option>Single Cab</option>
  <option>Extended Cab</option>
  <option>Double Cab</option>
  <option>Crew Cab</option>
</select>

</div>

`)}


 ${section("Body Type", `

<div
id="bodyTilesFull"
class="
grid
grid-cols-2
gap-2
"
>

${[
"SUV",
"Crossover",
"Sedan",
"Hatchback",
"Liftback",
"Fastback",
"Coupe",
"Convertible",
"Wagon",
"Estate",
"MPV",
"Minivan",
"Panel Van",
"Van",
"Bakkie",
"Single Cab",
"Extended Cab",
"Double Cab",
"Crew Cab",
"Chassis Cab",
"Bus",
"Light Truck",
"Heavy Truck",
"Tipper",
"Flatbed",
"Dropside",
"Car Carrier",
"Lowbed",
"Refrigerated Truck",
"Horse & Livestock",
"Truck Tractor",
"Motorhome",
"Camper"
].map(type => `

<div
class="
body-tile
h-11
rounded-xl
border
border-slate-200
bg-white
px-3
text-center
cursor-pointer
transition-all
hover:border-[#E48A2F]
flex
items-center
justify-center
"
data-value="${type}"
onclick="selectBody('${type}')"
>

<div
class="
body-tile-label
text-sm
font-medium
whitespace-nowrap
"
>
${type}
</div>

</div>

`).join("")}

</div>

`)}

${section("Features", `

<div class="space-y-4">

<div>

<label class="block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 mb-3">
Colours
</label>

<select
id="colours"
class="premium-select w-full"
>
<option value="">
Any Colour
</option>
</select>

</div>

<div>

<label class="block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 mb-3">
Seats
</label>

<div class="grid grid-cols-3 gap-2">

${[
  { value: 2, label: "2" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
  { value: 7, label: "7" },
  { value: 8, label: "8" },
  { value: "9+", label: "9+" }
].map(seat => `

<label
class="
flex
items-center
justify-center
h-11
rounded-xl
border
border-slate-200
bg-white
cursor-pointer
text-sm
font-medium
"
>

<input
type="checkbox"
value="${seat.value}"
data-filter="seats"
class="hidden"
/>

${seat.label}

</label>

`).join("")}

</div>

</div>

<div>

<label class="block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 mb-3">
Doors
</label>

<div class="grid grid-cols-3 gap-2">

${[2,3,4,5,6].map(door => `

<label
class="
flex
items-center
justify-center
h-11
rounded-xl
border
border-slate-200
bg-white
cursor-pointer
text-sm
font-medium
"
>

<input
type="checkbox"
value="${door}"
data-filter="doors"
class="hidden"
/>

${door}

</label>

`).join("")}

</div>

</div>

<div>

<label class="block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 mb-3">
Features
</label>

<div class="relative mb-5">

<svg
class="
absolute
left-4
top-1/2
-translate-y-1/2
w-4
h-4
text-slate-400
pointer-events-none
"
fill="none"
stroke="currentColor"
stroke-width="2"
viewBox="0 0 24 24"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
/>
</svg>

<input
id="featureSearch"
type="text"
placeholder="Search vehicle features..."
class="
w-full
h-12
pl-11
pr-10
rounded-2xl
border
border-slate-200
bg-white
text-sm
placeholder:text-slate-400
shadow-sm
focus:outline-none
focus:border-[#3B82F6]
focus:ring-4
focus:ring-[#3B82F6]/10
transition-all
"
/>

<button
type="button"
id="clearFeatureSearch"
class="
absolute
right-3
top-1/2
-translate-y-1/2
hidden
w-7
h-7
rounded-full
bg-slate-100
text-slate-500
hover:bg-slate-200
transition-all
"
aria-label="Clear feature search"
title="Clear feature search"
>
<svg
class="w-3.5 h-3.5"
fill="none"
stroke="currentColor"
stroke-width="2.5"
viewBox="0 0 24 24"
aria-hidden="true"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M6 18L18 6M6 6l12 12"
/>
</svg>
</button>

</div>

<div
id="selectedFeaturesSummary"
class="
hidden
mb-5
rounded-2xl
border
border-[#E48A2F]/20
bg-[#E48A2F]/5
p-4
"
>

<div
class="
text-[11px]
uppercase
tracking-[0.18em]
text-[#E48A2F]
font-semibold
mb-3
"
>
Selected Features
</div>

<div
id="selectedFeaturesList"
class="
flex
flex-wrap
gap-3
"
></div>

</div>

<div
id="featuresOptions"
class="
flex
flex-col
gap-3
w-full
"
>

</div>

</div>

</div>

`)}


${section("Ownership & History", `

<div class="space-y-4">

<div>

<label class="block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 mb-3">
Owners
</label>

<div class="grid grid-cols-4 gap-2">

${[
["","Any"],
["1","1"],
["2","2"],
["3","3+"]
].map(([value,label]) => `

<button
type="button"
class="
owner-tile
h-11
rounded-xl
border
border-slate-200
bg-white
text-sm
font-medium
hover:border-[#E48A2F]
transition-all
"
data-value="${value}"
onclick="selectOwner('${value}')"
>
${label}
</button>

`).join("")}

</div>

</div>

<div>

<label class="block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 mb-3">
Service History
</label>

<div class="grid grid-cols-3 gap-2">

${[
["","Any"],
["yes","Yes"],
["no","No"]
].map(([value,label]) => `

<button
type="button"
class="
history-tile
h-11
rounded-xl
border
border-slate-200
bg-white
text-sm
font-medium
hover:border-[#E48A2F]
transition-all
"
data-value="${value}"
onclick="selectServiceHistory('${value}')"
>
${label}
</button>

`).join("")}

</div>

</div>

</div>

`)}

${section("EV & Verification", `

<div class="space-y-2">

<label class="flex items-center gap-3 h-11 px-3 rounded-xl border border-slate-200 bg-white cursor-pointer">
<input type="checkbox" id="evOnly">
<span class="text-sm font-medium">Electric Vehicles</span>
</label>

<label class="flex items-center gap-3 h-11 px-3 rounded-xl border border-slate-200 bg-white cursor-pointer">
<input type="checkbox" id="fastCharge">
<span class="text-sm font-medium">Fast Charging</span>
</label>

<label class="flex items-center gap-3 h-11 px-3 rounded-xl border border-slate-200 bg-white cursor-pointer">
<input type="checkbox" id="batteryWarranty">
<span class="text-sm font-medium">Battery Warranty</span>
</label>

</div>

`)}

${section("Ownership & Verification", `

<div class="space-y-2">

<label class="flex items-center gap-3 h-11 px-3 rounded-xl border border-slate-200 bg-white cursor-pointer">
<input type="checkbox" id="ownershipVerified">
<span class="text-sm font-medium">Ownership Verified</span>
</label>

<label class="flex items-center gap-3 h-11 px-3 rounded-xl border border-slate-200 bg-white cursor-pointer">
<input type="checkbox" id="accidentFree">
<span class="text-sm font-medium">Accident Free</span>
</label>

<label class="flex items-center gap-3 h-11 px-3 rounded-xl border border-slate-200 bg-white cursor-pointer">
<input type="checkbox" id="fullServiceHistory">
<span class="text-sm font-medium">Full Service History</span>
</label>

<label class="flex items-center gap-3 h-11 px-3 rounded-xl border border-slate-200 bg-white cursor-pointer">
<input type="checkbox" id="roadworthyCertified">
<span class="text-sm font-medium">Roadworthy Certified</span>
</label>

<label class="flex items-center gap-3 h-11 px-3 rounded-xl border border-slate-200 bg-white cursor-pointer">
<input type="checkbox" id="certifiedPreOwned">
<span class="text-sm font-medium">Certified Pre-Owned</span>
</label>

</div>

`)}

${section("Commercial Vehicles", `

<div class="space-y-2">

<label class="flex items-center gap-3 h-11 px-3 rounded-xl border border-slate-200 bg-white cursor-pointer">
<input type="checkbox" id="commercialVehicle">
<span class="text-sm font-medium">Commercial Vehicle</span>
</label>

<select
id="commercialCategory"
class="premium-select w-full"
>
<option value="">
All Categories
</option>
</select>
<select
id="payloadMin"
class="premium-select w-full"
>
<option value="">Any Payload</option>
<option value="500">500 kg+</option>
<option value="1000">1000 kg+</option>
<option value="1500">1500 kg+</option>
<option value="2000">2000 kg+</option>
<option value="3000">3000 kg+</option>
</select>

<select
id="towingMin"
class="premium-select w-full"
>
<option value="">Any Towing</option>
<option value="500">500 kg+</option>
<option value="1000">1000 kg+</option>
<option value="1500">1500 kg+</option>
<option value="2000">2000 kg+</option>
<option value="3000">3000 kg+</option>
</select>

</div>

`)}

${section("Plans & Protection", `

<div class="space-y-2">

<label class="flex items-center gap-3 h-11 px-3 rounded-xl border border-slate-200 bg-white cursor-pointer">
<input type="checkbox" id="warrantyIncluded">
<span class="text-sm font-medium">Warranty Included</span>
</label>

<label class="flex items-center gap-3 h-11 px-3 rounded-xl border border-slate-200 bg-white cursor-pointer">
<input type="checkbox" id="servicePlanIncluded">
<span class="text-sm font-medium">Service Plan Included</span>
</label>

<label class="flex items-center gap-3 h-11 px-3 rounded-xl border border-slate-200 bg-white cursor-pointer">
<input type="checkbox" id="maintenancePlanIncluded">
<span class="text-sm font-medium">Maintenance Plan Included</span>
</label>

<!--
Future implementation:

Warranty Active
Warranty Expiry

Service Plan Active
Service Plan Expiry

Maintenance Plan Active
Maintenance Plan Expiry

These filters will be enabled once the Plans & Protection
workflow is fully implemented.
-->

<label class="flex items-center gap-3 h-11 px-3 rounded-xl border border-slate-200 bg-white cursor-pointer">
<input type="checkbox" id="financeAvailable">
<span class="text-sm font-medium">Finance Available</span>
</label>

<label class="flex items-center gap-3 h-11 px-3 rounded-xl border border-slate-200 bg-white cursor-pointer">
<input type="checkbox" id="vatIncluded">
<span class="text-sm font-medium">VAT Included</span>
</label>

<label class="flex items-center gap-3 h-11 px-3 rounded-xl border border-slate-200 bg-white cursor-pointer">
<input type="checkbox" id="priceNegotiable">
<span class="text-sm font-medium">Price Negotiable</span>
</label>

</div>

`)}

${section("Seller", `

<div class="space-y-4">

<div>

<label class="block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 mb-2">
Province
</label>

<select
id="province"
class="premium-select w-full"
>

<option value="">
All Provinces
</option>

<option>Gauteng</option>
<option>Western Cape</option>
<option>KwaZulu-Natal</option>
<option>Eastern Cape</option>
<option>Free State</option>
<option>Limpopo</option>
<option>Mpumalanga</option>
<option>North West</option>
<option>Northern Cape</option>

</select>

</div>

<div>

<label class="block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 mb-2">
City
</label>

<select
id="city"
class="premium-select w-full"
disabled
>

<option value="">
Select Province First
</option>

</select>

</div>

<div>

<label class="block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 mb-3">
Seller Type
</label>

<div class="grid grid-cols-3 gap-2">

${[
["","Any"],
["private","Private"],
["dealer","Dealer"]
].map(([value,label]) => `

<button
type="button"
class="
seller-tile
h-11
rounded-xl
border
border-slate-200
bg-white
text-sm
font-medium
hover:border-[#E48A2F]
transition-all
"
data-value="${value}"
onclick="selectSeller('${value}')"
>
${label}
</button>

`).join("")}

</div>

</div>

<div>

<label class="block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 mb-3">
Condition
</label>

<div class="grid grid-cols-3 gap-2">

${[
["","Any"],
["new","New"],
["pre-owned","Used"]
].map(([value,label]) => `

<button
type="button"
class="
condition-btn
h-11
rounded-xl
border
border-slate-200
bg-white
text-sm
font-medium
hover:border-[#E48A2F]
transition-all
"
data-condition="${value}"
onclick="selectCondition('${value}')"
>
${label}
</button>

`).join("")}

</div>

</div>

</div>

`)}


<!-- STICKY MOBILE ACTION BAR -->
<div class="
filter-drawer-actions
lg:static
lg:mt-0
lg:pt-0
lg:pb-0
lg:border-t-0
lg:bg-transparent
lg:shadow-none
">

<button
id="clearFilters"
class="
w-full
h-11
rounded-xl
border
border-slate-200
bg-slate-50
text-slate-700
font-medium
hover:bg-slate-100
transition-all
"
>
Clear Filters
</button>

<div class="
mt-3
pt-3
border-t
border-slate-200
">

<button
id="applyFilters"
class="
w-full
h-12
bg-[#E48A2F]
text-white
font-semibold
text-[14px]

rounded-2xl

hover:brightness-110
hover:shadow-lg

transition-all
duration-300
"
>
  Search Vehicles
</button>

</div>

</div>

  </div>

  <!-- RESULTS -->
<div class="space-y-1.5 min-w-0 self-start">

<!-- TOOLBAR -->

<div
class="
bg-white
rounded-xl
border
border-slate-200
px-2.5
py-1
flex
items-center
justify-between
gap-2
mb-2
shadow-sm
sticky
top-0
z-20
"
>

<div
id="resultMeta"
class="
text-[13px]
font-semibold
text-slate-900
"
>
Loading vehicles...
</div>

<div
class="
flex
items-center
gap-2
browse-toolbar-actions
"
>

<!-- MOBILE FILTERS BUTTON -->
<button
type="button"
id="mobileToolbarFilterBtn"
class="
lg:hidden
h-10
px-2.5
rounded-lg
border
border-[#E48A2F]/40
bg-white
text-[#E48A2F]
text-xs
font-semibold
inline-flex
items-center
gap-1.5
transition
active:scale-95
browse-toolbar-filter-btn
"
aria-label="Open filters"
title="Filters"
>
<svg
class="w-3.5 h-3.5"
fill="none"
stroke="currentColor"
stroke-width="2"
viewBox="0 0 24 24"
aria-hidden="true"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M3 6h18M6 12h12M10 18h4"
/>
</svg>
<span>Filters</span>
</button>

<div class="flex items-center gap-2 browse-sort-wrap">

<span
class="
text-xs
font-medium
text-slate-500
whitespace-nowrap
hidden
md:inline
"
>
Sort By
</span>

<select
id="headerSort"
class="
h-8
px-2.5
rounded-lg
border
border-slate-200
bg-white
text-slate-900
text-xs
min-w-[140px]
browse-sort-select
"
aria-label="Sort vehicles"
>
<option value="latest">Newest First</option>
<option value="oldest">Oldest First</option>
<option value="price_low">Price: Low to High</option>
<option value="price_high">Price: High to Low</option>
<option value="mileage_low">Mileage: Low to High</option>
<option value="mileage_high">Mileage: High to Low</option>
<option value="year_new">Year: Newest</option>
<option value="year_old">Year: Oldest</option>
<option value="price_reduced_biggest">Price Reduced (Biggest Saving)</option>
<option value="price_reduced_smallest">Price Reduced (Smallest Saving)</option>
<option value="price_reduced_pct">Price Reduced (% Highest)</option>
<option value="recently_reduced">Recently Reduced</option>
</select>

</div>

<button
type="button"
id="gridViewBtn"
class="
w-8
h-8
rounded-lg
text-sm
border
border-[#3B82F6]
bg-[#3B82F6]/10
text-[#3B82F6]
font-bold
flex
items-center
justify-center
transition-all
duration-200
focus:outline-none
focus:ring-2
focus:ring-[#3B82F6]
focus:ring-offset-2
"
aria-label="Grid view"
aria-pressed="true"
title="Grid view"
>
<svg
class="w-4 h-4"
fill="none"
stroke="currentColor"
stroke-width="2"
viewBox="0 0 24 24"
aria-hidden="true"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M3 3v6h6V3H3z"
/>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M3 13v6h6v-6H3z"
/>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M13 3v6h6V3h-6z"
/>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M13 13v6h6v-6h-6z"
/>
</svg>
</button>

<button
type="button"
id="listViewBtn"
class="
w-8
h-8
rounded-lg
text-sm
border
border-slate-200
bg-white
text-slate-900
font-bold
flex
items-center
justify-center
transition-all
duration-200
focus:outline-none
focus:ring-2
focus:ring-[#3B82F6]
focus:ring-offset-2
"
aria-label="List view"
aria-pressed="false"
title="List view"
>
<svg
class="w-4 h-4"
fill="none"
stroke="currentColor"
stroke-width="2"
viewBox="0 0 24 24"
aria-hidden="true"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M8 6h13M8 12h13M8 18h13"
/>
<circle
cx="4"
cy="6"
r="1.5"
/>
<circle
cx="4"
cy="12"
r="1.5"
/>
<circle
cx="4"
cy="18"
r="1.5"
/>
</svg>
</button>

</div>

</div>

<div
id="recommendedContainer"
class="mb-2"
></div>

<!-- RESULTS GRID -->

  <!-- RESULTS GRID -->
  <section
    class="relative"
  >

    <div
      class="absolute inset-0 rounded-[32px] bg-gradient-to-b from-white/5 to-transparent pointer-events-none"
    ></div>

<div
id="results"
class="
grid
grid-cols-1
md:grid-cols-2
xl:grid-cols-4
2xl:grid-cols-5
3xl:grid-cols-6
gap-2
relative
z-10
items-stretch
w-full
"
><!-- Initial skeleton state: shown immediately on first paint so the
     page never displays an empty "Loading vehicles..."-only state
     before the existing skeleton cards. load() replaces this with
     the identical skeleton grid, then with real vehicles. -->${renderSkeletonCards()}</div>

</section>

<!-- TRUST BAR -->

<section
class="
mt-3
rounded-2xl
bg-white
border
border-slate-200
shadow-sm
overflow-hidden
"
>

<div class="grid md:grid-cols-3 gap-0">

<div class="p-2 text-center border-b md:border-b-0 md:border-r border-slate-200">

<div
class="
w-8
h-8
mx-auto
mb-1.5
rounded-xl
bg-[#3B82F6]/10
flex
items-center
justify-center
"
>
<svg
class="w-5 h-5 text-[#3B82F6]"
fill="none"
stroke="currentColor"
stroke-width="2"
viewBox="0 0 24 24"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"
/>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M9 12l2 2 4-4"
/>
</svg>
</div>

<h3 class="font-semibold text-slate-900 mb-0.5 text-[12px]">
Verified Listings
</h3>

<p class="text-[11px] leading-snug text-slate-500">
Vehicles are reviewed before publication to improve marketplace quality.
</p>

</div>

<div class="p-4 text-center border-b md:border-b-0 md:border-r border-slate-200">

<div
class="
w-10
h-10
mx-auto
mb-2
rounded-xl
bg-[#3B82F6]/10
flex
items-center
justify-center
"
>
<svg
class="w-5 h-5 text-[#3B82F6]"
fill="none"
stroke="currentColor"
stroke-width="2"
viewBox="0 0 24 24"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M3 10h18"
/>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"
/>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M7 14h4"
/>
</svg>
</div>

<h3 class="font-semibold text-slate-900 mb-1 text-[13px]">
Finance Assistance
</h3>

<p class="text-[11px] leading-snug text-slate-500">
Apply for vehicle finance directly through trusted lending partners.
</p>

</div>

<div class="p-4 text-center">

<div
class="
w-10
h-10
mx-auto
mb-2
rounded-xl
bg-[#3B82F6]/10
flex
items-center
justify-center
"
>
<svg
class="w-5 h-5 text-[#3B82F6]"
fill="none"
stroke="currentColor"
stroke-width="2"
viewBox="0 0 24 24"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2"
 />
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M7 8H5a2 2 0 00-2 2v6a2 2 0 002 2h2"
 />
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M8 12h8"
 />
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M10 9l-3 3 3 3"
 />
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M14 9l3 3-3 3"
 />
</svg>
</div>

<h3 class="font-semibold text-slate-900 mb-1 text-[13px]">
Trusted Marketplace
</h3>

<p class="text-[11px] leading-snug text-slate-500">
Connecting buyers and sellers across South Africa safely and securely.
</p>

</div>

</div>

</section>

<!-- PAGINATION -->

<div
id="pages"
class="
flex
justify-center
items-center
gap-1
mt-2
"
></div>
  `;
}

/* ========================== */
/* ðŸ”¥ CHIP SYSTEM (PHASE 2)

/* =========================================
ACTIVE FILTER CHIP SYSTEM
========================================= */

function getChipLabel(key, value){

const labels = {
  make: "Make",
  model: "Model",
  variant: "Variant",
  vehicleType: "Vehicle Type",
  fuel: "Fuel",
  trans: "Transmission",
  drive: "Drive",
  body: "Body Type",
  colours: "Colour",
  seller: "Seller",
  condition: "Condition",
  province: "Province",
  city: "City",
  owners: "Previous Owners",

  batteryCapacity: "Battery Capacity",
  batteryRange: "Battery Range",
  chargingTime: "Charging Time"
};

  if(key === "yearFrom"){
    return `From ${value}`;
  }

  if(key === "yearTo"){
    return `To ${value}`;
  }

if(key === "mileage"){

  const mileage = Number(value);

  if(mileage === 0){
    return "Brand New";
  }

  if(mileage === 200001){
    return "200 000 km+";
  }

  return `Under ${mileage.toLocaleString()} km`;

}

  if(key === "priceMax"){
    return `Up to R${Number(value).toLocaleString()}`;
  }

if(key === "serviceHistory"){

  if(value === true){
    return "Service History: Yes";
  }

  if(value === "__NO__"){
    return "Service History: No";
  }

  return "Service History";
}

if(key === "special"){
  return "Special Offers";
}

if(key === "featured"){
  return "Featured Vehicles";
}

if(key === "evOnly"){
  return "Electric Vehicles";
}

if(key === "fastCharge"){
  return "Fast Charging";
}

if(key === "batteryCapacity"){
  return `Battery Capacity: ${value} kWh+`;
}

if(key === "batteryRange"){
  return `Battery Range: ${value} km+`;
}

if(key === "chargingTime"){

  if(Number(value) >= 10){
    return "Charging Time: 10+ hours";
  }

  return `Charging Time: Under ${value} hour${Number(value) === 1 ? "" : "s"}`;
}

if(key === "batteryWarranty"){
  return "Battery Warranty";
}

if(key === "ownershipVerified"){
  return "Ownership Verified";
}

if(key === "accidentFree"){
  return "Accident Free";
}

if(key === "fullServiceHistory"){
  return "Full Service History";
}

if(key === "roadworthyCertified"){
  return "Roadworthy Certified";
}

if(key === "certifiedPreOwned"){
  return "Certified Pre-Owned";
}

if(key === "verifiedDealer"){
  return "Verified Dealer";
}

if(key === "franchiseDealer"){
  return "Franchise Dealer";
}

if(key === "independentDealer"){
  return "Independent Dealer";
}

if(key === "premiumDealer"){
  return "Premium Dealer";
}

if(key === "commercialVehicle"){
  return "Commercial Vehicle";
}

if(key === "commercialCategory"){
  return `Commercial: ${value}`;
}

if(key === "payloadMin"){
  return `Payload ${value}kg+`;
}

if(key === "towingMin"){
  return `Towing ${value}kg+`;
}

if(key === "certifiedPreOwned"){
  return "Certified Pre-Owned";
}

if(key === "warrantyIncluded"){
  return "Warranty Included";
}

if(key === "servicePlanIncluded"){
  return "Service Plan Included";
}

if(key === "maintenancePlanIncluded"){
  return "Maintenance Plan Included";
}

if(key === "warrantyActive"){
  return "Warranty Active";
}

if(key === "servicePlanActive"){
  return "Service Plan Active";
}

if(key === "maintenancePlanActive"){
  return "Maintenance Plan Active";
}

if(key === "financeAvailable"){
  return "Finance Available";
}

if(key === "vatIncluded"){
  return "VAT Included";
}

if(key === "priceNegotiable"){
  return "Price Negotiable";
}

if(labels[key]){
    return `${labels[key]}: ${value}`;
  }

  return String(value);
}

function buildActiveFilterChips(){

  const chips = [];

  const EXCLUDED_CHIPS = new Set([
    "sort",
    "financeMode",
    "monthlyBudget",
    "deposit",
    "term",
    "interest",
    "intentPrefs"
  ]);

  Object.entries(filters).forEach(([key,value])=>{

    if(EXCLUDED_CHIPS.has(key)){
      return;
    }

    /* PHASE 5: internal ranking/hint objects (e.g. intentPrefs) are
       never user-facing chips — never render an [object Object]. */
    if(typeof value === "object" && value !== null && !Array.isArray(value)){
      return;
    }

    if(
      value === "" ||
      value === null ||
      value === undefined
    ){
      return;
    }

    if(
      typeof value === "boolean" &&
      value === false
    ){
      return;
    }

    if(
      Array.isArray(value) &&
      value.length === 0
    ){
      return;
    }

    if(
      key === "priceMax" &&
      Number(value) === 2000000
    ){
      return;
    }

    if(
      key === "priceMin" &&
      Number(value) === 0
    ){
      return;
    }

    if(
      Array.isArray(value)
    ){

      value.forEach(item=>{

        chips.push({
          key,
          value:item,
          label:getChipLabel(key,item)
        });

      });

      return;
    }

    chips.push({
      key,
      value,
      label:getChipLabel(key,value)
    });

  });

  return chips;

}

function renderActiveFilterChips(){

  const box =
  document.getElementById("chips");

  if(!box) return;

  const chips =
  buildActiveFilterChips();

  if(!chips.length){

    box.classList.add("hidden");
    box.innerHTML = "";

    const drawerBox =
    document.getElementById("drawerChips");

    if(drawerBox){
      drawerBox.classList.add("hidden");
      drawerBox.innerHTML = "";
    }

    return;

  }

  box.classList.remove("hidden");

box.innerHTML = `

<div class="flex flex-wrap gap-1.5 items-center">

${chips.map(chip => `

<button
class="
group
inline-flex
items-center
gap-1
px-2.5
py-1
rounded-md
bg-[#eef3f9]
border
border-slate-200
text-[13px]
font-medium
text-[#081120]
whitespace-nowrap
transition-colors
"
aria-label="Remove ${chip.label} filter"
title="Remove ${chip.label}"
onclick="clearFilter('${chip.key}','${String(chip.value).replace(/'/g,"\\'")}')"
>

<span>${chip.label}</span>

<span class="text-slate-400 group-hover:text-red-500 transition-colors leading-none text-[15px]" aria-hidden="true">&times;</span>

</button>

`).join("")}

<button
class="
shrink-0
inline-flex
items-center
gap-1
text-[11px]
font-semibold
text-red-500
bg-red-50
border
border-red-200
hover:bg-red-100
rounded-full
px-2.5
py-1
transition
"
aria-label="Clear all filters"
title="Clear all filters"
onclick="clearAllFilters()"
>
<span class="leading-none">&times;</span> Clear All
</button>

</div>

`;

  /* ==========================
  DRAWER ACTIVE FILTER SUMMARY
  ========================== */
  const drawerBox =
  document.getElementById("drawerChips");

  if(drawerBox){

    if(!chips.length){

      drawerBox.classList.add("hidden");
      drawerBox.innerHTML = "";
      return;

    }

    drawerBox.classList.remove("hidden");

    drawerBox.innerHTML = `
<div class="
bg-slate-50
border
border-slate-200
rounded-xl
p-2.5
"
>
<div class="
text-[10px]
uppercase
tracking-[0.14em]
text-slate-500
font-semibold
mb-2
"
>
Selected
</div>
<div class="flex flex-wrap gap-1.5 items-center">
${chips.map(chip => `
<button
class="
group
inline-flex
items-center
gap-1
px-2.5
py-1
rounded-md
bg-[#eef3f9]
border
border-slate-200
text-[13px]
font-medium
text-[#081120]
whitespace-nowrap
transition-colors
"
aria-label="Remove ${chip.label} filter"
title="Remove ${chip.label}"
onclick="clearFilter('${chip.key}','${String(chip.value).replace(/'/g,"\\'")}')"
>
<span>${chip.label}</span>
<span class="text-slate-400 group-hover:text-red-500 transition-colors leading-none text-[15px]" aria-hidden="true">&times;</span>
</button>
`).join("")}
</div>
</div>
`;

  }

}

window.clearFilter = async function(key,value){

  window.__skipUrlRestore = true;

  /* PHASE 5: a removed filter must never be silently re-applied by the
     natural-language layer still holding the original sentence.
     Recognised concepts are already materialised as concrete filters,
     so dropping the raw query here keeps removal permanent (same idea
     as the Homepage removeChip stripping concepts out of the query). */
  const qEl = document.getElementById("q");
  if(qEl) qEl.value = "";

  const mobileQ = document.getElementById("mobileQuickSearch");
  if(mobileQ) mobileQ.value = "";

  filters.q = "";

  try{

    if(key === "make"){

      filters.make = "";
      filters.model = "";
      filters.variant = "";

      const make =
      document.getElementById("make");

      const model =
      document.getElementById("model");

      const variant =
      document.getElementById("variant");

      if(make) make.value = "";

      if(model){

        model.innerHTML =
        '<option value="">All Models</option>';

        model.value = "";

      }

      if(variant){

        variant.innerHTML =
        '<option value="">All Variants</option>';

        variant.value = "";

      }

    }

    else if(key === "model"){

      filters.model = "";
      filters.variant = "";

      const model =
      document.getElementById("model");

      const variant =
      document.getElementById("variant");

      if(model){
        model.value = "";
      }

      if(variant){

        variant.innerHTML =
        '<option value="">All Variants</option>';

        variant.value = "";

      }

    }

    else if(key === "province"){

      filters.province = "";
      filters.city = "";

      const province =
      document.getElementById("province");

      if(province){
        province.value = "";
      }

      await populateCities("");

    }

    else if(key === "doors"){

      /* PHASE 2: doors tiles are single-select checkboxes (data-filter
         "doors"); removing the chip must clear both state and tiles. */
      if(Array.isArray(filters.doors)){

        filters.doors =
        filters.doors.filter(
          x => String(x) !== String(value)
        );

      }

      document
      .querySelectorAll('[data-filter="doors"]')
      .forEach(cb=>{

        if(String(cb.value) === String(value)){

          cb.checked = false;

          cb.parentElement.classList.remove(
            "border-[#E48A2F]",
            "bg-[#E48A2F]/10"
          );

        }

      });

    }

    else if(key === "seats"){

      filters.seats =
      filters.seats.filter(
        x => String(x) !== String(value)
      );

      document
      .querySelectorAll('[data-filter="seats"]')
      .forEach(cb=>{

        if(
          String(cb.value) === String(value)
        ){
          cb.checked = false;
        }

      });

    }

    else if(key === "features"){

      filters.features =
      filters.features.filter(
        x => String(x) !== String(value)
      );

      document
      .querySelectorAll('[data-filter="features"]')
      .forEach(cb=>{

        if(cb.value === value){
          cb.checked = false;
        }

      });

    }

else if(key === "priceMin"){

  filters.priceMin = 0;
  priceMin = 0;

  const minRange =
  document.getElementById("minRange");

  if(minRange){
    minRange.value = 0;
  }

  updateSliderTrack(
    priceMin,
    priceMax
  );

}

else if(key === "priceMax"){

  filters.priceMax = 2000000;
  priceMax = 2000000;

  const maxRange =
  document.getElementById("maxRange");

  if(maxRange){
    maxRange.value = 2000000;
  }

  updateSliderTrack(
    priceMin,
    priceMax
  );

}

    else{

      filters[key] =
      typeof filters[key] === "boolean"
      ? false
      : "";

      const el =
      document.getElementById(key);

      if(el){

        if(el.type === "checkbox"){
          el.checked = false;
        }else{
          el.value = "";
        }

      }

      if(key === "condition"){
        updateConditionButtons();
      }

    }

    await trigger();

    renderActiveFilterChips();

  }finally{

    window.__skipUrlRestore = false;

  }

};

window.clearAllFilters = async function(){

  reset();

  [
    "verifiedDealer",
    "franchiseDealer",
    "independentDealer",
    "premiumDealer",

    "warrantyIncluded",
    "servicePlanIncluded",
    "maintenancePlanIncluded",

    "warrantyActive",
    "servicePlanActive",
    "maintenancePlanActive",

    "financeAvailable",
    "vatIncluded",
    "priceNegotiable",

    "ownershipVerified",
    "accidentFree",
    "fullServiceHistory",
    "roadworthyCertified",
    "certifiedPreOwned",

    "evOnly",
    "fastCharge",
    "batteryWarranty",

    "commercialVehicle"
  ].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.checked = false;
  });

  await trigger();

  renderActiveFilterChips();

  /* PHASE 2: keep the Search button count synchronized after clearing. */
  updateResultsCount();

};

/* ========================== */
/* ðŸ”¥ URL SYNC */
/* ========================== */

async function applyURLParams(){

  const params = new URLSearchParams(window.location.search);

  filters.q = params.get("q") || "";
  filters.make = params.get("make") || "";
  filters.model = params.get("model") || "";

  filters.yearFrom = params.get("yearFrom") || "";
  filters.yearTo = params.get("yearTo") || "";
  filters.mileage = params.get("mileage") || "";

  filters.fuel = params.get("fuel") || "";
  filters.trans = params.get("trans") || "";
filters.drive = params.get("drive") || "";
filters.body = params.get("body") || "";
filters.variant = params.get("variant") || "";
filters.vehicleType = params.get("vehicleType") || "";
  filters.colours = params.get("colours") || ""; // âœ…

  filters.seller = params.get("seller") || "";
  filters.condition = params.get("condition") || "";

filters.province = params.get("province") || "";
filters.city = params.get("city") || "";

  filters.special = params.get("is_special") === "true";
  filters.featured = params.get("is_featured") === "true";

  filters.seats = params.getAll("seats").map(Number);

  filters.doors = params.getAll("doors").map(Number);

  filters.features = params.getAll("features");

filters.evOnly =
params.get("evOnly") === "true";

filters.fastCharge =
params.get("fastCharge") === "true";

filters.batteryWarranty =
params.get("batteryWarranty") === "true";

filters.ownershipVerified =
params.get("ownershipVerified") === "true";

filters.accidentFree =
params.get("accidentFree") === "true";

filters.fullServiceHistory =
params.get("fullServiceHistory") === "true";

filters.roadworthyCertified =
params.get("roadworthyCertified") === "true";

filters.certifiedPreOwned =
params.get("certifiedPreOwned") === "true";

filters.verifiedDealer =
params.get("verifiedDealer") === "true";

filters.franchiseDealer =
params.get("franchiseDealer") === "true";

filters.independentDealer =
params.get("independentDealer") === "true";

filters.premiumDealer =
params.get("premiumDealer") === "true";

filters.commercialVehicle =
params.get("commercialVehicle") === "true";

filters.commercialCategory =
params.get("commercialCategory") || "";

filters.payloadMin =
params.get("payloadMin") || "";

filters.towingMin =
params.get("towingMin") || "";

filters.warrantyIncluded =
params.get("warrantyIncluded") === "true";

filters.servicePlanIncluded =
params.get("servicePlanIncluded") === "true";

filters.maintenancePlanIncluded =
params.get("maintenancePlanIncluded") === "true";

filters.warrantyActive =
params.get("warrantyActive") === "true";

filters.servicePlanActive =
params.get("servicePlanActive") === "true";

filters.maintenancePlanActive =
params.get("maintenancePlanActive") === "true";

/* PHASE 2: restore the remaining serialized filters
   (same state-variable names used by trigger()/URL save). */
filters.batteryCapacity =
params.get("batteryCapacity") || "";

filters.batteryRange =
params.get("batteryRange") || "";

filters.chargingTime =
params.get("chargingTime") || "";

filters.engineCapacity =
params.get("engineCapacity") || "";

filters.motorcycleType =
params.get("motorcycleType") || "";

filters.cabConfiguration =
params.get("cabConfiguration") || "";

filters.financeAvailable =
params.get("financeAvailable") === "true";

filters.vatIncluded =
params.get("vatIncluded") === "true";

filters.priceNegotiable =
params.get("priceNegotiable") === "true";




filters.owners =
  params.get("owners") || "";

const serviceHistoryParam =
  params.get("serviceHistory");

if(serviceHistoryParam === "true"){
  filters.serviceHistory = true;
}
else if(serviceHistoryParam === "false"){
  filters.serviceHistory = "__NO__";
}
else{
  filters.serviceHistory = false;
}

updateOwnerTiles();
updateHistoryTiles();

priceMin =
parseInt(params.get("priceMin")) || 0;

priceMax =
parseInt(params.get("priceMax")) || 2000000;

filters.priceMax = priceMax;
filters.priceMin = priceMin;

filters.priceMin = priceMin;
filters.priceMax = priceMax;

filters.sort =
params.get("sort") || "latest";

/* =========================================
ðŸ”¥ RESTORE SORT PREFERENCE (localStorage)
URL parameters take priority when present.
========================================= */
if(
  !params.get("sort")
){

  try{

    const savedSort =
      localStorage.getItem("browse_sort");

    if(
      savedSort &&
      SORT_REGISTRY[savedSort]
    ){

      filters.sort = savedSort;

    }

  }catch(e){
    /* storage unavailable — ignore */
  }

}

/* =========================================
SYNC RANGE UI
========================================= */

const minRange =
document.getElementById("minRange");

const maxRange =
document.getElementById("maxRange");

if(minRange){

  minRange.value = priceMin;

}

if(maxRange){

  maxRange.value = priceMax;

}

updateSliderTrack(priceMin, priceMax);

updateBodyTiles();
updateSellerTiles();
updateOwnerTiles();
updateHistoryTiles();
updateListingTiles();

  /* SYNC UI */
Object.keys(filters).forEach(key=>{

  const el = document.getElementById(key);

  if(!el) return;

  console.log(
    "APPLY URL PARAM",
    key,
    filters[key]
  );

  if(el.type === "checkbox"){

    el.checked = filters[key];

  } else {

    el.value = filters[key];

  }

});

  /* ðŸ”¥ SYNC SORT DROPDOWN (id is headerSort, not "sort") */
  const headerSortEl =
  document.getElementById("headerSort");

  if(headerSortEl){

    headerSortEl.value = filters.sort;

  }

/* Province/City always sync through their canonical controls:
   city options follow the selected province (or keep the disabled
   "Select Province First" placeholder when no province is set). */
await populateCities(filters.province);

if(filters.province && filters.city){

  const city =
  document.getElementById("city");

  if(city){

    city.value =
    filters.city;

  }

}

  document
    .querySelectorAll('[data-filter="seats"]')
    .forEach(cb=>{
      cb.checked =
        filters.seats.includes(
          Number(cb.value)
        );
    });

  /* PHASE 2: doors tiles must visually match the restored URL state
     (check + tile highlight, mirroring the seats restore above). */
  document
    .querySelectorAll('[data-filter="doors"]')
    .forEach(cb=>{
      cb.checked =
        filters.doors.includes(
          Number(cb.value)
        );

      cb.parentElement.classList.toggle(
        "border-[#E48A2F]",
        cb.checked
      );

      cb.parentElement.classList.toggle(
        "bg-[#E48A2F]/10",
        cb.checked
      );
    });

  document
    .querySelectorAll('[data-filter="features"]')
    .forEach(cb=>{
      cb.checked =
        filters.features.includes(
          cb.value
        );
    });
}

window.addEventListener("popstate", async ()=>{

  await applyURLParams();

  if(filters.make){

    await fillModels();

    document.getElementById("model").value =
    filters.model || "";

    await fillVariants();

    /* PHASE 3 AUDIT: #variant has no visible select in the Browse sidebar
       (make/model are the rendered controls), so this restore must be
       null-safe — otherwise a back/forward navigation with an active make
       filter threw a TypeError and aborted the whole popstate handler
       (vehicleType restore, chips and load() never ran). */
    const variantEl = document.getElementById("variant");
    if(variantEl){
      variantEl.value = filters.variant || "";
    }

  }

  document.getElementById("vehicleType").value =
  filters.vehicleType || "";

  updateVehicleSummary();

  renderActiveFilterChips();

  await load();

});


/* ========================== */

async function init(){

const saved = loadPageState("browse");

if(
  saved &&
  !window.location.search
){

  filters = {
    ...filters,
    ...(saved.filters || {})
  };

  priceMin =
    saved.priceMin ?? priceMin;

  priceMax =
    saved.priceMax ?? priceMax;

  currentPage =
    saved.page || 1;

  if(saved.url){
    history.replaceState({}, "", saved.url);
  }

}

  const ready = document.getElementById("results");

  if(!ready){
    requestAnimationFrame(init);
    return;
  }

// ðŸ”¥ LOAD UI FIRST (FAST)
/* PERFORMANCE 
   makes / colours / features are independent DB-backed fills;
   they now run in PARALLEL instead of strictly one after another
   (identical DOM results, one round-trip instead of three).
   Models/variants remain sequential because they read the
   make/model select state; fillVehicleTypes is fully local. */

await Promise.allSettled([

fillMakes(),

fillColours(),

fillFeatures(),

fillProvinces()

]);


await fillModels();

await fillVariants();

await fillVehicleTypes();

initFeatureCategoryToggle();

updateFeatureCategoryCounts();

document
  .querySelectorAll(
    '#featuresOptions [data-filter="features"]'
  )
  .forEach(cb=>{

    cb.addEventListener(
      "change",
      ()=>{

        const card = cb.parentElement;

        card.classList.toggle("border-[#E48A2F]", cb.checked);
        card.classList.toggle("bg-[#E48A2F]/10", cb.checked);
        card.classList.toggle("ring-2", cb.checked);
        card.classList.toggle("ring-[#E48A2F]/20", cb.checked);
        card.classList.toggle("text-[#E48A2F]", cb.checked);
        card.classList.toggle("font-semibold", cb.checked);
        card.classList.toggle("shadow-sm", cb.checked);
        card.classList.toggle("scale-[1.02]", cb.checked);
        card.classList.toggle("border-2", cb.checked);
        card.classList.add("transition-all","duration-200");

        const summary =
          document.getElementById(
            "selectedFeaturesSummary"
          );

        const list =
          document.getElementById(
            "selectedFeaturesList"
          );

        if(summary && list){

          const selected =
            [...document.querySelectorAll(
              '#featuresOptions [data-filter="features"]:checked'
            )]
            .map(x=>x.value);

          summary.classList.toggle(
            "hidden",
            selected.length === 0
          );

list.innerHTML =
  selected.map(feature=>`
    <button
      type="button"
      class="
        inline-flex
        items-center
        gap-2
        px-3
        py-1.5
        rounded-full
        bg-[#E48A2F]
        text-white
        text-xs
        font-medium
        hover:bg-[#d97f24]
        transition-all
      "
      onclick="
        (()=>{
          const cb=[...document.querySelectorAll('#featuresOptions [data-filter=features]')].find(x=>x.value==='${feature}');
          if(cb){
            cb.checked=false;
            cb.dispatchEvent(new Event('change'));
          }
        })()
      "
    >
      <span>${feature}</span>

      <svg
        class="w-3.5 h-3.5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>

    </button>
  `).join("");

        }

      }
    );

  });

initFeatureSearch();

await applyURLParams();

  /* ðŸ”¥ RESTORE VIEW PREFERENCE (localStorage) */
  const savedView =
  loadViewPreference("browse_view");

  if(
    savedView &&
    (savedView === "grid" ||
     savedView === "list")
  ){

    viewMode = savedView;

    const gridBtn =
    document.getElementById("gridViewBtn");

    const listBtn =
    document.getElementById("listViewBtn");

    if(savedView === "grid"){

      gridBtn?.classList.add(
        "border-[#3B82F6]",
        "bg-[#3B82F6]/10",
        "text-[#3B82F6]"
      );

      gridBtn?.setAttribute(
        "aria-pressed",
        "true"
      );

      listBtn?.classList.remove(
        "border-[#3B82F6]",
        "bg-[#3B82F6]",
        "text-white"
      );

      listBtn?.setAttribute(
        "aria-pressed",
        "false"
      );

    }else{

      listBtn?.classList.add(
        "border-[#3B82F6]",
        "bg-[#3B82F6]/10",
        "text-[#3B82F6]"
      );

      listBtn?.setAttribute(
        "aria-pressed",
        "true"
      );

      gridBtn?.classList.remove(
        "border-[#3B82F6]",
        "bg-[#3B82F6]",
        "text-white"
      );

      gridBtn?.setAttribute(
        "aria-pressed",
        "false"
      );

    }

  }

if(filters.make){

  document.getElementById("make").value =
  filters.make;

  await fillModels();

}

if(filters.model){

  document.getElementById("model").value =
  filters.model;

  await fillVariants();

}

if(filters.variant){

  /* PHASE 3 AUDIT: null-safe restore — #variant is not rendered in
     Browse; the state value still flows through to the query. A URL
     like /browse?variant=X previously threw here and aborted the
     remaining URL-restore work (vehicleType, sliders, chips). */
  const variantEl = document.getElementById("variant");
  if(variantEl){
    variantEl.value = filters.variant;
  }

}

document.getElementById("vehicleType").value =
filters.vehicleType || "";

updateVehicleSummary();

updateSliderTrack(priceMin, priceMax);

document
.querySelectorAll('[data-filter="seats"]')
.forEach(cb=>{

  cb.parentElement.classList.toggle(
    "border-[#E48A2F]",
    cb.checked
  );

  cb.parentElement.classList.toggle(
    "bg-[#E48A2F]/10",
    cb.checked
  );

});

document
.querySelectorAll('[data-filter="features"]')
.forEach(cb=>{

  cb.parentElement.classList.toggle(
    "border-[#E48A2F]",
    cb.checked
  );

  cb.parentElement.classList.toggle(
    "bg-[#E48A2F]/10",
    cb.checked
  );

});

// ðŸ”¥ LOAD USER DATA FIRST
pendingUserDataPromise = Promise.all([
  loadAffordabilityProfile(),
  loadSaved()
])
.then(([profile]) => {

  affordabilityProfile =
  profile;

  // ðŸ”¥ Now load vehicles

});

load();

// Fallback load (skipped while a request is already in flight)
setTimeout(() => {

  if(!window.__lastBrowseResults && !isLoadingVehicles){
    load();
  }

}, 1500);

// ðŸ”¥ LOAD SECTIONS IN BACKGROUND
setTimeout(()=>{
  loadFeaturedSection();
  loadNewSection();
  loadPreOwnedSection();
}, 0);

/* =========================================
FINANCE FILTER UI REMOVED
========================================= */

if(filters.make){

  document.getElementById("make").value =
  filters.make;

  await fillModels();

}

if(filters.model){

  document.getElementById("model").value =
  filters.model;

  await fillVariants();

}

if(filters.variant){

  /* PHASE 3 AUDIT: null-safe restore (same reason as applyURLParams —
     #variant is not rendered in Browse). */
  const variantEl = document.getElementById("variant");
  if(variantEl){
    variantEl.value = filters.variant;
  }

}

updateVehicleSummary();

syncFiltersFromUI();

renderActiveFilterChips();

updatePopularMakes();
updateConditionButtons();
updateVehicleSummary();

document
.getElementById("clearVehicleBtn")
?.addEventListener("click", async ()=>{

  filters.make = "";
  filters.model = "";
  filters.variant = "";
  filters.condition = "";

  const make =
  document.getElementById("make");

  const model =
  document.getElementById("model");

  const variant =
  document.getElementById("variant");

  const condition =
  document.getElementById("condition");

  if(make){
    make.value = "";
  }

  if(model){
    model.innerHTML =
    '<option value="">All Models</option>';
    model.value = "";
  }

  if(variant){
    variant.innerHTML =
    '<option value="">All Variants</option>';
    variant.value = "";
  }

  if(condition){
    condition.value = "";
  }

  updatePopularMakes();
  updateConditionButtons();
  updateVehicleSummary();

  await trigger();

});

bindEvents();
  /* =========================================
CATEGORY CARDS
========================================= */

document.getElementById("featuredCard")?.addEventListener("click", () => {

  filters.featured = true;
  filters.condition = "";
  currentPage = 1;

  trigger();

});

document.getElementById("newCard")?.addEventListener("click", () => {

  filters.featured = false;
  filters.condition = "new";
  currentPage = 1;

  trigger();

});

document.getElementById("preOwnedCard")?.addEventListener("click", () => {

  filters.featured = false;
  filters.condition = "pre-owned";
  currentPage = 1;

  trigger();

});

/* =========================================
GRID / LIST VIEW
========================================= */

function setViewMode(mode){

  viewMode = mode;

  const gridBtn =
  document.getElementById("gridViewBtn");

  const listBtn =
  document.getElementById("listViewBtn");

  if(mode === "grid"){

    gridBtn?.classList.add(
      "border-[#3B82F6]",
      "bg-[#3B82F6]/10",
      "text-[#3B82F6]"
    );

    gridBtn?.setAttribute(
      "aria-pressed",
      "true"
    );

    listBtn?.classList.remove(
      "border-[#3B82F6]",
      "bg-[#3B82F6]",
      "text-white"
    );

    listBtn?.setAttribute(
      "aria-pressed",
      "false"
    );

  }else{

    listBtn?.classList.add(
      "border-[#3B82F6]",
      "bg-[#3B82F6]/10",
      "text-[#3B82F6]"
    );

    listBtn?.setAttribute(
      "aria-pressed",
      "true"
    );

    gridBtn?.classList.remove(
      "border-[#3B82F6]",
      "bg-[#3B82F6]",
      "text-white"
    );

    gridBtn?.setAttribute(
      "aria-pressed",
      "false"
    );

  }

  /* ðŸ”¥ PERSIST VIEW PREFERENCE */
  try{
    localStorage.setItem(
      "browse_view",
      mode
    );
  }catch(e){
    /* storage unavailable — ignore */
  }

  render(
    window.__lastBrowseResults || []
  );

}

document.getElementById("gridViewBtn")?.addEventListener("click", () => {

  setViewMode("grid");

});

document.getElementById("listViewBtn")?.addEventListener("click", () => {

  setViewMode("list");

});
  const mobileSearch =
document.getElementById(
"mobileQuickSearch"
);

if(mobileSearch){

mobileSearch.addEventListener(
"input",
()=>{

const q =
document.getElementById("q");

if(q){
q.value = mobileSearch.value;
}

clearTimeout(window.__mobileSearchTimer);

window.__mobileSearchTimer =
setTimeout(()=>{
trigger();
}, 180);

});

}
  initMobileFilters();
  
  /* ðŸ”¥ AUTOFILL */
  const searchInput = document.getElementById("q");
  document.getElementById("heroSearchBtn")?.addEventListener(
  "click",
  () => {
    trigger();
  }
);

async function handleAutocomplete(e){

  const input = document.getElementById("q");
  const value = input.value.trim();

  /* ==========================
  🔥 PHASE 4 ADDITIVE — KEYBOARD SUGGESTION NAVIGATION
  Same interaction model as the Homepage search bar
  (components/searchBar.js): ArrowUp / ArrowDown move a
  highlight across the EXISTING Browse dropdown rows,
  Tab completes the highlighted suggestion into the input
  WITHOUT submitting, Escape closes the dropdown.
  No new suggestion engine — rows come from getSuggestions().
  ========================== */

  const rows = getBrowseRows();

  if(rows.length && ["ArrowDown","ArrowUp","Tab","Escape"].includes(e.key)){

    if(e.key === "ArrowDown"){
      e.preventDefault();
      activeBrowseIndex = (activeBrowseIndex + 1) % rows.length;
      updateActiveBrowseRow();
      return;
    }

    if(e.key === "ArrowUp"){
      e.preventDefault();
      activeBrowseIndex = (activeBrowseIndex - 1 + rows.length) % rows.length;
      updateActiveBrowseRow();
      return;
    }

    if(e.key === "Tab"){
      /* Autocomplete only: fill the input, never submit */
      e.preventDefault();
      if(activeBrowseIndex < 0){
        activeBrowseIndex = 0;
        updateActiveBrowseRow();
        return;
      }
      const labelEl = rows[activeBrowseIndex].querySelector(".font-medium");
      const label = labelEl ? labelEl.textContent.replace(/^\u2728\s*/, "").trim() : "";
      if(label) input.value = label;
      updateGhost();
      return;
    }

    if(e.key === "Escape"){
      e.preventDefault();
      activeBrowseIndex = -1;
      document.getElementById("searchDropdown")
      ?.classList.add("hidden");
      return;
    }

  }

  /* Enter with a keyboard-highlighted row selects that exact
     suggestion through the EXISTING selection pipeline. */
  if(e.key === "Enter" && activeBrowseIndex >= 0){

    const row = getBrowseRows()[activeBrowseIndex];
    e.preventDefault();
    activeBrowseIndex = -1;

    if(row && typeof window.selectBrowseSuggestion === "function"){
      const dec = s => String(s || "").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
      window.selectBrowseSuggestion(
        row.getAttribute("data-suggestion") || "",
        dec(row.getAttribute("data-value")),
        dec(row.getAttribute("data-label")),
        dec(row.getAttribute("data-make")),
        dec(row.getAttribute("data-model"))
      );
    }
    return;
  }

  /* ==========================
  🔥 ENTER = UPDATE BROWSE PIPELINE IN PLACE
  Browse is already the destination.
  ========================== */
  const prediction = getPrediction(value);

  if(e.key === "Enter"){

    e.preventDefault();

    if(!value) return;

    filters.q = value;

    document.getElementById("searchDropdown")
    ?.classList.add("hidden");

    renderActiveFilterChips();

    /* Use existing Browse search/result pipeline */
    trigger();

  }
}


  if(searchInput){

   searchInput.addEventListener("input", ()=>{

  const value = searchInput.value.trim();

  updateGhost();

  if(!value){
    document.getElementById("searchDropdown")
    ?.classList.add("hidden");
    return;
  }

  /* ==========================
  ðŸ”¥ DEBOUNCE (SMOOTH UX)
  ========================== */

  clearTimeout(window.__searchTimer);

  window.__searchTimer = setTimeout(()=>{

    getSuggestions(value).then(suggestions=>{
      renderDropdown(suggestions);
    });

  }, 120); // smooth + fast

});

    searchInput.addEventListener("keydown", handleAutocomplete);
    updateGhost();
  }

  document.addEventListener(
"click",
(e)=>{

  const dropdown =
  document.getElementById(
    "searchDropdown"
  );

  const input =
  document.getElementById("q");

  if(!dropdown || !input) return;

  const inside =
    dropdown.contains(e.target)
    ||
    input.contains(e.target);

  if(!inside){

    dropdown.classList.add(
      "hidden"
    );

  }

});

await applyURLParams();
updateSliderTrack(priceMin, priceMax);
renderActiveFilterChips();

}
/* ========================== */
function initMobileFilters(){

const drawer =
document.getElementById(
"filterDrawer"
);

const overlay =
document.getElementById(
"filterOverlay"
);

if(!drawer || !overlay){
return;
}

const close = ()=>{

drawer.classList.add(
"translate-x-[-105%]"
);

overlay.classList.add(
"hidden"
);

document.body.classList.remove(
"mobile-menu-open"
);

};

const open = ()=>{

drawer.classList.remove(
"translate-x-[-105%]"
);

overlay.classList.remove(
"hidden"
);

document.body.classList.add(
"mobile-menu-open"
);

};

const toolbarBtn =
document.getElementById(
"mobileToolbarFilterBtn"
);

if(toolbarBtn){
toolbarBtn.onclick = open;
}

overlay.onclick = close;

const closeBtn =
document.getElementById(
"mobileFilterClose"
);

if(closeBtn){
closeBtn.onclick = close;
}

const applyBtn =
document.getElementById(
"applyFilters"
);

if(applyBtn){
applyBtn.addEventListener(
"click",
()=>{
if(window.innerWidth < 1024){
close();
}
}
);
}

const clearBtn =
document.getElementById(
"clearFilters"
);

if(clearBtn){
clearBtn.addEventListener(
"click",
()=>{
if(window.innerWidth < 1024){
close();
}
}
);
}

window.addEventListener(
"resize",
()=>{

if(window.innerWidth >= 1024){
close();
}

});

document.addEventListener(
"keydown",
(e)=>{

if(e.key === "Escape"){
close();
}

});

}

/* =========================================
FINANCE FILTER UI REMOVED
Finance engine preserved platform-wide
========================================= */

function bindEvents(){

  /* PHASE 3: the canonical filter selects were previously wired with
     inline onchange="updateResultsCount();trigger();" attributes. Those
     attributes run against window scope, where trigger() (and reset)
     do NOT exist because Browse is loaded as a module — so every change
     threw a ReferenceError after the count update and the debounced
     filter reload never ran. Bound below as real change listeners (one
     clear event path per control): updateResultsCount() re-syncs the
     live count from the freshly-synced state, trigger() debounces
     internally and reloads the list + URL. */
  const quickFilterIds = [
    "yearFrom",
    "yearTo",
    "fuel",
    "trans",
    "mileage",
    "batteryCapacity",
    "batteryRange",
    "chargingTime",
    "drive",
    "motorcycleType",
    "engineCapacity",
    "cabConfiguration"
  ];

  quickFilterIds.forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener("change", ()=>{
      updateResultsCount();
      trigger();
    });
  });

  // MAKE â†’ MODEL
document.getElementById("make").onchange = async ()=>{

  console.log(
    "MAKE CHANGED TO:",
    document.getElementById("make").value
  );

  filters.make =
  document.getElementById("make").value;

  filters.model = "";
  filters.variant = "";

  await fillModels();

  const model =
  document.getElementById("model");

  if(model){
    model.value = "";
  }

  const variant =
  document.getElementById("variant");

  if(variant){

    variant.innerHTML =
    '<option value="">All Variants</option>';

    variant.value = "";

  }

  updateVehicleSummary();

  updateResultsCount();

  clearTimeout(window.__makeTimer);

  window.__makeTimer = setTimeout(()=>{
    trigger();
  },200);

};

document.getElementById("province").onchange = async ()=>{

  const province =
  document.getElementById("province").value;

  filters.province = province;
  filters.city = "";

  await populateCities(province);

  updateResultsCount();

  clearTimeout(window.__provinceTimer);

  window.__provinceTimer = setTimeout(()=>{
    trigger();
  }, 150);

};

document.getElementById("city").onchange = ()=>{

  filters.city =
  document.getElementById("city").value;

  updateResultsCount();

  clearTimeout(window.__cityTimer);

  window.__cityTimer = setTimeout(()=>{
    trigger();
  }, 150);

};

document.getElementById("model").onchange = async ()=>{

  filters.model =
  document.getElementById("model").value;

  filters.variant = "";

  const variant =
  document.getElementById("variant");

  if(variant){

    variant.innerHTML =
    '<option value="">All Variants</option>';

    variant.value = "";

  }

  await fillVariants();

  updateVehicleSummary();

  updateResultsCount();

  clearTimeout(window.__modelTimer);

  window.__modelTimer = setTimeout(()=>{
    trigger();
  },200);

};

  // ðŸ”¥ GLOBAL INPUT LISTENERS (FIXED)
/* ONE canonical event path per control. Controls that already have a
     dedicated module binding are EXCLUDED here so a single user action
     never fires two update/trigger pipelines:

       * make/model/province/city      => own .onchange (dependent fills)
       * headerSort                    => own change listener
       * minRange/maxRange             => own oninput (updateSlider)
       * q / mobileQuickSearch         => own input listeners
       * the canonical filter selects  => own change listeners (above)
       * [data-filter] checkboxes      => own change listeners (seats/doors/features)

     This listener therefore serves ONLY controls with no dedicated
     binding: the checkbox flags and the plain selects (vehicleType,
     colours, commercialCategory, payloadMin, towingMin). */
const GLOBAL_LISTENER_EXCLUDES = new Set([
  "q",
  "mobileQuickSearch",
  "make",
  "model",
  "province",
  "city",
  "headerSort",
  "minRange",
  "maxRange",
  "yearFrom",
  "yearTo",
  "fuel",
  "trans",
  "mileage",
  "batteryCapacity",
  "batteryRange",
  "chargingTime",
  "drive",
  "motorcycleType",
  "engineCapacity",
  "cabConfiguration"
]);

document.querySelectorAll("input, select").forEach(el=>{

  if(GLOBAL_LISTENER_EXCLUDES.has(el.id)) return;
  if(el.dataset?.filter) return;

  el.addEventListener("input", ()=>{

    updateResultsCount();

    clearTimeout(window.__globalFilterTimer);
    window.__globalFilterTimer = setTimeout(()=>{
      trigger();
    }, 200);

  });
});

  // ðŸ”¥ PRICE SLIDER
  document.getElementById("minRange").oninput = updateSlider;
  document.getElementById("maxRange").oninput = updateSlider;

  const headerSort =
document.getElementById(
  "headerSort"
);

if(headerSort){

  headerSort.addEventListener(
    "change",
    ()=>{

      /* ðŸ”¥ PERSIST SORT PREFERENCE */
      try{
        localStorage.setItem(
          "browse_sort",
          headerSort.value
        );
      }catch(e){
        /* storage unavailable — ignore */
      }

      trigger();
    }
  );

}

/* =========================================
CLEAR FILTERS
========================================= */

const clearFiltersHandler = async ()=>{

  sessionStorage.removeItem("browse");

history.replaceState(
  {},
  "",
  window.location.pathname
);

  reset();

  renderActiveFilterChips();

  window.__allowUrlSync = false;

await load();

window.__allowUrlSync = true;

/* PHASE 2: keep the Search button count synchronized after clearing. */
updateResultsCount();

};

document.getElementById(
  "clearFilters"
).onclick = clearFiltersHandler;

const toolbarClear =
document.getElementById(
  "clearFiltersToolbar"
);

if(toolbarClear){

  toolbarClear.onclick =
  clearFiltersHandler;

}

  // ðŸ”¥ SINGLE-SELECT (SEATS)
document.querySelectorAll('[data-filter="seats"]').forEach(cb=>{

  cb.addEventListener("change", ()=>{

    document
      .querySelectorAll('[data-filter="seats"]')
      .forEach(x=>{

        if(x !== cb){

          x.checked = false;

          x.parentElement.classList.remove(
            "border-[#E48A2F]",
            "bg-[#E48A2F]/10"
          );

        }

      });

    cb.parentElement.classList.toggle(
      "border-[#E48A2F]",
      cb.checked
    );

    cb.parentElement.classList.toggle(
      "bg-[#E48A2F]/10",
      cb.checked
    );

    filters.seats =
      cb.checked
        ? parseInt(cb.value)
        : "";

    updateResultsCount();

    clearTimeout(window.__seatsTimer);

    window.__seatsTimer = setTimeout(()=>{
      trigger();
    },150);

  });

});


  // ðŸ”¥ SINGLE-SELECT (DOORS)
document.querySelectorAll('[data-filter="doors"]').forEach(cb=>{

  cb.addEventListener("change", ()=>{

    document
      .querySelectorAll('[data-filter="doors"]')
      .forEach(x=>{

        if(x !== cb){

          x.checked = false;

          x.parentElement.classList.remove(
            "border-[#E48A2F]",
            "bg-[#E48A2F]/10"
          );

        }

      });

    cb.parentElement.classList.toggle(
      "border-[#E48A2F]",
      cb.checked
    );

    cb.parentElement.classList.toggle(
      "bg-[#E48A2F]/10",
      cb.checked
    );

    filters.doors =
      cb.checked
        ? parseInt(cb.value)
        : "";

    updateResultsCount();

    clearTimeout(window.__doorsTimer);

    window.__doorsTimer = setTimeout(()=>{
      trigger();
    },150);

  });

});

// ðŸ”¥ MULTI-SELECT (FEATURES)
document.querySelectorAll('[data-filter="features"]').forEach(cb=>{

  cb.addEventListener("change", ()=>{

    cb.parentElement.classList.toggle(
      "border-[#E48A2F]",
      cb.checked
    );

    cb.parentElement.classList.toggle(
      "bg-[#E48A2F]/10",
      cb.checked
    );

    filters.features = Array.from(
      document.querySelectorAll(
        '[data-filter="features"]:checked'
      )
    ).map(x => x.value);

    updateResultsCount();

    clearTimeout(window.__featuresTimer);

    window.__featuresTimer = setTimeout(()=>{
      trigger();
    },150);

  });

});


// ðŸ”¥ DELAY COUNT (DO NOT BLOCK INITIAL LOAD)
setTimeout(()=>{
  updateResultsCount();
}, 300);

}

function syncFiltersFromUI(){

  const mobileSearch =
  document.getElementById(
    "mobileQuickSearch"
  );

  const sidebarSort =
  document.getElementById(
    "sidebarSort"
  );

  const headerSort =
  document.getElementById(
    "headerSort"
  );

  const desktopSearch =
  val("q");

  filters.q =
    mobileSearch?.value?.trim()
    || desktopSearch
    || "";

console.log("MAKE DROPDOWN VALUE:", val("make"));
    
  /* PHASE 5: PRESERVE SEARCH-DERIVED FILTERS.
     An empty sidebar control must never wipe a filter that came from
     the search bar / shared intent layer. Sidebar selections still win
     whenever they carry a real value, so both input methods compose. */
  filters.make = val("make") || filters.make || "";
  filters.model = val("model") || filters.model || "";

  filters.priceMin = priceMin;
  filters.priceMax = priceMax;

  filters.yearFrom = val("yearFrom") || filters.yearFrom || "";
  filters.yearTo = val("yearTo") || filters.yearTo || "";
  filters.mileage = val("mileage") || filters.mileage || "";

filters.fuel = val("fuel") || filters.fuel || "";
filters.trans = val("trans") || filters.trans || "";
filters.drive = val("drive") || filters.drive || "";
filters.motorcycleType = val("motorcycleType") || filters.motorcycleType || "";

filters.variant = val("variant") || filters.variant || "";
filters.vehicleType = val("vehicleType") || filters.vehicleType || "";

filters.colours = val("colours") || filters.colours || "";

/****************************************
Condition now comes from the condition buttons.
Do NOT overwrite the existing value.
****************************************/
filters.condition = filters.condition || "";

filters.province = val("province") || filters.province || "";
filters.city = val("city") || filters.city || "";

/* seller comes from tiles */
filters.seller = filters.seller || "";

filters.special = !!filters.special;
filters.featured = !!filters.featured;

filters.owners = filters.owners || "";

/*
Service History now comes from tile buttons.
Do NOT overwrite the existing value.
*/
filters.serviceHistory = filters.serviceHistory;

filters.evOnly =
document.getElementById("evOnly")?.checked || false;

filters.fastCharge =
document.getElementById("fastCharge")?.checked || false;

filters.batteryCapacity =
document.getElementById("batteryCapacity")?.value || "";

filters.batteryRange =
document.getElementById("batteryRange")?.value || "";

filters.chargingTime =
document.getElementById("chargingTime")?.value || "";

filters.engineCapacity =
document.getElementById("engineCapacity")?.value || "";

filters.cabConfiguration =
document.getElementById("cabConfiguration")?.value || "";

filters.batteryWarranty =
document.getElementById("batteryWarranty")?.checked || false;

filters.ownershipVerified =
document.getElementById("ownershipVerified")?.checked || false;

filters.accidentFree =
document.getElementById("accidentFree")?.checked || false;

filters.fullServiceHistory =
document.getElementById("fullServiceHistory")?.checked || false;

filters.roadworthyCertified =
document.getElementById("roadworthyCertified")?.checked || false;

filters.certifiedPreOwned =
document.getElementById("certifiedPreOwned")?.checked || false;

filters.verifiedDealer =
document.getElementById("verifiedDealer")?.checked || false;

filters.franchiseDealer =
document.getElementById("franchiseDealer")?.checked || false;

filters.independentDealer =
document.getElementById("independentDealer")?.checked || false;

filters.premiumDealer =
document.getElementById("premiumDealer")?.checked || false;

/* ==========================
COMMERCIAL FILTERS
========================== */

filters.commercialVehicle =
document.getElementById("commercialVehicle")?.checked || false;

filters.commercialCategory =
document.getElementById("commercialCategory")?.value || "";

filters.payloadMin =
document.getElementById("payloadMin")?.value || "";

filters.towingMin =
document.getElementById("towingMin")?.value || "";

filters.warrantyIncluded =
document.getElementById("warrantyIncluded")?.checked || false;

filters.servicePlanIncluded =
document.getElementById("servicePlanIncluded")?.checked || false;

filters.maintenancePlanIncluded =
document.getElementById("maintenancePlanIncluded")?.checked || false;

filters.warrantyActive =
document.getElementById("warrantyActive")?.checked || false;

filters.servicePlanActive =
document.getElementById("servicePlanActive")?.checked || false;

filters.maintenancePlanActive =
document.getElementById("maintenancePlanActive")?.checked || false;

filters.financeAvailable =
document.getElementById("financeAvailable")?.checked || false;

filters.vatIncluded =
document.getElementById("vatIncluded")?.checked || false;

filters.priceNegotiable =
document.getElementById("priceNegotiable")?.checked || false;

filters.vatIncluded =
document.getElementById("vatIncluded")?.checked || false;

filters.priceNegotiable =
document.getElementById("priceNegotiable")?.checked || false;

  filters.seats = Array.from(
    document.querySelectorAll(
      '[data-filter="seats"]:checked'
    )
  ).map(x => parseInt(x.value));

  filters.doors = Array.from(
    document.querySelectorAll(
      '[data-filter="doors"]:checked'
    )
  ).map(x => parseInt(x.value));

/* Keep doors as an array for the query builder */

  filters.features = Array.from(
    document.querySelectorAll(
      '[data-filter="features"]:checked'
    )
  ).map(x => x.value);

  filters.financeMode =
    document.getElementById(
      "financeMode"
    )?.checked || false;

  filters.monthlyBudget =
    val("monthlyBudget");

  filters.deposit =
    val("deposit");

  filters.term =
    val("term") || 72;

  filters.interest =
    val("interest") || 10.25;

  filters.sort =
    headerSort?.value
    || sidebarSort?.value
    || "latest";
}
function validateFilters(){

  const yearFrom = Number(val("yearFrom"));
  const yearTo = Number(val("yearTo"));

  if(yearFrom && yearTo && yearFrom > yearTo){
    toast("Year From cannot be greater than Year To");
    return false;
  }

  const min = Number(priceMin);
  const max = Number(priceMax);

  if(min > max){
    toast("Invalid price range");
    return false;
  }

  const mileage = Number(val("mileage"));

  if(mileage && mileage < 0){
    toast("Mileage cannot be negative");
    return false;
  }

  return true;
}

/* =========================================
ðŸ”¥ SHARED NL SEARCH-INTENT APPLICATION (ADDITIVE)
Translates natural-language queries into the EXISTING
browse filters via the shared intent layer
(js/searchIntent.js). Used by the live result-count
pipeline, trigger() and load(). Manual filter selections
always win: intent only fills gaps, exactly like the
previous inline merge - it just understands far more.

Nothing was removed: every field the old inline merges set
(make/model/fuel/trans) is still set here, plus body type,
drive, condition, seller, year, explicit price constraints,
verification flags and soft ranking preferences.
========================================= */
let lastAppliedIntentParsedFor = null;

function applySearchIntentToFilters(){

  if(!filters.q) return;

  /* PHASE 3: the shared intent layer is deterministic and gap-filling, so
     once a query text has been interpreted it must not be re-parsed on
     every hop of the same interaction (count debounce → trigger → load).
     Re-parse only when the query text actually changes. This also stops
     STALE search text from silently overwriting an explicit user
     selection made AFTER the intent was already materialised. */
  const currentQuery = filters.q;
  if(lastAppliedIntentParsedFor === currentQuery) return;

  try{

    const intent = parseSearchIntent(currentQuery);

    /* Remember the RESIDUAL query (the text actually kept in filters.q
       after recognised concepts are stripped) as the applied marker so
       subsequent hops inside the same interaction skip. When parsing
       fails we remember the raw text instead — the unparseable input
       stays in filters.q and must not be re-parsed repeatedly. */
    lastAppliedIntentParsedFor =
      intent ? (intent.cleanedQuery || "") : currentQuery;

    if(!intent) return;

    /* ---------- core filters ----------
       PHASE 5: same contract as the working Homepage token engine
       (components/searchBar.js applySmartPhrase): a recognised concept
       REPLACES ONLY its own filter type; every other active filter is
       left untouched, so multiple filters compose in any order. */
    if(intent.make) filters.make = intent.make;
    if(intent.model) filters.model = intent.model;
    if(intent.bodyType) filters.body = intent.bodyType;
    if(intent.fuel) filters.fuel = intent.fuel;
    if(intent.transmission) filters.trans = intent.transmission;
    if(intent.drive) filters.drive = intent.drive;
    if(intent.condition) filters.condition = intent.condition;
    if(intent.seller) filters.seller = intent.seller;
    if(intent.yearFrom) filters.yearFrom = String(intent.yearFrom);

    /* ---------- PRICE ----------
       Explicit constraints ("under/below/up to/max", ranges)
       become real hard filters through the existing
       priceMin/priceMax pipeline; approximate prices become a
       proportional ±20% band around the target. */
    const p = intent.price;
    if(p){
      if(p.kind === "max" && p.max){ priceMax = p.max; }
      else if(p.kind === "min" && p.min){ priceMin = p.min; }
      else if(p.kind === "range" && p.max){ priceMin = p.min || priceMin; priceMax = p.max; }
      else if(p.kind === "around" && p.target){
        const band = aroundBand(p.target);
        priceMin = band.min;
        priceMax = band.max;
      }
      filters.priceMin = priceMin;
      filters.priceMax = priceMax;

      /* keep the existing slider UI in sync */
      updateSliderTrack(priceMin, priceMax);
      const minLabelEl = document.getElementById("minLabel");
      const maxLabelEl = document.getElementById("maxLabel");
      if(minLabelEl) minLabelEl.innerText = "R " + Number(priceMin).toLocaleString();
      if(maxLabelEl) maxLabelEl.innerText = "R " + Number(priceMax).toLocaleString();
    }

    /* ---------- verification / listing flags ---------- */
    [
      "certifiedPreOwned","roadworthyCertified","accidentFree","ownershipVerified",
      "warrantyIncluded","servicePlanIncluded","maintenancePlanIncluded",
      "financeAvailable","priceNegotiable","evOnly","fastCharge"
    ].forEach(k => {
      if(intent.flags[k] && !filters[k]){
        filters[k] = true;
        const el = document.getElementById(k);
        if(el) el.checked = true;
      }
    });
    if(intent.flags.owners && !filters.owners) filters.owners = intent.flags.owners;

    /* ---------- PHASE 2 ADDITIVE gap-fills ---------- */
    /* mileage intent → existing mileage filter (lte ceiling) */
    if(intent.mileageMax && !filters.mileage){
      filters.mileage = String(intent.mileageMax);
    }
    /* location intent → existing province/city filters */
    if(intent.province && !filters.province) filters.province = intent.province;
    if(intent.city && !filters.city) filters.city = intent.city;
    /* full service history wording → existing boolean filter */
    if(intent.flags.fullServiceHistory && !filters.serviceHistory){
      filters.serviceHistory = true;
    }

    /* ---------- soft ranking preferences (rankVehicles) ---------- */
    const prefs = { ...(intent.preferences || {}) };
    if(intent.seatsMin) prefs.minSeats = intent.seatsMin;
    if(p && p.target) prefs.priceTarget = p.target;
    /* PHASE 2 ADDITIVE ranking hints */
    if(intent.engineCc) prefs.engineCcTarget = intent.engineCc;
    filters.intentPrefs = prefs;

    /* residual free-text keeps only words the intent layer did NOT
       understand, so the existing ilike keyword search stays clean */
    filters.q = intent.cleanedQuery || "";

    /* soft sort steering while the user is on the default sort */
    if(filters.sort === "latest"){
      if(prefs.budget) filters.sort = "price_low";
      else if(prefs.luxury) filters.sort = "price_high";
      if(filters.sort !== "latest"){
        ["headerSort","sidebarSort"].forEach(id => {
          const el = document.getElementById(id);
          if(el && Array.from(el.options || []).some(o => o.value === filters.sort)){
            el.value = filters.sort;
          }
        });
      }
    }

    /* reflect the interpreted residual back into an inactive input */
    const qi = document.getElementById("q");
    if(qi && document.activeElement !== qi && qi.value.trim() !== filters.q){
      qi.value = filters.q;
    }

  } catch(e){
    console.warn("Intent parsing failed:", e);
  }
}

function trigger(){

  return new Promise(resolve => {

    currentPage = 1;
    clearTimeout(timer);

  timer = setTimeout(async ()=>{

  try{

    const valid = validateFilters();
    if(!valid){
      resolve();
      return;
    }

if(!window.__skipUrlRestore){

  syncFiltersFromUI();

}

/* ðŸ”¥ APPLY AI INTENT (FINAL FIX)
   Upgraded additively to the shared natural-language intent
   layer (js/searchIntent.js) - same gap-filling contract. */
applySearchIntentToFilters();

calculatePriceFromFinance();

const params = new URLSearchParams();

if(filters.q) params.set("q", filters.q);
if(filters.make) params.set("make", filters.make);
if(filters.model) params.set("model", filters.model);

if(filters.yearFrom) params.set("yearFrom", filters.yearFrom);
if(filters.yearTo) params.set("yearTo", filters.yearTo);
if(filters.mileage) params.set("mileage", filters.mileage);

if(filters.fuel) params.set("fuel", filters.fuel);
if(filters.trans) params.set("trans", filters.trans);
if(filters.drive) params.set("drive", filters.drive);
if(filters.body) params.set("body", filters.body);
if(filters.variant) params.set("variant", filters.variant);

if(filters.vehicleType){
  params.set("vehicleType", filters.vehicleType);
}

if(filters.colours) params.set("colours", filters.colours); // âœ…

if(filters.seller) params.set("seller", filters.seller);
if(filters.condition) params.set("condition", filters.condition);

if(filters.province) params.set("province", filters.province);
if(filters.city) params.set("city", filters.city);

if(filters.special) params.set("is_special", true);
if(filters.featured) params.set("is_featured", true);


if(filters.owners) params.set("owners", filters.owners);

if(filters.serviceHistory === true){
  params.set("serviceHistory", "true");
}

if(filters.serviceHistory === "__NO__"){
  params.set("serviceHistory", "false");
}

if(filters.priceMin) params.set("priceMin", filters.priceMin);
if(filters.priceMax) params.set("priceMax", filters.priceMax);
if(filters.sort) params.set("sort", filters.sort);

if(filters.seats?.length){
  filters.seats.forEach(s => params.append("seats", s));
}

if(filters.features?.length){
  filters.features.forEach(f => params.append("features", f));
}

/* PHASE 2: serialize the filters that were previously in-session only. */
if(filters.doors?.length){
  filters.doors.forEach(d => params.append("doors", d));
}

if(filters.motorcycleType){
  params.set("motorcycleType", filters.motorcycleType);
}

if(filters.engineCapacity){
  params.set("engineCapacity", filters.engineCapacity);
}

if(filters.cabConfiguration){
  params.set("cabConfiguration", filters.cabConfiguration);
}

if(filters.evOnly){
  params.set("evOnly","true");
}

if(filters.fastCharge){
  params.set("fastCharge","true");
}

if(filters.batteryCapacity){
  params.set(
    "batteryCapacity",
    filters.batteryCapacity
  );
}

if(filters.batteryRange){
  params.set(
    "batteryRange",
    filters.batteryRange
  );
}

if(filters.chargingTime){
  params.set(
    "chargingTime",
    filters.chargingTime
  );
}

/* PHASE 2: serialize the remaining working filters so refresh /
   back / forward restores exactly what was selected. */
if(filters.certifiedPreOwned){
  params.set("certifiedPreOwned","true");
}

if(filters.verifiedDealer){
  params.set("verifiedDealer","true");
}

if(filters.franchiseDealer){
  params.set("franchiseDealer","true");
}

if(filters.independentDealer){
  params.set("independentDealer","true");
}

if(filters.premiumDealer){
  params.set("premiumDealer","true");
}

if(filters.commercialVehicle){
  params.set("commercialVehicle","true");
}

if(filters.commercialCategory){
  params.set("commercialCategory", filters.commercialCategory);
}

if(filters.payloadMin){
  params.set("payloadMin", filters.payloadMin);
}

if(filters.towingMin){
  params.set("towingMin", filters.towingMin);
}

if(filters.financeAvailable){
  params.set("financeAvailable","true");
}

if(filters.vatIncluded){
  params.set("vatIncluded","true");
}

if(filters.priceNegotiable){
  params.set("priceNegotiable","true");
}

if(filters.batteryWarranty){
  params.set("batteryWarranty","true");
}

if(filters.ownershipVerified){
  params.set("ownershipVerified","true");
}

if(filters.accidentFree){
  params.set("accidentFree","true");
}

if(filters.fullServiceHistory){
  params.set("fullServiceHistory","true");
}

if(filters.roadworthyCertified){
  params.set("roadworthyCertified","true");
}

if(filters.warrantyIncluded){
  params.set("warrantyIncluded","true");
}

if(filters.servicePlanIncluded){
  params.set("servicePlanIncluded","true");
}

if(filters.maintenancePlanIncluded){
  params.set("maintenancePlanIncluded","true");
}

if(filters.warrantyActive){
  params.set("warrantyActive","true");
}

if(filters.servicePlanActive){
  params.set("servicePlanActive","true");
}

if(filters.maintenancePlanActive){
  params.set("maintenancePlanActive","true");
}


    const newUrl = route("/browse?" + params.toString());

history.replaceState({}, "", newUrl);

// ðŸ”¥ SAVE STATE
savePageState("browse", {
  filters,
  priceMin,
  priceMax,
  page: currentPage,
  url: newUrl
});

    renderActiveFilterChips();

    // ðŸ”¥ CRITICAL: isolate load
await load();
toggleSections(); // 



    // ðŸ”¥ CRITICAL: protect counts
    try{
  // ðŸ”¥ REMOVE blocking counts from trigger
clearTimeout(filterCountDebounce);
filterCountDebounce = setTimeout(() => {
  updateFilterCounts();
}, 250);
    } catch(e){
      console.warn("Counts skipped:", e);
    }

  } catch(err){
    console.error("Trigger crashed:", err);
  }

  resolve(); // ðŸ”¥ GUARANTEED

}, 200);

  });
}

/* ========================== */
function updateSlider(){

  const minInput =
  document.getElementById("minRange");

  const maxInput =
  document.getElementById("maxRange");

  if(!minInput || !maxInput) return;

  let min =
  parseInt(minInput.value);

  let max =
  parseInt(maxInput.value);

  /* =========================================
  PREVENT HANDLE OVERLAP
  ========================================= */

  const gap = 10000;

  if(min > max - gap){

    min = max - gap;

    minInput.value = min;

  }

  if(max < min + gap){

    max = min + gap;

    maxInput.value = max;

  }

  /* =========================================
  SAVE VALUES
  ========================================= */

  priceMin = min;
  priceMax = max;

  /* =========================================
  LABELS
  ========================================= */

  const minLabel =
  document.getElementById("minLabel");

  const maxLabel =
  document.getElementById("maxLabel");

  const live =
  document.getElementById("priceLive");

  if(minLabel){

    minLabel.innerText =
    "R " + Number(min).toLocaleString();

  }

  if(maxLabel){

    maxLabel.innerText =
    "R " + Number(max).toLocaleString();

  }

  if(live){

    live.innerText =
    `R ${Number(min).toLocaleString()} - R ${Number(max).toLocaleString()}`;

  }

  /* =========================================
  UPDATE TRACK
  ========================================= */

  updateSliderTrack(min, max);

  /* =========================================
  ACTIVE GLOW EFFECT
  ========================================= */

  document.body.classList.add("slider-active");

  clearTimeout(window.__sliderGlow);

  window.__sliderGlow = setTimeout(()=>{

    document.body.classList.remove("slider-active");

  }, 350);

  /* =========================================
  LIVE COUNT (PHASE 3)
  The price sliders have one canonical event path: oninput="updateSlider".
  Previously the global input listener ALSO bound them, which double-fired
  the count/trigger pipelines. Now that the global listener is scoped to
  controls WITHOUT a dedicated binding, updateSlider refreshes the live
  count itself so the Search button stays accurate.
  ========================================= */

  updateResultsCount();

  /* =========================================
  FILTER TRIGGER
  ========================================= */

  clearTimeout(window.__sliderTimer);

  window.__sliderTimer = setTimeout(()=>{

    trigger();

  }, 180);

}
 function updateSliderTrack(min,max){

  const minRange =
  document.getElementById("minRange");

  const maxRange =
  document.getElementById("maxRange");

  const fill =
  document.getElementById("sliderFill");

  const live =
  document.getElementById("priceLive");

  const minLabel =
  document.getElementById("minLabel");

  const maxLabel =
  document.getElementById("maxLabel");

  if(
    !minRange ||
    !maxRange ||
    !fill
  ) return;

  const minValue = Number(min);
  const maxValue = Number(max);

  const percentMin =
    (minValue / 2000000) * 100;

  const percentMax =
    (maxValue / 2000000) * 100;

  fill.style.left =
    `${percentMin}%`;

  fill.style.width =
    `${percentMax - percentMin}%`;

  minRange.value = minValue;
  maxRange.value = maxValue;

  if(minLabel){
    minLabel.textContent =
      `R ${minValue.toLocaleString()}`;
  }

  if(maxLabel){
    maxLabel.textContent =
      `R ${maxValue.toLocaleString()}`;
  }

  if(live){
    live.textContent =
      `R ${minValue.toLocaleString()} - R ${maxValue.toLocaleString()}`;
  }

  document
    .querySelectorAll("[data-budget]")
    .forEach(btn=>{

      const value =
      Number(btn.dataset.budget);

      btn.classList.remove(
        "border-[#E48A2F]",
        "ring-2",
        "ring-[#E48A2F]/20",
        "bg-[#E48A2F]/5"
      );

      if(value === maxValue){

        btn.classList.add(
          "border-[#E48A2F]",
          "ring-2",
          "ring-[#E48A2F]/20",
          "bg-[#E48A2F]/5"
        );

      }

    });

}

function calculatePriceFromFinance(){

  if(!filters.financeMode) return;

  const monthly = Number(filters.monthlyBudget || 0);
  const deposit = Number(filters.deposit || 0);
  const rate = Number(filters.interest || 0) / 100 / 12;
  const months = Number(filters.term || 72);

  if(!monthly || !rate || !months) return;

  const loanAmount =
    monthly *
    ((1 - Math.pow(1 + rate, -months)) / rate);

  const totalPrice = loanAmount + deposit;

  filters.priceMax = Math.floor(totalPrice);
  priceMax = filters.priceMax;
}

/* ========================== */

function reset(){

  // ðŸ”¥ RESET CORE FILTER STATE
filters = {
  q: "",
  make: "",
  model: "",

  priceMin: 0,
  priceMax: 2000000,

  yearFrom: "",
  yearTo: "",
  mileage: "",

  fuel: "",
  trans: "",
  drive: "",
  body: "",
  variant: "",
  vehicleType: "",
  motorcycleType: "",
  colours: "", // âœ… FIXED

  seller: "",
  condition: "",

  province: "",
  city: "",

  special: false,
  featured: false,

/* PHASE 2: reset restores the FULL filter shape (matching the initial
   state) so motorcycleType, batteryRange, engineCapacity, doors,
   commercial and finance flags all reset both internally and visually. */
seats: "",
doors: "",
features: [],

owners: "",
serviceHistory: false,

warrantyIncluded: false,
servicePlanIncluded: false,
maintenancePlanIncluded: false,

financeAvailable: false,
vatIncluded: false,
priceNegotiable: false,

evOnly: false,
fastCharge: false,
batteryWarranty: false,

batteryCapacity: "",
batteryRange: "",
chargingTime: "",
engineCapacity: "",
cabConfiguration: "",

ownershipVerified: false,
accidentFree: false,
fullServiceHistory: false,
roadworthyCertified: false,
certifiedPreOwned: false,

verifiedDealer: false,
franchiseDealer: false,
independentDealer: false,
premiumDealer: false,

commercialVehicle: false,
commercialCategory: "",
payloadMin: "",
towingMin: "",

warrantyActive: false,
servicePlanActive: false,
maintenancePlanActive: false,

  financeMode: false,
  monthlyBudget: 0,
  deposit: 0,
  term: 72,
interest: 10.25,
sort: "latest"
};
  // ðŸ”¥ RESET UI
  document.querySelectorAll("input,select").forEach(el=>{
    if(el.type==="checkbox") el.checked=false;
    else el.value="";
  });

  // ðŸ”¥ RESET SLIDER
  priceMin = 0;
  priceMax = 2000000;

  document.getElementById("minRange").value = 0;
  document.getElementById("maxRange").value = 2000000;

const minLabel =
document.getElementById("minLabel");

const maxLabel =
document.getElementById("maxLabel");

const live =
document.getElementById("priceLive");

if(minLabel){

  minLabel.innerText =
  "R " + priceMin.toLocaleString();

}

if(maxLabel){

  maxLabel.innerText =
  "R " + priceMax.toLocaleString();

}

if(live){

  live.innerText =
  `R ${priceMin.toLocaleString()} - R ${priceMax.toLocaleString()}`;

}

updateSliderTrack(priceMin, priceMax);

updateBodyTiles();
updateSellerTiles();
updateListingTiles();

/* City returns to the disabled "Select Province First"
   placeholder whenever all filters are cleared. */
populateCities("");

  /* PHASE 2: visual reset — the sort dropdown and owner/history/
     condition tiles return to their default state to match filters.sort
     and the cleared filter state. */
  const resetSortEl =
  document.getElementById("headerSort");

  if(resetSortEl){
    resetSortEl.value = filters.sort;
  }

updateOwnerTiles();
updateHistoryTiles();
updateConditionButtons();
}

/* ========================== */

async function fillMakes(){

  const make =
  document.getElementById("make");

  if(!make) return;

  make.innerHTML = `
    <option value="">
      All Makes
    </option>
  `;

  const makes =
  await memoGetMakes();

  makes.forEach(name=>{

    const option =
    document.createElement("option");

    option.value = name;
    option.textContent = name;

    make.appendChild(option);

  });

}

async function populateCities(province){

  const city =
  document.getElementById("city");

  if(!city) return;

  if(!province){

    city.innerHTML = `
      <option value="">
        Select Province First
      </option>
    `;

    city.disabled = true;
    return;

  }

  /* DB-backed catalogue (js/catalog.js) — same source of truth
     as upload & manage. Async so the list loads without
     blocking the rest of Browse. */
  city.disabled = false;

  city.innerHTML = `
    <option value="">
      All Cities
    </option>
  `;

  let list = [];

  try{

    list =
    await memoGetCities(province);

  }catch(error){

    console.error(
      "City load failed:",
      error
    );

    list = [];

  }

  (list || [])
  .forEach(name => {

    if(!name) return;

    city.innerHTML += `
      <option value="${name}">
        ${name}
      </option>
    `;

  });

}

async function fillProvinces(){

  const province =
  document.getElementById("province");

  if(!province) return;

  /* Keep the existing options as a graceful fallback
     when the catalogue is unavailable or empty. */
  let provinces = [];

  try{

    provinces =
    await memoGetProvinces();

  }catch(error){

    console.error(
      "Province load failed:",
      error
    );

    provinces = [];

  }

  if(
    !provinces ||
    !provinces.length
  ){
    return;
  }

  const current =
  province.value;

  province.innerHTML =
  `<option value="">
    All Provinces
  </option>`;

  provinces.forEach(name => {

    const option =
    document.createElement("option");

    option.value = name;
    option.textContent = name;

    province.appendChild(option);

  });

  if(current) province.value = current;

}

async function fillModels(){

  const make = val("make");
  const model = document.getElementById("model");

  if(!model) return;

  model.innerHTML =
  `<option value="">All Models</option>`;

  if(!make) return;

  const models =
  await memoGetModels(make);

  models.forEach(x=>{

    const o =
    document.createElement("option");

    o.value = x;
    o.textContent = x;

    model.appendChild(o);

  });

}

async function fillVariants(){

  const variant =
  document.getElementById("variant");

  if(!variant) return;

  variant.innerHTML =
  '<option value="">All Variants</option>';

  const make =
  document.getElementById("make")?.value;

  const model =
  document.getElementById("model")?.value;

  if(!make || !model){
    return;
  }

  const variants =
  await memoGetVariants(make, model);

  variants.forEach(v => {

    const option =
    document.createElement("option");

    option.value = v;
    option.textContent = v;

    variant.appendChild(option);

  });

}

async function fillVehicleTypes(){

  const vehicleType =
  document.getElementById("vehicleType");

  if(!vehicleType) return;

  vehicleType.innerHTML =
  '<option value="">All Vehicle Types</option>';

[
  "Passenger Vehicle",
  "Commercial Vehicle",
  "Motorcycle",
  "Quad Bike",
  "ATV",
  "Side-by-Side",
  "Caravan",
  "Trailer",
  "Boat"
].forEach(type => {

    const option =
    document.createElement("option");

    option.value = type;
    option.textContent = type;

    vehicleType.appendChild(option);

  });

  vehicleType.value =
  filters.vehicleType || "";

}

async function fillColours(){

  const colours =
  document.getElementById("colours");

  if(!colours) return;

  colours.innerHTML =
  `<option value="">
    Any Colour
  </option>`;

  const items =
  await memoGetColours();

  items.forEach(item=>{

    const option =
    document.createElement("option");

    option.value = item;
    option.textContent = item;

    colours.appendChild(option);

  });

  colours.value =
  filters.colours || "";

}

async function fillFeatures(){

  const container =
  document.getElementById("featuresOptions");

  if(!container) return;

  try{

    const items =
    await memoGetFeatures();

const featureCategories = {};

(items || []).forEach(item => {

  const feature =
    typeof item === "string"
      ? item
      : item?.value;

  if(!feature) return;

  const category =
    typeof item === "object"
      ? (item.parent || "Other")
      : "Other";

  if(!featureCategories[category]){

    featureCategories[category] = [];

  }

  featureCategories[category].push(feature);

});


Object.keys(featureCategories).forEach(category => {

  featureCategories[category].sort((a,b)=>
    a.localeCompare(b)
  );

});


container.innerHTML =
Object.keys(featureCategories)
.sort((a,b)=>
  a.localeCompare(b)
)
.map(category => `

<div
class="
feature-category
border
border-slate-200
rounded-2xl
overflow-hidden
mb-3
bg-white
shadow-sm
hover:shadow-md
hover:border-[#3B82F6]/30
transition-all
duration-300
min-w-0
"
>

<button
type="button"
class="
feature-category-header
w-full
flex
items-center
justify-between
gap-4
px-5
py-4
bg-white
border-b
border-slate-200
text-sm
font-semibold
text-slate-800
hover:bg-slate-50
transition-all
duration-200
"
data-category="${category}"
>

<div
class="
flex
items-center
justify-between
w-full
gap-2
"
>

<span
class="
flex-1
text-left
leading-5
"
>
${category}
</span>

<svg
class="
feature-chevron
w-4
h-4
flex-shrink-0
transition-transform
duration-200
"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
stroke-width="2"
d="M19 9l-7 7-7-7"
/>
</svg>

</div>

<path
stroke-linecap="round"
stroke-linejoin="round"
stroke-width="2"
d="M19 9l-7 7-7-7"
/>

</svg>

</button>


<div
class="
feature-category-content
hidden
p-4
space-y-3
bg-white
"
data-category-content="${category}"
>

${
featureCategories[category]
.map(feature => `

<label
class="
flex
items-center
justify-between
h-11
rounded-xl
border
border-slate-200
bg-white
cursor-pointer
text-xs
font-medium
px-3
"
data-label="${feature}"
>

<input
type="checkbox"
value="${feature}"
data-filter="features"
class="hidden"
/>

<span
class="feature-label"
>
${feature}
</span>

<span
class="
feature-count
hidden
"
data-count="${feature}"
></span>

</label>

`).join("")
}

</div>

</div>

`)
.join("");

document
  .querySelectorAll(
    '[data-filter="features"]'
  )
  .forEach(cb=>{

    cb.checked =
      filters.features.includes(
        cb.value
      );

    cb.parentElement.classList.toggle(
      "border-[#E48A2F]",
      cb.checked
    );

    cb.parentElement.classList.toggle(
      "bg-[#E48A2F]/10",
      cb.checked
    );

  });

  }catch(error){

    console.error(
      "Feature catalogue load failed:",
      error
    );

    container.innerHTML = "";

  }

}


/* ========================== */
/* FEATURE CATEGORY TOGGLE */
/* ========================== */

function initFeatureCategoryToggle(){

  document
  .querySelectorAll(".feature-category-header")
  .forEach(header=>{

    header.onclick = ()=>{

      const content =
      header.nextElementSibling;

      const chevron =
      header.querySelector(
        ".feature-chevron"
      );

      if(!content){
        return;
      }

      content.classList.toggle(
        "hidden"
      );

      if(chevron){

        chevron.classList.toggle(
          "rotate-180"
        );

      }

    };

  });

}

/* ========================== */
/* FEATURE SEARCH */
/* ========================== */

function updateFeatureCategoryCounts(){

  /* Category count badges removed */

}

function initFeatureSearch(){

  const search =
  document.getElementById(
    "featureSearch"
  );

  const container =
  document.getElementById(
    "featuresOptions"
  );

  if(!search || !container){
    return;
  }

search.addEventListener(
  "input",
  ()=>{

    const term =
      search.value
      .toLowerCase()
      .trim();

    const categories =
      container.querySelectorAll(
        ".feature-category"
      );

    categories.forEach(category=>{

      const labels =
        category.querySelectorAll(
          "label"
        );

      let visible = 0;

labels.forEach(label=>{

  const text =
    (label.dataset.label || "")
      .toLowerCase();

const match =
  !term ||
  text.includes(term);

label.style.display =
  match
    ? ""
    : "none";

const labelText =
  label.querySelector(".feature-label");

if(labelText){

  if(term && match){

    const escaped =
      term.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

    labelText.innerHTML =
      label.dataset.label.replace(
        new RegExp(`(${escaped})`, "ig"),
        "<mark>$1</mark>"
      );

  }else{

    labelText.textContent =
      label.dataset.label;

  }

}

if(match){
  visible++;
}

});

/* Category count badges removed */

      const content =
        category.querySelector(
          ".feature-category-content"
        );

      const chevron =
        category.querySelector(
          ".feature-chevron"
        );

      if(!content){
        return;
      }

      if(!term){

        category.style.display = "";

        content.classList.add(
          "hidden"
        );

        chevron?.classList.remove(
          "rotate-180"
        );

        return;

      }

      if(visible){

        category.style.display = "";

        content.classList.remove(
          "hidden"
        );

        chevron?.classList.add(
          "rotate-180"
        );

      }else{

        category.style.display =
          "none";

      }

    });

  }
);

}

/* ========================== */
/* ðŸ”¥ LOAD (UNCHANGED) */
/* ========================== */

function toggleSections(){

  const params = new URLSearchParams(window.location.search);
  const isFiltered = params.toString().length > 0;

  const featured = document.getElementById("featuredSection");
  const newSec = document.getElementById("newSection");
  const preOwned = document.getElementById("preOwnedSection");

  if(!featured || !newSec || !preOwned) return;

  if(isFiltered){
    featured.style.display = "none";
    newSec.style.display = "none";
    preOwned.style.display = "none";
  } else {
    featured.style.display = "block";
    newSec.style.display = "block";
    preOwned.style.display = "block";
  }
}

async function load(){

  const requestToken = ++currentRequestToken;

  activeRequest++;

  /* =========================================
  ðŸ”¥ LOADING STATE (PHASE 1)
  Show skeleton cards + loading message
  until vehicles are ready to render.
  ========================================= */
  isLoadingVehicles = true;

  /* Loading text removed â€” skeleton cards communicate loading */

  const loadingBox =
    document.getElementById("results");

  if(loadingBox){

    /* =========================================
    ðŸ”¥ SHARED PRODUCTION GRID (SAME AS render())
    The skeleton cards fill the same responsive
    grid as the production vehicle cards.
    ========================================= */
    loadingBox.className = `
grid
grid-cols-1
md:grid-cols-2
xl:grid-cols-4
2xl:grid-cols-5
3xl:grid-cols-6
gap-2
relative
z-10
items-stretch
w-full
`;

    loadingBox.innerHTML = renderSkeletonCards();

  }

if(
  window.__allowUrlSync !== false &&
  !window.__skipUrlRestore
){

  /*
  URL restoration must only happen
  during initial page hydration.

  Never restore URL state during
  normal filter interactions.
  */

  if(window.__initialUrlRestore){

    console.log(
      "Initial URL restore"
    );

    window.__initialUrlRestore = true;

    await applyURLParams();

    window.__initialUrlRestore = false;

  }

}

renderActiveFilterChips();

toggleSections();

const box = document.getElementById("results");

if(!box){

  activeRequest = Math.max(
    0,
    activeRequest - 1
  );

  console.error(
    "Results container not found"
  );

  return;
}

if(!box.children.length){
  render(null);
}

/* PHASE 5 — stale-while-revalidate fast path.
   Cache hit for the exact filters/sort/page signature:
   show cached public vehicles immediately, then refresh
   in the background. Cache the raw vehicle array (not HTML)
   so render() still applies current affordabilityProfile /
   savedIds. */
const cachedBrowse = phase5RenderCachedBrowse();
if(cachedBrowse){
  isLoadingVehicles = false;
  render(cachedBrowse.vehicles);
  totalCount = cachedBrowse.filteredTotal;
  const meta = document.getElementById("resultMeta");
  if(meta){
    const t = typeof cachedBrowse.filteredTotal === "number" && cachedBrowse.filteredTotal > 0
      ? cachedBrowse.filteredTotal
      : (cachedBrowse ? cachedBrowse.length : 0);
    meta.innerText = `${t.toLocaleString()} Vehicles Found`;
  }
  const pagesEl = document.getElementById("pages");
  if(pagesEl){
    const totalPages = Math.max(1, Math.ceil(cachedBrowse.filteredTotal / limit));
    pagesEl.innerHTML = pager(currentPage, totalPages, (p)=>{
      currentPage = p;
      load();
    });
  }
  (async ()=>{
    try{
      const bgToken = ++currentRequestToken;
      const bgInputs = Promise.allSettled([getUserProfile(), getPopularityMap()]);
      applySearchIntentToFilters();
      let q = supabase.from("vehicles").select("*")
        .range((currentPage - 1) * limit, currentPage * limit - 1);
      q = buildVehicleQuery(q, filters);
      const oc = getSupabaseOrder(filters.sort);
      /* FEATURED-FIRST MAKE RANKING (Supabase layer, background refresh) */
      if(isMakeOnlySearch()){
        q = q.order("is_featured", { ascending: false });
      }
      if(oc) q = q.order(oc.column, { ascending: oc.ascending });
      else q = q.order("created_at", { ascending: false });
      const cq = buildVehicleQuery(
        supabase.from("vehicles").select("*", { count: "exact", head: true }), filters);
      const [{ data: bgData, error: bgErr }, bgCR] = await Promise.all([
        q,
        cq.then(r=>({count:r.count,error:r.error})).catch(e=>({count:null,error:e}))
      ]);
      if(bgToken !== currentRequestToken) return;
      if(browseCacheKey() !== cachedBrowse._key) return;
      const bgFT = (bgCR && typeof bgCR.count === "number" && bgCR.count >= 0)
        ? bgCR.count : (bgData ? bgData.length : 0);
      if(bgErr || !bgData || !bgData.length){
        if(typeof bgFT === "number"){
          totalCount = bgFT;
          const m2 = document.getElementById("resultMeta");
          if(m2) m2.innerText = `${bgFT.toLocaleString()} Vehicles Found`;
          const p2 = document.getElementById("pages");
          if(p2) p2.innerHTML = pager(currentPage, Math.max(1, Math.ceil(bgFT / limit)), (p)=>{
            currentPage = p; load();
          });
        }
        return;
      }
      let ranked = Array.isArray(bgData) ? [...bgData] : [];
      try{
        const [pr, pop] = await bgInputs;
        const sp = pr?.status === "fulfilled" ? pr.value : null;
        const sPOP = pop?.status === "fulfilled" ? pop.value : {};
        ranked = rankVehicles(ranked, {
          query: filters.q || "", filters, user: sp, popularity: sPOP
        });
        ranked.sort((a,b)=>{
          let aS=0, bS=0;
          if(a.is_sponsored) aS+=500; if(b.is_sponsored) bS+=500;
          if(a.premium_dealer) aS+=300; if(b.premium_dealer) bS+=300;
          if(a.homepage_boost) aS+=220; if(b.homepage_boost) bS+=220;
          aS += Number(sPOP[a.id]||0); bS += Number(sPOP[b.id]||0);
          const aD = new Date(a.created_at||0).getTime();
          const bD = new Date(b.created_at||0).getTime();
          aS += aD/100_000_000; bS += bD/100_000_000;
          return bS - aS;
        });
        ranked.sort((a,b)=>{
          const gp = v => {
            if(v.is_featured) return 1;
            const c = String(v.condition||"").toLowerCase();
            if(c==="new") return 2;
            if(c==="pre-owned"||c==="used") return 3;
            return 4;
          };
          return gp(a)-gp(b);
        });
        const cmp = getSortComparator(filters.sort);
        if(cmp){
          /* FEATURED-FIRST MAKE RANKING (client-side, background refresh) */
          if(isMakeOnlySearch()){
            ranked.sort((a, b) => {
              const aFeatured = a.is_featured ? 0 : 1;
              const bFeatured = b.is_featured ? 0 : 1;
              if(aFeatured !== bFeatured) return aFeatured - bFeatured;
              return cmp(a, b);
            });
          } else {
            ranked.sort(cmp);
          }
        }
      }catch(e){ console.warn("Background ranking failed:", e); }
      phase5UpdateBrowseFromFresh(ranked, bgFT);
    }catch(e){ console.warn("Background browse refresh failed:", e); }
  })();
}

/* PERFORMANCE: start personalization/ranking fetches NOW so they run
   in PARALLEL with the vehicle query instead of serially after it */
const rankingInputsPromise =
  Promise.allSettled([
    getUserProfile(),
    getPopularityMap()
  ]);

  /* ðŸ”¥ NL intent applied before the query so direct-URL searches
     like /browse?q=budget+cars flow through the same interpretation */
  applySearchIntentToFilters();

  let query = supabase
    .from("vehicles")
    .select("*")
    .range((currentPage - 1) * limit, currentPage * limit - 1);

  query = buildVehicleQuery(query, filters);

  /* =========================================
  ðŸ”¥ SORT — driven by the shared sort registry
  ========================================= */
  const orderClause = getSupabaseOrder(filters.sort);

  /* FEATURED-FIRST MAKE RANKING (Supabase layer) */
  if(isMakeOnlySearch()){
    query = query.order("is_featured", { ascending: false });
  }

  if(orderClause){
    query = query.order(
      orderClause.column,
      { ascending: orderClause.ascending }
    );
  }else{
    /* reduction-based sorts are computed client-side */
    query = query.order("created_at", { ascending: false });
  }

  /* =============================================
  PHASE 2: exact filtered total (server-side count).
  Reuses the existing exact-count architecture from
  updateResultsCount() and runs in PARALLEL with the
  page data query. The total drives pagination and
  result metadata only — page rendering stays limited
  to the intended page size.
  ============================================= */
  const countQuery = buildVehicleQuery(
    supabase
      .from("vehicles")
      .select("*", { count: "exact", head: true }),
    filters
  );

  /* P5-2: Request coalescing — reuse an in-flight request for the
     exact same Browse state (filters + sort + page + limit) so that
     duplicate simultaneous triggers issue only ONE Supabase call.
     The in-flight entry is always removed in finally so a later
     identical request can retry after a failure. */
  const p52Sig = browseCacheKey();
  let p52Req;
  if(PHASE5.inFlight.has(p52Sig)){
    p52Req = PHASE5.inFlight.get(p52Sig);
  } else {
    p52Req = (async () => {
      try{
        return await Promise.all([
          query,
          countQuery
            .then(r => ({ count: r.count, error: r.error }))
            .catch(e => ({ count: null, error: e }))
        ]);
      } finally {
        PHASE5.inFlight.delete(p52Sig);
      }
    })();
    PHASE5.inFlight.set(p52Sig, p52Req);
  }
  const [{ data, error }, countResult] = await p52Req;

  /* Null means the count query failed — the caller falls back so a
     transient count failure never blocks the search itself. */
  filteredTotal =
    (countResult && typeof countResult.count === "number" && countResult.count >= 0)
      ? countResult.count
      : null;

  if(requestToken !== currentRequestToken){

  activeRequest = Math.max(
    0,
    activeRequest - 1
  );

  return;
}

  if(error){

  activeRequest = Math.max(
    0,
    activeRequest - 1
  );

  isLoadingVehicles = false;

  console.error(
    "Error loading vehicles:",
    error
  );

  box.innerHTML =
  "<p>Error loading vehicles</p>";

  return;
}

  if(!data || !data.length){

    activeRequest = Math.max(
      0,
      activeRequest - 1
    );

    isLoadingVehicles = false;

    /* PHASE 2: an out-of-range page (deep-link / back-button) on a
       non-empty filtered set is clamped to the last valid page rather
       than being misreported as an empty result set. */
    if(
      typeof filteredTotal === "number" &&
      filteredTotal > 0
    ){

      const lastPage =
      Math.max(1, Math.ceil(filteredTotal / limit));

      if(currentPage < 1 || currentPage > lastPage){

        currentPage = lastPage;

        return load();

      }

    }

    if(typeof updateResultsCount === "function"){
      updateResultsCount(0);
    }

    totalCount = 0;

    const resultsCount =
      document.getElementById("resultsCount");

    if(resultsCount){
      resultsCount.textContent = "0 Vehicles Found";
    }

    const resultMeta =
      document.getElementById("resultMeta");

    if(resultMeta){
      resultMeta.textContent = "0 Vehicles Found";
    }

    box.innerHTML = `
      <div class="text-center py-10">
        <p class="text-lg font-semibold mb-2">No vehicles found</p>
        <button data-browse-clear class="btn btn-dark">
          Clear Filters
        </button>
      </div>
    `;

    /* PHASE 3: bind the empty-state Clear Filters button to the shared
       module clear-all pipeline instead of inline onclick="reset(); trigger();"
       (reset/trigger are NOT exposed on window in module scope, so the old
       inline handler threw a ReferenceError and did nothing). */
    box.querySelector("[data-browse-clear]")
      ?.addEventListener("click", async ()=>{
        await window.clearAllFilters();
      });

    return;
}

  /* Ensure saved-vehicle IDs / affordability profile are applied before
     the final render (they were started in parallel during init). */
  if(pendingUserDataPromise){
    try{
      await pendingUserDataPromise;
    }catch(e){}
    pendingUserDataPromise = null;
  }

  let ranked = Array.isArray(data)
  ? [...data]
  : [];

  try{

    const [
      profile,
      popularity
    ] = await rankingInputsPromise;

    const safeProfile =
      profile.status === "fulfilled"
      ? profile.value
      : null;

    const safePopularity =
      popularity.status === "fulfilled"
      ? popularity.value
      : {};

    /* =========================================
    ðŸ”¥ AI MARKETPLACE RANKING
    ========================================= */

    ranked = rankVehicles(
      ranked,
      {
        query: filters.q || "",
        filters,
        user: safeProfile,
        popularity: safePopularity
      }
    );

    /* =========================================
    ðŸ”¥ TRENDING BOOSTS
    ========================================= */

    ranked.sort((a,b)=>{

      let aScore = 0;
      let bScore = 0;

      /* ==========================
      SPONSORED PRIORITY
      ========================== */

      if(a.is_sponsored){
        aScore += 500;
      }

      if(b.is_sponsored){
        bScore += 500;
      }

      /* ==========================
      PREMIUM DEALER
      ========================== */

      if(a.premium_dealer){
        aScore += 300;
      }

      if(b.premium_dealer){
        bScore += 300;
      }

      /* ==========================
      HOMEPAGE BOOST
      ========================== */

      if(a.homepage_boost){
        aScore += 220;
      }

      if(b.homepage_boost){
        bScore += 220;
      }

      /* ==========================
      SEARCH BOOST
      ========================== */

      aScore += Number(a.search_boost || 0);
      bScore += Number(b.search_boost || 0);

      /* ==========================
      POPULARITY
      ========================== */

      aScore += Number(
        safePopularity[a.id] || 0
      );

      bScore += Number(
        safePopularity[b.id] || 0
      );

      /* ==========================
      RECENCY BOOST
      ========================== */

      const aDate =
        new Date(a.created_at || 0).getTime();

      const bDate =
        new Date(b.created_at || 0).getTime();

      aScore += aDate / 100000000;
      bScore += bDate / 100000000;

      return bScore - aScore;

    });

    /* =========================================
    INVENTORY PRIORITY ORDER (pre-sort tiebreaker)
    Featured â†’ New â†’ Pre-Owned
    Runs BEFORE the user-selected sort so it never
    overrides the user's chosen ordering.
    ========================================= */

    ranked.sort((a,b)=>{

      const getPriority = (vehicle)=>{

        if(vehicle.is_featured){
          return 1;
        }

        const condition =
          String(vehicle.condition || "")
          .toLowerCase();

        if(condition === "new"){
          return 2;
        }

        if(
          condition === "pre-owned" ||
          condition === "used"
        ){
          return 3;
        }

        return 4;

      };

      return getPriority(a) - getPriority(b);

    });

    /* =========================================
    ðŸ”¥ SORT — driven by the shared sort registry
    This is the FINAL sort, applied immediately
    before rendering.  It must always run last so
    the user's selected sort order is preserved.
    ========================================= */

    const comparator =
      getSortComparator(filters.sort);

    if(comparator){

      /* FEATURED-FIRST MAKE RANKING (client-side layer)
         For make-only searches, partition results into
         featured / non-featured, then apply the user's
         selected sort WITHIN each group.  Non-make-only
         searches use the existing comparator unchanged. */
      if(isMakeOnlySearch()){
        ranked.sort((a, b) => {
          const aFeatured = a.is_featured ? 0 : 1;
          const bFeatured = b.is_featured ? 0 : 1;
          if(aFeatured !== bFeatured) return aFeatured - bFeatured;
          return comparator(a, b);
        });
      } else {
        ranked.sort(comparator);
      }

    }

  }catch(e){

    console.warn(
      "Marketplace ranking failed:",
      e
    );

  }

  activeRequest = Math.max(
    0,
    activeRequest - 1
);

if(affordabilityProfile){

  recommendedVehicles =
  getRecommendedVehicles(
    ranked,
    affordabilityProfile
  );

}else{

  recommendedVehicles = [];

}

  phase5WriteBrowse(ranked, filteredTotal);
  window.__lastBrowseResults = ranked;

isLoadingVehicles = false;

render(ranked);

/* PHASE 2: pagination + result metadata use the exact server-side
   filtered total (never the current page length). */
if(typeof filteredTotal !== "number" || filteredTotal < 0){
  /* count query unavailable → fall back to the current page length */
  filteredTotal = ranked.length;
}

totalCount = filteredTotal;

const meta =
document.getElementById("resultMeta");

if(meta){

  meta.innerText =
  `${totalCount.toLocaleString()} Vehicles Found`;

}

const pagesEl =
document.getElementById("pages");

if(pagesEl){

  const totalPages =
  Math.max(1, Math.ceil(totalCount / limit));

  pagesEl.innerHTML = pager(
    currentPage,
    totalPages,
    (p)=>{
      currentPage = p;
      load();
    }
  );

}
}


async function updateFilterCounts(){

  if(!document.getElementById("results")) return;

  syncFiltersFromUI();

  function countMap(data, field){
  const map = {};
  data.forEach(v=>{
    const val = v[field];
    if(!val) return;
    map[val] = (map[val] || 0) + 1;
  });
  return map;
}

function countArrayField(data, field){
  const map = {};
  data.forEach(v=>{
    const arr = v[field];
    if(!Array.isArray(arr)) return;
    arr.forEach(val=>{
      map[val] = (map[val] || 0) + 1;
    });
  });
  return map;
}

  const baseFilters = structuredClone(filters);

  /* ========================== */
  /* ðŸ”¥ HELPER: BUILD WITHOUT KEY */
  /* ========================== */

  function buildWithout(key){

    const clone = structuredClone(baseFilters);

    if(Array.isArray(clone[key])){
      clone[key] = [];
    }
    else if(typeof clone[key] === "boolean"){
      clone[key] = false;
    }
    else if(typeof clone[key] === "number"){

      switch(key){

        case "priceMin":
          clone[key] = 0;
          break;

        case "priceMax":
          clone[key] = 2000000;
          break;

        default:
          clone[key] = 0;

      }

    }
    else{
      clone[key] = "";
    }

    return clone;

  }

  /* ========================== */

  function applyCounts(id, map){

  const select = document.getElementById(id);
  if(!select) return;

  Array.from(select.options).forEach(opt=>{

    if(!opt.value) return;

    if(!opt.dataset.label){
      opt.dataset.label = opt.textContent.replace(/\s*\(\d+\)\s*$/, "");
    }

    opt.textContent = opt.dataset.label;

  });
}

function buildWithout(key){

  const clone = structuredClone(baseFilters);

  if(Array.isArray(clone[key])){

    clone[key] = [];

  }else if(typeof clone[key] === "boolean"){

    clone[key] = false;

  }else if(typeof clone[key] === "number"){

    switch(key){

      case "priceMin":
        clone[key] = 0;
        break;

      case "priceMax":
        clone[key] = 2000000;
        break;

      default:
        clone[key] = 0;

    }

  }else{

    clone[key] = "";

  }

  let query = supabase
    .from("vehicles")
    .select(`
      fuel_type,
      body_type,
      transmission,
      drive_type,
      seller_type,
      condition,
      seats,
      features
    `);

  return buildVehicleQuery(query, clone);
}

function applyCheckboxCounts(type, map){

  document
  .querySelectorAll(`[data-filter="${type}"]`)
  .forEach(cb=>{

    const val = cb.value;
    const label = cb.parentElement;

    if(!label.dataset.label){
      label.dataset.label = val;
    }

    const hasCount =
      Object.prototype.hasOwnProperty.call(
        map,
        val
      );

    const count =
      hasCount
        ? map[val]
        : null;

    const unavailable =
      hasCount &&
      count === 0;

    label.style.opacity =
      unavailable ? "0.45" : "1";

    label.style.pointerEvents =
      unavailable ? "none" : "";

    if(unavailable){

      label.title =
        "No vehicles match this filter";

    }else{

      label.title = "";

    }

    const badge =
      label.querySelector(".feature-count");

    if(badge){

      if(hasCount){

        badge.textContent =
          `(${count})`;

      }else{

        badge.textContent = "";

      }

    }

  });

}
const queries = [
  buildWithout("fuel"),
  buildWithout("body"),
  buildWithout("trans"),
  buildWithout("drive"),
  buildWithout("seller"),
  buildWithout("condition"),
  buildWithout("seats"),
  buildWithout("features")
];

let results;

try {
results = await Promise.all(queries);
} catch (err) {
  console.error("Filter count error:", err);
  return; // ðŸ”¥ prevent crash
}

const [
  fuelRes,
  bodyRes,
  transRes,
  driveRes,
  sellerRes,
  conditionRes,
  seatsRes,
  featuresRes
] = results;

const fuelData = fuelRes?.data || [];

const bodyData = bodyRes?.data || [];
const transData = transRes?.data || [];
const driveData = driveRes?.data || [];
const sellerData = sellerRes?.data || [];
const conditionData = conditionRes?.data || [];
const seatsData = seatsRes?.data || [];
const featuresData = featuresRes?.data || [];

/* APPLY COUNTS */
const fuelCounts = {};

fuelData.forEach(v => {

  let label = String(v.fuel_type || "").trim();

  if(!label) return;

  const lower = label.toLowerCase();

  if(
    lower.includes("electric") ||
    lower.includes("ev") ||
    lower.includes("bev") ||
    lower.includes("battery electric")
  ){
    label = "Electric";
  }

  fuelCounts[label] = (fuelCounts[label] || 0) + 1;

});

const visibleVehicleCount = fuelData.length;

Object.keys(fuelCounts).forEach(key=>{
  fuelCounts[key] = Math.min(fuelCounts[key], visibleVehicleCount);
});

applyCounts("fuel", fuelCounts);
applyCounts("trans", countMap(transData, "transmission"));
applyCounts("drive", countMap(driveData, "drive_type"));
applyCounts("seller", countMap(sellerData, "seller_type"));
applyCounts("condition", countMap(conditionData, "condition"));

applyCheckboxCounts("seats", countMap(seatsData, "seats"));
applyCheckboxCounts("features", countArrayField(featuresData, "features"));

toggleOptions(
  "fuel",
  [...new Set(fuelData.map(v => String(v.fuel_type || "").trim()))]
);

toggleOptions(
  "trans",
  [...new Set(transData.map(v => String(v.transmission || "").trim()))]
);

toggleOptions(
  "drive",
  [...new Set(driveData.map(v => String(v.drive_type || "").trim()))]
);

updateBodyTileCounts(countMap(bodyData, "body_type"));
}

async function updateDynamicFilters(){
  return;
}
function toggleOptions(id, validSet){

  const select = document.getElementById(id);
  if(!select) return;

  Array.from(select.options).forEach(opt=>{

    if(!opt.value) return;

    const value = String(opt.value || "").trim().toLowerCase();

    let isValid = false;

    validSet.forEach(v=>{

      const dbValue = String(v || "").trim().toLowerCase();

      if(dbValue === value){
        isValid = true;
      }

      if(
        value === "electric" &&
        (
          dbValue.includes("electric") ||
          dbValue.includes("ev") ||
          dbValue.includes("bev") ||
          dbValue.includes("battery electric")
        )
      ){
        isValid = true;
      }

    });

    opt.disabled = !isValid;
    opt.hidden = false;
    opt.style.display = "";
    opt.style.opacity = isValid ? "1" : "0.45";

  });

}
/* ========================== */

/* ðŸ”¥ CLEAN FILTER GETTER */
/* ========================== */

function getFilters(){

  const clean = {};

  Object.keys(filters).forEach(key=>{
    const val = filters[key];

    // âŒ REMOVE EMPTY STRINGS
    if(val === "" || val === null || val === undefined){
      return;
    }

    // âŒ REMOVE EMPTY ARRAYS
    if(Array.isArray(val) && val.length === 0){
      return;
    }

    // âŒ REMOVE DEFAULT PRICE VALUES
    if(key === "priceMin" && val === 0) return;
    if(key === "priceMax" && val === 2000000) return;

    clean[key] = val;
  });

  return clean;
}

/* ========================== */

function buildResultMeta(count){

  const f = getFilters();

  let parts = [];

  /* ðŸ” SEARCH */
  if(f.q){
    parts.push(`"${f.q}"`);
  }

  /* ðŸš— MAKE + MODEL */
  if(f.make){
    parts.push(f.make);
  }

  if(f.model){
    parts.push(f.model);
  }

  /* ðŸš™ BODY */
  if(f.body){
    parts.push(f.body);
  }

  /* â›½ FUEL */
  if(f.fuel){
    parts.push(f.fuel);
  }

  /* âš™ TRANSMISSION */
  if(f.trans){
    parts.push(f.trans);
  }

  /* ðŸ’° PRICE */
  if(priceMax){
    parts.push(`under R${priceMax.toLocaleString()}`);
  }

  /* ðŸ§  FINAL STRING */
  if(parts.length === 0){
    return `Showing ${count} vehicles`;
  }

  return `Showing ${count} ${parts.join(" ")}`;
}

/* =========================================
ðŸ”¥ PREMIUM SKELETON CARDS (PHASE 2)
Mirrors the production vehicle card layout
exactly â€” same dimensions, spacing, and
structure â€” with shimmer placeholders.
========================================= */

function getSkeletonCount(){

  const w = window.innerWidth;

  if(w >= 1536) return 10;  // 2xl: 5 cols â†’ 10
  if(w >= 1280) return 8;   // xl: 4 cols â†’ 8
  if(w >= 768) return 4;    // md: 2 cols â†’ 4
  return 2;                  // 1 col â†’ 2

}

function renderSkeletonCards(count = getSkeletonCount()){

  const skeletonCard = () => `
<div class="
vehicle-card
bg-white
rounded-xl
overflow-hidden
border
border-slate-200
shadow-sm
h-full
flex
flex-col
">

  <!-- IMAGE PLACEHOLDER (premium light sweep) -->
  <div class="
  relative
  overflow-hidden
  h-[130px]
  skeleton-image
  ">
  </div>

  <!-- BODY -->
  <div class="vehicle-card-body px-1 py-0.5 flex flex-col flex-1">

    <!-- TITLE (min-h matches production 2-line title) -->
    <div class="min-h-[32px] flex items-start w-full">
      <div class="skeleton-shimmer h-3.5 w-3/4 rounded-md"></div>
    </div>

    <!-- PRICE -->
    <div class="mt-1 flex flex-col gap-0.5">
      <div class="skeleton-shimmer h-4 w-1/3 rounded-md"></div>
    </div>

    <!-- META ROW 1 (Year â€¢ Mileage) -->
    <div class="vehicle-meta mt-1.5">
      <div class="skeleton-shimmer h-3 w-8 rounded"></div>
      <span class="vehicle-dot"></span>
      <div class="skeleton-shimmer h-3 w-14 rounded"></div>
    </div>

    <!-- META ROW 2 (Body â€¢ Fuel) -->
    <div class="vehicle-meta mt-1.5">
      <div class="skeleton-shimmer h-3 w-12 rounded"></div>
      <span class="vehicle-dot"></span>
      <div class="skeleton-shimmer h-3 w-10 rounded"></div>
    </div>

    <!-- SPEC GRID (icon + label + value) -->
    <div class="grid grid-cols-3 gap-1 mt-1.5">
      <div class="bg-slate-50 border border-slate-100 rounded-lg p-1 text-center">
        <div class="skeleton-shimmer h-4 w-4 mx-auto rounded mb-1"></div>
        <div class="skeleton-shimmer h-2 w-8 mx-auto rounded mb-0.5"></div>
        <div class="skeleton-shimmer h-2.5 w-10 mx-auto rounded"></div>
      </div>
      <div class="bg-slate-50 border border-slate-100 rounded-lg p-1 text-center">
        <div class="skeleton-shimmer h-4 w-4 mx-auto rounded mb-1"></div>
        <div class="skeleton-shimmer h-2 w-8 mx-auto rounded mb-0.5"></div>
        <div class="skeleton-shimmer h-2.5 w-10 mx-auto rounded"></div>
      </div>
      <div class="bg-slate-50 border border-slate-100 rounded-lg p-1 text-center">
        <div class="skeleton-shimmer h-4 w-4 mx-auto rounded mb-1"></div>
        <div class="skeleton-shimmer h-2 w-8 mx-auto rounded mb-0.5"></div>
        <div class="skeleton-shimmer h-2.5 w-10 mx-auto rounded"></div>
      </div>
    </div>

    <!-- DEALER BADGE -->
    <div class="mt-2">
      <div class="skeleton-shimmer h-6 w-28 rounded-full"></div>
    </div>

    <!-- FOOTER (location + action pills) -->
    <div class="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between">
      <div class="skeleton-shimmer h-3 w-16 rounded"></div>
      <div class="flex items-center gap-2">
        <div class="skeleton-shimmer w-8 h-8 rounded-full border border-slate-200"></div>
        <div class="skeleton-shimmer w-8 h-8 rounded-full border border-slate-200"></div>
      </div>
    </div>

  </div>

</div>
`;

  return Array(count).fill(0).map(()=>skeletonCard()).join("");
}

function render(list){

const box =
document.getElementById("results");

if(!box){
  console.warn("results container missing");
  return;
}

/* =========================================
SAFE EMPTY STATE
========================================= */

if(!Array.isArray(list) && list !== null){
  list = [];
}
  const meta = document.getElementById("resultMeta");

  if(!list){

  box.className = `
grid
grid-cols-1
md:grid-cols-2
xl:grid-cols-4
2xl:grid-cols-5
3xl:grid-cols-6
gap-2
relative
z-10
items-stretch
w-full
`;

  box.innerHTML = renderSkeletonCards();
  return;
}

  box.style.opacity = "0";

/* =========================================
SAFE RENDER RESET
========================================= */

requestAnimationFrame(() => {

  requestAnimationFrame(() => {

    box.style.opacity = "1";

  });

});

box.replaceChildren();

const recContainer =
document.getElementById(
  "recommendedContainer"
);

if(recContainer){

  recContainer.innerHTML =
  renderRecommendedSection();

}

if(viewMode === "list"){

  box.className = "space-y-4";

}else{

  box.className = `
grid
grid-cols-1
md:grid-cols-2
xl:grid-cols-4
2xl:grid-cols-5
3xl:grid-cols-6
gap-2
relative
z-10
items-stretch
w-full
`;

}

  /* ==========================
  ðŸ”¥ RESULT META
  ========================== */

if(meta){

  if(list.length === 1 && list[0]._confidence === "exact"){

    meta.innerText = "1 result â€” exact match";

  }else{

    /* PHASE 2: show the exact filtered total when known (fall back to
       the current page length only if no count has been fetched yet). */
    const shownTotal =
    typeof filteredTotal === "number" && filteredTotal > 0
      ? filteredTotal
      : (list ? list.length : 0);

    meta.innerText =
`${shownTotal.toLocaleString()} Vehicle${shownTotal === 1 ? "" : "s"} Found`;

  }

}

  if(!list?.length){
    box.innerHTML = `
<div class="col-span-full text-center py-10">

  <h3 class="text-xl font-semibold text-white mb-2">
    No vehicles found
  </h3>

  <p class="text-white/60 mb-4">
    Try adjusting your filters or search criteria
  </p>

  <button
    data-browse-clear
    class="btn btn-gold">
    Clear Filters
  </button>

</div>
`;

    /* PHASE 3: bind the empty-state Clear Filters button to the shared
       module clear-all pipeline instead of inline onclick="reset(); trigger();"
       (reset/trigger are NOT exposed on window in module scope, so the old
       inline handler threw a ReferenceError and did nothing). */
    box.querySelector("[data-browse-clear]")
      ?.addEventListener("click", async ()=>{
        await window.clearAllFilters();
      });
    return;
  }

function renderCard(v, index){

    const eligible =
checkEligibility(
  affordabilityProfile,
  v.price
);

    const saved = savedIds.includes(v.id);

    const highlight = (text)=>{
      const q = (val("q") || "").toLowerCase();
      if(!q) return text;

      return text.replace(
        new RegExp(`(${q})`, "ig"),
        `<span class="text-gold font-semibold">$1</span>`
      );
    };

    const match = getAffordabilityMatch(
      affordabilityProfile,
      v.price
    );

    const eligibilityBadge =

    eligible

    ? `
<div class="flex flex-wrap gap-2">

<div
class="
inline-flex
items-center
gap-2
px-3
py-1
rounded-full
bg-green-100
text-green-700
text-xs
font-semibold
"
>
âœ“ Within Budget
</div>

${
match !== null
? `
<div
class="
inline-flex
items-center
gap-2
px-3
py-1
rounded-full
bg-[#3B82F6]/15
text-[#3B82F6]
text-xs
font-semibold
"
>
${match}% Match
</div>
`
: ""
}

</div>
`

: "";

    if(viewMode === "list"){

      return renderVehicleCard(v, {
        layout: "list",
        actions: "browse",
        saved,
        highlight,
        extraBadge: eligibilityBadge
      });

    }

    return renderVehicleCard(v, {
      layout: "grid",
      actions: "browse",
      saved,
      highlight,
      extraBadge: eligibilityBadge
    });

}

/* =========================================
RENDER ALL VEHICLES
========================================= */

box.innerHTML = list
  .map((vehicle, index) => renderCard(vehicle, index))
  .join("");

}

/* ========================== */

function val(id){
  return document.getElementById(id)?.value || "";
}

window.toggleSave = async function(id){

try{

const {
data:userData
} = await supabase.auth.getUser();

await supabase
.from("vehicle_analytics")
.upsert({
vehicle_id:id,
saves:1
},{
onConflict:"vehicle_id"
});

}catch(e){
console.warn("Save analytics failed", e);
}

return toggleSave(id);

};
window.viewVehicle = async function(id){

try{

const {
data:userData
} = await supabase.auth.getUser();

await supabase
.from("vehicle_analytics")
.upsert({
vehicle_id:id,
views:1
},{
onConflict:"vehicle_id"
});

}catch(e){
console.warn("View tracking failed", e);
}

navigate("/vehicle?id=" + id);

};
/* =========================================
COMPARE SYSTEM
========================================= */

window.toggleCompare = function(id){

  try{

    toggleCompare(id);

  }catch(err){

    console.error(
      "Compare toggle failed:",
      err
    );

  }

};

window.getCompare = function(){

  try{

    return getCompare();

  }catch(err){

    console.error(
      "Get compare failed:",
      err
    );

    return [];

  }

};

window.addEventListener(
  "compareUpdated",
  ()=>{
    load();
  }
);

/* =========================================
BROWSE BY BUDGET
========================================= */

window.selectBudget = function(max, event){

  document
  .querySelectorAll(".browse-budget-card")
  .forEach(card=>{

    card.classList.remove(
      "border-[#E48A2F]",
      "ring-2",
      "ring-[#E48A2F]/20"
    );

  });

const activeCard =
event?.currentTarget;

if(activeCard){

  activeCard.classList.add(
    "border-[#E48A2F]",
    "ring-2",
    "ring-[#E48A2F]/20",
    "bg-[#E48A2F]/5"
  );

}

  priceMin = 0;
  priceMax = max;

  filters.priceMin = 0;
  filters.priceMax = max;

  const minRange =
  document.getElementById("minRange");

  const maxRange =
  document.getElementById("maxRange");

  if(minRange){

    minRange.value = 0;

  }

  if(maxRange){

    maxRange.value = max;

  }

  updateSliderTrack(0, max);

  const minLabel =
  document.getElementById("minLabel");

  const maxLabel =
  document.getElementById("maxLabel");

  const live =
  document.getElementById("priceLive");

  if(minLabel){

    minLabel.innerText =
    "R 0";

  }

  if(maxLabel){

    maxLabel.innerText =
    "R " + Number(max).toLocaleString();

  }

  if(live){

    live.innerText =
    `R 0 - R ${Number(max).toLocaleString()}`;

  }

  trigger();

};

/* ==========================
ðŸ”¥ PREDICTIVE AUTOFILL ENGINE
========================== */

function getAllSearchTerms(){

  let terms = [];

  // MAKES
  terms.push(...MAKES);

  // MODELS
  Object.values(MODELS).forEach(arr=>{
    terms.push(...arr);
  });

  return terms;
}

function getPrediction(input){

  if(!input) return "";

  const terms = getAllSearchTerms();

  const match = terms.find(t =>
    t.toLowerCase().startsWith(input.toLowerCase())
  );

  return match || "";
}

function updateGhost(){

  const input = document.getElementById("q");
  const ghost = document.getElementById("ghost");

  if(!input || !ghost) return;

  const value = input.value;

  const prediction = getPrediction(value);

  if(!value || !prediction){
    ghost.innerText = "";
    return;
  }

  if(prediction.toLowerCase() === value.toLowerCase()){
    ghost.innerText = "";
    return;
  }

  // show ghost continuation
  ghost.innerText = value + prediction.slice(value.length);
}

/* ==========================
ðŸ”¥ KEYBOARD SUPPORT
========================== */


/* ==========================
ðŸ”¥ DROPDOWN SUGGESTIONS
========================== */

async function getSuggestions(input){

  if(!input) return [];

  const q = input.toLowerCase().trim();

  /* ==========================
  ðŸ”¥ CACHE FIRST (INSTANT UX)
  ========================== */

  if(suggestionCache[q]){
    return suggestionCache[q];
  }

  /* ==========================
  ðŸ”¥ CATALOG-BACKED SUGGESTIONS
  Uses the authoritative catalog (js/catalog.js)
  so makes like BYD are recognised.
  ========================== */

  const results = [];
  const seen = new Set();

  /* ==========================
  ðŸ”¥ SMART INTENT SUGGESTIONS (ADDITIVE)
  Local, instant suggestions from the shared intent layer.
  Prepended ahead of the catalog suggestions below - none of
  the existing catalog logic or results are removed.
  ========================== */

  try{
    const smartMakes = await memoGetMakes();
    getSmartSuggestions(input, { makes: smartMakes }).forEach(s => {
      results.push(s);
      seen.add("smart:" + String(s.label).toLowerCase());
    });
  }catch(e){ /* smart suggestions are best-effort only */ }

  try{

    /* ==========================
    MAKES (prefix first, then contains)
    ========================== */

    const makes = await memoGetMakes();

    makes.forEach(m => {
      const ml = m.toLowerCase();
      if(ml.startsWith(q) && !seen.has("make:" + m)){
        seen.add("make:" + m);
        results.push({ type: "make", value: m, label: m });
      }
    });

    makes.forEach(m => {
      const ml = m.toLowerCase();
      if(ml.includes(q) && !ml.startsWith(q) && !seen.has("make:" + m)){
        seen.add("make:" + m);
        results.push({ type: "make", value: m, label: m });
      }
    });

    /* ==========================
    MODELS (for matching makes)
    ========================== */

    for(const make of makes){
      const ml = make.toLowerCase();
      if(!ml.includes(q) && !q.includes(ml)) continue;

      const models = await memoGetModels(make);
      for(const model of models){
        const mdl = model.toLowerCase();
        if(mdl.startsWith(q) && !seen.has("model:" + model)){
          seen.add("model:" + model);
          results.push({ type: "model", value: model, label: model, make });
        }
      }
    }

    for(const make of makes){
      const ml = make.toLowerCase();
      if(!ml.includes(q) && !q.includes(ml)) continue;

      const models = await memoGetModels(make);
      for(const model of models){
        const mdl = model.toLowerCase();
        if(mdl.includes(q) && !mdl.startsWith(q) && !seen.has("model:" + model)){
          seen.add("model:" + model);
          results.push({ type: "model", value: model, label: model, make });
        }
      }
    }

    /* ==========================
    VARIANTS (for matching make+model)
    ========================== */

    for(const make of makes){
      const ml = make.toLowerCase();
      if(!ml.includes(q) && !q.includes(ml)) continue;

      const models = await memoGetModels(make);
      for(const model of models){
        const mdl = model.toLowerCase();
        if(!mdl.includes(q) && !q.includes(mdl)) continue;

        const variants = await memoGetVariants(make, model);
        for(const variant of variants){
          const vl = variant.toLowerCase();
          if(vl.includes(q) && !seen.has("variant:" + variant)){
            seen.add("variant:" + variant);
            results.push({ type: "variant", value: variant, label: variant, make, model });
          }
        }
      }
    }

  }catch(e){
    console.warn("Catalog suggestions failed:", e);
  }

  /* ==========================
  ðŸ”¥ CACHE RESULT
  ========================== */

  /* Dedupe smart phrases against identical catalog labels,
     preserving order (smart first, then catalog values). */
  const finalResults = results.filter((r, idx, arr) =>
    r.type === "smart" ||
    !arr.some(x => x.type === "smart" &&
      String(x.label).toLowerCase() === String(r.label).toLowerCase())
  );

  suggestionCache[q] = finalResults.slice(0, 30);

  return suggestionCache[q];
}

function renderDropdown(list){

  const box = document.getElementById("searchDropdown");
  const input = document.getElementById("q");

  if(!box || !input) return;

  if(!list || !list.length){
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }

  box.innerHTML = list.map(v => {
    const cat = v.type === "make" ? "Make"
      : v.type === "model" ? "Model"
      : v.type === "variant" ? "Variant"
      : v.type === "smart" ? "Smart Search"
      : "Suggestion";

    const valueEsc = String(v.value).replace(/'/g, "\\'");
    const labelEsc = String(v.label).replace(/'/g, "\\'");
    const makeEsc = String(v.make || "").replace(/'/g, "\\'");
    const modelEsc = String(v.model || "").replace(/'/g, "\\'");

    return `
      <div data-suggestion="${v.type}"
        data-value="${attrEsc(v.value)}"
        data-label="${attrEsc(v.label)}"
        data-make="${attrEsc(v.make || "")}"
        data-model="${attrEsc(v.model || "")}"
        class="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-[14px] text-slate-900 font-medium hover:bg-[#eef3f9] transition-colors border-b border-slate-100 last:border-b-0"
      onclick="selectBrowseSuggestion('${v.type}', '${valueEsc}', '${labelEsc}', '${makeEsc}', '${modelEsc}')">

        <div class="flex-1 min-w-0">
          <div class="font-medium">${v.label}</div>
          <div class="text-[11px] text-slate-400 font-normal">${cat}</div>
        </div>

      </div>
    `;
  }).join("");

  /* ==========================
  ðŸ”¥ UX HINT
  ========================== */

  box.innerHTML += `
    <div class="text-xs text-slate-400 px-3 py-2 border-t border-slate-100 bg-white/10">
      Press Enter to search "${input.value}"
    </div>
  `;

  box.classList.remove("hidden");

  /* PHASE 4 ADDITIVE: reset keyboard highlight on every render */
  activeBrowseIndex = -1;
}

/* ==========================
ðŸ”¥ SELECT CATALOG SUGGESTION
Feeds the selection into Browse's existing
filter state and triggers the existing
search/result pipeline in place.
========================== */

window.selectBrowseSuggestion = function(type, value, label, make, model){

  const input = document.getElementById("q");
  if(!input) return;

  if(type === "make"){

    /* Set the Make filter */
    filters.make = value;
    filters.model = "";
    filters.variant = "";
    filters.q = "";

    const makeEl = document.getElementById("make");
    if(makeEl) makeEl.value = value;

    const modelEl = document.getElementById("model");
    if(modelEl){
      modelEl.innerHTML = '<option value="">All Models</option>';
    }

    const variantEl = document.getElementById("variant");
    if(variantEl){
      variantEl.innerHTML = '<option value="">All Variants</option>';
    }

    /* Load models for the selected make */
    fillModels().then(()=>{
      updateVehicleSummary();
    });

  } else if(type === "model"){

    if(make){
      filters.make = make;
      filters.model = value;
      filters.variant = "";
      filters.q = "";

      const makeEl = document.getElementById("make");
      if(makeEl) makeEl.value = make;

      const modelEl = document.getElementById("model");
      if(modelEl) modelEl.value = value;

      const variantEl = document.getElementById("variant");
      if(variantEl){
        variantEl.innerHTML = '<option value="">All Variants</option>';
      }

      fillModels().then(()=>{
        const modelEl2 = document.getElementById("model");
        if(modelEl2) modelEl2.value = value;
        fillVariants();
      });

    } else {

      filters.model = value;
      filters.q = "";

      const modelEl = document.getElementById("model");
      if(modelEl) modelEl.value = value;

    }

    updateVehicleSummary();

  } else if(type === "variant"){

    if(make){
      filters.make = make;
    }

    if(model){
      filters.model = model;
    }

    filters.variant = value;
    filters.q = "";

    const makeEl = document.getElementById("make");
    if(makeEl && make) makeEl.value = make;

    const modelEl = document.getElementById("model");
    if(modelEl && model) modelEl.value = model;

    const variantEl = document.getElementById("variant");
    if(variantEl) variantEl.value = value;

    updateVehicleSummary();

  } else {

    /* Simple suggestion — treat as search query */
    input.value = value;
    filters.q = value;

  }

  /* Keep the text in the input for plain-text/smart phrases so that
     trigger()'s syncFiltersFromUI() does not wipe filters.q before the
     shared search-intent layer can translate it into Browse filters. */
  if(type === "make" || type === "model" || type === "variant"){
    input.value = "";
  }

  const dropdown = document.getElementById("searchDropdown");
  if(dropdown){
    dropdown.classList.add("hidden");
    dropdown.innerHTML = "";
  }

  renderActiveFilterChips();

  /* Use existing Browse search/result pipeline */
  trigger();
};

/* ==========================
ðŸ”¥ SELECT ITEM
========================== */

window.selectSuggestion = function(value){

  const input = document.getElementById("q");

  input.value = value;

  updateGhost();

  document.getElementById("searchDropdown")
  .classList.add("hidden");

clearTimeout(window.__searchSelectTimer);

window.__searchSelectTimer = setTimeout(()=>{
  trigger();
}, 150);
};

window.selectVehicle = async function(id){

try{

await supabase
.from("vehicle_analytics")
.upsert({
vehicle_id:id,
clicks:1
},{
onConflict:"vehicle_id"
});

}catch(e){
console.warn("Suggestion click tracking failed", e);
}

document.getElementById("searchDropdown")
.classList.add("hidden");

navigate("/vehicle?id=" + id);

};

window.selectPopularMake = function(make){

  const makeEl =
  document.getElementById("make");

  if(!makeEl) return;

  makeEl.value = make;

  filters.make = make;

  fillModels();

  updateVehicleSummary();

  updatePopularMakes();

  trigger();

};

window.selectCondition = function(value){

  filters.condition = value;

  const conditionEl =
  document.getElementById("condition");

  if(conditionEl){
    conditionEl.value = value;
  }

  updateConditionButtons();

  updateVehicleSummary();

  trigger();

};

function updatePopularMakes(){

  document
  .querySelectorAll(".popular-make-btn")
  .forEach(btn=>{

    btn.classList.toggle(
      "border-[#E48A2F]",
      btn.dataset.make === filters.make
    );

    btn.classList.toggle(
      "bg-[#E48A2F]/10",
      btn.dataset.make === filters.make
    );

  });

}

function updateConditionButtons(){

  document
  .querySelectorAll(".condition-btn")
  .forEach(btn=>{

    btn.classList.toggle(
      "border-[#E48A2F]",
      btn.dataset.condition === filters.condition
    );

    btn.classList.toggle(
      "bg-[#E48A2F]/10",
      btn.dataset.condition === filters.condition
    );

  });

}

function updateVehicleSummary(){

  const box =
  document.getElementById(
    "vehicleSummary"
  );

  const text =
  document.getElementById(
    "vehicleSummaryText"
  );

  if(!box || !text) return;

  const parts = [];

  if(filters.make){
    parts.push(filters.make);
  }

  if(filters.model){
    parts.push(filters.model);
  }

  if(filters.condition){
    parts.push(filters.condition);
  }

  if(parts.length === 0){

    box.classList.add("hidden");

    return;

  }

  box.classList.remove("hidden");

  text.innerText =
  parts.join(" • ");

}

window.selectOwner = function(value){

  filters.owners =
    filters.owners === value
      ? ""
      : value;

  updateOwnerTiles();

  updateResultsCount();

  clearTimeout(window.__ownerTimer);

  window.__ownerTimer = setTimeout(()=>{
    trigger();
  },150);

};

function updateOwnerTiles(){

  document
    .querySelectorAll(".owner-tile")
    .forEach(tile=>{

      tile.classList.toggle(
        "active",
        tile.dataset.value === filters.owners
      );

    });

}

window.selectServiceHistory = function(value){

  if(value === ""){
    filters.serviceHistory = false;
  }
  else if(value === "yes"){
    filters.serviceHistory = true;
  }
  else{
    filters.serviceHistory = "__NO__";
  }

  updateHistoryTiles();

  updateResultsCount();

  clearTimeout(window.__historyTimer);

  window.__historyTimer = setTimeout(()=>{
    trigger();
  },150);

};

function updateHistoryTiles(){

  document
    .querySelectorAll(".history-tile")
    .forEach(tile=>{

      const value = tile.dataset.value;

      let active = false;

      if(value === "" && filters.serviceHistory === false){
        active = true;
      }

      if(value === "yes" && filters.serviceHistory === true){
        active = true;
      }

      if(value === "no" && filters.serviceHistory === "__NO__"){
        active = true;
      }

      tile.classList.toggle("active", active);

    });

}

window.selectBody = function(type){

  if(filters.body === type){
    filters.body = "";
  } else {
    filters.body = type;
  }

  updateBodyTiles();

  updateResultsCount();

  clearTimeout(window.__bodyTimer);

  window.__bodyTimer = setTimeout(()=>{
    trigger();
  }, 150);

};

window.selectSeller = function(type){

  filters.seller =
    filters.seller === type
    ? ""
    : type;

  updateSellerTiles();

  updateResultsCount();

  clearTimeout(window.__sellerTimer);

  window.__sellerTimer = setTimeout(()=>{
    trigger();
  },150);

};

function updateSellerTiles(){

  document
    .querySelectorAll(".seller-tile")
    .forEach(tile=>{

      tile.classList.toggle(
        "active",
        tile.dataset.value === filters.seller
      );

    });

}

window.toggleListingType = function(type){

  if(type === "special"){
    filters.special = !filters.special;
  }

  if(type === "featured"){
    filters.featured = !filters.featured;
  }

  updateListingTiles();

  updateResultsCount();

  clearTimeout(window.__listingTimer);

  window.__listingTimer = setTimeout(()=>{
    trigger();
  },150);

};
function updateListingTiles(){

  document
    .querySelectorAll(".listing-tile")
    .forEach(tile=>{

      const value =
      tile.dataset.value;

      const active =
        (value === "special" && filters.special)
        ||
        (value === "featured" && filters.featured);

      tile.classList.toggle(
        "active",
        active
      );

    });

}

function updateBodyTiles(){

  document.querySelectorAll(".body-tile").forEach(tile=>{

    const val = tile.dataset.value;

    const selected =
      val === filters.body;

    tile.classList.toggle(
      "border-[#E48A2F]",
      selected
    );

    tile.classList.toggle(
      "bg-[#E48A2F]/10",
      selected
    );

    tile.classList.toggle(
      "text-[#E48A2F]",
      selected
    );

    tile.classList.toggle(
      "shadow-sm",
      selected
    );

    tile.classList.toggle(
      "border-slate-200",
      !selected
    );

    tile.classList.toggle(
      "bg-white",
      !selected
    );

    tile.classList.toggle(
      "text-slate-900",
      !selected
    );

  });

}
function updateBodyTileCounts(map){

  document.querySelectorAll(".body-tile").forEach(tile=>{

    const val = tile.dataset.value;
    const count = map[val] || 0;

    /* ðŸ”¥ SHOW LABEL ONLY */
    tile.innerText = val;

    /* ðŸ”¥ DISABLE IF ZERO */
    tile.style.opacity = count === 0 ? "0.4" : "1";
    tile.style.pointerEvents = count === 0 ? "none" : "auto";

  });
}

/* ==========================
ðŸ”¥ IMPRESSION TRACKING
========================== */

const impressionCache = new Set();

async function trackVehicleImpression(vehicle){

/* PHASE 2 — CONSENT GATE. Impression analytics are an
   optional feature; they only run when the user allowed
   the "Analytics & performance" category. */
if(!isAllowed("analytics")){
  return;
}

if(!vehicle?.id) return;

if(impressionCache.has(vehicle.id)){
return;
}

impressionCache.add(vehicle.id);

try{

const {
data:userData
} = await supabase.auth.getUser();

const sessionId =
localStorage.getItem("session_id")
||
crypto.randomUUID();

localStorage.setItem(
"session_id",
sessionId
);

await supabase
.from("vehicle_impressions")
.insert({

vehicle_id:vehicle.id,

user_id:
userData?.user?.id || null,

session_id:sessionId,

source:
vehicle.is_sponsored
? "sponsored"
: "organic"

});

await supabase.rpc(
"increment_vehicle_impression",
{
vehicle_id_input:vehicle.id
}
);

}catch(e){

console.warn(
"Impression tracking failed",
e
);

}

}

/* ========================== */
/* ðŸ”¥ GLOBAL NAVIGATION FIX */
/* ========================== */

filters.premiumDealer =
document.getElementById("premiumDealer")?.checked || false;

filters.warrantyIncluded =
document.getElementById("warrantyIncluded")?.checked || false;
