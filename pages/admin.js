import { supabase, getUserProfile, getAuthUser } from "../js/api.js";
import { navigate } from "../js/router.js";

export function AdminPage(){

setTimeout(initAdmin, 0);
setTimeout(initAdminSidebar, 0);

return `

<div class="dashboard-premium-bg">

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
onclick="toggleAdminSidebar()"
aria-label="Open admin menu"
title="Open admin menu"
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
"
>

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
text-right
">
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
"
>

<div class="sidebar-glow"></div>

<!-- ADMIN PROFILE -->

<div class="
dashboard-dealer-profile
"
id="adminSidebarProfile"
>

<div class="
flex
items-center
gap-3
min-w-0
"
>

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
"
>
HA
</div>

<div class="
dashboard-sidebar-profile-text
min-w-0
flex-1
"
>

<p
id="dashboardSidebarName"
class="
dashboard-sidebar-name
truncate
"
>
Administrator
</p>

<p
id="dashboardSidebarType"
class="
dashboard-sidebar-account-type
truncate
"
>
Admin Console
</p>

</div>

</div>

</div>

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
"
>

<p class="
dashboard-nav-group-label
"
>
Admin Control
</p>

<button
type="button"
class="
nav-item
min-h-[44px]
w-full
relative
z-[120]
pointer-events-auto
cursor-pointer
active:scale-[0.98]
transition
active
"
data-admin-target="adminOverview"
>

<span class="nav-icon" aria-hidden="true">◆</span>

<span>
Overview
</span>

</button>

<button
type="button"
class="
nav-item
min-h-[44px]
w-full
relative
z-[120]
pointer-events-auto
cursor-pointer
active:scale-[0.98]
transition
"
data-admin-target="adminVehiclesSection"
>

<span class="nav-icon" aria-hidden="true">▣</span>

<span>
Vehicle Controls
</span>

</button>

<button
type="button"
class="
nav-item
min-h-[44px]
w-full
relative
z-[120]
pointer-events-auto
cursor-pointer
active:scale-[0.98]
transition
"
data-admin-target="adminUsersSection"
>

<span class="nav-icon" aria-hidden="true">◉</span>

<span>
User Management
</span>

</button>

<button
type="button"
class="
nav-item
min-h-[44px]
w-full
relative
z-[120]
pointer-events-auto
cursor-pointer
active:scale-[0.98]
transition
"
data-admin-target="adminDirectorySection"
>

<span class="nav-icon" aria-hidden="true">☰</span>

<span>
User Directory
</span>

</button>

<button
type="button"
class="
nav-item
min-h-[44px]
w-full
relative
z-[120]
pointer-events-auto
cursor-pointer
active:scale-[0.98]
transition
"
data-admin-target="adminApprovalsSection"
>

<span class="nav-icon" aria-hidden="true">✓</span>

<span>
Approvals
</span>

</button>

<button
type="button"
class="
nav-item
min-h-[44px]
w-full
relative
z-[120]
pointer-events-auto
cursor-pointer
active:scale-[0.98]
transition
"
data-admin-target="adminFinanceSection"
>

<span class="nav-icon" aria-hidden="true">＄</span>

<span>
Finance Queue
</span>

</button>

</nav>

<!-- SIDEBAR FOOTER -->

<div class="
dashboard-sidebar-footer
mt-6
pb-6
"
>

</div>

</aside>

<div
id="dashboardSidebarOverlay"
onclick="toggleAdminSidebar(false)"
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
"
>

</div>

<!-- MAIN -->

<div
class="
min-w-0
w-full
overflow-x-hidden
relative
admin-content
"
>

<!-- PAGE INTRO -->

<div class="
flex
flex-col
lg:flex-row
lg:items-center
lg:justify-between
gap-4
mb-6
"
>

<div class="min-w-0">

<div class="
admin-eyebrow
"
>
Marketplace Control
</div>

<h1 class="
text-2xl
md:text-3xl
font-bold
tracking-tight
text-[#081120]
leading-tight
"
>
Admin Dashboard
</h1>

<p class="
mt-1.5
text-sm
text-slate-500
max-w-2xl
"
>
Manage sponsorships, homepage boosts,
premium dealerships and finance applications.
</p>

</div>

<div class="
flex
gap-3
flex-wrap
items-center
"
>

<div class="dashboard-live-pill">
<div class="dashboard-live-dot"></div>
Live Marketplace
</div>

<button
onclick="refreshAdmin()"
class="dashboard-primary-btn admin-btn"
>
Refresh Dashboard
</button>

</div>

</div>

<!-- KPI GRID -->

<div
id="adminStats"
class="
dashboard-kpi-grid
admin-kpi-grid
mb-6
"
>

<!-- Initial KPI skeleton state: shown immediately on first paint so the
     statistic cards never display blank values while data loads.
     loadStats() replaces this grid with the real KPI cards. -->
<div class="dashboard-kpi-card">
<div class="dashboard-kpi-label">
Sponsored Vehicles
</div>

<div class="skeleton-shimmer h-9 w-20 rounded-md mt-1"></div>

<div class="skeleton-shimmer h-3 w-32 rounded mt-2"></div>
</div>

<div class="dashboard-kpi-card">
<div class="dashboard-kpi-label">
Premium Dealers
</div>

<div class="skeleton-shimmer h-9 w-20 rounded-md mt-1"></div>

<div class="skeleton-shimmer h-3 w-32 rounded mt-2"></div>
</div>

<div class="dashboard-kpi-card">
<div class="dashboard-kpi-label">
Finance Applications
</div>

<div class="skeleton-shimmer h-9 w-20 rounded-md mt-1"></div>

<div class="skeleton-shimmer h-3 w-32 rounded mt-2"></div>
</div>

</div>

<!-- VEHICLE CONTROL -->

<div
id="adminVehiclesSection"
class="
dashboard-chart-card
admin-section-card
mb-6
"
>

<div class="
flex
items-center
justify-between
gap-4
flex-wrap
mb-5
"
>

<div class="min-w-0">

<div class="admin-section-label">
Marketplace Inventory
</div>

<h2 class="
admin-section-title
"
>
Vehicle Monetization Controls
</h2>

</div>

<input
id="adminSearch"
placeholder="Search vehicles..."
class="
input-light
admin-input
w-full
sm:w-auto
sm:max-w-sm
"
/>

</div>

<div
id="adminVehicles"
class="
grid
grid-cols-1
lg:grid-cols-2
gap-6
"
>

<!-- Initial skeleton state: replaced by renderVehicles() with real
     vehicle control cards or the existing empty state. -->
${renderAdminVehicleSkeletons(2)}

</div>

</div>

<!-- USER MANAGEMENT -->

<div
id="adminUsersSection"
class="
dashboard-chart-card
admin-section-card
mb-6
"
>

<div class="
flex
items-center
justify-between
gap-4
flex-wrap
mb-5
"
>

<div class="min-w-0">

<div class="admin-section-label">
Marketplace Users
</div>

<h2 class="
admin-section-title
"
>
User Management
</h2>

</div>

<div class="
flex
gap-3
flex-wrap
">

<input
id="adminUserSearch"
placeholder="Search users..."
class="
input-light
max-w-xs
"
/>

<select
id="adminUserFilter"
class="
input-light
max-w-[220px]
"
>

<option value="all">
All Users
</option>

<option value="active">
Active Users
</option>

<option value="suspended">
Suspended Users
</option>

<option value="dealer">
Dealers
</option>

<option value="private_seller">
Private Sellers
</option>

<option value="premium">
Premium Packages
</option>

</select>

<button
onclick="openCreateUserModal()"
class="dashboard-primary-btn"
>
Add User
</button>

</div>

</div>

<div
id="adminUsers"
class="
space-y-5
max-h-[900px]
overflow-y-auto
pr-2
"
>

<!-- Initial skeleton state: replaced by renderUsers() with real user
     rows or the existing empty state. -->
${renderAdminUserSkeletons(3)}

</div>

</div>

<!-- USER DIRECTORY (PHASE 2 — READ-ONLY SIGN-UP TRACKING) -->

<div
id="adminDirectorySection"
class="
dashboard-chart-card
admin-section-card
mb-6
"
>

<div class="
flex
items-center
justify-between
gap-4
flex-wrap
mb-5
"
>

<div class="min-w-0">

<div class="admin-section-label">
All Registered Accounts
</div>

<h2 class="
admin-section-title
"
>
Users
</h2>

<p class="
text-xs
text-slate-400
mt-1
"
>
Read-only directory · UID, name, email and auth
provider from Supabase Auth
</p>

</div>

<div class="
flex
items-center
gap-3
flex-wrap
"
>

<div
id="adminDirectoryCount"
class="admin-directory-count"
>

<span class="skeleton-shimmer h-5 w-14 rounded inline-block align-middle"></span>

</div>

<input
id="adminDirectorySearch"
placeholder="Search UID, name or email..."
class="
input-light
admin-input
w-full
sm:w-auto
sm:max-w-xs
"
/>

</div>

</div>

<div
id="adminDirectory"
class="admin-directory-wrap"
>

<!-- Initial skeleton state: replaced by renderUserDirectory() with
     the real directory table/list, empty state or error state. -->
${renderAdminDirectorySkeletons(5)}

</div>

</div>

<!-- PENDING APPROVALS -->

<div
id="adminApprovalsSection"
class="
dashboard-chart-card
admin-section-card
mb-6
"
>

<div class="mb-6">

<div class="admin-section-label">
Approvals
</div>

<h2 class="
admin-section-title
"
>
Pending Approvals
</h2>

<div class="mt-6">

<div class="admin-section-label">
Catalogue Requests
</div>

<h3 class="
admin-subsection-title
"
>
Vehicle Catalogue Queue
</h3>

<div
id="catalogRequests"
class="
space-y-5
max-h-[700px]
overflow-y-auto
pr-2
"
>

<!-- Initial skeleton state: replaced by renderCatalogRequests() with
     real request rows or the existing empty state. -->
${renderAdminApprovalSkeletons(3)}

</div>

</div>

</div>

<div
id="pendingApprovals"
class="
space-y-5
max-h-[700px]
overflow-y-auto
pr-2
"
>

<!-- Initial skeleton state: replaced by renderPendingUsers() with real
     approval rows or the existing empty state. -->
${renderAdminApprovalSkeletons(3)}

</div>

</div>

<!-- CREATE USER MODAL -->

<div
id="createUserModal"
class="
fixed
inset-0
z-[200]
hidden
items-center
justify-center
bg-black/50
backdrop-blur-sm
p-6
"
>

<div class="
w-full
max-w-2xl
rounded-[32px]
bg-white
p-8
shadow-[0_30px_100px_rgba(0,0,0,0.18)]
max-h-[90vh]
overflow-y-auto
">

<div class="
flex
items-center
justify-between
mb-8
">

<div>

<div class="
text-xs
uppercase
tracking-[0.18em]
font-bold
text-[#C6A75D]
mb-2
">
Admin
</div>

<h2 class="
text-3xl
font-black
text-[#081120]
tracking-tight
">
Create User
</h2>

</div>

<button
onclick="closeCreateUserModal()"
class="
w-12
h-12
rounded-2xl
bg-gray-100
hover:bg-gray-200
text-xl
font-bold
"
>
×
</button>

</div>

<div class="grid grid-cols-1 md:grid-cols-2 gap-5">

<input
id="newUserName"
placeholder="Name"
class="input-light"
/>

<input
id="newUserSurname"
placeholder="Surname"
class="input-light"
/>

<input
id="newUserEmail"
placeholder="Email"
class="input-light md:col-span-2"
/>

<input
id="newUserPhone"
placeholder="Phone"
class="input-light"
/>

<input
id="newDealership"
placeholder="Dealership Name"
class="input-light"
/>

<select
id="newAccountType"
class="input-light"
>

<option value="private_seller">
Private Seller
</option>

<option value="dealer">
Dealer
</option>

</select>

<select
id="newPackageTier"
class="input-light"
>

<option value="basic">
Basic
</option>

<option value="tier1">
Tier 1
</option>

<option value="tier2">
Tier 2
</option>

<option value="premium">
Premium
</option>

</select>

</div>

<div class="
flex
justify-end
gap-4
mt-8
">

<button
onclick="closeCreateUserModal()"
class="
rounded-2xl
border
border-gray-200
px-6
py-3
font-semibold
"
>
Cancel
</button>

<button
onclick="createProfileUser()"
class="dashboard-primary-btn"
>
Create User
</button>

</div>

</div>

</div>

<!-- FINANCE APPLICATIONS -->

<div
id="adminFinanceSection"
class="
dashboard-chart-card
admin-section-card
"
>

<div class="mb-5">

<div class="admin-section-label">
Applications
</div>

<h2 class="
admin-section-title
"
>
Finance Approval Queue
</h2>

</div>

<div
id="financeApps"
class="space-y-5"
>

<!-- Initial skeleton state: replaced by renderFinanceApps() with real
     application cards or the existing empty state. -->
${renderAdminAppSkeletons(3)}

</div>

</div>

</div>

</div>

</div>

</div>

`;

}

