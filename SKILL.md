---
name: quaderno-esperimenti
description: "Dato un solo argomento, costruisce un quaderno interattivo di esperimenti: una pagina singola con esperimenti reali e canvas 2D animati, controlli, readout e chip. Use when: quaderno interattivo di esperimenti, notebook di esperimenti su [argomento], esperimenti interattivi, laboratorio di fisica, esperimenti per argomento."
---

# Quaderno interattivo di esperimenti

**Input**: un solo argomento (es. "la luce", "le maree", "il suono", "l'elettricità", "il calore").
**Output**: una pagina singola `index.html` + `notebook.js` + `styles.css`, in italiano, con 5–8 esperimenti numerati, ciascuno un simulatore canvas 2D che reagisce a controlli reali.

Filosofia del quaderno: **"Nessuna opinione: solo esperimenti."** Ogni esperimento deve essere reale, datato e misurabile. Se un dato non è storicamente fondato, non inventarlo.

---

## Contratto di output

1. Una sola cartella/pagina. Se l'argomento richiede più pagine, ogni pagina è un quaderno autonomo con la stessa struttura.
2. File generati: `index.html`, `styles.css`, `notebook.js`.
3. Lingua italiana ovunque (copia, readout, chip, numeri: `1,5` non `1.5`, `2,5 × 10⁻¹⁵`, `43″/secolo`).
4. Struttura della pagina: navbar → hero → N sezioni `<section class="experiment">` → closing → footer.
5. Ogni esperimento ha: **canvas animato**, **chip** dinamico, **≥2 readout** aggiornati, **controlli** (slider/bottoni) e **aside** esplicativo.
6. Se nel progetto esiste già `styles.css`, **riusalo** (o confrontalo con quello qui sotto). Altrimenti copia il CSS condensato inline.

---

## Sistema visivo

Variabili `:root` (non cambiarle):

```
--bg:#0b0e15 · --bg2:#10141d · --panel:#141a25 · --panel2:#0e121b
--ink:#ece4d0 · --ink-soft:#c9c2ae · --muted:#8d95a3 · --faint:#5b6472
--accent:#f0b45a · --accent-soft:#f7d49a · --teal:#7fd0c6 · --teal-dim:#3f6f6b
--line:rgba(236,228,208,.11) · --line-strong:rgba(236,228,208,.22)
--radius:18px
font display:Fraunces · body:Spectral · mono:IBM Plex Mono
```

Classi da usare (mai inventarne di nuove; se manca qualcosa, estendi il CSS qui sotto):

| Blocco | Classi |
|---|---|
| Pagina | `.shell`, `.grain`, `#starfield`, `.navbar`, `.navbar-brand`, `.navbar-links`, `.navbar-link` |
| Hero | `.hero`, `.hero--page`, `.eyebrow`, `.hero-title`, `.hero-sub`, `.hero-actions`, `.hero-note` |
| Sezione | `.experiment`, `.experiment--dark`, `.section-head`, `.lede`, `.experiment-block`, `.block-head` |
| Lab | `.lab-grid`, `.lab-canvas-wrap`, `.lab-canvas`, `.lab-canvas--wide`, `.lab-overlay`, `.lab-overlay--bottom`, `.chip`, `.lab-panel` |
| Pannello | `.readout`, `.readout-row`, `.readout-key`, `.readout-val`, `.sliders`, `.slider`, `.slider-label`, `.slider-scale` |
| Controlli | `.controls`, `.controls--wrap`, `.btn`, `.btn-primary`, `.btn-ghost`, `.is-active` |
| Testo | `.aside`, `.closing`, `.cards`, `.card`, `.card-num`, `.deepdive`, `.press`, `.timeline` |
| Animat. | `.reveal` (con `.in` via IntersectionObserver) |

---

## CSS condensato

Copia questo blocco in `styles.css` se non ne esiste uno equivalente.

