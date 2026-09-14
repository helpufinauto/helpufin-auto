import { renderVehicleCard } from "../components/vehicleCard.js";
import { supabase } from "../js/api.js";
import { navigate } from "../js/router.js";
import { SearchBar } from "../components/searchBar.js";
import {
rankVehicles,
getUserProfile,
getPopularityMap,
parseIntent
} from "../js/aiEngine.js";
import { mapToBrowseFilters, searchVehicles } from "../js/searchAdapter.js";
import { MAKES, MODELS } from "../js/searchData.js";
import { getCompare, toast } from "../js/ui.js";

export function HomePage(){

setTimeout(init, 0);

return `

<div class="
space-y-1
overflow-x-hidden
bg-gradient-to-b
from-white
via-[#f8fafc]
to-white
">

<style>
/* ============================================================
   HOME PAGE UX — RESPONSIVE PRESENTATION REFINEMENT
   Presentation-only. No data / auth / search / logic changes.
   Strictly scoped to the homepage elements (.home-*, #recommended,
   #featuredSlider, featured-spotlight-card) so unrelated pages are
   never affected.
   This block is rendered inside the page DOM, AFTER the global
   stylesheet, so these !important refinements intentionally
   refine the existing .home-* baselines in css/styles.css.
   ============================================================ */

/* ---------- SHARED — never overflow the viewport ---------- */
#recommended,
#featuredShowcase{ min-width:0; }
#recommended{ width:100% !important; }

/* ------------------------------------------------------------
   SHARED HOMEPAGE SECTION-HEADING SYSTEM
   One pattern for Browse By / Featured / Recommended (and any
   equivalent homepage section): eyebrow + title + subheading.
   These class rules are authoritative (this block renders after
   the global stylesheet and Tailwind), so every section shares
   identical typography instead of per-section one-offs.
   ------------------------------------------------------------ */
.home-sec-head{ min-width:0; }
.home-sec-eyebrow{
  display:block;
  font-size:11px;
  font-weight:800;
  letter-spacing:.28em;
  text-transform:uppercase;
  color:#E48A2F;
  margin-bottom:6px;
}
.home-sec-title{
  font-size:30px;
  font-weight:900;
  letter-spacing:-0.04em;
  line-height:1.1;
  color:#081120;
}
.home-sec-sub{
  margin-top:6px;
  font-size:13px;
  line-height:1.55;
  color:#64748B;
}

/* ---------- MOBILE  ≤767px — compact headings + section rhythm ---------- */
@media (max-width:767px){
  .home-sec-head{ margin-bottom:14px !important; }
  .home-sec-eyebrow{ font-size:10px !important; margin-bottom:4px !important; }
  .home-sec-title{ font-size:23px !important; line-height:1.12 !important; }
  .home-sec-sub{ font-size:12.5px !important; margin-top:5px !important; }

  /* The featured header wrapper must not add spacing on top of the
     shared heading system (its inner .home-sec-head owns it). */
  .home-featured-header{ margin-bottom:0 !important; }

  /* Deliberate, consistent section separation:
     Browse By → Featured Vehicles → Recommended For You. */
  .home-browse-section{ padding-bottom:22px !important; }
  .home-featured-section{ padding-top:0 !important; padding-bottom:18px !important; }
  .home-recommended-section{ padding-top:0 !important; padding-bottom:18px !important; }
}
@media (min-width:415px) and (max-width:767px){
  .home-sec-title{ font-size:24px !important; }
}
@media (max-width:420px){
  .home-sec-title{ font-size:21px !important; }
}

/* ---------- DESKTOP  ≥1025px ---------- */
@media (min-width:1025px){

  /* Reduce excessive hero whitespace; keep the hero prominent. */
  .home-hero-section{ padding-bottom:0 !important; }
  .home-hero-grid{ min-height:300px !important; }

  /* Browse-by row: tighten its gap and bottom spacing. */
  .home-browse-section{ margin-top:2px !important; padding-bottom:4px !important; }

  /* Featured: a premium, compact marketplace block. */
  .home-featured-section{ padding-top:0 !important; padding-bottom:16px !important; }
  .home-featured-header{ margin-bottom:12px !important; }

  /* Recommended: tighter header + tightly packed row. */
  .home-recommended-section{ padding-top:0 !important; padding-bottom:16px !important; }
  .home-recommended-header{ margin-bottom:12px !important; }

  /* Trust bar: compact but polished. */
  .home-trust-section{ padding-bottom:16px !important; }
  .home-trust-inner{ padding-top:20px !important; padding-bottom:20px !important; }

  /* Recommended vehicle cards — dense, premium, even column height.
     Scoped to #recommended so Browse/Saved/Compare cards are untouched. */
  #recommended .vehicle-card > div:first-child{ height:120px !important; width:100%; }
  #recommended .vehicle-card-body{ padding:10px 10px 12px !important; min-width:0; }
  #recommended .vehicle-card-body > div:first-child{ min-height:24px !important; font-size:14px !important; line-height:1.28 !important; }
  #recommended .text-base.font-bold{ font-size:16px !important; }
  #recommended .vehicle-meta{ font-size:11px !important; margin-top:5px !important; gap:6px !important; }
  #recommended .vehicle-meta .vehicle-dot{ width:3px !important; height:3px !important; }
  #recommended .grid[class*="grid-cols-3"] > div{ padding:6px 4px !important; }
  #recommended .grid[class*="grid-cols-3"] > div > div.text-slate-500{ font-size:8px !important; }
  #recommended .grid[class*="grid-cols-3"] > div > div.font-semibold{ font-size:10px !important; }
  #recommended .border-t.border-slate-100{ margin-top:6px !important; padding-top:6px !important; }
  #recommended .vehicle-card-body > div[class*="mt-auto"]{ padding-top:8px !important; }
  #recommended button.w-full.h-10{ height:34px !important; font-size:12px !important; border-radius:10px !important; }
}

/* ---------- TABLET  768–1024px ---------- */
@media (min-width:768px) and (max-width:1024px){

  .home-hero-section{ padding-bottom:0 !important; }
  .home-browse-section{ margin-top:0 !important; padding-bottom:4px !important; }
  .home-featured-section{ padding-top:0 !important; padding-bottom:12px !important; }
  .home-featured-header{ margin-bottom:12px !important; }
  .home-recommended-section{ padding-top:0 !important; padding-bottom:12px !important; }
  .home-recommended-header{ margin-bottom:10px !important; }
  .home-trust-section{ padding-bottom:12px !important; }

  /* 2-column cards — avoid awkward tall expansion on wide tablet rows. */
  #recommended .vehicle-card > div:first-child{ height:140px !important; width:100%; }
  #recommended .vehicle-card-body{ padding:12px !important; min-width:0; }
  #recommended .vehicle-card-body > div:first-child{ min-height:26px !important; font-size:14px !important; line-height:1.28 !important; }
  #recommended .text-base.font-bold{ font-size:16px !important; }
  #recommended .vehicle-meta{ font-size:11px !important; margin-top:5px !important; gap:6px !important; }
  #recommended .vehicle-meta .vehicle-dot{ width:3px !important; height:3px !important; }
}

/* ---------- MOBILE  ≤767px ---------- */
@media (max-width:767px){

  /* Slightly shorter featured spotlight image keeps more above the fold. */
  #featuredShowcase .featured-spotlight-card > div:first-child{ height:160px !important; }

  /* Tighter row rhythm so more useful content is visible. */
  .home-browse-section{ margin-top:0 !important; padding-bottom:2px !important; }
  .home-featured-section{ padding-top:0 !important; }
  .home-featured-header{ margin-bottom:10px !important; }
  .home-trust-section{ padding-bottom:8px !important; }

  /* Comfortable touch target for the primary View Vehicle action. */
  #recommended button.w-full.h-10{ height:40px !important; }
}

/* ---------- NARROW MOBILE  ≤420px ---------- */
@media (max-width:420px){

  /* Guarantee the marketplace rows never force horizontal scroll. */
  #recommended,
  #featuredShowcase{ min-width:0 !important; }
  #recommended{ overflow:hidden !important; }
  #recommended .vehicle-card{ min-width:0 !important; max-width:100% !important; }

  /* Keep the trust grid readable instead of cramped. */
  .home-trust-grid{ gap:10px !important; }

  /* Headings + Recommended grid/image sizing are governed by the
     shared .home-sec-* heading system and the Recommended grid block. */
}

/* ============================================================
   PHASE 1 — MOBILE FOUNDATION (mobile-only refinement)
   Presentation only. No JS / data / auth / search changes.
   Scoped to homepage classes/ids. Desktop (≥768px) untouched.
   ============================================================ */

/* ---------- HERO — shorter, cropped, non-dominant ---------- */
@media (max-width:767px){
  .home-hero-grid{ min-height:0 !important; }
  .home-hero-left{ padding-top:16px !important; padding-bottom:4px !important; }
  .home-hero-left h1{
    font-size:34px !important;
    line-height:1.05 !important;
    letter-spacing:-0.035em !important;
  }
  .home-hero-left p{
    font-size:13px !important;
    margin-top:6px !important;
    line-height:1.45 !important;
  }
  .home-hero-media{ min-height:150px !important; max-height:176px !important; }
  .home-search-wrap{ margin-top:8px !important; padding:0 12px !important; }
}

/* ---------- NARROW MOBILE HERO ---------- */
@media (max-width:420px){
  .home-hero-left h1{ font-size:32px !important; }
  .home-hero-media{ min-height:136px !important; max-height:156px !important; }
}

/* ---------- SEARCH — one row + horizontally scrollable chips ---------- */
@media (max-width:1024px){
  .home-search-wrap #homeFilterCapsules{
    flex-wrap:nowrap !important;
    overflow-x:auto !important;
    -webkit-overflow-scrolling:touch !important;
    scrollbar-width:none !important;
    padding-bottom:2px !important;
    margin-top:8px !important;
  }
  .home-search-wrap #homeFilterCapsules::-webkit-scrollbar{ display:none !important; }
  .home-search-wrap #homeFilterCapsules .hfc-btn{ flex:0 0 auto !important; }
  .home-search-wrap #homeFilterCapsules .hfc-view-btn,
  .home-search-wrap #homeFilterCapsules #hfcViewMore{
    flex:0 0 auto !important;
    white-space:nowrap !important;
  }
}

/* ---------- BROWSE BY BRANDS — compact tiles, less whitespace ---------- */
@media (max-width:767px){
  .home-browse-section{ margin-top:0 !important; padding-top:0 !important; }
  .home-browse-left{ padding:10px 14px !important; }
  .home-browse-left p{ margin-top:2px !important; }
  #brandCarousel > div,
  #typeCarousel > div{
    height:62px !important;
    padding:6px !important;
  }
  #brandCarousel > div > div[class*="w-[32px]"],
  #typeCarousel > div > div[class*="w-[32px]"]{
    width:26px !important;
    height:26px !important;
  }
  #brandCarousel > div img,
  #typeCarousel > div img{ width:24px !important; height:24px !important; }
  #brandCarousel > div h3,
  #typeCarousel > div h3{ font-size:10px !important; margin-top:2px !important; }
  #brandPagination{ margin-top:2px !important; }
  #brandPrev, #brandNext, #typePrev, #typeNext{ width:28px !important; height:28px !important; }
  .home-browse-grid > div[class*="pl-"][class*="pr-"]{ padding-left:10px !important; padding-right:10px !important; }
}

/* ---------- SECTION RHYTHM — continuous premium feed ---------- */
@media (max-width:767px){
  .home-trust-inner{ padding:18px 14px !important; }
  .home-trust-grid{ gap:12px !important; }
}

/* ============================================================
   PHASE 2 — MOBILE VEHICLE EXPERIENCE (Featured + Recommended)
   Presentation only. Mobile-only. Desktop (≥1025px) uses its own
   lg: styles and is intentionally untouched.
   No data / query / logic changes — only how the returned cars
   are presented on a phone.
   ============================================================ */

/* ---------- FEATURED — compact premium mobile card ---------- */
@media (max-width:767px){

  #featuredShowcase .featured-spotlight-card{
    border-radius:14px !important;
    border:1px solid rgba(226,232,240,1) !important;
    box-shadow:0 4px 16px rgba(15,23,42,0.05) !important;
  }

  /* Controlled, reserved image area — never too tall, never shifts.
     object-fit: contain — the COMPLETE vehicle is visible, centered,
     never cropped or distorted, on a clean white panel. */
  #featuredShowcase .featured-spotlight-card > div:first-child{
    height:165px !important;
    width:100% !important;
    aspect-ratio:auto !important;
    background:#ffffff !important;
    padding:8px !important;
    box-sizing:border-box !important;
  }
  #featuredShowcase .featured-spotlight-card > div:first-child img{
    object-fit:contain !important;
    width:100% !important;
    height:100% !important;
  }

  /* Compact content padding */
  #featuredShowcase .huafa-featured-slide-body{
    padding:14px 14px 16px !important;
    gap:0 !important;
  }

  /* Compact Featured badge */
  #featuredShowcase .huafa-featured-slide-body > div:first-child{
    padding:3px 9px !important;
    font-size:9px !important;
    border-radius:999px !important;
  }
  #featuredShowcase .huafa-featured-slide-body > div:first-child span{
    width:5px !important;
    height:5px !important;
  }

  /* Vehicle name — compact, controlled wrap */
  #featuredShowcase .huafa-featured-slide-body h2{
    font-size:18px !important;
    line-height:1.2 !important;
    letter-spacing:-0.03em !important;
    margin-top:8px !important;
  }

  /* Metadata (year • mileage • body • fuel) */
  #featuredShowcase .huafa-featured-slide-body > div:nth-child(3){
    font-size:12px !important;
    margin-top:6px !important;
    gap:5px !important;
    column-gap:8px !important;
  }

  /* Price — prominent but not oversized */
  #featuredShowcase .text-[22px]{
    font-size:20px !important;
    letter-spacing:-0.01em !important;
  }
  #featuredShowcase .text-[22px] + div{
    font-size:11px !important;
  }

  /* Dealer / seller — compact (dealer row is uniquely a .mt-2 inline-flex
     direct child; the Featured badge is the :first-child and stays apart) */
  #featuredShowcase .huafa-featured-slide-body > div.inline-flex.mt-2{
    margin-top:8px !important;
    gap:6px !important;
  }
  #featuredShowcase .huafa-featured-slide-body > div.inline-flex.mt-2 span{
    font-size:12px !important;
  }

  /* Primary View + secondary controls: comfortable, not cramped.
     View spans the full width; Save + Compare sit in a row below. */
  #featuredShowcase .huafa-featured-slide-body .grid{
    grid-template-columns:auto auto !important;
    gap:12px !important;
    margin-top:12px !important;
  }
  #featuredShowcase .huafa-featured-slide-body .grid button:first-child{
    grid-column:1 / -1 !important;
    width:100% !important;
    height:44px !important;
    border-radius:12px !important;
    font-size:14px !important;
  }
  #featuredShowcase button[data-home-save],
  #featuredShowcase label:has(> input[data-compare]){
    width:44px !important;
    height:44px !important;
    border-radius:12px !important;
    flex-shrink:0 !important;
  }
  #featuredShowcase button[data-home-save] svg{
    width:22px !important;
    height:22px !important;
  }
  #featuredShowcase label:has(> input[data-compare]) svg{
    width:22px !important;
    height:22px !important;
  }
}

/* ---------- RECOMMENDED — premium polish only ---------- */
/*
   The mobile card internals (2-column grid, contained images,
   compact padding/type, spec grid, badges, location + View CTA)
   are owned by the "RECOMMENDED FOR YOU — GRID RESTORATION & MOBILE
   FIT" block below, so there is exactly one authoritative rule set.
   This block only adds premium card polish.
*/
@media (max-width:767px){

  #recommended .vehicle-card{
    border-radius:14px !important;
    border-color:rgba(226,232,240,1) !important;
    box-shadow:0 2px 10px rgba(15,23,42,0.05) !important;
  }
}

/* ============================================================
   PHASE 4 (CORRECTED) — AMBIENT HUFA BACKGROUND WASH
   The orange (#E48A2F) + exact mobile-menu blue (#3B82F6)
   treatment lives ONLY in the soft background wash BEHIND the
   search and Browse sections. The modules themselves stay
   clean white/premium. No coloured controls, tiles or hovers.
   ============================================================ */

/* Ambient wash behind the hero + search module area */
.home-hero-section{
  background-image:
    radial-gradient(60% 90% at 18% 0%, rgba(228,138,47,0.07), transparent 60%),
    radial-gradient(55% 85% at 85% 70%, rgba(59,130,246,0.06), transparent 62%) !important;
}

/* Search module — restored clean premium surface */
.home-search-wrap > .bg-white{
  background:#ffffff !important;
  border:1px solid rgba(226,232,240,1) !important;
  border-radius:14px !important;
  box-shadow:0 4px 16px rgba(15,23,42,0.06) !important;
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
}

/* Quick actions: clean, integrated, neutral hover.
   Destinations and behaviour unchanged. */
.home-quick-actions{
  background:#ffffff !important;
  border-top:1px solid rgba(241,245,249,1) !important;
}
.home-quick-actions > div:hover{
  background:rgba(15,23,42,0.025) !important;
}
.home-quick-actions > div:last-child{
  border-right:none !important;
}

/* Browse By Brands section — light-blue automotive showroom wallpaper */
.home-browse-section{
  background-color:transparent !important;
  background-image:url('/assets/savedbackground.png?v=2') !important;
  background-position:center !important;
  background-size:cover !important;
  background-repeat:no-repeat !important;
}

/* Browse container — clean white module (no glass blocks) */
.home-browse-section > .bg-white{
  background:#ffffff !important;
  border:1px solid rgba(226,232,240,1) !important;
  border-radius:14px !important;
  box-shadow:0 4px 16px rgba(15,23,42,0.05) !important;
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
}
.home-browse-left{
  background:transparent !important;
}

/* Brand hover: restrained + never clipped. The .carousel-clip
   viewport keeps vertical breathing room so the lift/shadow is
   fully visible; horizontal carousel clipping is untouched. */
.carousel-clip{
  padding-top:8px !important;
  padding-bottom:8px !important;
}
@media (hover:hover){
  .home-browse-section #brandCarousel > div:hover,
  .home-browse-section #typeCarousel > div:hover{
    transform:translateY(-2px) !important;
    box-shadow:0 10px 22px rgba(15,23,42,0.08) !important;
  }
}
</style>

<div class="
home-hero-section
relative
bg-[#eef3f9]
overflow-hidden
mt-[-1px]
">

<div class="
max-w-[1380px]
mx-auto
px-4 md:px-8
pt-0
">

<div class="
home-hero-grid
relative
grid
grid-cols-[360px_1fr]
items-center
gap-0
min-h-[280px]
overflow-visible
z-10
">

<!-- LEFT -->

<div class="
home-hero-left
relative
z-20
absolute
left-4 md:left-[40px]
top-[-4px]
max-w-[280px] md:max-w-[310px]
">

<!-- Main hero heading section -->
<h1
class="
font-black
text-[#081120]
leading-[1.02]
tracking-[-0.04em]
max-w-[460px]
"
style="
font-size:clamp(2.4rem,3.1vw,3.4rem);
"
>
Find the Right Car.
Without the Guesswork.
</h1>

<p class="
mt-3
text-slate-500
text-[13px]
leading-relaxed
max-w-[330px]
">
Tell Helpufin what you need, and discover
vehicles that fit your lifestyle, budget
and preferences.
</p>

</div>

<!-- RIGHT -->

<div class="
home-hero-media
absolute
inset-0
overflow-hidden
pointer-events-none
z-0
">

<img
src="/assets/hero-opt.jpg"
srcset="/assets/hero-mobile.jpg 800w, /assets/hero-opt.jpg 1600w"
sizes="(max-width: 767px) 380px, 1380px"
loading="eager"
fetchpriority="high"
decoding="async"
class="
home-hero-image
absolute
right-[-20px]
top-[54%]
-translate-y-1/2
w-[380px] md:w-[1380px]
max-w-none
h-auto
object-cover
pointer-events-none
select-none
"
>

</div>

</div>

<!-- SEARCH + QUICK ACTIONS -->

<div class="
home-search-wrap
relative
z-20
max-w-[860px]
mx-auto
translate-y-[-32px]
mb-[-20px]
">

<div class="
bg-white
rounded-[12px]
shadow-[0_8px_24px_rgba(15,23,42,0.05)]
border
border-slate-100
overflow-hidden
">

<div class="
p-1
">

${SearchBar()}

</div>

<div class="
home-quick-actions
grid
grid-cols-4
border-t
border-slate-100
bg-white
">

<div
onclick="navigate('/browse')"
class="
group
h-[58px]
cursor-pointer
flex
items-center
justify-center
gap-3
border-r
border-slate-100
text-[#0A1B4E]
hover:text-[#E48A2F]
transition-colors
duration-300
">

<span class="
font-semibold
text-[12px]
relative
after:absolute
after:left-0
after:bottom-[-4px]
after:h-[2px]
after:w-0
after:bg-current
after:transition-all
after:duration-300
group-hover:after:w-full
">
Browse Vehicles
</span>

</div>

<div
onclick="navigate('/helpufin')"
class="
group
h-[58px]
cursor-pointer
flex
items-center
justify-center
gap-3
border-r
border-slate-100
text-[#0A1B4E]
hover:text-[#E48A2F]
transition-colors
duration-300
">

<span class="
font-semibold
text-[12px]
relative
after:absolute
after:left-0
after:bottom-[-4px]
after:h-[2px]
after:w-0
after:bg-current
after:transition-all
after:duration-300
group-hover:after:w-full
">
Helpufin - Find Your Vehicle
</span>

</div>

<div
onclick="navigate('/sell/private')"
class="
group
h-[58px]
cursor-pointer
flex
items-center
justify-center
gap-3
border-r
border-slate-100
text-[#0A1B4E]
hover:text-[#E48A2F]
transition-colors
duration-300
">

<span class="
font-semibold
text-[12px]
relative
after:absolute
after:left-0
after:bottom-[-4px]
after:h-[2px]
after:w-0
after:bg-current
after:transition-all
after:duration-300
group-hover:after:w-full
">
Sell Your Vehicle
</span>

</div>

<div
onclick="navigate('/sell/dealer')"
class="
group
h-[58px]
cursor-pointer
flex
items-center
justify-center
gap-3
text-[#0A1B4E]
hover:text-[#E48A2F]
transition-colors
duration-300
">

<span class="
font-semibold
text-[12px]
relative
after:absolute
after:left-0
after:bottom-[-4px]
after:h-[2px]
after:w-0
after:bg-current
after:transition-all
after:duration-300
group-hover:after:w-full
">
Join Dealer Network
</span>

</div>

</div>

</div>

</div>

</div>

</div>

<!-- ====================================
PHASE 4: HOMEPAGE SEARCH PREVIEW
==================================== -->
</div>

</div>
<!-- ====================================
BROWSE BY
==================================== -->

<section class="
home-browse-section
max-w-[1280px]
mx-auto
px-4 md:px-8
mt-4
pb-3
">

<div class="
home-sec-head
mb-4
">
<div class="
home-sec-eyebrow
text-[#E48A2F]
text-[11px]
font-bold
tracking-[0.28em]
uppercase
">
Browse
</div>
<h2 class="
home-sec-title
text-[28px]
font-black
tracking-[-0.04em]
leading-tight
text-[#081120]
">
Browse By Brands
</h2>
<p class="
home-sec-sub
text-[13px]
text-slate-500
leading-relaxed
">
Explore inventory from South Africa's most trusted automotive manufacturers.
</p>
</div>

<div class="
bg-white
rounded-[14px]
border
border-slate-200
overflow-hidden
">

<div class="
home-browse-grid
grid
grid-cols-[220px_1fr]
items-stretch
">

<!-- LEFT PANEL -->

<div class="
home-browse-left
px-5
py-3
border-r
border-slate-100
flex
flex-col
justify-center
">

<div class="
flex
gap-4
items-end
">

<button
id="browseBrandsTab"
class="
text-[#E48A2F]
font-bold
text-[13px]
border-b-2
border-[#E48A2F]
pb-1.5
"
>
Browse By Brands
</button>

</div>

</div>

<!-- RIGHT PANEL -->

<div class="
relative
pl-[14px]
pr-[14px]
py-0
flex
flex-col
justify-center
">

<div
id="brandsPanel"
class="w-full"
>

<div class="
grid
grid-cols-[34px_1fr_34px]
items-center
gap-3
"
>

<button
id="brandPrev"
class="
w-7
h-7
rounded-full
bg-white
border
border-slate-200
text-slate-500
hover:text-[#E48A2F]
hover:border-[#E48A2F]
transition-all
duration-300
"
>
←
</button>

<div class="carousel-clip overflow-hidden w-full">

<div
id="brandCarousel"
class="
flex
gap-1
transition-transform
duration-500
ease-out
"
>

${renderBrandTileSkeletons(BRAND_DATA.length)}

</div>

</div>

<button
id="brandNext"
class="
w-7
h-7
rounded-full
bg-white
border
border-slate-200
text-slate-500
hover:text-[#E48A2F]
hover:border-[#E48A2F]
transition-all
duration-300
"
>
→
</button>

</div>

<div
id="brandPagination"
class="
flex
justify-center
items-center
w-full
gap-2
mt-1.5
"
>
</div>

</div>


</div>

</div>

</div>

</section>

<!-- ====================================
FEATURED VEHICLES
==================================== -->

<section class="
home-featured-section
max-w-[1280px]
mx-auto
px-4 md:px-8
pt-1
pb-4
">

<div class="
home-featured-header
flex
items-end
justify-between
gap-3
mb-4
">

<div class="
home-sec-head
min-w-0
">

<div class="
home-sec-eyebrow
text-[11px]
font-bold
tracking-[0.28em]
uppercase
">
Featured
</div>

<h2 class="
home-sec-title
text-[30px]
font-black
tracking-[-0.04em]
leading-tight
text-[#081120]
">
Featured Vehicles
</h2>

</div>

<button
onclick="navigate('/browse?is_featured=true')"
class="
text-[#0A192F]
font-semibold
text-[12px]
hover:text-[#E48A2F]
transition-colors
duration-200
shrink-0
">
View Collection →
</button>

</div>

<div
id="featuredShowcase"
class="
w-full
"
>

${renderFeaturedSliderSkeleton()}

</div>

</section>

<!-- ====================================
RECOMMENDED VEHICLES
==================================== -->

<style>
/* ================================================================
   RECOMMENDED FOR YOU — GRID RESTORATION & MOBILE FIT
   ================================================================ */

/* --- Restore CSS Grid (overrides global flex-carousel !importants
     in styles.css: .home-recommended-rail { display:flex !important }) --- */
#recommended {
  display: grid !important;
  gap: 1rem !important;
}

/* Override flex carousel sizing on children */
#recommended > * {
  flex: 1 1 0px !important;
  width: 100% !important;
  max-width: 100% !important;
}

/* Desktop: 4 columns — preserves intended appearance */
@media (min-width: 1024px) {
  #recommended {
    grid-template-columns: repeat(4, 1fr) !important;
  }
}

/* Tablet: 2 columns */
@media (min-width: 768px) and (max-width: 1023px) {
  #recommended {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

/* === MOBILE-ONLY: true responsive grid + contained images === */
@media (max-width: 767px) {

  /* True 2-column grid — Recommended is a scannable grid, not a feed */
  #recommended {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10px !important;
  }

  /* Card: fill its grid cell, no overflow, border-box */
  #recommended .vehicle-card {
    max-width: 100% !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }

  /* Image: reserved height (no layout shift). object-fit: contain on a
     clean background — the COMPLETE vehicle stays visible: never
     cropped, never stretched. */
  #recommended .vehicle-card > div:first-child {
    height: 112px !important;
    aspect-ratio: auto !important;
    background: #f8fafc !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 6px !important;
    box-sizing: border-box !important;
  }
  #recommended .vehicle-card > div:first-child img {
    object-fit: contain !important;
    width: 100% !important;
    height: 100% !important;
  }

  /* Card body: compact padding for half-width cards */
  #recommended .vehicle-card-body {
    padding-top: 6px !important;
    padding-bottom: 6px !important;
    padding-left: 9px !important;
    padding-right: 9px !important;
  }

  /* Title: compact, controlled wrap (hierarchy: name under image) */
  #recommended .vehicle-card-body > div:first-child {
    min-height: 18px !important;
    font-size: 13px !important;
    line-height: 1.25 !important;
  }

  /* Price: prominent but smaller than Featured (was text-base=18px) */
  #recommended .text-base.font-bold {
    font-size: 15px !important;
  }

  /* Vehicle meta rows (year/mileage, body/fuel): quiet + compact */
  #recommended .vehicle-meta {
    font-size: 10px !important;
    margin-top: 4px !important;
  }
  #recommended .vehicle-meta .vehicle-dot {
    width: 3px !important;
    height: 3px !important;
  }

  /* Tighten vertical gaps between body sections (was 6px mt-1.5, → 4px) */
  #recommended .vehicle-card-body > div[class*="mt-"] {
    margin-top: 4px !important;
  }
  #recommended .mt-2 {
    margin-top: 4px !important;
  }

  /* Bottom action row padding */
  #recommended .vehicle-card-body > div[class*="pt-"] {
    padding-top: 4px !important;
  }

  /* Spec grid: compact so it fits half-width cards */
  #recommended .grid[class*="gap-1"] {
    gap: 3px !important;
  }
  #recommended .grid[class*="grid-cols-3"] > div {
    padding: 4px 2px !important;
  }

  /* Spec icons: smaller, less margin */
  #recommended .grid[class*="grid-cols-3"] > div > svg {
    margin-bottom: 1px !important;
    width: 12px !important;
    height: 12px !important;
  }
  #recommended .grid[class*="grid-cols-3"] > div > div[class*="mb-"] {
    margin-bottom: 1px !important;
  }

  /* Spec text: small but readable */
  #recommended .grid[class*="grid-cols-3"] > div > div.text-slate-500 {
    font-size: 8px !important;
  }
  #recommended .grid[class*="grid-cols-3"] > div > div.font-semibold {
    font-size: 9px !important;
  }

  /* Bottom row: location wraps onto its own line, then View Vehicle
     becomes a comfortable full-width tap target (touch UX). */
  #recommended .border-t.border-slate-100 {
    margin-top: 6px !important;
    min-width: 0 !important;
    width: 100% !important;
    flex-wrap: wrap !important;
    gap: 6px !important;
  }
  #recommended .border-t.border-slate-100 > span {
    flex: 1 1 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
  }
  #recommended .border-t.border-slate-100 > div {
    flex: 1 1 100% !important;
    min-width: 0 !important;
  }
  #recommended button.w-full.h-10 {
    flex: 1 1 100% !important;
    width: 100% !important;
    min-width: 0 !important;
    height: 40px !important;
    border-radius: 10px !important;
    font-size: 12.5px !important;
  }

  /* Badges: compact, stay inside image */
  #recommended .absolute.top-3.left-3 {
    top: 6px !important;
    left: 6px !important;
  }
  #recommended .px-3[class*="py-1"] {
    padding: 2px 6px !important;
    font-size: 10px !important;
  }
  #recommended .px-2[class*="py-0"] {
    padding: 1px 5px !important;
  }
  #recommended .text-\[11px\].text-slate-400 {
    font-size: 9px !important;
  }

  /* Section header + section spacing are governed by the shared
     .home-sec-* heading system and the section-rhythm rules in the
     first style block (single authoritative source). */
}

/* Very narrow phones (≤360px): single column so cards stay usable */
@media (max-width: 360px) {
  #recommended {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
  }
  #recommended .vehicle-card > div:first-child {
    height: 150px !important;
  }
}
</style>

<section class="
home-recommended-section
max-w-[1280px]
mx-auto
px-4 md:px-8
pt-0
pb-5
">

<div class="
home-recommended-header
home-sec-head
mb-4
">

<div class="
home-sec-eyebrow
">
Recommended
</div>

<h2 class="
home-sec-title
">
Recommended For You
</h2>

<p class="
home-sec-sub
">
Vehicles selected using your browsing behaviour, affordability profile and preferences.
</p>

</div>

<div
id="recommended"
class="
home-recommended-rail
grid
grid-cols-1 md:grid-cols-2 lg:grid-cols-4
gap-4
items-stretch
"
>

${renderHomeVehicleSkeletonCards(homeSkeletonCount())}

</div>

</div>


<!-- ====================================
TRUST BAR
==================================== -->

<section class="
home-trust-section
max-w-[1280px]
mx-auto
px-4 md:px-8
pt-0
pb-6
">

<div class="
home-trust-inner
bg-[#f7f9fc]
rounded-[24px]
px-4 md:px-8
py-6
border
border-slate-200
">

<div class="
home-trust-grid
grid
grid-cols-4
gap-6
">

<div class="
flex
items-start
gap-3
">

<div class="
w-7
h-7
rounded-[14px]
bg-white
shadow-[0_12px_28px_rgba(15,23,42,0.08)]
flex
items-center
justify-center
text-[#081120]
shrink-0
">
<svg
class="w-4 h-4 text-[#081120]"
fill="none"
stroke="currentColor"
stroke-width="1.8"
viewBox="0 0 24 24"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"
/>
</svg>
</div>

<div>

<h3 class="
font-bold
text-[14px]
text-[#081120]
">
Quality You Can Trust
</h3>

<p class="
mt-0.5
text-[12px]
text-slate-500
leading-relaxed
">
Inspected and verified vehicles.
</p>

</div>

</div>

<div class="
flex
items-start
gap-3
">

<div class="
w-7
h-7
rounded-[12px]
bg-white
shadow-[0_8px_20px_rgba(15,23,42,0.05)]
flex
items-center
justify-center
text-[#081120]
text-2xl
shrink-0
">
<svg
class="w-4 h-4 text-[#081120]"
fill="none"
stroke="currentColor"
stroke-width="1.8"
viewBox="0 0 24 24"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M3 10h18M5 10v7M10 10v7M14 10v7M19 10v7M3 20h18M12 4l8 4H4l8-4z"
/>
</svg>
</div>

<div>

<h3 class="
font-bold
text-[14px]
text-[#081120]
">
Finance Made Easy
</h3>

<p class="
mt-0.5
text-[12px]
text-slate-500
leading-relaxed
">
Get pre-approved in minutes.
</p>

</div>

</div>

<div class="
flex
items-start
gap-3
">

<div class="
w-7
h-7
rounded-[12px]
bg-white
shadow-[0_8px_20px_rgba(15,23,42,0.05)]
flex
items-center
justify-center
text-[#081120]
shrink-0
">
<svg
class="w-4 h-4 text-[#081120]"
fill="none"
stroke="currentColor"
stroke-width="1.8"
viewBox="0 0 24 24"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M7 7H3m0 0l3-3M3 7l3 3M17 17h4m0 0l-3-3m3 3l-3 3"
/>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M3 7h11a4 4 0 014 4v0M21 17H10a4 4 0 01-4-4v0"
/>
</svg>
</div>

<div>

<h3 class="
font-bold
text-[14px]
text-[#081120]
">
Trade-In Value
</h3>

<p class="
mt-0.5
text-[12px]
text-slate-500
leading-relaxed
">
Get the best value for your vehicle.
</p>

</div>

</div>

<div class="
flex
items-start
gap-3
">

<div class="
w-7
h-7
rounded-[12px]
bg-white
shadow-[0_8px_20px_rgba(15,23,42,0.05)]
flex
items-center
justify-center
text-[#081120]
shrink-0
">
<svg
class="w-4 h-4 text-[#081120]"
fill="none"
stroke="currentColor"
stroke-width="1.8"
viewBox="0 0 24 24"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M16 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"
/>
<circle
cx="9"
cy="7"
r="4"
stroke-linecap="round"
stroke-linejoin="round"
/>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M22 21v-2a4 4 0 00-3-3.87"
/>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M16 3.13a4 4 0 010 7.75"
/>
</svg>
</div>

<div>

<h3 class="
font-bold
text-[14px]
text-[#081120]
">
Dealer Network
</h3>

<p class="
mt-0.5
text-[12px]
text-slate-500
leading-relaxed
">
Connect with trusted dealers nationwide.
</p>

</div>

</div>

</div>

</div>

</section>

</div>

`;
}

