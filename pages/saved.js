import {
  renderVehicleCard,
  renderVehicleCardSkeletons
} from "../components/vehicleCard.js";
import {
  supabase,
  getAuthUser
} from "../js/api.js";
import { navigate } from "../js/router.js";

export function SavedPage(){

setTimeout(loadSaved, 0);

return `

<div class="
saved-page
min-h-screen
overflow-x-hidden
">

  <div class="
  max-w-[1240px]
  mx-auto
  px-4
  sm:px-6
  xl:px-8
  pt-8
  md:pt-10
  pb-10
  md:pb-12
  ">

    <!-- ==============================
    PAGE INTRODUCTION (COMPACT)
    ============================== -->
    <div class="
    flex
    items-start
    justify-between
    gap-4
    flex-wrap
    mb-4
    ">

      <div>

        <div class="
        text-[#3B82F6]
        text-[9px]
        sm:text-[10px]
        font-bold
        tracking-[0.22em]
        uppercase
        mb-2
        ">
          My Collection
        </div>

        <h1 class="
        saved-page-title
        text-[#081120]
        font-black
        tracking-[-0.03em]
        leading-[1.05]
        text-[clamp(1.35rem,3.2vw,1.7rem)]
        ">
          Saved Vehicles
        </h1>

        <p class="
        mt-2
        text-slate-500
        text-[12px]
        sm:text-[12.5px]
        leading-relaxed
        max-w-[430px]
        ">
          Keep the vehicles you're interested in one place and
          compare your favourites before making a decision.
        </p>

      </div>

    </div>

    <!-- ==============================
    COLLECTION SUMMARY + PRIMARY ACTION (COMPACT)
    ============================== -->
    <div class="
    flex
    items-center
    justify-between
    gap-4
    flex-wrap
    mb-4
    ">

      <div
        id="savedSummary"
        class="
        saved-summary
        hidden
        items-center
        gap-2.5
        "
      >

        <div class="
        saved-summary-icon
        w-9
        h-9
        rounded-[10px]
        flex
        items-center
        justify-center
        flex-shrink-0
        ">
          <svg class="w-4.5 h-4.5" style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
          </svg>
        </div>

        <div class="flex items-baseline gap-1.5">
          <span
            id="savedCount"
            class="
            saved-summary-count
            text-[#081120]
            font-black
            text-[18px]
            leading-none
            "
          >
            0
          </span>
          <span class="
          saved-summary-label
          text-slate-500
          text-[11px]
          font-semibold
          ">
            Saved Vehicles
          </span>
        </div>

      </div>

      <button
        onclick="navigate('/browse')"
        class="
        saved-browse-btn
        h-11
        rounded-[10px]
        bg-[#005BBF]
        hover:bg-[#004FA8]
        text-white
        px-5
        font-semibold
        text-[13px]
        shadow-[0_10px_25px_rgba(10,25,47,0.16)]
        transition-all
        duration-300
        hover:-translate-y-[1px]
        hover:shadow-[0_16px_40px_rgba(10,25,47,0.22)]
        touch-manipulation
        "
      >
        Browse Vehicles
      </button>

    </div>

    <!-- ==============================
    SAVED VEHICLES SECTION (COMPACT)
    ============================== -->
    <div
      id="savedSection"
      class="
      hidden
      mb-3
      "
    >

      <div class="
      text-[#3B82F6]
      text-[9px]
      font-bold
      tracking-[0.22em]
      uppercase
      mb-1
      ">
        Your Collection
      </div>

      <h2 class="
      saved-section-title
      text-[#081120]
      font-black
      tracking-[-0.02em]
      text-[17px]
      sm:text-[19px]
      ">
        <span id="savedSectionCount">0</span> Vehicles Saved
      </h2>

    </div>

    <!-- ==============================
    SAVED VEHICLE CARDS
    ============================== -->
    <div
      id="savedList"
      class="
      saved-grid
      grid
      grid-cols-1
      sm:grid-cols-2
      xl:grid-cols-3
      gap-3
      md:gap-4
      items-stretch
      "
    >

      <!-- Initial skeleton state: shown immediately on first paint so the
           page never displays an empty area before the saved vehicles load.
           loadSaved() replaces this with real vehicle cards, the existing
           empty state, or the existing error state. -->
      ${renderVehicleCardSkeletons(6)}

    </div>

  </div>

</div>

`;
}

/* ========================================= */

