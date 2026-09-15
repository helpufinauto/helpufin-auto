import { asset } from "../js/basePath.js";

const PLACEHOLDER = asset("/placeholder.png");

import { formatPrice, formatMileage, getLocation, getImage } from "../components/vehicleCard.js";
import { supabase } from "../js/api.js";
import { navigate } from "../js/router.js";
import {
toast,
clearCompare,
getCompare,
setCompare
} from "../js/ui.js";

let vehicles = [];

/* ========================================= */

export function ComparePage(){

setTimeout(init, 0);

return `

<div class="
compare-page
max-w-[1240px]
mx-auto
px-4
sm:px-6
xl:px-8
pt-6
md:pt-8
pb-10
min-h-screen
">

  <!-- HEADER -->
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
        COMPARE
      </div>

      <h1 class="
compare-page-title
text-[#081120]
font-black
tracking-[-0.03em]
leading-[1.05]
text-[clamp(1.35rem,3.2vw,1.7rem)]
">
        Compare Vehicles
      </h1>

      <p class="
mt-2
text-slate-500
text-[12px]
sm:text-[12.5px]
leading-relaxed
max-w-[430px]
">
        Compare pricing, specifications, and features side-by-side.
      </p>

    </div>

    <div class="flex gap-2 flex-wrap">

      <button
        onclick="clearCompare()"
        class="
compare-action-btn
h-[42px]
rounded-[10px]
border
border-red-200/70
bg-white
hover:bg-red-50
text-red-500
px-4
font-semibold
text-[12px]
transition-all
duration-300
">
        Clear Compare
      </button>

      <button
        onclick="goBrowse()"
        class="
compare-action-btn
h-[42px]
rounded-[10px]
bg-[#005BBF]
hover:bg-[#004FA8]
text-white
px-4
font-semibold
text-[12px]
transition-all
duration-300
">
        Browse Vehicles
      </button>

    </div>

  </div>

  <!-- CONTENT -->
  <div id="compareBox">

    <!-- Initial skeleton state: shown immediately on first paint so the
         page never displays an empty area before the compared vehicles
         load. init() replaces this with the real previews + comparison
         table, the existing empty state, or the existing error state. -->
    ${renderCompareSkeleton()}

  </div>

</div>

`;

}

/* ========================================= */
/* LOADING SKELETON (PHASE 10)
   Mirrors the eventual content — preview cards
   (image + name + price + meta + actions) and the
   at-a-glance comparison table — using the shared
   .skeleton-shimmer language from css/styles.css.
   Replaced by render()/renderEmpty()/showError(). */

function renderCompareSkeleton(){

const previewCard = () => `
<div class="
compare-preview-card
">

  <div class="
  compare-preview-img
  skeleton-image
  flex-shrink-0
  ">
  </div>

  <div class="compare-preview-body">

    <div class="skeleton-shimmer h-3.5 w-3/4 rounded-md"></div>

    <div class="mt-0.5">
      <div class="skeleton-shimmer h-4 w-1/2 rounded-md"></div>
    </div>

    <div class="mt-0.5">
      <div class="skeleton-shimmer h-2.5 w-2/5 rounded"></div>
    </div>

    <div class="compare-preview-actions">
      <div class="skeleton-shimmer h-8 w-24 rounded-lg"></div>
      <div class="skeleton-shimmer w-[34px] h-[34px] rounded-[10px]"></div>
    </div>

  </div>

</div>
`;

const tableRow = () => `
<div class="
compare-table-row
">

  <div class="compare-table-spec-label">
    <div class="skeleton-shimmer h-3 w-16 rounded"></div>
  </div>

  <div class="compare-table-value">
    <div class="skeleton-shimmer h-3 w-20 rounded"></div>
  </div>

  <div class="compare-table-value">
    <div class="skeleton-shimmer h-3 w-16 rounded"></div>
  </div>

</div>
`;

return `

<div class="compare-previews-section">

  <div class="
  text-[#3B82F6]
  text-[9px]
  sm:text-[10px]
  font-bold
  tracking-[0.22em]
  uppercase
  mb-1
  ">
    Vehicles Being Compared
  </div>

  <h2 class="
  compare-previews-title
  text-[#081120]
  font-black
  tracking-[-0.02em]
  text-[17px]
  sm:text-[19px]
  mb-3
  ">
    Your comparison
  </h2>

  <div class="compare-previews-grid">
    ${previewCard()}
    ${previewCard()}
    ${previewCard()}
  </div>

</div>

<div class="compare-glance-section">

  <div class="
  text-[#3B82F6]
  text-[9px]
  sm:text-[10px]
  font-bold
  tracking-[0.22em]
  uppercase
  mb-1
  ">
    At A Glance
  </div>

  <h2 class="
  compare-glance-title
  text-[#081120]
  font-black
  tracking-[-0.02em]
  text-[17px]
  sm:text-[19px]
  mb-3
  ">
    Compare the key differences
  </h2>

  <div class="compare-table">
    ${tableRow()}
    ${tableRow()}
    ${tableRow()}
    ${tableRow()}
    ${tableRow()}
  </div>

</div>

`;

}

