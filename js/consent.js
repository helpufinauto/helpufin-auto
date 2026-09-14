/* =========================================================
   PHASE 2 — HUFA COOKIE & PRIVACY CONSENT
   =========================================================
   Dependency-free consent manager + UI.

   What it stores (localStorage key "hufa_cookie_consent"):
     { v, necessary, analytics, decision, ts }
   Preference booleans ONLY — never passwords, auth tokens,
   session data or profile information (those live with
   Supabase Auth and are untouched by this module).

   Categories (audited against the real project):
     • necessary  — always on: SPA routing, Supabase auth
       session handling, security and core marketplace
       operation. Cannot be switched off.
     • analytics  — OPTIONAL first-party analytics/tracking
       code that exists in this project (vehicle impression
       + analytics event queues in pages/browse.js and
       pages/browse/tracking.js). No advertising, marketing
       or third-party trackers exist, so none are claimed.

   The banner is non-blocking: no overlay, no scroll lock —
   the site stays fully interactive until the user decides.

   Public API (module exports + window.HUFA_CONSENT):
     getConsent() hasDecided() isAllowed(category)
     setConsent(prefs, decision) onChange(cb)
     openPreferences()
   ========================================================= */

/* =========================================
   CONSTANTS + STATE
   ========================================= */

const STORAGE_KEY = "hufa_cookie_consent";

const CONSENT_VERSION = 1;

const CONSENT_EVENT = "hufa:consent";

/* undecided === null. analytics defaults to OFF
   (privacy-first) until the user explicitly opts in. */
let consentState = null;

/* =========================================
   STORAGE (local, preference data only)
   ========================================= */

function readStoredConsent(){

  try{

    const raw =
    localStorage.getItem(STORAGE_KEY);

    if(!raw){
      return null;
    }

    const parsed =
    JSON.parse(raw);

    if(
      !parsed ||
      typeof parsed !== "object" ||
      parsed.v !== CONSENT_VERSION
    ){
      /* Unknown/legacy shape → treat as undecided
         (banner will simply be shown again). */
      return null;
    }

    return {
      v: CONSENT_VERSION,
      necessary: true,
      analytics: parsed.analytics === true,
      decision:
        typeof parsed.decision === "string"
          ? parsed.decision
          : "custom",
      ts:
        typeof parsed.ts === "string"
          ? parsed.ts
          : new Date().toISOString()
    };

  }catch(err){

    /* Storage unavailable / corrupt → undecided,
       never let this break the site. */
    return null;

  }

}

function writeStoredConsent(state){

  try{

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );

  }catch(err){

    /* Storage full/blocked — decision lives for this
       page view only; site keeps working normally. */

  }

}

/* =========================================
   READ API
   ========================================= */

export function getConsent(){

  return consentState
    ? { ...consentState }
    : null;

}

export function hasDecided(){

  return consentState !== null;

}

export function isAllowed(category){

  if(category === "necessary"){
    return true;
  }

  if(category === "analytics"){
    return consentState?.analytics === true;
  }

  return false;

}

/* =========================================
   WRITE API
   ========================================= */

export function setConsent(preferences, decision){

  const state = {
    v: CONSENT_VERSION,
    necessary: true,
    analytics: preferences?.analytics === true,
    decision:
      decision === "accept_all" ||
      decision === "necessary" ||
      decision === "custom"
        ? decision
        : "custom",
    ts: new Date().toISOString()
  };

  const previous = consentState;

  consentState = state;

  writeStoredConsent(state);

  /* Only notify when something actually changed. */
  if(
    !previous ||
    previous.analytics !== state.analytics
  ){

    notifyListeners(state);

  }

  return { ...state };

}

/* =========================================
   CHANGE NOTIFICATION
   ========================================= */

const listeners = new Set();

export function onChange(callback){

  if(typeof callback === "function"){
    listeners.add(callback);
  }

  return () => listeners.delete(callback);

}

function notifyListeners(state){

  try{

    window.dispatchEvent(
      new CustomEvent(CONSENT_EVENT, {
        detail: { ...state }
      })
    );

  }catch(err){ /* ignore */ }

  listeners.forEach((cb) => {

    try{
      cb({ ...state });
    }catch(err){ /* listener errors never break us */ }

  });

}

/* =========================================
   UI — MARKUP
   ========================================= */

const SHIELD_SVG =
'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2.5 4.5 5.4v5.4c0 4.6 3.2 9 7.5 10.7 4.3-1.7 7.5-6.1 7.5-10.7V5.4L12 2.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m9 11.6 2.1 2.1 3.9-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const CLOSE_SVG =
'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