```css
:root {
  --bg: #0b0e15; --bg2: #10141d; --panel: #141a25; --panel2: #0e121b;
  --ink: #ece4d0; --ink-soft: #c9c2ae; --muted: #8d95a3; --faint: #5b6472;
  --accent: #f0b45a; --accent-soft: #f7d49a; --teal: #7fd0c6; --teal-dim: #3f6f6b;
  --line: rgba(236,228,208,.11); --line-strong: rgba(236,228,208,.22);
  --radius: 18px;
  --font-display: "Fraunces", Georgia, serif;
  --font-body: "Spectral", Georgia, serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { background: var(--bg); color: var(--ink); font-family: var(--font-body);
  line-height: 1.65; overflow-x: clip; -webkit-font-smoothing: antialiased; }
::selection { background: var(--accent); color: #1a1206; }
#starfield { position: fixed; inset: 0; width: 100%; height: 100%; z-index: -2; }
.grain { position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: .05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E"); }
[id] { scroll-margin-top: 84px; }

/* Navbar */
.navbar { position: sticky; top: 0; z-index: 60; display: flex; align-items: center;
  justify-content: space-between; gap: 16px; padding: 14px 28px;
  background: rgba(11,14,21,.78); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line); }
.navbar-brand { font-family: var(--font-display); font-weight: 700; font-size: 20px;
  color: var(--accent); text-decoration: none; line-height: 1; }
.navbar-links { display: flex; align-items: center; gap: 8px; }
.navbar-link { font-family: var(--font-mono); font-size: 12px; letter-spacing: .12em;
  text-transform: uppercase; color: var(--ink-soft); text-decoration: none; padding: 8px 14px;
  border-radius: 999px; border: 1px solid transparent; transition: color .2s, border-color .2s, background .2s; }
.navbar-link:hover { color: var(--accent-soft); border-color: var(--line-strong);
  background: rgba(236,228,208,.04); }
.shell { max-width: 1020px; margin: 0 auto; padding: 0 28px; }

/* Hero */
.hero { min-height: 100vh; display: flex; flex-direction: column; justify-content: center;
  padding: 120px 0 80px; position: relative; overflow: clip; }
.hero--page { min-height: auto; padding: 96px 0 64px; }
.hero::before { content: "G"; /* sostituisci con l'iniziale del tuo argomento */ position: absolute; top: -6%; right: -4%;
  font-family: var(--font-display); font-weight: 900; font-size: 42vw; line-height: 1;
  color: rgba(236,228,208,.035); pointer-events: none; user-select: none; }
.eyebrow { font-family: var(--font-mono); font-size: 12px; letter-spacing: .22em;
  text-transform: uppercase; color: var(--teal); margin-bottom: 22px; }
.hero-title { font-family: var(--font-display); font-weight: 350;
  font-size: clamp(44px, 8.5vw, 92px); line-height: 1.02; letter-spacing: -.015em; margin-bottom: 34px; }
.hero-title em { font-weight: 400; font-style: italic; color: var(--accent-soft); }
.hero-sub { max-width: 640px; font-size: clamp(17px, 2.2vw, 20px); color: var(--ink-soft); margin-bottom: 38px; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 46px; }
.hero-note { font-family: var(--font-mono); font-size: 13px; color: var(--muted);
  border-left: 2px solid var(--accent); padding-left: 16px; line-height: 1.8; }

/* Bottoni */
.btn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-mono);
  font-size: 13px; letter-spacing: .06em; text-transform: uppercase; padding: 13px 22px;
  border-radius: 999px; cursor: pointer; text-decoration: none; border: 1px solid var(--line-strong);
  background: transparent; color: var(--ink);
  transition: background .2s, color .2s, border-color .2s, transform .15s; }
.btn:hover { transform: translateY(-2px); }
.btn-primary { background: var(--accent); border-color: var(--accent); color: #1a1206; font-weight: 600; }
.btn-primary:hover { background: var(--accent-soft); border-color: var(--accent-soft); }
.btn-ghost:hover { border-color: var(--accent); color: var(--accent-soft); }
.btn.is-active { background: var(--teal); border-color: var(--teal); color: #07110f; font-weight: 600; }

/* Sezioni */
.experiment { padding: 130px 0 20px; border-top: 1px solid var(--line); }
.experiment--dark { background: linear-gradient(180deg, rgba(240,180,90,.05), transparent 55%);
  border-radius: var(--radius); padding-bottom: 90px; margin-top: 40px; }
.section-head { max-width: 720px; margin-bottom: 52px; }
.section-head h2 { font-family: var(--font-display); font-weight: 380;
  font-size: clamp(34px, 5.4vw, 54px); line-height: 1.08; letter-spacing: -.01em; margin-bottom: 22px; }
.lede { color: var(--ink-soft); font-size: 17px; max-width: 600px; }
.experiment-block { padding: 40px 0; }
.experiment-block + .experiment-block { border-top: 1px solid var(--line); margin-top: 46px; }
.block-head { max-width: 680px; margin-bottom: 30px; }
.block-head h3 { font-family: var(--font-display); font-weight: 450;
  font-size: clamp(24px, 3.4vw, 34px); line-height: 1.15; margin-bottom: 14px; }
.block-head .lede { font-size: 15px; color: var(--ink-soft); }
.block-head .lede strong { color: var(--accent-soft); font-weight: 500; }

/* Lab layout */
.lab-grid { display: grid; grid-template-columns: minmax(0,1.35fr) minmax(0,1fr); gap: 32px; align-items: stretch; }
.lab-canvas-wrap, .lab-panel { min-width: 0; }
.lab-canvas-wrap { position: relative; border: 1px solid var(--line); border-radius: var(--radius);
  overflow: hidden;
  background: radial-gradient(120% 90% at 80% 10%, rgba(127,208,198,.06), transparent 60%),
              radial-gradient(120% 120% at 10% 100%, rgba(240,180,90,.06), transparent 55%), var(--panel2);
  box-shadow: 0 30px 60px -30px rgba(0,0,0,.7); }
.lab-canvas { display: block; width: 100%; height: 100%; min-height: 340px; }
.lab-canvas--wide { min-height: 400px; }
.lab-overlay { position: absolute; top: 14px; left: 14px; display: flex; gap: 8px; flex-wrap: wrap; }
.lab-overlay--bottom { top: auto; bottom: 14px; }
.chip { font-family: var(--font-mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase;
  color: var(--ink); background: rgba(11,14,21,.72); border: 1px solid var(--line);
  padding: 6px 12px; border-radius: 999px; backdrop-filter: blur(6px); }

/* Pannello */
.lab-panel { display: flex; flex-direction: column; gap: 26px; background: var(--panel);
  border: 1px solid var(--line); border-radius: var(--radius); padding: 26px; }
.readout { border: 1px solid var(--line); border-radius: 12px; padding: 6px 18px; background: var(--panel2); }
.readout-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
  padding: 11px 0; border-bottom: 1px dashed var(--line); min-width: 0; }
.readout-row:last-child { border-bottom: none; }
.readout-key { font-family: var(--font-mono); font-size: 12px; color: var(--muted);
  text-transform: uppercase; letter-spacing: .08em; }
.readout-val { font-family: var(--font-mono); font-size: 15px; color: var(--accent-soft);
  font-variant-numeric: tabular-nums; text-align: right; min-width: 0; }

/* Slider */
.sliders { display: flex; flex-direction: column; gap: 20px; }
.slider { display: flex; flex-direction: column; gap: 9px; }
.slider-label { font-family: var(--font-mono); font-size: 12px; color: var(--muted);
  text-transform: uppercase; letter-spacing: .1em; }
.slider input[type="range"] { -webkit-appearance: none; appearance: none; width: 100%; height: 4px;
  border-radius: 2px; background: linear-gradient(90deg, var(--teal-dim), var(--teal) 55%, var(--accent)); outline: none; cursor: pointer; }
.slider input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px;
  border-radius: 50%; background: var(--ink); border: 3px solid var(--accent); box-shadow: 0 2px 8px rgba(0,0,0,.5); cursor: grab; }
.slider input[type="range"]::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%;
  background: var(--ink); border: 3px solid var(--accent); cursor: grab; }
.slider-scale { display: flex; justify-content: space-between; font-family: var(--font-mono);
  font-size: 10px; color: var(--faint); text-transform: uppercase; letter-spacing: .1em; }
.controls { display: flex; flex-wrap: wrap; gap: 10px; }
.controls--wrap .btn { padding: 11px 16px; font-size: 12px; }
.aside { font-size: 14.5px; color: var(--muted); border-left: 2px solid var(--teal-dim); padding-left: 14px; }

/* Card / chiusura / footer */
.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.cards--three { grid-template-columns: repeat(3, 1fr); margin-top: 64px; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius);
  padding: 26px 22px 24px; display: flex; flex-direction: column; gap: 10px; position: relative;
  transition: transform .25s, border-color .25s, background .25s; }
.card:hover { transform: translateY(-6px); border-color: var(--line-strong); background: var(--bg2); }
.card-num { font-family: var(--font-display); font-weight: 900; font-size: 34px; line-height: 1; color: var(--accent); }
.card h3 { font-family: var(--font-display); font-weight: 500; font-size: 21px; }
.card p { font-size: 14.5px; color: var(--ink-soft); }
.card p strong { color: var(--accent-soft); font-weight: 500; }
.cards--dark .card { background: rgba(16,20,29,.6); }
.cards--dark .card-num { color: var(--teal); }
.closing { margin-top: 60px; text-align: center; font-family: var(--font-display); font-style: italic;
  font-size: clamp(24px, 4vw, 38px); color: var(--accent-soft); line-height: 1.35; }
.footer { padding: 90px 0 60px; border-top: 1px solid var(--line); margin-top: 100px; text-align: center; }
.footer p:last-child { font-size: 14px; color: var(--muted); font-family: var(--font-mono); letter-spacing: .1em; }

/* Reveal */
.reveal { opacity: 0; transform: translateY(26px); transition: opacity .7s, transform .7s; }
.reveal.in { opacity: 1; transform: translateY(0); }
@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* Extra: approfondimenti e citazioni */
.deepdive { margin-top: 56px; display: grid; gap: 14px; }
.deepdive details { border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); overflow: hidden; }
.deepdive details[open] { border-color: var(--line-strong); background: var(--bg2); }
.deepdive summary { cursor: pointer; padding: 18px 22px; font-family: var(--font-display);
  font-weight: 500; font-size: 17px; color: var(--ink); display: flex; justify-content: space-between;
  align-items: center; gap: 16px; list-style: none; }
.deepdive summary::-webkit-details-marker { display: none; }
.deepdive summary::after { content: "+"; font-family: var(--font-mono); font-size: 20px;
  color: var(--accent); transition: transform .25s; }
.deepdive details[open] summary::after { transform: rotate(45deg); }
.deepdive details p { padding: 0 22px 22px; font-size: 15px; color: var(--ink-soft);
  border-top: 1px solid var(--line); padding-top: 18px; }
.deepdive details p em { color: var(--accent-soft); }
.press { margin-top: 64px; border: 1px solid var(--line-strong); border-left: 3px solid var(--teal);
  border-radius: var(--radius); background: var(--panel); padding: 26px 28px; }
.press-quote { font-family: var(--font-display); font-style: italic; font-weight: 500;
  font-size: clamp(19px, 2.6vw, 25px); line-height: 1.4; color: var(--ink); }
.press-byline { margin-top: 12px; font-family: var(--font-mono); font-size: 12px;
  letter-spacing: .08em; text-transform: uppercase; color: var(--teal); }
.split { display: flex; gap: 16px; min-width: 0; }
.lab-canvas-wrap--half { flex: 1; }
.mini-chart { display: block; width: 100%; height: 96px; border: 1px solid var(--line);
  border-radius: 12px; background: var(--panel2); }

/* Responsive */
@media (max-width: 900px) {
  .lab-grid { grid-template-columns: minmax(0, 1fr); }
  .cards, .cards--three { grid-template-columns: repeat(2, 1fr); }
  .lab-canvas--wide { min-height: 340px; }
  .split { flex-direction: column; }
}
@media (max-width: 560px) {
  .cards, .cards--three { grid-template-columns: 1fr; }
  .hero { padding-top: 90px; }
  .hero--page { padding: 84px 0 48px; }
  .controls--wrap .btn { flex: 1 1 auto; }
  .navbar { padding: 12px 20px; }
  .navbar-link { font-size: 11px; padding: 8px 11px; letter-spacing: .08em; }
}
```

