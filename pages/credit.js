import { supabase } from "../js/api.js";
import { navigate } from "../js/router.js";


export function CreditPage(){

setTimeout(loadCredit);

return `

<div class="max-w-4xl mx-auto px-6 py-10">

<h1 class="text-3xl font-bold mb-6">

Affordability Profile

</h1>

<div id="creditBox">

<!-- Initial skeleton state: shown immediately on first paint so the
     page never displays an empty area before the affordability profile
     loads. loadCredit() replaces this with the real profile card or the
     existing assessment form. -->
${renderCreditSkeleton()}

</div>

</div>

`;

}

/* =========================================
   LOADING SKELETON (PHASE 10)
   Mirrors the eventual affordability profile card —
   heading, category value, the two stat blocks,
   detail lines and the action button — using the
   shared .skeleton-shimmer language from
   css/styles.css. Replaced by loadCredit() with the
   real profile card or the assessment form. */

function renderCreditSkeleton(){

return `

<div class="card p-6 space-y-4">

  <!-- HEADING -->
  <div class="skeleton-shimmer h-6 w-2/3 rounded-md"></div>

  <!-- CATEGORY VALUE -->
  <div class="skeleton-shimmer h-8 w-40 rounded-md"></div>

  <!-- STAT BLOCKS -->
  <div class="bg-[#3B82F6]/10 p-4 rounded">
    <div class="skeleton-shimmer h-3.5 w-44 rounded mb-2"></div>
    <div class="skeleton-shimmer h-7 w-36 rounded-md"></div>
  </div>

  <div class="bg-green-50 p-4 rounded">
    <div class="skeleton-shimmer h-3.5 w-52 rounded mb-2"></div>
    <div class="skeleton-shimmer h-7 w-40 rounded-md"></div>
  </div>

  <!-- DETAIL LINES -->
  <div class="space-y-2 pt-1">
    <div class="skeleton-shimmer h-4 w-1/2 rounded"></div>
    <div class="skeleton-shimmer h-4 w-2/5 rounded"></div>
  </div>

  <!-- NOTICE BLOCK -->
  <div class="bg-yellow-50 border border-yellow-200 rounded p-3">
    <div class="skeleton-shimmer h-3.5 w-full rounded"></div>
    <div class="skeleton-shimmer h-3.5 w-3/4 rounded mt-1.5"></div>
  </div>

  <!-- ACTION BUTTON -->
  <div class="skeleton-shimmer h-11 w-full rounded-lg"></div>

</div>

`;

}


async function loadCredit(){

const { data:userData } =
await supabase.auth.getUser();

if(!userData.user){

navigate("/login");
return;

}

const user = userData.user;


/* GET CREDIT */

const { data } =
await supabase
.from("affordability_profiles")
.select("*")
.eq("user_id", user.id)
.single();


if(!data){

showForm();
return;

}


showAffordability(data);

}


/* ======================= */
/* FORM */
/* ======================= */

function showForm(){

document.getElementById(
"creditBox"
).innerHTML = `

<div class="card p-6 space-y-3">

<h2 class="text-xl font-bold">
Affordability Assessment
</h2>

<input id="income"
placeholder="Monthly income"
class="w-full border p-2">

<input id="expenses"
placeholder="Monthly expenses"
class="w-full border p-2">

<input id="debt"
placeholder="Existing monthly debt"
class="w-full border p-2">

<input id="deposit"
placeholder="Deposit amount"
class="w-full border p-2">

<select id="employment"
class="w-full border p-2">

<option value="employed">
Employed
</option>

<option value="self">
Self employed
</option>

<option value="unemployed">
Unemployed
</option>

</select>

<select id="term"
class="w-full border p-2">

<option value="48">
48 Months
</option>

<option value="60">
60 Months
</option>

<option value="72" selected>
72 Months
</option>

<option value="84">
84 Months
</option>

</select>

<label class="flex items-center gap-2">

<input
type="checkbox"
id="balloon">

<span>
Include Balloon Payment Estimate
</span>

</label>


<button
id="calcBtn"
class="btn btn-gold w-full">

Calculate Affordability

</button>

</div>

`;

document
.getElementById("calcBtn")
.onclick = calcScore;

}