function buildBannerElement(){

  const banner =
  document.createElement("section");

  banner.className =
  "hufa-consent-banner";

  banner.id =
  "hufa-consent-banner";

  banner.setAttribute("role", "region");

  banner.setAttribute(
    "aria-label",
    "Cookie consent"
  );

  banner.innerHTML =
  '<div class="hufa-consent-banner-head">' +
    SHIELD_SVG +
    '<h2 class="hufa-consent-title">Your privacy choices</h2>' +
  '</div>' +
  '<p class="hufa-consent-text">' +
    'We use essential cookies to keep HUFA working — navigation, sign-in and security. ' +
    'With your permission we also measure how the marketplace is used. ' +
    'Nothing is shared with advertisers, and your choice is stored on this device only.' +
  '</p>' +
  '<div class="hufa-consent-actions">' +
    '<button type="button" class="hufa-consent-btn hufa-consent-btn-primary" data-consent-action="accept-all">Accept all</button>' +
    '<button type="button" class="hufa-consent-btn hufa-consent-btn-secondary" data-consent-action="necessary">Only necessary</button>' +
  '</div>' +
  '<button type="button" class="hufa-consent-manage" data-consent-action="manage">Manage preferences</button>';

  return banner;

}

function buildPreferencesElement(){

  const overlay =
  document.createElement("div");

  overlay.className =
  "hufa-consent-overlay";

  overlay.id =
  "hufa-consent-preferences";

  overlay.setAttribute("role", "dialog");

  overlay.setAttribute(
    "aria-modal",
    "true"
  );

  overlay.setAttribute(
    "aria-labelledby",
    "hufa-consent-prefs-title"
  );

  overlay.innerHTML =
  '<div class="hufa-consent-sheet" role="document">' +
    '<div class="hufa-consent-sheet-head">' +
      '<h2 class="hufa-consent-sheet-title" id="hufa-consent-prefs-title">Cookie preferences</h2>' +
      '<button type="button" class="hufa-consent-close" data-consent-action="close-prefs" aria-label="Close cookie preferences">' +
        CLOSE_SVG +
      '</button>' +
    '</div>' +
    '<p class="hufa-consent-sheet-intro">' +
      'Choose what HUFA may use. Only the categories below exist on this site — ' +
      'your choice is stored on this device and never includes personal data.' +
    '</p>' +
    '<div class="hufa-consent-category">' +
      '<div class="hufa-consent-category-info">' +
        '<div class="hufa-consent-category-head">' +
          '<h3 class="hufa-consent-category-title">Strictly necessary</h3>' +
          '<span class="hufa-consent-badge">Always active</span>' +
        '</div>' +
        '<p class="hufa-consent-category-desc">' +
          'Required for navigation, sign-in sessions, security and core marketplace features. These cannot be switched off.' +
        '</p>' +
      '</div>' +
      '<button type="button" class="hufa-consent-switch" role="switch" aria-checked="true" disabled aria-label="Strictly necessary cookies (always active)"></button>' +
    '</div>' +
    '<div class="hufa-consent-category">' +
      '<div class="hufa-consent-category-info">' +
        '<div class="hufa-consent-category-head">' +
          '<h3 class="hufa-consent-category-title">Analytics &amp; performance</h3>' +
        '</div>' +
        '<p class="hufa-consent-category-desc">' +
          'Optional and first-party only. Helps us understand which vehicles are viewed so we can improve search and recommendations. No advertising or third-party trackers are used.' +
        '</p>' +
      '</div>' +
      '<button type="button" class="hufa-consent-switch" id="hufa-consent-analytics-switch" role="switch" aria-checked="false" aria-label="Analytics and performance cookies"></button>' +
    '</div>' +
    '<button type="button" class="hufa-consent-btn hufa-consent-btn-primary hufa-consent-save" data-consent-action="save">Save preferences</button>' +
    '<p class="hufa-consent-note">You can change this anytime via &ldquo;Cookies&rdquo; in the footer.</p>' +
  '</div>';

  return overlay;

}

/* =========================================
   UI — BANNER BEHAVIOUR
   ========================================= */

let bannerEl = null;

let prefsEl = null;

let lastFocusedElement = null;

function showBanner(){

  if(bannerEl){
    return;
  }

  try{

    bannerEl = buildBannerElement();

    document.body.appendChild(bannerEl);

    bannerEl.addEventListener(
      "click",
      handleBannerClick
    );

    requestAnimationFrame(() => {

      bannerEl?.classList.add("is-visible");

      /* Land keyboard focus on the primary choice.
         The page itself stays fully interactive —
         this is not a modal. */
      bannerEl
        ?.querySelector("[data-consent-action='accept-all']")
        ?.focus({ preventScroll: true });

    });

  }catch(err){

    /* Never block the site because the banner
       could not be created. */
    bannerEl = null;

  }

}

function dismissBanner(){

  if(!bannerEl){
    return;
  }

  const el = bannerEl;

  bannerEl = null;

  el.classList.remove("is-visible");

  el.classList.add("is-hiding");

  setTimeout(() => el.remove(), 320);

}