Se vuoi una griglia di card più specifiche (`cards--myth`, `timeline`, `quiz`), copiali dallo `styles.css` del progetto di riferimento.

---

## Skeleton HTML (`index.html`)

```html
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{Argomento} · Quaderno di esperimenti</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='7' fill='%23f0b45a'/%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='%237fd0c6' stroke-opacity='0.4' stroke-width='1.5'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Spectral:ital,wght@0,300;0,400;0,500;1,400;1,500&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css">
</head>
<body>

<div class="grain" aria-hidden="true"></div>
<canvas id="starfield" aria-hidden="true"></canvas>

<nav class="navbar" aria-label="Navigazione principale">
  <a class="navbar-brand" href="#top">{simbolo}</a>
  <div class="navbar-links">
    <a class="navbar-link" href="#top">{Argomento}</a>
  </div>
</nav>

<div class="shell">

  <header class="hero" id="top">
    <p class="eyebrow">Un quaderno di esperimenti · est. {anno}</p>
    <h1 class="hero-title">
      {Titolo forte}.<br>
      <em>Ma come facciamo<br>a saperlo?</em>
    </h1>
    <p class="hero-sub">
      Una "teoria" non è un'opinione: è il livello più alto di solidità che la scienza conosca.
      Qui sotto trovi gli esperimenti concreti, riproducibili, dietro {argomento}.
      Nessun dogma: solo fatti da toccare.
    </p>
    <div class="hero-actions">
      <a href="#esperimento-01" class="btn btn-primary">Gli esperimenti</a>
    </div>
  </header>

  <main>
    <!-- N sezioni esperimento -->
  </main>

  <p class="closing reveal">
    Non c'è bisogno di crederci:<br>
    c'è bisogno di misurare.
  </p>

  <footer class="footer">
    <p class="eyebrow">Fatto con curiosità</p>
    <p>Nessuna opinione: solo esperimenti.</p>
  </footer>

</div>

<script src="notebook.js"></script>
</body>
</html>
```

