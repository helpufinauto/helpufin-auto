/*
=========================================================
MAIN APPLICATION ENTRY POINT
=========================================================
*/

import { router, navigate } from "./router.js";
import { Navbar, refreshNavAuth } from "../components/navbar.js";
import { Footer } from "../components/footer.js";
import {
  supabase,
  clearAuthCache
} from "./api.js";
import { AIAdvisor } from "../components/aiAdvisor.js";

const nav =
document.getElementById(
  "navbar"
);

const foot =
document.getElementById(
  "footer"
);

/* =========================================
🔥 SINGLE INIT LAYOUT
========================================= */

let layoutInitialized =
false;

function initLayout(){

  if(layoutInitialized){
    return;
  }

  if(nav){
    nav.innerHTML = Navbar();
  }

  if(foot){
    foot.innerHTML = Footer();
  }

  layoutInitialized = true;

}

initLayout();

async function handleAuthRedirect(){

  const hash = window.location.hash;

  if(!hash) return;

  const params = new URLSearchParams(hash.substring(1));

  const type = params.get("type");

  /* ======================
  PASSWORD RESET FLOW (PHASE 11)
  ====================== */

  if(type === "recovery"){

    /* The recovery link is consumed entirely by
       Supabase Auth (its own session handling) —
       the app never reads, moves or logs the
       tokens. The URL fragment is intentionally
       left untouched so the auth client can
       finish consuming it; only a boolean marker
       is kept (never session/token data). */

    window.__HUFA_PASSWORD_RECOVERY__ = true;

    if(window.location.pathname !== "/reset-password"){

      /* Hand off to the dedicated recovery
         destination page, preserving the current
         fragment. The initial renderApp() below
         then renders /reset-password. */

      history.pushState(
        {
          path: "/reset-password",
          scroll: 0
        },
        "",
        "/reset-password" + window.location.hash
      );

    }

    return;
  }

  /* ======================
  NORMAL LOGIN CONFIRM
  ====================== */

if(hash.includes("access_token")){

  const { data } = await supabase.auth.getSession();

  if(data.session){

    // 🔥 ONLY redirect IF user is on login page
    if(window.location.pathname === "/login"){
      navigate("/dashboard");
    }

window.location.hash = "";

requestAnimationFrame(
async ()=>{

await renderApp();

}
);
  }

}

}

await Promise.resolve(
handleAuthRedirect()
);

/*
=========================================================
INITIAL ROUTE (FIXED WITH ICON SUPPORT)
=========================================================
*/

let renderInProgress = false;

window.renderApp = async function(){

  if(renderInProgress){
    return;
  }

  renderInProgress = true;

  try{

await router();

if(
window.lucide &&
typeof lucide.createIcons === "function"
){

requestAnimationFrame(()=>{

lucide.createIcons();

});

}

  }finally{

    renderInProgress = false;

  }

};

// initial load
await renderApp();

/*
=========================================================
HANDLE BACK BUTTON
=========================================================
*/

window.addEventListener(
"popstate",
(event)=>{

requestAnimationFrame(
async ()=>{

if(renderInProgress){
return;
}

await renderApp();

const state =
event.state || history.state;

if(
state &&
typeof state.scroll === "number"
){

window.scrollTo(
0,
state.scroll
);

}else{

requestAnimationFrame(()=>{

window.scrollTo(
0,
0
);

});

}

}
);

}
);

/* =========================================
AUTH STATE IS NOW FULLY MANAGED
INSIDE api.js
========================================= */

let authRefreshRunning = false;

window.addEventListener(
"authChanged",
()=>{

if(authRefreshRunning){
return;
}

authRefreshRunning = true;

requestAnimationFrame(
async ()=>{

try{

if(nav){
nav.innerHTML = Navbar();
}

/* Navbar was re-rendered — re-apply auth button
   visibility (mobile Dashboard / Login / Logout). */
await refreshNavAuth();

await renderApp();

}finally{

authRefreshRunning = false;

}

}
);

}
);