import { supabase } from "../js/api.js";
import { navigate } from "../js/router.js";
import { toast } from "../js/ui.js";
import { renderVehicleCard } from "../components/vehicleCard.js";
import { toggleCompare } from "../js/ui.js";

/* ============================================================
   SELLER / DEALER SHOWCASE PAGE
   A premium digital dealership showroom built on the existing
   /seller?id= route. Reuses the standard HUFA vehicle card,
   the existing profile + inventory retrieval, and the HUFA
   homepage heading/typography language. No schema / RLS /
   auth changes.
   ============================================================ */

let seller = null;
let vehicles = [];
let searchTerm = "";
let sortMode = "recommended"; // recommended | priceAsc | priceDesc | newest | oldest | mileageLow | mileageHigh
let savedSet = new Set();

export function SellerPage() {

  setTimeout(init, 0);

  return `
<div class="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 py-6 md:py-8">

  <div id="sellerBox">
    ${renderSellerHeaderSkeleton()}
  </div>

  <div id="sellerInventory"></div>

</div>
`;

}

/* ========================== */
/* LOADING SKELETON (header)  */
/* ========================== */

function renderSellerHeaderSkeleton() {
  return `
  <div class="relative overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 bg-white p-6 md:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
      <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 flex-1 min-w-0">
        <div class="skeleton-shimmer h-[72px] w-[72px] rounded-xl shrink-0"></div>
        <div class="min-w-0 flex-1 space-y-3">
          <div class="skeleton-shimmer h-3 w-28 rounded"></div>
          <div class="skeleton-shimmer h-8 w-52 rounded-md"></div>
          <div class="skeleton-shimmer h-4 w-72 rounded"></div>
          <div class="skeleton-shimmer h-9 w-full max-w-md rounded-md"></div>
        </div>
      </div>
      <div class="hidden sm:block shrink-0">
        <div class="flex flex-col items-end gap-2">
          <div class="skeleton-shimmer h-3 w-16 rounded"></div>
          <div class="skeleton-shimmer h-10 w-12 rounded-md"></div>
          <div class="skeleton-shimmer h-3 w-20 rounded"></div>
        </div>
      </div>
    </div>
  </div>
  `;
}

/* ========================== */
/* INIT                        */
/* ========================== */

async function init() {

  const id =
    new URLSearchParams(window.location.search).get("id");

  if (!id) {
    renderError("Dealer not found");
    return;
  }

  /* Reset per-mount state so navigation between sellers is clean. */
  seller = null;
  vehicles = [];
  searchTerm = "";
  sortMode = "recommended";
  savedSet = new Set();

  /* Load public seller profile (existing queries — no schema changes). */
  let profile = null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Seller profile error:", error);
  }
  if (data) profile = data;

  /* Load this seller's inventory only (never the whole marketplace). */
  const { data: vehicleData, error: vehicleError } = await supabase
    .from("vehicles")
    .select("*")
    .eq("seller_id", id)
    .order("created_at", { ascending: false });

  if (vehicleError) {
    console.error("Seller vehicles error:", vehicleError);
    document.getElementById("sellerInventory").innerHTML =
      "<p class=\"py-10 text-center text-sm text-slate-500\">Error loading vehicles.</p>";
    return;
  }

  vehicles = vehicleData || [];

  if (!profile && !vehicles.length) {
    renderError("Dealer not found");
    return;
  }

  seller = profile || { name: "Seller", account_type: "private" };

  /* Load the current user's saved set (non-blocking) so card hearts reflect
     the real saved state just like Browse. Logged out → empty set. */
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
    const { data: saved } = await supabase
      .from("saved_vehicles")
      .select("vehicle_id")
      .eq("user_id", userData.user.id);
    (saved || []).forEach((row) => {
      if (row?.vehicle_id) savedSet.add(row.vehicle_id);
    });
  }

  renderSeller();
  renderInventory();
  renderGrid();
}