---

## Markup di un esperimento

Ogni esperimento è una `<section class="experiment" id="esperimento-NN">`. Un esperimento semplice = `section-head` + una `lab-grid`. Esperimenti composti = più `.experiment-block` (ciascuno una `lab-grid`).

```html
<section id="esperimento-01" class="experiment">
  <div class="section-head reveal">
    <p class="eyebrow">Esperimento 01 · {sottotitolo}</p>
    <h2>{Titolo grande}</h2>
    <p class="lede">
      {1-2 frasi: contesto storico, anno, perché è importante.}
    </p>
  </div>

  <div class="lab-grid reveal">
    <figure class="lab-canvas-wrap">
      <canvas id="canvas-{nome}" class="lab-canvas lab-canvas--wide"></canvas>
      <div class="lab-overlay lab-overlay--bottom">
        <span class="chip" id="{nome}-chip">{stato iniziale}</span>
      </div>
    </figure>

    <div class="lab-panel">
      <div class="readout">
        <div class="readout-row">
          <span class="readout-key">{grandezza 1}</span>
          <span class="readout-val" id="{nome}-{m1}">—</span>
        </div>
        <div class="readout-row">
          <span class="readout-key">{grandezza 2}</span>
          <span class="readout-val" id="{nome}-{m2}">—</span>
        </div>
      </div>

      <div class="sliders">
        <label class="slider">
          <span class="slider-label">{parametro}</span>
          <input type="range" id="{nome}-slider" min="0" max="100" step="1" value="50">
          <span class="slider-scale"><i>{min}</i><i>{max}</i></span>
        </label>
      </div>

      <div class="controls">
        <button id="{nome}-go" class="btn btn-primary" type="button">{Azione}</button>
        <button id="{nome}-reset" class="btn btn-ghost" type="button">Ricomincia</button>
      </div>

      <p class="aside">
        {2-3 frasi che spiegano cosa si vede e perché funziona così.}
      </p>
    </div>
  </div>
</section>
```

