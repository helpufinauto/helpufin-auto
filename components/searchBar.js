import { MAKES, MODELS, KEYWORDS } from "../js/searchData.js";
import { navigate } from "../js/router.js";
import { supabase } from "../js/api.js";
import { parseIntent } from "../js/aiEngine.js";
import { calculateMonthly } from "../js/financeEngine.js";
import { mapToBrowseFilters, searchVehicles } from "../js/searchAdapter.js";
import { setParams } from "../js/urlState.js";
import { parseSearchIntent, getSmartSuggestions } from "../js/searchIntent.js";
import { renderVehicleCard, renderVehicleCardSkeletons } from "./vehicleCard.js";
import {
  getMakes, getModels, getBodyTypes, getFuelTypes, getTransmissionTypes,
  getDriveTypes, getColours, getConditions, getSellerTypes, getProvinces,
  getBatteryCapacities, getBatteryRanges, getChargingTimes,
  getEngineCapacities, getCommercialCategories, initializeCatalog
} from "../js/catalog.js";

/* ==========================
PHASE 4: PREMIUM HOMEPAGE SEARCH
========================== */

let debounceTimer;
let activeIndex = -1;
let suggestionItems = [];
let isMouseOver = false;
let searchTokens = [];
let vehicleCountCache = {};

/* PHASE 3B — homepage Preview Results presentation mode.
   "list" = single-column stack of the existing cards (default).
   "grid" = responsive multi-column grid of the same cards.
   This is pure presentation state; it never affects the search
   query, filters or results data. Defaults back to list on refresh. */
let previewViewMode = "list";

/* ==========================
FILTER METADATA
========================== */

const FILTER_TYPES = {
  make: { label: "Make", singleSelect: true, urlParam: "make" },
  model: { label: "Model", singleSelect: true, urlParam: "model" },
  body: { label: "Body Type", singleSelect: true, urlParam: "body" },
  fuel: { label: "Fuel", singleSelect: true, urlParam: "fuel" },
  trans: { label: "Transmission", singleSelect: true, urlParam: "trans" },
  drive: { label: "Drive", singleSelect: true, urlParam: "drive" },
  colour: { label: "Colour", singleSelect: true, urlParam: "colours" },
  condition: { label: "Condition", singleSelect: true, urlParam: "condition" },
  seller: { label: "Seller", singleSelect: true, urlParam: "seller" },
  province: { label: "Province", singleSelect: true, urlParam: "province" },
  batteryCapacity: { label: "Battery", singleSelect: true, urlParam: "batteryCapacity" },
  batteryRange: { label: "Battery Range", singleSelect: true, urlParam: "batteryRange" },
  chargingTime: { label: "Charging", singleSelect: true, urlParam: "chargingTime" },
  engineCapacity: { label: "Engine", singleSelect: true, urlParam: "engineCapacity" },
  cabConfiguration: { label: "Cab", singleSelect: true, urlParam: "cabConfiguration" },
  vehicleType: { label: "Vehicle Type", singleSelect: true, urlParam: "vehicleType" },
  variant: { label: "Variant", singleSelect: true, urlParam: "variant" },
  year: { label: "Year", singleSelect: true, urlParam: "yearFrom" },
  seats: { label: "Seats", singleSelect: false, urlParam: "seats" },
  owners: { label: "Ownership", singleSelect: true, urlParam: "owners" },
  /* PHASE 2 FIX (additive): mileage + city tokens reuse the
     EXISTING Browse urlParams (mileage ceiling / city filter) */
  mileage: { label: "Mileage", singleSelect: true, urlParam: "mileage" },
  city: { label: "City", singleSelect: true, urlParam: "city" }
};

const BOOLEAN_FLAGS = [
  { type: "warrantyIncluded", label: "Warranty", urlParam: "warrantyIncluded", keywords: ["warranty"] },
  { type: "certifiedPreOwned", label: "Certified", urlParam: "certifiedPreOwned", keywords: ["certified","cpo"] },
  { type: "accidentFree", label: "Accident Free", urlParam: "accidentFree", keywords: ["accident free"] },
  { type: "roadworthyCertified", label: "Roadworthy", urlParam: "roadworthyCertified", keywords: ["roadworthy"] },
  { type: "featured", label: "Featured", urlParam: "is_featured", keywords: ["featured"] },
  { type: "special", label: "Specials", urlParam: "is_special", keywords: ["special","specials"] },
  { type: "priceNegotiable", label: "Best Value", urlParam: "priceNegotiable", keywords: ["best value","price reduced"] },
  { type: "fastCharge", label: "Fast Charging", urlParam: "fastCharge", keywords: ["fast charging"] },
  /* PHASE 2 FIX (additive): FSH wording maps onto the EXISTING
     serviceHistory boolean filter on Browse */
  { type: "fullServiceHistory", label: "FSH", urlParam: "serviceHistory", value: true, keywords: ["fsh","full service history","complete service history"] },
  { type: "financeAvailable", label: "Finance", urlParam: "financeAvailable", keywords: ["finance available"] },
  { type: "premiumDealer", label: "Premium Dealer", urlParam: "premiumDealer", keywords: ["premium dealer"] },
  { type: "commercialVehicle", label: "Commercial", urlParam: "commercialVehicle", keywords: ["commercial vehicle"] },
  { type: "evOnly", label: "Electric", urlParam: "evOnly", keywords: ["electric","ev"] },
  { type: "oneOwner", label: "One Owner", urlParam: "owners", value: "1", keywords: ["one owner"] },
  { type: "servicePlanIncluded", label: "Service Plan", urlParam: "servicePlanIncluded", keywords: ["service plan"] },
  { type: "maintenancePlanIncluded", label: "Maintenance Plan", urlParam: "maintenancePlanIncluded", keywords: ["maintenance plan"] }
];

/* ==========================
PHASE 20: HOMEPAGE FILTER CAPSULES
Labels are fixed; values come from the shared catalog
(js/catalog.js) — nothing vehicle-related is hard-coded here.
========================== */

const CAPSULE_DEFS = [
  { type: "make", label: "Make" },
  { type: "model", label: "Model" },
  { type: "body", label: "Body Type" },
  { type: "fuel", label: "Fuel" },
  { type: "trans", label: "Transmission" },
  { type: "owners", label: "Ownership" },
  { type: "verification", label: "Verification" }
];

let openCapsule = null;
let capsuleGlobalListenersBound = false;

const capsuleCache = {
  makes: null,
  body: null,
  fuel: null,
  trans: null,
  owners: null,
  verification: null,
  modelsByMake: {}
};

function getToken(type){
  return searchTokens.find(t => t.type === type);
}

/* ==========================
TOKENS
========================== */

function renderTokens() {
  refreshCapsules();
  /* PROMINENT CLEAR FILTERS: shown beside the chips whenever any
     filter/smart token is active, hidden when the state is default.
     Same existing clearAll() — no duplicated clearing logic. */
  const chipsClearBtn = document.getElementById("chipsClearBtn");
  if(chipsClearBtn) chipsClearBtn.classList.toggle("hidden", !searchTokens.length);
  const container = document.getElementById("tokenContainer");
  if(!container) return;
  if(!searchTokens.length) {
    container.innerHTML = "";
    container.classList.add("hidden");
    return;
  }
  container.classList.remove("hidden");
  container.innerHTML = searchTokens.map((t, i) => `
    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#eef3f9] border border-slate-200 text-[13px] font-medium text-[#081120] whitespace-nowrap">
      ${t.label}
      <button onclick="removeSearchToken(${i})" class="text-slate-400 hover:text-red-500 transition-colors leading-none text-[15px]">&times;</button>
    </span>
  `).join("");
}

window.removeSearchToken = function(index) {
  if(index >= 0 && index < searchTokens.length) {
    searchTokens.splice(index, 1);
    renderTokens();
    document.getElementById("q")?.focus();
    updatePreview();
  }
};

