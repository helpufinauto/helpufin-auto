/* =========================================
LAZY PAGE LOADERS
========================================= */

/* =========================================
MODULE PREFETCH CACHE
========================================= */

const moduleCache = {};

async function prefetchPage(routeKey){

if(moduleCache[routeKey]) return;

try{

const loader =
lazyPages[routeKey];

if(!loader) return;

moduleCache[routeKey] =
loader();

}catch(err){

console.warn(
"Prefetch failed:",
routeKey,
err
);

}

}

const lazyPages = {

home: async ()=>{

const mod =
await import("../pages/home.js");

return mod.HomePage;

},

browse: async ()=>{

const mod =
await import("../pages/browse/index.js");

return mod.BrowsePage;

},

compare: async ()=>{

const mod =
await import("../pages/compare.js");

return mod.ComparePage;

},

saved: async ()=>{

const mod =
await import("../pages/saved.js");

return mod.SavedPage;

},

contact: async ()=>{
const mod =
await import("../pages/contact.js");
return mod.ContactPage;
},

/* PHASE 1 — public dealership directory.
Registered under /dealerships below as a
PUBLIC route (never added to
protectedRoutes). */

dealerships: async ()=>{
const mod =
await import("../pages/dealerships.js");
return mod.DealershipsPage;
},

/* PHASE 2 — public dealership storefront.
Same lazy-import pattern as every other
page; public route (see ROUTES). */
dealership: async ()=>{
const mod =
await import("../pages/dealership.js");
return mod.DealershipPage;
},

login: async ()=>{

const mod =
await import("../pages/login.js");

return mod.LoginPage;

},

signup: async ()=>{

const mod =
await import("../pages/signup.js");

return mod.SignupPage;

},

/* PHASE 11 — password recovery */

forgotPassword: async ()=>{

const mod =
await import("../pages/forgotPassword.js");

return mod.ForgotPasswordPage;

},

resetPassword: async ()=>{

const mod =
await import("../pages/resetPassword.js");

return mod.ResetPasswordPage;

},

/* PHASE 3 — standalone dealership page editor.
   Renders through the shared dashboard shell so it
   looks like every other dashboard page. */
dashboardDealership: async ()=>{
const mod =
await import("../pages/dashboardDealership.js");
return mod.DashboardDealershipPage;
},

dashboard: async ()=>{

const mod =
await import("../pages/dashboard.js");

return mod.DashboardPage;

},

messages: async ()=>{

const mod =
await import("../pages/messages.js");

return mod.MessagesPage;

},

admin: async ()=>{

const mod =
await import("../pages/admin.js");

return mod.AdminPage;

},

myVehicles: async ()=>{

const mod =
await import("../pages/myVehicles.js");

return mod.MyVehiclesPage;

},

uploadVehicle: async ()=>{

const mod =
await import("../pages/uploadVehicle.js");

return mod.UploadVehiclePage;

},

editVehicle: async ()=>{

const mod =
await import("../pages/uploadVehicle.js");

return mod.EditVehiclePage;

},

manageVehicle: async ()=>{

const mod =
await import("../pages/manageVehicle.js");

return mod.ManageVehiclePage;

},

apply: async ()=>{

const mod =
await import("../pages/apply.js");

return mod.ApplyPage;

},

vehicle: async ()=>{

const mod =
await import("../pages/vehicle.js");

return mod.VehiclePage;

},

credit: async ()=>{

const mod =
await import("../pages/credit.js");

return mod.CreditPage;

},

seller: async ()=>{

const mod =
await import("../pages/seller.js");

return mod.SellerPage;

},

sell: async ()=>{

const mod =
await import("../pages/sell.js");

return mod.SellPage;

},

sellPrivate: async ()=>{

const mod =
await import("../pages/sell-private.js");

return mod.SellPrivatePage;

},

sellDealer: async ()=>{

const mod =
await import("../pages/sell-dealer.js");

return mod.SellDealerPage;

},

helpufin: async ()=>{

const mod =
await import("../pages/helpufin.js");

return mod;

},

/* PHASE 3 — MFA second-factor verification page.
   Lives beside the other auth pages; the route
   itself is registered as public below because
   the page performs its own session + AAL
   checks. */

mfaVerify: async ()=>{

const mod =
await import("../pages/mfaVerify.js");

return mod.MfaVerifyPage;

}

};
import { savePageState } from "./stateManager.js";
import {
supabase,
getAuthUser,
needsMfaVerification
} from "./api.js";

