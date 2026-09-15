import { asset } from "../js/basePath.js";

const PLACEHOLDER = asset("/placeholder.png");

import {
  supabase,
  getAuthUser
} from "../js/api.js";
import { navigate } from "../js/router.js";

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

return;

}


data.forEach(v => {

list.innerHTML += card(v);

});

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
