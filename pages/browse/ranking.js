/* =========================================
RANK VEHICLES
========================================= */

export function rankVehicles({

vehicles = [],
query = "",
filters = {},
popularity = {}

}){

return [...vehicles]
.sort((a,b)=>{

let scoreA = 0;
let scoreB = 0;

/* =====================================
POPULARITY
===================================== */

scoreA +=
(popularity[a.id] || 0);

scoreB +=
(popularity[b.id] || 0);

/* =====================================
FRESHNESS
===================================== */

scoreA += freshnessBoost(a);
scoreB += freshnessBoost(b);

/* =====================================
PRICE QUALITY
===================================== */

scoreA += priceScore(a);
scoreB += priceScore(b);

return scoreB - scoreA;

});

}

/* =========================================
FRESHNESS BOOST
========================================= */

function freshnessBoost(vehicle){

if(!vehicle.created_at){
return 0;
}

const created =
new Date(vehicle.created_at)
.getTime();

const now = Date.now();

const ageDays =
(now - created) /
1000 / 60 / 60 / 24;

return Math.max(
0,
30 - ageDays
);

}

/* =========================================
PRICE SCORE
========================================= */

function priceScore(vehicle){

const price =
Number(vehicle.price || 0);

if(price <= 0){
return 0;
}

if(price < 200000){
return 12;
}

if(price < 400000){
return 8;
}

return 4;

}