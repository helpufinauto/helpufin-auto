/* =========================================
 * HUFA — Shared Grid / List View Toggle
 * =========================================
 *
 * A reusable component that owns:
 *   - SVG icons (inline, no Unicode, no icon fonts)
 *   - active / selected state
 *   - accessibility (ARIA labels, keyboard)
 *   - click handling
 *   - tooltips
 *   - responsive behaviour
 *
 * Future pages (Saved, Search Results, Dealer
 * Inventory, Admin Inventory, Trade-In Centre)
 * can reuse this instead of creating their own.
 * ========================================= */

/* ---------- inline SVG icons ---------- */

export const GRID_ICON = `<svg
  class="w-4 h-4"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  viewBox="0 0 24 24"
  aria-hidden="true"
>
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M3 3v6h6V3H3z"
  />
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M3 13v6h6v-6H3z"
  />
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M13 3v6h6V3h-6z"
  />
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M13 13v6h6v-6h-6z"
  />
</svg>`;

export const LIST_ICON = `<svg
  class="w-4 h-4"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  viewBox="0 0 24 24"
  aria-hidden="true"
>
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M8 6h13M8 12h13M8 18h13"
  />
  <circle
    cx="4"
    cy="6"
    r="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <circle
    cx="4"
    cy="12"
    r="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <circle
    cx="4"
    cy="18"
    r="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>`;

/* ---------- render the toggle markup ---------- */

/**
 * renderViewToggle(containerId, options)
 *
 * @param {string} containerId  — id of the element to inject into
 * @param {object} [options]
 *   - viewMode       : "grid" | "list"  (current selection)
 *   - onToggle       : (viewMode) => void  (click handler)
 *   - size           : "sm" | "md"  (button dimensions)
 *   - persistentKey  : localStorage key for preference persistence
 */
export function renderViewToggle(containerId, options = {}){

  const {
    viewMode = "grid",
    onToggle = () => {},
    size = "md",
    persistentKey = "browse_view"
  } = options;

  const container =
    document.getElementById(containerId);

  if(!container){
    return;
  }

  const isGrid = viewMode === "grid";

  /* ---- button sizing classes ---- */

  const sizeClasses = {
    sm: "w-7 h-7 text-xs",
    md: "w-8 h-8 text-sm"
  };

  const btnSize =
    sizeClasses[size] || sizeClasses.md;

  /* ---- shared button classes ---- */

  const baseBtn = `
    ${btnSize}
    rounded-lg
    border
    font-bold
    flex
    items-center
    justify-center
    transition-all
    duration-200
    focus:outline-none
    focus:ring-2
    focus:ring-offset-2
    focus:ring-[#3B82F6]
  `;

  /* ---- active (selected) classes ---- */

  const activeClasses =
    "border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]";

  const inactiveClasses =
    "border-slate-200 bg-white text-slate-900 hover:border-[#3B82F6] hover:bg-[#3B82F6]/5";

  container.innerHTML = `
    <div class="flex items-center gap-1.5">

      <button
        type="button"
        id="gridViewBtn"
        class="${baseBtn} ${isGrid ? activeClasses : inactiveClasses}"
        aria-label="Grid view"
        aria-pressed="${isGrid}"
        title="Grid view"
        data-view="grid"
      >
        ${GRID_ICON}
      </button>

      <button
        type="button"
        id="listViewBtn"
        class="${baseBtn} ${!isGrid ? activeClasses : inactiveClasses}"
        aria-label="List view"
        aria-pressed="${!isGrid}"
        title="List view"
        data-view="list"
      >
        ${LIST_ICON}
      </button>

    </div>
  `;

  /* ---- click handlers ---- */

  const gridBtn =
    container.querySelector("#gridViewBtn");

  const listBtn =
    container.querySelector("#listViewBtn");

  gridBtn?.addEventListener("click", () => {
    setActive(gridBtn, listBtn, "grid", activeClasses, inactiveClasses);
    persist(persistentKey, "grid");
    onToggle("grid");
  });

  listBtn?.addEventListener("click", () => {
    setActive(listBtn, gridBtn, "list", activeClasses, inactiveClasses);
    persist(persistentKey, "list");
    onToggle("list");
  });

  /* ---- keyboard accessibility ---- */

  [gridBtn, listBtn].forEach((btn) => {
    btn?.addEventListener("keydown", (e) => {
      if(e.key === " " || e.key === "Enter"){
        e.preventDefault();
        btn.click();
      }
    });
  });
}

/* ---------- helpers ---------- */

function setActive(activeBtn, otherBtn, view, activeCls, inactiveCls){
  activeBtn?.classList.remove(...inactiveCls.split(/\s+/).filter(Boolean));
  activeBtn?.classList.add(...activeCls.split(/\s+/).filter(Boolean));
  activeBtn?.setAttribute("aria-pressed", "true");

  otherBtn?.classList.remove(...activeCls.split(/\s+/).filter(Boolean));
  otherBtn?.classList.add(...inactiveCls.split(/\s+/).filter(Boolean));
  otherBtn?.setAttribute("aria-pressed", "false");
}

function persist(key, value){
  try{
    localStorage.setItem(key, value);
  }catch(e){
    /* storage unavailable — ignore */
  }
}

export function loadViewPreference(key){
  try{
    return localStorage.getItem(key) || null;
  }catch(e){
    return null;
  }
}
