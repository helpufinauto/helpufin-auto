import { asset } from "../js/basePath.js";

const PLACEHOLDER = asset("/placeholder.png");

import {
  supabase,
  getAuthUser,
  getUserProfile
} from "../js/api.js";
import { navigate } from "../js/router.js";
import {
  getActiveListLimit,
  getFeaturedLimit
} from "./dashboard.js";

/* =========================================
   PHASE 5 — INVENTORY USAGE / REMAINING COUNTS
   Authoritative sources (no new source of truth):
   - Vehicles uploaded / featured used: the Inventory page's own
     scoped result (vehicles.seller_id = auth.uid(), no extra
     status filter — deleted rows are hard-deleted, so every
     returned row is the same inventory rendered below).
   - Vehicle limit: existing getActiveListLimit() package helper
     (Launch Promotion dealer 50 / private 5; legacy = Infinity).
   - Featured limit: existing getFeaturedLimit() package helper
     (Launch Promotion dealer 15 / private 2; legacy map kept).
   - Featured detection: existing vehicles.is_featured boolean
     (same field rendered as the "Featured" badge on each card).
   Remaining values are clamped with Math.max(0, limit - used)
   so historical over-limit data shows 0, never negative.
   Infinity (legacy unlimited packages) renders as "Unlimited".
   ========================================= */

export function MyVehiclesPage(){

setTimeout(loadVehicles);

return `

<div class="
max-w-[1700px]
mx-auto
px-5
md:px-8
xl:px-10
py-12
min-h-screen
">

<div class="
flex
flex-col
xl:flex-row
xl:items-center
xl:justify-between
gap-6
mb-12
">

<div>

  <p class="
dashboard-page-label
uppercase
tracking-[0.18em]
text-[12px]
font-black
text-[#C6A75D]
mb-3
">
    Inventory Management
  </p>

  <h1 class="
dashboard-page-title
text-4xl
md:text-5xl
font-black
tracking-[-0.04em]
leading-none
text-[#08111F]
">
    My Inventory
  </h1>

</div>

<button
id="addVehicleBtn"
class="
rounded-2xl
bg-[linear-gradient(135deg,#C6A75D,#E3C989)]
text-[#08111F]
px-7
py-4
font-bold
shadow-[0_14px_35px_rgba(198,167,93,0.28)]
hover:-translate-y-[2px]
transition-all
duration-300
">
Add Vehicle
</button>

</div>

<!-- PHASE 5 — INVENTORY USAGE: derived from the same scoped
     inventory result rendered below (no duplicate query).
     Skeleton placeholders mirror .dashboard-kpi-card language
     so no misleading zeroes show while data loads. -->
<section
id="inventoryUsage"
aria-label="Inventory usage"
class="
mb-10
rounded-[28px]
bg-white/80
backdrop-blur-[26px]
border
border-white/50
shadow-[0_25px_70px_rgba(15,23,42,0.08)]
p-6
md:p-8
"
>

<div class="
flex
flex-col
sm:flex-row
sm:items-center
sm:justify-between
gap-2
mb-6
">

<div>
<p class="
uppercase
tracking-[0.18em]
text-[11px]
font-black
text-[#C6A75D]
mb-2
">
Inventory Usage
</p>

<h2 class="
text-2xl
md:text-3xl
font-black
tracking-[-0.03em]
text-[#08111F]
leading-none
">
Package Limits
</h2>
</div>

<p
id="inventoryUsagePlan"
class="
text-[12px]
font-bold
uppercase
tracking-[0.14em]
text-[#64748B]
">
Loading limits…
</p>

</div>

<div class="
grid
grid-cols-2
xl:grid-cols-4
gap-4
lg:gap-6
items-stretch
">

<div class="
dashboard-kpi-card
!rounded-[20px]
">
<div class="dashboard-kpi-label">Vehicles Uploaded</div>
<p id="invUploaded" class="dashboard-kpi-number"><span class="skeleton-shimmer inline-block h-8 w-16 rounded-md"></span></p>
<div id="invUploadedSub" class="dashboard-kpi-sub">Counting your inventory…</div>
</div>

<div class="
dashboard-kpi-card
!rounded-[20px]
">
<div class="dashboard-kpi-label">Vehicles Remaining</div>
<p id="invRemaining" class="dashboard-kpi-number"><span class="skeleton-shimmer inline-block h-8 w-16 rounded-md"></span></p>
<div id="invRemainingSub" class="dashboard-kpi-sub">Checking your package…</div>
</div>

<div class="
dashboard-kpi-card
!rounded-[20px]
">
<div class="dashboard-kpi-label">Featured Used</div>
<p id="invFeatUsed" class="dashboard-kpi-number"><span class="skeleton-shimmer inline-block h-8 w-16 rounded-md"></span></p>
<div id="invFeatUsedSub" class="dashboard-kpi-sub">Counting featured listings…</div>
</div>

<div class="
dashboard-kpi-card
!rounded-[20px]
">
<div class="dashboard-kpi-label">Featured Remaining</div>
<p id="invFeatRemaining" class="dashboard-kpi-number"><span class="skeleton-shimmer inline-block h-8 w-16 rounded-md"></span></p>
<div id="invFeatRemainingSub" class="dashboard-kpi-sub">Checking your package…</div>
</div>

</div>

</section>

<div
id="vehicleList"
class="
grid
grid-cols-1
sm:grid-cols-2
xl:grid-cols-3
2xl:grid-cols-4
gap-8
items-stretch
">

<!-- Initial skeleton state: shown immediately on first paint so the
     page never displays an empty area before the inventory loads.
     loadVehicles() replaces this with real vehicle cards or the
     existing empty state. -->
${renderInventorySkeletons(4)}

</div>

</div>

`;

}