/* PHASE 4.6: expose the EXISTING serializer so the preview footer link
   and the new "View All" toolbar button both go through this one
   function — a single source of truth for token → Browse URL params. */
window.navigateToBrowseWithTokens = navigateToBrowseWithTokens;

function buildBrowseUrlFromTokens() {
  const params = new URLSearchParams();
  searchTokens.forEach(t => {
    const ft = FILTER_TYPES[t.type];
    if(ft) {
      if(ft.urlParam === "seats") params.append(ft.urlParam, t.value);
      else params.set(ft.urlParam, t.value);
      return;
    }
    const bf = BOOLEAN_FLAGS.find(b => b.type === t.type);
    if(bf) { params.set(bf.urlParam, t.value || "true"); return; }
    if(t.type === "priceMax") { params.set("priceMax", t.value); return; }
    if(t.type === "smartQuery") { params.set("q", t.value); return; }
    if(t.type === "oneOwner") { params.set("owners", "1"); }
    if(t.type === "verification") { params.set(t.value, "true"); return; }
  });
  return "/browse?" + params.toString();
}

function navigateToBrowseWithTokens() {
  if(!searchTokens.length) return;
  const url = buildBrowseUrlFromTokens();
  searchTokens = [];
  renderTokens();
  navigate(url);
}

/* ==========================
EXPORTED HTML
========================== */

export function SearchBar(){
  setTimeout(init, 0);
  return `
<div class="relative w-full mx-auto">

  <!-- SEARCH BAR -->
  <div class="flex items-stretch min-h-[40px] bg-white rounded-[8px] px-2.5 py-0.5 flex-wrap shadow-sm border border-slate-100">
    <div class="flex-1 flex flex-wrap items-center gap-2 min-w-0">
      <div id="tokenContainer" class="hidden flex flex-wrap items-center gap-1"></div>
      <!-- PROMINENT CLEAR FILTERS: sits directly beside the active
           chips/tokens so it is obvious whenever filters are active.
           Reuses the EXISTING clearAll() reset logic (single source
           of truth — no second reset implementation). -->
      <button id="chipsClearBtn" type="button" class="hidden shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 rounded-full px-2.5 py-1 transition">
        <span class="leading-none">&times;</span> Clear Filters
      </button>
      <input id="q" placeholder="Search make, model, body type, fuel..."
      class="flex-1 min-w-[140px] h-[30px] bg-transparent text-[14px] font-medium text-[#081120] placeholder:text-slate-400 outline-none" autocomplete="off">
    </div>
    <button id="go" class="h-[28px] px-3 bg-[#E48A2F] text-white text-[12px] font-semibold rounded-[6px] hover:brightness-105 transition min-w-[100px] shrink-0">Search Vehicles</button>
  </div>

  <!-- QUICK FILTERS (toggleable) -->
  <div id="quickFilters" class="hidden mt-1.5">
    <div class="bg-white rounded-[10px] border border-slate-200 shadow-sm p-2.5">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
        <div>
          <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Body</label>
          <select id="qfBody" class="w-full text-[12px] h-[30px] rounded-[6px] border border-slate-200 bg-white px-1.5 text-slate-700 outline-none focus:border-[#E48A2F]">
            <option value="">Any</option>
            <option>SUV</option><option>Sedan</option><option>Hatchback</option><option>Bakkie</option>
            <option>Coupe</option><option>Convertible</option><option>Wagon</option><option>MPV</option><option>Van</option><option>Double Cab</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Fuel</label>
          <select id="qfFuel" class="w-full text-[12px] h-[30px] rounded-[6px] border border-slate-200 bg-white px-1.5 text-slate-700 outline-none focus:border-[#E48A2F]">
            <option value="">Any</option><option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>Electric</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Trans</label>
          <select id="qfTrans" class="w-full text-[12px] h-[30px] rounded-[6px] border border-slate-200 bg-white px-1.5 text-slate-700 outline-none focus:border-[#E48A2F]">
            <option value="">Any</option><option>Automatic</option><option>Manual</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Condition</label>
          <select id="qfCondition" class="w-full text-[12px] h-[30px] rounded-[6px] border border-slate-200 bg-white px-1.5 text-slate-700 outline-none focus:border-[#E48A2F]">
            <option value="">Any</option><option value="new">New</option><option value="pre-owned">Pre-Owned</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Seller</label>
          <select id="qfSeller" class="w-full text-[12px] h-[30px] rounded-[6px] border border-slate-200 bg-white px-1.5 text-slate-700 outline-none focus:border-[#E48A2F]">
            <option value="">Any</option><option value="dealer">Dealer</option><option value="private">Private</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Price</label>
          <select id="qfPrice" class="w-full text-[12px] h-[30px] rounded-[6px] border border-slate-200 bg-white px-1.5 text-slate-700 outline-none focus:border-[#E48A2F]">
            <option value="">Any</option><option value="100000">R100k</option><option value="200000">R200k</option>
            <option value="300000">R300k</option><option value="500000">R500k</option><option value="1000000">R1M</option><option value="2000000">R2M</option>
          </select>
        </div>
      </div>
      <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
        <button id="clearAllBtn" class="text-[11px] font-medium text-slate-400 hover:text-red-500 transition">Clear Filters</button>
      </div>
    </div>
  </div>

  <!-- FILTER CAPSULES (PHASE 20): Make / Model / Body Type / Fuel / Transmission / Ownership / Verification / View More -->
  <div id="homeFilterCapsules" class="flex flex-wrap items-center gap-1.5 mt-2 px-0.5">
    ${CAPSULE_DEFS.map(renderCapsuleButton).join("")}
    ${renderViewMoreButton()}
  </div>

  <!-- SUGGESTIONS -->
  <div id="suggestions" class="absolute left-0 right-0 hidden mt-1 z-50 bg-white rounded-[12px] shadow-[0_12px_36px_rgba(15,23,42,0.1)] overflow-hidden border border-slate-100" style="max-height:360px;overflow-y:auto"></div>

  <!-- PREVIEW -->
  <div id="homepagePreview" class="hidden mt-3">
    <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
      <div class="flex items-center gap-2.5 min-w-0 flex-wrap">
        <div class="text-[12px] font-semibold text-slate-400" id="previewHeading">Preview Results</div>
        <!-- PHASE 3B LIST / GRID VIEW SWITCHER — presentation only,
             does NOT touch search, filters or result data. -->
        <div id="previewViewToggle" class="preview-view-toggle" role="group" aria-label="Results view">
          <button type="button" data-view="list" class="preview-view-btn preview-view-active" aria-pressed="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
            <span>List</span>
          </button>
          <button type="button" data-view="grid" class="preview-view-btn" aria-pressed="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></svg>
            <span>Grid</span>
          </button>
        </div>
      </div>
      <!-- RESULT TOOLBAR ACTIONS (wrap cleanly on narrow screens) -->
      <div class="flex items-center gap-2 flex-wrap shrink-0">
        <!-- PHASE 4.6 VIEW ALL: navigates to /browse with the EXACT same
             active token state, reusing the EXISTING navigateToBrowseWithTokens()
             URL serializer (identical parameter format to the homepage
             Search Vehicles flow and the existing preview footer link).
             Pure navigation — no new filtering logic. -->
        <button id="previewViewAllBtn" type="button" class="hidden shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-[#E48A2F] bg-[#E48A2F]/10 border border-[#E48A2F]/25 hover:bg-[#E48A2F]/20 rounded-full px-2.5 py-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E48A2F]/50">
          View All <span aria-hidden="true">&rarr;</span>
        </button>
        <!-- VISIBLE CLEAR FILTERS (reuses the existing clearAll() reset logic) -->
        <button id="previewClearBtn" type="button" class="text-[11px] font-semibold text-slate-500 hover:text-red-500 transition">Clear Filters</button>
      </div>
    </div>
    <div id="previewGrid" class="grid gap-2 preview-list"></div>
    <div id="previewFooter" class="mt-2 text-center"></div>
  </div>

  <div id="filterPanel" class="hidden"></div>
  <div id="liveChips" class="hidden"></div>
  <div id="resultCount" class="hidden"></div>
  <div id="aiFeedback" class="hidden"></div>
</div>`;
}