async function loadSaved(){

try{

const user =
await getAuthUser();

if(!user){

navigate("/login");
return;

}

/* =========================================
   GET SAVED IDS
========================================= */

const {
data:saved,
error:savedError
} =
await supabase
.from("saved_vehicles")
.select("*")
.eq("user_id", user.id);

if(savedError){

console.error(
"Saved fetch error:",
savedError
);

showError(
"Error loading saved vehicles"
);

return;

}

if(!saved || !saved.length){

showEmptyState();
return;

}

/* =========================================
   VEHICLE IDS
========================================= */

const ids =
(saved || [])
.map((s)=>s.vehicle_id)
.filter(Boolean);

if(!ids.length){

showEmptyState();
return;

}

/* =========================================
   GET VEHICLES
========================================= */

const {
data:vehicles,
error:vehicleError
} =
await supabase
.from("vehicles")
.select("*")
.in("id", ids);

if(vehicleError){

console.error(
"Vehicle fetch error:",
vehicleError
);

showError(
"Error loading vehicles"
);

return;

}

render(
Array.isArray(vehicles)
? vehicles
: []
);

}catch(err){

console.error(
"loadSaved error:",
err
);

showError(
"Unexpected error loading saved vehicles"
);

}

}

/* ========================================= */

function render(list = []){

const box =
document.getElementById("savedList");

if(
!box ||
!document.body.contains(box)
){
return;
}

box.innerHTML = "";

if(
!Array.isArray(list) ||
!list.length
){

showEmptyState();
return;

}

/* Update collection summary + section heading */
const count = list.length;

const summary =
document.getElementById("savedSummary");

if(summary){
summary.classList.remove("hidden");
summary.classList.add("flex");
}

const countEl =
document.getElementById("savedCount");

if(countEl){
countEl.textContent = String(count);
}

const section =
document.getElementById("savedSection");

if(section){
section.classList.remove("hidden");
}

const sectionCount =
document.getElementById("savedSectionCount");

if(sectionCount){
sectionCount.textContent = String(count);
}

(list || []).forEach((v)=>{

  box.insertAdjacentHTML("beforeend", renderVehicleCard(v, {
    actions: "saved"
  }));

});
}


function showEmptyState(){

const box =
document.getElementById("savedList");

if(!box) return;

/* Hide summary + section heading */
const summary =
document.getElementById("savedSummary");

if(summary){
summary.classList.add("hidden");
summary.classList.remove("flex");
}

const section =
document.getElementById("savedSection");

if(section){
section.classList.add("hidden");
}

box.innerHTML = `

<div class="
saved-empty
col-span-full
rounded-[16px]
border
border-dashed
border-slate-200
bg-white
px-5
py-10
md:py-12
text-center
shadow-sm
">

  <div class="
  saved-empty-icon
  w-12
  h-12
  mx-auto
  rounded-[14px]
  flex
  items-center
  justify-center
  mb-4
  ">
    <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
    </svg>
  </div>

  <h2 class="
  text-[#081120]
  text-[18px]
  font-black
  tracking-[-0.02em]
  mb-1.5
  ">
    No saved vehicles yet
  </h2>

  <p class="
  text-[#64748B]
  text-[12.5px]
  leading-relaxed
  max-w-sm
  mx-auto
  ">
    Vehicles you save will appear here so you can easily
    return to them later.
  </p>

  <button
    onclick="navigate('/browse')"
    class="
    saved-browse-btn
    mt-5
    h-11
    rounded-[10px]
    bg-[#005BBF]
    hover:bg-[#004FA8]
    text-white
    px-5
    font-semibold
    text-[13px]
    shadow-[0_10px_25px_rgba(10,25,47,0.16)]
    transition-all
    duration-300
    hover:-translate-y-[1px]
    hover:shadow-[0_16px_40px_rgba(10,25,47,0.22)]
    touch-manipulation
    "
  >
    Browse Vehicles
  </button>

</div>

`;

}

/* ========================================= */

function showError(message){

const box =
document.getElementById("savedList");

if(!box) return;

box.innerHTML = `

<div class="
col-span-full
rounded-[20px]
border
border-red-500/20
bg-red-500/5
text-red-400
p-8
text-center
">

${message}

</div>

`;

}

/* ========================================= */

window.removeSaved = async function(id){

try{

const user =
await getAuthUser();

if(!user){
return;
}

const { error } =
await supabase
.from("saved_vehicles")
.delete()
.eq("vehicle_id", id)
.eq("user_id", user.id);

if(error){

console.error(
"Remove saved error:",
error
);

return;

}

await loadSaved();

}catch(err){

console.error(
"removeSaved error:",
err
);

}

};

/* ========================================= */

window.viewVehicle = function(id){

if(!id) return;

navigate("/vehicle?id=" + id);

};