/* =========================================
SEO HELPERS
========================================= */

function updateMeta(name, content){

let el =
document.querySelector(
`meta[name="${name}"]`
);

if(!el){

el =
document.createElement("meta");

el.setAttribute("name", name);

document.head.appendChild(el);

}

el.setAttribute("content", content);

}

function updateOG(property, content){

let el =
document.querySelector(
`meta[property="${property}"]`
);

if(!el){

el =
document.createElement("meta");

el.setAttribute("property", property);

document.head.appendChild(el);

}

el.setAttribute("content", content);

}

function injectVehicleSchema(vehicle){

const existing =
document.getElementById(
"vehicle-schema"
);

if(existing){
existing.remove();
}

const schema =
document.createElement("script");

schema.type =
"application/ld+json";

schema.id =
"vehicle-schema";

schema.textContent =
JSON.stringify({

"@context":"https://schema.org",

"@type":"Vehicle",

"name":`${vehicle.year || ""} ${vehicle.make || ""} ${vehicle.model || ""}`,

"brand":{
"@type":"Brand",
"name":vehicle.make || ""
},

"model":vehicle.model || "",

"vehicleModelDate":
vehicle.year || "",

"mileageFromOdometer":{
"@type":"QuantitativeValue",
"value":vehicle.mileage || 0,
"unitCode":"KMT"
},

"offers":{
"@type":"Offer",
"priceCurrency":"ZAR",
"price":vehicle.price || 0,
"availability":"https://schema.org/InStock"
},

"image":[
vehicle.image || "/assets/HUF1.webp"
]

});

document.head.appendChild(schema);

}

/* PHASE 2 — now exported so the public
   dealership storefront can refresh the
   title/meta with REAL dealership data after
   its profile query resolves (the same SEO
   pipeline used by the router blocks above).
   Export-only change: no existing behaviour
   is affected. */
export function updateSEO(data={}){

document.title =
data.title ||
"Helpufin Auto";

updateMeta(
"description",
data.description ||
"Premium automotive marketplace."
);

updateOG(
"og:title",
data.title || "Helpufin Auto"
);

updateOG(
"og:description",
data.description ||
"Premium automotive marketplace."
);

updateOG(
"og:image",
data.image || "/assets/HUF1.webp"
);

updateOG(
"og:url",
window.location.href
);

}
/*
=================================================
MAIN ROUTER
=================================================
*/

/* =========================================
AUTH PROTECTED ROUTES
========================================= */

const protectedRoutes = [

  "/dashboard",
  "/dashboard/private",
  "/dashboard/dealer",

  "/messages",

  "/upload-vehicle",
  "/edit-vehicle",

  /* PHASE 2 (SESSION SECURITY) — /manage-vehicle is a
     registered protected page (own internal login guard)
     but was missing from this list, so the router-level
     auth check never ran for it. Same protection level as
     the other dashboard pages. */

  "/manage-vehicle",
  "/my-vehicles",

  "/credit",
  "/apply"

];

/* =========================================
CENTRALIZED ROUTE REGISTRY
=========================================
Single source of truth for every client-side route.

Supports:
  â€¢ Exact paths        â†’ "/browse"
  â€¢ Dynamic segments   â†’ "/vehicle/:id"
  â€¢ Wildcard segments  â†’ "/dashboard/*"

Every route here automatically supports refresh,
deep links, bookmarks, and shared URLs â€” no
additional server configuration needed.
========================================= */