/* =========================
LOADING SKELETONS (PHASE 10)
Mirror the eventual content — vehicle control
cards (image, analytics mini-cards, title,
toggle blocks), user management rows, pending
approval / catalogue request rows and finance
application cards — using the shared
.skeleton-image / .skeleton-shimmer language
from css/styles.css. Replaced by the existing
render functions with real content or the
existing empty states.
========================= */

function renderAdminVehicleSkeletons(count = 2){

const skeletonCard = () => `

<div class="
rounded-[32px]
border
border-gray-200
bg-white
overflow-hidden
shadow-[0_20px_60px_rgba(0,0,0,0.06)]
">

  <!-- IMAGE -->
  <div class="relative aspect-[16/9] overflow-hidden bg-gray-100">
    <div class="w-full h-full skeleton-image"></div>
  </div>

  <div class="p-6">

    <!-- ANALYTICS MINI CARDS -->
    <div class="grid grid-cols-4 gap-3 mb-5">
      <div class="analytics-mini-card">
        <div class="skeleton-shimmer h-2.5 w-14 rounded mb-1.5"></div>
        <div class="skeleton-shimmer h-4 w-10 rounded"></div>
      </div>
      <div class="analytics-mini-card">
        <div class="skeleton-shimmer h-2.5 w-12 rounded mb-1.5"></div>
        <div class="skeleton-shimmer h-4 w-10 rounded"></div>
      </div>
      <div class="analytics-mini-card">
        <div class="skeleton-shimmer h-2.5 w-10 rounded mb-1.5"></div>
        <div class="skeleton-shimmer h-4 w-12 rounded"></div>
      </div>
      <div class="analytics-mini-card">
        <div class="skeleton-shimmer h-2.5 w-10 rounded mb-1.5"></div>
        <div class="skeleton-shimmer h-4 w-10 rounded"></div>
      </div>
    </div>

    <!-- TITLE + PRICE -->
    <div class="flex items-start justify-between gap-4 mb-5">
      <div class="flex-1">
        <div class="skeleton-shimmer h-6 w-2/3 rounded-md"></div>
        <div class="skeleton-shimmer h-4 w-24 rounded mt-2"></div>
      </div>
      <div class="skeleton-shimmer h-6 w-28 rounded-full"></div>
    </div>

    <!-- TOGGLE BLOCKS -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      <div class="rounded-2xl border border-gray-200 p-4 flex items-center justify-between gap-4">
        <div class="skeleton-shimmer h-4 w-20 rounded"></div>
        <div class="skeleton-shimmer w-5 h-5 rounded"></div>
      </div>
      <div class="rounded-2xl border border-gray-200 p-4 flex items-center justify-between gap-4">
        <div class="skeleton-shimmer h-4 w-24 rounded"></div>
        <div class="skeleton-shimmer w-5 h-5 rounded"></div>
      </div>
      <div class="rounded-2xl border border-gray-200 p-4 flex items-center justify-between gap-4">
        <div class="skeleton-shimmer h-4 w-28 rounded"></div>
        <div class="skeleton-shimmer w-5 h-5 rounded"></div>
      </div>
      <div class="rounded-2xl border border-gray-200 p-4">
        <div class="skeleton-shimmer h-2.5 w-20 rounded mb-2"></div>
        <div class="skeleton-shimmer h-8 w-full rounded-lg"></div>
      </div>
    </div>

    <!-- ACTION BUTTONS -->
    <div class="flex gap-3 flex-wrap">
      <div class="skeleton-shimmer h-11 w-36 rounded-2xl"></div>
      <div class="skeleton-shimmer h-11 w-36 rounded-2xl"></div>
    </div>

  </div>

</div>

`;

return Array(count).fill(0).map(()=>skeletonCard()).join("");

}

