/* =========================================
 * HUFA — Shared Browse Sorting Registry
 * =========================================
 *
 * A single source of truth for every sort option used
 * across the Browse page (and future pages).
 *
 * Each entry contains:
 *   - id            : stable string key (also used in URL ?sort=)
 *   - label         : human-readable label shown in the dropdown
 *   - comparator    : (a, b) => number  — pure function, stable
 *   - direction     : "asc" | "desc"  (default direction hint)
 *   - icon          : optional inline SVG string
 *   - description   : optional helper text
 *
 * Adding a new sort option = registering one object here.
 * No switch statements to modify elsewhere.
 *
 * Future sorts (Best Match, AI Recommended, Best Value,
 * Most Popular, Trending, Highest Dealer Rating,
 * Lowest Monthly Repayment, Closest To Me, etc.) can be
 * plugged in without architectural changes.
 * ========================================= */

/* ---------- numeric helpers ---------- */

function num(v){
  return Number(v) || 0;
}

/*
 * Saving = original_price - price
 * If original_price is null or <= price, saving = 0
 * Percentage = saving / original_price (0 when original_price is null/0)
 */
function saving(v){
  const op = num(v.original_price);
  const p  = num(v.price);
  if(!op || op <= p){
    return 0;
  }
  return op - p;
}

function savingPct(v){
  const op = num(v.original_price);
  const p  = num(v.price);
  if(!op || op <= p){
    return 0;
  }
  return ((op - p) / op) * 100;
}

/*
 * Vehicles with no reductions (saving === 0) always
 * appear AFTER reduced vehicles in reduction-based sorts.
 */
function reducedFirst(a, b){
  const ra = saving(a) > 0 ? 0 : 1;
  const rb = saving(b) > 0 ? 0 : 1;
  return ra - rb;
}

/* ---------- sort registry ---------- */

export const SORT_REGISTRY = {

  latest: {
    id: "latest",
    label: "Newest First",
    direction: "desc",
    comparator: (a, b) => {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return bDate - aDate;
    }
  },

  oldest: {
    id: "oldest",
    label: "Oldest First",
    direction: "asc",
    comparator: (a, b) => {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return aDate - bDate;
    }
  },

  price_low: {
    id: "price_low",
    label: "Price: Low to High",
    direction: "asc",
    comparator: (a, b) => num(a.price) - num(b.price)
  },

  price_high: {
    id: "price_high",
    label: "Price: High to Low",
    direction: "desc",
    comparator: (a, b) => num(b.price) - num(a.price)
  },

  mileage_low: {
    id: "mileage_low",
    label: "Mileage: Low to High",
    direction: "asc",
    comparator: (a, b) => num(a.mileage) - num(b.mileage)
  },

  mileage_high: {
    id: "mileage_high",
    label: "Mileage: High to Low",
    direction: "desc",
    comparator: (a, b) => num(b.mileage) - num(a.mileage)
  },

  year_new: {
    id: "year_new",
    label: "Year: Newest",
    direction: "desc",
    comparator: (a, b) => num(b.year) - num(a.year)
  },

  year_old: {
    id: "year_old",
    label: "Year: Oldest",
    direction: "asc",
    comparator: (a, b) => num(a.year) - num(b.year)
  },

  /* ---- New reduction-based sorts ---- */

  price_reduced_biggest: {
    id: "price_reduced_biggest",
    label: "Price Reduced (Biggest Saving)",
    direction: "desc",
    description: "Largest Rand saving first",
    comparator: (a, b) => {
      const r = reducedFirst(a, b);
      if(r !== 0) return r;
      return saving(b) - saving(a);
    }
  },

  price_reduced_smallest: {
    id: "price_reduced_smallest",
    label: "Price Reduced (Smallest Saving)",
    direction: "asc",
    description: "Smallest saving first",
    comparator: (a, b) => {
      const r = reducedFirst(a, b);
      if(r !== 0) return r;
      return saving(a) - saving(b);
    }
  },

  price_reduced_pct: {
    id: "price_reduced_pct",
    label: "Price Reduced (% Highest)",
    direction: "desc",
    description: "Highest percentage discount first",
    comparator: (a, b) => {
      const r = reducedFirst(a, b);
      if(r !== 0) return r;
      return savingPct(b) - savingPct(a);
    }
  },

  recently_reduced: {
    id: "recently_reduced",
    label: "Recently Reduced",
    direction: "desc",
    description: "Newest price reductions first",
    comparator: (a, b) => {
      const aDate = new Date(a.last_reduction_date || 0).getTime();
      const bDate = new Date(b.last_reduction_date || 0).getTime();
      return bDate - aDate;
    }
  }

};

/* ---------- ordered list for dropdown rendering ---------- */

export const SORT_OPTIONS = [
  SORT_REGISTRY.latest,
  SORT_REGISTRY.oldest,
  SORT_REGISTRY.price_low,
  SORT_REGISTRY.price_high,
  SORT_REGISTRY.mileage_low,
  SORT_REGISTRY.mileage_high,
  SORT_REGISTRY.year_new,
  SORT_REGISTRY.year_old,
  SORT_REGISTRY.price_reduced_biggest,
  SORT_REGISTRY.price_reduced_smallest,
  SORT_REGISTRY.price_reduced_pct,
  SORT_REGISTRY.recently_reduced
];

/* ---------- lookup helpers ---------- */

export function getSortOption(id){
  return SORT_REGISTRY[id] || SORT_REGISTRY.latest;
}

export function getSortComparator(id){
  const opt = getSortOption(id);
  return opt.comparator;
}

/* ---------- Supabase ordering support ---------- */

/*
 * Returns a Supabase order clause for sorts that can be
 * pushed to the database.  Reduction-based sorts that
 * require computed values are handled client-side and
 * return null here.
 */
export function getSupabaseOrder(id){
  const opt = getSortOption(id);

  if(id === "price_low"){
    return { column: "price", ascending: true };
  }

  if(id === "price_high"){
    return { column: "price", ascending: false };
  }

  if(id === "latest"){
    return { column: "created_at", ascending: false };
  }

  if(id === "oldest"){
    return { column: "created_at", ascending: true };
  }

  if(id === "mileage_low"){
    return { column: "mileage", ascending: true };
  }

  if(id === "mileage_high"){
    return { column: "mileage", ascending: false };
  }

  if(id === "year_new"){
    return { column: "year", ascending: false };
  }

  if(id === "year_old"){
    return { column: "year", ascending: true };
  }

  if(id === "recently_reduced"){
    return { column: "last_reduction_date", ascending: false };
  }

  /* reduction-based sorts need client-side computation */
  return null;
}