const ROUTES = [

  { path: "/",                 key: "home" },
  { path: "/browse",           key: "browse" },
  { path: "/compare",          key: "compare" },
  { path: "/saved",            key: "saved" },
  { path: "/contact",          key: "contact" },
  { path: "/dealerships",      key: "dealerships" },

  /* PHASE 2 — public dealership storefront.
     One dedicated SPA route for dealership
     profiles only (account_type === "dealer"
     is enforced by the page itself). Public —
     deliberately NOT added to
     protectedRoutes. */
  { path: "/dealership",       key: "dealership" },

  { path: "/login",            key: "login" },
  { path: "/signup",           key: "signup" },

  /* PHASE 11 — password recovery (public routes) */
  { path: "/forgot-password",  key: "forgotPassword" },
  { path: "/reset-password",   key: "resetPassword" },

  /* PHASE 3 — MFA second-factor verification.
     Public route: the page itself redirects
     unauthenticated visitors to /login and fully
     verified (aal2) users into the app. It is the
     destination the centralized guard below uses
     for MFA-enabled users at aal1. */
  { path: "/mfa-verify",       key: "mfaVerify" },

  { path: "/dashboard",        key: "dashboard" },
  { path: "/dashboard/private",key: "dashboard" },
  { path: "/dashboard/dealer", key: "dashboard" },

  /* PHASE 3 — dedicated dealership page editor.
     Registered BEFORE the /dashboard/* wildcard so the
     exact path wins. Auth-protected by the existing
     "/dashboard/..." rule below; the page itself
     enforces account_type === "dealer". */
  { path: "/dashboard/dealership",key: "dashboardDealership" },

  { path: "/dashboard/*",      key: "dashboard" },

  { path: "/messages",         key: "messages" },
  { path: "/admin",            key: "admin" },

  { path: "/upload-vehicle",   key: "uploadVehicle" },
  { path: "/my-vehicles",      key: "myVehicles" },
  { path: "/edit-vehicle",     key: "editVehicle" },
  { path: "/manage-vehicle",   key: "manageVehicle" },

  { path: "/vehicle",          key: "vehicle" },
  { path: "/vehicle/:id",      key: "vehicle" },

  { path: "/credit",           key: "credit" },
  { path: "/apply",            key: "apply" },
  { path: "/seller",           key: "seller" },

  { path: "/sell",             key: "sell" },
  { path: "/sell/private",     key: "sellPrivate" },
  { path: "/sell/dealer",      key: "sellDealer" },

  { path: "/helpufin",         key: "helpufin" }

];

/* =========================================
ROUTE MATCHER
=========================================
Converts a route pattern to a RegExp and
matches against the current pathname.
========================================= */

function compilePattern(pattern){

  // Escape regex special chars, then convert
  // ":param" â†’ single segment, "*" â†’ any segments
  const regexStr =
    pattern
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\\\*/g, ".*")
      .replace(/:([A-Za-z0-9_]+)/g, "[^/]+");

  return new RegExp(`^${regexStr}$`);

}

function matchRoute(pathname){

  for(const route of ROUTES){

    const re =
    compilePattern(route.path);

    if(re.test(pathname)){

      return {
        key: route.key,
        pattern: route.path
      };

    }

  }

  return null;

}

/* =========================================
GET ROUTE
========================================= */

function getRouteKey(pathname){

  const match =
  matchRoute(pathname);

  return match
    ? match.key
    : null;

}

/* =========================================
CLIENT-SIDE 404 PAGE
========================================= */

function renderNotFound(root){

  root.innerHTML = `

<div class="
min-h-[60vh]
flex
items-center
justify-center
text-center
p-10
">

<div>

<h1 class="
text-4xl
font-black
mb-4
text-[#08111F]
">
Page Not Found
</h1>

<p class="text-gray-500 mb-6">
The requested page does not exist.
</p>

<button
onclick="navigate('/')"
class="
bg-[#005BBF]
text-white
px-6
py-3
rounded-2xl
font-semibold
"
>
Return Home
</button>

</div>

</div>

`;

}

