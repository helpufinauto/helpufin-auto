import { asset } from "../js/basePath.js";

export function Footer() {
  return `

<footer class="site-footer relative overflow-hidden border-t border-[#C7D6E8]">
  <div class="relative z-10 max-w-[1500px] mx-auto px-4 sm:px-8 lg:px-12 pt-8 md:pt-14 pb-6 md:pb-9">

    <div class="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-9 lg:grid-cols-[1.35fr_1fr_1fr_1.55fr] lg:gap-x-12 lg:gap-y-12">

      <!-- Brand -->
      <div class="space-y-4 col-span-2 sm:col-span-1">
        <img
          src="${asset("/assets/logo1.webp")}"
          alt="Helpufin Auto"
          class="w-auto h-auto max-w-full object-contain"
          loading="lazy"
        />

        <p class="text-[13.5px] leading-[1.8] text-[#33475E] max-w-[300px]">
          Helpufin Auto is a proud partner of
          <a class="font-semibold text-[#E48A2F] hover:text-[#B6935C] transition-all duration-300" href="https://helpufin.co.za" target="_blank" rel="noopener">
            Helpufin.co.za
          </a>.
          Redefining luxury vehicle acquisition with transparency and precision.
        </p>

        <div class="flex items-center gap-2.5 pt-1">
          <a href="https://www.facebook.com/" target="_blank" rel="noopener" aria-label="Facebook"
            class="w-9 h-9 rounded-full border border-[#0A192F]/15 bg-white/60 flex items-center justify-center text-[#0A192F] hover:bg-[#E48A2F] hover:border-[#E48A2F] hover:text-white transition-all duration-300">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.9h-2.33V22c4.78-.76 8.45-4.92 8.45-9.94Z"/></svg>
          </a>
          <a href="https://www.instagram.com/" target="_blank" rel="noopener" aria-label="Instagram"
            class="w-9 h-9 rounded-full border border-[#0A192F]/15 bg-white/60 flex items-center justify-center text-[#0A192F] hover:bg-[#E48A2F] hover:border-[#E48A2F] hover:text-white transition-all duration-300">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 3.68a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32Zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0Z"/></svg>
          </a>
          <a href="https://www.linkedin.com/" target="_blank" rel="noopener" aria-label="LinkedIn"
            class="w-9 h-9 rounded-full border border-[#0A192F]/15 bg-white/60 flex items-center justify-center text-[#0A192F] hover:bg-[#E48A2F] hover:border-[#E48A2F] hover:text-white transition-all duration-300">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.55V9h3.57v11.45Z"/></svg>
          </a>
        </div>
      </div>


      <!-- Marketplace -->
      <nav aria-label="Marketplace">
        <h5 class="text-[#0A192F] font-black uppercase tracking-[0.18em] text-[11.5px] mb-3">Marketplace</h5>
        <ul class="space-y-2.5 text-[13.5px] text-[#33475E]">
          <li><a href="all-vehicles.html" class="hover:text-[#E48A2F] transition-all duration-300">Browse Collection</a></li>
          <li><a href="sell.html" class="hover:text-[#E48A2F] transition-all duration-300">Sell Your Vehicle</a></li>
          <li><a href="#" class="hover:text-[#E48A2F] transition-all duration-300">Instant Valuation</a></li>
          <li><a href="/compare" data-link class="hover:text-[#E48A2F] transition-all duration-300">Compare Vehicles</a></li>
        </ul>
      </nav>

      <!-- Support -->
      <nav aria-label="Support">
        <h5 class="text-[#0A192F] font-black uppercase tracking-[0.18em] text-[11.5px] mb-3">Support</h5>
        <ul class="space-y-2.5 text-[13.5px] text-[#33475E]">
          <li><a href="#" class="hover:text-[#E48A2F] transition-all duration-300">Help Centre</a></li>
          <li><a href="#" class="hover:text-[#E48A2F] transition-all duration-300">Finance FAQ</a></li>
          <li><a href="/contact" data-link class="hover:text-[#E48A2F] transition-all duration-300">Contact Us</a></li>
          <li><a href="#" class="hover:text-[#E48A2F] transition-all duration-300">Safety &amp; Trust</a></li>
        </ul>
      </nav>

      <!-- Newsletter -->
      <div class="col-span-2 sm:col-span-1">
        <h5 class="text-[#0A192F] font-black uppercase tracking-[0.18em] text-[11.5px] mb-3">Stay Informed</h5>
        <p class="text-[13.5px] text-[#4A5D74] leading-relaxed mb-4 max-w-[320px]">
          New arrivals, special releases &amp; updates — straight to your inbox.
        </p>

        <form class="flex gap-2 p-1.5 rounded-2xl bg-white/70 backdrop-blur-xl border border-[#D5E0EC] shadow-[0_10px_30px_rgba(15,23,42,0.05)] max-w-full sm:max-w-[400px] lg:max-w-[440px]">
          <input
            type="email"
            placeholder="Your email"
            aria-label="Email address"
            class="min-w-0 flex-1 px-3.5 py-2.5 rounded-xl bg-transparent border border-[#E2E8F0] text-[13.5px] text-[#0A192F] outline-none focus:border-[#E48A2F] transition"
          />
          <button class="shrink-0 px-5 py-2.5 rounded-xl font-bold text-[13.5px] bg-[linear-gradient(135deg,#E48A2F,#E3C989)] text-[#08111F] shadow-[0_10px_24px_rgba(228,138,47,0.28)] hover:translate-y-[-1px] transition-all duration-300 cursor-pointer">
            Send
          </button>
        </form>
      </div>

    </div>

    <!-- Bottom -->
    <div class="mt-6 md:mt-10 pt-5 border-t border-[#0A192F]/10 flex flex-col-reverse sm:flex-row justify-between items-center gap-3 sm:gap-5 text-[12px] text-[#4A5D74]">
      <p class="text-center sm:text-left">© 2025–2026 Helpufin Auto. All rights reserved.</p>

      <div class="flex gap-6 uppercase tracking-[0.14em] text-[10.5px] font-semibold text-[#0A192F]">
        <a href="#" class="hover:text-[#E48A2F] transition-all duration-300">Privacy</a>
        <a href="#" class="hover:text-[#E48A2F] transition-all duration-300">Terms</a>
        <a href="#cookie-preferences" data-consent-settings class="hover:text-[#E48A2F] transition-all duration-300">Cookies</a>
      </div>
    </div>

  </div>
</footer>

`;
}