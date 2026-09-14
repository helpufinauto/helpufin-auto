/* =========================================================
HUFA SMART SEARCH PHASE 2 — NEW FUNCTIONALITY VALIDATION
Additive only. The original 134-assertion harness in
scripts/test-search-intent.mjs remains untouched and must
still pass 134/134 alongside this file.
Pure Node — no DOM, no network.
========================================================= */
import {
  parseSearchIntent,
  getSmartSuggestions
} from "../js/searchIntent.js";

let pass = 0, fail = 0;
const failures = [];

function check(name, cond, detail){
  if(cond){ pass++; }
  else { fail++; failures.push(`${name}${detail ? " :: " + detail : ""}`); }
}

const P = q => parseSearchIntent(q);

/* ---------------- MILEAGE ---------------- */
{
  const t = P("low mileage cars");
  check("low mileage cars → lowMileage pref", t.preferences.lowMileage === true);
  check("low mileage cars → no price hijack", !t.price, JSON.stringify(t.price));
}
{
  const t = P("low km cars");
  check("low km cars → lowMileage pref", t.preferences.lowMileage === true);
}
{
  const t = P("under 100 000 km");
  check("under 100000km → mileageMax 100000", t.mileageMax === 100000, JSON.stringify(t.mileageMax));
  check("under 100000km → no price", !t.price);
}
{
  const t = P("cars below 80 000 km");
  check("below 80000km → mileageMax 80000", t.mileageMax === 80000, JSON.stringify(t.mileageMax));
}
{
  const t = P("less than 50k km");
  check("less than 50k km → mileageMax 50000", t.mileageMax === 50000, JSON.stringify(t.mileageMax));
}
{
  const t = P("cars with 60 000 km");
  check("with 60000km → mileageMax 60000", t.mileageMax === 60000, JSON.stringify(t.mileageMax));
}
{
  const t = P("under 100k kilometres");
  check("under 100k kilometres → mileageMax 100000", t.mileageMax === 100000, JSON.stringify(t.mileageMax));
}
{
  const t = P("low mileage Toyota");
  check("low mileage Toyota → make + pref", t.make === "Toyota" && t.preferences.lowMileage === true);
}
{
  const t = P("Toyota under 100 000 km");
  check("Toyota under 100000km", t.make === "Toyota" && t.mileageMax === 100000 && !t.price, JSON.stringify({m:t.make,km:t.mileageMax,p:t.price}));
}
{
  const t = P("BMW with low mileage");
  check("BMW with low mileage", t.make === "BMW" && t.preferences.lowMileage === true);
}
/* R-vs-KM disambiguation (critical) */
{
  const t = P("under R100 000");
  check("under R100 000 stays PRICE max", t.price?.kind === "max" && t.price.max === 100000 && t.mileageMax == null, JSON.stringify({p:t.price,km:t.mileageMax}));
}
{
  const t = P("Toyota under R150k");
  check("R-price not stolen by mileage", t.price?.kind === "max" && t.price.max === 150000 && t.mileageMax == null);
}

