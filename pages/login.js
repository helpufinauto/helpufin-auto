import { supabase, getUserProfile, needsMfaVerification, describeAuthError } from "../js/api.js";
import { navigate } from "../js/router.js";
import { toast } from "../js/ui.js";
import { showAuthLoading, hideAuthLoading } from "../components/authLoading.js";

export function LoginPage(){


setTimeout(initLogin);

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
LOGIN HEADER — same eyebrow/title treatment
as the redesigned /signup page
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
Welcome Back
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
Login to Helpufin Auto
</h1>

<p class="
auth-sub
text-[#64748B]
mt-3
text-[15px]
md:text-base
">
Sign in to manage your listings and enquiries.
</p>

</div>

<!-- ==============================================
LOGIN CARD — HUFA card language: white,
navy border, soft shadow, orange accent bar
============================================== -->
<section
aria-labelledby="loginHeading"
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
id="loginHeading"
class="
auth-card-title
text-lg
md:text-xl
font-extrabold
tracking-[-0.02em]
text-[#0A192F]
"
>
Login
</h2>

<p class="
text-[13px]
text-[#64748B]
mt-1.5
leading-relaxed
">
Enter your account details below.
</p>

</div>

<form id="loginForm" class="space-y-5" novalidate>

<div>

<label
for="email"
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
id="email"
type="email"
autocomplete="email"
inputmode="email"
enterkeyhint="next"
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

<div>

<label
for="password"
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
Password
</label>

<input
id="password"
type="password"
autocomplete="current-password"
enterkeyhint="go"
placeholder="Your password"
class="
input-light
"
required
>

</div>

<!-- PHASE 11 — secure account recovery entry
     point. Same link styling as the existing
     "Create Account" footer link. -->

<div class="flex justify-end">

<a
href="/forgot-password"
data-link
class="
text-[12px]
font-bold
text-[#0A58FF]
hover:text-[#E48A2F]
transition-colors
"
>
Forgot password?
</a>

</div>

<button
id="loginBtn"
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
Login
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

New to Helpufin Auto?

<a
href="/signup"
data-link
class="
font-bold
text-[#0A58FF]
hover:text-[#E48A2F]
transition-colors
"
>
Create Account
</a>

</p>

</div>

</section>

</div>

</div>

`;

}

function initLogin(){

  const form =
document.getElementById(
"loginForm"
);

if(!form || form.dataset.bound){
return;
}

form.dataset.bound = "true";

/* Duplicate-action guard. Only ONE login
   request can ever be in flight. The shared
   HUFA auth loading overlay covers the real
   auth operation while it is in progress. */

let loginInProgress = false;

form.addEventListener("submit", async (e)=>{
    e.preventDefault();

    if(loginInProgress){
      return;
    }

    loginInProgress = true;

    showAuthLoading("Logging you in...");

    try{

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if(error){
      /* PHASE 4 — event-level log only. The raw
         Supabase auth error object is never
         exposed in the console or to the user. */
      console.error("LOGIN FAILED [auth]");
      hideAuthLoading();
      loginInProgress = false;
      toast(describeAuthError(error, "login"));
      return;
    }

    if(!data.session){
      hideAuthLoading();
      loginInProgress = false;
      toast("Login failed. Please try again.");
      return;
    }

    /* PHASE 3 — MFA: for accounts with a VERIFIED
       authenticator factor, the password alone is
       not enough. Supabase's assurance level is
       the source of truth — aal1 → aal2 means the
       second factor is still owed, so the normal
       dashboard hand-off is replaced by the
       dedicated verification page. Users WITHOUT
       MFA never enter this branch and keep the
       existing flow unchanged. */

    if(await needsMfaVerification()){
      loginInProgress = false;
      await navigate("/mfa-verify");
      hideAuthLoading();
      return;
    }

const profile = await getUserProfile();

window.dispatchEvent(
  new CustomEvent("authChanged")
);

if(profile?.role === "admin"){

  await navigate("/admin");

  hideAuthLoading();

}else{

  await navigate("/dashboard");

  hideAuthLoading();

}

    }catch(err){

      /* PHASE 4 — event-level log only. */
      console.error("LOGIN FAILED [unexpected]");
      hideAuthLoading();
      loginInProgress = false;
      toast("Login failed. Please try again.");
      return;

    }

loginInProgress = false;

  });

}