/* =========================================
PHASE 2 â€” PREFETCH EXPORT
Expose the existing internal prefetchPage so
the navbar can warm the dashboard module
during idle time (same cache the router
uses). No behaviour change for the router.
========================================= */

export function prefetchDashboard(){
return prefetchPage("dashboard");
}

/* =========================================
PHASE 4 — HUFA SMART BACKGROUND PAGE PREFETCH
=========================================
When the homepage has loaded, become interactive
and the main thread goes idle, quietly PREPARE
(download + parse only) the page modules a
visitor is most likely to open next, in strict
priority order:

  1. /browse       (highest priority)
  2. /sell
  3. /dealerships
  4. /contact

Hard rules enforced below:

  • MODULES ONLY — the loaded page component is
    never invoked, so prefetching can never
    render a page or run a route action: no form
    submissions, no database mutations, no
    authentication actions, no dashboard,
    seller or vehicle actions.
  • NO DATA / IMAGE PREFETCH — no vehicle lists,
    no vehicle images, no Supabase queries.
    (Browse DATA caching is explicitly out of
    scope for Phase 4.)
  • NETWORK AWARE — uses the Network Information
    API (where available) and the
    prefers-reduced-data media query:
      - Data Saver / reduced-data request →
        prefetching fully disabled.
      - 2g / slow-2g → fully disabled.
      - 3g → ONLY the top-priority page
        (/browse) is warmed.
      - 4g / unknown → full priority list.
  • TIMING — scheduled only via requestIdleCallback
    AFTER the homepage render, and additionally
    gated on window load, so first paint and
    homepage interactivity are never blocked and
    the user can interact normally first.
  • SEQUENTIAL, ONE MODULE PER IDLE SLOT — the
    network budget is re-checked before every
    download, so the queue stops mid-flight if
    conditions degrade (Data Saver enabled,
    connection dropped to 2g, ...).
  • NO DUPLICATES — reuses the SAME moduleCache
    the router reads from, so a prefetched module
    is never downloaded twice and real navigation
    instantly reuses the warmed cache.
  • FAIL-SAFE — a failed prefetch clears its
    cache slot, so a later REAL navigation retries
    the import from scratch (identical behaviour
    to a site without prefetching).
======================================== */

const HOMEPAGE_PREFETCH_ROUTES = [
  "browse",       /* 1. /browse — highest priority */
  "sell",         /* 2. /sell */
  "dealerships",  /* 3. /dealerships */
  "contact"       /* 4. /contact */
];

/* Idle scheduler — same fallback pattern as the
   router's runIdle, plus a timeout so a busy main
   thread can postpone but never cancel the work.
   The timeout only lets the callback run in a
   later idle slot; it never runs during render. */
const HUFA_PREFETCH_IDLE_TIMEOUT = 2500;

function hufaPrefetchIdle(cb){

  if("requestIdleCallback" in window){
    window.requestIdleCallback(
      cb,
      { timeout: HUFA_PREFETCH_IDLE_TIMEOUT }
    );
  }else{
    setTimeout(cb, 300);
  }

}

function getHufaConnection(){
  return navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection ||
    null;
}

/* Reduced-data preference, checked directly AND
   through the CSS media query, because the
   Network Information API is Chromium-only. */
function hufaReducedDataPreferred(){
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia(
      "(prefers-reduced-data: reduce)"
    ).matches
  );
}

/* HOW MUCH may be prefetched right now? Called
   before scheduling AND before every individual
   download so a mid-flight change halts the
   queue immediately. */