/* ---------------- SEATING / CAPACITY ---------------- */
{
  const t = P("7 seater");
  check("7 seater → seatsMin 7", t.seatsMin === 7, String(t.seatsMin));
}
{
  const t = P("5 seater");
  check("5 seater → seatsMin 5", t.seatsMin === 5);
}
{
  const t = P("8 seater");
  check("8 seater → seatsMin 8", t.seatsMin === 8);
}
{
  const t = P("9 seater");
  check("9 seater → seatsMin 9", t.seatsMin === 9);
}
{
  const t = P("7 seat SUV");
  check("7 seat SUV → seats + body", t.seatsMin === 7 && t.bodyType === "SUV");
}
{
  const t = P("car for 7 people");
  check("car for 7 people → seatsMin 7", t.seatsMin === 7, String(t.seatsMin));
  check("car for 7 people cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("family of 6");
  check("family of 6 → seatsMin 6", t.seatsMin === 6, String(t.seatsMin));
  check("family of 6 → family pref", t.preferences.family === true);
}
{
  const t = P("large family");
  check("large family → spacious+family prefs", t.preferences.spacious === true && t.preferences.family === true);
}

/* ---------------- BODY TYPE SYNONYMS ---------------- */
{
  const t = P("small SUV");
  check("small SUV → SUV + compact", t.bodyType === "SUV" && t.preferences.compact === true);
}
{
  const t = P("compact SUV");
  check("compact SUV → SUV + compact", t.bodyType === "SUV" && t.preferences.compact === true);
}
{
  const t = P("large SUV");
  check("large SUV → SUV + spacious", t.bodyType === "SUV" && t.preferences.spacious === true);
}
{
  const t = P("small car");
  check("small car → compact", t.preferences.compact === true);
}
{
  const t = P("sedan");
  check("sedan → Sedan", t.bodyType === "Sedan");
}
{
  const t = P("saloon");
  check("saloon → Sedan", t.bodyType === "Sedan", t.bodyType);
  check("saloon cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("hatch");
  check("hatch → Hatchback", t.bodyType === "Hatchback", t.bodyType);
}
{
  const t = P("station wagon");
  check("station wagon → Wagon", t.bodyType === "Wagon", t.bodyType);
  check("station wagon cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("crossover");
  check("crossover → Crossover", t.bodyType === "Crossover");
}
{
  const t = P("people carrier");
  check("people carrier → MPV", t.bodyType === "MPV", t.bodyType);
}
{
  const t = P("double cab bakkie");
  check("double cab bakkie parses to a body", !!t.bodyType, t.bodyType);
}
{
  const t = P("single cab bakkie");
  check("single cab bakkie parses to a body", !!t.bodyType, t.bodyType);
}
{
  const t = P("pickup truck");
  check("pickup truck → Bakkie", t.bodyType === "Bakkie", t.bodyType);
}

/* ---------------- ENGINE / PERFORMANCE ---------------- */
{
  const t = P("2 litre car");
  check("2 litre → engineCc 2000", t.engineCc === 2000, String(t.engineCc));
  check("2 litre → no price", !t.price);
}
{
  const t = P("2000cc");
  check("2000cc → engineCc 2000", t.engineCc === 2000, String(t.engineCc));
}
{
  const t = P("1600cc hatchback");
  check("1600cc → engineCc 1600 + body", t.engineCc === 1600 && t.bodyType === "Hatchback");
}
{
  const t = P("1.6 engine");
  check("1.6 engine → engineCc 1600", t.engineCc === 1600, String(t.engineCc));
}
{
  const t = P("small engine car");
  check("small engine → efficiency pref", t.preferences.efficiency === true && t.engineCc == null);
}
{
  const t = P("large engine car");
  check("large engine → performance pref", t.preferences.performance === true);
}
{
  const t = P("fast car");
  check("fast car → performance pref", t.preferences.performance === true);
}
/* model names untouched */
for(const q of ["BMW 320i","Mercedes C200","Porsche 911"]){
  const t = P(q);
  /* model names must never be misread as prices or engine sizes */
  check(`${q} → no price/engine hijack`, !t.price && t.engineCc == null,
    JSON.stringify({mk:t.make,md:t.model,p:t.price,e:t.engineCc}));
}

/* ---------------- FUEL ECONOMY / RUNNING COSTS ---------------- */
for(const q of ["cheap to run","cheap running costs","economical car","economy car",
                "fuel saver","good on fuel","uses little fuel","low fuel consumption"]){
  const t = P(q);
  check(`"${q}" → efficiency pref`, t.preferences.efficiency === true, JSON.stringify(t.preferences));
}
{
  const t = P("fuel efficient SUV");
  check("fuel efficient SUV → efficiency + SUV", t.preferences.efficiency === true && t.bodyType === "SUV");
}
{
  const t = P("cheap commuter");
  check("cheap commuter → budget + commuter", t.preferences.budget === true && t.preferences.commuter === true);
}

/* ---------------- USE CASE / TOWING / COMMERCIAL ---------------- */
{
  const t = P("commuter car");
  check("commuter car → commuter pref", t.preferences.commuter === true);
  check("commuter car cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("city driving car");
  check("city driving → commuter pref", t.preferences.commuter === true);
}
{
  const t = P("road trip car");
  check("road trip → roadTrip pref", t.preferences.roadTrip === true);
}
{
  const t = P("long distance car");
  check("long distance → roadTrip pref", t.preferences.roadTrip === true);
}
{
  const t = P("school run car");
  check("school run → commuter pref", t.preferences.commuter === true);
}
{
  const t = P("off road SUV");
  check("off road SUV → offRoad + SUV", t.preferences.offRoad === true && t.bodyType === "SUV");
}
{
  const t = P("work bakkie");
  check("work bakkie → Bakkie + commercial pref", t.bodyType === "Bakkie" && t.preferences.commercial === true,
    JSON.stringify({b:t.bodyType,pref:t.preferences.commercial}));
}
{
  const t = P("delivery vehicle");
  check("delivery vehicle → commercial pref", t.preferences.commercial === true);
}
{
  const t = P("holiday car");
  check("holiday car → roadTrip pref", t.preferences.roadTrip === true);
}
{
  const t = P("towing vehicle");
  check("towing vehicle → towing pref", t.preferences.towing === true);
}
{
  const t = P("tow a caravan");
  check("tow a caravan → towing pref", t.preferences.towing === true);
}
{
  const t = P("double cab workhorse");
  check("double cab workhorse → body + commercial", !!t.bodyType && t.preferences.commercial === true,
    JSON.stringify({b:t.bodyType,c:t.preferences.commercial}));
}

/* ---------------- SAFETY / FAMILY ---------------- */
{
  const t = P("safe family car");
  check("safe family car → safety + family", t.preferences.safety === true && t.preferences.family === true);
}
{
  const t = P("family friendly SUV");
  check("family friendly SUV → family + SUV", t.preferences.family === true && t.bodyType === "SUV");
}
/* ---------------- OWNERSHIP / HISTORY ---------------- */
{
  const t = P("one owner");
  check("one owner → owners 1", t.flags.owners === "1");
}
{
  const t = P("single owner");
  check("single owner → owners 1", t.flags.owners === "1");
}
{
  const t = P("only one previous owner");
  check("only one previous owner → owners 1", t.flags.owners === "1", t.flags.owners);
  check("only one previous owner cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("full service history");
  check("full service history flag", t.flags.fullServiceHistory === true, JSON.stringify(t.flags));
  check("full service history cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("complete service history");
  check("complete service history flag", t.flags.fullServiceHistory === true);
}
{
  const t = P("FSH");
  check("FSH flag", t.flags.fullServiceHistory === true, JSON.stringify(t.flags));
  check("FSH cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("accident free");
  check("accident free flag", t.flags.accidentFree === true);
}
{
  const t = P("never crashed");
  check("never crashed → accidentFree", t.flags.accidentFree === true);
}
{
  const t = P("roadworthy certificate");
  check("roadworthy certificate flag", t.flags.roadworthyCertified === true);
}
{
  const t = P("certified used");
  check("certified used → certifiedPreOwned", t.flags.certifiedPreOwned === true);
}
{
  const t = P("verified ownership");
  check("verified ownership flag", t.flags.ownershipVerified === true);
}

/* ---------------- PROTECTION / PLANS ---------------- */
{
  const t = P("car with warranty");
  check("with warranty flag", t.flags.warrantyIncluded === true);
}
{
  const t = P("under warranty");
  check("under warranty flag", t.flags.warrantyIncluded === true);
  check("under warranty cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("service plan");
  check("service plan flag", t.flags.servicePlanIncluded === true);
}
{
  const t = P("covered by service plan");
  check("covered by service plan flag", t.flags.servicePlanIncluded === true);
}
{
  const t = P("maintenance plan");
  check("maintenance plan flag", t.flags.maintenancePlanIncluded === true);
}
{
  const t = P("covered by maintenance");
  check("covered by maintenance flag", t.flags.maintenancePlanIncluded === true);
}

/* ---------------- LOCATION ---------------- */
{
  const t = P("cars in Gauteng");
  check("Gauteng province", t.province === "Gauteng", t.province);
  check("Gauteng cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("vehicles in Cape Town");
  check("Cape Town city + province", t.city === "Cape Town" && t.province === "Western Cape",
    JSON.stringify({c:t.city,p:t.province}));
}
{
  const t = P("cars in Pretoria");
  check("Pretoria city + Gauteng", t.city === "Pretoria" && t.province === "Gauteng");
}
{
  const t = P("Toyota in Durban");
  check("Toyota in Durban", t.make === "Toyota" && t.city === "Durban" && t.province === "KwaZulu-Natal",
    JSON.stringify({m:t.make,c:t.city,p:t.province}));
}
{
  const t = P("SUVs in KwaZulu Natal");
  check("KZN province + SUV", t.province === "KwaZulu-Natal" && t.bodyType === "SUV");
}

/* ---------------- SELLER INTENT VARIATIONS ---------------- */
{
  const t = P("dealer cars");
  check("dealer cars → seller dealer", t.seller === "dealer");
}
{
  const t = P("private sale bakkie");
  check("private sale → private + Bakkie", t.seller === "private" && t.bodyType === "Bakkie");
}
{
  const t = P("buy from a dealer");
  check("buy from a dealer → dealer", t.seller === "dealer");
}
/* ---------------- NUMBER + INTENT COMBINATIONS ---------------- */
{
  const t = P("80k SUV");
  check("80k SUV → around 80000 + SUV", t.price?.kind === "around" && t.price.target === 80000 && t.bodyType === "SUV");
}
{
  const t = P("80k low mileage");
  check("80k low mileage → price + lowMileage", t.price?.target === 80000 && t.preferences.lowMileage === true);
}
{
  const t = P("7 seater under 250k");
  check("7 seater under 250k → seats + max price", t.seatsMin === 7 && t.price?.kind === "max" && t.price.max === 250000);
}
{
  const t = P("low mileage under 200k");
  check("low mileage under 200k", t.preferences.lowMileage === true && t.price?.kind === "max" && t.price.max === 200000);
}
{
  const t = P("automatic under 150k");
  check("automatic under 150k", t.transmission === "Automatic" && t.price?.max === 150000);
}
{
  const t = P("low mileage Toyota under 200k");
  check("low mileage Toyota under 200k", t.preferences.lowMileage === true && t.make === "Toyota" &&
        t.price?.kind === "max" && t.price.max === 200000,
        JSON.stringify({pref:t.preferences,mk:t.make,p:t.price}));
}
{
  const t = P("family SUV under 300k");
  check("family SUV under 300k", t.preferences.family === true && t.bodyType === "SUV" && t.price?.max === 300000);
}
{
  const t = P("7 seater automatic under 350k");
  check("7 seater automatic under 350k", t.seatsMin === 7 && t.transmission === "Automatic" && t.price?.max === 350000);
}
{
  const t = P("Toyota SUV under 250k");
  check("Toyota SUV under 250k", t.make === "Toyota" && t.bodyType === "SUV" &&
        t.price?.kind === "max" && t.price.max === 250000);
}
{
  const t = P("economical automatic family car");
  check("economical automatic family car", t.preferences.efficiency === true &&
        t.transmission === "Automatic" && t.preferences.family === true);
}
{
  const t = P("low mileage Toyota SUV");
  check("low mileage Toyota SUV", t.preferences.lowMileage === true && t.make === "Toyota" && t.bodyType === "SUV");
}

/* every new suggestion phrase must itself parse cleanly */
const SUGGESTION_PHRASES = [
  "Low Mileage Cars","Low Mileage SUVs","Low Mileage Toyota",
  "Cars Under R200,000 With Low Mileage",
  "Affordable 7 Seater Cars","7 Seater Family Cars",
  "Family Cars Under R300,000","SUVs Under R300,000",
  "Fuel Efficient Family Cars","Economical Family Cars",
  "Automatic SUVs","Fuel Efficient SUVs",
  "SUVs Around R80,000","Cars Around R80,000"
];
{
  const bad = SUGGESTION_PHRASES.filter(ph => {
    const i = parseSearchIntent(ph);
    return i.cleanedQuery !== "" && !i.make && !i.model && !i.bodyType && !i.fuel &&
           !i.transmission && !i.price && !Object.values(i.preferences).some(Boolean) &&
           !i.seatsMin;
  });
  check("all phase-2 smart phrases parse cleanly", bad.length === 0, JSON.stringify(bad));
}

/* ---------------- AUTOCOMPLETE ---------------- */
{
  const s = getSmartSuggestions("low");
  const labels = s.map(x => x.label);
  check("low → Low Mileage Cars", labels.includes("Low Mileage Cars"), JSON.stringify(labels));
  check("low → Low Mileage SUVs", labels.includes("Low Mileage SUVs"));
  check("low → Low Mileage Toyota", labels.includes("Low Mileage Toyota"));
  check("low → Cars Under R200,000 With Low Mileage", labels.includes("Cars Under R200,000 With Low Mileage"));
}
{
  const s = getSmartSuggestions("7");
  const labels = s.map(x => x.label);
  check("7 → 7 Seater Cars", labels.includes("7 Seater Cars"), JSON.stringify(labels));
  check("7 → 7 Seater SUVs", labels.includes("7 Seater SUVs"));
  check("7 → Affordable 7 Seater Cars", labels.includes("Affordable 7 Seater Cars"));
}
{
  const s = getSmartSuggestions("family");
  const labels = s.map(x => x.label);
  check("family → family suggestions present", labels.some(l => /family/i.test(l)), JSON.stringify(labels));
  /* new additive combos reachable via prefix bases (dropdown caps at 8) */
  const all = labels.concat(
    getSmartSuggestions("fami").map(x=>x.label),
    getSmartSuggestions("famil").map(x=>x.label)
  );
  check("family → Family Cars Under R300,000 available", all.includes("Family Cars Under R300,000"));
}
{
  const s = getSmartSuggestions("toyota");
  const labels = s.map(x => x.label);
  check("toyota → Toyota SUVs preserved", labels.includes("Toyota SUVs"), JSON.stringify(labels));
  check("toyota → Toyota Family Cars added", labels.includes("Toyota Family Cars"), JSON.stringify(labels));
}
{
  const s = getSmartSuggestions("toyota suv");
  const labels = s.map(x => x.label);
  check("toyota suv → Toyota SUVs", labels.includes("Toyota SUVs"));
  check("toyota suv → Toyota SUV Under R…", s.some(x => /^Toyota SUV Under R[\d,]+$/.test(x.label)));
  check("toyota suv → Toyota Family SUVs added", labels.includes("Toyota Family SUVs"), JSON.stringify(labels));
}
{
  /* dropdown caps at 8 — collect across close prefixes to verify
     all additive SUV combos exist without flooding any single view */
  const all = ["su","suv","suv "].flatMap(pfx => getSmartSuggestions(pfx).map(x=>x.label));
  for(const want of ["SUVs","Affordable SUVs","Family SUVs","Automatic SUVs","Fuel Efficient SUVs","SUVs Under R300,000"]){
    check("suv → " + want, all.includes(want), JSON.stringify(getSmartSuggestions("suv").map(x=>x.label)));
  }
}
{
  const s = getSmartSuggestions("80k");
  const labels = s.map(x => x.label);
  check("80k → Cars Around R80,000", labels.includes("Cars Around R80,000"), JSON.stringify(labels));
  check("80k → SUVs Around R80,000", labels.includes("SUVs Around R80,000"));
}
{
  const s = getSmartSuggestions("80k SUV");
  const labels = s.map(x => x.label);
  check("80k SUV → SUVs Around R80,000", labels.includes("SUVs Around R80,000"), JSON.stringify(labels));
}
{
  const s = getSmartSuggestions("BMW SUV");
  const labels = s.map(x => x.label);
  check("BMW SUV context stays BMW-specific",
    labels.filter(l => l.startsWith("BMW")).length >= Math.ceil(labels.length / 2),
    JSON.stringify(labels));
}

/* ---------------- REPORT ---------------- */
console.log(`\nPASS: ${pass}  FAIL: ${fail}`);
if(failures.length){
  console.log("\nFailures:");
  failures.forEach(f => console.log("  ✗ " + f));
  process.exit(1);
}
console.log("All Phase-2 validations passed.");





