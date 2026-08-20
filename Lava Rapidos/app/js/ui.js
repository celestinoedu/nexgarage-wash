// Utilitários de UI (sem dependências).

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const money = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));

export const today = () => new Date().toISOString().slice(0, 10);

export const dateBR = (v) => {
  if (!v) return "—";
  const d = new Date(`${String(v).slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(d);
};

// Escapa para inserção segura em HTML.
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const norm = (s) => String(s ?? "").trim().toUpperCase();

let toastTimer;
export function toast(msg, type = "ok") {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.className = `toast ${type} show`;
  t.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = "toast"), 3200);
}

// Modal genérico. content = string HTML. Retorna o elemento .modal-card.
export function openModal(title, contentHTML, { wide = false } = {}) {
  const root = $("#modal-root");
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card ${wide ? "wide" : ""}">
        <div class="modal-head">
          <h3>${esc(title)}</h3>
          <button class="icon-btn" data-close aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">${contentHTML}</div>
      </div>
    </div>`;
  const close = () => (root.innerHTML = "");
  root.querySelector("[data-close]").onclick = close;
  root.querySelector(".modal-backdrop").onclick = (e) => {
    if (e.target.classList.contains("modal-backdrop")) close();
  };
  return { card: root.querySelector(".modal-card"), close };
}

export function closeModal() {
  $("#modal-root").innerHTML = "";
}

export async function confirmDialog(msg) {
  return new Promise((resolve) => {
    const { close } = openModal("Confirmar", `
      <p class="muted" style="margin-bottom:18px">${esc(msg)}</p>
      <div class="row gap end">
        <button class="btn ghost" data-no>Cancelar</button>
        <button class="btn danger" data-yes>Confirmar</button>
      </div>`);
    $("[data-no]").onclick = () => { close(); resolve(false); };
    $("[data-yes]").onclick = () => { close(); resolve(true); };
  });
}

// Lê os campos de um <form> como objeto.
export const formData = (form) => Object.fromEntries(new FormData(form).entries());
