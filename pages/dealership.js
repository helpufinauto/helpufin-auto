import { supabase } from "../js/api.js";
import { navigate, updateSEO } from "../js/router.js";
import { toast, toggleCompare } from "../js/ui.js";
import {
  renderVehicleCard,
  renderVehicleCardSkeletons
} from "../components/vehicleCard.js";
import { buildSocialLinks } from "../js/socialProfile.js";

/* ============================================================
   PHASE 2 — PUBLIC HUFA DEALERSHIP STOREFRONT (/dealership)
   ------------------------------------------------------------
   • One dedicated PUBLIC SPA route for dealership profiles:
       /dealership?id=<dealer-profile-id>
     Registered in js/router.js (never in protectedRoutes).
   • DEALERSHIP-ONLY SAFETY: the page verifies
       profiles.account_type === "dealer"
     (and that the account is not suspended). A private seller
     id resolves to the same clean "Dealership not found"
     state — private sellers are never rendered here, never
     converted, and keep their existing /seller?id= page.
   • DATA — existing architecture only, TWO queries total
     (no N+1):
       1. profiles row   — select("*") so the storefront renders
          whichever contact/social columns actually exist in the
          active database and falls back gracefully for the rest
          (Phase 2 columns dealership_email / dealership_address /
          social_links are used ONLY when present).
       2. vehicles       — seller_id = profile id AND
          status = "active" (the same public rule Browse uses).
   • INVENTORY — client-side search (make / model / keyword) and
     compact Make / Model / Price / Sort filters over the fetched
     inventory. The shared HUFA vehicle card (components/
     vehicleCard.js) renders every vehicle; clicks open the
     EXISTING /vehicle?id= detail route.
   • SOCIAL LINKS — the existing js/socialProfile.js builder;
     only platforms with a real, usable value are rendered.
   • SEO — the existing router SEO pipeline (updateSEO) with
     REAL data only: dealership name, location, live count.
   • No schema changes, no auth changes, no dashboard changes.
   ============================================================ */

/* ---------------------------- */
/* MODULE STATE (reset on init) */
/* ---------------------------- */

let dealer = null;
let vehicles = [];
let inventoryError = false;

let searchTerm = "";
let makeFilter = "";
let modelFilter = "";
let priceFilter = "any";
let sortMode = "recommended"; // recommended | newest | priceAsc | priceDesc

let savedSet = new Set();

/* ---------- INLINE SVG ICONS ---------- */

/* The Material Symbols subset loaded by index.html is frozen to a
   fixed ligature list (audited) and contains no phone/mail/pin
   icons — so the storefront uses small inline stroke SVGs for its
   own UI chrome, exactly like js/socialProfile.js does for brand
   icons. Nothing here replaces existing site icons. */

const ICONS = {

  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,

  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>`,

  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,

  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,

  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`,

  car: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 16.5h14"/><path d="M6 16.5 5 11l1.5-5h11L19 11l-1 5.5"/><circle cx="7.75" cy="16.5" r="1.5"/><circle cx="16.25" cy="16.5" r="1.5"/></svg>`

};

/* PRICE BANDS — client-side buckets over the EXISTING vehicles.price
   field. No database fields are invented. */

const PRICE_BANDS = [
  { id: "any",      label: "Any Price",             min: null,   max: null },
  { id: "under100", label: "Under R 100 000",       min: null,   max: 99999 },
  { id: "100to250", label: "R 100 000 – R 250 000", min: 100000, max: 250000 },
  { id: "250to500", label: "R 250 000 – R 500 000", min: 250001, max: 500000 },
  { id: "over500",  label: "Over R 500 000",        min: 500001, max: null }
];

/* ============================================================
   PAGE ENTRY — same mount pattern as pages/seller.js
   ============================================================ */

export function DealershipPage() {

setTimeout(init, 0);

return `
<div class="dstore-page">

<div id="dealerBox">
${renderDealerSkeleton()}
</div>

<div id="dealerInventory">
${renderInventorySkeleton()}
</div>

</div>
`;

}