/* ==========================
INIT
========================== */

function init(){
  fillMakes();
  bindEvents();
  bindCapsuleGlobalListeners();
  refreshCapsules();
  syncHomepageFilters();
  initializeCatalog().catch(() => {});

  /* PERFORMANCE FIX: removed a "pre-warm" request here that used
     count:"exact", head:true — that mode never returns rows, so it
     could never populate vehicleCountCache. It was a wasted network
     request on every homepage load with zero effect. */
}

/* ==========================
BIND EVENTS
========================== */

function bindEvents(){
  const filterBtn = document.getElementById("filterBtn");
  const quickFilters = document.getElementById("quickFilters");
  const input = document.getElementById("q");
  const box = document.getElementById("suggestions");

  document.getElementById("go").onclick = submit;

  // Filter button toggles Quick Filters
  if(filterBtn && quickFilters) {
    filterBtn.onclick = (e) => {
      e.stopPropagation();
      const open = quickFilters.classList.contains("hidden");
      box?.classList.add("hidden");
      /* SINGLE ACTIVE FILTER CONTROL: opening Quick Filters closes
         any open capsule dropdown so only one control is ever open. */
      closeAllCapsules();
      if(open) quickFilters.classList.remove("hidden");
      else quickFilters.classList.add("hidden");
    };
  }

  // Quick filter changes take effect immediately
  ["qfBody","qfFuel","qfTrans","qfCondition","qfSeller","qfPrice"].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener("change", () => applyQuickFilter(id));
  });

  // Clear Filters (all three buttons reuse the SAME existing clearAll())
  document.getElementById("clearAllBtn")?.addEventListener("click", clearAll);
  document.getElementById("chipsClearBtn")?.addEventListener("click", clearAll);

  // Visible "Clear Filters" inside the homepage preview results header —
  // reuses the SAME existing clearAll() reset logic (no duplicate state).
  document.getElementById("previewClearBtn")?.addEventListener("click", clearAll);

  // PHASE 4.6 — "View All": navigate to /browse carrying the EXACT same
  // active token state via the EXISTING navigateToBrowseWithTokens()
  // serializer. Pure navigation; no new filtering/serialization logic.
  document.getElementById("previewViewAllBtn")?.addEventListener("click", () => {
    if(searchTokens.length) navigateToBrowseWithTokens();
  });

  // PHASE 3B — LIST / GRID view switcher for the homepage preview.
  // Presentation only: the same results and vehicle cards are reused
  // for both views; this only toggles the container presentation mode.
  const previewViewToggle = document.getElementById("previewViewToggle");
  const previewViewButtons = previewViewToggle ? Array.from(previewViewToggle.querySelectorAll(".preview-view-btn")) : [];
  previewViewButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const view = btn.getAttribute("data-view");
      if(view) setPreviewView(view);
    });
  });

  // Click outside closes dropdowns
  document.addEventListener("click", (e) => {
    if(quickFilters && !quickFilters.contains(e.target) && e.target.id !== "filterBtn") quickFilters.classList.add("hidden");
    if(box && !box.contains(e.target) && e.target.id !== "q") { box.classList.add("hidden"); activeIndex = -1; }
  });
  if(quickFilters) quickFilters.addEventListener("click", e => e.stopPropagation());
  if(box) {
    box.addEventListener("mouseenter", () => isMouseOver = true);
    box.addEventListener("mouseleave", () => isMouseOver = false);
  }

  // Focus
  input?.addEventListener("focus", () => { if(!searchTokens.length) runLightSuggestions(""); });

  // Keyboard
  input?.addEventListener("keydown", (e) => {
    if(e.key === "Backspace" && !input.value && searchTokens.length) {
      e.preventDefault(); searchTokens.pop(); renderTokens(); updatePreview(); return;
    }
    if(!suggestionItems.length) return;
    if(e.key === "ArrowDown") { e.preventDefault(); activeIndex = (activeIndex + 1) % suggestionItems.length; updateActiveItem(); }
    if(e.key === "ArrowUp") { e.preventDefault(); activeIndex = (activeIndex - 1 + suggestionItems.length) % suggestionItems.length; updateActiveItem(); }
    /* TAB AUTOCOMPLETE (additive): Tab completes the highlighted (or
       first) suggestion INTO the input without applying it. Enter (or a
       click) still performs the actual apply through the EXISTING
       handleSuggestionClick → applySmartPhrase pipeline. Plain-Enter
       search behaviour with no active suggestion is untouched. */
    if(e.key === "Tab") {
      e.preventDefault();
      if(activeIndex < 0) { activeIndex = 0; updateActiveItem(); }
      const label = suggestionItems[activeIndex]?.querySelector(".font-medium")?.textContent?.trim();
      if(label && input) input.value = label;
      return;
    }
    if(e.key === "Enter" && activeIndex >= 0) { e.preventDefault(); suggestionItems[activeIndex].click(); return; }
    if(e.key === "Enter") submit();
    if(e.key === "Escape") box?.classList.add("hidden");
  });

  // Input
  input?.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      activeIndex = -1;
      runLightSuggestions(input.value.trim());
    }, 100); // faster debounce for instant feel
  });
}

function applyQuickFilter(id) {
  const map = {
    qfBody: { type: "body", el: "qfBody" },
    qfFuel: { type: "fuel", el: "qfFuel" },
    qfTrans: { type: "trans", el: "qfTrans" },
    qfCondition: { type: "condition", el: "qfCondition" },
    qfSeller: { type: "seller", el: "qfSeller" },
    qfPrice: { type: "priceMax", el: "qfPrice" }
  };
  const m = map[id];
  if(!m) return;
  const val = document.getElementById(m.el)?.value;
  if(!val) { searchTokens = searchTokens.filter(t => t.type !== m.type); renderTokens(); updatePreview(); return; }
  
  searchTokens = searchTokens.filter(t => t.type !== m.type);
  const labels = { body: val, fuel: val, trans: val, condition: val === "new" ? "New" : "Pre-Owned", seller: val === "dealer" ? "Dealer" : "Private", priceMax: "Under R" + Number(val).toLocaleString() };
  searchTokens.push({ type: m.type, value: val, label: labels[m.type] || val });
  renderTokens();
  updatePreview();
}

function clearAll() {
  searchTokens = [];
  renderTokens();
  ["qfBody","qfFuel","qfTrans","qfCondition","qfSeller","qfPrice"].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = "";
  });
  const input = document.getElementById("q");
  if(input) input.value = "";
  updatePreview();
}

function updateActiveItem(){
  suggestionItems.forEach(el => el.classList.remove("active-suggestion", "bg-slate-100"));
  if(activeIndex >= 0) {
    suggestionItems[activeIndex]?.classList.add("active-suggestion", "bg-slate-100");
    suggestionItems[activeIndex]?.scrollIntoView({ block: "nearest" });
  }
}

function highlight(text, query){
  if(!query) return text;
  try {
    const r = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
    return text.replace(r, `<span class="text-[#E48A2F] font-bold">$1</span>`);
  } catch(e) { return text; }
}

function getCategoryLabel(type) {
  const ft = FILTER_TYPES[type];
  if(ft) return ft.label;
  const bf = BOOLEAN_FLAGS.find(b => b.type === type);
  if(bf) return bf.label;
  if(type === "priceMax") return "Price";
  if(type === "oneOwner") return "Owners";
  if(type === "smart") return "Smart Search";
  return type;
}

function getCount(type, value) {
  const key = type + ":" + value;
  return vehicleCountCache[key];
}

/* ==========================
INSTANT LOCAL VALUES (always available, cached)
========================== */

