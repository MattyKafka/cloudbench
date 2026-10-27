"use strict";

/* CloudBench: self-contained, browser-side static-hosting measurement lab.
   A run is not a controlled laboratory test of provider infrastructure;
   measurements include the user's network, CDN edge and local browser. */

const PROVIDER_IDS = ["AWS", "AZURE", "GOOGLE"];
const PAYLOADS = {
  128: {bytes: 128 * 1024, file: "assets/payloads/128kb.bin"},
  512: {bytes: 512 * 1024, file: "assets/payloads/512kb.bin"},
  1024: {bytes: 1024 * 1024, file: "assets/payloads/1024kb.bin"}
};
const PLATFORM_ABBR = {AWS: "AWS", AZURE: "AZ", GOOGLE: "GCP"};
const state = { platforms: [], platformId: "LOCAL", results: null, imported: new Map(), controller: null, running: false };
const $ = (selector) => document.querySelector(selector);
const ms = (value) => `${value.toFixed(1)} ms`;
const median = (arr) => {
  const sorted = [...arr].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

function validRemoteUrl(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && Boolean(u.hostname) ? u : null;
  } catch { return null; }
}

async function loadPlatforms() {
  try {
    const res = await fetch("data/platforms.json", {cache: "no-store"});
    if (!res.ok) throw new Error(`Config HTTP ${res.status}`);
    const config = await res.json();
    if (!Array.isArray(config.platforms) || config.platforms.length !== 3) throw new Error("Neplatná konfigurace platforem");
    state.platforms = config.platforms.filter((p) => PROVIDER_IDS.includes(p.id));
    const matching = state.platforms.find((p) => {
      const u = validRemoteUrl(p.url);
      return u && u.host === window.location.host;
    });
    state.platformId = matching?.id || "LOCAL";
    drawPlatforms();
  } catch (err) {
    state.platforms = [
      {id:"AWS", name:"Amazon Web Services", service:"Amplify Hosting", url:""},
      {id:"AZURE", name:"Microsoft Azure", service:"Static Web Apps", url:""},
      {id:"GOOGLE", name:"Google Cloud", service:"Firebase Hosting", url:""}
    ];
    drawPlatforms();
    $("#deploymentStatus").textContent = "Pro načtení konfigurace spusťte místní server.";
    console.warn("CloudBench: platform configuration unavailable.", err);
  }
}

function drawPlatforms() {
  const cards = $("#platformCards");
  cards.replaceChildren();
  let configured = 0;
  for (const p of state.platforms) {
    const url = validRemoteUrl(p.url);
    if (url) configured++;
    const card = document.createElement("article");
    card.className = "host-card";
    const header = document.createElement("div"); header.className = "host-header";
    const logo = document.createElement("span"); logo.className = `host-logo ${p.id.toLowerCase()}`; logo.textContent = PLATFORM_ABBR[p.id] || p.id;
    const tag = document.createElement("span"); tag.className = `host-state${url ? " live" : ""}`;
    tag.textContent = url ? (state.platformId === p.id ? "AKTUÁLNÍ PLATFORMA" : "NASTAVENO") : "NENASAZENO";
    header.append(logo, tag);
    const title = document.createElement("h3"); title.textContent = p.name;
    const subtitle = document.createElement("p"); subtitle.className = "host-subtitle"; subtitle.textContent = p.service;
    const address = document.createElement("p"); address.className = "host-address"; address.textContent = url ? url.href : "URL bude doplněna po nasazení";
    const link = document.createElement(url ? "a" : "span"); link.className = "host-open";
    link.textContent = url ? "Otevřít veřejný web ↗" : "Dostupné po nasazení";
    if (url) {link.href = url.href; link.rel = "noopener noreferrer"; link.target = "_blank";}
    card.append(header, title, subtitle, address, link);
    cards.append(card);
  }
  $("#deploymentCount").textContent = String(configured).padStart(2, "0");
  $("#deploymentStatus").textContent = configured === 3 ? "Všechny veřejné adresy nastaveny" : "Adresy doplníme po nasazení";
  $("#sideEnvironment").textContent = state.platformId === "LOCAL" ? "Místní náhled" : `${state.platformId} · nasazená verze`;
  $("#sideHost").textContent = state.platformId === "LOCAL" ? (location.hostname || "Místní náhled") : location.hostname;
}

function updateProgress(completed, total, message) {
  $("#benchStatus").textContent = message;
  $("#benchProgress").textContent = `${completed} / ${total} požadavků`;
  $("#progressBar").style.width = total ? `${(completed / total) * 100}%` : "0%";
}

