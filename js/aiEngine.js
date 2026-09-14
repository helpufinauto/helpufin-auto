/* =========================================
AI ENGINE — INTENT + RANKING + BEHAVIOR
========================================= */

import { KEYWORDS, MAKES, MODELS } from "./searchData.js";
import { supabase } from "./api.js";
import { parseSearchIntent } from "./searchIntent.js";

/* ========================== */
/* 🔍 INTENT PARSER
   ADDITIVE UPGRADE: now delegates to the shared
   natural-language intent layer (js/searchIntent.js).
   Every legacy output field is still produced, so all
   existing consumers keep working unchanged.

   Semantic upgrades (per HUFA intelligent-search spec):
   • explicit "under/below/up to/max" prices → hard max
   • standalone numbers → "around price" (priceTarget)
     instead of a silent hard ceiling
   • price ranges → priceMin + priceMax
   • budget/cheap/affordable wording → soft ranking
     preference (budgetPref) instead of forcing financeMode
   • family intent → seats/body-type RANKING preference
     (family/minSeats) instead of forcing body_type = SUV
========================== */

export function parseIntent(q){

  if(!q) return {};

  const r = parseSearchIntent(q);
  const result = {};

  /* ---------- core vehicle attributes ---------- */

  if(r.make) result.make = r.make;
  if(r.model) result.model = r.model;
  if(r.bodyType) result.body_type = r.bodyType.toUpperCase();
  if(r.fuel) result.fuel = r.fuel;
  if(r.transmission) result.transmission = r.transmission;
  if(r.drive) result.drive = r.drive;
  if(r.condition) result.condition = r.condition;

  /* ---------- PRICE ----------
     Only EXPLICIT maximums populate the legacy priceMax field.
     Approximate prices expose priceTarget so callers treat them
     as "search around", never as a silent hard ceiling. */

  if(r.price){
    if(r.price.kind === "max"){
      result.priceMax = r.price.max;
    } else if(r.price.kind === "range"){
      result.priceMin = r.price.min;
      result.priceMax = r.price.max;
    } else if(r.price.kind === "min"){
      result.priceMin = r.price.min;
    } else if(r.price.kind === "around"){
      result.priceTarget = r.price.target;
    }
  }

  /* ---------- lifestyle / preference intents ---------- */

  if(r.seatsMin) result.seats = r.seatsMin;

  if(r.preferences.family){
    result.family = true;
    result.minSeats = r.seatsMin || 5; /* legacy field kept */
  }
  if(r.preferences.firstCar) result.firstCar = true;
  if(r.preferences.reliability) result.reliable = true;
  if(r.preferences.efficiency) result.efficient = true;
  if(r.preferences.budget) result.budgetPref = true;
  if(r.preferences.luxury) result.luxuryPref = true;
  if(r.preferences.performance) result.performancePref = true;
  if(r.preferences.compact) result.compactPref = true;
  if(r.preferences.spacious) result.spaciousPref = true;
  if(r.preferences.practical) result.practicalPref = true;
  if(r.preferences.safety) result.safetyPref = true;

  /* legacy keyword behaviour preserved */
  if(/\bbusiness\b/.test(r.normalized)){
    result.comfort = true;
    if(!result.body_type) result.body_type = "SEDAN";
  }

  /* ---------- condition / verification flags ---------- */

  const F = r.flags || {};
  if(F.certifiedPreOwned) result.certifiedPreOwned = true;
  if(F.warrantyIncluded) result.warrantyIncluded = true;
  if(F.roadworthyCertified) result.roadworthyCertified = true;
  if(F.ownershipVerified) result.ownershipVerified = true;
  if(F.accidentFree) result.accidentFree = true;
  if(F.servicePlanIncluded) result.servicePlanIncluded = true;
  if(F.maintenancePlanIncluded) result.maintenancePlanIncluded = true;
  if(F.financeAvailable) result.financeAvailable = true;
  if(F.fastCharge) result.fastCharge = true;
  if(F.priceNegotiable) result.priceNegotiable = true;
  if(F.evOnly) result.evOnly = true;
  if(F.owners) result.owners = F.owners;

  /* ---------- FINANCE ----------
     Genuine monthly-budget phrasing keeps the legacy finance flow.
     Generic cheap/affordable wording is now a soft ranking
     preference (budgetPref) rather than forcing financeMode. */

  if(r.finance && r.finance.monthlyTarget > 0){
    result.monthlyTarget = r.finance.monthlyTarget;
    result.affordableOnly = true;
    result.term = r.finance.term || 72;
    result.interest = r.finance.interest || 10;
  }

  return result;
}

