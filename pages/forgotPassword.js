import { supabase } from "../js/api.js";
import { toast } from "../js/ui.js";
import { appUrl } from "../js/basePath.js";

/*
=========================================================
PHASE 11 — FORGOT PASSWORD (RECOVERY REQUEST PAGE)
=========================================================
Safe password-recovery entry point for the existing
Supabase Auth system.

Security model:
  • resetPasswordForEmail() never reveals whether the
    submitted address belongs to an account.
  • The UI shows the SAME generic confirmation no matter
    what the request returns, so account enumeration is
    impossible through this page.
  • No passwords, sessions, tokens or request results
    are ever logged here.
=========================================================
*/

export function ForgotPasswordPage(){


setTimeout(initForgotPassword);

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
Forgot your password?
</h1>

<p class="
auth-sub
text-[#64748B]
mt-3
text-[15px]
md:text-base
">
Enter your email address and we'll send you a secure password reset link.
</p>

</div>

<!-- ==============================================
RECOVERY CARD — identical HUFA card language to
the /login card: white, navy border, soft shadow,
orange accent bar
============================================== -->
<section
aria-labelledby="forgotHeading"
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
REQUEST FORM STATE
========================================== -->
<div id="forgotFormState">

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
id="forgotHeading"
class="
auth-card-title
text-lg
md:text-xl
font-extrabold
tracking-[-0.02em]
text-[#0A192F]
"
>
Password Reset
</h2>

<p class="
text-[13px]
text-[#64748B]
mt-1.5
leading-relaxed
">
Enter your email address and we'll send you a secure password reset link.
</p>

</div>

<form id="forgotForm" class="space-y-5" novalidate>

<div>

<label
for="forgotEmail"
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
Email Address
</label>

<input
id="forgotEmail"
type="email"
autocomplete="email"
inputmode="email"
enterkeyhint="send"
autocapitalize="none"
autocorrect="off"
spellcheck="false"
placeholder="you@example.com"
class="
input-light
"
required
>

</div>

<button
id="forgotBtn"
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
Send Reset Link
</span>

</button>

</form>

</div>

<!-- ==========================================
GENERIC CONFIRMATION STATE

Security: the SAME message is shown no matter
what the server returned — the UI can never
distinguish an existing account from a
non-existing one (no account enumeration).
========================================== -->
<div id="forgotSentState" class="hidden">

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
Check Your Email
</h2>

</div>

<p class="
text-[13px]
text-[#0A192F]
font-bold
leading-relaxed
">
If an account exists for this email address, a password reset link has been sent.
</p>

<p class="
text-[13px]
text-[#64748B]
mt-3
leading-relaxed
">
Please check your inbox — and your spam folder — and follow the secure link in the email to set a new password. The link expires shortly after it was requested.
</p>

<button
id="forgotBackBtn"
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
mt-6
">

<span class="text-white font-bold">
Back to Login
</span>

</button>

<button
id="forgotRetryBtn"
type="button"
class="
w-full
text-[13px]
font-bold
text-[#0A58FF]
hover:text-[#E48A2F]
transition-colors
mt-3
"
>
Use a different email
</button>

</div>

</section>

</div>

</div>

`;

}

function showForgotPanel(id){

const formState =
document.getElementById("forgotFormState");

const sentState =
document.getElementById("forgotSentState");

if(!formState || !sentState){
return;
}

if(id === "forgotSentState"){

formState.classList.add("hidden");
sentState.classList.remove("hidden");

}else{

sentState.classList.add("hidden");
formState.classList.remove("hidden");

}

}

function initForgotPassword(){

  const form =
document.getElementById(
"forgotForm"
);

if(!form || form.dataset.bound){
return;
}

form.dataset.bound = "true";

/* Duplicate-action guard. Only ONE reset
   request can ever be in flight. */

let resetInProgress = false;

form.addEventListener("submit", async (e)=>{
    e.preventDefault();

    if(resetInProgress){
      return;
    }

    const emailInput =
document.getElementById("forgotEmail");

    const email =
emailInput.value.trim();

    /* VALIDATION — same email shape check the
       signup page enforces. No password is ever
       requested on this page. */

    if(!email){
      toast("Please enter your email address");
      return;
    }

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      toast("Please enter a valid email address");
      return;
    }

    resetInProgress = true;

    const btn =
document.getElementById("forgotBtn");

    if(btn){
      btn.disabled = true;
    }

    try{

    /* PHASE 11 — SECURE RECOVERY REQUEST

       Uses the existing Supabase client. The
       redirect target is derived from the shared
       base-path helper (js/basePath.js) so it is
       correct on localhost ("/") and under any
       deployment base such as GitHub Pages
       ("/helpufin-auto/") — no hardcoded domain.
       The result is intentionally not inspected:
       success, failure, rate limits and unknown
       addresses all produce the exact same
       generic confirmation below. Nothing is
       logged. */

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
      appUrl("/reset-password")
    });

    }catch(err){

    /* Swallowed deliberately — a failure must be
       indistinguishable from a success in the UI,
       and no request/account/session data is ever
       logged here. */

    }

    showForgotPanel("forgotSentState");

    resetInProgress = false;

    if(btn){
      btn.disabled = false;
    }

});

  /* USE A DIFFERENT EMAIL — back to the form */

  const retryBtn =
document.getElementById("forgotRetryBtn");

  if(retryBtn && !retryBtn.dataset.bound){

    retryBtn.dataset.bound = "true";

    retryBtn.addEventListener("click", ()=>{
      showForgotPanel("forgotFormState");
    });

  }

  /* BACK TO LOGIN (confirmation state) */

  const backBtn =
document.getElementById("forgotBackBtn");

  if(backBtn && !backBtn.dataset.bound){

    backBtn.dataset.bound = "true";

    backBtn.addEventListener("click", ()=>{

      if(window.navigate){
        window.navigate("/login");
      }else{
        window.location.href = "/login";
      }

    });

  }

}