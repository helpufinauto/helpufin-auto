import { navigate, prefetchDashboard } from "../js/router.js";

import {
  supabase,
  getUserProfile,
  getAuthUser,
  clearAuthCache,
  getInboxConversations
} from "../js/api.js";

import { showAuthLoading, hideAuthLoading } from "./authLoading.js";

let notifications = [];
let unread = 0;

export function Navbar() {

requestAnimationFrame(() => {
if(
window.__NAV_INITIALIZED__
){
return;
}

window.__NAV_INITIALIZED__ = false;

initNav();

});
return `

<header class="
bg-white/95
backdrop-blur-md
sticky
top-0
z-50
supports-[backdrop-filter]:bg-white/80
">

<div class="
max-w-[1120px]
mx-auto
px-4
sm:px-6
md:px-7
py-1
flex
items-center
justify-between
contain-layout
transform-gpu
">

<!-- LEFT -->
<div
class="
flex
items-center
gap-2
sm:gap-3
cursor-pointer
shrink-0
"
onclick="goHome()">

<img
src="/assets/logo1.webp"
alt="Helpufin Auto"
width="1080"
height="360"
loading="eager"
fetchpriority="high"
decoding="async"
draggable="false"
class="h-11 sm:h-12 lg:h-[52px] w-auto object-contain shrink-0 select-none will-change-transform">

</div>

<!-- RIGHT -->
<div class="hidden min-[1024px]:flex items-center gap-5 lg:gap-6">

<nav class="flex items-center gap-4 lg:gap-5">

<!-- BROWSE -->
<div class="nav-item group relative">

<a href="/browse" data-link class="nav-link-animated flex items-center gap-1 text-[#0A192F] text-[12px] font-medium uppercase tracking-[0.05em] hover:text-accent transition-colors duration-200">

Browse
<span class="material-symbols-outlined dropdown-arrow text-lg">expand_more</span>


<div class="dropdown">

<a href="/browse" data-link class="dropdown-item">
All Vehicles
</a>

<a href="/browse?condition=new" data-link class="dropdown-item">
New Vehicles
</a>

<a href="/browse?condition=pre-owned" data-link class="dropdown-item">
Pre-Owned Vehicles
</a>

<a href="/browse?featured=true" data-link class="dropdown-item">
Featured
</a>

</div>

</div>

<!-- SELL -->
<div class="nav-item group relative">

<a href="/sell" data-link
class="nav-link-animated flex items-center gap-1 text-[#0A192F] text-[12px] font-medium uppercase tracking-[0.05em] hover:text-accent transition-colors">

Sell
<span class="material-symbols-outlined dropdown-arrow text-lg">expand_more</span>

</a>

<div class="dropdown">

<a href="/sell/dealer" data-link class="dropdown-item">
Dealership
</a>

<a href="/sell/private" data-link class="dropdown-item">
Private
</a>

</div>

</div>

<a href="/saved" data-link class="nav-link-animated text-[#0A192F] text-[12px] font-medium uppercase tracking-[0.05em] hover:text-accent transition">
Saved
</a>

<a
href="/compare"
data-link
class="
nav-link-animated
text-[#0A192F]
text-[12px]
font-medium
uppercase
tracking-[0.05em]
hover:text-accent
transition
"
>

Compare

</a>

<a
href="/helpufin"
data-link
class="
nav-link-animated
text-[#0A192F]
text-[12px]
font-medium
uppercase
tracking-[0.05em]
hover:text-accent
transition
"
>
Helpufin
</a>

<!-- CONNECT -->
<div class="nav-item group relative">

<a href="/contact" data-link
class="nav-link-animated flex items-center gap-1 text-[#0A192F] text-[12px] font-medium uppercase tracking-[0.05em] hover:text-accent transition-colors">

Connect
<span class="material-symbols-outlined dropdown-arrow text-lg">expand_more</span>

</a>

<div class="dropdown">

<!-- PHASE 4 — required order: Dealerships first, Contact second. -->
<a href="/dealerships" data-link class="dropdown-item">
Dealerships
</a>

<a href="/contact" data-link class="dropdown-item">
Contact
</a>

</div>

</div>

</nav>

<!-- ACTIONS -->
<div
id="navActions"
class="flex items-center gap-2 ml-3 pl-3 border-l border-gray-200"
>

<a
id="signupBtn"
href="/signup"
data-link
class="
btn
btn-gold
btn-sm
relative
flex
items-center
gap-2
">

<span id="dashboardBtnText">
Sign Up
</span>

<div
id="dashboardNotifBadge"
class="
hidden
absolute
-top-2
-right-2
min-w-[22px]
h-[22px]
px-1
rounded-full
bg-red-500
text-white
text-[11px]
font-bold
flex
items-center
justify-center
">
0
</div>

</a>

<a
id="loginBtn"
href="/login"
data-link
class="btn btn-gold btn-sm">
Login
</a>

<button
id="logoutBtn"
class="btn btn-gold btn-sm hidden">

<span
style="
color:#08111F;
font-weight:700;
opacity:1;
visibility:visible;
"
>
Logout
</span>

</button>

</div>
</div>

<!-- MOBILE BUTTON -->
<button
id="hamburger"
aria-label="Open Navigation Menu"
aria-expanded="false"
class="
mobile-hamburger
hidden
lg:hidden
items-center
justify-center
text-[#0A192F]
w-11
h-11
rounded-xl
border
border-black/5
hover:bg-black/5
transition
touch-manipulation
"
style="
display:none;
"
>

<span class="material-symbols-outlined text-3xl">
menu
</span>

</button>

</div>

</header>



<!-- MOBILE MENU -->
<div
id="mobileOverlay"
class="mobile-nav-overlay"
aria-hidden="true">
</div>

<div
id="mobile-menu"
class="mobile-menu min-[1024px]:hidden"
role="dialog"
aria-modal="true"
aria-label="Mobile Navigation"
>

<!-- DRAWER HEADER -->
<div class="mobile-menu-header">

<div class="mobile-menu-brand" onclick="goHome()" role="link" aria-label="Go to Home">

<img
src="/assets/logo1.webp"
alt="Helpufin Auto"
width="1080"
height="360"
loading="eager"
decoding="async"
draggable="false"
class="select-none">

</div>

<button
id="mobileMenuClose"
class="mobile-menu-close"
aria-label="Close Navigation Menu">

<span class="material-symbols-outlined">
close
</span>

</button>

</div>

<!-- NAVIGATION -->
<nav class="mobile-menu-nav" aria-label="Mobile Navigation Links">

<a href="/" data-link class="mobile-nav-link">
<span class="material-symbols-outlined">home</span>
Home
</a>

<div class="mobile-nav-group">

<button
type="button"
class="mobile-nav-toggle"
data-mobile-toggle
data-nav-root="browse"
aria-expanded="false">

<span class="material-symbols-outlined">directions_car</span>
Browse

<span class="material-symbols-outlined mobile-chevron">
expand_more
</span>

</button>

<div class="mobile-nav-sub">

<a href="/browse" data-link>
All Vehicles
</a>

<a href="/browse?condition=new" data-link>
New Vehicles
</a>

<a href="/browse?condition=pre-owned" data-link>
Pre-Owned Vehicles
</a>

<a href="/browse?featured=true" data-link>
Featured
</a>

</div>

</div>

<div class="mobile-nav-group">

<button
type="button"
class="mobile-nav-toggle"
data-mobile-toggle
data-nav-root="sell"
aria-expanded="false">

<span class="material-symbols-outlined">sell</span>
Sell

<span class="material-symbols-outlined mobile-chevron">
expand_more
</span>

</button>

<div class="mobile-nav-sub">

<a href="/sell/dealer" data-link>
Dealership
</a>

<a href="/sell/private" data-link>
Private
</a>

</div>

</div>

<a href="/saved" data-link class="mobile-nav-link">
<span class="material-symbols-outlined">bookmark</span>
Saved
</a>

<a href="/compare" data-link class="mobile-nav-link">
<span class="material-symbols-outlined">compare_arrows</span>
Compare
</a>

<a href="/helpufin" data-link class="mobile-nav-link">
<span class="material-symbols-outlined">support_agent</span>
Helpufin
</a>

<div class="mobile-nav-group">

<button
type="button"
class="mobile-nav-toggle"
data-mobile-toggle
data-nav-root="connect"
aria-expanded="false">

<!-- PHASE 4 — "forum" was added to the frozen Material
     Symbols subset in index.html, so this leading icon now
     renders graphically (previously the unsupported ligature
     fell back to raw text "fORUM"). Matches the other mobile
     nav rows: [icon] label [chevron]. -->
<span class="material-symbols-outlined">forum</span>
Connect

<span class="material-symbols-outlined mobile-chevron">
expand_more
</span>

</button>

<div class="mobile-nav-sub">

<!-- PHASE 4 — required order: Dealerships first, Contact
     second (applies to mobile AND desktop Connect). -->
<a href="/dealerships" data-link>
Dealerships
</a>

<a href="/contact" data-link>
Contact
</a>

</div>

</div>

</nav>

<!-- AUTH -->
<div class="mobile-menu-auth">

<a
id="mobileSignupBtn"
href="/signup"
data-link
class="btn btn-gold">
Sign Up
</a>

<a
id="mobileLoginBtn"
href="/login"
data-link
class="btn btn-dark">
Login
</a>

<button
id="mobileDashBtn"
class="btn btn-dark hidden">
Dashboard
</button>

<button
id="mobileLogoutBtn"
class="btn btn-clean hidden">
Logout
</button>

</div>

</div>

`;

}