function renderAdminUserSkeletons(count = 3){

const skeletonRow = () => `

<div class="
rounded-[28px]
border
border-gray-200
bg-white
p-6
shadow-[0_20px_60px_rgba(0,0,0,0.05)]
">

  <div class="
  flex
  flex-col
  lg:flex-row
  lg:items-center
  lg:justify-between
  gap-6
  ">

    <div class="flex-1">

      <div class="skeleton-shimmer h-6 w-48 rounded-md"></div>

      <div class="skeleton-shimmer h-3.5 w-56 rounded mt-2"></div>

      <div class="skeleton-shimmer h-3.5 w-24 rounded mt-1.5"></div>

      <div class="mt-3 flex gap-2 flex-wrap">
        <div class="skeleton-shimmer h-6 w-16 rounded-full"></div>
        <div class="skeleton-shimmer h-6 w-16 rounded-full"></div>
        <div class="skeleton-shimmer h-6 w-16 rounded-full"></div>
      </div>

      <div class="mt-5">
        <div class="skeleton-shimmer h-2.5 w-24 rounded mb-2"></div>
        <div class="skeleton-shimmer h-9 w-52 rounded-lg"></div>
      </div>

    </div>

    <div class="flex gap-3 flex-wrap">
      <div class="skeleton-shimmer h-11 w-32 rounded-2xl"></div>
      <div class="skeleton-shimmer h-11 w-28 rounded-2xl"></div>
    </div>

  </div>

</div>

`;

return Array(count).fill(0).map(()=>skeletonRow()).join("");

}

function renderAdminApprovalSkeletons(count = 3){

const skeletonRow = () => `

<div class="
rounded-[28px]
border
border-gray-200
bg-white
p-6
shadow-[0_20px_60px_rgba(0,0,0,0.05)]
">

  <div class="
  flex
  flex-col
  lg:flex-row
  lg:items-center
  lg:justify-between
  gap-6
  ">

    <div class="flex-1">

      <div class="skeleton-shimmer h-6 w-44 rounded-md"></div>

      <div class="skeleton-shimmer h-3.5 w-56 rounded mt-2"></div>

    </div>

    <div class="flex gap-3 flex-wrap">
      <div class="skeleton-shimmer h-11 w-28 rounded-2xl"></div>
      <div class="skeleton-shimmer h-11 w-28 rounded-2xl"></div>
    </div>

  </div>

</div>

`;

return Array(count).fill(0).map(()=>skeletonRow()).join("");

}

function renderAdminAppSkeletons(count = 3){

const skeletonCard = () => `

<div class="
rounded-[30px]
border
border-gray-200
bg-white
p-6
shadow-[0_20px_60px_rgba(0,0,0,0.05)]
">

  <div class="
  flex
  flex-col
  lg:flex-row
  lg:items-center
  lg:justify-between
  gap-6
  ">

    <div class="flex-1">

      <div class="skeleton-shimmer h-2.5 w-32 rounded mb-3"></div>

      <div class="skeleton-shimmer h-6 w-48 rounded-md"></div>

      <div class="mt-3 space-y-1.5">
        <div class="skeleton-shimmer h-3.5 w-52 rounded"></div>
        <div class="skeleton-shimmer h-3.5 w-40 rounded"></div>
        <div class="skeleton-shimmer h-3.5 w-44 rounded"></div>
      </div>

      <div class="mt-3">
        <div class="skeleton-shimmer h-6 w-36 rounded-full"></div>
      </div>

    </div>

    <div class="flex gap-3 flex-wrap">
      <div class="skeleton-shimmer h-11 w-28 rounded-2xl"></div>
      <div class="skeleton-shimmer h-11 w-28 rounded-2xl"></div>
    </div>

  </div>

</div>

`;

return Array(count).fill(0).map(()=>skeletonCard()).join("");

}

async function initAdmin(){

const { data:userData } =
await supabase.auth.getUser();

if(!userData.user){

navigate("/login");
return;

}

const user =
userData.user;

/* =========================
PROFILE
========================= */

const {
data:profile,
error:profileError
} =
await supabase
.from("profiles")
.select("*")
.eq("id", user.id)
.maybeSingle();

if(profileError){

console.error(profileError);

navigate("/");

return;

}

if(!profile){

navigate("/");

return;

}

/* =========================
BLOCK SUSPENDED USERS
========================= */

if(profile?.suspended){

await supabase.auth.signOut();

alert(
"Account suspended. Contact support."
);

navigate("/login");

return;

}

if(profile?.role !== "admin"){

navigate("/");
return;

}

/* =========================
LOAD EVERYTHING
========================= */

await Promise.all([
loadStats(),
loadVehicles(),
loadFinanceApps(),
loadUsers(),
loadPendingUsers(),
loadCatalogRequests(),
loadUserDirectory()
]);

/* =========================
VEHICLE SEARCH
========================= */

const search =
document.getElementById(
"adminSearch"
);

if(search){

search.addEventListener(
"input",
e=>{

loadVehicles(
e.target.value || ""
);

}
);

}

/* =========================
USER SEARCH
========================= */

const userSearch =
document.getElementById(
"adminUserSearch"
);

const userFilter =
document.getElementById(
"adminUserFilter"
);

if(userSearch){

userSearch.addEventListener(
"input",
()=>{

loadUsers(
userSearch.value || "",
userFilter?.value || "all"
);

}
);

}

if(userFilter){

userFilter.addEventListener(
"change",
()=>{

loadUsers(
userSearch?.value || "",
userFilter.value
);

}
);

}

/* =========================
USER DIRECTORY SEARCH
Client-side filter over the already-loaded
directory — no extra fetches per keystroke.
========================= */

const directorySearch =
document.getElementById(
"adminDirectorySearch"
);

if(directorySearch){

directorySearch.addEventListener(
"input",
()=>{
renderUserDirectory();
}
);

}

}

/* =========================
ADMIN SIDEBAR SHELL (visual/UX phase)
Same behaviour as the normal dashboard sidebar:
mobile drawer toggle, overlay, ESC close and
section navigation with active states. No admin
logic is changed — purely navigation feedback.
========================= */

window.toggleAdminSidebar = function(force){

const sidebar =
document.getElementById("dashboardSidebar");

const overlay =
document.getElementById("dashboardSidebarOverlay");

if(!sidebar || !overlay) return;

const isOpen =
sidebar.classList.contains("translate-x-0") &&
window.innerWidth < 1280;

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
window.__ADMIN_SIDEBAR_HIDE_TIMER__
);

window.__ADMIN_SIDEBAR_HIDE_TIMER__ =
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

async function hydrateAdminSidebarProfile(){

try{

const user =
await getAuthUser();

if(!user) return;

const profile =
await getUserProfile();

const nameEl =
document.getElementById(
"dashboardSidebarName"
);

const typeEl =
document.getElementById(
"dashboardSidebarType"
);

const avatarEl =
document.getElementById(
"dashboardSidebarAvatar"
);

if(!nameEl || !typeEl || !avatarEl) return;

const displayName =
profile?.dealership_name ||
[profile?.name, profile?.surname]
.filter(Boolean)
.join(" ") ||
"Administrator";

nameEl.textContent =
displayName;

typeEl.textContent =
profile?.role === "admin"
? "Admin Console"
: "Account";

const initials =
displayName
.split(" ")
.filter(Boolean)
.slice(0, 2)
.map(part=>part[0].toUpperCase())
.join("") || "HA";

avatarEl.textContent =
initials;

}catch(err){

/* Sidebar identity is decorative — never block the page */

console.warn(
"Admin sidebar profile hydration skipped",
err
);

}

}

