import { renderVehicleCard } from "./cards.js";

/* =========================================
RENDER GRID
========================================= */

export function renderVehicleGrid({

vehicles,
targetId = "vehicleGrid"

}){

const grid =
document.getElementById(
targetId
);

if(!grid){
return;
}

if(!vehicles?.length){

grid.innerHTML = `

<div class="
col-span-full
text-center
py-20
text-gray-400
">

No vehicles found

</div>

`;

return;

}

/* =====================================
RENDER
===================================== */

grid.innerHTML =
vehicles
.map(renderVehicleCard)
.join("");

}