function hufaPrefetchBudget(){

  const conn =
  getHufaConnection();

  /* Browser/user asks to minimise data usage. */
  if(conn && conn.saveData){
    return { allowed: false, maxPages: 0 };
  }

  if(hufaReducedDataPreferred()){
    return { allowed: false, maxPages: 0 };
  }

  const type =
  (conn && conn.effectiveType) || "";

  /* Known-slow connections: do nothing. */
  if(type === "slow-2g" || type === "2g"){
    return { allowed: false, maxPages: 0 };
  }

  /* 3g: only the single highest-priority page. */
  if(type === "3g"){
    return { allowed: true, maxPages: 1 };
  }

  /* 4g / unknown (no Network Information API):
     full priority list. */
  return {
    allowed: true,
    maxPages: HOMEPAGE_PREFETCH_ROUTES.length
  };

}

/* MODULE-ONLY warm-up. Stores the SAME promise
   format router() consumes, so an in-flight
   prefetch and a real navigation share one
   download. On failure the cache slot is cleared
   so the real navigation retries the import —
   prefetching can never poison the router. The
   resolved page component is NEVER invoked, so
   nothing renders and no route action runs. */
function warmModuleForPrefetch(routeKey){

  if(moduleCache[routeKey]){
    return Promise.resolve();
  }

  const loader =
  lazyPages[routeKey];

  if(!loader){
    return Promise.resolve();
  }

  const pending = loader();

  moduleCache[routeKey] = pending;

  return pending.catch((err)=>{

    if(moduleCache[routeKey] === pending){
      delete moduleCache[routeKey];
    }

    console.warn(
      "Prefetch failed:",
      routeKey,
      (err && err.message) || err
    );

  });

}

/* One module per idle slot, strictly in priority
   order, re-validating the network budget before
   each download. */
function runHomepagePrefetchQueue(queue){

  if(!queue.length) return;

  hufaPrefetchIdle(()=>{

    /* Conditions may have changed since the last
       slot (Data Saver enabled, network degraded
       to 2g, ...) — stop instead of proceeding. */
    if(!hufaPrefetchBudget().allowed) return;

    const routeKey = queue.shift();

    if(!routeKey) return;

    warmModuleForPrefetch(routeKey)
      .then(()=> runHomepagePrefetchQueue(queue));

  });

}

function beginHomepagePrefetch(){

  const budget =
  hufaPrefetchBudget();

  if(!budget.allowed || budget.maxPages < 1){
    return;
  }

  runHomepagePrefetchQueue(
    HOMEPAGE_PREFETCH_ROUTES.slice(
      0,
      budget.maxPages
    )
  );

}

let homepagePrefetchStarted = false;

/* Entry point — called by the router AFTER the
   homepage module has rendered. Timing contract:
   homepage loads → becomes interactive → user can
   interact normally → main thread idle → window
   load complete → only then does background
   preparation begin. Nothing here can block first
   paint or delay interaction; it only schedules
   idle work. The started flag makes the schedule
   idempotent (back/forward to "/" re-enters this
   path without restarting or duplicating work). */
function scheduleHomepagePrefetch(){

  if(homepagePrefetchStarted) return;

  homepagePrefetchStarted = true;

  hufaPrefetchIdle(()=>{

    /* The homepage must finish loading before any
       background preparation begins. */
    if(document.readyState !== "complete"){

      window.addEventListener(
        "load",
        ()=> hufaPrefetchIdle(beginHomepagePrefetch),
        { once: true }
      );

    }else{

      beginHomepagePrefetch();

    }

  });

}

