/*
====================================================
AUTH LOADING OVERLAY (LOGIN/LOGOUT TRANSITION)
Shared by login and logout. Uses the CURRENT
/assets/loading.png (1672x941 — bar removed) as the
full-screen artwork. The loading bar is a single
small horizontal HTML/CSS element whose fill
sweeps inside the track (the only animation). Blocks clicks while visible; guard
helpers prevent duplicate auth actions. No
artificial delays: the overlay lasts exactly as
long as the real auth/navigation operation.
====================================================
*/

let authLoadingEl = null;

function ensureAuthLoadingEl(){

if(authLoadingEl && document.body.contains(authLoadingEl)){
return authLoadingEl;
}

if(!document.getElementById("authLoadingStyle")){

const style =
document.createElement("style");

style.id = "authLoadingStyle";

style.textContent = `
#authLoadingOverlay{
position:fixed;
inset:0;
width:100vw;
height:100vh;
height:100dvh;
z-index:99999;
overflow:hidden;
background:#08111F;
font-family:inherit;
}
#authLoadingOverlay.alo-hidden{display:none;}
#authLoadingOverlay .alo-art{
position:absolute;
inset:0;
width:100%;
height:100%;
object-fit:cover;
object-position:center;
user-select:none;
pointer-events:none;
}
/* --- THE loading bar (the only one) ---
   Small horizontal indeterminate bar. Fixed safe
   geometry: 8px tall, responsive width, never
   stretches. The animation is the fill sweeping
   INSIDE the track only (track is overflow:hidden,
   so nothing can ever grow into a giant shape). */
#authLoadingOverlay .alo-bar{
position:absolute;
left:50%;
top:63%;
transform:translateX(-50%);
width:clamp(220px, 36vw, 560px);
max-width:min(560px, 80vw);
height:8px;
min-height:8px;
max-height:8px;
flex:none;
border-radius:999px;
background:rgba(255,255,255,0.10);
box-shadow:0 0 18px rgba(59,130,246,0.25);
overflow:hidden;
pointer-events:none;
}
#authLoadingOverlay .alo-bar::before{
content:"";
position:absolute;
top:0;
bottom:0;
left:0;
width:40%;
border-radius:999px;
background:linear-gradient(90deg,#3B82F6,#93C5FD 55%,#FFFFFF 85%,#E48A2F 130%);
box-shadow:0 0 14px rgba(59,130,246,0.7);
transform:translateX(-110%);
animation:alo-bar-sweep 1.4s ease-in-out infinite;
}
@keyframes alo-bar-sweep{
0%{transform:translateX(-110%);}
100%{transform:translateX(280%);}
}
#authLoadingOverlay .alo-message{
  position:absolute;
  left:50%;
  top:68.5%;
  transform:translateX(-50%);
  width:fit-content;
  max-width:calc(100% - 48px);
  margin:0;
  text-align:center;
  color:#0A192F;
  font-weight:700;
  font-size:clamp(1rem,2.6vw,1.2rem);
  letter-spacing:.16em;
  text-transform:uppercase;
  white-space:nowrap;
  padding:8px 22px;
  border-radius:999px;
  background:rgba(255,255,255,0.78);
  border:1px solid rgba(255,255,255,0.85);
  box-shadow:0 4px 18px rgba(8,17,31,0.18);
  text-shadow:none;
}
/* --- MOBILE (<=767px) ---
   Mobile-first: the SAME full-viewport composition
   as desktop. The artwork fills the entire screen
   (cover, never contain / centered rectangle), and
   the thin horizontal bar + status text sit centered
   over it. The bar keeps EXPLICIT absolute geometry
   in this breakpoint too, so its absolutely
   positioned fill can NEVER escape the 8px track and
   turn into a vertical element. No flex column, no
   light background, no card, no white margins. */
@media (max-width:767px){
#authLoadingOverlay{
position:fixed;
inset:0;
width:100vw;
height:100vh;
height:100dvh;
overflow:hidden;
}
#authLoadingOverlay .alo-art{
width:100%;
height:100%;
object-fit:cover;
object-position:center;
}
#authLoadingOverlay .alo-bar{
position:absolute;
left:50%;
top:63%;
transform:translateX(-50%);
width:78vw;
min-width:180px;
max-width:320px;
height:8px;
min-height:8px;
max-height:8px;
flex:none;
overflow:hidden;
}
#authLoadingOverlay .alo-message{
position:absolute;
left:50%;
top:68.5%;
transform:translateX(-50%);
width:fit-content;
max-width:calc(100% - 32px);
font-size:0.95rem;
padding:7px 16px;
white-space:nowrap;
}
}
`;

document.head.appendChild(style);

}

const el =
document.createElement("div");

el.id = "authLoadingOverlay";
el.setAttribute("role", "status");
el.setAttribute("aria-live", "polite");
el.setAttribute("aria-busy", "true");

el.innerHTML = `
<img class="alo-art" src="/assets/loading.png" alt="HUFA - Helpufin Auto" draggable="false">
<div class="alo-bar" aria-hidden="true"></div>
<p class="alo-message"></p>
`;

el.addEventListener("click", (e)=>{
e.preventDefault();
e.stopPropagation();
});

document.body.appendChild(el);

authLoadingEl = el;

return el;

}

/* Returns false when an auth action is already
   running - callers use this to guarantee ONE
   login/logout request. */

export function showAuthLoading(message){

if(isAuthLoading()){
return false;
}

const el =
ensureAuthLoadingEl();

el.querySelector(".alo-message").textContent =
message;

el.classList.remove("alo-hidden");

return true;

}

/* Update the message on the SAME loading screen
   mid-transition without restarting anything. */

export function setAuthLoadingMessage(message){

if(!authLoadingEl){
return;
}

const msgEl =
authLoadingEl.querySelector(".alo-message");

if(msgEl){
msgEl.textContent = message;
}

}

export function hideAuthLoading(){

if(!authLoadingEl){
return;
}

authLoadingEl.classList.add("alo-hidden");

}

export function isAuthLoading(){

return !!(
authLoadingEl &&
document.body.contains(authLoadingEl) &&
!authLoadingEl.classList.contains("alo-hidden")
);

}
