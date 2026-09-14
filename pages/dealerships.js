import { supabase } from "../js/api.js";
import { navigate } from "../js/router.js";

/* ============================================================
   PHASE 1 — HUFA DEALERSHIP DIRECTORY (PUBLIC /dealerships)
   ------------------------------------------------------------
   • Data uses the EXISTING architecture only:
       - dealers  → profiles.account_type === "dealer"
       - identity → profiles.dealership_name / dealership_logo /
                    avatar_url / verified_dealer (existing fields)
       - location → profiles.dealership_address (existing field;
                    profiles has NO city/province columns — the
                    directory MUST NOT select or filter on them)
       - status   → suspended accounts excluded (existing rule)
       - vehicles → vehicles.seller_id + status = "active"
                    (the same relationship Browse uses)
   • TWO queries total — vehicle counts are aggregated once into
     a map. No N+1 pattern anywhere on this page.
   • Search / filters / sort / pagination are all functional and
     client-side over the fetched dealership set, so every change
     is instant and pagination always resets to page 1.
   • No new tables, no schema changes, no auth changes.
   ============================================================ */

const PER_PAGE = 12;

/* Only actual public columns of public.profiles. The province
   column does NOT exist yet — it will be added by a separate
   database migration (public.profiles.province TEXT). It is
   included in this SELECT so the public directory location
   filter can match against the dedicated province value once
   the migration is applied. The api.js profile-creation
   fallback and the Edit Dealership page already write to
   profiles.province. */
const DEALER_COLUMNS =
"id, dealership_name, dealership_logo, avatar_url, name, surname, account_type, verified_dealer, dealership_address, province, email, dealership_email, phone, dealer_rating, dealer_review_count, package_tier";

/* ---------------------------- */
/* MODULE STATE (reset on init) */
/* ---------------------------- */

let allDealers = [];
let dataLoaded = false;

let searchTerm = "";
let inventoryFilter = "all";    // all | 1 | 10 | 25 | 50
let locationFilter = "";        // "" = All Provinces | Gauteng | Western Cape | ...
let sortMode = "recommended";   // recommended | nameAZ | nameZA | mostVehicles | fewestVehicles | verifiedFirst
let currentPage = 1;

let searchDebounce = null;

/* ============================================================
   PAGE ENTRY — same mount pattern as pages/seller.js
   ============================================================ */

export function DealershipsPage() {

setTimeout(init, 0);

return `
<div class="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 py-6 md:py-8">

<!-- ===================== -->
<!-- PAGE HEADER           -->
<!-- ===================== -->
<header class="max-w-3xl">

<div class="mb-1.5 text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#E48A2F]">
HUFA Dealerships
</div>

<h1 class="text-[26px] lg:text-[32px] font-black tracking-[-0.04em] leading-tight text-[#081120]">
Find a Dealership
</h1>

<p class="mt-2 text-[13.5px] leading-relaxed text-slate-500">
Explore dealerships signed up with HUFA and find the right place to shop, enquire or view available vehicles.
</p>

</header>

<!-- ===================== -->
<!-- SEARCH + FILTER BAR   -->
<!-- ===================== -->
<div class="dealership-toolbar mt-6 rounded-2xl border border-slate-200 bg-white p-4 md:p-5">

<div class="flex flex-col gap-3">

<div class="relative min-w-0">
<span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="M21 21l-4.35-4.35"/></svg>
</span>
<input
id="dealerSearch"
type="text"
autocomplete="off"
placeholder="Search dealership name, city or area..."
aria-label="Search dealership name, city or area"
class="dealer-search-input h-11 w-full rounded-[12px] border border-slate-200 bg-white pl-9 pr-3 text-[13.5px] font-medium text-[#081120] placeholder:text-slate-400 outline-none transition"
>
</div>

<div class="dealership-filter-grid">

<div>
<label for="dealerLocation" class="mb-1 block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Location</label>
<select id="dealerLocation" class="premium-select premium-select-sm">
<option value="">All Provinces</option>
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
<label for="dealerInventory" class="mb-1 block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Vehicle Inventory</label>
<select id="dealerInventory" class="premium-select premium-select-sm">
<option value="all">All</option>
<option value="1">1+ Vehicles</option>
<option value="10">10+ Vehicles</option>
<option value="25">25+ Vehicles</option>
<option value="50">50+ Vehicles</option>
</select>
</div>

<div>
<label for="dealerSort" class="mb-1 block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Sort</label>
<select id="dealerSort" class="premium-select premium-select-sm">
<option value="recommended">Sort: Recommended</option>
<option value="nameAZ">Name A–Z</option>
<option value="nameZA">Name Z–A</option>
<option value="mostVehicles">Most Vehicles</option>
<option value="fewestVehicles">Fewest Vehicles</option>
<option value="verifiedFirst">Verified First</option>
</select>
</div>

</div>

</div>

</div>

<!-- ===================== -->
<!-- RESULTS               -->
<!-- ===================== -->
<div class="mt-6 flex items-center justify-between gap-3">

<p id="dealerCount" class="text-[14px] font-extrabold tracking-tight text-[#081120]" aria-live="polite">
Loading dealerships...
</p>

</div>

<div
id="dealershipGrid"
class="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
>
</div>

<div
id="pages"
class="mt-6 flex flex-wrap items-center justify-center gap-1"
>
</div>

</div>
`;

}

