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

  /* ---------- Esperimento 01 · Dowsing (radiestesia) ---------- */
  const dowsingSim = (() => {
    const canvas = document.getElementById("canvas-dowsing");
    const chipEl = document.getElementById("dowsing-chip");
    const hitEl = document.getElementById("dowsing-hit");
    const pctEl = document.getElementById("dowsing-pct");
    const chanceEl = document.getElementById("dowsing-chance");
    const slider = document.getElementById("dowsing-slider");
    const goBtn = document.getElementById("dowsing-go");
    const resetBtn = document.getElementById("dowsing-reset");
    const isVisible = trackVisibility(canvas);

    const TUBES = 20;
    let trial = 0;
    let hits = 0;
    let results = [];   // hit/false per prova
    let running = false;

    goBtn.addEventListener("click", () => { running = true; });
    resetBtn.addEventListener("click", () => { running = false; trial = 0; hits = 0; results = []; });

    function update(dt) {
      if (!isVisible()) return;
      if (running) {
        const total = +slider.value;
        if (trial < total) {
          const hit = Math.random() < (1 / TUBES);
          results.push(hit);
          if (hit) hits++;
          trial++;
          chipEl.textContent = running ? "test alla cieca in corso" : "pronto";
        } else {
          chipEl.textContent = "test concluso · livello del caso";
        }
      }
      const total = +slider.value;
      const pct = trial === 0 ? 0 : (hits / trial) * 100;
      const chance = (1 / TUBES) * 100;
      hitEl.textContent = trial === 0 ? "—" : `${hits} su ${trial}`;
      pctEl.textContent = trial === 0 ? "—" : `${pct.toFixed(0).replace(".", ",")} %`;
      chanceEl.textContent = `${chance.toFixed(0).replace(".", ",")} %`;
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const rows = 4, cols = 5;
      const padX = w * 0.12, padY = h * 0.18;
      const gw = w - padX * 2, gh = h - padY * 2;
      const stepX = gw / (cols - 1), stepY = gh / (rows - 1);
      const r = Math.min(stepX, stepY) * 0.16;

      // l'acqua è sotto un tubo fisso (posizione 9, in basso al centro)
      const waterIdx = 9;
      const waterPos = { col: waterIdx % cols, row: Math.floor(waterIdx / cols) };

      // tubi
      for (let i = 0; i < TUBES; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        const x = padX + col * stepX, y = padY + row * stepY;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = i === waterIdx ? "#3f6f6b" : "#141a25";
        ctx.fill();
        ctx.strokeStyle = i === waterIdx ? "rgba(127,208,198,.7)" : "rgba(236,228,208,.15)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // marcatore d'acqua (visibile solo dopo il test)
        if (i === waterIdx) {
          ctx.fillStyle = "rgba(127,208,198,.5)";
          ctx.font = "9px 'IBM Plex Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText("H₂O", x, y + 3);
        }
      }

      // risultati delle prove: x = mancata, ✓ = colpito
      const shown = Math.min(results.length, TUBES);
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      for (let i = 0; i < shown; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        const x = padX + col * stepX, y = padY + row * stepY;
        ctx.fillStyle = results[i] ? "#7fd0c6" : "rgba(236,228,208,.35)";
        ctx.fillText(results[i] ? "✓" : "✕", x, y - r - 8);
      }

      // didascalia
      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("20 tubi · 1 con acqua · il rabdomante non sa quale", w * 0.5, h - 10);
    }

    return { update, draw };
  })();

  /* ---------- Esperimento 02 · Selfica (sensore) ---------- */
  const selficaSim = (() => {
    const canvas = document.getElementById("canvas-selfica");
    const chipEl = document.getElementById("selfica-chip");
    const campoEl = document.getElementById("selfica-campo");
    const diffEl = document.getElementById("selfica-diff");
    const tempEl = document.getElementById("selfica-temp");
    const slider = document.getElementById("selfica-slider");
    const goBtn = document.getElementById("selfica-go");
    const resetBtn = document.getElementById("selfica-reset");
    const isVisible = trackVisibility(canvas);

    const noise = 0.01;   // µT rumore di fondo
    let contact = false;

    goBtn.addEventListener("click", () => { contact = true; });
    resetBtn.addEventListener("click", () => { contact = false; });

    function update(dt) {
      if (!isVisible()) return;
      const dist = +slider.value;
      const read = noise;                       // sempre rumore
      const diff = 0.000;                       // nessun delta
      campoEl.textContent = `${read.toFixed(2).replace(".", ",")} µT`;
      diffEl.textContent = `${diff.toFixed(3).replace(".", ",")} µT`;
      tempEl.textContent = "+0,0 °C";
      chipEl.textContent = contact ? "sensore a contatto · 0,00 µT" : "sensore a distanza";
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const cx = w * 0.42, cy = h * 0.5;
      const dist = +slider.value;

      // anelli "presunti" sfumati (disegnati ma vuoti)
      for (let i = 3; i >= 0; i--) {
        ctx.beginPath(); ctx.arc(cx, cy, (i + 1) * 26, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(240,180,90,${0.05 + i * 0.02})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // spirale selfica
      ctx.strokeStyle = "#f0b45a"; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 5; a += 0.1) {
        const rr = 3 + a * 1.4;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // sensore a destra, alla distanza scelta
      const sx = w * 0.78 + dist * 2.2;
      const sy = h * 0.5;
      ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#7fd0c6"; ctx.fill();
      ctx.strokeStyle = "rgba(236,228,208,.4)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sx, sy); ctx.stroke();

      // lettura vicino al sensore
      ctx.fillStyle = "rgba(127,208,198,.9)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("0,01 µT", sx, sy - 16);

      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.fillText("spirale selfica → sensore", w * 0.5, h - 10);
    }

    return { update, draw };
  })();

  /* ---------- Esperimento 03 · Linee sincroniche (nodi) ---------- */
  const lineeSim = (() => {
    const canvas = document.getElementById("canvas-linee");
    const chipEl = document.getElementById("linee-chip");
    const doppiEl = document.getElementById("linee-doppi");
    const tripliEl = document.getElementById("linee-tripli");
    const pctEl = document.getElementById("linee-pct");
    const slider = document.getElementById("linee-slider");
    const goBtn = document.getElementById("linee-go");
    const resetBtn = document.getElementById("linee-reset");
    const isVisible = trackVisibility(canvas);

    let nLines = 0;
    let lines = [];        // segmenti tracciati
    let nodes = [];        // punti d'incrocio {x,y}
    let triple = [];       // punti con 3+ linee
    let drawn = 0;

    goBtn.addEventListener("click", () => {
      const target = +slider.value;
      const { ctx, w, h } = sizeCanvas(canvas);
      // genera le linee quando si preme go
      if (nLines !== target) {
        nLines = target;
        lines = [];
        nodes = [];
        triple = [];
        drawn = 0;
        for (let i = 0; i < nLines; i++) {
          const vertical = i % 2 === 0;
          const a = Math.random() * h * 0.8 + h * 0.1;
          const b = Math.random() * h * 0.8 + h * 0.1;
          const c = Math.random() * w * 0.8 + w * 0.1;
          const d = Math.random() * w * 0.8 + w * 0.1;
          lines.push(vertical
            ? { x1: c, y1: 0, x2: c + (a - h / 2) * 0.4, y2: h }
            : { x1: 0, y1: b, x2: w, y2: d + (b - h / 2) * 0.4 });
        }
        // calcola incroci
        for (let i = 0; i < nLines; i++) {
          for (let j = i + 1; j < nLines; j++) {
            const p = segIntersect(lines[i], lines[j], w, h);
            if (p) {
              nodes.push(p);
              let added = false;
              for (const t of triple) {
                if (Math.hypot(t.x - p.x, t.y - p.y) < 6) { t.count++; added = true; break; }
              }
              if (!added) triple.push({ x: p.x, y: p.y, count: 2 });
            }
          }
        }
        triple = triple.filter(t => t.count >= 3);
      }
    });
    resetBtn.addEventListener("click", () => { nLines = 0; lines = []; nodes = []; triple = []; drawn = 0; });

    function segIntersect(a, b, w, h) {
      const dx1 = a.x2 - a.x1, dy1 = a.y2 - a.y1;
      const dx2 = b.x2 - b.x1, dy2 = b.y2 - b.y1;
      const denom = dx1 * dy2 - dy1 * dx2;
      if (Math.abs(denom) < 1e-9) return null;
      const t = ((b.x1 - a.x1) * dy2 - (b.y1 - a.y1) * dx2) / denom;
      const u = ((b.x1 - a.x1) * dy1 - (b.y1 - a.y1) * dx1) / denom;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return { x: a.x1 + t * dx1, y: a.y1 + t * dy1 };
      }
      return null;
    }

    function update(dt) {
      if (!isVisible()) return;
      const w0 = document.getElementById("canvas-linee").getBoundingClientRect().width;
      const h0 = document.getElementById("canvas-linee").getBoundingClientRect().height;
      const area = w0 * h0;
      // un punto scelto a caso sta su un nodo (entro raggio di tolleranza)
      const rTol = 0.03 * Math.min(w0, h0);
      const pRandom = { x: Math.random() * w0, y: Math.random() * h0 };
      const nearNode = nodes.some(p => Math.hypot(p.x - pRandom.x, p.y - pRandom.y) < rTol);
      doppiEl.textContent = nodes.length;
      tripliEl.textContent = triple.length;
      pctEl.textContent = nearNode ? "sì · sempre possibile" : "no · varia a ogni prova";
      chipEl.textContent = nLines > 0 ? `${nLines} linee · ${nodes.length} nodi` : "traccia le linee";
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // linee
      ctx.lineWidth = 1.2;
      for (const l of lines) {
        ctx.strokeStyle = "rgba(127,208,198,.5)";
        ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
      }

      // nodi doppi
      ctx.fillStyle = "rgba(240,180,90,.85)";
      for (const p of nodes) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
      }

      // nodi tripli (sottolineati)
      ctx.strokeStyle = "rgba(240,120,100,.9)";
      ctx.lineWidth = 2;
      for (const t of triple) {
        ctx.beginPath(); ctx.arc(t.x, t.y, 7, 0, Math.PI * 2); ctx.stroke();
      }

      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("9 linee verticali · 9 orizzontali · i nodi nascono da soli", w * 0.5, h - 10);
    }

    return { update, draw };
  })();

  /* ---------- Esperimento 04 · VEGA (cabina ringiovanimento) ---------- */
  const vegaSim = (() => {
    const canvas = document.getElementById("canvas-vega");
    const chipEl = document.getElementById("vega-chip");
    const paEl = document.getElementById("vega-pa");
    const pbEl = document.getElementById("vega-pb");
    const diffEl = document.getElementById("vega-diff");
    const slider = document.getElementById("vega-slider");
    const goBtn = document.getElementById("vega-go");
    const resetBtn = document.getElementById("vega-reset");
    const isVisible = trackVisibility(canvas);

    let measured = false;

    goBtn.addEventListener("click", () => { measured = true; });
    resetBtn.addEventListener("click", () => { measured = false; });

    function update(dt) {
      if (!isVisible()) return;
      const months = +slider.value;
      // entrambi i gruppi: leggera variazione fisiologica, nessun divario crescente
      const drift = Math.sin(months * 0.15) * 2;
      const pa = 121 + drift;
      const pb = 120 + Math.cos(months * 0.17) * 2;
      paEl.textContent = `${pa.toFixed(0).replace(".", ",")} mmHg`;
      pbEl.textContent = `${pb.toFixed(0).replace(".", ",")} mmHg`;
      const diff = pa - pb;
      diffEl.textContent = `${(diff >= 0 ? "+" : "") + diff.toFixed(0).replace(".", ",")} mmHg`;
      chipEl.textContent = measured ? "coorte misurata · nessun divario" : "in attesa di misura";
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const months = +slider.value;
      const gw = w - w * 0.2;
      const gh = h * 0.5;
      const ox = w * 0.1, oy = h * 0.62;
      const maxM = 60;

      // assi
      ctx.strokeStyle = "rgba(236,228,208,.25)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + gw, oy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy - gh); ctx.stroke();

      // due coorti (trattato vs placebo) sovrapposte: indistinguibili
      const curve = (offset, col) => {
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath();
        for (let m = 0; m <= Math.min(months, maxM); m++) {
          const x = ox + (m / maxM) * gw;
          const y = oy - (h * 0.1 + Math.sin(m * 0.3 + offset) * h * 0.06);
          if (m === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };
      curve(0, "#f0b45a");
      curve(2.1, "#7fd0c6");

      // legenda
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = "#f0b45a";
      ctx.fillText("trattato", w * 0.1, h * 0.12);
      ctx.fillStyle = "#7fd0c6";
      ctx.fillText("placebo", w * 0.1, h * 0.12 + 16);

      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.textAlign = "center";
      ctx.fillText("pressione arteriosa · trattato e placebo sovrapposti", w * 0.5, h - 10);
    }

    return { update, draw };
  })();

  /* ---------- Esperimento 05 · Prove (onere della prova) ---------- */
  const proveSim = (() => {
    const canvas = document.getElementById("canvas-prove");
    const chipEl = document.getElementById("prove-chip");
    const lineeEl = document.getElementById("prove-linee");
    const selficaEl = document.getElementById("prove-selfica");
    const cabineEl = document.getElementById("prove-cabine");
    const slider = document.getElementById("prove-slider");
    const goBtn = document.getElementById("prove-go");
    const resetBtn = document.getElementById("prove-reset");
    const isVisible = trackVisibility(canvas);

    let ran = false;

    goBtn.addEventListener("click", () => { ran = true; });
    resetBtn.addEventListener("click", () => { ran = false; });

    function update(dt) {
      if (!isVisible()) return;
      const n = +slider.value;
      // la barra della prova resta a 0 per tutte e tre
      lineeEl.textContent = "0 / 100";
      selficaEl.textContent = "0 / 100";
      cabineEl.textContent = "0 / 100";
      chipEl.textContent = ran ? `esaminate ${n} misure · prova trovata: 0` : "in attesa di misura";
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const n = +slider.value;
      const rows = [
        { label: "linee sincroniche", y: h * 0.2 },
        { label: "selfica", y: h * 0.42 },
        { label: "cabine di ringiovanimento", y: h * 0.64 }
      ];

      const barW = w * 0.6, bx = w * 0.18;
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left";
      for (const r of rows) {
        ctx.fillStyle = "rgba(236,228,208,.7)";
        ctx.fillText(r.label, w * 0.1, r.y - 12);
        // traccia di base
        ctx.fillStyle = "rgba(236,228,208,.08)";
        ctx.fillRect(bx, r.y, barW, 10);
        // prova: zero
        ctx.fillStyle = "#3f6f6b";
        ctx.fillRect(bx, r.y, Math.max(1, barW * 0.001), 10);
        ctx.fillStyle = "rgba(236,228,208,.35)";
        ctx.textAlign = "right";
        ctx.fillText("0 / 100", bx + barW, r.y + 9);
        ctx.textAlign = "left";
      }

      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.textAlign = "center";
      ctx.fillText("prova = misura riprodotta · il conto non si muove", w * 0.5, h - 10);
    }

    return { update, draw };
  })();

  /* ---------- Esperimento 06 · Bilancio ---------- */
  const bilancioSim = (() => {
    const canvas = document.getElementById("canvas-bilancio");
    const chipEl = document.getElementById("bilancio-chip");
    const revEl = document.getElementById("bilancio-rev");
    const zeroEl = document.getElementById("bilancio-zero");
    const realeEl = document.getElementById("bilancio-reale");
    const slider = document.getElementById("bilancio-slider");
    const goBtn = document.getElementById("bilancio-go");
    const resetBtn = document.getElementById("bilancio-reset");
    const isVisible = trackVisibility(canvas);

    let ran = false;

    goBtn.addEventListener("click", () => { ran = true; });
    resetBtn.addEventListener("click", () => { ran = false; });

    function update(dt) {
      if (!isVisible()) return;
      revEl.textContent = "3";
      zeroEl.textContent = "0";
      realeEl.textContent = "1 · il Tempio (8.500 m³)";
      chipEl.textContent = ran ? "bilancio chiuso · energia dimostrata: 0" : "conto in sospeso";
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const n = +slider.value;
      const cx = w * 0.5, cy = h * 0.52;
      const R = Math.min(w, h) * 0.32;

      // anello esterno: rivendicazioni (3)
      ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
      ctx.strokeStyle = "rgba(240,180,90,.7)"; ctx.lineWidth = 22;
      ctx.stroke();

      // segmento verde: Tempio reale (1/4 dell'anello)
      ctx.beginPath();
      ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 0.5);
      ctx.strokeStyle = "#7fd0c6"; ctx.lineWidth = 22;
      ctx.stroke();

      // contatore centrale
      ctx.fillStyle = "#ece4d0";
      ctx.font = "900 40px 'Fraunces', Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("0", cx, cy - 4);
      ctx.fillStyle = "rgba(236,228,208,.6)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("prove controllate", cx, cy + 22);

      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.fillText("rivendicazioni esaminate: " + n + " · dimostrate: 0 · il Tempio è reale, non energia", w * 0.5, h - 10);
    }

    return { update, draw };
  })();

  /* ---------- Quiz ---------- */

  const QUIZ = [
    {
      q: "Come vengono 'mappate' le linee sincroniche di Damanhur?",
      opts: ["Con la radiestesia, il viaggio astrale e la medianità", "Con satelliti e GPS", "Con misure fisiche pubblicate"],
      correct: 0,
      fb: "Le mappe delle linee sono state tracciate con metodi 'non convenzionali'. Quando la radiestesia viene testata alla cieca, il risultato è quello del caso."
    },
    {
      q: "Nel test di Vogt e Hyman (1959), i rabdomanti alla cieca…",
      opts: ["hanno indovinato l'acqua quanto il caso (~5%)", "hanno trovato l'acqua il 90% delle volte", "hanno rifiutato di farsi testare"],
      correct: 0,
      fb: "Con 20 tubi e 1 con acqua, il caso dà il 5%. I rabdomanti testati sono rimasti esattamente lì: nessuna capacità oltre il caso."
    },
    {
      q: "Cosa misura un sensore davanti a un oggetto 'selfico'?",
      opts: ["Solo il rumore di fondo della stanza", "Un campo elettrico intenso", "Una temperatura più alta di 20 °C"],
      correct: 0,
      fb: "Anche a contatto non c'è nulla: il campo resta quello di fondo e la temperatura non cambia. Un'energia che non muove un sensore non c'è."
    },
    {
      q: "Con 18 linee tracciate su un territorio, quanti nodi nascono per caso?",
      opts: ["Decine, con alcuni punti di tripla fusione", "Nessuno", "Uno solo, in un punto speciale"],
      correct: 0,
      fb: "Una griglia fitta produce incroci ovunque, anche tripli. La Sala delle Sfere 'nel punto di tre linee' è il risultato della griglia, non di una misura."
    },
    {
      q: "Cosa ha mostrato il confronto tra gruppo 'trattato' e placebo nelle cabine?",
      opts: ["Nessuna differenza misurabile nei biomarcatori", "Un ringiovanimento del 40%", "Un rallentamento dell'invecchiamento dopo 5 anni"],
      correct: 0,
      fb: "I due gruppi restano indistinguibili: la differenza è dentro la variabilità normale. Nel 2009 i NAS hanno trovato irregolarità nell'ambulatorio adepte."
    },
    {
      q: "Il Tempio dell'Umanità (8.500 m³, 72 m) dimostra…",
      opts: ["che un centinaio di persone può scavare a mano per 15 anni", "che le linee sincroniche esistono", "che l'energia selfica è reale"],
      correct: 0,
      fb: "Il Tempio è un'impresa di ingegneria e perseveranza, vera e misurabile — ma non è una misura di energia. Il record Guinness del 2001 conta metri cubi, non prove."
    }
  ];

  const VERDICTS = [
    { min: 6, text: "Perfetto: hai gli esperimenti di questo quaderno a memoria. Ottimo." },
    { min: 4, text: "Ottimo. Sai già distinguere una misura da un'opinione." },
    { min: 2, text: "Buona base. Rileggi gli esperimenti qui sopra e sei a posto." },
    { min: 0, text: "Il quaderno è ancora aperto: torna agli esperimenti, poi riprova." }
  ];

  function initQuiz() {
    const root = document.getElementById("quiz-root");
    let index = 0;
    let score = 0;
    let answered = false;

    function verdictFor(s) {
      return VERDICTS.find(v => s >= v.min).text;
    }

    function render() {
      root.innerHTML = "";
      if (index >= QUIZ.length) {
        renderDone();
        return;
      }
      answered = false;
      const item = QUIZ[index];
      const card = document.createElement("article");
      card.className = "quiz-card";
      card.style.animation = "fadeUp 0.4s ease both";

      const head = document.createElement("p");
      head.className = "eyebrow";
      head.textContent = `Domanda ${index + 1} / ${QUIZ.length} · punteggio ${score}`;
      card.appendChild(head);

      const q = document.createElement("h3");
      q.className = "quiz-q";
      const num = document.createElement("span");
      num.className = "qnum";
      num.textContent = String(index + 1).padStart(2, "0") + ".";
      q.appendChild(num);
      q.appendChild(document.createTextNode(item.q));
      card.appendChild(q);

      const opts = document.createElement("div");
      opts.className = "quiz-opts";
      const letters = ["A", "B", "C"];
      item.opts.forEach((optText, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quiz-opt";
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = letters[i];
        btn.appendChild(tag);
        btn.appendChild(document.createTextNode(" " + optText));
        btn.addEventListener("click", () => answer(i, btn, item, card));
        opts.appendChild(btn);
      });
      card.appendChild(opts);

      const fb = document.createElement("p");
      fb.className = "quiz-feedback";
      fb.textContent = item.fb;
      card.appendChild(fb);

      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "btn btn-primary quiz-next";
      nextBtn.style.display = "none";
      nextBtn.textContent = index === QUIZ.length - 1 ? "Vedi il verdetto" : "Prossima domanda";
      nextBtn.addEventListener("click", () => {
        index++;
        render();
      });
      card.appendChild(nextBtn);

      root.appendChild(card);
    }

    function answer(i, btn, item, card) {
      if (answered) return;
      answered = true;
      if (i === item.correct) score++;
      const head = card.querySelector(".eyebrow");
      head.textContent = `Domanda ${index + 1} / ${QUIZ.length} · punteggio ${score}`;
      const optionBtns = card.querySelectorAll(".quiz-opt");
      optionBtns.forEach(b => {
        if (b === btn) {
          b.classList.add(i === item.correct ? "correct" : "wrong");
        } else if (Array.from(optionBtns).indexOf(b) === item.correct) {
          b.classList.add("correct");
        }
      });
      card.querySelector(".quiz-feedback").classList.add("show");
      const nextBtn = card.querySelector(".quiz-next");
      nextBtn.style.display = "inline-flex";
    }

    function renderDone() {
      const wrap = document.createElement("div");
      wrap.className = "quiz-done";
      wrap.style.animation = "fadeUp 0.45s ease both";
      const head = document.createElement("p");
      head.className = "eyebrow";
      head.textContent = "Test completato";
      wrap.appendChild(head);
      const scoreEl = document.createElement("div");
      scoreEl.className = "score";
      scoreEl.textContent = `${score} / ${QUIZ.length}`;
      wrap.appendChild(scoreEl);
      const verdict = document.createElement("p");
      verdict.className = "verdict";
      verdict.textContent = verdictFor(score);
      wrap.appendChild(verdict);
      const restart = document.createElement("button");
      restart.type = "button";
      restart.className = "btn btn-ghost quiz-restart";
      restart.textContent = "Ricomincia il test";
      restart.addEventListener("click", () => {
        index = 0;
        score = 0;
        render();
      });
      wrap.appendChild(restart);
      root.appendChild(wrap);
    }

    render();
  }

  /* ---------- Loop ---------- */

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    starfield.draw(now / 1000);
    dowsingSim.update(dt);
    dowsingSim.draw();
    selficaSim.update(dt);
    selficaSim.draw();
    lineeSim.update(dt);
    lineeSim.draw();
    vegaSim.update(dt);
    vegaSim.draw();
    proveSim.update(dt);
    proveSim.draw();
    bilancioSim.update(dt);
    bilancioSim.draw();
    requestAnimationFrame(loop);
  }

  /* ---------- Boot ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initQuiz();
    requestAnimationFrame(loop);
  });
})();