/* ========================== */
/* LOADING SKELETONS          */
/* ========================== */

function renderDealerSkeleton() {

return `
<div class="dstore-hero">

<div class="dstore-hero-id">

<div class="skeleton-shimmer dstore-logo"></div>

<div class="dstore-id-main">
<div class="skeleton-shimmer dstore-skel-line" style="width:118px"></div>
<div class="skeleton-shimmer dstore-skel-line" style="width:min(280px,70%);height:30px"></div>
<div class="skeleton-shimmer dstore-skel-line" style="width:min(200px,55%)"></div>
<div class="skeleton-shimmer dstore-skel-line" style="width:min(320px,80%);height:44px;border-radius:12px"></div>
</div>

</div>

<div class="dstore-hero-side">
<div class="skeleton-shimmer dstore-skel-line" style="width:70px;height:38px"></div>
</div>

</div>
`;

}

function renderInventorySkeleton() {

return `
<section class="dstore-section">

<div class="dstore-toolbar">
<div class="skeleton-shimmer dstore-skel-line" style="height:44px;border-radius:12px;margin-bottom:0"></div>
</div>

<div class="dstore-grid">
${renderVehicleCardSkeletons(6)}
</div>

</section>
`;

}

/* ========================== */
/* INIT                        */
/* ========================== */

async function init() {

const id =
new URLSearchParams(window.location.search).get("id");

/* No ID / invalid deep link → safe error state. */

if (!id) {
renderError();
return;
}

/* Reset per-mount state so back/forward navigation between
   different dealerships is always clean. */

dealer = null;
vehicles = [];
inventoryError = false;
searchTerm = "";
makeFilter = "";
modelFilter = "";
priceFilter = "any";
sortMode = "recommended";
savedSet = new Set();

/* TWO QUERIES TOTAL (no N+1):
   1. the dealership profile  — select("*") so the storefront
      uses whichever Phase 2 contact/social columns actually
      exist in the active database and degrades gracefully
      for the rest (a missing column would make an explicit
      column list fail the whole query).
   2. the active inventory    — the SAME public rule Browse
      uses: vehicles.seller_id = profile id AND
      status = "active". */

const [profileRes, vehiclesRes] =
await Promise.all([

supabase
.from("profiles")
.select("*")
.eq("id", id)
.single(),

supabase
.from("vehicles")
.select("*")
.eq("seller_id", id)
.eq("status", "active")
.order("created_at", { ascending: false })

]);

const profile =
profileRes?.data || null;

if (profileRes?.error) {
console.error("Dealership storefront profile query failed:", profileRes.error);
}

/* DEALERSHIP-ONLY GUARD — every failure resolves to the SAME
   safe "Dealership not found" state:
   • missing profile            → not found
   • account_type !== "dealer"  → not found (a private seller is
                                  never rendered, converted or
                                  redirected here)
   • suspended dealer           → not found (the same public rule
                                  the directory applies) */

const isDealerProfile =
!!profile &&
profile.account_type === "dealer";

const isPubliclyVisible =
!!profile &&
profile.suspended !== true;

if (!profile || !isDealerProfile || !isPubliclyVisible) {
renderError();
return;
}

dealer = profile;

if (vehiclesRes?.error) {
/* Clean user-facing error — the raw Supabase error is only
   logged, never displayed. */
console.error("Dealership inventory query failed:", vehiclesRes.error);
inventoryError = true;
} else {
vehicles = Array.isArray(vehiclesRes.data) ? vehiclesRes.data : [];
}

renderDealer();
renderInventory();

/* Non-blocking: card hearts reflect the viewer's saved set
   (same behaviour as the seller page). */

loadSavedSet();

updateSEOForDealer();

}

/* ========================== */
/* SAFE ERROR STATE           */
/* ========================== */