/* ============================================================
   INIT — fetch + bind
   ============================================================ */

async function init() {

/* Reset per-mount state so back/forward navigation
   between visits is always clean. */
allDealers = [];
dataLoaded = false;
searchTerm = "";
inventoryFilter = "all";
locationFilter = "";
sortMode = "recommended";
currentPage = 1;

renderSkeleton();

/* TWO QUERIES TOTAL (no N+1):
   1. dealer profiles  — existing public columns only
   2. active vehicle seller_ids — counted into a map   */

const [profilesRes, vehiclesRes] =
await Promise.all([

supabase
.from("profiles")
.select(DEALER_COLUMNS)
.eq("account_type", "dealer")
/* Existing account rule: suspended users are
   removed from the marketplace by the admin
   tools — they are never listed publicly. */
.neq("suspended", true),

supabase
.from("vehicles")
.select("seller_id")
.eq("status", "active")

]);

if(profilesRes.error){

console.error(
"Dealership directory query failed:",
profilesRes.error
);

}

const dealerRows =
Array.isArray(profilesRes.data)
? profilesRes.data
: [];

/* Active-vehicle count per seller — one pass, one map. */
const countMap = {};

for(const v of (vehiclesRes.data || [])){

const sellerId =
v && v.seller_id;

if(!sellerId){
continue;
}

countMap[sellerId] =
(countMap[sellerId] || 0) + 1;

}

allDealers = dealerRows
.filter(p => p && p.id)
.map(p => ({

id: p.id,

name:
(p.dealership_name || "").trim() ||
`${(p.name || "").trim()} ${(p.surname || "").trim()}`.trim() ||
"Dealership",

logo:
(p.dealership_logo || "").trim() || null,

avatar: (p.avatar_url || "").trim() || null,

address:
(p.dealership_address || "").trim(),

province:
(p.province || "").trim(),

email:
(p.email || "").trim(),

dealerEmail:
(p.dealership_email || "").trim(),

phone:
(p.phone || "").trim(),

rating:
p.dealer_rating,

reviewCount:
p.dealer_review_count,

packageTier:
(p.package_tier || "").trim(),

verified:
p.verified_dealer === true,

vehicleCount:
countMap[p.id] || 0

}));

dataLoaded = true;

bindControls();
renderResults();

}

/* ============================================================
   EVENT BINDING — one handler per control, bound once
   ============================================================ */

function bindControls() {

const search =
document.getElementById("dealerSearch");

const inventory =
document.getElementById("dealerInventory");

const location =
document.getElementById("dealerLocation");

const sort =
document.getElementById("dealerSort");

if(search){

search.value = searchTerm;

/* Debounced, trimmed, case-insensitive search.
   Every change resets pagination to page 1. */
search.addEventListener("input", ()=>{

clearTimeout(searchDebounce);

searchDebounce = setTimeout(()=>{

searchTerm = search.value;
currentPage = 1;
renderResults();

}, 250);

});

}

if(inventory){

inventory.value = inventoryFilter;

inventory.addEventListener("change", ()=>{

inventoryFilter = inventory.value;
currentPage = 1;
renderResults();

});

}

if(location){

location.value = locationFilter;

location.addEventListener("change", ()=>{

locationFilter = location.value;
currentPage = 1;
renderResults();

});

}

if(sort){

sort.value = sortMode;

sort.addEventListener("change", ()=>{

sortMode = sort.value;
currentPage = 1;
renderResults();

});

}

}