/* =========================================
   HOMEPAGE SKELETON HELPERS (PHASE 9)
   Reuse the project's existing skeleton CSS
   (.skeleton-shimmer / .skeleton-image in
   css/styles.css) and mirror the Browse page
   skeleton card structure so each homepage
   section keeps its final layout while its
   data is loading. Placeholders only —
   no fake data is ever rendered.
   ========================================= */

/* Responsive skeleton count for the
   Recommended grid (4 / 2 / 1 columns) */

function homeSkeletonCount(){

  const w = window.innerWidth;

  if(w >= 1024) return 8;  /* lg: 4 cols → 2 rows */
  if(w >= 768)  return 4;  /* md: 2 cols → 2 rows */
  return 2;                /* mobile: 1 col */

}

/* Vehicle card skeleton — mirrors the shared
   renderVehicleCard grid layout (same structure
   as the Browse page skeleton cards) */

function renderHomeVehicleSkeletonCards(count = homeSkeletonCount()){

  const skeletonCard = () => `
<div class="
vehicle-card
bg-white
rounded-xl
overflow-hidden
border
border-slate-200
shadow-sm
h-full
flex
flex-col
">

  <!-- IMAGE PLACEHOLDER (existing light sweep) -->
  <div class="
  relative
  overflow-hidden
  h-[130px]
  skeleton-image
  ">
  </div>

  <!-- BODY -->
  <div class="vehicle-card-body px-1 py-0.5 flex flex-col flex-1">

    <!-- TITLE (min-h matches production 2-line title) -->
    <div class="min-h-[32px] flex items-start w-full">
      <div class="skeleton-shimmer h-3.5 w-3/4 rounded-md"></div>
    </div>

    <!-- PRICE -->
    <div class="mt-1 flex flex-col gap-0.5">
      <div class="skeleton-shimmer h-4 w-1/3 rounded-md"></div>
    </div>

    <!-- META ROW 1 (Year • Mileage) -->
    <div class="vehicle-meta mt-1.5">
      <div class="skeleton-shimmer h-3 w-8 rounded"></div>
      <span class="vehicle-dot"></span>
      <div class="skeleton-shimmer h-3 w-14 rounded"></div>
    </div>

    <!-- META ROW 2 (Body • Fuel) -->
    <div class="vehicle-meta mt-1.5">
      <div class="skeleton-shimmer h-3 w-12 rounded"></div>
      <span class="vehicle-dot"></span>
      <div class="skeleton-shimmer h-3 w-10 rounded"></div>
    </div>

    <!-- SPEC GRID (icon + label + value) -->
    <div class="grid grid-cols-3 gap-1 mt-1.5">
      <div class="bg-slate-50 border border-slate-100 rounded-lg p-1 text-center">
        <div class="skeleton-shimmer h-4 w-4 mx-auto rounded mb-1"></div>
        <div class="skeleton-shimmer h-2 w-8 mx-auto rounded mb-0.5"></div>
        <div class="skeleton-shimmer h-2.5 w-10 mx-auto rounded"></div>
      </div>
      <div class="bg-slate-50 border border-slate-100 rounded-lg p-1 text-center">
        <div class="skeleton-shimmer h-4 w-4 mx-auto rounded mb-1"></div>
        <div class="skeleton-shimmer h-2 w-8 mx-auto rounded mb-0.5"></div>
        <div class="skeleton-shimmer h-2.5 w-10 mx-auto rounded"></div>
      </div>
      <div class="bg-slate-50 border border-slate-100 rounded-lg p-1 text-center">
        <div class="skeleton-shimmer h-4 w-4 mx-auto rounded mb-1"></div>
        <div class="skeleton-shimmer h-2 w-8 mx-auto rounded mb-0.5"></div>
        <div class="skeleton-shimmer h-2.5 w-10 mx-auto rounded"></div>
      </div>
    </div>

    <!-- DEALER BADGE -->
    <div class="mt-2">
      <div class="skeleton-shimmer h-6 w-28 rounded-full"></div>
    </div>

    <!-- FOOTER (location + action pills) -->
    <div class="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between">
      <div class="skeleton-shimmer h-3 w-16 rounded"></div>
      <div class="flex items-center gap-2">
        <div class="skeleton-shimmer w-8 h-8 rounded-full border border-slate-200"></div>
        <div class="skeleton-shimmer w-8 h-8 rounded-full border border-slate-200"></div>
      </div>
    </div>

  </div>

</div>
`;

  return Array(count).fill(0).map(()=>skeletonCard()).join("");

}

