# Piano di continuazione — Quaderno di esperimenti (Gravità)

## Stato attuale
- **Skill**: `SKILL.md` (quaderno-esperimenti) creata e validata.
- **Luna**: `luna.html` + `luna.js` completati, verificati, deployati (c928559).
- **Scie**: `scie.html` + `scie.js` completati, verificati, deployati (244e55b).
- **Clima**: `clima.html` + `clima.js` completati e verificati (97b11cb).
- **Aria**: `inquinamento.html` + `inquinamento.js` completati e verificati (abad30b).
- **Crop**: `cropcircles.html` + `cropcircles.js` completati e verificati (nuovo argomento "I cerchi nel grano").
- **Damanhur**: `damanhur.html` + `damanhur.js` completati e verificati (nuovo argomento "Energie invisibili: linee sincroniche e selfica").
- **Navbar condivisa** su index/luna/terrapiatta/scie/clima/aria/crop/damanhur aggiornata con link a tutte le pagine (9 voci).

## Verifiche Damanhur (ultimo ciclo)
- `node --check damanhur.js` OK; console 0 errori su 9 pagine; overflow 0 a 375/560/900/1280 (navbar a 9 voci regge a 375 col flex-wrap).
- Pixel check: 6 canvas disegnano dopo scroll (dowsing/selfica/linee/vega/prove/bilancio), con colori accent/teal presenti.
- Interazioni: dowsing (50 prove → hit 0-2, chip in corso), selfica (a contatto → 0,01 µT rumore, diff 0,000), linee (18 linee → 82 nodi doppi, 6 tripli), vega (24 mesi → diff +1 mmHg), prove (100 → 0/100 x3), bilancio (100 → zero 0, reale 1 · Tempio 8.500 m³), quiz 6/6 con verdetto.
- **Produzione**: https://gravita180826.vercel.app/ — scie.html e luna.html = 200, link navbar presenti.

## Verifiche Crop (ultimo ciclo)
- `node --check cropcircles.js` OK; console 0 errori su 8 pagine; overflow 0 a 375/560/900/1280 (navbar a 8 voci regge a 375 col flex-wrap).
- Pixel check: 6 canvas disegnano dopo scroll (tempo/corda/geometria/nodi/mappa/statistica), con colori accent/teal presenti (non solo sfondo).
- Interazioni: tempo (1991 → 120 cerchi, chip post-confessione; go 1991→1972; reset 1991), corda (10 m → 12 min), geometria (8 → 45°), nodi (4 → 95% piegati, 92°), mappa (2 km → 56%), statistica (100 → chip bilancio chiuso, zero 0), quiz 6/6 con verdetto.
- Nota: le readout si aggiornano nel loop `draw` leggendo `+slider.value` (pattern SKILL.md), non via listener `input`. Attenzione: l'input `dispatchEvent` non aggiorna le readout finché il canvas non è visibile (per design).

## Verifiche Scie già passate (244e55b)
- `node --check scie.js` OK; console 0/0 su 4 pagine; overflow 0 a 375/560/900/1280.
- Pixel check: 6 canvas disegnano dopo scroll (sa/pers/adsb/spray/modis/seed).
- Interazioni: sa (-25°C nessuna scia / -60°C+80% cirri / -60°C+10% breve), pers (~30 s / ~3 h / ~15 km), adsb (dati + prossimo aereo), spray (300 m vs 10.500 m), modis (0,00%→0,40%, scan), seed (0 g/km → ~10 g/km, +4%), quiz 6/6.

## Item aperti / da rifare al prossimo avvio
- [ ] (Opzionale) Screenshot visivo delle pagine per controllo design finale (il modello attuale non legge immagini).
- [ ] Eventuali nuovi argomenti per il quaderno (riusare la skill, pattern scie/luna/clima/aria).

## Comandi utili
- Server locale: `python3 -m http.server 8321`
- Verifica: `node --check <page>.js`
- Playwright: `npx playwright cli --browser=chromium open http://localhost:8321/<pagina>.html` poi `--raw eval "..."`
- Deploy: commit su main → push → Vercel auto-deploy.

## Info repository
- Remote: https://github.com/miscio333-afk/gravita.git (branch main)
- Utente: miscio333-afk
- File: index.html/app.js (Gravità), terrapiatta.html/terrapiatta.js, luna.html/luna.js, scie.html/scie.js, clima.html/clima.js, inquinamento.html/inquinamento.js, cropcircles.html/cropcircles.js, damanhur.html/damanhur.js, styles.css condiviso, SKILL.md.