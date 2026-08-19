# Piano di continuazione — Quaderno di esperimenti (Gravità)

## Stato attuale
- **Skill**: `SKILL.md` (quaderno-esperimenti) creata e validata.
- **Luna**: `luna.html` + `luna.js` completati, verificati, deployati (c928559).
- **Scie**: `scie.html` + `scie.js` completati, verificati, deployati (244e55b).
- **Clima**: `clima.html` + `clima.js` completati e verificati (nuovo argomento "Il clima sta cambiando?").
- **Navbar condivisa** su index/luna/terrapiatta/scie/clima aggiornata con link a tutte le pagine.
- **Produzione**: https://gravita180826.vercel.app/ — scie.html e luna.html = 200, link navbar presenti.

## Verifiche Clima (ultimo ciclo)
- `node --check clima.js` OK; console 0/0 su 5 pagine; overflow 0 a 375/560/900/1280 (fix: `flex-wrap` navbar in styles.css, +22px a 375 prima del fix).
- Pixel check: 6 canvas disegnano dopo scroll (keeling/tyndall/forzante/carote/temp/ghiacciai).
- Interazioni: keeling (1958→315,0 ppm / 0 anni; go 1985→2018→2026; reset 2026), tyndall (280→31%, 424→42%), forzante (560→+3,7 W/m²/+3,0 °C), carote (glaciale ~175 ppm), temp (1880→−0,16 °C), ghiacciai (1960→−1,9 m), quiz 6/6 con verdetto.
- Fix fatti: `reset()` nominata per tyndall/forzante/carote (ReferenceError a runtime), default `forzante-dt` +1,8 °C, testo "il più caldo finora".
- Nota: le readout si aggiornano nel loop `draw` leggendo `+slider.value` (pattern SKILL.md), non via listener `input`.

## Verifiche Scie già passate (244e55b)
- `node --check scie.js` OK; console 0/0 su 4 pagine; overflow 0 a 375/560/900/1280.
- Pixel check: 6 canvas disegnano dopo scroll (sa/pers/adsb/spray/modis/seed).
- Interazioni: sa (-25°C nessuna scia / -60°C+80% cirri / -60°C+10% breve), pers (~30 s / ~3 h / ~15 km), adsb (dati + prossimo aereo), spray (300 m vs 10.500 m), modis (0,00%→0,40%, scan), seed (0 g/km → ~10 g/km, +4%), quiz 6/6.

## Item aperti / da rifare al prossimo avvio
- [ ] Verifica stato iniziale modis su load fresco (`modis-chip`, `modis-cov`, slider=30) — ultima verifica interrotta dall'utente.
- [ ] (Opzionale) Screenshot visivo della pagina scie/clima per controllo design finale.
- [ ] Eventuali nuovi argomenti per il quaderno (riusare la skill, pattern scie/luna/clima).

## Comandi utili
- Server locale: `python3 -m http.server 8321`
- Verifica: `node --check <page>.js`
- Playwright: `npx playwright cli --browser=chromium open http://localhost:8321/<pagina>.html` poi `--raw eval "..."`
- Deploy: commit su main → push → Vercel auto-deploy.

## Info repository
- Remote: https://github.com/miscio333-afk/gravita.git (branch main)
- Utente: miscio333-afk
- File: index.html/app.js (Gravità), terrapiatta.html/terrapiatta.js, luna.html/luna.js, scie.html/scie.js, clima.html/clima.js, styles.css condiviso, SKILL.md.