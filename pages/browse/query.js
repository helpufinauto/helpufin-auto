import { supabase } from "../../js/api.js";

/* =========================================
BASE VEHICLE QUERY
========================================= */

export async function fetchVehicles({

page = 1,
limit = 24,
filters = {}

}){

let query =
supabase
.from("vehicles")
.select("*")
.eq("status","active");

/* =====================================
FILTERS
===================================== */

if(filters.make){

query =
query.eq(
"make",
filters.make
);

}

if(filters.body_type){

query =
query.eq(
"body_type",
filters.body_type
);

}

if(filters.fuel_type){

query =
query.eq(
"fuel_type",
filters.fuel_type
);

}

if(filters.transmission){

query =
query.eq(
"transmission",
filters.transmission
);

}

if(filters.priceMin){

query =
query.gte(
"price",
filters.priceMin
);

}

if(filters.priceMax){

query =
query.lte(
"price",
filters.priceMax
);

}

/* =====================================
PAGINATION
===================================== */

const from =
(page - 1) * limit;

const to =
from + limit - 1;

query =
query.range(from,to);

/* =====================================
ORDERING
===================================== */

query =
query.order(
"created_at",
{
ascending:false
}
);

/* =====================================
EXECUTE
===================================== */

const { data, error } =
await query;

if(error){

console.error(
"Vehicle query failed:",
error
);

return [];

}

return data || [];

}