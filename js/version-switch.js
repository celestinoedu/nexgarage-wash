// Convivência entre a versão legado (raiz do domínio) e a versão nova (/app).
// As duas rodam na mesma origem, então compartilham as chaves de localStorage.

const VERSION_KEY = "nexwash:ui-version";
const NOTICE_KEY = "nexwash:new-version-notice";
const MUTED_KEY = "nexwash:new-version-muted";
const NEW_APP_PATH = "/app/dashboard/";
const REDIRECT_AT_KEY = "nexwash:redirected-at";
// Voltar à raiz dentro desta janela indica que /app devolveu o usuário para cá.
const BOUNCE_WINDOW = 5000;
const NOTICE_TIMEOUT = 9000;

function read(storage, key) {
  try { return window[storage].getItem(key); } catch { return null; }
}
function write(storage, key, value) {
  try { window[storage].setItem(key, value); } catch { /* navegação privada */ }
}

export function newAppUrl() {
  return `${location.origin}${NEW_APP_PATH}`;
}

// A versão nova é a principal: só fica no legado quem escolheu explicitamente.
export function versionPreference() {
  return read("localStorage", VERSION_KEY) === "legacy" ? "legacy" : "next";
}

export function setVersionPreference(version) {
  write("localStorage", VERSION_KEY, version);
}

/**
 * Respeita a escolha do usuário no início da sessão. `?ui=legado` na URL é o
 * caminho de volta usado pela versão nova e também a saída de emergência caso
 * o subcaminho /app fique indisponível.
 */
export function applyVersionPreference() {
  const params = new URLSearchParams(location.search);
  if (params.get("ui") === "legado") {
    setVersionPreference("legacy");
    params.delete("ui");
    const query = params.toString();
    history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
    return false;
  }
  if (versionPreference() !== "next") return false;
  // Proteção contra laço: só desiste do redirecionamento se acabamos de voltar
  // de /app — sinal de que a versão nova devolveu o usuário para cá. Voltar à
  // raiz mais tarde na mesma sessão continua levando para a versão principal.
  const ultimo = Number(read("sessionStorage", REDIRECT_AT_KEY) || 0);
  if (ultimo && Date.now() - ultimo < BOUNCE_WINDOW) return false;
  write("sessionStorage", REDIRECT_AT_KEY, String(Date.now()));
  location.replace(newAppUrl());
  return true;
}

export function versionToggleHTML() {
  return `<div class="version-switch" role="group" aria-label="Versão da interface">
    <span class="vs-option active" aria-current="true">Versão atual</span>
    <button type="button" class="vs-option vs-go" title="Voltar para a versão nova do NexWash">✨ Versão nova</button>
  </div>`;
}

export function mountVersionToggle(root = document) {
  root.querySelectorAll(".version-switch .vs-go").forEach((button) => {
    button.onclick = () => {
      setVersionPreference("next");
      location.href = newAppUrl();
    };
  });
}

/**
 * Aviso discreto no canto, uma vez por sessão, lembrando que existe uma versão
 * nova. Some sozinho depois de alguns segundos.
 */
export function showNewVersionNotice() {
  if (versionPreference() === "next") return;
  if (read("localStorage", MUTED_KEY) === "1") return;
  if (read("sessionStorage", NOTICE_KEY) === "1") return;
  write("sessionStorage", NOTICE_KEY, "1");

  const toast = document.createElement("aside");
  toast.className = "version-toast";
  toast.setAttribute("role", "status");
  toast.innerHTML = `
    <button class="vt-close" type="button" aria-label="Fechar aviso">×</button>
    <strong class="vt-title">✨ Você está na versão atual</strong>
    <p class="vt-text">A versão nova do NexWash já é a principal, com interface reformulada e visão consolidada das lojas. Esta versão continua disponível enquanto você quiser.</p>
    <div class="vt-actions">
      <button class="btn primary vt-go" type="button">Ir para a versão nova</button>
      <button class="btn ghost vt-mute" type="button">Não mostrar mais</button>
    </div>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));

  let timer = window.setTimeout(dismiss, NOTICE_TIMEOUT);
  function dismiss() {
    window.clearTimeout(timer);
    toast.classList.remove("show");
    window.setTimeout(() => toast.remove(), 250);
  }
  // Enquanto o ponteiro estiver sobre o aviso ele não desaparece.
  toast.addEventListener("mouseenter", () => window.clearTimeout(timer));
  toast.addEventListener("mouseleave", () => { timer = window.setTimeout(dismiss, 3000); });
  toast.querySelector(".vt-close").onclick = dismiss;
  toast.querySelector(".vt-mute").onclick = () => { write("localStorage", MUTED_KEY, "1"); dismiss(); };
  toast.querySelector(".vt-go").onclick = () => {
    setVersionPreference("next");
    location.href = newAppUrl();
  };
}
