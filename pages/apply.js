import { supabase } from "../js/api.js";
import { navigate } from "../js/router.js";
import { toast } from "../js/ui.js";


export function ApplyPage(){

setTimeout(loadApply);

return `

<div class="max-w-4xl mx-auto px-6 py-10">

<h1 class="text-3xl font-bold mb-6">

Finance Application

</h1>

<div id="applyBox">

<!-- Initial skeleton state: shown immediately on first paint so the
     page never displays an empty area before the finance application
     data loads. loadApply() replaces this with the real application
     card, the existing guidance states, or an error message. -->
${renderApplySkeleton()}

</div>

</div>

`;

}

/* =========================================
   LOADING SKELETON (PHASE 10)
   Mirrors the eventual finance application card —
   notice blocks, vehicle title, detail lines and
   the two action buttons — using the shared
   .skeleton-shimmer language from css/styles.css.
   Replaced by loadApply() with the real card or the
   existing guidance/error states. */

function renderApplySkeleton(){

return `

<div class="card p-6 space-y-4">

  <!-- NOTICE BLOCKS -->
  <div class="skeleton-shimmer h-12 w-full rounded"></div>
  <div class="skeleton-shimmer h-12 w-full rounded"></div>

  <!-- VEHICLE TITLE -->
  <div class="pt-2">
    <div class="skeleton-shimmer h-6 w-2/3 rounded-md"></div>
  </div>

  <!-- DETAIL LINES -->
  <div class="space-y-3 pt-1">
    <div class="skeleton-shimmer h-4 w-1/2 rounded"></div>
    <div class="skeleton-shimmer h-4 w-3/5 rounded"></div>
    <div class="skeleton-shimmer h-4 w-2/5 rounded"></div>
  </div>

  <!-- ACTION BUTTONS -->
  <div class="flex gap-3 mt-4">
    <div class="skeleton-shimmer h-11 flex-1 rounded-lg"></div>
    <div class="skeleton-shimmer h-11 flex-1 rounded-lg"></div>
  </div>

</div>

`;

}


async function loadApply(){

const params =
new URLSearchParams(
window.location.search
);

const id =
params.get("id");


if(!id){

document.getElementById(
"applyBox"
).innerHTML =
"No vehicle selected";

return;

}


/* USER */

const { data:userData } =
await supabase.auth.getUser();

if(!userData.user){

navigate("/login");
return;

}

const user =
userData.user;


/* VEHICLE */

const { data:vehicle } =
await supabase
.from("vehicles")
.select("*")
.eq("id", id)
.single();


/* CREDIT */

const { data:affordability } =
await supabase
.from("affordability_profiles")
.select("*")
.eq("user_id", user.id)
.single();


if(!affordability){

document.getElementById("applyBox").innerHTML =

`<div class="card p-6">

<p>
Complete your affordability profile first
</p>

<button
onclick="goCredit()"
class="btn btn-gold mt-4"
>

Go to Affordability Profile

</button>

</div>`;

return;

}


if(
Number(vehicle.price || 0)
>
Number(
affordability.max_vehicle_price || 0
)
){

document.getElementById(
"applyBox"
).innerHTML =

`<div class="card p-6">

<h2 class="text-xl font-bold mb-3">

Vehicle exceeds affordability profile

</h2>

<p>

Vehicle Price:
<b>
R ${Number(vehicle.price || 0).toLocaleString()}
</b>

</p>

<p>

Maximum Recommended:
<b>
R ${Number(
affordability.max_vehicle_price || 0
).toLocaleString()}
</b>

</p>

<button
onclick="goCredit()"
class="btn btn-gold mt-4"
>

Update Affordability Profile

</button>

</div>`;

return;

}

/* DUPLICATE */

const { data:existing } =
await supabase
.from("finance_applications")
.select("*")
.eq("vehicle_id", id)
.eq("user_id", user.id);


if(existing.length){

document.getElementById("applyBox").innerHTML =

`<div class="card p-6">

You already applied for this vehicle

</div>`;

return;

}


/* PROFILE */

const { data:profile } =
await supabase
.from("profiles")
.select("*")
.eq("id", user.id)
.single();


/* SUB */

let sub = null;

if(profile?.subscription_id){

const { data:s } =
await supabase
.from("subscriptions")
.select("*")
.eq("id", profile.subscription_id)
.single();

sub = s;

}


/* SCORE WARNING */

let warning = "";

warning =

`<div class="bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] p-3 mb-3 rounded">

Estimated affordability profile completed

</div>`;


/* UI */

document.getElementById(
"applyBox"
).innerHTML = `

<div class="card p-6 space-y-4">

${warning}

<div
class="
bg-green-50
border
border-green-200
text-green-700
p-3
rounded
"
>

Estimated affordability match confirmed

</div>

<h2 class="text-xl font-bold">

${vehicle.make} ${vehicle.model}

</h2>

<p>

Price:
<b>R ${vehicle.price}</b>

</p>

<p>

Affordability Status:
<b>${affordability.affordability_category}</b>

</p>

<p>

Maximum Vehicle Value:
<b>
R ${Number(
affordability.max_vehicle_price || 0
).toLocaleString()}
</b>

</p>


<div class="flex gap-3 mt-4">


<button
id="saveBtn"
class="btn btn-dark w-full"
>

Save Application

</button>


<button
id="formBtn"
class="btn btn-gold w-full"
>

Open Finance Form

</button>

</div>

</div>

`;


document.getElementById("saveBtn").onclick =
() =>
saveApp(
user,
vehicle,
affordability,
profile,
sub
);


document.getElementById("formBtn").onclick =
() =>
window.open(
"https://helpufin.co.za/application-form/",
"_blank"
);

}



async function saveApp(
user,
vehicle,
affordability,
profile,
sub
){

const btn = document.getElementById("saveBtn");

btn.disabled = true;
btn.innerText = "Saving...";

await supabase
.from("finance_applications")
.insert({

user_id:user.id,
seller_id:vehicle.seller_id,
vehicle_id:vehicle.id,

vehicle_make:vehicle.make,
vehicle_model:vehicle.model,
vehicle_title:vehicle.title,

email:profile.email,
name:profile.name,
surname:profile.surname,
account_type:profile.account_type,
dealership_name:profile.dealership_name,

subscription_id:profile.subscription_id,
subscription_name:sub?.name,

price:vehicle.price,

monthly_budget:
affordability.monthly_budget,

max_vehicle_price:
affordability.max_vehicle_price,

deposit_amount:
affordability.deposit_amount,

existing_debt:
affordability.existing_debt,

preferred_term:
affordability.preferred_term,

affordability_category:
affordability.affordability_category

});


/* 🔔 NEW: NOTIFICATION (ADDED SAFELY) */
const financePriority =
affordability.affordability_category === "Premium"
? "HIGH"

: affordability.affordability_category === "Advanced"
? "MEDIUM"

: "STANDARD";

await supabase
.from("notifications")
.insert({

user_id: vehicle.seller_id,

title:
`New Finance Application`,

message:
`${profile.name || "A buyer"} applied for financing on ${vehicle.make || ""} ${vehicle.model || ""}.`

});


/* UX IMPROVEMENT */

btn.innerText = "Saved to Dashboard";
btn.classList.remove("btn-dark");
btn.classList.add("btn-gold");

toast(
"Finance application saved successfully"
);


setTimeout(()=>{
navigate("/dashboard");
},1000);

}


window.goCredit = () =>
navigate("/affordability");