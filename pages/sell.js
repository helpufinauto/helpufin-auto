export function SellPage(){

  const checkBlue = `
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  `;

  const checkGold = `
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  `;

  return `
  <div class="sell-bg sell-bg--main min-h-screen overflow-x-hidden">

    <!-- ==============================
    SELL HERO
    ============================== -->
    <div class="sell-hero max-w-[1120px] mx-auto px-5 sm:px-6 md:px-7 pt-6 md:pt-10 pb-8 md:pb-12">

      <div class="sell-hero-eyebrow mb-4">
        Sell / Marketplace
      </div>

      <h1 class="sell-hero-title text-[#081120] font-black tracking-[-0.04em] leading-[1.02] text-[clamp(2rem,6vw,3rem)]">
        Sell Your Vehicle
      </h1>

      <div class="mt-4">
        <p class="sell-hero-sub font-bold text-[16px] leading-snug">
          Choose the way you want to sell.
        </p>
        <p class="sell-hero-desc text-[13px] leading-relaxed">
          Whether you're selling privately or representing a dealership,
          Helpufin gives you the tools to reach the right buyers.
        </p>
      </div>

    </div>

    <!-- ==============================
    SELLER TYPE CARDS
    ============================== -->
    <div class="max-w-[1120px] mx-auto px-5 sm:px-6 md:px-7 pb-12 md:pb-16">

      <div class="grid gap-5 md:grid-cols-2 md:gap-6 items-stretch">

        <!-- PRIVATE SELLER -->
        <div class="sell-card sell-card--private flex flex-col">
          <div class="sell-card-icon" role="img" aria-label="Private Seller icon">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>

          <div class="sell-card-label">
            For Individual Sellers
          </div>

          <h2 class="sell-card-title">
            Private Seller
          </h2>

          <p class="sell-card-desc">
            For individuals selling one or a few vehicles.
          </p>

          <div class="sell-card-divider"></div>

          <ul class="sell-benefits">
            <li class="sell-benefit">
              <span class="sell-benefit-check">${checkBlue}</span>
              <span>1–3 Listings</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check">${checkBlue}</span>
              <span>Basic exposure</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check">${checkBlue}</span>
              <span>Lower cost</span>
            </li>
          </ul>

          <a href="/sell/private" data-link
            class="sell-cta btn btn-dark">
            Sell as Private
          </a>
        </div>

        <!-- DEALERSHIP -->
        <div class="sell-card sell-card--dealer flex flex-col">
          <div class="sell-card-icon" role="img" aria-label="Dealership icon">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 21h18" />
              <path d="M5 21V7l7-4 7 4v14" />
              <path d="M9 21v-6h6v6" />
              <path d="M9 10h.01" />
              <path d="M15 10h.01" />
            </svg>
          </div>

          <div class="sell-card-label">
            For Dealerships & Businesses
          </div>

          <h2 class="sell-card-title">
            Dealership
          </h2>

          <p class="sell-card-desc">
            For dealerships that want greater marketplace visibility.
          </p>

          <div class="sell-card-divider"></div>

          <ul class="sell-benefits">
            <li class="sell-benefit">
              <span class="sell-benefit-check">${checkGold}</span>
              <span>Unlimited listings</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check">${checkGold}</span>
              <span>Featured placements</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check">${checkGold}</span>
              <span>Analytics (coming soon)</span>
            </li>
          </ul>

          <a href="/sell/dealer" data-link
            class="sell-cta btn btn-gold">
            Register as Dealer
          </a>
        </div>

      </div>

    </div>

  </div>
  `;
}
