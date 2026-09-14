import { browseState } from "./state.js";

/* =========================================
UPDATE FILTER
========================================= */

export function updateBrowseFilter(
key,
value
){

browseState.filters[key] =
value;

}

/* =========================================
CLEAR FILTERS
========================================= */

export function clearBrowseFilters(){

browseState.filters = {};

}