import { supabase, describeAuthError } from "../js/api.js";
import { navigate } from "../js/router.js";
import { toast } from "../js/ui.js";
import {
  PHASE2_SOCIAL_PLATFORMS,
  normalizeEditSocialValue
} from "../js/socialProfile.js";
import {
  validateImageFile
} from "../js/fileValidation.js";
import {
  bindPasswordRequirements,
  buildPasswordRequirementsMessage,
  getUnmetPasswordRequirements,
  renderPasswordRequirements
} from "../js/passwordPolicy.js";
import { showWelcomeScreen } from "../components/welcomeScreen.js";

/* PHASE 7 — Profile card avatar state. Reuses the
   SAME validation rules, "profile-images" bucket,
   per-user path convention and avatar_url field as
   the dashboard Edit Profile system. No new storage. */

const SIGNUP_AVATAR_TYPES =
[
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
];

const SIGNUP_AVATAR_MAX_SIZE =
5 * 1024 * 1024;

let signupAvatarFile = null;

function computeSignupAvatarInitials(){

const first =
document.getElementById("name")?.value.trim() || "";

const surname =
document.getElementById("surname")?.value.trim() || "";

const a = first.charAt(0);
const b = surname.charAt(0);

return (
  (a + b)
).toUpperCase() || "HU";

}

function renderSignupAvatarPreview(photoUrl){

const box =
document.getElementById("signupAvatarPreview");

if(!box){
return;
}

const removeBtn =
document.getElementById("signupAvatarRemove");

if(photoUrl){

box.classList.add("has-photo");

box.innerHTML =
`<img
src="${photoUrl}"
alt="Profile photo preview"
class="absolute inset-0 w-full h-full object-cover"
>`;

if(removeBtn){
removeBtn.classList.remove("hidden");
}

}else{

box.classList.remove("has-photo");

box.textContent =
computeSignupAvatarInitials();

if(removeBtn){
removeBtn.classList.add("hidden");
}

}

}

