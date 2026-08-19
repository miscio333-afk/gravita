# Piano di continuazione — Quaderno di esperimenti (Gravità)

## Stato attuale
- **Skill**: `SKILL.md` (quaderno-esperimenti) creata e validata.
- **Luna**: `luna.html` + `luna.js` completati, verificati, deployati (c928559).
- **Scie**: `scie.html` + `scie.js` completati, verificati, deployati (244e55b).
- **Clima**: `clima.html` + `clima.js` completati e verificati (97b11cb).
- **Aria**: `inquinamento.html` + `inquinamento.js` completati e verificati (nuovo argomento "L'aria è davvero pulita?").
- **Navbar condivisa** su index/luna/terrapiatta/scie/clima/aria aggiornata con link a tutte le pagine (6 voci).
- **Produzione**: https://gravita180826.vercel.app/ — scie.html e luna.html = 200, link navbar presenti.

## Verifiche Aria (ultimo ciclo)
- `node --check inquinamento.js` OK; console 0 errori su 6 pagine; overflow 0 a 375/560/900/1280.
- Pixel check: 6 canvas disegnano dopo scroll (pm25/pennacchio/ozono/inversione/pioggia/sorgenti), tutti con pixel non vuoti.
- Interazioni: pm25 (ora 8 → 32 µg/m³, sopra il limite WHO; go 8→5→reset 6), pennacchio (vento 2 → 28 µg/m³ a 420 m), ozono (14 h → 149 µg/m³, NO₂ 18, sole 866 W/m², "smog estivo in corso"), inversione (6 → 51 µg/m³, 7 km, +4,0 °C, "cappa presente"), pioggia (65 → pH 4,3, "pioggia acida"), sorgenti (inverno 34/26/12%, estate 15/32/22%), quiz 6/6 con verdetto.
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
- File: index.html/app.js (Gravità), terrapiatta.html/terrapiatta.js, luna.html/luna.js, scie.html/scie.js, clima.html/clima.js, inquinamento.html/inquinamento.js, styles.css condiviso, SKILL.md.