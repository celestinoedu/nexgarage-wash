// Legado na raiz e interface moderna original em /app.
const KEY = "nexwash:ui-version";
export function versionPreference() {
  try { return localStorage.getItem(KEY) === "next" ? "next" : "legacy"; }
  catch { return "legacy"; }
}
export function setVersionPreference(version) {
  try { localStorage.setItem(KEY, version); } catch { /* modo privado */ }
}
export function newAppUrl() { return `${location.origin}/app/dashboard/`; }
export function applyVersionPreference() {
  const ui = new URLSearchParams(location.search).get("ui");
  if (ui === "legado" || ui === "nova") setVersionPreference(ui === "nova" ? "next" : "legacy");
  if (ui === "nova" || (ui !== "legado" && versionPreference() === "next")) {
    location.replace(newAppUrl());
    return true;
  }
  document.documentElement.dataset.interface = "legacy";
  return false;
}
export function versionToggleHTML() {
  const modern = document.documentElement.dataset.interface === "next";
  return `<div class="version-switch" role="group" aria-label="Versão da interface">
    <button type="button" class="vs-option ${modern ? "" : "active"}" data-version="legacy" aria-pressed="${!modern}">Legado</button>
    <button type="button" class="vs-option ${modern ? "active" : ""}" data-version="next" aria-pressed="${modern}">Versão nova</button>
  </div>`;
}
export function mountVersionToggle(root = document) {
  root.querySelectorAll("[data-version]").forEach((button) => {
    button.onclick = () => {
      setVersionPreference(button.dataset.version);
      location.href = button.dataset.version === "next" ? newAppUrl() : `/?ui=legado${location.hash}`;
    };
  });
}
export function showNewVersionNotice() { /* O legado é a referência principal. */ }
