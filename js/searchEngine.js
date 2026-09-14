/* =========================================
AI ENGINE — INTENT + RANKING + BEHAVIOR
========================================= */

import { KEYWORDS, MAKES } from "./searchData.js";
import { supabase } from "./api.js";

/* ========================== */
/* 🔍 INTENT PARSER */
/* ========================== */

export function parseIntent(q){

  if(!q) return {};

  q = q.toLowerCase();

  const result = {};

  /* ================= MAKE ================= */

  MAKES.forEach(m=>{
    if(q.includes(m.toLowerCase())){
      result.make = m;
    }
  });

  /* ================= PRICE ================= */

  const priceMatch = q.match(/(\d+)(k)?/);

  if(priceMatch){
    let value = parseInt(priceMatch[1]);
    if(priceMatch[2]) value *= 1000;
    result.maxPrice = value;
  }

  /* ================= BODY ================= */

  KEYWORDS.body.forEach(b=>{
    if(q.includes(b)){
      result.body = b.toUpperCase();
    }
  });

  /* ================= TRANS ================= */

  KEYWORDS.trans.forEach(t=>{
    if(q.includes(t)){
      result.trans = t === "auto" ? "Automatic" : capitalize(t);
    }
  });

  /* ================= 💰 FINANCE INTENT ================= */

  if(
    q.includes("cheap") ||
    q.includes("affordable") ||
    q.includes("budget") ||
    q.includes("low monthly") ||
    q.includes("under per month")
  ){
    result.affordableOnly = true;
    result.term = 72;
    result.interest = 10;
  }

  /* 💰 monthly detection */
  const monthlyMatch = q.match(/(\d+)(k)?\s*(per month|monthly)/);

  if(monthlyMatch){
    let value = parseInt(monthlyMatch[1]);
    if(monthlyMatch[2]) value *= 1000;

    result.monthlyTarget = value;
    result.affordableOnly = true;
    result.term = 72;
    result.interest = 10;
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

  const [views, saved, credit] = await Promise.all([

    supabase.from("vehicle_views")
    .select("vehicle_id")
    .eq("user_id", userId),

    supabase.from("saved_vehicles")
    .select("vehicle_id")
    .eq("user_id", userId),

    supabase.from("credit_scores")
    .select("*")
    .eq("user_id", userId)
    .single()

  ]);

  return {
    viewed: (views.data || []).map(x=>x.vehicle_id),
    saved: (saved.data || []).map(x=>x.vehicle_id),
    credit: credit.data || null
  };
}

/* ========================== */
/* 🔥 POPULARITY */
/* ========================== */

export async function getPopularityMap(){

  const [views, saves] = await Promise.all([

    supabase.from("vehicle_views")
    .select("vehicle_id"),

    supabase.from("saved_vehicles")
    .select("vehicle_id")

  ]);

  function count(list){
    const map = {};
    (list.data || []).forEach(x=>{
      map[x.vehicle_id] = (map[x.vehicle_id] || 0) + 1;
    });
    return map;
  }

  const viewMap = count(views);
  const saveMap = count(saves);

  const scoreMap = {};

  Object.keys({...viewMap, ...saveMap}).forEach(id=>{
    scoreMap[id] =
      (viewMap[id] || 0) * 1 +
      (saveMap[id] || 0) * 3;
  });

  return scoreMap;
}

/* ========================== */
/* 🔥 RANKING ENGINE */
/* ========================== */

export function rankVehicles(list, context){

  const {
    query,
    filters,
    user,
    popularity
  } = context;

  return list.map(v=>{

    let score = 0;

    /* =========================================
    AI QUERY MATCHING
    ========================================= */

    if(query){

      const q = query.toLowerCase();

      if(v.make?.toLowerCase().includes(q)){
        score += 30;
      }

      if(v.model?.toLowerCase().includes(q)){
        score += 30;
      }

      if(v.title?.toLowerCase().includes(q)){
        score += 40;
      }

    }

    /* =========================================
    PRICE RELEVANCE
    ========================================= */

    if(filters?.priceMax){

      const diff =
      Math.abs(
        filters.priceMax - (v.price || 0)
      );

      score += Math.max(
        0,
        30 - diff / 10000
      );

    }

    /* =========================================
    FEATURE BOOSTS
    ========================================= */

    if(v.is_featured){
      score += 60;
    }

    if(v.is_special){
      score += 25;
    }

    /* =========================================
    SPONSORED BOOSTS
    ========================================= */

    if(v.is_sponsored){
      score += 120;
    }

    if(v.homepage_boost){
      score += 80;
    }

    if(v.search_boost){
      score += Number(v.search_boost || 0);
    }

    /* =========================================
    DEALER BOOSTS
    ========================================= */

    if(v.premium_dealer){
      score += 80;
    }

    if(v.dealer_priority){
      score += Number(v.dealer_priority || 0);
    }

    if(
      v.seller_type &&
      v.seller_type.toLowerCase().includes("dealer")
    ){
      score += 30;
    }

    /* =========================================
    RECENCY
    ========================================= */

    if(v.created_at){

      const days =
      (
        Date.now() -
        new Date(v.created_at)
      ) / 86400000;

      score += Math.max(
        0,
        25 - days
      );

    }

    /* =========================================
    USER PERSONALIZATION
    ========================================= */

    if(user){

      if(user.saved?.includes(v.id)){
        score += 50;
      }

      if(user.viewed?.includes(v.id)){
        score += 20;
      }

    }

    /* =========================================
    MARKETPLACE POPULARITY
    ========================================= */

    if(
      popularity &&
      popularity[v.id]
    ){
      score += popularity[v.id];
    }

    return {
      ...v,
      _score: score
    };

  })
  .sort((a,b)=>
    b._score - a._score
  );
}
