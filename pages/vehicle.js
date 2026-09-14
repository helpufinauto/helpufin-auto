import {
supabase,
createVehicleInterest,
getUserProfile
} from "../js/api.js";
import { navigate } from "../js/router.js";
import {
openImage,
showModal,
closeModal,
toast,
compareButton,
toggleCompare,
getCompare
} from "../js/ui.js";
import { calculateMonthly } from "../js/financeEngine.js";
import { getFeatures } from "../js/catalog.js";
import { renderVehicleCardSkeletons } from "../components/vehicleCard.js";
import {
rankVehicles,
getPopularityMap
} from "../js/aiEngine.js";

import {
buildSocialLinks
} from "../js/socialProfile.js";
import { ensureScript } from "../js/cdnLoader.js";

/* =========================================
LUCIDE — ON-DEMAND, PINNED (Phase 7)
data-lucide icons exist only on this page, so the
library is fetched the first time the vehicle page
(or one of its modals/viewers) needs it. ensureScript
caches the promise, so repeat visits / SPA returns
never download it twice.
========================================= */

const LUCIDE_URL =
"https://unpkg.com/lucide@0.462.0/dist/umd/lucide.min.js";

function loadLucide(){

  return ensureScript(LUCIDE_URL).catch(() => {

    /* Library unavailable (e.g. offline) — icons stay as
       empty <i> placeholders exactly like a slow CDN would
       previously have left them. Never break the page. */

  });

}



/* =========================================
ðŸ”¥ PHASE 18 â€” SELLER IDENTITY (SHARED)
SINGLE SOURCE OF TRUTH used by BOTH the
Vehicle Detail page seller card AND the PDF
brochure "Offered By" block.

Identity always comes from the vehicle's
existing seller_id â†’ existing profiles row:

  â€¢ Image priority:
      1. profiles.dealership_logo
      2. profiles.avatar_url
      3. existing HUFA initials fallback

  â€¢ Names come from the existing profile
    fields (dealership_name / name / surname).

  â€¢ Nothing is hard-coded â€” no dealership
    names or sellers are baked in here.
========================================= */

function escapeVehicleHtml(value){

/* Built from character codes so the source
   never contains raw HTML entity sequences. */
const AMP = String.fromCharCode(38);
const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);
const QUOT = String.fromCharCode(34);

return String(value ?? "")
.split(AMP).join(AMP + "amp;")
.split(LT).join(AMP + "lt;")
.split(GT).join(AMP + "gt;")
.split(QUOT).join(AMP + "quot;")
.split("'").join(AMP + "#39;");

}

function computeSellerInitials(profile){

const dealership =
(profile?.dealership_name || "").trim();

const first =
(profile?.name || "").trim();

const surname =
(profile?.surname || "").trim();

/* Dealer accounts fall back to dealership
   initials; private sellers to personal
   initials â€” same HUFA fallback style. */
const source =
profile?.account_type === "dealer" && dealership
? dealership
: `${first} ${surname}`.trim();

if(!source){
return "HU";
}

const words =
source.split(/\s+/).filter(Boolean);

if(words.length >= 2){
return (
words[0].charAt(0) +
words[1].charAt(0)
).toUpperCase();
}

return (
source.slice(0, 2).toUpperCase() || "HU"
);

}

function resolveSellerIdentity(profile){

const logoUrl =
(profile?.dealership_logo || "").trim();

const avatarUrl =
(profile?.avatar_url || "").trim();

const dealershipName =
(profile?.dealership_name || "").trim();

const sellerName =
`${profile?.name || ""} ${profile?.surname || ""}`
.trim();

const isDealer =
profile?.account_type === "dealer";

return {

imageUrl:
logoUrl || avatarUrl || "",

dealershipName,

sellerName,

initials:
computeSellerInitials(profile),

isDealer,

/* PHASE 4 â€” dealership contact + social info
   from the SAME Phase 2/3 profile system.
   Only values actually provided are carried;
   the display layers render nothing for
   empty ones. */

email:
(profile?.dealership_email || "").trim(),

phone:
(profile?.phone || "").trim(),

address:
(profile?.dealership_address || "").trim(),

socialLinks:
buildSocialLinks(profile?.social_links || {})

};

}

/* Fetch the seller identity for a vehicle using
   the vehicle's EXISTING seller_id.

   PHASE 1 RESTORE â€” the extended select includes
   the Phase 2 dealership columns. If that
   migration has not been applied to the database
   yet, PostgREST rejects the unknown columns and
   the seller card + brochure "Offered By" block
   silently disappeared. The fetch now falls back
   to the ORIGINAL base columns so identity always
   renders; dealership contact/social extras simply
   stay empty until the migration exists. */

const SELLER_BASE_COLUMNS =
"dealership_logo, avatar_url, dealership_name, name, surname, account_type";

const SELLER_EXTENDED_COLUMNS =
SELLER_BASE_COLUMNS +
", dealership_email, phone, dealership_address, social_links";

async function fetchSellerIdentity(sellerId){

if(!sellerId){
return null;
}

async function loadProfile(columns){

try{

const { data, error } =
await supabase
.from("profiles")
.select(columns)
.eq("id", sellerId)
.maybeSingle();

if(error){
return { error };
}

return { data };

}catch(err){

return { error: err };

}

}

/* Preferred: full identity incl. Phase 2 fields. */

let result =
await loadProfile(SELLER_EXTENDED_COLUMNS);

/* Fallback: base columns only (pre-migration DB).
   resolveSellerIdentity treats missing dealership
   contact/social fields as empty â€” the card and
   brochure still render logo + name as before. */

if(result.error || !result.data){

const base =
await loadProfile(SELLER_BASE_COLUMNS);

if(base.error){

console.warn(
"Seller identity lookup failed:",
base.error
);

return null;

}

if(!base.data){
return null;
}

return resolveSellerIdentity(base.data);

}

return resolveSellerIdentity(result.data);

}

export function VehiclePage(){

setTimeout(loadVehicle, 0);

return `

<div id="vehicleBrochure" class="w-full px-6 lg:px-12 py-10">

<div id="vehicleBox">

<!-- Initial skeleton state: shown immediately on first paint so the
     page never displays an empty area before the vehicle loads.
     loadVehicle() replaces this with the real vehicle detail, the
     existing error state, or an error message. -->
${renderVehicleDetailSkeleton()}

</div>

</div>

`;

}

async function loadVehicle(){

const id =
new URLSearchParams(
window.location.search
).get("id");

if(!id){
renderError();
return;
}

const { data, error } =
await supabase
.from("vehicles")
.select("*")
.eq("id", id)
.single();

if(error){
  console.error("Vehicle load error:", error);
  document.getElementById("vehicleBox").innerHTML =
    "Error loading vehicle";
  return;
}

if(!data){
  renderError();
  return;
}

/* ========================== */
/* ðŸ”¥ TRACK VIEW (EXISTING) */
/* ========================== */
trackView(id);

/* ========================== */
/* ðŸ”¥ RENDER MAIN */
/* ========================== */
renderVehicle(data);

/* =========================================
INTERESTED BUTTON â€” reflect the real stored
interest state for the signed-in buyer, and
complete a pending post-login interest.
========================================= */

updateInterestedState(id);

maybeCompletePendingInterest(id);


/* ========================== */
/* ðŸ”¥ LOAD RECENTLY VIEWED */
/* ========================== */

loadRecentlyViewed(data);

/* =========================================
AI BEHAVIORAL INTELLIGENCE
========================================= */

loadBehaviorRecommendations(data);

loadPreferenceProfile(data);

}

/* ========================== */
/* ðŸ”¥ TRACK VIEW */
/* ========================== */

async function trackView(vehicleId){

try{

const { data:userData } =
await supabase.auth.getUser();

await supabase
.from("vehicle_views")
.insert({
vehicle_id: vehicleId,
user_id: userData?.user?.id || null
});

}catch(err){
console.log("View tracking failed", err);
}

}

/* ========================== */

function renderError(){
document.getElementById("vehicleBox").innerHTML =
"Vehicle not found";
}

/* =========================================
LOADING SKELETONS (PHASE 10)
Mirror the eventual content â€” the vehicle detail
layout (gallery + info panel), the recently-viewed
card strip and the recommendation grid â€” using the
shared .skeleton-image / .skeleton-shimmer language
from css/styles.css. Replaced by renderVehicle(),
loadRecentlyViewed() and loadBehaviorRecommendations()
with real content or the existing empty states.
========================================= */

function renderVehicleDetailSkeleton(){

return `

<div class="
grid
lg:grid-cols-[1.42fr_0.58fr]
gap-4
xl:gap-5
2xl:gap-6
max-w-[1180px]
mx-auto
items-start
px-0
">

  <!-- LEFT (GALLERY) -->
  <div class="space-y-3">

    <!-- MAIN IMAGE -->
    <div class="
    relative
    rounded-[22px]
    overflow-hidden
    skeleton-image
    shadow-[0_28px_80px_rgba(15,23,42,0.18)]
    border
    border-white/10
    h-[320px]
    sm:h-[400px]
    md:h-[470px]
    xl:h-[560px]
    2xl:h-[620px]
    ">
    </div>

    <!-- THUMBNAIL STRIP -->
    <div class="flex gap-2 overflow-hidden">
      <div class="skeleton-shimmer w-20 h-14 rounded-lg flex-shrink-0"></div>
      <div class="skeleton-shimmer w-20 h-14 rounded-lg flex-shrink-0"></div>
      <div class="skeleton-shimmer w-20 h-14 rounded-lg flex-shrink-0"></div>
      <div class="skeleton-shimmer w-20 h-14 rounded-lg flex-shrink-0"></div>
      <div class="skeleton-shimmer w-20 h-14 rounded-lg flex-shrink-0"></div>
    </div>

  </div>

  <!-- RIGHT (INFO PANEL) -->
  <div class="space-y-4">

    <div class="space-y-2">
      <div class="skeleton-shimmer h-3 w-24 rounded"></div>
      <div class="skeleton-shimmer h-8 w-3/4 rounded-md"></div>
      <div class="skeleton-shimmer h-4 w-1/2 rounded"></div>
    </div>

    <div class="space-y-2">
      <div class="skeleton-shimmer h-9 w-2/3 rounded-md"></div>
      <div class="skeleton-shimmer h-3.5 w-1/3 rounded"></div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div class="skeleton-shimmer h-14 rounded-xl"></div>
      <div class="skeleton-shimmer h-14 rounded-xl"></div>
      <div class="skeleton-shimmer h-14 rounded-xl"></div>
      <div class="skeleton-shimmer h-14 rounded-xl"></div>
    </div>

    <div class="space-y-2 pt-2">
      <div class="skeleton-shimmer h-12 w-full rounded-xl"></div>
      <div class="skeleton-shimmer h-12 w-full rounded-xl"></div>
    </div>

  </div>

</div>

`;

}

function renderRecentlyViewedSkeletons(count = 4){

const skeletonCard = () => `

<div class="
rounded-[22px]
overflow-hidden
bg-white
border
border-black/5
shadow-[0_10px_24px_rgba(15,23,42,0.07)]
snap-center
shrink-0
w-[280px]
sm:w-[300px]
">

  <div class="relative overflow-hidden h-[170px] skeleton-image"></div>

  <div class="p-3.5 space-y-2">

    <div class="skeleton-shimmer h-5 w-3/4 rounded-md"></div>

    <div class="skeleton-shimmer h-3.5 w-1/2 rounded"></div>

    <div class="flex items-center justify-between pt-1">
      <div class="skeleton-shimmer h-5 w-24 rounded-md"></div>
      <div class="skeleton-shimmer h-3.5 w-12 rounded"></div>
    </div>

  </div>

</div>

`;

return Array(count).fill(0).map(()=>skeletonCard()).join("");

}

/* ========================== */

