/* =========================================================
HUFA BASE-PATH HELPER — SINGLE SOURCE OF TRUTH (Phase 4)
=============================================================
This app is served from two different roots depending on where
it is hosted:

  • Local development   → http://localhost:5500/
                           base path "/"
  • GitHub Pages        → https://helpufinauto.github.io/helpufin-auto/
                           base path "/helpufin-auto/"

The base path is DERIVED from this module's own URL
(import.meta.url) — this file lives at {BASE}/js/basePath.js,
so the directory one level up IS the deployment root. There is
therefore no hardcoded prefix anywhere and no duplicated
detection logic in other files: every consumer imports these
exports and gets the correct value for whatever host serves it.

Exports (dependency-free, plain ES module):

  getBasePath() → "/"  or  "/helpufin-auto/"   (path component)
  getBaseUrl()  → "http://localhost:5500/"  or
                  "https://helpufinauto.github.io/helpufin-auto/"
  route(path)   → logical app path → deployment path.
                  "/browse" → "/helpufin-auto/browse" (local: unchanged)
                  Idempotent — an already-prefixed path passes through.
  stripBase(p)  → deployment path → logical app path.
                  "/helpufin-auto/browse" → "/browse" (local: unchanged)
  asset(path)   → same-origin asset path → absolute deployment URL.
                  "/assets/logo.png" → "…/helpufin-auto/assets/logo.png"
                  External/absolute URLs pass through untouched.
  appUrl(path)  → logical app route → absolute deployment URL
                  (used for Supabase recovery redirects).
                  "/reset-password" → "…/helpufin-auto/reset-password"
=============================================================*/

const BASE_URL =
new URL(
  "../",                /* js/  →  the directory that holds the app */
  import.meta.url
);

const BASE_PATH =
BASE_URL.pathname
  .replace(/\/+$/, "") + "/";

const BASE_ROOT =
BASE_PATH.replace(/\/+$/, "");

function isExternal(path){

  return (
    typeof path !== "string" ||
    /^(https?:)?\/\//i.test(path) ||
    /^(data|blob|mailto|tel):/i.test(path)
  );

}

export function getBasePath(){

  return BASE_PATH;

}

export function getBaseUrl(){

  return BASE_URL.href;

}

export function route(path){

  if(!path) return path;

  if(BASE_PATH === "/") return path;

  /* Idempotent: an already-prefixed path is returned as-is. */
  if(
    path === BASE_ROOT ||
    path.startsWith(BASE_PATH)
  ){
    return path;
  }

  if(path.charAt(0) === "/"){
    return BASE_ROOT + path;
  }

  return BASE_PATH + path;

}

export function stripBase(pathname){

  if(BASE_PATH === "/" || !pathname) return pathname;

  if(pathname === BASE_ROOT) return "/";

  if(pathname.startsWith(BASE_PATH)){
    return "/" + pathname.slice(BASE_PATH.length);
  }

  return pathname;

}

export function asset(path){

  if(isExternal(path)) return path;

  return new URL(
    String(path).replace(/^\/+/, ""),
    BASE_URL
  ).href;

}

export function appUrl(path){

  if(isExternal(path)) return path;

  return new URL(
    route(path),
    BASE_URL
  ).href;

}