async function initNav(){

document.querySelectorAll("[data-link]").forEach(link => {

if(link.dataset.bound === "true"){
return;
}

link.dataset.bound = "true";

link.addEventListener("click", e => {

e.preventDefault();

const href =
link.getAttribute("href");

if(!href){
return;
}

requestAnimationFrame(()=>{
navigate(href);
});

},
{ passive:false });

});

const dash = document.getElementById("dashBtn");

if(dash){
dash.onclick = goDashboard;
}

const hamburger =
document.getElementById(
"hamburger"
);

const mobileMenu =
document.getElementById(
"mobile-menu"
);

/* =====================================
DESKTOP/MOBILE VISIBILITY FIX
===================================== */

if(hamburger){

if(window.innerWidth < 1024){

hamburger.style.display =
"flex";

}else{

hamburger.style.display =
"none";

}

if(!window.__NAV_RESIZE_BOUND__){

window.__NAV_RESIZE_BOUND__ = true;

let resizeTimer;

window.addEventListener(
"resize",
()=>{

clearTimeout(
resizeTimer
);

resizeTimer =
setTimeout(()=>{

if(!hamburger){
return;
}

if(window.innerWidth < 1024){

hamburger.style.display =
"flex";

}else{

hamburger.style.display =
"none";

}

},100);

});

}

}

if(hamburger && mobileMenu){

const overlay =
document.getElementById(
"mobileOverlay"
);

const closeMenu = ()=>{

mobileMenu.classList.remove(
"open"
);

overlay?.classList.remove(
"active"
);

hamburger?.setAttribute(
"aria-expanded",
"false"
);

document.body.classList.remove(
"mobile-menu-open"
);

document.body.style.overflow = "";
document.body.style.touchAction = "";

};

window.__closeMobileMenu =
closeMenu;

const openMenu = ()=>{

mobileMenu.classList.add(
"open"
);

overlay?.classList.add(
"active"
);

hamburger?.setAttribute(
"aria-expanded",
"true"
);

document.body.classList.add(
"mobile-menu-open"
);

document.body.style.overflow =
"hidden";

document.body.style.touchAction =
"none";

};

hamburger.onclick = ()=>{

const isOpen =
mobileMenu.classList.contains(
"open"
);

if(isOpen){
closeMenu();
}else{
openMenu();
}

};

const mobileMenuClose =
document.getElementById(
"mobileMenuClose"
);

if(mobileMenuClose){

mobileMenuClose.onclick =
closeMenu;

}

/* =========================================
MOBILE ACCORDION (PHASE 3 FIX — CONNECT)
=========================================
Previously each [data-mobile-toggle] button
was bound individually inside initNav(). That
worked for Browse/Sell but left Connect dead
whenever the drawer DOM was re-created between
init passes (auth refresh / re-render), because
the fresh buttons missed their per-element
listener. The accordion is now ONE delegated
listener on document, scoped with closest() to
the drawer — it survives every navbar
re-render, applies the IDENTICAL mechanism to
Browse, Sell AND Connect, and cannot be
double-bound. Class names, the .open accordion
CSS and the aria-expanded contract are
unchanged.
========================================= */

if(!window.__MOBILE_ACCORDION_DELEGATED__){

window.__MOBILE_ACCORDION_DELEGATED__ = true;

document.addEventListener(
"click",
(e)=>{

const toggle =
e.target instanceof Element
? e.target.closest(
"#mobile-menu [data-mobile-toggle]"
)
: null;

if(!toggle){
return;
}

const group =
toggle.closest(
".mobile-nav-group"
);

if(!group){
return;
}

const isOpen =
group.classList.toggle(
"open"
);

toggle.setAttribute(
"aria-expanded",
isOpen
? "true"
: "false"
);

},
{ passive:true }
);

}


if(!window.__MOBILE_OVERLAY__){

window.__MOBILE_OVERLAY__ = true;

overlay?.addEventListener(
"click",
closeMenu,
{ passive:true }
);

}

if(!window.__ESCAPE_LISTENER__){

window.__ESCAPE_LISTENER__ = true;

document.addEventListener(
"keydown",
(e)=>{

if(e.key === "Escape"){
closeMenu();
}

});

}

if(!window.__MOBILE_LINKS_BOUND__){

window.__MOBILE_LINKS_BOUND__ = true;

document.querySelectorAll(
"#mobile-menu [data-link]"
).forEach(link=>{

link.addEventListener(
"click",
closeMenu,
{ passive:true }
);

});

}

}

/* =========================================
AUTH-DEPENDENT NAVBAR STATE (BACKGROUND)
Runs WITHOUT blocking the mobile menu.
Login/Signup/Dashboard/Logout buttons and the
notification badge update as soon as the cached
auth check completes â€” the hamburger, drawer and
all menu interactions are already live above.
========================================= */

Promise.all([

initAuthButtons(),
initDashboardBadge()

]).catch((err)=>{

/* PHASE 4 — event-level log only; the auth
   error object is never dumped to the console. */
console.warn(
"Navbar auth refresh failed"
);

});

// ðŸ”¥ ACTIVE ROUTE DETECTION
updateNavHighlight();

/* =========================================
ROUTE HOOK â€” SYNC ACTIVE PAGE AND CLOSE
THE MOBILE DRAWER ON NAVIGATION
========================================= */

if(!window.__NAV_ROUTE_HOOK_BOUND__){

window.__NAV_ROUTE_HOOK_BOUND__ = true;

const originalPush = history.pushState;

const originalReplace = history.replaceState;

history.pushState = function(...args){

originalPush.apply(this, args);

requestAnimationFrame(()=>{

updateNavHighlight();

if(
typeof window.__closeMobileMenu === "function"
){
window.__closeMobileMenu();
}

});

};

history.replaceState = function(...args){

originalReplace.apply(this, args);

requestAnimationFrame(()=>{

updateNavHighlight();

if(
typeof window.__closeMobileMenu === "function"
){
window.__closeMobileMenu();
}

});

};

window.addEventListener(
"popstate",
()=>{

requestAnimationFrame(updateNavHighlight);

},
{ passive:true }
);

}

}

