import { asset, stripBase } from "../js/basePath.js";

const PLACEHOLDER = asset("/placeholder.png");


import {
  supabase,
  getUserProfile,
  getUserLimit,
  getUserSubscription,
  getAuthUser,
  getInboxConversations,
  resolveLeadConversation,
  clearAuthCache,
  getVerifiedTotpFactor,
  describeMfaError
} from "../js/api.js";
import { navigate } from "../js/router.js";
import {
  PHASE2_SOCIAL_PLATFORMS,
  normalizeEditSocialValue
} from "../js/socialProfile.js";

import { renderViewToggle, loadViewPreference } from "../components/viewToggle.js";
import { toast } from "../js/ui.js";
import {
  validateImageFile,
  rejectZipFile
} from "../js/fileValidation.js";
import { ensureScript } from "../js/cdnLoader.js";

let selectedVehicles = new Set();
/* =========================================
SOUTH AFRICA TIME FORMATTER
========================================= */

function formatSATime(date){

if(!date) return "";

return new Date(date).toLocaleString(
"en-ZA",
{
timeZone: "Africa/Johannesburg",
year: "numeric",
month: "2-digit",
day: "2-digit",
hour: "2-digit",
minute: "2-digit",
hour12: false
}
);

}

/* =========================================
PACKAGE FEATURE LIMITS
========================================= */

/*
Unified Launch Promotion limits wired into the existing
package-limit system. Launch Promotion is currently the only
available package, so active/featured limits are keyed by
account type (the single "Launch Promotion" row applies to
both private sellers and dealerships):

  Private Seller  → up to  5 active listings, up to  2 featured
  Dealership      → up to 50 active listings, up to 15 featured

Legacy package names are preserved so any user still holding a
previous subscription keeps its original featured limit and
unlimited active listings (existing upload behaviour unchanged).
*/

const LAUNCH_ACTIVE_LIMIT = {
  dealer:  50,
  private: 5
};

const LAUNCH_FEATURED_LIMIT = {
  dealer:  15,
  private: 2
};

/* Kept for backward-compatibility with other packages so their
   behaviour is not altered. Active listings stay unlimited for
   every non-Launch package. */
const FEATURE_LIMITS = {

  "Private Basic": 0,
  "Private Plus": 1,

  "Dealer Starter": 3,
  "Dealer Pro": 10,
  "Dealer Enterprise": 999

};

async function getPackageLimits(){

  const sub =
  await getUserSubscription();

  const name =
  sub?.name ||
  "Private Basic";

  const profile =
  await getUserProfile();

  const isDealer =
  profile?.account_type === "dealer";

  /* Launch Promotion — the active/available offer */
  if(
    name === "Launch Promotion"
  ){

    return {
      active: isDealer
        ? LAUNCH_ACTIVE_LIMIT.dealer
        : LAUNCH_ACTIVE_LIMIT.private,
      featured: isDealer
        ? LAUNCH_FEATURED_LIMIT.dealer
        : LAUNCH_FEATURED_LIMIT.private
    };

  }

  /* All other / legacy packages — preserve existing limits */
  return {
    active: Infinity,
    featured: FEATURE_LIMITS[name] ?? 0
  };

}

export async function getActiveListLimit(){

  const limits =
  await getPackageLimits();

  return limits.active;

}

async function getFeaturedLimit(){

  const limits =
  await getPackageLimits();

  return limits.featured;

}

/* =========================================
LOADING SKELETONS (PHASE 10)
Mirror the eventual dashboard content — KPI
statistic cards, chart cards, notification rows,
inventory/performance table rows, CRM lead cards,
content blocks, finance application cards and
timeline items — using the shared
.skeleton-image / .skeleton-shimmer language from
css/styles.css. Each is replaced by the existing
render functions with real content or the
existing empty/error states.
========================================= */

function renderDashboardKpiSkeletons(count = 3){

const skeletonCard = () => `

<div class="dashboard-kpi-card glass-card">

  <div class="skeleton-shimmer h-3 w-24 rounded mb-3"></div>

  <div class="skeleton-shimmer h-9 w-20 rounded-md"></div>

  <div class="skeleton-shimmer h-3 w-32 rounded mt-3"></div>

</div>

`;

return Array(count).fill(0).map(()=>skeletonCard()).join("");

}

function renderDashboardViewSkeleton(){

return `

<!-- KPI CARDS -->
<div class="
dashboard-kpi-grid
grid
grid-cols-1
sm:grid-cols-2
xl:grid-cols-3
gap-4
lg:gap-6
items-stretch
">

${renderDashboardKpiSkeletons(3)}

</div>

<!-- CHART CARDS -->
<div class="
grid
grid-cols-1
xl:grid-cols-2
gap-4
lg:gap-6
mt-6
">

  <div class="dashboard-chart-card p-6">

    <div class="skeleton-shimmer h-3 w-28 rounded mb-3"></div>
    <div class="skeleton-shimmer h-6 w-48 rounded-md mb-6"></div>

    <div class="space-y-3">
      <div class="skeleton-shimmer h-3 w-full rounded"></div>
      <div class="skeleton-shimmer h-3 w-5/6 rounded"></div>
      <div class="skeleton-shimmer h-3 w-2/3 rounded"></div>
      <div class="skeleton-shimmer h-40 w-full rounded-xl mt-4"></div>
    </div>

  </div>

  <div class="dashboard-chart-card p-6">

    <div class="skeleton-shimmer h-3 w-28 rounded mb-3"></div>
    <div class="skeleton-shimmer h-6 w-40 rounded-md mb-6"></div>

    <div class="space-y-3">
      <div class="skeleton-shimmer h-3 w-full rounded"></div>
      <div class="skeleton-shimmer h-3 w-4/6 rounded"></div>
      <div class="skeleton-shimmer h-40 w-full rounded-xl mt-4"></div>
    </div>

  </div>

</div>

`;

}

function renderNotificationSkeletons(count = 3){

const skeletonRow = () => `

<div class="
flex
items-start
gap-3
py-2
">

  <div class="skeleton-shimmer w-2 h-2 rounded-full mt-1.5 flex-shrink-0"></div>

  <div class="flex-1 space-y-1.5">
    <div class="skeleton-shimmer h-3.5 w-3/4 rounded"></div>
    <div class="skeleton-shimmer h-3 w-1/3 rounded"></div>
  </div>

</div>

`;

return Array(count).fill(0).map(()=>skeletonRow()).join("");

}

function renderTableRowsSkeleton(count = 4){

const skeletonRow = () => `

<div class="
flex
items-center
gap-4
py-3
border-b
border-slate-100
">

  <div class="skeleton-shimmer w-16 h-12 rounded-lg skeleton-image flex-shrink-0"></div>

  <div class="flex-1 space-y-1.5">
    <div class="skeleton-shimmer h-3.5 w-1/3 rounded"></div>
    <div class="skeleton-shimmer h-3 w-1/4 rounded"></div>
  </div>

  <div class="skeleton-shimmer h-3.5 w-16 rounded hidden sm:block"></div>
  <div class="skeleton-shimmer h-3.5 w-16 rounded hidden sm:block"></div>
  <div class="skeleton-shimmer h-8 w-20 rounded-lg"></div>

</div>

`;

return Array(count).fill(0).map(()=>skeletonRow()).join("");

}

function renderLeadCardSkeletons(count = 3){

const skeletonCard = () => `

<div class="
crm-lead-card
rounded-[18px]
bg-white
border
border-slate-200
shadow-sm
p-5
">

  <div class="flex items-start justify-between gap-4">

    <div class="flex-1 space-y-2">
      <div class="skeleton-shimmer h-5 w-40 rounded-md"></div>
      <div class="skeleton-shimmer h-3.5 w-56 rounded"></div>
      <div class="skeleton-shimmer h-3.5 w-32 rounded"></div>
    </div>

    <div class="skeleton-shimmer h-6 w-20 rounded-full"></div>

  </div>

  <div class="mt-4 flex gap-2">
    <div class="skeleton-shimmer h-9 w-24 rounded-lg"></div>
    <div class="skeleton-shimmer h-9 w-24 rounded-lg"></div>
    <div class="skeleton-shimmer h-9 w-24 rounded-lg"></div>
  </div>

</div>

`;

return Array(count).fill(0).map(()=>skeletonCard()).join("");

}

function renderContentBlockSkeleton(){

return `

<div class="space-y-4">

  <div class="skeleton-shimmer h-6 w-1/2 rounded-md"></div>

  <div class="bg-blue-50 p-4 rounded">
    <div class="skeleton-shimmer h-3.5 w-44 rounded mb-2"></div>
    <div class="skeleton-shimmer h-7 w-36 rounded-md"></div>
  </div>

  <div class="bg-green-50 p-4 rounded">
    <div class="skeleton-shimmer h-3.5 w-52 rounded mb-2"></div>
    <div class="skeleton-shimmer h-7 w-40 rounded-md"></div>
  </div>

  <div class="space-y-2">
    <div class="skeleton-shimmer h-4 w-1/2 rounded"></div>
    <div class="skeleton-shimmer h-4 w-2/5 rounded"></div>
  </div>

  <div class="skeleton-shimmer h-11 w-full rounded-lg"></div>

</div>

`;

}

function renderFinanceAppListSkeletons(count = 3){

const skeletonCard = () => `

<div class="
border-b
py-3
space-y-1.5
">

  <div class="skeleton-shimmer h-4 w-1/2 rounded"></div>
  <div class="skeleton-shimmer h-3.5 w-1/3 rounded"></div>
  <div class="skeleton-shimmer h-3.5 w-1/4 rounded"></div>

</div>

`;

return Array(count).fill(0).map(()=>skeletonCard()).join("");

}

function renderInventoryTableSkeleton(){

return `

<div class="
dashboard-inventory-toolbar
flex
flex-col
xl:flex-row
gap-4
justify-between
items-stretch
xl:items-center
mb-6
">

  <div class="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
    <div class="skeleton-shimmer h-11 w-full sm:w-64 rounded-xl"></div>
    <div class="skeleton-shimmer h-11 w-full sm:w-40 rounded-xl"></div>
    <div class="skeleton-shimmer h-11 w-full sm:w-40 rounded-xl"></div>
  </div>

</div>

<div class="space-y-4">

  <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
    <div>
      <div class="skeleton-shimmer h-5 w-36 rounded-md mb-2"></div>
      <div class="skeleton-shimmer h-3.5 w-48 rounded"></div>
    </div>
    <div class="flex flex-wrap gap-2">
      <div class="skeleton-shimmer h-12 w-24 rounded-2xl"></div>
      <div class="skeleton-shimmer h-12 w-24 rounded-2xl"></div>
      <div class="skeleton-shimmer h-12 w-24 rounded-2xl"></div>
      <div class="skeleton-shimmer h-12 w-32 rounded-2xl"></div>
    </div>
  </div>

  ${renderTableRowsSkeleton(4)}

</div>

`;

}

function renderTimelineSkeleton(count = 3){

const skeletonItem = () => `

<div class="
flex
gap-3
pb-4
">

  <div class="skeleton-shimmer w-3 h-3 rounded-full mt-1 flex-shrink-0"></div>

  <div class="flex-1 space-y-1.5">
    <div class="skeleton-shimmer h-3.5 w-2/3 rounded"></div>
    <div class="skeleton-shimmer h-3 w-1/4 rounded"></div>
  </div>

</div>

`;

return Array(count).fill(0).map(()=>skeletonItem()).join("");

}

/* =========================================
PREMIUM ACCESS CONTROL
========================================= */

const ANALYTICS_PLANS = [

  "Dealer Pro",
  "Dealer Enterprise"

];

function hasAnalyticsAccess(plan){

  return ANALYTICS_PLANS.includes(plan);

}

function renderUpgradeWall(title, message){

  return `

<div class="
rounded-[32px]
border
border-[#E48A2F]/20
bg-gradient-to-br
from-[#0A192F]
to-[#081120]
p-10
text-center
shadow-[0_25px_80px_rgba(0,0,0,0.35)]
">

<div class="
w-20
h-20
mx-auto
rounded-full
bg-[#E48A2F]/10
border
border-[#E48A2F]/20
flex
items-center
justify-center
text-4xl
mb-6
">
🔒
</div>

<h2 class="
text-3xl
font-bold
text-white
mb-4
">
${title}
</h2>

<p class="
text-white/70
max-w-2xl
mx-auto
leading-relaxed
mb-8
">
${message}
</p>

<button
onclick="goSell()"
class="
rounded-2xl
bg-[#E48A2F]
hover:opacity-90
text-black
px-8
py-4
font-semibold
transition-all
duration-300
hover:scale-[1.02]
">
Upgrade Plan
</button>

</div>

`;

}

/* =========================================
PREMIUM DASHBOARD STATE
========================================= */

let dashboardAnalytics = {
  totalViews: 0,
  totalSaves: 0,
  totalEnquiries: 0,
  totalInterested: 0,
  totalFinanceApps: 0,
  conversionRate: 0,
  responseRate: 94,
  mostViewed: null,
  mostSaved: null
};

let dashboardActivity = [];
let inventoryHealth = [];

/* =========================================
🔥 REALTIME CHANNELS
========================================= */

let dashboardRealtime = null;
let dashboardRealtimeStarted = false;

let dashboardRefreshTimer = null;
let dashboardRefreshRunning = false;

/* dashboard hardening initialized */
/* cleanup stabilization complete */
/* dashboard production stabilization finalized */

/* =========================================
HELPUFIN AUTO
PREMIUM RESPONSIVE DASHBOARD
PRODUCTION SAFE BUILD
========================================= */

/* =========================================
SHARED DASHBOARD SHELL (PHASE 14)
Single source of truth for the Dashboard side
menu. DashboardPage() renders through this
helper exactly as before, and the standalone
dealer pages (/upload-vehicle, /messages) reuse
the same menu markup, styling, icons, active
states, scrolling, animations and mobile
behaviour.

• On /dashboard* routes every nav item behaves
  exactly as before (loadView swaps views).
• On standalone routes the same items deep-link
  into the matching dashboard view via
  goDashboardView(), and the item belonging to
  the current page carries the .active state.
========================================= */

export function renderDashboardShell({
  activeNav = "",
  mobileTitle = "Overview",
  content = ""
}){

const isStandalone =
!stripBase(window.location.pathname).startsWith("/dashboard");

/* View links: loadView on the dashboard,
   deep-link wrapper on standalone pages */
const viewAction = (view) =>
isStandalone
? `goDashboardView('${view}')`
: `loadView('${view}')`;

const crmAction =
isStandalone
? "window.__CURRENT_OPEN_LEAD_ID__ = null; goDashboardView('crm');"
: `
window.__CURRENT_OPEN_LEAD_ID__ = null;
loadView('crm');
`;

/* PHASE 17 — hydrate the shared profile section on every page
   that renders through this shell. Runs identically on desktop
   and mobile, on /dashboard* and on standalone pages. */
setTimeout(()=>{
  hydrateDashboardProfile();
  renderFinanceNav();
}, 0);

return `

<div class="dashboard-premium-bg dashboard-mobile-wallpaper">

<div class="dashboard-noise"></div>

<div class="
dashboard-shell
max-w-[1400px]
mx-auto
px-2
sm:px-4
md:px-6
lg:px-8
py-2
md:py-4
overflow-x-hidden
min-h-screen
">

<!-- MOBILE TOPBAR -->
<header class="
dashboard-mobile-topbar
flex
items-center
justify-between
gap-3
xl:hidden
mb-4
">

<button
type="button"
onclick="toggleDashboardSidebar()"
aria-label="Open dashboard menu"
title="Open dashboard menu"
class="
dashboard-mobile-menu
min-w-[44px]
min-h-[44px]
w-12
h-12
flex
items-center
justify-center
rounded-2xl
bg-white/10
border
border-white/10
backdrop-blur-xl
active:scale-[0.98]
transition-all
duration-200
cursor-pointer
">

<svg xmlns="http://www.w3.org/2000/svg"
class="w-6 h-6"
fill="none"
viewBox="0 0 24 24"
stroke="currentColor"
aria-hidden="true">

<path stroke-linecap="round"
stroke-linejoin="round"
stroke-width="1.5"
d="M4 6h16M4 12h16M4 18h16" />

</svg>

</button>

<div class="
min-w-0
flex-1
flex
items-center
justify-end
">

<img
src="${asset("/assets/logo1.webp")}"
alt="Helpufin Auto"
width="1080"
height="360"
loading="eager"
decoding="async"
class="
h-9
sm:h-10
w-auto
object-contain
shrink-0
"
draggable="false"
/>

</div>

</header>

<div class="
dashboard-layout
relative
grid
grid-cols-1
xl:grid-cols-[290px_minmax(0,1fr)]
gap-3
xl:gap-4
items-start
min-w-0
w-full
overflow-hidden
">

<!-- SIDEBAR -->
<aside
id="dashboardSidebar"
class="
dashboard-sidebar
fixed
xl:sticky
top-0
left-0
w-[88vw]
max-w-[360px]
xl:min-w-[290px]
xl:w-auto
h-screen
xl:h-auto
z-50
xl:z-auto
translate-x-[-110%]
xl:translate-x-0
transition-all
duration-300
ease-out
overflow-hidden
pb-[calc(40px+env(safe-area-inset-bottom))]
pt-[env(safe-area-inset-top)]
flex
flex-col
">

<div class="sidebar-glow"></div>

<!-- DEALER PROFILE (PHASE 17 — functional user profile section.
     Same card, spacing and typography as before; the avatar now
     shows the user's uploaded profile picture when one exists
     (initials fallback otherwise), the name shows the real user
     name, and an Edit Profile action opens the shared modal.) -->
<div class="
dashboard-dealer-profile
">

<div class="
flex
items-center
gap-3
min-w-0
">

<div id="dashboardSidebarAvatar"
class="
dashboard-sidebar-avatar
flex
items-center
justify-center
rounded-full
bg-[#E48A2F]/15
border
border-[#E48A2F]/25
text-[#E48A2F]
font-bold
text-sm
w-10
h-10
flex-shrink-0
overflow-hidden
">
HA
</div>

<div class="
dashboard-sidebar-profile-text
min-w-0
flex-1
">

<p
id="dashboardSidebarName"
class="
dashboard-sidebar-name
truncate
">
Account
</p>

<p
id="dashboardSidebarType"
class="
dashboard-sidebar-account-type
truncate
">
<span class="skeleton-shimmer h-2.5 w-24 rounded inline-block align-middle"></span>
</p>

</div>

</div>

<button
type="button"
class="
dashboard-edit-profile-btn
"
onclick="openEditProfileModal()"
aria-label="Edit Profile"
title="Edit Profile"
>

<svg xmlns="http://www.w3.org/2000/svg"
class="w-3.5 h-3.5 flex-shrink-0"
fill="none"
viewBox="0 0 24 24"
stroke="currentColor"
aria-hidden="true">

<path stroke-linecap="round"
stroke-linejoin="round"
stroke-width="2"
d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />

</svg>

<span>
Edit Profile
</span>

</button>

</div>

<!-- PHASE 3 — DEALER-ONLY "Edit Dealership Page" action.
     Hidden by default (account_type === "dealer" unhides it
     in applyDashboardProfile). Opens the dedicated editor at
     /dashboard/dealership, which enforces the same rule. -->
<button
id="editDealershipPageBtn"
type="button"
class="dashboard-edit-dealership-btn"
onclick="navigate('/dashboard/dealership')"
aria-label="Edit Dealership Page"
title="Edit Dealership Page"
hidden
>

<svg xmlns="http://www.w3.org/2000/svg"
class="w-3.5 h-3.5 flex-shrink-0"
fill="none"
viewBox="0 0 24 24"
stroke="currentColor"
aria-hidden="true">

<path stroke-linecap="round"
stroke-linejoin="round"
stroke-width="2"
d="M4 7h16M9 11h6M7 15h10M4 4h16" />

</svg>

<span>
Edit Dealership Page
</span>

</button>

<!-- NAVIGATION -->
<nav
id="dashboardSidebarNav"
class="
sidebar-nav
flex-1
overflow-y-auto
overflow-x-hidden
relative
z-[100]
pointer-events-auto
overscroll-contain
">

<p class="
dashboard-nav-group-label
">
Main
</p>

<button
type="button"
class="
nav-item
min-h-[48px]
w-full
relative
z-[120]
pointer-events-auto
cursor-pointer
active:scale-[0.98]
transition
"
onclick="${viewAction("overview")}">

<span class="nav-icon" aria-hidden="true">⌂</span>

<span>
Overview
</span>

</button>


<button
class="
nav-item
min-h-[48px]
w-full
relative
z-[120]
pointer-events-auto
cursor-pointer
"
onclick="${viewAction("inventory")}">

<span class="nav-icon" aria-hidden="true">▣</span>

<span>
Inventory
</span>

</button>

<button
type="button"
class="
nav-item
min-h-[48px]
w-full
relative
z-[120]
pointer-events-auto
cursor-pointer
active:scale-[0.98]
transition
${activeNav === "upload" ? "active" : ""}
"
onclick="goUpload()">

<span class="nav-icon" aria-hidden="true">＋</span>

<span>
Add Vehicle
</span>

</button>

<button
type="button"
class="
nav-item
min-h-[48px]
w-full
relative
z-[120]
pointer-events-auto
cursor-pointer
active:scale-[0.98]
transition
${activeNav === "messages" ? "active" : ""}
"
onclick="goMessages()">

<span class="nav-icon" aria-hidden="true">✉</span>

<span>
Messages
</span>

</button>

<p class="
dashboard-nav-group-label
">
Manage
</p>

<button
class="
nav-item
min-h-[48px]
w-full
relative
z-[120]
pointer-events-auto
cursor-pointer
"
onclick="${viewAction("performance")}">

<span class="nav-icon" aria-hidden="true">▲</span>

<span>
Performance
</span>

</button>

<button
class="
nav-item
min-h-[48px]
w-full
relative
z-[120]
pointer-events-auto
cursor-pointer
active:scale-[0.98]
transition
"
onclick="${viewAction("tradeins")}">

<span class="nav-icon" aria-hidden="true">⇄</span>

<span>
Trade-In Centre
</span>

</button>

<button
class="
nav-item
min-h-[48px]
w-full
relative
z-[120]
pointer-events-auto
cursor-pointer
active:scale-[0.98]
transition
"
onclick="${crmAction}">

<span class="nav-icon" aria-hidden="true">◎</span>

<span>
CRM Leads
</span>

<!-- New-interest badge: count of unread "New Vehicle Interest"
     CRM notifications whose lead is still status "interested".
     Updated by window.updateCRMInterestBadges(). -->
<span
id="crmNavBadge"
class="hidden ml-auto min-w-[20px] text-center text-[10px] font-bold leading-none text-white bg-[#E48A2F] rounded-full px-1.5 py-1"
>
0
</span>

</button>

<!-- FINANCE NAV — rendered conditionally by
     renderFinanceNav() AFTER the authenticated
     user's account type resolves. Neither item
     exists in the initial markup, so neither
     can flash or be clickable during loading. -->
<div id="financeNavSlot"></div>

</nav>

<!-- SIDEBAR FOOTER -->
<div class="
dashboard-sidebar-footer
mt-6
pb-6
">

</div>

</aside>

<div
id="dashboardSidebarOverlay"
onclick="toggleDashboardSidebar(false)"
aria-hidden="true"
class="
fixed
inset-0
bg-black/60
backdrop-blur-sm
z-40
hidden
xl:hidden
transition-opacity
duration-300
will-change-opacity
">
</div>

<!-- MAIN -->
<div
class="
min-w-0
w-full
overflow-x-hidden
relative
">

${content}

</div>

</div>

</div>

</div>
`;

}

/* =========================================
ROLE-AWARE FINANCE NAV (PHASE 1 — RENDER-BASED)
Why render-based: the sidebar's ID-scoped rule
`#dashboardSidebar .nav-item { display:flex }`
(css/styles.css) out-specifies Tailwind's
`.hidden`, so CSS hiding of pre-rendered items
cannot work here. Instead, NEITHER finance
item exists in the initial shell markup — an
empty #financeNavSlot is rendered, and exactly
one finance button is injected into it only
after the authenticated user's account type
resolves. While resolving (or if unresolvable)
the slot stays empty — no item, no heading,
nothing clickable.

Account type source = the SAME cached
profiles row that fills the sidebar's account
type label ("Private Seller"/"Dealership"):
  pages/signup.js → auth user_metadata →
  profiles.account_type → js/api.js getUserProfile()

  dealer   → Finance Applications
  private  → Affordability Profile

Purely presentational: no features, routes,
permissions or DB changes. Fails CLOSED: an
unknown account type leaves the Finance
section absent rather than exposing both.
========================================= */

let __financeNavUserId = null;

export async function renderFinanceNav(){

const slot =
document.getElementById("financeNavSlot");

if(!slot){
return;
}

/* ---------- NORMALIZE (existing values only) ----------
   The application stores exactly two account types at
   signup (pages/signup.js → user_metadata.account_type
   → profiles.account_type via js/api.js getUserProfile):

     "dealer"   → Dealership
     "private"  → Private Seller

   Normalization is defensive only: casing, surrounding
   whitespace and separator variants of these SAME two
   values map onto them. Anything unrecognised resolves
   to "unknown" so the finance section stays empty. */

const normalizeAccountType = (value) => {

const raw =
String(value ?? "")
.trim()
.toLowerCase()
.replace(/[\s_\-]+/g, "");

if(
raw === "dealer" ||
raw === "dealership"
){
return "dealer";
}

if(
raw === "private" ||
raw === "privateseller"
){
return "private";
}

return "unknown";

};

/* ---------- RESOLVE ACCOUNT TYPE ----------
   Same existing profile system as the sidebar
   account-type label (hydrateDashboardProfile):
     1. getUserProfile() — cached profiles row
     2. Fallback: direct existing profiles row
     3. Fallback: existing signup user_metadata
   */

let accountType = "unknown";
let resolvedFrom = "none";

try{

const user =
await getAuthUser();

if(!user){
slot.innerHTML = "";
__financeNavUserId = null;
return;
}

/* Stale-user guard: if the authenticated user
   changed since the last resolve (logout →
   different login), clear the slot immediately
   so no previous account's item can survive,
   and force a fresh resolve below. */

if(
__financeNavUserId &&
__financeNavUserId !== user.id
){
slot.innerHTML = "";
}

__financeNavUserId = user.id;

const profile =
await getUserProfile();

accountType =
normalizeAccountType(profile?.account_type);

if(accountType !== "unknown"){
resolvedFrom = "profiles (getUserProfile)";
}

if(accountType === "unknown"){

/* profiles row missing / unreadable — retry
   through the same table + the signup
   metadata that created it. */

const { data } = await supabase
.from("profiles")
.select("account_type")
.eq("id", user.id)
.single();

accountType =
normalizeAccountType(data?.account_type);

if(accountType !== "unknown"){
resolvedFrom = "profiles (direct select)";
}

if(accountType === "unknown"){

accountType =
normalizeAccountType(
user.user_metadata?.account_type
);

if(accountType !== "unknown"){
resolvedFrom = "user_metadata";
}

}

}

}catch(error){

console.error(
"Failed to resolve account type for finance nav:",
error
);

accountType = "unknown";

}

/* ---------- RENDER (fail closed) ----------
   Exactly ONE finance item is built into the
   slot. Unknown → slot stays empty. */

const isStandalone =
!stripBase(window.location.pathname).startsWith("/dashboard");

const action = (view) =>
isStandalone
? `goDashboardView('${view}')`
: `loadView('${view}')`;

if(accountType === "dealer"){

/* DEALERSHIP — Finance Applications only */
slot.innerHTML = `
<p class="
dashboard-nav-group-label
">
Finance
</p>

<button
class="
nav-item
min-h-[48px]
w-full
relative
z-[120]
pointer-events-auto
cursor-pointer
active:scale-[0.98]
transition
"
onclick="${action("finance")}">

<span class="nav-icon" aria-hidden="true">◈</span>

<span>
Finance Applications
</span>

</button>
`;

return;

}

if(accountType === "private"){

/* PRIVATE SELLER — Affordability Profile only */
slot.innerHTML = `
<p class="
dashboard-nav-group-label
">
Finance
</p>

<button
class="
nav-item
min-h-[48px]
w-full
relative
z-[120]
pointer-events-auto
cursor-pointer
active:scale-[0.98]
transition
"
onclick="${action("affordability")}">

<span class="nav-icon" aria-hidden="true">◍</span>

<span>
Affordability Profile
</span>

</button>
`;

return;

}

/* Unknown / unresolved — Finance section absent. */
slot.innerHTML = "";

}

/* =========================================
USER PROFILE SECTION (PHASE 17)
Functional profile display + Edit Profile for
the shared Dashboard sidebar. Implemented once
here so every page rendered through
renderDashboardShell() gets identical desktop
and mobile behaviour:

• Avatar shows the user's uploaded profile
  picture when one exists, with a clean HUFA
  initials fallback (never a broken image).
• Name shows the real user name.
• "Edit Profile" opens a modal supporting
  picture upload / replace / remove, name
  editing, save and cancel, persisted to the
  existing Supabase profiles row.
========================================= */

/* ---------- SHARED HELPERS ---------- */

function escapeHtmlAttr(value){

/* Built from character codes so the source never
   contains raw HTML entity sequences. */
const AMP = String.fromCharCode(38);
const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);
const QUOT = String.fromCharCode(34);

return String(value ?? "")
.split(AMP).join(AMP + "amp;")
.split(LT).join(AMP + "lt;")
.split(GT).join(AMP + "gt;")
.split(QUOT).join(AMP + "quot;")
.split("'").join(AMP + "#39;");

}

function computeInitials(first, surname){

const f = (first || "").trim();
const s = (surname || "").trim();

if(!f && !s){
return "HA";
}

const initials =
`${f.charAt(0)}${s.charAt(0)}`
.toUpperCase();

return initials || "HA";

}

/* ---------- SIDEBAR PROFILE HYDRATION ---------- */

let __dashProfileHydrating = false;

export async function hydrateDashboardProfile(){

if(__dashProfileHydrating){
return;
}

__dashProfileHydrating = true;

try{

const user =
await getAuthUser();

if(!user){

/* No session — clear the placeholder shimmer
   but leave the default markup untouched. */
const typeEl =
document.getElementById(
"dashboardSidebarType"
);

if(typeEl){
typeEl.innerText = "";
}

return;

}

const profile =
await getUserProfile();

if(!profile){
return;
}

applyDashboardProfile(profile);

}catch(err){

console.warn(
"Dashboard profile hydration skipped:",
err
);

}finally{

__dashProfileHydrating = false;

}

}

function applyDashboardProfile(profile){

const avatar =
document.getElementById(
"dashboardSidebarAvatar"
);

const nameEl =
document.getElementById(
"dashboardSidebarName"
);

const typeEl =
document.getElementById(
"dashboardSidebarType"
);

const fullName =
`${profile.name || ""} ${profile.surname || ""}`
.trim() || "User";

if(nameEl){
nameEl.innerText = fullName;
}

if(typeEl){

typeEl.innerText =
profile.account_type === "dealer"
? (
profile.dealership_name ||
"Dealership"
)
: "Private Seller";

}

/* PHASE 3 — the dedicated dealership-page editor is a
   dealer-only action. Private sellers never see it here,
   and the /dashboard/dealership route itself enforces
   account_type === "dealer" (pages/dashboardDealership.js),
   so hiding alone is never the security boundary. */
const dealerPageBtn =
document.getElementById(
"editDealershipPageBtn"
);

if(dealerPageBtn){

dealerPageBtn.hidden =
!(profile.account_type === "dealer");

}

if(!avatar){
return;
}

const url =
(profile.avatar_url || "").trim();

/* PHASE 19 — remember the current photo URL so
   the larger image viewer can reuse the EXISTING
   profiles.avatar_url (no re-upload, no new
   database fields). Empty = initials fallback. */
window.__DASH_PROFILE_AVATAR_URL__ = url;

if(url){

/* Uploaded picture — swap the initials for the
   image. onerror falls back to initials so a
   broken image can never be displayed. */
window.__DASH_PROFILE_INITIALS__ =
computeInitials(
profile.name,
profile.surname
);

avatar.classList.add("has-photo");

/* PHASE 19 — a real photo opens the larger
   image viewer. The initials fallback below
   never becomes clickable. */
setDashboardAvatarClickable(avatar, true);

avatar.innerHTML =
`<img
src="${escapeHtmlAttr(url)}"
alt="Profile photo"
class="dashboard-avatar-img"
onerror="window.__dashAvatarFallback(this)"
>`;

}else{

avatar.classList.remove("has-photo");

/* PHASE 19 — initials fallback behaviour is
   unchanged and never opens the image viewer. */
setDashboardAvatarClickable(avatar, false);

avatar.innerText =
computeInitials(
profile.name,
profile.surname
);

}

}

/* Broken-image safety net: never show a broken
   image box in the sidebar avatar. */
window.__dashAvatarFallback = function(img){

const avatar =
img?.closest?.("#dashboardSidebarAvatar")
|| document.getElementById(
"dashboardSidebarAvatar"
);

if(!avatar){
return;
}

avatar.classList.remove("has-photo");

/* PHASE 19 — a broken image is treated exactly
   like "no photo": initials fallback, viewer
   disabled, remembered URL cleared. */
window.__DASH_PROFILE_AVATAR_URL__ = "";

setDashboardAvatarClickable(avatar, false);

avatar.innerText =
window.__DASH_PROFILE_INITIALS__ || "HA";

};

/* ---------- PHASE 19 — LARGER PROFILE IMAGE
   VIEWER (LIGHTBOX) ---------- */

/* Click affordance is applied ONLY while a real
   uploaded photo is displayed. With the initials
   fallback the avatar stays exactly as before
   and never opens the viewer. */
function setDashboardAvatarClickable(avatar, enabled){

if(!avatar){
return;
}

if(enabled){

avatar.classList.add(
"dashboard-avatar-clickable"
);

avatar.setAttribute(
"onclick",
"openProfileImageViewer()"
);

avatar.setAttribute("role","button");

avatar.setAttribute("tabindex","0");

avatar.setAttribute(
"aria-label",
"View profile photo"
);

avatar.setAttribute(
"title",
"View profile photo"
);

avatar.setAttribute(
"onkeydown",
"if(event.key==='Enter'||event.key===' '){event.preventDefault();openProfileImageViewer();}"
);

}else{

avatar.classList.remove(
"dashboard-avatar-clickable"
);

avatar.removeAttribute("onclick");
avatar.removeAttribute("onkeydown");
avatar.removeAttribute("role");
avatar.removeAttribute("tabindex");
avatar.removeAttribute("aria-label");
avatar.removeAttribute("title");

}

}

/* Opens the existing profiles.avatar_url at a
   substantially larger size in a clean HUFA-style
   lightbox. No re-upload, no new fields, no
   Storage changes — the same URL the sidebar
   already displays. */
window.openProfileImageViewer = function(){

/* Only a real uploaded photo opens the viewer —
   the initials fallback returns silently. */
const url =
(window.__DASH_PROFILE_AVATAR_URL__ || "").trim();

if(!url){
return;
}

if(
document.getElementById(
"profileImageViewerOverlay"
)
){
return;
}

/* Same scroll-lock pattern as the Edit Profile
   modal so an open mobile drawer keeps its
   state. */
window.__PROFILE_VIEWER_PREV_OVERFLOW__ =
document.body.style.overflow || "";

window.__PROFILE_VIEWER_PREV_TOUCH__ =
document.body.style.touchAction || "";

document.body.style.overflow = "hidden";
document.body.style.touchAction = "none";

document.body.insertAdjacentHTML(
"beforeend",
`

<div
id="profileImageViewerOverlay"
class="
fixed
inset-0
bg-black/70
backdrop-blur-sm
z-[9999]
flex
items-center
justify-center
p-4
"
onclick="closeProfileImageViewer()"
role="dialog"
aria-modal="true"
aria-label="Profile photo"
>

<div
class="
relative
max-w-[92vw]
max-h-[86vh]
"
onclick="event.stopPropagation()"
>

<img
src="${escapeHtmlAttr(url)}"
alt="Profile photo"
class="profile-image-viewer-img"
onerror="closeProfileImageViewer()"
>

<button
type="button"
class="profile-image-viewer-close"
onclick="closeProfileImageViewer()"
aria-label="Close"
title="Close"
>
✕
</button>

</div>

</div>

`
);

/* ESC closes the viewer (desktop + mobile
   keyboards). */
window.__profileViewerKeyHandler =
function(ev){

if(ev.key === "Escape"){
closeProfileImageViewer();
}

};

document.addEventListener(
"keydown",
window.__profileViewerKeyHandler
);

};

window.closeProfileImageViewer = function(){

const overlay =
document.getElementById(
"profileImageViewerOverlay"
);

if(!overlay){
return;
}

overlay.remove();

if(
window.__profileViewerKeyHandler
){

document.removeEventListener(
"keydown",
window.__profileViewerKeyHandler
);

window.__profileViewerKeyHandler = null;

}

/* Restore the exact pre-open body state. */
document.body.style.overflow =
window.__PROFILE_VIEWER_PREV_OVERFLOW__ ?? "";

document.body.style.touchAction =
window.__PROFILE_VIEWER_PREV_TOUCH__ ?? "";

};

/* ---------- EDIT PROFILE MODAL ---------- */

let editProfilePendingFile = null;
let editProfilePendingUrl = null;
let editProfileRemoveRequested = false;
let editProfileCurrentAvatarUrl = "";
let editProfileSaving = false;

const EDIT_PROFILE_ALLOWED_TYPES = [
"image/jpeg",
"image/jpg",
"image/png",
"image/webp"
];

const EDIT_PROFILE_MAX_SIZE =
5 * 1024 * 1024;

window.openEditProfileModal = async function(){

if(
document.getElementById(
"editProfileModalOverlay"
)
){
return;
}

const profile =
await getUserProfile();

editProfileCurrentAvatarUrl =
(profile?.avatar_url || "").trim();

editProfilePendingFile = null;
editProfilePendingUrl = null;
editProfileRemoveRequested = false;

/* Capture the current body scroll-lock state so
   it can be restored exactly on close (the
   mobile drawer may already have locked scroll). */
window.__EDIT_PROFILE_PREV_OVERFLOW__ =
document.body.style.overflow || "";

window.__EDIT_PROFILE_PREV_TOUCH__ =
document.body.style.touchAction || "";

document.body.style.overflow = "hidden";
document.body.style.touchAction = "none";

const firstName =
profile?.name || "";

const surname =
profile?.surname || "";

/* PHASE 18A — dealership identity uses the
   EXISTING profiles.dealership_name field and
   the EXISTING account_type logic. No new
   database fields are introduced. */
const dealershipName =
profile?.dealership_name || "";

const isDealerAccount =
profile?.account_type === "dealer";

/* PHASE 2 — dealership contact + social fields.
   Dealers only; private sellers never see or
   save these. Reuses the existing profiles.phone
   column; new columns come from the Phase 2
   migration (dealership_email, dealership_address,
   social_links jsonb). */

const dealerEmail =
profile?.dealership_email || "";

const dealerPhone =
profile?.phone || "";

const dealerAddress =
profile?.dealership_address || "";

const phase2SocialLinks =
(profile?.social_links && typeof profile?.social_links === "object")
? profile.social_links
: {};

/* Icon chip row — one recognizable brand icon per
   platform, never a wall of empty text fields.
   Platforms with a saved value render as active
   with their input revealed. */

const phase2SocialChipsHtml =
PHASE2_SOCIAL_PLATFORMS.map(p => {

const hasValue =
String(phase2SocialLinks[p.id] || "").trim().length > 0;

return `
<button
type="button"
id="editSocialChip-${p.id}"
onclick="toggleEditSocialInput('${p.id}')"
title="${p.hint}"
aria-label="${p.label}"
class="
edit-social-chip
w-11
h-11
rounded-xl
flex
items-center
justify-center
border
transition
${
hasValue
? "border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]"
: "border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700"
}
"
>
<span class="w-5 h-5 block">${p.icon}</span>
</button>`;

}).join("");

/* Input fields — only revealed for platforms the
   dealer actually uses (has a saved value or taps
   the icon). Empty platforms stay collapsed. */

const phase2SocialInputsHtml =
PHASE2_SOCIAL_PLATFORMS.map(p => {

const saved =
String(phase2SocialLinks[p.id] || "").trim();

return `
<div
id="editSocialField-${p.id}"
class="${saved ? "" : "hidden"}"
>

<label
for="editSocialInput-${p.id}"
class="block text-xs font-semibold text-gray-500 mb-1"
>
${p.label} · ${p.hint}
</label>

<input
id="editSocialInput-${p.id}"
type="text"
maxlength="300"
placeholder="${escapeHtmlAttr(p.placeholder)}"
value="${escapeHtmlAttr(saved)}"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-2.5
text-sm
focus:outline-none
focus:border-[#3B82F6]
focus:ring-2
focus:ring-[#3B82F6]/20
transition
"
/>

</div>`;

}).join("");

window.__EDIT_PROFILE_INITIALS__ =
computeInitials(firstName, surname);

document.body.insertAdjacentHTML(
"beforeend",
`

<div
id="editProfileModalOverlay"
class="
fixed
inset-0
bg-black/60
backdrop-blur-sm
z-[9999]
flex
items-center
justify-center
p-4
"
onclick="closeEditProfileModal(event)"
>

<div
id="editProfileModalDialog"
class="
bg-white
rounded-[28px]
shadow-2xl
w-full
max-w-md
p-6
max-h-[90vh]
overflow-y-auto
"
onclick="event.stopPropagation()"
>

<div class="
flex
items-center
justify-between
mb-6
">

<h2 class="text-xl md:text-2xl font-bold">
Edit Profile
</h2>

<button
type="button"
onclick="closeEditProfileModal()"
class="
w-10
h-10
rounded-xl
flex
items-center
justify-center
text-gray-500
hover:bg-gray-100
hover:text-gray-800
transition
"
aria-label="Close"
>
✕
</button>

</div>

<div class="
flex
flex-col
items-center
gap-3
mb-6
">

<div
id="editProfilePreview"
class="
edit-profile-avatar-preview
flex
items-center
justify-center
rounded-full
bg-[#E48A2F]/15
border
border-[#E48A2F]/25
text-[#E48A2F]
font-bold
text-2xl
w-24
h-24
overflow-hidden
select-none
"
>
HA
</div>

<div class="
flex
items-center
gap-2
flex-wrap
justify-center
">

<label
for="editProfileFileInput"
id="editProfileUploadLabel"
class="
dashboard-modal-chip
cursor-pointer
"
>
Upload Photo
</label>

<button
type="button"
id="editProfileRemoveBtn"
class="
dashboard-modal-chip
dashboard-modal-chip-danger
hidden
"
onclick="removeEditAvatarPhoto()"
>
Remove Photo
</button>

<input
id="editProfileFileInput"
type="file"
accept="image/jpeg,image/jpg,image/png,image/webp"
class="hidden"
onchange="onEditAvatarSelected(this)"
/>

</div>

<p class="
text-xs
text-gray-400
">
JPG, PNG or WEBP · max 5MB
</p>

</div>

<div class="space-y-4 mb-6">

<div>

<label
for="editProfileName"
class="
block
text-sm
font-semibold
mb-1.5
"
>
First Name
</label>

<input
id="editProfileName"
type="text"
maxlength="60"
autocomplete="given-name"
placeholder="Your first name"
value="${escapeHtmlAttr(firstName)}"
oninput="refreshEditProfileInitials()"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
focus:outline-none
focus:border-[#3B82F6]
focus:ring-2
focus:ring-[#3B82F6]/20
transition
"
/>

</div>

<div>

<label
for="editProfileSurname"
class="
block
text-sm
font-semibold
mb-1.5
"
>
Surname
</label>

<input
id="editProfileSurname"
type="text"
maxlength="60"
autocomplete="family-name"
placeholder="Your surname"
value="${escapeHtmlAttr(surname)}"
oninput="refreshEditProfileInitials()"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
focus:outline-none
focus:border-[#3B82F6]
focus:ring-2
focus:ring-[#3B82F6]/20
transition
"
/>

</div>

${
isDealerAccount ? `

<div>

<label
for="editProfileDealership"
class="
block
text-sm
font-semibold
mb-1.5
"
>
Dealership Name
</label>

<input
id="editProfileDealership"
type="text"
maxlength="80"
autocomplete="organization"
placeholder="Your dealership name"
value="${escapeHtmlAttr(dealershipName)}"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
focus:outline-none
focus:border-[#3B82F6]
focus:ring-2
focus:ring-[#3B82F6]/20
transition
"
/>

</div>

<div>

<label
for="editProfileDealerEmail"
class="
block
text-sm
font-semibold
mb-1.5
"
>
Dealership Email
</label>

<input
id="editProfileDealerEmail"
type="email"
maxlength="120"
autocomplete="email"
placeholder="sales@yourdealership.co.za"
value="${escapeHtmlAttr(dealerEmail)}"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
focus:outline-none
focus:border-[#3B82F6]
focus:ring-2
focus:ring-[#3B82F6]/20
transition
"
/>

</div>

<div>

<label
for="editProfileDealerPhone"
class="
block
text-sm
font-semibold
mb-1.5
"
>
Dealership Phone Number
</label>

<input
id="editProfileDealerPhone"
type="tel"
maxlength="20"
autocomplete="tel"
placeholder="e.g. 011 234 5678"
value="${escapeHtmlAttr(dealerPhone)}"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
focus:outline-none
focus:border-[#3B82F6]
focus:ring-2
focus:ring-[#3B82F6]/20
transition
"
/>

</div>

<div>

<label
for="editProfileDealerAddress"
class="
block
text-sm
font-semibold
mb-1.5
"
>
Dealership Address
</label>

<input
id="editProfileDealerAddress"
type="text"
maxlength="200"
autocomplete="street-address"
placeholder="Street, city, province"
value="${escapeHtmlAttr(dealerAddress)}"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
focus:outline-none
focus:border-[#3B82F6]
focus:ring-2
focus:ring-[#3B82F6]/20
transition
"
/>

</div>

<div>

<label
class="
block
text-sm
font-semibold
mb-2
"
>
Dealership Social Media
</label>

<p class="text-xs text-gray-400 mb-3">
Tap a platform icon to add or edit its link. Empty platforms are never shown publicly.
</p>

<div class="flex flex-wrap gap-2 mb-3">
${phase2SocialChipsHtml}
</div>

<div class="space-y-3">
${phase2SocialInputsHtml}
</div>

</div>

` : ""
}

</div>

<!-- PHASE 3 — TWO-FACTOR AUTHENTICATION (MFA).
     Compact security section inside the existing
     profile modal. Its content is rendered and
     driven by renderMfaSection() below so the
     status always reflects the real Supabase
     factor state. -->
<div
id="mfaSection"
class="mfa-section"
aria-live="polite"
></div>

<div class="
flex
gap-3
">

<button
type="button"
id="editProfileCancelBtn"
onclick="closeEditProfileModal()"
class="
flex-1
rounded-xl
border
border-gray-300
hover:bg-gray-50
px-4
py-3
text-sm
font-semibold
transition
"
>
Cancel
</button>

<button
type="button"
id="editProfileSaveBtn"
onclick="saveEditProfile()"
class="
flex-1
rounded-xl
bg-[#005BBF]
hover:bg-[#004FA8]
text-white
px-4
py-3
text-sm
font-semibold
transition
disabled:opacity-60
disabled:cursor-not-allowed
"
>
Save Changes
</button>

</div>

</div>

</div>

`
);

renderEditProfilePreview();

/* PHASE 3 — the MFA section lives in this same
   modal. Reset any stale remove-confirmation
   state, then render the real factor status. */
mfaRemoveArmed = false;

renderMfaSection();

/* PHASE 4 — land keyboard and screen-reader
   users on the first profile field. */
const firstField =
document.getElementById("editProfileName");

if(firstField){
setTimeout(()=>{
firstField.focus({ preventScroll:true });
}, 60);
}

/* PHASE 4 — Escape closes the modal through the
   exact same cleanup path as the ✕ and Cancel
   buttons (MFA enrollment is dropped safely). */
if(!window.__EDIT_PROFILE_ESC_HANDLER__){

window.__EDIT_PROFILE_ESC_HANDLER__ = (e)=>{

if(
e.key === "Escape" &&
document.getElementById(
"editProfileModalOverlay"
)
){
closeEditProfileModal();
}

};

document.addEventListener(
"keydown",
window.__EDIT_PROFILE_ESC_HANDLER__
);

}

};

function renderEditProfilePreview(){

const box =
document.getElementById(
"editProfilePreview"
);

if(!box){
return;
}

let url = null;

if(editProfilePendingUrl){
url = editProfilePendingUrl;
}else if(
editProfileCurrentAvatarUrl &&
!editProfileRemoveRequested
){
url = editProfileCurrentAvatarUrl;
}

if(url){

box.classList.add("has-photo");

box.innerHTML =
`<img
src="${escapeHtmlAttr(url)}"
alt="Profile picture preview"
onerror="window.__editPreviewFallback(this)"
>`;

}else{

box.classList.remove("has-photo");

box.textContent =
window.__EDIT_PROFILE_INITIALS__ || "HA";

}

const removeBtn =
document.getElementById(
"editProfileRemoveBtn"
);

if(removeBtn){
removeBtn.classList.toggle(
"hidden",
!url
);
}

}

window.__editPreviewFallback = function(img){

const box =
img?.closest?.("#editProfilePreview");

if(!box){
return;
}

box.classList.remove("has-photo");

box.textContent =
window.__EDIT_PROFILE_INITIALS__ || "HA";

};

/* PHASE 2 — show/hide a social platform input
   when its icon chip is tapped. The chip state
   updates so dealers can see which platforms
   are active. */

window.toggleEditSocialInput =
function(platformId){

const field =
document.getElementById(
`editSocialField-${platformId}`
);

const chip =
document.getElementById(
`editSocialChip-${platformId}`
);

if(!field){
return;
}

const isHidden =
field.classList.toggle("hidden");

if(chip){

chip.classList.toggle(
"border-[#3B82F6]",
!isHidden
);

chip.classList.toggle(
"bg-[#3B82F6]/10",
!isHidden
);

chip.classList.toggle(
"text-[#3B82F6]",
!isHidden
);

}

};

window.refreshEditProfileInitials =
function(){
const first =
document.getElementById(
"editProfileName"
)?.value || "";

const surname =
document.getElementById(
"editProfileSurname"
)?.value || "";

window.__EDIT_PROFILE_INITIALS__ =
computeInitials(first, surname);

/* Only refresh the fallback text — never
   clobber a photo preview. */
const box =
document.getElementById(
"editProfilePreview"
);

if(
box &&
!box.classList.contains("has-photo")
){
box.textContent =
window.__EDIT_PROFILE_INITIALS__;
}

};

window.onEditAvatarSelected =
async function(input){

const file =
input?.files?.[0];

if(!file){
return;
}

if(
!EDIT_PROFILE_ALLOWED_TYPES.includes(
file.type
)
){

toast(
"Only JPG, PNG and WEBP images are allowed"
);

input.value = "";

return;

}

if(
file.size > EDIT_PROFILE_MAX_SIZE
){

toast(
"Image must be smaller than 5MB"
);

input.value = "";

return;

}

/* PHASE 1 — validate the ACTUAL file content,
   not just the browser-reported MIME type.
   Rejects ZIPs renamed to .jpg/.png, documents,
   executables and other non-image files. */

const validation =
await validateImageFile(
file,
{
maxSize: EDIT_PROFILE_MAX_SIZE,
allowedTypes: EDIT_PROFILE_ALLOWED_TYPES
}
);

if(!validation.ok){

toast(validation.error);

input.value = "";

return;

}

editProfilePendingFile = file;
editProfileRemoveRequested = false;

const reader =
new FileReader();

reader.onload = function(ev){

editProfilePendingUrl =
ev.target.result;

renderEditProfilePreview();

};

reader.readAsDataURL(file);

/* Allow re-selecting the same file later */
input.value = "";

};

window.removeEditAvatarPhoto =
function(){

if(
editProfilePendingFile ||
editProfilePendingUrl
){

/* Cancel a pending (not yet saved) selection */
editProfilePendingFile = null;
editProfilePendingUrl = null;

}else{

/* Mark the saved picture for removal */
editProfileRemoveRequested = true;

}

renderEditProfilePreview();

};

window.closeEditProfileModal =
function(){

/* PHASE 4 — detach the modal Escape handler
   when the modal closes so a later Escape does
   not fire against a removed DOM node. */
if(window.__EDIT_PROFILE_ESC_HANDLER__){

document.removeEventListener(
"keydown",
window.__EDIT_PROFILE_ESC_HANDLER__
);

window.__EDIT_PROFILE_ESC_HANDLER__ = null;

}

const modal =
document.getElementById(
"editProfileModalOverlay"
);

if(modal){
modal.remove();
}

editProfilePendingFile = null;
editProfilePendingUrl = null;
editProfileRemoveRequested = false;
editProfileSaving = false;

/* PHASE 3 — drop any in-progress MFA enrollment
   when the profile modal closes. The TOTP secret
   leaves memory and the abandoned UNVERIFIED
   factor is removed best-effort so nothing
   dangles. */
resetMfaEnrollment();

/* Restore the exact pre-open body state so an
   open mobile drawer keeps its scroll lock. */
document.body.style.overflow =
window.__EDIT_PROFILE_PREV_OVERFLOW__ ?? "";

document.body.style.touchAction =
window.__EDIT_PROFILE_PREV_TOUCH__ ?? "";

};

/* =========================================
PHASE 3 — MFA (TWO-FACTOR AUTHENTICATION)
Compact security section inside the shared
Edit Profile modal. Enrollment and removal use
the existing Supabase Auth MFA APIs only
(mfa.enroll / mfa.challenge / mfa.verify /
mfa.listFactors / mfa.unenroll) — no custom
TOTP logic and no new dependencies.

Security notes:
• The TOTP secret and QR image exist ONLY in
  the DOM of the enrollment step and in the
  single in-flight enrollment object below.
  They are never logged and never written to
  localStorage, sessionStorage or the database.
• Challenge ids live in memory for the
  duration of one attempt only and are never
  logged.
• Only a factor with status "verified" is
  treated as enabled MFA (see
  getVerifiedTotpFactor in js/api.js). An
  unverified enrollment is never shown — or
  enforced — as enabled.
========================================= */

let mfaEnrollment = null;
let mfaRemoveArmed = false;
let mfaSectionBusy = false;

async function renderMfaSection(){

const section =
document.getElementById("mfaSection");

if(!section){
return;
}

section.innerHTML = `
<p class="mfa-status-loading">Checking two-factor authentication…</p>
`;

let factor = null;

try{
factor = await getVerifiedTotpFactor();
}catch(err){
factor = null;
}

/* The modal can be closed while the factor list
   was loading — bail out instead of re-mounting
   stale UI. */
if(!document.getElementById("mfaSection")){
return;
}

if(factor){
renderMfaEnabledState(section);
}else if(mfaEnrollment){
renderMfaEnrollmentState(section);
}else{
renderMfaOffState(section);
}

}

function renderMfaOffState(section){

if(!section){
return;
}

section.innerHTML = `

${mfaHeaderHtml()}

<div class="mfa-panel mfa-off-panel">

<p class="mfa-status-line"><span class="mfa-dot mfa-dot-off"></span>Not enabled</p>

<p class="mfa-desc">
Require a verification code from an authenticator app (such as Google Authenticator) each time you sign in. Optional, but strongly recommended.
</p>

<div class="mfa-actions">

<button
type="button"
class="mfa-btn-primary"
onclick="startMfaEnrollment()"
>
Enable Two-Factor Authentication
</button>

</div>

<div id="mfaError" class="mfa-alert hidden" role="alert"></div>

</div>

`;

/* No enrollment is open — keep the modal at
   its normal profile width. */
setEditProfileModalMfaClass(false);

}

function renderMfaEnrollmentState(section){

if(!section){
return;
}

section.innerHTML = `

${mfaHeaderHtml()}

<div class="mfa-setup-panel">

<div class="mfa-setup-intro">

<p class="mfa-title mfa-title-sub">Finish Setting Up Two-Factor Authentication</p>

<p class="mfa-desc">
Scan the QR code below with your authenticator app, then enter the 6-digit code to finish enabling MFA.
</p>

</div>

<div class="mfa-setup-grid">

<div class="mfa-setup-scan">

<div
class="mfa-qr-box"
id="mfaQrBox"
role="img"
aria-label="Authenticator QR code"
></div>

<p class="mfa-hint">Works with Google Authenticator, Authy and other authenticator apps.</p>

</div>

<div class="mfa-setup-steps">

<ol class="mfa-steps">

<li>Open your authenticator app and scan the QR code.</li>

<li>Can't scan? Enter this key manually:<br><code class="mfa-secret" id="mfaSecretText"></code></li>

<li>Enter the current 6-digit code from the app below.</li>

</ol>

<label
for="mfaEnrollCode"
class="mfa-otp-label"
>
6-Digit Verification Code
</label>

<input
id="mfaEnrollCode"
type="text"
inputmode="numeric"
pattern="[0-9]*"
autocomplete="one-time-code"
enterkeyhint="go"
maxlength="6"
autocapitalize="off"
autocorrect="off"
spellcheck="false"
placeholder="000000"
class="mfa-otp"
aria-describedby="mfaEnrollHint"
onkeydown="if(event.key==='Enter'){event.preventDefault();confirmMfaEnrollment();}"
>

<p class="mfa-otp-hint" id="mfaEnrollHint">The code refreshes every 30 seconds.</p>

</div>

</div>

<div class="mfa-setup-actions">

<button
type="button"
class="mfa-btn-primary"
onclick="confirmMfaEnrollment()"
>
Verify &amp; Enable
</button>

<button
type="button"
class="mfa-btn-ghost"
onclick="cancelMfaEnrollment()"
>
Cancel MFA Setup
</button>

</div>

<div id="mfaError" class="mfa-alert hidden" role="alert"></div>

</div>

`;

/* The QR code is an SVG data URI returned by
   Supabase. It is assigned through the img src
   property (never interpolated into HTML) and
   the secret is set via textContent. Neither
   is ever logged or stored anywhere else. */
const qrBox =
document.getElementById("mfaQrBox");

if(qrBox && mfaEnrollment?.qrCode){

const img =
document.createElement("img");

img.alt =
"Two-factor authentication QR code";

img.src =
mfaEnrollment.qrCode;

qrBox.appendChild(img);

}

const secretEl =
document.getElementById(
"mfaSecretText"
);

if(secretEl && mfaEnrollment?.secret){
secretEl.textContent =
mfaEnrollment.secret;
}

/* PHASE 4 — give the two-column setup room by
   temporarily widening the modal (desktop). */
setEditProfileModalMfaClass(true);

/* PHASE 4 — focus the code field so mobile
   keyboards open ready to type. */
const codeInput =
document.getElementById(
"mfaEnrollCode"
);

if(codeInput){
setTimeout(()=>{
codeInput.focus({ preventScroll:false });
codeInput.select();
}, 80);
}

}

function renderMfaEnabledState(section){

if(!section){
return;
}

section.innerHTML = `

${mfaHeaderHtml()}

<div class="mfa-enabled-panel">

<div class="mfa-enabled-head">

<span class="mfa-dot mfa-dot-on" aria-hidden="true"></span>

<div>

<p class="mfa-status-title">Two-Factor Authentication is on</p>

<p class="mfa-status-sub">Authenticator app · verification code required at sign-in</p>

</div>

</div>

${
mfaRemoveArmed ? `

<p class="mfa-desc">
After removal, only your password will be needed at sign-in. Remove two-factor authentication?
</p>

<div class="mfa-actions">

<button
type="button"
class="mfa-btn-danger"
onclick="removeMfaFactor()"
>
Yes, Remove It
</button>

<button
type="button"
class="mfa-btn-ghost"
onclick="cancelMfaRemove()"
>
Keep It Enabled
</button>

</div>

` : `

<p class="mfa-desc">
A verification code from your authenticator app is required each time you sign in. To switch or stop using MFA, remove it below first.
</p>

<div class="mfa-actions">

<button
type="button"
class="mfa-btn-danger"
onclick="removeMfaFactor()"
>
Remove Two-Factor Authentication
</button>

</div>

`
}

<div id="mfaError" class="mfa-alert hidden" role="alert"></div>

</div>

`;

/* No enrollment is open — keep the modal at
   its normal profile width. */
setEditProfileModalMfaClass(false);

}

function mfaHeaderHtml(){

return `

<div class="mfa-header">

<svg xmlns="http://www.w3.org/2000/svg" class="mfa-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">

<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />

</svg>

<p class="mfa-title">Two-Factor Authentication</p>

</div>

`;

}

/* PHASE 4 — widen the desktop modal while the
   two-column MFA enrollment setup is open.
   Mobile is deliberately unchanged (full width). */
function setEditProfileModalMfaClass(on){

const dialog =
document.getElementById(
"editProfileModalDialog"
);

if(dialog){
dialog.classList.toggle(
"edit-profile-modal-mfa-open",
!!on
);
}

}

/* ---- PHASE 3 MFA ACTIONS ---- */

window.startMfaEnrollment =
async function(){

if(mfaSectionBusy || mfaEnrollment){
return;
}

if(
typeof supabase.auth?.mfa?.enroll !==
"function"
){
showMfaError(
"Two-factor authentication is not available right now."
);
return;
}

mfaSectionBusy = true;
setMfaSectionBusy(true);

let enrollment = null;

try{
const { data } =
await supabase.auth.mfa.enroll({
factorType: "totp",
friendlyName: "HUFA Authenticator"
});
enrollment = data || null;
}catch(err){
enrollment = null;
}

mfaSectionBusy = false;
setMfaSectionBusy(false);

if(
!enrollment?.id ||
!enrollment?.totp?.qr_code
){
showMfaError(
"Two-factor authentication could not be started. Please try again."
);
return;
}

/* Held in memory for this enrollment attempt
   only — dropped on success, cancel or modal
   close. Never logged, never persisted. */
mfaEnrollment = {
factorId: enrollment.id,
qrCode: enrollment.totp.qr_code,
secret: enrollment.totp.secret
};

hideMfaError();

renderMfaEnrollmentState(
document.getElementById("mfaSection")
);

};

window.confirmMfaEnrollment =
async function(){

if(mfaSectionBusy || !mfaEnrollment){
return;
}

const codeInput =
document.getElementById(
"mfaEnrollCode"
);

const code =
(codeInput?.value || "").replace(/\s+/g, "");

/* Empty or malformed submissions are rejected
   before anything is sent to Supabase. */
if(!/^\d{6}$/.test(code)){
showMfaError(
"Enter the current 6-digit code from your authenticator app."
);
return;
}

mfaSectionBusy = true;
setMfaSectionBusy(true);

/* A fresh challenge per attempt; the challenge
   id is kept in memory for this attempt only. */
let challengeId = null;

try{
const { data } =
await supabase.auth.mfa.challenge({
factorId: mfaEnrollment.factorId
});
challengeId = data?.id || null;
}catch(err){
challengeId = null;
}

if(!challengeId){
mfaSectionBusy = false;
setMfaSectionBusy(false);
showMfaError(
"Verification failed. Please try again."
);
return;
}

let verifyError = null;

try{
const { error } =
await supabase.auth.mfa.verify({
factorId: mfaEnrollment.factorId,
challengeId,
code
});
verifyError = error || null;
}catch(err){
verifyError = err;
}

mfaSectionBusy = false;
setMfaSectionBusy(false);

if(verifyError){
showMfaError(
describeMfaError(verifyError)
);
return;
}

/* Verified — only NOW is MFA treated as
   enabled. The enrollment payload (including
   the TOTP secret) is dropped immediately. */
mfaEnrollment = null;

toast(
"Two-factor authentication enabled"
);

renderMfaSection();

};

window.cancelMfaEnrollment =
function(){

const pending = mfaEnrollment;

mfaEnrollment = null;
mfaRemoveArmed = false;

hideMfaError();

renderMfaSection();

/* Best-effort cleanup: remove the abandoned,
   UNVERIFIED factor so nothing dangles. An
   unverified factor was never treated as
   enabled MFA. */
if(pending?.factorId){
unenrollQuietly(pending.factorId);
}

};

window.removeMfaFactor =
async function(){

if(mfaSectionBusy){
return;
}

/* Two-step confirm so a stray tap cannot
   disable the second factor. */
if(!mfaRemoveArmed){
mfaRemoveArmed = true;
hideMfaError();
renderMfaSection();
return;
}

const factor =
await getVerifiedTotpFactor();

if(!factor){
mfaRemoveArmed = false;
renderMfaSection();
return;
}

mfaSectionBusy = true;
setMfaSectionBusy(true);

let removeError = null;

try{
const { error } =
await supabase.auth.mfa.unenroll({
factorId: factor.id
});
removeError = error || null;
}catch(err){
removeError = err;
}

mfaSectionBusy = false;
setMfaSectionBusy(false);
mfaRemoveArmed = false;

if(removeError){
showMfaError(
describeMfaError(removeError)
);
return;
}

toast(
"Two-factor authentication removed"
);

renderMfaSection();

};

window.cancelMfaRemove =
function(){

mfaRemoveArmed = false;

hideMfaError();

renderMfaSection();

};

function setMfaSectionBusy(busy){

const section =
document.getElementById("mfaSection");

if(!section){
return;
}

section.querySelectorAll("button")
.forEach((btn)=>{
btn.disabled = !!busy;
});

section.classList.toggle(
"mfa-busy",
!!busy
);

/* PHASE 4 — announce the busy state to
   assistive technology. */
section.setAttribute(
"aria-busy",
busy ? "true" : "false"
);

}

function showMfaError(message){

const box =
document.getElementById("mfaError");

if(!box){
return;
}

box.textContent = message;
box.classList.remove("hidden");

}

function hideMfaError(){

const box =
document.getElementById("mfaError");

if(!box){
return;
}

box.textContent = "";
box.classList.add("hidden");

}

/* Drop any in-progress enrollment state and
   remove the abandoned UNVERIFIED factor
   best-effort. Used when the modal closes. */
function resetMfaEnrollment(){

const pending = mfaEnrollment;

mfaEnrollment = null;
mfaRemoveArmed = false;
mfaSectionBusy = false;

if(pending?.factorId){
unenrollQuietly(pending.factorId);
}

}

function unenrollQuietly(factorId){

try{
supabase.auth.mfa.unenroll({
factorId
}).catch(()=>{});
}catch(err){
/* cleanup stays best-effort */
}

}

/* ---------- PHASE 19 — EDIT PROFILE LOADING
   STATE ---------- */

/* Accurate loading text for the running
   operation: uploading a first photo, replacing
   an existing one, removing it, or a plain
   details save. */
function editProfileLoadingText(){

if(editProfilePendingFile){
return editProfileCurrentAvatarUrl
? "Updating photo..."
: "Uploading photo...";
}

if(editProfileRemoveRequested){
return "Removing photo...";
}

return "Saving changes...";

}

/* HUFA-styled loading overlay. It covers the
   whole screen above the Edit Profile modal so
   no control underneath can be triggered while
   an operation is processing. */
function showEditProfileLoading(text){

hideEditProfileLoading();

const overlay =
document.createElement("div");

overlay.id = "editProfileLoadingOverlay";

overlay.className =
"fixed inset-0 z-[10000] flex items-center justify-center p-4";

overlay.setAttribute("role","alert");

overlay.setAttribute("aria-live","assertive");

overlay.innerHTML = `

<div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

<div class="
relative
bg-white
rounded-[28px]
shadow-2xl
px-8
py-7
flex
flex-col
items-center
gap-4
max-w-[90vw]
">

<span class="edit-profile-spinner" aria-hidden="true"></span>

<p class="text-sm font-bold text-[#0A192F] text-center">
${text}
</p>

</div>

`;

document.body.appendChild(overlay);

}

function hideEditProfileLoading(){

const overlay =
document.getElementById(
"editProfileLoadingOverlay"
);

if(overlay){
overlay.remove();
}

}

/* Disable every image/save control while an
   operation runs so nothing can be triggered
   twice. Always re-enabled on success or
   failure. */
function setEditProfileControlsDisabled(disabled){

const uploadLabel =
document.getElementById(
"editProfileUploadLabel"
);

const removeBtn =
document.getElementById(
"editProfileRemoveBtn"
);

const fileInput =
document.getElementById(
"editProfileFileInput"
);

const saveBtn =
document.getElementById(
"editProfileSaveBtn"
);

const cancelBtn =
document.getElementById(
"editProfileCancelBtn"
);

[
uploadLabel,
removeBtn,
saveBtn,
cancelBtn
].forEach((el)=>{

if(!el){
return;
}

if(disabled){

el.classList.add(
"dashboard-modal-chip-disabled"
);

el.setAttribute(
"aria-disabled",
"true"
);

if(el.tagName === "BUTTON"){
el.disabled = true;
}

}else{

el.classList.remove(
"dashboard-modal-chip-disabled"
);

el.removeAttribute("aria-disabled");

if(el.tagName === "BUTTON"){
el.disabled = false;
}

}

});

if(fileInput){
fileInput.disabled = !!disabled;
}

}

/* Validation / early-exit helper — releases the
   Phase 19 lock and restores the save button
   without ever showing the loading overlay. */
function abortEditProfileSave(){

editProfileSaving = false;

const btn =
document.getElementById(
"editProfileSaveBtn"
);

if(btn){
btn.disabled = false;
btn.innerText = "Save Changes";
}

}

async function deleteProfileImageObject(url){

try{

if(!url){
return;
}

const marker =
"/object/public/profile-images/";

const idx =
url.indexOf(marker);

if(idx === -1){
return;
}

const path =
decodeURIComponent(
url.slice(idx + marker.length)
);

if(!path){
return;
}

await supabase.storage
.from("profile-images")
.remove([path]);

}catch(err){

/* Non-fatal — old objects are harmless */

}

}

window.saveEditProfile = async function(){

if(editProfileSaving){
return;
}

/* PHASE 19 — lock the operation immediately so a
   double-click during the pre-save lookups can
   never start a second upload/remove. */
editProfileSaving = true;

const nameInput =
document.getElementById(
"editProfileName"
);

const surnameInput =
document.getElementById(
"editProfileSurname"
);

/* PHASE 18A — read the existing dealership
   name field (dealer accounts only). */
const dealershipInput =
document.getElementById(
"editProfileDealership"
);

/* PHASE 2 — dealer-only contact + social
   fields. Read defensively: the elements only
   exist for dealer accounts. */

const dealerEmailInput =
document.getElementById(
"editProfileDealerEmail"
);

const dealerPhoneInput =
document.getElementById(
"editProfileDealerPhone"
);

const dealerAddressInput =
document.getElementById(
"editProfileDealerAddress"
);

const dealerEmail =
dealerEmailInput?.value?.trim() || "";

const dealerPhone =
dealerPhoneInput?.value?.trim() || "";

const dealerAddress =
dealerAddressInput?.value?.trim() || "";

/* PHASE 2 — normalized social map, filled
   during dealer validation below. Null for
   private sellers (never sent to the DB). */

let normalizedSocialLinks = null;

const socialLinks = {};

for(const p of PHASE2_SOCIAL_PLATFORMS){

const input =
document.getElementById(
`editSocialInput-${p.id}`
);

socialLinks[p.id] =
input?.value?.trim() || "";

}

const firstName =
nameInput?.value?.trim() || "";

const surname =
surnameInput?.value?.trim() || "";

if(!firstName && !surname){

abortEditProfileSave();

toast(
"Please enter your name"
);

return;

}

const user =
await getAuthUser();

if(!user){

abortEditProfileSave();

toast(
"Please sign in again"
);

return;

}

/* Existing account-type logic decides whether
   the dealership field participates in the
   save. Private sellers keep their stored
   dealership_name untouched. */
const currentProfile =
await getUserProfile();

const isDealerAccount =
currentProfile?.account_type === "dealer";

const dealershipName =
dealershipInput?.value?.trim() || "";

if(
isDealerAccount &&
!dealershipName
){

abortEditProfileSave();

toast(
"Please enter your dealership name"
);

return;

}

/* PHASE 2 — validate the dealer contact +
   social fields. Only runs for dealer
   accounts; private sellers skip entirely. */

if(isDealerAccount){

/* Populated below with the normalized
   social map (empty platforms removed). */

normalizedSocialLinks = {};

/* Dealership email — valid email format. */

if(
dealerEmail &&
!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dealerEmail)
){

abortEditProfileSave();

toast(
"Please enter a valid dealership email address"
);

return;

}

/* Dealership phone — digits, spaces, dashes
   and an optional leading + allowed; must
   contain 7–15 digits. */

if(dealerPhone){

const phoneDigits =
dealerPhone.replace(/[^\d]/g, "");

const phoneAllowed =
/^\+?[\d\s\-()]{7,20}$/.test(dealerPhone);

if(
!phoneAllowed ||
phoneDigits.length < 7 ||
phoneDigits.length > 15
){

abortEditProfileSave();

toast(
"Please enter a valid dealership phone number (7–15 digits)"
);

return;

}

}

/* Social links — per-platform validation +
   normalization (handles become full URLs;
   WhatsApp stores digits only). */

normalizedSocialLinks = {};

for(const p of PHASE2_SOCIAL_PLATFORMS){

const result =
normalizeEditSocialValue(
p.id,
socialLinks[p.id]
);

if(!result.ok){

abortEditProfileSave();

toast(result.error);

return;

}

if(result.value){
normalizedSocialLinks[p.id] = result.value;
}

}

}

/* PHASE 19 — show the loading state immediately
   with text that matches the running operation
   (uploading / updating / removing). Every image
   and save control stays disabled until the
   operation has completely finished. */
showEditProfileLoading(
editProfileLoadingText()
);

setEditProfileControlsDisabled(true);

try{

const updates = {

name: firstName || null,

surname: surname || null

};

/* PHASE 18A — persist to the EXISTING
   profiles.dealership_name column. First Name
   and Surname above remain fully preserved. */
if(isDealerAccount){
updates.dealership_name = dealershipName;

/* PHASE 2 — persist the dealer contact +
   social fields. The normalized social map
   is always written (removed platforms are
   cleared); contact fields only when the
   inputs exist. Private sellers never
   touch these columns. */

updates.dealership_email =
dealerEmail || null;

updates.phone =
dealerPhone || null;

updates.dealership_address =
dealerAddress || null;

updates.social_links =
normalizedSocialLinks || {};
}

if(editProfilePendingFile){

/* Upload the new picture to the user's own
   folder inside the profile-images bucket. */
const extension =
(
editProfilePendingFile.name
.split(".")
.pop() || "jpg"
).toLowerCase();

const filePath =
`${user.id}/avatar-${Date.now()}.${extension}`;

const { error:uploadError } =
await supabase.storage
.from("profile-images")
.upload(
filePath,
editProfilePendingFile,
{
cacheControl:"3600",
upsert:false
}
);

if(uploadError){

/* PHASE 18G — full diagnostic detail goes to
   the browser console only. The user-facing
   toast stays clean. No credentials or tokens
   are ever logged. */
console.error(
"[EDIT PROFILE] Photo upload failed — Supabase Storage error:",
{
message:
uploadError.message ||
String(uploadError),

statusCode:
uploadError.statusCode ??
uploadError.status ??
null,

error:
uploadError.error ??
uploadError.name ??
null,

bucket: "profile-images",

path: filePath,

hint:
"Application expects an existing PUBLIC bucket named 'profile-images' with Storage RLS allowing INSERT/UPDATE/DELETE for authenticated users whose folder (first path segment) equals auth.uid(). If this error is 403/404 or 'Bucket not found', the cause is Supabase Storage configuration — not application code."
}
);

throw new Error("UPLOAD_FAILED");

}

const { data:urlData } =
supabase.storage
.from("profile-images")
.getPublicUrl(filePath);

updates.avatar_url =
urlData?.publicUrl || null;

if(
editProfileCurrentAvatarUrl
){
await deleteProfileImageObject(
editProfileCurrentAvatarUrl
);
}

}else if(
editProfileRemoveRequested
){

updates.avatar_url = null;

if(
editProfileCurrentAvatarUrl
){
await deleteProfileImageObject(
editProfileCurrentAvatarUrl
);
}

}

const { error:dbError } =
await supabase
.from("profiles")
.update(updates)
.eq("id", user.id);

if(dbError){

/* PHASE 18G — diagnostic detail in console
   only; clean message shown to the user. */
console.error(
"[EDIT PROFILE] Profile update failed — Supabase DB error:",
{
message:
dbError.message ||
String(dbError),

code:
dbError.code ?? null,

details:
dbError.details ?? null,

hint:
"Application updates the existing public.profiles row (id = auth.uid()) setting name/surname/dealership_name/avatar_url. A 42501/RLS error here indicates database RLS configuration — not application code."
}
);

throw new Error("DB_FAILED");

}

/* Refresh the shared auth/profile cache and
   re-hydrate the sidebar immediately so the
   new picture and name appear at once. */
clearAuthCache();

await hydrateDashboardProfile();

closeEditProfileModal();

toast("Profile updated");

}catch(err){

console.error(
"Edit profile save failed:",
err
);

toast(
err?.message === "UPLOAD_FAILED"
? "Photo upload failed — please try again"
: err?.message === "DB_FAILED"
? "Could not save your profile — please try again"
: "Could not save your profile — please try again"
);

}finally{

editProfileSaving = false;

/* PHASE 19 — the loading state always clears and
   every control is re-enabled, whether the
   operation succeeded or failed. On success the
   modal is already closed, so this is a safe
   no-op there. */
hideEditProfileLoading();

setEditProfileControlsDisabled(false);

const btn =
document.getElementById(
"editProfileSaveBtn"
);

if(btn){
btn.disabled = false;
btn.innerText = "Save Changes";
}

}

};

export function DashboardPage(){

setTimeout(async () => {

if(
window.__DASHBOARD_BOOTING__ ||
window.__DASHBOARD_LOADING__
){
return;
}

window.__DASHBOARD_BOOTING__ = true;
window.__DASHBOARD_LOADING__ = true;

try{

const profile =
await getUserProfile();

/* =========================================
ROLE-AWARE DASHBOARD ROUTING
=========================================
If the authenticated user has the admin
role, the dashboard experience stays ADMIN
across /dashboard, /dashboard/private,
/dashboard/dealer, /dashboard/* — via
navigation, refresh and direct URLs.
Determined from the existing profiles.role
lookup (js/api.js getUserProfile). */

if(profile?.role === "admin"){

navigate("/admin");

return;

}

const savedView =
sessionStorage.getItem("dashboardView")
|| "overview";

window.__CURRENT_DASHBOARD_VIEW__ =
savedView;

await loadView(savedView, true);

}finally{

window.__DASHBOARD_BOOTING__ = false;
window.__DASHBOARD_LOADING__ = false;

}

}, 0);

  return renderDashboardShell({
    mobileTitle: "Overview",
    content: `

<!-- MAIN VIEW -->
<div
id="dashboardView"
class="
min-w-0
w-full
overflow-x-hidden
relative
">

<!-- Initial skeleton state: shown immediately on first paint so the
     dashboard never displays an empty content area before the active
     view loads. loadView() replaces this with the real view. -->
${renderDashboardViewSkeleton()}

</div>
    `
  });

}

/* ====================== */
/* 🔥 PLAN LIMIT SYSTEM */
/* ====================== */


/* ====================== */

async function loadDashboard(){

const user =
await getAuthUser();

if(!user){

navigate("/login");

return;

}

/* PERFORMANCE 
   Realtime channel setup no longer BLOCKS the dashboard shell:
   it starts now and is awaited in the background, while the
   profile fetch (the first thing the UI needs) runs immediately.
   A realtime failure is logged but never blocks rendering. */

const realtimeSettled =
Promise.allSettled([
startDashboardRealtime()
]);

Promise.resolve(realtimeSettled).then(([r])=>{

if(r && r.status === "rejected"){

console.warn("[dashboard] realtime setup failed:", r.reason);

}

});

const profile = await getUserProfile();

if(!profile){

const dashboardView =
document.getElementById("dashboardView");

if(dashboardView){

dashboardView.innerHTML = `

<div class="
rounded-[24px]
border
border-red-500/20
bg-red-500/5
p-6
text-center
text-red-400
">

Unable to load user profile

</div>

`;

}

return;

}

/* ====================== */
/* DASHBOARD USER UI */
/* ====================== */


const userName =
document.getElementById(
"dashboardUserName"
);

const userType =
document.getElementById(
"dashboardUserType"
);

if(profile){


if(userName){

userName.innerText =
`${profile.name || ""} ${profile.surname || ""}`.trim()
|| "User";

}

if(userType){

userType.innerText =
profile.account_type === "dealer"
? (
profile.dealership_name ||
"Dealership"
)
: "Private Seller";

}

/* ====================== */
/* TOPBAR USER CARD */
/* ====================== */

const topbarName =
document.getElementById(
"dashboardTopbarName"
);

const topbarSubtext =
document.getElementById(
"dashboardTopbarSubtext"
);

if(topbarName){

topbarName.innerText =
`${profile.name || ""} ${profile.surname || ""}`
.trim() || "User";

}

if(topbarSubtext){

topbarSubtext.innerText =
profile.account_type === "dealer"
? (
profile.dealership_name ||
"Dealership Account"
)
: "Private Seller";

}

/* ====================== */
/* SIDEBAR PROFILE */
/* ====================== */

const sidebarName =
document.getElementById(
"dashboardSidebarName"
);

const sidebarType =
document.getElementById(
"dashboardSidebarType"
);

const sidebarAvatar =
document.getElementById(
"dashboardSidebarAvatar"
);

if(sidebarName){

sidebarName.innerText =
`${profile.name || ""} ${profile.surname || ""}`
.trim() || "User";

}

if(sidebarType){

sidebarType.innerText =
profile.account_type === "dealer"
? (
profile.dealership_name ||
"Dealership"
)
: "Private Seller";

}

if(sidebarAvatar){

const initials =
`${(profile.name || "H")[0]}${(profile.surname || "A")[0]}`
.toUpperCase();

sidebarAvatar.innerText =
initials || "HA";

}

}

if(!profile){
  document.getElementById("dashboardView").innerHTML = `
    <div class="card p-6 text-center">
      <p class="text-red-500 mb-3">Profile not found</p>
      <button
onclick="location.reload()"
class="
rounded-xl
bg-[#005BBF]
hover:bg-[#004FA8]
text-white
px-4
py-2
text-sm
font-medium
transition
">
        Reload
      </button>
    </div>
  `;
  return;
}


/* ====================== */
/* 🔥 SAFE PLAN HANDLING */
/* ====================== */

const sub = await getUserSubscription();

const plan = sub?.name || "Private Basic";
const limit = await getUserLimit();

/* ====================== */
/* 🔥 PLAN BOX */
/* ====================== */

const planBox = `

<div class="card p-4 md:p-6">

<h2 class="font-bold mb-3">
Your Plan
</h2>

<p class="text-lg font-semibold capitalize">
${plan}
</p>

<div class="flex gap-2 mt-4">

<button onclick="goUpload()"
class="btn btn-gold">
Upload Vehicle
</button>

<button onclick="goSell()"
class="
rounded-xl
bg-[#005BBF]
hover:bg-[#004FA8]
text-white
px-4
py-2
text-sm
font-medium
transition
">
Upgrade Plan
</button>

</div>

</div>
`;

/* ====================== */
/* ADMIN */
/* ====================== */

if(profile.role === "admin"){
navigate("/admin");
return;
}

/* ====================== */
/* DEALER */
/* ====================== */

if(profile.account_type === "dealer"){
renderDealer(user, planBox);
return;
}

/* ====================== */
/* PRIVATE */
/* ====================== */

renderPrivate(user, planBox);

}

/* ====================== */
/* PRIVATE DASHBOARD */
/* ====================== */

async function renderPrivate(user, planBox){

const { data:apps } =
await supabase
.from("finance_applications")
.select("*")
.eq("user_id", user.id)
.order("created_at",{ascending:false});

let html = `

${planBox}

<div class="grid md:grid-cols-2 gap-6">

<div class="card p-6">

<h2 class="font-bold mb-3">
Finance Eligibility
</h2>

<p class="text-sm text-gray-500 mb-3">
View your affordability, eligibility and finance readiness
</p>

<button onclick="goCredit()" class="btn btn-gold w-full">
View Finance Eligibility
</button>

</div>

<div class="card p-6">

<h2 class="font-bold mb-3">
Notifications
</h2>

<div id="dashboardNotifications" class="space-y-2 text-sm">
${renderNotificationSkeletons(3)}
</div>

</div>

</div>

<div class="grid md:grid-cols-2 gap-6">

<div class="card p-6">

<h2 class="font-bold mb-3">
My Finance Applications
</h2>

`;

/* 🔥 SAFE CHECK */
if(!apps || !apps.length){
html += "<p>No applications</p>";
}else{

(apps || []).forEach(a=>{
html += `
<div class="border-b py-2">

<b>
${a.vehicle_make || ""}
${a.vehicle_model || ""}
</b>

<p>
R ${Number(a.price || 0).toLocaleString()}
</p>

<p>
Status:
<span class="text-gold font-semibold">
${a.status || "pending"}
</span>
</p>

</div>
`;
});

}

html += `</div>`;

/* QUICK ACTIONS */

html += `

<div class="card p-6">

<h2 class="font-bold mb-3">
Quick Actions
</h2>

<button onclick="goBrowse()" class="btn btn-dark w-full mb-2">
Browse
</button>

<button onclick="goSaved()" class="btn btn-dark w-full mb-2">
Saved
</button>

<button onclick="goVehicles()" class="btn btn-dark w-full">
My Vehicles
</button>

</div>

</div>
`;

const dashboardView =
document.getElementById("dashboardView");

if(!dashboardView) return;

dashboardView.innerHTML = html;

setTimeout(loadDashboardNotifications, 100);

}

/* ====================== */
/* DEALER DASHBOARD */
/* ====================== */

async function renderDealer(user, planBox){

/* ================= */
/* LOAD VEHICLES */
/* ================= */

const { data:vehicles } =
await supabase
.from("vehicles")
.select("*")
.eq("seller_id", user.id);

/* 🔥 SAFE CHECK */
if(!vehicles || !vehicles.length){

const dashboardView =
document.getElementById("dashboardView");

if(!dashboardView) return;

dashboardView.innerHTML =
planBox + "<p>No vehicles yet</p>";

return;
}

/* ================= */
/* LOAD ENQUIRIES */
/* ================= */

const { data:enquiries } =
await supabase
.from("enquiries")
.select("*")
.eq("seller_id", user.id)
.order("created_at",{ascending:false});

/* ================= */
/* 🔥 NEW: VEHICLE IDS */
/* ================= */

const vehicleIds =
(vehicles || [])
.map(v => v?.id)
.filter(Boolean);

/* ================= */
/* 🔥 ANALYTICS LOAD (FILTERED) */
/* ================= */

const { data:views } =
await supabase
.from("vehicle_views")
.select("vehicle_id")
.in("vehicle_id", vehicleIds);

const { data:saves } =
await supabase
.from("saved_vehicles")
.select("vehicle_id")
.in("vehicle_id", vehicleIds);

const { data:enqCounts } =
await supabase
.from("enquiries")
.select("vehicle_id")
.eq("seller_id", user.id);

/* ================= */
/* 🔥 SAFE AGGREGATION */
/* ================= */

function countBy(list){
const map = {};
(list || []).forEach(x=>{
map[x.vehicle_id] = (map[x.vehicle_id] || 0) + 1;
});
return map;
}

const viewMap = countBy(views || []);
const saveMap = countBy(saves || []);
const enquiryMap = countBy(enqCounts || []);

/* ================= */
/* UI */
/* ================= */

let html = `

${planBox}

<div class="
space-y-4
md:space-y-6
">

<div class="card p-6">

<h2 class="font-bold mb-4">
Vehicle Performance Analytics
</h2>

<p class="text-gray-500 mb-6">
Track engagement, interest, saves, enquiries and vehicle activity.
</p>

`;

(vehicles || []).forEach(v=>{

html += `

<div class="border-b py-4">

<b>
${v.make || ""}
${v.model ? " " + v.model : ""}
</b>

<div class="
grid
grid-cols-2
sm:grid-cols-3
gap-3
mt-3
text-sm
">

<div>
<p class="text-gray-500">Views</p>
<p class="font-bold">${viewMap[v.id] || 0}</p>
</div>

<div>
<p class="text-gray-500">Saves</p>
<p class="font-bold">${saveMap[v.id] || 0}</p>
</div>

<div>
<p class="text-gray-500">Enquiries</p>
<p class="font-bold">${enquiryMap[v.id] || 0}</p>
</div>

</div>

</div>

`;

});

html += `</div>`;

/* ================= */
/* EXISTING ENQUIRIES UI */
/* ================= */

html += `

<div class="card p-6">

<h2 class="font-bold mb-4">
Customer Enquiries
</h2>

`;

/* 🔥 SAFE CHECK */
if(!enquiries || !enquiries.length){

html += "<p>No enquiries yet</p>";

}else{

(enquiries || []).forEach(e=>{

html += `

<div class="border-b py-4">

<div class="
flex
flex-col
md:flex-row
md:items-center
justify-between
gap-4
">

<div>

<b>${e.name || "Unknown"}</b>

<p class="text-sm text-gray-500">
${e.email || "-"}
</p>

<p class="text-sm">
${e.phone || "-"}
</p>

</div>

<div>

<span class="text-xs px-2 py-1 rounded bg-[#f5f1e6] border border-[#E48A2F]/30">
${e.status || "new"}
</span>

</div>

</div>

<p class="mt-2 text-sm">
${e.message || ""}
</p>

<div class="
flex
flex-col
sm:flex-row
flex-wrap
gap-2
mt-4
">

<button onclick="updateLead('${e.id}','contacted')"
class="btn btn-dark">
Contacted
</button>

<button onclick="updateLead('${e.id}','interested')"
class="btn btn-dark">
Interested
</button>

<button onclick="updateLead('${e.id}','negotiating')"
class="btn btn-dark">
Negotiating
</button>

<button onclick="updateLead('${e.id}','closed')"
class="btn btn-gold">
Closed
</button>

</div>

</div>

`;

});

}

html += `</div>`;

/* ================= */
/* APPLICATIONS */
/* ================= */

const { data:apps } =
await supabase
.from("finance_applications")
.select("*")
.eq("seller_id", user.id)
.order("created_at",{ascending:false});

html += `

<div class="card p-6">

<h2 class="font-bold mb-4">
Finance Applications
</h2>

`;

/* 🔥 SAFE CHECK */
if(!apps || !apps.length){

html += "<p>No applications</p>";

}else{

(apps || []).forEach(a=>{

html += `

<div class="border-b py-3">

<b>
${a.vehicle_make || ""}
${a.vehicle_model ? " " + a.vehicle_model : ""}
</b>

<p>
Buyer:
${a.name || ""}
${a.surname ? " " + a.surname : ""}
</p>

<p>
Score: ${a.credit_score || "N/A"}
</p>

<p>
Status:
<span class="text-gold font-semibold">
${a.status || "pending"}
</span>
</p>

</div>

`;

});

}

html += `</div>`;

html += `</div>`;

const dashboardView =
document.getElementById("dashboardView");

if(!dashboardView) return;

dashboardView.innerHTML = html;

}

/* ====================== */
/* LEAD STATUS UPDATE */
/* ====================== */

window.saveLeadNote = async function(leadId){

const note =
document
.getElementById("crmNewNote")
?.value
?.trim();

if(!note) return;

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user) return;

const user =
userData.user;

const { data, error } =
await supabase
.from("crm_notes")
.insert({

lead_id: leadId,

dealer_id: user.id,

note

})
.select();

if(error){

alert(
"Failed to save note"
);

return;

}

await openLeadNotes(leadId);
await loadCRMNotifications();

if(window.__CURRENT_OPEN_LEAD_ID__){
await openLeadNotes(leadId);

const noteBox =
document.getElementById("crmNewNote");

if(noteBox){
noteBox.value = "";
}
}else{
  await loadCRMLeads();
}

};

window.updateLead = async function(id, status){

try{

const btns = document.querySelectorAll(
`[onclick="updateLead('${id}','contacted')"],
 [onclick="updateLead('${id}','interested')"],
 [onclick="updateLead('${id}','negotiating')"],
 [onclick="updateLead('${id}','closed')"]`
);

btns.forEach(btn=>{

btn.disabled = true;

});

const { data:existingLead } =
await supabase
.from("enquiries")
.select("*")
.eq("id", id)
.single();

if(!existingLead){

throw new Error(
"Lead not found"
);

}

const oldStatus =
existingLead.status || "new";

const { error:updateError } =
await supabase
.from("enquiries")
.update({
status: status
})
.eq("id", id);

if(updateError){

throw updateError;

}

console.log(
"Lead status updated:",
oldStatus,
"→",
status
);

/* =====================================
OPTIONAL HISTORY LOG
===================================== */

try{

await supabase
.from("crm_status_history")
.insert({

lead_id: id,

old_status: oldStatus,

new_status: status

});

}catch(historyError){

console.warn(
"History insert skipped:",
historyError
);

}

/* =====================================
OPTIONAL NOTIFICATION
===================================== */

try{

const { data:userData } =
await supabase.auth.getUser();

if(userData?.user){

await supabase
.from("crm_notifications")
.insert({

lead_id: id,

dealer_id:
userData.user.id,

title:
"Lead Status Updated",

message:
`${oldStatus} → ${status}`

});

}

}catch(notificationError){

console.warn(
"Notification insert skipped:",
notificationError
);

}

/* =====================================
REFRESH CURRENT SCREEN
===================================== */

if(
window.__CURRENT_OPEN_LEAD_ID__ === id
){

await openLeadDetails(id);

}

await loadCRMLeads();

try{

await loadCRMNotifications();

}catch(e){

console.warn(e);

}

}catch(err){

console.error(
"Lead update failed:",
err
);

alert(
"Failed to update lead status"
);

}finally{

const btns = document.querySelectorAll(
`[onclick="updateLead('${id}','contacted')"],
 [onclick="updateLead('${id}','interested')"],
 [onclick="updateLead('${id}','negotiating')"],
 [onclick="updateLead('${id}','closed')"]`
);

btns.forEach(btn=>{

btn.disabled = false;

});

}

};

window.deleteLead = async function(leadId){

  if(!confirm("Delete this lead?")){
    return;
  }

  try{

    console.log("Deleting lead:", leadId);

    await supabase
      .from("crm_notes")
      .delete()
      .eq("lead_id", leadId);

    await supabase
      .from("crm_tasks")
      .delete()
      .eq("lead_id", leadId);

    await supabase
      .from("crm_status_history")
      .delete()
      .eq("lead_id", leadId);

    await supabase
      .from("crm_notifications")
      .delete()
      .eq("lead_id", leadId);

    const { error } = await supabase
      .from("enquiries")
      .delete()
      .eq("id", leadId);

    if(error){
      throw error;
    }

    window.__CURRENT_OPEN_LEAD_ID__ = null;

    await loadCRMLeads();

  }catch(err){

    console.error("DELETE LEAD ERROR:", err);

    alert(
      err?.message ||
      "Failed to delete lead"
    );

  }

};
/* ====================== */
/* NAV */
/* ====================== */

window.goBrowse = () =>
navigate("/browse");

window.goSaved = () =>
navigate("/saved");

window.goCredit = () => navigate("/credit");

window.goVehicles = () =>
navigate("/my-vehicles");

window.goUpload = () => {

/* Match loadView(): close the mobile slide-in
   menu before navigating (no-op on desktop) */
if(window.innerWidth < 1280){
  toggleDashboardSidebar(false);
}

navigate("/upload-vehicle");

};

window.goMessages = () => {

/* Match loadView(): close the mobile slide-in
   menu before navigating (no-op on desktop) */
if(window.innerWidth < 1280){
  toggleDashboardSidebar(false);
}

navigate("/messages");

};

/* =========================================
DASHBOARD DEEP-LINK (PHASE 14)
Used by the shared dashboard sidebar when it is
rendered on standalone dealer pages
(/upload-vehicle, /messages). Opens the normal
dashboard pre-set to the requested view via the
existing saved-view boot mechanism.
========================================= */

window.goDashboardView = function(view){

try{
sessionStorage.setItem("dashboardView", view);
}catch(err){}

navigate("/dashboard");

};

window.openTradeInModal = async function(){

const { data:{ user } } =
await supabase.auth.getUser();

if(user){

const { data:profile } =
await supabase
.from("profiles")
.select("account_type")
.eq("id", user.id)
.single();

if(profile?.account_type === "dealer"){

alert(
"Dealers cannot create trade-in requests."
);

return;

}

}

if(window.editingTradeInIndex === undefined){

window.__TRADE_IN_IMAGES__ = [];

}

const existing =
document.getElementById("tradeInModalOverlay");

if(existing){

return;

}

document.body.insertAdjacentHTML(
"beforeend",
`


<div
id="tradeInModalOverlay"
class="
fixed
inset-0
bg-black/60
backdrop-blur-sm
z-[9999]
flex
items-center
justify-center
p-4
"
onclick="closeTradeInModal(event)"
>

<div
class="
bg-white
rounded-[28px]
shadow-2xl
w-full
max-w-3xl
p-6
max-h-[90vh]
overflow-y-auto
"
onclick="event.stopPropagation()"
>

<div class="flex items-center justify-between mb-6">

<h2 class="text-2xl font-bold">
${window.editingTradeInIndex !== undefined
? "Edit Trade-In Request"
: "Start Trade-In Request"}
</h2>

<button
onclick="closeTradeInModal()"
class="btn btn-dark">
Close
</button>

</div>

<div class="
border
border-gray-200
rounded-2xl
p-4
mb-5
bg-gray-50
">

<div class="
flex
flex-col
md:flex-row
gap-4
">

<img
id="tradeInSummaryImage"
src="${PLACEHOLDER}"
alt="Vehicle Photo"
class="
w-full
md:w-40
h-28
rounded-xl
object-cover
"
/>

<div class="flex-1">

<h3 class="font-bold text-lg mb-3">
Vehicle Summary
</h3>

<div class="
grid
grid-cols-2
gap-3
text-sm
">

<div>
<span class="text-gray-500">Make</span>
<div id="tradeInSummaryMake">—</div>
</div>

<div>
<span class="text-gray-500">Model</span>
<div id="tradeInSummaryModel">—</div>
</div>

<div>
<span class="text-gray-500">Year</span>
<div id="tradeInSummaryYear">—</div>
</div>

<div>
<span class="text-gray-500">Mileage</span>
<div id="tradeInSummaryMileage">—</div>
</div>

<div>
<span class="text-gray-500">Condition</span>
<div id="tradeInSummaryCondition">
—
</div>
</div>

</div>

</div>

</div>

</div>

<div class="grid md:grid-cols-2 gap-4">

<input
id="tradeInMake"
type="text"
placeholder="Vehicle Make"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
bg-white
"
/>

<input
id="tradeInModel"
type="text"
placeholder="Vehicle Model"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
bg-white
"
/>

<input
id="tradeInYear"
type="number"
placeholder="Year"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
bg-white
"
/>

<input
id="tradeInMileage"
type="number"
placeholder="Mileage"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
bg-white
"
/>

<input
id="tradeInRegistration"
type="text"
placeholder="Registration Number (Optional)"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
bg-white
"
/>

<div>

<label class="block mb-2 font-medium">
Vehicle Condition
</label>

<input
type="hidden"
id="tradeInCondition"
value=""
/>

<div
id="tradeInConditionCards"
class="
grid
grid-cols-2
gap-3
"
>

<button
type="button"
data-condition="Excellent"
onclick="selectTradeInCondition(this)"
class="
trade-condition-card
border
border-gray-300
rounded-xl
p-3
text-left
bg-white
"
>
<div class="font-semibold">
Excellent
</div>
<div class="text-sm text-gray-500">
Like new condition
</div>
</button>

<button
type="button"
data-condition="Good"
onclick="selectTradeInCondition(this)"
class="
trade-condition-card
border
border-gray-300
rounded-xl
p-3
text-left
bg-white
"
>
<div class="font-semibold">
Good
</div>
<div class="text-sm text-gray-500">
Minor wear and tear
</div>
</button>

<button
type="button"
data-condition="Fair"
onclick="selectTradeInCondition(this)"
class="
trade-condition-card
border
border-gray-300
rounded-xl
p-3
text-left
bg-white
"
>
<div class="font-semibold">
Fair
</div>
<div class="text-sm text-gray-500">
Visible age and use
</div>
</button>

<button
type="button"
data-condition="Poor"
onclick="selectTradeInCondition(this)"
class="
trade-condition-card
border
border-gray-300
rounded-xl
p-3
text-left
bg-white
"
>
<div class="font-semibold">
Poor
</div>
<div class="text-sm text-gray-500">
Requires attention
</div>
</button>

</div>

</div>

</div>

<div class="mt-4">

<label class="font-semibold block mb-2">
Vehicle Photos
</label>

<input
id="tradeInImages"
type="file"
accept="image/jpeg,image/jpg,image/png,image/webp"
multiple
class="dashboard-search-input w-full"
/>

<p
id="tradeInImageCount"
class="text-sm text-gray-500 mt-2"
>
0 / 10 photos selected
</p>

</div>

<div
id="tradeInImagePreview"
class="
grid
grid-cols-2
md:grid-cols-4
gap-3
mt-4
">
</div>

<div class="mt-4">

<label class="block mb-2 font-medium">
Accident History
</label>

<input
type="hidden"
id="tradeInAccidentHistory"
value=""
/>

<div
class="
grid
grid-cols-2
gap-3
"
>

<button
type="button"
data-accident="None"
onclick="selectTradeInAccident(this)"
class="
trade-accident-card
border
border-gray-300
rounded-xl
p-3
text-left
bg-white
"
>
<div class="font-semibold">None</div>
<div class="text-sm text-gray-500">
No known accident history
</div>
</button>

<button
type="button"
data-accident="Minor"
onclick="selectTradeInAccident(this)"
class="
trade-accident-card
border
border-gray-300
rounded-xl
p-3
text-left
bg-white
"
>
<div class="font-semibold">Minor</div>
<div class="text-sm text-gray-500">
Minor repairs recorded
</div>
</button>

<button
type="button"
data-accident="Major"
onclick="selectTradeInAccident(this)"
class="
trade-accident-card
border
border-gray-300
rounded-xl
p-3
text-left
bg-white
"
>
<div class="font-semibold">Major</div>
<div class="text-sm text-gray-500">
Significant accident damage
</div>
</button>

<button
type="button"
data-accident="Unknown"
onclick="selectTradeInAccident(this)"
class="
trade-accident-card
border
border-gray-300
rounded-xl
p-3
text-left
bg-white
"
>
<div class="font-semibold">Unknown</div>
<div class="text-sm text-gray-500">
History not available
</div>
</button>

</div>

</div>

<div class="mt-4">

<label class="block mb-2 font-medium">
Service History
</label>

<input
type="hidden"
id="tradeInServiceHistory"
value=""
/>

<div
class="
grid
grid-cols-2
gap-3
"
>

<button
type="button"
data-service="Full"
onclick="selectTradeInService(this)"
class="
trade-service-card
border
border-gray-300
rounded-xl
p-3
text-left
bg-white
"
>
<div class="font-semibold">Full</div>
<div class="text-sm text-gray-500">
Complete service records
</div>
</button>

<button
type="button"
data-service="Partial"
onclick="selectTradeInService(this)"
class="
trade-service-card
border
border-gray-300
rounded-xl
p-3
text-left
bg-white
"
>
<div class="font-semibold">Partial</div>
<div class="text-sm text-gray-500">
Some service records available
</div>
</button>

<button
type="button"
data-service="None"
onclick="selectTradeInService(this)"
class="
trade-service-card
border
border-gray-300
rounded-xl
p-3
text-left
bg-white
"
>
<div class="font-semibold">None</div>
<div class="text-sm text-gray-500">
No service records available
</div>
</button>

<button
type="button"
data-service="Unknown"
onclick="selectTradeInService(this)"
class="
trade-service-card
border
border-gray-300
rounded-xl
p-3
text-left
bg-white
"
>
<div class="font-semibold">Unknown</div>
<div class="text-sm text-gray-500">
Service history unknown
</div>
</button>

</div>

</div>

<div class="mt-4">

<label class="block mb-2 font-medium">
Vehicle Information
</label>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4">

<div>
<label class="block text-sm mb-2">
Modifications
</label>

<textarea
id="tradeInModifications"
placeholder="List any modifications..."
class="
w-full
min-h-[100px]
border
border-gray-300
rounded-xl
px-4
py-3
bg-white
"
></textarea>
</div>

<div>
<label class="block text-sm mb-2">
Mechanical Issues
</label>

<textarea
id="tradeInMechanicalIssues"
placeholder="Describe any known issues..."
class="
w-full
min-h-[100px]
border
border-gray-300
rounded-xl
px-4
py-3
bg-white
"
></textarea>
</div>

<div>
<label class="block text-sm mb-2">
Extras
</label>

<textarea
id="tradeInExtras"
placeholder="Accessories, upgrades, extras..."
class="
w-full
min-h-[100px]
border
border-gray-300
rounded-xl
px-4
py-3
bg-white
"
></textarea>
</div>

<div>
<label class="block text-sm mb-2">
Trade Preferences
</label>

<textarea
id="tradeInPreferences"
placeholder="Preferred dealers, trade expectations..."
class="
w-full
min-h-[100px]
border
border-gray-300
rounded-xl
px-4
py-3
bg-white
"
></textarea>
</div>

</div>

<div class="mt-6">

<label class="block mb-3 font-medium">
Select Dealerships
</label>

<div
class="
grid
grid-cols-1
md:grid-cols-2
gap-3
"
>

<div
class="
mt-6
border
border-gray-200
rounded-2xl
p-5
bg-gray-50
"
>

<div class="font-semibold mb-3">
Review Trade-In Request
</div>

<div class="text-sm text-gray-600 mb-4">
Review all information before submitting your trade-in request.
</div>

<div
class="
grid
grid-cols-1
md:grid-cols-2
gap-3
text-sm
"
>

<div>
<strong>Vehicle:</strong>
<span id="reviewVehicleSummary">—</span>
</div>

<div>
<strong>Condition:</strong>
<span id="reviewCondition">—</span>
</div>

<div>
<strong>Accident History:</strong>
<span id="reviewAccidentHistory">—</span>
</div>

<div>
<strong>Service History:</strong>
<span id="reviewServiceHistory">—</span>
</div>

<div>
<strong>Images:</strong>
<span id="reviewImageCount">0 Photos</span>
</div>


</div>

</div>

</div>

</div>

<div class="
flex
justify-end
gap-3
mt-6
">

<button
onclick="closeTradeInModal()"
class="btn btn-dark">
Cancel
</button>

<button
onclick="submitTradeInRequest()"
class="dashboard-primary-btn">
${window.editingTradeInIndex !== undefined
? "Update Trade-In Request"
: "Submit Trade-In Request"}
</button>

</div>

</div>

</div>

`
);

};

window.closeTradeInModal = function(){

window.__TRADE_IN_IMAGES__ = [];
window.__TRADE_IN_IMAGE_FILES__ = [];

const modal =
document.getElementById(
"tradeInModalOverlay"
);

if(modal){
modal.remove();
}

};

window.selectTradeInCondition =
function(button){

document
.querySelectorAll(
".trade-condition-card"
)
.forEach(card=>{

card.classList.remove(
  "border-[#E48A2F]",
  "border-[3px]",
  "bg-[#FFF4D6]",
  "shadow-lg",
  "ring-2",
  "ring-[#E48A2F]"
);

card.style.transform = "";

});

button.classList.add(
  "border-[#E48A2F]",
  "border-[3px]",
  "bg-[#FFF4D6]",
  "shadow-lg",
  "ring-2",
  "ring-[#E48A2F]"
);

button.style.transform = "scale(1.02)";

const input =
document.getElementById(
"tradeInCondition"
);

if(input){

input.value =
button.dataset.condition;

}

const review =
document.getElementById(
"reviewCondition"
);

if(review){

review.textContent =
button.dataset.condition;

}

};

window.selectTradeInAccident =
function(button){

document
.querySelectorAll(
".trade-accident-card"
)
.forEach(card=>{

card.classList.remove(
  "border-[#E48A2F]",
  "border-[3px]",
  "bg-[#FFF4D6]",
  "shadow-lg",
  "ring-2",
  "ring-[#E48A2F]"
);

card.style.transform = "";

});

button.classList.add(
  "border-[#E48A2F]",
  "border-[3px]",
  "bg-[#FFF4D6]",
  "shadow-lg",
  "ring-2",
  "ring-[#E48A2F]"
);

button.style.transform = "scale(1.02)";
const input =
document.getElementById(
"tradeInAccidentHistory"
);

if(input){

input.value =
button.dataset.accident;

}

const review =
document.getElementById(
"reviewAccidentHistory"
);

if(review){

review.textContent =
button.dataset.accident;

}

};

window.selectTradeInService =
function(button){

document
.querySelectorAll(
".trade-service-card"
)
.forEach(card=>{

card.classList.remove(
  "border-[#E48A2F]",
  "border-[3px]",
  "bg-[#FFF4D6]",
  "shadow-lg",
  "ring-2",
  "ring-[#E48A2F]"
);

card.style.transform = "";

});

button.classList.add(
  "border-[#E48A2F]",
  "border-[3px]",
  "bg-[#FFF4D6]",
  "shadow-lg",
  "ring-2",
  "ring-[#E48A2F]"
);

button.style.transform = "scale(1.02)";

const input =
document.getElementById(
"tradeInServiceHistory"
);

if(input){

input.value =
button.dataset.service;

}

const review =
document.getElementById(
"reviewServiceHistory"
);

if(review){

review.textContent =
button.dataset.service;

}

};

document.addEventListener(
"input",
function(e){

const make =
document.getElementById("tradeInMake");

const model =
document.getElementById("tradeInModel");

const year =
document.getElementById("tradeInYear");

const mileage =
document.getElementById("tradeInMileage");

const makeBox =
document.getElementById("tradeInSummaryMake");

const modelBox =
document.getElementById("tradeInSummaryModel");

const yearBox =
document.getElementById("tradeInSummaryYear");

const mileageBox =
document.getElementById("tradeInSummaryMileage");

if(make && makeBox){
makeBox.textContent =
make.value || "—";
}

if(model && modelBox){
modelBox.textContent =
model.value || "—";
}

if(year && yearBox){
yearBox.textContent =
year.value || "—";
}

if(mileage && mileageBox){
mileageBox.textContent =
mileage.value || "—";
}

const reviewVehicle =
document.getElementById(
"reviewVehicleSummary"
);

if(
reviewVehicle &&
make &&
model &&
year
){
reviewVehicle.textContent =
[
make.value,
model.value,
year.value
]
.filter(Boolean)
.join(" ") || "—";
}

}
);



window.__TRADE_IN_IMAGES__ =
window.__TRADE_IN_IMAGES__ || [];

window.__TRADE_IN_IMAGE_FILES__ =
window.__TRADE_IN_IMAGE_FILES__ || [];

document.addEventListener(
"change",
async function(e){

if(
e.target &&
e.target.id === "tradeInImages"
){

const preview =
document.getElementById(
"tradeInImagePreview"
);

if(!preview) return;

const newFiles =
Array.from(e.target.files || []);

console.log(
"FILES RECEIVED:",
newFiles.map(f => f.name)
);

e.target.value = "";

const summaryImage =
document.getElementById(
"tradeInSummaryImage"
);

const summaryPlaceholder =
document.getElementById(
"tradeInSummaryPlaceholder"
);

if(
summaryImage &&
summaryPlaceholder &&
window.__TRADE_IN_IMAGES__.length === 0 &&
newFiles.length > 0
){

const reader =
new FileReader();

reader.onload = function(ev){

summaryImage.src =
ev.target.result;

summaryImage.classList.remove(
"hidden"
);

summaryPlaceholder.classList.add(
"hidden"
);

};

reader.readAsDataURL(
newFiles[0]
);

}

for(const file of newFiles){

const allowedTypes = [

"image/jpeg",
"image/jpg",
"image/png",
"image/webp"

];

if(
!allowedTypes.includes(file.type)
){

alert(
"Only JPG, PNG and WEBP images are allowed"
);

continue;
}

/* PHASE 1 — strict content validation.
   Rejects ZIPs (including renamed ones),
   documents and other non-image files. */

const validation =
await validateImageFile(
file,
{
maxSize: 10 * 1024 * 1024,
allowedTypes: allowedTypes
}
);

if(!validation.ok){

alert(validation.error);

continue;
}

if(file.size > 10 * 1024 * 1024){

alert(
"Each image must be smaller than 10MB"
);

continue;
}

const exists =
window.__TRADE_IN_IMAGE_FILES__.some(
existing =>
existing.name === file.name &&
existing.size === file.size &&
existing.lastModified === file.lastModified
);

if(!exists){

window.__TRADE_IN_IMAGE_FILES__.push(file);

}

}

if(
window.__TRADE_IN_IMAGE_FILES__.length > 10
){

window.__TRADE_IN_IMAGE_FILES__ =
window.__TRADE_IN_IMAGE_FILES__.slice(
0,
10
);

alert(
"Maximum 10 photos allowed"
);

}

const files =
window.__TRADE_IN_IMAGE_FILES__;

preview.innerHTML = "";

const existingImages =
window.__TRADE_IN_IMAGES__ || [];

const totalImages =
existingImages.length +
files.length;

const countBox =
document.getElementById(
"tradeInImageCount"
);

if(countBox){
countBox.textContent =
`${totalImages} / 10 photos selected`;
}

const reviewImages =
document.getElementById(
"reviewImageCount"
);

if(reviewImages){

reviewImages.textContent =
`${totalImages} Photos`;

}

existingImages.forEach((image,index)=>{

preview.insertAdjacentHTML(
"beforeend",
`
<div class="
relative
aspect-square
overflow-hidden
rounded-xl
border
border-gray-200
">

<img
src="${image}"
class="
w-full
h-full
object-cover
"
/>

<button
type="button"
onclick="
window.__TRADE_IN_IMAGES__.splice(
${index},
1
);

this.parentElement.remove();

const count =
(window.__TRADE_IN_IMAGES__.length || 0)
+
(window.__TRADE_IN_IMAGE_FILES__.length || 0);

const countBox =
document.getElementById(
'tradeInImageCount'
);

if(countBox){
countBox.textContent =
count + ' / 10 photos selected';
}

const reviewImages =
document.getElementById(
'reviewImageCount'
);

if(reviewImages){
reviewImages.textContent =
count + ' Photos';
}
"
class="
absolute
top-2
right-2
w-7
h-7
rounded-full
bg-black/70
text-white
text-xs
flex
items-center
justify-center
"
>
✕
</button>

</div>
`
);

});

files.forEach(file=>{

const reader =
new FileReader();

reader.onload = function(ev){

preview.insertAdjacentHTML(
"beforeend",
`
<div class="
relative
aspect-square
overflow-hidden
rounded-xl
border
border-gray-200
">

<img
src="${ev.target.result}"
class="
w-full
h-full
object-cover
"
/>

<button
type="button"
onclick="
const card = this.parentElement;

const index =
Array.from(
card.parentElement.children
).indexOf(card);

window.__TRADE_IN_IMAGE_FILES__.splice(
index,
1
);

card.remove();

const count =
window.__TRADE_IN_IMAGE_FILES__.length;

const countBox =
document.getElementById(
'tradeInImageCount'
);

if(countBox){
countBox.textContent =
count + ' / 10 photos selected';
}

const reviewImages =
document.getElementById(
'reviewImageCount'
);

if(reviewImages){
reviewImages.textContent =
count + ' Photos';
}
"
class="
absolute
top-2
right-2
w-7
h-7
rounded-full
bg-black/70
text-white
text-xs
flex
items-center
justify-center
"
>
✕
</button>

</div>
`
);

};

reader.readAsDataURL(file);

});

}

}
);

window.manageVehicle = function(id){
  navigate("/manage-vehicle?id=" + id);
};

window.openTradeInGallery = function(images,startIndex = 0){

const existing =
document.getElementById(
"tradeInImageViewer"
);

if(existing){
existing.remove();
}

window.__TRADE_IN_GALLERY_IMAGES__ =
images || [];

window.__TRADE_IN_GALLERY_INDEX__ =
startIndex;

document.body.insertAdjacentHTML(
"beforeend",
`

<div
id="tradeInImageViewer"
class="
fixed
inset-0
bg-black/95
z-[999999]
flex
items-center
justify-center
"
>

<button
onclick="
document.getElementById(
'tradeInImageViewer'
).remove()
"
class="
absolute
top-6
right-6
z-50
bg-white
text-black
px-5
py-3
rounded-xl
font-semibold
"
>
Close
</button>

<button
onclick="changeTradeInGalleryImage(-1)"
class="
absolute
left-6
top-1/2
-translate-y-1/2
z-50
bg-white
text-black
w-16
h-16
rounded-full
text-4xl
font-bold
"
>
‹
</button>

<img
id="tradeInGalleryImage"
src="${images[startIndex]}"
class="
w-[95vw]
h-[95vh]
object-contain
rounded-2xl
shadow-2xl
"
/>

<button
onclick="changeTradeInGalleryImage(1)"
class="
absolute
right-6
top-1/2
-translate-y-1/2
z-50
bg-white
text-black
w-16
h-16
rounded-full
text-4xl
font-bold
"
>
›
</button>

<div
id="tradeInGalleryCounter"
class="
absolute
bottom-6
left-1/2
-translate-x-1/2
bg-black/70
text-white
px-4
py-2
rounded-xl
"
>
${startIndex + 1} / ${images.length}
</div>

</div>

`
);

};

window.changeTradeInGalleryImage =
function(direction){

const images =
window.__TRADE_IN_GALLERY_IMAGES__ || [];

if(!images.length) return;

let index =
window.__TRADE_IN_GALLERY_INDEX__ || 0;

index += direction;

if(index < 0){
index = images.length - 1;
}

if(index >= images.length){
index = 0;
}

window.__TRADE_IN_GALLERY_INDEX__ =
index;

const image =
document.getElementById(
"tradeInGalleryImage"
);

if(image){
image.src = images[index];
}

const counter =
document.getElementById(
"tradeInGalleryCounter"
);

if(counter){
counter.textContent =
`${index + 1} / ${images.length}`;
}

};

window.viewTradeInRequest = function(index){

const tradeInRequests =
window.__TRADE_IN_REQUESTS__ || [];

const sourceRequest =
tradeInRequests[index];

if(!sourceRequest){
return;
}

const {
id: currentUserId
} = (
window.__CURRENT_USER__ || {}
);

if(
sourceRequest?.user_id &&
currentUserId &&
sourceRequest.user_id !== currentUserId
){
alert("Unauthorized request");
return;
}

const request = {

...sourceRequest,

vehicleMake:
sourceRequest.vehicleMake ||
sourceRequest.vehicle_make,

vehicleModel:
sourceRequest.vehicleModel ||
sourceRequest.vehicle_model,

vehicleYear:
sourceRequest.vehicleYear ||
sourceRequest.vehicle_year,

registrationNumber:
sourceRequest.registrationNumber ||
sourceRequest.registration_number

};

const existing =
document.getElementById(
"tradeInViewModal"
);

if(existing){
existing.remove();
}

document.body.insertAdjacentHTML(
"beforeend",
`

<div
id="tradeInViewModal"
class="
fixed
inset-0
bg-black/60
backdrop-blur-sm
z-[99999]
flex
items-center
justify-center
p-4
"
onclick="this.remove()"
>

<div
class="
bg-white
rounded-[28px]
shadow-2xl
w-full
max-w-4xl
max-h-[90vh]
overflow-y-auto
p-6
"
onclick="event.stopPropagation()"
>

<div class="
flex
items-center
justify-between
mb-6
">

<h2 class="text-2xl font-bold">
Trade-In Request Details
</h2>

<button
onclick="
document.getElementById('tradeInViewModal').remove()
"
class="btn btn-dark">
Close
</button>

</div>

<div class="
grid
grid-cols-1
md:grid-cols-2
gap-4
">

<div><strong>Vehicle:</strong><br>
${request.vehicleYear} ${request.vehicleMake} ${request.vehicleModel}
</div>

<div><strong>Mileage:</strong><br>
${Number(request.mileage || 0).toLocaleString()} km
</div>

<div><strong>Condition:</strong><br>
${request.condition || "-"}
</div>

<div><strong>Status:</strong><br>
${
request.status === "Awaiting Responses"
?
`
<span class="
inline-flex
items-center
px-3
py-1
rounded-full
text-xs
font-semibold
bg-yellow-100
text-yellow-800
">
Awaiting Responses
</span>
`
:
request.status === "Valuation Received"
?
`
<span class="
inline-flex
items-center
px-3
py-1
rounded-full
text-xs
font-semibold
bg-blue-100
text-blue-800
">
Valuation Received
</span>
`
:
request.status === "Offer Received"
?
`
<span class="
inline-flex
items-center
px-3
py-1
rounded-full
text-xs
font-semibold
bg-purple-100
text-purple-800
">
Offer Received
</span>
`
:
request.status === "Accepted"
?
`
<span class="
inline-flex
items-center
px-3
py-1
rounded-full
text-xs
font-semibold
bg-green-100
text-green-800
">
Accepted
</span>
`
:
request.status === "Declined"
?
`
<span class="
inline-flex
items-center
px-3
py-1
rounded-full
text-xs
font-semibold
bg-red-100
text-red-800
">
Declined
</span>
`
:
request.status || "-"
}
</div>

<div><strong>Accident History:</strong><br>
${request.accidentHistory ||
request.accident_history ||
"-"}
</div>

<div><strong>Service History:</strong><br>
${request.serviceHistory ||
request.service_history || "-"}
</div>

<div><strong>Registration:</strong><br>
${request.registrationNumber ||
request.registration_number ||
"-"}
</div>

<div><strong>Images:</strong><br>
${request.imageCount || 0} Photo(s)
</div>

</div>

<div class="mt-6">

<h3 class="font-bold mb-3">
Vehicle Photos
</h3>

${
request.images &&
request.images.length
?
`
<div
class="
grid
grid-cols-2
md:grid-cols-4
gap-3
"
>

${request.images.map((image,index) => `

<img
src="${image}"
data-index="${index}"
onclick='openTradeInGallery(${JSON.stringify(request.images)}, ${index})'
class="
tradein-gallery-thumb
w-full
h-32
object-cover
rounded-xl
border
border-gray-200
cursor-pointer
hover:opacity-90
transition
"
/>

`).join("")}

</div>
`
:
`
<div
class="
border
border-dashed
border-gray-300
rounded-xl
p-8
bg-gray-50
text-center
"
>

<div class="
text-5xl
mb-3
">
📷
</div>

<div class="
font-semibold
text-gray-700
mb-2
">
No Images Uploaded
</div>

<div class="
text-sm
text-gray-500
">
This trade-in request does not contain any vehicle photos.
</div>

</div>
`
}

</div>

<div class="mt-6">

<h3 class="font-bold mb-2">
Modifications
</h3>

<div class="
border
border-gray-200
rounded-xl
p-4
bg-gray-50
">
${request.modifications?.trim()
? request.modifications
:
`
<span class="text-gray-500">
No modifications declared
</span>
`}
</div>

</div>

<div class="mt-4">

<h3 class="font-bold mb-2">
Mechanical Issues
</h3>

<div class="
border
border-gray-200
rounded-xl
p-4
bg-gray-50
">
${
request.mechanicalIssues ||
request.mechanical_issues
?
(
request.mechanicalIssues ||
request.mechanical_issues
)
:
"No mechanical issues declared"
}
</div>

</div>

<div class="mt-4">

<h3 class="font-bold mb-2">
Extras
</h3>

<div class="
border
border-gray-200
rounded-xl
p-4
bg-gray-50
">
${request.extras?.trim()
? request.extras
:
`
<span class="text-gray-500">
No extras listed
</span>
`}
</div>

</div>

<div class="mt-4">

<h3 class="font-bold mb-2">
Trade Preferences
</h3>

<div class="
border
border-gray-200
rounded-xl
p-4
bg-gray-50
">
${
request.tradePreferences ||
request.trade_preferences
?
(
request.tradePreferences ||
request.trade_preferences
)
:
`
<span class="text-gray-500">
No trade preferences specified
</span>
`
}
</div>

</div>

<div class="mt-4">


</div>

<div class="mt-6">

<h3 class="font-bold mb-3">
Dealer Valuations
</h3>

${
request.valuations &&
request.valuations.length
?
request.valuations.map(v => `
<div class="
border
${Number(v.amount) === Math.max(...request.valuations.map(x => Number(x.amount || 0)))
? "border-[#E48A2F] border-2 bg-[#FFF4D6]"
: "border-[#E48A2F]/30 bg-[#FFF9EC]"
}
rounded-xl
p-4
mb-3
">

<div class="
flex
justify-between
items-center
mb-2
">

<div>

${
Number(v.amount) === Math.max(...request.valuations.map(x => Number(x.amount || 0)))
?
`
<div class="
inline-block
mb-2
px-3
py-1
rounded-full
bg-[#E48A2F]
text-black
text-xs
font-bold
">
BEST OFFER
</div>
`
:
""
}

<div class="font-bold text-lg">
R ${Number(v.amount || 0).toLocaleString()}
</div>

</div>

<div class="text-sm text-gray-500">
${
v.submittedAt
? new Date(v.submittedAt)
    .toLocaleString("en-ZA")
: "-"
}
</div>

</div>

<div class="text-sm text-gray-700">
${v.notes || "No dealer notes provided"}
</div>

${
request.accepted_valuation_id === v.id
?
`
<div class="
mt-4
rounded-xl
bg-green-100
text-green-700
font-semibold
p-3
">
Offer Accepted
</div>
`
:
""
}

${
request.declined_valuation_id === v.id
?
`
<div class="
mt-4
rounded-xl
bg-red-100
text-red-700
font-semibold
p-3
">
Offer Declined
</div>
`
:
""
}

${
(v.negotiationHistory || []).length
?
`
<div class="
mt-4
border-t
pt-4
">

<h4 class="
font-bold
text-sm
mb-3
">
Negotiation Timeline
</h4>

${

(v.negotiationHistory || [])
.map(item => `

<div class="
mb-3
p-3
bg-gray-50
border
border-gray-200
rounded-xl
">

<div class="
font-semibold
text-sm
">
${item.type || "Update"}
</div>

<div class="
text-sm
mt-1
">
R ${Number(
item.amount || 0
).toLocaleString()}
</div>

${
item.message
?
`
<div class="
text-sm
text-gray-600
mt-1
">
${item.message}
</div>
`
:
""
}

<div class="
text-xs
text-gray-500
mt-2
">
${new Date(
item.createdAt
).toLocaleString("en-ZA")}
</div>

</div>

`).join("")

}

</div>
`
:
""
}

${
request.status !== "Accepted"
&&
request.status !== "Declined"
?
`
<div class="
grid
grid-cols-3
gap-2
mt-3
">

<button
onclick="acceptTradeInOffer('${request.id}','${v.id}')"
class="
dashboard-primary-btn
w-full
justify-center
"
>
Accept Offer
</button>

<button
onclick="declineTradeInOffer('${request.id}','${v.id}')"
class="
btn btn-dark
w-full
justify-center
"
>
Decline Offer
</button>

<button
onclick="openCounterOfferModal('${request.id}','${v.id}')"
class="
btn btn-dark
w-full
justify-center
"
>
Counter Offer
</button>

</div>

${
(v.negotiationHistory || []).length
&&
request.status !== "Accepted"
&&
request.status !== "Declined"
?
`
<div class="
grid
grid-cols-3
gap-2
mt-3
">

<button
onclick="dealerAcceptCounter('${request.id}','${v.id}')"
class="
dashboard-primary-btn
w-full
justify-center
"
>
Accept Counter
</button>

<button
onclick="dealerRejectCounter('${request.id}','${v.id}')"
class="
btn btn-dark
w-full
justify-center
"
>
Reject Counter
</button>

<button
onclick="dealerReviseOffer('${request.id}','${v.id}')"
class="
btn btn-dark
w-full
justify-center
"
>
Revise Offer
</button>

</div>
`
:
""
}

`
:
""
}

</div>
`).join("")
:
`
<div class="
border
border-dashed
border-gray-300
rounded-xl
p-8
bg-gray-50
text-center
">

<div class="
text-5xl
mb-3
">
📋
</div>

<div class="
font-semibold
text-gray-700
mb-2
">
No Dealer Valuations Yet
</div>

<div class="
text-sm
text-gray-500
">
Dealers have not submitted any valuations for this trade-in request yet.
</div>

</div>
`
}

</div>

<div class="mt-4 text-sm text-gray-500">

Created:
${
request.created_at || request.createdAt
? new Date(
request.created_at ||
request.createdAt
).toLocaleString("en-ZA")
: "-"
}

</div>

</div>

</div>

`
);

};

window.openTradeInValuationModal =
function(index){

console.log(
"VALUE BUTTON CLICKED",
index
);

console.log(
"TRADE INS",
window.__TRADE_IN_REQUESTS__
);

const tradeInRequests =
window.__TRADE_IN_REQUESTS__ || [];

const request =
tradeInRequests[index];

console.log(
"SELECTED REQUEST",
request
);

if(!request){

console.error(
"NO REQUEST FOUND FOR INDEX",
index
);

return;
}

if(
window.__CURRENT_USER__?.id &&
request.user_id ===
window.__CURRENT_USER__.id
){
alert("You cannot valuate your own trade-in request");
return;
}

const existing =
document.getElementById(
"tradeInValuationModal"
);

if(existing){
existing.remove();
}

document.body.insertAdjacentHTML(
"beforeend",
`

<div
id="tradeInValuationModal"
class="
fixed
inset-0
bg-black/60
z-[999999]
flex
items-center
justify-center
p-4
"
onclick="this.remove()"
>

<div
class="
bg-white
rounded-[28px]
p-6
w-full
max-w-2xl
"
onclick="event.stopPropagation()"
>

<h2 class="text-2xl font-bold mb-4">
Submit Valuation
</h2>

<div class="mb-4">

<p class="font-medium">
${request.vehicleYear || request.vehicle_year}
${request.vehicleMake || request.vehicle_make}
${request.vehicleModel || request.vehicle_model}
</p>

</div>

<input
id="valuationAmount"
type="number"
placeholder="Valuation Amount"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
mb-4
"
/>

<textarea
id="valuationNotes"
placeholder="Dealer Notes"
class="
w-full
min-h-[120px]
border
border-gray-300
rounded-xl
px-4
py-3
mb-4
"
></textarea>

<div class="flex justify-end gap-3">

<button
onclick="
document.getElementById(
'tradeInValuationModal'
).remove()
"
class="btn btn-dark">
Cancel
</button>

<button
onclick="
submitTradeInValuation(${index})
"
class="dashboard-primary-btn">
Submit Valuation
</button>

</div>

</div>

</div>

`
);

console.log(
"MODAL INSERTED"
);

};


window.submitTradeInRequest =
async function(){

  const make =
document.getElementById(
"tradeInMake"
)?.value?.trim();

const model =
document.getElementById(
"tradeInModel"
)?.value?.trim();

const year =
document.getElementById(
"tradeInYear"
)?.value?.trim();

const mileage =
document.getElementById(
"tradeInMileage"
)?.value?.trim();

const condition =
document.getElementById(
"tradeInCondition"
)?.value?.trim();

const accidentHistory =
document.getElementById(
"tradeInAccidentHistory"
)?.value?.trim();

const serviceHistory =
document.getElementById(
"tradeInServiceHistory"
)?.value?.trim();

const selectedDealers = [];

if(
!make ||
!model ||
!year ||
!mileage
){

alert(
"Please complete all vehicle details."
);

return;

}

if(!condition){

alert(
"Please select a vehicle condition."
);

return;

}

if(!accidentHistory){

alert(
"Please select accident history."
);

return;

}

if(!serviceHistory){

alert(
"Please select service history."
);

return;

}

if(
window.__TRADE_IN_IMAGE_FILES__.length === 0
){

alert(
"Please upload at least one vehicle photo."
);

return;

}

const tradeInRequest = {

id:
crypto.randomUUID(),

vehicleMake:
make,

vehicleModel:
model,

vehicleYear:
year,

mileage:
mileage,

condition:
condition,

accidentHistory:
accidentHistory,

serviceHistory:
serviceHistory,

registrationNumber:
document.getElementById(
"tradeInRegistration"
)?.value || "",

modifications:
document.getElementById(
"tradeInModifications"
)?.value || "",

mechanicalIssues:
document.getElementById(
"tradeInMechanicalIssues"
)?.value || "",

extras:
document.getElementById(
"tradeInExtras"
)?.value || "",

tradePreferences:
document.getElementById(
"tradeInPreferences"
)?.value || "",


imageCount: 0,

images:
[],

status:
"Awaiting Responses",

valuations: [],

createdAt:
new Date().toISOString()



};

/* valuation modal moved to global scope */

const uploadedImages = [];

const failedUploads = [];

let successfulUploads = 0;

for(
const file of
(window.__TRADE_IN_IMAGE_FILES__ || [])
){

try{

/* PHASE 1 — final guard before Supabase
   Storage: reject ZIPs and non-image files. */

const guard =
await validateImageFile(
file,
{
maxSize: 10 * 1024 * 1024,
allowedTypes: [
"image/jpeg",
"image/jpg",
"image/png",
"image/webp"
]
}
);

if(!guard.ok){

console.error(
"TRADE-IN IMAGE REJECTED",
guard.error
);

failedUploads.push(file.name);

continue;

}

const fileName =
`${crypto.randomUUID()}-${file.name}`;

const { error: uploadError } =
await supabase.storage
.from("tradein-images")
.upload(
fileName,
file
);

if(uploadError){

console.error(
"TRADE-IN IMAGE UPLOAD FAILED",
uploadError
);

failedUploads.push(
file.name
);

continue;

}

const { data:urlData } =
supabase.storage
.from("tradein-images")
.getPublicUrl(fileName);

uploadedImages.push(
urlData.publicUrl
);

successfulUploads++;

}catch(error){

console.error(
"UPLOAD EXCEPTION",
error
);

failedUploads.push(
file.name
);

}

}

if(
window.__TRADE_IN_IMAGE_FILES__.length > 0
&&
successfulUploads === 0
){

alert(
"All image uploads failed. Please try again."
);

return;

}

if(
failedUploads.length > 0
){

alert(
"Some images failed to upload:\n\n" +
failedUploads.join("\n")
);

}

(async () => {

const existingRequests =
window.__TRADE_IN_REQUESTS__ || [];

const editingIndex =
window.editingTradeInIndex;

if(
editingIndex !==
undefined
){

const existingImages =
existingRequests[
editingIndex
]?.images || [];

tradeInRequest.images = [

...existingImages,

...uploadedImages

];

tradeInRequest.imageCount =
tradeInRequest.images.length;

}else{

tradeInRequest.images =
uploadedImages;

tradeInRequest.imageCount =
uploadedImages.length;

}

const isEditing =
editingIndex !== undefined;

if(isEditing){

window.editingTradeInIndex =
undefined;

}

/* Supabase is source of truth */

try{

const {
data:userData
} =
await supabase.auth.getUser();

if(
!userData?.user
){
throw new Error(
"User not authenticated"
);
}

const currentUser =
userData.user;

let result;

if(isEditing){

const existing =
window.__TRADE_IN_REQUESTS__[
editingIndex
];

result =
await supabase
.from("trade_in_requests_v2")
.update({

vehicle_make:
tradeInRequest.vehicleMake,

vehicle_model:
tradeInRequest.vehicleModel,

vehicle_year:
Number(tradeInRequest.vehicleYear),

mileage:
Number(tradeInRequest.mileage),

registration_number:
tradeInRequest.registrationNumber,

condition:
tradeInRequest.condition,

accident_history:
tradeInRequest.accidentHistory,

service_history:
tradeInRequest.serviceHistory,

modifications:
tradeInRequest.modifications,

mechanical_issues:
tradeInRequest.mechanicalIssues,

extras:
tradeInRequest.extras,

trade_preferences:
tradeInRequest.tradePreferences,

images:
tradeInRequest.images,

image_count:
tradeInRequest.imageCount

})
.eq("id", existing.id)
.eq("user_id", currentUser.id);

}else{

result =
await supabase
.from("trade_in_requests_v2")
.insert({

user_id:
currentUser.id,

vehicle_make:
tradeInRequest.vehicleMake,

vehicle_model:
tradeInRequest.vehicleModel,

vehicle_year:
Number(tradeInRequest.vehicleYear),

mileage:
Number(tradeInRequest.mileage),

registration_number:
tradeInRequest.registrationNumber,

condition:
tradeInRequest.condition,

accident_history:
tradeInRequest.accidentHistory,

service_history:
tradeInRequest.serviceHistory,

modifications:
tradeInRequest.modifications,

mechanical_issues:
tradeInRequest.mechanicalIssues,

extras:
tradeInRequest.extras,

trade_preferences:
tradeInRequest.tradePreferences,

images:
tradeInRequest.images,

image_count:
tradeInRequest.imageCount,

valuations:[],

status:"Awaiting Responses"

});

}

const { error } = result;

if(error){

console.error(
"Trade-In Supabase Save Failed",
error
);

alert(
"Failed to save trade-in request. Please try again."
);

return;

}

console.log(
"TRADE-IN SAVE SUCCESS"
);

}catch(error){

console.error(
"Trade-In Supabase Save Failed",
error
);

alert(
"Failed to save trade-in request. Please try again."
);

return;

}

console.log(
"TRADE-IN SAVE COMPLETE",
{
isEditing,
images:
tradeInRequest.imageCount
}
);

alert(
isEditing
? "Trade-In Request updated successfully."
: "Trade-In Request submitted successfully."
);

closeTradeInModal();

window.__CURRENT_DASHBOARD_VIEW__ =
null;

window.loadView(
"tradeins",
true
);

})();
};

window.submitTradeInValuation =
async function(index){

const amount =
Number(
document.getElementById(
"valuationAmount"
)?.value
);

const notes =
document.getElementById(
"valuationNotes"
)?.value
?.trim();

if(
!Number.isFinite(amount) ||
amount <= 0
){

alert(
"Enter a valid valuation amount"
);

return;
}

const tradeInRequests =
window.__TRADE_IN_REQUESTS__ || [];

const request =
tradeInRequests[index];

if(!request){
return;
}

const {
data:{ user }
} = await supabase.auth.getUser();

if(!user){
return;
}

const {
data:profile
} = await supabase
.from("profiles")
.select("account_type")
.eq("id", user.id)
.single();

if(profile?.account_type !== "dealer"){
alert("Only dealers can submit valuations");
return;
}

if(request.user_id === user.id){
alert("You cannot valuate your own trade-in request");
return;
}

console.log(
"VALUATION TARGET:",
request
);

const valuation = {

id:
crypto.randomUUID(),

amount,
notes,

submittedAt:
new Date().toISOString(),

status:
"Pending",

negotiationHistory: []

};

const updatedValuations = [
...(request.valuations || []),
valuation
];

const {
data:updateResult,
error
} =
await supabase
.from(
"trade_in_requests_v2"
)
.update({

valuations:
JSON.parse(
JSON.stringify(
updatedValuations
)
),

status:
"Valuation Received"

})
.eq(
"id",
request.id
)
.select();

console.log(
"DATABASE VALUATIONS AFTER UPDATE",
updateResult?.[0]?.valuations
);

console.log(
"VALUATION UPDATE RESULT",
updateResult
);

console.log(
"VALUATION UPDATE ERROR",
error
);

console.log(
"VALUATION UPDATE RESULT",
updateResult
);

console.log(
"VALUATION UPDATE ERROR",
error
);

if(error){

console.error(
"VALUATION SAVE FAILED",
error
);

alert(
"Failed to submit valuation."
);

return;

}

document.getElementById(
"tradeInValuationModal"
)?.remove();

await supabase
.from("notifications")
.insert({

user_id:
request.user_id,

title:
"New Trade-In Valuation",

message:
`A dealer submitted a valuation of R ${amount.toLocaleString()}`,

type:
"tradein_valuation",

is_read:false

});

alert(
"Valuation submitted successfully."
);

window.loadView(
"tradeins",
true
);
};

window.acceptTradeInOffer =
async function(requestId, valuationId){

  console.log(
"ACCEPT OFFER START",
{
requestId,
valuationId
}
);

const {
data:{ user }
} = await supabase.auth.getUser();

if(!user){
return;
}

const {
data:profile
} = await supabase
.from("profiles")
.select("account_type")
.eq("id", user.id)
.single();

if(
profile?.account_type === "dealer"
){

alert(
"Dealers cannot accept customer offers"
);

return;

}

const request =
(window.__TRADE_IN_REQUESTS__ || [])
.find(r => r.id === requestId);

if(!request){
return;
}

if(request.user_id !== user.id){
alert("Only the trade-in owner can accept offers");
return;
}

const valuations =
request.valuations || [];

const updatedValuations =
valuations.map(v => ({

...v,

status:
v.id === valuationId
? "Accepted"
: v.status

}));

const {
error
} =
await supabase
.from("trade_in_requests_v2")
.update({

status:
"Accepted",

accepted_valuation_id:
valuationId,

valuations:
updatedValuations

})
.eq(
"id",
requestId
);

if(error){

console.error(
"ACCEPT FAILED",
error
);

alert(
"Failed to accept offer."
);

return;
}

document.getElementById(
"tradeInViewModal"
)?.remove();

await supabase
.from("notifications")
.insert({

user_id:
request.user_id,

title:
"Trade-In Offer Accepted",

message:
"Your trade-in offer has been accepted.",

type:
"tradein_accepted",

is_read:false

});

alert(
"Offer accepted"
);

window.loadView(
"tradeins",
true
);

};

window.declineTradeInOffer =
async function(requestId, valuationId){

  console.log(
"DECLINE OFFER START",
{
requestId,
valuationId
}
);

const {
data:{ user }
} = await supabase.auth.getUser();

if(!user){
return;
}

const request =
(window.__TRADE_IN_REQUESTS__ || [])
.find(r => r.id === requestId);

if(!request){
return;
}

if(request.user_id !== user.id){
alert("Unauthorized request");
return;
}

const updatedValuations =
(request.valuations || []).map(v => {

if(v.id !== valuationId){
return v;
}

return {
...v,
status:"Declined"
};

});

const { error } =
await supabase
.from("trade_in_requests_v2")
.update({

status:"Declined",

declined_valuation_id:
valuationId,

valuations:
updatedValuations

})
.eq(
"id",
requestId
);

if(error){

console.error(
"DECLINE FAILED",
error
);

alert(
"Failed to decline offer"
);

return;
}

document.getElementById(
"tradeInViewModal"
)?.remove();

await supabase
.from("notifications")
.insert({

user_id:
request.user_id,

title:
"Trade-In Offer Declined",

message:
"Your trade-in offer has been declined.",

type:
"tradein_declined",

is_read:false

});

alert(
"Offer declined"
);

window.loadView(
"tradeins",
true
);

};

window.openCounterOfferModal =
function(requestId, valuationId){

const existing =
document.getElementById(
"counterOfferModal"
);

if(existing){
existing.remove();
}

document.body.insertAdjacentHTML(
"beforeend",
`

<div
id="counterOfferModal"
class="
fixed
inset-0
bg-black/60
z-[999999]
flex
items-center
justify-center
p-4
"
onclick="this.remove()"
>

<div
class="
bg-white
rounded-[28px]
p-6
w-full
max-w-xl
"
onclick="event.stopPropagation()"
>

<h2 class="text-2xl font-bold mb-4">
Counter Offer
</h2>

<input
id="counterOfferAmount"
type="number"
placeholder="Requested Amount"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
mb-4
"
/>

<textarea
id="counterOfferMessage"
placeholder="Message"
class="
w-full
min-h-[120px]
border
border-gray-300
rounded-xl
px-4
py-3
mb-4
"
></textarea>

<div class="flex justify-end gap-3">

<button
onclick="
document.getElementById(
'counterOfferModal'
).remove()
"
class="btn btn-dark">
Cancel
</button>

<button
onclick="
submitCounterOffer(
'${requestId}',
'${valuationId}'
)
"
class="dashboard-primary-btn">
Submit
</button>

</div>

</div>

</div>

`
);

};

window.submitCounterOffer =
async function(requestId, valuationId){

  console.log(
"COUNTER OFFER START",
{
requestId,
valuationId
}
);

const {
data:{ user }
} = await supabase.auth.getUser();

if(!user){
return;
}

const amount =
Number(
document.getElementById(
"counterOfferAmount"
)?.value
);

const message =
document.getElementById(
"counterOfferMessage"
)?.value
?.trim();

if(
!Number.isFinite(amount) ||
amount <= 0
){

alert(
"Enter a valid counter offer amount"
);

return;
}

const request =
(window.__TRADE_IN_REQUESTS__ || [])
.find(r => r.id === requestId);

if(!request){
return;
}

if(request.user_id !== user.id){
alert("Unauthorized request");
return;
}

const updatedValuations =
(request.valuations || []).map(v => {

if(v.id !== valuationId){
return v;
}

return {

...v,

status:
"Negotiating",

negotiationHistory:[
...(v.negotiationHistory || []),
{
type:
"Counter Offer",
amount,
message,
createdAt:
new Date().toISOString()
}
]

};

});

const { error } =
await supabase
.from("trade_in_requests_v2")
.update({

status:
"Negotiating",

valuations:
updatedValuations

})
.eq(
"id",
requestId
);

if(error){

console.error(
"COUNTER OFFER FAILED",
error
);

return;
}

document.getElementById(
"counterOfferModal"
)?.remove();

await supabase
.from("notifications")
.insert({

user_id:
request.user_id,

title:
"Counter Offer Submitted",

message:
`Counter offer submitted for R ${amount.toLocaleString()}`,

type:
"tradein_counter",

is_read:false

});

alert(
"Counter offer submitted"
);

window.loadView(
"tradeins",
true
);

};

window.deleteTradeInRequest =
async function(index){

const {
data:{ user }
} = await supabase.auth.getUser();

if(!user){
return;
}

const request =
(window.__TRADE_IN_REQUESTS__ || [])[index];

if(!request){
return;
}

if(request.user_id !== user.id){
alert("Unauthorized request");
return;
}

if(
!confirm(
"Delete this trade-in request?"
)
){
return;
}

const { error } =
await supabase
.from("trade_in_requests_v2")
.delete()
.eq("id", request.id);

if(error){

console.error(
"DELETE FAILED",
error
);

alert(
"Failed to delete trade-in request"
);

return;
}

document.getElementById(
"tradeInViewModal"
)?.remove();

window.loadView(
"tradeins",
true
);

};

window.refreshTradeInCentre =
async function(){

console.log(
"MANUAL TRADE-IN REFRESH"
);

window.__CURRENT_DASHBOARD_VIEW__ =
null;

await window.loadView(
"tradeins",
true
);

};

window.dealerAcceptCounter =
async function(requestId, valuationId){

const {
data:{ user }
} = await supabase.auth.getUser();

if(!user){
return;
}

const {
data:profile
} = await supabase
.from("profiles")
.select("account_type")
.eq("id", user.id)
.single();

if(
profile?.account_type !== "dealer"
){
alert(
"Only dealers can perform this action"
);
return;
}

const request =
(window.__TRADE_IN_REQUESTS__ || [])
.find(r => r.id === requestId);

if(!request){
return;
}

const valuation =
(request.valuations || [])
.find(v => v.id === valuationId);

if(!valuation){
alert("Valuation not found");
return;
}

const updatedValuations =
(request.valuations || []).map(v => {

if(v.id !== valuationId){
return v;
}

return {

...v,

status:
"Accepted",

negotiationHistory:[
...(v.negotiationHistory || []),
{
type:
"Dealer Accepted Counter",
amount:v.amount,
createdAt:
new Date().toISOString()
}
]

};

});

const { error } =
await supabase
.from("trade_in_requests_v2")
.update({

status:
"Accepted",

accepted_valuation_id:
valuationId,

valuations:
updatedValuations

})
.eq(
"id",
requestId
);

if(error){

console.error(
"ACCEPT COUNTER FAILED",
error
);

alert(
"Failed to accept counter offer."
);

return;
}

window.loadView(
"tradeins",
true
);

};

window.dealerRejectCounter =
async function(requestId, valuationId){

const {
data:{ user }
} = await supabase.auth.getUser();

if(!user){
return;
}

const {
data:profile
} = await supabase
.from("profiles")
.select("account_type")
.eq("id", user.id)
.single();

if(
profile?.account_type !== "dealer"
){
alert(
"Only dealers can perform this action"
);
return;
}

const request =
(window.__TRADE_IN_REQUESTS__ || [])
.find(r => r.id === requestId);

if(!request){
return;
}

const updatedValuations =
(request.valuations || []).map(v => {

if(v.id !== valuationId){
return v;
}

return {

...v,

status:"Declined",

negotiationHistory:[
...(v.negotiationHistory || []),
{
type:"Dealer Rejected Counter",
amount:v.amount,
createdAt:new Date().toISOString()
}
]

};

});

const { error } =
await supabase
.from("trade_in_requests_v2")
.update({

status:"Declined",

declined_valuation_id:
valuationId,

valuations:
updatedValuations

})
.eq("id", requestId);

if(error){

console.error(
"REJECT COUNTER FAILED",
error
);

alert(
"Failed to reject counter offer."
);

return;
}

window.loadView(
"tradeins",
true
);

};

/* removed duplicate localStorage reject logic */

window.dealerReviseOffer =
async function(requestId, valuationId){

const {
data:{ user }
} = await supabase.auth.getUser();

if(!user){
return;
}

const {
data:profile
} = await supabase
.from("profiles")
.select("account_type")
.eq("id", user.id)
.single();

if(
profile?.account_type !== "dealer"
){
alert(
"Only dealers can perform this action"
);
return;
}

const amount =
prompt(
"Enter revised offer amount"
);

if(!amount){
return;
}

const request =
(window.__TRADE_IN_REQUESTS__ || [])
.find(r => r.id === requestId);

if(!request){
return;
}

const valuation =
(request.valuations || [])
.find(v => v.id === valuationId);

if(!valuation){
alert("Valuation not found");
return;
}

const updatedValuations =
(request.valuations || []).map(v => {

if(v.id !== valuationId){
return v;
}

return {

...v,

amount:Number(amount),

status:"Negotiating",

negotiationHistory:[
...(v.negotiationHistory || []),
{
type:"Dealer Revised Offer",
amount:Number(amount),
createdAt:new Date().toISOString()
}
]

};

});

const { error } =
await supabase
.from("trade_in_requests_v2")
.update({

status:"Negotiating",

valuations:
updatedValuations

})
.eq("id", requestId);

if(error){

console.error(
"REVISE OFFER FAILED",
error
);

alert(
"Failed to revise offer."
);

return;
}

window.loadView(
"tradeins",
true
);

};

/* removed duplicate localStorage revise logic */

window.editTradeInRequest =
async function(index){

const {
data:{ user }
} = await supabase.auth.getUser();

if(!user){
return;
}

const {
data:profile
} = await supabase
.from("profiles")
.select("account_type")
.eq("id", user.id)
.single();

if(
profile?.account_type === "dealer"
){
alert(
"Dealers cannot edit trade-in requests."
);
return;
}

const tradeInRequests =
window.__TRADE_IN_REQUESTS__ || [];

const request =
tradeInRequests[index];

if(!request){
return;
}

if(request.user_id !== user.id){
alert("Unauthorized request");
return;
}

window.editingTradeInIndex =
index;

console.log(
"EDIT MODE START",
index,
request
);

window.__TRADE_IN_IMAGES__ =
request.images || [];

window.__TRADE_IN_IMAGE_FILES__ = [];

await openTradeInModal();

console.log(
"EDIT INDEX AFTER OPEN",
window.editingTradeInIndex
);

setTimeout(()=>{

document.getElementById(
"tradeInMake"
).value =
request.vehicleMake ||
request.vehicle_make ||
"";

document.getElementById(
"tradeInModel"
).value =
request.vehicleModel ||
request.vehicle_model ||
"";

document.getElementById(
"tradeInYear"
).value =
request.vehicleYear ||
request.vehicle_year ||
"";

document.getElementById(
"tradeInMileage"
).value =
request.mileage || "";

document.getElementById(
"tradeInSummaryMake"
).textContent =
request.vehicleMake ||
request.vehicle_make ||
"—";

document.getElementById(
"tradeInSummaryModel"
).textContent =
request.vehicleModel ||
request.vehicle_model ||
"—";

document.getElementById(
"tradeInSummaryYear"
).textContent =
request.vehicleYear ||
request.vehicle_year ||
"—";

document.getElementById(
"tradeInSummaryMileage"
).textContent =
Number(request.mileage || 0).toLocaleString();

const summaryImage =
document.getElementById(
"tradeInSummaryImage"
);

if(
summaryImage &&
request.images &&
request.images.length
){
summaryImage.src =
request.images[0];
}

document.getElementById(
"tradeInRegistration"
).value =
request.registrationNumber ||
request.registration_number ||
"";

document.getElementById(
"tradeInModifications"
).value =
request.modifications || "";

document.getElementById(
"tradeInMechanicalIssues"
).value =
request.mechanicalIssues ||
request.mechanical_issues ||
"";

document.getElementById(
"tradeInExtras"
).value =
request.extras || "";

document.getElementById(
"tradeInPreferences"
).value =
request.tradePreferences ||
request.trade_preferences ||
"";

/* CONDITION */

const conditionCard =
document.querySelector(
`.trade-condition-card[data-condition="${request.condition}"]`
);

if(conditionCard){
selectTradeInCondition(
conditionCard
);
}

/* ACCIDENT HISTORY */

const accidentCard =
document.querySelector(
`.trade-accident-card[data-accident="${request.accidentHistory ||
request.accident_history}"]`
);

if(accidentCard){
selectTradeInAccident(
accidentCard
);
}

/* SERVICE HISTORY */

const serviceCard =
document.querySelector(
`.trade-service-card[data-service="${request.serviceHistory ||
request.service_history}"]`
);

if(serviceCard){
selectTradeInService(
serviceCard
);
}

const preview =
document.getElementById(
"tradeInImagePreview"
);

if(
preview &&
Array.isArray(request.images)
){

preview.innerHTML = "";

request.images.forEach(image=>{

preview.insertAdjacentHTML(
"beforeend",
`
<div class="
relative
aspect-square
overflow-hidden
rounded-xl
border
border-gray-200
">

<img
src="${image}"
class="
w-full
h-full
object-cover
"
/>

</div>
`
);

});

const countBox =
document.getElementById(
"tradeInImageCount"
);

if(countBox){

countBox.textContent =
`${request.images.length} / 10 photos selected`;

}

const reviewImages =
document.getElementById(
"reviewImageCount"
);

if(reviewImages){

reviewImages.textContent =
`${request.images.length} Photos`;

}

}

},200);

};



window.toggleDashboardSidebar = function(force){

const sidebar =
document.getElementById("dashboardSidebar");

const overlay =
document.getElementById("dashboardSidebarOverlay");

if(!sidebar || !overlay) return;

const isOpen =
sidebar.classList.contains("translate-x-0") &&
window.innerWidth < 1280;

/* DOUBLE-TRIGGER GUARD: rapid tap / ghost-click
   protection. Only applies to toggle calls (no
   explicit force), so programmatic open/close
   (force=true/false) is never blocked. */
if(typeof force !== "boolean"){

const now = Date.now();

if(
window.__SIDEBAR_TOGGLE_LOCK__ &&
now - window.__SIDEBAR_TOGGLE_LOCK__ < 250
){
return;
}

window.__SIDEBAR_TOGGLE_LOCK__ = now;

}

let shouldOpen = force;

if(typeof shouldOpen !== "boolean"){
shouldOpen = !isOpen;
}

if(shouldOpen){

sidebar.classList.remove("translate-x-[-110%]");
sidebar.classList.add("translate-x-0");

overlay.classList.remove("hidden");
overlay.style.opacity = "1";
overlay.style.pointerEvents = "auto";

if(document?.body){

document.body.style.overflow = "hidden";
document.body.style.touchAction = "none";

}

}else{

sidebar.classList.remove("translate-x-0");
sidebar.classList.add("translate-x-[-110%]");

overlay.style.opacity = "0";
overlay.style.pointerEvents = "none";

clearTimeout(
window.__SIDEBAR_HIDE_TIMER__
);

window.__SIDEBAR_HIDE_TIMER__ =
setTimeout(()=>{

if(overlay){
overlay.classList.add("hidden");
}

}, 250);

if(document?.body){
document.body.style.overflow = "";
document.body.style.touchAction = "";
}

}

};

/* =========================================
MOBILE OUTSIDE-CLICK CLOSE
Single delegated listener — closes the mobile
dashboard sidebar when tapping outside of it.
Registered once; does not duplicate on open.
========================================= */

document.addEventListener("click", function(event){

const sidebar =
document.getElementById("dashboardSidebar");

if(!sidebar) return;

/* PHASE 17 — Edit Profile modal open: leave the
   drawer state untouched while the modal is up */
if(
document.getElementById(
"editProfileModalOverlay"
)
){
return;
}

/* Desktop: persistent sidebar — no close */
if(window.innerWidth >= 1280) return;

/* Only act when the mobile menu is open */
if(!sidebar.classList.contains("translate-x-0")) return;

/* Tapping inside the menu must NOT close it */
if(sidebar.contains(event.target)) return;

/* Toggle + close buttons manage their own state */
const toggleBtn =
document.querySelector(".dashboard-mobile-menu");

if(toggleBtn && toggleBtn.contains(event.target)) return;

const closeBtn =
document.querySelector(".dashboard-sidebar-close");

if(closeBtn && closeBtn.contains(event.target)) return;

/* Anywhere else outside the menu closes it */
window.toggleDashboardSidebar(false);

});

/* ====================== */
/* 🔔 DASHBOARD NOTIFICATIONS */
/* ====================== */

/* COLLAPSE / EXPAND helper for Overview panels */

function toggleOvList(btn){

const box = btn.closest(".ov-collapse");

if(!box) return;

const open = box.classList.toggle("open");

const lbl = btn.querySelector(".ov-expand-label");

const arrow = btn.querySelector(".ov-expand-arrow");

if(lbl) lbl.textContent = open
? (btn.dataset.less || "Show Less")
: (btn.dataset.more || "View More");

if(arrow) arrow.textContent = open ? "▲" : "▼";

}

window.toggleOvList = toggleOvList;

async function loadDashboardNotifications(){

  try{
  if(window.__LOADING_DASH_NOTIFS__){
return;
}

window.__LOADING_DASH_NOTIFS__ = true;

const { data:userData } = await supabase.auth.getUser();

if(!userData?.user) return;
/* =====================================
LOAD UNREAD MESSAGE COUNT
===================================== */

const { count:unreadMessages } =
await supabase
.from("messages")
.select("*", {
count:"exact",
head:true
})
.eq("receiver_id", userData.user.id)
.eq("is_read", false);

window.__dashboardUnreadMessages =
unreadMessages || 0;

const { data } =
await supabase
.from("notifications")
.select("*")
.eq("user_id", userData.user.id)
.order("created_at",{ascending:false})
.limit(5);

const box = document.getElementById("dashboardNotifications");

if(!box) return;

if(!data || !data.length){
box.innerHTML = `
<div class="
rounded-2xl
border
border-dashed
border-white/10
p-4
text-center
text-sm
text-gray-400
">
No notifications
</div>
`;
return;
}

box.innerHTML = (data || []).map(n=>{

const priority =
(n.type || "").toLowerCase();

let badge = `
bg-blue-500/15
text-blue-300
border-blue-500/20
`;

let label = "General";

if(priority.includes("finance")){

badge = `
bg-green-500/15
text-green-300
border-green-500/20
`;

label = "Finance";

}

if(priority.includes("lead")){

badge = `
bg-orange-500/15
text-orange-300
border-orange-500/20
`;

label = "Lead";

}

if(priority.includes("message")){

badge = `
bg-purple-500/15
text-purple-300
border-purple-500/20
`;

label = "Messages";

/* =====================================
SMART MESSAGE SUMMARY
===================================== */

const unreadCount =
Number(
window.__dashboardUnreadMessages || 0
);

if(unreadCount > 0){

n.title =
`${unreadCount} unread message${unreadCount > 1 ? "s" : ""}`;

n.message =
"Open your Messages tab to continue the conversation.";

}

}

return `

<div
class="ov-notif ${n.is_read ? "" : " unread"}"
onclick="markDashboardRead('${n.id}')"
>

<span class="ov-notif-dot ${
priority.includes("finance") ? "green" :
priority.includes("lead") ? "orange" :
priority.includes("message") ? "blue" : ""
}"></span>

<div class="ov-notif-body">

<div class="ov-notif-top">

<h3>${n.title || "Notification"}</h3>

<span class="ov-notif-time">${
n.created_at
? formatSATime(n.created_at)
: ""
}</span>

</div>

<p>${n.message || ""}</p>

<button
type="button"
class="ov-openchat-btn"
onclick="event.stopPropagation();openDashboardMessage('${n.id}')"
>
Open Chat
</button>

</div>

</div>

`;

}).join("");

if(data.length > 3){

box.innerHTML += `
<button type="button" class="ov-expand-btn" onclick="toggleOvList(this)">
<span class="ov-expand-label">View All Notifications</span> <span class="ov-expand-arrow">▼</span>
</button>
`;

}

}finally{

window.__LOADING_DASH_NOTIFS__ =
false;

}

}

/* Mark read in the DB but KEEP the card rendered in
   place — only update its unread styling locally. */

window.markDashboardRead = async function(id){

await supabase
.from("notifications")
.update({ is_read: true })
.eq("id", id);

const cards =
document.querySelectorAll(
`.ov-notif[onclick="markDashboardRead('${id}')"]`
);

cards.forEach(card=>{

card.classList.remove("unread");

});

};

/* MESSAGE-TYPE NOTIFICATION CLICK — opens the
   EXISTING Messages page via the app's existing
   navigate() mechanism (same as continueLeadConversation).
   Marks the notification read first using the same
   existing update used by markDashboardRead.
   Uses the EXISTING crmConversationLead mechanism
   already consumed by initMessagesPage(): the
   conversation is identified by the vehicle_id of
   the customer's latest message (existing data,
   existing tables — no schema changes). */

window.openDashboardMessage = async function(id){

try{

await supabase
.from("notifications")
.update({ is_read: true })
.eq("id", id);

}catch(err){

console.error(
"Notification read update failed:",
err
);

}

/* Mark the row as read locally WITHOUT removing
   it from the dashboard list. */

try{

const rowCards =
document.querySelectorAll(
`.ov-notif[onclick="markDashboardRead('${id}')"]`
);

rowCards.forEach(card=>{

card.classList.remove("unread");

});

}catch(err){/* non-critical */}

try{

const { data:userData } =
await supabase.auth.getUser();

if(userData?.user){

/* Fetch THIS notification so the conversation is
   resolved per-notification (never guessed from a
   global "latest message"). Uses only existing
   columns: title, message, created_at. */

const { data:notif } =
await supabase
.from("notifications")
.select("title, message, created_at")
.eq("id", id)
.maybeSingle();

if(notif){

/* Recent inbound messages only — existing table,
   existing columns. */

const { data:recentMessages } =
await supabase
.from("messages")
.select("vehicle_id, message, created_at")
.eq("receiver_id", userData.user.id)
.order("created_at",{ascending:false})
.limit(50);

let vehicleId = null;

const candidates =
(recentMessages || []).filter(
m => m.vehicle_id
);

if(candidates.length){

const notifTime = notif.created_at
? new Date(notif.created_at).getTime()
: null;

/* 1) Strongest match for "New Message"
      notifications: the notification stores the
      first 80 chars of the message text, so match
      on content first. */

let match =
candidates.find(m =>
notif.message &&
m.message &&
m.message
.slice(0,80)
.toLowerCase() ===
notif.message.toLowerCase()
);

/* 2) Fallback (e.g. "New Vehicle Enquiry",
      which stores no message content): the enquiry
      notification is written immediately after the
      buyer's message insert, so pick the inbound
      message closest in time to THIS notification
      (within 10 minutes). */

if(!match && notifTime !== null){

let bestDelta = Infinity;

candidates.forEach(m=>{

const delta = Math.abs(
new Date(m.created_at).getTime() -
notifTime
);

if(
delta < bestDelta &&
delta <= 10 * 60 * 1000
){
bestDelta = delta;
match = m;
}

});

}

vehicleId = match?.vehicle_id || null;

}

if(vehicleId){

sessionStorage.setItem(
"crmConversationLead",
JSON.stringify({
vehicle_id: vehicleId
})
);

}

}

}

}catch(err){

console.error(
"Conversation lookup failed:",
err
);

}

navigate("/messages");

};

/* MARK ALL READ — same existing query pattern,
   exposed as a clearly styled button action. */

window.markAllDashboardNotificationsRead = async function(){

try{

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user) return;

await supabase
.from("notifications")
.update({ is_read:true })
.eq("user_id", userData.user.id)
.eq("is_read", false);

await loadDashboardNotifications();

}catch(err){

console.error("Mark all read failed:", err);

}

};

/* AUTO LOAD NOTIFICATIONS */

(async function(){

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user){
return;
}

await supabase
.from("notifications")
.update({
is_read:true
})
.eq("user_id", userData.user.id)
.eq("is_read", false);

await loadDashboardNotifications();

})();

/* =========================================
SHARED PAGE HEADING BANNER
One consistent heading for every Dashboard
tab. Rendered above existing page content.
========================================= */

const DASHBOARD_PAGE_HEADINGS = {

  /* PHASE 3 — dedicated dealership page editor. */
  dealershippage: {
    title: "Edit Dealership Page",
    description: "Manage your public dealership profile and storefront."
  },

  overview: {
    title: "Overview",
    description: "Your central dashboard for monitoring vehicles, leads, performance and dealership activity."
  },
  inventory: {
    title: "Inventory",
    description: "Manage, review and monitor all vehicles currently listed in your dealership inventory."
  },
  addvehicle: {
    title: "Add Vehicle",
    description: "Create and publish a new vehicle listing with its details, images, features, pricing and seller information."
  },
  editvehicle: {
    title: "Edit Vehicle",
    description: "Update and manage the details of an existing vehicle listing."
  },
  messages: {
    title: "Messages",
    description: "Manage your buyer conversations and keep track of important customer communication."
  },
  performance: {
    title: "Performance",
    description: "Track vehicle views, buyer activity and key performance insights across your inventory."
  },
  tradeins: {
    title: "Trade-In Centre",
    description: "Review and manage vehicle trade-in requests from potential buyers."
  },
  crm: {
    title: "CRM Leads",
    description: "Manage potential buyers, follow up on enquiries and move leads through your sales pipeline."
  },
  affordability: {
    title: "Affordability Profile",
    description: "Review your affordability profile and use financial information to support better vehicle recommendations."
  },
  finance: {
    title: "Finance Applications",
    description: "Review and manage finance applications submitted against your dealership inventory."
  }
};

export function renderDashboardPageHeading(key){

  const heading =
  DASHBOARD_PAGE_HEADINGS[key];

  if(!heading) return "";

  return `

<!-- PAGE HEADING -->
<header class="hufa-page-heading">

  <span class="hufa-page-heading-accent" aria-hidden="true"></span>

  <h2 class="hufa-page-heading-title">
  ${heading.title}
  </h2>

  <p class="hufa-page-heading-desc">
  ${heading.description}
  </p>

</header>

`;

}

window.loadView = async function(view){

if(
window.__TRADEIN_SUBSCRIPTION__
){
window.__TRADEIN_SUBSCRIPTION__.unsubscribe();
window.__TRADEIN_SUBSCRIPTION__ = null;
}

sessionStorage.setItem(
"dashboardView",
view
);

console.log(
"DASHBOARD VIEW CLICKED:",
view
);

if(!view) return;

/* DASHBOARD MENU AUTO-CLOSE: close the mobile/tablet slide-in menu the
   moment navigation is triggered — INCLUDING when the currently active
   view is re-selected (the "VIEW SKIPPED" early-return below would
   otherwise leave the drawer open). Reuses the EXISTING
   toggleDashboardSidebar(false) close mechanism: hides the sidebar,
   hides the overlay and restores body scrolling/touch. Guarded as a
   no-op on desktop (>= 1280px) where the sidebar is persistent. */
if(window.innerWidth < 1280){
  toggleDashboardSidebar(false);
}

const forceReload =
arguments[1] === true;

if(
window.__CURRENT_DASHBOARD_VIEW__ === view &&
!forceReload &&
!window.__CRM_FORCE_REFRESH__
){
console.log(
"VIEW SKIPPED:",
view
);
return;
}

window.__CRM_FORCE_REFRESH__ = false;
window.__CURRENT_DASHBOARD_VIEW__ =
view;

const pageTitle =
document.getElementById(
"dashboardPageTitle"
);

const mobileTitle =
document.getElementById(
"dashboardMobileTitle"
);

if(pageTitle || mobileTitle){

const titles = {
  overview: "Overview",
  inventory: "Inventory",
  performance: "Performance",
  tradeins: "Trade-In Centre",
  crm: "CRM Leads",
  affordability: "Affordability Profile",
  finance: "Finance Applications"
};

const titleText =
titles[view] || "Dashboard";

if(pageTitle){
pageTitle.innerText = titleText;
}

if(mobileTitle){
mobileTitle.innerText = titleText;
}

}

  const box = document.getElementById("dashboardView");
  if(!box) return;

  /* 🔥 UPDATE ACTIVE STATE */
  document.querySelectorAll(".nav-item").forEach(btn=>{
    btn.classList.remove("active");
  });

const activeBtn = Array.from(
document.querySelectorAll(".nav-item")
).find(btn =>
btn.getAttribute("onclick") === `loadView('${view}')`
);

if(activeBtn){
activeBtn.classList.add("active");
}

/* Refresh the new-interest badges on every dashboard view so
   the sidebar "CRM Leads" tab shows the count even while the
   dealer is on Overview / Inventory etc. Fire-and-forget. */
if(typeof window.updateCRMInterestBadges === "function"){
  window.updateCRMInterestBadges();
}

/* DASHBOARD MENU AUTO-CLOSE: the mobile/tablet sidebar is now closed
   at the TOP of loadView() (before the skip/early-return paths) so the
   menu closes on EVERY navigation trigger. The previous late close
   here ran after the "VIEW SKIPPED" early-return and therefore never
   fired when the same section was re-selected. */

  /* 🔥 VIEWS */

if(view === "dashboard"){
view = "overview";
}

if(view === "overview"){

box.innerHTML = `

${renderDashboardPageHeading("overview")}

<!-- PRIMARY PERFORMANCE AREA -->
<section
id="dashboardKpis"
class="ov-hero"
aria-label="Primary dealership performance">

<header class="ov-hero-head">

<div class="min-w-0">

<p class="ov-eyebrow">Performance</p>

<h2 class="ov-hero-title">Dealership Performance</h2>

</div>

</header>

<div class="ov-hero-metrics">

<div class="ov-hero-metric">

<p class="ov-metric-label">Total Views</p>

<h2 id="kpiViews" class="ov-hero-number">--</h2>

<p class="ov-metric-sub">Vehicle profile engagement</p>

</div>

<div class="ov-hero-metric">

<p class="ov-metric-label">Total Saves</p>

<h2 id="kpiSaves" class="ov-hero-number">--</h2>

<p class="ov-metric-sub">Buyers saving inventory</p>

</div>

</div>

</section>

<!-- SECONDARY LEAD / CUSTOMER ACTIVITY -->
<section class="ov-leads" aria-label="Lead and customer activity">

<p class="ov-eyebrow dark">Lead &amp; Customer Activity</p>

<div class="ov-leads-grid">

<div class="ov-lead-item">

<p class="ov-lead-label">Enquiries</p>

<h3 id="kpiEnquiries" class="ov-lead-number">--</h3>

<p class="ov-lead-sub">Lead generation activity</p>

</div>

<div class="ov-lead-item">

<p class="ov-lead-label">Interested Buyers</p>

<h3 id="kpiInterested" class="ov-lead-number">--</h3>

<p class="ov-lead-sub">High intent customers</p>

</div>

<div class="ov-lead-item">

<p class="ov-lead-label">Finance Requests</p>

<h3 id="kpiFinance" class="ov-lead-number">--</h3>

<p class="ov-lead-sub">Applications submitted</p>

</div>

</div>

</section>

<!-- DEALER NOTIFICATIONS (full width, directly under Lead & Customer Activity) -->
<div class="dashboard-featured-panel">

<div class="flex items-center justify-between mb-5">

<div>

<h2 class="text-xl font-bold">
Notifications
</h2>

<p class="text-gray-500 text-sm">
Realtime dealership alerts
</p>

</div>

<button
onclick="markAllDashboardNotificationsRead()"
class="ov-markall-btn"
>
Mark All Read
</button>

</div>

<div
id="dashboardNotifications"
class="space-y-3 ov-collapse">

<div class="
flex
justify-center
items-center
py-8
">

<div class="
animate-spin
rounded-full
h-8
w-8
border-4
border-[#E48A2F]
border-t-transparent
">
</div>

</div>

</div>

</div>

<!-- OVERVIEW GRID -->
<div class="
dashboard-analytics-grid
grid
grid-cols-1
xl:grid-cols-2
gap-5
min-w-0
">

<!-- LEFT -->
<div class="dashboard-overview-left">

<!-- ANALYTICS -->
<div class="
card
p-4
md:p-6
dashboard-chart-card
overflow-hidden
transform-gpu
">

<div class="
flex
flex-col
lg:flex-row
lg:items-center
justify-between
gap-4
mb-8
">

<div>

<h2 class="text-2xl font-bold">
Marketplace Analytics
</h2>

<p class="text-gray-500 text-sm">
Realtime dealership engagement
</p>

</div>

<div class="ov-seg" role="tablist" aria-label="Analytics metric">
<button type="button" class="ov-seg-btn active" data-metric="views" onclick="setOverviewMetric('views')">Views</button>
<button type="button" class="ov-seg-btn" data-metric="saves" onclick="setOverviewMetric('saves')">Saves</button>
<button type="button" class="ov-seg-btn" data-metric="enquiries" onclick="setOverviewMetric('enquiries')">Enquiries</button>
</div>
<select
id="ovChartType"
onchange="onOverviewChartTypeChange()"
class="
dashboard-select
w-full
sm:w-auto
"
aria-label="Chart type">
<option value="line" selected>Line</option>
<option value="bar">Bar</option>
<option value="donut">Donut</option>
</select>
<select
id="analyticsRange"
onchange="onOverviewRangeChange()"
class="
dashboard-select
w-full
sm:w-auto
">

<option value="7">7 Days</option>
<option value="30">30 Days</option>
<option value="90">90 Days</option>

</select>

</div>

<div class="ov-summary">
    <div class="ov-summary-main">
        <p class="ov-metric-label" id="ovSummaryLabel">Vehicle Views</p>
        <h3 id="graphViewsTotal" class="ov-summary-number">--</h3>
        <p class="ov-trend" id="ovTrend"></p>
    </div>
    <span class="ov-range-label" id="ovRangeLabel">Last 7 days</span>
</div>

<div id="viewsChart" class="ov-chart"></div></div>

</div>

<!-- RIGHT -->
<div class="dashboard-overview-right">

<!-- MOST VIEWED VEHICLES -->
<div class="
dashboard-featured-panel
overflow-hidden
w-full
max-w-full
p-4
md:p-5
rounded-[28px]
backdrop-blur-xl
transform-gpu
">

<div class="flex items-center justify-between mb-5">

<div>

<h2 class="text-xl font-bold">
Most Viewed Vehicles
</h2>

<p class="text-gray-500 text-sm">
Top performing inventory
</p>

</div>



</div>

<div
id="mostViewedVehicle"
class="space-y-3 ov-mv-list">

<div class="
flex
justify-center
items-center
py-8
">

<div class="
animate-spin
rounded-full
h-8
w-8
border-4
border-[#E48A2F]
border-t-transparent
">
</div>

</div>

</div>

</div>

</div>

</div>

`;

setTimeout(async ()=>{

try{

await Promise.allSettled([

  loadDashboardAnalytics(),
  loadViewsChart(),
  loadMostViewedVehicle(),
  loadHotListing(),
  loadLiveActivity(),
  loadDashboardNotifications()

]);
}catch(err){

console.error(
"Realtime refresh failed:",
err
);

}finally{

window.__DASHBOARD_REFRESHING__ =
false;

}

}, 0);

}

if(view === "analytics"){

 /* Analytics unlocked for all users */

  box.innerHTML = `

<div class="dashboard-premium-grid">

<div class="card p-6">

<h2 class="text-xl font-bold mb-5">
Dealership Performance
</h2>

<div class="
dashboard-performance-grid
grid
grid-cols-1
sm:grid-cols-2
2xl:grid-cols-4
gap-4
items-stretch
">

<div class="dashboard-performance-card">
<p>Conversion Rate</p>
<h3 class="
text-2xl
font-bold
leading-none
">
${dashboardAnalytics.conversionRate}%
</h3>
</div>

<div class="dashboard-performance-card">
<p>Response Rate</p>
<h3 class="
text-2xl
font-bold
leading-none
">
${dashboardAnalytics.responseRate}%
</h3>
</div>

<div class="dashboard-performance-card">
<p>Engagement Score</p>
<h3 class="
text-2xl
font-bold
leading-none
">
92
</h3>
</div>

<div class="dashboard-performance-card">
<p>Inventory Quality</p>
<h3 class="
text-2xl
font-bold
leading-none
">
88
</h3>
</div>

</div>

</div>

<div class="card p-6">

<h2 class="text-xl font-bold mb-4">
Quick Actions
</h2>

<div class="
dashboard-actions-grid
grid
grid-cols-1
sm:grid-cols-2
xl:grid-cols-3
gap-3
items-stretch
">

<button
onclick="goUpload()"
class="
dashboard-action-btn
w-full
justify-center
">
Add Vehicle
</button>

<button
onclick="goMessages()"
class="
dashboard-action-btn
w-full
justify-center
">
View Messages
</button>

<button class="dashboard-action-btn">
Boost Listings
</button>

<button class="dashboard-action-btn">
Export Leads
</button>

<button class="dashboard-action-btn">
Finance Requests
</button>

<button class="dashboard-action-btn">

</button>

</div>

</div>

</div>

`;

return;

}

if(view === "activity"){

box.innerHTML = `
<div id="fullActivityFeed"></div>
`;

setTimeout(loadLiveActivity, 0);

return;
}

if(view === "performance"){

  box.innerHTML = `

${renderDashboardPageHeading("performance")}

<div class="card p-6">

<div class="
flex
flex-col
sm:flex-row
sm:items-center
justify-between
gap-4
mb-6
">

<div>

<div class="ov-seg" role="tablist" aria-label="Performance view mode">

<button
type="button"
class="ov-seg-btn active"
data-perf-mode="table"
onclick="setPerfMode('table')"
>
Table View
</button>

<button
type="button"
class="ov-seg-btn"
data-perf-mode="analytics"
onclick="setPerfMode('analytics')"
>
Analytics View
</button>

</div>

</div>

<div
id="performanceViewToggle"
class="
xl:hidden
flex
items-center
gap-2
">
</div>

</div>

<div
id="performanceInventoryTable"
class="w-full overflow-hidden">

<!-- Initial skeleton state: replaced by loadInventoryPerformance() with
     the real performance table/list or the existing empty state. -->
${renderTableRowsSkeleton(4)}

</div>

<div
id="perfAnalyticsView"
class="hidden space-y-6">

</div>

</div>

`;

setTimeout(loadInventoryPerformance, 0);

return;
}

if(view === "crm"){

box.innerHTML = `

${renderDashboardPageHeading("crm")}

<div id="crmView" class="space-y-4">

<div
id="crmKpiGrid"
class="
grid
grid-cols-2
md:grid-cols-3
xl:grid-cols-6
gap-2
sm:gap-4
">

<div class="dashboard-kpi-card">

<div
class="dashboard-kpi-label">
New Leads
</div>

<p
id="crmNewLeads"
class="dashboard-kpi-number">
0
</p>

</div>

<div class="dashboard-kpi-card">

<div
class="dashboard-kpi-label">
Contacted
</div>
<p id="crmContacted" class="dashboard-kpi-number">0</p>
</div>

<div class="dashboard-kpi-card">

<div
class="dashboard-kpi-label">
Interested
</div>

<p
id="crmInterested"
class="dashboard-kpi-number">
0
</p>

</div>

<div class="dashboard-kpi-card">

<div
class="dashboard-kpi-label">
Negotiating
</div>

<p
id="crmNegotiating"
class="dashboard-kpi-number">
0
</p>

</div>

<div class="dashboard-kpi-card">

<div
class="dashboard-kpi-label">
Closed
</div>

<p
id="crmClosed"
class="dashboard-kpi-number">
0
</p>
</div>

<div class="dashboard-kpi-card">

<div
class="dashboard-kpi-label">
Notifications
</div>

<p
id="crmNotifications"
class="dashboard-kpi-number">
0
</p>
</div>

</div>

<div
id="crmPipelineCard"
class="card p-3 sm:p-6">

<div class="
flex
flex-col
lg:flex-row
lg:items-center
justify-between
gap-3
sm:gap-4
mb-4
sm:mb-6
">

<div>

<h2 class="
text-xl
sm:text-2xl
font-bold
tracking-tight
text-[#0A192F]
">
CRM Lead Pipeline
<span
id="crmLeadCount"
class="
text-base
font-semibold
text-gray-400
">
(0)
</span>
</h2>

<p class="text-sm text-gray-500 mt-1">
Manage leads, follow ups, notes and customer activity.
</p>

</div>

<div class="flex flex-col gap-3">

<div id="crmSearchRow" class="flex gap-2">

<input
id="crmLeadSearch"
type="text"
placeholder="Search leads..."
class="
dashboard-search-input
min-w-[260px]
"
/>

<button
onclick="window.loadCRMLeads()"
class="btn btn-dark px-5">
Refresh
</button>

</div>

<div id="crmFilterRow" class="flex flex-wrap gap-2">

<button
onclick="setCRMFilter('all')"
class="btn btn-dark">
All
</button>

<button
onclick="setCRMFilter('new')"
class="btn btn-dark">
New
</button>

<button
onclick="setCRMFilter('contacted')"
class="btn btn-dark">
Contacted
</button>

<button
onclick="setCRMFilter('interested')"
class="btn btn-dark">
Interested

<!-- New-interest count for the Interested tab; cleared by
     setCRMFilter('interested') acknowledgement. -->
<span
id="crmInterestedFilterBadge"
class="hidden inline-flex items-center justify-center min-w-[18px] text-[10px] font-bold leading-none text-white bg-[#E48A2F] rounded-full px-1.5 py-0.5"
>
0
</span>

</button>

<button
onclick="setCRMFilter('negotiating')"
class="btn btn-dark">
Negotiating
</button>

<button
onclick="setCRMFilter('closed')"
class="btn btn-dark">
Closed
</button>

</div>

</div>
</div>

<div
id="crmLeadTable"
class="
grid
gap-4
">

<!-- Initial skeleton state: replaced by loadCRMLeads() with real lead
     cards or the existing empty state. -->
${renderLeadCardSkeletons(3)}

</div>

<div
id="crmNotesModal"
class="hidden">
</div>

<div
id="crmTasksModal"
class="hidden">
</div>

<div
id="crmHistoryModal"
class="hidden">
</div>

<div
id="crmNotificationsPanel"
class="">

<!-- Initial skeleton state: replaced by loadCRMNotifications() with real
     notification rows or the existing empty state. -->
${renderNotificationSkeletons(3)}

</div>

</div>

</div>

`;

setTimeout(async()=>{

/* Reflect the persisted filter selection on the
   chips (UI only — see syncCRMFilterButtons). */
window.syncCRMFilterButtons();

await loadCRMNotifications();

if(window.__CURRENT_OPEN_LEAD_ID__){

await openLeadDetails(
window.__CURRENT_OPEN_LEAD_ID__
);

}else{

await loadCRMLeads();

}

},0);

return;
}

if(view === "affordability"){

  box.innerHTML = `

${renderDashboardPageHeading("affordability")}

<div id="affordabilityProfileContainer">

<!-- Initial skeleton state: replaced by loadAffordabilityProfile() with
     the real profile form and result cards. -->
${renderContentBlockSkeleton()}

`;

  setTimeout(loadAffordabilityProfile,0);

  return;
}

if(view === "finance"){

  box.innerHTML = `

${renderDashboardPageHeading("finance")}

<div class="card p-6">

<div
id="financeApplicationsList"
class="space-y-4">

<!-- Initial skeleton state: replaced by loadFinanceApplications() with
     real application cards or the existing empty state. -->
${renderFinanceAppListSkeletons(3)}

</div>

</div>

`;

setTimeout(loadFinanceApplications, 0);

return;

}



if(view === "inventory"){

  box.innerHTML = `

${renderDashboardPageHeading("inventory")}

    <div class="card p-6">
      <h2 class="sr-only">Inventory</h2>

      <div
id="inventoryTable"
class="w-full min-w-0">

        <!-- Initial skeleton state: replaced by loadInventory() with the
             real inventory table or the existing empty state. -->
        ${renderInventoryTableSkeleton()}

      </div>

    </div>
  `;

  setTimeout(loadInventory, 0);

  return;

}

if(view === "tradeins"){

let isDealer = false;

const {
data:{ user }
} = await supabase.auth.getUser();

if(user){

const {
data:profile
} = await supabase
.from("profiles")
.select("account_type")
.eq("id", user.id)
.single();

isDealer =
profile?.account_type === "dealer";



}

  box.innerHTML = `

${renderDashboardPageHeading("tradeins")}

<div class="space-y-4 sm:space-y-6">

<div class="card p-4 sm:p-6">

<div class="
flex
flex-col
lg:flex-row
lg:items-center
justify-between
gap-4
sm:gap-6
">

<div class="lg:flex-1"></div>

${
!isDealer
? `
<button
onclick="openTradeInModal()"
class="
dashboard-primary-btn
w-full
lg:w-auto
justify-center
">
+ New Trade-In
</button>
`
: ""
}
</div>

</div>

<div class="
grid
grid-cols-2
sm:grid-cols-3
xl:grid-cols-5
gap-2
sm:gap-4
">

<div class="card p-3 sm:p-5">
<p class="text-xs sm:text-sm text-gray-500">
Active Requests
</p>
<p
id="tradeInActiveCount"
class="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">
0
</p>
</div>

<div class="card p-3 sm:p-5">
<p class="text-xs sm:text-sm text-gray-500">
Awaiting Responses
</p>
<p
id="tradeInAwaitingCount"
class="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">
0
</p>
</div>

<div class="card p-3 sm:p-5">
<p class="text-xs sm:text-sm text-gray-500">
Valuations Received
</p>
<p
id="tradeInValuationCount"
class="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">
0
</p>
</div>

<div class="card p-3 sm:p-5">
<p class="text-xs sm:text-sm text-gray-500">
Accepted Offers
</p>
<p
id="tradeInAcceptedCount"
class="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">
0
</p>
</div>

<div class="card p-3 sm:p-5 col-span-2 sm:col-span-1">
<p class="text-xs sm:text-sm text-gray-500">
Declined Offers
</p>
<p
id="tradeInDeclinedCount"
class="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">
0
</p>
</div>

</div>

<div class="card p-4 sm:p-6">

<div class="
flex
flex-col
lg:flex-row
lg:items-center
justify-between
gap-4
mb-4
sm:mb-6
">

<div>

<h3
id="tradeInRequestsTitle"
class="text-xl font-bold">
Trade-In Requests
</h3>

<p class="text-sm text-gray-500 mt-1">
Manage incoming trade-in requests and dealer valuations.
</p>

<div class="mt-4">

<input
id="tradeInSearch"
type="text"
placeholder="Search make, model or registration..."
class="
w-full
max-w-md
min-h-[44px]
border
border-gray-300
rounded-xl
px-4
py-2.5
"
/>

</div>

</div>

</div>

</div>

<button
type="button"
onclick="refreshTradeInCentre()"
class="
btn
btn-dark
self-start
sm:self-auto
min-h-[44px]
px-6
">
Refresh
</button>

</div>

<!-- DESKTOP: table stays a table (>= lg) -->
<div class="hidden lg:block overflow-x-auto">

<table class="dashboard-table min-w-[1000px]">

<thead>

<tr>

<th>Customer</th>
<th>Vehicle</th>
<th>Mileage</th>
<th>Status</th>
<th>Valuations</th>
<th>Created</th>
<th>Actions</th>

</tr>

</thead>

<tbody id="tradeInRequestsTableBody">

<tr>

<td colspan="7">

<div class="
flex
flex-col
items-center
justify-center
text-center
py-16
">

<div class="
w-24
h-24
rounded-full
bg-[#E48A2F]/10
border
border-[#E48A2F]/20
flex
items-center
justify-center
text-4xl
mb-6
">

⇄

</div>

<h4 class="
text-xl
font-bold
mb-2
">

${
isDealer
?
"No Trade-In Requests Available"
:
"No Trade-In Requests Yet"
}

</h4>

<p class="
text-gray-500
max-w-md
mb-6
">

${
isDealer
?
"Customer trade-in requests submitted to the platform will appear here for valuation."
:
"Start your first vehicle trade-in request and receive dealership valuations directly through the Trade-In Centre."
}

</p>

${
!isDealer
? `
<button
onclick="openTradeInModal()"
class="
dashboard-primary-btn
justify-center
">
Start Trade-In
</button>
`
: `
<div
class="
inline-flex
items-center
justify-center
px-5
py-3
rounded-xl
bg-slate-100
text-slate-500
font-medium
">
Awaiting Requests
</div>
`
}
</div>

</td>

</tr>

</tbody>

</table>

</div>

<!-- MOBILE: stacked request cards (< lg) — replaces the
     horizontally scrolling table on small screens -->
<div
id="tradeInRequestsCards"
class="lg:hidden space-y-3"
>

<div class="
flex
flex-col
items-center
justify-center
text-center
bg-white
border
border-gray-200
rounded-2xl
py-12
px-4
">

<div class="
w-20
h-20
rounded-full
bg-[#E48A2F]/10
border
border-[#E48A2F]/20
flex
items-center
justify-center
text-3xl
mb-4
">

⇄

</div>

<p class="text-gray-500 text-sm">

Loading trade-in requests…

</p>

</div>

</div>

</div>

</div>

`;

let tradeInRequestsData = [];
let tradeInRequestsError = null;

if(isDealer){

const result =
await supabase
.rpc(
"get_all_tradeins_for_dealers"
);

tradeInRequestsData =
result.data || [];

tradeInRequestsError =
result.error;

}else{

const result =
await supabase
.from(
"trade_in_requests_v2"
)
.select("*",{
count:"exact"
})
.order(
"created_at",
{
ascending:false
}
);

tradeInRequestsData =
result.data || [];

tradeInRequestsError =
result.error;

}

console.log(
"RAW TRADE-IN QUERY RESULT",
tradeInRequestsData
);

if(
Array.isArray(tradeInRequestsData)
){

console.log(
"TRADE-IN COUNT",
tradeInRequestsData.length
);

console.log(
"FIRST TRADE-IN",
tradeInRequestsData[0]
);

console.log(
"TRADE-IN KEYS",
Object.keys(
tradeInRequestsData[0] || {}
)
);

}

console.log(
"RAW TRADE-IN QUERY ERROR",
tradeInRequestsError
);

console.log(
"TRADEINS LOADED:",
tradeInRequestsData
);

console.log(
"TRADEINS ERROR:",
tradeInRequestsError
);

if(tradeInRequestsError){

console.error(
"TRADEINS ERROR DETAILS",
tradeInRequestsError
);

console.error(
"TRADEINS ERROR MESSAGE",
tradeInRequestsError.message
);

console.error(
"TRADEINS ERROR CODE",
tradeInRequestsError.code
);

console.error(
"TRADEINS ERROR HINT",
tradeInRequestsError.hint
);

console.error(
"TRADEINS ERROR DETAILS FIELD",
tradeInRequestsError.details
);

}

console.log(
"CURRENT USER:",
user?.id
);

console.log(
"IS DEALER:",
isDealer
);

console.log(
"CURRENT USER:",
user?.id
);

console.log(
"IS DEALER:",
isDealer
);

window.__TRADE_IN_REQUESTS__ =
Array.isArray(tradeInRequestsData)
? (
isDealer
? tradeInRequestsData
: tradeInRequestsData.filter(
request =>
request.user_id === user.id
)
)
: [];

console.log(
"TRADE-IN SECURITY FILTER",
{
currentUser:user?.id,
isDealer,
visibleRequests:
window.__TRADE_IN_REQUESTS__.length,
tradeInRequestsData,
tradeInRequestsError
}
);

if(tradeInRequestsError){
throw tradeInRequestsError;
}

console.log(
"WINDOW TRADEINS BEFORE MAP",
window.__TRADE_IN_REQUESTS__
);

const tradeInRequests =
(window.__TRADE_IN_REQUESTS__ || []).map(
request => ({

...request,

vehicleYear:
request.vehicle_year,

vehicleMake:
request.vehicle_make,

vehicleModel:
request.vehicle_model,

registrationNumber:
request.registration_number,

createdAt:
request.created_at ||
request.createdAt,

customerName:
request.customer_name ||
"Private Seller"

})
);

if(
tradeInRequestsError
){

console.error(
tradeInRequestsError
);

}

const tableBody =
document.getElementById(
"tradeInRequestsTableBody"
);

const title =
document.getElementById(
"tradeInRequestsTitle"
);

const tradeInSearch =
document.getElementById(
"tradeInSearch"
);

if(tableBody){

let filteredTradeIns =
[...tradeInRequests];
  const pendingValuations =
tradeInRequests.filter(
request =>
request.status ===
"Awaiting Responses"
);

const completedValuations =
tradeInRequests.filter(
request =>
request.accepted_valuation_id
||
request.declined_valuation_id
);

const activeRequests =
Array.isArray(tradeInRequests)
? tradeInRequests.length
: 0;

const awaitingResponses =
pendingValuations.length;

const valuationsReceived =
tradeInRequests.filter(
request =>
Array.isArray(
request.valuations
)
&&
request.valuations.length > 0
).length;

const acceptedOffers =
tradeInRequests.filter(
request =>
request.accepted_valuation_id
).length;

const declinedOffers =
tradeInRequests.filter(
request =>
request.declined_valuation_id
).length;

const activeBox =
document.getElementById(
"tradeInActiveCount"
);

const awaitingBox =
document.getElementById(
"tradeInAwaitingCount"
);

const valuationBox =
document.getElementById(
"tradeInValuationCount"
);

const acceptedBox =
document.getElementById(
"tradeInAcceptedCount"
);

const declinedBox =
document.getElementById(
"tradeInDeclinedCount"
);

if(activeBox){
activeBox.textContent =
activeRequests;
}

if(awaitingBox){
awaitingBox.textContent =
awaitingResponses;
}

if(valuationBox){
valuationBox.textContent =
valuationsReceived;
}

if(acceptedBox){
acceptedBox.textContent =
acceptedOffers;
}

if(declinedBox){
declinedBox.textContent =
declinedOffers;
}

if(title){

title.textContent =
`Trade-In Requests (${tradeInRequests.length})`;

}

if(tradeInSearch){

tradeInSearch.addEventListener(
"input",
function(){

const search =
this.value
.toLowerCase()
.trim();

filteredTradeIns =
tradeInRequests.filter(
request =>

`${request.vehicleYear || ""}
 ${request.vehicleMake || ""}
 ${request.vehicleModel || ""}
 ${request.registrationNumber|| ""}`
.toLowerCase()
.includes(search)

);

renderTradeInRows(
filteredTradeIns
);

}
);

}

function renderTradeInRows(data){

  console.log(
"RENDERING ROWS:",
data.length,
data
);

const rowsHtml =
data.map((request, index) => `

<tr>

<td>
${request.customer_name || request.customerName || "Private Seller"}
</td>

<td>
${[
request.vehicle_year || request.vehicleYear || "",
request.vehicle_make || request.vehicleMake || "",
request.vehicle_model || request.vehicleModel || ""
].filter(Boolean).join(" ")}
</td>

<td>
${Number(
request.mileage ||
request.vehicleMileage ||
0
).toLocaleString()}
</td>

<td>

<span class="
px-3
py-1
rounded-full
bg-[#fff8e6]
border
border-[#d6b25e]
text-sm
font-medium
">

${request.status || "Awaiting Responses"}

</span>

</td>

<td>
${Array.isArray(request.valuations)
? request.valuations.length
: 0}
</td>

<td>
${(request.createdAt)
? new Date(
request.createdAt
).toLocaleDateString("en-ZA")
: "-"
}
</td>

<td>

<div class="flex gap-2 flex-wrap">

<button
onclick="viewTradeInRequest(${index})"
class="btn btn-dark">
View
</button>

${
isDealer
? `
<button
onclick="openTradeInValuationModal(${index})"
class="btn btn-gold">
Value
</button>
`
: `
<button
onclick="editTradeInRequest(${index})"
class="btn btn-gold">
Edit
</button>

<button
onclick="deleteTradeInRequest(${index})"
class="btn btn-dark">
Delete
</button>
`
}

</div>

</td>

</tr>

`).join("");

/* Desktop keeps the existing table.
   Empty data → leave the markup's desktop
   empty-state row untouched. */
if(data.length){
  tableBody.innerHTML =
  rowsHtml;
}

/* MOBILE — stacked responsive request cards.
   Same information as the table: Customer,
   Vehicle, Mileage, Status, Valuations, Created
   and all existing actions. No horizontal
   scrolling at any mobile width. */
const cardsContainer =
document.getElementById(
"tradeInRequestsCards"
);

if(cardsContainer){

if(!data.length){

cardsContainer.innerHTML = `

<div class="
flex
flex-col
items-center
justify-center
text-center
bg-white
border
border-gray-200
rounded-2xl
py-12
px-4
">

<div class="
w-20
h-20
rounded-full
bg-[#E48A2F]/10
border
border-[#E48A2F]/20
flex
items-center
justify-center
text-3xl
mb-4
">

⇄

</div>

<h4 class="text-lg font-bold mb-2">

${
isDealer
?
"No Trade-In Requests Available"
:
"No Trade-In Requests Yet"
}

</h4>

<p class="text-gray-500 text-sm mb-5">

${
isDealer
?
"Customer trade-in requests submitted to the platform will appear here for valuation."
:
"Start your first vehicle trade-in request and receive dealership valuations directly through the Trade-In Centre."
}

</p>

${
!isDealer
? `
<button
onclick="openTradeInModal()"
class="
dashboard-primary-btn
justify-center
min-h-[44px]
">
Start Trade-In
</button>
`
: `
<div
class="
inline-flex
items-center
justify-center
px-5
py-3
rounded-xl
bg-slate-100
text-slate-500
font-medium
text-sm
">
Awaiting Requests
</div>
`
}
</div>

`;

}else{

cardsContainer.innerHTML =
data.map((request, index) => {

const customer =
request.customer_name ||
request.customerName ||
"Private Seller";

const vehicle =
[
request.vehicle_year || request.vehicleYear || "",
request.vehicle_make || request.vehicleMake || "",
request.vehicle_model || request.vehicleModel || ""
].filter(Boolean).join(" ") || "—";

const mileage =
Number(
request.mileage ||
request.vehicleMileage ||
0
).toLocaleString();

const status =
request.status || "Awaiting Responses";

const valuations =
Array.isArray(request.valuations)
? request.valuations.length
: 0;

const created =
request.createdAt
? new Date(
request.createdAt
).toLocaleDateString("en-ZA")
: "-";

const images =
Array.isArray(request.images) &&
request.images.length
? request.images
: [];

const mainImage =
images[0] || PLACEHOLDER;

/* Secondary images, in existing order. Image index 0 is
   the cover/main image that stays dominant on the left. */
const thumbnails =
images.slice(1);

/* Compact mobile gallery — show up to 2 thumbnails
   beside the main/cover image, then a subtle +N tile
   for any remaining images that don't fit. Keeps the
   same ~128px footprint as the old single image, reuses
   the existing openTradeInGallery lightbox, and never
   re-fetches data (all URLs already on the request). */
const MAX_THUMBS = 2;
const visibleThumbs =
thumbnails.slice(0, MAX_THUMBS);
const hiddenImages =
thumbnails.length > MAX_THUMBS
? thumbnails.length - MAX_THUMBS
: 0;

const galleryHtml =
thumbnails.length === 0
? `
    <img
      src="${mainImage}"
      alt="${vehicle}"
      width="640"
      height="360"
      loading="lazy"
      decoding="async"
      class="
        tradein-mobile-image
        w-full h-32 object-contain rounded-lg bg-gray-50 border border-gray-100 mt-2
      "
      onerror="this.onerror=null;this.src='${PLACEHOLDER}';"
    />`
: `
    <div class="tradein-mobile-gallery mt-2">
      <button
        type="button"
        onclick='openTradeInGallery(${JSON.stringify(images)}, 0)'
        class="tradein-gallery-main"
        aria-label="View vehicle image"
      >
        <img
          src="${mainImage}"
          alt="${vehicle}"
          loading="lazy"
          decoding="async"
          class="tradein-gallery-main-img"
          onerror="this.onerror=null;this.src='${PLACEHOLDER}';"
        />
      </button>

      <div class="tradein-gallery-thumbs">
        ${visibleThumbs.map((src, i) => `
        <button
          type="button"
          onclick='openTradeInGallery(${JSON.stringify(images)}, ${i + 1})'
          class="tradein-gallery-thumb-btn"
          aria-label="View vehicle image ${i + 2}"
        >
          <img
            src="${src}"
            alt=""
            loading="lazy"
            decoding="async"
            class="tradein-gallery-thumb-img"
            onerror="this.onerror=null;this.src='${PLACEHOLDER}';"
          />
        </button>
        `).join("")}

        ${hiddenImages > 0 ? `
        <button
          type="button"
          onclick='openTradeInGallery(${JSON.stringify(images)}, ${MAX_THUMBS})'
          class="tradein-gallery-thumb-btn tradein-gallery-more"
          aria-label="View all ${images.length} vehicle images"
        >
          <span class="tradein-gallery-more-n">+${hiddenImages}</span>
        </button>
        ` : ""}
      </div>
    </div>`;

return `

<div class="
bg-white
border
border-gray-200
rounded-2xl
p-3
min-w-0
tradein-mobile-card
">

<div class="
flex
items-start
justify-between
gap-2
">

<div class="min-w-0">

<p class="
font-semibold
text-[15px]
leading-tight
text-gray-900
break-words
">
${customer}
</p>

<p class="
text-[13px]
text-gray-500
mt-0.5
break-words
">
${vehicle}
</p>

</div>

<span class="
shrink-0
max-w-[55%]
text-right
px-2.5
py-1
rounded-full
bg-[#fff8e6]
border
border-[#d6b25e]
text-xs
font-medium
leading-snug
">

${status}

</span>

</div>

${galleryHtml}

<dl class="
grid
grid-cols-3
gap-2
mt-2
text-[13px]
">

<div class="min-w-0">

<dt class="text-gray-500 text-[11px] leading-none">
Mileage
</dt>

<dd class="
font-medium
text-gray-900
mt-1
break-words
">
${mileage} km
</dd>

</div>

<div class="min-w-0">

<dt class="text-gray-500 text-[11px] leading-none">
Valuations
</dt>

<dd class="
font-medium
text-gray-900
mt-1
">
${valuations}
</dd>

</div>

<div class="min-w-0">

<dt class="text-gray-500 text-[11px] leading-none">
Created
</dt>

<dd class="
font-medium
text-gray-900
mt-1
">
${created}
</dd>

</div>

</dl>

<div class="
flex
flex-wrap
gap-2
mt-3
pt-2.5
border-t
border-gray-100
">

<button
onclick="viewTradeInRequest(${index})"
class="
btn
btn-dark
min-h-[40px]
px-4
">
View
</button>

${
isDealer
? `
<button
onclick="openTradeInValuationModal(${index})"
class="
btn
btn-gold
min-h-[40px]
px-4
">
Value
</button>
`
: `
<button
onclick="editTradeInRequest(${index})"
class="
btn
btn-gold
min-h-[40px]
px-4
">
Edit
</button>

<button
onclick="deleteTradeInRequest(${index})"
class="
btn
btn-dark
min-h-[40px]
px-4
">
Delete
</button>
`
}

</div>

</div>

`;

}).join("");

}

}

}

console.log(
"FINAL TRADEINS BEFORE RENDER",
tradeInRequests
);

renderTradeInRows(
tradeInRequests
);

if(
!window.__TRADEIN_SUBSCRIPTION__
){

window.__TRADEIN_SUBSCRIPTION__ =
supabase
.channel(
"tradein-realtime"
)
.on(
"postgres_changes",
{
event:"*",
schema:"public",
table:"trade_in_requests_v2"
},
async () => {

console.log(
"TRADE-IN REALTIME REFRESH"
);

if(
window.__CURRENT_DASHBOARD_VIEW__ ===
"tradeins"
){

await window.loadView(
"tradeins",
true
);

}

}
)
.subscribe();

}

}

return;

}

}

/* =========================================
🔥 INVENTORY PERFORMANCE
========================================= */

async function loadInventoryPerformance(){

const box =
document.getElementById("performanceInventoryTable");

if(!box) return;

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user) return;

const user = userData.user;

const { data:vehicles } =
await supabase
.from("vehicles")
.select("*")
.eq("seller_id", user.id);

if(!vehicles || !vehicles.length){

box.innerHTML =
"<p>No inventory found</p>";

return;
}

const vehicleIds =
(vehicles || [])
.map(v=>v?.id)
.filter(Boolean);

const [
  viewsRes,
  savesRes,
  enquiriesRes,
  interestedRes
] = await Promise.all([

  vehicleIds.length
    ? supabase
      .from("vehicle_views")
      .select("*")
      .in("vehicle_id", vehicleIds)
    : Promise.resolve({ data: [] }),

  vehicleIds.length
    ? supabase
      .from("saved_vehicles")
      .select("*")
      .in("vehicle_id", vehicleIds)
    : Promise.resolve({ data: [] }),

  supabase
  .from("enquiries")
  .select("*")
  .eq("seller_id", user.id),

  vehicleIds.length
    ? supabase
      .from("vehicle_interest")
      .select("*")
      .in("vehicle_id", vehicleIds)
    : Promise.resolve({ data: [] })

]);

const views =
viewsRes.data || [];

const saves =
savesRes.data || [];

const enquiries =
enquiriesRes.data || [];

const interested =
interestedRes.data || [];

function countMap(list){

const map = {};

(list || []).forEach(x=>{

map[x.vehicle_id] =
(map[x.vehicle_id] || 0) + 1;

});

return map;

}

const viewMap = countMap(views);
const saveMap = countMap(saves);
const enquiryMap = countMap(enquiries);
const interestedMap = countMap(interested);

/* CACHE FOR ANALYTICS VIEW — the exact same real data loaded above,
   reused by renderPerfAnalytics() when the user switches to Analytics
   View. No extra database queries, no invented numbers, no changes to
   the existing table rendering below. */
window.__perfData = {
  vehicles,
  views,
  saves,
  enquiries,
  interested,
  viewMap,
  saveMap,
  enquiryMap,
  interestedMap
};

const perfView =
loadViewPreference("performance_view") || "list";

box.innerHTML = `

<!-- DESKTOP TABLE (hidden on mobile) -->
<div class="
hidden
xl:block
overflow-x-auto
w-full
rounded-[24px]
border border-white/10
">

<table class="
dashboard-table
min-w-[900px]
text-sm
">

<thead>

<tr>

<th>Vehicle</th>
<th class="text-center">Views</th>
<th class="text-center">Saves</th>
<th class="text-center">Enquiries</th>
<th class="text-center">Interested</th>
<th class="text-center">Status</th>

</tr>

</thead>

<tbody>

${(vehicles || []).map(v=>{

return `

<tr>

<td>

<div class="flex items-center gap-3">

<img
src="${v.image_url || PLACEHOLDER}"
loading="lazy"
decoding="async"
onerror="this.src='${PLACEHOLDER}'"
class="
w-20
h-14
object-cover
rounded-xl
flex-shrink-0
">

<div>

<p class="font-semibold">
${v.make || ""}
${v.model ? " " + v.model : ""}
</p>

<p class="text-xs text-gray-500">
${v.year || ""}
</p>

</div>

</div>

</td>

<td class="text-center">${viewMap[v.id] || 0}</td>
<td class="text-center">${saveMap[v.id] || 0}</td>
<td class="text-center">${enquiryMap[v.id] || 0}</td>
<td class="text-center">${interestedMap[v.id] || 0}</td>

<td class="text-center">
${getStatusBadge(v.status)}
</td>

</tr>

`;

}).join("")}

</tbody>

</table>

</div>

<!-- MOBILE LIST VIEW -->
<div
id="perfMobileList"
class="xl:hidden space-y-3 ${perfView === "grid" ? "hidden" : ""}">

${(vehicles || []).map(v=>{

return `

<div class="
flex
items-stretch
gap-3
rounded-2xl
border
border-white/10
bg-white/[0.03]
p-3
overflow-hidden
">

<img
src="${v.image_url || PLACEHOLDER}"
loading="lazy"
decoding="async"
onerror="this.src='${PLACEHOLDER}'"
class="
w-20
h-16
object-cover
rounded-xl
flex-shrink-0
">

<div class="min-w-0 flex-1">

<div class="flex items-start justify-between gap-2">

<div class="min-w-0">

<p class="font-semibold text-sm leading-tight truncate">
${v.make || ""}
${v.model ? " " + v.model : ""}
</p>

<p class="text-xs text-gray-500">
${v.year || ""}
</p>

</div>

${getStatusBadge(v.status)}

</div>

<div class="
grid
grid-cols-4
gap-1
mt-2
text-center
">

<div class="rounded-lg bg-white/5 py-1">
<p class="text-xs font-bold leading-none">${viewMap[v.id] || 0}</p>
<p class="text-[10px] text-gray-500 mt-0.5">Views</p>
</div>

<div class="rounded-lg bg-white/5 py-1">
<p class="text-xs font-bold leading-none">${saveMap[v.id] || 0}</p>
<p class="text-[10px] text-gray-500 mt-0.5">Saves</p>
</div>

<div class="rounded-lg bg-white/5 py-1">
<p class="text-xs font-bold leading-none">${enquiryMap[v.id] || 0}</p>
<p class="text-[9px] text-gray-500 mt-0.5">Enquiries</p>
</div>

<div class="rounded-lg bg-white/5 py-1">
<p class="text-xs font-bold leading-none">${interestedMap[v.id] || 0}</p>
<p class="text-[9px] text-gray-500 mt-0.5">Interested</p>
</div>

</div>

</div>

</div>

`;

}).join("")}

</div>

<!-- MOBILE GRID VIEW -->
<div
id="perfMobileGrid"
class="xl:hidden grid grid-cols-2 gap-3 ${perfView === "grid" ? "" : "hidden"}">

${(vehicles || []).map(v=>{

return `

<div class="
rounded-2xl
border
border-white/10
bg-white/[0.03]
overflow-hidden
flex
flex-col
">

<img
src="${v.image_url || PLACEHOLDER}"
loading="lazy"
decoding="async"
onerror="this.src='${PLACEHOLDER}'"
class="
w-full
h-24
object-contain
flex-shrink-0
bg-white
">

<div class="p-2 flex-1 flex flex-col">

<p class="font-semibold text-xs leading-tight truncate">
${v.make || ""}
${v.model ? " " + v.model : ""}
</p>

<p class="text-[10px] text-gray-500">
${v.year || ""}
</p>

<div class="
grid
grid-cols-2
gap-1
mt-2
text-center
">

<div class="rounded-lg bg-white/5 py-1.5 px-1">
<span class="text-xs font-bold block leading-none">${viewMap[v.id] || 0}</span>
<span class="text-[11px] text-gray-500 block mt-1">Views</span>
</div>

<div class="rounded-lg bg-white/5 py-1.5 px-1">
<span class="text-xs font-bold block leading-none">${saveMap[v.id] || 0}</span>
<span class="text-[11px] text-gray-500 block mt-1">Saves</span>
</div>

<div class="rounded-lg bg-white/5 py-1.5 px-1">
<span class="text-xs font-bold block leading-none">${enquiryMap[v.id] || 0}</span>
<span class="text-[11px] text-gray-500 block mt-1">Enquiries</span>
</div>

<div class="rounded-lg bg-white/5 py-1.5 px-1">
<span class="text-xs font-bold block leading-none">${interestedMap[v.id] || 0}</span>
<span class="text-[11px] text-gray-500 block mt-1">Interested</span>
</div>

</div>

<div class="mt-1.5 flex justify-center">
${getStatusBadge(v.status)}
</div>

</div>

</div>

`;

}).join("")}

</div>

`;

/* INIT MOBILE VIEW TOGGLE */
const toggleContainer =
document.getElementById("performanceViewToggle");

if(toggleContainer){

renderViewToggle("performanceViewToggle", {
viewMode: perfView,
persistentKey: "performance_view",
onToggle: (mode)=>{

const listEl =
document.getElementById("perfMobileList");

const gridEl =
document.getElementById("perfMobileGrid");

if(mode === "grid"){

if(listEl) listEl.classList.add("hidden");
if(gridEl) gridEl.classList.remove("hidden");

}else{

if(gridEl) gridEl.classList.add("hidden");
if(listEl) listEl.classList.remove("hidden");

}

}
});

}

}

/* =========================================
PERFORMANCE — ANALYTICS VIEW
Renders visual statistics from window.__perfData,
the exact real data already fetched by
loadInventoryPerformance(). Switched client-side
by setPerfMode() without reloading or refetching.
No external chart library (matches Overview).
========================================= */

function perfVehicleName(v){

return (
(v.make || "") +
(v.model ? " " + v.model : "") +
(v.year ? " · " + v.year : "")
).trim() || "Unnamed vehicle";

}

function perfStatCard(label,value){

return `
<div class="
rounded-2xl
border border-white/10
bg-white/[0.03]
p-5
">

<p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
${label}
</p>

<p class="mt-2 text-2xl font-black text-[#08111F] tabular-nums">
${value.toLocaleString()}
</p>

</div>
`;

}

function perfSection(title,subtitle,legendItems,inner){

return `
<div class="
rounded-2xl
border border-white/10
bg-white/[0.03]
p-5
">

<div class="mb-4">

<h3 class="text-base font-black tracking-[-0.02em] text-[#08111F]">
${title}
</h3>

<p class="text-xs text-gray-500 mt-0.5">
${subtitle}
</p>

</div>

${
legendItems && legendItems.length ?
`<div class="flex flex-wrap items-center gap-4 mb-4">

${legendItems.map(l=>`

<span class="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">

<span
class="w-2.5 h-2.5 rounded-full inline-block"
style="background:${l.color}"
></span>
${l.label}

</span>

`).join("")}

</div>`
: ""
}

${inner}

</div>
`;

}

function perfCompareRows(cache,mapKeyA,mapKeyB,aColor,bColor,aLabel,bLabel,emptyText){

/* Single-metric mode: when mapKeyB is null only the
   A series is rendered (used by Vehicle Performance). */

const dual = !!mapKeyB;

const rows =
(cache.vehicles || [])
.map(v=>({

name: perfVehicleName(v),
a: cache[mapKeyA][v.id] || 0,
b: dual ? (cache[mapKeyB][v.id] || 0) : 0

}))
.filter(r=>r.a > 0 || r.b > 0)
.sort((x,y)=>(y.a + y.b) - (x.a + x.b))
.slice(0,8);

if(!rows.length){
return `<p class="text-sm text-gray-500">${emptyText}</p>`;
}

const maxV =
Math.max(...rows.map(r=>Math.max(r.a,r.b)),1);

const pct = v =>
Math.round((v / maxV) * 100);

return `
<div class="space-y-4">

${rows.map(r=>`
<div>

<div class="flex items-baseline justify-between gap-3">

<p class="truncate text-xs font-semibold text-[#08111F]">
${r.name}
</p>

<p class="shrink-0 text-[11px] text-gray-500 tabular-nums">
${
dual
? `<b style="color:${aColor}">${r.a.toLocaleString()}</b> / <b style="color:${bColor}">${r.b.toLocaleString()}</b>`
: `<b style="color:${aColor}">${r.a.toLocaleString()}</b>`
}
</p>

</div>

<div class="mt-1.5 space-y-1">

<div class="h-2 rounded-full bg-slate-100 overflow-hidden">
<div class="h-full rounded-full" style="width:${pct(r.a)}%;background:${aColor};transition:width .3s ease"></div>
</div>

${
dual
? `
<div class="h-2 rounded-full bg-slate-100 overflow-hidden">
<div class="h-full rounded-full" style="width:${pct(r.b)}%;background:${bColor};transition:width .3s ease"></div>
</div>
`
: ""
}

</div>

</div>
`).join("")}

</div>
`;

}

window.setPerfMode = function(mode){

const ok =
["table","analytics"].includes(mode)
? mode
: "table";

document
.querySelectorAll("[data-perf-mode]")
.forEach(btn=>{

btn.classList.toggle(
"active",
btn.dataset.perfMode === ok
);

});

const tableBox =
document.getElementById("performanceInventoryTable");

const analyticsBox =
document.getElementById("perfAnalyticsView");

if(!tableBox || !analyticsBox){
return;
}

if(ok === "analytics"){

tableBox.classList.add("hidden");

analyticsBox.classList.remove("hidden");

window.renderPerfAnalytics();

}else{

analyticsBox.classList.add("hidden");

tableBox.classList.remove("hidden");

}

};

window.renderPerfAnalytics = function(){

const root =
document.getElementById("perfAnalyticsView");

if(!root){
return;
}

const cache =
window.__perfData;

if(
!cache ||
!cache.vehicles ||
!cache.vehicles.length
){

root.innerHTML =
`<p class="text-sm text-gray-500">No performance data available yet.</p>`;

return;

}

/* TOTALS — straight counts of the real rows already loaded */

const totals = {

views: (cache.views || []).length,

saves: (cache.saves || []).length,

enquiries: (cache.enquiries || []).length,

interested: (cache.interested || []).length

};

/* ENGAGEMENT OVERVIEW — relative comparison of the
   four real totals above */

const engagementMax =
Math.max(
totals.views,
totals.saves,
totals.enquiries,
totals.interested,
1
);

const engagementRows =
[
{label:"Views",value:totals.views,color:"#F28C28"},
{label:"Saves",value:totals.saves,color:"#0A192F"},
{label:"Enquiries",value:totals.enquiries,color:"#E48A2F"},
{label:"Interested",value:totals.interested,color:"#2563EB"}
];

const engagementInner = `
<div class="space-y-4">

${engagementRows.map(row=>`
<div>

<div class="flex items-baseline justify-between gap-3">

<p class="text-xs font-semibold text-[#08111F]">
${row.label}
</p>

<p class="text-xs font-bold text-gray-500 tabular-nums">
${row.value.toLocaleString()}
</p>

</div>

<div class="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
<div class="h-full rounded-full" style="width:${Math.round((row.value / engagementMax) * 100)}%;background:${row.color};transition:width .3s ease"></div>
</div>

</div>
`).join("")}

</div>
`;

root.innerHTML = `

<!-- TOTALS -->
<div class="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">

${perfStatCard("Total Views",totals.views)}
${perfStatCard("Total Saves",totals.saves)}
${perfStatCard("Total Enquiries",totals.enquiries)}
${perfStatCard("Total Interested",totals.interested)}

</div>

<!-- VIEWS VS SAVES -->
${perfSection(
"Views vs Saves",
"Views compared with saves across your vehicles.",
[
{label:"Views",color:"#F28C28"},
{label:"Saves",color:"#0A192F"}
],
perfCompareRows(
cache,"viewMap","saveMap","#F28C28","#0A192F",
"No views or saves recorded yet."
)
)}

<!-- ENQUIRIES VS INTERESTED -->
${perfSection(
"Enquiries vs Interested",
"Enquiry and buyer-interest activity across your vehicles.",
[
{label:"Enquiries",color:"#F28C28"},
{label:"Interested",color:"#2563EB"}
],
perfCompareRows(
cache,"enquiryMap","interestedMap","#F28C28","#2563EB",
"No enquiries or interested activity recorded yet."
)
)}

<!-- VEHICLE PERFORMANCE -->
${perfSection(
"Vehicle Performance",
"Your vehicles ranked by views received.",
[{label:"Views",color:"#F28C28"}],
perfCompareRows(
cache,"viewMap",null,"#F28C28","rgba(10,37,64,0.15)",
"No views recorded yet."
)
)}

<!-- ENGAGEMENT OVERVIEW -->
${perfSection(
"Engagement Overview",
"How your four engagement metrics compare overall.",
null,
engagementInner
)}

`;

};

/* =========================================
🔥 BUYER INTELLIGENCE ENGINE
========================================= */

function calculateBuyerScore(buyer){

const enquiryWeight =
Number(buyer.enquiries || 0) * 5;

const interestedWeight =
Number(buyer.interested || 0) * 6;

const financeWeight =
Number(buyer.finance || 0) * 8;

const saveWeight =
Number(buyer.saves || 0) * 2;

return (
enquiryWeight
+
interestedWeight
+
financeWeight
+
saveWeight
);

}

function getBuyerTier(score){

if(score >= 60){

return {
label: "High Intent",
badge: "🔥 Priority Buyer",
className: `
bg-red-500/15
text-red-400
border-red-500/20
`
};

}

if(score >= 35){

return {
label: "Warm Lead",
badge: "🚀 Strong Prospect",
className: `
bg-orange-500/15
text-orange-300
border-orange-500/20
`
};

}

if(score >= 15){

return {
label: "Engaged",
badge: "📈 Active Shopper",
className: `
bg-yellow-500/15
text-yellow-300
border-yellow-500/20
`
};

}

return {
label: "Low Activity",
badge: "⚡ Passive",
className: `
bg-blue-500/15
text-blue-300
border-blue-500/20
`
};

}

function getBuyerUrgency(score){

if(score >= 60){
return "Immediate";
}

if(score >= 35){
return "High";
}

if(score >= 15){
return "Moderate";
}

return "Low";

}

async function loadInterestedBuyers(){

const box =
document.getElementById("interestedBuyersList");

if(!box || !document.body.contains(box)) return;

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user) return;

const user = userData.user;

const { data:vehicles } =
await supabase
.from("vehicles")
.select("id,make,model")
.eq("seller_id", user.id);

const ids =
(vehicles || [])
.map(v=>v?.id)
.filter(Boolean);

const { data } =
ids.length
? await supabase
  .from("vehicle_interest")
  .select(`
    *,
    vehicles(
      make,
      model,
      year,
      price
    )
  `)
  .in("vehicle_id", ids)
  .order("created_at",{ascending:false})
: { data: [] };

if(!data || !data.length){

box.innerHTML =
"<p>No interested buyers yet</p>";

return;
}

box.innerHTML = data.map(i=>{

const score =
calculateBuyerScore({
enquiries: 1,
interested: 1,
finance: 0,
saves: 1
});

const tier =
getBuyerTier(score);

const urgency =
getBuyerUrgency(score);

return `

<div class="
dashboard-buyer-card
flex
flex-col
lg:flex-row
lg:items-center
justify-between
gap-4
">

<div>

<h3 class="font-bold text-lg">
${i.buyer_name || "Interested Buyer"}
</h3>

<p class="text-sm text-gray-400">
${i.buyer_email || "No email"}
</p>

<p class="text-sm text-gray-400">
${i.buyer_phone || "No phone"}
</p>

<div class="mt-3">

<p class="font-semibold text-white">
${i.vehicles?.make || ""}
${i.vehicles?.model ? " " + i.vehicles.model : ""}
</p>

<p class="text-sm text-gray-400">
${i.vehicles?.year || ""}
•
R ${Number(i.vehicles?.price || 0).toLocaleString()}
</p>

</div>

<p class="text-xs text-gray-400 mt-1">
${i.created_at
? formatSATime(i.created_at)
: ""}
</p>

</div>

<div class="
flex
flex-wrap
gap-2
items-center
">

<div class="
px-3
py-1
rounded-full
border
text-xs
font-semibold
${tier.className}
">
${tier.badge}
</div>

<div class="
px-3
py-1
rounded-full
bg-white/5
border
border-white/10
text-xs
font-semibold
text-white/80
">
Urgency: ${urgency}
</div>

</div>

<div class="
rounded-2xl
bg-white/5
border
border-white/10
p-4
text-sm
text-white/70
leading-relaxed
">

<span class="font-semibold text-white">
AI Recommendation:
</span>

${
score >= 60
? "High priority buyer. Contact immediately."
: score >= 35
? "Strong buyer intent detected."
: score >= 15
? "Continue nurturing this lead."
: "Low urgency buyer activity."
}

</div>

<div class="
flex
flex-col
sm:flex-row
gap-2
w-full
sm:w-auto
">

<button
onclick="openBuyerWhatsapp('${i.buyer_phone || ""}')"
class="btn btn-dark w-full sm:w-auto">
WhatsApp
</button>

<button
onclick="emailBuyer('${i.buyer_email || ""}')"
class="btn btn-gold w-full sm:w-auto">
Email Buyer
</button>

</div>

</div>

`;
}).join("");

}

/* =========================================
🔥 INVENTORY INTELLIGENCE ENGINE
========================================= */

function calculateInventoryHealth(vehicle){

const views =
Number(vehicle.views || 0);

const saves =
Number(vehicle.saves || 0);

const enquiries =
Number(vehicle.enquiries || 0);

const interested =
Number(vehicle.interested || 0);

const ageDays =
vehicle.created_at
? (
Date.now()
-
new Date(vehicle.created_at)
)
/
86400000
: 0;

let score =
(
views * 1
+
saves * 2
+
enquiries * 4
+
interested * 5
);

/* =========================================
STALE PENALTIES
========================================= */

if(ageDays > 30){
score -= 15;
}

if(ageDays > 60){
score -= 35;
}

if(ageDays > 90){
score -= 60;
}

/* =========================================
PREMIUM BOOSTS
========================================= */

if(vehicle.is_sponsored){
score += 40;
}

if(vehicle.homepage_boost){
score += 25;
}

if(vehicle.premium_dealer){
score += 20;
}

return Math.max(0, Math.round(score));

}

function getInventoryHealth(score){

if(score >= 180){

return {
label: "Excellent",
badge: "🔥 High Performing",
className: `
bg-green-500/15
text-green-400
border-green-500/20
`
};

}

if(score >= 90){

return {
label: "Strong",
badge: "🚀 Growing Fast",
className: `
bg-blue-500/15
text-blue-300
border-blue-500/20
`
};

}

if(score >= 40){

return {
label: "Moderate",
badge: "📈 Stable",
className: `
bg-yellow-500/15
text-yellow-300
border-yellow-500/20
`
};

}

return {
label: "Weak",
badge: "⚠ Needs Attention",
className: `
bg-red-500/15
text-red-400
border-red-500/20
`
};

}

/* REMOVED: getInventoryRecommendation(score)
   Existed exclusively to render the removed
   Inventory-card AI Recommendation block. */

window.__CRM_FILTER__ =
window.__CRM_FILTER__ || "all";

/* ============================================================
NEW INTEREST BADGE
A "new interested lead" = an UNREAD crm_notifications row
(title "New Vehicle Interest", written by createVehicleInterest)
whose linked enquiries lead is STILL status "interested".
Reuses the existing CRM notification system — no new tables.

The count is rendered on:
  • the sidebar "CRM Leads" nav tab  (#crmNavBadge)
  • the pipeline "Interested" filter chip
    (#crmInterestedFilterBadge)
============================================================ */

window.updateCRMInterestBadges = async function(){

try{

const { data:userData } =
await supabase.auth.getUser();

const user =
userData?.user;

if(!user) return;

const { data:notifs } =
await supabase
.from("crm_notifications")
.select("id,lead_id")
.eq("dealer_id", user.id)
.eq("is_read", false);

let count = 0;

if(notifs && notifs.length){

const leadIds =
[...new Set(
notifs.map(n => n.lead_id).filter(Boolean)
)];

if(leadIds.length){

const { data:leads } =
await supabase
.from("enquiries")
.select("id,status")
.in("id", leadIds);

const statusById = {};

(leads || []).forEach(l=>{
statusById[l.id] = l.status;
});

count =
notifs.filter(
n => statusById[n.lead_id] === "interested"
).length;

}

}

["crmNavBadge","crmInterestedFilterBadge"]
.forEach(id=>{

const el =
document.getElementById(id);

if(!el) return;

if(count > 0){
el.textContent = count;
el.classList.remove("hidden");
}else{
el.classList.add("hidden");
}

});

}catch(err){

console.warn(
"Interest badge update skipped:",
err
);

}

};

/* Acknowledge: dealer opened the Interested tab — mark the
   matching unread new-interest notifications as read so the
   badges clear. Same is_read write the existing per-item
   "Read" button uses. */

window.acknowledgeInterestedNotifications =
async function(){

try{

const { data:userData } =
await supabase.auth.getUser();

const user =
userData?.user;

if(!user) return;

const { data:notifs } =
await supabase
.from("crm_notifications")
.select("id,lead_id")
.eq("dealer_id", user.id)
.eq("is_read", false);

if(!notifs || !notifs.length) return;

const leadIds =
[...new Set(
notifs.map(n => n.lead_id).filter(Boolean)
)];

if(!leadIds.length) return;

const { data:leads } =
await supabase
.from("enquiries")
.select("id,status")
.in("id", leadIds);

const statusById = {};

(leads || []).forEach(l=>{
statusById[l.id] = l.status;
});

const ids =
notifs
.filter(
n => statusById[n.lead_id] === "interested"
)
.map(n => n.id);

if(!ids.length) return;

await supabase
.from("crm_notifications")
.update({ is_read:true })
.in("id", ids);

}catch(err){

console.warn(
"Acknowledge interested notifications skipped:",
err
);

}

};

/* UI ONLY: keep the active filter chip highlighted.
   Mirrors the existing ov-seg-btn.active /
   Messages .crm-filter-btn.active patterns.
   No filter, search, refresh or query logic is
   affected in any way. */

window.syncCRMFilterButtons = function(){

const status =
window.__CRM_FILTER__ || "all";

document
.querySelectorAll("#crmFilterRow .btn")
.forEach(btn=>{

btn.classList.toggle(
"crm-filter-active",
btn.getAttribute("onclick") === `setCRMFilter('${status}')`
);

});

};

window.setCRMFilter = function(status){

window.__CRM_FILTER__ = status;

/* Sync the highlighted chip (presentation only). */
window.syncCRMFilterButtons();

if(status === "interested"){

/* Dealer is viewing the Interested tab — acknowledge the
   new-interest CRM notifications so the badge clears,
   then reload (which also refreshes the badges). */
window.acknowledgeInterestedNotifications()
.then(()=> window.loadCRMLeads());

return;

}

window.loadCRMLeads();

};

window.loadCRMLeads = async function(){

const table =
document.getElementById("crmLeadTable");

if(!table) return;

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user) return;

const user = userData.user;

const { data:leads } =
await supabase
.from("enquiries")
.select("*")
.eq("seller_id", user.id)
.order("created_at",{ascending:false});

const { data:crmTasks } =
await supabase
.from("crm_tasks")
.select("*");

/* =========================================
VEHICLE INTEREST LEADS
Real "Interested" actions from the Vehicle
Details page (vehicle_interest table) are
merged into this existing CRM lead list so
the existing Interested tab/count reflects them.
========================================= */

const { data:sellerVehicles } =
await supabase
.from("vehicles")
.select("id,make,model,year")
.eq("seller_id", user.id);

const sellerVehicleIds =
(sellerVehicles || [])
.map(v => v?.id)
.filter(Boolean);

let interestLeads = [];

if(sellerVehicleIds.length){

const { data:interests } =
await supabase
.from("vehicle_interest")
.select("*")
.in("vehicle_id", sellerVehicleIds)
.order("created_at",{ascending:false});

const vehicleMap =
new Map(
(sellerVehicles || []).map(v => [v.id, v])
);

interestLeads =
(interests || []).map(interest => {

const veh =
vehicleMap.get(interest.vehicle_id);

const vehicleLabel =
veh
? [veh.year, veh.make, veh.model]
.filter(Boolean)
.join(" ")
: "your vehicle";

return {

id: interest.id,

name:
interest.buyer_name ||
"Interested Buyer",

email:
interest.buyer_email || "",

phone:
interest.buyer_phone || "",

status: "interested",

message:
`Expressed interest in ${vehicleLabel}.`,

created_at: interest.created_at,

enquiryCount: 1,

vehicleCount: 1,

isInterest: true

};

});

}

/* Helper: identity key used by the existing dedupe logic */
function leadIdentityKey(lead){

return (
lead.email?.trim()?.toLowerCase() ||
lead.phone?.replace(/\D/g,"") ||
lead.name?.trim()?.toLowerCase() ||
lead.id
);

}

/* Only add interest leads that don't already exist
   as an enquiry lead for the same person — merged
   further down once uniqueLeadMap is populated */

const uniqueLeadMap = new Map();

(leads || []).forEach(lead => {

const key =
lead.email?.trim()?.toLowerCase() ||
lead.phone?.replace(/\D/g,"") ||
lead.name?.trim()?.toLowerCase() ||
lead.id;

/* keep newest record for each person */
if(
!uniqueLeadMap.has(key) ||
new Date(lead.created_at) >
new Date(uniqueLeadMap.get(key).created_at)
){
uniqueLeadMap.set(key, lead);
}

});

let uniqueLeadList =
Array.from(uniqueLeadMap.values());

/* =========================================
MERGE VEHICLE INTEREST LEADS
Appended after enquiry dedupe; skip any whose
identity already exists as an enquiry lead.
========================================= */

uniqueLeadList =
uniqueLeadList.concat(
interestLeads.filter(interest => {

const key =
leadIdentityKey(interest);

if(uniqueLeadMap.has(key)) return false;

uniqueLeadMap.set(key, interest);

return true;

})
);

const crmSearchValue =
(
document.getElementById("crmLeadSearch")
?.value || ""
)
.toLowerCase()
.trim();

if(crmSearchValue){

uniqueLeadList =
uniqueLeadList.filter(lead => {

return (

(lead.name || "")
.toLowerCase()
.includes(crmSearchValue)

||

(lead.email || "")
.toLowerCase()
.includes(crmSearchValue)

||

(lead.phone || "")
.toLowerCase()
.includes(crmSearchValue)

||

(lead.status || "new")
.toLowerCase()
.includes(crmSearchValue)

);

});

}

const activeFilter =
window.__CRM_FILTER__ || "all";

if(activeFilter !== "all"){

uniqueLeadList =
uniqueLeadList.filter(
lead =>
(lead.status || "new") === activeFilter
);

}

const enquiryCounts = {};

(leads || []).forEach(lead => {

const key =
lead.email?.trim()?.toLowerCase() ||
lead.phone?.replace(/\D/g,"") ||
lead.name?.trim()?.toLowerCase() ||
lead.id;

enquiryCounts[key] =
(enquiryCounts[key] || 0) + 1;

});

uniqueLeadList.forEach(lead => {

const key =
lead.email?.trim()?.toLowerCase() ||
lead.phone?.replace(/\D/g,"") ||
lead.name?.trim()?.toLowerCase() ||
lead.id;

lead.enquiryCount =
enquiryCounts[key] || 1;

/* VEHICLE INTEREST COUNT */

const leadVehicles =
(leads || [])
.filter(item => {

const itemKey =
item.email?.trim()?.toLowerCase() ||
item.phone?.replace(/\D/g,"") ||
item.name?.trim()?.toLowerCase() ||
item.id;

return itemKey === key;

})
.map(item => item.vehicle_id)
.filter(Boolean);

lead.vehicleCount =
new Set(leadVehicles).size;

/* LAST CONTACT DATE */

lead.lastContactDate =
formatSATime(
lead.created_at
);

/* FOLLOW UP BADGE */

const leadTask =
(crmTasks || [])
.filter(task =>
task.lead_id === lead.id
)
.sort((a,b)=>
new Date(a.due_date) -
new Date(b.due_date)
)[0];

if(leadTask?.due_date){

const today =
new Date();

today.setHours(0,0,0,0);

const dueDate =
new Date(leadTask.due_date);

dueDate.setHours(0,0,0,0);

const diffDays =
Math.ceil(
(dueDate - today)
/
86400000
);

if(diffDays <= 0){

lead.followUpLabel =
"Follow Up Due Today";

lead.followUpClass =
"bg-red-50 text-red-700 border border-red-200";

}else if(diffDays === 1){

lead.followUpLabel =
"Follow Up Tomorrow";

lead.followUpClass =
"bg-amber-50 text-amber-700 border border-amber-200";

}else{

lead.followUpLabel =
`Follow Up In ${diffDays} Days`;

lead.followUpClass =
"bg-blue-50 text-blue-700 border border-blue-200";

}

}

/* FRESH VEHICLE INTEREST — make sure the dealer knows
   they still need to reach out when no follow-up task
   has been created for this lead yet. */
if(
  !lead.followUpLabel &&
  (lead.isInterest || lead.lead_source === "vehicle_interest")
){

lead.followUpLabel = "Action Needed — New Interest";
lead.followUpClass =
"bg-orange-50 text-orange-700 border border-orange-200";

}

/* LEAD PRIORITY */

const isInterestLead =
(lead.isInterest ||
 lead.lead_source === "vehicle_interest");

if(lead.enquiryCount >= 5){

lead.priorityLabel = "Hot Lead";
lead.priorityClass =
"bg-red-50 text-red-700 border border-red-200";

}else if(
  lead.enquiryCount >= 2 ||
  isInterestLead
){

lead.priorityLabel = "Warm Lead";
lead.priorityClass =
"bg-yellow-50 text-yellow-700 border border-yellow-200";

}else{

lead.priorityLabel = "Cold Lead";
lead.priorityClass =
"bg-slate-50 text-slate-600 border border-slate-200";

}

});

const newCount =
uniqueLeadList.filter(
x => !x.status || x.status === "new"
).length;

const contactedCount =
uniqueLeadList.filter(
x => x.status === "contacted"
).length;

const interestedCount =
uniqueLeadList.filter(
x => x.status === "interested"
).length;

const negotiatingCount =
uniqueLeadList.filter(
x => x.status === "negotiating"
).length;

const closedCount =
uniqueLeadList.filter(
x => x.status === "closed"
).length;

const conversionRate =
(leads || []).length
? Math.round(
(closedCount / leads.length) * 100
)
: 0;

const leadCounter =
document.getElementById(
"crmLeadCount"
);

if(leadCounter){
leadCounter.innerText =
`(${uniqueLeadList.length})`;
}

[
  ["crmNewLeads", newCount],
  ["crmContacted", contactedCount],
  ["crmInterested", interestedCount],
  ["crmNegotiating", negotiatingCount],
  ["crmClosed", closedCount]
].forEach(([id,value])=>{

  const el = document.getElementById(id);

  if(el){
    el.textContent = value || 0;
  }

});

const { count:notifCount } =
await supabase
.from("crm_notifications")
.select("*",{
  count:"exact",
  head:true
})
.eq("dealer_id", user.id)
.eq("is_read", false);

const crmConversion =
document.getElementById("crmConversion");

if(crmConversion){
crmConversion.innerText =
conversionRate + "%";
}

const crmNotifications =
document.getElementById("crmNotifications");

if(crmNotifications){
  crmNotifications.innerText =
  notifCount || 0;
}

/* Refresh the new-interest badges (sidebar CRM Leads tab +
   Interested filter chip) — runs whenever CRM Leads loads. */
window.updateCRMInterestBadges();

if(
(!leads || !leads.length) &&
!interestLeads.length
){

table.innerHTML = `
<div class="
rounded-[18px]
border
border-dashed
border-slate-300
bg-slate-50
p-8
text-center
">

<h3 class="
text-lg
font-bold
text-[#0A192F]
mb-2
">
No Leads Yet
</h3>

<p class="text-sm text-gray-500">
Customer enquiries from your vehicles will appear here.
</p>

</div>
`;

return;
}

if(!table){
  return;
}


const searchBox =
document.getElementById(
"crmLeadSearch"
);

if(
searchBox &&
!searchBox.dataset.bound
){

searchBox.dataset.bound = "true";

searchBox.addEventListener(
"input",
()=>{

clearTimeout(
window.__crmSearchTimer
);

window.__crmSearchTimer =
setTimeout(()=>{

window.loadCRMLeads();

},150);

}
);

}

table.innerHTML = uniqueLeadList.map(l => {

const isInt =
(l.isInterest ||
 l.lead_source === "vehicle_interest");

const openable =
(!l.isInterest) ||
l.lead_source === "vehicle_interest";

const firstName =
(l.name || "").trim();
const surnamePart =
(l.surname || "").trim();

const initials =
((firstName.charAt(0) || "") +
 (surnamePart.charAt(0) || ""))
.toUpperCase()
|| (firstName.charAt(0) || "U").toUpperCase();

const vehicleLabel =
isInt && l.vehicle_title
? l.vehicle_title
: `${l.vehicleCount || 1} Vehicle${(l.vehicleCount || 1) === 1 ? "" : "s"}`;

const enquiryLabel =
`${l.enquiryCount || 1} Enquir${(l.enquiryCount || 1) === 1 ? "y" : "ies"}`;

return `

<div class="crm2-card">

<div class="crm2-id">

<div class="crm2-avatar">${initials}</div>

<div class="crm2-idmeta">

<h3 class="crm2-name">${l.name || "Unknown"}${l.surname ? ` ${l.surname}` : ""}</h3>

<p class="crm2-sub">Potential Buyer${isInt ? ` &middot; <span class="crm2-hot">Vehicle Interest</span>` : ""}</p>

<p class="crm2-contact">${l.email ? `<a href="mailto:${l.email}">${l.email}</a>` : "No email on record"}${l.phone ? ` &middot; ${l.phone}` : ""}</p>

</div>

</div>

<span class="crm2-status crm-status-pill crm-status-${(l.status || "new").replace(/\s/g,"")}">${l.status || "new"}</span>

<div class="crm2-body">

<div class="crm2-vehicle">

<span class="crm2-kicker">Vehicle of interest</span>

<div class="crm2-vehicle-row">

<span class="crm2-vehicle-name">${vehicleLabel}</span>

<span class="crm2-enquiry-count">${enquiryLabel}</span>

</div>

</div>

<div class="crm2-enquiry">

<span class="crm2-kicker">Latest enquiry</span>

<p class="crm2-enquiry-text">&ldquo;${l.message || "No message supplied"}&rdquo;</p>

<span class="crm2-enquiry-meta">${l.lastContactDate || "-"}</span>

</div>

</div>

<div class="crm2-badges">

<span class="crm-priority-pill ${l.priorityClass}">${l.priorityLabel}</span>

${
l.followUpLabel
? `<span class="crm-priority-pill ${l.followUpClass}">${l.followUpLabel}</span>`
: ""
}

</div>

<div class="crm2-actions">

${
!openable
? `
<!-- Interest lead: contact the buyer via the
     existing WhatsApp contact action -->
<button
onclick="
window.open(
'https://wa.me/${(l.phone || '').replace(/\D/g,'')}',
'_blank'
)
"
class="crm-btn-whatsapp crm-btn-block">
Contact Buyer
</button>
`
: `
<button
onclick="openLeadDetails('${l.id}')"
class="crm-btn-primary crm-btn-block">
Open Lead
</button>

<button
onclick="messageLead('${l.id}')"
class="crm-icon-btn crm-icon-btn-msg"
type="button" title="Message Lead" aria-label="Message Lead">
<svg class="crm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
</button>

<button
onclick="
window.open(
'https://wa.me/${(l.phone || '').replace(/\D/g,'')}',
'_blank'
)
"
class="crm-icon-btn crm-icon-btn-wa"
type="button" title="WhatsApp" aria-label="WhatsApp">
<svg class="crm-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
</button>

<button
onclick="deleteLead('${l.id}')"
class="crm-icon-btn crm-icon-btn-del"
type="button" title="Delete lead" aria-label="Delete lead">
<svg class="crm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
</button>
`
}

</div>

</div>

`; }).join("");
};

/* =========================================
CRM TASKS
========================================= */

/* =========================================
MESSAGE LEAD — resolves THIS lead's real
enquiry to its canonical buyer + dealer +
vehicle conversation (creating/restoring the
legitimate conversation from the enquiry data
via the application's existing mechanism when
the messages row does not exist yet), THEN
opens the existing Messages page with the
conversation selected. The conversation is
guaranteed to exist before navigation, so the
dealer lands directly in a replyable thread.
========================================= */

window.messageLead = async function(leadId){

if(!leadId){
alert("This lead could not be identified.");
return;
}

const result =
await resolveLeadConversation(leadId);

if(!result || result.error){

console.error(
"Message Lead could not resolve a conversation:",
result?.error
);

alert(
"Sorry — this lead could not be opened as a conversation. Please try again or contact support."
);

return;

}

sessionStorage.setItem(
  "crmConversationLead",
  JSON.stringify({
    vehicle_id: result.vehicle_id,
    user_id: result.user_id,
    seller_id: result.seller_id
  })
);

navigate("/messages");

};

window.openLeadDetails = async function(leadId){

  window.__CURRENT_OPEN_LEAD_ID__ =
leadId;

const table =
document.getElementById("crmLeadTable");

if(!table) return;

const { data:lead, error } =
await supabase
.from("enquiries")
.select("*")
.eq("id", leadId)
.single();

if(!lead){
return;
}

const leadKey =
lead.email?.trim()?.toLowerCase() ||
lead.phone?.replace(/\D/g,"") ||
lead.name?.trim()?.toLowerCase();

const { data:allLeadEnquiries } =
await supabase
.from("enquiries")
.select("*")
.eq("seller_id", lead.seller_id)
.order("created_at",{ascending:false});

const relatedEnquiries =
(allLeadEnquiries || []).filter(item => {

const itemKey =
item.email?.trim()?.toLowerCase() ||
item.phone?.replace(/\D/g,"") ||
item.name?.trim()?.toLowerCase();

return itemKey === leadKey;

});

const uniqueVehicles = [];

relatedEnquiries.forEach(item => {

const existingVehicle = uniqueVehicles.find(
v => v.vehicle_id === item.vehicle_id
);

if(!existingVehicle){
uniqueVehicles.push(item);
}

});

const vehicleIds = uniqueVehicles
.map(v => v.vehicle_id)
.filter(Boolean);

const { data:vehiclesData = [] } =
vehicleIds.length
? await supabase
.from("vehicles")
.select(`
id,
make,
model,
year,
price,
image_url,
images
`)
.in("id", vehicleIds)
: { data: [] };

const vehicleMap = {};

vehiclesData.forEach(v => {
vehicleMap[v.id] = v;
});

let vehicle = null;

if(lead.vehicle_id){
vehicle = vehicleMap[lead.vehicle_id] || null;
}

console.log("LEAD VEHICLE ID:", lead.vehicle_id);
console.log("VEHICLE DATA:", vehicle);

console.log("LEAD DATA:", lead);
console.log("LEAD ERROR:", error);

if(error){
console.error(error);
alert("Failed to load lead");
return;
}

if(!lead) return;

/* =========================================
UI-ONLY: status-based next-step guidance.
Uses the EXISTING status value only — no new
CRM states or database fields. "Closed" leads
get no active action-needed warning.
========================================= */
const crmStatusActions = {
  new: "Make first contact — no outreach has happened yet.",
  contacted: "Follow up with the customer on your last conversation.",
  interested: "Continue the conversation and confirm commitment.",
  negotiating: "Keep the negotiation moving toward an agreement."
};

const crmActionNeeded =
  (lead.status || "new") === "closed"
    ? ""
    : lead.lead_source === "vehicle_interest"
      ? "This customer has expressed interest in a vehicle — contact them to follow up as soon as possible."
      : (crmStatusActions[lead.status || "new"] || crmStatusActions.new);

table.innerHTML = `

<div class="card p-5 crm-profile-view">

<div class="
flex
items-center
justify-between
gap-3
mb-4
">

<button
onclick="
window.__CURRENT_OPEN_LEAD_ID__ = null;
window.__CRM_FORCE_REFRESH__ = true;
loadView('crm');
"
class="btn btn-dark">
← CRM
</button>

<p class="text-xs text-gray-500 font-medium tracking-wide uppercase whitespace-nowrap overflow-hidden text-ellipsis">
CRM Leads / Lead Profile
</p>

<!-- Status pills removed -->

</div>

<div class="crm-profile-header">

<div class="crm-profile-header-top">

<div class="crm-lead-avatar crm-lead-avatar-lg">${(lead.name || "U").charAt(0)}</div>

<div class="crm-profile-header-meta">

<h2 class="crm-profile-name">${lead.name || "Unknown Lead"}${lead.surname ? ` ${lead.surname}` : ""}</h2>

<p class="crm-profile-source">${lead.lead_source === "vehicle_interest" ? "New Vehicle Interest" : "Potential Buyer"}</p>

<p class="crm-profile-contact">${lead.email ? `<a href="mailto:${lead.email}">${lead.email}</a>` : "No email on record"}${lead.phone ? ` &middot; ${lead.phone}` : ""}</p>

</div>

<span class="crm-status-pill crm-status-${(lead.status || "new").replace(/\s/g,"")} crm-status-pill-lg">${lead.status || "new"}</span>

</div>

${
crmActionNeeded
? `
<div class="crm-action-needed">

<span class="crm-action-needed-label">Action needed</span>

<p class="crm-action-needed-text">${crmActionNeeded}</p>

</div>
`
: ""
}

<div class="crm-profile-actions">

<div class="crm-primary-action-row">

<button
onclick="continueLeadConversation('${lead.id}','message')"
class="crm-icon-btn crm-icon-btn-msg"
type="button" title="Message Customer" aria-label="Message Customer">
<svg class="crm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
</button>

<button
onclick="window.open(
'https://wa.me/${(lead.phone || '')
.replace(/\\D/g,'')}',
'_blank'
)"
class="crm-icon-btn crm-icon-btn-wa"
type="button" title="WhatsApp" aria-label="WhatsApp">
<svg class="crm-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
</button>

</div>

<div class="crm-status-switch">

<button
onclick="updateLead('${lead.id}','contacted')"
class="
h-9
px-4
rounded-lg
text-sm
font-semibold
transition-all
${lead.status === 'contacted'
? 'bg-[#E48A2F] text-black'
: 'bg-[#005BBF] text-white hover:bg-[#004FA8]'
}">
Contacted
</button>

<button
onclick="updateLead('${lead.id}','interested')"
class="
h-9
px-4
rounded-lg
text-sm
font-semibold
transition-all
${lead.status === 'interested'
? 'bg-[#E48A2F] text-black'
: 'bg-[#005BBF] text-white hover:bg-[#004FA8]'
}">
Interested
</button>

<button
onclick="updateLead('${lead.id}','negotiating')"
class="
h-9
px-4
rounded-lg
text-sm
font-semibold
transition-all
${lead.status === 'negotiating'
? 'bg-[#E48A2F] text-black'
: 'bg-[#005BBF] text-white hover:bg-[#004FA8]'
}">
Negotiating
</button>

<button
onclick="updateLead('${lead.id}','closed')"
class="
h-9
px-4
rounded-lg
text-sm
font-semibold
transition-all
${lead.status === 'closed'
? 'bg-[#E48A2F] text-black'
: 'bg-[#005BBF] text-white hover:bg-[#004FA8]'
}">
Closed
</button>

</div>

<button
onclick="
console.log('DELETE ID:', '${lead.id}');
deleteLead('${lead.id}');
"
class="crm-btn-danger-quiet crm-btn-compact crm-delete-lead-btn">
Delete Lead
</button>

</div>

</div>

<div class="crm-profile-grid">

<div class="crm-profile-main">

<div class="
rounded-[18px]
bg-white
border
border-slate-200
shadow-sm
p-5
">

<div class="crm-profile-card-head">

<p class="crm-section-kicker">Contact information</p>

</div>

<div class="
grid
grid-cols-1
md:grid-cols-2
gap-3
">

<div class="
rounded-xl
bg-slate-50
p-3
min-w-0
">

<p class="text-xs text-gray-500 mb-1">
Email
</p>

<p class="text-sm font-semibold overflow-wrap-anywhere">
${lead.email
? `
<a
href="mailto:${lead.email}"
class="text-blue-600 hover:underline"
>
${lead.email}
</a>
`
: "-"
}
</p>

</div>

<div class="
rounded-xl
bg-slate-50
p-3
min-w-0
">

<p class="text-xs text-gray-500 mb-1">
Phone
</p>

<p class="text-sm font-semibold">
${lead.phone || "-"}
</p>

</div>

</div>

<div class="crm-enquiry-block">

<p class="crm-enquiry-block-kicker">
Latest Enquiry
</p>

<p class="crm-enquiry-block-time">
${formatSATime(lead.created_at)}
</p>

<p class="crm-enquiry-block-text">
&ldquo;${lead.message || "No message supplied"}&rdquo;
</p>

</div>

<div class="
mt-3
rounded-xl
bg-slate-50
p-3
">

<p class="
text-xs
text-gray-500
mb-3
font-medium
uppercase
tracking-wide
">
All Enquiries From This Lead
</p>

<div class="space-y-3">

${relatedEnquiries.map(item => `

<div class="
border
border-slate-200
rounded-xl
p-3
bg-white
">

<p class="
text-xs
text-gray-500
mb-2
">
${formatSATime(item.created_at)}
</p>

<p class="text-sm">
${item.message || "No message"}
</p>

</div>

`).join("")}

</div>

</div>

</div>

<div
id="crmNotesModal"
class="mt-6">
</div>

<div
id="crmTasksModal"
class="mt-6 hidden">
</div>

<div
id="crmHistoryModal"
class="mt-6 hidden">
</div>

<div
id="crmTimelineModal"
class="mt-6">

<!-- Initial skeleton state: replaced by openLeadTimeline() with the real
     timeline items or the existing empty state. -->
${renderTimelineSkeleton(3)}

</div>

</div>

<aside class="crm-profile-side">

<div class="
rounded-[18px]
bg-white
border
border-slate-200
shadow-sm
p-5
">

<h3 class="crm-section-title">
Vehicles of interest (${uniqueVehicles.length})
</h3>

${
uniqueVehicles.length
? `
<div class="
crm-vehicle-list
grid
grid-cols-1
gap-3
">

${uniqueVehicles.map(v => {

const vehicleData =
vehicleMap[v.vehicle_id] || {};

return `

<div
onclick="viewVehicle('${v.vehicle_id}')"
class="
group
crm-profile-vehicle-card
rounded-xl
border
border-slate-200
bg-white
overflow-hidden
cursor-pointer
transition-all
duration-200
"
title="Open vehicle listing"
>

<div class="relative">

<img
src="${vehicleData.image_url || v.vehicle_image_url || v.image_url || asset("/assets/images/vehicle-placeholder.jpg")}"
class="
crm-veh-img
w-full
"
onerror="this.src='${PLACEHOLDER}'"
>

<div class="
absolute
top-3
right-3
px-3
py-1
rounded-full
bg-white/90
backdrop-blur
text-xs
font-semibold
text-[#0A192F]
">
Vehicle
</div>

</div>

<div class="p-4">

<p class="
font-bold
text-lg
text-[#0A192F]
line-clamp-1
">
${vehicleData.make || v.vehicle_make || "Vehicle"}
${vehicleData.model ? " " + vehicleData.model : (v.vehicle_model ? " " + v.vehicle_model : "")}
</p>

<p class="
text-sm
text-gray-500
mt-1
">
${vehicleData.year || "-"}
•
R ${Number(vehicleData.price || 0).toLocaleString()}
</p>

<p class="
text-sm
text-gray-500
mt-1
">
Last Enquiry:
${formatSATime(v.created_at)}
</p>

<div class="
mt-3
flex
items-center
justify-between
">

<span class="
text-xs
font-semibold
text-[#E48A2F]
">
Interested Vehicle
</span>

<span class="
text-xs
font-medium
text-slate-500
group-hover:text-[#0A192F]
transition
">
View →
</span>

</div>

</div>

</div>

`;

}).join("")}

</div>
`
: `
<div class="
rounded-xl
border
border-dashed
border-slate-300
bg-slate-50
p-6
text-center
text-sm
text-gray-500
">
No vehicles linked to this lead
</div>
`
}

</div>

</div>

<div class="
rounded-[18px]
bg-white
border
border-slate-200
shadow-sm
p-5
mb-6
">

<p class="crm-section-kicker">Quick actions</p>

<div class="crm-quick-actions">

<button
onclick="openLeadNotes('${lead.id}')"
class="crm-btn-gold">
Notes
</button>

<button
onclick="openLeadTasks('${lead.id}')"
class="crm-btn-navy">
Tasks
</button>

<button
onclick="openLeadHistory('${lead.id}')"
class="crm-btn-navy">
History
</button>

</div>

</div>

<div class="
rounded-[18px]
bg-white
border
border-slate-200
shadow-sm
p-5
">

<p class="crm-section-kicker">Communication</p>

<button
onclick="continueLeadConversation('${lead.id}','notes')"
class="crm-btn-gold crm-btn-block">
Open Notes
</button>

</div>

</div>

</div>

`;

await openLeadNotes(lead.id);
await openLeadTimeline(lead.id);

};

window.openLeadTasks = async function(leadId){

const modal =
document.getElementById(
"crmTasksModal"
);

if(!modal) return;

modal.classList.remove("hidden");

const { data:tasks } =
await supabase
.from("crm_tasks")
.select("*")
.eq("lead_id", leadId)
.order("created_at",{ascending:false});

modal.innerHTML = `

<div class="card p-6 mt-6">

<div class="
flex
items-center
justify-between
mb-4
">

<h3 class="text-xl font-bold">
Follow Up Tasks
</h3>

<button
onclick="
document
.getElementById('crmTasksModal')
.classList.add('hidden')
"
class="btn btn-dark">
Close
</button>

</div>

<div class="space-y-3 mb-4">

${(tasks || []).length
? tasks.map(t => `

<div class="
crm-task-row
${t.completed ? 'crm-task-completed' : ''}
border
border-white/10
rounded-xl
p-3
flex
justify-between
items-center
gap-3
">

<div class="min-w-0">

<p class="
text-sm
font-medium
${t.completed ? 'line-through text-gray-400' : 'text-[#0A192F]'}
overflow-wrap-anywhere
">
${t.title}
</p>

<p class="
text-xs
text-gray-500
">
${formatSATime(t.due_date)}
</p>

</div>

<div class="flex items-center gap-2 shrink-0">

${
t.completed
? `<span class="
text-[10px]
font-bold
uppercase
tracking-wide
px-2
py-0.5
rounded-full
bg-green-100
text-green-700
border
border-green-200
">
Completed
</span>`
: ""
}

<button
onclick="toggleCRMTask('${t.id}', ${t.completed})"
class="
btn
${t.completed ? 'btn-dark' : 'btn-gold'}
">

${t.completed ? 'Reopen' : 'Mark Done'}

</button>

</div>

</div>

`).join("")
:
"<p class='text-gray-400'>No tasks</p>"
}

</div>

<input
id="crmTaskTitle"
class="dashboard-input mb-3"
placeholder="Call customer"
/>

<input
id="crmTaskDate"
type="datetime-local"
class="dashboard-input"
/>

<div class="mt-4">

<button
onclick="saveCRMTask('${leadId}')"
class="btn btn-gold">
Add Task
</button>

</div>

</div>

`;

};

window.saveCRMTask = async function(leadId){

const title =
document
.getElementById("crmTaskTitle")
?.value
?.trim();

const dueDate =
document
.getElementById("crmTaskDate")
?.value;

if(!title) return;

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user) return;

await supabase
.from("crm_tasks")
.insert({

lead_id: leadId,
dealer_id: userData.user.id,
title,
due_date: dueDate

});

await supabase
.from("crm_notifications")
.insert({

lead_id: leadId,
dealer_id: userData.user.id,
title: "Follow Up Scheduled",
message: `${title} - Due ${dueDate}`

});

await openLeadTasks(leadId);

};

window.toggleCRMTask = async function(id,current){

await supabase
.from("crm_tasks")
.update({
completed: !current
})
.eq("id", id);

const { data:task } =
await supabase
.from("crm_tasks")
.select("lead_id")
.eq("id", id)
.single();

if(task?.lead_id){

await openLeadTasks(task.lead_id);

}

};

/* =========================================
CRM NOTES
========================================= */

window.openLeadNotes = async function(leadId){

const modal =
document.getElementById(
"crmNotesModal"
);

if(!modal) return;

modal.classList.remove("hidden");

const { data:notes } =
await supabase
.from("crm_notes")
.select("*")
.eq("lead_id", leadId)
.order("created_at",{ascending:false});

modal.innerHTML = `

<div class="card p-5 mt-5">

<div class="
flex
items-center
justify-between
mb-3
">

<h3 class="
text-lg
font-bold
text-[#0A192F]
">
Lead Notes
</h3>

<button
onclick="
document
.getElementById('crmNotesModal')
.classList.add('hidden')
"
class="btn btn-dark">
Close
</button>

</div>

<p class="crm-internal-note-badge">
Internal CRM notes — not visible to the customer
</p>

<p class="crm-section-kicker crm-notes-section-label">
Existing Notes
</p>

${
(notes || []).length
? notes.map(n => `

<div class="
rounded-xl
bg-slate-50
border
border-slate-200
p-3
mb-2
">

<div class="
flex
items-center
justify-between
gap-2
mb-1.5
">

<span class="
text-xs
font-semibold
uppercase
tracking-wider
text-[#E48A2F]
shrink-0
">
Dealer Note
</span>

<span class="
text-xs
text-gray-500
whitespace-nowrap
">
${formatSATime(n.created_at)}
</span>

</div>

<p class="
text-sm
leading-relaxed
text-slate-700
overflow-wrap-anywhere
">
${n.note}
</p>

</div>

`).join("")
: `
<p class="text-gray-400 text-sm mb-2">
No notes yet
</p>
`
}

</div>

<p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 mt-4">
New Note
</p>

<textarea
id="crmNewNote"
class="
w-full
min-h-[110px]
rounded-xl
border
border-slate-200
bg-slate-50
p-3
text-sm
outline-none
focus:border-[#E48A2F]
focus:ring-2
focus:ring-[#E48A2F]/20
resize-none
"
placeholder="Add follow-up notes, customer preferences, finance discussions, objections, next actions..."
></textarea>

<div class="
mt-2
flex
justify-end
">

<button
onclick="saveLeadNote('${leadId}')"
class="
h-9
px-4
rounded-lg
bg-[#E48A2F]
text-black
text-sm
font-semibold
hover:opacity-90
transition-all
">
Save Note
</button>

</div>

`;

};

/* =========================================
CRM HISTORY
========================================= */
window.openLeadHistory = async function(leadId){

const modal =
document.getElementById(
"crmHistoryModal"
);

if(!modal) return;

modal.classList.remove("hidden");

const { data:history } =
await supabase
.from("crm_status_history")
.select("*")
.eq("lead_id", leadId)
.order("created_at",{ascending:false});

modal.innerHTML = `

<div class="card p-6 mt-6">

<div class="
flex
items-center
justify-between
mb-4
">

<h3 class="text-xl font-bold">
Status History
</h3>

<button
onclick="
document
.getElementById('crmHistoryModal')
.classList.add('hidden')
"
class="btn btn-dark">
Close
</button>

</div>

<div class="space-y-3">

${
(history || []).length
? history.map(h => `

<div class="
border
border-white/10
rounded-xl
p-3
">

<p>
${h.old_status || "new"}
→
${h.new_status || ""}
</p>

<p class="
text-xs
text-gray-500
mt-2
">
${formatSATime(h.created_at)}
</p>

</div>

`).join("")
:
"<p class='text-gray-400'>No history available</p>"
}

</div>

</div>

`;

};

window.continueLeadConversation =
async function(leadId,type){

const { data:lead } =
await supabase
.from("enquiries")
.select("*")
.eq("id",leadId)
.single();

if(!lead) return;

if(type === "message"){

/* Use the existing Phase 1 Message Lead flow:
   resolves THIS lead's real conversation first,
   then opens the existing Messages page with it
   selected. No second messaging implementation. */
await window.messageLead(leadId);

return;

}


if(type === "notes"){

await openLeadNotes(leadId);

const notesPanel =
document.getElementById(
"crmNotesModal"
);

if(notesPanel){

notesPanel.scrollIntoView({
behavior:"smooth",
block:"start"
});

}

}

};

window.openLeadTimeline = async function(leadId){

const panel =
document.getElementById(
"crmTimelineModal"
);

if(!panel) return;

const [
historyRes,
notesRes,
tasksRes
] = await Promise.all([

supabase
.from("crm_status_history")
.select("*")
.eq("lead_id", leadId)
.order("created_at",{ascending:false}),

supabase
.from("crm_notes")
.select("*")
.eq("lead_id", leadId)
.order("created_at",{ascending:false}),

supabase
.from("crm_tasks")
.select("*")
.eq("lead_id", leadId)
.order("created_at",{ascending:false})

]);

const timeline = [

...(historyRes.data || []).map(h => ({
type: "Status",
text: `${h.old_status || "new"} → ${h.new_status || ""}`,
date: h.created_at
})),

...(notesRes.data || []).map(n => ({
type: "Note",
text: n.note,
date: n.created_at
})),

...(tasksRes.data || []).map(t => ({
type: "Task",
text: t.title,
date: t.created_at
}))

].sort(
(a,b)=>
new Date(b.date) - new Date(a.date)
);

panel.innerHTML = `

<div class="card p-5">

<h3 class="
text-lg
font-bold
text-[#0A192F]
mb-3
">
CRM Timeline
</h3>

<div class="space-y-2">

${
timeline.length
? timeline.map(item => `

<div class="
flex
items-start
gap-3
rounded-xl
border
border-slate-200
bg-slate-50
p-3
min-w-0
">

<span class="
shrink-0
inline-flex
items-center
px-2.5
py-0.5
rounded-full
text-xs
font-semibold
${
item.type === "Status"
? "bg-[#E48A2F]/15 border border-[#E48A2F]/30 text-[#B4661A]"
: item.type === "Task"
? "bg-blue-50 border border-blue-200 text-blue-700"
: "bg-slate-100 border border-slate-300 text-slate-600"
}
">
${item.type}
</span>

<div class="min-w-0 flex-1">

<p class="
text-sm
text-[#0A192F]
font-medium
leading-snug
overflow-wrap-anywhere
">
${item.text}
</p>

<p class="
text-xs
text-gray-500
mt-1
whitespace-nowrap
overflow-hidden
text-ellipsis
">
${formatSATime(item.date)}
</p>

</div>

</div>

`).join("")
: `
<div class="
rounded-xl
border
border-dashed
border-slate-300
p-6
text-center
text-sm
text-gray-500
">
No timeline activity
</div>
`
}

</div>

</div>

`;

};

async function loadCRMNotifications(){

const panel =
document.getElementById(
"crmNotificationsPanel"
);

if(!panel) return;

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user) return;

const { data:notifs } =
await supabase
.from("crm_notifications")
.select("*")
.eq("dealer_id", userData.user.id)
.order("created_at",{ascending:false})
.limit(10);

if(!notifs || !notifs.length){

panel.innerHTML = `
<div class="
rounded-xl
border
border-dashed
border-slate-300
p-5
text-center
text-sm
text-gray-500
bg-slate-50
">
No CRM notifications
</div>
`;

return;

}

panel.innerHTML = notifs.map(n=>`

<div class="
rounded-xl
border
border-slate-200
bg-white
p-3
mb-2
min-w-0
">

<div class="
flex
items-start
justify-between
gap-2
mb-1.5
">

<h4 class="
text-sm
font-semibold
text-[#0A192F]
leading-snug
overflow-wrap-anywhere
">
${n.title || "Notification"}
</h4>

<button
onclick="markCRMNotificationRead('${n.id}')"
class="
shrink-0
h-8
px-3
rounded-lg
bg-[#005BBF]
hover:bg-[#004FA8]
text-white
text-xs
font-semibold
transition-all
">
Read
</button>

</div>

<p class="text-sm text-gray-500 overflow-wrap-anywhere">
${n.message || ""}
</p>

<p class="text-xs text-gray-400 mt-1.5">
${formatSATime(n.created_at)}
</p>

</div>

`).join("");

}

window.markCRMNotificationRead =
async function(id){

await supabase
.from("crm_notifications")
.update({
is_read:true
})
.eq("id", id);

await loadCRMNotifications();

if(window.__CURRENT_OPEN_LEAD_ID__){

await openLeadDetails(
window.__CURRENT_OPEN_LEAD_ID__
);

}else{

await loadCRMLeads();

}

};

async function loadFinanceApplications(){

const box =
document.getElementById(
"financeApplicationsList"
);

if(!box) return;

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user) return;

const user =
userData.user;

const profile =
await getUserProfile();

if(!profile){

box.innerHTML = `

<div class="
rounded-[24px]
border
border-red-500/20
bg-red-500/5
p-6
text-center
text-red-400
">

Unable to load profile

</div>

`;

return;

}

let query =
supabase
.from("finance_applications")
.select("*")
.order("created_at",{ascending:false});

if(profile.account_type === "dealer"){

query =
query.eq(
"seller_id",
user.id
);

}else{

query =
query.eq(
"user_id",
user.id
);

}

const { data:apps } =
await query;

if(!apps || !apps.length){

box.innerHTML = `

<div class="
rounded-[24px]
border
border-dashed
border-white/10
p-10
text-center
text-gray-400
">

No finance applications found

</div>

`;

return;

}

box.innerHTML = apps.map(a => `

<div class="
rounded-[24px]
border
border-white/10
bg-white/[0.03]
p-5
">

<div class="
flex
items-center
justify-between
mb-3
">

<h3 class="font-bold text-lg">

${a.vehicle_make || ""}
${a.vehicle_model || ""}

</h3>

<span class="
px-3
py-1
rounded-full
bg-[#E48A2F]/15
border
border-[#E48A2F]/30
text-[#E48A2F]
text-xs
font-semibold
">

${a.status || "Pending"}

</span>

</div>

${
profile?.account_type === "dealer"
? `
<p>
<b>Buyer:</b>
${a.name || ""}
${a.surname || ""}
</p>

<p>
<b>Email:</b>
${a.email || "-"}
</p>

<p>
<b>Credit Score:</b>
${a.credit_score || "N/A"}
</p>
`
: `
<p>
<b>Price:</b>
R ${Number(a.price || 0).toLocaleString()}
</p>

<p>
<b>Credit Score:</b>
${a.credit_score || "N/A"}
</p>
`
}

<p class="text-sm text-gray-500 mt-3">
${formatSATime(a.created_at)}
</p>

</div>

`).join("");

}

async function loadInventory(){

  selectedVehicles =
selectedVehicles || new Set();

  const box = document.getElementById("inventoryTable");
  if(!box) return;

  /* =========================
  GET USER
  ========================= */

  const { data:userData } = await supabase.auth.getUser();
  if(!userData?.user){
    box.innerHTML = "<p>Please log in</p>";
    return;
  }

  const user = userData.user;

  /* =========================
  FETCH VEHICLES
  ========================= */

  const { data:vehicles, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending:false });

  if(error){
    box.innerHTML = `
<div class="
rounded-2xl
border
border-red-500/20
bg-red-500/5
p-6
text-center
text-sm
text-red-500
">
Failed to load inventory
</div>
`;
    return;
  }

  /* =========================
ANALYTICS DATA
========================= */

const vehicleIds =
(vehicles || [])
.map(v => v?.id)
.filter(Boolean);

let views = [];
let saves = [];

if(vehicleIds.length){

const viewsRes = await supabase
  .from("vehicle_views")
  .select("vehicle_id")
  .in("vehicle_id", vehicleIds);

views = viewsRes.data || [];

const savesRes = await supabase
  .from("saved_vehicles")
  .select("vehicle_id")
  .in("vehicle_id", vehicleIds);

saves = savesRes.data || [];

}else{

views = [];
saves = [];

}

const { data:enquiries } = await supabase
  .from("enquiries")
  .select("vehicle_id")
  .eq("seller_id", user.id);

/* COUNT HELPER */
function countBy(list){
  const map = {};
  (list || []).forEach(x=>{
    map[x.vehicle_id] = (map[x.vehicle_id] || 0) + 1;
  });
  return map;
}

const viewMap = countBy(views);
const saveMap = countBy(saves);
const enquiryMap = countBy(enquiries);

/* =========================
CACHE CLIENT-SIDE DATA
Full dealer inventory is already
available — filtering/sorting happens
client-side with NO extra Supabase
requests per keystroke.
========================= */

window.__inventoryData = {
  vehicles: vehicles || [],
  viewMap,
  saveMap,
  enquiryMap
};

/* Hand over to the renderer */
await renderInventoryResults();

}

/* =========================================
INVENTORY RENDERER (CLIENT-SIDE)
Re-renders the inventory list from
window.__inventoryData using the current
search / status / sort values. Never hits
Supabase — used on every keystroke.
========================================= */

async function renderInventoryResults(){

const box =
document.getElementById("inventoryTable");

if(!box) return;

const cached =
window.__inventoryData;

if(!cached || !cached.vehicles) return;

const {
vehicles,
viewMap,
saveMap,
enquiryMap

} = cached;

/* Preserve search input focus + caret
across re-renders */
const prevFocus =
document.activeElement;

const focusWasSearch =
prevFocus && prevFocus.id === "inventorySearch";

const caretPos =
focusWasSearch ? prevFocus.selectionStart : null;

  if(!vehicles || !vehicles.length){
    box.innerHTML = `
      <div class="
text-center
py-10
rounded-2xl
border
border-dashed
border-[#0A192F]/15
bg-[#F8FAFC]
">
        <p class="text-[#64748B] mb-4 text-sm">No vehicles yet</p>
        <button onclick="goUpload()" class="
inline-flex
items-center
justify-center
h-9
rounded-lg
bg-[#E48A2F]
hover:bg-[#D07A22]
text-white
px-4
text-[13px]
font-bold
transition-all
shadow-sm
active:scale-[0.98]
">
          Add Your First Vehicle
        </button>
      </div>
    `;
    return;
  }

  /* =========================
  BUILD TABLE
  ========================= */
let html = `

<div class="
dashboard-inventory-toolbar
flex
flex-col
xl:flex-row
gap-4
justify-between
items-stretch
xl:items-center
mb-6
">

<div class="
flex
flex-col
sm:flex-row
gap-3
w-full
xl:w-auto
">

<div class="
relative
w-full
sm:w-auto
">

<input
id="inventorySearch"
type="text"
value="${window.__inventoryFilters?.search || ""}"
placeholder="Search vehicles..."
class="
dashboard-search-input
pr-9
"
/>

<button
id="inventoryClearBtn"
type="button"
onclick="clearInventorySearch()"
title="Clear search"
class="
${window.__inventoryFilters?.search ? "flex" : "hidden"}
absolute
right-2
top-1/2
-translate-y-1/2
w-6
h-6
items-center
justify-center
rounded-full
bg-[#0A192F]/[0.06]
hover:bg-[#0A192F]/[0.12]
text-[#64748B]
text-sm
leading-none
transition-all
active:scale-90
"
>
&times;
</button>

</div>

<select
id="inventoryStatusFilter"
class="
dashboard-select
">

<option value="all">
All Statuses
</option>

<option value="active">
Active
</option>

<option value="pending">
Pending
</option>

<option value="sold">
Sold
</option>

<option value="draft">
Draft
</option>

</select>

<select
id="inventorySort"
class="
dashboard-select
">

<option value="newest">
Newest
</option>

<option value="oldest">
Oldest
</option>

<option value="price_high">
Highest Price
</option>

<option value="price_low">
Lowest Price
</option>

<option value="views">
Most Viewed
</option>

<option value="engagement">
Highest Engagement
</option>

</select>

</div>

</div>

<div class="space-y-4">

<div class="
flex
flex-col
xl:flex-row
xl:items-center
justify-between
gap-4
mb-4
">

  <div>
    <h2 class="text-base font-bold tracking-tight text-[#0A192F]">Your Inventory</h2>
    <p class="text-xs text-[#64748B] mt-0.5">
      Manage your vehicle listings &middot;
      <span id="inventoryCountPill" class="font-semibold text-[#0A192F]"></span>
    </p>
  </div>

  <div class="
flex
flex-wrap
gap-2
items-stretch
w-full
xl:w-auto
">

    <button onclick="toggleInventoryDownloadMenu(event)" id="inventoryDownloadBtn" class="
    inline-flex
    items-center
    justify-center
    gap-1.5
    h-9
    rounded-lg
    bg-gradient-to-r from-[#E48A2F] to-[#D07A22]
    hover:brightness-[1.06]
    text-white
    px-4
    text-[13px]
    font-bold
    transition-all
    shadow-sm
    active:scale-[0.98]
  ">
      Download Inventory <span class="text-[10px] leading-none opacity-80">▾</span>
    </button>

    <button onclick="selectAll()" id="inventorySelectAllBtn" class="
inline-flex
items-center
justify-center
h-9
rounded-lg
border
border-[#0A192F]/15
bg-white
hover:bg-[#0A192F]/5
text-[#0A192F]
px-3.5
text-[13px]
font-semibold
transition-all
active:scale-[0.98]
">
      Select All
    </button>

    <button onclick="bulkFeature()" class="
inline-flex
items-center
justify-center
h-9
rounded-lg
bg-[#005BBF]
hover:bg-[#004FA8]
text-white
px-3.5
text-[13px]
font-semibold
transition-all
shadow-sm
active:scale-[0.98]
">
      Feature
    </button>

    <button onclick="bulkDelete()" id="inventoryBulkDeleteBtn" class="
inline-flex
items-center
justify-center
h-9
rounded-lg
border
border-red-500/30
bg-white
hover:bg-red-50
text-red-600
px-3.5
text-[13px]
font-semibold
transition-all
active:scale-[0.98]
">
      Delete
    </button>

    <button onclick="goUpload()" class="
inline-flex
items-center
justify-center
h-9
rounded-lg
bg-[#E48A2F]
hover:bg-[#D07A22]
text-white
px-4
text-[13px]
font-bold
transition-all
shadow-sm
active:scale-[0.98]
">
      + Add Vehicle
    </button>

  </div>

</div>

`;

let filteredVehicles = [...(vehicles || [])];

window.__inventoryFilters =
JSON.parse(
sessionStorage.getItem(
"inventoryFilters"
)
) || {

search: "",
status: "all",
sort: "newest"

};

const searchValue =
window.__inventoryFilters.search
.toLowerCase();

const statusFilter =
window.__inventoryFilters.status;

const sortType =
window.__inventoryFilters.sort;

/* SEARCH */

if(searchValue){

/* Normalised value so "Mazda2"
matches "Mazda 2" */
const searchCompact =
searchValue.replace(/[\s\-]+/g,"");

filteredVehicles =
filteredVehicles.filter(v => {

const title =
[
v.title,
v.listing_title,
v.vehicle_title
]
.find(t => t);

const stockNo =
v.stock_number || v.stock_no ||
v.reference_number || "";

const vin =
v.vin || v.chassis_number || "";

const price =
Number(v.price || 0).toLocaleString();

/* Full haystack of searchable info
already available to this page */
const text =
[
v.make,
v.model,
v.variant,
v.trim,
v.year,
v.status,
title,
stockNo,
vin,
`R ${price}`,
price
]
.filter(Boolean)
.join(" ")
.toLowerCase();

/* Compact haystack (no spaces/dashes)
so "mazda2" matches "mazda 2" and
"fordranger" matches "ford ranger" */
const compact =
text.replace(/[\s\-]+/g,"");

/* Digit haystack so "350000"
matches "R 350,000" */
const digits =
text.replace(/[^0-9]/g,"");

const searchDigits =
searchValue.replace(/[^0-9]/g,"");

return (
text.includes(searchValue) ||
(compact && searchCompact &&
compact.includes(searchCompact)) ||
(searchDigits.length >= 4 &&
digits.includes(searchDigits))
);

});

}

/* STATUS */

if(statusFilter !== "all"){

filteredVehicles =
filteredVehicles.filter(v =>
(v.status || "active")
.toLowerCase() === statusFilter
);

}

/* SORTING */

filteredVehicles.sort((a,b)=>{

if(sortType === "price_high"){
return (b.price || 0) - (a.price || 0);
}

if(sortType === "price_low"){
return (a.price || 0) - (b.price || 0);
}

if(sortType === "views"){
return (
(viewMap[b.id] || 0)
-
(viewMap[a.id] || 0)
);
}

if(sortType === "engagement"){

const scoreA =
(viewMap[a.id] || 0)
+
(saveMap[a.id] || 0) * 2
+
(enquiryMap[a.id] || 0) * 4;

const scoreB =
(viewMap[b.id] || 0)
+
(saveMap[b.id] || 0) * 2
+
(enquiryMap[b.id] || 0) * 4;

return scoreB - scoreA;

}

if(sortType === "oldest"){
return new Date(a.created_at) - new Date(b.created_at);
}

return new Date(b.created_at) - new Date(a.created_at);

});

if(!filteredVehicles.length){

const isSearch =
!!window.__inventoryFilters.search;

html += `

<div class="
rounded-2xl
border
border-dashed
border-[#0A192F]/15
bg-[#F8FAFC]
p-10
text-center
">

<div class="
w-12
h-12
mx-auto
mb-4
rounded-full
bg-[#0A192F]/[0.05]
border border-[#0A192F]/10
flex items-center justify-center
">
<svg xmlns="http://www.w3.org/2000/svg"
class="w-5 h-5 text-[#94A3B8]"
fill="none" viewBox="0 0 24 24"
stroke="currentColor">
<path stroke-width="2" stroke-linecap="round"
stroke-linejoin="round"
d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/>
</svg>
</div>

<h3 class="
text-base
font-bold
tracking-tight
text-[#0A192F]
mb-1
">
${isSearch ? "No vehicles found" : "No vehicles match your filters"}
</h3>

<p class="text-sm text-[#64748B] mb-4">
${isSearch
? "No inventory vehicles match your search."
: "Try adjusting or resetting your filters."}
</p>

${isSearch ? `
<button onclick="clearInventorySearch()"
class="
inline-flex
items-center
justify-center
h-9
rounded-lg
border
border-[#0A192F]/15
bg-white
hover:bg-[#0A192F]/5
text-[#0A192F]
px-4
text-[13px]
font-semibold
transition-all
active:scale-[0.98]
">
Clear Search
</button>
` : ``}

</div>

`;

}

/* PRUNE SELECTION
Selection may only contain vehicles that are
part of the CURRENT search/status result, so
vehicles hidden by a filter change never stay
selected (bulk actions + export stay correct) */
const __visibleIds = new Set(
  (filteredVehicles || []).map(v => String(v.id))
);

[...selectedVehicles].forEach(id=>{
  if(!__visibleIds.has(id)){
    selectedVehicles.delete(id);
  }
});

(filteredVehicles || []).forEach(v => {

const analyticsVehicle = {

...v,

views:
viewMap[v.id] || 0,

saves:
saveMap[v.id] || 0,

enquiries:
enquiryMap[v.id] || 0,

interested: 0

};

const healthScore =
calculateInventoryHealth(
analyticsVehicle
);

const health =
getInventoryHealth(
healthScore
);

/* NOTE: Inventory-card AI Recommendation block removed (UI cleanup).
   calculateInventoryHealth / getInventoryHealth remain for other uses. */

  html += `

<div class="
card-wrapper
relative
overflow-visible
" data-vehicle-id="${v.id}">

  <input 
    type="checkbox"
    data-id="${v.id}"
    ${selectedVehicles.has(String(v.id)) ? "checked" : ""}
    class="
absolute
top-3
left-3
z-10
w-5
h-5
accent-[#E48A2F]
"
    onclick="event.stopPropagation(); toggleSelect('${v.id}', this.checked)"
  />

  <div onclick="viewVehicle('${v.id}')" 
class="
group
relative
overflow-hidden
rounded-2xl
bg-white
border border-[#0A192F]/[0.08]
shadow-[0_2px_10px_rgba(15,23,42,0.05),0_1px_3px_rgba(15,23,42,0.04)]
hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)]
hover:border-[#0A192F]/[0.16]
transition-all
duration-300
will-change-transform
transform-gpu
hover:-translate-y-0.5
active:scale-[0.995]
p-4
flex
flex-col
xl:flex-row
xl:items-center
justify-between
cursor-pointer
gap-4
w-full
max-w-full
${v.is_featured ? 'ring-2 ring-[#E48A2F]' : ''}
">
    <!-- LEFT -->
    <div class="
flex
flex-col
sm:flex-row
sm:items-center
gap-4
w-full
min-w-0
">

    <div class="
w-full
sm:w-28
h-36
sm:h-20
rounded-xl
overflow-hidden
bg-gray-100
border border-[#0A192F]/[0.06]
flex-shrink-0
">

  ${v.image_url ? `
<img 
src="${v.image_url || PLACEHOLDER}"
loading="lazy"
decoding="async"
onerror="this.src='${PLACEHOLDER}'"
class="
w-full
h-full
object-cover
transition
duration-700
group-hover:scale-105
"
/>
  ` : `
    <span class="text-gray-400 text-xs">No Image</span>
  `}

</div>

      <div>

<div class="flex items-center gap-2">

<div class="
font-bold
text-base
tracking-tight
text-[#0A192F]
leading-snug
">
${v.make || ""}
${v.model ? " " + v.model : ""}
</div>

  ${v.is_featured ? `
    <span class="
text-[10px]
px-2
py-0.5
rounded-full
bg-[#E48A2F]
text-white
font-bold
uppercase
tracking-wide
shadow-sm
">
      Featured
    </span>
  ` : ``}

  ${getStatusBadge(v.status)}

</div>

<div class="text-[13px] text-[#64748B] mb-1.5">
  ${v.year || ""} • ${v.mileage || "—"} km
</div>

<div class="
flex
flex-wrap
gap-x-4
gap-y-2
text-xs
text-gray-500
items-center
">

  <span class="flex items-center gap-1">

    <svg xmlns="http://www.w3.org/2000/svg" 
    class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      <path stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      d="M2.458 12C3.732 7.943 7.523 5 12 5
      c4.477 0 8.268 2.943 9.542 7
      -1.274 4.057-5.065 7-9.542 7
      -4.477 0-8.268-2.943-9.542-7z"/>
    </svg>

    ${viewMap[v.id] || 0}

  </span>

  <span class="flex items-center gap-1">

    <svg xmlns="http://www.w3.org/2000/svg" 
    class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      d="M4.318 6.318C5.684 4.952 7.9 4.952 9.266 6.318L12 9.052l2.734-2.734
      c1.366-1.366 3.582-1.366 4.948 0
      1.366 1.366 1.366 3.582 0 4.948L12 21l-7.682-9.734
      c-1.366-1.366-1.366-3.582 0-4.948z"/>
    </svg>

    ${saveMap[v.id] || 0}

  </span>

  <span class="flex items-center gap-1">

    <svg xmlns="http://www.w3.org/2000/svg" 
    class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      d="M7 8h10M7 12h6m-9 8l-2-2a9 9 0 1115.996-6H21"/>
    </svg>

    ${enquiryMap[v.id] || 0}

  </span>

</div>

      </div>

    </div>

    <!-- RIGHT -->
    <div class="
flex
flex-col
lg:flex-row
lg:items-center
gap-4
lg:gap-8
w-full
lg:w-auto
mt-4
lg:mt-0
">

      <div class="
text-left
lg:text-right
">
        <div class="
        flex
        items-baseline
        justify-start
        lg:justify-end
        gap-1.5
        whitespace-nowrap
        leading-none
        text-[#0A192F]
">
          <span class="text-sm sm:text-base font-bold tracking-tight">R</span>
          <span class="text-lg sm:text-xl font-extrabold tracking-tight">${Number(v.price || 0).toLocaleString()}</span>
        </div>
        <div class="text-[11px] uppercase tracking-wider text-[#94A3B8] font-semibold mt-1">
          Price
        </div>
      </div>

<div class="
flex
flex-col
sm:flex-row
gap-2
w-full
sm:w-auto
">

<button
onclick="
event.stopPropagation();
manageVehicle('${v.id}')"
class="
rounded-lg
bg-[#005BBF]
hover:bg-[#004FA8]
text-white
px-3.5
py-2
text-[13px]
font-semibold
transition-all
duration-200
w-full
sm:w-auto
active:scale-[0.98]
shadow-sm
">
    Manage
</button>

<button onclick="event.stopPropagation(); toggleFeatured('${v.id}', ${v.is_featured})"
class="
rounded-lg
${v.is_featured
  ? 'border border-[#E48A2F]/40 bg-[#E48A2F]/10 text-[#B4691D] hover:bg-[#E48A2F]/20'
  : 'bg-[#E48A2F] hover:bg-[#D07A22] text-white'}
px-3.5
py-2
text-[13px]
font-semibold
transition-all
duration-200
w-full
sm:w-auto
active:scale-[0.98]
shadow-sm
">
    ${v.is_featured ? "Unfeature" : "Feature"}
</button>

<button
onclick="
event.stopPropagation();
inventoryDeleteVehicle('${v.id}')"
class="
inv-delete-btn
rounded-lg
border
border-red-500/30
bg-transparent
text-red-600
hover:bg-red-50
px-3.5
py-2
text-[13px]
font-medium
transition-all
duration-200
w-full
sm:w-auto
active:scale-[0.98]
">
    Delete
</button>

</div>

    </div>

  </div>
</div>

  `;
});

html += `</div>`;

if(!box) return;

box.innerHTML = html;

/* =========================
RESULT COUNT
X of Y vehicles displayed
========================= */

const countPill =
document.getElementById(
"inventoryCountPill"
);

if(countPill){
countPill.textContent =
`${filteredVehicles.length} of ${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"}`;
}

/* =========================
SYNC SELECT-ALL LABEL
Reflects whether every VISIBLE
vehicle is currently selected
========================= */

updateSelectAllLabel();

/* =========================
RESTORE SEARCH FOCUS + CARET
(lost when innerHTML is replaced)
========================= */

if(focusWasSearch){

const searchInput =
document.getElementById(
"inventorySearch"
);

if(searchInput){
searchInput.focus();

try{
searchInput.setSelectionRange(
caretPos ?? searchInput.value.length,
caretPos ?? searchInput.value.length
);
}catch(_){}
}

}

/* =========================
FILTER EVENTS
(client-side only — no Supabase
requests on keystrokes)
========================= */

const search =
document.getElementById(
"inventorySearch"
);

const status =
document.getElementById(
"inventoryStatusFilter"
);

const sort =
document.getElementById(
"inventorySort"
);

[search,status,sort]
.forEach(el=>{

if(!el) return;

if(el.id === "inventorySearch"){
el.value =
window.__inventoryFilters.search || "";
}

if(el.id === "inventoryStatusFilter"){
el.value =
window.__inventoryFilters.status || "all";
}

if(el.id === "inventorySort"){
el.value =
window.__inventoryFilters.sort || "newest";
}

el.oninput = ()=>{

window.__inventoryFilters.search =
search?.value || "";

sessionStorage.setItem(
"inventoryFilters",
JSON.stringify(
window.__inventoryFilters
)
);

/* Show/hide inline clear button */
const clearBtn =
document.getElementById(
"inventoryClearBtn"
);

if(clearBtn){
clearBtn.classList.toggle(
"hidden",
!window.__inventoryFilters.search
);
clearBtn.classList.toggle(
"flex",
!!window.__inventoryFilters.search
);
}

clearTimeout(window.__inventorySearchTimer);

window.__inventorySearchTimer =
setTimeout(()=>{

renderInventoryResults();

},120);

};

el.onchange = ()=>{

window.__inventoryFilters.status =
status?.value || "all";

window.__inventoryFilters.sort =
sort?.value || "newest";

sessionStorage.setItem(
"inventoryFilters",
JSON.stringify(
window.__inventoryFilters
)
);

renderInventoryResults();

};

});

}

/* =========================================
CLEAR SEARCH
Resets the search term, keeps status +
sort intact, re-renders instantly.
========================================= */

window.clearInventorySearch = function(){

window.__inventoryFilters.search = "";

sessionStorage.setItem(
"inventoryFilters",
JSON.stringify(
window.__inventoryFilters
)
);

renderInventoryResults();

};



window.editVehicle = async function(id){

  const { data:userData } =
  await supabase.auth.getUser();

  if(!userData?.user){
    alert("Login required");
    return;
  }

  const user = userData.user;

  const { data, error } =
  await supabase
    .from("vehicles")
    .select("id,seller_id")
    .eq("id", id)
    .eq("seller_id", user.id)
    .single();

  if(error || !data){
    alert("Unauthorized vehicle access");
    return;
  }

  navigate("/edit-vehicle?id=" + id);
};

/* =========================================
DELETE LOADING STATE HELPERS (PHASE 5)
Card-level loading overlay used while a
Supabase deletion is running. Scoped to the
existing inventory cards — no page blocking.
========================================= */

function showInventoryDeletingOverlay(id, label, sublabel){

  const card =
  document.querySelector(
    `.card-wrapper[data-vehicle-id="${id}"]`
  );

  if(!card) return;
  if(card.querySelector(".inv-deleting-overlay")) return;

  const ov = document.createElement("div");
  ov.className = "inv-deleting-overlay";
  ov.setAttribute("role","status");
  ov.setAttribute("aria-busy","true");

  /* PHASE 7B — spinner + "Deleting Vehicle(s)" +
     supporting "Please wait..." line. The overlay
     covers the existing card so it cannot be
     clicked again while deletion is running. */

  ov.innerHTML = `
  <div class="inv-deleting-inner">
    <span class="inv-deleting-spinner" aria-hidden="true"></span>
    <span class="inv-deleting-text">
      <span class="inv-deleting-label">${label}</span>
      <span class="inv-deleting-sublabel">${sublabel || "Please wait..."}</span>
    </span>
  </div>
  `;

  card.appendChild(ov);

}

function hideInventoryDeletingOverlay(id){

  const card =
  document.querySelector(
    `.card-wrapper[data-vehicle-id="${id}"]`
  );

  if(!card) return;

  const ov = card.querySelector(".inv-deleting-overlay");
  if(ov) ov.remove();

}

/* =========================================
PHASE 7 FIX — INVENTORY-SCOPED DELETE HANDLER
This MUST NOT be named window.deleteVehicle:
pages/myVehicles.js (prefetched by the router on
the dashboard route) reassigns window.deleteVehicle
at module load with its own My-Vehicles version,
whose only UI refresh is loadVehicles() for the
My Vehicles page. That silently replaced this
handler, so successful deletions updated the
database but never the Inventory list. A unique,
unambiguous global cannot be clobbered.
========================================= */
window.inventoryDeleteVehicle = async function(id){

  /* PREVENT DUPLICATE DELETE REQUESTS */
  if(window.__inventoryDeleteInProgress) return;

  if(!confirm("Delete this vehicle?")) return;

  window.__inventoryDeleteInProgress = true;

  /* PHASE 7B — visible deletion state + disabled Delete
     button for the entire Supabase operation */

  showInventoryDeletingOverlay(id, "Deleting Vehicle", "Please wait...");

  const delBtn =
  document.querySelector(
    `.card-wrapper[data-vehicle-id="${id}"] .inv-delete-btn`
  );

  const delBtnWasDisabled = delBtn?.disabled || false;

  if(delBtn){
    delBtn.disabled = true;
    delBtn.classList.add("opacity-50","pointer-events-none");
  }

  /* PHASE 7B — paint boundary: let the browser actually
     render the card overlay BEFORE any async work starts */

  await new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(r))
  );

  try{

    const { data:userData } =
    await supabase.auth.getUser();

    if(!userData?.user){
      alert("Login required");
      return;
    }

    const user = userData.user;

    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", id)
      .eq("seller_id", user.id);

    if(error){
      throw error;
    }

    /* =========================
    LIVE INVENTORY SYNC
    Remove from the EXISTING
    client-side inventory state,
    clear selection, re-render via
    the existing renderer. No reload.
    ========================= */

    if(
      window.__inventoryData &&
      Array.isArray(window.__inventoryData.vehicles)
    ){
      window.__inventoryData.vehicles =
      window.__inventoryData.vehicles.filter(
        v => String(v.id) !== String(id)
      );
    }

    selectedVehicles.delete(String(id));

    await renderInventoryResults();

    toast("Vehicle deleted successfully.");

  }catch(err){

    /* FAILED DELETION — vehicle stays
    visible, loading state removed below */
    console.error("Vehicle deletion failed:", err);
    toast("Vehicle could not be deleted. Please try again.");

  }finally{

    window.__inventoryDeleteInProgress = false;
    hideInventoryDeletingOverlay(id);

    if(delBtn && !delBtnWasDisabled){
      delBtn.disabled = false;
      delBtn.classList.remove("opacity-50","pointer-events-none");
    }

  }
};

window.viewVehicle = function(id){
  navigate("/vehicle?id=" + id);
};

function getStatusBadge(status){

  const s = (status || "active").toLowerCase();

  if(s === "active"){
    return `
      <span class="
px-3
py-1
rounded-full
text-xs
font-semibold
bg-emerald-50
text-emerald-700
border border-emerald-200
">
        Active
      </span>
    `;
  }

  if(s === "pending"){
    return `
      <span class="
px-3
py-1
rounded-full
text-xs
font-semibold
bg-amber-50
text-amber-700
border border-amber-200
">
        Pending
      </span>
    `;
  }

  if(s === "sold"){
    return `
      <span class="
px-3
py-1
rounded-full
text-xs
font-semibold
bg-slate-100
text-slate-600
border border-slate-200
">
        Sold
      </span>
    `;
  }

  if(s === "draft"){
    return `
      <span class="
px-3
py-1
rounded-full
text-xs
font-semibold
bg-blue-50
text-blue-700
border border-blue-200
">
        Draft
      </span>
    `;
  }

  return `
    <span class="px-3 py-1 text-xs font-medium border border-gray-200 bg-gray-50 text-gray-600">
      ${s}
    </span>
  `;
}

window.toggleFeatured = async function(id, current){

  const { data:userData } =
  await supabase.auth.getUser();

  if(!userData?.user){

    alert("Login required");
    return;

  }

  const user =
  userData.user;

  /* =====================================
  CURRENT FEATURED COUNT
  ===================================== */

  const { count } =
  await supabase
    .from("vehicles")
    .select("*",{
      count:"exact",
      head:true
    })
    .eq("seller_id", user.id)
    .eq("is_featured", true);

  const limit =
  await getFeaturedLimit();

  /* =====================================
  LIMIT ENFORCEMENT
  ===================================== */

  if(
    !current &&
    (count || 0) >= limit
  ){

    alert(
      `Your package allows ${limit} featured vehicle(s). Upgrade your plan to feature more vehicles.`
    );

    return;

  }

  /* =====================================
  UPDATE
  ===================================== */

  const { error } =
  await supabase
    .from("vehicles")
    .update({
      is_featured: !current
    })
    .eq("id", id)
    .eq("seller_id", user.id);

  if(error){

    alert(
      "Failed to update feature status"
    );

    return;

  }

  await loadInventory();

};

/* VISIBLE IDS
Only vehicles currently rendered by the
existing search/status-filtered list */
window.getVisibleInventoryIds = function(){

  return Array.from(
    document.querySelectorAll(
      ".card-wrapper input[type='checkbox']"
    )
  )
  .map(cb => cb.dataset.id)
  .filter(Boolean)
  .map(id => String(id));

};

/* SELECT-ALL LABEL
"Select All" unless every visible vehicle
is already selected, then "Unselect All" */
window.updateSelectAllLabel = function(){

  const btn =
  document.getElementById(
    "inventorySelectAllBtn"
  );

  if(!btn) return;

  const visible =
  window.getVisibleInventoryIds();

  const allSelected =
  visible.length > 0 &&
  visible.every(id =>
    selectedVehicles.has(id)
  );

  btn.textContent =
  allSelected ? "Unselect All" : "Select All";

};

window.toggleSelect = function(id, checked){

if(!id) return;
  if(checked){
    selectedVehicles.add(String(id));
  } else {
    selectedVehicles.delete(String(id));
  }

  updateSelectAllLabel();

};

window.selectAll = function(){

  /* Only ever operate on currently
  VISIBLE vehicles — never vehicles
  hidden by search or status filter */

  const visible =
  window.getVisibleInventoryIds();

  /* Empty results: nothing to select,
  bulk actions stay safe */
  if(!visible.length) return;

  /* TOGGLE: if everything visible is
  already selected -> unselect all visible.
  Otherwise select all visible. */
  const allSelected =
  visible.every(id =>
    selectedVehicles.has(id)
  );

  if(allSelected){

    visible.forEach(id=>{
      selectedVehicles.delete(id);
    });

  }else{

    visible.forEach(id=>{
      selectedVehicles.add(id);
    });

  }

  /* Sync every visible checkbox with state */
  document
  .querySelectorAll(".card-wrapper input[type='checkbox']")
  .forEach(cb=>{

    if(!cb.dataset.id) return;

    cb.checked = !allSelected;

  });

  updateSelectAllLabel();

};

window.bulkDelete = async function(){

  /* PREVENT DUPLICATE / CONFLICTING SUBMISSIONS */
  if(window.__inventoryBulkDeleteInProgress) return;
  if(window.__inventoryDeleteInProgress) return;

  if(!selectedVehicles || selectedVehicles.size === 0){
    alert("No vehicles selected");
    return;
  }

  if(!confirm("Delete selected vehicles?")) return;

  window.__inventoryBulkDeleteInProgress = true;

  const idsToDelete =
  Array.from(selectedVehicles);

  /* CARD-LEVEL LOADING STATE on every
  selected vehicle — "Deleting Vehicles" with
  the number of vehicles being removed */
  idsToDelete.forEach(id=>{
    showInventoryDeletingOverlay(
      id,
      "Deleting Vehicles",
      `Please wait while we remove ${idsToDelete.length} vehicle${idsToDelete.length === 1 ? "" : "s"}...`
    );
  });

  /* DISABLE THE BULK DELETE BUTTON while running */
  const bulkBtn =
  document.getElementById("inventoryBulkDeleteBtn");

  const btnWasDisabled = bulkBtn?.disabled || false;

  if(bulkBtn){
    bulkBtn.disabled = true;
    bulkBtn.classList.add("opacity-50","pointer-events-none");
  }

  /* PHASE 7B — paint boundary before the delete request */

  await new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(r))
  );

  try{

    const { data:userData } =
    await supabase.auth.getUser();

    if(!userData?.user){
      alert("Login required");
      return;
    }

    const user = userData.user;

    const { error } = await supabase
      .from("vehicles")
      .delete()
      .in("id", idsToDelete)
      .eq("seller_id", user.id);

    if(error){
      throw error;
    }

    /* =========================
    LIVE INVENTORY SYNC
    Remove ALL successfully deleted
    vehicles from the EXISTING state,
    clear selection, re-render. No reload.
    ========================= */

    const deletedIdSet =
    new Set(idsToDelete.map(id => String(id)));

    if(
      window.__inventoryData &&
      Array.isArray(window.__inventoryData.vehicles)
    ){
      window.__inventoryData.vehicles =
      window.__inventoryData.vehicles.filter(
        v => !deletedIdSet.has(String(v.id))
      );
    }

    selectedVehicles.clear();

    await renderInventoryResults();

    toast("Vehicles deleted successfully.");

  }catch(err){

    /* FAILED BULK DELETION — all selected
    vehicles remain visible and selected */
    console.error("Bulk deletion failed:", err);
    toast("Vehicles could not be deleted. Please try again.");

  }finally{

    window.__inventoryBulkDeleteInProgress = false;

    idsToDelete.forEach(id=>{
      hideInventoryDeletingOverlay(id);
    });

    if(bulkBtn && !btnWasDisabled){
      bulkBtn.disabled = false;
      bulkBtn.classList.remove("opacity-50","pointer-events-none");
    }

  }
};

if(!window.__dashboardResizeBound){

window.__dashboardResizeBound = true;

window.addEventListener("resize", ()=>{

if(window.innerWidth < 1280){
return;
}

if(window.innerWidth >= 1280){

const sidebar =
document.getElementById("dashboardSidebar");

const overlay =
document.getElementById("dashboardSidebarOverlay");

if(sidebar){
sidebar.classList.remove("translate-x-[-110%]");
sidebar.classList.add("translate-x-0");
}

if(overlay){
overlay.classList.add("hidden");
}

document.body.style.overflow = "";
document.body.style.touchAction = "";

}

});

}

window.bulkFeature = async function(){

  if(
    !selectedVehicles ||
    selectedVehicles.size === 0
  ){

    alert("No vehicles selected");
    return;

  }

  const { data:userData } =
  await supabase.auth.getUser();

  if(!userData?.user){

    alert("Login required");
    return;

  }

  const user =
  userData.user;

  /* =====================================
  CURRENT FEATURED COUNT
  ===================================== */

  const { count } =
  await supabase
    .from("vehicles")
    .select("*",{
      count:"exact",
      head:true
    })
    .eq("seller_id", user.id)
    .eq("is_featured", true);

  const limit =
  await getFeaturedLimit();

  const incoming =
  selectedVehicles.size;

  if(
    (count || 0) + incoming >
    limit
  ){

    alert(
      `Your package allows ${limit} featured vehicles maximum.`
    );

    return;

  }

  /* =====================================
  UPDATE
  ===================================== */

  const { error } =
  await supabase
    .from("vehicles")
    .update({
      is_featured: true
    })
    .in(
      "id",
      Array.from(selectedVehicles)
    )
    .eq("seller_id", user.id);

  if(error){

    alert(
      "Failed to update vehicles"
    );

    return;

  }

  selectedVehicles.clear();

  await loadInventory();

};

/* =========================================
🔥 BUYER CONTACT ACTIONS
========================================= */

window.openBuyerWhatsapp = function(phone){

if(!phone){

alert("No phone number available");
return;

}

const cleaned =
String(phone)
.replace(/\D/g,"");

window.open(
`https://wa.me/${cleaned}`,
"_blank"
);

};

window.emailBuyer = function(email){

if(!email){

alert("No email available");
return;

}

window.location.href =
`mailto:${email}`;

};

async function loadAffordabilityProfile(){

const box =
document.getElementById(
"affordabilityProfileContainer"
);

if(!box) return;

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user) return;

const user =
userData.user;

/* A missing profile row makes .single() return an
   error with no data — that simply means the user
   has not completed a profile yet, so start blank. */
const { data:profile } =
await supabase
.from("affordability_profiles")
.select("*")
.eq("user_id", user.id)
.single();

const savedTerm =
Number(profile?.preferred_term) || 72;

const termOptions =
AFFORDABILITY_TERM_OPTIONS;

box.innerHTML = `

<div class="
grid
grid-cols-1
xl:grid-cols-3
gap-5
items-start
min-w-0
">

<!-- ================= AFFORDABILITY FORM ================= -->

<section class="card p-4 md:p-6 xl:col-span-2">

<header class="mb-5">

<p class="ov-eyebrow">Financial Details</p>

<h3 class="aff-section-title">
Your Affordability Profile
</h3>

<p class="aff-section-sub">
Enter or update your financial details, calculate your
affordability and save the profile used across vehicle
recommendations and finance checks.
</p>

</header>

<form id="affordabilityForm">

<div class="
grid
grid-cols-1
sm:grid-cols-2
gap-x-5
gap-y-5
">

<div class="sm:col-span-2">

<label
for="monthly_budget"
class="aff-field-label"
>
Monthly Budget (R)
</label>

<input
id="monthly_budget"
name="monthly_budget"
type="number"
min="0"
step="50"
placeholder="e.g. 6500"
value="${profile?.monthly_budget ?? ""}"
class="aff-field"
/>

<p class="aff-field-hint">
What you can comfortably repay every month.
</p>

</div>

<div>

<label
for="max_vehicle_price"
class="aff-field-label"
>
Maximum Vehicle Price (R)
</label>

<input
id="max_vehicle_price"
name="max_vehicle_price"
type="number"
min="0"
step="500"
placeholder="Auto-filled by Calculate Affordability"
value="${profile?.max_vehicle_price ?? ""}"
class="aff-field"
/>

<p class="aff-field-hint">
Leave blank — Calculate Affordability fills this in for you.
</p>

</div>

<div>

<label
for="deposit_amount"
class="aff-field-label"
>
Deposit Amount (R)
</label>

<input
id="deposit_amount"
name="deposit_amount"
type="number"
min="0"
step="500"
placeholder="e.g. 20000"
value="${profile?.deposit_amount ?? ""}"
class="aff-field"
/>

<p class="aff-field-hint">
Cash you can put towards the purchase upfront.
</p>

</div>

<div>

<label
for="existing_debt"
class="aff-field-label"
>
Existing Debt (R per month)
</label>

<input
id="existing_debt"
name="existing_debt"
type="number"
min="0"
step="50"
placeholder="e.g. 1500"
value="${profile?.existing_debt ?? ""}"
class="aff-field"
/>

<p class="aff-field-hint">
Monthly repayments on loans, cards or store accounts.
</p>

</div>

<div>

<label
for="preferred_term"
class="aff-field-label"
>
Preferred Term (Months)
</label>

<select
id="preferred_term"
name="preferred_term"
class="aff-field"
>

${termOptions.map(months => `
<option
value="${months}"
${months === savedTerm ? "selected" : ""}
>
${months} months
</option>
`).join("")}

</select>

<p class="aff-field-hint">
Typical repayment period for financed vehicles.
</p>

</div>

</div>

<div class="aff-divider"></div>

<div class="aff-actions-row flex flex-wrap gap-3">

<button
type="button"
onclick="calculateAffordability()"
class="btn btn-dark w-full sm:w-auto"
>
Calculate Affordability
</button>

<button
type="button"
onclick="saveAffordabilityProfile()"
class="btn btn-gold w-full sm:w-auto"
>
Save Profile
</button>

</div>

</form>

</section>

<!-- ================= RESULT PANEL ================= -->

<section class="aff-result-panel card p-4 md:p-6">

<header class="mb-4">

<p class="ov-eyebrow">Calculation Result</p>

<h3 class="aff-section-title">
Affordability Result
</h3>

</header>

<div
id="affordabilityResults"
>

<div class="aff-result-empty">

<div class="aff-empty-icon">

<svg
xmlns="http://www.w3.org/2000/svg"
width="20"
height="20"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
stroke-width="2"
stroke-linecap="round"
stroke-linejoin="round"
aria-hidden="true"
>
<rect x="4" y="2" width="16" height="20" rx="2"/>
<line x1="8" x2="16" y1="6" y2="6"/>
<line x1="8" x2="8" y1="10" y2="10"/>
<line x1="12" x2="12" y1="10" y2="10"/>
<line x1="16" x2="16" y1="10" y2="10"/>
<line x1="8" x2="8" y1="14" y2="14"/>
<line x1="12" x2="12" y1="14" y2="14"/>
<line x1="16" x2="16" y1="14" y2="18"/>
<line x1="8" x2="8" y1="18" y2="18"/>
<line x1="12" x2="12" y1="18" y2="18"/>
</svg>

</div>

<p class="text-sm font-bold text-[#0A192F]">
No calculation yet
</p>

<p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
Fill in your financial details and use
<b>Calculate Affordability</b> to see your
estimated vehicle budget here.
</p>

</div>

</div>

</section>

</div>

`;

/* When a saved profile exists, restore the calculated
   view immediately so the result panel reflects the
   stored profile instead of sitting empty. */
if(profile){
setTimeout(window.calculateAffordability,0);
}

}

/* Shared helpers so Calculate and Save always agree
   on how values are read and categorised. */

const AFFORDABILITY_TERM_OPTIONS =
[12,24,36,48,54,60,66,72,84,96];

function readAffordabilityInputs(){

const getValue =
id => document.getElementById(id)?.value ?? "";

const monthlyBudget =
Number(getValue("monthly_budget"));

const maxVehiclePrice =
Number(getValue("max_vehicle_price"));

const deposit =
Number(getValue("deposit_amount"));

const debt =
Number(getValue("existing_debt"));

const term =
Number(getValue("preferred_term")) || 72;

/* Guard against typos like "-" or invalid input */
if(
!Number.isFinite(monthlyBudget) ||
monthlyBudget <= 0 ||
!Number.isFinite(deposit) || deposit < 0 ||
!Number.isFinite(debt) || debt < 0 ||
!termOptionsValid(term)
){

return null;

}

return {
monthlyBudget,
maxVehiclePrice,
deposit,
debt,
term
};

}

function termOptionsValid(term){
return AFFORDABILITY_TERM_OPTIONS.includes(term);
}

function computeAffordability(inputs){

const availableBudget =
Math.max(
0,
inputs.monthlyBudget - inputs.debt
);

const estimatedVehiclePrice =
Math.round(
(availableBudget * inputs.term * 0.75) +
inputs.deposit
);

/* Category thresholds match the existing
   affordability assessment used across the app
   (pages/credit.js / pages/apply.js). */
let category = "Starter";

if(estimatedVehiclePrice >= 800000){
category = "Premium";
}
else if(estimatedVehiclePrice >= 500000){
category = "Advanced";
}
else if(estimatedVehiclePrice >= 250000){
category = "Standard";
}

return {
availableBudget,
estimatedVehiclePrice,
category
};

}

window.calculateAffordability = function(){

const results =
document.getElementById(
"affordabilityResults"
);

if(!results) return;

const inputs =
readAffordabilityInputs();

if(!inputs){

results.innerHTML = `

<div class="aff-error-box">

Please enter a valid <b>Monthly Budget</b> and a valid
<b>Preferred Term</b> to calculate your affordability.

</div>

`;

return;

}

const {
availableBudget,
estimatedVehiclePrice,
category
} =
computeAffordability(inputs);

/* Slug drives the category pill colour variant */
const categorySlug =
category.toLowerCase().replace(/\s+/g, "-");

/* Keep the Maximum Vehicle Price field in sync with
   the calculation so Save Profile stores it. */
const maxPriceInput =
document.getElementById("max_vehicle_price");

if(maxPriceInput){
maxPriceInput.value = estimatedVehiclePrice;
}

results.innerHTML = `

<!-- HERO RESULT -->

<div class="
aff-result-hero
rounded-2xl
border
border-[#E48A2F]/30
p-5
text-center
">

<p class="aff-metric-label">
Estimated Vehicle Budget
</p>

<p class="aff-hero-number mt-1">
R ${estimatedVehiclePrice.toLocaleString()}
</p>

<span class="aff-category-pill aff-cat-${categorySlug} mt-3">
${category}
</span>

</div>

<!-- SUPPORTING METRICS -->

<div class="aff-result-metrics-grid mt-4">

<div class="aff-result-metric">

<p class="aff-metric-label">
Available Monthly
</p>

<p class="text-base font-bold text-[#0A192F] mt-1">
R ${availableBudget.toLocaleString()}
</p>

</div>

<div class="aff-result-metric">

<p class="aff-metric-label">
Selected Term
</p>

<p class="text-base font-bold text-[#0A192F] mt-1">
${inputs.term} Months
</p>

</div>

</div>

<p class="text-xs text-slate-400 mt-4 leading-relaxed">
Estimated values only and not a finance approval.
Your Maximum Vehicle Price field has been updated
with this estimate — use Save Profile to store it.
</p>

`;

};

window.saveAffordabilityProfile = async function(){

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user){
toast("Please sign in again");
return;
}

const user =
userData.user;

const inputs =
readAffordabilityInputs();

if(!inputs){

toast(
"Please enter a valid Monthly Budget and Preferred Term"
);

return;

}

const {
estimatedVehiclePrice,
category
} =
computeAffordability(inputs);

/* If the user calculated first, the field already holds
   the estimate. Otherwise fall back to the computed one
   so max price and category are never left empty/zero. */
const enteredMaxPrice =
Number(
document.getElementById("max_vehicle_price")?.value
) || 0;

const payload = {

user_id: user.id,

monthly_budget:
Math.round(inputs.monthlyBudget),

max_vehicle_price:
enteredMaxPrice > 0
? Math.round(enteredMaxPrice)
: estimatedVehiclePrice,

deposit_amount:
Math.round(inputs.deposit),

existing_debt:
Math.round(inputs.debt),

preferred_term:
inputs.term,

affordability_category:
category

};

const { error } =
await supabase
.from("affordability_profiles")
.upsert(payload, {
onConflict: "user_id"
});

if(error){

console.error(
"Failed to save affordability profile:",
error
);

toast(
"Could not save your profile — please try again"
);

return;

}

toast("Affordability profile saved");

/* Reload so the form reflects what is stored in the DB */
loadAffordabilityProfile();

};

async function loadDashboardAnalytics(){

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user) return;

const user = userData.user;

/* =========================
LOAD VEHICLES
========================= */

const { data:vehicles } =
await supabase
.from("vehicles")
.select("*")
.eq("seller_id", user.id);

const vehicleIds =
(vehicles || [])
.map(v => v?.id)
.filter(Boolean);

/* =========================
LOAD ANALYTICS
========================= */

const [
  viewsRes,
  savesRes,
  enquiriesRes,
  interestedRes,
  financeRes
] = await Promise.all([

  vehicleIds.length
    ? supabase
      .from("vehicle_views")
      .select("*")
      .in("vehicle_id", vehicleIds)
    : Promise.resolve({ data: [] }),

  vehicleIds.length
    ? supabase
      .from("saved_vehicles")
      .select("*")
      .in("vehicle_id", vehicleIds)
    : Promise.resolve({ data: [] }),

  supabase
  .from("enquiries")
  .select("*")
  .eq("seller_id", user.id),

  vehicleIds.length
    ? supabase
      .from("vehicle_interest")
      .select("*")
      .in("vehicle_id", vehicleIds)
    : Promise.resolve({ data: [] }),

  supabase
  .from("finance_applications")
  .select("*")
  .eq("seller_id", user.id)

]);

const views = viewsRes.data || [];
const saves = savesRes.data || [];
const enquiries = enquiriesRes.data || [];
const interested = interestedRes.data || [];
const finance = financeRes.data || [];

/* =========================
KPI CALCULATIONS
========================= */

dashboardAnalytics.totalViews =
(views || []).length;

dashboardAnalytics.totalSaves =
(saves || []).length;

dashboardAnalytics.totalEnquiries =
(enquiries || []).length;

dashboardAnalytics.totalInterested =
(interested || []).length;

dashboardAnalytics.totalFinanceApps =
(finance || []).length;

dashboardAnalytics.conversionRate =
(views || []).length
? Math.round(
(
((enquiries || []).length / (views || []).length)
* 100
)
)
: 0;

/* =========================================
🔥 DEALERSHIP HEAT SCORE
========================================= */

const heatScore =
(
dashboardAnalytics.totalViews * 1
+
dashboardAnalytics.totalSaves * 2
+
dashboardAnalytics.totalEnquiries * 4
+
dashboardAnalytics.totalInterested * 5
+
dashboardAnalytics.totalFinanceApps * 6
);

dashboardAnalytics.heatScore =
heatScore;

dashboardAnalytics.marketRank =
heatScore >= 300
? "Elite Dealer"

: heatScore >= 180
? "High Performance"

: heatScore >= 90
? "Growing Dealer"

: "Emerging Dealer";

dashboardAnalytics.visibilityScore =
Math.min(
100,
Math.round(
(
dashboardAnalytics.totalViews
+
dashboardAnalytics.totalSaves * 2
)
/
5
)
);

dashboardAnalytics.engagementScore =
Math.min(
100,
Math.round(
(
dashboardAnalytics.totalEnquiries * 4
+
dashboardAnalytics.totalInterested * 5
)
/
3
)
);

/* =========================
MOST VIEWED
========================= */

const viewMap = {};

(views || []).forEach(v=>{
  viewMap[v.vehicle_id] =
  (viewMap[v.vehicle_id] || 0) + 1;
});

let topVehicle = null;
let topViews = 0;

(vehicles || []).forEach(v=>{

  const count = viewMap[v.id] || 0;

  if(count > topViews){
    topViews = count;
    topVehicle = v;
  }

});

dashboardAnalytics.mostViewed =
topVehicle;

/* =========================
UPDATE UI
========================= */

setKpi("kpiViews", dashboardAnalytics.totalViews);
setKpi("kpiSaves", dashboardAnalytics.totalSaves);
setKpi("kpiEnquiries", dashboardAnalytics.totalEnquiries);
setKpi("kpiInterested", dashboardAnalytics.totalInterested);

setKpi("kpiFinance", dashboardAnalytics.totalFinanceApps);

setKpi(
"kpiHeatScore",
dashboardAnalytics.heatScore || 0
);

setKpi(
"kpiVisibility",
dashboardAnalytics.visibilityScore || 0
);

const rankEl =
document.getElementById(
"kpiDealerRank"
);

if(rankEl){

rankEl.innerText =
dashboardAnalytics.marketRank
|| "Emerging Dealer";

}

}

function setKpi(id, value){

const el = document.getElementById(id);

if(el){

const safeValue =
Number.isFinite(Number(value))
? Number(value)
: 0;

const formatted =
Number(safeValue || 0)
.toLocaleString();

if(el.innerText !== formatted){

if(el.innerText !== formatted){

el.innerText = formatted;

}

}

}

}

async function loadLiveActivity(){

const list =
document.getElementById("activityFeedList");

if(!list || !document.body.contains(list)) return;

const activity = [];

/* =========================
LOAD RECENT ENQUIRIES
========================= */

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user) return;

const user = userData.user;

const { data:enquiries } =
await supabase
.from("enquiries")
.select("*")
.eq("seller_id", user.id)
.order("created_at",{ascending:false})
.limit(5);

(enquiries || []).forEach(e=>{

activity.push({
type: "enquiry",
title: e.name || "New enquiry",
time: e.created_at
});

});

/* =========================
LOAD SAVES
========================= */

const { data:vehicles } =
await supabase
.from("vehicles")
.select("id")
.eq("seller_id", user.id);

const ids =
(vehicles || [])
.map(v=>v?.id)
.filter(Boolean);

const { data:saves } =
ids.length
? await supabase
  .from("saved_vehicles")
  .select("*")
  .in("vehicle_id", ids)
  .limit(5)
: { data: [] };

(saves || []).forEach(s=>{

activity.push({
type: "save",
title: "Vehicle saved",
time: s.created_at
});

});

activity.sort((a,b)=>
new Date(b?.time || 0) -
new Date(a?.time || 0)
);

if(!activity.length){

list.innerHTML = `
<div class="
rounded-2xl
border
border-dashed
border-white/10
p-6
text-center
text-sm
text-gray-400
">
No recent activity
</div>
`;

return;

}

if(!list) return;

list.innerHTML = (activity || []).map(a=>`

<div class="
dashboard-activity-item
flex
items-start
gap-3
p-3
rounded-2xl
border
border-white/10
bg-white/[0.03]
">

<div class="dashboard-activity-dot"></div>

<div>

<p class="
font-semibold
break-words
">
${a.title}
</p>

<p class="text-xs text-gray-500">
${a.time
? formatSATime(a.time)
: "Recently"}
</p>

</div>

</div>

`).join("");

}

async function loadMostViewedVehicle(){

const box =
document.getElementById("mostViewedVehicle");

if(!box || !document.body.contains(box)) return;

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user) return;

const user = userData.user;

const { data:vehicles } =
await supabase
.from("vehicles")
.select("*")
.eq("seller_id", user.id);

if(!vehicles || !vehicles.length){

box.innerHTML = `
<div class="
rounded-2xl
border
border-dashed
border-white/10
p-6
text-center
text-sm
text-gray-400
">
No vehicles found
</div>
`;

return;

}

const ids =
(vehicles || [])
.map(v=>v?.id)
.filter(Boolean);

const { data:views } =
ids.length
? await supabase
  .from("vehicle_views")
  .select("vehicle_id")
  .in("vehicle_id", ids)
: { data: [] };

/* MAP */

const viewMap = {};

(views || []).forEach(v=>{

viewMap[v.vehicle_id] =
(viewMap[v.vehicle_id] || 0) + 1;

});

/* SORT */

const ranked =
(vehicles || [])
.map(v=>({

...v,

views:
viewMap[v.id] || 0

}))
.sort((a,b)=>b.views-a.views);

/* UI — top ranked list + expandable COMPLETE
   inventory built from the SAME already-fetched
   vehicle data (no additional queries). */

const rankedRows =
(ranked || []).map((v,index)=>`

<div class="dashboard-ranked-vehicle">

<div class="dashboard-rank-badge">${String(index + 1).padStart(2, "0")}</div>

<img
src="${v.image_url || PLACEHOLDER}"
loading="lazy"
decoding="async"
onerror="this.src='${PLACEHOLDER}'"
class="
dashboard-ranked-image
w-20
h-16
sm:w-24
sm:h-20
object-cover
rounded-2xl
flex-shrink-0
">

<div class="
dashboard-ranked-content
min-w-0
flex-1
">

<h3 class="
truncate
max-w-full
">
${v.make || ""}
${v.model ? " " + v.model : ""}
</h3>

<p class="
text-sm
text-gray-500
">
${v.year || ""}
</p>

</div>

<div class="
dashboard-ranked-views
ml-auto
text-right
min-w-[70px]
">

<b>
${v.views}
</b>

<span>
Views
</span>

</div>

</div>

`);

const invRows =
(ranked || []).map(v=>`

<div class="ov-inv-row">

<img
src="${v.image_url || PLACEHOLDER}"
loading="lazy"
decoding="async"
onerror="this.src='${PLACEHOLDER}'"
class="ov-inv-img"
alt="${v.make || ""} ${v.model || ""}"
>

<div class="ov-inv-main min-w-0">

<h3 class="truncate">${v.make || "Make"} ${v.model || ""}</h3>

<p class="ov-inv-meta">

<span>${v.year || "—"}${v.mileage ? " • " + Number(v.mileage).toLocaleString() + " km" : ""}</span>

<span class="ov-inv-price">${v.price ? "R " + Number(v.price).toLocaleString() : "POA"}</span>

</p>

</div>

<div class="ov-inv-side">

<span class="ov-inv-views">${v.views} views</span>

<button
type="button"
class="ov-inv-viewbtn${v.is_featured ? ' ov-inv-viewbtn-featured' : ''}"
onclick="viewVehicle('${v.id}')"
>
View Vehicle
</button>

</div>

</div>

`);

box.innerHTML =
rankedRows.join("") +
`<div class="ov-collapse" id="ovInvWrap">${invRows.join("")}</div>` +
`<button type="button" class="ov-expand-btn ov-mv-expand" onclick="toggleOverviewInventory(this)" aria-expanded="false" aria-controls="ovInvWrap">
<span class="ov-expand-label">View All Vehicles &#9660;</span>
</button>`;

}

/* EXPAND / COLLAPSE the complete inventory list.
   Uses the same .ov-collapse language as the other
   Overview panels. */

window.toggleOverviewInventory = function(btn){

const wrap =
document.getElementById("ovInvWrap");

if(!wrap) return;

const open =
wrap.classList.toggle("open");

if(btn){

btn.setAttribute(
"aria-expanded",
open ? "true" : "false"
);

const lbl =
btn.querySelector(".ov-expand-label");

if(lbl){

lbl.innerHTML = open
? "Show Less &#9650;"
: "View All Vehicles &#9660;";

}

}

};

/* VIEW VEHICLE — same existing mechanism used by
   myVehicles.js: navigate to the standard vehicle
   detail route. No routing changes. */

window.viewVehicle = function(id){

if(!id) return;

navigate("/vehicle?id=" + id);

};

/* =========================================
🔥 HOT INVENTORY AI
========================================= */

function calculateVehicleHeat(vehicle){

const views =
Number(vehicle.views || 0);

const saves =
Number(vehicle.saves || 0);

const enquiries =
Number(vehicle.enquiries || 0);

const interested =
Number(vehicle.interested || 0);

return (
views
+
(saves * 2)
+
(enquiries * 4)
+
(interested * 5)
);

}

function getHeatLabel(score){

if(score >= 120){

return {
label: "🔥 Exploding",
className: "bg-red-500/15 text-red-400"
};

}

if(score >= 70){

return {
label: "🚀 Hot",
className: "bg-orange-500/15 text-orange-400"
};

}

if(score >= 35){

return {
label: "📈 Trending",
className: "bg-yellow-500/15 text-yellow-300"
};

}

return {
label: "⚡ Growing",
className: "bg-blue-500/15 text-blue-300"
};

}

async function loadHotListing(){

const box =
document.getElementById("hotListingPanel");

if(!box || !document.body.contains(box)) return;

box.innerHTML = `

<div class="
flex
flex-wrap
gap-3
">

<div class="
hot-badge
w-full
sm:w-auto
">
🔥 Trending Vehicle
</div>

<div class="
hot-badge
w-full
sm:w-auto
">
🚀 High Engagement
</div>

<div class="
hot-badge
w-full
sm:w-auto
">
⭐ Premium Exposure
</div>

<div class="
hot-badge
w-full
sm:w-auto
">
📈 Strong Buyer Activity
</div>

</div>

`;

}

let ovAnalyticsCache = null;
window.__ovMetric = window.__ovMetric || "views";

async function loadViewsChart(){

try{

const chart =
document.getElementById("viewsChart");

if(!chart) return;

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user) return;

const user = userData.user;

const { data:vehicles } =
await supabase
.from("vehicles")
.select("id")
.eq("seller_id", user.id);

const ids =
(vehicles || [])
.map(v => v?.id)
.filter(Boolean);

if(!ids.length){

chart.innerHTML = `
<div class="ov-chart-empty">
No analytics data yet
</div>
`;

return;

}

/* FETCH - same tables as before; created_at is
   included so the chart can bucket by day */

const [
viewsRes,
savesRes,
enquiriesRes
] = await Promise.all([

supabase
.from("vehicle_views")
.select("created_at, vehicle_id")
.in("vehicle_id", ids),

supabase
.from("saved_vehicles")
.select("created_at, vehicle_id")
.in("vehicle_id", ids),

supabase
.from("enquiries")
.select("created_at")
.eq("seller_id", user.id)

]);

ovAnalyticsCache = {

views: viewsRes.data || [],
saves: savesRes.data || [],
enquiries: enquiriesRes.data || []

};

window.renderOverviewAnalytics();

}catch(err){

console.error(
"loadViewsChart error:",
err
);

}

}

window.setOverviewMetric = function(metric){

window.__ovMetric = metric;

document.querySelectorAll(".ov-seg-btn").forEach(btn=>{

btn.classList.toggle(
"active",
btn.dataset.metric === metric
);

});

window.renderOverviewAnalytics();

};

/* CHART TYPE — line (default), bar, donut.
   Pure presentation switch driven by the dropdown;
   reuses the same cached analytics data, no extra fetching. */

window.onOverviewChartTypeChange = function(){

const selected =
document.getElementById("ovChartType")?.value || "line";

window.__ovChartType =
["line","bar","donut"].includes(selected)
? selected
: "line";

window.renderOverviewAnalytics();

};

window.onOverviewRangeChange = function(){

window.renderOverviewAnalytics();

};

window.renderOverviewAnalytics = function(){

const cache = ovAnalyticsCache;

if(!cache) return;

const range =
Number(
document.getElementById("analyticsRange")?.value || 7
);

const metric =
window.__ovMetric || "views";

const rows =
metric === "saves"
? cache.saves
: metric === "enquiries"
? cache.enquiries
: cache.views;

const metricLabel =
metric === "saves"
? "Saves"
: metric === "enquiries"
? "Enquiries"
: "Vehicle Views";

/* CURRENT PERIOD DAY BUCKETS */

const days = [];

for(let i = range - 1; i >= 0; i--){

const d = new Date();

d.setHours(0,0,0,0);

d.setDate(d.getDate() - i);

days.push(d);

}

const keys =
days.map(d =>
d.toISOString().slice(0,10)
);

const counts = {};

keys.forEach(k=>{
counts[k] = 0;
});

(rows || []).forEach(r=>{

if(!r?.created_at) return;

const k =
r.created_at.slice(0,10);

if(counts[k] !== undefined){
counts[k]++;
}

});

const values =
keys.map(k=>counts[k]);

const total =
values.reduce((a,b)=>a+b, 0);

/* PREVIOUS PERIOD - same length immediately before.
   Used only to report a real trend from existing data. */

const prevStart =
new Date(days[0]);

prevStart.setDate(prevStart.getDate() - range);

let prevTotal = 0;

(rows || []).forEach(r=>{

if(!r?.created_at) return;

const d =
new Date(r.created_at);

if(
d >= prevStart &&
d < days[0]
){
prevTotal++;
}

});

let trendText = "";

if(prevTotal > 0){

const pct =
Math.round(((total - prevTotal) / prevTotal) * 100);

trendText =
(pct >= 0 ? "+" : "") +
pct + "% vs previous period";

}

/* SUMMARY */

const labelEl =
document.getElementById("ovSummaryLabel");

if(labelEl){
labelEl.innerText = metricLabel;
}

const totalEl =
document.getElementById("graphViewsTotal");

if(totalEl){
totalEl.innerText =
total.toLocaleString();
}

const trendEl =
document.getElementById("ovTrend");

if(trendEl){

trendEl.innerText = trendText;

trendEl.classList.toggle(
"down",
trendText.startsWith("-")
);

}

const rangeEl =
document.getElementById("ovRangeLabel");

if(rangeEl){
rangeEl.innerText =
"Last " + range + " days";
}

/* LINE CHART (inline SVG - no external library) */

const chart =
document.getElementById("viewsChart");

if(!chart) return;

if(!values.some(v=>v > 0)){

chart.innerHTML = `
<div class="ov-chart-empty">
No ${metricLabel.toLowerCase()} recorded in the selected period
</div>
`;

return;

}

const W = 640;
const H = 240;
const PAD_L = 36;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 28;

const maxV =
Math.max(...values, 1);

const x = i =>
PAD_L +
(i * (W - PAD_L - PAD_R)) /
Math.max(values.length - 1, 1);

const y = v =>
PAD_T +
(H - PAD_T - PAD_B) *
(1 - v / maxV);

let path = "";

values.forEach((v,i)=>{

path +=
(i === 0 ? "M" : "L") +
x(i).toFixed(1) + " " +
y(v).toFixed(1) + " ";

});

const area =
path +
"L" + x(values.length - 1).toFixed(1) + " " + (H - PAD_B) + " " +
"L" + x(0).toFixed(1) + " " + (H - PAD_B) + " Z";

/* X LABELS - sparse so they stay readable at 30/90 days */

const targetLabels =
Math.min(6, values.length);

const step =
Math.max(
Math.floor((values.length - 1) / Math.max(targetLabels - 1, 1)),
1
);

const labelIdx = new Set();

for(let i2 = 0; i2 < values.length; i2 += step){
labelIdx.add(i2);
}
labelIdx.add(values.length - 1);

let gridLines = "";

[0, 0.25, 0.5, 0.75, 1].forEach(f=>{

const gy =
PAD_T + (H - PAD_T - PAD_B) * f;

gridLines +=
`<line x1="${PAD_L}" y1="${gy}" x2="${W - PAD_R}" y2="${gy}" class="ov-grid"/>` +
`<text x="${PAD_L - 7}" y="${gy + 3}" class="ov-y-label">${Math.round(maxV * (1 - f))}</text>`;

});

let dots = "";

values.forEach((v,i)=>{

dots +=
`<circle cx="${x(i)}" cy="${y(v)}" r="3" class="ov-dot"><title>${keys[i]}: ${v}</title></circle>`;

});

let xLabels = "";

labelIdx.forEach(i2=>{

xLabels +=
`<text x="${x(i2)}" y="${H - 8}" class="ov-x-label">${keys[i2].slice(5)}</text>`;

});

/* CHART TYPE BRANCH — same cached data, three
   presentations. Default remains the existing Line. */

const chartType =
window.__ovChartType || "line";

if(chartType === "bar"){

const band =
(W - PAD_L - PAD_R) / values.length;

const barW =
Math.max(Math.min(band * 0.62, 34), 3);

let bars = "";

values.forEach((v,i)=>{

const bx =
PAD_L + band * i + (band - barW) / 2;

const by =
y(v);

const bh =
Math.max((H - PAD_B) - by, v > 0 ? 2 : 0);

bars +=
`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="4" class="ov-bar"><title>${keys[i]}: ${v}</title></rect>`;

});

chart.innerHTML = `

<svg
viewBox="0 0 ${W} ${H}"
preserveAspectRatio="none"
class="ov-svg"
role="img"
aria-label="${metricLabel} bar chart, last ${range} days">

${gridLines}
${bars}
${xLabels}

</svg>

`;

return;

}

if(chartType === "donut"){

const donutTotal =
values.reduce((a,b)=>a+b, 0);

if(donutTotal <= 0){

chart.innerHTML = `
<div class="ov-chart-empty">
No ${metricLabel.toLowerCase()} recorded in the selected period
</div>
`;

return;

}

const CX = W / 2;
const CY = H / 2 - 6;
const R = 82;
const SW = 30;

let segs = "";
let acc = 0;

values.forEach((v,i)=>{

if(v <= 0) return;

const a0 =
(acc / donutTotal) * Math.PI * 2 - Math.PI / 2;

acc += v;

const a1 =
(acc / donutTotal) * Math.PI * 2 - Math.PI / 2;

const large =
a1 - a0 > Math.PI ? 1 : 0;

const x0 = CX + R * Math.cos(a0);
const y0 = CY + R * Math.sin(a0);
const x1 = CX + R * Math.cos(a1);
const y1 = CY + R * Math.sin(a1);

segs +=
`<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="#E48A2F" stroke-width="${SW}" stroke-linecap="butt" opacity="${(0.35 + 0.65 * ((i + 1) / values.length)).toFixed(2)}"><title>${keys[i]}: ${v}</title></path>`;

});

chart.innerHTML = `

<div class="ov-donut-wrap">

<svg
viewBox="0 0 ${W} ${H}"
preserveAspectRatio="xMidYMid meet"
class="ov-svg ov-donut-svg"
role="img"
aria-label="${metricLabel} distribution, last ${range} days">

${segs}

<text x="${CX}" y="${CY - 4}" text-anchor="middle" class="ov-donut-total">${donutTotal.toLocaleString()}</text>
<text x="${CX}" y="${CY + 18}" text-anchor="middle" class="ov-donut-sub">${metricLabel}</text>

</svg>

<p class="ov-donut-range">Last ${range} days</p>

</div>

`;

return;

}

chart.innerHTML = `

<svg
viewBox="0 0 ${W} ${H}"
preserveAspectRatio="none"
class="ov-svg"
role="img"
aria-label="${metricLabel}, last ${range} days">

<defs>
<linearGradient id="ovFill" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#E48A2F" stop-opacity="0.16"/>
<stop offset="100%" stop-color="#E48A2F" stop-opacity="0"/>
</linearGradient>
</defs>

${gridLines}
<path d="${area}" fill="url(#ovFill)"/>
<path d="${path}" class="ov-line"/>
${dots}
${xLabels}

</svg>

`;

};

/* =========================================
🔥 START REALTIME DEALER DASHBOARD
========================================= */

async function startDashboardRealtime(){

if(
dashboardRealtimeStarted ||
window.__DASHBOARD_REALTIME_LOADING__
){
return;
}

window.__DASHBOARD_REALTIME_LOADING__ =
true;

dashboardRealtimeStarted = true;

const { data:userData } =
await supabase.auth.getUser();

if(!userData?.user){
return;
}

const user = userData.user;

/* =====================================
GET DEALER VEHICLES
===================================== */

const { data:vehicles } =
await supabase
.from("vehicles")
.select("id")
.eq("seller_id", user.id);

const vehicleIds =
(vehicles || [])
.map(v=>v?.id)
.filter(Boolean);

/* =====================================
CLEANUP OLD CHANNEL
===================================== */

if(dashboardRealtime){

await supabase.removeChannel(
dashboardRealtime
);

dashboardRealtime = null;

}

/* =====================================
CREATE CHANNEL
===================================== */

dashboardRealtime =
supabase.channel(
`dealer-dashboard-${user.id}`
);

/* =====================================
ENQUIRIES
===================================== */

dashboardRealtime.on(
"postgres_changes",
{
event:"*",
schema:"public",
table:"enquiries",
filter:`seller_id=eq.${user.id}`
},
async ()=>{

clearTimeout(dashboardRefreshTimer);

clearTimeout(
dashboardRefreshTimer
);

dashboardRefreshTimer =
setTimeout(async ()=>{

if(document.hidden){
return;
}

await refreshDashboardRealtime();

}, 250);

}
);

/* =====================================
MESSAGES
===================================== */

dashboardRealtime.on(
"postgres_changes",
{
event:"*",
schema:"public",
table:"messages"
},
async payload=>{

const msg = payload.new;

if(
msg?.receiver_id === user.id ||
msg?.sender_id === user.id
){

clearTimeout(dashboardRefreshTimer);

clearTimeout(
dashboardRefreshTimer
);

dashboardRefreshTimer =
setTimeout(async ()=>{

if(document.hidden){
return;
}

await refreshDashboardRealtime();

}, 250);

}

}
);

/* =====================================
VEHICLE VIEWS
===================================== */

if(vehicleIds.length){

dashboardRealtime.on(
"postgres_changes",
{
event:"INSERT",
schema:"public",
table:"vehicle_views"
},
async payload=>{

const row = payload.new;

if(
vehicleIds.includes(
row?.vehicle_id
)
){

clearTimeout(dashboardRefreshTimer);

clearTimeout(
dashboardRefreshTimer
);

dashboardRefreshTimer =
setTimeout(async ()=>{

if(document.hidden){
return;
}

await refreshDashboardRealtime();

}, 250);

}

}
);

}

/* =====================================
SAVES
===================================== */

if(vehicleIds.length){

dashboardRealtime.on(
"postgres_changes",
{
event:"INSERT",
schema:"public",
table:"saved_vehicles"
},
async payload=>{

const row = payload.new;

if(
vehicleIds.includes(
row?.vehicle_id
)
){

clearTimeout(dashboardRefreshTimer);

clearTimeout(
dashboardRefreshTimer
);

dashboardRefreshTimer =
setTimeout(async ()=>{

if(document.hidden){
return;
}

await refreshDashboardRealtime();

}, 250);

}

}
);

}

/* =====================================
NOTIFICATIONS
===================================== */

dashboardRealtime.on(
"postgres_changes",
{
event:"INSERT",
schema:"public",
table:"notifications",
filter:`user_id=eq.${user.id}`
},
async ()=>{

await loadDashboardNotifications();

}
);

/* =====================================
SUBSCRIBE
===================================== */

dashboardRealtime.subscribe(status=>{

console.log(
"Dashboard realtime:",
status
);

if(
status === "SUBSCRIBED"
){

window.__DASHBOARD_REALTIME_LOADING__ =
false;

}

});

/* =====================================
VISIBILITY CLEANUP
===================================== */

if(!window.__DASHBOARD_VISIBILITY_BOUND__){

window.__DASHBOARD_VISIBILITY_BOUND__ = true;

document.addEventListener(
"visibilitychange",
async ()=>{

if(
document.hidden &&
dashboardRealtime
){

await supabase.removeChannel(
dashboardRealtime
);

dashboardRealtime = null;
dashboardRealtimeStarted = false;

}

}
);

}

/* =====================================
UNLOAD CLEANUP
===================================== */

if(!window.__DASHBOARD_UNLOAD_BOUND__){

window.__DASHBOARD_UNLOAD_BOUND__ = true;

window.addEventListener(
"beforeunload",
async ()=>{

if(dashboardRealtime){

await supabase.removeChannel(
dashboardRealtime
);

dashboardRealtime = null;
dashboardRealtimeStarted = false;

}

}
);

}

}

/* =========================================
🔥 REFRESH LIVE DASHBOARD
========================================= */

async function refreshDashboardRealtime(){

if(dashboardRefreshRunning){
return;
}

dashboardRefreshRunning = true;

try{

/* OVERVIEW */

if(
document.getElementById(
"kpiViews"
)
){

await loadDashboardAnalytics();

await Promise.allSettled([

loadViewsChart(),
loadMostViewedVehicle(),
loadLiveActivity(),
loadDashboardNotifications()

]);

}

/* INVENTORY */

if(
document.getElementById(
"inventoryTable"
)
){

await loadInventory();

}

/* PERFORMANCE */

if(
document.getElementById(
"performanceInventoryTable"
)
){

await loadInventoryPerformance();

}

/* BUYERS */

if(
document.getElementById(
"interestedBuyersList"
)
){

await loadInterestedBuyers();

}

/* CRM */

if(
document.getElementById(
"crmLeadTable"
)
){

if(window.__CURRENT_OPEN_LEAD_ID__){

await openLeadDetails(
window.__CURRENT_OPEN_LEAD_ID__
);

}else{

await loadCRMLeads();

}

}

}catch(err){

console.error(
"Realtime refresh failed:",
err
);

}finally{

dashboardRefreshRunning = false;

}

}

/* =========================================
PHASE 3 — DEALER INVENTORY EXPORT (PDF / EXCEL)

• Exports ONLY the authenticated dealer's own
  vehicles, sourced from window.__inventoryData
  which loadInventory() fills via
  .eq("seller_id", user.id) — RLS-protected.
• Respects the current search / status / sort
  state by reusing the SAME client-side filter
  logic as renderInventoryResults().
• No new database fields. jsPDF + SheetJS are
  loaded as CDN scripts (same pattern as the
  existing vehicle-page PDF export).
========================================= */

window.toggleInventoryDownloadMenu = function(event){

if(event) event.stopPropagation();

const existing =
document.getElementById("inventoryDownloadMenu");

/* Close if already open */
if(existing){
existing.remove();
return;
}

const btn =
document.getElementById("inventoryDownloadBtn");

if(!btn) return;

const rect = btn.getBoundingClientRect();

const menu =
document.createElement("div");

menu.id = "inventoryDownloadMenu";

menu.style.cssText = [
"position:fixed",
`top:${rect.bottom + 6}px`,
`left:${Math.max(8, rect.left)}px`,
"z-index:9999",
"background:#FFFFFF",
"border:1px solid rgba(10,25,47,0.12)",
"border-radius:12px",
"box-shadow:0 16px 40px rgba(15,23,42,0.18)",
"padding:6px",
"min-width:190px"
].join(";");

menu.innerHTML = `

<button
onclick="exportInventoryPDF()"
class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold text-[#0A192F] hover:bg-[#0A192F]/[0.05] transition-all text-left"
>
<svg class="w-4 h-4 text-[#E48A2F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
<path stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0011.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
<path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 13h6M9 17h3"/>
</svg>
Download PDF
</button>

<button
onclick="exportInventoryExcel()"
class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold text-[#0A192F] hover:bg-[#0A192F]/[0.05] transition-all text-left"
>
<svg class="w-4 h-4 text-[#E48A2F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
<path stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
d="M3 10h18M3 14h18M12 4l8 14M12 4L4 18"/>
</svg>
Download Excel
</button>

`;

document.body.appendChild(menu);

};

document.addEventListener("click", (e) => {

const menu =
document.getElementById("inventoryDownloadMenu");

if(
menu &&
!menu.contains(e.target) &&
e.target !== document.getElementById("inventoryDownloadBtn")
){
menu.remove();
}

});

/* ---------- EXPORT ROW SET ----------
Reuses the dealer-only cached inventory and
applies the current page filters so what the
dealer sees is what gets exported. */

function getExportRows(){

const cached = window.__inventoryData;

if(!cached || !cached.vehicles) return [];

let rows = [...cached.vehicles];

const filters =
window.__inventoryFilters ||
JSON.parse(sessionStorage.getItem("inventoryFilters")) ||
{ search:"", status:"all", sort:"newest" };

/* SEARCH — same haystack rules as the live list */
const searchValue =
(filters.search || "").toLowerCase().trim();

if(searchValue){

const searchCompact =
searchValue.replace(/[\s\-]+/g,"");

rows = rows.filter(v => {

const title =
[v.title, v.listing_title, v.vehicle_title].find(t => t);

const stockNo =
v.stock_number || v.stock_no || v.reference_number || "";

const vin = v.vin || v.chassis_number || "";

const price =
Number(v.price || 0).toLocaleString();

const text =
[v.make, v.model, v.variant, v.trim, v.year,
v.status, title, stockNo, vin, `R ${price}`, price]
.filter(Boolean).join(" ").toLowerCase();

const compact = text.replace(/[\s\-]+/g,"");
const digits = text.replace(/[^0-9]/g,"");
const searchDigits = searchValue.replace(/[^0-9]/g,"");

return (
text.includes(searchValue) ||
(compact && searchCompact && compact.includes(searchCompact)) ||
(searchDigits.length >= 4 && digits.includes(searchDigits))
);

});

}

/* STATUS */
if(filters.status && filters.status !== "all"){

rows = rows.filter(v =>
(v.status || "active").toLowerCase() === filters.status
);

}

/* SORT — mirror the visible ordering */
const sortType = filters.sort || "newest";

rows.sort((a,b)=>{

if(sortType === "price_high") return (b.price||0)-(a.price||0);
if(sortType === "price_low") return (a.price||0)-(b.price||0);
if(sortType === "oldest")
return new Date(a.created_at)-new Date(b.created_at);

return new Date(b.created_at)-new Date(a.created_at);

});

return rows;

}

/* ---------- SHARED EXPORT HELPERS ---------- */

async function getDealerIdentity(){

try{

const { data:userData } = await supabase.auth.getUser();

if(!userData?.user) return null;

const { data:profile } = await supabase
.from("profiles")
.select("dealership_name, dealership_logo, avatar_url, name, surname, account_type")
.eq("id", userData.user.id)
.single();

return {
userId: userData.user.id,
name:
(profile?.dealership_name || "").trim() ||
`${profile?.name || ""} ${profile?.surname || ""}`.trim() ||
(userData.user.email || ""),
logoUrl:
(profile?.dealership_logo || "").trim() ||
(profile?.avatar_url || "").trim(),
isDealer:
profile?.account_type === "dealer"
};

}catch(err){
console.error("Export identity failed:", err);
return null;
}

}

function exportFileName(ext){

const d = new Date();
const pad = n => String(n).padStart(2,"0");
return `HUFA-Inventory-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}.${ext}`;

}

/* Load a vehicle image into a data URL for PDF
embedding. Fails soft — returns null so the
PDF simply skips that image. */
async function loadImageDataUrl(url){

if(!url) return null;

try{

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 6000);

const res = await fetch(url, {
mode:"cors",
signal:controller.signal
});

clearTimeout(timer);

if(!res.ok) return null;

const blob = await res.blob();

if(!blob.type.startsWith("image/")) return null;

return await new Promise((resolve) => {

const reader = new FileReader();

reader.onload = () => resolve(reader.result);
reader.onerror = () => resolve(null);
reader.readAsDataURL(blob);

});

}catch(err){
return null;
}

}

/* Cached loader for the real HUFA brand mark
(assets/logo.png). Fetched once per session as a
data URL so it can be embedded in the PDF. Fails
soft — the header falls back to clean text. */
let __hufaExportLogoCache = null;

async function getHufaExportLogo(){

if(__hufaExportLogoCache !== null) return __hufaExportLogoCache;

__hufaExportLogoCache =
await loadImageDataUrl(asset("/assets/logo.png"));

return __hufaExportLogoCache;

}

/* Draw an image data URL fitted inside a box while
preserving aspect ratio (centred). Returns nothing;
on failure leaves the box untouched. */
function drawImageFitted(pdf, dataUrl, x, y, w, h){

try{

const tmp = new Image();

tmp.src = dataUrl;

/* Data URLs decode synchronously in practice,
but guard anyway. */
const ratio = tmp.width && tmp.height
? tmp.width / tmp.height
: 1;

let dw = w;
let dh = dw / ratio;

if(dh > h){
dh = h;
dw = dh * ratio;
}

pdf.addImage(
dataUrl,
dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG",
x + (w - dw) / 2,
y + (h - dh) / 2,
dw, dh,
undefined, "FAST"
);

}catch(err){ /* fail soft */ }

}

function vehicleTitle(v){
return [v.title, v.listing_title, v.vehicle_title].find(t => t) ||
[v.make, v.model, v.variant].filter(Boolean).join(" ") ||
"Vehicle";
}

function vehicleStock(v){
return v.stock_number || v.stock_no || v.reference_number || "";
}

function vehicleLocation(v){
return [v.city || v.location, v.province]
.filter(Boolean).join(", ") || "—";
}

/* =========================================
PHASE 3 — PDF EXPORT
========================================= */

window.exportInventoryPDF = async function(){

const menu =
document.getElementById("inventoryDownloadMenu");

if(menu) menu.remove();

try{

  await ensureScript(
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
  );

}catch(err){

  alert("PDF library could not be loaded. Please check your connection and try again.");
  return;

}

const rows = getExportRows();

if(!rows.length){
alert("No vehicles match your current inventory filters.");
return;
}

const dealer = await getDealerIdentity();

const { jsPDF } = window.jspdf;

const pdf =
new jsPDF({ orientation:"p", unit:"mm", format:"a4" });

const PW = pdf.internal.pageSize.getWidth();
const PH = pdf.internal.pageSize.getHeight();
const M  = 14;
const CW = PW - M * 2;

const C_GOLD  = [226, 122, 32];
const C_DARK  = [10, 25, 47];
const C_SLATE = [71, 85, 105];
const C_MUTED = [148, 163, 184];
const C_CARD  = [243, 246, 249];
const C_LINE  = [224, 230, 237];
const C_WHITE = [255, 255, 255];
const C_LIGHT = [178, 194, 214];

function spacedText(pdf, text, x, y, gap, align){
  align = align || "left";
  const chars = Array.from(String(text));
  if(!chars.length) return 0;
  const widths = chars.map(c => pdf.getTextWidth(c));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let cx = x;
  if(align === "center") cx = x - total / 2;
  if(align === "right") cx = x - total;
  chars.forEach((c, i) => { pdf.text(c, cx, y); cx += widths[i] + gap; });
  return total;
}

function clipText(pdf, value, maxW){
  let t = String(value);
  if(pdf.getTextWidth(t) <= maxW) return t;
  while(t.length > 1 && pdf.getTextWidth(t + "…") > maxW) t = t.slice(0, -1);
  return t + "…";
}

function fmtStatus(s){
  s = String(s || "active").toLowerCase();
  const map = { active:"Available", sold:"Sold", archived:"Archived", pending:"Pending", reserved:"Reserved" };
  return map[s] || s.charAt(0).toUpperCase() + s.slice(1);
}

function imageUrl(v){
  if(v.image_url) return v.image_url;
  if(Array.isArray(v.images) && v.images[0]) return v.images[0];
  if(typeof v.images === "string"){
    try{ const p = JSON.parse(v.images); if(Array.isArray(p) && p[0]) return p[0]; }catch(e){}
  }
  return "";
}

function roundImage(dataUrl, wmm, hmm, rmm){
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try{
        const S = 8;
        const cw = Math.round(wmm * S), ch = Math.round(hmm * S), cr = Math.round(rmm * S);
        const cv = document.createElement("canvas");
        cv.width = cw; cv.height = ch;
        const ctx = cv.getContext("2d");
        ctx.beginPath();
        ctx.moveTo(cr, 0); ctx.lineTo(cw - cr, 0); ctx.quadraticCurveTo(cw, 0, cw, cr);
        ctx.lineTo(cw, ch - cr); ctx.quadraticCurveTo(cw, ch, cw - cr, ch);
        ctx.lineTo(cr, ch); ctx.quadraticCurveTo(0, ch, 0, ch - cr);
        ctx.lineTo(0, cr); ctx.quadraticCurveTo(0, 0, cr, 0);
        ctx.closePath(); ctx.clip();
        const ir = img.naturalWidth / img.naturalHeight, br = cw / ch;
        let sw, sh, sx, sy;
        if(ir > br){ sh = img.naturalHeight; sw = sh * br; sx = (img.naturalWidth - sw) / 2; sy = 0; }
        else { sw = img.naturalWidth; sh = sw / br; sx = 0; sy = (img.naturalHeight - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
        resolve(cv.toDataURL("image/png"));
      }catch(e){ resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

async function drawHeader(){
  const logo = await getHufaExportLogo();
  let logoW = 0;
  if(logo){
    try{
      const fmt = logo.startsWith("data:image/png") ? "PNG" : (logo.startsWith("data:image/jpeg") || logo.startsWith("data:image/jpg") ? "JPEG" : "PNG");
      const h = 10, w = h * 2.6;
      pdf.addImage(logo, fmt, M, 9.5 - h / 2, w, h);
      logoW = w;
    }catch(e){}
  }
  const textX = M + logoW + (logoW ? 5 : 0);
  pdf.setFont("helvetica", "bold").setFontSize(9).setTextColor(...C_DARK);
  spacedText(pdf, "HELPUFIN AUTO", textX, 8.5, 0.5);
  pdf.setFont("helvetica", "normal").setFontSize(5.5).setTextColor(...C_MUTED);
  spacedText(pdf, "DEALER INVENTORY REPORT", textX, 12.5, 0.3);
  pdf.setFontSize(5.5).setTextColor(...C_MUTED);
  pdf.text("Generated " + new Date().toLocaleDateString("en-ZA",{day:"2-digit",month:"long",year:"numeric"}), PW - M, 11, {align:"right"});
  pdf.setDrawColor(...C_DARK).setLineWidth(0.4);
  pdf.line(M, 16.5, PW - M, 16.5);
  pdf.setDrawColor(...C_GOLD).setLineWidth(1.2);
  pdf.line(M, 16.5, M + 16, 16.5);
  return 22;
}

function drawFooter(pdf, pageNum){
  pdf.setDrawColor(...C_LINE).setLineWidth(0.3);
  pdf.line(M, PH - 11.5, PW - M, PH - 11.5);
  pdf.setFont("helvetica", "bold").setFontSize(5.5).setTextColor(...C_SLATE);
  spacedText(pdf, "HELPUFIN AUTO", M, PH - 7.5, 0.3);
  pdf.setFont("helvetica", "normal").setFontSize(5).setTextColor(...C_MUTED);
  spacedText(pdf, "DEALER INVENTORY REPORT", M + 22, PH - 7.5, 0.25);
  pdf.setFont("helvetica", "bold").setFontSize(6).setTextColor(...C_DARK);
  pdf.text("PAGE " + String(pageNum).padStart(2, "0"), PW - M, PH - 7.5, {align:"right"});
}

const PAD = 5, IMG_W = 48, IMG_H = 32, IMG_R = 1.5;
const TXT_GAP = 6, TXT_W = CW - PAD * 2 - IMG_W - TXT_GAP;
const SPEC_RH = 4.8, SPEC_ROWS = 3, SPEC_H = SPEC_RH * SPEC_ROWS;
const CARD_H = PAD + IMG_H + 3 + SPEC_H + PAD, CARD_GAP = 5;

async function drawCard(v, y){
  pdf.setFillColor(...C_CARD).roundedRect(M, y, CW, CARD_H, 2, 2, "F");
  pdf.setFillColor(...C_GOLD).rect(M, y + 2, 1.5, CARD_H - 4, "F");
  const ix = M + PAD, iy = y + PAD;
  let drawn = false;
  const iu = imageUrl(v);
  if(iu){
    try{
      const du = await loadImageDataUrl(iu);
      if(du){
        const rnd = await roundImage(du, IMG_W, IMG_H, IMG_R);
        if(rnd){ pdf.addImage(rnd, "PNG", ix, iy, IMG_W, IMG_H, undefined, "FAST"); drawn = true; }
      }
    }catch(e){}
  }
  if(!drawn){
    pdf.setFillColor(246, 248, 251).roundedRect(ix, iy, IMG_W, IMG_H, IMG_R, IMG_R, "F");
    pdf.setFontSize(6.5).setTextColor(...C_MUTED);
    pdf.text("No image", ix + IMG_W / 2, iy + IMG_H / 2, {align:"center"});
  }
  const bx = ix + IMG_W + TXT_GAP;
  let by = y + PAD + 0.5;
  pdf.setFont("helvetica", "bold").setFontSize(10).setTextColor(...C_DARK);
  pdf.text(clipText(pdf, vehicleTitle(v), TXT_W), bx, by);
  by += 4.2;
  pdf.setFont("helvetica", "normal").setFontSize(7).setTextColor(...C_SLATE);
  const sub = [v.year, v.make, v.model, v.variant].filter(Boolean).join(" · ");
  pdf.text(clipText(pdf, sub || "—", TXT_W), bx, by);
  by += 4.5;
  pdf.setFont("helvetica", "bold").setFontSize(11).setTextColor(...C_GOLD);
  pdf.text("R " + Number(v.price || 0).toLocaleString(), bx, by);
  const st = fmtStatus(v.status).toUpperCase();
  pdf.setFont("helvetica", "bold").setFontSize(5.5);
  const stW = pdf.getTextWidth(st) + 4.4;
  pdf.setFillColor(251, 240, 227).roundedRect(M + CW - PAD - stW, by - 3, stW, 4.2, 2.1, 2.1, "F");
  pdf.setTextColor(192, 110, 32);
  pdf.text(st, M + CW - PAD - 2.2, by + 0.1, {align:"right"});
  const sx = M + PAD, sg = 14, scw = (CW - PAD * 2 - sg) / 2, gy = y + PAD + IMG_H + 3;
  const specs = [
    ["Mileage", v.mileage ? Number(v.mileage).toLocaleString() + " km" : "—"],
    ["Fuel Type", v.fuel_type || "—"],
    ["Transmission", v.transmission || "—"],
    ["Location", vehicleLocation(v)],
    ["Stock No.", vehicleStock(v) || "—"],
    ["Listed", v.created_at ? new Date(v.created_at).toLocaleDateString("en-ZA") : "—"]
  ];
  specs.forEach(([lb, vl], i) => {
    const c = i % 2, r = Math.floor(i / 2);
    const cx = sx + c * (scw + sg), ry = gy + r * SPEC_RH;
    pdf.setFont("helvetica", "bold").setFontSize(5).setTextColor(...C_MUTED);
    spacedText(pdf, lb.toUpperCase(), cx, ry + 3, 0.2);
    pdf.setFont("helvetica", "normal").setFontSize(7).setTextColor(...C_SLATE);
    pdf.text(String(vl).slice(0, 30), cx + scw, ry + 3, {align:"right"});
  });
  return y + CARD_H;
}

/* Page 1 — header + document title + summary strip */
let y = await drawHeader();

y += 4;
pdf.setFont("helvetica", "bold").setFontSize(6.5).setTextColor(...C_GOLD);
spacedText(pdf, "DEALER INVENTORY", M, y, 0.45);

y += 8;
pdf.setFont("helvetica", "bold").setFontSize(22).setTextColor(...C_DARK);
pdf.text("Inventory Report", M, y);

y += 12;
const sh = 14;
pdf.setFillColor(...C_DARK).rect(M, y, CW, sh, "F");
pdf.setFillColor(...C_GOLD).rect(M, y, 1.8, sh, "F");
pdf.setFont("helvetica", "bold").setFontSize(10).setTextColor(...C_WHITE);
pdf.text(clipText(pdf, String(dealer?.name || "My Dealership"), 80), M + 6, y + sh / 2 + 1.2);
pdf.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...C_LIGHT);
pdf.text(rows.length + " vehicle" + (rows.length === 1 ? "" : "s"), M + 6, y + sh / 2 + 5.5);
pdf.setFontSize(7).setTextColor(...C_LIGHT);
pdf.text("Generated " + new Date().toLocaleDateString("en-ZA",{day:"2-digit",month:"short",year:"numeric"}), PW - M, y + sh / 2 + 3.5, {align:"right"});
y += sh + 8;

/* ---------- VEHICLE CARDS ---------- */

for(let i = 0; i < rows.length; i++){

const v = rows[i];

if(y + CARD_H > PH - 16){
pdf.addPage();
y = await drawHeader() + 4;
}

y = await drawCard(v, y);
y += CARD_GAP;

}

/* ---------- FOOTERS ---------- */

const pages = pdf.getNumberOfPages();

for(let p = 1; p <= pages; p++){
pdf.setPage(p);
drawFooter(pdf, p);
}

pdf.save(exportFileName("pdf"));

};

/* =========================================
PHASE 3 — EXCEL EXPORT (.xlsx)
========================================= */

window.exportInventoryExcel = async function(){

const menu =
document.getElementById("inventoryDownloadMenu");

if(menu) menu.remove();

try{

  await ensureScript(
    "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
  );

}catch(err){

  alert("Excel library could not be loaded. Please check your connection and try again.");
  return;

}

const rows = getExportRows();

if(!rows.length){
alert("No vehicles match your current inventory filters.");
return;
}

const dealer =
await getDealerIdentity();

const nowX = new Date();

const exportedLabel =
`${nowX.toLocaleDateString("en-ZA",{day:"2-digit",month:"short",year:"numeric"})} ${nowX.toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit"})}`;

const dealershipLabel =
dealer?.name || "My Dealership";

const TITLE_ROWS = 7;

const headers = [
"Vehicle","Make","Model","Variant","Year","Mileage","Price (R)",
"Fuel Type","Transmission","Body Type","Colour","Location",
"Province","Stock Number","Status","Vehicle Category",
"Seller Type","Date Added"
];

const aoa = [];

aoa.push(["HUFA"]);
aoa.push(["Helpufin Auto — Premium Automotive Marketplace"]);
aoa.push(["DEALER INVENTORY REPORT"]);
aoa.push([`Dealership: ${dealershipLabel}`]);
aoa.push([`Report Date: ${exportedLabel}`]);
aoa.push([`Inventory Count: ${rows.length}`]);
aoa.push([]);
aoa.push(headers);

rows.forEach(v => {

aoa.push([
vehicleTitle(v),
v.make || "",
v.model || "",
v.variant || "",
v.year ?? "",
v.mileage ? Number(v.mileage) : "",
Number(v.price || 0),
v.fuel_type || "",
v.transmission || "",
v.body_type || "",
v.color || "",
v.city || v.location || "",
v.province || "",
vehicleStock(v),
v.status || "active",
v.vehicle_category || "",
v.seller_type || "",
v.created_at
? new Date(v.created_at)
: ""
]);

});

const wb = XLSX.utils.book_new();

const ws = XLSX.utils.aoa_to_sheet(aoa);

/* ---- CELL STYLES (HUFA navy / orange / white theme) ---- */
/* SheetJS color format is AARRGGBB */

const FILL_NAVY = { patternType:"solid", fgColor:{rgb:"FF0A192F"} };
const FILL_ORANGE = { patternType:"solid", fgColor:{rgb:"FFE48A2F"} };
const FILL_LIGHT = { patternType:"solid", fgColor:{rgb:"FFF1F5F9"} };
const FILL_WHITE = { patternType:"solid", fgColor:{rgb:"FFFFFFFF"} };
const FILL_ALT = { patternType:"solid", fgColor:{rgb:"FFF8FAFC"} };

const FONT_TITLE = { color:{rgb:"FFFFFFFF"}, bold:true, sz:22, name:"Calibri" };
const FONT_SUBTITLE = { color:{rgb:"FFFFFFFF"}, bold:true, sz:12, name:"Calibri" };
const FONT_REPORT = { color:{rgb:"FFFFFFFF"}, bold:true, sz:14, name:"Calibri" };
const FONT_INFO = { color:{rgb:"FF475169"}, sz:11, name:"Calibri" };
const FONT_HEADER = { color:{rgb:"FFFFFFFF"}, bold:true, sz:10, name:"Calibri" };
const FONT_DATA = { color:{rgb:"FF334155"}, sz:10, name:"Calibri" };

const ALIGN_CENTER = { horizontal:"center", vertical:"center" };
const ALIGN_LEFT = { horizontal:"left", vertical:"center" };

const BORDER_BOTTOM = { bottom:{ style:"thin", color:{rgb:"FFE48A2F"} } };

/* Style title rows */
for(let c = 0; c <= 11; c++){
  const c0 = XLSX.utils.encode_cell({r:0,c:c}); if(ws[c0]){ ws[c0].s = {fill:FILL_NAVY, font:FONT_TITLE, alignment:ALIGN_CENTER}; }
  const c1 = XLSX.utils.encode_cell({r:1,c:c}); if(ws[c1]){ ws[c1].s = {fill:FILL_NAVY, font:FONT_SUBTITLE, alignment:ALIGN_CENTER}; }
  const c2 = XLSX.utils.encode_cell({r:2,c:c}); if(ws[c2]){ ws[c2].s = {fill:FILL_ORANGE, font:FONT_REPORT, alignment:ALIGN_CENTER}; }
  const c3 = XLSX.utils.encode_cell({r:3,c:c}); if(ws[c3]){ ws[c3].s = {fill:FILL_LIGHT, font:FONT_INFO, alignment:ALIGN_LEFT}; }
  const c4 = XLSX.utils.encode_cell({r:4,c:c}); if(ws[c4]){ ws[c4].s = {fill:FILL_LIGHT, font:FONT_INFO, alignment:ALIGN_LEFT}; }
  const c5 = XLSX.utils.encode_cell({r:5,c:c}); if(ws[c5]){ ws[c5].s = {fill:FILL_LIGHT, font:FONT_INFO, alignment:ALIGN_LEFT}; }
}

/* Style header row */
for(let c = 0; c < headers.length; c++){
  const hc = XLSX.utils.encode_cell({r:TITLE_ROWS,c:c});
  if(ws[hc]){ ws[hc].s = {fill:FILL_NAVY, font:FONT_HEADER, alignment:ALIGN_CENTER, border:BORDER_BOTTOM}; }
}

/* Style data rows (alternating colors) */
for(let r = TITLE_ROWS + 1; r < aoa.length; r++){
  const style = (r % 2 === 0) ? {fill:FILL_ALT, font:FONT_DATA, alignment:ALIGN_LEFT} : {fill:FILL_WHITE, font:FONT_DATA, alignment:ALIGN_LEFT};
  for(let c = 0; c < aoa[r].length; c++){
    const dc = XLSX.utils.encode_cell({r,c});
    if(ws[dc]){ ws[dc].s = style; }
  }
}

/* ---- MERGES ---- */
ws["!merges"] = [
{ s:{r:0,c:0}, e:{r:0,c:11} },
{ s:{r:1,c:0}, e:{r:1,c:11} },
{ s:{r:2,c:0}, e:{r:2,c:11} },
{ s:{r:3,c:0}, e:{r:3,c:11} },
{ s:{r:4,c:0}, e:{r:4,c:11} },
{ s:{r:5,c:0}, e:{r:5,c:11} }
];

/* ---- ROW HEIGHTS ---- */
ws["!rows"] = [
{ hpt:30 },{ hpt:16 },{ hpt:20 },
{ hpt:15 },{ hpt:15 },{ hpt:15 },{ hpt:8 }
];

/* ---- NUMBER FORMATS (currency / mileage / dates) ---- */

for(let r = TITLE_ROWS + 1; r < aoa.length; r++){

const priceCell =
ws[XLSX.utils.encode_cell({ r, c: 6 })];

if(priceCell && typeof priceCell.v === "number"){
priceCell.z = '"R" #,##0';
}

const mileageCell =
ws[XLSX.utils.encode_cell({ r, c: 5 })];

if(mileageCell && mileageCell.v !== "" && mileageCell.v != null){
mileageCell.z = "#,##0";
}

const dateCell =
ws[XLSX.utils.encode_cell({ r, c: 17 })];

if(dateCell && dateCell.t === "n"){
dateCell.z = "yyyy-mm-dd";
}

}

/* ---- COLUMN WIDTHS ---- */
ws["!cols"] = [
{wch:36},{wch:14},{wch:14},{wch:16},{wch:8},{wch:14},{wch:16},
{wch:12},{wch:14},{wch:12},{wch:12},{wch:18},
{wch:16},{wch:14},{wch:10},{wch:18},
{wch:12},{wch:14}
];

/* ---- AUTOFILTER + FREEZE ---- */
ws["!autofilter"] = {
ref: XLSX.utils.encode_range({
s:{r:TITLE_ROWS,c:0},
e:{r:aoa.length-1,c:17}
})
};

ws["!freeze"] = { xSplit:"0", ySplit:String(TITLE_ROWS + 1) };

XLSX.utils.book_append_sheet(wb, ws, "Inventory");

XLSX.writeFile(wb, exportFileName("xlsx"));

};