/* Brand tile skeleton — same 128×76 tile
   dimensions as the real brand tiles */

function renderBrandTileSkeletons(count = 12){

  return Array(count).fill(0).map(()=>`
<div class="
min-w-[128px]
w-[128px]
h-[76px]
rounded-[10px]
bg-white
border
border-slate-100
shadow-[0_8px_24px_rgba(15,23,42,0.04)]
flex
flex-col
items-center
justify-center
p-2.5
">

  <div class="skeleton-shimmer w-[32px] h-[32px] rounded"></div>

  <div class="skeleton-shimmer h-2.5 w-16 rounded mt-1"></div>

</div>
`).join("");

}

/* Type tile skeleton — same 128×76 tile
   dimensions as the real type tiles */

function renderTypeTileSkeletons(count = 10){

  return Array(count).fill(0).map(()=>`
<div class="
min-w-[128px]
w-[128px]
h-[76px]
rounded-[10px]
bg-white
border
border-slate-100
shadow-[0_8px_24px_rgba(15,23,42,0.04)]
flex
flex-col
items-center
justify-center
p-2.5
">

  <div class="skeleton-shimmer w-[28px] h-[28px] rounded"></div>

  <div class="skeleton-shimmer h-2.5 w-16 rounded mt-1"></div>

  <div class="skeleton-shimmer h-2 w-10 rounded mt-[2px]"></div>

</div>
`).join("");

}