/* ======================= */
/* CALCULATE */
/* ======================= */

async function calcScore(){

const income =
parseFloat(
document.getElementById("income").value
);

const expenses =
parseFloat(
document.getElementById("expenses").value
);

const employment =
document.getElementById("employment").value;

const debt =
parseFloat(
document.getElementById("debt").value || 0
);

const deposit =
parseFloat(
document.getElementById("deposit").value || 0
);

const preferredTerm =
parseInt(
document.getElementById("term").value
);

const balloon =
document.getElementById("balloon").checked;


const disposableIncome =
Math.max(
income -
expenses -
debt,
0
);

const monthlyBudget =
Math.round(
disposableIncome * 0.30
);

const maxVehiclePrice =
Math.round(
monthlyBudget * 60
);

let affordabilityCategory =
"Starter";

if(maxVehiclePrice >= 800000)
affordabilityCategory = "Premium";

else if(maxVehiclePrice >= 500000)
affordabilityCategory = "Advanced";

else if(maxVehiclePrice >= 250000)
affordabilityCategory = "Standard";


const { data:userData } =
await supabase.auth.getUser();

const user =
userData.user;


/* SAVE */

const { error } = await supabase
.from("affordability_profiles")
.upsert({

  user_id: user.id,

  gross_income: income,

  employment_type: employment,

  monthly_expenses: expenses,

monthly_budget:
monthlyBudget,

max_vehicle_price:
maxVehiclePrice,

deposit_amount:
deposit,

existing_debt:
debt,

balloon_payment:
balloon,

preferred_term:
preferredTerm,

affordability_category:
affordabilityCategory

}, {
  onConflict: "user_id"
});

if(error){
  alert("Failed to save affordability profile");
  return;
}

loadCredit();

}



/* ======================= */
/* SHOW SCORE */
/* ======================= */

function showAffordability(data){

let color = "text-[#3B82F6]";

if(data.affordability_category === "Premium")
color = "text-green-600";

else if(data.affordability_category === "Advanced")
color = "text-yellow-500";


document.getElementById(
"creditBox"
).innerHTML = `

<div class="card p-6 space-y-4">

<h2 class="text-xl font-bold">
Your Affordability Profile
</h2>

<p class="text-2xl font-bold ${color}">
${data.affordability_category}
</p>

<div class="bg-[#3B82F6]/10 p-4 rounded">

<p class="text-sm text-gray-600">
Estimated Monthly Budget
</p>

<p class="text-2xl font-bold text-[#3B82F6]">
R ${Number(data.monthly_budget || 0).toLocaleString()}
</p>

</div>

<div class="bg-green-50 p-4 rounded">

<p class="text-sm text-gray-600">
Estimated Maximum Vehicle Value
</p>

<p class="text-2xl font-bold text-green-700">
R ${Number(data.max_vehicle_price || 0).toLocaleString()}
</p>

</div>

<p>

Recommended Deposit:

<b>
R ${Number(data.deposit_amount || 0).toLocaleString()}
</b>

</p>

<p>
Preferred Term:
<b>${data.preferred_term || 72} Months</b>
</p>

<div class="bg-yellow-50 border border-yellow-200 rounded p-3">

<p class="text-sm">

Estimated values only.

Actual finance terms,
insurance costs,
interest rates and
lender approvals may vary.

</p>

</div>

<button
id="redoBtn"
class="btn btn-dark w-full">

Recalculate Affordability

</button>

</div>

`;

document
.getElementById("redoBtn")
.onclick = resetAffordability;

}



/* ======================= */

async function resetAffordability(){

const { data:userData } =
await supabase.auth.getUser();

const { error } = await supabase
.from("affordability_profiles")
.delete()
.eq("user_id", userData.user.id);

if(error){
  alert(
"Failed to reset affordability profile"
);
  return;
}

loadCredit();

}
