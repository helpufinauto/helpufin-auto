/* =========================================
VIRTUALIZED GRID RENDERING
========================================= */

export async function renderVehicleBatch({

vehicles = [],
renderCard,
target,
batchSize = 12

}){

if(!target){
return;
}

target.innerHTML = "";

let index = 0;

/* =====================================
RENDER NEXT BATCH
===================================== */

function renderNext(){

const slice =
vehicles.slice(
index,
index + batchSize
);

if(!slice.length){
return;
}

const html =
slice
.map(renderCard)
.join("");

target.insertAdjacentHTML(
"beforeend",
html
);

index += batchSize;

}

/* =====================================
INITIAL
===================================== */

renderNext();

/* =====================================
INTERSECTION OBSERVER
===================================== */

const sentinel =
document.createElement("div");

sentinel.className =
"h-[1px] w-full";

target.appendChild(sentinel);

const observer =
new IntersectionObserver(entries=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

renderNext();

if(index >= vehicles.length){

observer.disconnect();

}

}

});

},{
rootMargin:"400px"
});

observer.observe(sentinel);

}