/* ========================================= */

async function init(){

try{

const ids =
getCompare();

if(
!Array.isArray(ids) ||
!ids.length
){

renderEmpty();
return;

}

const cleanIds =
ids.filter(Boolean);

if(!cleanIds.length){

renderEmpty();
return;

}

const {
data,
error
} =
await supabase
.from("vehicles")
.select("*")
.in("id", cleanIds);

if(error){

console.error(
"Compare load error:",
error
);

showError(
"Error loading compare vehicles"
);

return;

}

vehicles =
Array.isArray(data)
? data
: [];

if(!vehicles.length){

renderEmpty();
return;

}

render();

}catch(err){

console.error(
"Compare init error:",
err
);

showError(
"Unexpected error loading compare vehicles"
);

}

}

/* ========================================= */

function renderEmpty(){

const box =
document.getElementById("compareBox");

if(!box) return;

box.innerHTML = `

<div class="
rounded-[18px]
border
border-dashed
border-slate-200
bg-white
p-8
text-center
shadow-sm
">

  <h2 class="
text-xl
font-bold
mb-2
text-[#08111F]
">
    No vehicles selected
  </h2>

  <p class="
text-[#64748B]
text-[13px]
leading-relaxed
max-w-xl
mx-auto
">
    Add vehicles to compare specifications side-by-side.
  </p>

  <button
    onclick="goBrowse()"
    class="
mt-4
h-10
rounded-lg
    bg-[#E48A2F]
    hover:bg-[#D67E2C]
    text-[#08111F]
px-4
font-bold
text-[13px]
transition-all
duration-300
">
    Browse Vehicles
  </button>

</div>

`;

}

/* ========================================= */

function render(){

const box =
document.getElementById("compareBox");

if(
!box ||
!document.body.contains(box)
){
return;
}

box.innerHTML = `

${renderVehiclePreviews()}

${renderComparison()}

`;

}

/* ========================================= */
/* VEHICLES BEING COMPARED — PREVIEWS (3.7C) */
/* ========================================= */

function renderVehiclePreviews(){

if(
!vehicles ||
!vehicles.length
){
return "";
}

const previewCards =
vehicles.map((v)=>{

  const name =
  `${v.make || ""} ${v.model || ""}`.trim() || "Vehicle";

  const price =
  formatPrice(v.price);

  const year =
  v.year || "-";

  const mileage =
  formatMileage(v.mileage);

  return `
<div class="compare-preview-card">
  <img
    src="${getImage(v)}"
    width="200"
    height="180"
    alt="${name}"
    loading="lazy"
    decoding="async"
    onerror="this.src='${PLACEHOLDER}'"
    class="compare-preview-img"
  >
  <div class="compare-preview-body">
    <div class="compare-preview-name">${name}</div>
    <div class="compare-preview-price">${price}</div>
    <div class="compare-preview-meta">${year} • ${mileage}</div>
    <div class="compare-preview-actions">
      <button
        onclick="viewVehicle('${v.id}')"
        class="compare-preview-view${v.is_featured ? ' compare-preview-view-featured' : ''}"
        aria-label="View Vehicle"
        title="View Vehicle"
      >
        View Vehicle
      </button>
      <button
        onclick="removeCompare('${v.id}')"
        class="compare-preview-remove"
        aria-label="Remove from compare"
        title="Remove"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  </div>
</div>
`;

}).join("");

return `

<div class="compare-previews-section compare-fade">

  <div class="
  text-[#3B82F6]
  text-[9px]
  sm:text-[10px]
  font-bold
  tracking-[0.22em]
  uppercase
  mb-1
  ">
    Vehicles Being Compared
  </div>

  <h2 class="
  compare-previews-title
  text-[#081120]
  font-black
  tracking-[-0.02em]
  text-[17px]
  sm:text-[19px]
  mb-3
  ">
    Your comparison
  </h2>

  <div class="compare-previews-grid">
    ${previewCards}
  </div>

</div>

`;

}

/* ========================================= */
/* AT A GLANCE — COMPACT COMPARISON (3.7D) */
/* ========================================= */

