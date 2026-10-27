"use strict";

function readNavigationTimings() {
  const nav = performance.getEntriesByType("navigation")[0];
  if (!nav) return;
  const fmt = (value) => Number.isFinite(value) && value >= 0 ? `${value.toFixed(1)} ms` : "Nedostupné";
  document.querySelectorAll("[data-timing=ttfb]").forEach((el) => el.textContent = fmt(nav.responseStart - nav.requestStart));
  document.querySelectorAll("[data-timing=load]").forEach((el) => el.textContent = fmt(nav.loadEventEnd - nav.startTime));
  if (document.body.dataset.scenario === "media") {
    const resources = performance.getEntriesByType("resource").filter((r) => /\/assets\/media\/scene-\d+\.jpg/.test(r.name));
    const imageCount = document.querySelector("#imageCount");
    const imageTransfer = document.querySelector("#imageTransfer");
    if (imageCount) imageCount.textContent = `${resources.length} / 6`;
    const bytes = resources.reduce((total, r) => total + r.transferSize, 0);
    if (imageTransfer) imageTransfer.textContent = bytes ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : "Cache / bez údaje";
  }
}

async function addProviderSwitcher() {
  try {
    const r = await fetch("../data/platforms.json", {cache: "no-store"});
    if (!r.ok) return;
    const {platforms} = await r.json();
    const provider = platforms.find((p) => {
      try {return p.url && new URL(p.url).host === location.host;} catch {return false;}
    });
    document.querySelector("#currentProvider").textContent = provider ? `${provider.id} — NASAZENÁ VERZE` : "MÍSTNÍ NÁHLED";
    const root = document.querySelector("#providerSwitcher");
    if (!root) return;
    for (const p of platforms) {
      let url = null;
      try {
        const base = new URL(p.url);
        if (base.protocol === "https:") url = new URL(`${document.body.dataset.scenario}.html`, `${base.href.replace(/\/?$/, "/")}tests/`).href;
      } catch { /* Not deployed yet. */ }
      const element = document.createElement(url ? "a" : "span");
      element.textContent = p.id;
      element.className = "switch-link" + (provider?.id === p.id ? " active" : "") + (url ? "" : " disabled");
      if (url) element.href = url;
      root.append(element);
    }
  } catch { /* Config is optional while developing locally. */ }
}
window.addEventListener("load", () => setTimeout(readNavigationTimings, 0));
document.addEventListener("DOMContentLoaded", addProviderSwitcher);
