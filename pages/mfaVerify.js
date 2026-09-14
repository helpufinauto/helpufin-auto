/* =========================================
PHASE 3 — MFA VERIFICATION PAGE (/mfa-verify)
Second-factor step for accounts with a VERIFIED
TOTP authenticator factor.

Flow (existing Supabase Auth MFA APIs only):
  password login (aal1) → this page →
  mfa.challenge() → mfa.verify() → confirmed
  aal2 → normal authenticated dashboard access.

Security model:
• The Supabase assurance level is the source of
  truth — no client-side "MFA passed" boolean.
• The challenge id lives in memory for the
  duration of one attempt and is never logged
  or persisted.
• Codes, secrets, tokens and sessions are never
  logged. Failures show short generic messages.
========================================= */

import {
  supabase,
  getAuthUser,
  getUserProfile,
  clearAuthCache,
  getMfaAssurance,
  getVerifiedTotpFactor,
  describeMfaError
} from "../js/api.js";
import { navigate } from "../js/router.js";

/* In-memory only. Cleared the moment an attempt
   ends and never written anywhere else. */
let mfaChallengeId = null;
let mfaVerifyInProgress = false;
let mfaBackInProgress = false;

export function MfaVerifyPage(){

setTimeout(initMfaVerify);

return `

<div class="
auth-page
min-h-screen
overflow-x-hidden
bg-gradient-to-b
from-white
via-[#f8fafc]
to-white
py-10
md:py-16
px-4
">

<div class="
max-w-md
mx-auto
">

<!-- ==============================================
     PAGE HEADER — same eyebrow/title treatment as
     the existing /login page
     ============================================== -->
<div class="
auth-page-header
text-center mb-8 md:mb-10">

<div class="
auth-eyebrow
inline-flex
items-center
gap-2
text-[11px]
font-extrabold
uppercase
tracking-[0.22em]
text-[#0A58FF]
mb-4
">
<span class="w-8 h-[2px] rounded-full bg-[#E48A2F]"></span>
Security Check
<span class="w-8 h-[2px] rounded-full bg-[#E48A2F]"></span>
</div>

<h1 class="
auth-heading
text-3xl
md:text-4xl
font-black
tracking-[-0.04em]
text-[#08111F]
">
Two-Factor Authentication
</h1>

<p class="
auth-sub
text-[#64748B]
mt-3
text-[15px]
md:text-base
">
Your account is protected with an authenticator app.
</p>

</div>

<!-- ==============================================
     VERIFY CARD — same HUFA card language as the
     login card: white, navy border, soft shadow,
     orange accent bar
     ============================================== -->
<section
aria-labelledby="mfaVerifyHeading"
class="
hufa-form
auth-card
rounded-[24px]
bg-white
border
border-[#0A192F]/10
shadow-[0_18px_50px_rgba(10,25,47,0.08)]
p-6
md:p-8
">

<div class="mb-6 md:mb-8">

<span class="
hufa-page-heading-accent
auth-accent-bar
block
w-10
h-[3px]
rounded-full
bg-[#E48A2F]
mb-3
"></span>

<h2
id="mfaVerifyHeading"
class="
auth-card-title
text-lg
md:text-xl
font-extrabold
tracking-[-0.02em]
text-[#0A192F]
"
>
Verify It's You
</h2>

<p class="
text-[13px]
text-[#64748B]
mt-1.5
leading-relaxed
">
Enter the 6-digit verification code from your authenticator app to finish signing in.
</p>

</div>

<form id="mfaVerifyForm" class="space-y-5" novalidate>

<div>

<label
for="mfaCode"
class="
auth-label
block
text-[12px]
font-bold
uppercase
tracking-[0.08em]
text-[#0A192F]
mb-1.5
"
>
Verification Code
</label>

<input
id="mfaCode"
type="text"
inputmode="numeric"
autocomplete="one-time-code"
enterkeyhint="go"
maxlength="6"
autocapitalize="off"
autocorrect="off"
spellcheck="false"
placeholder="000000"
pattern="[0-9]*"
aria-describedby="mfaCodeHint"
class="
input-light
mfa-otp
"
required
>

<p
id="mfaCodeHint"
class="
text-[12px]
text-[#64748B]
mt-1.5
leading-relaxed
"
>
The code refreshes every 30 seconds.
</p>

</div>

<div
id="mfaVerifyError"
class="mfa-alert hidden"
role="alert"
></div>

<button
id="mfaVerifyBtn"
type="submit"
class="
auth-submit
w-full
rounded-2xl
bg-[#005BBF]
text-white
py-4
font-bold
text-base
transition-all
duration-300
hover:-translate-y-[2px]
hover:shadow-[0_14px_35px_rgba(10,25,47,0.18)]
active:scale-[0.98]
disabled:opacity-60
disabled:cursor-not-allowed
mt-2
">

<span
id="mfaVerifyBtnText"
class="text-white font-bold"
aria-live="polite"
>
Verify &amp; Continue
</span>

</button>

</form>

<div class="
auth-footer
mt-6
pt-5
border-t
border-[#0A192F]/10
text-center
">

<p class="text-[13px] text-[#64748B]">

Wrong account?

<button
type="button"
id="mfaBackToLoginBtn"
class="
font-bold
text-[#0A58FF]
hover:text-[#E48A2F]
transition-colors
"
>
Back to Login
</button>

</p>

</div>

</section>

</div>

</div>

`;

}