function initAdminSidebar(){

hydrateAdminSidebarProfile();

const sidebar =
document.getElementById("dashboardSidebar");

const overlay =
document.getElementById("dashboardSidebarOverlay");

if(!sidebar || !overlay) return;

/* ESC closes the mobile drawer */

if(window.__ADMIN_SIDEBAR_KEY_HANDLER__){

document.removeEventListener(
"keydown",
window.__ADMIN_SIDEBAR_KEY_HANDLER__
);

}

window.__ADMIN_SIDEBAR_KEY_HANDLER__ =
function(ev){

if(
ev.key === "Escape" &&
sidebar.classList.contains("translate-x-0")
){

toggleAdminSidebar(false);

}

};

document.addEventListener(
"keydown",
window.__ADMIN_SIDEBAR_KEY_HANDLER__
);

/* Section navigation */

const navItems =
sidebar.querySelectorAll("[data-admin-target]");

navItems.forEach(item=>{

item.addEventListener("click", ()=>{

const targetId =
item.getAttribute("data-admin-target");

const target =
document.getElementById(targetId);

navItems.forEach(n=>
n.classList.remove("active")
);

item.classList.add("active");

if(window.innerWidth < 1280){

toggleAdminSidebar(false);

}

if(target){

setTimeout(()=>{

target.scrollIntoView({
behavior:"smooth",
block:"start"
});

}, window.innerWidth < 1280 ? 150 : 0);

}

});

});

/* Overlay click closes the drawer */

overlay.addEventListener("click", ()=>{
toggleAdminSidebar(false);
});

}

/* =========================
USER DIRECTORY (PHASE 2 — READ-ONLY)
Lists every registered Supabase Auth user
(existing + future signups) via the
admin_list_auth_users() SECURITY DEFINER RPC.
Strictly view + search + track: no create,
edit, delete, ban or impersonation actions.
========================= */

let adminDirectoryUsers = [];

function renderAdminDirectorySkeletons(count = 5){

let rows = "";

for(let i = 0; i < count; i++){

rows += `

<div class="admin-directory-row">

<div class="skeleton-shimmer h-3.5 w-24 rounded admin-directory-cell-uid"></div>

<div class="skeleton-shimmer h-3.5 w-32 rounded admin-directory-cell-name"></div>

<div class="skeleton-shimmer h-3.5 w-40 rounded admin-directory-cell-email"></div>

<div class="skeleton-shimmer h-5 w-16 rounded-full admin-directory-cell-provider"></div>

</div>

`;

}

return rows;

}

async function loadUserDirectory(){

const container =
document.getElementById("adminDirectory");

if(!container) return;

container.innerHTML =
renderAdminDirectorySkeletons(5);

const { data, error } =
await supabase
.rpc("admin_list_auth_users");

if(error){

console.error(error);

adminDirectoryUsers = [];

container.innerHTML = `

<div class="admin-directory-state admin-directory-error">

<div class="admin-directory-state-title">
Couldn't load the user directory
</div>

<p class="admin-directory-state-text">
Please make sure the
<code>admin_list_auth_users()</code>
migration has been applied, then try again.
</p>

<button
type="button"
onclick="loadUserDirectory()"
class="dashboard-primary-btn admin-btn mt-3"
>
Retry
</button>

</div>

`;

return;

}

adminDirectoryUsers =
data || [];

renderUserDirectory();

renderUserDirectoryCount();

}

function formatProviderLabel(provider){

if(!provider) return "Email";

return provider
.split(",")
.map(p=>p.trim())
.filter(Boolean)
.map(p=>
p.charAt(0).toUpperCase()
+ p.slice(1)
)
.join(", ");

}

function providerPillClass(provider){

const value =
(provider || "email").toLowerCase();

if(value.includes("google")) return "is-google";

if(value.includes("facebook")) return "is-facebook";

if(value.includes("github")) return "is-github";

if(value.includes("apple")) return "is-apple";

if(value.includes("azure") || value.includes("microsoft")) return "is-azure";

return "is-email";

}

function renderUserDirectoryCount(){

const countEl =
document.getElementById("adminDirectoryCount");

if(!countEl) return;

countEl.innerHTML = `

<span class="admin-directory-count-number">
${adminDirectoryUsers.length.toLocaleString()}
</span>

<span class="admin-directory-count-label">
registered
</span>

`;

}

function renderUserDirectory(){

const container =
document.getElementById("adminDirectory");

if(!container) return;

const term =
(
document.getElementById("adminDirectorySearch")
?.value || ""
)
.trim()
.toLowerCase();

const users =
!term
? adminDirectoryUsers
: adminDirectoryUsers.filter(user=>{

const uid =
(user.uid || "").toString().toLowerCase();

const name =
(user.display_name || "").toLowerCase();

const email =
(user.email || "").toLowerCase();

return (
uid.includes(term)
|| name.includes(term)
|| email.includes(term)
);

});

if(!adminDirectoryUsers.length){

container.innerHTML = `

<div class="admin-directory-state">

<div class="admin-directory-state-title">
No registered users yet
</div>

<p class="admin-directory-state-text">
New signups will appear here automatically.
</p>

</div>

`;

return;

}

if(!users.length){

container.innerHTML = `

<div class="admin-directory-state">

<div class="admin-directory-state-title">
No matches
</div>

<p class="admin-directory-state-text">
No users found for “${term.replace(/</g, "&lt;")}”.
</p>

</div>

`;

return;

}

const rows =
users.map(user=>{

const uid =
(user.uid || "").toString();

const provider =
formatProviderLabel(user.provider);

return `

<div class="admin-directory-row" title="${uid}">

<div
class="admin-directory-cell-uid"
data-label="UID"
>

<span class="admin-uid" title="${uid}">${uid}</span>

</div>

<div
class="admin-directory-cell-name"
data-label="Display Name"
>

<span class="admin-directory-name">
${(user.display_name || "—").replace(/</g, "&lt;")}
</span>

</div>

<div
class="admin-directory-cell-email"
data-label="Email"
>

<span class="admin-directory-email">
${(user.email || "—").replace(/</g, "&lt;")}
</span>

</div>

<div
class="admin-directory-cell-provider"
data-label="Provider"
>

<span
class="admin-provider-pill ${providerPillClass(user.provider)}"
>
${provider}
</span>

</div>

</div>

`;

})
.join("");

container.innerHTML = `

<div class="admin-directory-header">

<div class="admin-directory-cell-uid">UID</div>

<div class="admin-directory-cell-name">Display Name</div>

<div class="admin-directory-cell-email">Email</div>

<div class="admin-directory-cell-provider">Provider</div>

</div>

${rows}

`;

}

/* =========================
REFRESH
========================= */

window.refreshAdmin =
async function(){

await Promise.all([
loadStats(),
loadVehicles(),
loadFinanceApps(),
loadUsers(),
loadPendingUsers(),
loadCatalogRequests(),
loadUserDirectory()
]);

};

/* =========================
STATS
========================= */

