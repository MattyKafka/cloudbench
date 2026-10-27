# CloudBench — Hosting Performance Laboratory

A complete, **static and dependency-free** testing website for a cloud computing seminar project. Publish the **same files** to:

1. **Amazon Web Services** — AWS Amplify Hosting
2. **Microsoft Azure** — Azure Static Web Apps
3. **Google Cloud ecosystem** — Firebase Hosting

The project compares delivery of static assets through a browser under documented conditions. It does **not** claim to measure provider infrastructure in isolation.

## Contents

- `index.html` — responsive dashboard, scenario directory, hosting links, browser benchmark, export / import comparison.
- `styles.css`, `app.js` — styling and application logic with no framework.
- `tests/baseline.html` — small HTML/CSS page and browser Navigation Timing measurements.
- `tests/media.html` — 6 self-hosted JPEGs (~1.5 MB total) and Resource Timing observations.
- `tests/interactive.html` — JSON-driven demo with search, filters, chart (synthetic values, **not benchmark results**).
- `assets/payloads/` — 128 KiB, 512 KiB, 1024 KiB test files; their exact byte size is validated during each run.
- `data/platforms.json` — three eventual public URLs. Leave blank before deployment.
- `data/synthetic-records.json` — generated demo data for the interactive scenario.
- `scripts/build.py` — produces a clean `dist/` folder with public web assets only.
- `docs/experiment-log-template.csv` — a template for recording deployment times and observations.

## Run locally

Requires Python 3, but no third-party packages:

```bash
cd cloudbench
python -m http.server 8000
```

Visit **http://localhost:8000** in a browser. Do not double-click `index.html` using `file://`; modern browsers generally prevent the JSON/config requests from local files.

To create a clean distribution folder: `python scripts/build.py`. To preview the exact distributable version: `python -m http.server 8001 --directory dist`. You can use VS Code's Live Server instead. The main page, all three scenarios, and the transfer benchmark work locally.

## Prepare for deployment and provider switching

After we create the Git repository and publish all three copies, update **the one shared file** `data/platforms.json` with the exact working HTTPS base URLs:

```json
{
  "version": 1,
  "platforms": [
    {"id":"AWS", "name":"Amazon Web Services", "service":"Amplify Hosting", "url":"https://EXAMPLE.amplifyapp.com/"},
    {"id":"AZURE", "name":"Microsoft Azure", "service":"Static Web Apps", "url":"https://EXAMPLE.azurestaticapps.net/"},
    {"id":"GOOGLE", "name":"Google Cloud", "service":"Firebase Hosting", "url":"https://EXAMPLE.web.app/"}
  ]
}
```

**These are placeholders — they are not real deployments.** Commit that edit and redeploy the exact same commit/files to all three services. The dashboard shows active deployment links automatically, while the media and interactive pages gain a provider switcher preserving the scenario path. The baseline page stays deliberately minimal to reduce unrelated code.

Do not paste account credentials or access tokens in this public repository.

## How the browser benchmark works

1. Open `#benchmark` **on the specific provider's own URL**.
2. Select 5 repetitions (recommended) and all 3 payload sizes.
3. One warm-up transfer is performed for each selected size and **excluded** from measurements.
4. Each recorded transfer downloads the same-size file with `cache: 'no-store'` and a unique query string. The browser measures `fetch + response.arrayBuffer()` duration using `performance.now()`.
5. Tests interleave sizes to reduce bias caused by short-term changes in network conditions.
6. CloudBench verifies the byte length of every file and calculates **median** and min/max in milliseconds.
7. Download **JSON** and **CSV**. JSON includes source hostname, provider, timestamp, browser UA, number of samples and each duration.
8. Run it again on the other provider domains. Import the exported JSON files in the dashboard's comparison table. All files are processed **locally in the browser**, not uploaded to an external API.

For a defensible seminar project, repeat experiments at comparable times, on the same device, with a stable connection, and record anomalies. For a deeper test, use an automated browser harness and several geographic locations, but clearly document any change in methodology.

### Crucial caveats

- This is a **client-observed** delivery benchmark. Provider CDN edges, geography, internet latency, congestion, caching policy and client hardware all affect the outcome.
- `cache: 'no-store'` plus a changing query string requests fresh content but **cannot guarantee** identical treatment across all CDNs. Providers may apply different caching policies.
- A larger file is not intrinsically more difficult for cloud infrastructure. Results vary due to many uncontrollable network factors.
- The test uses incompressible binary payloads to reduce differences caused by automatic gzip/Brotli compression.
- **JavaScript computation in the interactive demo runs on the local client** and must not be interpreted as cloud server CPU performance.
- **No measurements are pre-filled or fabricated.** The dashboard starts empty.
- **Local benchmark results carry provider ID `LOCAL`**, not AWS, Azure or Google.
- Browser-reported Navigation Timing and Resource Timing are not identical to server-side instrumentation. Repeated warm/cold tests and timing conditions must be documented.

## Deployment notes (next phase)

- **AWS Amplify Hosting**: an `amplify.yml` file is included. It runs `python3 scripts/build.py` and publishes `dist/` with Git-based hosting. Verify current eligibility, billing and budget alerts before creating hosting resources.
- **Azure Static Web Apps**: select the Free plan where available; a GitHub Actions workflow may be set to run the Python build script and publish `dist/` (verify the current Action inputs). Confirm the generated GitHub Actions workflow and deployment.
- **Firebase Hosting**: a `firebase.json` is included with `public: "dist"`. Run `python scripts/build.py` before `firebase deploy`, once a Firebase project has been created and linked with the official Firebase CLI. `dist/` contains no docs, `.git`, or credentials.

> These deployment notes are a preliminary checklist, not a substitute for checking each provider's current console options and pricing at the time of deployment. **Do not enter a credit card or enable paid services without reviewing costs.** A budget alert may notify you without stopping charges.

## Research output checklist

- Three **clickable public HTTPS URLs** and optional QR codes in the thesis.
- Screenshots of identical pages and deployment dashboards.
- Deployment setup time, number of steps, issues and configuration actions.
- Repeated transfer time medians, and navigation metrics where available.
- A consistent measurement environment (device, browser, country, time, network, repeats).
- Clearly labeled data charts and any values excluded as outliers, with reasons.
- Separate subjective usability assessment from measured performance.
- Links to shared Git commit for reproducibility.

## Standards and useful references

- [MDN: Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)
- [MDN: PerformanceNavigationTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming)
- [MDN: Resource Timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming)
- [Web.dev: Web Vitals](https://web.dev/articles/vitals)

Generated test artwork is original geometric imagery included in the repository; it contains no third-party images or tracking scripts.

## Verze 2 – čeština a akademický vzhled

Rozhraní a tři testovací stránky byly převedeny do češtiny. Barevnost je volně inspirovaná prostředím ČZU; nejde o oficiální web ČZU ani použití jejího loga. Měření, struktura souborů a export JSON/CSV jsou zachovány.


Aktualizace v3: světlý minimalistický vzhled, bez horní lišty, opravená třetí karta a sjednocené číslování.
