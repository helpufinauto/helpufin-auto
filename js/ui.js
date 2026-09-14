export function toast(msg){

const box =
document.createElement("div");

box.className = "toast";

/* PHASE 4 — announce toasts to assistive
   technology. */
box.setAttribute("role", "status");
box.setAttribute("aria-live", "polite");

box.innerHTML = `

<div
style="
display:flex;
align-items:center;
gap:12px;
"
>

<div
style="
width:42px;
height:42px;
border-radius:9999px;
background:rgba(255,255,255,.25);
display:flex;
align-items:center;
justify-content:center;
flex-shrink:0;
box-shadow:0 4px 12px rgba(0,0,0,.12);
"
>

<svg
width="22"
height="22"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
stroke-width="3"
style="color:white;"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M5 13l4 4L19 7"
/>
</svg>

</div>

<div
style="
font-size:16px;
font-weight:800;
line-height:1.3;
color:white;
"
>
${msg}
</div>

</div>

`;

document.body.appendChild(box);

requestAnimationFrame(()=>{

box.classList.add("show");

});

setTimeout(()=>{

box.classList.remove("show");

setTimeout(()=>{

box.remove();

},300);

},5500);

}



/* ========================== */
/* 🔥 MODAL */
/* ========================== */

export function showModal(html){

const m =
document.getElementById("modal");

m.innerHTML = html;

m.classList.remove("hidden");

}



export function closeModal(){

document
.getElementById("modal")
.classList.add("hidden");

}



/* ========================== */
/* 🔥 SKELETON (UPGRADED) */
/* ========================== */

export function skeleton(n = 6){
  let html = "";

  for(let i = 0; i < n; i++){
    html += `
      <div class="
skeleton-card
animate-pulse
rounded-[28px]
h-[320px]
w-full
bg-[linear-gradient(90deg,#F1F5F9_25%,#FFFFFF_50%,#F1F5F9_75%)]
border
border-white/60
shadow-[0_12px_40px_rgba(15,23,42,0.04)]
"></div>
    `;
  }

  return html;
}



/* ========================== */
/* 🔥 PAGINATION (IMPROVED UX) */
/* ========================== */

export function pager(page,total,cb){

let html="";

for(let i=1;i<=total;i++){

html+=`

<button
class="pageBtn ${i===page ? 'active' : ''}"
data-page="${i}"
>
${i}
</button>

`;

}

setTimeout(()=>{

document
.querySelectorAll(".pageBtn")
.forEach(b=>{

b.onclick=()=>{

cb(
parseInt(
b.dataset.page
)
);

};

});

});

return html;

}



/* ========================== */
/* 🔥 CAROUSEL */
/* ========================== */

export function carousel(images){

let i=0;

function show(){

document.getElementById(
"carImg"
).src = images[i];

}

window.nextImg=function(){

i++;
if(i>=images.length) i=0;

show();

}

window.prevImg=function(){

i--;
if(i<0) i=images.length-1;

show();

}

setTimeout(show);

}



/* ========================== */
/* 🔥 IMAGE MODAL */
/* ========================== */

export function openImage(src){

const m =
document.getElementById("modal");

m.innerHTML = `

<div class="modal-box">

<img src="${src}" class="max-w-full">

<button onclick="closeModal()">
Close
</button>

</div>

`;

m.classList.remove("hidden");

}



/* ========================== */
/* 🔥 REVEAL ANIMATION */
/* ========================== */

export function revealInit(){

const items =
document.querySelectorAll(".reveal");

function show(){

const h =
window.innerHeight;

items.forEach(el=>{

const top =
el.getBoundingClientRect().top;

if(top < h-50){

el.classList.add("show");

}

});

}

window.addEventListener(
"scroll",
show
);

show();

}

/* ========================== */
/* 🔥 GLOBAL COMPARE SYSTEM
   Comparison data is OWNER-SCOPED:
   - Logged-in users  → localStorage key "compare_<userId>"
   - Logged-out users → NO comparison storage; the Compare
     page is always empty until a user logs in. The legacy
     shared "compare" key is never read or displayed.
   ========================== */