/* Featured slider skeleton — mirrors the
   featured spotlight card (image + badge +
   title + metadata + price + seller status +
   action buttons + pagination dots) */

function renderFeaturedSliderSkeleton(){

  return `
<div class="
relative
w-full
overflow-hidden
rounded-[20px]
">

  <div class="
  relative
  w-full
  overflow-hidden
  rounded-[20px]
  bg-white
  border
  border-slate-200
  shadow-[0_8px_24px_rgba(15,23,42,0.04)]
  ">

    <div class="
    featured-spotlight-card
    mx-auto
    max-w-[1000px]
    flex
    flex-col
    lg:flex-row
    gap-0
    overflow-hidden
    rounded-[16px]
    bg-white
    border
    border-slate-200
    shadow-[0_4px_16px_rgba(15,23,42,0.03)]
    ">

      <!-- IMAGE -->
      <div class="
      relative
      flex-none
      w-full
      lg:w-[40%]
      h-[180px]
      lg:h-[200px]
      skeleton-image
      ">
      </div>

      <!-- CONTENT -->
      <div class="
      flex
      flex-col
      flex-1
      p-5
      lg:pl-6
      lg:pr-5
      lg:py-5
      min-w-0
      ">

        <!-- FEATURED BADGE -->
        <div class="skeleton-shimmer h-[22px] w-24 rounded-full self-start"></div>

        <!-- VEHICLE NAME -->
        <div class="mt-2 skeleton-shimmer h-7 w-2/3 rounded-md"></div>

        <!-- COMPACT METADATA -->
        <div class="mt-2 flex flex-wrap items-center gap-x-2">
          <div class="skeleton-shimmer h-4 w-10 rounded"></div>
          <div class="skeleton-shimmer h-4 w-16 rounded"></div>
          <div class="skeleton-shimmer h-4 w-14 rounded"></div>
          <div class="skeleton-shimmer h-4 w-12 rounded"></div>
        </div>

        <!-- PRICE -->
        <div class="mt-3">
          <div class="skeleton-shimmer h-7 w-36 rounded-md"></div>
          <div class="mt-1 skeleton-shimmer h-3.5 w-24 rounded"></div>
        </div>

        <!-- DEALER STATUS -->
        <div class="mt-2 inline-flex items-center gap-2 self-start">
          <div class="skeleton-shimmer w-2 h-2 rounded-full"></div>
          <div class="skeleton-shimmer h-4 w-20 rounded"></div>
        </div>

        <!-- ACTIONS -->
        <div class="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
          <div class="skeleton-shimmer h-10 rounded-xl"></div>
          <div class="skeleton-shimmer h-10 w-24 rounded-xl"></div>
          <div class="skeleton-shimmer h-10 w-28 rounded-xl"></div>
        </div>

      </div>

    </div>

    <!-- PAGINATION DOTS -->
    <div class="flex justify-center items-center gap-2 mt-4">
      <div class="skeleton-shimmer w-3 h-2.5 rounded-full"></div>
      <div class="skeleton-shimmer w-2.5 h-2.5 rounded-full"></div>
      <div class="skeleton-shimmer w-2.5 h-2.5 rounded-full"></div>
      <div class="skeleton-shimmer w-2.5 h-2.5 rounded-full"></div>
      <div class="skeleton-shimmer w-2.5 h-2.5 rounded-full"></div>
    </div>

  </div>

</div>
`;

}

/* ========================== */

function suggestion(text){
return `
<button
onclick="quickSearch('${text}')"
class="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm hover:border-gold hover:text-gold hover:shadow-md transition-all">
${text}
</button>
`;
}

/* =========================================
PREMIUM BRAND CAROUSEL
========================================= */

let brandIndex = 0;

const BRAND_DATA = [

{
name:"BMW",
logo:"/assets/brands/opt/bmw.png"
},

{
name:"Mercedes-Benz",
logo:"/assets/brands/opt/mercedes.png"
},

{
name:"Audi",
logo:"/assets/brands/opt/audi.png"
},

{
name:"Toyota",
logo:"/assets/brands/opt/toyota.png"
},

{
name:"Volkswagen",
logo:"/assets/brands/opt/vw.png"
},

{
name:"Ford",
logo:"/assets/brands/opt/ford.png"
},

{
name:"Porsche",
logo:"/assets/brands/opt/porsche.png"
},

{
name:"Nissan",
logo:"/assets/brands/opt/nissan.png"
},

{
name:"Hyundai",
logo:"/assets/brands/opt/hyundai.png"
},

{
name:"Kia",
logo:"/assets/brands/opt/kia.png"
},

{
name:"Land Rover",
logo:"/assets/brands/opt/landrover.png"
},

{
name:"Suzuki",
logo:"/assets/brands/opt/suzuki.png"
}

];

let typeIndex = 0;

const TYPE_DATA = [

{
name:"Electric",
query:"electric",
bodyTypes:["Electric"],
icon:"electric"
},

{
name:"SUV",
query:"suv",
bodyTypes:["SUV"],
icon:"suv"
},

{
name:"Hatchback",
query:"hatchback",
bodyTypes:["Hatchback"],
icon:"hatchback"
},

{
name:"Sedan",
query:"sedan",
bodyTypes:["Sedan"],
icon:"sedan"
},

{
name:"Bakkie / Pickup",
query:"bakkie",
bodyTypes:["Bakkie","Double Cab"],
icon:"pickup"
},

{
name:"Coupe",
query:"coupe",
bodyTypes:["Coupe"],
icon:"coupe"
},

{
name:"Convertible",
query:"convertible",
bodyTypes:["Convertible"],
icon:"convertible"
},

{
name:"MPV / Minivan",
query:"mpv",
bodyTypes:["MPV","Minibus"],
icon:"mpv"
},

{
name:"Truck",
query:"truck",
bodyTypes:["Truck"],
icon:"truck"
},

{
name:"Motorcycle",
query:"motorcycle",
bodyTypes:["Motorcycle"],
icon:"motorcycle"
}

];

async function loadBrandCarousel(){

try{

const carousel =
document.getElementById(
"brandCarousel"
);

if(!carousel) return;

const brands =
[...BRAND_DATA]
.sort(()=>Math.random() - 0.5);

const countPromises =
brands.map(async (brand)=>{

const {
count
} = await supabase
.from("vehicles")
.select("*", {
count:"exact",
head:true
})
.ilike("make", brand.name);

return {
...brand,
count: count || 0
};

});

const results =
await Promise.all(countPromises);

window.brandResults = results;

renderBrandCarousel();

initBrandControls();

}catch(err){

console.error(
"Brand carousel error:",
err
);

/* Restore pre-skeleton behaviour on error:
   clear placeholders instead of leaving
   skeleton tiles stuck on screen */

const carousel =
document.getElementById(
"brandCarousel"
);

if(carousel){
carousel.innerHTML = "";
}

}

}

function renderBrandCarousel(){

const carousel =
document.getElementById(
"brandCarousel"
);

if(!carousel) return;

const data =
window.brandResults || [];

carousel.innerHTML =
data.map((brand)=>`

<div
onclick="openBrand('${brand.name}')"
class="
group
relative
min-w-[128px]
w-[128px]
h-[76px]
rounded-[10px]
overflow-hidden
bg-white
border
border-slate-100
transition-all
duration-300
cursor-pointer
hover:border-[#E48A2F]
hover:bg-slate-50
hover:-translate-y-[2px]
shadow-[0_8px_24px_rgba(15,23,42,0.04)]
hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]
flex
flex-col
items-center
justify-center
text-center
p-2.5
"
>

<div class="
absolute
inset-0
opacity-0
group-hover:opacity-100
transition-opacity
duration-500
bg-gradient-to-br
from-white/5
via-transparent
to-white/5
">
</div>

<div class="
relative
z-10
w-[32px]
h-[32px]
rounded-none
bg-transparent
flex
items-center
justify-center
p-0
">

<img
src="${brand.logo}"
alt="${brand.name}"
loading="lazy"
decoding="async"
fetchpriority="low"
class="
w-full
h-full
object-contain
transition-transform
duration-500
group-hover:scale-105
"
onerror="if(!this.dataset.f){this.dataset.f=1;this.src=this.src.replace('/brands/opt/','/brands/')}else{this.onerror=null;this.src='/placeholder.png'}"
>

</div>

<h3 class="
relative
z-10
text-[#081120]
font-semibold
text-[11px]
mt-0.5
leading-tight
tracking-tight
">
${brand.name}
</h3>


</div>

`).join("");

}

function initBrandControls(){

const prev =
document.getElementById(
"brandPrev"
);

const next =
document.getElementById(
"brandNext"
);

const carousel =
document.getElementById(
"brandCarousel"
);

const pagination =
document.getElementById(
"brandPagination"
);

if(!carousel) return;

const cardWidth = 139;
const visibleCards = 6;

function updateCarousel(){

const maxIndex =
Math.max(
0,
(window.brandResults?.length || 0)
- visibleCards
);

if(brandIndex > maxIndex){
brandIndex = maxIndex;
}

if(brandIndex < 0){
brandIndex = 0;
}

carousel.style.transform =
`translateX(-${brandIndex * cardWidth}px)`;

if(pagination){

const maxIndex =
Math.max(
0,
(window.brandResults?.length || 0)
- visibleCards
);

const pages =
Math.max(
1,
maxIndex + 1
);

pagination.innerHTML =
Array.from(
{ length: pages }
).map(()=>
'<button class="w-2 h-2 rounded-full bg-slate-300"></button>'
).join("");

const dots =
pagination.children;

const activePage =
Math.min(
pages - 1,
brandIndex
);

for(let i=0;i<dots.length;i++){

dots[i].className =
`
w-2
h-2
rounded-full
bg-slate-300
`;

}

if(dots[activePage]){

dots[activePage].className =
`
w-2
h-2
rounded-full
bg-slate-500
`;

}

}

}

if(prev){

prev.onclick = ()=>{

if(brandIndex <= 0){
return;
}

brandIndex--;

updateCarousel();

};

}

if(next){

next.onclick = ()=>{

const maxIndex =
Math.max(
0,
(window.brandResults?.length || 0)
- visibleCards
);

if(brandIndex >= maxIndex){
return;
}

brandIndex++;

updateCarousel();

};

}

updateCarousel();

}

function initBrowseToggle(){

const brandsTab =
document.getElementById("browseBrandsTab");

const typesTab =
document.getElementById("browseTypesTab");

const brandsPanel =
document.getElementById("brandsPanel");

const typesPanel =
document.getElementById("typesPanel");

if(
!brandsTab ||
!typesTab ||
!brandsPanel ||
!typesPanel
){
return;
}

brandsTab.onclick = ()=>{

brandsPanel.classList.remove("hidden");
typesPanel.classList.add("hidden");

brandsTab.className =
"text-[#E48A2F] font-bold text-[13px] border-b-2 border-[#E48A2F] pb-1.5";

typesTab.className =
"text-slate-400 font-bold text-[13px] pb-1.5";

};

typesTab.onclick = ()=>{

typesPanel.classList.remove("hidden");
brandsPanel.classList.add("hidden");

typesTab.className =
"text-[#E48A2F] font-bold text-[13px] border-b-2 border-[#E48A2F] pb-1.5";

brandsTab.className =
"text-slate-400 font-bold text-[13px] pb-1.5";

};

}