function renderComparison(){

if(
!vehicles ||
!vehicles.length
){
return "";
}

const specs = [
  { label: "Price", get: (v) => formatPrice(v.price) },
  { label: "Year", get: (v) => v.year || "-" },
  { label: "Mileage", get: (v) => formatMileage(v.mileage) },
  { label: "Fuel", get: (v) => v.fuel_type || "-" },
  { label: "Transmission", get: (v) => v.transmission || "-" },
  { label: "Drive", get: (v) => v.drive_type || "-" },
  { label: "Body", get: (v) => v.body_type || "-" },
  { label: "Location", get: (v) => getLocation(v) }
];

/* Determine which specs differ across vehicles */
const differing = {};

specs.forEach((s)=>{
  const values =
  new Set(
    vehicles.map((v)=>
      String(s.get(v) || "").trim().toLowerCase()
    )
  );
  differing[s.label] = values.size > 1;
});

/* ---- HEADER ROW: vehicle names as columns ---- */

const headerRow = `
<div class="compare-table-head">
  <div class="compare-table-spec-label">Specification</div>
  ${vehicles.map((v)=>`
  <div class="compare-table-vehicle-name">
    ${v.make || ""} ${v.model || ""}
  </div>
  `).join("")}
</div>
`;

/* ---- SPEC ROWS: label + values per vehicle ---- */

const specRows =
specs.map((s)=>{

  const isDiff = differing[s.label];

  return `
<div class="
compare-table-row
${isDiff ? 'compare-table-diff' : ''}
">
  <div class="compare-table-spec-label">${s.label}</div>
  ${vehicles.map((v)=>`
  <div class="compare-table-value">${s.get(v)}</div>
  `).join("")}
</div>
`;

}).join("");

/* ---- ACTION ROW: View Vehicle buttons ---- */

const actionRow = `
<div class="compare-table-row compare-table-actions">
  <div class="compare-table-spec-label"></div>
  ${vehicles.map((v)=>`
  <div class="compare-table-value">
    <button
      onclick="viewVehicle('${v.id}')"
      class="compare-table-view${v.is_featured ? ' compare-table-view-featured' : ''}"
      aria-label="View Vehicle"
      title="View Vehicle"
    >
      View Vehicle
    </button>
  </div>
  `).join("")}
</div>
`;

return `

<div class="compare-glance-section compare-fade">

  <div class="
  text-[#3B82F6]
  text-[9px]
  sm:text-[10px]
  font-bold
  tracking-[0.22em]
  uppercase
  mb-1
  ">
    At A Glance
  </div>

  <h2 class="
  compare-glance-title
  text-[#081120]
  font-black
  tracking-[-0.02em]
  text-[17px]
  sm:text-[19px]
  mb-3
  ">
    Compare the key differences
  </h2>

  <!-- COMPACT COMPARISON TABLE -->
  <div class="compare-table">
    ${headerRow}
    ${specRows}
    ${actionRow}
  </div>

</div>

`;

}

/* ========================================= */

function specRow(label, value){

return `

<div class="
flex
items-center
justify-between
gap-3
border-b
border-slate-100
h-9
">

  <span class="
text-slate-500
shrink-0
text-[12px]
">
    ${label}
  </span>

  <span class="
font-bold
text-[#08111F]
text-right
break-words
text-[12px]
">
    ${value}
  </span>

</div>

`;

}

/* ========================================= */

function showError(message){

const box =
document.getElementById("compareBox");

if(!box) return;

box.innerHTML = `

<div class="
rounded-[28px]
border
border-red-500/20
bg-red-500/5
text-red-400
p-10
text-center
">

${message}

</div>

`;

}

/* ========================================= */

window.viewVehicle = function(id){

if(!id) return;

navigate("/vehicle?id=" + id);

};

/* ========================== */
/* ðŸ”¥ GLOBAL CLEAR */
/* ========================== */

window.clearCompare = function(){

clearCompare();

toast("Compare cleared");

renderEmpty();

};



/* ========================== */
/* ðŸ”¥ REMOVE SINGLE */
/* ========================== */

window.removeCompare = function(vehicleId){

let compare =
getCompare();

compare =
compare.filter(id => id !== vehicleId);

setCompare(compare);

vehicles =
vehicles.filter(v => v.id !== vehicleId);

toast("Vehicle removed");

if(!vehicles.length){

renderEmpty();
return;

}

render();

};



/* ========================== */
/* ðŸ”¥ NAVIGATION */
/* ========================== */

window.goBrowse = function(){

navigate("/browse");

};



/* ========================== */
/* ðŸ”¥ LIVE SYNC */
/* ========================== */

window.addEventListener(
"compareUpdated",
()=>{

init();

}
);