/* =========================================
MOBILE DRAWER ACTIVE PAGE
========================================= */

function clearNavHighlights(){

document.querySelectorAll(
"[data-link].nav-link-active"
).forEach(link=>{

link.classList.remove(
"nav-link-active"
);

link.removeAttribute(
"aria-current"
);

});

document.querySelectorAll(
"#mobile-menu [data-nav-root]"
).forEach(root=>{

root.removeAttribute(
"data-active"
);

});

}

function updateNavHighlight(){

const currentPath =
window.location.pathname;

clearNavHighlights();

document.querySelectorAll(
"[data-link]"
).forEach(link=>{

const href =
link.getAttribute("href");

if(!href){
return;
}

/* Skip query links â€” the main link carries active state */
if(href.indexOf("?") !== -1){
return;
}

const hrefPath =
href.split("?")[0];

let isActive =
hrefPath === currentPath;

/* Dashboard prefix */
if(
!isActive &&
hrefPath === "/dashboard" &&
currentPath.indexOf("/dashboard") === 0
){
isActive = true;
}

/* Sell children */
if(
!isActive &&
hrefPath === "/sell" &&
(
currentPath === "/sell/private" ||
currentPath === "/sell/dealer"
)
){
isActive = true;
}

/* PHASE 1 — Connect children. The CONNECT
parent points at /contact while the
dealership directory lives at /dealerships
and (PHASE 2) each storefront page lives at
/dealership. Same parent-highlight pattern
as Sell. */
if(
!isActive &&
hrefPath === "/contact" &&
(
currentPath === "/dealerships" ||
currentPath === "/dealership"
)
){
isActive = true;
}

if(!isActive){
return;
}

link.classList.add(
"nav-link-active"
);

link.setAttribute(
"aria-current",
"page"
);

});

/* MOBILE ROOT GROUPS */
const mobileRoots = [
{
name:"browse",
match: currentPath === "/browse"
},
{
name:"sell",
match:
currentPath === "/sell" ||
currentPath === "/sell/private" ||
currentPath === "/sell/dealer"
},
{
/* PHASE 1 — Connect group (Contact +
Dealerships). PHASE 2 — the storefront
/dealership also belongs to Connect. */
name:"connect",
match:
currentPath === "/contact" ||
currentPath === "/dealerships" ||
currentPath === "/dealership"
}
];

mobileRoots.forEach(root=>{

const el =
document.querySelector(
`#mobile-menu [data-nav-root="${root.name}"]`
);

if(!el){
return;
}

if(!root.match){
return;
}

el.setAttribute(
"data-active",
"true"
);

const group =
el.closest(
".mobile-nav-group"
);

if(!group){
return;
}

if(
!group.classList.contains(
"open"
)
){

group.classList.add(
"open"
);

el.setAttribute(
"aria-expanded",
"true"
);

}

});

}