async function loadTypeCarousel(){

try{

const countPromises =
TYPE_DATA.map(async(type)=>{

const {
count
} = await supabase
.from("vehicles")
.select("*",{
count:"exact",
head:true
})
.eq("status","active")
.in(
"body_type",
type.bodyTypes || []
);

return {
...type,
count: count || 0
};

});

window.typeResults =
await Promise.all(countPromises);

renderTypeCarousel();

initTypeControls();

}catch(err){

console.error(
"Type carousel error:",
err
);

/* Restore pre-skeleton behaviour on error:
   clear placeholders instead of leaving
   skeleton tiles stuck on screen */

const carousel =
document.getElementById(
"typeCarousel"
);

if(carousel){
carousel.innerHTML = "";
}

}

}

const HUFA_TYPE_ICONS = {

electric: `
<svg viewBox="0 0 24 24" class="w-8 h-8" fill="none" stroke="#0A1B4E" stroke-width="1.8">
<path stroke-linecap="round" stroke-linejoin="round" d="M13 2L5 14h5l-1 8 8-12h-5l1-8z"/>
</svg>
`,

suv: `
<svg viewBox="0 0 24 24" class="w-8 h-8" fill="none" stroke="#0A1B4E" stroke-width="1.8">
<path d="M3 14l2-4h11l4 3h1v3H3z"/>
<circle cx="7" cy="17" r="1.5"/>
<circle cx="17" cy="17" r="1.5"/>
</svg>
`,

hatchback: `
<svg viewBox="0 0 24 24" class="w-8 h-8" fill="none" stroke="#0A1B4E" stroke-width="1.8">
<path d="M3 14l2-4h8l4 3h3v3H3z"/>
<circle cx="7" cy="17" r="1.5"/>
<circle cx="17" cy="17" r="1.5"/>
</svg>
`,

sedan: `
<svg viewBox="0 0 24 24" class="w-8 h-8" fill="none" stroke="#0A1B4E" stroke-width="1.8">
<path d="M3 14l2-4h11l3 3h2v3H3z"/>
<circle cx="7" cy="17" r="1.5"/>
<circle cx="17" cy="17" r="1.5"/>
</svg>
`,

pickup: `
<svg viewBox="0 0 24 24" class="w-8 h-8" fill="none" stroke="#0A1B4E" stroke-width="1.8">
<path d="M3 14h10V9h5l3 3v5H3z"/>
<circle cx="7" cy="17" r="1.5"/>
<circle cx="18" cy="17" r="1.5"/>
</svg>
`,

coupe: `
<svg viewBox="0 0 24 24" class="w-8 h-8" fill="none" stroke="#0A1B4E" stroke-width="1.8">
<path d="M3 14l3-4h8l5 3h2v3H3z"/>
<circle cx="7" cy="17" r="1.5"/>
<circle cx="17" cy="17" r="1.5"/>
</svg>
`,

mpv: `
<svg viewBox="0 0 24 24" class="w-8 h-8" fill="none" stroke="#0A1B4E" stroke-width="1.8">
<path d="M3 14l2-5h12l4 3v5H3z"/>
<circle cx="7" cy="17" r="1.5"/>
<circle cx="18" cy="17" r="1.5"/>
</svg>
`

};

function getTypeIcon(type){

const icons = {

electric:`
<svg
viewBox="0 0 48 32"
class="w-8 h-8 text-[#3B82F6] transition-opacity duration-300 group-hover:opacity-70"
fill="none"
stroke="currentColor"
stroke-width="2.5"
stroke-linecap="round"
stroke-linejoin="round"
aria-hidden="true"
>
<path d="M20 14Q12 14 12 20.5V26"/>
<rect x="20" y="8" width="16" height="12" rx="3"/>
<path d="M36 11.5H40"/>
<path d="M36 16.5H40"/>
</svg>
`,

suv:`
<svg
viewBox="0 0 48 32"
class="w-8 h-8 text-[#3B82F6] transition-opacity duration-300 group-hover:opacity-70"
fill="none"
stroke="currentColor"
stroke-width="2.5"
stroke-linecap="round"
stroke-linejoin="round"
aria-hidden="true"
>
<path d="M9 23H7Q4.5 23 4.5 20.5V15Q4.5 13 7 12.5L11.5 11.5L15 8Q16.2 6.5 18.2 6.5H30.5Q32.5 6.5 33.8 8L37.5 11.5L41 12.5Q43.5 13 43.5 15V20.5Q43.5 23 41 23H39"/>
<path d="M32 23H16"/>
<path d="M16.2 11.3L18.9 8.7Q19.4 8.3 20.1 8.3H30.3Q31 8.3 31.5 8.8L34.1 11.3"/>
<path d="M24.6 8.3V11.3"/>
<circle cx="12.5" cy="23" r="3.5"/>
<circle cx="35.5" cy="23" r="3.5"/>
</svg>
`,

hatchback:`
<svg
viewBox="0 0 48 32"
class="w-8 h-8 text-[#3B82F6] transition-opacity duration-300 group-hover:opacity-70"
fill="none"
stroke="currentColor"
stroke-width="2.5"
stroke-linecap="round"
stroke-linejoin="round"
aria-hidden="true"
>
<path d="M9.5 23H7.5Q5.5 23 5.5 21V18Q5.5 16.2 8 15.6L12.5 14.5L16.4 9.9Q17.7 8.4 19.7 8.4H26.4Q28.4 8.4 29.9 9.9L34.4 14.5L39.7 15.6Q42.2 16.2 42.2 18V21Q42.2 23 40.2 23H38"/>
<path d="M31 23H16.5"/>
<path d="M17.3 13.8L20.3 10.7Q20.8 10.3 21.5 10.3H25.9Q26.6 10.3 27.1 10.8L29.9 13.8"/>
<circle cx="13" cy="23" r="3.5"/>
<circle cx="34.5" cy="23" r="3.5"/>
</svg>
`,

sedan:`
<svg
viewBox="0 0 48 32"
class="w-8 h-8 text-[#3B82F6] transition-opacity duration-300 group-hover:opacity-70"
fill="none"
stroke="currentColor"
stroke-width="2.5"
stroke-linecap="round"
stroke-linejoin="round"
aria-hidden="true"
>
<path d="M8.5 23H5.5Q3.5 23 3.5 21V18Q3.5 16 6 15.5L12 14.2L16.8 9.6Q18.2 8.2 20.2 8.2H27.5Q29.5 8.2 31 9.7L35.5 14.2L41.8 15.5Q44.5 16 44.5 18V21Q44.5 23 42.5 23H39.5"/>
<path d="M32.5 23H15.5"/>
<path d="M17.5 13.6L20.8 10.4Q21.3 10 22 10H26.5Q27.2 10 27.7 10.5L30.8 13.6"/>
<circle cx="12" cy="23" r="3.5"/>
<circle cx="36" cy="23" r="3.5"/>
</svg>
`,

pickup:`
<svg
viewBox="0 0 48 32"
class="w-8 h-8 text-[#3B82F6] transition-opacity duration-300 group-hover:opacity-70"
fill="none"
stroke="currentColor"
stroke-width="2.5"
stroke-linecap="round"
stroke-linejoin="round"
aria-hidden="true"
>
<path d="M7.5 23H6Q4.5 23 4.5 21V12.5Q4.5 11 6 11H20.5V8.8Q20.5 7 22.3 7H28.3Q30.2 7 31.5 8.4L35.4 12.5L41.5 13.4Q43.5 13.8 43.5 15.8V21Q43.5 23 41.5 23H39.5"/>
<path d="M32.5 23H14.5"/>
<path d="M23.4 10.7H28.1L31 12.7"/>
<circle cx="11" cy="23" r="3.5"/>
<circle cx="36" cy="23" r="3.5"/>
</svg>
`,

coupe:`
<svg
viewBox="0 0 48 32"
class="w-8 h-8 text-[#3B82F6] transition-opacity duration-300 group-hover:opacity-70"
fill="none"
stroke="currentColor"
stroke-width="2.5"
stroke-linecap="round"
stroke-linejoin="round"
aria-hidden="true"
>
<path d="M8.5 23H6.5Q4.5 23 4.5 21V18.5Q4.5 16.8 6.5 16.2L14 14.4Q17.2 10.4 21.8 9.7L25.8 9.2Q30.8 9 34.3 12.4L36.4 14.4L41.5 15.7Q43.5 16.2 43.5 18.1V21Q43.5 23 41.5 23H39.5"/>
<path d="M32.5 23H15.5"/>
<path d="M17.2 13.9L21.6 11.3Q22.1 11 22.8 11H26.3Q27 11 27.5 11.4L30.6 13.7"/>
<circle cx="12" cy="23" r="3.5"/>
<circle cx="36" cy="23" r="3.5"/>
</svg>
`,

convertible:`
<svg
viewBox="0 0 48 32"
class="w-8 h-8 text-[#3B82F6] transition-opacity duration-300 group-hover:opacity-70"
fill="none"
stroke="currentColor"
stroke-width="2.5"
stroke-linecap="round"
stroke-linejoin="round"
aria-hidden="true"
>
<path d="M8.5 23H6.5Q4.5 23 4.5 21V18.5Q4.5 16.8 6.5 16.2L14 15.2Q16.2 12.9 19.4 12.3L27.6 11.5Q30.4 11.4 32.2 12.7L34.2 14.3L39.5 15.4Q42.5 16 42.5 18V21Q42.5 23 40.5 23H38.5"/>
<path d="M31.5 23H15.5"/>
<path d="M31.8 11.6L29.4 7.9"/>
<path d="M21.8 12.2V9.9Q21.8 9.3 22.4 9.3H23.6"/>
<circle cx="12" cy="23" r="3.5"/>
<circle cx="35" cy="23" r="3.5"/>
</svg>
`,

mpv:`
<svg
viewBox="0 0 48 32"
class="w-8 h-8 text-[#3B82F6] transition-opacity duration-300 group-hover:opacity-70"
fill="none"
stroke="currentColor"
stroke-width="2.5"
stroke-linecap="round"
stroke-linejoin="round"
aria-hidden="true"
>
<path d="M9 23H7Q4.8 23 4.8 20.8V13.5Q4.8 9.8 8.8 9.1L17.8 7.7Q20.8 6.9 25.8 6.9H30.8Q36.2 6.9 38.8 10.6L41.3 13.3Q43.2 13.9 43.2 16V20.8Q43.2 23 41 23H39"/>
<path d="M32 23H16"/>
<path d="M16.4 11.4Q19 9.2 24 9.1H30.4Q33.4 9.2 35.4 11.4"/>
<path d="M24.6 9.1V11.4"/>
<circle cx="12.5" cy="23" r="3.5"/>
<circle cx="35.5" cy="23" r="3.5"/>
</svg>
`,

truck:`
<svg
viewBox="0 0 48 32"
class="w-8 h-8 text-[#3B82F6] transition-opacity duration-300 group-hover:opacity-70"
fill="none"
stroke="currentColor"
stroke-width="2.5"
stroke-linecap="round"
stroke-linejoin="round"
aria-hidden="true"
>
<path d="M7.5 23H6Q4.5 23 4.5 21.5V8.5Q4.5 7 6 7H22.5Q24 7 24 8.5V13H31L34.5 16.8H41.5Q43.5 16.8 43.5 18.8V21.5Q43.5 23 41.5 23H40.5"/>
<path d="M33.5 23H14.5"/>
<path d="M8.5 10.7H20.5"/>
<circle cx="11" cy="23" r="3.5"/>
<circle cx="37" cy="23" r="3.5"/>
</svg>
`,

motorcycle:`
<svg
viewBox="0 0 48 32"
class="w-8 h-8 text-[#3B82F6] transition-opacity duration-300 group-hover:opacity-70"
fill="none"
stroke="currentColor"
stroke-width="2.5"
stroke-linecap="round"
stroke-linejoin="round"
aria-hidden="true"
>
<circle cx="11" cy="22" r="4.5"/>
<circle cx="37" cy="22" r="4.5"/>
<path d="M11 22L17 14.8H26"/>
<path d="M26 14.8L33.5 13L37 22"/>
<path d="M30.5 13H36"/>
</svg>
`

};

return icons[type] || icons.sedan;

}

function renderTypeCarousel(){


const carousel =
document.getElementById(
"typeCarousel"
);

if(!carousel) return;

carousel.innerHTML =
(window.typeResults || [])
.map(type => `
  
 

<div
onclick="quickSearch('${type.query}')"
class="
group
relative
min-w-[128px]
w-[128px]
h-[76px]
rounded-[10px]
overflow-hidden
bg-white
border
border-slate-100
transition-all
duration-300
cursor-pointer
hover:border-[#E48A2F]
hover:bg-slate-50
hover:-translate-y-[2px]
shadow-[0_8px_24px_rgba(15,23,42,0.04)]
hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]
flex
flex-col
items-center
justify-center
text-center
p-2.5
"
>

<div class="
w-[32px]
h-[32px]
flex
items-center
justify-center
mb-0.5
">

${getTypeIcon(type.icon)}

</div>

<h3 class="
text-[#081120]
font-semibold
text-[11px]
font-bold
mt-0.5
leading-tight
">
${type.name}
</h3>

<div class="
text-[10px]
text-slate-500
mt-[1px]
font-medium
">
${type.count} Vehicles
</div>

</div>

`).join("");

}