function renderVehicle(v){

/* =========================================
SEO VEHICLE DATA
========================================= */

window.__CURRENT_VEHICLE__ = {

id: v.id,
make: v.make,
model: v.model,
year: v.year,
price: v.price,
mileage: v.mileage,
image:
v.image_url
||
(v.images && v.images[0])
||
"/assets/HUF1.webp",

/* The PDF brochure consumes this same object. Carrying the vehicle's
   real seller_id + full ordered image gallery here (both of which the
   detail page already loaded for this vehicle) gives the brochure a
   single reliable source of truth so it never depends on a second,
   failure-prone DB read to know who the dealership is or which images
   exist. No IDs/names/URLs are hard-coded â€” these are the vehicle's
   own existing fields. */
seller_id:
v.seller_id || null,

images:
Array.isArray(v.images)
  ? v.images.slice()
  : (v.image_url ? [v.image_url] : [])

};

let images = [];

if(v.images && v.images.length){
  images = v.images;
}else if(v.image_url){
  images = [v.image_url];
}else{
  images = ["/placeholder.png"];
}

imageList = images;
currentImageIndex = 0;

document.getElementById("vehicleBox").innerHTML = `

<div class="
grid
lg:grid-cols-[1.42fr_0.58fr]
gap-4
xl:gap-5
2xl:gap-6
max-w-[1180px]
mx-auto
compare-fade
items-start
px-0
">

  <!-- LEFT -->
  <div class="
space-y-6
min-w-0
">

    <!-- IMAGE -->
<!-- PREMIUM IMAGE GALLERY -->
<div class="space-y-3" id="galleryTop">

  <!-- MAIN IMAGE -->
  <div class="
  relative
  rounded-[22px]
  overflow-hidden
  bg-[#081120]
  shadow-[0_28px_80px_rgba(15,23,42,0.18)]
  border
  border-white/10
  group
  ">

    <!-- LOADING PLACEHOLDER -->
    <div id="galleryLoader" class="
    absolute
    inset-0
    bg-[#081120]
    flex
    items-center
    justify-center
    z-20
    pointer-events-none
    transition-opacity
    duration-500
    ">
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-2 border-white/20 border-t-[#E48A2F] rounded-full animate-spin"></div>
        <p class="text-white/60 text-xs uppercase tracking-[0.2em] font-semibold">Loading</p>
      </div>
    </div>

    <img id="carImg"
      src="${images[0]}"
      width="800"
      height="560"
      loading="eager"
      fetchpriority="high"
      decoding="async"
      alt="${v.make} ${v.model}"
      class="
      w-full
      h-[320px]
      sm:h-[400px]
      md:h-[470px]
      xl:h-[560px]
      2xl:h-[620px]
      object-cover
      transition-opacity
      duration-200
      cursor-zoom-in
      "
      onclick="openFullscreenViewer(-1)"
      onload="document.getElementById('galleryLoader')?.classList.add('opacity-0')"
      onerror="this.src='/assets/HUF1.webp';document.getElementById('galleryLoader')?.classList.add('opacity-0')">

<!-- OVERLAY GRADIENT -->
<div class="
absolute
inset-0
bg-gradient-to-t
from-black/55
via-black/10
to-transparent
pointer-events-none
"></div>
    <!-- IMAGE COUNT -->
    <div id="imgCounter"
    class="
    absolute
    top-5
    left-5
    bg-black/55
    backdrop-blur-xl
    text-white
    text-xs
    font-semibold
    tracking-[0.12em]
    uppercase
    px-4
    py-2
    rounded-full
    border
    border-white/10
    shadow-[0_10px_30px_rgba(0,0,0,0.25)]
    ">
  1 / ${images.length}
</div>

    <!-- EXPAND ICON -->
    <button
    onclick="openFullscreenViewer(-1)"
    class="
    absolute
    top-5
    right-5
    w-10
    h-10
    rounded-full
    bg-white/90
    hover:bg-white
    backdrop-blur-xl
    shadow-[0_10px_24px_rgba(15,23,42,0.16)]
    flex
    items-center
    justify-center
    transition-all
    duration-300
    hover:scale-105
    "
    title="Fullscreen">
      <i data-lucide="maximize-2" class="w-4 h-4 text-[#08111F]"></i>
    </button>

    <!-- NAVIGATION -->
    ${images.length > 1 ? `
      <button onclick="prevImg()"
      class="
      absolute
      left-4
      top-1/2
      -translate-y-1/2
      w-10
      h-10
      rounded-full
      bg-white/90
      hover:bg-white
      backdrop-blur-xl
      shadow-[0_10px_24px_rgba(15,23,42,0.16)]
      transition-all
      duration-300
      hover:scale-105
      text-lg
      font-semibold
      ">
        ‹
      </button>

      <button onclick="nextImg()"
      class="
      absolute
      right-4
      top-1/2
      -translate-y-1/2
      w-10
      h-10
      rounded-full
      bg-white/90
      hover:bg-white
      backdrop-blur-xl
      shadow-[0_10px_24px_rgba(15,23,42,0.16)]
      transition-all
      duration-300
      hover:scale-105
      text-lg
      font-semibold
      ">
        ›
      </button>
    ` : ""}

  </div>

  <!-- THUMBNAILS STRIP -->
  <div id="thumbStrip"
  class="
  flex
  gap-3
  overflow-x-auto
  pb-2
  pt-2
  hide-scrollbar
  scroll-smooth
  snap-x
  snap-mandatory
  ">

    ${images.map((img, i) => `
      <div data-thumb="${i}"
      class="
      relative
      min-w-[82px]
      h-[60px]
      rounded-[14px]
      overflow-hidden
      cursor-pointer
      border-2
      border-transparent
      transition-all
      duration-200
      shadow-[0_10px_24px_rgba(15,23,42,0.08)]
      hover:scale-[1.03]
      hover:border-[#E48A2F]/60
      bg-white
      snap-center
      shrink-0
      "
        onclick="setMainImage('${img}')">

        <img src="${img}"
          width="82"
          height="60"
          loading="lazy"
          decoding="async"
          alt="Vehicle image thumbnail"
          onerror="this.src='/placeholder.png'"
          class="w-full h-full object-cover pointer-events-none">

      </div>
    `).join("")}

  </div>

</div>

<div class="h-[1px] bg-gray-200"></div>

    <!-- HERO -->

    <!-- PREMIUM HERO SECTION -->
<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1">

  <!-- LEFT SIDE -->
  <div class="space-y-3">

    <!-- TITLE -->
    <h1 class="
text-2xl
sm:text-3xl
md:text-4xl
xl:text-5xl
2xl:text-[3.6rem]
font-black
tracking-[-0.05em]
leading-tight
text-[#08111F]
max-w-3xl
">
      ${v.make}
${v.model ? " " + v.model : ""}
    </h1>

<div class="space-y-1">

${v.variant ? `
<p class="
text-[#E48A2F]
text-sm
md:text-base
font-bold
uppercase
tracking-[0.20em]
">
${v.variant}
</p>
` : ""}

<p class="
text-[#64748B]
text-xs
md:text-base
font-medium
tracking-[0.02em]
leading-relaxed
">
      ${v.year || ""} • ${v.mileage || "-"} km • ${v.location || ""}
</p>

</div>

    <!-- TAGS -->
    <div class="
flex
flex-wrap
gap-2
text-[11px]
mt-2
">

${v.mileage && v.mileage < 80000 ? `<span class="chip">Low Mileage</span>` : ""}

${v.service_history ? `<span class="chip">Full Service History</span>` : ""}

${v.fuel_type === "Petrol" ? `<span class="chip">Fuel Efficient</span>` : ""}

${v.verified_dealer ? `<span class="chip">Verified Dealer</span>` : ""}

${v.franchise_dealer ? `<span class="chip">Franchise Dealer</span>` : ""}

${v.independent_dealer ? `<span class="chip">Independent Dealer</span>` : ""}

${v.premium_dealer ? `<span class="chip">Premium Dealer</span>` : ""}


${v.ownership_verified ? `<span class="chip">Ownership Verified</span>` : ""}

${v.accident_free ? `<span class="chip">Accident Free</span>` : ""}

${v.full_service_history ? `<span class="chip">Full Service History</span>` : ""}

${v.roadworthy_certified ? `<span class="chip">Roadworthy Certified</span>` : ""}

${v.certified_pre_owned ? `<span class="chip">Certified Pre-Owned</span>` : ""}

${v.warranty_included ? `<span class="chip">Warranty Included</span>` : ""}

${v.service_plan_included ? `<span class="chip">Service Plan Included</span>` : ""}

${v.maintenance_plan_included ? `<span class="chip">Maintenance Plan Included</span>` : ""}

${v.warranty_active ? `<span class="chip">Warranty Active</span>` : ""}

${v.service_plan_active ? `<span class="chip">Service Plan Active</span>` : ""}

${v.maintenance_plan_active ? `<span class="chip">Maintenance Plan Active</span>` : ""}

${v.ev_only ? `<span class="chip">Electric Vehicle</span>` : ""}

${v.fast_charge ? `<span class="chip">Fast Charging</span>` : ""}

${v.battery_warranty ? `<span class="chip">Battery Warranty</span>` : ""}

${v.commercial_vehicle ? `<span class="chip">Commercial Vehicle</span>` : ""}

</div>

  </div>

  <!-- RIGHT SIDE -->
  <div class="text-left md:text-right space-y-3">

    <!-- PRICE -->
<div class="space-y-2">

${
Number(v.price_reduction_amount || 0) > 0
&&
Number(v.previous_price || v.original_price || 0) >
Number(v.price || 0)

? `

<div class="flex flex-wrap items-center justify-end gap-2">

<span
class="
text-xl
font-semibold
text-slate-400
line-through
"
>
R ${Number(
v.previous_price ||
v.original_price ||
0
).toLocaleString()}
</span>

<span
class="
px-3
py-1
rounded-full
bg-green-100
text-green-700
text-xs
font-bold
"
>
Save R ${Number(
v.price_reduction_amount
).toLocaleString()}
</span>

<span
class="
px-3
py-1
rounded-full
bg-red-100
text-red-700
text-xs
font-bold
"
>
${Math.round(
(
Number(v.price_reduction_amount || 0)
/
Number(
v.previous_price ||
v.original_price ||
1
)
) * 100
)}% OFF
</span>

</div>

`

: ""

}

<p class="
text-3xl
sm:text-4xl
xl:text-[2.8rem]
font-black
text-[#E48A2F]
tracking-[-0.03em]
drop-shadow-[0_8px_20px_rgba(228,138,47,0.14)]
">
R ${Number(v.price || 0).toLocaleString()}
</p>

</div>

<!-- ACTION BUTTONS -->
<div class="flex flex-wrap md:justify-end gap-2 items-center">

<!-- Save â€” styled like the Browse card action buttons -->
<button
onclick="saveVehicle('${v.id}')"
class="w-8 h-8 rounded-full border flex items-center justify-center transition-all border-slate-200 bg-white hover:border-[#3B82F6]"
title="Save Vehicle"
>
<svg class="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z"/>
</svg>
</button>

<!-- Compare â€” styled like the Browse card action buttons -->
<label
onclick="event.stopPropagation()"
class="w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer transition-all ${getCompare().includes(v.id) ? 'border-[#3B82F6] bg-[#3B82F6]/10' : 'border-slate-200 bg-white hover:border-[#3B82F6]'}"
title="Compare Vehicle"
>
<input type="checkbox" data-compare="${v.id}" ${getCompare().includes(v.id) ? "checked" : ""} onchange="event.stopPropagation(); toggleVehicleCompare('${v.id}')" class="hidden"/>
<svg class="w-6 h-6 ${getCompare().includes(v.id) ? 'text-[#3B82F6]' : 'text-slate-700'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" d="M4 7h7"/><path stroke-linecap="round" stroke-linejoin="round" d="M4 17h7"/><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h7"/><path stroke-linecap="round" stroke-linejoin="round" d="M13 17h7"/><circle cx="10" cy="7" r="2"/><circle cx="14" cy="17" r="2"/>
</svg>
</label>

<!-- Interested â€” registers real interest tied to the signed-in
     buyer + this vehicle; feeds the dealer CRM Interested tab -->
<button
id="interestedBtn"
type="button"
onclick="markInterested('${v.id}')"
class="flex items-center justify-center gap-1.5 text-[13px] rounded-xl px-5 py-3 font-semibold transition-all border ${interestedBtnClasses(false)}"
title="Interested in this vehicle"
>
<i data-lucide="hand-heart" class="w-3.5 h-3.5"></i>
<span>Interested</span>
</button>

${v.seller_id ? `
<button
onclick="openEnquiry('${v.id}','${v.seller_id}')"
class="btn btn-dark flex items-center justify-center gap-1.5 text-[13px]"
>
<i data-lucide="phone" class="w-3.5 h-3.5"></i>
<span>Contact Seller</span>
</button>
` : ""}

</div>

  </div>

</div>

<!-- SPECIFICATIONS -->
<div class="
card
p-5
space-y-5
rounded-[22px]
shadow-[0_14px_32px_rgba(15,23,42,0.05)]
border
border-black/[0.04]
bg-white
">

<h2 class="
text-xl
font-black
tracking-[-0.02em]
text-[#08111F]
">
    Vehicle Details
</h2>
  <div class="divide-y">

    ${specRow("Make", v.make)}
    ${specRow("Model", v.model)}
    ${specRow("Variant", v.variant)}
    ${specRow("Year", v.year)}
    ${specRow("Mileage", v.mileage ? v.mileage + " km" : null)}
    ${specRow("Transmission", v.transmission)}
    ${specRow("Fuel Type", v.fuel_type)}
${specRow("Drive Type", v.drive_type)}
${specRow("Color", v.color)}
${specRow("Location", v.location)}

${specRow("Province", v.province)}
${specRow("City", v.city)}

${specRow("Body Type", v.body_type)}
${specRow("Engine Size", v.engine_size)}
${specRow("Condition", v.condition)}
${specRow("Seats", v.seats)}
${specRow("Warranty", v.warranty)}
${specRow("Service History", v.service_history ? "Available" : null)}

${specRow("Commercial Category", v.commercial_category)}

${specRow(
  "Payload Capacity",
  v.payload_capacity_kg
    ? v.payload_capacity_kg + " kg"
    : null
)}

${specRow(
  "Towing Capacity",
  v.towing_capacity_kg
    ? v.towing_capacity_kg + " kg"
    : null
)}

</div>

</div>

<div class="h-[1px] bg-gray-200 my-5"></div>

    <!-- FEATURES -->
    <div id="vehicleFeatures" class="hidden">

      <div class="
      flex
      items-center
      gap-3
      mb-5
      ">

        <div class="
        w-[3px]
        h-6
        rounded-full
        bg-gradient-to-b
        from-[#E48A2F]
        to-[#E48A2F]
        "></div>

        <h2 class="
        text-xl
        font-black
        tracking-[-0.02em]
        text-[#08111F]
        ">
          Vehicle Features
        </h2>

      </div>

      <div id="featureGroups" class="space-y-4"></div>

    </div>

    <div class="h-[1px] bg-gray-200 my-6"></div>

${v.description ? `
    <!-- DESCRIPTION -->
    <div>

<h2 class="
text-xl
font-black
mb-4
tracking-[-0.02em]
text-[#08111F]
">
        Description
</h2>

<p class="text-gray-700 leading-7 text-[15px] max-w-[760px]">
    ${v.description}
</p>

    </div>
` : ""}

  </div>

  <!-- RIGHT -->
<div class="
w-full
lg:max-w-[400px]
min-w-0
">

<!-- STICKY INNER WRAPPER (desktop only â€” normal flow on mobile) -->
<div class="
space-y-4
lg:sticky
lg:top-24
">

<!-- PREMIUM FINANCE CARD -->
<div class="
card
p-5
space-y-4
bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.94))]
border
border-[#E48A2F]
rounded-[22px]
shadow-[0_18px_46px_rgba(15,23,42,0.08)]
backdrop-blur-[24px]
overflow-hidden
relative
">

  <!-- PRICE -->
<div class="space-y-3">

<div class="
flex
items-center
justify-between
gap-3
flex-wrap
">

<div>

<p class="
text-sm
text-gray-600
uppercase
tracking-wide
font-medium
">
Vehicle Price
</p>

<div class="space-y-2">

${
Number(v.price_reduction_amount || 0) > 0
&&
Number(v.previous_price || v.original_price || 0) >
Number(v.price || 0)

? `

<div class="flex flex-wrap items-center gap-2">

<span
class="
text-lg
font-semibold
text-slate-400
line-through
"
>
R ${Number(
v.previous_price ||
v.original_price ||
0
).toLocaleString()}
</span>

<span
class="
px-2
py-1
rounded-full
bg-green-100
text-green-700
text-[11px]
font-bold
"
>
Save R ${Number(
v.price_reduction_amount
).toLocaleString()}
</span>

<span
class="
px-2
py-1
rounded-full
bg-red-100
text-red-700
text-[11px]
font-bold
"
>
${Math.round(
(
Number(v.price_reduction_amount || 0)
/
Number(
v.previous_price ||
v.original_price ||
1
)
) * 100
)}% OFF
</span>

</div>

`

: ""

}

<p class="
text-4xl
font-black
text-[#E48A2F]
leading-none
mt-1
tracking-[-0.03em]
">
R ${Number(v.price || 0).toLocaleString()}
</p>

</div>

</div>

<div class="
px-4
py-2
rounded-full
bg-green-100
text-green-700
text-xs
font-bold
tracking-[0.12em]
uppercase
">
Available Now
</div>

</div>

<div class="
grid
grid-cols-2
gap-3
pt-4
">

<div class="
bg-[#F8FAFC]
border
border-black/5
rounded-xl
p-2.5
">
<div class="text-[10px] uppercase tracking-[0.12em] text-gray-500">
Year
</div>
<div class="font-black text-[15px] text-[#08111F]">
${v.year || "-"}
</div>
</div>

<div class="
bg-[#F8FAFC]
border
border-black/5
rounded-xl
p-2.5
">
<div class="text-[10px] uppercase tracking-[0.12em] text-gray-500">
Mileage
</div>
<div class="font-black text-[15px] text-[#08111F]">
${Number(v.mileage || 0).toLocaleString()} km
</div>
</div>

<div class="
bg-[#F8FAFC]
border
border-black/5
rounded-xl
p-2.5
">
<div class="text-[10px] uppercase tracking-[0.12em] text-gray-500">
Fuel
</div>
<div class="font-black text-[15px] text-[#08111F]">
${v.fuel_type || "-"}
</div>
</div>

<div class="
bg-[#F8FAFC]
border
border-black/5
rounded-xl
p-2.5
">
<div class="text-[10px] uppercase tracking-[0.12em] text-gray-500">
Transmission
</div>
<div class="font-black text-[15px] text-[#08111F]">
${v.transmission || "-"}
</div>
</div>

</div>

<!-- FINANCE SECTION -->
<div class="
border-t
border-black/5
pt-5
space-y-4
">

<div class="
flex
items-center
justify-between
">

<p class="
text-sm
text-gray-700
uppercase
tracking-[0.18em]
font-bold
">
Estimated Monthly Payment
</p>

</div>

<p
id="monthlyPay"
class="
text-[30px]
font-black
tracking-[-0.02em]
text-[#3B82F6]
leading-none
"
>
R 0 / month
</p>

<!-- INPUTS -->
<div class="
space-y-3
pt-1
">

<input
id="deposit"
placeholder="Deposit Amount (R)"
class="
input-light
rounded-xl
h-12
text-[14px]
font-medium
"
>

<select
id="term"
class="
input-light
rounded-xl
h-12
text-[14px]
font-medium
"
>
<option value="36">36 months</option>
<option value="48">48 months</option>
<option value="60" selected>60 months</option>
<option value="72">72 months</option>
<option value="84">84 months</option>
</select>

</div>

<div class="
grid
grid-cols-2
gap-3
">

<div class="
rounded-xl
bg-[#F8FAFC]
border
border-black/5
p-3
">
<div class="text-[11px] uppercase tracking-[0.12em] text-gray-500">
Deposit
</div>
<div
id="depositPercent"
class="
font-black
text-[#08111F]
text-base
"
>
0%
</div>
</div>

<div class="
rounded-xl
bg-[#F8FAFC]
border
border-black/5
p-3
">
<div class="text-[10px] uppercase tracking-[0.12em] text-gray-500">
Amount Financed
</div>
<div
id="financeAmount"
class="
font-black
text-[#08111F]
text-base
"
>
R 0
</div>
</div>

</div>

<div
id="affordabilityPanel"
class="
rounded-xl
bg-[#EEF6FF]
border
border-[#D6E9FF]
p-2.5
space-y-1
"
>

<div
class="
text-[11px]
uppercase
tracking-[0.12em]
font-bold
text-[#3B82F6]
"
>
Affordability Match
</div>

<div
id="affordabilityMatch"
class="
text-2xl
font-black
text-[#3B82F6]
"
>
Profile Required
</div>

<div
id="affordabilityMessage"
class="
text-sm
text-[#08111F]
"
>
Login to calculate affordability
</div>

</div>

</div>

<!-- QUICK ACTIONS -->
<div class="
space-y-2
pt-2
">

<button
onclick="downloadBrochure(window.__CURRENT_VEHICLE__)"
class="
w-full
rounded-[16px]
border
border-[#E48A2F]
bg-white
py-3
font-bold
text-[#08111F]
hover:bg-[#FFF7ED]
hover:border-[#E48A2F]
transition-all
duration-300
flex
items-center
justify-center
gap-2
"
>

<i data-lucide="download" class="w-5 h-5 text-[#E48A2F]"></i>

<span>
Download Brochure (PDF)
</span>

</button>

</div>

<!-- SELLER IDENTITY (PHASE 18 â€” hydrated from the
     vehicle's existing seller profile via seller_id.
     Image priority: dealership_logo â†’ avatar_url â†’
     HUFA initials fallback. Skeleton until loaded.) -->
<div
id="vehicleSellerCard"
class="
card
p-4
bg-white
border
border-black/[0.04]
rounded-[22px]
shadow-[0_14px_32px_rgba(15,23,42,0.05)]
"
>

<div class="flex items-center gap-3 min-w-0">

<div
id="vehicleSellerAvatar"
class="
w-12
h-12
rounded-full
flex
items-center
justify-center
bg-[#E48A2F]/15
border
border-[#E48A2F]/25
text-[#E48A2F]
font-black
text-sm
overflow-hidden
flex-shrink-0
"
>
</div>

<div class="min-w-0 flex-1">

<div
id="vehicleSellerName"
class="
font-black
text-[15px]
text-[#08111F]
truncate
"
>
<span class="skeleton-shimmer h-3.5 w-32 rounded inline-block align-middle"></span>
</div>

<div
id="vehicleSellerSub"
class="
text-xs
text-gray-500
truncate
mt-0.5
"
>
<span class="skeleton-shimmer h-2.5 w-24 rounded inline-block align-middle"></span>
</div>

</div>

</div>

<!-- PHASE 4 â€” dealership contact details +
     social icons. Empty by default; hydrated
     ONLY with information the seller actually
     provided (never empty labels or broken
     links). Hidden entirely for private
     sellers. -->
<div
id="vehicleSellerContact"
class="hidden mt-3 pt-3 border-t border-black/[0.06] space-y-1.5"
></div>

<div
id="vehicleSellerSocial"
class="hidden mt-3 flex flex-wrap gap-2"
></div>

</div>

<!-- PRIMARY CTA -->
<div class="
space-y-3
pt-2
">

<button
onclick="applyVehicle('${v.id}')"
class="
w-full
py-3
btn
btn-gold
rounded-[18px]
hover:shadow-[0_18px_48px_rgba(228,138,47,0.28)]
hover:-translate-y-[1px]
transition-all
duration-300
flex
items-center
justify-center
gap-3
text-[15px]
font-black
tracking-[0.02em]
group
relative
overflow-hidden
">

<div class="
absolute
inset-0
bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.18),transparent)]
translate-x-[-120%]
group-hover:translate-x-[120%]
transition-transform
duration-1000
">
</div>

<i data-lucide="banknote" class="w-5 h-5 relative z-10"></i>

<div class="relative z-10 text-left">

<div class="
text-[15px]
font-black
leading-none
">
Apply for Finance
</div>

<div class="
text-[11px]
font-semibold
opacity-80
mt-1
tracking-[0.08em]
uppercase
">
Fast Pre-Approval
</div>

</div>

</button>

<button
onclick="viewSeller('${v.seller_id}')"
class="
btn
btn-dark
w-full
rounded-[18px]
py-3
font-bold
tracking-[0.02em]
hover:-translate-y-[1px]
transition-all
duration-300
">
View Seller
</button>

</div>

</div>

</div>

`;

initFinance(v.price);

initAffordabilityMatch(v);

renderVehicleFeatures(v);

/* PHASE 18 â€” hydrate the seller identity card
   from the vehicle's existing seller profile. */
hydrateVehicleSellerIdentity(v);

/* SINGLE SOURCE OF TRUTH GALLERY STATE */
updateActiveThumb();

/* PRELOAD INITIAL NEIGHBOURS */
preloadGalleryNeighbours();

/* INIT MAIN GALLERY SWIPE (MOBILE) */
initMainGallerySwipe();

/* INIT MAIN GALLERY KEYBOARD (DESKTOP) */
initMainGalleryKeyboard();

/* INIT THUMBNAIL STRIP WHEEL + DRAG */
initThumbnailStrip();

/* INIT LUCIDE ICONS */
loadLucide().then(() => {
  setTimeout(() => lucide.createIcons(), 50);
});
}

/* =========================================
ðŸ”¥ FEATURES (SHARED BROWSE CATEGORIES)
========================================= */

/* =========================================
ðŸ”¥ SHARED FEATURE GROUPING
SINGLE SOURCE OF TRUTH â€” REUSED BY BOTH
THE VEHICLE DETAIL PAGE AND THE PDF BROCHURE
========================================= */

async function buildVehicleFeatureGroups(v){

  if(!v) return null;

  /* PARSE VEHICLE FEATURES */
  let features = [];

  if(Array.isArray(v.features)){

    features = v.features;

  }
  else if(typeof v.features === "string"){

    try{

      const parsed =
        JSON.parse(v.features);

      if(Array.isArray(parsed)){

        features = parsed;

      }else{

        features =
          v.features
            .split(",")
            .map(f => f.trim())
            .filter(Boolean);

      }

    }catch{

      features =
        v.features
          .split(",")
          .map(f => f.trim())
          .filter(Boolean);

    }

  }

  features = features.filter(Boolean);

  if(!features.length) return null;

  /* LOAD BROWSE CATEGORY MAPPING (SAME SOURCE OF TRUTH AS BROWSE) */
  let items = [];

  try{

    items = await getFeatures();

  }catch(err){

    console.warn("Feature catalogue failed:", err);

  }

  /* CATEGORY -> FEATURES (SAME LOGIC AS BROWSE) */
  const categoryMap = {};

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

    if(!categoryMap[category]){

      categoryMap[category] = [];

    }

    categoryMap[category].push(feature);

  });

  /* GROUP THIS VEHICLE'S FEATURES BY CATEGORY */
  const groups = {};

  features.forEach(f => {

    let category = null;

    Object.keys(categoryMap).forEach(cat => {

      if(categoryMap[cat].includes(f)) category = cat;

    });

    const group = category || "Other";

    if(!groups[group]) groups[group] = [];

    groups[group].push(f);

  });

  return groups;

}

/* =========================================
ðŸ”¥ VEHICLE FEATURES (PAGE ONLY)
LIGHTWEIGHT RENDERER â€” COMPLETELY INDEPENDENT
FROM THE PDF BROCHURE.
READS ONLY THE CURRENT VEHICLE'S UPLOADED
FEATURES FIELD AND RENDERS THEM AS CAPSULES.
========================================= */

function parseVehicleFeatures(raw){

  if(!raw) return [];

  let list = [];

  if(Array.isArray(raw)){

    list = raw;

  }
  else if(typeof raw === "string"){

    const trimmed =
      raw.trim();

    let parsed = null;

    if(trimmed.startsWith("[")){

      try{

        const json =
          JSON.parse(trimmed);

        if(Array.isArray(json)){

          parsed = json;

        }

      }catch{
        parsed = null;
      }

    }

    if(parsed){

      list = parsed;

    }
    else{

      list =
        trimmed.split(",");

    }

  }

  const seen = new Set();

  return list
    .map(f =>
      typeof f === "string"
        ? f
        : String(f ?? "")
    )
    .map(f => f.trim())
    .filter(Boolean)
    .filter(f => {
      if(seen.has(f)) return false;
      seen.add(f);
      return true;
    })
    .sort((a, b) => a.localeCompare(b));

}

function renderVehicleFeatures(v){

  const section =
    document.getElementById("vehicleFeatures");

  if(!section) return;

  const features =
    parseVehicleFeatures(v?.features);

  /* NO UPLOADED FEATURES â€” RENDER NOTHING */
  if(!features.length) return;

  const box =
    document.getElementById("featureGroups");

  if(!box) return;

  section.classList.remove("hidden");

  box.innerHTML = `
    <div class="flex flex-wrap gap-2.5">
      ${features.map(f => `

        <span class="
        inline-flex
        items-center
        gap-2
        rounded-full
        border
        border-[#E48A2F]/40
        bg-white
        px-3.5
        py-2
        text-[13px]
        font-semibold
        text-[#08111F]
        shadow-[0_2px_8px_rgba(228,138,47,0.08)]
        transition-all
        duration-200
        hover:shadow-[0_8px_20px_rgba(228,138,47,0.18)]
        hover:-translate-y-[1px]
        hover:border-[#E48A2F]
        ">

          <svg class="w-3.5 h-3.5 text-[#E48A2F] shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>

          <span>${f}</span>

        </span>

      `).join("")}
    </div>
  `;

}

/* =========================================
ðŸ”¥ MARKET PRICE INTELLIGENCE
========================================= */

async function initPriceInsights(vehicle){

try{

const {
data,
error
} = await supabase
.from("vehicles")
.select("price, mileage, year")
.eq("make", vehicle.make)
.eq("model", vehicle.model)
.limit(40);

if(error){

console.error(
"Price intelligence failed:",
error
);

return;

}

if(!data?.length) return;

const prices =
data
.map(v => Number(v.price || 0))
.filter(Boolean);

if(!prices.length) return;

const avg =
prices.reduce((a,b)=>a+b,0)
/
prices.length;

const current =
Number(vehicle.price || 0);

const diff =
((current - avg) / avg) * 100;

const averageEl =
document.getElementById(
"marketAverage"
);

const positionEl =
document.getElementById(
"pricePosition"
);

const badgeEl =
document.getElementById(
"dealBadge"
);

const demandEl =
document.getElementById(
"demandScore"
);

if(averageEl){

averageEl.innerText =
"R " +
Math.round(avg).toLocaleString();

}

let label = "";
let badge = "";
let demand = "";

if(diff <= -12){

label = "Excellent Deal";
badge = "Excellent Value";
demand = "Very High";

}

else if(diff <= -5){

label = "Good Deal";
badge = "High Demand";
demand = "High";

}

else if(diff < 8){

label = "Fair Price";
badge = "Market Average";
demand = "Moderate";

}

else{

label = "Premium Pricing";
badge = "Above Market";
demand = "Selective";

}

if(positionEl){

positionEl.innerText = label;

}

if(demandEl){

demandEl.innerText = demand;

}

if(badgeEl){

badgeEl.innerText = badge;

if(diff <= -12){

badgeEl.className = `
px-4
py-2
rounded-full
bg-green-100
text-green-700
font-semibold
text-sm
`;

}

else if(diff <= -5){

badgeEl.className = `
px-4
py-2
rounded-full
bg-[#3B82F6]/15
text-[#3B82F6]
font-semibold
text-sm
`;

}

else if(diff < 8){

badgeEl.className = `
px-4
py-2
rounded-full
bg-yellow-100
text-yellow-700
font-semibold
text-sm
`;

}

else{

badgeEl.className = `
px-4
py-2
rounded-full
bg-red-100
text-red-700
font-semibold
text-sm
`;

}

}

}catch(err){

console.error(
"Price insights crashed:",
err
);

}

}

function initWhyVehicle(vehicle){

const container =
document.getElementById(
"whyVehicleContent"
);

if(!container) return;

const reasons = [];

if(Number(vehicle.price) < 250000){

reasons.push(
"âœ“ Excellent value within entry-level budget range"
);

}else if(Number(vehicle.price) < 500000){

reasons.push(
"âœ“ Strong balance between value, ownership costs and vehicle quality"
);

}else{

reasons.push(
"âœ“ Premium vehicle with strong market positioning and long-term desirability"
);

}

if(vehicle.mileage && vehicle.mileage < 80000){

reasons.push(
"âœ“ Lower mileage than many comparable vehicles currently on the market"
);

}

if(vehicle.service_history){

reasons.push(
"âœ“ Full service history improves resale value and ownership confidence"
);

}

if(vehicle.year >= 2021){

reasons.push(
"âœ“ Newer model with modern features and safety technology"
);

}

if(vehicle.transmission === "Automatic"){

reasons.push(
"âœ“ Automatic transmission remains one of the most desirable configurations"
);

}

if(vehicle.fuel_type === "Petrol"){

reasons.push(
"âœ“ Suitable for everyday commuting and predictable running costs"
);

}

if(vehicle.price){

const price =
Number(vehicle.price);

if(price <= 250000){

reasons.push(
"âœ“ Positioned within affordable entry-level pricing"
);

}else if(price <= 500000){

reasons.push(
"âœ“ Competitively priced within its market segment"
);

}else{

reasons.push(
"âœ“ Premium vehicle targeting higher-value buyers"
);

}

}

container.innerHTML =
reasons.slice(0,6).map(reason => `

<div class="
rounded-xl
bg-white
border
border-black/5
p-3
font-medium
text-[#08111F]
shadow-[0_6px_16px_rgba(15,23,42,0.04)]
hover:shadow-[0_12px_24px_rgba(15,23,42,0.07)]
transition-all
duration-300
">
${reason}
</div>

`).join("");

}

async function initAffordabilityMatch(vehicle){

try{

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user){
return;
}

const { data:profile } =
await supabase
.from("affordability_profiles")
.select("*")
.eq("user_id", userData.user.id)
.single();

if(!profile){
return;
}

const maxPrice =
Number(
profile.max_vehicle_price || 0
);

if(!maxPrice){
return;
}

const vehiclePrice =
Number(vehicle.price || 0);

let score =
Math.round(
100 -
((vehiclePrice / maxPrice) * 100)
);

score =
Math.max(
0,
Math.min(100, score)
);

const matchEl =
document.getElementById(
"affordabilityMatch"
);

const messageEl =
document.getElementById(
"affordabilityMessage"
);

if(matchEl){

matchEl.innerText =
score + "% Match";

}

if(messageEl){

if(score >= 80){

messageEl.innerText =
"Excellent affordability fit";

}else if(score >= 60){

messageEl.innerText =
"Good affordability fit";

}else if(score >= 40){

messageEl.innerText =
"Possible fit depending on finance structure";

}else{

messageEl.innerText =
"Above your recommended affordability range";

}

}

}catch(err){

console.error(
"Affordability match failed",
err
);

}

}

function specRow(label, value){

  if(!value) return "";

  const icons = {
    "Make": "badge-info",
    "Model": "car",
    "Variant": "layers",
    "Year": "calendar",
    "Mileage": "gauge",
    "Transmission": "settings",
    "Fuel Type": "fuel",
    "Drive Type": "activity",
    "Color": "palette",
    "Location": "map-pin",
    "Body Type": "car",
    "Engine Size": "cpu",
    "Condition": "shield-check",
    "Seats": "users",
    "Warranty": "badge-check",
    "Service History": "clipboard-list",
"Province": "map-pinned",
"City": "building",
"Commercial Category": "truck",
"Payload Capacity": "package",
"Towing Capacity": "anchor"
  };

  return `
    <div class="flex items-center justify-between py-2.5 text-[13px]">

      <div class="flex items-center gap-2 text-gray-500">
        <i data-lucide="${icons[label] || "circle"}" class="w-4 h-4"></i>
        <span>${label}</span>
      </div>

      <span class="font-semibold text-gray-900">
        ${value}
      </span>

    </div>
  `;
}

/* ========================== */

function initFinance(price){

  const depositInput =
    document.getElementById("deposit");

  const termSelect =
    document.getElementById("term");

  const output =
    document.getElementById("monthlyPay");

  const depositPercent =
    document.getElementById("depositPercent");

  const financeAmount =
    document.getElementById("financeAmount");

  const financeInsight =
    document.getElementById("financeInsight");

  function update(){

    const deposit =
      parseFloat(depositInput.value) || 0;

    const term =
      parseInt(termSelect.value);

    const financed =
      Math.max(0, price - deposit);

    const monthly =
      calculateMonthly(
        price,
        deposit,
        12,
        term
      );

    output.innerText =
      "R " +
      monthly.toLocaleString() +
      " / month";

    if(financeAmount){

      financeAmount.innerText =
        "R " +
        financed.toLocaleString();

    }

    if(depositPercent){

      const percent =
        price > 0
        ? Math.round((deposit / price) * 100)
        : 0;

      depositPercent.innerText =
        percent + "%";
    }

    if(financeInsight){

      if(monthly < 5000){

        financeInsight.innerText =
          "Low monthly commitment. Suitable for budget-conscious buyers.";

      }else if(monthly < 10000){

        financeInsight.innerText =
          "Balanced repayment profile with manageable monthly costs.";

      }else if(monthly < 15000){

        financeInsight.innerText =
          "Mid-range finance commitment. Review affordability carefully.";

      }else{

        financeInsight.innerText =
          "Higher monthly repayment. Consider a larger deposit or longer term.";

      }

    }

  }

  depositInput.oninput = update;
  termSelect.onchange = update;

  update();
}

/* ========================== */
/* ENQUIRY MODAL */
/* ========================== */

window.openEnquiry = async function(vehicleId, sellerId){

const { data:userData } = await supabase.auth.getUser();
const user = userData?.user;

if(!user){
toast("Please login to contact seller");
navigate("/login");
return;
}

showModal(`

<div class="modal-box space-y-3">

<h2 class="text-xl font-bold">
Contact Seller
</h2>

<input id="enqName" placeholder="Your name" class="w-full border p-2">
<input id="enqEmail" placeholder="Email" class="w-full border p-2">
<input id="enqPhone" placeholder="Phone" class="w-full border p-2">

<textarea id="enqMsg"
placeholder="Message"
class="w-full border p-2"></textarea>

<div class="flex gap-2">

<button id="sendEnq"
class="btn btn-gold w-full">
Send
</button>

<button id="cancelEnq"
class="btn btn-dark w-full">
Cancel
</button>

</div>

</div>

`);

document.getElementById("enqEmail").value = user.email;

document.getElementById("sendEnq").onclick = () =>
submitEnquiry(vehicleId, sellerId);

document.getElementById("cancelEnq").onclick = () =>
closeModal();

loadLucide().then(() => lucide.createIcons());

};

window.submitEnquiry = async function(vehicleId, sellerId){

try{

const { data:userData } =
await supabase.auth.getUser();

const user = userData?.user;

if(!user){

toast("Please login first");
navigate("/login");
return;

}

const name =
document.getElementById("enqName").value;

const email =
document.getElementById("enqEmail").value;

const phone =
document.getElementById("enqPhone").value;

const message =
document.getElementById("enqMsg").value;

/* =====================================
SAVE ENQUIRY
===================================== */

const { error } = await supabase
.from("enquiries")
.insert({

user_id: user.id,
seller_id: sellerId,
vehicle_id: vehicleId,

name,
email,
phone,
message

});

if(error){

console.error(error);

toast("Failed to send enquiry");
return;

}

/* =====================================
CREATE / GET CONVERSATION
===================================== */

let conversationId = null;

/* check existing conversation */
const { data: existingConversation } =
await supabase
.from("conversations")
.select("id")
.eq("buyer_id", user.id)
.eq("seller_id", sellerId)
.eq("vehicle_id", vehicleId)
.maybeSingle();

if(existingConversation){

conversationId = existingConversation.id;

}else{

/* create new conversation */
const { data: newConversation, error: conversationError } =
await supabase
.from("conversations")
.insert({

buyer_id: user.id,
seller_id: sellerId,
vehicle_id: vehicleId

})
.select()
.single();

if(conversationError){

console.error(conversationError);

toast("Failed to create conversation");
return;

}

conversationId = newConversation.id;

}

/* =====================================
SAVE MESSAGE
===================================== */

const { error: messageError } =
await supabase
.from("messages")
.insert({

conversation_id: conversationId,

sender_id: user.id,
receiver_id: sellerId,

vehicle_id: vehicleId,

message,
phone

});

if(messageError){

console.error(messageError);

toast("Failed to save message");
return;

}

/* =====================================
DEALER NOTIFICATION
===================================== */

await supabase
.from("notifications")
.insert({

user_id: sellerId,

title: "New Vehicle Enquiry",

message:
`${name || "A buyer"} sent an enquiry about a vehicle.`

});

/* =====================================
SUCCESS
===================================== */

closeModal();

toast("Message sent successfully");

}catch(err){

console.error(
"Enquiry system failed:",
err
);

toast("Something went wrong");

}

};


window.applyVehicle = id =>
navigate("/apply?id="+id);

window.viewSeller = id =>
navigate("/seller?id="+id);

window.saveVehicle = async function(vehicleId){

  const { data:userData } = await supabase.auth.getUser();

  if(!userData.user){
    toast("Login to save vehicles");
    navigate("/login");
    return;
  }

const { error } = await supabase
.from("saved_vehicles")
.upsert({
  user_id: userData.user.id,
  vehicle_id: vehicleId
}, { onConflict: ["user_id","vehicle_id"] });

if(error){
  toast("Failed to save vehicle");
  return;
}

  toast("Saved successfully");
};

window.setMainImage = function(src){

  const index = imageList.indexOf(src);

  if(index !== -1){
    setGalleryImage(index);
  }

};

function updateActiveThumb(){

  const thumbs = document.querySelectorAll("[data-thumb]");

  thumbs.forEach(el => {
    el.classList.remove(
      "border-[#E48A2F]",
      "scale-[1.08]",
      "shadow-[0_12px_28px_rgba(228,138,47,0.35)]",
      "z-10"
    );
    el.style.transform = "";
  });

  const active = document.querySelector(`[data-thumb="${currentImageIndex}"]`);

  if(active){
    active.classList.add(
      "border-[#E48A2F]",
      "scale-[1.08]",
      "shadow-[0_12px_28px_rgba(228,138,47,0.35)]",
      "z-10"
    );
    centerActiveThumb(active);
  }

}

function centerActiveThumb(thumb){

  const strip = document.getElementById("thumbStrip");

  if(!strip || !thumb) return;

  const stripRect = strip.getBoundingClientRect();
  const thumbRect = thumb.getBoundingClientRect();

  const target =
    strip.scrollLeft +
    (thumbRect.left - stripRect.left) -
    (stripRect.width / 2) +
    (thumbRect.width / 2);

  strip.scrollTo({
    left: target,
    behavior: "smooth"
  });

}
/* =========================================
ðŸ”¥ PHASE 18 â€” SELLER IDENTITY CARD
Hydrates the compact seller card in the
detail-page sidebar from the vehicle's
existing seller profile (seller_id).
Same shared identity logic as the PDF
brochure â€” one system, no hard-coding.
========================================= */

async function hydrateVehicleSellerIdentity(v){

const card =
document.getElementById(
"vehicleSellerCard"
);

if(!card){
return;
}

if(!v?.seller_id){

/* No seller on this vehicle â€” hide the
   card rather than show empty identity. */
card.classList.add("hidden");

return;

}

const identity =
await fetchSellerIdentity(v.seller_id);

/* The user may have navigated away while the
   profile was loading â€” re-check the card. */
const cardNow =
document.getElementById(
"vehicleSellerCard"
);

if(!cardNow){
return;
}

if(!identity){
cardNow.classList.add("hidden");
return;
}

/* PHASE 19 â€” the seller identity card was a
   DEALERSHIP-only card. PHASE 4 â€” private
   sellers now get their own appropriate
   presentation: personal name + avatar with a
   "Private Seller" label. No dealership name,
   no dealership contact, no social section. */
if(!identity.isDealer){

if(nameEl){
nameEl.textContent =
identity.sellerName || "Private Seller";
}

if(subEl){
subEl.textContent = "Private Seller";
subEl.classList.remove("hidden");
}

if(avatar){

if(identity.imageUrl){

window.__VEHICLE_SELLER_INITIALS__ =
identity.initials || "HU";

avatar.innerHTML =
`<img
src="${escapeVehicleHtml(identity.imageUrl)}"
alt="Seller"
class="w-full h-full object-cover"
onerror="window.__vehicleSellerAvatarFallback(this)"
>`;

}else{

avatar.textContent =
identity.initials || "HU";

}

}

/* Private sellers never show dealership
   contact or social sections. */

return;

}

const dealershipDisplayName =
(identity.dealershipName || "").trim();

/* A dealer with neither a dealership name nor
   an identity image has nothing to render â€”
   hide the card instead of leaving an empty
   container behind. Nothing is hard-coded. */
if(!dealershipDisplayName && !identity.imageUrl){
cardNow.classList.add("hidden");
return;
}

const avatar =
document.getElementById(
"vehicleSellerAvatar"
);

const nameEl =
document.getElementById(
"vehicleSellerName"
);

const subEl =
document.getElementById(
"vehicleSellerSub"
);

/* PHASE 19 â€” dealership name ONLY, loaded
   dynamically from the existing
   profiles.dealership_name. The individual
   seller's first name / surname / full personal
   name must never appear in this section. */
if(nameEl){
nameEl.textContent = dealershipDisplayName;
}

/* No secondary line for dealers â€” the personal
   name that used to sit here is removed. */
if(subEl){
subEl.textContent = "";
subEl.classList.add("hidden");
}

if(avatar){

/* PHASE 19 â€” substantially larger dealership
   image, still using the shared Phase 18 image
   priority: dealership_logo â†’ avatar_url â†’
   initials fallback. */
avatar.classList.add("vehicle-seller-avatar-lg");

if(identity.imageUrl){

/* Remember the initials so a broken image
   can fall back cleanly (never a broken
   image box). */
window.__VEHICLE_SELLER_INITIALS__ =
identity.initials || "HU";

avatar.innerHTML =
`<img
src="${escapeVehicleHtml(identity.imageUrl)}"
alt="Seller"
class="w-full h-full object-cover"
onerror="window.__vehicleSellerAvatarFallback(this)"
>`;

}else{

avatar.textContent =
identity.initials || "HU";

}

}

/* =========================================
PHASE 4 â€” DEALERSHIP CONTACT + SOCIAL
Rendered ONLY from information the
dealership actually provided. Empty fields
produce no rows at all â€” no "N/A", no
placeholders, no broken links.
========================================= */

const contactBox =
document.getElementById(
"vehicleSellerContact"
);

const socialBox =
document.getElementById(
"vehicleSellerSocial"
);

if(contactBox){

const rows = [];

if(identity.email){

rows.push(`
<div class="flex items-center gap-2 min-w-0">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 flex-shrink-0 text-[#E48A2F]" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
<a href="mailto:${escapeVehicleHtml(identity.email)}" class="text-xs text-gray-600 hover:text-[#E48A2F] truncate transition">${escapeVehicleHtml(identity.email)}</a>
</div>`);

}

if(identity.phone){

rows.push(`
<div class="flex items-center gap-2 min-w-0">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 flex-shrink-0 text-[#E48A2F]" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
<a href="tel:${escapeVehicleHtml(identity.phone.replace(/[^+\d]/g, ""))}" class="text-xs text-gray-600 hover:text-[#E48A2F] truncate transition">${escapeVehicleHtml(identity.phone)}</a>
</div>`);

}

if(identity.address){

rows.push(`
<div class="flex items-start gap-2 min-w-0">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 flex-shrink-0 text-[#E48A2F] mt-0.5" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
<span class="text-xs text-gray-600 leading-snug">${escapeVehicleHtml(identity.address)}</span>
</div>`);

}

if(rows.length){

contactBox.innerHTML =
rows.join("");

contactBox.classList.remove("hidden");

}else{

contactBox.classList.add("hidden");

}

}

if(socialBox){

/* buildSocialLinks returns ONLY platforms
   with a real value and a safe href. */

const links =
identity.socialLinks || [];

if(links.length){

socialBox.innerHTML =
links.map(l => `
<a
href="${escapeVehicleHtml(l.href)}"
target="_blank"
rel="noopener noreferrer"
aria-label="${escapeVehicleHtml(l.label)}"
title="${escapeVehicleHtml(l.label)}"
class="
w-8
h-8
rounded-lg
flex
items-center
justify-center
border
border-black/[0.08]
bg-white
text-gray-500
hover:text-[#E48A2F]
hover:border-[#E48A2F]/40
transition
"
>
<span class="w-4 h-4 block">${l.icon}</span>
</a>`).join("");

socialBox.classList.remove("hidden");

}else{

socialBox.classList.add("hidden");

}

}

}

/* Broken-image safety net: never show a broken
   image box in the seller avatar. */
window.__vehicleSellerAvatarFallback =
function(img){

const avatar =
img?.closest?.(
"#vehicleSellerAvatar"
);

if(!avatar){
return;
}

avatar.innerHTML = "";

avatar.textContent =
window.__VEHICLE_SELLER_INITIALS__ || "HU";

};

window.downloadBrochure = async function(vehicle){

  try{

    await ensureScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
    );

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");

    /* =========================================
    RESOLVE FULL VEHICLE DATA
    (FACTUAL INFORMATION FROM THE DATABASE)
    ========================================= */

    let v = vehicle;

    /* The detail page already loaded the full vehicle and stored its
       seller_id + full image gallery on __CURRENT_VEHICLE__ (see
       renderVehicle). We refresh from the DB when an id is available,
       but a failed refresh must never silently strip seller/gallery
       data back to a thin object â€” a Supabase error keeps the already-
       loaded data so dealership identity and the gallery stay intact. */
    if(v?.id){

      const { data, error } =
        await supabase
          .from("vehicles")
          .select("*")
          .eq("id", v.id)
          .single();

      if(error){

        console.warn(
          "[BROCHURE] Vehicle refresh failed; using loaded data.",
          error
        );

      }else if(data){

        v = data;

      }

    }

    if(!v){

      alert("Brochure data unavailable");
      return;

    }

    /* =========================================
    SELLER IDENTITY (PHASE 18 â€” SAME SHARED
    LOGIC AS THE VEHICLE DETAIL PAGE)
    dealership_logo â†’ avatar_url â†’ initials
    ========================================= */

    const sellerIdentity =
      await fetchSellerIdentity(v?.seller_id);

    /* =========================================
    FEATURE GROUPS
    (REUSES THE EXACT DETAIL-PAGE GROUPING)
    ========================================= */

    const groups =
      await buildVehicleFeatureGroups(v);

    /* =========================================
    IMAGES
    (USE ONLY UPLOADED VEHICLE IMAGES â€” NO PLACEHOLDERS)
    ========================================= */

    let images = [];

    if(Array.isArray(v.images) && v.images.length){

      images = v.images.slice();

    }else if(typeof v.images === "string"){

      try{

        const parsed = JSON.parse(v.images);

        if(Array.isArray(parsed) && parsed.length){

          images = parsed;

        }

      }catch(err){}

    }

    if(!images.length && v.image_url){

      images = [v.image_url];

    }

    const heroUrl =
      images[0] ||
      "/assets/HUF1.webp";

    /* SPLIT: HERO + COVER THUMBNAILS (PAGE 1) / FULL GALLERY (NEW PAGES).

       The FULL GALLERY always carries EVERY valid image â€” all but the
       primary (which is shown as the hero) â€” in their original order,
       with NO arbitrary count cap. It is paginated by the existing
       computeGalleryPageSizes (6 per page), so completeness never
       depends on the cover thumbnails being drawn and works for any
       number of images (3, 5, 10, ...). */
    let thumbnails = [];

    if(images.length >= 2){

      const tCount =
        Math.min(3, images.length - 1);

      thumbnails =
        images.slice(1, 1 + tCount);

    }

    const galleryImages =
      images.length >= 2
        ? images.slice(1)
        : [];

    console.log(
      "[BROCHURE] Images:",
      images.length,
      "| Thumbnails:",
      thumbnails.length,
      "| Gallery:",
      galleryImages.length
    );

    /* =========================================
    PAGE 1 â€” PREMIUM COVER
    ========================================= */

    await drawBrochurePage1(
      pdf,
      v,
      sellerIdentity,
      heroUrl,
      thumbnails
    );

    /* =========================================
    PAGE 2 â€” VEHICLE SPECIFICATIONS
    (COVER IS ALWAYS SAVED â€” LATER PAGES ARE
    INDEPENDENT SO A FAILURE CANNOT ABORT PDF)
    ========================================= */

    try{

      pdf.addPage();
      drawSubHeader(pdf, 2);
      drawBrochurePage2(pdf, v);

    }catch(err){

      console.error("Brochure page 2 failed:", err);

    }

    /* =========================================
    PAGE 3 â€” FEATURES (ONLY IF PRESENT)
    ========================================= */

    if(groups && Object.keys(groups).length){

      try{

        pdf.addPage();
        drawSubHeader(pdf, 3);
        drawBrochurePage3(pdf, groups);

      }catch(err){

        console.error("Brochure page 3 failed:", err);

      }

    }

    /* =========================================
    PAGE 4 â€” DESCRIPTION (ONLY IF PRESENT)
    ========================================= */

    const description =
      typeof v.description === "string"
        ? v.description.trim()
        : "";

    if(description){

      try{

        pdf.addPage();
        drawSubHeader(pdf, 4);
        drawBrochurePage4(pdf, description);

      }catch(err){

        console.error("Brochure page 4 failed:", err);

      }

    }

    /* =========================================
    GALLERY PAGES
    (AUTO-GENERATED WHEN MORE THAN 4 IMAGES)
    ========================================= */

    if(galleryImages.length){

      const pageSizes =
        computeGalleryPageSizes(galleryImages.length);

      /* GALLERY ALWAYS FOLLOWS THE FARTHEST BASE PAGE (PAGE 4) */
      const galleryStart = 5;

      let galleryIndex = 0;

      for(let gi = 0; gi < pageSizes.length; gi++){

        try{

          const pageImages =
            galleryImages.slice(
              galleryIndex,
              galleryIndex + pageSizes[gi]
            );

          galleryIndex += pageSizes[gi];

          pdf.addPage();

          await drawGalleryPage(
            pdf,
            pageImages,
            galleryStart + gi
          );

        }catch(err){

          console.error("Gallery page failed:", err);

        }

      }

    }

    /* =========================================
    SAVE
    ========================================= */

    const fileName =
      (
        (v.make || "vehicle") +
        "-" +
        (v.model || "brochure") +
        "-brochure.pdf"
      )
        .replace(/[^a-zA-Z0-9-_]+/g, "-")
        .toLowerCase();

    pdf.save(fileName);

  }catch(err){

    console.error("PDF ERROR:", err);
    alert("Failed to generate brochure");

  }

};

/* =========================================
BROCHURE PDF DESIGN SYSTEM â€” PREMIUM LOOKBOOK
Deep navy, white and soft cool grey form the
canvas. The Helpufin orange is used only as a
strategic accent: section markers, price
emphasis, micro-accents and key status.
========================================= */

const BR_MARGIN = 16;
const BR_PAGE_W = 210;
const BR_PAGE_H = 297;
const BR_CONTENT_W = BR_PAGE_W - (BR_MARGIN * 2);
const BR_GOLD = [226, 122, 32];          /* Helpufin orange accent */
const BR_DARK = [10, 25, 47];            /* deep navy ink */
const BR_NAVY = [10, 25, 47];
const BR_NAVY_MID = [31, 51, 79];
const BR_ORANGE = BR_GOLD;
const BR_SLATE = [71, 85, 105];
const BR_MUTED = [148, 163, 184];
const BR_LIGHT_ON_NAVY = [178, 194, 214];
const BR_CARD = [243, 246, 249];         /* soft cool grey */
const BR_LINE = [224, 230, 237];
const BR_WHITE = [255, 255, 255];

/* =========================================
IMAGE HELPERS
========================================= */

async function brochureFetchImage(url){

  const res = await fetch(url);
  const blob = await res.blob();

  const dataUrl =
    await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  return {
    dataUrl,
    mime: blob.type || ""
  };

}

function brochureToJpeg(dataUrl, maxWidth = 2056){

  return new Promise((resolve) => {

    const img = new Image();

    img.onload = () => {

      try{

        const scale =
          Math.min(1, maxWidth / (img.naturalWidth || 1));

        const w =
          Math.max(1, Math.round(img.naturalWidth * scale));

        const h =
          Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas =
          document.createElement("canvas");

        canvas.width = w;
        canvas.height = h;

        const ctx =
          canvas.getContext("2d");

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);

        ctx.drawImage(img, 0, 0, w, h);

        resolve(
          canvas.toDataURL("image/jpeg", 0.92)
        );

      }catch(err){

        resolve(dataUrl);

      }

    };

    img.onerror = () => resolve(dataUrl);

    img.src = dataUrl;

  });

}

/* =========================================
DETECT THE TRUE IMAGE FORMAT FROM THE
DATA-URL SIGNATURE â€” NOT blob.type ALONE.
(Supabase Storage / S3 often serves uploads
as application/octet-stream or empty mime,
which would make a naive mimeâ†’format guess
wrong and cause jsPDF addImage to throw.)
========================================= */

function brochureDetectImageFormat(dataUrl, mime){

  const sig =
    String(dataUrl || "").slice(0, 40);

  /* DATA-URL HEADER SIGNATURE (AUTHORITATIVE) */
  if(/^data:image\/png/i.test(sig)) return "PNG";
  if(/^data:image\/jpe?g/i.test(sig)) return "JPEG";
  if(/^data:image\/webp/i.test(sig)) return "WEBP";
  if(/^data:image\/gif/i.test(sig)) return "GIF";

  /* BASE64 BYTE SIGNATURES (RELIABLE EVEN WHEN MIME IS WRONG/EMPTY) */
  if(/^data:[^,]+;base64,/i.test(sig)){

    const b64 =
      String(dataUrl).split(",")[1] || "";

    if(b64.startsWith("/9j/")) return "JPEG";
    if(b64.startsWith("iVBORw0KGgo")) return "PNG";
    if(b64.startsWith("UklGR")) return "WEBP";
    if(b64.startsWith("R0lGOD")) return "GIF";

  }

  /* FALLBACK TO SERVER MIME (IF ANY) */
  const m =
    String(mime || "").toLowerCase();

  if(m.includes("png")) return "PNG";
  if(m.includes("jpeg") || m.includes("jpg")) return "JPEG";
  if(m.includes("webp")) return "WEBP";
  if(m.includes("gif")) return "GIF";

  /* SAFEST GENERAL DEFAULT â€” MOST UPLOADS ARE PNG */
  return "PNG";

}

/* =========================================
PRE-CROP AN IMAGE TO ROUNDED CORNERS ON CANVAS
========================================= */

function brochureRoundImageCorners(dataUrl, boxW, boxH, radiusPx, maxWidth){

  return new Promise(resolve => {

    const img = new Image();

    img.onload = () => {

      try{

        const targetRatio = boxW / boxH;
        const imgRatio =
          img.naturalWidth / img.naturalHeight;

        /* CONTAIN â€” FIT THE WHOLE IMAGE, PRESERVING PROPORTIONS.
           The canvas is EXACTLY the fitted image size (no letterboxing),
           so the returned dimensions describe the actual drawn photo.
           No cropping, no empty container. */
        let fitWmm, fitHmm;
        if(imgRatio >= targetRatio){
          fitWmm = boxW;
          fitHmm = boxW / imgRatio;
        }else{
          fitHmm = boxH;
          fitWmm = boxH * imgRatio;
        }

        /* pixel output (~10px per mm, capped by maxWidth) */
        let outW = Math.max(1, Math.round(fitWmm * 10));
        let outH = Math.max(1, Math.round(fitHmm * 10));

        const downscale = Math.min(1, maxWidth / Math.max(outW, outH));
        outW = Math.max(1, Math.round(outW * downscale));
        outH = Math.max(1, Math.round(outH * downscale));

        const r =
          Math.max(1, Math.round(radiusPx * (outW / fitWmm)));

        const canvas =
          document.createElement("canvas");

        canvas.width = outW;
        canvas.height = outH;

        const ctx =
          canvas.getContext("2d");

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, outW, outH);

        ctx.drawImage(img, 0, 0, outW, outH);

        /* ROUNDED CORNER MASK (destination-in) */
        ctx.globalCompositeOperation = "destination-in";

        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(outW - r, 0);
        ctx.quadraticCurveTo(outW, 0, outW, r);
        ctx.lineTo(outW, outH - r);
        ctx.quadraticCurveTo(outW, outH, outW - r, outH);
        ctx.lineTo(r, outH);
        ctx.quadraticCurveTo(0, outH, 0, outH - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.fill();

        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          format: "PNG",
          fitWmm,
          fitHmm
        });

      }catch(err){

        resolve({ dataUrl, format: "PNG", fitWmm: boxW, fitHmm: boxH });

      }

    };

    img.onerror = () =>
      resolve({ dataUrl, format: "PNG", fitWmm: boxW, fitHmm: boxH });

    img.src = dataUrl;

  });

}

