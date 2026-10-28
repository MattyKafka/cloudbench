# CloudBench

CloudBench je jednoduchý web vytvořený pro seminární práci zaměřenou na porovnání cloudových platforem. Stejný web je nasazený na třech hostingových službách a umožňuje porovnat rychlost přenosu souborů do prohlížeče.

## Nasazené weby

- **AWS Amplify Hosting:** https://main.d1v6jb8u3ehi6r.amplifyapp.com/
- **Microsoft Azure Blob Storage:** https://cloudbench.z36.web.core.windows.net/
- **Firebase Hosting:** https://cloudbench-46114.web.app/

## Co web obsahuje

- **Základní HTML stránku** – sledování časů načítání jednoduchého dokumentu.
- **Načítání obrázků** – stránku se šesti obrázky uloženými přímo na hostingu.
- **Interaktivní stránku** – práci s ukázkovými daty, filtrováním a grafem.
- **Přenosový test** – měření doby stažení souborů o velikosti 128, 512 a 1 024 KiB.
- **Porovnání výsledků** – export do JSON a CSV a načtení uložených výsledků.

Web používá HTML, CSS a JavaScript bez dalších knihoven. Data v interaktivním grafu jsou pouze ukázková a nepředstavují výsledky měření.

## Jak provést měření

1. Otevřete web na vybrané platformě.
2. Na hlavní stránce přejděte k přenosovému testu.
3. Vyberte velikosti souborů a počet opakování.
4. Spusťte měření a uložte výsledky.
5. Stejný postup zopakujte na ostatních platformách.

Pro srovnání použijte stejný počítač, prohlížeč a připojení. Měření provádějte v podobnou dobu.

Před měřením proběhne pro každou velikost jeden zahřívací přenos, který se do výsledků nezapočítává. Web následně zobrazuje medián, nejnižší a nejvyšší naměřený čas. Exportované soubory JSON lze načíst zpět do přehledu a porovnat.

## Spuštění na počítači

Pro místní spuštění stačí Python 3. Ve složce projektu spusťte:

```bash
python -m http.server 8000
```

Poté otevřete adresu http://localhost:8000.

## Sestavení a nasazení

Příkaz pro přípravu souborů k nasazení:

```bash
python scripts/build.py
```

Výsledný web se vytvoří ve složce `dist/`.

Projekt využívá propojení s GitHubem a automatické nasazování. Veřejné adresy jednotlivých webů jsou uložené v souboru `data/platforms.json`.

## Hlavní soubory

- `index.html` – hlavní stránka a přenosový test.
- `styles.css` – vzhled webu.
- `app.js` – ovládání, měření a porovnání výsledků.
- `tests/` – tři testovací stránky.
- `assets/` – obrázky a soubory pro přenosový test.
- `data/` – nastavení platforem a ukázková data.
- `scripts/build.py` – příprava webu k nasazení.

## Jak výsledky chápat

Test měří dobu přenosu dat z pohledu prohlížeče. Výsledky ovlivňuje také síťové připojení, poloha uživatele, mezipaměť a způsob doručování obsahu.

Naměřené časy proto nejsou samostatným měřením výkonu serverů ani obecným žebříčkem kvality cloudových platforem. Zpracování dat na interaktivní stránce probíhá přímo v prohlížeči.

Výsledky se při porovnávání zpracovávají místně a neodesílají se do externí služby.