Regole del markup:
- `id` coerenti: canvas `canvas-{nome}`, readout `{nome}-{misura}`, chip `{nome}-chip`, bottoni `{nome}-go`/`{nome}-reset`, slider `{nome}-slider`.
- Quando ci sono toggle (es. due ipotesi in competizione): due bottoni `.btn` con `.is-active` su quello attivo, come `data-*` o id separati.
- Numeri iniziali realistici e in italiano nel readout HTML.

---

## Pattern JS (`notebook.js`)

Copiare questo scheletro; ogni esperimento è una IIFE `{ update, draw }` registrata nel `loop()`. **Non** includere mai script che referenziano canvas assenti (ogni sim fa `trackVisibility(canvas)` e usa `if (!isVisible()) return;`).

```js
(() => {
  "use strict";

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function sizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: rect.width, h: rect.height };
  }

  function trackVisibility(canvas) {
    return () => {
      const r = canvas.getBoundingClientRect();
      return r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight);
    };
  }

  /* ---------- Starfield ---------- */
  const starfield = (() => {
    const canvas = document.getElementById("starfield");
    const ctx = canvas.getContext("2d");
    let stars = [];
    function rebuild() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = [];
      const count = Math.round((canvas.width * canvas.height) / 6000);
      for (let i = 0; i < count; i++) {
        stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height,
          r: Math.random() * 1.3 + 0.2, phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.02 + 0.005, hue: Math.random() > 0.85 ? "accent" : "plain" });
      }
    }
    function draw(now) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(now * s.speed + s.phase));
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.hue === "accent" ? "#f0b45a" : "#d9d6c8";
        if (s.hue === "accent") { ctx.shadowColor = "#f0b45a"; ctx.shadowBlur = 6; }
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }
    window.addEventListener("resize", rebuild);
    rebuild();
    return { draw };
  })();

  /* ---------- Reveal ---------- */
  function initReveal() {
    const observer = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add("in"); observer.unobserve(e.target); }
      }
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    const heroChildren = Array.from(document.querySelectorAll(".hero > *"));
    heroChildren.forEach((el, i) => { el.classList.add("reveal"); el.style.transitionDelay = `${0.09 * i + 0.05}s`; });
    requestAnimationFrame(() => heroChildren.forEach(el => el.classList.add("in")));
  }

  /* ---------- Esperimento 01 · Esempio (pendolo) ---------- */
  const pendoloSim = (() => {
    const canvas = document.getElementById("canvas-pendolo");
    const chipEl = document.getElementById("pendolo-chip");
    const periodEl = document.getElementById("pendolo-periodo");
    const angleEl = document.getElementById("pendolo-angolo");
    const lengthSlider = document.getElementById("pendolo-slider");
    const goBtn = document.getElementById("pendolo-go");
    const resetBtn = document.getElementById("pendolo-reset");
    const isVisible = trackVisibility(canvas);

    const g = 9.81;
    let running = false;
    let theta = 0.6;          // ampiezza iniziale (rad)
    let omega = 0;

    goBtn.addEventListener("click", () => { running = true; });
    resetBtn.addEventListener("click", () => { running = false; theta = 0.6; omega = 0; });

    function update(dt) {
      if (!isVisible()) return;
      if (running) {
        const L = +lengthSlider.value;      // metri
        const alpha = -(g / L) * Math.sin(theta);
        omega += alpha * dt;
        omega *= 1 - 0.01 * dt;             // piccolo smorzamento
        theta += omega * dt;
      }
      const L = +lengthSlider.value;
      const T = 2 * Math.PI * Math.sqrt(L / g);
      periodEl.textContent = `${T.toFixed(2).replace(".", ",")} s`;
      angleEl.textContent = `${(theta * 180 / Math.PI).toFixed(1).replace(".", ",")}°`;
      chipEl.textContent = running ? "oscilla" : "a riposo";
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      // sfondo
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      // perno e filo
      const px = w * 0.5, py = h * 0.14;
      const L = Math.min(h * 0.55, (+lengthSlider.value) * 14);
      const bx = px + Math.sin(theta) * L;
      const by = py + Math.cos(theta) * L;
      ctx.strokeStyle = "rgba(232,226,210,0.7)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
      // massa
      ctx.beginPath(); ctx.arc(bx, by, 12, 0, Math.PI * 2);
      ctx.fillStyle = "#f0b45a"; ctx.fill();
    }

    return { update, draw };
  })();

  /* ---------- Loop ---------- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    starfield.draw(now / 1000);
    pendoloSim.update(dt);
    pendoloSim.draw();
    // ...tutti gli altri sim
    requestAnimationFrame(loop);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    requestAnimationFrame(loop);
  });
})();
```