/* Load an image and report its natural aspect ratio (w / h).
   Resolves a small object or null on failure; used to compute the
   actual photo dimensions for a balanced, crop-free gallery. */
function brochureImageRatio(dataUrl){

  return new Promise(resolve => {

    const img = new Image();

    img.onload = () => {
      try{
        resolve({
          ratio: img.naturalWidth / img.naturalHeight,
          w: img.naturalWidth,
          h: img.naturalHeight
        });
      }catch(err){
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);

    img.src = dataUrl;

  });

}


/* =========================================
PRE-CROP AN IMAGE TO A CIRCLE ON CANVAS
(PNG OUTPUT KEEPS TRANSPARENCY AROUND THE
CIRCLE â€” USED FOR THE BROCHURE SELLER BADGE)
========================================= */

function brochureCircularCrop(dataUrl, sizePx = 256){

  return new Promise(resolve => {

    const img = new Image();

    img.onload = () => {

      try{

        const canvas =
          document.createElement("canvas");

        canvas.width = sizePx;
        canvas.height = sizePx;

        const ctx =
          canvas.getContext("2d");

        const r = sizePx / 2;

        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        /* White backing inside the circle so
           transparent logos stay visible on the
           white page. */
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, sizePx, sizePx);

        const scale =
          Math.max(
            sizePx / (img.naturalWidth || 1),
            sizePx / (img.naturalHeight || 1)
          );

        const w =
          (img.naturalWidth || 1) * scale;

        const h =
          (img.naturalHeight || 1) * scale;

        ctx.drawImage(
          img,
          (sizePx - w) / 2,
          (sizePx - h) / 2,
          w,
          h
        );

        resolve({
          dataUrl:
            canvas.toDataURL("image/png"),
          format: "PNG"
        });

      }catch(err){

        resolve(null);

      }

    };

    img.onerror = () => resolve(null);

    img.src = dataUrl;

  });

}