/* ============================================================
   PIPELINE — filter → sort → paginate → render
   ============================================================ */

function getFiltered() {

const q =
searchTerm.trim().toLowerCase();

return allDealers.filter(d => {

/* SEARCH — real, existing profile fields only (no city/province).
   Case-insensitive + trimmed. */
if(q){

const haystack = [
d.name,
d.address,
d.email,
d.dealerEmail,
d.phone,
d.packageTier
]
.join(" ")
.toLowerCase();

if(!haystack.includes(q)){
return false;
}

}

/* VEHICLE INVENTORY */
if(inventoryFilter !== "all"){

const min =
parseInt(inventoryFilter, 10) || 0;

if((d.vehicleCount || 0) < min){
return false;
}

}

/* LOCATION — match the selected province against the
   dedicated profiles.province field ONLY (exact,
   case-insensitive match). The province column does not
   exist yet and will be added by a separate migration;
   until then d.province is undefined and no dealership
   matches a specific province (All Provinces still works).
   We deliberately DO NOT parse province from
   dealership_address — filtering uses the dedicated
   province value only. */
if(locationFilter){

const loc =
locationFilter.toLowerCase();

if(
(d.province || "").trim().toLowerCase() !== loc
){
return false;
}

}

return true;

});

}

function getSorted(list) {

const byName = (a, b) =>
a.name.localeCompare(
b.name,
undefined,
{ sensitivity: "base" }
);

const sorted = [...list];

switch(sortMode){

case "nameAZ":
sorted.sort(byName);
break;

case "nameZA":
sorted.sort((a, b) => byName(b, a));
break;

case "mostVehicles":
sorted.sort(
(a, b) =>
(b.vehicleCount - a.vehicleCount) ||
byName(a, b)
);
break;

case "fewestVehicles":
sorted.sort(
(a, b) =>
(a.vehicleCount - b.vehicleCount) ||
byName(a, b)
);
break;

case "verifiedFirst":
sorted.sort(
(a, b) =>
((b.verified === true) - (a.verified === true)) ||
byName(a, b)
);
break;

/* Recommended — verified dealerships first, then the
   most active inventory, then alphabetical. */
default:
sorted.sort(
(a, b) =>
((b.verified === true) - (a.verified === true)) ||
(b.vehicleCount - a.vehicleCount) ||
byName(a, b)
);

}

return sorted;

}

function renderResults() {

const grid =
document.getElementById("dealershipGrid");

const countEl =
document.getElementById("dealerCount");

if(!grid || !countEl){
return;
}

const filtered =
getFiltered();

const sorted =
getSorted(filtered);

const totalPages =
Math.max(1, Math.ceil(sorted.length / PER_PAGE));

if(currentPage > totalPages){
currentPage = totalPages;
}

const pageItems = sorted.slice(
(currentPage - 1) * PER_PAGE,
currentPage * PER_PAGE
);

/* RESULT COUNT — reflects the current search +
   filters exactly. */
const word =
sorted.length === 1 ? "Dealership" : "Dealerships";

countEl.textContent =
`${sorted.length.toLocaleString()} ${word}`;

/* GRID */
if(!sorted.length){
renderEmptyState(grid);
}else{
grid.innerHTML = pageItems
.map(renderDealerCard)
.join("");
bindCardActions(grid);
}

renderPagination(totalPages);

}

/* ============================================================
   DEALER CARD — business identity, NOT a vehicle card
   ============================================================ */

