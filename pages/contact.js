import { toast } from "../js/ui.js";
import { PHASE2_SOCIAL_PLATFORMS } from "../js/socialProfile.js";

/* Real HelpUFin profile URLs, confirmed from the live
   site's own footer anchors (helpufin.co.za). Brand
   icons reused from the shared SVG set in socialProfile.js. */
const HUFA_SOCIAL = [
  { id: "facebook", label: "Facebook", href: "https://www.facebook.com/HelpUFin" },
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/helpufin" },
  { id: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@helpufin" }
].map(s => ({
  ...s,
  icon: (PHASE2_SOCIAL_PLATFORMS.find(p => p.id === s.id) || {}).icon || ""
}));

export function ContactPage() {
  setTimeout(initContact, 0);

  return `
<div class="contact-page contact-bg min-h-screen overflow-x-hidden">
  <div class="contact-shell">

    <!-- HERO -->
    <div class="contact-hero">
      <div class="contact-eyebrow">Contact HUFA</div>
      <h1 class="contact-title">Let&rsquo;s Get You Moving</h1>
      <p class="contact-sub">Whether you&rsquo;re looking for your next vehicle, need help with vehicle finance, want to sell a vehicle, or simply have a question, the HUFA team is here to help.</p>
      <div class="contact-trust" aria-label="What HUFA helps with">
        <span class="contact-trust-chip">Vehicles</span>
        <span class="contact-trust-chip">Finance</span>
        <span class="contact-trust-chip">Dealerships</span>
        <span class="contact-trust-chip">Insurance</span>
        <span class="contact-trust-chip">Support</span>
      </div>
    </div>

    <!-- CONTACT OPTIONS -->
    <div class="contact-opts" role="list" aria-label="Contact options">
      <a role="listitem" href="tel:+27642017584" aria-label="Call HUFA on +27 64 201 7584" class="contact-opt">
        <span class="contact-opt-icon contact-opt-icon--blue" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.25a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9z"/></svg>
        </span>
        <span><span class="contact-opt-label">Call Us</span>
        <span class="contact-opt-value">+27 64 201 7584</span>
        <span class="contact-opt-hint">Tap to call</span></span>
      </a>
      <a role="listitem" href="mailto:drive@helpufin.co.za" aria-label="Email HUFA at drive@helpufin.co.za" class="contact-opt">
        <span class="contact-opt-icon contact-opt-icon--gold" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>
        </span>
        <span><span class="contact-opt-label">Email Us</span>
        <span class="contact-opt-value contact-opt-value--break">drive@helpufin.co.za</span>
        <span class="contact-opt-hint">Tap to email</span></span>
      </a>
      <a role="listitem" href="https://www.google.com/maps/search/?api=1&query=265%20Pigeon%20Cres%2C%20Montana%20Park%2C%20Pretoria%200182%2C%20South%20Africa" target="_blank" rel="noopener" aria-label="Visit HUFA at 265 Pigeon Cres, Montana Park, Pretoria 0182, open in Google Maps" class="contact-opt">
        <span class="contact-opt-icon contact-opt-icon--navy" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </span>
        <span><span class="contact-opt-label">Visit Us</span>
        <span class="contact-opt-value">265 Pigeon Cres<br>Montana Park, Pretoria</span>
        <span class="contact-opt-hint">Open in Google Maps</span></span>
      </a>
    </div>
    <!-- FORM + INFO -->
    <div class="contact-main">
      <section aria-labelledby="contactFormHeading" class="contact-card">
        <p class="contact-kicker">Send a message</p>
        <h2 id="contactFormHeading" class="contact-card-title">Tell us how we can help</h2>
        <p class="contact-card-sub">We usually respond during business hours.</p>
        <form id="contactForm" class="hufa-form contact-form" novalidate>
          <div class="contact-grid-2">
            <div>
              <label for="contactFirstName" class="contact-label">First Name</label>
              <input id="contactFirstName" name="firstName" type="text" autocomplete="given-name" enterkeyhint="next" placeholder="Thabo" class="input-light" required>
            </div>
            <div>
              <label for="contactLastName" class="contact-label">Last Name</label>
              <input id="contactLastName" name="lastName" type="text" autocomplete="family-name" enterkeyhint="next" placeholder="Mokoena" class="input-light" required>
            </div>
          </div>
          <div class="contact-grid-2">
            <div>
              <label for="contactEmail" class="contact-label">Email Address</label>
              <input id="contactEmail" name="email" type="email" autocomplete="email" inputmode="email" enterkeyhint="next" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="you@example.com" class="input-light" required>
            </div>
            <div>
              <label for="contactPhone" class="contact-label">Phone Number</label>
              <input id="contactPhone" name="phone" type="tel" autocomplete="tel" inputmode="tel" enterkeyhint="next" placeholder="+27 ..." class="input-light">
            </div>
          </div>
          <div>
            <label for="contactReason" class="contact-label">Reason for Contact</label>
            <select id="contactReason" name="reason" class="input-light" required>
              <option value="">Select a reason</option>
              <option>Vehicle Finance</option>
              <option>Find a Vehicle</option>
              <option>Sell My Vehicle</option>
              <option>Fleet Finance</option>
              <option>Insurance</option>
              <option>Dealership Enquiry</option>
              <option>General Enquiry</option>
            </select>
          </div>
          <div>
            <label for="contactMessage" class="contact-label">Message</label>
            <textarea id="contactMessage" name="message" rows="5" placeholder="How can the HUFA team help?" class="input-light" required></textarea>
          </div>
          <p id="contactErr" class="contact-error hidden" role="alert"></p>
          <p id="contactOk" class="contact-ok hidden" role="status"></p>
          <button id="contactSubmit" type="submit" class="contact-submit"><span>Send Message</span></button>
          <p class="contact-note">Prefer email? Write to <a href="mailto:drive@helpufin.co.za">drive@helpufin.co.za</a>.</p>
        </form>
      </section>
      <aside aria-labelledby="contactInfoHeading" class="contact-card contact-info">
        <p class="contact-kicker">HUFA support</p>
        <h2 id="contactInfoHeading" class="contact-card-title">We&rsquo;re here to help</h2>
        <ul class="contact-info-list">
          <li><a class="contact-info-row" href="tel:+27642017584" aria-label="Call HUFA on +27 64 201 7584"><span class="contact-info-ic contact-opt-icon--blue" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.25a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9z"/></svg></span><span><span class="contact-info-t">Phone</span><span class="contact-info-v">+27 64 201 7584</span></span></a></li>
          <li><a class="contact-info-row" href="mailto:drive@helpufin.co.za" aria-label="Email HUFA at drive@helpufin.co.za"><span class="contact-info-ic contact-opt-icon--gold" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg></span><span><span class="contact-info-t">Email</span><span class="contact-info-v contact-opt-value--break">drive@helpufin.co.za</span></span></a></li>
          <li><a class="contact-info-row" href="https://www.google.com/maps/search/?api=1&query=265%20Pigeon%20Cres%2C%20Montana%20Park%2C%20Pretoria%200182%2C%20South%20Africa" target="_blank" rel="noopener" aria-label="Visit HUFA at 265 Pigeon Cres, Montana Park, Pretoria 0182, open in Google Maps"><span class="contact-info-ic contact-opt-icon--navy" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span><span><span class="contact-info-t">Visit</span><span class="contact-info-v">265 Pigeon Cres, Montana Park, Pretoria 0182</span></span></a></li>
          <li><span class="contact-info-row contact-info-row--static"><span class="contact-info-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></span><span><span class="contact-info-t">Hours</span><span class="contact-info-v contact-info-v--static">Mon&ndash;Fri, business hours</span></span></span></li>
        </ul>
        <p class="contact-quick-h">Quick links</p>
        <div class="contact-mini-cta">
          <a href="/browse" data-link>Browse Vehicles</a>
          <a href="/sell" data-link>Sell Your Vehicle</a>
          <a href="/compare" data-link>Compare Vehicles</a>
          <a href="/credit" data-link>Vehicle Finance</a>
        </div>
      </aside>
    </div>

    <section aria-labelledby="whyContactHeading" class="contact-why">
      <p class="contact-kicker contact-kicker--center">What we help with</p>
      <h2 id="whyContactHeading" class="contact-why-title">Why contact HUFA?</h2>
      <p class="contact-why-sub">One team for vehicles, finance, insurance and dealership support across South Africa.</p>
      <ul class="contact-why-grid">
        <li><span class="contact-why-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg></span><span><b>Vehicle Finance</b><i>New, used and balloon finance</i></span></li>
        <li><span class="contact-why-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg></span><span><b>Finding Your Next Vehicle</b><i>New and used, nationwide dealers</i></span></li>
        <li><span class="contact-why-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></span><span><b>First-Time Buyer Assistance</b><i>Guidance and credit explained</i></span></li>
        <li><span class="contact-why-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18h-5"/><path d="M20 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 18.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></span><span><b>Fleet Finance</b><i>Finance for business fleets</i></span></li>
        <li><span class="contact-why-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg></span><span><b>Vehicle Insurance</b><i>Cover options explained</i></span></li>
        <li><span class="contact-why-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg></span><span><b>Selling Your Vehicle</b><i>Private and dealer listings</i></span></li>
        <li><span class="contact-why-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg></span><span><b>Dealership Enquiries</b><i>Partner with HUFA</i></span></li>
        <li><span class="contact-why-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Z"/><path d="M21 11h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-5Z"/><path d="M21 11a9 9 0 0 0-18 0"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/></svg></span><span><b>General Support</b><i>Accounts and marketplace help</i></span></li>
      </ul>
    </section>
    <section aria-labelledby="contactSocialHeading" class="contact-social">
      <p class="contact-kicker contact-kicker--center">Stay connected</p>
      <h2 id="contactSocialHeading" class="contact-social-title">Follow the journey</h2>
      <p class="contact-social-sub">New arrivals, finance explainers and marketplace updates.</p>
      <div class="contact-social-row" role="group" aria-label="HUFA on social media">
        ${HUFA_SOCIAL.map(s => `
        <a class="contact-social-btn" href="${s.href}" target="_blank" rel="noopener" aria-label="HUFA on ${s.label} (opens in a new tab)">${s.icon}<span>${s.label}</span></a>`).join("")}
      </div>
    </section>
  </div>
</div>
  `;
}

function initContact() {
  const form = document.getElementById("contactForm");
  if (!form || form.dataset.bound === "1") return;
  form.dataset.bound = "1";
  const err = document.getElementById("contactErr");
  const ok = document.getElementById("contactOk");
  const btn = document.getElementById("contactSubmit");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (err) err.classList.add("hidden");
    if (ok) ok.classList.add("hidden");
    const first = document.getElementById("contactFirstName").value.trim();
    const last = document.getElementById("contactLastName").value.trim();
    const email = document.getElementById("contactEmail").value.trim();
    const phone = document.getElementById("contactPhone").value.trim();
    const reason = document.getElementById("contactReason").value;
    const message = document.getElementById("contactMessage").value.trim();
    const fail = (m) => {
      if (err) { err.textContent = m; err.classList.remove("hidden"); }
      toast(m);
    };
    if (!first || !last) return fail("Please enter your first and last name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Please enter a valid email address.");
    if (phone && phone.replace(/\D/g, "").length < 7) return fail("Please enter a valid phone number.");
    if (!reason) return fail("Please choose a reason for contact.");
    if (message.length < 10) return fail("Please tell us a little more (at least 10 characters).");
    if (btn) { btn.disabled = true; btn.classList.add("is-busy"); }
    const subject = encodeURIComponent("[HUFA Contact] " + reason + " - " + first + " " + last);
    const body = encodeURIComponent("Name: " + first + " " + last + "\nEmail: " + email + "\nPhone: " + (phone || "-") + "\nReason: " + reason + "\n\n" + message);
    window.location.href = "mailto:drive@helpufin.co.za?subject=" + subject + "&body=" + body;
    if (ok) {
      ok.textContent = "Opening your email app with your message addressed to drive@helpufin.co.za. Just press send.";
      ok.classList.remove("hidden");
    }
    toast("Opening your email app - press send to reach HUFA.");
    form.reset();
    if (btn) { btn.disabled = false; btn.classList.remove("is-busy"); }
  });
}