async function loadStats(){

const [
vehiclesRes,
appsRes,
analyticsRes
] = await Promise.all([

supabase
.from("vehicles")
.select("*"),

supabase
.from("finance_applications")
.select("*"),

supabase
.from("vehicle_analytics")
.select("*")

]);

const vehicles =
vehiclesRes.data || [];

const apps =
appsRes.data || [];

const analytics =
analyticsRes.data || [];

const sponsored =
vehicles.filter(v=>
v.is_sponsored
).length;

const premiumDealers =
vehicles.filter(v=>
v.premium_dealer
).length;

const totalImpressions =
analytics.reduce(
(sum,a)=>
sum + (a.impressions || 0),
0
);

const totalViews =
analytics.reduce(
(sum,a)=>
sum + (a.views || 0),
0
);

const trendingVehicles =
analytics
.filter(a=>
(a.views || 0) >= 20
)
.length;

const hotVehicles =
analytics
.filter(a=>
(a.saves || 0) >= 10
)
.length;

const momentumScore =
analytics.reduce(
(sum,a)=>
sum +
(
(a.views || 0)
+
((a.saves || 0) * 3)
),
0
);

const ctr =
totalImpressions > 0
? (
(totalViews / totalImpressions)
* 100
).toFixed(1)
: "0.0";

const stats =
document.getElementById(
"adminStats"
);

if(!stats) return;

stats.innerHTML = `

<div class="dashboard-kpi-card">

<div class="dashboard-kpi-label">
Sponsored Vehicles
</div>

<div class="dashboard-kpi-number">
${sponsored}
</div>

<div class="dashboard-kpi-sub">
Premium homepage exposure inventory
</div>

</div>

<div class="dashboard-kpi-card">

<div class="dashboard-kpi-label">
Premium Dealers
</div>

<div class="dashboard-kpi-number">
${premiumDealers}
</div>

<div class="dashboard-kpi-sub">
Enterprise dealership accounts
</div>

</div>

<div class="dashboard-kpi-card">

<div class="dashboard-kpi-label">
Finance Applications
</div>

<div class="dashboard-kpi-number">
${apps.length}
</div>

<div class="dashboard-kpi-sub">
Marketplace approval pipeline
</div>

</div>

<div class="dashboard-kpi-card">

<div class="dashboard-kpi-label">
Marketplace Impressions
</div>

<div class="dashboard-kpi-number">
${totalImpressions.toLocaleString()}
</div>

<div class="dashboard-kpi-sub">
Live exposure analytics
</div>

</div>

<div class="dashboard-kpi-card">

<div class="dashboard-kpi-label">
Average CTR
</div>

<div class="dashboard-kpi-number">
${ctr}%
</div>

<div class="dashboard-kpi-sub">
Marketplace engagement rate
</div>

</div>

<div class="dashboard-kpi-card">

<div class="dashboard-kpi-label">
Trending Vehicles
</div>

<div class="dashboard-kpi-number">
${trendingVehicles}
</div>

<div class="dashboard-kpi-sub">
High visibility inventory
</div>

</div>

<div class="dashboard-kpi-card">

<div class="dashboard-kpi-label">
Hot Inventory
</div>

<div class="dashboard-kpi-number">
${hotVehicles}
</div>

<div class="dashboard-kpi-sub">
High save activity vehicles
</div>

</div>

<div class="dashboard-kpi-card">

<div class="dashboard-kpi-label">
Momentum Score
</div>

<div class="dashboard-kpi-number">
${momentumScore}
</div>

<div class="dashboard-kpi-sub">
Marketplace engagement acceleration
</div>

</div>

<div class="dashboard-kpi-card">

<div class="dashboard-kpi-label">
High Risk Finance
</div>

<div class="dashboard-kpi-number">
${
apps.filter(a=>
(a.credit_score || 0) < 550
).length
}
</div>

<div class="dashboard-kpi-sub">
Low credit approval risk
</div>

</div>

<div class="dashboard-kpi-card">

<div class="dashboard-kpi-label">
High Quality Leads
</div>

<div class="dashboard-kpi-number">
${
apps.filter(a=>
(a.credit_score || 0) >= 700
).length
}
</div>

<div class="dashboard-kpi-sub">
Premium finance applicants
</div>

</div>

`;

}

/* =========================
LOAD VEHICLES
========================= */

async function loadVehicles(search=""){

let query =
supabase
.from("vehicles")
.select("*")
.order("created_at",{
ascending:false
})
.limit(40);

if(search){

query =
query.or(`
make.ilike.%${search}%,
model.ilike.%${search}%
`);

}

const { data, error } =
await query;

if(error){

console.error(error);
return;

}

const { data:analyticsData } =
await supabase
.from("vehicle_analytics")
.select("*");

window.vehicleAnalyticsMap = {};

(analyticsData || [])
.forEach(a=>{

window.vehicleAnalyticsMap[
a.vehicle_id
] = a;

});

renderVehicles(
data || []
);

}

/* =========================
RENDER VEHICLES
========================= */

function renderVehicles(vehicles){

const container =
document.getElementById(
"adminVehicles"
);

if(!container) return;

if(!vehicles.length){

container.innerHTML = `

<div class="
rounded-3xl
border
border-gray-200
bg-white
p-10
text-center
text-gray-400
col-span-full
">
No vehicles found
</div>

`;

return;

}

container.innerHTML =
vehicles.map(v=>`

<div class="
rounded-[32px]
border
${v.is_sponsored
? 'border-[#C6A75D]/40'
: 'border-gray-200'}
bg-white
overflow-hidden
shadow-[0_20px_60px_rgba(0,0,0,0.06)]
">

<div class="
relative
aspect-[16/9]
overflow-hidden
bg-gray-100
">

<img
src="${
Array.isArray(v.images)
? (
v.images[0]
|| v.image
|| v.image_url
|| v.thumbnail
)
: (
v.images
|| v.image
|| v.image_url
|| v.thumbnail
)
|| 'https://placehold.co/1200x800?text=Vehicle'
}"
class="
w-full
h-full
object-cover
"
/>

${v.is_sponsored ? `
<div class="sponsored-strip">
SPONSORED
</div>
` : ""}

</div>

<div class="p-6">

${renderVehicleAnalytics(v)}

<div class="
flex
items-start
justify-between
gap-4
mb-5
">

<div>

<h3 class="
text-2xl
font-bold
tracking-tight
text-[#081120]
">
${v.make || ""}
${v.model || ""}
</h3>

<div class="
text-gray-500
mt-1
">
R ${Number(v.price || 0).toLocaleString()}
</div>

</div>

<div class="
flex
flex-wrap
gap-2
justify-end
">

${v.premium_dealer ? `
<div class="enterprise-pill">
Enterprise
</div>
` : ""}

${v.homepage_boost ? `
<div class="premium-pill">
Homepage Boost
</div>
` : ""}

</div>

</div>

<div class="
grid
grid-cols-2
gap-4
mb-6
">

<label class="
rounded-2xl
border
border-gray-200
p-4
flex
items-center
justify-between
gap-4
">

<span class="
font-medium
text-[#081120]
">
Sponsored
</span>

<input
type="checkbox"
${v.is_sponsored ? "checked" : ""}
onchange="
toggleVehicleFlag(
'${v.id}',
'is_sponsored',
this.checked
)
"
class="w-5 h-5"
/>

</label>

<label class="
rounded-2xl
border
border-gray-200
p-4
flex
items-center
justify-between
gap-4
">

<span class="
font-medium
text-[#081120]
">
Premium Dealer
</span>

<input
type="checkbox"
${v.premium_dealer ? "checked" : ""}
onchange="
toggleVehicleFlag(
'${v.id}',
'premium_dealer',
this.checked
)
"
class="w-5 h-5"
/>

</label>

<label class="
rounded-2xl
border
border-gray-200
p-4
flex
items-center
justify-between
gap-4
">

<span class="
font-medium
text-[#081120]
">
Homepage Boost
</span>

<input
type="checkbox"
${v.homepage_boost ? "checked" : ""}
onchange="
toggleVehicleFlag(
'${v.id}',
'homepage_boost',
this.checked
)
"
class="w-5 h-5"
/>

</label>

<div class="
rounded-2xl
border
border-gray-200
p-4
">

<div class="
text-xs
uppercase
tracking-[0.16em]
font-bold
text-gray-400
mb-2
">
Search Boost
</div>

<input
type="number"
value="${v.search_boost || 0}"
onchange="
updateVehicleNumber(
'${v.id}',
'search_boost',
this.value
)
"
class="input-light"
/>

</div>

</div>

<div class="
grid
grid-cols-2
gap-4
mb-5
">

<div class="
rounded-2xl
border
border-gray-200
p-4
">

<div class="
text-xs
uppercase
tracking-[0.16em]
font-bold
text-gray-400
mb-2
">
Dealer Priority
</div>

<input
type="number"
value="${v.dealer_priority || 0}"
onchange="
updateVehicleNumber(
'${v.id}',
'dealer_priority',
this.value
)
"
class="input-light"
/>

</div>

<div class="
rounded-2xl
border
border-gray-200
p-4
">

<div class="
text-xs
uppercase
tracking-[0.16em]
font-bold
text-gray-400
mb-2
">
Sponsor Tier
</div>

<select
onchange="
updateVehicleText(
'${v.id}',
'sponsor_tier',
this.value
)
"
class="input-light"
>

<option value="">
None
</option>

<option
value="gold"
${v.sponsor_tier==="gold" ? "selected" : ""}
>
Gold
</option>

<option
value="platinum"
${v.sponsor_tier==="platinum" ? "selected" : ""}
>
Platinum
</option>

</select>

</div>

</div>

<div class="
flex
gap-3
flex-wrap
">

<button
onclick="
toggleVehicleModeration(
'${v.id}',
${v.moderated || false}
)
"
class="
rounded-2xl
${
v.moderated
? 'bg-green-600 hover:bg-green-700'
: 'bg-red-600 hover:bg-red-700'
}
text-white
px-5
py-3
font-semibold
transition-all
duration-300
"
>
${
v.moderated
? 'Restore Listing'
: 'Remove Listing'
}
</button>

<button
onclick="
toggleVehicleFeatured(
'${v.id}',
${v.featured || false}
)
"
class="
rounded-2xl
${
v.featured
? 'bg-yellow-500 hover:bg-yellow-600'
: 'bg-[#081120] hover:bg-black'
}
text-white
px-5
py-3
font-semibold
transition-all
duration-300
"
>
${
v.featured
? 'Featured'
: 'Feature Listing'
}
</button>

</div>

</div>

</div>

`).join("");

}