window.onSignupAvatarSelected =
async function(input){

const file =
input?.files?.[0];

if(!file){
return;
}

if(
!SIGNUP_AVATAR_TYPES.includes(
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
file.size > SIGNUP_AVATAR_MAX_SIZE
){

toast(
"Image must be smaller than 5MB"
);

input.value = "";

return;

}

/* Validate the ACTUAL file content, not just
   the browser-reported MIME type — same guard
   the dashboard avatar upload uses. */

const validation =
await validateImageFile(
file,
{
  maxSize: SIGNUP_AVATAR_MAX_SIZE,
  allowedTypes: SIGNUP_AVATAR_TYPES
}
);

if(!validation.ok){

toast(validation.error);

input.value = "";

return;

}

signupAvatarFile = file;

const reader =
new FileReader();

reader.onload = function(ev){

renderSignupAvatarPreview(
ev.target.result
);

};

reader.readAsDataURL(file);

/* Allow re-selecting the same file later */
input.value = "";

};

window.removeSignupAvatarPhoto =
function(){

signupAvatarFile = null;

renderSignupAvatarPreview(null);

};

function bindSignupAvatar(){

const chooseBtn =
document.getElementById("signupAvatarChoose");

const input =
document.getElementById("signupAvatarInput");

const removeBtn =
document.getElementById("signupAvatarRemove");

if(
chooseBtn &&
!chooseBtn.dataset.bound
){

chooseBtn.dataset.bound = "true";

chooseBtn.addEventListener(
"click",
() => input?.click()
);

}

if(
input &&
!input.dataset.bound
){

input.dataset.bound = "true";

input.addEventListener(
"change",
() => onSignupAvatarSelected(input)
);

}

if(
removeBtn &&
!removeBtn.dataset.bound
){

removeBtn.dataset.bound = "true";

removeBtn.addEventListener(
"click",
() => removeSignupAvatarPhoto()
);

}

/* Initials fallback follows the name fields */
["name","surname"].forEach((id) => {

const el =
document.getElementById(id);

if(
el &&
!el.dataset.avatarBound
){

el.dataset.avatarBound = "true";

el.addEventListener(
"input",
() => {

if(
!signupAvatarFile
){

renderSignupAvatarPreview(null);

}

}
);

}

});

renderSignupAvatarPreview(null);

}

export function SignupPage(){

setTimeout(initSignup, 0);

return `

<div class="
signup-page
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
max-w-2xl
mx-auto
">

<!-- ==============================================
SIGNUP HEADER
============================================== -->
<div class="
signup-page-header
text-center mb-8 md:mb-10">

<div class="
signup-eyebrow
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
Create Account
<span class="w-8 h-[2px] rounded-full bg-[#E48A2F]"></span>
</div>

<h1 class="
signup-heading
text-3xl
md:text-4xl
font-black
tracking-[-0.04em]
text-[#08111F]
">
Join Helpufin Auto
</h1>

<p class="
signup-sub
text-[#64748B]
mt-3
text-[15px]
md:text-base
">
Set up your marketplace account in a few steps.
</p>

</div>

<!-- ==============================================
ACCOUNT INFORMATION — CARD 1
(hufa-page-heading style: white card, navy title,
orange accent bar, HUFA border + shadow language)
============================================== -->
<section
aria-labelledby="accountInfoHeading"
class="
hufa-form
signup-card
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
block
w-10
h-[3px]
rounded-full
bg-[#E48A2F]
mb-3
"></span>

<h2
id="accountInfoHeading"
class="
text-lg
md:text-xl
font-extrabold
tracking-[-0.02em]
text-[#0A192F]
"
>
Account Information
</h2>

<p class="
text-[13px]
text-[#64748B]
mt-1.5
leading-relaxed
">
Tell us who you are and how you want to sell on the marketplace.
</p>

</div>

<form
id="signupForm"
class="space-y-5"
novalidate
>

<div class="grid md:grid-cols-2 gap-4 md:gap-5">

<div>

<label
for="name"
class="
block
text-[12px]
font-bold
uppercase
tracking-[0.08em]
text-[#0A192F]
mb-1.5
"
>
First Name
</label>

<input
id="name"
type="text"
autocomplete="given-name"
placeholder="Your first name"
class="
input-light
"
required
>

</div>

<div>

<label
for="surname"
class="
block
text-[12px]
font-bold
uppercase
tracking-[0.08em]
text-[#0A192F]
mb-1.5
"
>
Surname
</label>

<input
id="surname"
type="text"
autocomplete="family-name"
placeholder="Your surname"
class="
input-light
"
required
>

</div>

</div>

<div>

<label
for="email"
class="
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
autocomplete="new-password"
enterkeyhint="next"
placeholder="Create a strong password"
class="
input-light
"
required
>

<!-- PHASE 12 — live password requirements
     (shared policy with /reset-password) -->
${renderPasswordRequirements("signupPasswordRequirements")}

</div>

<div>

<label
for="passwordConfirm"
class="
block
text-[12px]
font-bold
uppercase
tracking-[0.08em]
text-[#0A192F]
mb-1.5
"
>
Confirm Password
</label>

<input
id="passwordConfirm"
type="password"
autocomplete="new-password"
enterkeyhint="go"
placeholder="Re-enter your password"
class="
input-light
"
required
>

</div>

<!-- ==============================================
ACCOUNT TYPE
============================================== -->
<div>

<span
class="
block
text-[12px]
font-bold
uppercase
tracking-[0.08em]
text-[#0A192F]
mb-2
"
>
Account Type
</span>

<select
id="accountType"
class="
input-light
"
required
>
<option value="private">Private Seller</option>
<option value="dealer">Dealership</option>
</select>

</div>

<div id="dealerWrap" class="hidden space-y-5">

<input
id="dealership"
placeholder="Dealership Name"
class="input-light"
>

<input
id="dealerEmail"
type="email"
placeholder="Dealership Email (optional)"
class="input-light"
>

<input
id="dealerPhone"
type="tel"
placeholder="Dealership Phone Number (optional)"
class="input-light"
>

<input
id="dealerAddress"
placeholder="Dealership Address (optional)"
class="input-light"
>

<label
for="dealerProvince"
class="
block
text-[12px]
font-bold
uppercase
tracking-[0.08em]
text-[#0A192F]
mb-1.5
"
>
Province
</label>
<select
id="dealerProvince"
class="input-light"
>
<option value="">Select a province…</option>
<option value="Gauteng">Gauteng</option>
<option value="Western Cape">Western Cape</option>
<option value="KwaZulu-Natal">KwaZulu-Natal</option>
<option value="Eastern Cape">Eastern Cape</option>
<option value="Free State">Free State</option>
<option value="Limpopo">Limpopo</option>
<option value="Mpumalanga">Mpumalanga</option>
<option value="North West">North West</option>
<option value="Northern Cape">Northern Cape</option>
</select>

</div>

<!--
SUBSCRIPTION SYSTEM DISABLED

<select
id="subscription"
class="input-light"
required
>
</select>
-->

</form>

</section>

<!-- ==============================================
CONTACT INFORMATION — CARD 2
(All fields optional)
============================================== -->
<section
aria-labelledby="contactInfoHeading"
class="
hufa-form
signup-card
mt-6
rounded-[24px]
bg-white
border
border-[#0A192F]/10
shadow-[0_18px_50px_rgba(10,25,47,0.08)]
p-6
md:p-8
">

<div class="mb-6">

<span class="
hufa-page-heading-accent
block
w-10
h-[3px]
rounded-full
bg-[#E48A2F]
mb-3
"></span>

<div class="flex flex-wrap items-center gap-2 md:gap-3">

<h2
id="contactInfoHeading"
class="
text-lg
md:text-xl
font-extrabold
tracking-[-0.02em]
text-[#0A192F]
"
>
Contact Information
</h2>

<span class="
inline-flex
items-center
rounded-full
border
border-[#E48A2F]/30
bg-[#E48A2F]/10
text-[#B4661A]
text-[10px]
font-bold
uppercase
tracking-[0.14em]
px-3
py-1
"
>
Optional
</span>

</div>

<p class="
text-[13px]
text-[#64748B]
mt-1.5
leading-relaxed
">
These details help buyers reach you. You can leave them blank — you can add them later in your dashboard.
</p>

</div>

<div class="space-y-5">

<div>

<label
for="mobileNumber"
class="
block
text-[12px]
font-bold
uppercase
tracking-[0.08em]
text-[#0A192F]
mb-1.5
"
>
Mobile Number
<span class="
normal-case
font-semibold
text-[#94A3B8]
tracking-normal
"
>
&nbsp;· optional
</span>
</label>

<input
id="mobileNumber"
type="tel"
autocomplete="tel"
inputmode="tel"
placeholder="+27 00 000 0000"
class="input-light"
>

</div>

<div>

<label
for="whatsappNumber"
class="
block
text-[12px]
font-bold
uppercase
tracking-[0.08em]
text-[#0A192F]
mb-1.5
"
>
WhatsApp Number
<span class="
normal-case
font-semibold
text-[#94A3B8]
tracking-normal
"
>
&nbsp;· optional
</span>
</label>

<input
id="whatsappNumber"
type="tel"
autocomplete="tel"
inputmode="tel"
placeholder="+27 00 000 0000"
class="input-light"
>

</div>

<div>

<label
for="altContactNumber"
class="
block
text-[12px]
font-bold
uppercase
tracking-[0.08em]
text-[#0A192F]
mb-1.5
"
>
Alternative Contact Number
<span class="
normal-case
font-semibold
text-[#94A3B8]
tracking-normal
"
>
&nbsp;· optional
</span>
</label>

<input
id="altContactNumber"
type="tel"
autocomplete="tel"
inputmode="tel"
placeholder="+27 00 000 0000"
class="input-light"
>

</div>

</div>

</section>
<!-- ==============================================
PROFILE — CARD 3
(All fields optional)
============================================== -->
<section
aria-labelledby="profileHeading"
class="
hufa-form
signup-card
mt-6
rounded-[24px]
bg-white
border
border-[#0A192F]/10
shadow-[0_18px_50px_rgba(10,25,47,0.08)]
p-6
md:p-8
">

<div class="mb-6">

<span class="
hufa-page-heading-accent
block
w-10
h-[3px]
rounded-full
bg-[#E48A2F]
mb-3
"></span>

<div class="flex flex-wrap items-center gap-2 md:gap-3">

<h2
id="profileHeading"
class="
text-lg
md:text-xl
font-extrabold
tracking-[-0.02em]
text-[#0A192F]
"
>
Profile
</h2>

<span class="
inline-flex
items-center
rounded-full
border
border-[#E48A2F]/30
bg-[#E48A2F]/10
text-[#B4661A]
text-[10px]
font-bold
uppercase
tracking-[0.14em]
px-3
py-1
"
>
Optional
</span>

</div>

<p class="
text-[13px]
text-[#64748B]
mt-1.5
leading-relaxed
">
Tell buyers a little about yourself. Everything here is optional — you can update it any time in your dashboard.
</p>

</div>

<div class="space-y-5">

<!-- PROFILE PICTURE — same circular avatar
     treatment as the dashboard Edit Profile
     modal (initials fallback + photo fill) -->

<div class="
flex
flex-col
sm:flex-row
sm:items-center
gap-4
sm:gap-5
">

<div
id="signupAvatarPreview"
class="
edit-profile-avatar-preview
relative
flex
items-center
justify-center
rounded-full
overflow-hidden
shrink-0
select-none
w-20
h-20
sm:w-24
sm:h-24
bg-[linear-gradient(135deg,#08111F,#13233D)]
text-white
text-xl
sm:text-2xl
font-black
tracking-[0.02em]
"
aria-live="polite"
>
</div>

<div class="flex flex-col gap-2">

<div class="flex flex-wrap gap-2.5">

<button
type="button"
id="signupAvatarChoose"
class="
rounded-xl
bg-[#005BBF]
hover:bg-[#004FA8]
text-white
text-[13px]
font-bold
px-4
py-2.5
transition-all
duration-300
hover:-translate-y-[1px]
shadow-[0_10px_25px_rgba(10,25,47,0.18)]
"
>
Choose Photo
</button>

<button
type="button"
id="signupAvatarRemove"
class="
hidden
rounded-xl
border
border-[#0A192F]/15
bg-white
text-[#0A192F]
text-[13px]
font-bold
px-4
py-2.5
transition-all
duration-300
hover:bg-[#f1f5f9]
"
>
Remove Photo
</button>

<input
id="signupAvatarInput"
type="file"
accept="image/jpeg,image/jpg,image/png,image/webp"
class="hidden"
>

</div>

<p class="
text-[11px]
text-[#94A3B8]
leading-relaxed
">
JPG, PNG or WEBP · up to 5MB
</p>

</div>

</div>

<!-- BIO / ABOUT -->

<div>

<label
for="profileBio"
class="
block
text-[12px]
font-bold
uppercase
tracking-[0.08em]
text-[#0A192F]
mb-1.5
"
>
Bio / About
<span class="
normal-case
font-semibold
text-[#94A3B8]
tracking-normal
"
>
&nbsp;· optional
</span>
</label>

<textarea
id="profileBio"
rows="4"
maxlength="1000"
placeholder="Tell buyers about yourself or your dealership…"
class="input-light resize-y"
></textarea>

</div>

<!-- LOCATION / CITY -->

<div class="
grid
grid-cols-1
md:grid-cols-2
gap-5
">

<div>

<label
for="profileLocation"
class="
block
text-[12px]
font-bold
uppercase
tracking-[0.08em]
text-[#0A192F]
mb-1.5
"
>
Location
<span class="
normal-case
font-semibold
text-[#94A3B8]
tracking-normal
"
>
&nbsp;· optional
</span>
</label>

<input
id="profileLocation"
type="text"
autocomplete="street-address"
placeholder="e.g. 12 Main Road, Randburg"
class="input-light"
>

</div>

<div>

<label
for="profileCity"
class="
block
text-[12px]
font-bold
uppercase
tracking-[0.08em]
text-[#0A192F]
mb-1.5
"
>
City
<span class="
normal-case
font-semibold
text-[#94A3B8]
tracking-normal
"
>
&nbsp;· optional
</span>
</label>

<input
id="profileCity"
type="text"
autocomplete="address-level2"
placeholder="e.g. Johannesburg"
class="input-light"
>

</div>

</div>

<!-- PROVINCE / WEBSITE -->

<div class="
grid
grid-cols-1
md:grid-cols-2
gap-5
">

<div>

<label
for="profileProvince"
class="
block
text-[12px]
font-bold
uppercase
tracking-[0.08em]
text-[#0A192F]
mb-1.5
"
>
Province
<span class="
normal-case
font-semibold
text-[#94A3B8]
tracking-normal
"
>
&nbsp;· optional
</span>
</label>

<select
id="profileProvince"
class="input-light"
>

<option value="">Select a province…</option>

<option value="Eastern Cape">Eastern Cape</option>
<option value="Free State">Free State</option>
<option value="Gauteng">Gauteng</option>
<option value="KwaZulu-Natal">KwaZulu-Natal</option>
<option value="Limpopo">Limpopo</option>
<option value="Mpumalanga">Mpumalanga</option>
<option value="North West">North West</option>
<option value="Northern Cape">Northern Cape</option>
<option value="Western Cape">Western Cape</option>

</select>

</div>

<div>

<label
for="profileWebsite"
class="
block
text-[12px]
font-bold
uppercase
tracking-[0.08em]
text-[#0A192F]
mb-1.5
"
>
Website
<span class="
normal-case
font-semibold
text-[#94A3B8]
tracking-normal
"
>
&nbsp;· optional
</span>
</label>

<input
id="profileWebsite"
type="url"
inputmode="url"
autocomplete="url"
placeholder="https://www.example.co.za"
class="input-light"
>

</div>

</div>

</div>

</section>

<!-- ==============================================
SOCIAL PROFILES — CARD 4
(All fields optional, all account types)
Reuses the SHARED social platform system — the
chips and inputs are rendered by initSignup from
PHASE2_SOCIAL_PLATFORMS into these containers.
============================================== -->
<section
id="signupSocialBox"
aria-labelledby="socialHeading"
class="
hufa-form
signup-card
mt-6
rounded-[24px]
bg-white
border
border-[#0A192F]/10
shadow-[0_18px_50px_rgba(10,25,47,0.08)]
p-6
md:p-8
">

<div class="mb-6">

<span class="
hufa-page-heading-accent
block
w-10
h-[3px]
rounded-full
bg-[#E48A2F]
mb-3
"></span>

<div class="flex flex-wrap items-center gap-2 md:gap-3">

<h2
id="socialHeading"
class="
text-lg
md:text-xl
font-extrabold
tracking-[-0.02em]
text-[#0A192F]
"
>
Social Profiles
</h2>

<span class="
inline-flex
items-center
rounded-full
border
border-[#E48A2F]/30
bg-[#E48A2F]/10
text-[#B4661A]
text-[10px]
font-bold
uppercase
tracking-[0.14em]
px-3
py-1
"
>
Optional
</span>

</div>

<p class="
text-[13px]
text-[#64748B]
mt-1.5
leading-relaxed
">
Tap a platform to add its link. Everything is optional — leave any platform blank to skip it.
</p>

</div>

<div id="signupSocialChips" class="flex flex-wrap gap-2 mb-4"></div>

<div id="signupSocialInputs" class="space-y-3"></div>

</section>

<!-- ==============================================
LAUNCH PROMOTION — CARD 5
(The package assigned to the account — already
selected, based on Account Type. No old packages
are offered.)
============================================== -->
<section
aria-labelledby="launchHeading"
class="
signup-card
signup-launch
mt-6
rounded-[24px]
bg-white
border-2
border-[#E48A2F]
shadow-[0_18px_50px_rgba(228,138,47,0.18)]
p-6
md:p-8
relative
overflow-hidden
">

<span
aria-hidden="true"
class="
absolute
top-0
left-0
right-0
h-1.5
bg-[#E48A2F]
"
></span>

<div class="mb-6">

<span class="
hufa-page-heading-accent
block
w-10
h-[3px]
rounded-full
bg-[#E48A2F]
mb-3
"></span>

<div class="flex flex-wrap items-center gap-2 md:gap-3">

<h2
id="launchHeading"
class="
text-lg
md:text-xl
font-extrabold
tracking-[-0.02em]
text-[#0A192F]
"
>
Launch Promotion
</h2>

<span class="
inline-flex
items-center
gap-1.5
rounded-full
bg-[#E48A2F]
text-white
text-[10px]
font-bold
uppercase
tracking-[0.14em]
px-3
py-1
shadow-[0_6px_16px_rgba(228,138,47,0.4)]
"
>
<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="w-3 h-3"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
Selected
</span>

</div>

<p class="
text-[13px]
text-[#64748B]
mt-1.5
leading-relaxed
">
Your account includes our launch offer — automatically applied, nothing to choose.
</p>

</div>

<!-- PRIVATE SELLER LIMITS -->

<div
id="launchPrivateBlock"
class="
rounded-2xl
border
border-[#0A192F]/10
bg-[#f8fafc]
p-4
md:p-5
"
>

<p class="
text-[11px]
font-bold
uppercase
tracking-[0.14em]
text-[#64748B]
mb-3
"
>
Private Seller · Included
</p>

<ul class="space-y-2.5 text-[14px] text-[#08111F] font-semibold">

<li class="flex items-center gap-2.5">
<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="w-[18px] h-[18px] shrink-0 text-[#E48A2F]"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
5 vehicle listings
</li>

<li class="flex items-center gap-2.5">
<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="w-[18px] h-[18px] shrink-0 text-[#E48A2F]"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
2 featured listings
</li>

</ul>

</div>

<!-- DEALERSHIP LIMITS -->

<div
id="launchDealerBlock"
class="
hidden
rounded-2xl
border
border-[#0A192F]/10
bg-[#f8fafc]
p-4
md:p-5
"
>

<p class="
text-[11px]
font-bold
uppercase
tracking-[0.14em]
text-[#64748B]
mb-3
"
>
Dealership · Included
</p>

<ul class="space-y-2.5 text-[14px] text-[#08111F] font-semibold">

<li class="flex items-center gap-2.5">
<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="w-[18px] h-[18px] shrink-0 text-[#E48A2F]"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
50 vehicle listings
</li>

<li class="flex items-center gap-2.5">
<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="w-[18px] h-[18px] shrink-0 text-[#E48A2F]"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
15 featured listings
</li>

</ul>

</div>

<!-- FINAL SUBMIT — associated with the signup
     form above via the form attribute -->

<button
id="signupBtn"
type="submit"
form="signupForm"
class="
signup-submit
mt-6
w-full
rounded-2xl
bg-[#005BBF]
hover:bg-[#004FA8]
text-white
py-4
font-bold
transition-all
duration-300
hover:-translate-y-[2px]
shadow-[0_14px_35px_rgba(10,25,47,0.18)]
"
>
Create Account
</button>

<p class="
signup-terms
text-center
text-[#94A3B8]
mt-3
"
>
By creating an account you agree to the Helpufin Auto terms of use.
</p>

</section>

</div>

</div>

`;

}

function initSignup(){

const form =
document.getElementById(
"signupForm"
);

if(!form || form.dataset.bound){
return;
}

form.dataset.bound = "true";

/* PRIVATE SELLER PACKAGE FLOW — when the user picks the
   Launch Promotion package on /sell/private, they arrive at
   /signup?account=private. Pre-select the Private Seller
   account type (the dropdown still allows switching to
   Dealership). Direct visits without the param are unchanged. */
const presetAccount =
new URLSearchParams(
window.location.search
).get("account");

/* PHASE 7 — wire the Profile card avatar */
bindSignupAvatar();

/* PHASE 12 — live password requirement
   indicators (shared password policy). */
bindPasswordRequirements(
  document.getElementById("password"),
  document.getElementById(
    "signupPasswordRequirements"
  )
);

const accountType =
document.getElementById("accountType");

if(
presetAccount === "private" ||
presetAccount === "dealer"
){
accountType.value = presetAccount;
}

const dealerWrap =
document.getElementById("dealerWrap");
const signupSocialBox =
document.getElementById("signupSocialBox");

/*
SUBSCRIPTION SYSTEM DISABLED

const subscription =
document.getElementById("subscription");
*/

function updatePlans(){

const type = accountType.value;

dealerWrap.classList.toggle(
"hidden",
type !== "dealer"
);

/* PHASE 9 — the Launch Promotion card shows the
   limits for the selected account type. */

const launchPrivateBlock =
document.getElementById("launchPrivateBlock");

const launchDealerBlock =
document.getElementById("launchDealerBlock");

if(launchPrivateBlock){
launchPrivateBlock.classList.toggle(
"hidden",
type === "dealer"
);
}

if(launchDealerBlock){
launchDealerBlock.classList.toggle(
"hidden",
type !== "dealer"
);
}

/* PHASE 8 — the Social Profiles card is now a
   separate section shown for ALL account types,
   so it is no longer toggled here. */

}

updatePlans();

accountType.addEventListener(
"change",
updatePlans
);

/* =========================================
PHASE 3 — DEALERSHIP SOCIAL MEDIA CHIPS
Built from the SHARED social platform
definitions (same icons/validation as the
Edit Profile modal). Inputs start hidden;
tapping a chip reveals it. All optional.
========================================= */

const chipsBox =
document.getElementById(
"signupSocialChips"
);

const inputsBox =
document.getElementById(
"signupSocialInputs"
);

if(chipsBox && inputsBox){

chipsBox.innerHTML =
PHASE2_SOCIAL_PLATFORMS.map(p => `
<button
type="button"
id="signupSocialChip-${p.id}"
data-platform="${p.id}"
title="${p.hint}"
aria-label="${p.label}"
class="
w-11
h-11
rounded-xl
flex
items-center
justify-center
border
border-gray-300
text-gray-500
hover:border-gray-400
hover:text-gray-700
transition
"
>
<span class="w-5 h-5 block">${p.icon}</span>
</button>
`).join("");

inputsBox.innerHTML =
PHASE2_SOCIAL_PLATFORMS.map(p => `
<div
id="signupSocialField-${p.id}"
class="hidden"
>

<label
for="signupSocialInput-${p.id}"
class="block text-xs font-semibold text-[#64748B] mb-1"
>
${p.label} · ${p.hint}
</label>

<input
id="signupSocialInput-${p.id}"
type="text"
maxlength="300"
placeholder="${p.placeholder}"
class="input-light"
/>

</div>
`).join("");

chipsBox.addEventListener(
"click",
(e)=>{

const chip =
e.target?.closest?.(
"[data-platform]"
);

if(!chip){
return;
}

const platform =
chip.dataset.platform;

const field =
document.getElementById(
`signupSocialField-${platform}`
);

if(!field){
return;
}

const isHidden =
field.classList.toggle("hidden");

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
);

}

form.addEventListener("submit", async (e)=>{

e.preventDefault();

const btn =
document.getElementById("signupBtn");

btn.disabled = true;
btn.innerHTML = "Creating Account...";

try{

const name =
document.getElementById("name")
.value
.trim();

const surname =
document.getElementById("surname")
.value
.trim();

const email =
document.getElementById("email")
.value
.trim()
.toLowerCase();

const password =
document.getElementById("password")
.value;

const account_type =
document.getElementById("accountType")
.value;

const dealership_name =
document.getElementById("dealership")
.value
.trim();

/* PHASE 3 — dealership contact + social
   fields (dealer accounts only; the inputs
   exist inside #dealerWrap). */

const dealerEmail =
document.getElementById("dealerEmail")
?.value?.trim() || "";

const dealerPhone =
document.getElementById("dealerPhone")
?.value?.trim() || "";

const dealerAddress =
document.getElementById("dealerAddress")
?.value?.trim() || "";

const dealerProvince =
document.getElementById("dealerProvince")
?.value?.trim() || "";

const socialLinks = {};

for(const p of PHASE2_SOCIAL_PLATFORMS){

const input =
document.getElementById(
`signupSocialInput-${p.id}`
);

socialLinks[p.id] =
input?.value?.trim() || "";

}

/* GET PLAN — Launch Promotion is the only
   package available during signup. Old
   packages are not offered, so the plan is
   always set to Launch Promotion. */
const plan = "Launch Promotion";

/* VALIDATION */

if(
!name ||
!surname ||
!email ||
!password
){
toast("Please complete all fields");
resetBtn();
return;
}

/* PHASE 12 — full password policy (the SAME
   rules as /reset-password; see
   js/passwordPolicy.js). Every rule must
   pass before Supabase Auth is called. */
const unmetPasswordRules =
getUnmetPasswordRequirements(password);

if(unmetPasswordRules.length > 0){
toast(buildPasswordRequirementsMessage(password));
resetBtn();
return;
}

/* PHASE 5 — confirm password must match */
const passwordConfirm =
document.getElementById("passwordConfirm")
?.value || "";

if(passwordConfirm !== password){
toast("Passwords do not match");
resetBtn();
return;
}

if(
account_type === "dealer" &&
!dealership_name
){
toast("Enter dealership name");
resetBtn();
return;
}

/* PHASE 3 — validate the optional dealership
   contact fields (dealer accounts only). */

let normalizedSocialLinks = null;

if(account_type === "dealer"){

if(
dealerEmail &&
!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dealerEmail)
){
toast("Please enter a valid dealership email address");
resetBtn();
return;
}

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
toast("Please enter a valid dealership phone number (7–15 digits)");
resetBtn();
return;
}

}

}

/* PHASE 8 — social links are optional for ALL
   account types now (the Social Profiles card
   is shown to everyone), so normalization runs
   for every signup. Blank platforms are simply
   omitted. */

normalizedSocialLinks = {};

for(const p of PHASE2_SOCIAL_PLATFORMS){

const result =
normalizeEditSocialValue(
p.id,
socialLinks[p.id]
);

if(!result.ok){

toast(result.error);

resetBtn();

return;

}

if(result.value){
normalizedSocialLinks[p.id] = result.value;
}

}

/*
PACKAGE VALIDATION DISABLED

if(!plan){
toast("Select a package");
resetBtn();
return;
}
*/

/* GET PLAN */

/*
SUBSCRIPTION LOOKUP DISABLED

const {
data:planData,
error:planError
} = await supabase
.from("subscriptions")
.select("id,name")
.eq("name", plan)
.maybeSingle();
*/

const planData = null;

/* CREATE USER */

const {
data,
error
} = await supabase.auth.signUp({

email,
password,

options:{
data:{

name,
surname,

account_type:

account_type === "dealer"
? "dealer"
: "private",

dealership_name:

account_type === "dealer"
? dealership_name
: null,

/* PHASE 3 — dealership contact + social
   data travels through the EXISTING auth
   user_metadata → profiles fallback path
   (api.js getUserProfile). Private sellers
   carry nulls only. */

dealership_email:

account_type === "dealer"
? dealerEmail || null
: null,

phone:

account_type === "dealer"
? dealerPhone || null
: null,

dealership_address:

account_type === "dealer"
? dealerAddress || null
: null,

social_links:

/* PHASE 8 — social links apply to ALL account
   types (private sellers included). */

(normalizedSocialLinks || {}),

/* PHASE 6 — optional contact information
   for ALL account types. Read from the new
   Contact Information card; blank fields are
   stored as null. */

mobile_number:
document.getElementById("mobileNumber")?.value.trim() || null,

whatsapp_number:
document.getElementById("whatsappNumber")?.value.trim() || null,

alternative_contact:
document.getElementById("altContactNumber")?.value.trim() || null,

/* PHASE 7 — optional profile information for ALL
   account types. Read from the new Profile card;
   blank fields are stored as null. These travel
   through the EXISTING metadata → profiles path
   (api.js getUserProfile fallback). */

bio:
document.getElementById("profileBio")?.value.trim() || null,

location:
document.getElementById("profileLocation")?.value.trim() || null,

city:
document.getElementById("profileCity")?.value.trim() || null,

province:
account_type === "dealer"
? dealerProvince || null
: document.getElementById("profileProvince")?.value || null,

website:
document.getElementById("profileWebsite")?.value.trim() || null,

/* PHASE 4 — Launch Promotion is the only
   package available during registration, so
   every new account is tagged with it. */
selected_plan: "Launch Promotion"

}
}

});

if(error){

/* PHASE 4 — security-safe message only. Raw
   Supabase auth internals are never shown. */
toast(describeAuthError(error, "signup"));
resetBtn();
return;

}

const user =
data?.user;

if(!user){

toast("Account created. Check your email.");
resetBtn();
return;

}

/* PHASE 7 — profile photo upload. Reuses the
   EXISTING "profile-images" bucket, the SAME
   `${user.id}/avatar-${Date.now()}.${ext}` path
   convention as the dashboard Edit Profile
   system, and the SAME avatar_url field (carried
   via user_metadata so the existing api.js
   profile fallback persists it). Never blocks
   account creation — any storage/auth hiccup is
   logged and skipped (the user can still upload
   from the dashboard). */

if(
signupAvatarFile &&
data?.session
){

try{

const extension =
(
  signupAvatarFile.name
    .split(".")
    .pop() || "jpg"
)
.toLowerCase()
.replace(/[^a-z0-9]/g, "") || "jpg";

const filePath =
`${user.id}/avatar-${Date.now()}.${extension}`;

const { error:uploadError } =
await supabase.storage
.from("profile-images")
.upload(
filePath,
signupAvatarFile,
{
  cacheControl: "3600",
  upsert: false
}
);

if(!uploadError){

const { data:urlData } =
supabase.storage
.from("profile-images")
.getPublicUrl(filePath);

const publicUrl =
urlData?.publicUrl || null;

if(publicUrl){

await supabase.auth.updateUser(
{
  data:{
    avatar_url: publicUrl
  }
}
);

}

}else{

console.warn(
"Profile photo upload skipped:",
uploadError.message
);

}

}catch(avatarErr){

console.warn(
"Profile photo upload skipped:",
avatarErr
);

}

signupAvatarFile = null;

}

/*
PROFILE CREATION DISABLED

Profiles are created after authentication
through existing api.js fallback logic.

const {
error:profileError
} = await supabase
.from("profiles")
.insert(...);
*/

/* SUCCESS */

document.getElementById("signupForm").innerHTML = `

<div class="
rounded-[28px]
border
border-emerald-200
bg-emerald-50
p-8
text-center
">

<h2 class="
text-2xl
font-black
text-emerald-700
mb-3
">
Check Your Email
</h2>

<p class="
text-emerald-600
leading-relaxed
">
Your account has been created successfully.

Please verify your email before logging in.
</p>

</div>

`;

/* POST-SIGNUP WELCOME — shown only after the account
   was genuinely created. The full-screen /assets/welcome.png
   artwork (logo, heading and tagline already embedded)
   fades in over the success state, holds briefly, then
   fades out to reveal the existing "Check Your Email"
   panel underneath. No routing, Supabase or email
   confirmation behavior changes. */

showWelcomeScreen();

}catch(err){

/* PHASE 4 — event-level log only. The raw
   exception object (may embed auth payloads)
   is never written to the console. */
console.error("SIGNUP FAILED [unexpected]");

toast("Signup failed");

resetBtn();

}

function resetBtn(){

btn.disabled = false;

btn.innerHTML =
"Create Account";

}

});

}