async function getLocalFilterValues(query) {
  const q = query.toLowerCase().trim();
  if(!q || q.length < 1) return [];
  const results = [];
  const seen = new Set();

  // Catalog makes (authoritative, loaded via initializeCatalog in init())
  let catalogMakes = [];
  try { catalogMakes = await getMakes(); } catch(e) { catalogMakes = []; }

  // Makes - prefix first, then contains
  MAKES.forEach(m => {
    const ml = m.toLowerCase();
    if(ml.startsWith(q) && !seen.has("make:" + m)) { seen.add("make:" + m); results.push({ type: "make", value: m, label: m }); }
  });
  catalogMakes.forEach(m => {
    const ml = m.toLowerCase();
    if(ml.startsWith(q) && !seen.has("make:" + m)) { seen.add("make:" + m); results.push({ type: "make", value: m, label: m }); }
  });
  MAKES.forEach(m => {
    const ml = m.toLowerCase();
    if(ml.includes(q) && !ml.startsWith(q) && !seen.has("make:" + m)) { seen.add("make:" + m); results.push({ type: "make", value: m, label: m }); }
  });
  catalogMakes.forEach(m => {
    const ml = m.toLowerCase();
    if(ml.includes(q) && !ml.startsWith(q) && !seen.has("make:" + m)) { seen.add("make:" + m); results.push({ type: "make", value: m, label: m }); }
  });

  // Models
  for(const make of MAKES) {
    const models = MODELS[make] || [];
    models.forEach(m => {
      const ml = m.toLowerCase();
      if(ml.startsWith(q) && !seen.has("model:" + m)) { seen.add("model:" + m); results.push({ type: "model", value: m, label: m }); }
    });
  }
  // Catalog models for each catalog make (authoritative)
  for(const make of catalogMakes) {
    let catalogModels = [];
    try { catalogModels = await getModels(make); } catch(e) { catalogModels = []; }
    catalogModels.forEach(m => {
      const ml = m.toLowerCase();
      if(ml.startsWith(q) && !seen.has("model:" + m)) { seen.add("model:" + m); results.push({ type: "model", value: m, label: m }); }
    });
  }
  for(const make of MAKES) {
    const models = MODELS[make] || [];
    models.forEach(m => {
      const ml = m.toLowerCase();
      if(ml.includes(q) && !ml.startsWith(q) && !seen.has("model:" + m)) { seen.add("model:" + m); results.push({ type: "model", value: m, label: m }); }
    });
  }
  // Catalog models - contains pass (prefix already handled above)
  for(const make of catalogMakes) {
    let catalogModels = [];
    try { catalogModels = await getModels(make); } catch(e) { catalogModels = []; }
    catalogModels.forEach(m => {
      const ml = m.toLowerCase();
      if(ml.includes(q) && !ml.startsWith(q) && !seen.has("model:" + m)) { seen.add("model:" + m); results.push({ type: "model", value: m, label: m }); }
    });
  }

  // Body types
  const bodyTypes = ["SUV","Sedan","Hatchback","Bakkie","Coupe","Convertible","Wagon","MPV","Van","Crossover","Double Cab","Single Cab","Light Truck","Bus","Motorhome","Camper"];
  bodyTypes.forEach(t => { if(t.toLowerCase().includes(q) && !seen.has("body:" + t)) { seen.add("body:" + t); results.push({ type: "body", value: t, label: t }); } });

  // Fuel
  ["Petrol","Diesel","Hybrid","Plug-In Hybrid","Electric"].forEach(t => { if(t.toLowerCase().includes(q) && !seen.has("fuel:" + t)) { seen.add("fuel:" + t); results.push({ type: "fuel", value: t, label: t }); } });

  // Transmission
  ["Automatic","Manual"].forEach(t => { if(t.toLowerCase().includes(q) && !seen.has("trans:" + t)) { seen.add("trans:" + t); results.push({ type: "trans", value: t, label: t }); } });

  // Drive
  ["FWD","RWD","AWD","4x4","4WD"].forEach(t => { if(t.toLowerCase().includes(q) && !seen.has("drive:" + t)) { seen.add("drive:" + t); results.push({ type: "drive", value: t === "4x4" || t === "4WD" ? "AWD" : t, label: t }); } });

  // Colours
  ["White","Black","Silver","Grey","Blue","Red","Green","Brown","Beige","Orange","Yellow","Gold","Purple","Maroon","Navy"].forEach(t => {
    if(t.toLowerCase().includes(q) && !seen.has("colour:" + t)) { seen.add("colour:" + t); results.push({ type: "colour", value: t, label: t }); }
  });

  // Provinces
  ["Gauteng","Western Cape","KwaZulu-Natal","Eastern Cape","Free State","Limpopo","Mpumalanga","North West","Northern Cape"].forEach(t => {
    if(t.toLowerCase().includes(q) && !seen.has("province:" + t)) { seen.add("province:" + t); results.push({ type: "province", value: t, label: t }); }
  });

  // Condition
  ["New","Pre-Owned"].forEach(t => { if(t.toLowerCase().includes(q) && !seen.has("condition:" + t)) { seen.add("condition:" + t); results.push({ type: "condition", value: t.toLowerCase() === "pre-owned" ? "pre-owned" : t.toLowerCase(), label: t }); } });

  // Seller
  ["Dealer","Private"].forEach(t => { if(t.toLowerCase().includes(q) && !seen.has("seller:" + t)) { seen.add("seller:" + t); results.push({ type: "seller", value: t.toLowerCase(), label: t }); } });

  // Cab configs
  ["Single Cab","Extended Cab","Double Cab","Crew Cab"].forEach(t => { if(t.toLowerCase().includes(q) && !seen.has("cabConfiguration:" + t)) { seen.add("cabConfiguration:" + t); results.push({ type: "cabConfiguration", value: t, label: t }); } });

  // Vehicle types
  ["Passenger Vehicle","Commercial Vehicle","Motorcycle","Quad Bike","ATV","Caravan","Trailer","Boat"].forEach(t => { if(t.toLowerCase().includes(q) && !seen.has("vehicleType:" + t)) { seen.add("vehicleType:" + t); results.push({ type: "vehicleType", value: t, label: t }); } });

  // Years
  for(let y = 2025; y >= 2000; y--) { const ys = String(y); if(ys.includes(q) && !seen.has("year:" + ys)) { seen.add("year:" + ys); results.push({ type: "year", value: ys, label: ys }); } }

  // Seats
  ["2","4","5","7","8","9+"].forEach(t => { if(t.includes(q) && !seen.has("seats:" + t)) { seen.add("seats:" + t); results.push({ type: "seats", value: t, label: t + " Seats" }); } });

  // Boolean flags
  BOOLEAN_FLAGS.forEach(flag => { if(flag.keywords.some(k => k.includes(q) || q.includes(k))) { if(!seen.has("flag:" + flag.type)) { seen.add("flag:" + flag.type); results.push({ type: flag.type, value: flag.value || "true", label: flag.label }); } } });

  return results.slice(0, 30);
}

/* ==========================
RUN SUGGESTIONS (instant, uses local cache first)
========================== */

async function runLightSuggestions(query) {
  const box = document.getElementById("suggestions");
  if(!box) return;

  /* SINGLE ACTIVE FILTER CONTROL: typing/focusing the search input
     closes any open capsule dropdown (and vice versa) so only one
     filter interaction is ever visible at a time. */
  closeAllCapsules();

  /* 🔥 SMART INTENT SUGGESTIONS (local, instant, ADDITIVE)
     Generated from the shared intent layer (js/searchIntent.js)
     using the cached catalog makes. The existing local filter
     suggestions below remain completely untouched. */
  let catalogMakes = [];
  try { catalogMakes = await getMakes(); } catch(e) { catalogMakes = []; }
  const smart = getSmartSuggestions(query || "", { makes: catalogMakes });

  if(!query || query.length < 1) {
    /* Focus with empty input now shows popular smart searches
       (previously the dropdown stayed hidden) */
    if(!smart.length) { box.classList.add("hidden"); box.innerHTML = ""; suggestionItems = []; return; }
    renderSuggestionRows(box, smart.slice(0, 6), "");
    return;
  }

  // Use local data first for INSTANT results, upgrade with async if possible
  let predictions = await getLocalFilterValues(query);

  /* Merge: smart suggestions first, then the existing local values
     (deduped by label). No existing suggestion is removed. */
  const merged = [...smart];
  const seenLabels = new Set(smart.map(s => String(s.label).toLowerCase()));
  predictions.forEach(p => {
    if(!seenLabels.has(String(p.label).toLowerCase())) {
      seenLabels.add(String(p.label).toLowerCase());
      merged.push(p);
    }
  });

  if(!merged.length) { box.classList.add("hidden"); box.innerHTML = ""; suggestionItems = []; return; }

  renderSuggestionRows(box, merged, query);
}

