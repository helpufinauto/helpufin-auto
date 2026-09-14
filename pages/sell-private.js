export function SellPrivatePage(){

  const checkIcon = `
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  `;

  return `
  <div class="sell-bg sell-bg--private min-h-screen overflow-x-hidden">

    <div class="max-w-5xl mx-auto px-5 sm:px-6 py-12 md:py-16">

      <!-- PAGE HEADER -->
      <div class="sell-hero mb-8 md:mb-10">

        <div class="sell-hero-eyebrow mb-3">
          Sell / Private
        </div>

        <h1 class="text-[clamp(1.6rem,4vw,2.2rem)] font-black tracking-[-0.03em] text-[#081120] leading-tight">
          Private Seller Packages
        </h1>

      </div>

      <div class="grid md:grid-cols-3 gap-5 md:gap-6 items-stretch max-w-[1080px] mx-auto">

        <!-- LAUNCH PROMOTION — ACTIVE / AVAILABLE, at the TOP -->
        <div class="sell-package-card sell-package-card--available">

          <div class="sell-package-head">
            <div class="sell-eyebrow">Launch Promotion</div>
            <span class="sell-package-badge">Most Popular</span>
          </div>

          <div class="sell-package-availability">
            <span class="sell-package-availability-dot"></span>
            Currently Available
          </div>

          <div class="sell-card-divider" style="margin:0 0 16px;"></div>

          <ul class="sell-benefits">
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--gold">${checkIcon}</span>
              <span>Up to 5 Active Listings</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--gold">${checkIcon}</span>
              <span>Up to 2 Featured Listings</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--gold">${checkIcon}</span>
              <span>Premium Marketplace Visibility</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--gold">${checkIcon}</span>
              <span>Seller Dashboard Access</span>
            </li>
          </ul>

          <button
            class="sell-cta btn btn-gold w-full mt-auto"
            onclick="navigate('/signup?account=private')"
          >
            Choose Launch Promotion
          </button>

        </div>

        <!-- PRIVATE STANDARD — COMING SOON (disabled, info preserved) -->
        <div class="sell-package-card sell-package-card--muted">

          <div class="sell-package-head">
            <div class="sell-eyebrow">Private Standard</div>
            <span class="sell-package-comingsoon">Coming Soon</span>
          </div>

          <div class="sell-package-price">
            <span class="sell-package-price-amount">R 199</span>
            <span class="sell-package-price-period">/ mo</span>
          </div>

          <div class="sell-card-divider" style="margin:0 0 16px;"></div>

          <ul class="sell-benefits">
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--neutral">${checkIcon}</span>
              <span>1 Active Listing</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--neutral">${checkIcon}</span>
              <span>Marketplace Visibility</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--neutral">${checkIcon}</span>
              <span>Seller Dashboard Access</span>
            </li>
          </ul>

          <button class="sell-cta btn btn-dark w-full mt-auto" disabled>
            Coming Soon
          </button>

        </div>

        <!-- PRIVATE PREMIUM — COMING SOON (disabled, info preserved) -->
        <div class="sell-package-card sell-package-card--muted">

          <div class="sell-package-head">
            <div class="sell-eyebrow">Private Premium</div>
            <span class="sell-package-comingsoon">Coming Soon</span>
          </div>

          <div class="sell-package-price">
            <span class="sell-package-price-amount">R 399</span>
            <span class="sell-package-price-period">/ mo</span>
          </div>

          <div class="sell-card-divider" style="margin:0 0 16px;"></div>

          <ul class="sell-benefits">
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--neutral">${checkIcon}</span>
              <span>3 Active Listings</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--neutral">${checkIcon}</span>
              <span>Premium Marketplace Visibility</span>
            </li>
            <li class="sell-benefit">
              <span class="sell-benefit-check sell-benefit-check--neutral">${checkIcon}</span>
              <span>Seller Dashboard Access</span>
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