/* =========================
VEHICLE ANALYTICS
========================= */

function renderVehicleAnalytics(vehicle){

const analytics =
window.vehicleAnalyticsMap?.[
vehicle.id
] || {};

const impressions =
analytics.impressions || 0;

const views =
analytics.views || 0;

const saves =
analytics.saves || 0;

const ctr =
impressions > 0
? (
(views / impressions)
* 100
).toFixed(1)
: "0.0";

const score =
(
(impressions * 0.1)
+ (views * 1)
+ (saves * 3)
).toFixed(0);

return `

<div class="
grid
grid-cols-2
sm:grid-cols-4
gap-3
mb-5
">

<div class="analytics-mini-card">

<div class="analytics-mini-label">
Impressions
</div>

<div class="analytics-mini-number">
${impressions}
</div>

</div>

<div class="analytics-mini-card">

<div class="analytics-mini-label">
Views
</div>

<div class="analytics-mini-number">
${views}
</div>

</div>

<div class="analytics-mini-card">

<div class="analytics-mini-label">
CTR
</div>

<div class="analytics-mini-number">
${ctr}%
</div>

</div>

<div class="analytics-mini-card">

<div class="analytics-mini-label">
Score
</div>

<div class="analytics-mini-number">
${score}
</div>

</div>

</div>

`;

}

/* =========================
TOGGLE BOOLEAN FLAGS
========================= */

window.toggleVehicleFlag =
async function(
vehicleId,
field,
value
){

const { error } =
await supabase
.from("vehicles")
.update({
[field]: value
})
.eq("id", vehicleId);

if(error){

console.error(error);
alert("Failed to update");

return;

}

await loadStats();
await loadVehicles();

};

/* =========================
UPDATE NUMBERS
========================= */

window.updateVehicleNumber =
async function(
vehicleId,
field,
value
){

const parsed =
Number(value || 0);

const { error } =
await supabase
.from("vehicles")
.update({
[field]: parsed
})
.eq("id", vehicleId);

if(error){

console.error(error);
alert("Failed to update");

return;

}

};

/* =========================
UPDATE TEXT
========================= */

window.updateVehicleText =
async function(
vehicleId,
field,
value
){

const { error } =
await supabase
.from("vehicles")
.update({
[field]: value
})
.eq("id", vehicleId);

if(error){

console.error(error);
alert("Failed to update");

return;

}

};

/* =========================
VEHICLE MODERATION
========================= */

window.toggleVehicleModeration =
async function(
vehicleId,
currentlyModerated
){

const confirmed =
confirm(
currentlyModerated
? "Restore this listing?"
: "Remove this listing?"
);

if(!confirmed) return;

const { error } =
await supabase
.from("vehicles")
.update({
moderated: !currentlyModerated,
removed_by_admin: !currentlyModerated
})
.eq("id", vehicleId);

if(error){

console.error(error);

alert(
"Failed to update listing"
);

return;

}

await Promise.all([
loadVehicles(),
loadStats()
]);

alert(
currentlyModerated
? "Listing restored"
: "Listing removed"
);

};

/* =========================
FEATURE VEHICLE
========================= */

window.toggleVehicleFeatured =
async function(
vehicleId,
currentlyFeatured
){

const { error } =
await supabase
.from("vehicles")
.update({
featured: !currentlyFeatured
})
.eq("id", vehicleId);

if(error){

console.error(error);

alert(
"Failed to update featured listing"
);

return;

}

await Promise.all([
loadVehicles(),
loadStats()
]);

};
/* =========================
FINANCE APPLICATIONS
========================= */


async function loadFinanceApps(){

const { data, error } =
await supabase
.from("finance_applications")
.select("*")
.order("created_at",{
ascending:false
})
.limit(20);

if(error){

console.error(error);
return;

}

renderFinanceApps(
data || []
);

}

/* =========================
RENDER FINANCE APPS
========================= */

function renderFinanceApps(apps){

const container =
document.getElementById(
"financeApps"
);

if(!container) return;

if(!apps.length){

container.innerHTML = `

<div class="
rounded-3xl
border
border-gray-200
bg-white
p-10
text-center
text-gray-400
">
No finance applications found
</div>

`;

return;

}

container.innerHTML =
apps.map(app=>`

<div class="
rounded-[30px]
border
border-gray-200
bg-white
p-6
shadow-[0_20px_60px_rgba(0,0,0,0.05)]
">

<div class="
flex
flex-col
lg:flex-row
lg:items-center
lg:justify-between
gap-6
">

<div>

<div class="
text-xs
uppercase
tracking-[0.16em]
font-bold
text-[#C6A75D]
mb-3
">
Finance Applicant
</div>

<h3 class="
text-2xl
font-bold
tracking-tight
text-[#081120]
">
${app.full_name || "Unknown"}
</h3>

<div class="
mt-3
space-y-1
text-gray-500
">

<div>
${app.email || ""}
</div>

<div>
${app.phone || ""}
</div>

<div>
Income:
R ${Number(app.monthly_income || 0).toLocaleString()}
</div>

<div>
Credit Score:
<b>${app.credit_score || "N/A"}</b>
</div>

<div class="mt-2">

<span class="
px-3
py-1
rounded-full
text-xs
font-bold
${
(app.credit_score || 0) >= 700
? 'bg-green-100 text-green-700'

: (app.credit_score || 0) >= 620
? 'bg-yellow-100 text-yellow-700'

: 'bg-red-100 text-red-700'
}
">

${
(app.credit_score || 0) >= 700
? 'Premium Applicant'

: (app.credit_score || 0) >= 620
? 'Moderate Risk'

: 'High Risk'
}

</span>

</div>

</div>

</div>

<div class="
flex
gap-3
flex-wrap
">

<button
onclick="
updateFinanceStatus(
'${app.id}',
'approved'
)
"
class="
rounded-2xl
bg-green-600
hover:bg-green-700
text-white
px-6
py-3
font-semibold
transition-all
duration-300
"
>
Approve
</button>

<button
onclick="
updateFinanceStatus(
'${app.id}',
'rejected'
)
"
class="
rounded-2xl
bg-red-600
hover:bg-red-700
text-white
px-6
py-3
font-semibold
transition-all
duration-300
"
>
Reject
</button>

</div>

</div>

</div>

`).join("");

}

/* =========================
UPDATE FINANCE STATUS
========================= */

window.updateFinanceStatus =
async function(
id,
status
){

const { error } =
await supabase
.from("finance_applications")
.update({
status
})
.eq("id", id);

if(error){

console.error(error);

alert(
"Failed to update application"
);

return;

}

await loadFinanceApps();

};
/* =========================
LOAD USERS
========================= */

async function loadUsers(
search="",
filter="all"
){

let query =
supabase
.from("profiles")
.select("*")
.order("created_at",{
ascending:false
});

const { data, error } =
await query;

if(error){

console.error(error);
return;

}

let users =
data || [];

/* =========================
SEARCH
========================= */

if(search){

const term =
search.toLowerCase();

users =
users.filter(user=>

(user.name || "")
.toLowerCase()
.includes(term)

||

(user.surname || "")
.toLowerCase()
.includes(term)

||

(user.email || "")
.toLowerCase()
.includes(term)

||

(user.dealership_name || "")
.toLowerCase()
.includes(term)

);

}

/* =========================
FILTERS
========================= */

if(filter === "active"){

users =
users.filter(
u=>!u.suspended
);

}

if(filter === "suspended"){

users =
users.filter(
u=>u.suspended
);

}

if(filter === "dealer"){

users =
users.filter(
u=>u.account_type === "dealer"
);

}

if(filter === "private_seller"){

users =
users.filter(
u=>u.account_type === "private_seller"
);

}

if(filter === "premium"){

users =
users.filter(u=>

[
"premium",
"admin"
].includes(
u.package_tier
)

);

}

renderUsers(users);

}

/* =========================
RENDER USERS
========================= */