/* Row rendering extracted verbatim from the previous inline block so
   both smart and existing suggestions share identical markup. */
function renderSuggestionRows(box, items, query){
  let html = `<div class="py-1">`;
  items.forEach(item => {
    const cat = item.type === "smart" ? "Smart Search" : getCategoryLabel(item.type);
    const count = getCount(item.type, item.value);
    const countStr = count ? ` · ${count} vehicles` : "";
    const extra = (item.type === "smart" && item.sublabel) ? ` - ${item.sublabel}` : "";
    html += `
    <div data-suggestion class="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-[14px] text-[#081120] font-medium hover:bg-[#eef3f9] transition-colors border-b border-slate-100 last:border-b-0"
    onclick="handleSuggestionClick('${item.type}', '${String(item.value).replace(/'/g, "\\'")}', '${String(item.label).replace(/'/g, "\\'")}')">
      <div class="flex-1 min-w-0">
        <div class="font-medium">${highlight(item.label, query)}</div>
        <div class="text-[11px] text-slate-400 font-normal">${cat}${extra}${countStr}</div>
      </div>
    </div>`;
  });
  html += `</div>`;

  box.innerHTML = html;
  box.classList.remove("hidden");
  suggestionItems = Array.from(box.querySelectorAll("[data-suggestion]"));
  suggestionItems.forEach((el, idx) => {
    el.onmouseenter = () => { if(isMouseOver) { activeIndex = idx; updateActiveItem(); } };
  });
}

/* ==========================
HANDLE SUGGESTION CLICK
========================== */

/* Shared single-select token logic — used by autocomplete suggestions
   and by the Phase 20 homepage filter capsules. */
function addFilterToken(type, value, label) {
  const ft = FILTER_TYPES[type];
  if(ft && ft.singleSelect) searchTokens = searchTokens.filter(t => t.type !== type);
  const bf = BOOLEAN_FLAGS.find(b => b.type === type);
  if(bf) searchTokens = searchTokens.filter(t => t.type !== type);
  const singleTypes = ["seats","oneOwner","year","variant","vehicleType","cabConfiguration","priceMax","colour","owners","verification"];
  if(singleTypes.includes(type)) searchTokens = searchTokens.filter(t => t.type !== type);

  searchTokens.push({ type, value, label });
  renderTokens();
  updatePreview();
}

window.handleSuggestionClick = function(type, value, label) {
  if(type === "smart") { applySmartPhrase(value); return; }
  addFilterToken(type, value, label);
  const input = document.getElementById("q");
  if(input) input.value = "";
  const box = document.getElementById("suggestions");
  if(box) { box.classList.add("hidden"); box.innerHTML = ""; }
  if(input) input.focus();
};

/* 🔥 SMART PHRASE APPLICATION (ADDITIVE)
   A clicked intelligent suggestion is executed through the
   EXISTING machinery only:
   • phrases mapping onto single-value filters become the
     existing filter capsules/tokens (with live preview)
   • range/around-price or preference-only phrases go through
     submit(), which routes them via mapToBrowseFilters into
     the existing Browse pipeline */
function intentToHomeTokens(intent){
  const T = [];
  const add = (type, value, label) => T.push({ type, value, label });
  if(intent.make) add("make", intent.make, intent.make);
  if(intent.model) add("model", intent.model, intent.model);
  if(intent.bodyType) add("body", intent.bodyType, intent.bodyType);
  if(intent.fuel) add("fuel", intent.fuel, intent.fuel);
  if(intent.transmission) add("trans", intent.transmission, intent.transmission);
  if(intent.drive) add("drive", intent.drive, intent.drive);
  if(intent.condition) add("condition", intent.condition, intent.condition === "new" ? "New" : "Pre-Owned");
  if(intent.seller) add("seller", intent.seller, intent.seller === "dealer" ? "Dealer" : "Private");
  if(intent.yearFrom) add("year", String(intent.yearFrom), String(intent.yearFrom));
  /* PHASE 2 FIX (additive): seats / mileage / location intents now
     become the existing chips + homepage preview filters instead of
     falling through to a Browse navigation. */
  if(intent.seatsMin) add("seats", String(intent.seatsMin), intent.seatsMin + " Seats");
  if(intent.mileageMax != null) add("mileage", String(intent.mileageMax), "Under " + Number(intent.mileageMax).toLocaleString() + " km");
  if(intent.city) add("city", intent.city, intent.city);
  if(intent.province) add("province", intent.province, intent.province);
  if(intent.price && intent.price.kind === "max"){
    add("priceMax", String(intent.price.max), "Under R" + Number(intent.price.max).toLocaleString());
  }
  const F = intent.flags || {};
  const flagMap = {
    warrantyIncluded: "Warranty",
    certifiedPreOwned: "Certified",
    accidentFree: "Accident Free",
    roadworthyCertified: "Roadworthy",
    featured: "Featured",
    special: "Specials",
    priceNegotiable: "Best Value",
    fastCharge: "Fast Charging",
    financeAvailable: "Finance",
    commercialVehicle: "Commercial",
    evOnly: "Electric",
    servicePlanIncluded: "Service Plan",
    maintenancePlanIncluded: "Maintenance Plan",
    fullServiceHistory: "FSH"
  };
  Object.keys(flagMap).forEach(t => { if(F[t]) add(t, "true", flagMap[t]); });
  if(F.oneOwner || F.owners === "1") add("oneOwner", "1", "One Owner");
  if(F.ownershipVerified) add("verification", "ownershipVerified", "Ownership Verified");
  return T;
}

function hideSuggestionsBox(){
  const box = document.getElementById("suggestions");
  if(box){ box.classList.add("hidden"); box.innerHTML = ""; }
  activeIndex = -1;
  suggestionItems = [];
}

/* PHASE 2 FIX: A recognized Smart Search phrase now ALWAYS stays on
   the homepage. Hard-filter parts become existing chips/tokens; soft
   parts (ranking preferences, around-price bands, engine-size
   targets) ride along as a "smartQuery" chip that updatePreview()
   feeds through mapToBrowseFilters — the same existing pipeline —
   for homepage preview results. No /browse navigation occurs. */
function intentHasHardTokens(intent){
  return !!(intent.make || intent.model || intent.bodyType || intent.fuel ||
    intent.transmission || intent.drive || intent.condition || intent.seller ||
    intent.yearFrom || intent.seatsMin ||
    (intent.price && intent.price.kind === "max") ||
    intent.mileageMax != null || intent.city || intent.province ||
    Object.values(intent.flags || {}).some(Boolean));
}

function intentIsRecognized(intent){
  if(!intent) return false;
  if(intentHasHardTokens(intent)) return true;
  const F = intent.flags || {};
  if(Object.keys(F).length && Object.values(F).some(Boolean)) return true;
  const P = intent.preferences || {};
  if(Object.keys(P).length && Object.values(P).some(Boolean)) return true;
  return !!(intent.price || intent.finance || intent.engineCc != null);
}

