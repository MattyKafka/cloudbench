"use strict";

let allRecords = [];
const $ = (selector) => document.querySelector(selector);
const svgNS = "http://www.w3.org/2000/svg";

function renderChart(records) {
  const buckets = ["content", "assets", "api"].map((cat) => ({cat, total: records.filter((r) => r.category === cat).reduce((s, r) => s + r.activity, 0)}));
  const max = Math.max(1, ...buckets.map((b) => b.total));
  const svg = $("#activityChart");
  svg.replaceChildren();
  for (let i = 0; i < 4; i++) {
    const y = 25 + i * 50;
    const line = document.createElementNS(svgNS, "line");
    for (const [key, val] of Object.entries({x1: 32, x2: 690, y1: y, y2: y, stroke: "#e6eaf0", "stroke-width": 1, "stroke-dasharray": "3 6"})) line.setAttribute(key, val);
    svg.append(line);
  }
  const colors = ["#355a79", "#6d8eab", "#a9bfce"];
  buckets.forEach((bucket, i) => {
    const x = 92 + i * 214;
    const height = bucket.total / max * 155;
    const bar = document.createElementNS(svgNS, "rect");
    Object.entries({x, y: 188 - height, width: 108, height, rx: 7, fill: colors[i]}).forEach(([key, val]) => bar.setAttribute(key, val));
    svg.append(bar);
    const label = document.createElementNS(svgNS, "text");
    Object.entries({x: x + 54, y: 211, fill: "#6b7786", "text-anchor": "middle", "font-size": 14, "font-family": "system-ui"}).forEach(([key, val]) => label.setAttribute(key, val));
    label.textContent = ({content:"OBSAH",assets:"SOUBORY",api:"API"}[bucket.cat] || bucket.cat.toUpperCase());
    svg.append(label);
    const value = document.createElementNS(svgNS, "text");
    Object.entries({x: x + 54, y: Math.max(17, 180 - height), fill: "#253342", "text-anchor": "middle", "font-size": 13, "font-weight": "bold", "font-family": "system-ui"}).forEach(([key, val]) => value.setAttribute(key, val));
    value.textContent = bucket.total.toLocaleString("cs-CZ"); svg.append(value);
  });
  $("#chartTotal").textContent = buckets.reduce((s, b) => s + b.total, 0).toLocaleString("cs-CZ") + " jednotek";
}

function updateView() {
  const start = performance.now();
  const search = $("#recordSearch").value.trim().toLowerCase();
  const cat = $("#categoryFilter").value;
  const order = $("#sortFilter").value;
  const filtered = allRecords.filter((r) => (cat === "all" || r.category === cat) && (!search || r.name.toLowerCase().includes(search)));
  filtered.sort(order === "name" ? (a, b) => a.name.localeCompare(b.name) : (a, b) => b.activity - a.activity);
  const tbody = $("#recordRows");
  tbody.replaceChildren();
  for (const record of filtered.slice(0, 15)) {
    const tr = document.createElement("tr");
    for (const text of [record.name, ({content:"Obsah",assets:"Soubory",api:"API"}[record.category] || record.category), record.activity.toLocaleString("cs-CZ"), record.status]) {
      const td = document.createElement("td"); td.textContent = text; tr.append(td);
    }
    tbody.append(tr);
  }
  if (!filtered.length) { const tr = document.createElement("tr"); const td = document.createElement("td"); td.colSpan = 4; td.textContent = "Žádné odpovídající záznamy"; tr.append(td); tbody.append(tr); }
  $("#visibleCount").textContent = filtered.length.toLocaleString("cs-CZ");
  $("#activityTotal").textContent = filtered.reduce((sum, r) => sum + r.activity, 0).toLocaleString("cs-CZ");
  renderChart(filtered);
  $("#filterTime").textContent = (performance.now() - start).toFixed(2) + " ms";
}

async function start() {
  const startTime = performance.now();
  try {
    const response = await fetch("../data/synthetic-records.json", {cache: "no-store"});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.items)) throw new Error("Malformed dataset");
    allRecords = data.items;
    $("#recordCount").textContent = allRecords.length.toLocaleString("cs-CZ");
    $("#jsonFetch").textContent = (performance.now() - startTime).toFixed(1) + " ms";
    ["recordSearch", "categoryFilter", "sortFilter"].forEach((id) => document.getElementById(id).addEventListener(id === "recordSearch" ? "input" : "change", updateView));
    updateView();
  } catch (err) {
    $("#recordRows").textContent = "Datový soubor se nepodařilo načíst. Spusť stránku přes místní HTTP server.";
    $("#jsonFetch").textContent = "Chyba";
    console.error(err);
  }
}
document.addEventListener("DOMContentLoaded", start);
