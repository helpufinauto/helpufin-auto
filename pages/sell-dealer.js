export function SellDealerPage(){

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
  <div class="sell-bg sell-bg--dealer min-h-screen overflow-x-hidden">

    <div class="max-w-6xl mx-auto px-5 sm:px-6 py-12 md:py-16">

      <!-- PAGE HEADER -->
      <div class="sell-hero mb-8 md:mb-10">

        <div class="sell-hero-eyebrow mb-3">
          Sell / Dealer
        </div>

        <h1 class="text-[clamp(1.6rem,4vw,2.2rem)] font-black tracking-[-0.03em] text-[#081120] leading-tight">
          Dealer Packages
        </h1>

      </div>

      <div class="grid md:grid-cols-2 xl:grid-cols-4 gap-5 md:gap-6 items-stretch">

        <!-- LAUNCH PROMOTION — ACTIVE / AVAILABLE, at the TOP -->
        <div class="sell-package-card sell-package-card--available">

          <div class="sell-package-head">
            <div class="sell-eyebrow">Launch Promotion</div>
            <span class="sell-package-badge">Best Value</span>
          </div>

          <div class="sell-package-availability">
            <span class="sell-package-availability-dot"></span>
            Currently Available
          </div>

          <div class="sell-card-divider" style="margin:0 0 16px;"></div>

          <ul class="sell-benefits">
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--gold">${checkGold}</span>
              <span>Up to 50 Active Listings</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--gold">${checkGold}</span>
              <span>Up to 15 Featured Listings</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--gold">${checkGold}</span>
              <span>Verified Dealer Badge</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--gold">${checkGold}</span>
              <span>Public Dealership Storefront</span>
            </li>
          </ul>

          <button
            class="sell-cta btn btn-gold w-full mt-auto"
            onclick="navigate('/signup?account=dealer')"
          >
            Choose Launch Promotion
          </button>

        </div>

        <!-- DEALER BASIC — COMING SOON (disabled, info preserved) -->
        <div class="sell-package-card sell-package-card--muted">

          <div class="sell-package-head">
            <div class="sell-eyebrow">Dealer Basic</div>
            <span class="sell-package-comingsoon">Coming Soon</span>
          </div>

          <div class="sell-package-price">
            <span class="sell-package-price-amount">R 499</span>
            <span class="sell-package-price-period">/ mo</span>
          </div>

          <div class="sell-card-divider" style="margin:0 0 16px;"></div>

          <ul class="sell-benefits">
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--neutral">${checkBlue}</span>
              <span>10 Active Listings</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--neutral">${checkBlue}</span>
              <span>Verified Dealer Badge</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--neutral">${checkBlue}</span>
              <span>Public Dealership Storefront</span>
            </li>
          </ul>

          <button class="sell-cta btn btn-dark w-full mt-auto" disabled>
            Coming Soon
          </button>

        </div>

        <!-- DEALER STANDARD — COMING SOON (disabled, info preserved) -->
        <div class="sell-package-card sell-package-card--muted">

          <div class="sell-package-head">
            <div class="sell-eyebrow">Dealer Standard</div>
            <span class="sell-package-comingsoon">Coming Soon</span>
          </div>

          <div class="sell-package-price">
            <span class="sell-package-price-amount">R 999</span>
            <span class="sell-package-price-period">/ mo</span>
          </div>

          <div class="sell-card-divider" style="margin:0 0 16px;"></div>

          <ul class="sell-benefits">
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--neutral">${checkBlue}</span>
              <span>30 Active Listings</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--neutral">${checkBlue}</span>
              <span>Verified Dealer Badge</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--neutral">${checkBlue}</span>
              <span>Public Dealership Storefront</span>
            </li>
          </ul>

          <button class="sell-cta btn btn-dark w-full mt-auto" disabled>
            Coming Soon
          </button>

        </div>

        <!-- DEALER PREMIUM — COMING SOON (disabled, info preserved) -->
        <div class="sell-package-card sell-package-card--muted">

          <div class="sell-package-head">
            <div class="sell-eyebrow">Dealer Premium</div>
            <span class="sell-package-comingsoon">Coming Soon</span>
          </div>

          <div class="sell-package-price">
            <span class="sell-package-price-amount">R 1999</span>
            <span class="sell-package-price-period">/ mo</span>
          </div>

          <div class="sell-card-divider" style="margin:0 0 16px;"></div>

          <ul class="sell-benefits">
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--neutral">${checkBlue}</span>
              <span>Unlimited Listings</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--neutral">${checkBlue}</span>
              <span>Featured Marketplace Priority</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--neutral">${checkBlue}</span>
              <span>Verified Dealer Badge</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--neutral">${checkBlue}</span>
              <span>Premium Dealership Visibility</span>
            </li>
          </ul>

          <button class="sell-cta btn btn-dark w-full mt-auto" disabled>
            Coming Soon
          </button>

        </div>

      </div>

    </div>

  </div>
  `;
}