export async function router(){

  let path =
window.location.pathname
.replace(/\/+$/,"") || "/";

  const root =
  document.getElementById("app");

  let page = "";

  /* =========================================
AUTH ROUTE PROTECTION
========================================= */

const requiresAuth =
protectedRoutes.includes(path) ||
path === "/admin" ||
  /* PHASE 2 (SESSION SECURITY) — ROUTES registers a
     "/dashboard/*" wildcard, so sub-paths such as
     "/dashboard/xyz" resolve to the dashboard page but
     were never matched by the exact-match list above.
     Every /dashboard/* path now requires authentication
     through the SAME existing centralized check. */
  path.startsWith("/dashboard/");

if(requiresAuth){

  const user =
  await getAuthUser();

  if(!user){

    history.replaceState(
{
path:"/login",
scroll:0
},
"",
"/login"
);

    root.innerHTML = `
      <div class="min-h-screen flex items-center justify-center text-center p-10">
        <div>
          <h1 class="text-4xl font-black mb-4 text-[#08111F]">
            Login Required
          </h1>

          <p class="text-gray-500 mb-6">
            Please login to access this page.
          </p>

          <button
            onclick="navigate('/login')"
            class="
            bg-[#005BBF]
            text-white
            px-6
            py-3
            rounded-2xl
            font-semibold
            "
          >
            Go To Login
          </button>
        </div>
      </div>
    `;

    return;
  }

/* =========================================
PHASE 3 — CENTRALIZED MFA GATE
=========================================
Supabase's Authenticator Assurance Level is
the source of truth. A user who authenticated
with a password (currentLevel "aal1") but has
a VERIFIED second factor registered
(nextLevel "aal2") must complete the second-
factor challenge before ANY protected route
renders. This is one centralized check — the
dashboard pages themselves never duplicate it,
and hiding UI alone is never relied upon.

The path is rewritten to /mfa-verify so the
normal route pipeline below renders the
dedicated verification page. Users WITHOUT a
verified factor (nextLevel "aal1") continue
through here completely unaffected. Public
routes never enter this branch.
========================================= */

if(await needsMfaVerification()){

  history.replaceState(
  {
  path:"/mfa-verify",
  scroll:0
  },
  "",
  "/mfa-verify"
  );

  path = "/mfa-verify";

}

/* =========================================
ADMIN ROUTE PROTECTION
========================================= */

if(path === "/admin"){

  const { data:profile } =
  await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if(profile?.role !== "admin"){

    history.replaceState(
{
path:"/",
scroll:0
},
"",
"/"
);

  root.innerHTML = `
      <div class="min-h-screen flex items-center justify-center text-center p-10">
        <div>
          <h1 class="text-4xl font-black mb-4 text-[#08111F]">
            Access Denied
          </h1>

          <p class="text-gray-500 mb-6">
            Administrator access required.
          </p>

          <button
            onclick="navigate('/')"
            class="
            bg-[#005BBF]
            text-white
            px-6
            py-3
            rounded-2xl
            font-semibold
            "
          >
            Return Home
          </button>
        </div>
      </div>
    `;

    return;
  }

}

}

/* =========================================
RESOLVE ROUTE KEY
========================================= */

const routeKey =
getRouteKey(path);

/* =========================================
CLIENT-SIDE 404 HANDLING
========================================= */

if(!routeKey){

  renderNotFound(root);

  return;

}

/* =========================================
GET PAGE LOADER
========================================= */

const pageLoader =
lazyPages[routeKey];

if(!pageLoader){

  renderNotFound(root);

  return;

}

/* =========================================
LOADING STATE
========================================= */

if(!root.innerHTML.trim()){

root.innerHTML = `

<div class="
min-h-[60vh]
flex
items-center
justify-center
">

<div class="
animate-pulse
text-sm
tracking-wide
text-gray-400
">
Loading...
</div>

</div>

`;

}

/* =========================================
LAZY IMPORT
========================================= */

const PagePromise =

moduleCache[routeKey]
? moduleCache[routeKey]
: pageLoader();

moduleCache[routeKey] =
PagePromise;

const Page =
await PagePromise;

/* =========================================
RENDER PAGE
========================================= */

if(routeKey === "helpufin"){

page =
await Page.HelpufinPage();

}else{

page =
await Page();

}

/* =========================================
DYNAMIC SEO
========================================= */

if(routeKey === "home"){

updateSEO({

title:
"Helpufin Auto | Premium AI Automotive Marketplace South Africa",

description:
"Browse premium vehicles, finance options, luxury inventory, and AI-powered automotive discovery."

});

}

if(routeKey === "contact"){

updateSEO({

title:
"Contact Us | Helpufin Auto",

description:
"Contact Helpufin Auto — vehicle finance, finding your next vehicle, selling, fleet, insurance and dealership enquiries. Call +27 64 201 7584 or email drive@helpufin.co.za."

});

}

/* PHASE 1 — dealership directory SEO */

if(routeKey === "dealerships"){

updateSEO({

title:
"Dealerships | Helpufin Auto",

description:
"Explore dealerships signed up with HUFA. Search by name, city or area, filter by province and inventory, and find the right place to shop, enquire or view available vehicles."

});

}

if(routeKey === "browse"){

updateSEO({

title:
"Browse Vehicles | Helpufin Auto",

description:
"Browse premium cars, dealerships, and finance-ready inventory across South Africa."

});

}

if(routeKey === "vehicle"){

const vehicleData =
window.__CURRENT_VEHICLE__;

if(vehicleData){

const title =
`${vehicleData.year || ""} ${vehicleData.make || ""} ${vehicleData.model || ""} | Helpufin Auto`;

const description =
`${vehicleData.year || ""} ${vehicleData.make || ""} ${vehicleData.model || ""} for sale in South Africa. Finance available. Premium marketplace listing.`;

updateSEO({

title,
description,
image:
vehicleData.image ||
"/assets/HUF1.webp"

});

injectVehicleSchema(
vehicleData
);

}

}

if(routeKey === "mfaVerify"){

updateSEO({

title:
"Security Verification | Helpufin Auto",

description:
"Confirm your identity with your authenticator app to continue."

});

}

root.innerHTML = `
<div class="page-transition">
${page}
</div>
`;

if(
routeKey === "helpufin" &&
typeof Page.initialiseHelpufin === "function"
){

requestAnimationFrame(()=>{

Page.initialiseHelpufin();

});

}

/* =========================================
SMART PREFETCHING
========================================= */

const runIdle = (cb)=>{

if("requestIdleCallback" in window){

requestIdleCallback(cb);

}else{

setTimeout(cb,300);

}

};

/* =========================================
PHASE 4 — SMART PREFETCHING
The homepage delegates to the network-aware
priority scheduler (see the PHASE 4 block above):
module-only warm-up of /browse → /sell →
/dealerships → /contact during idle time, after
load, without blocking paint or interaction.
The old eager browse/vehicle/login prefetch is
replaced by this prioritised, budgeted queue.
runIdle is kept for the dashboard block below.
======================================== */

if(routeKey === "home"){

scheduleHomepagePrefetch();

}

if(routeKey === "dashboard"){

runIdle(()=>{

prefetchPage("messages");
prefetchPage("myVehicles");

});

}
}

/*
=================================================
SPA NAVIGATION
=================================================
*/

let navigationInProgress = false;

export async function navigate(path){

if(navigationInProgress){
return;
}

navigationInProgress = true;

  savePageState(
    window.location.pathname,
    {
      scroll: window.scrollY
    }
  );

  if(
    window.location.pathname +
    window.location.search === path
  ){

    navigationInProgress = false;

    return;
  }

  history.pushState(
{
path,
scroll:0,
timestamp:Date.now()
},
"",
path
);

  requestAnimationFrame(async ()=>{

    try{

      await router();

      window.scrollTo({
        top: 0,
        behavior: "auto"
      });

    }finally{

      navigationInProgress = false;

    }

});

  // RE-INIT ICONS
  setTimeout(()=>{
    if(window.lucide){
      lucide.createIcons();
    }
  },0);

}

/* =========================================
GLOBAL NAVIGATE HELPER
=========================================
Exposes navigate() on window so inline
onclick="navigate('/route')" handlers work
across all dynamically-rendered pages.
========================================= */

window.navigate = navigate;