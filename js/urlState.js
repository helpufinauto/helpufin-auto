/* =========================================
URL STATE HANDLER
========================================= */

export function getParams(){

  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(params.entries());

}

export function setParams(filters){

  const params = new URLSearchParams();

  Object.keys(filters).forEach(key=>{

    const val = filters[key];

    if(val === null || val === "" || val === false) return;

    params.set(key, val);

  });

  return "?" + params.toString();

}