function renderUsers(users){

const container =
document.getElementById(
"adminUsers"
);

if(!container) return;

if(!users.length){

container.innerHTML = `

<div class="
rounded-[32px]
border
border-dashed
border-gray-300
bg-white
p-14
text-center
">

<div class="
text-6xl
mb-5
opacity-50
">
👥
</div>

<h3 class="
text-2xl
font-bold
text-[#081120]
mb-3
">
No Users Found
</h3>

<p class="
text-gray-500
max-w-md
mx-auto
leading-relaxed
">
No users match the current filters or search criteria.
</p>

</div>

`;

return;

}

container.innerHTML =
users.map(user=>`

<div class="
rounded-[28px]
border
border-gray-200
bg-white
p-6
shadow-[0_20px_60px_rgba(0,0,0,0.05)]
">

<div class="
flex
flex-col
lg:flex-row
lg:items-center
lg:justify-between
gap-6
">

<div>

<h3 class="
text-2xl
font-bold
text-[#081120]
">
${user.name || "Unnamed"}
${user.surname || ""}
</h3>

<div class="text-gray-500 mt-2">
${user.email || ""}
</div>

<div class="text-gray-500">
${user.account_type || "user"}
</div>

<div class="mt-3 flex gap-2 flex-wrap">

<span class="
px-3
py-1
rounded-full
text-xs
font-bold
bg-[#3B82F6]/10
text-[#3B82F6]
">
${user.role || "user"}
</span>

<span class="
px-3
py-1
rounded-full
text-xs
font-bold
${
user.suspended
? 'bg-red-100 text-red-700'
: 'bg-green-100 text-green-700'
}
">
${
user.suspended
? 'Suspended'
: 'Active'
}
</span>

<span class="
px-3
py-1
rounded-full
text-xs
font-bold
bg-[#FEF3C7]
text-[#92400E]
">
${user.package_tier || "basic"}
</span>

${
user.verified_dealer
? `
<span class="
px-3
py-1
rounded-full
text-xs
font-bold
bg-[#3B82F6]/15
text-[#3B82F6]
">
Verified Dealer
</span>
`
: ""
}

</div>

<div class="mt-5">

<div class="
text-xs
uppercase
tracking-[0.14em]
font-bold
text-gray-400
mb-2
">
Package Tier
</div>

<select
onchange="
updatePackageTier(
'${user.id}',
this.value
)
"
class="
input-light
max-w-[220px]
"
>

<option
value="basic"
${user.package_tier==="basic"
? "selected"
: ""}
>
Basic
</option>

<option
value="tier1"
${user.package_tier==="tier1"
? "selected"
: ""}
>
Tier 1
</option>

<option
value="tier2"
${user.package_tier==="tier2"
? "selected"
: ""}
>
Tier 2
</option>

<option
value="premium"
${user.package_tier==="premium"
? "selected"
: ""}
>
Premium
</option>

<option
value="admin"
${user.package_tier==="admin"
? "selected"
: ""}
>
Admin
</option>

</select>

${user.account_type === "dealer" ? `
<div class="mt-5">

<div class="
text-xs
uppercase
tracking-[0.14em]
font-bold
text-gray-400
mb-2
">
Province
</div>

<div class="flex gap-3 flex-wrap items-center">
<select
id="adminProvince-${user.id}"
class="
input-light
max-w-[220px]
"
>
<option value="">Not set</option>
<option value="Eastern Cape"${user.province === "Eastern Cape" ? " selected" : ""}>Eastern Cape</option>
<option value="Free State"${user.province === "Free State" ? " selected" : ""}>Free State</option>
<option value="Gauteng"${user.province === "Gauteng" ? " selected" : ""}>Gauteng</option>
<option value="KwaZulu-Natal"${user.province === "KwaZulu-Natal" ? " selected" : ""}>KwaZulu-Natal</option>
<option value="Limpopo"${user.province === "Limpopo" ? " selected" : ""}>Limpopo</option>
<option value="Mpumalanga"${user.province === "Mpumalanga" ? " selected" : ""}>Mpumalanga</option>
<option value="North West"${user.province === "North West" ? " selected" : ""}>North West</option>
<option value="Northern Cape"${user.province === "Northern Cape" ? " selected" : ""}>Northern Cape</option>
<option value="Western Cape"${user.province === "Western Cape" ? " selected" : ""}>Western Cape</option>
</select>

<button
onclick="adminChangeDealershipProvince('${user.id}')"
class="
rounded-2xl
bg-[#081120]
hover:bg-black
text-white
px-5
py-3
font-semibold
"
>
Save Province
</button>
</div>

<div class="mt-1.5 text-[11px] text-slate-500">
${user.province ? `Current: ${user.province}` : "No province set"}
</div>

</div>
` : ""}

</div>

</div>

<div class="
flex
gap-3
flex-wrap
">

${
user.account_type === "dealer"
? `
<button
onclick="
toggleDealerVerification(
'${user.id}',
${user.verified_dealer || false}
)
"
class="
rounded-2xl
${
user.verified_dealer
? 'bg-[#005BBF] hover:bg-[#004FA8]'
: 'bg-[#081120] hover:bg-black'
}
text-white
px-5
py-3
font-semibold
"
>
${
user.verified_dealer
? 'Verified'
: 'Verify Dealer'
}
</button>
`
: ""
}

<button
onclick="
toggleSuspendUser(
'${user.id}',
${user.suspended}
)
"
class="
rounded-2xl
${
user.suspended
? 'bg-green-600 hover:bg-green-700'
: 'bg-yellow-500 hover:bg-yellow-600'
}
text-white
px-5
py-3
font-semibold
"
>
${
user.suspended
? 'Reactivate'
: 'Suspend'
}
</button>

</div>

</div>

</div>

`).join("");

}

/* =========================
LOAD PENDING USERS
========================= */

async function loadPendingUsers(){

const { data, error } =
await supabase
.from("profiles")
.select("*")
.eq("approval_status","pending")
.order("created_at",{
ascending:false
});

if(error){

console.error(error);
return;

}

renderPendingUsers(data || []);

}

/* =========================
RENDER PENDING USERS
========================= */

function renderPendingUsers(users){

const container =
document.getElementById(
"pendingApprovals"
);

if(!container) return;

if(!users.length){

container.innerHTML = `

<div class="
rounded-[32px]
border
border-dashed
border-gray-300
bg-white
p-14
text-center
">

<div class="
text-6xl
mb-5
opacity-50
">
✅
</div>

<h3 class="
text-2xl
font-bold
text-[#081120]
mb-3
">
No Pending Approvals
</h3>

<p class="
text-gray-500
max-w-md
mx-auto
leading-relaxed
">
All registrations and dealership approvals have been processed.
</p>

</div>

`;

return;

}

container.innerHTML =
users.map(user=>`

<div class="
rounded-[28px]
border
border-gray-200
bg-white
p-6
shadow-[0_20px_60px_rgba(0,0,0,0.05)]
">

<div class="
flex
flex-col
lg:flex-row
lg:items-center
lg:justify-between
gap-6
">

<div>

<h3 class="
text-2xl
font-bold
text-[#081120]
">
${user.name || "Unnamed"}
</h3>

<div class="text-gray-500 mt-2">
${user.email || ""}
</div>

</div>

<div class="
flex
gap-3
flex-wrap
">

<button
onclick="
approveUser(
'${user.id}'
)
"
class="
rounded-2xl
bg-green-600
hover:bg-green-700
text-white
px-5
py-3
font-semibold
"
>
Approve
</button>

<button
onclick="
rejectUser(
'${user.id}'
)
"
class="
rounded-2xl
bg-red-600
hover:bg-red-700
text-white
px-5
py-3
font-semibold
"
>
Reject
</button>

</div>

</div>

</div>

`).join("");

}

/* =========================
APPROVE USER
========================= */

window.approveUser =
async function(userId){

await supabase
.from("profiles")
.update({
approval_status:"approved",
approved_at:new Date().toISOString()
})
.eq("id", userId);

await loadUsers();
await loadPendingUsers();

};

/* =========================
REJECT USER
========================= */

window.rejectUser =
async function(userId){

await supabase
.from("profiles")
.update({
approval_status:"rejected"
})
.eq("id", userId);

await loadUsers();
await loadPendingUsers();

};

/* =========================
CATALOG REQUESTS
========================= */

async function loadCatalogRequests(){

const { data, error } =
await supabase
.from("vehicle_catalog_requests")
.select("*")
.eq("status","pending")
.order("created_at",{
ascending:false
});

if(error){

console.error(error);
return;

}

renderCatalogRequests(
data || []
);

}

function renderCatalogRequests(
requests
){

const container =
document.getElementById(
"catalogRequests"
);

if(!container) return;

if(!requests.length){

container.innerHTML = `

<div class="
rounded-[32px]
border
border-dashed
border-gray-300
bg-white
p-14
text-center
">

<h3 class="
text-2xl
font-bold
text-[#081120]
mb-3
">
No Catalogue Requests
</h3>

</div>

`;

return;

}

container.innerHTML =
requests.map(r=>`

<div class="
rounded-[28px]
border
border-gray-200
bg-white
p-6
">

<div class="
flex
flex-col
lg:flex-row
lg:items-center
lg:justify-between
gap-6
">

<div>

<h3 class="
text-2xl
font-bold
text-[#081120]
">
${r.make} ${r.model}
</h3>

<div class="text-gray-500 mt-2">
${r.variant}
</div>

</div>

<div class="
flex
gap-3
flex-wrap
">

<button
onclick="
approveCatalogRequest(
'${r.id}'
)
"
class="
rounded-2xl
bg-green-600
hover:bg-green-700
text-white
px-5
py-3
font-semibold
"
>
Approve
</button>

<button
onclick="
rejectCatalogRequest(
'${r.id}'
)
"
class="
rounded-2xl
bg-red-600
hover:bg-red-700
text-white
px-5
py-3
font-semibold
"
>
Reject
</button>

</div>

</div>

</div>

`).join("");

}

/* =========================
UPDATE PACKAGE
========================= */

window.updatePackageTier =
async function(
userId,
packageTier
){

const { error } =
await supabase
.from("profiles")
.update({
package_tier:packageTier
})
.eq("id", userId);

if(error){

console.error(error);

alert(
"Failed to update package"
);

return;

}

await loadUsers();

alert(
"Package updated successfully"
);

};


/* =========================
SUSPEND USER
========================= */

window.toggleSuspendUser =
async function(
userId,
currentlySuspended
){

/* =========================
GET CURRENT USER
========================= */

const {
data:userData
} = await supabase.auth.getUser();

const currentUserId =
userData?.user?.id;

/* =========================
PREVENT SELF SUSPEND
========================= */

if(userId === currentUserId){

alert(
"You cannot suspend your own admin account."
);

return;

}

/* =========================
GET TARGET PROFILE
========================= */

const {
data:targetProfile
} = await supabase
.from("profiles")
.select("*")
.eq("id", userId)
.single();

/* =========================
PREVENT ADMIN SUSPEND
========================= */

if(targetProfile?.role === "admin"){

alert(
"Admin accounts cannot be suspended."
);

return;

}

/* =========================
UPDATE PROFILE
========================= */

const { error } =
await supabase
.from("profiles")
.update({
suspended:!currentlySuspended,
suspended_at:!currentlySuspended
? new Date().toISOString()
: null
})
.eq("id", userId);

if(error){

console.error(error);

alert(
"Failed to update user"
);

return;

}

/* =========================
HIDE USER VEHICLES
========================= */

await supabase
.from("vehicles")
.update({
moderated: !currentlySuspended
})
.eq("user_id", userId);

await Promise.all([
loadUsers(),
loadStats(),
loadVehicles()
]);

alert(
currentlySuspended
? "User reactivated"
: "User suspended"
);

};

/* =========================
DEALER VERIFICATION
========================= */

window.approveCatalogRequest =
async function(id){

const {
data:request
} =
await supabase
.from("vehicle_catalog_requests")
.select("*")
.eq("id",id)
.single();

if(!request) return;

const {
data:existingVariant
} =
await supabase
.from("variants")
.select("id")
.eq("make",request.make)
.eq("model",request.model)
.eq("variant",request.variant)
.maybeSingle();

if(existingVariant){

await supabase
.from("vehicle_catalog_requests")
.update({
status:"approved"
})
.eq("id",id);

await loadCatalogRequests();

alert(
"Variant already exists."
);

return;

}

const variantPayload =
request.request_type === "new_model"
? {
    make: request.make,
    model: request.variant,
    variant: "Base"
  }
: {
    make: request.make,
    model: request.model,
    variant: request.variant
  };

const { error:variantError } =
await supabase
.from("variants")
.upsert([variantPayload]);

if(variantError){

console.error(
variantError
);

alert(
"Failed to add variant"
);

return;

}

await supabase
.from("vehicle_catalog_requests")
.update({
status:"approved"
})
.eq("id",id);

await loadCatalogRequests();

alert(
"Variant approved and added to catalogue."
);

};

window.rejectCatalogRequest =
async function(id){

await supabase
.from("vehicle_catalog_requests")
.update({
status:"rejected"
})
.eq("id",id);

await loadCatalogRequests();

};

window.toggleDealerVerification =
async function(
userId,
currentlyVerified
){

const { error } =
await supabase
.from("profiles")
.update({
verified_dealer: !currentlyVerified
})
.eq("id", userId);

if(error){

console.error(error);

alert(
"Failed to update dealer verification"
);

return;

}

await loadUsers();

alert(
currentlyVerified
? "Dealer verification removed"
: "Dealer verified successfully"
);

};

/* =========================
ADMIN CHANGE DEALERSHIP PROVINCE
========================= */

window.adminChangeDealershipProvince =
async function(
userId
){

/* Get the selected province from the dropdown. */
const select =
document.getElementById(
`adminProvince-${userId}`
);

if(!select){

console.error(
"[ADMIN] Province dropdown not found for user:",
userId
);

alert(
"Could not find province control."
);

return;

}

const newProvince =
select.value || null;

/* Call the security-definer RPC — it enforces:
   - caller must be admin
   - target must be a dealer
   - province must be valid (or NULL)
   This is the ONLY mechanism that may change another
   user's province. */
const { error } =
await supabase
.rpc(
"admin_change_dealership_province",
{
target_profile_id: userId,
new_province: newProvince
}
);

if(error){

console.error(
"[ADMIN] Province change failed:",
{
userId,
newProvince,
message:
error.message
||
String(error)
}
);

alert(
"Failed to update province. Only administrators can change dealership province."
);

return;

}

/* Refresh the dealer list so the new province displays. */
await loadUsers();

alert(
newProvince
? `Province updated to ${newProvince}.`
: "Province cleared.";

);

};

/* =========================
CREATE USER MODAL
========================= */

window.openCreateUserModal =
function(){

const modal =
document.getElementById(
"createUserModal"
);

if(modal){

modal.classList.remove("hidden");
modal.classList.add("flex");

}

};

window.closeCreateUserModal =
function(){

const modal =
document.getElementById(
"createUserModal"
);

if(modal){

modal.classList.add("hidden");
modal.classList.remove("flex");

}

};

/* =========================
CREATE PROFILE USER
========================= */

window.createProfileUser =
async function(){

const name =
document.getElementById(
"newUserName"
)?.value?.trim();

const surname =
document.getElementById(
"newUserSurname"
)?.value?.trim();

const email =
document.getElementById(
"newUserEmail"
)?.value?.trim();

const phone =
document.getElementById(
"newUserPhone"
)?.value?.trim();

const dealership =
document.getElementById(
"newDealership"
)?.value?.trim();

const accountType =
document.getElementById(
"newAccountType"
)?.value;

const packageTier =
document.getElementById(
"newPackageTier"
)?.value;

/* =========================
VALIDATION
========================= */

if(!name || !email){

alert(
"Name and email are required."
);

return;

}

/* =========================
CHECK EXISTING USER
========================= */

const {
data:existingUser
} =
await supabase
.from("profiles")
.select("id")
.eq("email", email)
.maybeSingle();

if(existingUser){

alert(
"User already exists."
);

return;

}

/* =========================
CREATE PROFILE
========================= */

const { error } =
await supabase
.from("profiles")
.insert({

name,
surname,
email,
phone,
dealership_name:dealership,
account_type:accountType,
package_tier:packageTier,
approval_status:"approved",
role:"user",
suspended:false,
verified_dealer:false

});

if(error){

console.error(error);

alert(
"Failed to create user"
);

return;

}

alert(
"User profile created successfully"
);

closeCreateUserModal();

await Promise.all([
loadUsers(),
loadStats()
]);

};

