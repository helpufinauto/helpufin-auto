import { supabase, describeAuthError } from "../js/api.js";
import { navigate } from "../js/router.js";
import { toast } from "../js/ui.js";
import {
  bindPasswordRequirements,
  buildPasswordRequirementsMessage,
  getUnmetPasswordRequirements,
  renderPasswordRequirements
} from "../js/passwordPolicy.js";

/*
=========================================================
PHASE 11 — SET NEW PASSWORD (RECOVERY DESTINATION PAGE)
=========================================================
Reached through the secure recovery link Supabase Auth
emails the user. The link itself signs the user in —
Supabase Auth consumes the recovery token entirely; this
page only waits for that session to appear.

Security model:
  • The page NEVER reads, moves or logs the recovery
    tokens from the URL. Only a boolean "is there a
    session" check is performed.
  • Leftover recovery parameters are removed from the
    address bar AFTER Supabase has consumed them.
  • No old password is requested — the recovery session
    authorizes the update.
  • Password rules are the SAME as /signup (min 12
    chars with upper, lower, number and special
    character — see js/passwordPolicy.js), plus
    confirmation must match.
=========================================================
*/

export function ResetPasswordPage(){


setTimeout(initResetPassword);

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
RECOVERY HEADER — same eyebrow/title treatment
as the /login and /signup pages
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
Account Recovery
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
Set New Password
</h1>

<p class="
auth-sub
text-[#64748B]
mt-3
text-[15px]
md:text-base
">
Choose a strong new password for your account.
</p>

</div>

<!-- ==============================================
RECOVERY CARD — identical HUFA card language to
the /login card
============================================== -->
<section
aria-labelledby="resetHeading"
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

<!-- ==========================================
VERIFYING STATE — shown while Supabase Auth
consumes the recovery link and establishes the
session. No tokens are touched.
========================================== -->
<div id="resetVerifyState" class="text-center py-10">

<div class="
animate-pulse
text-sm
tracking-wide
text-gray-400
">
Verifying your reset link...
</div>

</div>

<!-- ==========================================
FORM STATE
========================================== -->
<div id="resetFormState" class="hidden">

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
id="resetHeading"
class="
auth-card-title
text-lg
md:text-xl
font-extrabold
tracking-[-0.02em]
text-[#0A192F]
"
>
Set New Password
</h2>

<p class="
text-[13px]
text-[#64748B]
mt-1.5
leading-relaxed
">
Enter and confirm your new password below.
</p>

</div>

<form id="resetForm" class="space-y-5" novalidate>

<div>

<label
for="newPassword"
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
New Password
</label>

<input
id="newPassword"
type="password"
autocomplete="new-password"
enterkeyhint="next"
placeholder="Create a strong password"
class="
input-light
"
required
>

<!-- PHASE 12 — live password requirements
     (shared policy with /signup) -->
${renderPasswordRequirements("resetPasswordRequirements")}

</div>

<div>

<label
for="confirmPassword"
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
Confirm New Password
</label>

<input
id="confirmPassword"
type="password"
autocomplete="new-password"
enterkeyhint="go"
placeholder="Re-enter your new password"
class="
input-light
"
required
>

</div>

<button
id="resetBtn"
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

<span class="text-white font-bold">
Update Password
</span>

</button>

</form>

</div>

<!-- ==========================================
INVALID / EXPIRED STATE
========================================== -->
<div id="resetInvalidState" class="hidden">

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

<h2 class="
auth-card-title
text-lg
md:text-xl
font-extrabold
tracking-[-0.02em]
text-[#0A192F]
">
Reset Link Invalid or Expired
</h2>

<p class="
text-[13px]
text-[#64748B]
mt-1.5
leading-relaxed
">
This password reset link is invalid or has expired. Request a new one to continue.
</p>

</div>

<button
id="resetNewLinkBtn"
type="button"
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
mt-2
">

<span class="text-white font-bold">
Request a New Link
</span>

</button>

</div>

<!-- ==========================================
SUCCESS STATE
========================================== -->
<div id="resetSuccessState" class="hidden">

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

<h2 class="
auth-card-title
text-lg
md:text-xl
font-extrabold
tracking-[-0.02em]
text-[#0A192F]
">
Password Updated
</h2>

<p class="
text-[13px]
text-[#64748B]
mt-1.5
leading-relaxed
">
Your password has been changed successfully. You can now sign in with your new password.
</p>

</div>

<button
id="resetLoginBtn"
type="button"
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
mt-2
">

<span class="text-white font-bold">
Return to Login
</span>

</button>

</div>

</section>

</div>

</div>

`;

}

/* =========================================
PANEL SWITCHING
========================================= */

function showResetPanel(id){

[
"resetVerifyState",
"resetFormState",
"resetInvalidState",
"resetSuccessState"
].forEach((panel)=>{

const el =
document.getElementById(panel);

if(!el){
return;
}

if(panel === id){
el.classList.remove("hidden");
}else{
el.classList.add("hidden");
}

});

}

/* =========================================
RECOVERY SESSION DETECTION (PHASE 11)
=========================================
The recovery link signs the user in through
Supabase Auth itself (implicit-flow fragment or
PKCE ?code= redirect — both handled by the auth
client). This page only waits for that session
to appear via the normal client API. It NEVER
reads, moves or logs the tokens from the URL. */

const RECOVERY_SESSION_TIMEOUT = 4000;
const RECOVERY_SESSION_INTERVAL = 250;

async function waitForRecoverySession(){

const deadline =
Date.now() + RECOVERY_SESSION_TIMEOUT;

while(Date.now() < deadline){

try{

const { data } =
await supabase.auth.getSession();

/* Only a yes/no is used — the session object
   itself is never stored or logged. */

if(data?.session){
return true;
}

}catch(err){

/* Session read failures simply keep the page
   waiting until the timeout. */

}

await new Promise(
(resolve)=>setTimeout(resolve, RECOVERY_SESSION_INTERVAL)
);

}

return false;

}

/* Removes leftover recovery parameters from the
   address bar AFTER Supabase Auth has consumed
   them, so tokens never linger in the visible
   URL. Nothing is ever written INTO the URL. */

function cleanRecoveryUrl(){

try{

history.replaceState(
history.state,
"",
window.location.pathname + window.location.search
);

}catch(err){

/* Non-fatal: an unchanged URL is safe. */

}

}

async function initResetPassword(){

/* A completed update survives re-renders
   (authChanged) so the success panel never
   flips back to the form. Only a boolean is
   kept — never the password itself. */

if(window.__HUFA_PASSWORD_UPDATED__){
showResetPanel("resetSuccessState");
bindResetForm();
return;
}

const hasSession =
await waitForRecoverySession();

if(hasSession){

cleanRecoveryUrl();

showResetPanel("resetFormState");

}else{

showResetPanel("resetInvalidState");

}

bindResetForm();

}

function bindResetForm(){

  const form =
document.getElementById(
"resetForm"
);

if(!form || form.dataset.bound){
return;
}

form.dataset.bound = "true";

/* PHASE 12 — live password requirement
   indicators (shared password policy). */

bindPasswordRequirements(
  document.getElementById("newPassword"),
  document.getElementById(
    "resetPasswordRequirements"
  )
);

/* Duplicate-action guard. Only ONE password
   update can ever be in flight. */

let resetInProgress = false;

form.addEventListener("submit", async (e)=>{
    e.preventDefault();

    if(resetInProgress){
      return;
    }

    const newPassword =
document.getElementById("newPassword").value;

    const confirmPassword =
document.getElementById("confirmPassword").value;

    /* VALIDATION — the SAME rules and the SAME
       messages the /signup page enforces. No old
       password is requested during recovery. */

    if(!newPassword || !confirmPassword){
      toast("Please complete all fields");
      return;
    }

    /* PHASE 12 — full password policy (the SAME
       rules as /signup; see js/passwordPolicy.js).
       Every rule must pass before Supabase Auth
       is called. */

    const unmetPasswordRules =
    getUnmetPasswordRequirements(newPassword);

    if(unmetPasswordRules.length > 0){
      toast(buildPasswordRequirementsMessage(newPassword));
      return;
    }

    if(confirmPassword !== newPassword){
      toast("Passwords do not match");
      return;
    }

    resetInProgress = true;

    const btn =
document.getElementById("resetBtn");

    if(btn){
      btn.disabled = true;
    }

    try{

    /* PHASE 11 — SECURE PASSWORD UPDATE

       The recovery session established by the
       email link authorizes this update. Only
       the new password is sent to Supabase Auth.
       The response is handled safely below —
       no session objects, tokens or passwords
       are ever logged. */

    const { error } =
    await supabase.auth.updateUser({
      password: newPassword
    });

    if(error){
      handleUpdateError(error);
      return;
    }

    /* Mark completion (boolean only) so any
       re-render keeps the success panel, then
       clear the plaintext values immediately. */

    window.__HUFA_PASSWORD_UPDATED__ = true;

    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";

    showResetPanel("resetSuccessState");

    }catch(err){

      toast("Could not update your password. Please try again.");
      return;

    }finally{

      resetInProgress = false;

      if(btn){
        btn.disabled = false;
      }

    }

});

  /* RETURN TO LOGIN (success state) */

  const loginBtn =
document.getElementById("resetLoginBtn");

  if(loginBtn && !loginBtn.dataset.bound){

    loginBtn.dataset.bound = "true";

    loginBtn.addEventListener("click", ()=>{
      navigate("/login");
    });

  }

  /* REQUEST A NEW LINK (invalid/expired state) */

  const newLinkBtn =
document.getElementById("resetNewLinkBtn");

  if(newLinkBtn && !newLinkBtn.dataset.bound){

    newLinkBtn.dataset.bound = "true";

    newLinkBtn.addEventListener("click", ()=>{
      navigate("/forgot-password");
    });

  }

}

function handleUpdateError(error){

/* User-friendly handling only. Raw Supabase
   objects, session data and tokens are never
   logged or shown. */

const msg =
(error?.message || "").toLowerCase();

/* The recovery session is gone — the user must
   request a fresh link. */

if(
msg.includes("session") ||
msg.includes("expired") ||
msg.includes("refresh token") ||
msg.includes("not found")
){

showResetPanel("resetInvalidState");
return;

}

if(
msg.includes("different from the old password")
){

toast("Your new password must be different from your current password");
return;

}

/* Default: security-safe generic message.
   (PHASE 4) Raw Supabase auth internals are
   never shown to the user. */

toast(
describeAuthError(error, "resetPassword")
);

}