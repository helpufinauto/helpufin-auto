/*
====================================================
HUFA POST-SIGNUP WELCOME SCREEN
Shared by the signup success path. Uses the EXISTING
/assets/welcome.png (1672x941) as a full-screen cover.
The artwork already contains the HUFA logo, "Welcome
to HUFA" and the supporting tagline, so the overlay
renders ONLY the artwork — no duplicate logo, no
duplicate heading, no duplicate text, no progress
bar, no spinner.

Mobile-first: the fixed overlay fills the actual
viewport (100vw x 100dvh), the artwork is sized with
object-fit:cover so it behaves like a full-screen
background (cropping naturally on narrow screens —
never contain/letterboxed). Same composition on
desktop. Subtle fade-in, then a gentle fade-out
before the existing post-signup state is revealed.
No artificial auth delay (the welcome is shown only
after signUp has genuinely succeeded) and the whole
overlay removes itself when done.
====================================================
*/

let welcomeEl = null;

const WELCOME_FADE_OUT_MS = 450;

function ensureWelcomeEl(){
	if(welcomeEl && document.body.contains(welcomeEl)){
		return welcomeEl;
	}

	if(!document.getElementById("welcomeScreenStyle")){

		const style =
		document.createElement("style");

		style.id = "welcomeScreenStyle";

		style.textContent = `
#welcomeScreenOverlay{
position:fixed;
inset:0;
width:100vw;
height:100vh;
height:100dvh;
z-index:99998;
overflow:hidden;
background:#08111F;
overscroll-behavior:none;
touch-action:none;
}
#welcomeScreenOverlay.welcome-hidden{display:none;}
#welcomeScreenOverlay .welcome-art{
position:absolute;
inset:0;
width:100%;
height:100%;
object-fit:cover;
object-position:center;
user-select:none;
pointer-events:none;
}
#welcomeScreenOverlay{
animation:welcomeScreenFadeIn .55s ease both;
}
#welcomeScreenOverlay.welcome-leaving{
animation:welcomeScreenFadeOut .42s ease both;
}
@keyframes welcomeScreenFadeIn{
from{opacity:0;}
to{opacity:1;}
}
@keyframes welcomeScreenFadeOut{
from{opacity:1;}
to{opacity:0;}
}
@media (prefers-reduced-motion: reduce){
#welcomeScreenOverlay,
#welcomeScreenOverlay.welcome-leaving{
animation:none;
}
}
`;

		document.head.appendChild(style);
	}

	const el =
	document.createElement("div");

	el.id = "welcomeScreenOverlay";
	el.setAttribute("role", "status");
	el.setAttribute("aria-live", "polite");
	el.setAttribute("aria-busy", "true");

	el.innerHTML = `
<img
class="welcome-art"
src="/assets/welcome.png"
alt="Welcome to HUFA — your smarter way to buy, sell and compare vehicles."
draggable="false"
>
`;

	const art =
	el.querySelector(".welcome-art");

	if(art){
		art.addEventListener("load", ()=>{
			el.setAttribute("aria-busy", "false");
		});
		/* Cached artwork may already be complete before the
		   listener attaches — clear the busy state in that case. */
		if(art.complete && art.naturalWidth > 0){
			el.setAttribute("aria-busy", "false");
		}
	}

	/* Block any interaction with the state behind the
	   welcome artwork while it is on screen. */
	el.addEventListener("click", (e)=>{
		e.preventDefault();
		e.stopPropagation();
	});

	document.body.appendChild(el);

	welcomeEl = el;

	return el;
}

function completeWelcome(){
	const el = welcomeEl;

	if(!el || !document.body.contains(el)){
		return;
	}

	clearTimeout(el._welcomeTimer);
	el._welcomeTimer = null;

	el.classList.add("welcome-hidden");
	el.classList.remove("welcome-leaving");
}

function prefersReducedMotion(){
	return !!(
		window.matchMedia &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

/* Show the full-screen welcome artwork over the
   freshly-created account state. It fades in, holds
   for the given duration, then fades out and reveals
   the existing success state underneath. Returns
   false when a welcome screen is already showing so
   callers can guarantee ONE at a time. */

export function showWelcomeScreen(options = {}){

	if(isWelcomeScreenVisible()){
		return false;
	}

	const holdMs =
	typeof options.hold === "number"
	? options.hold
	: 2400;

	const el =
	ensureWelcomeEl();

	if(prefersReducedMotion()){
		/* Reduced motion — still show the artwork
		   (content), just without the animation. */
		el.classList.remove("welcome-hidden");
		el.classList.remove("welcome-leaving");
		el._welcomeTimer = setTimeout(
			completeWelcome,
			holdMs
		);
		return true;
	}

	/* Force a re-flow so the fade-in animation always
	   restarts if shown again. */
	void el.offsetWidth;

	el.classList.remove("welcome-hidden");
	el.classList.remove("welcome-leaving");

	el._welcomeTimer = setTimeout(()=>{

		el.classList.add("welcome-leaving");

		el._welcomeTimer = setTimeout(
			completeWelcome,
			WELCOME_FADE_OUT_MS
		);

	}, holdMs);

	return true;
}

export function hideWelcomeScreen(){
	if(welcomeEl && document.body.contains(welcomeEl)){
		clearTimeout(welcomeEl._welcomeTimer);
		welcomeEl._welcomeTimer = null;
		welcomeEl.classList.add("welcome-hidden");
		welcomeEl.classList.remove("welcome-leaving");
	}
}

export function isWelcomeScreenVisible(){
	return !!(
		welcomeEl &&
		document.body.contains(welcomeEl) &&
		!welcomeEl.classList.contains("welcome-hidden")
	);
}