/* ========================== */
/* HELPERS                     */
/* ========================== */

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function initials(profile) {
  const source =
    (profile?.dealership_name || (profile?.name + " " + profile?.surname).trim() || "").trim();
  if (!source) return "HU";
  const w = source.split(/\s+/).filter(Boolean);
  if (w.length >= 2) return (w[0][0] + w[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function dealerLogoUrl(profile) {
  return (
    (profile?.dealership_logo || "").trim() ||
    (profile?.avatar_url || "").trim() ||
    ""
  );
}

function renderError(msg) {
  document.getElementById("sellerBox").innerHTML = `
  <div class="flex min-h-[60vh] items-center justify-center py-16">
    <div class="text-center">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-[#E48A2F] mb-4">
        <svg class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
      <p class="text-lg font-bold text-[#081120]">${esc(msg)}</p>
      <p class="mt-1 text-sm text-slate-500">The requested profile could not be found.</p>
      <button type="button" onclick="browseAllVehicles()" class="mt-5 inline-flex h-11 items-center justify-center rounded-[12px] bg-[#E48A2F] px-6 text-sm font-bold text-white transition hover:bg-[#E48A2F]/90">Browse All Vehicles</button>
    </div>
  </div>`;
}

/* ========================== */
/* PROFILE HEADER              */
/* ========================== */

/* Contact rows built ONLY from fields that actually have a value.
   Rendered for dealership accounts only, matching the existing
   public marketplace behaviour (private sellers show no contact /
   social details here). Labels match the HUFA icon language. */
function dealerContactRows(profile) {
  const rows = [];

  const address = (profile?.dealership_address || "").trim();
  if (address) rows.push({ icon: "pin", label: "Location", value: address, href: "" });

  const phone = (profile?.phone || "").trim() || (profile?.mobile_number || "").trim();
  if (phone) rows.push({ icon: "phone", label: "Phone", value: phone, href: "tel:" + phone });

  const email = (profile?.dealership_email || "").trim();
  if (email) rows.push({ icon: "mail", label: "Email", value: email, href: "mailto:" + email });

  const website = (profile?.website || "").trim();
  if (website) {
    rows.push({
      icon: "globe",
      label: "Website",
      value: website.replace(/^https?:\/\//i, ""),
      href: website
    });
  }

  return rows;
}

const CONTACT_ICONS = {
  pin: `<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  phone: `<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>`,
  mail: `<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 5L2 7"/></svg>`,
  globe: `<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20 15.3 15.3 0 010-20z"/></svg>`
};

/* social_links jsonb keyed by platform — only shows platforms that
   actually carry a usable value. Never empty, never invented. */
const SOCIAL_ICONS = {
  whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12.073z"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.42.42.82.68 1.38.9.42.16 1.06.36 2.23.41 1.27.06 1.65.07 4.85.07s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zm0 10.16a4 4 0 110-8 4 4 0 010 8zm6.4-10.4a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
  other: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20 15.3 15.3 0 010-20z"/></svg>`
};

function renderSocialLinks() {
  const social = seller?.social_links;
  if (!social || typeof social !== "object") return "";

  const links = [];
  for (const [platform, raw] of Object.entries(social)) {
    const value = String(raw || "").trim();
    if (!value) continue;

    let href = "";
    if (platform === "whatsapp" && /^\d{7,15}$/.test(value)) {
      href = `https://wa.me/${value}`;
    } else if (/^https?:\/\//i.test(value) && value.length <= 300) {
      href = value;
    }
    if (!href) continue;

    const icon = SOCIAL_ICONS[platform];
    if (!icon) continue;

    const label = platform.charAt(0).toUpperCase() + platform.slice(1);
    links.push(`
      <a href="${href.replace(/"/g, "%22")}" target="_blank" rel="noopener noreferrer"
         aria-label="${label}" title="${label}"
         class="flex h-10 w-10 items-center justify-center rounded-[12px] border border-slate-200 bg-white text-slate-600 transition hover:border-[#E48A2F]/40 hover:text-[#E48A2F]">
        <span class="block h-[18px] w-[18px]">${icon}</span>
      </a>`);
  }

  if (!links.length) return "";
  return `<div class="flex flex-wrap items-center gap-2 pt-2">${links.join("")}</div>`;
}

function displayName() {
  if (seller?.account_type === "dealer" && (seller?.dealership_name || "").trim()) {
    return seller.dealership_name.trim();
  }
  return `${(seller?.name || "").trim()} ${(seller?.surname || "").trim()}`.trim() || "Private Seller";
}

function renderSeller() {
  const isDealer = seller.account_type === "dealer";
  const name = displayName();
  const logo = dealerLogoUrl(seller);
  const initial = initials(seller);
  const contactRows = isDealer ? dealerContactRows(seller) : [];
  const socials = isDealer ? renderSocialLinks() : "";

  const logoBlock = logo
    ? `<img src="${esc(logo)}" alt="${esc(name)}" loading="lazy" decoding="async" onerror="this.outerHTML='<div class=&quot;flex h-full w-full items-center justify-center bg-slate-50 text-[#0A192F]&quot;>' + '${esc(initial)}' + '</div>'" class="h-full w-full object-contain" draggable="false">`
    : `<div class="flex h-full w-full items-center justify-center rounded-xl bg-slate-50 text-lg font-black tracking-tight text-[#0A192F]">${esc(initial)}</div>`;

  const contactHtml = contactRows.length
    ? `<div class="mt-4 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2 min-w-0">
        ${contactRows.map((row) => {
          const inner = `
            <span class="flex min-w-0 items-start gap-2.5">
              <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-[#E48A2F]/10 text-[#E48A2F]">${CONTACT_ICONS[row.icon]}</span>
              <span class="min-w-0">
                <span class="block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">${row.label}</span>
                <span class="block truncate text-[13px] font-medium text-slate-700">${esc(row.value)}</span>
              </span>
            </span>`;
          return row.href
            ? `<a class="inline-flex min-w-0" href="${esc(row.href)}">${inner}</a>`
            : inner;
        }).join("")}
      </div>`
    : "";

  document.getElementById("sellerBox").innerHTML = `
  <div class="relative overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 bg-white p-5 sm:p-6 md:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
    <div class="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-[radial-gradient(circle_at_center,rgba(228,138,47,0.10),transparent_60%)]"></div>
    <div class="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div class="flex flex-1 min-w-0 flex-col gap-4 sm:flex-row sm:gap-6">
        <div class="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          ${logoBlock}
        </div>
        <div class="min-w-0 flex-1">
          <div class="mb-1.5 text-[10px] lg:text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#E48A2F]">
            ${isDealer ? "Dealership" : "Private Seller"}
          </div>
          <h1 class="text-[26px] lg:text-[32px] font-black tracking-[-0.04em] leading-tight text-[#081120] break-words">
            ${esc(name)}
          </h1>
          <p class="mt-1 max-w-xl text-[13px] leading-relaxed text-slate-500">
            ${isDealer
              ? "Verified dealership partner on the marketplace."
              : "Independent marketplace seller."}
          </p>
          ${socials}
          ${contactRows.length ? `<hr class="my-3 border-slate-100">` : ""}
          ${contactHtml}
        </div>
      </div>
      <div class="flex shrink-0 items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 lg:w-40 lg:flex-col lg:items-start lg:justify-start lg:py-4">
        <div class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Inventory</div>
        <div class="flex items-baseline gap-2 lg:flex-col lg:items-start lg:gap-0">
          <span class="text-3xl font-black tracking-[-0.04em] text-[#E48A2F]">${vehicles.length}</span>
          <span class="text-[13px] font-medium text-slate-500">Active ${vehicles.length === 1 ? "Vehicle" : "Vehicles"}</span>
        </div>
      </div>
    </div>
  </div>`;
}

/* ========================== */
/* INVENTORY / SHOWROOM        */
/* ========================== */

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "priceAsc", label: "Price: Low to High" },
  { value: "priceDesc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "mileageLow", label: "Lowest Mileage" },
  { value: "mileageHigh", label: "Highest Mileage" }
];

function renderInventory() {
  const name = displayName();
  document.getElementById("sellerInventory").innerHTML = `
  <section class="mt-8 md:mt-10" aria-label="Inventory">
    <div class="max-w-2xl">
      <div class="mb-1.5 text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#E48A2F]">Inventory</div>
      <h2 class="text-[22px] md:text-[26px] font-black tracking-[-0.04em] leading-tight text-[#081120]">${esc(name)} Vehicles</h2>
      <p class="mt-1 text-[13px] leading-relaxed text-slate-500 max-w-xl">Explore the vehicles currently available from this dealership.</p>
    </div>

    <div class="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
      <div class="relative min-w-0 flex-1">
        <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="M21 21l-4.35-4.35"/></svg>
        <input
          type="search"
          id="sellerSearchInput"
          value="${esc(searchTerm)}"
          placeholder="Search this dealership's vehicles..."
          oninput="sellerSearch(this.value)"
          class="h-11 w-full rounded-[12px] border border-slate-200 bg-white pl-9 pr-3 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#E48A2F] focus:ring-[3px] focus:ring-[#E48A2F]/15">
      </div>
      <label class="relative inline-flex min-w-0 sm:w-52 shrink-0 items-center">
        <select
          id="sellerSortSelect"
          onchange="sellerSort(this.value)"
          class="h-11 w-full cursor-pointer appearance-none rounded-[12px] border border-slate-200 bg-white pl-3 pr-9 text-[13px] font-medium text-slate-700 outline-none transition focus:border-[#E48A2F] focus:ring-[3px] focus:ring-[#E48A2F]/15">
          ${SORT_OPTIONS.map((o) => `<option value="${o.value}" ${sortMode === o.value ? "selected" : ""}>${o.label}</option>`).join("")}
        </select>
        <svg class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
      </label>
    </div>

    <div id="sellerResultCount" class="mt-3 text-[12px] font-medium text-slate-400"></div>
    <div id="sellerEmpty" class="hidden"></div>
    <div id="sellerVehicleGrid" class="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    </div>
  </section>`;
}

function matchesSearch(v) {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;
  const hay = [
    v.make, v.model,
    v.year,
    v.body_type,
    v.fuel_type,
    String(Number(v.price || 0).toLocaleString()),
    String(v.price || "")
  ].filter((x) => x !== null && x !== undefined).join(" ").toLowerCase();
  return hay.includes(term);
}

function recommendOrder(a, b) {
  const fa = a.is_featured ? 1 : 0;
  const fb = b.is_featured ? 1 : 0;
  if (fa !== fb) return fb - fa;
  return new Date(b.created_at || 0) - new Date(a.created_at || 0);
}

function applyFilter() {
  let list = vehicles.filter(matchesSearch);
  switch (sortMode) {
    case "priceAsc": list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)); break;
    case "priceDesc": list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0)); break;
    case "newest": list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)); break;
    case "oldest": list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)); break;
    case "mileageLow": list.sort((a, b) => (Number(a.mileage) || 0) - (Number(b.mileage) || 0)); break;
    case "mileageHigh": list.sort((a, b) => (Number(b.mileage) || 0) - (Number(a.mileage) || 0)); break;
    default: list.sort(recommendOrder);
  }
  return list;
}