async function brochureResolveImage(url, maxWidth){

  const { dataUrl, mime } =
    await brochureFetchImage(url);

  const format =
    brochureDetectImageFormat(dataUrl, mime);

  if(format === "WEBP" || format === "GIF"){

    return {
      dataUrl:
        await brochureToJpeg(dataUrl, maxWidth || 2056),
      format: "JPEG"
    };

  }

  return { dataUrl, format };

}

/* =========================================
PDF DRAWING HELPERS
========================================= */

function brochureSpacedText(pdf, text, x, y, gap = 0.3, align = "left"){

  const chars = Array.from(text);

  if(!chars.length) return 0;

  const widths =
    chars.map(c => pdf.getTextWidth(c));

  const total =
    widths.reduce((a, b) => a + b, 0) +
    gap * (chars.length - 1);

  let cx = x;

  if(align === "center") cx = x - total / 2;
  if(align === "right") cx = x - total;

  chars.forEach((c, i) => {
    pdf.text(c, cx, y);
    cx += widths[i] + gap;
  });

    return total;

}

/* Truncate text to fit within maxW (mm). Used by the header dealer block
   (and previously by the post-hero "Offered By" block) to avoid text
   overflow in fixed-width columns. */
function brochureClipText(pdf, value, maxW){

  let t = String(value);

  if(pdf.getTextWidth(t) <= maxW){
    return t;
  }

  while(t.length > 1 && pdf.getTextWidth(t + "...") > maxW){
    t = t.slice(0, -1);
  }

  return t + "...";
}