async function fetchPayload(size, signal) {
  const spec = PAYLOADS[size];
  const url = new URL(spec.file, document.baseURI);
  url.searchParams.set("cb", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const start = performance.now();
  const response = await fetch(url, {cache: "no-store", signal});
  if (!response.ok) throw new Error(`HTTP ${response.status} při načítání ${spec.file}`);
  const bytes = (await response.arrayBuffer()).byteLength;
  const duration = performance.now() - start;
  if (bytes !== spec.bytes) throw new Error(`Nesprávná velikost souboru: ${size} KB test returned ${bytes} bytes instead of ${spec.bytes}`);
  return duration;
}

async function runBenchmark() {
  if (state.running) return;
  state.running = true;
  state.results = null; // Never show old values as if they belonged to a new attempt.
  $("#measurementRows").replaceChildren();
  const pending = document.createElement("p");
  pending.className = "small-note";
  pending.textContent = "Probíhá nové měření. Hodnoty se zobrazí po jeho dokončení.";
  $("#measurementRows").append(pending);
  state.controller = new AbortController();
  const { signal } = state.controller;
  const count = Number($("#repetitions").value);
  const choice = $("#payloadSelection").value;
  const sizes = choice === "all" ? [128, 512, 1024] : [Number(choice)];
  const total = count * sizes.length;
  let done = 0;
  $("#runBenchmark").disabled = true;
  $("#cancelBenchmark").hidden = false;
  $("#repetitions").disabled = true;
  $("#payloadSelection").disabled = true;
  $("#downloadJson").disabled = true;
  $("#downloadCsv").disabled = true;
  $("#resultsLabel").classList.remove("has-results");
  $("#resultsLabel").textContent = "PROBÍHÁ MĚŘENÍ";
  updateProgress(0, total, "ZAHŘÍVACÍ PŘENOS");
  try {
    // Warm-up transfers are never included in the recorded sample set.
    for (const size of sizes) await fetchPayload(size, signal);
    const samples = {};
    for (const size of sizes) samples[size] = [];
    // Interleave payload sizes to reduce bias from network drift.
    for (let repetition = 0; repetition < count; repetition++) {
      for (const size of sizes) {
        updateProgress(done, total, `MĚŘENÍ · ${size === 1024 ? "1 MB" : `${size} KB`} · ${repetition + 1}/${count}`);
        const duration = await fetchPayload(size, signal);
        samples[size].push(duration);
        done++;
        updateProgress(done, total, "PROBÍHÁ MĚŘENÍ");
      }
    }
    const results = {};
    for (const size of sizes) {
      const values = samples[size];
      results[size] = {
        bytes: PAYLOADS[size].bytes,
        medianMs: median(values),
        minMs: Math.min(...values),
        maxMs: Math.max(...values),
        samplesMs: values
      };
    }
    state.results = {
      schema: "cloudbench-result-v1", version: 1,
      providerId: state.platformId, hostname: location.hostname,
      url: location.origin, testedAt: new Date().toISOString(),
      userAgent: navigator.userAgent, repetitions: count,
      cacheMode: "no-store; unique query per request; warm-up excluded",
      payloadStats: results
    };
    drawMeasurements();
    updateProgress(done, total, "MĚŘENÍ DOKONČENO");
    $("#downloadJson").disabled = false;
    $("#downloadCsv").disabled = false;
    $("#resultsLabel").textContent = "NAMĚŘENÉ HODNOTY";
    $("#resultsLabel").classList.add("has-results");
  } catch (err) {
    const cancelled = err.name === "AbortError";
    updateProgress(done, total, cancelled ? "MĚŘENÍ ZRUŠENO" : "MĚŘENÍ SELHALO");
    $("#resultsLabel").textContent = cancelled ? "ZRUŠENO" : "CHYBA";
    if (!cancelled) {
      $("#measurementRows").replaceChildren();
      const error = document.createElement("p"); error.className = "small-note";
      error.textContent = `Měření se nepodařilo dokončit: ${err.message}. Spusť web přes místní HTTP server a zkontroluj dostupnost testovacích souborů.`;
      $("#measurementRows").append(error);
    }
  } finally {
    state.running = false;
    state.controller = null;
    $("#runBenchmark").disabled = false;
    $("#cancelBenchmark").hidden = true;
    $("#repetitions").disabled = false;
    $("#payloadSelection").disabled = false;
  }
}

function drawMeasurements() {
  const root = $("#measurementRows");
  root.replaceChildren();
  const rows = Object.entries(state.results.payloadStats).map(([size, data]) => ({size: Number(size), ...data}));
  const max = Math.max(...rows.map((r) => r.medianMs), 1);
  for (const row of rows) {
    const container = document.createElement("div"); container.className = "measurement-row";
    const name = document.createElement("span"); name.className = "measurement-row-label"; name.textContent = row.size === 1024 ? "1 MB" : `${row.size} KB`;
    const track = document.createElement("div"); track.className = "measurement-track";
    const bar = document.createElement("i"); bar.style.width = `${Math.max(1, row.medianMs / max * 100)}%`; track.append(bar);
    const value = document.createElement("span"); value.className = "measurement-value";
    value.textContent = ms(row.medianMs);
    const sub = document.createElement("span"); sub.className = "measurement-sub";
    sub.textContent = `n=${row.samplesMs.length} · min ${row.minMs.toFixed(1)}`;
    value.append(sub); container.append(name, track, value); root.append(container);
  }
  const note = document.createElement("p"); note.className = "small-note";
  note.textContent = "Sloupce zobrazují dobu přenosu souborů. Kratší čas znamená rychlejší přenos v aktuálním prohlížeči.";
  root.append(note);
}

function downloadFile(filename, content, mimetype) {
  const objectUrl = URL.createObjectURL(new Blob([content], {type: mimetype}));
  const a = document.createElement("a");
  a.href = objectUrl; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
function safeTimeForFile(str) { return str.replace(/[.:]/g, "-"); }
function exportJson() {
  if (!state.results) return;
  const filename = `cloudbench-${state.results.providerId.toLowerCase()}-${safeTimeForFile(state.results.testedAt)}.json`;
  downloadFile(filename, JSON.stringify(state.results, null, 2), "application/json");
}
function exportCsv() {
  if (!state.results) return;
  const r = state.results;
  const rows = [["provider", "hostname", "timestamp_utc", "payload_kb", "sample_index", "transfer_ms", "bytes"]];
  for (const [size, group] of Object.entries(r.payloadStats)) {
    group.samplesMs.forEach((duration, index) => rows.push([r.providerId, r.hostname, r.testedAt, size, index + 1, duration.toFixed(4), group.bytes]));
  }
  const csv = rows.map((row) => row.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\r\n") + "\r\n";
  downloadFile(`cloudbench-${r.providerId.toLowerCase()}-samples.csv`, csv, "text/csv;charset=utf-8");
}

function validateImport(r) {
  if (!r || r.schema !== "cloudbench-result-v1" || r.version !== 1) throw new Error("Neplatný soubor s výsledky CloudBench");
  if (![...PROVIDER_IDS, "LOCAL"].includes(r.providerId) || typeof r.testedAt !== "string" || !Number.isFinite(Date.parse(r.testedAt))) throw new Error("Neplatná platforma nebo datum měření");
  if (!r.payloadStats || typeof r.payloadStats !== "object") throw new Error("V souboru chybí měření");
  for (const [size, group] of Object.entries(r.payloadStats)) {
    if (!(size in PAYLOADS) || !group || group.bytes !== PAYLOADS[size].bytes || !Array.isArray(group.samplesMs) || group.samplesMs.length < 1 || group.samplesMs.length > 100) throw new Error("Neplatný formát měření");
    if (group.samplesMs.some((n) => typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 3600000)) throw new Error("Neplatná doba přenosu");
    if (typeof group.medianMs !== "number" || !Number.isFinite(group.medianMs) || Math.abs(median(group.samplesMs) - group.medianMs) > .01) throw new Error("Neplatný medián");
  }
}

async function importResults(event) {
  const files = [...event.target.files];
  if (!files.length) return;
  let imported = 0, rejected = 0;
  for (const file of files) {
    try {
      if (file.size > 1_000_000) throw new Error("Příliš velký soubor");
      const result = JSON.parse(await file.text());
      validateImport(result);
      const previous = state.imported.get(result.providerId);
      if (!previous || Date.parse(result.testedAt) >= Date.parse(previous.testedAt)) state.imported.set(result.providerId, result);
      imported++;
    } catch (err) { rejected++; console.warn("Invalid imported result", file.name, err); }
  }
  event.target.value = "";
  drawComparison();
  $("#importMessage").textContent = `Načteno souborů: ${imported}; odmítnuto: ${rejected}. Pokud má jedna platforma více měření, zobrazí se nejnovější.`;
}
function drawComparison() {
  const body = $("#comparisonBody");
  body.replaceChildren();
  const order = ["AWS", "AZURE", "GOOGLE", "LOCAL"];
  const entries = order.filter((id) => state.imported.has(id));
  if (!entries.length) {
    const tr = document.createElement("tr"); const td = document.createElement("td");
    td.colSpan = 5; td.className = "empty-cell"; td.textContent = "Zatím nejsou načtena žádná měření.";
    tr.append(td); body.append(tr); return;
  }
  for (const id of entries) {
    const r = state.imported.get(id);
    const tr = document.createElement("tr");
    const values = [id === "LOCAL" ? "MÍSTNÍ TEST (bez cloudu)" : id];
    for (const size of [128, 512, 1024]) values.push(r.payloadStats[size] ? ms(r.payloadStats[size].medianMs) : "Bez měření");
    values.push(new Date(r.testedAt).toLocaleString());
    for (const v of values) { const td = document.createElement("td"); td.textContent = v; tr.append(td); }
    body.append(tr);
  }
}

function bindNavigation() {
  const anchors = [...document.querySelectorAll(".nav-item")];
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (!visible.length) return;
    anchors.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${visible[0].target.id}`));
  }, {rootMargin: "-20% 0px -55% 0px", threshold: [0, .1, .25, .5, 1]});
  ["overview", "scenarios", "hosts", "benchmark", "methodology"].forEach((id) => observer.observe(document.getElementById(id)));
}

function initialize() {
  loadPlatforms();
  bindNavigation();
  $("#runBenchmark").addEventListener("click", runBenchmark);
  $("#cancelBenchmark").addEventListener("click", () => state.controller?.abort());
  $("#downloadJson").addEventListener("click", exportJson);
  $("#downloadCsv").addEventListener("click", exportCsv);
  $("#importResults").addEventListener("change", importResults);
}
document.addEventListener("DOMContentLoaded", initialize);
