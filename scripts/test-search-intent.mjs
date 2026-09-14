/* =========================================================
HUFA INTELLIGENT SEARCH — VALIDATION HARNESS
Runs the shared intent layer (js/searchIntent.js) against
every scenario in the spec (§23) plus autocomplete checks.
Pure Node — no DOM, no network.
========================================================= */
import {
  parseSearchIntent,
  getSmartSuggestions,
  aroundBand,
  formatRand
} from "../js/searchIntent.js";

let pass = 0, fail = 0;
const failures = [];

function check(name, cond, detail){
  if(cond){ pass++; }
  else { fail++; failures.push(`${name}${detail ? " :: " + detail : ""}`); }
}

const P = q => parseSearchIntent(q);

/* ---------------- PRICE: standalone numbers ---------------- */
{
  const t = P("50000");
  check("50000 → around 50000", t.price?.kind === "around" && t.price.target === 50000, JSON.stringify(t.price));
  check("50000 cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("R50000");
  check("R50000 → around 50000", t.price?.kind === "around" && t.price.target === 50000, JSON.stringify(t.price));
}
{
  const t = P("R50k");
  check("R50k → around 50000", t.price?.kind === "around" && t.price.target === 50000, JSON.stringify(t.price));
}
{
  const t = P("100000");
  check("100000 → around 100000", t.price?.kind === "around" && t.price.target === 100000, JSON.stringify(t.price));
}
{
  const t = P("100k");
  check("100k → around 100000", t.price?.kind === "around" && t.price.target === 100000, JSON.stringify(t.price));
}
{
  const t = P("R150k");
  check("R150k → around 150000", t.price?.kind === "around" && t.price.target === 150000, JSON.stringify(t.price));
}
{
  const t = P("R200 000");
  check("R200 000 → around 200000", t.price?.kind === "around" && t.price.target === 200000, JSON.stringify(t.price));
}
{
  const t = P("R1 million");
  check("R1 million → around 1000000", t.price?.kind === "around" && t.price.target === 1000000, JSON.stringify(t.price));
}
{
  const t = P("1m");
  check("1m → around 1000000", t.price?.kind === "around" && t.price.target === 1000000, JSON.stringify(t.price));
}
{
  const t = P("50 thousand");
  check("50 thousand → around 50000", t.price?.kind === "around" && t.price.target === 50000, JSON.stringify(t.price));
}
{
  const t = P("1.5m");
  check("1.5m → around 1500000", t.price?.kind === "around" && t.price.target === 1500000, JSON.stringify(t.price));
}

/* ---------------- PRICE CONSTRAINTS (hard maxima) ---------------- */
{
  const t = P("under R50k");
  check("under R50k → max 50000", t.price?.kind === "max" && t.price.max === 50000, JSON.stringify(t.price));
}
{
  const t = P("below R100k");
  check("below R100k → max 100000", t.price?.kind === "max" && t.price.max === 100000, JSON.stringify(t.price));
}
{
  const t = P("under R150000");
  check("under R150000 → max 150000", t.price?.kind === "max" && t.price.max === 150000, JSON.stringify(t.price));
}
{
  const t = P("up to R200k");
  check("up to R200k → max 200000", t.price?.kind === "max" && t.price.max === 200000, JSON.stringify(t.price));
}
{
  const t = P("maximum R250k");
  check("maximum R250k → max 250000", t.price?.kind === "max" && t.price.max === 250000, JSON.stringify(t.price));
}
{
  const t = P("less than R100k");
  check("less than R100k → max 100000", t.price?.kind === "max" && t.price.max === 100000, JSON.stringify(t.price));
}
{
  const t = P("under 50");
  check("under 50 → max 50000", t.price?.kind === "max" && t.price.max === 50000, JSON.stringify(t.price));
}
{
  const t = P("under 100");
  check("under 100 → max 100000", t.price?.kind === "max" && t.price.max === 100000, JSON.stringify(t.price));
}

/* ---------------- PRICE RANGES ---------------- */
{
  const t = P("R50k to R100k");
  check("R50k to R100k → range", t.price?.kind === "range" && t.price.min === 50000 && t.price.max === 100000, JSON.stringify(t.price));
}
{
  const t = P("R100k - R200k");
  check("R100k - R200k → range", t.price?.kind === "range" && t.price.min === 100000 && t.price.max === 200000, JSON.stringify(t.price));
}
{
  const t = P("between R150k and R250k");
  check("between R150k and R250k → range", t.price?.kind === "range" && t.price.min === 150000 && t.price.max === 250000, JSON.stringify(t.price));
}
{
  const t = P("100000 200000");
  check("100000 200000 → range", t.price?.kind === "range" && t.price.min === 100000 && t.price.max === 200000, JSON.stringify(t.price));
}

/* ---------------- PRICE APPROXIMATION ---------------- */
{
  const t = P("around R100k");
  check("around R100k → around 100000", t.price?.kind === "around" && t.price.target === 100000, JSON.stringify(t.price));
}
{
  const t = P("around R150k");
  check("around R150k → around 150000", t.price?.kind === "around" && t.price.target === 150000, JSON.stringify(t.price));
}
{
  const t = P("cars around R200k");
  check("cars around R200k → around 200000", t.price?.kind === "around" && t.price.target === 200000, JSON.stringify(t.price));
  check("cars around R200k cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const b = aroundBand(150000);
  check("aroundBand(150000) = 120000..180000", b.min === 120000 && b.max === 180000, JSON.stringify(b));
}

/* ---------------- VEHICLE INTENT ---------------- */
{
  const t = P("SUV");
  check("SUV → bodyType SUV", t.bodyType === "SUV", t.bodyType);
  check("SUV cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("family car");
  check("family car → family pref", t.preferences.family === true, JSON.stringify(t.preferences));
  check("family car cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
  check("family car does NOT force SUV", t.bodyType === "", t.bodyType);
}
{
  const t = P("family SUV");
  check("family SUV → family + SUV", t.preferences.family === true && t.bodyType === "SUV", `${t.preferences.family}/${t.bodyType}`);
}
{
  const t = P("cheap cars");
  check("cheap cars → budget pref", t.preferences.budget === true, JSON.stringify(t.preferences));
  check("cheap cars cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("budget cars");
  check("budget cars → budget pref", t.preferences.budget === true, JSON.stringify(t.preferences));
}
{
  const t = P("affordable cars");
  check("affordable cars → budget pref", t.preferences.budget === true, JSON.stringify(t.preferences));
}
{
  const t = P("first car");
  check("first car → firstCar pref", t.preferences.firstCar === true, JSON.stringify(t.preferences));
}
{
  const t = P("practical car");
  check("practical car → practical pref", t.preferences.practical === true, JSON.stringify(t.preferences));
}
{
  const t = P("luxury SUV");
  check("luxury SUV → luxury + SUV", t.preferences.luxury === true && t.bodyType === "SUV", `${t.preferences.luxury}/${t.bodyType}`);
}
{
  const t = P("fuel efficient cars");
  check("fuel efficient → efficiency pref", t.preferences.efficiency === true, JSON.stringify(t.preferences));
}
{
  const t = P("7 seater SUV");
  check("7 seater SUV → seatsMin 7 + SUV", t.seatsMin === 7 && t.bodyType === "SUV", `${t.seatsMin}/${t.bodyType}`);
}

/* ---------------- COMBINATIONS ---------------- */
{
  const t = P("Toyota SUV");
  check("Toyota SUV → make+body", t.make === "Toyota" && t.bodyType === "SUV", `${t.make}/${t.bodyType}`);
  check("Toyota SUV cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("Toyota under R150k");
  check("Toyota under R150k → make + hard max", t.make === "Toyota" && t.price?.kind === "max" && t.price.max === 150000, `${t.make}/${JSON.stringify(t.price)}`);
  check("Toyota under R150k cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("cheap Toyota SUV");
  check("cheap Toyota SUV → make+body+budget", t.make === "Toyota" && t.bodyType === "SUV" && t.preferences.budget === true, `${t.make}/${t.bodyType}/${t.preferences.budget}`);
}
{
  const t = P("diesel SUV");
  check("diesel SUV → fuel+body", t.fuel === "Diesel" && t.bodyType === "SUV", `${t.fuel}/${t.bodyType}`);
}
{
  const t = P("automatic family car");
  check("automatic family car → trans+family", t.transmission === "Automatic" && t.preferences.family === true, `${t.transmission}/${t.preferences.family}`);
}
{
  const t = P("family automatic SUV under R250k");
  check("family automatic SUV under R250k", t.bodyType === "SUV" && t.transmission === "Automatic" && t.preferences.family === true && t.price?.kind === "max" && t.price.max === 250000, JSON.stringify({b:t.bodyType,tr:t.transmission,f:t.preferences.family,p:t.price}));
  check("family automatic SUV under R250k cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("BMW SUV under R300k");
  check("BMW SUV under R300k", t.make === "BMW" && t.bodyType === "SUV" && t.price?.kind === "max" && t.price.max === 300000, `${t.make}/${t.bodyType}/${JSON.stringify(t.price)}`);
}
{
  const t = P("affordable Toyota diesel SUV");
  check("affordable Toyota diesel SUV", t.make === "Toyota" && t.fuel === "Diesel" && t.bodyType === "SUV" && t.preferences.budget === true, `${t.make}/${t.fuel}/${t.bodyType}/${t.preferences.budget}`);
}

/* ---------------- EXACT SEARCH PRESERVED ---------------- */
{
  const t = P("Toyota");
  check("Toyota → make", t.make === "Toyota", t.make);
  check("Toyota cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("Corolla");
  check("Corolla → model + make inferred", t.model === "Corolla" && t.make === "Toyota", `${t.model}/${t.make}`);
}
{
  const t = P("Fortuner");
  check("Fortuner → model", t.model === "Fortuner" && t.make === "Toyota", `${t.model}/${t.make}`);
}
{
  const t = P("Hilux");
  check("Hilux → model", t.model === "Hilux", t.model);
}
{
  const t = P("Polo");
  check("Polo → VW model", t.model === "Polo" && t.make === "Volkswagen", `${t.model}/${t.make}`);
}
{
  const t = P("X3");
  check("X3 → BMW model (not price)", t.model === "X3" && t.make === "BMW" && !t.price, `${t.model}/${t.make}/${JSON.stringify(t.price)}`);
}
{
  const t = P("911");
  check("911 → Porsche model (not price)", t.model === "911" && t.make === "Porsche" && !t.price, `${t.model}/${t.make}/${JSON.stringify(t.price)}`);
}
{
  const t = P("3008");
  check("3008 → Peugeot model (not price)", t.model === "3008" && t.make === "Peugeot" && !t.price, `${t.model}/${t.make}/${JSON.stringify(t.price)}`);
}
{
  const t = P("Corolla Cross");
  check("Corolla Cross → longest model match", t.model === "Corolla Cross", t.model);
}
{
  const t = P("Mercedes-Benz C-Class");
  check("Mercedes-Benz C-Class", t.make === "Mercedes-Benz" && t.model === "C-Class", `${t.make}/${t.model}`);
}
{
  const t = P("mercedes benz gla");
  check("mercedes benz gla (spaced)", t.make === "Mercedes-Benz" && t.model === "GLA", `${t.make}/${t.model}`);
}
{
  const t = P("2015 Toyota Corolla");
  check("2015 Toyota Corolla → year+make+model", t.yearFrom === 2015 && t.make === "Toyota" && t.model === "Corolla", `${t.yearFrom}/${t.make}/${t.model}`);
  check("2015 Toyota Corolla cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("leather seats");
  check("leather seats residual kept", t.cleanedQuery === "leather seats", JSON.stringify(t.cleanedQuery));
  check("leather seats no seatsMin", t.seatsMin === null, String(t.seatsMin));
}
{
  const t = P("white");
  check("unknown word kept for text search", t.cleanedQuery === "white", JSON.stringify(t.cleanedQuery));
}

/* ---------------- BODY SYNONYMS ---------------- */
{
  check("bakkie → Bakkie", P("bakkie").bodyType === "Bakkie");
  check("pickup → Bakkie", P("pickup").bodyType === "Bakkie");
  check("pickup truck → Bakkie", P("pickup truck").bodyType === "Bakkie");
  check("minivan → MPV", P("minivan").bodyType === "MPV");
  check("mpv → MPV", P("mpv").bodyType === "MPV");
  check("crossover → Crossover", P("crossover").bodyType === "Crossover");
  check("estate → Wagon", P("estate").bodyType === "Wagon");
  check("convertible → Convertible", P("convertible").bodyType === "Convertible");
  check("hatchback → Hatchback", P("hatchback").bodyType === "Hatchback");
  check("sedan → Sedan", P("sedan").bodyType === "Sedan");
  check("double cab → Double Cab", P("double cab").bodyType === "Double Cab");
}

/* ---------------- FUEL / TRANS / DRIVE ---------------- */
{
  check("petrol → Petrol", P("petrol").fuel === "Petrol");
  check("diesel → Diesel", P("diesel").fuel === "Diesel");
  check("hybrid → Hybrid", P("hybrid").fuel === "Hybrid");
  check("electric → Electric + evOnly", P("electric").fuel === "Electric" && P("electric").flags.evOnly === true);
  check("ev → Electric", P("ev").fuel === "Electric");
  check("auto → Automatic", P("auto").transmission === "Automatic");
  check("automatic → Automatic", P("automatic").transmission === "Automatic");
  check("manual → Manual", P("manual").transmission === "Manual");
  check("4x4 → AWD", P("4x4").drive === "AWD");
  check("awd → AWD", P("awd").drive === "AWD");
}

/* ---------------- FLAGS / CONDITION / SELLER / OWNERS / FINANCE ---------------- */
{
  const t = P("certified suv under 200k");
  check("certified suv under 200k", t.flags.certifiedPreOwned === true && t.bodyType === "SUV" && t.price?.kind === "max" && t.price.max === 200000, JSON.stringify({f:t.flags,b:t.bodyType,p:t.price}));
}
{
  const t = P("one owner toyota");
  check("one owner toyota", t.flags.owners === "1" && t.make === "Toyota", `${t.flags.owners}/${t.make}`);
}
{
  const t = P("used cars under 80000");
  check("used cars under 80000", t.condition === "pre-owned" && t.price?.kind === "max" && t.price.max === 80000, `${t.condition}/${JSON.stringify(t.price)}`);
  check("used cars under 80000 cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("brand new hilux");
  check("brand new hilux", t.condition === "new" && t.model === "Hilux", `${t.condition}/${t.model}`);
}
{
  const t = P("private seller bakkie");
  check("private seller bakkie", t.seller === "private" && t.bodyType === "Bakkie", `${t.seller}/${t.bodyType}`);
}
{
  const t = P("dealer suv");
  check("dealer suv", t.seller === "dealer" && t.bodyType === "SUV", `${t.seller}/${t.bodyType}`);
}
{
  const t = P("warranty");
  check("warranty → flag", P("warranty").flags.warrantyIncluded === true);
  check("roadworthy → flag", P("roadworthy").flags.roadworthyCertified === true);
  check("accident free → flag", P("accident free").flags.accidentFree === true);
}
{
  const t = P("r5000 per month");
  check("r5000 per month → finance not price", t.finance.monthlyTarget === 5000 && !t.price, JSON.stringify({fin:t.finance,p:t.price}));
  check("r5000 per month cleaned", t.cleanedQuery === "", JSON.stringify(t.cleanedQuery));
}
{
  const t = P("5000 monthly");
  check("5000 monthly → finance", t.finance.monthlyTarget === 5000 && !t.price, JSON.stringify(t.finance));
}

/* ---------------- MIN PRICE ---------------- */
{
  const t = P("from R100k");
  check("from R100k → min 100000", t.price?.kind === "min" && t.price.min === 100000, JSON.stringify(t.price));
}
{
  const t = P("over 200k");
  check("over 200k → min 200000", t.price?.kind === "min" && t.price.min === 200000, JSON.stringify(t.price));
}

/* ---------------- AUTOCOMPLETE ---------------- */
{
  const s = getSmartSuggestions("");
  check("empty → starters ≥6", s.length >= 6, String(s.length));
  check("starters include Budget Cars", s.some(x => x.label === "Budget Cars"));
}
{
  const s = getSmartSuggestions("bud");
  check("bud → Budget Cars", s.some(x => x.label === "Budget Cars"), JSON.stringify(s.map(x=>x.label)));
  check("bud → Budget SUVs", s.some(x => x.label === "Budget SUVs"));
}
{
  const s = getSmartSuggestions("fam");
  check("fam → Family Cars", s.some(x => x.label === "Family Cars"), JSON.stringify(s.map(x=>x.label)));
  check("fam → Family SUVs", s.some(x => x.label === "Family SUVs"));
  check("fam → Practical Family Cars", s.some(x => x.label === "Practical Family Cars"));
}
{
  const s = getSmartSuggestions("toy");
  check("toy → Toyota", s.some(x => x.label === "Toyota"), JSON.stringify(s.map(x=>x.label)));
  check("toy → Toyota SUVs", s.some(x => x.label === "Toyota SUVs"));
  check("toy → Toyota Automatic", s.some(x => x.label === "Toyota Automatic"));
  check("toy → Toyota Under R…", s.some(x => /^Toyota Under R[\d,]+$/.test(x.label)));
}
{
  const s = getSmartSuggestions("toyota");
  check("toyota → Toyota SUVs", s.some(x => x.label === "Toyota SUVs"));
}
{
  const s = getSmartSuggestions("toyota s");
  const labels = s.map(x => x.label);
  check("toyota s → Toyota SUVs or Starlet", labels.some(l => l === "Toyota SUVs" || l === "Toyota Starlet"), JSON.stringify(labels));
}
{
  const s = getSmartSuggestions("toyota suv");
  check("toyota suv → Toyota SUVs", s.some(x => x.label === "Toyota SUVs"), JSON.stringify(s.map(x=>x.label)));
  check("toyota suv → Toyota SUV Under R…", s.some(x => /^Toyota SUV Under R[\d,]+$/.test(x.label)));
}
{
  const s = getSmartSuggestions("under");
  check("under → Cars Under R50,000", s.some(x => x.label === "Cars Under R50,000"), JSON.stringify(s.map(x=>x.label)));
  check("under → Cars Under R100,000", s.some(x => x.label === "Cars Under R100,000"));
}
{
  const s = getSmartSuggestions("under 5");
  check("under 5 → Cars Under R50,000", s.some(x => x.label === "Cars Under R50,000"), JSON.stringify(s.map(x=>x.label)));
}
{
  const s = getSmartSuggestions("under 50");
  check("under 50 → Cars Under R50,000", s.some(x => x.label === "Cars Under R50,000"), JSON.stringify(s.map(x=>x.label)));
}
{
  const s = getSmartSuggestions("under R50");
  check("under R50 → Cars Under R50,000", s.some(x => x.label === "Cars Under R50,000"), JSON.stringify(s.map(x=>x.label)));
}
{
  const s = getSmartSuggestions("BMW SUV");
  check("BMW SUV → BMW SUVs", s.some(x => x.label === "BMW SUVs"), JSON.stringify(s.map(x=>x.label)));
  check("BMW SUV → BMW SUV Under R300,000", s.some(x => x.label === "BMW SUV Under R300,000"));
}
{
  const s = getSmartSuggestions("toyota under r150");
  check("toyota under r150 → Toyota Under R150,000", s.some(x => x.label === "Toyota Under R150,000"), JSON.stringify(s.map(x=>x.label)));
}
{
  const s = getSmartSuggestions("affordable family");
  check("affordable family → Affordable Family Cars", s.some(x => x.label === "Affordable Family Cars"), JSON.stringify(s.map(x=>x.label)));
}
{
  /* every smart suggestion must itself be parseable (click-through works) */
  const all = ["Budget Cars","Family SUVs","First Car","Cars Under R100,000","Diesel SUVs",
               "Automatic Family Cars","Luxury SUVs","Fuel Efficient Cars",
               "Toyota SUVs","Toyota Automatic","Toyota Under R150,000",
               "BMW SUVs","BMW SUV Under R300,000","Cars Under R50,000","SUVs Under R50,000",
               "7 Seater Cars","Practical Family Cars","Affordable Family Cars"];
  const bad = all.filter(ph => {
    const i = parseSearchIntent(ph);
    return i.cleanedQuery !== "" && !i.make && !i.model && !i.bodyType && !i.fuel && !i.transmission && !i.price && !Object.values(i.preferences).some(Boolean) && !i.seatsMin;
  });
  check("all smart phrases parse cleanly", bad.length === 0, JSON.stringify(bad));
}

/* ---------------- RANKING PREFS SANITY (pure function) ---------------- */
{
  /* simulate rankVehicles preference block inputs via parse output */
  const t = P("cheap automatic family SUV under R250k");
  check("combo: budget+auto+family+SUV+max250k",
    t.preferences.budget && t.transmission === "Automatic" &&
    t.preferences.family && t.bodyType === "SUV" &&
    t.price?.kind === "max" && t.price.max === 250000,
    JSON.stringify({p:t.preferences,tr:t.transmission,b:t.bodyType,price:t.price}));
}

/* ---------------- REPORT ---------------- */
console.log(`\nPASS: ${pass}  FAIL: ${fail}`);
if(failures.length){
  console.log("\nFailures:");
  failures.forEach(f => console.log("  ✗ " + f));
  process.exit(1);
}
console.log("All intent-layer validations passed.");