function dedupeTokens(list){
  /* ONE source of truth: never allow two chips with the same
     type+value or the same visible label. */
  const seen = new Set();
  return list.filter(t => {
    const k1 = t.type + "::" + String(t.value).toLowerCase();
    const k2 = "label::" + String(t.label).toLowerCase();
    if(seen.has(k1) || seen.has(k2)) return false;
    seen.add(k1); seen.add(k2);
    return true;
  });
}

function applySmartPhrase(phrase){
  if(!phrase) return;
  const intent = parseSearchIntent(phrase);
  const tokens = dedupeTokens(intentToHomeTokens(intent));

  /* DUPLICATE-CHIP PREVENTION:
     A smart phrase is an INPUT METHOD, not a second independent
     filter. Its hard-filter parts REPLACE any existing chips of the
     same filter type, and the natural-language sentence itself is
     NEVER retained as a redundant chip once concrete filters
     represent its intent. The smartQuery chip is kept ONLY for
     pure soft/ranking phrases that produce no hard tokens at all
     (around-price bands, finance targets, engine-size targets,
     ranking-only wording) because updatePreview()/mapToBrowseFilters
     requires it to function — the existing architecture's one
     exception. */
  searchTokens = searchTokens.filter(t => t.type !== "smartQuery");
  const types = new Set(tokens.map(t => t.type));
  searchTokens = searchTokens.filter(t => !types.has(t.type));
  searchTokens.push(...tokens);

  if(tokens.length === 0){
    searchTokens.push({ type: "smartQuery", value: phrase, label: phrase });
  }

  renderTokens();
  const input = document.getElementById("q");
  if(input){ input.value = ""; input.focus(); }
  hideSuggestionsBox();
  updatePreview();
}

/* ==========================
PHASE 20: CAPSULE DROPDOWN ENGINE
Dropdown panels are portalled to <body> while open so they are
never clipped by the hero/card overflow containers, and are
positioned from the live capsule rect so they stay visually
attached to the capsule that opened them.
========================== */

function renderCapsuleButton(def){
  return `
    <div class="relative" data-capsule="${def.type}">
      <button id="hfcBtn-${def.type}" type="button" onclick="toggleHomeCapsule('${def.type}')"
class="hfc-btn inline-flex items-center gap-1 max-w-[170px] px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[12px] font-medium text-[#081120] hover:border-[#3B82F6] hover:text-[#3B82F6] transition-all">
        <span id="hfcLabel-${def.type}" class="truncate min-w-0">${def.label}</span>
        <svg id="hfcChev-${def.type}" class="w-3 h-3 shrink-0 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
    </div>`;
}

function renderViewMoreButton(){
  return `
    <button id="hfcViewMore" type="button" onclick="navigate('/browse')"
class="hfc-view-btn inline-flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[12px] font-semibold text-[#081120] hover:border-[#3B82F6] hover:text-[#3B82F6] hover:bg-[rgba(59,130,246,0.10)] transition-all">
      View More
      <svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
    </button>`;
}

function refreshCapsules(){
  CAPSULE_DEFS.forEach(def => {
    const tok = getToken(def.type);
    const labelEl = document.getElementById("hfcLabel-" + def.type);
    const btn = document.getElementById("hfcBtn-" + def.type);
    if(!labelEl || !btn) return;
    if(tok){
      labelEl.textContent = tok.label || tok.value;
      btn.classList.add("hfc-active");
      btn.title = def.label + ": " + (tok.label || tok.value);
    } else {
      labelEl.textContent = def.label;
      btn.classList.remove("hfc-active");
      btn.title = def.label;
    }
  });
}

function ensureCapsuleDD(type){
  let dd = document.getElementById("hfcDD-" + type);
  if(dd) return dd;
  dd = document.createElement("div");
  dd.id = "hfcDD-" + type;
  dd.className = "hfc-dd hidden";
  document.body.appendChild(dd);
  return dd;
}

function positionCapsuleDD(dd, btn){
  const r = btn.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const width = Math.max(210, Math.min(260, vw - 16));
  dd.style.width = width + "px";
  dd.style.position = "fixed";
  dd.style.zIndex = "80";
  let left = r.left;
  if(left + width > vw - 8) left = vw - 8 - width;
  if(left < 8) left = 8;
  dd.style.left = Math.round(left) + "px";
  let top = r.bottom + 6;
  const dh = dd.offsetHeight || 0;
  if(dh && top + dh > vh - 8) top = Math.max(8, r.top - dh - 6);
  dd.style.top = Math.round(top) + "px";
}

async function loadCapsuleOptions(type){
  if(type === "make"){
    if(!capsuleCache.makes){
      const values = await getMakes();
      if(values && values.length) capsuleCache.makes = values;
    }
    return { options: capsuleCache.makes || [], emptyMsg: "No makes available yet" };
  }
  if(type === "model"){
    const makeTok = getToken("make");
    if(!makeTok) return { needsMake: true, options: [], emptyMsg: "" };
    const mk = makeTok.value;
    if(!capsuleCache.modelsByMake[mk]){
      const values = await getModels(mk);
      if(values && values.length) capsuleCache.modelsByMake[mk] = values;
    }
    return { options: capsuleCache.modelsByMake[mk] || [], emptyMsg: "No models found for this make" };
  }
  if(type === "body"){
    if(!capsuleCache.body){
      const values = await getBodyTypes();
      if(values && values.length) capsuleCache.body = values;
    }
    return { options: capsuleCache.body || [], emptyMsg: "No body types available yet" };
  }
  if(type === "fuel"){
    if(!capsuleCache.fuel){
      const values = await getFuelTypes();
      if(values && values.length) capsuleCache.fuel = values;
    }
    return { options: capsuleCache.fuel || [], emptyMsg: "No fuel types available yet" };
  }
  if(type === "trans"){
    if(!capsuleCache.trans){
      const values = await getTransmissionTypes();
      if(values && values.length) capsuleCache.trans = values;
    }
    return { options: capsuleCache.trans || [], emptyMsg: "No transmission types available yet" };
  }
  if(type === "owners"){
    /* Existing ownership values supported by the app's owners filter */
    return { options: [
      { value: "1", label: "1" },
      { value: "2", label: "2" },
      { value: "3", label: "3+" }
    ], emptyMsg: "No ownership options available" };
  }
  if(type === "verification"){
    /* Existing verification fields supported by the Browse page */
    return { options: [
      { value: "ownershipVerified", label: "Ownership Verified" },
      { value: "certifiedPreOwned", label: "Certified Pre-Owned" },
      { value: "roadworthyCertified", label: "Roadworthy Certificate" },
      { value: "accidentFree", label: "Accident Free" }
    ], emptyMsg: "No verification options available" };
  }
  return { options: [], emptyMsg: "No options available" };
}

/* Options and the Clear row are built with DOM APIs + textContent so
   catalog values of any shape are rendered safely (no string escaping). */