/* ===================== */

async function loadNotifications(){

const { data:userData } = await supabase.auth.getUser();
if(!userData.user) return;

const { data } =
await supabase
.from("notifications")
.select("*")
.eq("user_id", userData.user.id)
.order("created_at",{ascending:false})
.limit(5);

notifications = data || [];

unread = notifications.filter(n=>!n.is_read).length;

renderNotifications();

}



/* ===================== */

function renderNotifications(){

const countBox = document.getElementById("notifCount");
if(countBox){
countBox.innerText = unread ? `(${unread})` : "";
}

const box = document.getElementById("notifDropdown");
if(!box) return;

box.innerHTML = "";

if(!notifications.length){
box.innerHTML = "<p>No notifications</p>";
return;
}

notifications.forEach(n=>{

box.innerHTML += `
<div class="border-b py-2 cursor-pointer"
onclick="markRead('${n.id}')">
<b>${n.title}</b>
<p class="text-sm text-gray-500">${n.message}</p>
</div>
`;

});

}



/* ===================== */

function toggleNotifications(){

const box = document.getElementById("notifDropdown");

box.classList.toggle("hidden");

}



/* ===================== */

window.markRead = async function(id){

await supabase
.from("notifications")
.update({ is_read: true })
.eq("id", id);

loadNotifications();

};



