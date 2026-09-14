import {
supabase,
getAuthUser,
getUserProfile,
clearAuthCache
} from "../js/api.js";
import { navigate } from "../js/router.js";
import { toast } from "../js/ui.js";
import {
renderDashboardShell,
renderDashboardPageHeading,
hydrateDashboardProfile
} from "./dashboard.js";
import {
PHASE2_SOCIAL_PLATFORMS,
normalizeEditSocialValue
} from "../js/socialProfile.js";

/* ============================================================
   PHASE 3 — DEALER DASHBOARD: EDIT DEALERSHIP PAGE
   ------------------------------------------------------------
   PUBLIC ROUTE: /dashboard/dealership
   (auth-protected by the router's existing "/dashboard/..."
   rule; DEALER-ONLY enforcement lives in this page itself).

   • Only account_type === "dealer" may open or save this page.
     Private sellers are redirected to /dashboard and can never
     call the save path (each save re-verifies the caller).
   • The update is ALWAYS scoped to the authenticated user's own
     profiles row (id = auth.uid()). No profile id is ever read
     from the URL, so no dealer can edit another dealership.
   • Fields (verified against the active database):
     dealership_name, dealership_logo, dealership_address,
     dealership_email, phone, social_links, province. The
     province column does NOT exist yet — it will be added by
     a separate database migration (profiles.province TEXT).
     The editor renders and updates it so the value is ready
     to persist once the migration is applied. No other schema
     changes.
   • Logo upload reuses the existing "profile-images" storage
     bucket (same conventions as the Edit Profile avatar flow).
   • Social links reuse js/socialProfile.js (PHASE2_SOCIAL_PLATFORMS
     + normalizeEditSocialValue) and flow straight through to the
     existing /dealership public storefront.
   • Reuses the shared dashboard shell so the page looks exactly
     like every other dashboard page.
   ============================================================ */

/* ---------------------------- */
/* MODULE STATE                 */
/* ---------------------------- */

let currentUser = null;
let currentProfile = null;

let pendingLogoFile = null;
let logoRemoveRequested = false;

let saving = false;

const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5 MB

/* ============================================================
   PAGE ENTRY — renders through the shared dashboard shell
   ============================================================ */

export function DashboardDealershipPage() {

setTimeout(init, 0);

return renderDashboardShell({
mobileTitle: "Edit Dealership Page",
content: `
<div class="container-main fade-in hufa-form max-w-5xl mx-auto space-y-8">

${renderDashboardPageHeading("dealershippage")}

<div id="ddeBox">

<div class="card p-8 mb-8 border border-slate-200 rounded-2xl shadow-sm bg-white">
<p class="mt-2 text-sm text-slate-500">Loading your dealership profile...</p>
</div>

</div>

</div>
`
});

}

/* ========================== */
/* INIT + DEALER GUARD        */
/* ========================== */

async function init() {

const user =
await getAuthUser();

if (!user) {
toast("Login required");
navigate("/login");
return;
}

const profile =
await getUserProfile();

/* DEALER-ONLY — a private seller (or missing profile) never
   sees the form and is sent back to their own dashboard. */
if (!profile || profile.account_type !== "dealer") {
toast("Dealership access required");
navigate("/dashboard");
return;
}

currentUser = user;
currentProfile = profile;
pendingLogoFile = null;
logoRemoveRequested = false;

const box =
document.getElementById("ddeBox");

if (box) {
box.innerHTML = renderForm(profile);
}

}

/* ========================== */
/* SMALL HELPERS              */
/* ========================== */