function initTypeControls(){

const prev =
document.getElementById(
"typePrev"
);

const next =
document.getElementById(
"typeNext"
);

const carousel =
document.getElementById(
"typeCarousel"
);

const pagination =
document.getElementById(
"typePagination"
);

if(!carousel) return;

const cardWidth = 139;
const visibleCards = 6;

function updateCarousel(){

const maxIndex =
Math.max(
0,
(window.typeResults?.length || 0)
- visibleCards
);

typeIndex =
Math.max(
0,
Math.min(typeIndex,maxIndex)
);

carousel.style.transform =
`translateX(-${typeIndex * cardWidth}px)`;

const pages =
Math.max(
1,
maxIndex + 1
);

pagination.innerHTML =
Array.from(
{length:pages}
).map(()=>
'<button class="w-2 h-2 rounded-full bg-slate-300"></button>'
).join("");

const dots =
pagination.children;

for(let i=0;i<dots.length;i++){

dots[i].className =
`
w-2
h-2
rounded-full
bg-slate-300
`;

}

if(dots[typeIndex]){

dots[typeIndex].className =
`
w-2
h-2
rounded-full
bg-slate-500
`;

}

}

if(prev){

prev.onclick = ()=>{

typeIndex--;

updateCarousel();

};

}

if(next){

next.onclick = ()=>{

typeIndex++;

updateCarousel();

};

}

updateCarousel();

}
/* ========================== */

async function init(){

/* PERFORMANCE FIX: removed a dead query here that downloaded
   80 full vehicle rows on every homepage visit and never used
   the result. Homepage sections fetch exactly what they render. */

await Promise.allSettled([

loadFeaturedSlider(),
loadBrandCarousel(),
loadRecommended()

]);

initBrowseToggle();

}

/* ========================== */

window.quickSearch = function(q = ""){

if(
typeof URLSearchParams === "undefined"
){
return;
}

const params = new URLSearchParams();

if(!q) return;

/* Record quick-chip / suggested searches as local search behaviour so
   the "Recommended For You" rail can reflect them (same storage the
   search bar uses). Deduped + most-recent-first via the shared shape. */
try{
  const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");
  const list = (Array.isArray(recent) ? recent : [])
    .map(x => String(x || "").trim())
    .filter(Boolean)
    .filter(x => x.toLowerCase() !== q.toLowerCase());
  list.unshift(q);
  localStorage.setItem("recentSearches", JSON.stringify(list.slice(0, 6)));
}catch(e){ /* storage unavailable — ignore */ }

params.set("q", q);

if(
typeof q === "string" &&
q.toLowerCase().includes("affordable")
){
params.set("term", 72);
params.set("interest", 10);
params.set("affordableOnly", true);
}

navigate("/browse?" + params.toString());

};

window.openBrand = function(make){

if(!make) return;

navigate(
"/browse?make=" +
encodeURIComponent(make)
);

};


/* ========================== */

async function loadRecommended(){

try{

const { data:userData, error:userError } =
await supabase.auth.getUser();

if(userError){
console.error(
"Auth error:",
userError
);
}

let results = [];

if(!userData?.user){

  /* 🔥 SIGNED-OUT RECOMMENDATIONS
     Built purely from the visitor's own search behaviour (terms
     already tracked in localStorage["recentSearches"] by the existing
     search-history infrastructure). We never fabricate: if the visitor
     has no recorded searches we simply render the empty state. */
  results = await loadRecommendedFromLocalSearch();

}else{

  /* 🔥 SIGNED-IN: existing personalized system kept intact */
  let maxPrice = 300000;

  const { data:credit } =
  await supabase
  .from("credit_scores")
  .select("*")
  .eq("user_id",userData.user.id)
  .single();

  if(credit){
    if(credit.score >= 700) maxPrice = 1000000;
    else if(credit.score >= 640) maxPrice = 500000;
    else if(credit.score >= 580) maxPrice = 250000;
  }

  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .lte("price", maxPrice)
    .limit(20); // get more for ranking

  results = Array.isArray(data)
    ? data
    : [];

  /* 🔥 PERSONALIZATION */
  const [
    userProfile,
    popularity
  ] = await Promise.allSettled([
    getUserProfile(),
    getPopularityMap()
  ]);

  const safeUserProfile =
    userProfile.status === "fulfilled"
    ? userProfile.value
    : null;

  const safePopularity =
    popularity.status === "fulfilled"
    ? popularity.value
    : {};

  results = rankVehicles(
    Array.isArray(results)
    ? results
    : [],
    {
      query: "",
      filters: { priceMax: maxPrice },
      user: safeUserProfile,
      popularity: safePopularity
    }
  );

  /* 🔥 LIMIT AFTER RANKING */
  results = (results || []).slice(0, 8);

}

render(
"recommended",
Array.isArray(results)
? results
: []
);

}catch(err){

console.error(
"loadRecommended error:",
err
);

render(
"recommended",
[]
);

}

}

/* ==========================
🔥 SIGNED-OUT RECOMMENDATIONS FROM LOCAL SEARCH BEHAVIOUR

Reuses the existing anonymous search-history storage
(localStorage["recentSearches"]) and the shared
mapToBrowseFilters()/searchVehicles()/rankVehicles() engine so that
recommendations match the visitor's actual search intent — make,
model, body type, fuel, transmission, ownership, verification,
budget/price and Smart Search phrases — exactly the way Browse does.
It never degrades to "just show the newest vehicles" and never
fabricates results for visitors with no recorded searches.
========================== */

async function loadRecommendedFromLocalSearch(){

let terms = [];
try{
  terms = JSON.parse(localStorage.getItem("recentSearches") || "[]");
}catch(e){
  terms = [];
}

terms = (Array.isArray(terms) ? terms : [])
  .map(t => String(t || "").trim())
  .filter(Boolean);

/* No recorded searches → no fabricated recommendations */
if(!terms.length) return [];

const [ popularity ] = await Promise.allSettled([
  getPopularityMap()
]);

const safePopularity =
  popularity.status === "fulfilled"
  ? popularity.value
  : {};

const seen = new Set();
const collected = [];

/* Most-recent search carries the strongest signal — start there.
   Keep a small set of signals to stay responsive. */
const signals = terms.slice(0, 4);

for(const term of signals){

  try{

    /* translate the stored search term into real browse filters
       (make/model/body/fuel/transmission/ownership/verification/
       price band + smart-search ranking hints) */
    const filters = mapToBrowseFilters({ q: term });

    const { data } = await searchVehicles(filters, { limit: 12 });

    (data || []).forEach(v => {
      if(v && v.id && !seen.has(v.id)){
        seen.add(v.id);
        collected.push(v);
      }
    });

  }catch(e){
    /* a single bad term must never break the whole section */
    console.warn(
      "Skipped recommendation signal:",
      term,
      e
    );
  }

}

if(!collected.length) return [];

/* Final popularity-aware pass through the shared rankVehicles system
   using the most recent intent as the primary ranking context. */
const ranked = rankVehicles(
  collected,
  {
    query: signals[0],
    filters: mapToBrowseFilters({ q: signals[0] }),
    user: null,
    popularity: safePopularity
  }
);

return (Array.isArray(ranked)
  ? ranked
  : collected).slice(0, 8);

}

/* ========================== */

async function loadSponsoredInventory(){

try{

const { data, error } =
await supabase
.from("vehicles")
.select("*")
.or(
"is_sponsored.eq.true,homepage_boost.eq.true"
)
.order("search_boost", {
ascending:false
})
.limit(8);

if(error){

console.error(
"Sponsored inventory error:",
error
);

render(
"sponsoredInventory",
[]
);

return;

}

render(
"sponsoredInventory",
Array.isArray(data)
? data
: []
);

}catch(err){

console.error(
"loadSponsoredInventory error:",
err
);

render(
"sponsoredInventory",
[]
);

}

}

/* ========================== */

/* ========================== */

async function loadLuxuryCollection(){

try{

const luxuryMakes = [
"BMW",
"Mercedes-Benz",
"Audi",
"Porsche",
"Land Rover",
"Range Rover",
"Lexus",
"Jaguar"
];

const { data, error } =
await supabase
.from("vehicles")
.select("*")
.in("make", luxuryMakes)
.limit(16);

if(error){

console.error(
"Luxury collection error:",
error
);

render(
"luxuryCollection",
[]
);

return;

}

const safeVehicles =
Array.isArray(data)
? data
: [];

safeVehicles.sort((a,b)=>{

let aScore = 0;
let bScore = 0;

if(a.is_sponsored) aScore += 200;
if(b.is_sponsored) bScore += 200;

if(a.premium_dealer) aScore += 140;
if(b.premium_dealer) bScore += 140;

if(a.homepage_boost) aScore += 120;
if(b.homepage_boost) bScore += 120;

aScore += Number(a.search_boost || 0);
bScore += Number(b.search_boost || 0);

return bScore - aScore;

});

render(
"luxuryCollection",
safeVehicles.slice(0,8)
);

}catch(err){

console.error(
"Luxury collection error:",
err
);

render(
"luxuryCollection",
[]
);

}

}

/* ========================== */

async function loadRecentArrivals(){

try{

const { data, error } =
await supabase
.from("vehicles")
.select("*")
.order("created_at", {
ascending:false
})
.limit(20);

if(error){

console.error(
"Recent arrivals error:",
error
);

render(
"recentArrivals",
[]
);

return;

}

const safeVehicles =
Array.isArray(data)
? data
: [];

safeVehicles.sort((a,b)=>{

let aScore = 0;
let bScore = 0;

if(a.is_sponsored) aScore += 120;
if(b.is_sponsored) bScore += 120;

if(a.homepage_boost) aScore += 100;
if(b.homepage_boost) bScore += 100;

const aDate =
new Date(a.created_at || 0).getTime();

const bDate =
new Date(b.created_at || 0).getTime();

aScore += aDate / 100000000;
bScore += bDate / 100000000;

return bScore - aScore;

});

render(
"recentArrivals",
safeVehicles.slice(0,8)
);

}catch(err){

console.error(
"loadRecentArrivals error:",
err
);

render(
"recentArrivals",
[]
);

}

}

/* ========================== */

async function loadFinanceDiscovery(){

try{

const financeSearches = [

"affordable suv",
"budget hatchback",
"cheap automatic",
"family suv"

];

const financeCards =
financeSearches.map((q)=>{

const intent =
parseIntent(q);

let monthly = "R4,999";

if(q.includes("family")){
monthly = "R8,999";
}

if(q.includes("automatic")){
monthly = "R5,999";
}

if(q.includes("suv")){
monthly = "R7,499";
}

return `
<div
onclick="quickSearch('${q}')"
class="
group
cursor-pointer
rounded-[30px]
overflow-hidden
bg-[linear-gradient(180deg,#081120,#0A192F)]
border
border-white/10
p-8
relative
hover:-translate-y-[4px]
transition-all
duration-500
shadow-[0_20px_60px_rgba(0,0,0,0.28)]
"
>

<div class="
absolute
top-0
right-0
w-40
h-40
bg-[#E48A2F]/10
blur-3xl
rounded-full
">
</div>

<div class="relative z-10">

<div class="
text-[#E48A2F]
text-xs
font-bold
tracking-[0.18em]
uppercase
mb-4
">
Finance Discovery
</div>

<h3 class="
text-white
text-2xl
font-bold
leading-tight
">
${q}
</h3>

<div class="
mt-6
text-white/60
text-sm
">
Estimated From
</div>

<div class="
text-[#E7C87F]
text-4xl
font-extrabold
tracking-tight
mt-1
">
${monthly}
<span class="text-lg text-white/50">
/mo
</span>
</div>

<button class="
mt-8
w-full
rounded-2xl
bg-[#E48A2F]
hover:brightness-110
text-black
font-semibold
py-4
transition-all
duration-300
">
Explore Vehicles
</button>

</div>

</div>
`;

});

const box =
document.getElementById(
"financeDiscovery"
);

if(box){
box.innerHTML =
financeCards.join("");
}

}catch(err){

console.error(
"Finance discovery error:",
err
);

}

}

/* ========================== */

async function loadPremiumDealers(){

try{

const { data, error } =
await supabase
.from("vehicles")
.select("*")
.eq("premium_dealer", true)
.order("dealer_priority", {
ascending:false
})
.limit(6);

if(error){

console.error(
"Premium dealer error:",
error
);

render(
"premiumDealers",
[]
);

return;

}

render(
"premiumDealers",
Array.isArray(data)
? data
: []
);

}catch(err){

console.error(
"loadPremiumDealers error:",
err
);

render(
"premiumDealers",
[]
);

}

}

/* ========================== */

async function loadFeatured(
preloadedVehicles = null
){

try{

let data = preloadedVehicles;
let error = null;

if(!data){

const response =
await supabase
.from("vehicles")
.select("*")
.limit(40);

data = response.data;
error = response.error;

}

if(error){
console.error(
"Featured load error:",
error
);

render("featured", []);
return;
}

const safeVehicles =
Array.isArray(data)
? data
: [];

/* =========================================
🔥 AI HOMEPAGE RANKING
========================================= */

const [
userProfile,
popularity
] = await Promise.allSettled([

getUserProfile(),
getPopularityMap()

]);

const safeUserProfile =
userProfile.status === "fulfilled"
? userProfile.value
: null;

const safePopularity =
popularity.status === "fulfilled"
? popularity.value
: {};

const ranked =
rankVehicles(
safeVehicles,
{
query:"",
filters:{},
user:safeUserProfile,
popularity:safePopularity
}
);

safeVehicles.length = 0;

ranked.forEach(v=>{
safeVehicles.push(v);
});

render(
"featured",
safeVehicles.slice(0, 8)
);

}catch(err){

console.error(
"loadFeatured error:",
err
);

render(
"featured",
[]
);

}

}

/* ========================== */
/* 🔥 TRENDING VEHICLES */
/* ========================== */