async function goDashboard(){

/* PHASE 2 â€” FASTER DASHBOARD OPEN
   Previously this ran strictly sequentially:
     auth check â†’ profile fetch â†’ navigate â†’
     (router starts downloading the very large
     dashboard module only after both roundtrips)
   which was the main perceived delay on mobile.
   Now the profile fetch and the dashboard module
   download/parse run in PARALLEL with the auth
   check; routing behaviour is unchanged. The
   profile/module cache reuses the EXISTING
   js/api.js helpers â€” no new data sources. */

const profilePromise =
getUserProfile();

/* Warm the dashboard module in parallel â€” the
   router's later import() of the same URL
   resolves instantly from the browser's module
   cache. Fire-and-forget. */

import("../pages/dashboard.js").catch(()=>{});

const user =
await getAuthUser();

if(!user){

navigate("/login");
return;

}

const profile =
await profilePromise;

/* =========================================
ROLE-AWARE DASHBOARD ROUTING
=========================================
Admins are routed to the Admin Dashboard,
never the dealer/private dashboard. Role
comes from the existing profiles.role
lookup (js/api.js getUserProfile). */

if(profile?.role === "admin"){

navigate("/admin");

return;

}

if(profile?.account_type === "dealer"){

navigate("/dashboard/dealer");

}else{

navigate("/dashboard/private");

}

}