async function brochureRoundedImage(pdf, dataUrl, format, x, y, w, h, r){

  /* âœ… ROOT-CAUSE FIX:
  The previous implementation used pdf.clip() + saveGraphicsState()/
  restoreGraphicsState() to round the image corners. In jsPDF 2.5.1,
  the clip region is NOT reliably restored by restoreGraphicsState(),
  so the clip persisted and every subsequent gold element (title bar,
  price, badge, separators) was painted INSIDE the hero region â€”
  producing the gold rounded rectangle over the image.

  The fix: pre-crop the image to rounded corners on a canvas and
  embed it as a plain image with a single pdf.addImage() call.
  No clip, no saveGraphicsState, no restoreGraphicsState â€” so
  nothing can ever paint over the image. */
  const rounded =
    await brochureRoundImageCorners(
      dataUrl,
      w,
      h,
      r,
      2056
    );

  pdf.addImage(
    rounded.dataUrl,
    rounded.format,
    x,
    y,
    w,
    h
  );

}

function brochureNumber(value){

  const n =
    Number(
      String(value || "").replace(/[^\d.-]/g, "")
    );

  return isNaN(n) ? 0 : n;

}

function brochureStatusText(v){

  const s =
    String(v.status || "active").toLowerCase();

  if(s === "active") return "Available";
  if(s === "sold") return "Sold";
  if(s === "archived") return "Archived";
  if(s === "pending") return "Pending";
  if(s === "reserved") return "Reserved";

  return s.charAt(0).toUpperCase() + s.slice(1);

}


/* =========================================
HEADERS + FOOTERS â€” MINIMAL EDITORIAL FRAMING
Subtle alignment: brand block left, edition
label right, a navy hairline led by a short
orange segment. No logo placed in a corner.
========================================= */

function drawSubHeader(pdf, pageNum){

  /* ---------- ACTUAL HUFA LOGO (TOP-LEFT) ---------- */
  let logoW = 0;
  if(window.__HUFA_LOGO_DATA__){
    try{
      const ratio = window.__HUFA_LOGO_RATIO__ || 0.36;
      let logoH = 15 * ratio;
      if(logoH > 15) logoH = 15;
      const w = logoH / (ratio || 0.36);
      const h = logoH;
      pdf.addImage(
        window.__HUFA_LOGO_DATA__,
        window.__HUFA_LOGO_FORMAT__ || "JPEG",
        BR_MARGIN,
        14 - h / 2,
        w,
        h
      );
      logoW = w;
    }catch(err){}
  }

  const textX = BR_MARGIN + logoW + 5;

  /* LEFT â€” BRAND NAME + EDITION LABEL */
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...BR_DARK);
  brochureSpacedText(pdf, "HELPUFIN AUTO", textX, 11.5, 0.5);

  pdf.setFont("helvetica","normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...BR_MUTED);
  brochureSpacedText(pdf, "PREMIUM VEHICLE BROCHURE", textX, 17, 0.3);

  /* RIGHT â€” EDITION LABEL */
  pdf.setFont("helvetica","normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...BR_MUTED);
  brochureSpacedText(
    pdf,
    "PREMIUM VEHICLE BROCHURE",
    BR_PAGE_W - BR_MARGIN,
    12,
    0.3,
    "right"
  );

  /* RIGHT â€” SINGLE GENERATED DATE (once per repeated header, clear of
     the edition label above and the hairline below). */
  pdf.setFont("helvetica","normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...BR_MUTED);
  pdf.text(
    "Generated " + new Date().toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }),
    BR_PAGE_W - BR_MARGIN,
    15.5,
    { align: "right" }
  );

  /* RULE â€” NAVY HAIRLINE WITH SHORT ORANGE LEAD */
  pdf.setDrawColor(...BR_DARK);
  pdf.setLineWidth(0.5);
  pdf.line(BR_MARGIN, 20, BR_PAGE_W - BR_MARGIN, 20);
  pdf.setDrawColor(...BR_GOLD);
  pdf.setLineWidth(1.4);
  pdf.line(BR_MARGIN, 20, BR_MARGIN + 18, 20);

  return 27;

}

function brochureFooter(pdf, pageNum){

  pdf.setDrawColor(...BR_LINE);
  pdf.setLineWidth(0.3);
  pdf.line(BR_MARGIN, 285.5, BR_PAGE_W - BR_MARGIN, 285.5);

  pdf.setFont("helvetica","bold");
  pdf.setFontSize(6);
  pdf.setTextColor(...BR_SLATE);
  brochureSpacedText(pdf, "HELPUFIN AUTO", BR_MARGIN, 290, 0.35);

  pdf.setFont("helvetica","normal");
  pdf.setFontSize(6);
  pdf.setTextColor(...BR_MUTED);
  brochureSpacedText(pdf, "PREMIUM VEHICLE BROCHURE", BR_MARGIN + 26, 290, 0.25);

  pdf.setFont("helvetica","bold");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...BR_DARK);
  pdf.text(
    "PAGE " + String(pageNum).padStart(2, "0"),
    BR_PAGE_W - BR_MARGIN,
    290,
    { align: "right" }
  );

}
/* =========================================
PAGE 1 â€” COVER Â· PREMIUM AUTOMOTIVE LOOKBOOK
Large hero photography, an overlapping navy
information card with a vertical orange accent,
an offset price composition, a key-facts strip,
photography preview and a refined dealership
presentation block.
========================================= */