function renderGrid() {
  const grid = document.getElementById("sellerVehicleGrid");
  const empty = document.getElementById("sellerEmpty");
  const countEl = document.getElementById("sellerResultCount");
  if (!grid || !empty || !countEl) return;

  if (!vehicles.length) {
    grid.innerHTML = "";
    countEl.textContent = "0 Vehicles";
    empty.classList.remove("hidden");
    empty.innerHTML = `
      <div class="mt-2 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
        <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-[#E48A2F]">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4M12 5v14"/></svg>
        </div>
        <p class="text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#E48A2F]">Inventory Empty</p>
        <p class="mt-1 text-sm text-slate-500">No vehicles currently available.</p>
        <button type="button" onclick="browseAllVehicles()" class="mt-5 inline-flex h-11 items-center justify-center rounded-[12px] border border-slate-200 bg-white px-6 text-[13px] font-bold text-[#0A192F] transition hover:border-[#E48A2F] hover:text-[#E48A2F]">Browse All Vehicles</button>
      </div>`;
    return;
  }

  const visible = applyFilter();
  countEl.textContent = labelFor(visible.length);

  if (!visible.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    empty.innerHTML = `
      <div class="mt-2 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
        <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-[#E48A2F]">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="M21 21l-4.35-4.35"/></svg>
        </div>
        <p class="text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#E48A2F]">No Vehicles Found</p>
        <p class="mt-1 text-sm text-slate-500">We couldn't find a vehicle matching your search.</p>
        <button type="button" onclick="clearSellerSearch()" class="mt-5 inline-flex h-11 items-center justify-center rounded-[12px] bg-[#E48A2F] px-6 text-[13px] font-bold text-white transition hover:bg-[#E48A2F]/90">Clear Search</button>
      </div>`;
    return;
  }

  empty.classList.add("hidden");
  grid.innerHTML = visible
    .map((v) => renderVehicleCard(v, { layout: "grid", actions: "browse", saved: savedSet.has(v.id) }))
    .join("");
}