function renderError() {

const box =
document.getElementById("dealerBox");

if (box) {

box.innerHTML = `
<div class="dstore-error">

<div class="dstore-empty-icon">${ICONS.car}</div>

<p class="dstore-error-eyebrow">HUFA Dealerships</p>

<h1 class="dstore-error-title">Dealership not found</h1>

<p class="dstore-error-text">
This dealership profile is not available on HUFA. It may be a private seller profile (private sellers have their own page), or the link may be incorrect.
</p>

<div class="dstore-error-actions">
<button type="button" onclick="goToDealerships()" class="dstore-btn dstore-btn-blue">Browse Dealerships</button>
<button type="button" onclick="browseAllVehicles()" class="dstore-btn dstore-btn-ghost">Browse All Vehicles</button>
</div>

</div>
`;

}

const inv =
document.getElementById("dealerInventory");

if (inv) {
inv.innerHTML = "";
}

/* Existing SEO pipeline — static, honest fallback text. */

updateSEO({
title: "Dealership Not Found | Helpufin Auto",
description: "The requested dealership could not be found on Helpufin Auto. Browse dealerships and vehicles across South Africa."
});

}

/* ========================== */
/* SAVED SET (non-blocking)   */
/* ========================== */

async function loadSavedSet() {

try {

const { data: userData } =
await supabase.auth.getUser();

if (!userData?.user) {
return;
}

const { data, error } =
await supabase
.from("saved_vehicles")
.select("vehicle_id")
.eq("user_id", userData.user.id);

if (error || !data) {
return;
}

savedSet =
new Set(data.map((r) => r.vehicle_id));

/* Re-render the grid only if it is already on screen so
   card hearts pick up the saved state. */

const grid =
document.getElementById("dealerGrid");

if (grid && vehicles.length) {
renderGrid();
}

} catch (_) {
/* Non-blocking by design — hearts just stay unsaved. */

}

}

/* ========================== */
/* IDENTITY / FIELD HELPERS   */
/* ========================== */

function displayName() {

const dealershipName =
(dealer?.dealership_name || "").trim();

if (dealershipName) {
return dealershipName;
}

const personal =
`${(dealer?.name || "").trim()} ${(dealer?.surname || "").trim()}`.trim();

return personal || "HUFA Dealership";

}

function dealerPhone() {
/* profiles.phone is the dealership phone — the active database
   has no web site/mobile_number columns on public.profiles. */
return (dealer?.phone || "").trim();
}

function dealerEmail() {
const value = (dealer?.dealership_email || "").trim();
/* Only usable when it is really an email address. */
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : "";
}

function dealerAddress() {
return (dealer?.dealership_address || "").trim();
}

function phoneDigits(phone) {
return String(phone || "").replace(/[^+\d]/g, "");
}

function locationLine() {

/* public.profiles has NO city/province columns (Phase 4 verified).
   Location is the real dealership_address when present, otherwise
   a neutral fallback. Nothing is inferred from an address string. */
const address = (dealer?.dealership_address || "").trim();

if (address) return address;
return "South Africa";

}

function initialsOf(name) {

const source = (name || "").trim();

if (!source) return "HU";

const words =
source.split(/\s+/).filter(Boolean);

if (!words.length) return "HU";

if (words.length === 1) {
return words[0].slice(0, 2).toUpperCase();
}

return (
words[0].charAt(0) +
words[1].charAt(0)
).toUpperCase();

}

