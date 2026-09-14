import { searchVehicles } from "./searchAdapter.js";
import { navigate } from "./router.js";
import { setParams } from "./utils.js";

/* ==========================
🔥 SHARED SEARCH EXECUTION
========================== */

export async function runSearch(filters, options = {}){

  const { redirect = true } = options;

  const { data, count } = await searchVehicles(filters);

  /* ==========================
  🔥 1 RESULT → VEHICLE PAGE
  ========================== */

  if(count === 1 && data[0]){
    if(redirect){
      navigate(`/vehicle?id=${data[0].id}`);
    }
    return { data, count };
  }

  /* ==========================
  🔥 MULTIPLE → BROWSE PAGE
  ========================== */

  if(count > 1){
    if(redirect){
      const url = "/browse" + setParams(filters);
      navigate(url);
    }
    return { data, count };
  }

  /* ==========================
  🔥 NO RESULTS
  ========================== */

  return { data: [], count: 0 };
}