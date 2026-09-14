import { supabase } from "./api.js";

/* ========================== */
/* GET USER ELIGIBILITY */
/* ========================== */

export async function getEligibility(){

const { data:userData } =
await supabase.auth.getUser();

if(!userData.user) return null;

const { data } =
await supabase
.from("credit_scores")
.select("*")
.eq("user_id", userData.user.id)
.single();

if(!data) return null;

return data.score;

}


/* ========================== */
/* CHECK ELIGIBILITY */
/* ========================== */

export function checkEligibility(score, price){

if(!score) return null;

/* RULES */

if(score >= 700 && price <= 1000000) return true;

if(score >= 640 && price <= 500000) return true;

if(score >= 580 && price <= 250000) return true;

return false;

}