/* ---- PAGE LOGIC ---- */

function initMfaVerify(){

  const form =
  document.getElementById(
  "mfaVerifyForm"
  );

if(!form || form.dataset.bound){
return;
}

form.dataset.bound = "true";

const backBtn =
document.getElementById(
"mfaBackToLoginBtn"
);

if(backBtn){
backBtn.addEventListener(
"click",
backToLogin
);
}

form.addEventListener(
"submit",
onMfaVerifySubmit
);

/* PHASE 4 — land keyboard and mobile users
   directly in the code field. */
setTimeout(()=>{

const codeInput =
document.getElementById(
"mfaCode"
);

if(codeInput){
codeInput.focus();
codeInput.select();
}

}, 80);

/* Route sanity: this page is only meaningful
   for a signed-in user who still owes the
   second factor. Everyone else is routed away
   — no usable challenge is ever left lying
   around. */

ensureMfaVerifyContext();

}

async function ensureMfaVerifyContext(){

const user =
await getAuthUser();

if(!user){
await navigate("/login");
return;
}

let assurance = null;

try{
assurance = await getMfaAssurance();
}catch(err){
assurance = null;
}

/* Already fully verified (aal2) — continue
   into the normal authenticated app. */
if(assurance?.currentLevel === "aal2"){

const profile =
await getUserProfile();

await navigate(
profile?.role === "admin"
? "/admin"
: "/dashboard"
);

return;

}

/* No verified factor to verify against (e.g.
   MFA was removed in another tab) — return to
   the normal login flow. */
if(assurance?.nextLevel !== "aal2"){
await backToLogin();
}

}

async function onMfaVerifySubmit(e){

e.preventDefault();

if(mfaVerifyInProgress){
return;
}

hideMfaVerifyError();

const codeInput =
document.getElementById("mfaCode");

const code =
(codeInput?.value || "").replace(/\s+/g, "");

/* Empty or malformed submissions are rejected
   before anything is sent to Supabase. */
if(!/^\d{6}$/.test(code)){
showMfaVerifyError(
"Enter the 6-digit code from your authenticator app."
);
return;
}

mfaVerifyInProgress = true;
setMfaVerifyLoading(true);

try{

const factor =
await getVerifiedTotpFactor();

if(!factor){
showMfaVerifyError(
"Verification is unavailable right now. Please sign in again."
);
return;
}

/* A fresh challenge per attempt. The challenge
   id is kept in memory for this attempt only —
   it is never logged and dies with the
   session. */
let challengeId = null;

try{
const { data } =
await supabase.auth.mfa.challenge({
factorId: factor.id
});
challengeId = data?.id || null;
}catch(err){
challengeId = null;
}

if(!challengeId){
showMfaVerifyError(
"Verification failed. Please try again."
);
return;
}

mfaChallengeId = challengeId;

let verifyError = null;

try{
const { error } =
await supabase.auth.mfa.verify({
factorId: factor.id,
challengeId,
code
});
verifyError = error || null;
}catch(err){
verifyError = err;
}

if(verifyError){
mfaChallengeId = null;
showMfaVerifyError(
describeMfaError(verifyError)
);
codeInput?.select?.();
return;
}

mfaChallengeId = null;

/* Confirm the session really reached aal2 —
   the Supabase assurance level is the source
   of truth, never a local flag. */
let assurance = null;

try{
assurance = await getMfaAssurance();
}catch(err){
assurance = null;
}

if(assurance?.currentLevel !== "aal2"){
showMfaVerifyError(
"Verification could not be completed. Please try again."
);
return;
}

/* Session is now aal2 — continue exactly like
   a normal completed login (authChanged is
   dispatched automatically by the existing
   onAuthStateChange handler in js/api.js). */
const profile =
await getUserProfile();

await navigate(
profile?.role === "admin"
? "/admin"
: "/dashboard"
);

}catch(err){
mfaChallengeId = null;
showMfaVerifyError(
"Verification failed. Please try again."
);
}finally{
mfaVerifyInProgress = false;
setMfaVerifyLoading(false);
}

}

async function backToLogin(){

if(mfaBackInProgress){
return;
}

mfaBackInProgress = true;

/* Abandoning the second factor ends the
   session — the same sign-out path the navbar
   uses. No challenge state remains usable
   afterwards, and the session is never marked
   aal2. */

try{
await supabase.auth.signOut();
}catch(err){
/* sign-out stays best-effort here */
}

clearAuthCache();

mfaChallengeId = null;

window.dispatchEvent(
new CustomEvent("authChanged")
);

await navigate("/login");

mfaBackInProgress = false;

}

function showMfaVerifyError(message){

const box =
document.getElementById(
"mfaVerifyError"
);

if(!box){
return;
}

box.textContent = message;
box.classList.remove("hidden");

}

function hideMfaVerifyError(){

const box =
document.getElementById(
"mfaVerifyError"
);

if(!box){
return;
}

box.textContent = "";
box.classList.add("hidden");

}

function setMfaVerifyLoading(loading){

const btn =
document.getElementById(
"mfaVerifyBtn"
);

const text =
document.getElementById(
"mfaVerifyBtnText"
);

if(btn){
btn.disabled = !!loading;
btn.setAttribute(
"aria-busy",
loading ? "true" : "false"
);
}

if(text){
text.textContent = loading
? "Verifying..."
: "Verify & Continue";
}

}