async function loadTrendingVehicles(){

try{

const { data, error } =
await supabase
.from("vehicles")
.select("*")
.limit(40);

if(error){

console.error(
"Trending vehicles error:",
error
);

render(
"trendingVehicles",
[]
);

return;

}

const safeVehicles =
Array.isArray(data)
? data
: [];

const [
userProfile,
popularity
] = await Promise.allSettled([

getUserProfile(),
getPopularityMap()

]);

const safeUserProfile =
userProfile.status === "fulfilled"
? userProfile.value
: null;

const safePopularity =
popularity.status === "fulfilled"
? popularity.value
: {};

const ranked =
rankVehicles(
safeVehicles,
{
query:"",
filters:{},
user:safeUserProfile,
popularity:safePopularity
}
);

render(
"trendingVehicles",
ranked.slice(0,8)
);

}catch(err){

console.error(
"loadTrendingVehicles error:",
err
);

render(
"trendingVehicles",
[]
);

}

}

/* ========================== */

function render(id,list){

if(!id) return;

const box =
document.getElementById(id);

if(
!box ||
!document.body.contains(box)
){
return;
}

box.innerHTML = "";

if(!list || !list.length){
box.innerHTML = `
<div class="
col-span-full
relative
overflow-hidden
rounded-2xl
border
border-slate-200/70
bg-gradient-to-br
from-white
to-[#f8fafc]
px-6
py-8
text-center
shadow-[0_1px_2px_rgba(15,23,42,0.04)]
">
<div class="
inline-flex
items-center
justify-center
w-10
h-10
mb-3
rounded-full
bg-[#eef3f9]
text-[#08111F]/60
">
<span class="material-symbols-outlined text-[22px]">directions_car</span>
</div>
<p class="
text-[15px]
font-semibold
text-[#08111F]
tracking-[-0.01em]
">
No vehicles yet
</p>
</div>
`;
return;
}

(list || []).forEach((v)=>{

  box.insertAdjacentHTML("beforeend", renderVehicleCard(v, {
    actions: "none"
  }));

});
}

/* ==========================
/* =========================================
   PHASE 2 — FEATURED DEALERSHIP IDENTITY
   Renders the dealership logo + name associated
   with each featured vehicle into the blank
   space to the right of the vehicle content.
   Data always comes from the vehicle's existing
   seller profile (via seller_id) — never hard-coded.
   Image priority: dealership_logo → avatar_url →
   HUFA-style initials fallback.
========================================= */

function huEscapeHtml(value){

const AMP = String.fromCharCode(38);
const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);
const QUOT = String.fromCharCode(34);