Regole del pattern JS:
- **Ogni sim**: `const isVisible = trackVisibility(canvas);` e primo check in `update`/`draw`. Se il canvas non è visibile, non disegnare (risparmio CPU).
- **Stato in variabili locali alla IIFE**, mai DOM per lo stato di animazione.
- **Readout e chip aggiornati in `draw`** (o in `update` quando cambiano).
- **Bottoni toggle**: aggiorna `classList.toggle("is-active", active)` e il testo del bottone.
- **Slider**: `addEventListener("input", ...)` o leggi `+slider.value` in `draw`.
- `dt` è già in secondi e clampato a 0.05.
- Usa coordinate logiche `w/h` (sizeCanvas restituisce già CSS pixel con transform dpr).
- Numeri in italiano: `.toFixed(2).replace(".", ",")`; potenze come `2,5 × 10⁻¹⁵`; suffissi `″`, `µs`, `′`.

---

## Barra di qualità dei contenuti

1. **Esperimenti reali**: nome, anno, luogo, autori, ordine di grandezza corretto. Niente fisica inventata. Se non sei sicuro di un dato, usa un altro esperimento.
2. Ogni esperimento deve: reagire ai controlli, aggiornare ≥2 readout, avere un chip dinamico e un aside che spiega il "perché".
3. Tono: divulgativo, asciutto, senza opinioni. Le conclusioni sono dei dati.
4. Dove serve, esagera la visualizzazione (precessioni, deflessioni, ritardi) ma **nel readout mostra i valori reali** e segnala l'esagerazione nell'aside ("esagerato per vederlo").
5. Numeri in formato italiano e in notazione appropriata.
6. Accessibilità: ogni canvas ha un `aria-hidden` o un'etichetta significativa; i bottoni hanno testo esplicito.