function handleBannerClick(event){

  const action =
  event.target
    ?.closest("[data-consent-action]")
    ?.dataset.consentAction;

  if(!action){
    return;
  }

  if(action === "accept-all"){

    setConsent(
      { analytics: true },
      "accept_all"
    );

    dismissBanner();

  }else if(action === "necessary"){

    setConsent(
      { analytics: false },
      "necessary"
    );

    dismissBanner();

  }else if(action === "manage"){

    openPreferences();

  }

}

/* =========================================
   UI — PREFERENCES BEHAVIOUR
   ========================================= */

function isPrefsOpen(){

  return !!prefsEl &&
  prefsEl.classList.contains("is-open");

}

function openPreferences(){

  if(isPrefsOpen()){
    return;
  }

  try{

    if(!prefsEl){

      prefsEl = buildPreferencesElement();

      document.body.appendChild(prefsEl);

      prefsEl.addEventListener(
        "click",
        handlePrefsClick
      );

    }

    /* Reflect the current decision in the toggle. */
    const analyticsSwitch =
    prefsEl.querySelector("#hufa-consent-analytics-switch");

    analyticsSwitch?.setAttribute(
      "aria-checked",
      isAllowed("analytics") ? "true" : "false"
    );

    lastFocusedElement =
    document.activeElement;

    prefsEl.classList.add("is-open");

    requestAnimationFrame(() => {

      prefsEl?.classList.add("is-visible");

      prefsEl
        ?.querySelector(".hufa-consent-close")
        ?.focus({ preventScroll: true });

    });

  }catch(err){

    prefsEl = null;

  }

}

function closePreferences(){

  if(!isPrefsOpen()){
    return;
  }

  prefsEl.classList.remove("is-visible");

  const el = prefsEl;

  setTimeout(() => {

    /* Only fully hide if the dialog was not re-opened
       while the close animation was still running. */
    if(!el.classList.contains("is-visible")){
      el.classList.remove("is-open");
    }

  }, 240);

  if(
    lastFocusedElement &&
    typeof lastFocusedElement.focus === "function"
  ){

    lastFocusedElement.focus({
      preventScroll: true
    });

  }

  lastFocusedElement = null;

}

function handlePrefsClick(event){

  /* Click on the dark backdrop (not the sheet) closes. */
  if(event.target === prefsEl){
    closePreferences();
    return;
  }

  /* Toggle a category switch (the "necessary" switch is
     disabled, so it can never be flipped). */
  const toggle =
  event.target?.closest(".hufa-consent-switch");

  if(toggle && !toggle.disabled){

    const next =
    toggle.getAttribute("aria-checked") === "true"
      ? "false"
      : "true";

    toggle.setAttribute("aria-checked", next);

    return;

  }

  const action =
  event.target
    ?.closest("[data-consent-action]")
    ?.dataset.consentAction;

  if(!action){
    return;
  }

  if(action === "close-prefs"){

    closePreferences();

  }else if(action === "save"){

    const analyticsSwitch =
    prefsEl.querySelector("#hufa-consent-analytics-switch");

    const analyticsAllowed =
    analyticsSwitch?.getAttribute("aria-checked") === "true";

    setConsent(
      { analytics: analyticsAllowed },
      "custom"
    );

    closePreferences();

    /* A saved custom choice also resolves a pending
       first-visit banner. */
    dismissBanner();

  }

}

/* =========================================
   GLOBAL WIRING
   ========================================= */

/* Footer "Cookies" link + any [data-consent-settings]
   element reopens the preferences dialog. The footer is
   injected as innerHTML by the app, so this delegated
   (capture-phase) listener keeps working across SPA
   route changes without touching app code. */

function handleDelegatedClick(event){

  const trigger =
  event.target?.closest("[data-consent-settings]");

  if(!trigger){
    return;
  }

  event.preventDefault();

  openPreferences();

}

function handleKeydown(event){

  if(
    event.key === "Escape" &&
    isPrefsOpen()
  ){
    closePreferences();
  }

}

/* =========================================
   INIT (once per page load)
   ========================================= */

function initConsent(){

  if(window.__HUFA_CONSENT_INITIALIZED__){
    return;
  }

  window.__HUFA_CONSENT_INITIALIZED__ = true;

  consentState = readStoredConsent();

  document.addEventListener(
    "click",
    handleDelegatedClick,
    true
  );

  document.addEventListener(
    "keydown",
    handleKeydown
  );

  /* First visit → show the consent interface. */
  if(!hasDecided()){
    showBanner();
  }

}

/* Stable global API for non-module code (footer link,
   future phases, manual console testing). */
window.HUFA_CONSENT = {
  getConsent,
  hasDecided,
  isAllowed,
  setConsent,
  onChange,
  openPreferences
};

initConsent();