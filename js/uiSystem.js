/* =========================
   🔥 GLOBAL UI SYSTEM
========================= */

/* BUTTONS */
export function Button(label, type = "primary"){

  const styles = {
    primary: "btn btn-dark",
    gold: "btn btn-gold",
    outline: "btn-clean",
    full: "w-full btn btn-dark"
  };

  return `
    <button class="${styles[type]}">
      ${label}
    </button>
  `;
}

/* CARD */
export function Card(content, extra=""){
  return `
    <div class="card ${extra}">
      ${content}
    </div>
  `;
}

/* INPUT */
export function Input(id, placeholder, type="text"){
  return `
    <input 
      id="${id}"
      type="${type}"
      placeholder="${placeholder}"
      class="input-light"
    />
  `;
}