function esc(value) {

return String(value ?? "")
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;")
.replace(/'/g, "&#39;");

}

/* ========================== */
/* HERO / IDENTITY            */
/* ========================== */

function renderDealer() {

const box =
document.getElementById("dealerBox");

if (!box || !dealer) {
return;
}

const name = displayName();
const initial = initialsOf(name);
const logo = (dealer.dealership_logo || dealer.avatar_url || "").trim();
const location = locationLine();
const verified = dealer.verified_dealer === true;
const count = vehicles.length;
const countWord = count === 1 ? "Vehicle" : "Vehicles";

/* LOGO — existing Phase 1 directory fallback treatment:
   real image when available, initials block when not, and an
   onerror swap so a broken logo URL never shows a broken image. */

const logoBlock = logo
? `
<img
src="${esc(logo)}"
alt="${esc(name)}"
loading="lazy"
decoding="async"
draggable="false"
onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
class="dstore-logo"
>
<div class="dstore-logo dstore-logo-fallback" style="display:none">${esc(initial)}</div>
`
: `
<div class="dstore-logo dstore-logo-fallback">${esc(initial)}</div>
`;

/* CONTACT ACTIONS — only rendered when the profile actually
   carries the data. tel: / mailto: / a safe encoded Google Maps
   SEARCH url (no invented coordinates, no map embed). */

const phone = dealerPhone();
const email = dealerEmail();
const address = dealerAddress();

const actions = [];

if (phone) {
actions.push(`
<a class="dstore-btn dstore-btn-blue" href="tel:${esc(phoneDigits(phone))}" aria-label="Call ${esc(name)}">
${ICONS.phone}<span>Call</span>
</a>
`);
}

if (email) {
actions.push(`
<a class="dstore-btn dstore-btn-ghost" href="mailto:${esc(email)}" aria-label="Email ${esc(name)}">
${ICONS.mail}<span>Email</span>
</a>
`);
}

if (address) {

/* Safe Google Maps SEARCH from the real address only — no
   city/province columns exist, no coordinates are invented. */
const query =
encodeURIComponent(
[address]
.filter(Boolean)
.join(", ")
);

actions.push(`
<a class="dstore-btn dstore-btn-ghost" href="https://www.google.com/maps/search/?api=1&query=${query}" target="_blank" rel="noopener" aria-label="Get directions to ${esc(name)}">
${ICONS.pin}<span>Get Directions</span>
</a>
`);

}

/* SOCIAL LINKS — the existing builder returns ONLY platforms
   with a real, usable value. Empty icons are never rendered. */

const socials = buildSocialLinks(dealer.social_links)
.map((l) => `
<a class="dstore-social" href="${esc(l.href)}" target="_blank" rel="noopener" aria-label="${esc(name)} on ${esc(l.label)}" title="${esc(l.label)}">
${l.icon}
</a>
`)
.join("");

/* ABOUT — public.profiles has no description/bio column
   (Phase 4 verified), so the storefront uses one restrained
   neutral fallback. Nothing is invented. */

const about =
"Explore this dealership's current vehicle inventory on HUFA.";

/* CONTACT DETAILS CARD — same "only real data" rule. */

const rows = [];

if (phone) {
rows.push(`
<li>
<span class="dstore-contact-label">Phone</span>
<a class="dstore-contact-value dstore-contact-link" href="tel:${esc(phoneDigits(phone))}">${esc(phone)}</a>
</li>
`);
}

if (email) {
rows.push(`
<li>
<span class="dstore-contact-label">Email</span>
<a class="dstore-contact-value dstore-contact-link" href="mailto:${esc(email)}">${esc(email)}</a>
</li>
`);
}

if (address) {
rows.push(`
<li>
<span class="dstore-contact-label">Address</span>
<span class="dstore-contact-value">${esc(address)}</span>
</li>
`);
}

box.innerHTML = `
<section class="dstore-hero">

<div class="dstore-hero-id">

${logoBlock}

<div class="dstore-id-main">

<div class="dstore-eyebrow">HUFA Dealership</div>

<h1 class="dstore-name">${esc(name)}</h1>

${verified ? `
<div class="dstore-verified">
${ICONS.check}<span>Verified Dealer</span>
</div>
` : ""}

<div class="dstore-location">
${ICONS.pin}<span>${esc(location)}</span>
</div>

<div class="dstore-actions">
${actions.length ? actions.join("") : `<span class="dstore-actions-empty">Contact details not published</span>`}
</div>

</div>

</div>

<div class="dstore-hero-side">

<div class="dstore-count-num">${count.toLocaleString()}</div>
<div class="dstore-count-label">${esc(countWord)}</div>

${socials ? `
<div class="dstore-socials">
${socials}
</div>
` : ""}

</div>

</section>

<div class="dstore-columns">

<section class="dstore-card">
<h2 class="dstore-card-title">About this dealership</h2>
<p class="dstore-about-text">${esc(about)}</p>
</section>

<section class="dstore-card">
<h2 class="dstore-card-title">Contact &amp; location</h2>
<ul class="dstore-contact-list">
${rows.length ? rows.join("") : `<li class="dstore-contact-empty">Contact details for this dealership are not published yet. Open any listed vehicle to enquire.</li>`}
</ul>
</section>

</div>
`;

}

/* ========================== */
/* INVENTORY SECTION          */
/* ========================== */

function renderInventory() {

const wrap =
document.getElementById("dealerInventory");

if (!wrap) {
return;
}

/* QUERY ERROR — clean user-facing message, no raw
   Supabase error text anywhere. */

if (inventoryError) {

wrap.innerHTML = `
<section class="dstore-section">
<div class="dstore-error dstore-error-soft">
<p class="dstore-error-text">
We couldn't load this dealership's inventory right now. Please try again in a moment.
</p>
</div>
</section>
`;

return;

}

const total = vehicles.length;

/* NO INVENTORY — clean empty state, nothing fabricated. */

if (!total) {

wrap.innerHTML = `
<section class="dstore-section">

<div class="dstore-section-head">
<div>
<div class="dstore-eyebrow">Dealership Inventory</div>
<h2 class="dstore-section-title">Vehicles from this dealership</h2>
</div>
</div>

<div class="dstore-empty">
<div class="dstore-empty-icon">${ICONS.car}</div>
<p class="dstore-empty-title">No vehicles currently listed</p>
<p class="dstore-empty-text">This dealership has no active vehicle listings at the moment.</p>
<button type="button" onclick="browseAllVehicles()" class="dstore-btn dstore-btn-orange">Browse All Vehicles</button>
</div>

</section>
`;

return;

}

/* INVENTORY SHELL — the toolbar + grid; renderGrid() fills it. */

wrap.innerHTML = `
<section class="dstore-section">

<div class="dstore-section-head">
<div>
<div class="dstore-eyebrow">Dealership Inventory</div>
<h2 class="dstore-section-title">Vehicles from this dealership</h2>
</div>
<div class="dstore-count" id="dealerInvCount"></div>
</div>

<div class="dstore-toolbar">

<div class="dstore-search-wrap">
${ICONS.search}
<input
id="dealerSearchInput"
class="dstore-search"
type="text"
placeholder="Search vehicles (make, model, keyword)..."
aria-label="Search this dealership's vehicle inventory"
value="${esc(searchTerm)}"
oninput="dealerSearchInput(this.value)"
>
</div>

<div class="dstore-filters">
<select id="dealerMake" class="premium-select premium-select-sm dstore-select" aria-label="Filter by make" onchange="dealerMakeChange(this.value)"></select>
<select id="dealerModel" class="premium-select premium-select-sm dstore-select" aria-label="Filter by model" onchange="dealerModelChange(this.value)"></select>
<select id="dealerPrice" class="premium-select premium-select-sm dstore-select" aria-label="Filter by price" onchange="dealerPriceChange(this.value)">
${PRICE_BANDS.map((b) => `<option value="${b.id}"${b.id === priceFilter ? " selected" : ""}>${b.label}</option>`).join("")}
</select>
<select id="dealerSort" class="premium-select premium-select-sm dstore-select" aria-label="Sort inventory" onchange="dealerSortChange(this.value)">
<option value="recommended"${sortMode === "recommended" ? " selected" : ""}>Recommended</option>
<option value="newest"${sortMode === "newest" ? " selected" : ""}>Newest</option>
<option value="priceAsc"${sortMode === "priceAsc" ? " selected" : ""}>Price: Low to High</option>
<option value="priceDesc"${sortMode === "priceDesc" ? " selected" : ""}>Price: High to Low</option>
</select>
</div>

</div>

<div class="dstore-grid" id="dealerGrid"></div>
<div id="dealerEmpty" class="dstore-empty" hidden></div>

</section>
`;

renderFilterOptions();
renderGrid();

}

/* ---------- FILTER OPTIONS (derived from real inventory) ---------- */

function makeOptions() {
return [...new Set(
vehicles
.map((v) => (v.make || "").trim())
.filter(Boolean)
)].sort((a, b) => a.localeCompare(b));
}

function modelOptions() {

const pool =
makeFilter
? vehicles.filter((v) => (v.make || "").trim() === makeFilter)
: vehicles;

return [...new Set(
pool
.map((v) => (v.model || "").trim())
.filter(Boolean)
)].sort((a, b) => a.localeCompare(b));

}

function renderFilterOptions() {

const makeEl =
document.getElementById("dealerMake");

const modelEl =
document.getElementById("dealerModel");

const priceEl =
document.getElementById("dealerPrice");

const sortEl =
document.getElementById("dealerSort");

if (makeEl) {
makeEl.innerHTML =
`<option value="">All Makes</option>` +
makeOptions()
.map((m) => `<option value="${esc(m)}"${m === makeFilter ? " selected" : ""}>${esc(m)}</option>`)
.join("");
}

if (modelEl) {
modelEl.innerHTML =
`<option value="">All Models</option>` +
modelOptions()
.map((m) => `<option value="${esc(m)}"${m === modelFilter ? " selected" : ""}>${esc(m)}</option>`)
.join("");
}

if (priceEl) {
priceEl.value = priceFilter;
}

if (sortEl) {
sortEl.value = sortMode;
}

}

/* ---------- FILTER + SORT PIPELINE ---------- */

function visibleVehicles() {

const term =
searchTerm.trim().toLowerCase();

const band =
PRICE_BANDS.find((b) => b.id === priceFilter) || PRICE_BANDS[0];

let list =
vehicles.filter((v) => {

if (makeFilter && (v.make || "").trim() !== makeFilter) {
return false;
}

if (modelFilter && (v.model || "").trim() !== modelFilter) {
return false;
}

if (band.id !== "any") {

const price = Number(v.price || 0);

if (band.min != null && price < band.min) {
return false;
}

if (band.max != null && price > band.max) {
return false;
}

}

/* SEARCH — make / model / keyword across the vehicle's own
   existing descriptive fields. No separate search architecture. */

if (term) {

const haystack = [
v.make,
v.model,
v.year,
v.body_type,
v.fuel_type,
v.transmission,
v.colour,
v.description
]
.map((x) => String(x || "").toLowerCase())
.join(" ");

if (!haystack.includes(term)) {
return false;
}

}

return true;

});

/* SORT — terminology reuses the existing marketplace options
   (Recommended / Newest / Price: Low to High / Price: High to Low).
   Recommended mirrors the marketplace default: featured first,
   then newest. */

const byNewest =
(a, b) =>
String(b.created_at || "").localeCompare(String(a.created_at || ""));

const byPrice =
(dir) =>
(a, b) =>
(Number(a.price || 0) - Number(b.price || 0)) * dir;

if (sortMode === "newest") {
list = [...list].sort(byNewest);
} else if (sortMode === "priceAsc") {
list = [...list].sort(byPrice(1));
} else if (sortMode === "priceDesc") {
list = [...list].sort(byPrice(-1));
} else {
list = [...list].sort((a, b) =>
(Number(b.is_featured === true) - Number(a.is_featured === true)) ||
byNewest(a, b)
);
}

return list;

}

/* ---------- GRID RENDER ---------- */

function renderGrid() {

const grid =
document.getElementById("dealerGrid");

const empty =
document.getElementById("dealerEmpty");

if (!grid || !empty) {
return;
}

const list =
visibleVehicles();

const total = vehicles.length;

/* INVENTORY COUNT — real active inventory; when the current
   filters narrow it, the label says so. Never fabricated. */

const countEl =
document.getElementById("dealerInvCount");

if (countEl) {

const word = list.length === 1 ? "Vehicle" : "Vehicles";

countEl.textContent =
list.length === total
? `${total.toLocaleString()} ${word}`
: `${list.length.toLocaleString()} of ${total.toLocaleString()} ${word}`;

}

if (!list.length) {

grid.innerHTML = "";
empty.hidden = false;
empty.innerHTML = `
<div class="dstore-empty-icon">${ICONS.search}</div>
<p class="dstore-empty-title">No Vehicles Found</p>
<p class="dstore-empty-text">We couldn't find a vehicle matching your search in this dealership's inventory.</p>
<button type="button" onclick="clearDealerSearch()" class="dstore-btn dstore-btn-orange">Clear Search</button>
`;

return;

}

empty.hidden = true;
empty.innerHTML = "";

grid.innerHTML = list
.map((v) =>
renderVehicleCard(v, {
layout: "grid",
actions: "browse",
saved: savedSet.has(v.id)
})
)
.join("");

}

/* ========================== */
/* GLOBALS (inline handlers)  */
/* ========================== */

/* Vehicle navigation uses the EXISTING /vehicle?id= route and the
   existing SPA navigate() mechanism — the same globals every other
   page already defines. */

window.viewVehicle = (id) => {
if (id) navigate("/vehicle?id=" + id);
};

window.toggleCompare = toggleCompare;

window.browseAllVehicles = () => navigate("/browse");

window.goToDealerships = () => navigate("/dealerships");

window.dealerSearchInput = function (value) {
searchTerm = value || "";
renderGrid();
};

window.dealerMakeChange = function (value) {

makeFilter = value || "";

/* Model list depends on the make — a stale model choice is
   reset automatically. */

if (modelFilter && !modelOptions().includes(modelFilter)) {
modelFilter = "";
}

renderFilterOptions();
renderGrid();

};

window.dealerModelChange = function (value) {
modelFilter = value || "";
renderGrid();
};

window.dealerPriceChange = function (value) {
priceFilter = value || "any";
renderGrid();
};

window.dealerSortChange = function (value) {
sortMode = value || "recommended";
renderGrid();
};

window.clearDealerSearch = function () {

searchTerm = "";
makeFilter = "";
modelFilter = "";
priceFilter = "any";
sortMode = "recommended";

renderFilterOptions();

const input =
document.getElementById("dealerSearchInput");

if (input) {
input.value = "";
}

renderGrid();

};

/* SAVE — identical flow to the seller page so card hearts behave
   exactly the same everywhere. */

window.toggleSave = async function (id) {

if (!id) return;

const { data: userData } =
await supabase.auth.getUser();

if (!userData?.user) {
toast("Login to save vehicles");
navigate("/login");
return;
}

if (savedSet.has(id)) {

const { error } =
await supabase
.from("saved_vehicles")
.delete()
.eq("vehicle_id", id)
.eq("user_id", userData.user.id);

if (error) {
toast("Failed to remove vehicle");
return;
}

savedSet.delete(id);
toast("Removed from saved");

} else {

const { error } =
await supabase
.from("saved_vehicles")
.upsert(
{ user_id: userData.user.id, vehicle_id: id },
{ onConflict: "user_id,vehicle_id" }
);

if (error) {
toast("Failed to save vehicle");
return;
}

savedSet.add(id);
toast("Saved vehicle");

}

renderGrid();

};

/* ========================== */
/* SEO (existing pipeline)    */
/* ========================== */

/* Uses the router's own updateSEO helper. ONLY real data is
   injected: dealership name, real location, real live count.
   No fabricated marketing claims. */

function updateSEOForDealer() {

if (!dealer) {
return;
}

const name = displayName();
const location = locationLine();
const count = vehicles.length;

const locPart =
location && location !== "South Africa"
? ` in ${location}`
: "";

const invPart =
count
? `${count.toLocaleString()} ${count === 1 ? "vehicle" : "vehicles"} currently listed`
: "View their current vehicle inventory";

updateSEO({
title: `${name} | Helpufin Auto`,
description: `${name}${locPart} — dealership on Helpufin Auto. ${invPart}.`
});

}