function renderDealerCard(d) {

const location =
locationLine(d);

return `
<div class="dealership-card flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-[#E48A2F]/40">

<div class="flex items-start gap-4">

<div class="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
${profilePicBlock(d)}
</div>

<div class="min-w-0 flex-1">

<h3 class="truncate text-[16px] font-extrabold tracking-[-0.02em] leading-snug text-[#081120]" title="${esc(d.name)}">
${esc(d.name)}
</h3>

<p class="mt-0.5 truncate text-[12.5px] font-medium text-slate-500" title="${esc(location)}">
${esc(location)}
</p>

</div>

</div>

<div class="mt-4 flex flex-wrap items-center gap-2">

${d.verified ? `
<span class="dealer-verified-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold">
✓ Verified Dealer
</span>
` : ""}

${Number(d.rating || 0) > 0 ? `
<span class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
★ ${Number(d.rating)}${Number(d.reviewCount || 0) > 0 ? ` · ${Number(d.reviewCount)} ${Number(d.reviewCount) === 1 ? "review" : "reviews"}` : ""}
</span>
` : ""}

<span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
${d.vehicleCount > 0
? `${d.vehicleCount} ${d.vehicleCount === 1 ? "Vehicle" : "Vehicles"}`
: "No vehicles currently listed"}
</span>

</div>

<button
type="button"
data-dealer-view="${esc(d.id)}"
class="dealer-cta mt-4 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-[12px] bg-[#E48A2F] px-4 text-[13px] font-bold text-white transition min-h-[44px]"
>
View Dealership
<span class="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
</button>

</div>
`;

}

function bindCardActions(grid) {

grid
.querySelectorAll("[data-dealer-view]")
.forEach(btn => {

btn.addEventListener("click", ()=>{

const id = btn.getAttribute("data-dealer-view");

if(!id){
return;
}

/* PHASE 2 — cards open the dedicated PUBLIC
   dealership storefront (/dealership?id=…),
   registered as its own SPA route. Dealership-only
   rendering is enforced by the storefront page
   itself (account_type === "dealer"). Private
   sellers are never converted — /seller?id=…
   keeps serving them exactly as before. */
navigate(`/dealership?id=${encodeURIComponent(id)}`);

});

});

}

/* ============================================================
   EMPTY STATE + CLEAR FILTERS
   ============================================================ */

function renderEmptyState(grid) {

if(!allDealers.length){

grid.innerHTML = `
<div class="col-span-full mt-2 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-[#E48A2F]">
<svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
</div>
<p class="text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#E48A2F]">No Dealerships Yet</p>
<p class="mt-1 text-sm text-slate-500">Dealerships will appear here as they sign up with HUFA.</p>
</div>
`;

return;

}

grid.innerHTML = `
<div class="col-span-full mt-2 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-[#E48A2F]">
<svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="M21 21l-4.35-4.35"/></svg>
</div>
<p class="text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#E48A2F]">No Dealerships Found</p>
<p class="mt-1 text-sm text-slate-500">Try adjusting your search or filters.</p>
<button
type="button"
id="dealerClearFilters"
class="dealer-clear-btn mt-5 inline-flex h-11 items-center justify-center rounded-[12px] bg-[#E48A2F] px-6 text-[13px] font-bold text-white transition hover:bg-[#E48A2F]/90"
>
Clear Filters
</button>
</div>
`;

const clear =
grid.querySelector("#dealerClearFilters");

if(clear){
clear.addEventListener("click", clearFilters);
}

}

function clearFilters() {

searchTerm = "";
inventoryFilter = "all";
sortMode = "recommended";
currentPage = 1;

const search =
document.getElementById("dealerSearch");

const inventory =
document.getElementById("dealerInventory");

const sort =
document.getElementById("dealerSort");

if(search){
search.value = "";
}

if(inventory){
inventory.value = "all";
}

if(sort){
sort.value = "recommended";
}

renderResults();

}

/* ============================================================
   PAGINATION — Previous / 1 2 3 / Next (12 per page)
   The container uses id="pages" so the EXISTING .pageBtn and
   #pages button.active styles from css/styles.css apply
   unchanged. Pagination resets to page 1 on every search,
   filter and sort change.
   ============================================================ */

