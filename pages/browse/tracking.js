import { supabase } from "../../js/api.js";
import { isAllowed } from "../../js/consent.js";

/* =========================================
LOCAL TRACKING QUEUE
========================================= */

const trackingQueue = [];

let trackingTimer = null;

/* =========================================
QUEUE EVENT
========================================= */

export function queueTrackingEvent(event){

/* PHASE 2 — CONSENT GATE. This module feeds the optional
   first-party analytics pipeline (analytics_events). It
   only records events when the user granted the
   "Analytics & performance" category. */
if(!isAllowed("analytics")){
  return;
}

trackingQueue.push({
...event,
created_at:new Date().toISOString()
});

startTrackingFlush();

}

/* =========================================
START FLUSH TIMER
========================================= */

function startTrackingFlush(){

if(trackingTimer){
return;
}

trackingTimer = setTimeout(
flushTrackingQueue,
3000
);

}

/* =========================================
FLUSH EVENTS
========================================= */

async function flushTrackingQueue(){

try{

if(!trackingQueue.length){

trackingTimer = null;
return;

}

const payload =
[...trackingQueue];

trackingQueue.length = 0;

/* =====================================
INSERT ANALYTICS
===================================== */

const { error } =
await supabase
.from("analytics_events")
.insert(payload);

if(error){

console.error(
"Analytics flush failed:",
error
);

}

}catch(err){

console.error(
"Tracking system failed:",
err
);

}finally{

trackingTimer = null;

}

}

/* =========================================
TRACK VEHICLE IMPRESSION
========================================= */

export function trackVehicleImpression(
vehicleId
){

queueTrackingEvent({

type:"vehicle_impression",
vehicle_id:vehicleId

});

}

/* =========================================
TRACK VEHICLE CLICK
========================================= */

export function trackVehicleClick(
vehicleId
){

queueTrackingEvent({

type:"vehicle_click",
vehicle_id:vehicleId

});

}

/* =========================================
TRACK SAVE
========================================= */

export function trackVehicleSave(
vehicleId
){

queueTrackingEvent({

type:"vehicle_save",
vehicle_id:vehicleId

});

}