function labelFor(count) {
  const total = vehicles.length;
  const word = (n) => (n === 1 ? "Vehicle" : "Vehicles");
  if (searchTerm.trim()) return `${count} ${word(count)} Found`;
  if (count === total) return `${total} ${word(total)}`;
  return `Showing ${count} of ${total} Vehicles`;
}

/* ========================== */
/* GLOBALS (inline handlers)   */
/* ========================== */

window.viewVehicle = (id) => { if (id) navigate("/vehicle?id=" + id); };
window.toggleCompare = toggleCompare;
window.browseAllVehicles = () => navigate("/browse");

window.sellerSearch = function (value) {
  searchTerm = value || "";
  renderGrid();
};

window.sellerSort = function (value) {
  sortMode = value || "recommended";
  renderGrid();
};

window.clearSellerSearch = function () {
  searchTerm = "";
  const input = document.getElementById("sellerSearchInput");
  if (input) input.value = "";
  renderGrid();
};

window.toggleSave = async function (id) {
  if (!id) return;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    toast("Login to save vehicles");
    navigate("/login");
    return;
  }

  if (savedSet.has(id)) {
    const { error } = await supabase
      .from("saved_vehicles")
      .delete()
      .eq("vehicle_id", id)
      .eq("user_id", userData.user.id);
    if (error) { toast("Failed to remove vehicle"); return; }
    savedSet.delete(id);
    toast("Removed from saved");
  } else {
    const { error } = await supabase
      .from("saved_vehicles")
      .upsert({ user_id: userData.user.id, vehicle_id: id }, { onConflict: "user_id,vehicle_id" });
    if (error) { toast("Failed to save vehicle"); return; }
    savedSet.add(id);
    toast("Saved vehicle");
  }

  renderGrid();
};