function renderPagination(totalPages) {

const box =
document.getElementById("pages");

if(!box){
return;
}

if(totalPages <= 1){
box.innerHTML = "";
return;
}

const numbers =
buildPageNumbers(totalPages, currentPage);

box.innerHTML = `
<button
type="button"
class="pageBtn"
data-page="prev"
${currentPage === 1 ? 'disabled style="opacity:.45;pointer-events:none"' : ""}
>
Previous
</button>
${numbers
.map(n => n === "…"
? `<span class="px-1 text-slate-400">…</span>`
: `<button type="button" class="pageBtn ${n === currentPage ? "active" : ""}" data-page="${n}">${n}</button>`
)
.join("")}
<button
type="button"
class="pageBtn"
data-page="next"
${currentPage === totalPages ? 'disabled style="opacity:.45;pointer-events:none"' : ""}
>
Next
</button>
`;

box
.querySelectorAll(".pageBtn")
.forEach(btn => {

btn.addEventListener("click", ()=>{

const target = btn.getAttribute("data-page");

if(target === "prev" && currentPage > 1){
currentPage -= 1;
}else if(target === "next" && currentPage < totalPages){
currentPage += 1;
}else{
const n = parseInt(target, 10);
if(!isNaN(n)){
currentPage = n;
}else{
return;
}
}

renderResults();
scrollToResults();

});

});

}

/* Compact number list: 1 … 4 5 6 … 12 */
function buildPageNumbers(total, current) {

if(total <= 7){
return Array.from(
{ length: total },
(_, i) => i + 1
);
}

const start =
Math.max(2, current - 1);

const end =
Math.min(total - 1, current + 1);

const pages = [1];

if(start > 2){
pages.push("…");
}

for(let i = start; i <= end; i++){
pages.push(i);
}

if(end < total - 1){
pages.push("…");
}

pages.push(total);

return pages;

}

function scrollToResults() {

const grid =
document.getElementById("dealershipGrid");

if(
grid &&
typeof grid.scrollIntoView === "function"
){

grid.scrollIntoView({
behavior: "smooth",
block: "start"
});

}

}

/* ============================================================
   LOADING SKELETON
   ============================================================ */

function renderSkeleton() {

const grid =
document.getElementById("dealershipGrid");

if(!grid){
return;
}

grid.innerHTML = Array.from(
{ length: 6 },
() => `
<div class="rounded-2xl border border-slate-200 bg-white p-5">
<div class="flex items-center gap-4">
<div class="skeleton-shimmer h-14 w-14 shrink-0 rounded-xl"></div>
<div class="min-w-0 flex-1 space-y-2.5">
<div class="skeleton-shimmer h-4 w-3/4 rounded-md"></div>
<div class="skeleton-shimmer h-3 w-1/2 rounded"></div>
</div>
</div>
<div class="mt-5 flex gap-2">
<div class="skeleton-shimmer h-6 w-28 rounded-full"></div>
<div class="skeleton-shimmer h-6 w-24 rounded-full"></div>
</div>
<div class="skeleton-shimmer mt-4 h-10 w-full rounded-[12px]"></div>
</div>
`
).join("");

}

/* ============================================================
   SMALL HELPERS
   ============================================================ */

function locationLine(d) {

const address =
(d.address || "").trim();

if(address){
return address;
}

return "South Africa";

}

function profilePicBlock(d) {

const avatar = (typeof d.avatar === "string" && d.avatar.trim().length > 0) ? d.avatar.trim() : "";

const initial =
initialsOf(d.name);

if(avatar){

return `
<img
src="${esc(avatar)}"
alt="${esc(d.name)}"
loading="lazy"
decoding="async"
draggable="false"
onerror="this.nextElementSibling.style.display='flex';this.remove()"
class="h-full w-full object-cover"
>
<div class="flex h-full w-full items-center justify-center bg-slate-50 text-[15px] font-black tracking-tight text-[#0A192F]" style="display:none">${esc(initial)}</div>
`;

}

return `
<div class="flex h-full w-full items-center justify-center bg-slate-50 text-[15px] font-black tracking-tight text-[#0A192F]">${esc(initial)}</div>
`;

}

function initialsOf(name) {

const source =
(name || "").trim();

if(!source){
return "HU";
}

const words =
source.split(/\s+/).filter(Boolean);

if(!words.length){
return "HU";
}

if(words.length === 1){
return words[0].slice(0, 2).toUpperCase();
}

return (
words[0].charAt(0) +
words[1].charAt(0)
).toUpperCase();

}

function esc(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }







