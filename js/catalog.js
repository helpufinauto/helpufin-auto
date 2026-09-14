/*
=========================================================
HUFA SHARED CATALOGUE SERVICE
=========================================================
*/

import { supabase } from "./api.js";

/* =========================================================
SESSION CACHE
========================================================= */

let catalogLoaded = false;

/* In-flight loader — prevents duplicate catalogue downloads
   when several components call loadCatalog() simultaneously. */

let catalogLoadPromise = null;

const cache = {

makes: [],

models: [],

variants: [],

categories: {}

};

/* =========================================================
CLEAR CACHE
========================================================= */

export function refreshCatalog(){

catalogLoaded = false;

catalogLoadPromise = null;

cache.makes = [];
cache.models = [];
cache.variants = [];
cache.categories = {};

}

/* =========================================================
LOAD CATALOGUE
========================================================= */

export async function loadCatalog(){

if(catalogLoaded){

return cache;

}

/* 🔥 PERFORMANCE FIX — SINGLE FETCH
   Previously loadMakes(), loadModels() and loadVariants()
   EACH downloaded the entire variants table (3 identical
   full-table requests). One request now populates all three
   caches, and concurrent callers share a single in-flight
   promise instead of issuing duplicate downloads. */

if(!catalogLoadPromise){

catalogLoadPromise =
loadAllVariants()
.then(rows=>{

cache.variants = rows;

cache.models = rows;

cache.makes =

[

...new Set(

rows

.map(item=>item.make?.trim())

.filter(value=>value)

)

]

.sort((a,b)=>a.localeCompare(b));

catalogLoaded = true;

return cache;

})

.catch(error=>{

console.error(

"Catalogue load failed:",

error

);

/* Allow a retry on the next call after a failure */

catalogLoadPromise = null;

return cache;

});

}

await catalogLoadPromise;

return cache;

}

/* =========================================================
LOAD ALL VARIANTS (PAGED)
========================================================= */

async function loadAllVariants(){

const pageSize = 500;

let from = 0;

let rows = [];

while(true){

const {

data,

error

} = await supabase

.from("variants")

.select(`

make,
model,
variant,
vehicle_category

`)

.range(

from,

from + pageSize - 1

);

if(error){

throw error;

}

rows.push(

...(data || [])

);

if(!data || data.length < pageSize){

break;

}

from += pageSize;

}

return rows;

}

/* =========================================================
LOAD GENERIC CATEGORY
========================================================= */

async function loadCategory(category){

if(cache.categories[category]){
return;
}

const {

data,

error

} = await supabase

.from("vehicle_catalog")

.select("value,parent")

.eq("category", category)

.eq("active", true)

.order("display_order",{
ascending:true
});

if(error){

console.error(
    "CATEGORY ERROR:",
    category,
    error
);

cache.categories[category] = [];

return;

}

if(category === "city"){

cache.categories[category] =
(data || []).map(item=>({

value:item.value,

parent:item.parent

}));

}else if(category === "feature"){

cache.categories[category] =
(data || [])
.filter(item=>item.value)
.map(item=>({

value:item.value,

parent:item.parent,

display_order:item.display_order ?? 999

}))
.sort((a,b)=>{

if(a.parent !== b.parent){

return a.parent.localeCompare(b.parent);

}

return a.display_order - b.display_order;

});

}else{

cache.categories[category] =
(data || [])
.map(item=>item.value)
.filter(Boolean);

}

}

/* =========================================================
PUBLIC GETTERS
========================================================= */

export async function getMakes(vehicleCategory = null){

if(!catalogLoaded){

await loadCatalog();

}

if(!vehicleCategory){

return cache.makes;

}

return [

...new Set(

cache.models

.filter(item=>

item.vehicle_category === vehicleCategory &&

item.make?.trim()

)

.map(item=>item.make.trim())

)

]

.sort((a,b)=>a.localeCompare(b));

}

export async function getModels(

make,

vehicleCategory = null

){

if(!catalogLoaded){

await loadCatalog();

}

if(!make){

return [];

}

return cache.models

.filter(item=>{

if(item.make !== make){

return false;

}

if(vehicleCategory){

if(item.vehicle_category !== vehicleCategory){

return false;

}

}

return (

item.model &&

item.model.trim() !== ""

);

})

.map(

item=>item.model.trim()

)

.filter(

(value,index,array)=>

value &&

array.indexOf(value)===index

)

.sort(

(a,b)=>a.localeCompare(b)

);

}

export async function getVariants(

make,

model,

vehicleCategory = null

){

if(!catalogLoaded){

await loadCatalog();

}

if(

!make ||

!model

){

return [];

}

return cache.variants

.filter(item=>{

if(item.make !== make){

return false;

}

if(item.model !== model){

return false;

}

if(

vehicleCategory &&

item.vehicle_category !== vehicleCategory

){

return false;

}

return (

item.variant &&

item.variant.trim() !== ""

);

})

.map(

item=>item.variant.trim()

)

.filter(

(value,index,array)=>

value &&

array.indexOf(value)===index

)

.sort(

(a,b)=>a.localeCompare(b)

);

}

export async function getCategory(category){

await loadCategory(category);

return cache.categories[category] || [];

}

/* =========================================================
CATEGORY HELPERS
========================================================= */

export async function getBodyTypes(){

return getCategory("body_type");

}

export async function getFuelTypes(){

return getCategory("fuel_type");

}

export async function getTransmissionTypes(){

return getCategory("transmission");

}

export async function getDriveTypes(){

return getCategory("drive_type");

}

export async function getColours(){

return getCategory("colour");

}

export async function getConditions(){

return getCategory("condition");

}

export async function getSellerTypes(){

return getCategory("seller_type");

}

export async function getCommercialCategories(){

return getCategory("commercial_category");

}

export async function getFeatures(){

return getCategory("feature");

}

export async function getProvinces(){

return getCategory("province");

}

export async function getCities(province){

await loadCategory("city");

const cities =
cache.categories["city"] || [];

if(!province){

return cities.map(city=>city.value);

}

return cities
.filter(city=>city.parent === province)
.map(city=>city.value);

}

/* =========================================================
EV CATEGORY HELPERS
========================================================= */

export async function getBatteryCapacities(){

return getCategory("battery_capacity");

}

export async function getBatteryRanges(){

return getCategory("battery_range");

}

export async function getChargingTimes(){

return getCategory("charging_time");

}

export async function getEngineCapacities(){

return getCategory("engine_capacity_cc");

}

export async function getBatteryChemistries(){

return getCategory("battery_chemistry");

}

export async function getAcChargingOptions(){

return getCategory("ac_charging");

}

export async function getDcFastChargingOptions(){

return getCategory("dc_fast_charging");

}

export async function getEvRanges(){

return getCategory("ev_range");

}

export async function getChargePorts(){

return getCategory("charge_port");

}

export async function getChargePortLocations(){

return getCategory("charge_port_location");

}

export async function getHeatPumpOptions(){

return getCategory("heat_pump");

}

export async function getBatteryPreconditioningOptions(){

return getCategory("battery_preconditioning");

}

export async function getVehicleToLoadOptions(){

return getCategory("vehicle_to_load");

}

export async function getVehicleToHomeOptions(){

return getCategory("vehicle_to_home");

}

export async function getOnePedalDrivingOptions(){

return getCategory("one_pedal_driving");

}

export async function getRegenerativeBrakingOptions(){

return getCategory("regenerative_braking");

}

/* =========================================================
INITIALIZATION
========================================================= */

export async function initializeCatalog(){

if(catalogLoaded){

return true;

}

await loadCatalog();

return catalogLoaded;

}

/* =========================================================
CACHE STATUS
========================================================= */

export function isCatalogLoaded(){

return catalogLoaded;

}

/* =========================================================
CACHE INSPECTION
========================================================= */

export function getCatalogCache(){

console.log("HUFA CATALOG CACHE", cache);

return cache;

}