/* =========================================
   LOADING SKELETONS (PHASE 10)
   Mirror the dashboard vehicle card layout exactly —
   image height, title block, meta line, spec pills
   and the two action buttons — using the shared
   .skeleton-image / .skeleton-shimmer language.
   Replaced by loadVehicles() with real cards or the
   existing empty state.
   ========================================= */

function renderInventorySkeletons(count = 4){

const skeletonCard = () => `

<div class="
group
relative
overflow-hidden
rounded-[40px]
bg-white/80
backdrop-blur-[26px]
border
border-white/50
shadow-[0_25px_70px_rgba(15,23,42,0.08)]
dashboard-vehicle-card
flex
flex-col
">

  <!-- IMAGE -->
  <div class="relative overflow-hidden">
    <div class="w-full h-[320px] skeleton-image"></div>
  </div>

  <!-- CONTENT -->
  <div class="p-8 space-y-6 flex flex-col flex-1">

    <!-- TITLE -->
    <div>
      <div class="min-h-[72px] flex flex-col justify-start gap-2">
        <div class="skeleton-shimmer h-7 w-3/4 rounded-md"></div>
        <div class="skeleton-shimmer h-7 w-1/2 rounded-md"></div>
      </div>
      <div class="mt-2">
        <div class="skeleton-shimmer h-4 w-32 rounded"></div>
      </div>
    </div>

    <!-- SPECS -->
    <div class="flex flex-wrap gap-3">
      <div class="skeleton-shimmer h-9 w-24 rounded-full"></div>
      <div class="skeleton-shimmer h-9 w-28 rounded-full"></div>
    </div>

    <!-- ACTIONS -->
    <div class="flex gap-4 pt-4 mt-auto">
      <div class="flex-1 skeleton-shimmer h-[52px] rounded-2xl"></div>
      <div class="flex-1 skeleton-shimmer h-[52px] rounded-2xl"></div>
    </div>

  </div>

</div>

`;

return Array(count).fill(0).map(()=>skeletonCard()).join("");

}


async function loadVehicles(){

document
.getElementById("addVehicleBtn")
.onclick = () =>
navigate("/upload-vehicle");


const user =
await getAuthUser();

if(!user){

navigate("/login");
return;

}


const { data, error } =
await supabase
.from("vehicles")
.select("*")
.eq("seller_id", user.id)
.order("created_at",{ascending:false});


if(error){
  console.error(error);
  alert("Save failed: " + error.message);
  return;
}


const list =
document.getElementById("vehicleList");

list.innerHTML = "";


if(!data.length){

list.innerHTML = `

<div class="
col-span-full
rounded-[40px]
border
border-dashed
border-[#DCE3EC]
bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)]
p-16
text-center
shadow-[0_20px_60px_rgba(15,23,42,0.05)]
">

  <h2 class="
  text-3xl
  font-black
  tracking-[-0.04em]
  text-[#08111F]
  mb-4
  ">
    No vehicles yet
  </h2>

  <p class="
  text-[#64748B]
  text-lg
  leading-relaxed
  max-w-xl
  mx-auto
  ">
    Start building your premium inventory collection.
  </p>

</div>

`;

await renderInventoryUsage(data || []);

return;

}


data.forEach(v => {

list.innerHTML += card(v);

});

await renderInventoryUsage(data || []);

}


