import { compareButton } from "../../js/ui.js";

/* =========================================
VEHICLE CARD
========================================= */

export function renderVehicleCard(vehicle){

return `

<div
class="vehicle-card"
onclick="navigate('/vehicle?id=${vehicle.id}')"
>

<div class="vehicle-card-image-wrap">

<img
src="${vehicle.images?.[0] || '/placeholder.jpg'}"
width="400"
height="300"
loading="lazy"
decoding="async"
alt="${vehicle.year} ${vehicle.make} ${vehicle.model}"
onerror="this.src='/placeholder.jpg'"
class="vehicle-card-image"
/>

</div>

<div class="vehicle-card-body">

<div class="flex items-start justify-between gap-3">

<div>

<h3 class="vehicle-card-title">
${vehicle.year} ${vehicle.make} ${vehicle.model}
</h3>

<p class="vehicle-card-price">
R ${Number(vehicle.price || 0).toLocaleString()}
</p>

</div>

${compareButton(vehicle.id)}

</div>

</div>

</div>

`;

}