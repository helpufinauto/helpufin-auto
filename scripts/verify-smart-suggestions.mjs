import { getSmartSuggestions } from "../js/searchIntent.js";

const cases = [
  ["Cars Under R100,000", "Cars Under R100,000", "Price"],
  ["cars under r100,000", "Cars Under R100,000"],
  ["under 100", "Under R100,000"],
  ["under 60000 km", null, "Mileage"],
  ["suz", "Suzuki", "Make"],
  ["toy", "Toyota", "Make"],
  ["toyota low", "Toyota Low Mileage"],
  ["Toyota low mileage", "Toyota low mileage", "Make + Mileage"],
  ["bmw automatic", null],
  ["electric suv", null],
  ["suv under r300000", null]
];

let fails = 0;
for(const [input, wantLabel, wantSub] of cases){
  const s = getSmartSuggestions(input);
  const hit = wantLabel ? s.find(x => x.label.toLowerCase() === wantLabel.toLowerCase()) : s[0];
  const ok = !!hit && (!wantSub || String(hit.sublabel).includes(wantSub));
  if(!ok){ fails++; console.log("FAIL:", input, "=>", JSON.stringify(s.map(x => [x.label, x.sublabel]))); }
  else console.log("PASS:", input, "->", hit.label, "|", hit.sublabel);
}
console.log(fails === 0 ? "ALL SCENARIOS PASS" : fails + " FAILURES");