function capitalize(t){
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* ========================== */
/* 🔥 USER PROFILE */
/* ========================== */

export async function getUserProfile(){

  const { data:userData } = await supabase.auth.getUser();

  if(!userData.user) return {};

  const userId = userData.user.id;

  const [views, savedRes, credit] = await Promise.all([

supabase
.from("vehicle_views")
.select(`
  vehicle_id,
  vehicles (
    make
  )
`)
.eq("user_id", userId),

supabase
.from("saved_vehicles")
.select(`
  vehicle_id,
  vehicles (
    make
  )
`)
.eq("user_id", userId),

    supabase.from("credit_scores")
    .select("*")
    .eq("user_id", userId)
    .single()

  ]);

const viewed =
  views.data || [];

const saved =
  savedRes.data || [];

return {

  viewed:
    viewed.map(x=>x.vehicle_id),

  saved:
    saved.map(x=>x.vehicle_id),

  viewedMakes:
    viewed
    .map(x=>x.make)
    .filter(Boolean),

  savedMakes:
    saved
    .map(x=>x.make)
    .filter(Boolean),

  credit:
    credit.data || null

};
}

/* ========================== */
/* 🔥 POPULARITY */
/* ========================== */

/* ========================== */
/* 🔥 TRENDING + POPULARITY ENGINE */
/* ========================== */

/* =========================================
🔥 POPULARITY CACHE (PERFORMANCE)
getPopularityMap() downloads four analytics
tables on every call. Popularity is a soft
ranking signal only — it never changes WHICH
vehicles exist or their prices — so a short
60-second in-memory cache is safe: inventory
freshness is unaffected, while repeat loads
(Browse filters, pagination, homepage sections)
skip the heavy re-download entirely.
========================================= */

let popularityCache = null;
let popularityCacheTime = 0;
let popularityCachePromise = null;

const POPULARITY_CACHE_TTL = 60000;

export function getPopularityMap(){

  const now = Date.now();

  if(
    popularityCache &&
    (now - popularityCacheTime) < POPULARITY_CACHE_TTL
  ){
    return Promise.resolve(popularityCache);
  }

  if(!popularityCachePromise){

    popularityCachePromise =
    fetchPopularityMap()
    .then(map=>{

      popularityCache = map || {};
      popularityCacheTime = Date.now();
      popularityCachePromise = null;

      return popularityCache;

    })
    .catch(err=>{

      console.warn(
        "Popularity map failed:",
        err
      );

      popularityCachePromise = null;

      return {};

    });

  }

  return popularityCachePromise;

}

export function clearPopularityCache(){
  popularityCache = null;
  popularityCacheTime = 0;
  popularityCachePromise = null;
}

async function fetchPopularityMap(){

  const [
    views,
    saves,
    impressions,
    analytics
  ] = await Promise.all([

    supabase
    .from("vehicle_views")
    .select("vehicle_id, created_at"),

    supabase
    .from("saved_vehicles")
    .select("vehicle_id, created_at"),

    supabase
    .from("vehicle_impressions")
    .select("vehicle_id, created_at"),

    supabase
    .from("vehicle_analytics")
    .select("*")

  ]);

  const now = Date.now();

  const scoreMap = {};

  function ageWeight(date){

    if(!date) return 1;

    const ageDays =
      (now - new Date(date).getTime())
      / 86400000;

    /* ==========================
    🔥 DECAY CURVE
    ========================== */

    if(ageDays <= 1) return 4.5;
    if(ageDays <= 3) return 3.2;
    if(ageDays <= 7) return 2.4;
    if(ageDays <= 14) return 1.7;
    if(ageDays <= 30) return 1.2;

    return 0.6;
  }

  /* ==========================
  👁 VIEWS
  ========================== */

  (views.data || []).forEach(v=>{

    const id = v.vehicle_id;

    if(!scoreMap[id]){
      scoreMap[id] = 0;
    }

    scoreMap[id] +=
      2 * ageWeight(v.created_at);

  });

  /* ==========================
  ❤️ SAVES
  ========================== */

  (saves.data || []).forEach(v=>{

    const id = v.vehicle_id;

    if(!scoreMap[id]){
      scoreMap[id] = 0;
    }

    scoreMap[id] +=
      6 * ageWeight(v.created_at);

  });

  /* ==========================
  👀 IMPRESSIONS
  ========================== */

  (impressions.data || []).forEach(v=>{

    const id = v.vehicle_id;

    if(!scoreMap[id]){
      scoreMap[id] = 0;
    }

    scoreMap[id] +=
      0.35 * ageWeight(v.created_at);

  });

  /* ==========================
  📊 ANALYTICS
  ========================== */

  (analytics.data || []).forEach(v=>{

    const id = v.vehicle_id;

    if(!scoreMap[id]){
      scoreMap[id] = 0;
    }

    scoreMap[id] +=
      (Number(v.clicks || 0) * 5) +
      (Number(v.views || 0) * 2) +
      (Number(v.saves || 0) * 7);

  });

  return scoreMap;
}

/* ========================== */
/* 🔥 RANKING ENGINE (UPGRADED) */
/* ========================== */

export function rankVehicles(list, context){

  const {
  query,
  filters,
  user,
  popularity
} = context;

  const q = (query || "").toLowerCase().trim();

  return list.map(v=>{

    let score = 0;
    let confidence = "low";

    const make = v.make?.toLowerCase() || "";
    const model = v.model?.toLowerCase() || "";
    const year = (v.year || "").toString();

    const full = `${make} ${model} ${year}`.trim();
    const short = `${make} ${model}`.trim();

    /* ==========================
    🔥 1. EXACT MATCH (ABSOLUTE PRIORITY)
    ========================== */

    if(q && (q === full || q === short)){
      score += 1000;
      confidence = "exact";
    }

    /* ==========================
    🔥 2. STARTS WITH (VERY STRONG)
    ========================== */

    else if(q && (
      full.startsWith(q) ||
      short.startsWith(q)
    )){
      score += 600;
      confidence = "high";
    }

    /* ==========================
    🔥 3. PARTIAL MATCH
    ========================== */

    else if(q && (
      full.includes(q) ||
      model.includes(q) ||
      make.includes(q)
    )){
      score += 300;
      confidence = "medium";
    }

    /* ==========================
    🔥 4. FUZZY / TOKEN MATCH
    ========================== */

    if(q){
      const tokens = q.split(" ");

      tokens.forEach(t=>{
        if(model.includes(t)) score += 80;
        if(make.includes(t)) score += 50;
      });
    }

    /* ==========================
    💰 PRICE ALIGNMENT
    ========================== */

    if(filters?.priceMax){
      const diff = Math.abs(filters.priceMax - v.price);
      score += Math.max(0, 40 - diff / 10000);
    }

    /* ==========================
    🚗 FILTER MATCH BOOSTS
    ========================== */

    if(filters?.body_type && v.body_type === filters.body_type){
      score += 60;
    }

    if(filters?.fuel_type && v.fuel_type === filters.fuel_type){
      score += 40;
    }

    if(filters?.transmission && v.transmission === filters.transmission){
      score += 40;
    }

/* ==========================
⭐ FEATURED / SPECIAL
========================== */

if(v.is_featured){
  score += 140;
}

if(v.is_special){
  score += 90;
}

/* =========================================
SPONSORED PRIORITY
========================================= */

if(v.is_sponsored){

  score += 500;

  confidence =
  confidence === "exact"
  ? "exact"
  : "high";

}

/* =========================================
HOMEPAGE BOOST
========================================= */

if(v.homepage_boost){
  score += 220;
}

/* =========================================
SEARCH BOOST
========================================= */

if(v.search_boost){
  score += Number(v.search_boost || 0);
}

/* =========================================
SPONSOR TIERS
========================================= */

if(v.sponsor_tier === "gold"){
  score += 260;
}

if(v.sponsor_tier === "platinum"){
  score += 420;
}

/* =========================================
ENTERPRISE DEALERS
========================================= */

if(v.premium_dealer){
  score += 260;
}

/* =========================================
DEALER PRIORITY
========================================= */

if(v.dealer_priority){
  score += Number(v.dealer_priority || 0);
}

/* =========================================
PREMIUM RECENCY
========================================= */

if(
  v.is_sponsored ||
  v.premium_dealer
){
  score += 60;
}

   /* ==========================
🆕 FRESHNESS ENGINE
========================== */

if(v.created_at){

  const days =
  (
    Date.now() -
    new Date(v.created_at)
  ) / 86400000;

  let freshness = 0;

  /* ==========================
  🔥 FRESH INVENTORY
  ========================== */

  if(days <= 1){
    freshness = 240;
  }

  else if(days <= 3){
    freshness = 180;
  }

  else if(days <= 7){
    freshness = 120;
  }

  else if(days <= 14){
    freshness = 80;
  }

  else if(days <= 30){
    freshness = 40;
  }

  else{
    freshness = 10;
  }

  /* ==========================
  🔥 STALE INVENTORY PENALTY
  ========================== */

  if(days > 90){
    freshness -= 60;
  }

  if(days > 180){
    freshness -= 120;
  }

  /* ==========================
  🔥 PREMIUM MULTIPLIERS
  ========================== */

  if(
    v.is_sponsored ||
    v.homepage_boost
  ){
    freshness *= 1.6;
  }

  if(v.premium_dealer){
    freshness *= 1.35;
  }

  score += freshness;

}

/* ==========================
❤️ USER PERSONALIZATION
========================== */

if(user){

  /* SAVED */
  if(user.saved.includes(v.id)){
    score += 160;
  }

  /* VIEWED */
  if(user.viewed.includes(v.id)){
    score += 70;
  }

  /* ==========================
  🔥 MAKE AFFINITY
  ========================== */

  const viewedMakes =
    user.viewedMakes || [];

  const savedMakes =
    user.savedMakes || [];

  if(viewedMakes.includes(v.make)){
    score += 90;
  }

  if(savedMakes.includes(v.make)){
    score += 140;
  }

}
/* ==========================
🔥 TRENDING / POPULARITY
========================== */

if(popularity && popularity[v.id]){

  const trendScore =
    Number(popularity[v.id] || 0);

  /* =========================================
  TREND SCORE
  ========================================= */

  score += trendScore;

  /* =========================================
  HOT VEHICLE BOOST
  ========================================= */

  if(trendScore >= 120){
    score += 180;
  }

  else if(trendScore >= 70){
    score += 90;
  }

  else if(trendScore >= 35){
    score += 40;
  }

  /* =========================================
  OVEREXPOSURE PREVENTION
  ========================================= */

  if(trendScore >= 400){
    score -= 120;
  }

  if(trendScore >= 700){
    score -= 240;
  }

  /* =========================================
  DISCOVERY DIVERSITY
  ========================================= */

  if(
    !v.is_sponsored &&
    !v.homepage_boost &&
    trendScore < 50
  ){
    score += 55;
  }

  /* =========================================
  FRESH INVENTORY ROTATION
  ========================================= */

  const ageDays =
  v.created_at
  ? (
    Date.now() -
    new Date(v.created_at)
  ) / 86400000
  : 999;

  if(
    ageDays <= 7 &&
    trendScore < 120
  ){
    score += 80;
  }

}

/* =========================================
🔥 INTENT PREFERENCE SCORING (ADDITIVE)
Soft ranking signals produced by the natural-language
intent layer (filters.intentPrefs — see js/searchIntent.js
and mapToBrowseFilters). These NEVER change WHICH vehicles
match — only their ordering — and have zero effect when no
intent preferences are present.
========================================= */

const _prefs = filters?.intentPrefs;

if(_prefs){

  const _price = Number(v.price) || 0;
  const _bodyL = String(v.body_type || "").toLowerCase();
  const _fuelL = String(v.fuel_type || "").toLowerCase();
  const _seatsN = Number(v.seats) || 0;
  const _doorsN = Number(v.doors) || 0;
  const _engN = Number(v.engine_capacity_cc) || 0;
  const _perfText = `${v.variant || ""} ${v.title || ""}`.toLowerCase();

  /* 💰 BUDGET — cheaper matching vehicles rank higher */
  if(_prefs.budget){
    score +=
      _price <= 60000 ? 140 :
      _price <= 100000 ? 115 :
      _price <= 150000 ? 90 :
      _price <= 200000 ? 65 :
      _price <= 300000 ? 40 :
      _price <= 500000 ? 20 : 8;
  }

  /* ✨ LUXURY — higher-end matching vehicles rank higher */
  if(_prefs.luxury){
    score +=
      _price >= 800000 ? 120 :
      _price >= 500000 ? 95 :
      _price >= 300000 ? 70 :
      _price >= 200000 ? 45 :
      _price >= 120000 ? 25 : 10;
  }

  /* 👨‍👩‍👧 FAMILY — practical, spacious body types + seats */
  if(_prefs.family){
    score += _seatsN >= 7 ? 70 : _seatsN >= 5 ? 55 : _seatsN > 0 ? 15 : 0;
    if(/(suv|mpv|wagon|van|sedan)/.test(_bodyL)) score += 45;
    if(_doorsN === 0 || _doorsN >= 4) score += 10;
  }

  if(_prefs.practical){
    if(/(hatchback|sedan|suv|wagon|mpv)/.test(_bodyL)) score += 30;
    if(_seatsN >= 5) score += 25;
  }

  if(_prefs.spacious){
    if(/(suv|mpv|van|wagon|bakkie)/.test(_bodyL)) score += 40;
    score += _seatsN >= 7 ? 60 : _seatsN >= 5 ? 20 : 0;
  }

  if(_prefs.compact){
    if(/(hatchback|coupe)/.test(_bodyL)) score += 45;
    if(_engN > 0 && _engN <= 1600) score += 15;
  }

  /* 🎓 FIRST CAR — affordable + easy-to-run vehicles first */
  if(_prefs.firstCar){
    score +=
      _price <= 120000 ? 90 :
      _price <= 180000 ? 60 :
      _price <= 250000 ? 35 : 10;
    if(/(hatchback|sedan)/.test(_bodyL)) score += 40;
    if(_engN > 0 && _engN <= 1600) score += 25;
  }

  /* 🏁 PERFORMANCE */
  if(_prefs.performancePref){
    score += _engN >= 3000 ? 60 : _engN >= 2000 ? 40 : _engN >= 1600 ? 20 : 0;
    if(/\b(gt|rs|amg|sti|type r|si)\b/.test(_perfText)) score += 30;
  }

  /* ⛽ EFFICIENCY */
  if(_prefs.efficiency){
    if(/(hybrid|electric|plug)/.test(_fuelL)) score += 70;
    else if(/diesel/.test(_fuelL)) score += 25;
    if(_engN > 0 && _engN <= 1500) score += 30;
  }

  if(_prefs.reliability) score += 25;
  if(_prefs.safety) score += 20;

  /* minimum-seats intent ("7 seater") */
  if(_prefs.minSeats){
    if(_seatsN >= _prefs.minSeats){
      score += 50 + Math.min(30, (_seatsN - _prefs.minSeats) * 10);
    } else if(_seatsN > 0){
      score -= 45;
    }
  }

  /* approximate-price alignment ("around R150k") */
  if(_prefs.priceTarget){
    score += Math.max(0, 60 - Math.abs(_prefs.priceTarget - _price) / 10000);
  }

  /* =========================================
     PHASE 2 ADDITIVE PREFERENCE SCORING
     Soft ordering only — never changes WHICH vehicles match.
     ========================================= */

  const _mileageN = Number(v.mileage) || 0;
  const _driveL = String(v.drive_type || "").toLowerCase();

  /* LOW MILEAGE — lower odometer ranks higher */
  if(_prefs.lowMileage){
    score +=
      _mileageN <= 40000 ? 90 :
      _mileageN <= 80000 ? 70 :
      _mileageN <= 120000 ? 45 :
      _mileageN <= 160000 ? 20 : 0;
  }

  /* ENGINE SIZE ALIGNMENT ("2 litre", "1600cc") */
  if(_prefs.engineCcTarget && _engN > 0){
    score += Math.max(0, 50 - Math.abs(_prefs.engineCcTarget - _engN) / 100);
  }

  /* TOWING — capable body types / drivetrains rank higher */
  if(_prefs.towing){
    if(/(bakkie|truck|suv)/.test(_bodyL)) score += 35;
    if(/(4x4|4wd|awd)/.test(_driveL)) score += 25;
  }

  /* COMMERCIAL / WORKHORSE */
  if(_prefs.commercial){
    if(/(bakkie|truck|van|panel van)/.test(_bodyL)) score += 40;
  }

  /* COMMUTER — small, easy-to-run vehicles */
  if(_prefs.commuter){
    if(/(hatchback|sedan)/.test(_bodyL)) score += 25;
    if(_engN > 0 && _engN <= 1600) score += 15;
  }

  /* ROAD TRIP / LONG DISTANCE */
  if(_prefs.roadTrip){
    if(/(suv|sedan|wagon)/.test(_bodyL)) score += 25;
  }

  /* OFF-ROAD / ADVENTURE */
  if(_prefs.offRoad){
    if(/(suv|bakkie)/.test(_bodyL)) score += 30;
    if(/(4x4|4wd|awd)/.test(_driveL)) score += 30;
  }

}

    return {
      ...v,
      _score: score,
      _confidence: confidence
    };

  }).sort((a,b)=> b._score - a._score);
}
/* ========================== */
/* 🔥 RELATED VEHICLES */
/* ========================== */

export async function getRelatedVehicles(vehicleId){

  const { data:views } =
  await supabase
    .from("vehicle_views")
    .select("user_id")
    .eq("vehicle_id", vehicleId);

  const users = (views || []).map(v=>v.user_id).filter(Boolean);

  if(!users.length) return [];

  const { data:otherViews } =
  await supabase
    .from("vehicle_views")
    .select("vehicle_id")
    .in("user_id", users);

  const counts = {};

  (otherViews || []).forEach(v=>{
    if(v.vehicle_id !== vehicleId){
      counts[v.vehicle_id] =
      (counts[v.vehicle_id] || 0) + 1;
    }
  });

  const sorted = Object.entries(counts)
    .sort((a,b)=> b[1]-a[1])
    .slice(0,6)
    .map(x=>x[0]);

  if(!sorted.length) return [];

  const { data } =
  await supabase
    .from("vehicles")
    .select("*")
    .in("id", sorted);

  return data || [];
}