async function drawBrochurePage1(pdf, v, sellerIdentity, heroUrl, thumbnails){

  /* ---------- CACHED BRAND LOGO (USED BY THE DEALER BLOCK) ---------- */

  try{

    const logo =
      await brochureFetchImage("/assets/logo.png");

    const logoFormat =
      brochureDetectImageFormat(logo.dataUrl, logo.mime);

    window.__HUFA_LOGO_DATA__ =
      (logoFormat === "WEBP" || logoFormat === "GIF")
        ? await brochureToJpeg(logo.dataUrl, 800)
        : logo.dataUrl;

    window.__HUFA_LOGO_FORMAT__ =
      (logoFormat === "WEBP" || logoFormat === "GIF")
        ? "JPEG"
        : logoFormat;

    const probe =
      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = window.__HUFA_LOGO_DATA__;
      });

    if(probe){
      window.__HUFA_LOGO_RATIO__ =
        probe.naturalHeight /
        (probe.naturalWidth || 1);
    }

  }catch(err){}

  /* ---------- MASTHEAD WITH ACTUAL HUFA LOGO ---------- */

  let mastLogoW = 0;
  if(window.__HUFA_LOGO_DATA__){
    try{
      const ratio = window.__HUFA_LOGO_RATIO__ || 0.36;
      let mastLogoH = 15 * ratio;
      if(mastLogoH > 15) mastLogoH = 15;
      const w = mastLogoH / (ratio || 0.36);
      const h = mastLogoH;
      pdf.addImage(
        window.__HUFA_LOGO_DATA__,
        window.__HUFA_LOGO_FORMAT__ || "JPEG",
        BR_MARGIN,
        14 - h / 2,
        w,
        h
      );
      mastLogoW = w;
    }catch(err){}
  }

  const mastTextX = BR_MARGIN + mastLogoW + 6;

  pdf.setFont("helvetica","bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...BR_DARK);
  brochureSpacedText(pdf, "HELPUFIN AUTO", mastTextX, 12, 0.55);

  pdf.setFont("helvetica","normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...BR_MUTED);
  brochureSpacedText(
    pdf,
    "PREMIUM VEHICLE BROCHURE",
    mastTextX,
    17,
    0.35
  );

  const generatedDate =
    new Date().toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });

  pdf.setFontSize(6.5);
  pdf.text(
    "Generated " + generatedDate,
    BR_PAGE_W - BR_MARGIN,
    16.8,
    { align: "right" }
  );

  /* masthead rule â€” navy hairline led by a short orange segment */
  pdf.setDrawColor(...BR_DARK);
  pdf.setLineWidth(0.5);
  pdf.line(BR_MARGIN, 20, BR_PAGE_W - BR_MARGIN, 20);
  pdf.setDrawColor(...BR_GOLD);
  pdf.setLineWidth(1.6);
  pdf.line(BR_MARGIN, 20, BR_MARGIN + 20, 20);

  /* ---------- HERO PHOTOGRAPHY (CONTAIN â€” NEVER CROPPED) ---------- */

  console.log("[BROCHURE] Drawing hero image...");

    const imgX = BR_MARGIN;
  const imgY = 26;
  const imgW = BR_CONTENT_W;
  const maxHeroH = 90;

  let hero = null;

  try{
    hero = await brochureResolveImage(heroUrl, 2056);
  }catch(err){
    hero = null;
  }

  /* Hero height derived from the actual image ratio so the photo
     visually dominates â€” no oversized grey backdrop. */
  let imgH = maxHeroH;
  if(hero){
    try{
      const heroInfo = await brochureImageRatio(hero.dataUrl);
      if(heroInfo && heroInfo.ratio > 0){
        imgH = Math.min(imgW / heroInfo.ratio, maxHeroH);
      }
    }catch(err){}
  }

  const imgBottom = imgY + imgH;

  if(hero){
    try{
      const coverFit =
        await brochureRoundImageCorners(
          hero.dataUrl, imgW, imgH, 2, 2056
        );
      const cW = coverFit.fitWmm || imgW;
      const cH = coverFit.fitHmm || imgH;
      pdf.addImage(
        coverFit.dataUrl, coverFit.format,
        imgX + (imgW - cW) / 2, imgY + (imgH - cH) / 2, cW, cH
      );
    }catch(err){
      try{
        const heroRatio = await brochureImageRatio(hero.dataUrl);
        let hw = imgW, hh = imgH;
        if(heroRatio && heroRatio.ratio > 0){
          hh = imgW / heroRatio.ratio;
          if(hh > imgH){ hh = imgH; hw = imgH * heroRatio.ratio; }
        }
        pdf.addImage(
          hero.dataUrl, hero.format,
          imgX + (imgW - hw) / 2, imgY + (imgH - hh) / 2, hw, hh
        );
      }catch(err2){}
    }
  }else{
    /* light backdrop only for the text fallback */
    pdf.setFillColor(...BR_CARD);
    pdf.rect(imgX, imgY, imgW, imgH, "F");
    pdf.setFont("helvetica","bold");
    pdf.setFontSize(14);
    pdf.setTextColor(...BR_MUTED);
    pdf.text(
      (v.make || "") + (v.model ? " " + v.model : ""),
      BR_PAGE_W / 2, imgY + imgH / 2, { align: "center" }
    );
  }

  /* ---------- INTEGRATED NAVY IDENTITY BAND ----------
     Full-width and aligned to the page grid â€” the vehicle identity card is
     a deliberate part of the cover, not a floating/offset element. It holds
     make, model, variant, status, year, fuel, transmission, drive and price. */

    const bandY = Math.round(imgBottom + 6);
  const bandH = 56;

  pdf.setFillColor(...BR_NAVY);
  pdf.rect(BR_MARGIN, bandY, BR_CONTENT_W, bandH, "F");

  /* vertical orange accent on the band's left edge */
  pdf.setFillColor(...BR_GOLD);
  pdf.rect(BR_MARGIN, bandY, 2.2, bandH, "F");

  const bLeft = BR_MARGIN + 2.2 + 6;         /* inner left text edge */
  const bRight = BR_PAGE_W - BR_MARGIN - 6;  /* inner right text edge */

  const brandName =
    String(v.make || "VEHICLE").trim().toUpperCase() || "VEHICLE";

  /* MAKE â€” top-left */
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...BR_LIGHT_ON_NAVY);
  brochureSpacedText(pdf, brandName, bLeft, bandY + 13, 0.35);

  /* STATUS â€” refined branded chip, top-right */
  const status = brochureStatusText(v);
  const statusText = status.toUpperCase();
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(7.5);
  const chipW = pdf.getTextWidth(statusText) + 12;
  const chipX = bRight - chipW;
  pdf.setFillColor(...BR_GOLD);
  pdf.roundedRect(chipX, bandY + 3, chipW, 8, 4, 4, "F");
  pdf.setTextColor(...BR_DARK);
  pdf.text(statusText, chipX + chipW / 2, bandY + 8.6, { align: "center" });

  /* MODEL â€” large white, with optional inline variant */
  const mainName =
    String(v.model || v.variant || "").trim() || brandName;

  pdf.setFont("helvetica","bold");
  let modelSize = 24;
  pdf.setFontSize(modelSize);
  pdf.setTextColor(...BR_WHITE);
  while(
    pdf.getTextWidth(mainName) > (bRight - bLeft) * 0.6 &&
    modelSize > 12
  ){
    modelSize -= 0.5;
    pdf.setFontSize(modelSize);
  }

  const variant =
    v.variant &&
    mainName.toLowerCase() !== String(v.variant).toLowerCase()
      ? String(v.variant)
      : "";

    pdf.text(mainName, bLeft, bandY + 32);

  /* PRICE â€” orange, right side of the model row */
  const priceText =
    v.price
      ? "R " + brochureNumber(v.price).toLocaleString("en-ZA")
      : null;

  if(priceText){
    pdf.setFont("helvetica","bold");
    let priceSize = 22;
    pdf.setFontSize(priceSize);
    pdf.setTextColor(...BR_GOLD);
    while(pdf.getTextWidth(priceText) > 70 && priceSize > 14){
      priceSize -= 1;
      pdf.setFontSize(priceSize);
    }
    pdf.text(priceText, bRight, bandY + 32, { align: "right" });
  }else{
    pdf.setFont("helvetica","bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...BR_GOLD);
    pdf.text("Price on request", bRight, bandY + 32, { align: "right" });
  }

  /* hairline inside the band */
  pdf.setDrawColor(...BR_NAVY_MID);
  pdf.setLineWidth(0.3);
  pdf.line(bLeft, bandY + 40, bRight, bandY + 40);

  /* bottom row â€” variant (left) + meta (right) */
  let metaX = bLeft;

  if(variant){
    pdf.setFont("helvetica","bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...BR_GOLD);
    pdf.text(
      brochureClipText(pdf, variant, 80),
      bLeft, bandY + 49
    );
    metaX = bLeft + 85;
  }

  const metaParts = [];
  if(v.year) metaParts.push(String(v.year));
  if(v.fuel_type) metaParts.push(v.fuel_type);
  if(v.transmission) metaParts.push(v.transmission);
  if(v.drive_type) metaParts.push(v.drive_type);

  if(metaParts.length){
    pdf.setFont("helvetica","normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...BR_LIGHT_ON_NAVY);
    pdf.text(
      brochureClipText(pdf, metaParts.join("   Â·   "), bRight - metaX),
      metaX, bandY + 49
    );
  }

  /* ---------- KEY FACTS STRIP ---------- */

    const stripY = Math.round(bandY + bandH + 8);
  const stripH = 16;

  pdf.setFillColor(...BR_CARD);
  pdf.rect(BR_MARGIN, stripY, BR_CONTENT_W, stripH, "F");

  const coreMap = {
    "Mileage": null,
    "Body Type": null,
    "Colour": null,
    "Location": null
  };

  buildBrochureSpecs(v).forEach(s => {
    if(s.label in coreMap && !coreMap[s.label]) coreMap[s.label] = s.value;
  });

  const stripSpecs =
    Object.keys(coreMap).map(k => ({
      label: k,
      value: coreMap[k] || "-"
    }));

  const colW4 = BR_CONTENT_W / 4;

  stripSpecs.forEach((s, i) => {

    const sx = BR_MARGIN + i * colW4 + 4;

    pdf.setFont("helvetica","bold");
    pdf.setFontSize(5.5);
    pdf.setTextColor(...BR_MUTED);
    brochureSpacedText(pdf, s.label.toUpperCase(), sx, stripY + 5.5, 0.2);

    pdf.setFont("helvetica","bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...BR_DARK);
    pdf.text(
      brochureClipText(pdf, s.value, colW4 - 7),
      sx, stripY + 11
    );

    if(i > 0){
      pdf.setDrawColor(...BR_LINE);
      pdf.setLineWidth(0.3);
      pdf.line(
        BR_MARGIN + i * colW4, stripY + 3.5,
        BR_MARGIN + i * colW4, stripY + stripH - 3.5
      );
    }

  });

  /* ---------- COVER PHOTOGRAPHY PREVIEW (CONTAIN) ---------- */

  let thumbBottom = stripY + stripH;

  if(thumbnails && thumbnails.length){

    console.log("[BROCHURE] Drawing cover thumbnails...");

    const tLabelY = stripY + stripH + 7;

    pdf.setFont("helvetica","bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...BR_MUTED);
    brochureSpacedText(pdf, "PHOTOGRAPHY", BR_MARGIN, tLabelY, 0.4);

    const tGap = 5;
    const tCount = Math.min(3, thumbnails.length);
    const tW = (BR_CONTENT_W - tGap * (tCount - 1)) / tCount;
    const tH = 34;
    const tY = tLabelY + 4;

    for(let ti = 0; ti < tCount; ti++){
      try{
        const tX = BR_MARGIN + ti * (tW + tGap);
        pdf.setFillColor(...BR_CARD);
        pdf.rect(tX, tY, tW, tH, "F");
        const tResolved =
          await brochureResolveImage(thumbnails[ti], 1400);
                const tFit =
          await brochureRoundImageCorners(
            tResolved.dataUrl, tW, tH, 2, 1400
          );
        const tFw = tFit.fitWmm || tW;
        const tFh = tFit.fitHmm || tH;
        pdf.addImage(
          tFit.dataUrl, tFit.format,
          tX + (tW - tFw) / 2, tY + (tH - tFh) / 2, tFw, tFh
        );
      }catch(err){
        console.error("Cover thumbnail failed:", err);
      }
    }

    thumbBottom = tY + tH;

  }

  /* ---------- DEALERSHIP PRESENTATION BLOCK ----------
     Own clear space on the page grid â€” never overlaps the photography
     section above, the edition note on the right, or the footer below. */

  const brochureDealershipName =
    sellerIdentity?.isDealer
      ? (sellerIdentity.dealershipName || "").trim()
      : "";

    const pbTop = thumbBottom + 10;

  if(sellerIdentity && brochureDealershipName){

    pdf.setFont("helvetica","bold");
    pdf.setFontSize(6);
    pdf.setTextColor(...BR_MUTED);
    brochureSpacedText(pdf, "PRESENTED BY", BR_MARGIN, pbTop, 0.35);

    /* dealership logo + name on one row */
    let logoW = 0;
    if(sellerIdentity.imageUrl){
      try{
        const dImg =
          await brochureResolveImage(sellerIdentity.imageUrl, 400);
        const dRound =
          await brochureRoundImageCorners(
            dImg.dataUrl, 10, 10, 2, 400
          );
                const dFw = dRound.fitWmm || 10;
        const dFh = dRound.fitHmm || 10;
        pdf.addImage(
          dRound.dataUrl, dRound.format,
          BR_MARGIN + (10 - dFw) / 2, pbTop + 1 + (10 - dFh) / 2,
          dFw, dFh
        );
        logoW = 10;
      }catch(err){}
    }

    const nameX = BR_MARGIN + (logoW ? logoW + 5 : 0);

    pdf.setFont("helvetica","bold");
    let dSize = 10;
    pdf.setFontSize(dSize);
    pdf.setTextColor(...BR_DARK);
    while(
      pdf.getTextWidth(brochureDealershipName) > 96 &&
      dSize > 7
    ){
      dSize -= 0.5;
      pdf.setFontSize(dSize);
    }
    pdf.text(
      brochureClipText(pdf, brochureDealershipName, 96),
      nameX, pbTop + 8
    );

    /* contact details in their own vertical space */
    const contactLines = [];
    if(sellerIdentity.email) contactLines.push(sellerIdentity.email);
    if(sellerIdentity.phone) contactLines.push(sellerIdentity.phone);
    if(sellerIdentity.address) contactLines.push(sellerIdentity.address);

    let cyy = pbTop + 15;

    if(contactLines.length){
      pdf.setFont("helvetica","normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...BR_SLATE);
      for(const line of contactLines){
        if(cyy > 279) break;
        pdf.text(
          brochureClipText(pdf, line, 110),
          BR_MARGIN, cyy
        );
        cyy += 4;
      }
    }

    /* social links â€” one compact clipped line, kept clear of the footer */
    const hdrSocial = sellerIdentity.socialLinks || [];
    if(hdrSocial.length && cyy <= 277){
      const SOCIAL_ABBREV = {
        whatsapp: "WA",
        facebook: "FB",
        instagram: "IG",
        tiktok: "TT",
        other: "OT"
      };
      const socialText = hdrSocial
        .map(l =>
          (SOCIAL_ABBREV[l.id] || l.id.substring(0, 2).toUpperCase()) +
          ": " + l.href
        )
        .join("   Â·   ");
      pdf.setFont("helvetica","normal");
      pdf.setFontSize(6);
      pdf.setTextColor(...BR_MUTED);
      pdf.text(
        brochureClipText(pdf, socialText, 110),
        BR_MARGIN, cyy
      );
    }

  }

    /* ---------- FOOTER ---------- */

  brochureFooter(pdf, 1);

}

/* =========================================
PAGE 2 â€” VEHICLE SPECIFICATIONS
========================================= */

function buildBrochureSpecs(v){

  const specs = [];

  const add = (label, value) => {

    if(
      value === null ||
      value === undefined ||
      value === ""
    ){
      return;
    }

    specs.push({ label, value: String(value) });

  };

  add("Year", v.year);

  add(
    "Mileage",
    brochureNumber(v.mileage)
      ? brochureNumber(v.mileage).toLocaleString("en-ZA") + " km"
      : null
  );

  add("Fuel Type", v.fuel_type);
  add("Transmission", v.transmission);
  add("Drive Type", v.drive_type);
  add("Body Type", v.body_type);
  add("Colour", v.color);
  add("Doors", v.doors);
  add("Seats", v.seats);
  add("VIN", v.vin);
  add("Location", v.location);
  add("Condition", v.condition);
  add("Owners", v.owners);

  add(
    "Engine Capacity",
    brochureNumber(v.engine_capacity_cc)
      ? brochureNumber(v.engine_capacity_cc).toLocaleString("en-ZA") + " cc"
      : null
  );

  add(
    "Battery Capacity",
    brochureNumber(v.battery_capacity_kwh)
      ? brochureNumber(v.battery_capacity_kwh) + " kWh"
      : null
  );

  add(
    "Battery Range",
    brochureNumber(v.battery_range_km)
      ? brochureNumber(v.battery_range_km).toLocaleString("en-ZA") + " km"
      : null
  );

  add(
    "Charging Time",
    brochureNumber(v.charging_time_hours)
      ? brochureNumber(v.charging_time_hours) + " hours"
      : null
  );

  add(
    "Payload Capacity",
    brochureNumber(v.payload_capacity_kg)
      ? brochureNumber(v.payload_capacity_kg).toLocaleString("en-ZA") + " kg"
      : null
  );

  add(
    "Towing Capacity",
    brochureNumber(v.towing_capacity_kg)
      ? brochureNumber(v.towing_capacity_kg).toLocaleString("en-ZA") + " kg"
      : null
  );

  add(
    "Service History",
    v.service_history
      ? "Available"
      : null
  );

  add(
    "Finance Available",
    v.finance_available
      ? "Yes"
      : null
  );

  add(
    "VAT Included",
    v.vat_included
      ? "Yes"
      : null
  );

  add(
    "Price Negotiable",
    v.price_negotiable
      ? "Yes"
      : null
  );

  return specs;

}

/* =========================================
PAGE 2 â€” VEHICLE PROFILE Â· SPECIFICATION CARDS
Compact spec cards (soft grey, uppercase micro
label, bold navy value, orange micro-accent) +
grouped detail sections. Every field preserved.
========================================= */

/* (The former 3-column spec-card grid helper was retired in favour of the
   premium editorial grouped specification layout â€” see drawBrochurePage2.) */

function brochureSpecGroupFor(label){
  const L = String(label).toLowerCase();
  if([
    "engine capacity","battery capacity","battery range",
    "charging time","payload capacity","towing capacity"
  ].includes(L)) return "PERFORMANCE & CAPABILITY";
  if(["condition","owners","service history"].includes(L))
    return "OWNERSHIP & HISTORY";
  if(["finance available","vat included","price negotiable"].includes(L))
    return "PRICING & COMMERCIAL";
  return "GENERAL INFORMATION";
}

function brochureProfileContinuation(pdf){
  const y = drawSubHeader(pdf, 2);
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...BR_GOLD);
  brochureSpacedText(pdf, "VEHICLE PROFILE", BR_MARGIN, y + 4, 0.45);
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...BR_DARK);
  pdf.text("Vehicle Profile â€” Continued", BR_MARGIN, y + 11);
  return y + 18;
}

function drawBrochurePage2(pdf, v){

  const allSpecs = buildBrochureSpecs(v);
  if(!allSpecs.length) return;

  let y = drawSubHeader(pdf, 2);

  /* ---------- SECTION TITLE ---------- */

  y += 4;
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...BR_GOLD);
  brochureSpacedText(pdf, "VEHICLE PROFILE", BR_MARGIN, y, 0.45);

  y += 9;
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(24);
  pdf.setTextColor(...BR_DARK);
  pdf.text("Vehicle Profile", BR_MARGIN, y);

  /* ---------- NAVY IDENTITY STRIP ---------- */

  y += 8;
  const stripH = 17;

  pdf.setFillColor(...BR_NAVY);
  pdf.rect(BR_MARGIN, y, BR_CONTENT_W, stripH, "F");
  pdf.setFillColor(...BR_GOLD);
  pdf.rect(BR_MARGIN, y, 1.8, stripH, "F");

  const title =
    (v.make || "") + (v.model ? " " + v.model : "");

  pdf.setFont("helvetica","bold");
  pdf.setFontSize(12);
  pdf.setTextColor(...BR_WHITE);
  pdf.text(
    brochureClipText(pdf, title || "Vehicle", 92),
    BR_MARGIN + 6, y + stripH / 2 + 1.4
  );

  const priceText =
    v.price
      ? "R " + brochureNumber(v.price).toLocaleString("en-ZA")
      : null;

  let rightX = BR_MARGIN + BR_CONTENT_W - 6;

  if(priceText){
    pdf.setFont("helvetica","bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...BR_GOLD);
    pdf.text(priceText, rightX, y + stripH / 2 + 1.4, { align: "right" });
    rightX -= pdf.getTextWidth(priceText) + 6;
  }

  if(v.year){
    pdf.setFont("helvetica","normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...BR_LIGHT_ON_NAVY);
    pdf.text(String(v.year), rightX, y + stripH / 2 + 1.3, { align: "right" });
  }

  y += stripH + 10;

  /* ---------- GROUPED SPECIFICATIONS (PREMIUM EDITORIAL) ---------- */

  const CORE = [
    "Year","Mileage","Fuel Type","Transmission","Drive Type",
    "Body Type","Colour","Doors","Seats","VIN","Location"
  ];

  const core = [];
  const rest = [];

  allSpecs.forEach(s => {
    if(CORE.includes(s.label)) core.push(s);
    else rest.push(s);
  });

  const groups = { "CORE VEHICLE SPECIFICATIONS": core };

  rest.forEach(s => {
    const g = brochureSpecGroupFor(s.label);
    (groups[g] = groups[g] || []).push(s);
  });

  const groupOrder = [
    "CORE VEHICLE SPECIFICATIONS",
    "PERFORMANCE & CAPABILITY",
    "OWNERSHIP & HISTORY",
    "PRICING & COMMERCIAL",
    "GENERAL INFORMATION"
  ];

  const colGap = 12;
  const colW = (BR_CONTENT_W - colGap) / 2;
  const rowH = 7.2;

  const drawGroup = (groupName, specs) => {

    if(!specs || !specs.length) return;

    const rows = Math.ceil(specs.length / 2);
    const groupH = 13 + rows * rowH + 8;

    /* keep the whole group together â€” move to the next page if needed */
    if(y + groupH > 278){
      pdf.addPage();
      y = brochureProfileContinuation(pdf);
    }

    /* group header â€” orange marker + spaced caps + hairline */
    pdf.setFillColor(...BR_GOLD);
    pdf.rect(BR_MARGIN, y - 2.4, 2.4, 2.4, "F");

    pdf.setFont("helvetica","bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...BR_DARK);
    brochureSpacedText(pdf, groupName, BR_MARGIN + 6, y, 0.35);

    pdf.setDrawColor(...BR_LINE);
    pdf.setLineWidth(0.3);
    pdf.line(BR_MARGIN, y + 2.6, BR_PAGE_W - BR_MARGIN, y + 2.6);

    y += 9;

    specs.forEach((spec, i) => {

      const col = i % 2;
      const row = Math.floor(i / 2);
      const ry = y + row * rowH;
      const cx = BR_MARGIN + col * (colW + colGap);

      pdf.setFont("helvetica","bold");
      pdf.setFontSize(6);
      pdf.setTextColor(...BR_MUTED);
      brochureSpacedText(
        pdf, spec.label.toUpperCase(), cx, ry + 3, 0.25
      );

      pdf.setFont("helvetica","bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...BR_DARK);
      pdf.text(
        brochureClipText(pdf, spec.value, colW * 0.55),
        cx + colW, ry + 3, { align: "right" }
      );

    });

    y += rows * rowH + 8;

  };

  groupOrder.forEach(g => drawGroup(g, groups[g]));

  brochureFooter(pdf, 2);

}

/* =========================================
PAGE 3 â€” VEHICLE FEATURES Â· EDITORIAL MATRIX
Numbered category sections with two-column
feature rows and hand-drawn orange check marks.
No pills, no glyph characters, no emojis.
========================================= */

function drawBrochurePage3(pdf, groups){

  const categories =
    Object.keys(groups)
      .sort((a, b) => a.localeCompare(b));

  let y = drawSubHeader(pdf, 3);

  y += 4;
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...BR_GOLD);
  brochureSpacedText(pdf, "HIGHLIGHTS", BR_MARGIN, y, 0.45);

  y += 9;
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(22);
  pdf.setTextColor(...BR_DARK);
  pdf.text("Vehicle Features", BR_MARGIN, y);

  y += 7;
  pdf.setFont("helvetica","normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...BR_SLATE);
  pdf.text(
    "Every featured capability of this vehicle, organised by category.",
    BR_MARGIN, y
  );

  y += 10;

  const colGap = 8;
  const colW = (BR_CONTENT_W - colGap) / 2;
  const rowH = 5.4;
  let sectionNo = 0;

  const continuation = () => {
    pdf.addPage();
    const ny = drawSubHeader(pdf, 3);
    pdf.setFont("helvetica","bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...BR_GOLD);
    brochureSpacedText(pdf, "HIGHLIGHTS", BR_MARGIN, ny + 4, 0.45);
    pdf.setFont("helvetica","bold");
    pdf.setFontSize(16);
    pdf.setTextColor(...BR_DARK);
    pdf.text("Vehicle Features â€” Continued", BR_MARGIN, ny + 11);
    return ny + 18;
  };

  categories.forEach(category => {

    const features = groups[category];
    if(!features || !features.length) return;

    sectionNo++;

    const rows = Math.ceil(features.length / 2);
    const blockH = 13 + rows * rowH + 6;

    if(y + blockH > 278){
      y = continuation();
    }

    /* numbered section header */
    pdf.setFont("helvetica","bold");
    pdf.setFontSize(12);
    pdf.setTextColor(...BR_GOLD);
    pdf.text(String(sectionNo).padStart(2, "0"), BR_MARGIN, y + 3.2);

    pdf.setFont("helvetica","bold");
    pdf.setFontSize(9.5);
    pdf.setTextColor(...BR_DARK);
    brochureSpacedText(
      pdf, String(category).toUpperCase(), BR_MARGIN + 11, y + 3.2, 0.3
    );

    pdf.setDrawColor(...BR_LINE);
    pdf.setLineWidth(0.3);
    pdf.line(BR_MARGIN, y + 6, BR_PAGE_W - BR_MARGIN, y + 6);

    y += 11;

    /* two-column feature rows with orange check marks */
    features.forEach((f, i) => {

      const col = i % 2;
      const row = Math.floor(i / 2);
      let ry = y + row * rowH;

      if(ry + rowH > 280){
        y = continuation();
        ry = y + col * rowH;
      }

      const cx = BR_MARGIN + col * (colW + colGap);

      /* hand-drawn tick â€” pure vector, no glyph needed */
      pdf.setDrawColor(...BR_GOLD);
      pdf.setLineWidth(0.55);
      pdf.line(cx, ry - 0.6, cx + 0.9, ry + 0.3);
      pdf.line(cx + 0.9, ry + 0.3, cx + 2.7, ry - 2.2);

      pdf.setFont("helvetica","normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(...BR_SLATE);
      pdf.text(
        brochureClipText(pdf, String(f), colW - 6),
        cx + 5, ry
      );

    });

    y += rows * rowH + 7;

  });

  brochureFooter(pdf, 3);

}
/* =========================================
PAGE 4 â€” VEHICLE DESCRIPTION Â· EDITORIAL
========================================= */

function drawBrochurePage4(pdf, description){

  let y = drawSubHeader(pdf, 4);

  y += 4;
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...BR_GOLD);
  brochureSpacedText(pdf, "ABOUT THIS VEHICLE", BR_MARGIN, y, 0.45);

  y += 9;
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(22);
  pdf.setTextColor(...BR_DARK);
  pdf.text("Vehicle Description", BR_MARGIN, y);

  y += 12;

  const lines =
    pdf.splitTextToSize(description, BR_CONTENT_W - 6);

  const lineH = 5.6;
  let start = 0;

  const continuation = () => {
    const ny = drawSubHeader(pdf, 4);
    pdf.setFont("helvetica","bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...BR_GOLD);
    brochureSpacedText(pdf, "ABOUT THIS VEHICLE", BR_MARGIN, ny + 4, 0.45);
    pdf.setFont("helvetica","bold");
    pdf.setFontSize(16);
    pdf.setTextColor(...BR_DARK);
    pdf.text("Vehicle Description â€” Continued", BR_MARGIN, ny + 11);
    return ny + 18;
  };

  while(start < lines.length){

    const fitted = Math.floor((278 - y) / lineH);

    if(fitted < 2){
      y = continuation();
      continue;
    }

    const chunk = lines.slice(start, start + fitted);

    /* vertical orange accent alongside the text block */
    pdf.setFillColor(...BR_GOLD);
    pdf.rect(BR_MARGIN, y - 3.8, 1.2, chunk.length * lineH - 1, "F");

    pdf.setFont("helvetica","normal");
    pdf.setFontSize(10.5);
    pdf.setTextColor(...BR_SLATE);
    pdf.text(chunk, BR_MARGIN + 6, y, {
      align: "left",
      lineHeightFactor: 1.45
    });

    y += chunk.length * lineH;
    start += chunk.length;

  }

  brochureFooter(pdf, 4);

}
/* =========================================
GALLERY â€” ASYMMETRIC EDITORIAL PHOTOGRAPHY
One dominant lead photograph with a supporting
grid beneath. Every image is preserved, always
centre-cropped to its frame â€” never distorted.
========================================= */

async function drawGalleryPage(pdf, images, pageNum){

  let y = drawSubHeader(pdf, pageNum);

  y += 4;
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...BR_GOLD);
  brochureSpacedText(pdf, "PHOTO GALLERY", BR_MARGIN, y, 0.45);

  y += 9;
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(22);
  pdf.setTextColor(...BR_DARK);
  pdf.text("Vehicle Gallery", BR_MARGIN, y);

  /* images begin immediately below the heading â€” no dead gap */
  y += 8;

  const areaTop = y;
  const areaBottom = 280;
  const gap = 6;
  const n = images.length;

    /* Pre-resolve all images + aspect ratios so frame heights match
     each photo's natural proportions (no stretching, no cropping) */

  const preRes = [];
  for(let idx = 0; idx < n; idx++){
    try{
      const resolved = await brochureResolveImage(images[idx], 1600);
      const info = await brochureImageRatio(resolved.dataUrl);
      preRes.push({
        dataUrl: resolved.dataUrl,
        format: resolved.format,
        ratio: info ? info.ratio : 1.5
      });
    }catch(err){
      preRes.push({ dataUrl: null, format: null, ratio: 1.5 });
    }
  }

  const frames = [];

  if(n === 1){
    const fitW = BR_CONTENT_W;
    const fitH = Math.min(fitW / preRes[0].ratio, areaBottom - areaTop);
    frames.push({ x: BR_MARGIN, y: areaTop, w: fitW, h: fitH, i: 0 });
  }else if(n === 2){
    const leadH = Math.min(
      BR_CONTENT_W / preRes[0].ratio,
      (areaBottom - areaTop - gap) * 0.6
    );
    frames.push({ x: BR_MARGIN, y: areaTop, w: BR_CONTENT_W, h: leadH, i: 0 });
    const restTop = areaTop + leadH + gap;
    const restH = Math.min(
      BR_CONTENT_W / preRes[1].ratio,
      areaBottom - restTop
    );
    frames.push({ x: BR_MARGIN, y: restTop, w: BR_CONTENT_W, h: restH, i: 1 });
  }else{
    /* Lead + supporting grid â€” each frame sized to its image's ratio */
    const maxLeadH = (areaBottom - areaTop - gap) * 0.45;
    const leadH = Math.min(BR_CONTENT_W / preRes[0].ratio, maxLeadH);
    frames.push({ x: BR_MARGIN, y: areaTop, w: BR_CONTENT_W, h: leadH, i: 0 });

    const restCount = n - 1;
    const cols = restCount === 1 ? 1 : (restCount >= 5 ? 3 : 2);
    const restTop = areaTop + leadH + gap;
    const rows = Math.ceil(restCount / cols);
    const colW = (BR_CONTENT_W - (cols - 1) * gap) / cols;
    const rowBudget = areaBottom - restTop;
    const maxRowH = (rowBudget - (rows - 1) * gap) / rows;

    let curY = restTop;
    for(let row = 0; row < rows; row++){
      const rowStart = row * cols;
      const rowCount = Math.min(cols, restCount - rowStart);

      /* tallest contained image in this row sets the row height */
      let rowH = 0;
      for(let k = 0; k < rowCount; k++){
        rowH = Math.max(rowH, colW / preRes[rowStart + k + 1].ratio);
      }
      rowH = Math.min(rowH, maxRowH);

      let rowX = BR_MARGIN;
      if(rowCount < cols){
        const totalW = rowCount * colW + (rowCount - 1) * gap;
        rowX = BR_MARGIN + (BR_CONTENT_W - totalW) / 2;
      }

      for(let k = 0; k < rowCount; k++){
        frames.push({
          x: rowX + k * (colW + gap),
          y: curY,
          w: colW,
          h: rowH,
          i: rowStart + k + 1
        });
      }

      curY += rowH + gap;
    }
  }

  for(const f of frames){
    try{
      const resolved = preRes[f.i];
      if(resolved && resolved.dataUrl){
        const fitted =
          await brochureRoundImageCorners(
            resolved.dataUrl, f.w, f.h, 2, 1600
          );
        const fW = fitted.fitWmm || f.w;
        const fH = fitted.fitHmm || f.h;
        pdf.addImage(
          fitted.dataUrl, fitted.format,
          f.x + (f.w - fW) / 2, f.y + (f.h - fH) / 2, fW, fH
        );
      }
    }catch(err){
      console.error("Gallery image draw failed:", err);
    }
  }

  brochureFooter(pdf, pageNum);

}
/* =========================================
GALLERY PAGINATION â€” SIZES (UNCHANGED)
========================================= */

function computeGalleryPageSizes(total){

  if(total <= 0) return [];

  const maxPerPage = 6;

  const pages = [];

  let remaining = total;

  while(remaining > 0){

    const size = Math.min(maxPerPage, remaining);

    pages.push(size);

    remaining -= size;

  }

  /* NEVER STRAND A SINGLE IMAGE ON ITS OWN PAGE */
  if(
    pages.length > 1 &&
    pages[pages.length - 1] === 1
  ){

    pages[pages.length - 2] -= 1;
    pages[pages.length - 1] = 2;

  }

  return pages;

}
let currentImageIndex = 0;
let imageList = [];

window.prevImg = function(){
  if(!imageList.length) return;

  setGalleryImage(
    (currentImageIndex - 1 + imageList.length) % imageList.length
  );
};

window.nextImg = function(){
  if(!imageList.length) return;

  setGalleryImage(
    (currentImageIndex + 1) % imageList.length
  );
};

function updateCounter(){

  const counter = document.getElementById("imgCounter");

  if(counter){
    counter.innerText =
      (currentImageIndex + 1) + " / " + imageList.length;
  }

  /* SYNC FULLSCREEN COUNTER IF OPEN */
  const fsCounter = document.getElementById("fsCounter");
  if(fsCounter){
    fsCounter.innerText =
      (currentImageIndex + 1) + " / " + imageList.length;
  }

}

/* ========================================= */
/* ðŸ”¥ FULLSCREEN GALLERY VIEWER              */
/* ========================================= */

window.openFullscreenViewer = function(index){

  if(!imageList.length) return;

  /* SYNC HERO, COUNTER + THUMBNAILS TO OPENING IMAGE */
  if(index >= 0 && index !== currentImageIndex){
    setGalleryImage(index);
  }

  /* BUILD FULLSCREEN OVERLAY */
  const overlay = document.createElement("div");
  overlay.id = "fullscreenGallery";
  overlay.className = "hufa-fs-gallery";

  overlay.innerHTML = `

    <!-- TOP BAR -->
    <div class="hufa-fs-topbar">
      <div id="fsCounter" class="hufa-fs-counter">
        ${currentImageIndex + 1} / ${imageList.length}
      </div>
      <button onclick="closeFullscreenViewer()" class="hufa-fs-close" title="Close (Esc)">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>
    </div>

    <!-- PREV -->
    ${imageList.length > 1 ? `
    <button onclick="fsPrev()" class="hufa-fs-nav hufa-fs-prev" title="Previous (←)">      <i data-lucide="chevron-left" class="w-7 h-7"></i>
    </button>
    ` : ""}

    <!-- IMAGE STAGE -->)">
FIXEDDUMMY2
    <!-- IMAGE STAGE -->
    <div class="hufa-fs-stage" id="fsStage">
      <img id="fsImg"
        src="${imageList[currentImageIndex]}"
        class="hufa-fs-img"
        onerror="this.src='/assets/HUF1.webp'">
    </div>

    <!-- NEXT -->
FIXEDDUMMY2
    <!-- IMAGE STAGE -->
    <div class="hufa-fs-stage" id="fsStage">
      <img id="fsImg"
        src="${imageList[currentImageIndex]}"
        class="hufa-fs-img"
        onerror="this.src='/assets/HUF1.webp'">
    </div>

    <!-- NEXT -->
    ${imageList.length > 1 ? `
    <button onclick="fsNext()" class="hufa-fs-nav hufa-fs-next" title="Next (→)">
      <i data-lucide="chevron-right" class="w-7 h-7"></i>
    </button>
    ` : ""}

    <!-- THUMBNAILS -->
    ${imageList.length > 1 ? `
    <div class="hufa-fs-thumbs" id="fsThumbs">
      ${imageList.map((img, i) => `
        <div data-fsthumb="${i}"
        class="hufa-fs-thumb ${i === currentImageIndex ? 'active' : ''}"
        onclick="fsSetImage(${i})">
          <img src="${img}" onerror="this.src='/assets/HUF1.webp'">
        </div>
      `).join("")}
    </div>
    ` : ""}

  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  /* INIT LUCIDE ICONS */
  loadLucide().then(() => {
    setTimeout(() => lucide.createIcons(), 50);
  });

  /* INIT ZOOM (DESKTOP) */
  initFsZoom();

  /* INIT SWIPE (MOBILE) */
  initFsSwipe();

  /* INIT KEYBOARD */
  initFsKeyboard();

  /* FADE IN */
  requestAnimationFrame(() => {
    overlay.classList.add("hufa-fs-open");
  });

};

window.closeFullscreenViewer = function(){

  const overlay = document.getElementById("fullscreenGallery");

  if(overlay){
    overlay.classList.remove("hufa-fs-open");
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }

  document.body.style.overflow = "";

  /* REMOVE KEYBOARD LISTENER */
  if(window.__fsKeyHandler){
    document.removeEventListener("keydown", window.__fsKeyHandler);
    window.__fsKeyHandler = null;
  }

};

window.fsPrev = function(){

  if(!imageList.length) return;

  setGalleryImage(
    (currentImageIndex - 1 + imageList.length) % imageList.length
  );

};

window.fsNext = function(){

  if(!imageList.length) return;

  setGalleryImage(
    (currentImageIndex + 1) % imageList.length
  );

};

window.fsSetImage = function(index){

  if(index < 0 || index >= imageList.length) return;

  setGalleryImage(index);

};

function setGalleryImage(index){

  if(!imageList.length) return;

  if(index < 0 || index >= imageList.length) return;

  currentImageIndex = index;

  /* MAIN IMAGE (SMOOTH FADE, RACE-SAFE) */
  const carImg = document.getElementById("carImg");
  if(carImg){
    clearTimeout(carImg.__fadeT);
    carImg.style.opacity = "0";
    carImg.__fadeT = setTimeout(() => {
      carImg.src = imageList[currentImageIndex];
      carImg.style.opacity = "1";
    }, 150);
  }

  /* MAIN COUNTER + FULLSCREEN COUNTER */
  updateCounter();

  /* MAIN ACTIVE THUMBNAIL */
  updateActiveThumb();

  /* FULLSCREEN VIEWER (IF OPEN, RACE-SAFE) */
  const fsImg = document.getElementById("fsImg");
  if(fsImg){
    clearTimeout(fsImg.__fadeT);
    fsImg.style.opacity = "0";
    fsImg.__fadeT = setTimeout(() => {
      fsImg.src = imageList[currentImageIndex];
      fsImg.style.opacity = "1";
      fsImg.style.transform = "scale(1)";
      fsImg.dataset.zoom = "1";
    }, 150);
  }

  document.querySelectorAll("[data-fsthumb]").forEach(el => {
    el.classList.remove("active");
  });
  const activeThumb = document.querySelector(`[data-fsthumb="${currentImageIndex}"]`);
  if(activeThumb){
    activeThumb.classList.add("active");
    activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  /* SYNC MAIN ACTIVE THUMB WITH FULLSCREEN STATE */
  requestAnimationFrame(() => {
    updateActiveThumb();
  });

  /* PRELOAD NEXT NEIGHBOURS */
  preloadGalleryNeighbours();

}

/* ========================================= */
/* ðŸ”¥ IMAGE PRELOADING                       */
/* ========================================= */

function preloadGalleryNeighbours(){

  if(!imageList.length) return;

  const prev =
    (currentImageIndex - 1 + imageList.length) % imageList.length;

  const next =
    (currentImageIndex + 1) % imageList.length;

  [prev, next].forEach(i => {

    if(i === currentImageIndex) return;

    const img = new Image();
    img.src = imageList[i];

  });

}

/* ========================================= */
/* ðŸ”¥ MAIN GALLERY KEYBOARD (DESKTOP)       */
/* ========================================= */

function initMainGalleryKeyboard(){

  const carImg = document.getElementById("carImg");

  if(!carImg) return;

  carImg.setAttribute("tabindex", "0");

  carImg.addEventListener("keydown", function(e){

    if(e.key === "ArrowLeft"){
      e.preventDefault();
      prevImg();
    }

    if(e.key === "ArrowRight"){
      e.preventDefault();
      nextImg();
    }

  });

}

/* ========================================= */
/* ðŸ”¥ THUMBNAIL STRIP WHEEL + DRAG          */
/* ========================================= */

function initThumbnailStrip(){

  const strip = document.getElementById("thumbStrip");

  if(!strip) return;

  /* MOUSE WHEEL â†’ HORIZONTAL SCROLL */
  strip.addEventListener("wheel", function(e){

    if(Math.abs(e.deltaY) > Math.abs(e.deltaX)){
      e.preventDefault();
      strip.scrollLeft += e.deltaY;
    }

  }, { passive: false });

  /* MOUSE DRAG SCROLL */
  let isDown = false;
  let startX = 0;
  let startScroll = 0;

  strip.addEventListener("mousedown", function(e){

    isDown = true;
    startX = e.pageX - strip.offsetLeft;
    startScroll = strip.scrollLeft;
    strip.style.cursor = "grabbing";
    strip.style.userSelect = "none";

  });

  document.addEventListener("mouseup", function(){

    if(isDown){
      isDown = false;
      strip.style.cursor = "";
      strip.style.userSelect = "";
    }

  });

  document.addEventListener("mousemove", function(e){

    if(!isDown) return;

    e.preventDefault();

    const x = e.pageX - strip.offsetLeft;
    const walk = (x - startX) * 1.2;
    strip.scrollLeft = startScroll - walk;

  });

  /* TOUCH SWIPE SCROLL (NATIVE + SNAP) */
  let touchStartX = 0;
  let touchStartScroll = 0;

  strip.addEventListener("touchstart", function(e){

    touchStartX = e.changedTouches[0].screenX;
    touchStartScroll = strip.scrollLeft;

  }, { passive: true });

  strip.addEventListener("touchend", function(e){

    const touchEndX = e.changedTouches[0].screenX;
    const diffX = touchStartX - touchEndX;

    /* SNAP TO NEAREST THUMB AFTER SWIPE */
    if(Math.abs(diffX) > 30){

      const thumbs = strip.querySelectorAll("[data-thumb]");
      const thumbWidth = thumbs[0]?.getBoundingClientRect().width || 82;
      const gap = 12;

      const step = thumbWidth + gap;

      const direction = diffX > 0 ? 1 : -1;

      const targetIndex =
        Math.round(strip.scrollLeft / step) + direction;

      const maxIndex = thumbs.length - 1;

      const clamped =
        Math.max(0, Math.min(maxIndex, targetIndex));

      const target =
        clamped * step;

      strip.scrollTo({
        left: target,
        behavior: "smooth"
      });

    }

  }, { passive: true });

}

/* ========================================= */
/* ðŸ”¥ ZOOM (DESKTOP)                         */
/* ========================================= */

function initFsZoom(){

  const fsImg = document.getElementById("fsImg");

  if(!fsImg) return;

  let zoomLevel = 1;
  let isDragging = false;
  let startX = 0, startY = 0;
  let translateX = 0, translateY = 0;

  fsImg.dataset.zoom = "1";

  /* CLICK TO ZOOM */
  fsImg.addEventListener("click", function(e){

    if(isDragging) return;

    if(zoomLevel === 1){
      zoomLevel = 2;

      /* ZOOM TOWARD CLICK POINT */
      const rect = fsImg.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      translateX = -x;
      translateY = -y;

      fsImg.style.transform =
        `scale(${zoomLevel}) translate(${translateX}px, ${translateY}px)`;
      fsImg.style.cursor = "zoom-out";
    }else{
      /* RESET */
      zoomLevel = 1;
      translateX = 0;
      translateY = 0;
      fsImg.style.transform = "scale(1)";
      fsImg.style.cursor = "zoom-in";
    }

    fsImg.dataset.zoom = zoomLevel;

  });

  /* DRAG WHEN ZOOMED */
  fsImg.addEventListener("mousedown", function(e){

    if(zoomLevel === 1) return;

    isDragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    fsImg.style.cursor = "grabbing";
    e.preventDefault();

  });

  document.addEventListener("mousemove", function(e){

    if(!isDragging) return;

    translateX = e.clientX - startX;
    translateY = e.clientY - startY;

    fsImg.style.transform =
      `scale(${zoomLevel}) translate(${translateX}px, ${translateY}px)`;

  });

  document.addEventListener("mouseup", function(){

    if(isDragging){
      isDragging = false;
      fsImg.style.cursor = zoomLevel > 1 ? "zoom-out" : "zoom-in";
    }

  });

  /* DOUBLE CLICK TO RESET */
  fsImg.addEventListener("dblclick", function(){

    zoomLevel = 1;
    translateX = 0;
    translateY = 0;
    fsImg.style.transform = "scale(1)";
    fsImg.style.cursor = "zoom-in";
    fsImg.dataset.zoom = "1";

  });

}

/* ========================================= */
/* ðŸ”¥ SWIPE SUPPORT (MOBILE)                 */
/* ========================================= */

function initFsSwipe(){

  const stage = document.getElementById("fsStage");

  if(!stage) return;

  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartY = 0;
  let touchEndY = 0;

  stage.addEventListener("touchstart", function(e){

    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;

  }, { passive: true });

  stage.addEventListener("touchend", function(e){

    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;

    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    /* HORIZONTAL SWIPE (ignore vertical scroll) */
    if(Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)){

      if(diffX > 0){
        /* SWIPE LEFT â†’ NEXT */
        fsNext();
      }else{
        /* SWIPE RIGHT â†’ PREV */
        fsPrev();
      }

    }

  }, { passive: true });

}

/* ========================================= */
/* ðŸ”¥ SWIPE SUPPORT (MAIN GALLERY MOBILE)    */
/* ========================================= */

function initMainGallerySwipe(){

  const carImg = document.getElementById("carImg");

  if(!carImg) return;

  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartY = 0;
  let touchEndY = 0;

  carImg.addEventListener("touchstart", function(e){

    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;

  }, { passive: true });

  carImg.addEventListener("touchend", function(e){

    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;

    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    /* HORIZONTAL SWIPE ONLY */
    if(Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)){

      if(diffX > 0){
        nextImg();
      }else{
        prevImg();
      }

    }

  }, { passive: true });

}

/* ========================================= */
/* ðŸ”¥ KEYBOARD NAVIGATION                    */
/* ========================================= */

function initFsKeyboard(){

  window.__fsKeyHandler = function(e){

    /* ONLY ACTIVE WHILE THE GALLERY IS OPEN */
    if(!document.getElementById("fullscreenGallery")) return;

    switch(e.key){

      case "ArrowLeft":
        e.preventDefault();
        fsPrev();
        break;

      case "ArrowRight":
        e.preventDefault();
        fsNext();
        break;

      case "Escape":
        e.preventDefault();
        closeFullscreenViewer();
        break;

    }

  };

  document.addEventListener("keydown", window.__fsKeyHandler);

}

/* =========================================
ðŸ”¥ INTERESTED BUTTON STATE
Selected state comes from the actual stored
interest record â€” never faked with a timeout.
========================================= */

function interestedBtnClasses(selected){

return selected
? "bg-[#005BBF] border-[#005BBF] text-white hover:bg-[#004FA8]"
: "bg-white border-slate-200 text-[#08111F] hover:border-[#3B82F6] hover:text-[#3B82F6]";

}

window.setInterestedBtnState = function(selected){

const btn =
document.getElementById("interestedBtn");

if(!btn) return;

btn.className =
"flex items-center justify-center gap-1.5 text-[13px] rounded-xl px-5 py-3 font-semibold transition-all border "
+ interestedBtnClasses(selected);

const labelEl =
btn.querySelector("span");

if(selected){

  btn.title = "Interest sent for this vehicle";

  if(labelEl){
    labelEl.textContent = "Interest Sent âœ“";
  }

  /* Flag so repeated clicks are recognised as already
     submitted instead of opening the form again. */
  btn.dataset.submitted = "1";

}else{

  btn.title = "Interested in this vehicle";

  if(labelEl){
    labelEl.textContent = "Interested";
  }

  delete btn.dataset.submitted;

}

};

window.updateInterestedState = async function(vehicleId){

try{

const btn =
document.getElementById("interestedBtn");

if(!btn || !vehicleId) return;

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user) return; /* signed out â†’ normal unselected state */

const { data:existing } =
await supabase
.from("vehicle_interest")
.select("id")
.eq("vehicle_id", vehicleId)
.eq("buyer_id", userData.user.id)
.maybeSingle();

window.setInterestedBtnState(!!existing);

}catch(err){

console.log("Interested state check failed:", err);

}

};

/* =========================================
COMPLETE PENDING INTEREST AFTER LOGIN
Preserves the intended action: a signed-out
buyer who clicked Interested is brought back
here by the existing login flow and the action
completes automatically.
========================================= */

async function maybeCompletePendingInterest(vehicleId){

try{

if(
sessionStorage.getItem("pendingInterest") !== vehicleId
){
return;
}

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user) return;

sessionStorage.removeItem("pendingInterest");

await window.markInterested(vehicleId);

}catch(err){

console.log("Pending interest failed:", err);

}

}

window.markInterested = async function(vehicleId){

try{

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user){

toast("Please sign in to show interest in this vehicle");

/* Preserve the intended action for after login */
try{
sessionStorage.setItem("pendingInterest", vehicleId);
}catch(e){}

navigate("/login");
return;

}

const user = userData.user;

/* =====================================
ALREADY SUBMITTED â€” recognise the existing
interest and do NOT reopen the form, so the
user can never accidentally create a duplicate.
===================================== */

const { data:existingInterest } =
await supabase
.from("vehicle_interest")
.select("id")
.eq("vehicle_id", vehicleId)
.eq("buyer_id", user.id)
.maybeSingle();

if(existingInterest){

toast("You have already sent interest for this vehicle");

window.setInterestedBtnState(true);

return;

}

/* =====================================
GET VEHICLE
===================================== */

const { data:vehicle } =
await supabase
.from("vehicles")
.select(`
id,
seller_id,
make,
model
`)
.eq("id", vehicleId)
.single();

if(!vehicle){

toast("Vehicle not found");
return;

}

/* =====================================
PREFILL FROM LOGGED-IN ACCOUNT
Do NOT register interest yet â€” open the
popup so the dealer can collect details.
===================================== */

let profile = null;
try{
profile = await getUserProfile();
}catch(e){}

const prefillName =
profile?.name || "";

const prefillSurname =
profile?.surname || "";

const prefillEmail =
profile?.email || user.email || "";

const prefillPhone =
profile?.phone || profile?.mobile || "";

showModal(`

<div class="modal-box space-y-3">

<h2 class="text-xl font-bold">
Express Interest
</h2>

<p class="text-sm text-slate-500">
Share a few details so the dealer can contact you about this vehicle.
</p>

<div class="grid grid-cols-2 gap-2">
<input id="iInterestName" placeholder="Name" autocomplete="given-name" class="w-full border p-2">
<input id="iInterestSurname" placeholder="Surname" autocomplete="family-name" class="w-full border p-2">
</div>

<input id="iInterestEmail" type="email" placeholder="Email" autocomplete="email" class="w-full border p-2">
<input id="iInterestPhone" type="tel" placeholder="Phone Number" autocomplete="tel" class="w-full border p-2">

<textarea id="iInterestMsg" placeholder="Message / Details" class="w-full border p-2" rows="3"></textarea>

<div class="flex gap-2">

<button id="submitInterest"
class="btn btn-gold w-full">
Submit Interest
</button>

<button id="cancelInterest"
class="btn btn-dark w-full">
Cancel
</button>

</div>

</div>

`);

document.getElementById("iInterestName").value = prefillName;
document.getElementById("iInterestSurname").value = prefillSurname;
document.getElementById("iInterestEmail").value = prefillEmail;
document.getElementById("iInterestPhone").value = prefillPhone;

document.getElementById("submitInterest").onclick = () =>
submitInterest(vehicleId, vehicle.seller_id);

document.getElementById("cancelInterest").onclick = () =>
closeModal();

loadLucide().then(() => lucide.createIcons());

}catch(err){

console.error(
"Interest popup failed:",
err
);

toast("Something went wrong");

}

};

/* =====================================
SUBMIT INTEREST â€” validates the popup
fields, then registers the interest.
===================================== */

window.submitInterest = async function(vehicleId, sellerId){

const name =
document.getElementById("iInterestName")?.value.trim() || "";

const surname =
document.getElementById("iInterestSurname")?.value.trim() || "";

const email =
document.getElementById("iInterestEmail")?.value.trim() || "";

const phone =
document.getElementById("iInterestPhone")?.value.trim() || "";

const message =
document.getElementById("iInterestMsg")?.value.trim() || "";

/* =====================================
VERY LIGHT VALIDATION (no layout change)
===================================== */

if(!name){
toast("Please enter your name");
return;
}

if(!surname){
toast("Please enter your surname");
return;
}

if(!email){
toast("Please enter your email");
return;
}

if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
toast("Please enter a valid email address");
return;
}

/* Full name is kept here for backward-compat with
   the existing buyer_name column; surname and the
   message are also sent so they can be persisted. */
const buyerName =
`${name} ${surname}`.trim();

try{

/* =====================================
CREATE INTEREST
===================================== */

const result =
await createVehicleInterest({

vehicleId,
sellerId,

buyerFirstName: name,
buyerName,
buyerEmail: email,
buyerPhone: phone,

buyerSurname: surname,
buyerMessage: message

});

if(result?.error === "ALREADY_INTERESTED"){

toast("You already showed interest in this vehicle");

window.setInterestedBtnState(true);
closeModal();
return;

}

if(result?.error){

toast("Failed to send interest");
return;

}

/* =====================================
SUCCESS â€” show a confirmation popup
===================================== */

window.setInterestedBtnState(true);
closeModal();

showModal(`

<div class="modal-box text-center" style="max-width:420px;">

<div style="
width:64px;
height:64px;
margin:0 auto 16px;
border-radius:9999px;
background:rgba(228,138,47,0.14);
border:1px solid rgba(228,138,47,0.35);
display:flex;
align-items:center;
justify-content:center;
">

<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#E48A2F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
<path d="M5 13l4 4L19 7"/>
</svg>

</div>

<h2 style="
font-size:22px;
font-weight:900;
letter-spacing:-0.02em;
color:#08111F;
margin:0 0 10px;
">
Interest Sent
</h2>

<p style="
font-size:14px;
line-height:1.6;
color:#08111F;
opacity:0.72;
margin:0 0 24px;
">
Thank you. Your interest in this vehicle has been sent to
the dealer. The dealer will contact you as soon as possible.
</p>

<button id="interestDoneBtn"
class="btn btn-gold w-full">
Done
</button>

</div>

`);

document.getElementById("interestDoneBtn").onclick = () =>
closeModal();

}catch(err){

console.error(
"Interest system failed:",
err
);

toast("Something went wrong");

}

};

/* ========================== */
/* ðŸ”¥ COMPARE LIVE SYNC */
/* ========================== */

window.addEventListener(
"compareUpdated",
()=>{

const params =
new URLSearchParams(
window.location.search
);

if(params.get("id")){

loadVehicle();

}

}
);

/* =========================================
ðŸ”¥ RECENTLY VIEWED
========================================= */

async function loadRecentlyViewed(currentVehicle){

try{

const currentId = currentVehicle.id;

/* READ HISTORY */
const viewed =
JSON.parse(
localStorage.getItem(
"recently_viewed"
) || "[]"
);

/* MOST RECENT FIRST, NO DUPLICATES, EXCLUDE CURRENT */
const updated = [

currentId,

...viewed.filter(
id => id !== currentId
)

].slice(0, 8);

localStorage.setItem(
"recently_viewed",
JSON.stringify(updated)
);

/* RENDER SECTION (EXCLUDE CURRENT VEHICLE) */
const history =
updated.filter(
id => id !== currentId
);

if(!history.length) return;

const container =
document.getElementById(
"vehicleBrochure"
);

if(!container) return;

if(
document.getElementById(
"recentlyViewedSection"
)
){
return;
}

container.innerHTML += `

<div
id="recentlyViewedSection"
class="
max-w-[1180px]
mx-auto
mt-12
space-y-4
"
>

<div class="flex items-center justify-between">

<div>

<p class="
text-xs
uppercase
tracking-[0.22em]
text-[#E48A2F]
mb-1.5
font-bold
">
Continue Browsing
</p>

<h2 class="
text-2xl
font-black
tracking-[-0.03em]
text-[#08111F]
">
Recently Viewed
</h2>

</div>

</div>

<div
id="recentlyViewed"
class="
flex
gap-4
overflow-x-auto
pb-3
pt-1
hide-scrollbar
scroll-smooth
snap-x
snap-mandatory
"
>

<!-- Initial skeleton state: replaced by loadRecentlyViewed() with real
     cards or removed when no history exists. -->
${renderRecentlyViewedSkeletons(4)}

</div>

</div>

`;

const { data, error } =
await supabase
.from("vehicles")
.select("*")
.in("id", history);

if(error){

console.error(
"Recently viewed failed:",
error
);

return;

}

/* RE-ACQUIRE AFTER AWAIT (DOM MAY HAVE BEEN REPLACED) */
const box =
document.getElementById(
"recentlyViewed"
);

if(!box) return;

if(!data?.length){

box.innerHTML = "";

return;

}

/* ORDER BY HISTORY (MOST RECENT FIRST) */
const ordered =
history
.map(id =>
data.find(v => v.id === id)
)
.filter(Boolean);

box.innerHTML =
ordered.map(v => `

<div
onclick="viewRelatedVehicle('${v.id}')"
class="
group
cursor-pointer
rounded-[22px]
overflow-hidden
bg-white
border
border-black/5
shadow-[0_10px_24px_rgba(15,23,42,0.07)]
hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)]
transition-all
duration-500
hover:-translate-y-1
snap-center
shrink-0
w-[280px]
sm:w-[300px]
"
>

<div class="
relative
overflow-hidden
h-[170px]
">

<img
src="${v.image_url || '/placeholder.png'}"
width="300"
height="170"
loading="lazy"
decoding="async"
alt="${v.make || ''} ${v.model || ''}"
onerror="this.src='/placeholder.png'"
class="
w-full
h-full
object-cover
group-hover:scale-105
transition-transform
duration-700
"
>

</div>

<div class="p-3.5 space-y-2">

<h3 class="
text-lg
font-black
tracking-[-0.02em]
text-[#08111F]
">
${v.make || ""}
${v.model ? " " + v.model : ""}
</h3>

${v.variant ? `
<p class="
text-[#E48A2F]
text-xs
font-bold
uppercase
tracking-[0.16em]
">
${v.variant}
</p>
` : ""}

<p class="
text-sm
text-[#64748B]
">
${v.year || "-"} •
${Number(v.mileage || 0).toLocaleString()} km
</p>

<div class="
flex
items-center
justify-between
">

<div class="
text-xl
font-black
text-[#E48A2F]
tracking-[-0.02em]
">
R ${Number(v.price || 0).toLocaleString()}
</div>

<div class="
text-[13px]
text-[#3B82F6]
font-semibold
">
View →
</div>

</div>

</div>

</div>

`).join("");

/* INIT CAROUSEL INTERACTIONS */
initHorizontalCarousel(box);

}catch(err){

console.warn(
"Recently viewed failed:",
err
);

}

}

/* =========================================
ðŸ”¥ HORIZONTAL CAROUSEL (RECENTLY VIEWED)
========================================= */

function initHorizontalCarousel(container){

  if(!container) return;

  /* MOUSE WHEEL â†’ HORIZONTAL SCROLL */
  container.addEventListener("wheel", function(e){

    if(Math.abs(e.deltaY) > Math.abs(e.deltaX)){
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }

  }, { passive: false });

  /* MOUSE DRAG SCROLL */
  let isDown = false;
  let startX = 0;
  let startScroll = 0;

  container.addEventListener("mousedown", function(e){

    isDown = true;
    startX = e.pageX - container.offsetLeft;
    startScroll = container.scrollLeft;
    container.style.cursor = "grabbing";
    container.style.userSelect = "none";

  });

  document.addEventListener("mouseup", function(){

    if(isDown){
      isDown = false;
      container.style.cursor = "";
      container.style.userSelect = "";
    }

  });

  document.addEventListener("mousemove", function(e){

    if(!isDown) return;

    e.preventDefault();

    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.2;
    container.scrollLeft = startScroll - walk;

  });

  /* TOUCH SWIPE SCROLL (NATIVE + SNAP) */
  let touchStartX = 0;

  container.addEventListener("touchstart", function(e){

    touchStartX = e.changedTouches[0].screenX;

  }, { passive: true });

  container.addEventListener("touchend", function(e){

    const touchEndX = e.changedTouches[0].screenX;
    const diffX = touchStartX - touchEndX;

    /* SNAP TO NEAREST CARD AFTER SWIPE */
    if(Math.abs(diffX) > 30){

      const cards = container.children;
      const cardWidth = cards[0]?.getBoundingClientRect().width || 280;
      const gap = 16;

      const step = cardWidth + gap;

      const direction = diffX > 0 ? 1 : -1;

      const targetIndex =
        Math.round(container.scrollLeft / step) + direction;

      const maxIndex = cards.length - 1;

      const clamped =
        Math.max(0, Math.min(maxIndex, targetIndex));

      const target =
        clamped * step;

      container.scrollTo({
        left: target,
        behavior: "smooth"
      });

    }

  }, { passive: true });

}

/* =========================================
ðŸ”¥ RELATED NAVIGATION
========================================= */

window.viewRelatedVehicle =
function(id){

navigate("/vehicle?id=" + id);

};

/* =========================================
AI BEHAVIORAL RECOMMENDATION ENGINE
========================================= */

async function loadBehaviorRecommendations(vehicle){

try{

const viewed =
JSON.parse(
localStorage.getItem(
"recently_viewed"
) || "[]"
);

const preferences =
JSON.parse(
localStorage.getItem(
"user_vehicle_preferences"
) || "{}"
);

const container =
document.getElementById(
"vehicleBrochure"
);

if(!container) return;

if(
document.getElementById(
"behaviorRecommendations"
)
){
return;
}

container.innerHTML += `

<div class="
max-w-[1180px]
mx-auto
mt-12
space-y-4
">

<div class="flex items-center justify-between">

<div>

<p class="
text-xs
uppercase
tracking-[0.22em]
text-[#E48A2F]
mb-2
font-bold
">
Recommended For You
</p>

<h2 class="
text-2xl
font-black
tracking-[-0.03em]
text-[#08111F]
">
Because You Viewed
</h2>

</div>

</div>

<div
id="behaviorRecommendations"
class="
grid
md:grid-cols-2
xl:grid-cols-4
gap-4
"
>

<!-- Initial skeleton state: replaced by loadBehaviorRecommendations()
     with real vehicle cards or removed when no recommendations exist. -->
${renderVehicleCardSkeletons(4)}

</div>

</div>

`;

const { data, error } =
await supabase
.from("vehicles")
.select("*")
.neq("id", vehicle.id)
.limit(40);

if(error){

console.error(
"Behavior recommendations failed:",
error
);

return;

}

/* RE-ACQUIRE AFTER AWAIT (DOM MAY HAVE BEEN REPLACED) */
const box =
document.getElementById(
"behaviorRecommendations"
);

if(!box) return;

if(!data?.length){

box.innerHTML =
"No recommendations available";

return;

}

let scored = (data || []).map(v=>{

let score = 0;

/* MAKE MATCH */

if(v.make === vehicle.make){
score += 40;
}

/* MODEL MATCH */

if(v.model === vehicle.model){
score += 25;
}

/* PRICE MATCH */

const priceGap =
Math.abs(
Number(v.price || 0)
-
Number(vehicle.price || 0)
);

if(priceGap <= 50000){
score += 20;
}

/* USER PREFERENCES */

if(
preferences.make &&
preferences.make === v.make
){
score += 30;
}

if(
preferences.fuel &&
preferences.fuel === v.fuel_type
){
score += 10;
}

/* RECENTLY VIEWED BOOST */

if(viewed.includes(v.id)){
score += 12;
}

/* FEATURED BOOST */

if(v.is_featured){
score += 8;
}

/* SPONSORED BOOST */

if(v.is_sponsored){
score += 5;
}

return {
...v,
behaviorScore: score
};

});

scored.sort(
(a,b)=>
b.behaviorScore
-
a.behaviorScore
);

scored = scored.slice(0,4);

box.innerHTML =
scored.map(v=>`

<div
onclick="viewRelatedVehicle('${v.id}')"
class="
group
cursor-pointer
rounded-[22px]
overflow-hidden
bg-white
border
border-black/5
shadow-[0_10px_24px_rgba(15,23,42,0.07)]
hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)]
transition-all
duration-500
hover:-translate-y-1
"
>

<div class="
relative
overflow-hidden
h-[170px]
">

<img
src="${v.image_url || '/placeholder.png'}"
width="300"
height="170"
loading="lazy"
decoding="async"
alt="${v.make || ''} ${v.model || ''}"
onerror="this.src='/placeholder.png'"
class="
w-full
h-full
object-cover
group-hover:scale-105
transition-transform
duration-700
"
>

</div>

<div class="p-3.5 space-y-2">

<h3 class="
text-lg
font-black
tracking-[-0.02em]
text-[#08111F]
">
${v.make || ""}
${v.model ? " " + v.model : ""}
</h3>

${v.variant ? `
<p class="
text-[#E48A2F]
text-xs
font-bold
uppercase
tracking-[0.16em]
">
${v.variant}
</p>
` : ""}

<p class="
text-sm
text-[#64748B]
">
${v.year || "-"} •
${Number(v.mileage || 0).toLocaleString()} km
</p>

<div class="
flex
items-center
justify-between
">

<div class="
text-xl
font-black
text-[#E48A2F]
tracking-[-0.02em]
">
R ${Number(v.price || 0).toLocaleString()}
</div>

<div class="
text-[13px]
text-[#3B82F6]
font-semibold
">
View →
</div>

</div>

</div>

</div>

`).join("");

}catch(err){

console.error(
"Behavior AI failed:",
err
);

}

}

/* =========================================
PREFERENCE MEMORY ENGINE
========================================= */

function loadPreferenceProfile(vehicle){

try{

const existing =
JSON.parse(
localStorage.getItem(
"user_vehicle_preferences"
) || "{}"
);

const profile = {

make:
vehicle.make || existing.make,

fuel:
vehicle.fuel_type || existing.fuel,

lastViewed:
vehicle.id,

updated:
Date.now()

};

localStorage.setItem(
"user_vehicle_preferences",
JSON.stringify(profile)
);

}catch(err){

console.warn(
"Preference engine failed:",
err
);

}

}