window.goHome = () => navigate("/");

if(!window.__AUTH_LISTENER__){

window.__AUTH_LISTENER__ = true;

window.addEventListener(
"authChanged",
async ()=>{

if(window.__AUTH_REFRESHING__){
return;
}

window.__AUTH_REFRESHING__ = true;

try{

await initAuthButtons();
await initDashboardBadge();

}finally{

window.__AUTH_REFRESHING__ = false;

}

}
);

}

/* =========================================
MOBILE DRAWER AUTH SYNC
========================================= */

/* Re-run auth button state after the navbar
   is re-rendered (e.g. on "authChanged") so
   #mobileDashBtn / Login / Logout visibility
   stays correct. */
export async function refreshNavAuth(){
  await initAuthButtons();
}

function hideMobileAuthBtn(btn){

if(!btn) return;

btn.classList.add(
"hidden"
);

btn.style.display =
"none";

btn.style.visibility =
"hidden";

btn.style.opacity =
"0";

}

function showMobileAuthBtn(btn){

if(!btn) return;

btn.classList.remove(
"hidden"
);

btn.style.removeProperty(
"display"
);

btn.style.display =
"inline-flex";

btn.style.visibility =
"visible";

btn.style.opacity =
"1";

}

function syncMobileAuthButtons(user){

const mobileSignupBtn =
document.getElementById(
"mobileSignupBtn"
);

const mobileLoginBtn =
document.getElementById(
"mobileLoginBtn"
);

const mobileDashBtn =
document.getElementById(
"mobileDashBtn"
);

const mobileLogoutBtn =
document.getElementById(
"mobileLogoutBtn"
);

if(user){

hideMobileAuthBtn(mobileSignupBtn);
hideMobileAuthBtn(mobileLoginBtn);
showMobileAuthBtn(mobileDashBtn);
showMobileAuthBtn(mobileLogoutBtn);

}else{

showMobileAuthBtn(mobileSignupBtn);
showMobileAuthBtn(mobileLoginBtn);
hideMobileAuthBtn(mobileDashBtn);
hideMobileAuthBtn(mobileLogoutBtn);

}

}