import { getAuthUser } from "./api.js";

/* Current compare-list owner: "guest" or a Supabase user id */
let compareOwner = "guest";

function compareKey(){

  /* Logged-out users have NO comparison storage:
     the legacy shared "compare" key is never read,
     so a guest can never see a previous user's list. */
  return compareOwner === "guest"
    ? null
    : `compare_${compareOwner}`;

}

/* Sync the owner with the authenticated user.
   Runs on load and whenever auth state changes. */
export async function syncCompareOwner(){

  let nextOwner = "guest";

  try{

    const user = await getAuthUser();

    if(user?.id) nextOwner = user.id;

  }catch(e){

    nextOwner = "guest";

  }

  if(nextOwner === compareOwner) return;

  /* No legacy migration: guest/previous-session "compare"
     data is never adopted into a user account. */
  compareOwner = nextOwner;

  /* Reload every compare-driven UI with the correct owner's list */
  window.dispatchEvent(new Event("compareUpdated"));

}

syncCompareOwner();

window.addEventListener("authChanged", syncCompareOwner);

export function getCompare(){

  const key = compareKey();

  if(!key) return []; /* logged out: always empty */

  try{

    const parsed = JSON.parse(
      localStorage.getItem(key) || "[]"
    );

    /* Normalize legacy/oversized lists to the current
       2-vehicle maximum, preserving the first 2 entries. */
    return Array.isArray(parsed) ? parsed.slice(0, 2) : [];

  }catch(e){

    return [];

  }

}



export function setCompare(compare){

  const key = compareKey();

  /* Logged out: nothing is stored or updated */
  if(!key) return;

  /* Hard cap: never store more than 2 vehicles */
  localStorage.setItem(
    key,
    JSON.stringify(
      Array.isArray(compare) ? compare.slice(0, 2) : []
    )
  );

  window.dispatchEvent(
    new Event("compareUpdated")
  );

}



export function inCompare(id){

  const compare = getCompare();

  return compare.includes(id);

}



export function toggleCompare(id){

  let compare = getCompare();

  if(compare.includes(id)){

    compare = compare.filter(v=>v!==id);

    setCompare(compare);

    toast("Removed from compare");

    return false;

  }

  if(compare.length >= 2){

    /* Compare limit: maximum 2 vehicles per user.
       Blocks only NEW additions — removing an
       already-compared vehicle (handled above) still works. */
    toast("Compare is limited to 2 vehicles.");

    return false;

  }

  compare.push(id);

  setCompare(compare);

  toast("Added to compare");

  return true;

}



export function clearCompare(){

  /* Clears ONLY the current owner's list (no-op when logged out) */
  const key = compareKey();

  if(!key) return;

  localStorage.removeItem(key);

  window.dispatchEvent(
    new Event("compareUpdated")
  );

}


/* ========================== */
/* 🔥 COMPARE HELPERS */
/* ========================== */

window.goComparePage = function(){

if(window.navigate){
window.navigate("/compare");
return;
}

window.location.href =
"/compare";

};

/* ========================== */
/* 🔥 COMPARE BUTTON UI */
/* ========================== */

export function compareButton(vehicleId){

const active =
inCompare(vehicleId);

return `

<button
onclick="event.stopPropagation();toggleVehicleCompare('${vehicleId}')"
class="
compare-card-btn
${active ? 'active' : ''}
"
>

<span class="
material-symbols-outlined
text-[18px]
">

balance

</span>

${active ? 'Added' : 'Compare'}

</button>

`;

}

/* ========================== */
/* 🔥 TOGGLE BUTTON HANDLER */
/* ========================== */

window.toggleVehicleCompare =
function(vehicleId){

toggleCompare(vehicleId);


setTimeout(()=>{

document
.querySelectorAll(
".compare-card-btn"
)
.forEach(btn=>{

btn.classList.remove(
"active"
);

});

const compare =
getCompare();

compare.forEach(id=>{

document
.querySelectorAll(
`[onclick*="${id}"]`
)
.forEach(btn=>{

btn.classList.add(
"active"
);

});

});

},50);

};