---

## Checklist di verifica (obbligatoria prima di dichiarare completato)

1. `node --check notebook.js` → nessun errore di sintassi.
2. Apri la pagina in un server locale e verifica headless:
   - console: "Total messages: 0 (Errors: 0, Warnings: 0)"
   - overflow 0 a 375 / 560 / 900 / 1280 px (`document.documentElement.scrollWidth - innerWidth === 0`)
   - ogni canvas renderizza (pixel check via `getImageData` non tutto-nero/trasparente)
   - per ogni esperimento: toggle e slider aggiornano readout e chip
3. Verifica che non ci siano errori al resize e allo scroll (reveal + canvas).
4. Controlla che la pagina sia leggibile su mobile (niente overflow orizzontale).

Comandi utili (ambiente opencode + Playwright CLI):

```
node --check notebook.js
npx playwright cli goto http://localhost:8321/index.html
npx playwright cli resize 375 900          # poi 560 / 900 / 1280
npx playwright cli --raw eval "<JS>"
npx playwright cli console
```

---

## Esempio di riferimento

Il quaderno "Gravità" in questo stesso repository (`index.html` + `app.js` + `styles.css`, e la seconda pagina `terrapiatta.html` + `terrapiatta.js`) è il caso d'uso completo di questo pattern: esperimenti numerati con sim canvas (piano inclinato, caduta libera, orbite, GPS, maree, onde gravitazionali…), pannelli readout/slider/button/chip, timeline, card, quiz e deepdive. Segui lo stesso ritmo: tanti piccoli laboratori, ognuno con una sola idea chiara da "toccare".