/* =========================================
   PHASE 5 — renderInventoryUsage(vehicles)
   Reuses the vehicles array already loaded by loadVehicles()
   (same seller_id-scoped result rendered below) — no duplicate
   inventory query. Limits come from the existing dashboard
   package helpers. Missing DOM (user navigated away) exits
   silently. No auth tokens / profile data logged.
   ========================================= */

async function renderInventoryUsage(vehicles){

const uploadedEl =
document.getElementById("invUploaded");

const remainingEl =
document.getElementById("invRemaining");

const featUsedEl =
document.getElementById("invFeatUsed");

const featRemainingEl =
document.getElementById("invFeatRemaining");

/* Page changed before data arrived — nothing to update. */
if(
!uploadedEl ||
!remainingEl ||
!featUsedEl ||
!featRemainingEl
){
return;
}

const rows =
Array.isArray(vehicles)
? vehicles
: [];

const uploaded =
rows.length;

const featuredUsed =
rows.filter(v => v && v.is_featured === true).length;

let vehicleLimit = Infinity;
let featuredLimit = 0;
let planLabel = "";

try{

const [activeLimit, featLimit] =
await Promise.all([
getActiveListLimit(),
getFeaturedLimit()
]);

vehicleLimit = activeLimit;
featuredLimit = featLimit;

const profile =
await getUserProfile();

const isDealer =
profile?.account_type === "dealer";

planLabel =
isDealer ? "Dealership" : "Private Seller";

}catch(err){

console.error(
"Inventory usage limits failed",
err?.message || err
);

}

const vehiclesRemainingText =
vehicleLimit === Infinity
? "Unlimited"
: String(Math.max(0, vehicleLimit - uploaded));

const featuredRemainingText =
featuredLimit === Infinity
? "Unlimited"
: String(Math.max(0, featuredLimit - featuredUsed));

uploadedEl.textContent = String(uploaded);
remainingEl.textContent = vehiclesRemainingText;
featUsedEl.textContent = String(featuredUsed);
featRemainingEl.textContent = featuredRemainingText;

setTextIfPresent(
"invUploadedSub",
vehicleLimit === Infinity
? "Total listings in your inventory"
: `of ${vehicleLimit} included listings`
);

setTextIfPresent(
"invRemainingSub",
vehicleLimit === Infinity
? "Your package has no vehicle cap"
: "slots left on your package"
);

setTextIfPresent(
"invFeatUsedSub",
featuredLimit === Infinity
? "Total featured in your inventory"
: `of ${featuredLimit} included featured`
);

setTextIfPresent(
"invFeatRemainingSub",
featuredLimit === Infinity
? "Your package has no featured cap"
: "featured slots left"
);

setTextIfPresent(
"inventoryUsagePlan",
planLabel
? `${planLabel} · Launch Promotion`
: "Launch Promotion"
);

}


function setTextIfPresent(id, text){

const el =
document.getElementById(id);

if(el){
el.textContent = text;
}

}