function renderCapsuleOptions(type, options, emptyMsg){
  const dd = document.getElementById("hfcDD-" + type);
  if(!dd) return;
  const current = getToken(type);
  dd.innerHTML = "";

  if(current){
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "hfc-clear";
    const clearLabel = document.createElement("span");
    clearLabel.textContent = "Clear \u201C" + (current.label || current.value) + "\u201D";
    const clearX = document.createElement("span");
    clearX.textContent = "\u00D7";
    clearBtn.append(clearLabel, clearX);
    clearBtn.addEventListener("click", () => window.clearHomeCapsule(type));
    dd.appendChild(clearBtn);
  }

  if(!options || !options.length){
    const empty = document.createElement("div");
    empty.className = "hfc-empty";
    empty.textContent = emptyMsg || "No options available";
    dd.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "hfc-list";
  options.forEach(rawOpt => {
    const opt = (typeof rawOpt === "object" && rawOpt !== null) ? rawOpt : { value: rawOpt, label: String(rawOpt) };
    const optValue = String(opt.value);
    const optLabelText = String(opt.label || opt.value);
    const sel = !!(current && current.value === optValue);
    const optBtn = document.createElement("button");
    optBtn.type = "button";
    optBtn.className = "hfc-opt" + (sel ? " hfc-selected" : "");
    const optLabel = document.createElement("span");
    optLabel.className = "hfc-opt-label";
    optLabel.textContent = optLabelText;
    optBtn.appendChild(optLabel);
    if(sel){
      optBtn.insertAdjacentHTML("beforeend", '<svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>');
    }
    optBtn.addEventListener("click", () => window.selectHomeCapsuleValue(type, optValue, optLabelText));
    list.appendChild(optBtn);
  });
  dd.appendChild(list);
}

async function openCapsuleDropdown(type){
  closeAllCapsules();
  const btn = document.getElementById("hfcBtn-" + type);
  if(!btn) return;
  const dd = ensureCapsuleDD(type);
  openCapsule = type;
  btn.classList.add("hfc-open");
  document.getElementById("hfcChev-" + type)?.classList.add("rotate-180");

  // Keep the rest of the search UI tidy while a capsule dropdown is open
  document.getElementById("suggestions")?.classList.add("hidden");
  document.getElementById("quickFilters")?.classList.add("hidden");

  dd.innerHTML = `<div class="hfc-loading">Loading\u2026</div>`;
  dd.classList.remove("hidden");
  positionCapsuleDD(dd, btn);

  try {
    const result = await loadCapsuleOptions(type);
    if(openCapsule !== type) return;
    if(result.needsMake){
      dd.innerHTML = `
        <div class="hfc-dd-head">
          <div class="hfc-dd-title">Select a Make first</div>
          <div class="hfc-dd-sub">Models are listed per manufacturer.</div>
          <button type="button" onclick="switchCapsule('make')" class="hfc-dd-link">Choose a Make &rarr;</button>
        </div>`;
    } else {
      renderCapsuleOptions(type, result.options, result.emptyMsg);
    }
    positionCapsuleDD(dd, btn);
  } catch(err){
    console.error("Capsule options failed:", err);
    if(openCapsule !== type) return;
    dd.innerHTML = `<div class="hfc-empty">Couldn't load options</div>`;
    positionCapsuleDD(dd, btn);
  }
}

function closeAllCapsules(){
  /* SINGLE ACTIVE FILTER CONTROL: hide EVERY portalled dropdown panel
     and reset EVERY capsule button/chevron — not just the one tracked
     in openCapsule — so a stale dropdown can never remain visible. */
  document.querySelectorAll(".hfc-dd").forEach(dd => dd.classList.add("hidden"));
  CAPSULE_DEFS.forEach(def => {
    document.getElementById("hfcBtn-" + def.type)?.classList.remove("hfc-open");
    document.getElementById("hfcChev-" + def.type)?.classList.remove("rotate-180");
  });
  openCapsule = null;
}

function removeTokenType(type){
  searchTokens = searchTokens.filter(t => t.type !== type);
  renderTokens();
  updatePreview();
}

/* Make -> Model dependency: when the Make changes or is cleared,
   drop any Model selection that is no longer valid for that Make. */
async function enforceModelValidity(){
  const makeTok = getToken("make");
  const modelTok = getToken("model");
  if(!modelTok) return;
  if(!makeTok){ removeTokenType("model"); return; }
  try {
    const models = await getModels(makeTok.value);
    if(models.length && !models.includes(modelTok.value)) removeTokenType("model");
  } catch(e) { /* catalog unavailable — keep existing selection */ }
}

window.toggleHomeCapsule = function(type){
  if(openCapsule === type){ closeAllCapsules(); return; }
  openCapsuleDropdown(type);
};

window.switchCapsule = function(type){
  openCapsuleDropdown(type);
};

window.selectHomeCapsuleValue = async function(type, value, label){
  addFilterToken(type, value, label || value);
  closeAllCapsules();
  if(type === "make") await enforceModelValidity();
};

window.clearHomeCapsule = function(type){
  removeTokenType(type);
  if(type === "make") removeTokenType("model");
  closeAllCapsules();
};

function bindCapsuleGlobalListeners(){
  if(capsuleGlobalListenersBound) return;
  capsuleGlobalListenersBound = true;
  // Click outside any capsule / dropdown closes the open dropdown
  document.addEventListener("click", (e) => {
    const el = e.target instanceof Element ? e.target : null;
    if(el && (el.closest("[data-capsule]") || el.closest(".hfc-dd"))) return;
    closeAllCapsules();
  });
  document.addEventListener("keydown", (e) => { if(e.key === "Escape") closeAllCapsules(); });
  window.addEventListener("resize", () => closeAllCapsules());
  // Scrolling the page closes the dropdown (scrolling INSIDE the
  // dropdown list is ignored so options can be browsed)
  window.addEventListener("scroll", (e) => {
    const el = e.target instanceof Element ? e.target : null;
    if(el && el.closest && el.closest(".hfc-dd")) return;
    closeAllCapsules();
  }, true);
}

/* ==========================
PREVIEW
========================== */

let previewRequestId = 0;

/* PHASE 3B — LIST / GRID view switcher.
   Toggles the presentation class on #previewGrid and the active state
   of the segmented control. Uses the SAME rendered results for both
   views — the search query, filters and data are never re-run here. */
function setPreviewView(view) {
  const mode = view === "grid" ? "grid" : "list";
  previewViewMode = mode;

  const grid = document.getElementById("previewGrid");
  const toggle = document.getElementById("previewViewToggle");
  if(grid) {
    grid.classList.remove("preview-list", "preview-grid");
    grid.classList.add(mode === "grid" ? "preview-grid" : "preview-list");
  }
  if(toggle) {
    toggle.querySelectorAll(".preview-view-btn").forEach(btn => {
      const active = btn.getAttribute("data-view") === mode;
      btn.classList.toggle("preview-view-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }
}

async function updatePreview() {
  const preview = document.getElementById("homepagePreview");
  const grid = document.getElementById("previewGrid");
  const footer = document.getElementById("previewFooter");
  const heading = document.getElementById("previewHeading");
  if(!preview || !grid || !footer || !heading) return;
  if(!searchTokens.length) {
    preview.classList.add("hidden");
    /* Reset the preview back to its default empty state so stale
       results/chips never linger when filters are cleared. */
    grid.innerHTML = "";
    footer.innerHTML = "";
    heading.textContent = "Preview Results";
    /* PHASE 4.6: View All only makes sense with an active result set. */
    document.getElementById("previewViewAllBtn")?.classList.add("hidden");
    return;
  }

  preview.classList.remove("hidden");
  /* Initial skeleton state: shown while the preview query runs so the
     grid never displays an empty area. Replaced with real vehicle cards,
     the existing empty state, or the existing error state. */
  grid.innerHTML = renderVehicleCardSkeletons(4);
  footer.innerHTML = "";
  heading.textContent = "Preview Results";

  const currentRequest = ++previewRequestId;
  try {
    const filters = {};
    let smartQ = "";
    searchTokens.forEach(t => {
      if(t.type === "smartQuery"){ smartQ = t.value; return; }
      const ft = FILTER_TYPES[t.type];
      if(ft) {
        if(ft.urlParam === "seats") filters[ft.urlParam] = [t.value];
        else if(ft.urlParam === "yearFrom") filters.yearFrom = t.value;
        else filters[ft.urlParam] = t.value;
        return;
      }
      const bf = BOOLEAN_FLAGS.find(b => b.type === t.type);
      if(bf) { filters[bf.urlParam] = t.value || "true"; return; }
      if(t.type === "priceMax") { filters.priceMax = Number(t.value); return; }
      if(t.type === "oneOwner") { filters.owners = "1"; return; }
      if(t.type === "verification") { filters[t.value] = true; return; }
      if(t.type === "colour") { filters.colours = t.value; }
    });

    /* smartQuery chip: the existing adapter fully understands the
       natural-language phrase (preferences, around-price bands,
       engine-size targets, mileage ceilings, city/province…) and
       merges it under the hard token filters above. */
    const browseFilters = mapToBrowseFilters({ ...filters, ...(smartQ ? { q: smartQ } : {}) });
    const { data, count } = await searchVehicles(browseFilters, { limit: 8 });
    if(currentRequest !== previewRequestId) return;

    heading.textContent = `Preview Results (${count || 0})`;

    /* PHASE 4.6: reveal the toolbar "View All" only when the preview is
       displaying real results for the active filters. */
    document.getElementById("previewViewAllBtn")?.classList.toggle("hidden", !(count > 0));

    if(!data || !data.length) {
      grid.innerHTML = `<div class="col-span-full text-center py-6"><p class="text-[14px] font-medium text-slate-400">No matching vehicles found</p><p class="text-[12px] text-slate-300 mt-1">Try changing one or more filters</p></div>`;
      footer.innerHTML = ""; return;
    }
    grid.innerHTML = data.slice(0, 8).map(v => renderVehicleCard(v, { actions: "browse" })).join("");
    if(count > 8) {
footer.innerHTML = `<button onclick="navigateToBrowseWithTokens()" class="text-[12px] font-medium text-[#3B82F6] hover:underline">View all ${count} matching vehicles →</button>`;
    } else { footer.innerHTML = ""; }
  } catch(e) {
    console.error("Preview update failed:", e);
    if(currentRequest === previewRequestId){
      grid.innerHTML = `<div class="col-span-full text-center py-4 text-slate-400 text-sm">Error loading preview</div>`;
      document.getElementById("previewViewAllBtn")?.classList.add("hidden");
    }
  }
}

/* ==========================
LEGACY
========================== */

function saveRecentSearch(q){
  if(!q) return;
  let list = JSON.parse(localStorage.getItem("recentSearches") || "[]");
  list = list.filter(x => x.toLowerCase() !== q.toLowerCase());
  list.unshift(q);
  list = list.slice(0,6);
  localStorage.setItem("recentSearches", JSON.stringify(list));
}

function applyFinanceIntent(query){
  const intent = parseIntent(query);
  if(intent.affordableOnly) document.getElementById("affordableOnly").checked = true;
  if(intent.term) document.getElementById("term").value = intent.term;
  if(intent.interest) document.getElementById("interest").value = intent.interest;
}

function runAI(query){
  const box = document.getElementById("aiFeedback");
  const intent = parseIntent(query);
  let parts = [];
  if(intent.make) parts.push(intent.make);
  if(intent.body_type) parts.push(intent.body_type);
  if(intent.priceMax) parts.push("Under R " + intent.priceMax);
  if(box) box.innerText = parts.length ? "Searching: " + parts.join(" • ") : "";
}

async function submit(){
  const q = document.getElementById("q")?.value?.trim() || "";

  /* Persist this search as local search behaviour so the homepage
     "Recommended For You" rail can reflect it for signed-out visitors
     (and it is deduped + re-ordered internally by saveRecentSearch).
     Recorded for BOTH recognized Smart Search phrases and legacy
     free-text searches. */
  if(q){ saveRecentSearch(q); }

  /* PHASE 2 FIX: a recognized Smart Search phrase NEVER navigates to
     /browse — it becomes chips + homepage preview results. */
  if(q){
    const intent = parseSearchIntent(q);
    if(intentIsRecognized(intent)){ applySmartPhrase(q); return; }
  }

  /* Existing chips (incl. smartQuery) re-render homepage previews
     instead of falling through to Browse. */
  if(searchTokens.length){ updatePreview(); return; }

  if(!q) return;

  /* LEGACY free-text path (unrecognized plain keyword searches):
     unchanged Phase-1 behaviour. */
  const filters = mapToBrowseFilters({
    q, make: val("make"), model: val("model"),
    priceMin: Number(val("minPrice")) || 0, priceMax: Number(val("maxPrice")) || 0,
    body: val("body"), fuel: val("fuel"), trans: val("trans"), seller: val("seller"),
    deposit: Number(val("deposit")) || 0, interest: Number(val("interest")) || 0,
    term: Number(val("term")) || 72,
    affordableOnly: document.getElementById("affordableOnly")?.checked || false
  });
  const { data, count } = await searchVehicles(filters);
  if(count === 1 && data.length === 1) { navigate(`/vehicle?id=${data[0].id}`); return; }
  if(count > 1) {
    document.getElementById("quickFilters")?.classList.add("hidden");
    const urlFilters = { ...filters };
    delete urlFilters.intentPrefs; /* internal ranking hints are never serialized to the URL */
    navigate("/browse" + setParams(urlFilters));
    return;
  }
  showNoResults();
}

function showNoResults(){
  const preview = document.getElementById("homepagePreview");
  if(!preview) return;
  preview.innerHTML = `<div class="p-8 text-center w-full"><p class="font-semibold mb-2">No vehicles found</p><p class="text-[13px] text-slate-500 mb-4">Try different search terms or browse all vehicles</p><button onclick="navigate('/browse')" class="btn btn-dark mt-2">Browse All Vehicles</button></div>`;
  preview.classList.remove("hidden");
}

function fillMakes(){
  const make = document.getElementById("make");
  if(!make) return;
  MAKES.forEach(m => { const o = document.createElement("option"); o.value = m; o.textContent = m; make.appendChild(o); });
}

function fillModels(){
  const make = val("make");
  const model = document.getElementById("model");
  if(!model) return;
  model.innerHTML = `<option value="">Model</option>`;
  const list = MODELS[make];
  if(!list) return;
  list.forEach(m => { const o = document.createElement("option"); o.value = m; o.textContent = m; model.appendChild(o); });
}

function val(id) { return document.getElementById(id)?.value || ""; }

window.viewVehicle = function(id) { if(id) navigate(`/vehicle?id=${id}`); };

function syncHomepageFilters(){
  const params = new URLSearchParams(window.location.search);
  ["make","model","fuel","trans","seller","body"].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = params.get(id) || "";
  });
  const min = params.get("priceMin"), max = params.get("priceMax");
  if(min) document.getElementById("minPrice") && (document.getElementById("minPrice").value = min);
  if(max) document.getElementById("maxPrice") && (document.getElementById("maxPrice").value = max);
  const d = params.get("deposit"), i = params.get("interest"), t = params.get("term");
  if(d) document.getElementById("deposit") && (document.getElementById("deposit").value = d);
  if(i) document.getElementById("interest") && (document.getElementById("interest").value = i);
  if(t) document.getElementById("term") && (document.getElementById("term").value = t);
  if(params.get("affordableOnly") === "true") {
    const el = document.getElementById("affordableOnly");
    if(el) el.checked = true;
  }
}

function renderChips(){
  const box = document.getElementById("liveChips");
  if(!box) return;
  const intent = parseIntent(val("q"));
  let chips = [];
  if(intent.make) chips.push({key:"make", value:intent.make});
  if(intent.body_type) chips.push({key:"body", value:intent.body_type});
  if(intent.priceMax) chips.push({key:"priceMax", value:"Under R " + intent.priceMax});
  if(intent.transmission) chips.push({key:"trans", value:intent.transmission});
  if(intent.affordableOnly) chips.push({key:"finance", value:"Affordable"});
  box.innerHTML = chips.map(c => `<div class="chip">${c.value}<span onclick="removeChip('${c.key}')">âœ•</span></div>`).join("");
}

window.removeChip = function(key){
  let q = val("q").toLowerCase();
  if(key === "make") MAKES.forEach(m => { q = q.replace(m.toLowerCase(), ""); });
  if(key === "body") KEYWORDS.body.forEach(b => { q = q.replace(b, ""); });
  if(key === "priceMax") q = q.replace(/\d+k?/g, "");
  document.getElementById("q").value = q.trim();
  renderChips();
};

window.quickFillMake = function(make) { document.getElementById("make").value = make; fillModels(); };
window.quickSearch = function(text) { document.getElementById("q").value = text; submit(); };
window.selectSuggestion = function(make, model) { document.getElementById("make").value = make; fillModels(); document.getElementById("model").value = model; submit(); };