function escAttr(value) {
return String(value ?? "")
.replace(/&/g, "&amp;")
.replace(/"/g, "&quot;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;");
}

function socialValue(profile, id) {
const links = profile?.social_links;
if (!links || typeof links !== "object") return "";
return String(links[id] || "");
}

function currentLogo(profile) {
return (profile?.dealership_logo || "").trim();
}

/* ========================== */
/* FORM                        */
/* ========================== */

function renderForm(profile) {

const logoUrl = currentLogo(profile);

const socialInputs =
PHASE2_SOCIAL_PLATFORMS
.map((p) => `
<div class="dde-field">

<label
for="ddeSocial_${p.id}"
class="
block
text-sm
font-semibold
mb-1.5
"
>
${p.icon}
<span>${p.label}</span>
</label>

<input
id="ddeSocial_${p.id}"
type="text"
maxlength="300"
autocomplete="off"
placeholder="${escAttr(p.placeholder)}"
value="${escAttr(socialValue(profile, p.id))}"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
focus:outline-none
focus:border-[#3B82F6]
focus:ring-2
focus:ring-[#3B82F6]/20
transition
"
/>

<p class="dde-hint">${escAttr(p.hint)}</p>

</div>
`)
.join("");

return `

<!-- IDENTITY -->
<div class="card p-8 mb-8 border border-slate-200 rounded-2xl shadow-sm bg-white">

<p class="
uppercase
tracking-[0.18em]
text-[12px]
font-black
text-[#F28C28]
mb-2
">
Dealership Identity
</p>

<h2 class="text-[19px] lg:text-[22px] font-extrabold tracking-[-0.02em] leading-tight text-[#081120] mb-1">
Public name and logo
</h2>

<p class="text-[13px] text-slate-500 mb-6">
This is how your dealership appears on your public storefront and in the dealership directory.
</p>

<div class="space-y-5">

<div>
<label
for="ddeName"
class="
block
text-sm
font-semibold
mb-1.5
"
>
Dealership Name
</label>

<input
id="ddeName"
type="text"
maxlength="80"
autocomplete="organization"
placeholder="Your dealership name"
value="${escAttr(profile.dealership_name || "")}"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
focus:outline-none
focus:border-[#3B82F6]
focus:ring-2
focus:ring-[#3B82F6]/20
transition
"
/>
</div>

<div class="dde-logo-row">

<div>
<label
for="ddeLogoFile"
class="
block
text-sm
font-semibold
mb-1.5
"
>
Dealership Logo
</label>

<input
id="ddeLogoFile"
type="file"
accept="image/*"
class="
dde-file-input
w-full
border
border-gray-300
rounded-xl
px-4
py-3
focus:outline-none
focus:border-[#3B82F6]
focus:ring-2
focus:ring-[#3B82F6]/20
transition
"
onchange="ddeLogoChange(this)"
/>

<p class="dde-hint">
PNG or JPG, up to 5 MB. A broken or missing logo falls back to your dealership initials on the public page.
</p>

</div>

<div id="ddeLogoPreview" class="dde-logo-preview">
${logoUrl
? `<img
src="${escAttr(logoUrl)}"
alt="Dealership logo preview"
class="dde-logo-img"
onerror="this.style.display='none'"
>`
: `<span class="dde-logo-initials">${escAttr(initialsOf(profile.dealership_name || profile.name || "HU"))}</span>`}
</div>

</div>

<div style="margin-top:10px">
<button
type="button"
id="ddeLogoRemoveBtn"
class="dde-remove-btn"
onclick="ddeLogoRemove()"
${logoUrl ? "" : "hidden"}
>
Remove logo
</button>
</div>

<div class="dde-view-link">
<a href="javascript:void(0)" onclick="ddeViewStorefront()" class="text-[13px] font-semibold text-[#005BBF] hover:text-[#E48A2F] no-underline">
View your public storefront →
</a>
</div>

</div>

</div>

<!-- CONTACT & LOCATION -->
<div class="card p-8 mb-8 border border-slate-200 rounded-2xl shadow-sm bg-white">

<p class="
uppercase
tracking-[0.18em]
text-[12px]
font-black
text-[#F28C28]
mb-2
">
Contact &amp; Location
</p>

<h2 class="text-[19px] lg:text-[22px] font-extrabold tracking-[-0.02em] leading-tight text-[#081120] mb-1">
How buyers reach you
</h2>

<p class="text-[13px] text-slate-500 mb-6">
These show on your public storefront as call / email / directions actions.
</p>

<div class="dde-contact-grid">

<div>
<label
for="ddePhone"
class="
block
text-sm
font-semibold
mb-1.5
"
>
Phone
</label>
<input
id="ddePhone"
type="tel"
maxlength="20"
autocomplete="tel"
placeholder="e.g. 011 234 5678"
value="${escAttr(profile.phone || "")}"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
focus:outline-none
focus:border-[#3B82F6]
focus:ring-2
focus:ring-[#3B82F6]/20
transition
"
/>
</div>

<div>
<label
for="ddeEmail"
class="
block
text-sm
font-semibold
mb-1.5
"
>
Dealership Email
</label>
<input
id="ddeEmail"
type="email"
maxlength="120"
autocomplete="email"
placeholder="sales@yourdealership.co.za"
value="${escAttr(profile.dealership_email || "")}"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
focus:outline-none
focus:border-[#3B82F6]
focus:ring-2
focus:ring-[#3B82F6]/20
transition
"
/>
</div>

<div>
<label
for="ddeAddress"
class="
block
text-sm
font-semibold
mb-1.5
"
>
Dealership Address
</label>
<input
id="ddeAddress"
type="text"
maxlength="200"
autocomplete="street-address"
placeholder="Street, city, province"
value="${escAttr(profile.dealership_address || "")}"
class="
w-full
border
border-gray-300
rounded-xl
px-4
py-3
focus:outline-none
focus:border-[#3B82F6]
focus:ring-2
focus:ring-[#3B82F6]/20
transition
"
/>
</div>

<div>
<label
for="ddeProvince"
class="
block
text-sm
font-semibold
mb-1.5
"
>
Province
</label>
<select
id="ddeProvince"
class="premium-select w-full"
${profile.province ? "disabled" : ""}
>
<option value="">Select a province…</option>
<option value="Gauteng"${profile.province === "Gauteng" ? " selected" : ""}>Gauteng</option>
<option value="Western Cape"${profile.province === "Western Cape" ? " selected" : ""}>Western Cape</option>
<option value="KwaZulu-Natal"${profile.province === "KwaZulu-Natal" ? " selected" : ""}>KwaZulu-Natal</option>
<option value="Eastern Cape"${profile.province === "Eastern Cape" ? " selected" : ""}>Eastern Cape</option>
<option value="Free State"${profile.province === "Free State" ? " selected" : ""}>Free State</option>
<option value="Limpopo"${profile.province === "Limpopo" ? " selected" : ""}>Limpopo</option>
<option value="Mpumalanga"${profile.province === "Mpumalanga" ? " selected" : ""}>Mpumalanga</option>
<option value="North West"${profile.province === "North West" ? " selected" : ""}>North West</option>
<option value="Northern Cape"${profile.province === "Northern Cape" ? " selected" : ""}>Northern Cape</option>
</select>
${profile.province ? `<p class="mt-1.5 text-[11px] text-slate-500">Province can only be changed by an administrator.</p>` : ""}
</div>

</div>

</div>

<!-- SOCIAL -->
<div class="card p-8 mb-8 border border-slate-200 rounded-2xl shadow-sm bg-white">

<p class="
uppercase
tracking-[0.18em]
text-[12px]
font-black
text-[#F28C28]
mb-2
">
Social Media
</p>

<h2 class="text-[19px] lg:text-[22px] font-extrabold tracking-[-0.02em] leading-tight text-[#081120] mb-1">
Social links
</h2>

<p class="text-[13px] text-slate-500 mb-6">
These appear as icon buttons on your public storefront. Leave a platform empty to hide it. Only valid, real links are shown publicly.
</p>

<div class="dde-social-grid">
${socialInputs}
</div>

</div>

<!-- ACTIONS -->
<div class="card p-6 border border-slate-200 rounded-2xl shadow-sm bg-white">

<button
id="ddeSaveBtn"
type="button"
onclick="ddeSave()"
class="
inline-flex
h-12
items-center
justify-center
rounded-[14px]
bg-[#E48A2F]
px-8
text-[14px]
font-bold
text-white
transition
hover:bg-[#E48A2F]/90
"
>
Save Changes
</button>

</div>
`;
}

function initialsOf(name) {

const source = (name || "").trim();

if (!source) return "HU";

const words =
source.split(/\s+/).filter(Boolean);

if (!words.length) return "HU";

if (words.length === 1) {
return words[0].slice(0, 2).toUpperCase();
}

return (
words[0].charAt(0) +
words[1].charAt(0)
).toUpperCase();

}

/* ========================== */
/* LOGO HANDLERS              */
/* ========================== */

window.ddeLogoChange = function (input) {

const file =
input?.files?.[0];

if (!file) {
pendingLogoFile = null;
return;
}

if (!String(file.type || "").startsWith("image/")) {
toast("Please choose an image file (PNG or JPG)");
input.value = "";
return;
}

if (file.size > MAX_LOGO_BYTES) {
toast("Logo is too large — maximum 5 MB");
input.value = "";
return;
}

pendingLogoFile = file;
logoRemoveRequested = false;

/* Live preview — a broken object URL can never break the page. */
const url = URL.createObjectURL(file);

const preview =
document.getElementById("ddeLogoPreview");

if (preview) {
preview.innerHTML = `
<img
src="${escAttr(url)}"
alt="Dealership logo preview"
class="dde-logo-img"
>`;
}

const removeBtn =
document.getElementById("ddeLogoRemoveBtn");

if (removeBtn) {
removeBtn.hidden = true;
}

};

window.ddeLogoRemove = function () {

pendingLogoFile = null;
logoRemoveRequested = true;

const input =
document.getElementById("ddeLogoFile");

if (input) {
input.value = "";
}

const preview =
document.getElementById("ddeLogoPreview");

if (preview) {
preview.innerHTML =
`<span class="dde-logo-initials">${escAttr(initialsOf(currentProfile?.dealership_name || currentProfile?.name || "HU"))}</span>`;
}

const removeBtn =
document.getElementById("ddeLogoRemoveBtn");

if (removeBtn) {
removeBtn.hidden = true;
}

};

window.ddeViewStorefront = function () {
if (currentUser) {
navigate(`/dealership?id=${currentUser.id}`);
} else {
navigate("/dealerships");
}
};

/* ========================== */
/* DELETE OLD LOGO OBJECT     */
/* ========================== */

/* Mirrors the Edit Profile avatar cleanup: only ever touches the
   "profile-images" bucket path embedded in a public URL. */

async function removeLogoObject(logoUrl) {

const marker =
"/object/public/profile-images/";

const idx =
String(logoUrl || "").indexOf(marker);

if (idx === -1) {
return;
}

const path =
String(logoUrl).slice(idx + marker.length);

if (!path) {
return;
}

try {

await supabase.storage
.from("profile-images")
.remove([path]);

} catch (_) {
/* Best-effort cleanup only — a leftover logo object must never
   block the profile update. */

}

}

/* ========================== */
/* SAVE (scoped, dealer-only) */
/* ========================== */

window.ddeSave = async function () {

if (saving) {
return;
}

saving = true;

setSaveBusy(true);

try {

/* Defense in depth — re-verify the caller on EVERY save.
   No profile id is ever accepted from the URL, so a dealer
   can never edit another dealership. */
const user =
await getAuthUser();

if (!user) {
toast("Login required");
navigate("/login");
return;
}

const profile =
await getUserProfile();

if (!profile || profile.account_type !== "dealer") {
toast("Dealership access required");
navigate("/dashboard");
return;
}

currentUser = user;
currentProfile = profile;

/* --- VALIDATION (existing dashboard conventions) --- */

const name =
String(document.getElementById("ddeName")?.value || "").trim();

if (!name) {
toast("Please enter your dealership name");
return;
}

const phone =
String(document.getElementById("ddePhone")?.value || "").trim();

/* Digits, spaces, + ( ) - — the same tolerant shape the
   dashboard accepts. */
if (phone && !/^[0-9+\s\-()]{7,20}$/.test(phone)) {
toast("Please enter a valid phone number");
return;
}

const email =
String(document.getElementById("ddeEmail")?.value || "").trim();

if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
toast("Please enter a valid dealership email");
return;
}

const address =
String(document.getElementById("ddeAddress")?.value || "").trim();

/* Province lock: once established, the dropdown is disabled and
   the value must NOT change on save. Use the original profile
   province for locked dealers so a disabled/tampered dropdown
   cannot send a different value. The database trigger is the
   actual security enforcement. */
const provinceLocked =
!!currentProfile?.province;

const province =
provinceLocked
? String(currentProfile.province || "").trim()
: String(document.getElementById("ddeProvince")?.value || "").trim();

/* --- SOCIAL LINKS (js/socialProfile.js normalization) --- */

const socialNormalized = {};

for (const platform of PHASE2_SOCIAL_PLATFORMS) {

const raw =
String(
document.getElementById(`ddeSocial_${platform.id}`)?.value || ""
).trim();

if (!raw) {
continue;
}

const normalized =
normalizeEditSocialValue(platform.id, raw);

if (!normalized.ok) {
toast(normalized.error || `Please enter a valid ${platform.label} link`);
return;
}

socialNormalized[platform.id] = normalized.value;

}

/* --- BUILD UPDATES (own row only) --- */

const updates = {
dealership_name: name,
phone: phone || null,
dealership_email: email || null,
dealership_address: address || null,
province: province || null,
social_links: socialNormalized
};

/* --- LOGO --- */

const previousLogoUrl =
currentProfile?.dealership_logo || "";

if (logoRemoveRequested) {

updates.dealership_logo = null;

if (previousLogoUrl) {
await removeLogoObject(previousLogoUrl);
}

} else if (pendingLogoFile) {

const extension =
(
pendingLogoFile.name
.split(".")
.pop() || "jpg"
).toLowerCase();

const filePath =
`${user.id}/logo-${Date.now()}.${extension}`;

const { error: uploadError } =
await supabase.storage
.from("profile-images")
.upload(
filePath,
pendingLogoFile,
{
cacheControl: "3600",
upsert: false
}
);

if (uploadError) {

console.error(
"[DEALERSHIP PAGE] Logo upload failed — Supabase Storage error:",
{
message: uploadError.message || String(uploadError),
statusCode: uploadError.statusCode ?? uploadError.status ?? null,
error: uploadError.error ?? uploadError.name ?? null,
bucket: "profile-images",
path: filePath,
hint: "Application expects a PUBLIC 'profile-images' bucket with Storage RLS allowing authenticated users to write under their own folder (first path segment = auth.uid())."
}
);

toast("Logo upload failed — please try again");
return;

}

const { data: urlData } =
supabase.storage
.from("profile-images")
.getPublicUrl(filePath);

updates.dealership_logo =
urlData?.publicUrl || null;

if (previousLogoUrl) {
await removeLogoObject(previousLogoUrl);
}

}

/* --- PERSIST (scoped to the authenticated user) --- */

const { error: dbError } =
await supabase
.from("profiles")
.update(updates)
.eq("id", user.id);

if (dbError) {

console.error(
"[DEALERSHIP PAGE] Profile update failed — Supabase DB error:",
{
message: dbError.message || String(dbError),
code: dbError.code ?? null,
details: dbError.details ?? null,
hint: "Application updates public.profiles (id = auth.uid()). A 42501/RLS error indicates database RLS configuration — not application code."
}
);

toast("Could not save your dealership page — please try again");
return;

}

/* --- REFRESH + FEEDBACK --- */

clearAuthCache();

await hydrateDashboardProfile();

currentProfile = { ...currentProfile, ...updates };

pendingLogoFile = null;
logoRemoveRequested = false;

const box =
document.getElementById("ddeBox");

if (box) {
box.innerHTML = renderForm(currentProfile);
}

toast("Dealership page updated");

} catch (err) {

console.error(
"Dealership page save failed:",
err
);

toast("Could not save your dealership page — please try again");

} finally {

saving = false;
setSaveBusy(false);

}

};

function setSaveBusy(busy) {

const btn =
document.getElementById("ddeSaveBtn");

if (!btn) {
return;
}

btn.disabled = busy;
btn.innerText = busy ? "Saving..." : "Save Changes";

}