/*
=========================================================
PHASE 12 — SHARED PASSWORD POLICY (HUFA)
=========================================================
Single source of truth for the password rules enforced on
/signup and /reset-password. Both pages import this module —
the rules are never duplicated or drifted apart.

Rules (ALL must pass before Supabase Auth is called):
  • Minimum 12 characters
  • At least 1 uppercase letter (A-Z)
  • At least 1 lowercase letter (a-z)
  • At least 1 number (0-9)
  • At least 1 special character (any non-alphanumeric)

The panel updates live as the user types. State is
communicated by the icon (circle → check), text color AND
weight — never by color alone. No password value is ever
stored or logged by this module.
=========================================================
*/

export const PASSWORD_REQUIREMENTS =
[
  {
    id: "length",
    label: "At least 12 characters",
    hint: "at least 12 characters",
    test: (password) => password.length >= 12
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    hint: "one uppercase letter",
    test: (password) => /[A-Z]/.test(password)
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    hint: "one lowercase letter",
    test: (password) => /[a-z]/.test(password)
  },
  {
    id: "number",
    label: "One number",
    hint: "one number",
    test: (password) => /[0-9]/.test(password)
  },
  {
    id: "special",
    label: "One special character",
    hint: "one special character",
    test: (password) => /[^A-Za-z0-9]/.test(password)
  }
];

/* Returns the hint text of every rule the password
   does NOT satisfy yet. Empty array = fully valid. */

export function getUnmetPasswordRequirements(password){

  return PASSWORD_REQUIREMENTS
    .filter((rule) => !rule.test(password))
    .map((rule) => rule.hint);

}

/* User-facing toast message listing the unmet rules.
   Used by BOTH pages so the wording stays identical. */

export function buildPasswordRequirementsMessage(password){

  const unmet =
  getUnmetPasswordRequirements(password);

  if(unmet.length === 0){
    return "";
  }

  return "Password must include " + unmet.join(", ");

}

/* Compact requirements panel (HUFA visual language, inline
   SVG icons — same icon approach as the toast checkmark in
   js/ui.js). Each row carries data-rule so the bind helper
   below can update it; no per-page ids needed. */

const PWD_ICON_CIRCLE = `
<svg
  class="pwd-req-icon-circle"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  aria-hidden="true"
>
<circle cx="12" cy="12" r="9" />
</svg>
`;

const PWD_ICON_CHECK = `
<svg
  class="pwd-req-icon-check"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="3"
  aria-hidden="true"
>
<path
  stroke-linecap="round"
  stroke-linejoin="round"
  d="M5 13l4 4L19 7"
/>
</svg>
`;

export function renderPasswordRequirements(containerId){

  return `
  <div
    id="${containerId}"
    class="pwd-requirements"
    aria-label="Password requirements"
  >

  <p class="pwd-requirements-title">
  Password requirements
  </p>

  <ul class="pwd-requirements-list">

  ${PASSWORD_REQUIREMENTS.map((rule)=>`
    <li
      class="pwd-requirement"
      data-rule="${rule.id}"
      data-met="false"
    >
      <span
        class="pwd-requirement-icon"
        aria-hidden="true"
      >
      ${PWD_ICON_CIRCLE}
      ${PWD_ICON_CHECK}
      </span>
      <span class="pwd-requirement-label">${rule.label}</span>
    </li>
  `).join("")}

  </ul>

  </div>
  `;

}

/* Wires a password input to its requirements panel.
   Every keystroke re-tests all rules and flips each row
   between unmet and met (class + data attribute +
   accessible label). Safe to call on every render —
   the dataset guard prevents duplicate listeners. */

export function bindPasswordRequirements(input, panel){

  if(!input || !panel){
    return;
  }

  if(input.dataset.pwdRequirementsBound){
    return;
  }

  input.dataset.pwdRequirementsBound = "true";

  const items =
  panel.querySelectorAll("[data-rule]");

  function updateRequirements(){

    const value = input.value;

    items.forEach((item)=>{

      const rule =
      PASSWORD_REQUIREMENTS.find(
        (r) => r.id === item.dataset.rule
      );

      if(!rule){
        return;
      }

      const met = rule.test(value);

      item.classList.toggle("met", met);

      item.dataset.met = met ? "true" : "false";

      item.setAttribute(
        "aria-label",
        rule.label + (met ? " (met)" : " (not met yet)")
      );

    });

  }

  input.addEventListener("input", updateRequirements);

  /* Sync once immediately so the panel reflects any
     browser-prefilled value on first paint. */

  updateRequirements();

}