return String(value ?? "")
.replace(/&/g, AMP + "amp;")
.replace(/</g, AMP + "lt;")
.replace(/>/g, AMP + "gt;")
.replace(/"/g, AMP + "quot;")
.replace(/'/g, AMP + "#39;");

}

function computeFeaturedInitials(profile){

const dealership =
((profile || {}).dealership_name || "").trim();

const first =
((profile || {}).name || "").trim();

const surname =
((profile || {}).surname || "").trim();

const source =
profile?.account_type === "dealer" && dealership
? dealership
: `${first} ${surname}`.trim();

if(!source) return "HU";

const words = source.split(/\s+/).filter(Boolean);

if(words.length >= 2){
return (
words[0].charAt(0) +
words[1].charAt(0)
).toUpperCase();
}

return (source.slice(0, 2).toUpperCase() || "HU");

}

/* Compact inline icons for the featured dealership contact lines.
   Existing HUFA stroke/colour language — orange accents on the
   platform's navy counter, matching the rest of the card. */
const HUFA_FEATURED_DEALER_ICONS = {

  pin: `<svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,

  phone: `<svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>`,

  mail: `<svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 5L2 7"/></svg>`,

  globe: `<svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20 15.3 15.3 0 010-20z"/></svg>`

};

/* Dealer-only contact lines, built straight from the vehicle's actual
   seller profile. Only fields that actually carry a value are returned;
   nothing is invented and nothing is shown for private sellers. */
function huFeaturedDealerContact(profile){

  const lines = [];

  const address =
  (profile?.dealership_address || "").trim();
  if(address) lines.push({ icon: "pin", text: address });

  const phone =
  ((profile?.phone || "").trim()) ||
  ((profile?.mobile_number || "").trim());
  if(phone) lines.push({ icon: "phone", text: phone });

  const email =
  (profile?.dealership_email || "").trim();
  if(email) lines.push({ icon: "mail", text: email });

  const website =
  (profile?.website || "").trim();
  if(website){
    lines.push({
      icon: "globe",
      text: website.replace(/^https?:\/\//i, "")
    });
  }

  return lines;

}

function renderFeaturedDealer(profile){

  /* Clean empty state — no seller, nothing to show. */
  if(!profile) return "";

  const isDealer =
  profile?.account_type === "dealer";

  const dealershipName =
  (profile?.dealership_name || "").trim();

  const logo =
  ((profile?.dealership_logo || "").trim()) ||
  ((profile?.avatar_url || "").trim());

  const initials =
  computeFeaturedInitials(profile);

  const displayName =
  isDealer && dealershipName
  ? dealershipName
  : (
    `${(profile?.name || "").trim()} ${(profile?.surname || "").trim()}`.trim()
    || "Private Seller"
  );

  const caption =
  isDealer && dealershipName
  ? "Verified Dealer"
  : "Private Seller";

  const safeName = huEscapeHtml(displayName);
  const safeId = huEscapeHtml(String(profile?.id || ""));

  const logoBlock = logo
? `
<img
src="${huEscapeHtml(logo)}"
alt="${safeName}"
loading="lazy"
decoding="async"
class="hufa-featured-dealer-logo"
onerror="hufaDealerLogoFallback(this, '${huEscapeHtml(initials)}')"
/>
`
: `
<div class="hufa-featured-dealer-mark hufa-featured-dealer-mark--initials">${huEscapeHtml(initials)}</div>
`;

  /* Secondary dealer details — dealerships only. The public seller
     profile route (/seller) already exists, so a quiet View Dealer
     link reuses it instead of inventing new navigation. */
  let details = "";

  if(isDealer && dealershipName){

    const contact = huFeaturedDealerContact(profile)
      .map(({ icon, text }) => `
      <div class="hufa-featured-dealer-line">
        <span class="hufa-featured-dealer-ic">${HUFA_FEATURED_DEALER_ICONS[icon] || ""}</span>
        <span class="hufa-featured-dealer-txt">${huEscapeHtml(text)}</span>
      </div>`)
      .join("");

    details = `
    <div class="hufa-featured-dealer-details">
      ${contact}
      <button
        type="button"
        onclick="event.stopPropagation(); navigate('/seller?id=${safeId}')"
        class="hufa-featured-dealer-view"
        aria-label="View ${safeName} dealer profile"
      >
        <span>View Dealer</span>
        <svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>`;

  }

  return `
  <div class="hufa-featured-dealer-wrap">
    <div class="hufa-featured-dealer">
      ${logoBlock}
      <div class="hufa-featured-dealer-meta">
        <div class="hufa-featured-dealer-name">${safeName}</div>
        <div class="hufa-featured-dealer-caption">${huEscapeHtml(caption)}</div>
      </div>
    </div>
    ${details}
  </div>
`;

}

/* Fallback when a dealership logo fails to load —
   swaps the broken image for the clean initials mark. */
window.hufaDealerLogoFallback = (imgEl, initials)=>{

if(!imgEl) return;

const wrap = imgEl.parentNode;

const mark = document.createElement("div");
mark.className =
"hufa-featured-dealer-mark hufa-featured-dealer-mark--initials";
mark.textContent = initials || "HU";

if(wrap){
imgEl.replaceWith(mark);
} else {
imgEl.remove();
}

};

/* =========================================
   HOMEPAGE FEATURED SAVE STATE
   Mirrors the Vehicle Details page save
   behaviour (auth check + saved_vehicles
   upsert/delete). Appearance only.
========================================= */

let homeSavedIds = [];

async function loadHomeSavedIds(){

try{

  const { data:userData } =
  await supabase.auth.getUser();

  if(!userData.user){
    homeSavedIds = [];
    return;
  }

  const { data } =
  await supabase
  .from("saved_vehicles")
  .select("vehicle_id")
  .eq("user_id", userData.user.id);

  homeSavedIds =
  (data || []).map(x=>x.vehicle_id);

}catch(err){

  homeSavedIds = [];

}

}

function updateHomeSaveButtons(){

document
.querySelectorAll("[data-home-save]")
.forEach(btn=>{

  const saved =
  homeSavedIds.includes(btn.dataset.homeSave);

  btn.classList.toggle("border-[#3B82F6]", saved);
  btn.classList.toggle("bg-[#3B82F6]/10", saved);
  btn.classList.toggle("border-slate-200", !saved);
  btn.classList.toggle("bg-white", !saved);

  const svg = btn.querySelector("svg");

  if(svg){
    svg.classList.toggle("text-[#3B82F6]", saved);
    svg.classList.toggle("text-slate-700", !saved);
  }

});

}

window.hufaToggleSave = async function(id){

if(!id) return;

const { data:userData } =
await supabase.auth.getUser();

if(!userData.user){

  toast("Login to save vehicles");
  navigate("/login");
  return;

}

if(homeSavedIds.includes(id)){

  const { error } =
  await supabase
  .from("saved_vehicles")
  .delete()
  .eq("user_id", userData.user.id)
  .eq("vehicle_id", id);

  if(error){
    toast("Failed to update saved vehicle");
    return;
  }

  homeSavedIds =
  homeSavedIds.filter(x => x !== id);

  toast("Removed from saved");

}else{

  const { error } =
  await supabase
  .from("saved_vehicles")
  .upsert({
    user_id: userData.user.id,
    vehicle_id: id
  }, { onConflict: ["user_id","vehicle_id"] });

  if(error){
    toast("Failed to save vehicle");
    return;
  }

  homeSavedIds.push(id);

  toast("Saved successfully");

}

updateHomeSaveButtons();

};

/* ==========================
   FEATURED HOMEPAGE SLIDER

   FEATURED HOMEPAGE SLIDER
========================== */

async function loadFeaturedSlider(){

try{

const showcase =
document.getElementById("featuredShowcase");

if(!showcase) return;

await loadHomeSavedIds();

  /* ==========================
     LOAD FEATURED VEHICLES
  ========================== */

  let { data:vehicles, error } =
    await supabase
      .from("vehicles")
      .select("*")
      .eq("is_featured", true)
      .order("created_at", { ascending:false })
      .limit(12);

  /* ==========================
     FALLBACK
  ========================== */

  if(!vehicles || !vehicles.length){

    const fallback =
      await supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending:false })
        .limit(12);

    vehicles = fallback.data || [];

  }

  if(error){
    console.error(
"Featured slider error:",
error
);
  }

  if(!vehicles || !vehicles.length){

showcase.innerHTML = `
<div class="
bg-white
border
border-slate-200
rounded-[20px]
p-8
text-center
text-slate-500
">
No featured vehicles found
</div>
`;

return;

}

  /* ==========================
     DUPLICATE FOR LOOPING
  ========================== */

  const safeVehicles =
Array.isArray(vehicles)
? vehicles
: [];

  /* =========================================
  FEATURED SLIDER PRIORITY
  ========================================= */

  safeVehicles.sort((a,b)=>{

  let aScore = 0;
  let bScore = 0;

  if(a.is_sponsored) aScore += 120;
  if(b.is_sponsored) bScore += 120;

  if(a.homepage_boost) aScore += 80;
  if(b.homepage_boost) bScore += 80;

  if(a.premium_dealer) aScore += 60;
  if(b.premium_dealer) bScore += 60;

  aScore += Number(a.search_boost || 0);
  bScore += Number(b.search_boost || 0);

  return bScore - aScore;

  });

  const featuredSlides =
  safeVehicles.slice(0, 12);

  /* =========================================
     PHASE 2 — DEALERSHIP IDENTITY LOAD
     Batch-fetch the seller profile for every
     featured vehicle so the dealership logo +
     name can be rendered from real data.
  ========================================= */
  const featuredSellerIds =
  featuredSlides
  .map((v)=>v?.seller_id)
  .filter(Boolean);

  const featuredDealers = {};

  const FEATURED_PROFILE_BASE =
"id, dealership_name, dealership_logo, avatar_url, name, surname, account_type";

  const FEATURED_PROFILE_EXTENDED =
FEATURED_PROFILE_BASE +
", dealership_email, phone, mobile_number, dealership_address, website, social_links";

  let featuredDealerRows = null;

  if(featuredSellerIds.length){

    /* Preferred query includes the Phase 3 dealership contact fields.
       If those columns are not yet present (pre-migration DB), the
       extended select is rejected by PostgREST, so we fall back to the
       base identity columns exactly like the vehicle page does — the
       logo + name still render and the optional contact extras simple
       stay empty. No schema is created here. */
    const extended =
      await supabase
        .from("profiles")
        .select(FEATURED_PROFILE_EXTENDED)
        .in("id", featuredSellerIds);

    if(extended.error || !extended.data){

      const base =
        await supabase
          .from("profiles")
          .select(FEATURED_PROFILE_BASE)
          .in("id", featuredSellerIds);

      featuredDealerRows = base.data || [];

    }else{

      featuredDealerRows = extended.data;

    }

    (featuredDealerRows || []).forEach((p)=>{
      featuredDealers[p?.id] = p;
    });

  }

  showcase.innerHTML = `

  <div
  class="
  relative
  w-full
  overflow-hidden
  rounded-[20px]
  group
  "
  >

  <div
  id="featuredSliderViewport"
  class="
  relative
  w-full
  overflow-hidden
  rounded-[20px]
  bg-white
  border
  border-slate-200
  shadow-[0_8px_24px_rgba(15,23,42,0.04)]
  "
  >

  <div
  id="featuredSliderTrack"
  class="
  flex
  w-full
  transition-transform
  duration-700
  ease-in-out
  "
  >

  ${featuredSlides.map((vehicle, slideIndex) => `

  <div
  class="
  w-full
  min-w-full
  flex-none
  "
  data-featured-slide="${vehicle.id}"
  >

  <div
  class="
  featured-spotlight-card
  mx-auto
  max-w-[1000px]
  flex
  flex-col
  lg:flex-row
  gap-0
  overflow-hidden
  rounded-[16px]
  bg-white
  border
  border-slate-200
  shadow-[0_4px_16px_rgba(15,23,42,0.03)]
  "
  >

  <!-- IMAGE -->

  <div
  class="
  relative
  flex-none
  w-full
  lg:w-[40%]
  h-[180px]
  lg:h-[200px]
  bg-slate-100
  overflow-hidden
  p-3 lg:p-4
  box-border
  "
  >

  <img
  src="${vehicle?.image_url || '/placeholder.png'}"
  width="470"
  height="200"
  loading="${slideIndex === 0 ? "eager" : "lazy"}"
  ${slideIndex === 0 ? 'fetchpriority="high"' : ""}
  decoding="async"
  alt="${vehicle?.make || ''} ${vehicle?.model || ''}"
  onerror="this.src='/placeholder.png'"
  class="
  absolute
  inset-0
  w-full
  h-full
  object-contain
  "
  />

  </div>

  <!-- CONTENT -->

  <div
  class="
  flex
  flex-col
  flex-1
  p-5
  lg:pl-6
  lg:pr-5
  lg:py-5
  min-w-0
  huafa-featured-slide-body
  "
  >

  <!-- FEATURED BADGE -->

  <div
  class="
  inline-flex
  items-center
  gap-1.5
  self-start
  px-3
  py-1
  rounded-full
  bg-[#E48A2F]
  text-white
  text-[10px]
  font-bold
  tracking-[0.12em]
  uppercase
  "
  >

  <span class="w-1.5 h-1.5 rounded-full bg-white"></span>

  Featured

  </div>

  <!-- VEHICLE NAME -->

  <h2
  class="
  mt-2
  text-[20px]
  font-black
  tracking-[-0.04em]
  leading-tight
  text-[#081120]
  "
  >

  ${vehicle?.make || ""}

  ${vehicle?.model
  ? " " + vehicle.model
  : ""}

  </h2>

  <!-- COMPACT METADATA -->

  <div
  class="
  mt-2
  flex
  flex-wrap
  items-center
  gap-x-2
  text-[13px]
  font-medium
  text-slate-500
  "
  >

  <span class="text-[#081120]">
  ${vehicle?.year || ""}
  </span>

  <span>•</span>

  <span>
  ${Number(vehicle?.mileage || 0).toLocaleString()} km
  </span>

  <span>•</span>

  <span>
  ${vehicle?.body_type || ""}
  </span>

  <span>•</span>

  <span>
  ${vehicle?.fuel_type || ""}
  </span>

  </div>

  <!-- PRICE -->

  <div
  class="
  mt-3
  "
  >

  <div
  class="
  text-[22px]
  font-black
  tracking-tight
  text-[#E48A2F]
  "
  >
  R ${Number(vehicle?.price || 0).toLocaleString()}
  </div>

  <div
  class="
  text-[12px]
  text-slate-500
  "
  >
  Estimated Price
  </div>

  </div>

  <!-- DEALER STATUS -->

  <div
  class="
  mt-2
  inline-flex
  items-center
  gap-2
  "
  >

  <div
  class="
  w-2
  h-2
  rounded-full
  ${vehicle?.seller_type === "dealer"
  ? "bg-emerald-500"
  : "bg-slate-400"}
  "
  >
  </div>

  <span
  class="
  text-[13px]
  font-semibold
  text-[#081120]
  "
  >

  ${vehicle?.seller_type === "dealer"
  ? "Dealer"
  : "Private Seller"}

  </span>

  </div>

  <!-- DEALERSHIP IDENTITY (PHASE 2) — sits in the blank
       space to the right of the vehicle content -->

  ${renderFeaturedDealer(featuredDealers[vehicle?.seller_id])}

  <!-- ACTIONS -->

  <div
  class="
  mt-3
  grid
  grid-cols-1
  sm:grid-cols-[1fr_auto_auto]
  gap-2
  "
  >

  <button
  onclick="viewVehicle('${vehicle?.id || ''}')"
  class="
  h-10
  rounded-xl
  ${vehicle?.is_featured ? 'bg-[#E48A2F] hover:bg-[#D67E2C]' : 'bg-[#005BBF] hover:bg-[#004FA8]'}
  text-white
  text-[13px]
  font-semibold
  transition-all
  duration-300
  flex
  items-center
  justify-center
  gap-1.5
  "
  >

  View Vehicle →

  </button>

  <!-- Save — compact circular control matching Vehicle Details page -->
  <button
  type="button"
  data-home-save="${vehicle?.id || ''}"
  onclick="event.stopPropagation(); window.hufaToggleSave && hufaToggleSave('${vehicle?.id || ''}')"
  class="
  w-8
  h-8
  rounded-full
  border
  flex
  items-center
  justify-center
  transition-all
  ${homeSavedIds.includes(vehicle?.id) ? 'border-[#3B82F6] bg-[#3B82F6]/10' : 'border-slate-200 bg-white hover:border-[#3B82F6]'}
  "
  title="Save Vehicle"
  >

  <svg
  class="w-6 h-6 text-slate-700"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  viewBox="0 0 24 24"
  >
  <path
  stroke-linecap="round"
  stroke-linejoin="round"
  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z"
  />
  </svg>

  </button>

  <!-- Compare — compact circular control matching Vehicle Details page -->
  <label
  onclick="event.stopPropagation()"
  class="
  w-8
  h-8
  rounded-full
  border
  flex
  items-center
  justify-center
  cursor-pointer
  transition-all
  ${getCompare().includes(vehicle?.id) ? 'border-[#3B82F6] bg-[#3B82F6]/10' : 'border-slate-200 bg-white hover:border-[#3B82F6]'}
  "
  title="Compare Vehicle"
  >

  <input
  type="checkbox"
  data-compare="${vehicle?.id || ''}"
  ${getCompare().includes(vehicle?.id) ? "checked" : ""}
  onchange="event.stopPropagation(); window.toggleVehicleCompare && toggleVehicleCompare('${vehicle?.id || ''}')"
  class="hidden"
  />

  <svg
  class="w-6 h-6 ${getCompare().includes(vehicle?.id) ? 'text-[#3B82F6]' : 'text-slate-700'}"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  viewBox="0 0 24 24"
  >
  <path stroke-linecap="round" stroke-linejoin="round" d="M4 7h7"/>
  <path stroke-linecap="round" stroke-linejoin="round" d="M4 17h7"/>
  <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h7"/>
  <path stroke-linecap="round" stroke-linejoin="round" d="M13 17h7"/>
  <circle cx="10" cy="7" r="2"/>
  <circle cx="14" cy="17" r="2"/>
  </svg>

  </label>

  </div>

  </div>

  </div>

  </div>

  </div>

  </div>
  `).join("")}

  <!-- PREV / NEXT ARROWS -->

  <button
  id="featuredPrev"
  class="
  absolute
  left-3
  top-1/2
  -translate-y-1/2
  z-30
  w-9
  h-9
  rounded-full
  bg-white/90
  hover:bg-white
  border
  border-slate-200
  shadow
  flex
  items-center
  justify-center
  text-slate-600
  hover:text-[#081120]
  transition-all
  duration-300
  opacity-0
  group-hover:opacity-100
  "
  aria-label="Previous vehicle"
  >
  <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
  </svg>
  </button>

  <button
  id="featuredNext"
  class="
  absolute
  right-3
  top-1/2
  -translate-y-1/2
  z-30
  w-9
  h-9
  rounded-full
  bg-white/90
  hover:bg-white
  border
  border-slate-200
  shadow
  flex
  items-center
  justify-center
  text-slate-600
  hover:text-[#081120]
  transition-all
  duration-300
  opacity-0
  group-hover:opacity-100
  "
  aria-label="Next vehicle"
  >
  <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
  </svg>
  </button>

  <!-- PAGINATION DOTS -->

  <div
  id="featuredDots"
  class="
  flex
  justify-center
  items-center
  gap-2
  mt-4
  "
  >
  ${featuredSlides.map((_, i) => `
  <button
  class="
  w-2.5
  h-2.5
  rounded-full
  transition-all
  duration-300
  ${i === 0
  ? 'bg-[#0A192F] w-3'
  : 'bg-slate-300 hover:bg-slate-400'}
  "
  data-featured-dot="${i}"
  aria-label="Go to slide ${i + 1}"
  >
  </button>
  `).join("")}
  </div>

  </div>

  `;

  /* ==========================
     INIT SLIDER
  ========================== */

  initFeaturedSlider();

}catch(err){

console.error(
"loadFeaturedSlider error:",
err
);

const showcase =
document.getElementById(
"featuredShowcase"
);

if(showcase){

showcase.innerHTML = `
<div class="
bg-white
border
border-red-200
rounded-[20px]
p-8
text-center
text-red-500
">
Failed to load featured vehicles
</div>
`;

}

}

}

/* ==========================
   FEATURED SLIDER CONTROLS
========================== */

let featuredIndex = 0;
let featuredTimer = null;
let featuredPaused = false;

function initFeaturedSlider(){

const viewport =
document.getElementById("featuredSliderViewport");

const track =
document.getElementById("featuredSliderTrack");

const prevBtn =
document.getElementById("featuredPrev");

const nextBtn =
document.getElementById("featuredNext");

const dots =
document.getElementById("featuredDots");

if(!track || !viewport) return;

const slides = track.children;
const total = slides.length;

if(total < 2) return;

function goToSlide(index){

featuredIndex = index;

if(featuredIndex < 0){
featuredIndex = total - 1;
}

if(featuredIndex >= total){
featuredIndex = 0;
}

track.style.transform =
`translateX(-${featuredIndex * 100}%)`;

/* update dots */
if(dots){
const dotButtons = dots.children;
for(let i = 0; i < dotButtons.length; i++){
dotButtons[i].className =
"w-2.5 h-2.5 rounded-full transition-all duration-300 " +
(i === featuredIndex
? "bg-[#0A192F] w-3"
: "bg-slate-300 hover:bg-slate-400");
}
}

}

function nextSlide(){
goToSlide(featuredIndex + 1);
}

function prevSlide(){
goToSlide(featuredIndex - 1);
}

/* PREV */
if(prevBtn){
prevBtn.onclick = (e)=>{
e.stopPropagation();
prevSlide();
};
}

/* NEXT */
if(nextBtn){
nextBtn.onclick = (e)=>{
e.stopPropagation();
nextSlide();
};
}

/* DOTS */
if(dots){
const dotButtons = dots.children;
for(let i = 0; i < dotButtons.length; i++){
dotButtons[i].onclick = (e)=>{
e.stopPropagation();
goToSlide(i);
};
}
}

/* ==========================
   AUTO-PLAY
========================== */

function startAutoPlay(){

stopAutoPlay();

featuredTimer = setInterval(()=>{

if(!featuredPaused){
nextSlide();
}

}, 5000);

}

function stopAutoPlay(){

if(featuredTimer){
clearInterval(featuredTimer);
featuredTimer = null;
}

}

/* ==========================
   HOVER PAUSE (DESKTOP)
========================== */

if(viewport){
viewport.addEventListener("mouseenter", ()=>{
featuredPaused = true;
});

viewport.addEventListener("mouseleave", ()=>{
featuredPaused = false;
});
}

/* ==========================
   SWIPE SUPPORT (MOBILE)
========================== */

let touchStartX = 0;
let touchEndX = 0;
let swiping = false;

if(viewport){

viewport.addEventListener("touchstart", (e)=>{
touchStartX = e.changedTouches[0].screenX;
swiping = true;
}, { passive: true });

viewport.addEventListener("touchmove", (e)=>{
if(!swiping) return;
touchEndX = e.changedTouches[0].screenX;
}, { passive: true });

viewport.addEventListener("touchend", (e)=>{
if(!swiping) return;
swiping = false;

const diff = touchStartX - touchEndX;
const threshold = 50;

if(Math.abs(diff) > threshold){
if(diff > 0){
nextSlide();
}else{
prevSlide();
}
}

}, { passive: true });

}

/* ==========================
   RESIZE HANDLER
========================== */

let resizeTimeout;
const onResize = ()=>{
clearTimeout(resizeTimeout);
resizeTimeout = setTimeout(()=>{
/* re-apply position in case layout changed */
track.style.transform =
`translateX(-${featuredIndex * 100}%)`;
}, 100);
};

window.addEventListener("resize", onResize);

/* store cleanup */
featuredCleanup = ()=>{
stopAutoPlay();
window.removeEventListener("resize", onResize);
};

/* START */
startAutoPlay();

}

let featuredCleanup = null;

window.viewVehicle = (id = "")=>{

if(!id) return;

navigate("/vehicle?id=" + id);

};
