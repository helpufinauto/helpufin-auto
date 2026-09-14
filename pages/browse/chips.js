/* =========================================
FILTER CHIPS
========================================= */

export function renderFilterChips(filters){

const chips = [];

Object.entries(filters || {})
.forEach(([key,value])=>{

if(
value === null ||
value === undefined ||
value === ""
){
return;
}

chips.push(`

<div class="
filter-chip
flex
items-center
gap-2
">

<span>
${key}: ${value}
</span>

</div>

`);

});

return chips.join("");

}