async function initAuthButtons(){

const user =
await getAuthUser();

syncMobileAuthButtons(user);

const signupBtn =
document.getElementById("signupBtn");

const loginBtn =
document.getElementById("loginBtn");

const logoutBtn =
document.getElementById("logoutBtn");

if(logoutBtn){

const mobileLogoutBtn =
document.getElementById(
"mobileLogoutBtn"
);

/* Duplicate-action guard. One logout at a
   time. Shared by both desktop and mobile
   logout buttons (declared here so both
   onclick handlers are in scope). */

let logoutInProgress = false;

if(mobileLogoutBtn){

mobileLogoutBtn.onclick = async ()=>{

if(logoutInProgress){
return;
}

logoutInProgress = true;

showAuthLoading("Signing you out...");

try{

await supabase.auth.signOut();

clearAuthCache();

window.__DASHBOARD_BOOTING__ =
false;

localStorage.removeItem(
"compareVehicles"
);

window.__NAV_INITIALIZED__ =
false;

window.__NAV_READY__ =
false;

window.dispatchEvent(
new CustomEvent("authChanged")
);

await navigate("/");

hideAuthLoading();

logoutInProgress = false;

return;

}catch(err){

/* PHASE 4 — event-level log only. */
console.error(
"Mobile logout failed"
);

hideAuthLoading();

logoutInProgress = false;

alert(
"Failed to logout"
);

}

};

}

logoutBtn.onclick = async ()=>{

if(logoutInProgress){
return;
}

logoutInProgress = true;

showAuthLoading("Signing you out...");

try{

/* =====================================
SIGN OUT
===================================== */

await supabase.auth.signOut();

/* =====================================
CLEAR CACHE
===================================== */

clearAuthCache();

/* =====================================
REMOVE REALTIME CHANNELS
===================================== */

if(window.dashboardBadgeChannel){

await supabase.removeChannel(
window.dashboardBadgeChannel
);

window.dashboardBadgeChannel =
null;

}

if(window.messagesBadgeChannel){

await supabase.removeChannel(
window.messagesBadgeChannel
);

window.messagesBadgeChannel =
null;

}
if(window.dashboardRealtime){

await supabase.removeChannel(
window.dashboardRealtime
);

window.dashboardRealtime = null;

}

window.__DASHBOARD_BOOTING__ =
false;

/* =====================================
CLEAR LOCAL STORAGE
===================================== */

localStorage.removeItem(
"compareVehicles"
);



/* =====================================
RESET NAVBAR STATE
===================================== */

window.__NAV_INITIALIZED__ =
false;

window.__NAV_READY__ =
false;

window.dispatchEvent(
new CustomEvent("authChanged")
);

await navigate("/");

hideAuthLoading();

logoutInProgress = false;

return;

}catch(err){

/* PHASE 4 — event-level log only. */
console.error(
"Logout failed"
);

hideAuthLoading();

logoutInProgress = false;

alert(
"Failed to logout"
);

}

};

}

const dashBtn =
document.getElementById("dashBtn");

if(user){

/* =====================================
AUTHENTICATED USER
===================================== */

  if(signupBtn){

const label =
document.getElementById(
"dashboardBtnText"
);

if(label){
label.innerText = "Dashboard";
}

    signupBtn.href =
    "/dashboard";

    signupBtn.onclick = async (e)=>{

e.preventDefault();

await goDashboard();

};

    signupBtn.classList.remove(
      "hidden"
    );

  }

  if(loginBtn){

loginBtn.classList.add(
"hidden"
);

loginBtn.style.display =
"none";

loginBtn.style.visibility =
"hidden";

}

  if(logoutBtn){

logoutBtn.classList.remove(
"hidden"
);

logoutBtn.style.display =
"inline-flex";

logoutBtn.style.visibility =
"visible";

}

  const mobileDashBtn =
  document.getElementById(
  "mobileDashBtn"
  );

  if(mobileDashBtn){

  /* Active-page state â€” same detection as
     updateNavHighlight(): /dashboard prefix. */
  mobileDashBtn.classList.toggle(
    "nav-link-active",
    window.location.pathname.indexOf("/dashboard") === 0
  );

  mobileDashBtn.onclick = async (e)=>{

  e.preventDefault();

  await goDashboard();

  };

  }

}else{

/* =====================================
PUBLIC USER
===================================== */

  if(signupBtn){

const label =
document.getElementById(
"dashboardBtnText"
);

if(label){
label.innerText =
"Sign Up";
}

signupBtn.href =
"/signup";

signupBtn.onclick = null;

signupBtn.classList.remove(
"hidden"
);

signupBtn.style.removeProperty(
"display"
);

signupBtn.style.display =
"inline-flex";

signupBtn.style.visibility =
"visible";

signupBtn.style.opacity =
"1";

}

  if(loginBtn){

loginBtn.innerText =
"Login";

loginBtn.href =
"/login";

loginBtn.onclick = null;

loginBtn.classList.remove(
"hidden"
);

loginBtn.style.removeProperty(
"display"
);

loginBtn.style.display =
"inline-flex";

loginBtn.style.visibility =
"visible";

loginBtn.style.opacity =
"1";

}

  if(logoutBtn){

logoutBtn.classList.add(
"hidden"
);

logoutBtn.style.display =
"none";

logoutBtn.style.visibility =
"hidden";

logoutBtn.style.opacity =
"0";

}

}

}