function card(v){

return `

<div class="
group
relative
overflow-hidden
rounded-[40px]
bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.92))]
backdrop-blur-[26px]
border
border-white/50
shadow-[0_25px_70px_rgba(15,23,42,0.08)]
hover:shadow-[0_35px_90px_rgba(15,23,42,0.14)]
transition-all
duration-500
hover:-translate-y-[6px]
dashboard-vehicle-card
flex
flex-col
">

  <!-- IMAGE -->
  <div class="relative overflow-hidden">

    <img
      src="${v.image_url || PLACEHOLDER}"
      width="400"
      height="320"
      loading="lazy"
      decoding="async"
      alt="${v.make || ''} ${v.model || ''}"
      onerror="this.src='${PLACEHOLDER}'"
      class="
w-full
h-[320px]
object-cover
transition-transform
duration-700
group-hover:scale-[1.05]
"
    >

    <!-- OVERLAY -->
    <div class="
    absolute inset-0
    bg-gradient-to-t
    from-black/70
    via-black/10
    to-transparent"></div>

    <!-- FEATURED -->
    ${v.is_featured ? `
      <div class="
absolute
top-5
left-5
px-4
py-2
rounded-full
bg-[linear-gradient(135deg,#C6A75D,#E3C989)]
text-[#08111F]
text-[11px]
uppercase
tracking-[0.14em]
font-black
shadow-[0_12px_30px_rgba(198,167,93,0.28)]
backdrop-blur-xl
">
        Featured
      </div>
    ` : ""}

    <!-- PRICE -->
    <div class="absolute bottom-4 left-4">

      <p class="
text-white
text-3xl
font-black
tracking-[-0.03em]
drop-shadow-[0_10px_30px_rgba(0,0,0,0.28)]
">
        R ${Number(v.price).toLocaleString()}
      </p>

    </div>

  </div>

  <!-- CONTENT -->
  <div class="
p-8
space-y-6
flex
flex-col
flex-1
">

    <!-- TITLE -->
    <div>

      <h2 class="
text-[30px]
font-black
tracking-[-0.04em]
leading-[1]
text-[#08111F]
line-clamp-2
min-h-[72px]
">

        ${v.make} ${v.model}

      </h2>

      <p class="
text-[15px]
text-[#64748B]
mt-2
font-medium
tracking-[0.01em]
">
        ${v.year || ""} • ${v.mileage || "-"} km
      </p>

    </div>

    <!-- SPECS -->
    <div class="flex flex-wrap gap-3">

      ${v.fuel_type ? `
      <div class="
px-4
py-2
rounded-full
bg-[#0A192F]/5
text-[#0A192F]
text-[11px]
uppercase
tracking-[0.12em]
font-bold
border
border-[#E2E8F0]
">
        ${v.fuel_type}
      </div>
      ` : ""}

      ${v.transmission ? `
      <div class="
px-4
py-2
rounded-full
bg-[#0A192F]/5
text-[#0A192F]
text-[11px]
uppercase
tracking-[0.12em]
font-bold
border
border-[#E2E8F0]
">
        ${v.transmission}
      </div>
      ` : ""}

    </div>

    <!-- ACTIONS -->
    <div class="flex gap-4 pt-4 mt-auto">

      <button
        onclick="viewVehicle('${v.id}')"
        class="
flex-1
rounded-2xl
${v.is_featured ? 'bg-[#E48A2F] hover:bg-[#D67E2C]' : 'bg-[#005BBF] hover:bg-[#004FA8]'}
text-white
py-4
text-sm
font-semibold
shadow-[0_14px_35px_rgba(10,25,47,0.18)]
transition-all
duration-300
hover:-translate-y-[2px]
">
        View
      </button>

      <button
        onclick="editVehicle('${v.id}')"
        class="
flex-1
rounded-2xl
bg-[linear-gradient(135deg,#C6A75D,#E3C989)]
text-[#08111F]
hover:bg-[#C6A75D]
py-4
text-sm
font-bold
shadow-[0_14px_35px_rgba(198,167,93,0.28)]
transition-all
duration-300
hover:-translate-y-[2px]
">
        Edit
      </button>

    </div>

  </div>

</div>

`;
}


/* ===================== */
/* DELETE FIX */
/* ===================== */
window.deleteVehicle = async function(id){

  const confirmDelete =
  confirm(
    "Are you sure you want to delete this vehicle?"
  );

  if(!confirmDelete) return;

  const user =
  await getAuthUser();

  if(!user){

    navigate("/login");
    return;

  }

  /* =====================================
  FETCH VEHICLE FIRST
  ===================================== */

  const { data:vehicle, error:fetchError } =
  await supabase
    .from("vehicles")
    .select("id,seller_id,images,image_url")
    .eq("id", id)
    .eq("seller_id", user.id)
    .single();

  if(fetchError || !vehicle){

    alert(
      "Unauthorized vehicle access"
    );

    return;

  }

  /* =====================================
  DELETE STORAGE IMAGES
  ===================================== */

  const images =
  vehicle.images ||
  (vehicle.image_url
    ? [vehicle.image_url]
    : []);

  const storagePaths = [];

  images.forEach(url => {

    try{

      const split =
      url.split("/vehicle-images/");

      if(split[1]){

        storagePaths.push(
          decodeURIComponent(split[1])
        );

      }

    }catch(err){

      console.error(
        "IMAGE PATH PARSE ERROR",
        err
      );

    }

  });

  if(storagePaths.length){

    const { error:storageError } =
    await supabase.storage
      .from("vehicle-images")
      .remove(storagePaths);

    if(storageError){

      console.error(
        "STORAGE DELETE ERROR",
        storageError
      );

    }

  }

  /* =====================================
  DELETE RELATED DATA
  ===================================== */

  await supabase
    .from("vehicle_views")
    .delete()
    .eq("vehicle_id", id);

  /* =====================================
  DELETE VEHICLE
  ===================================== */

  const { error } =
  await supabase
    .from("vehicles")
    .delete()
    .eq("id", id)
    .eq("seller_id", user.id);

  if(error){

    alert(
      "Delete failed: " +
      error.message
    );

    return;

  }

  alert(
    "Vehicle deleted successfully"
  );

  loadVehicles();

};
window.viewVehicle = function(id){

navigate("/vehicle?id="+id);

};