/* =========================================
ðŸ”¥ DASHBOARD NOTIFICATION BADGE
========================================= */

window.dashboardBadgeChannel = null;

/* =========================================
PERFORMANCE FLAGS
========================================= */

window.__NAV_READY__ = true;

async function initDashboardBadge(){

const user =
await getAuthUser();

if(!user){

hideDashboardBadge();
return;

}

/* =====================================
INITIAL COUNT
===================================== */

await refreshDashboardBadge();

/* =====================================
REALTIME
===================================== */

if(window.dashboardBadgeChannel){

await supabase.removeChannel(
window.dashboardBadgeChannel
);

window.dashboardBadgeChannel = null;

}

if(
window.dashboardBadgeChannel &&
window.__BADGE_USER__ === user.id
){
return;
}

window.__BADGE_USER__ = user.id;

window.dashboardBadgeChannel =
supabase.channel(
`dashboard-badge-${user.id}`
);

window.dashboardBadgeChannel.on(
"postgres_changes",
{
event:"*",
schema:"public",
table:"notifications",
filter:`user_id=eq.${user.id}`
},
async ()=>{

await refreshDashboardBadge();

}
);

window.dashboardBadgeChannel.subscribe((status)=>{

if(status === "SUBSCRIBED"){

refreshDashboardBadge();

}

});

}

async function refreshDashboardBadge(){

const user =
await getAuthUser();

if(!user){
return;
}

const { count } =
await supabase
.from("notifications")
.select("*",{
count:"exact",
head:true
})
.eq("user_id", user.id)
.eq("is_read", false);

const badge =
document.getElementById(
"dashboardNotifBadge"
);

if(!badge){
return;
}

if((count || 0) <= 0){

hideDashboardBadge();
return;

}

badge.classList.remove(
"hidden"
);

const nextValue =
count > 99
? "99+"
: String(count);

if(badge.innerText !== nextValue){

badge.innerText = nextValue;

}

}

function hideDashboardBadge(){

const badge =
document.getElementById(
"dashboardNotifBadge"
);

if(!badge){
return;
}

badge.classList.add(
"hidden"
);

}

/* =========================================
PHASE 2 â€” IDLE DASHBOARD MODULE PREFETCH
=========================================
For signed-in users, download + parse the
dashboard module during browser idle time so
clicking "Dashboard" resolves instantly (the
router's import() of the same URL reuses the
browser module cache). This removes the large
module's download/parse from the click path â€”
the biggest mobile cost. Purely a prefetch:
no routing, auth or rendering behaviour is
changed. Prefetches after auth state is known
and only for authenticated users. */

setTimeout(()=>{

getAuthUser()
.then((user)=>{

if(!user){
return;
}

const runIdle =
"requestIdleCallback" in window
? (cb)=>window.requestIdleCallback(cb)
: (cb)=>setTimeout(cb, 300);

runIdle(()=>{

prefetchDashboard();

});

})
.catch(()=>{});

}, 400);