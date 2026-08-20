(() => {
  "use strict";

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmt = (n, d) => n.toFixed(d).replace(".", ",");

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

  function interp(pts, x) {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        const t = (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
        return lerp(pts[i - 1][1], pts[i][1], t);
      }
    }
    return pts[pts.length - 1][1];
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

  /* ---------- Esperimento 01 · Linea del tempo ---------- */
  const TEMPO = [
    [1972, 2], [1975, 5], [1978, 8], [1980, 12], [1983, 20], [1986, 35],
    [1989, 60], [1990, 85], [1991, 120], [1992, 130], [1993, 110], [1995, 90],
    [1997, 70], [2000, 65], [2004, 55], [2008, 50], [2012, 45], [2016, 40], [2020, 35], [2025, 30]
  ];
  const TEMPO_START = 1972, TEMPO_END = 2025;
  const TEMPO_TOT = 6400;

  const tempoSim = (() => {
    const canvas = document.getElementById("canvas-tempo");
    const chipEl = document.getElementById("tempo-chip");
    const countEl = document.getElementById("tempo-count");
    const totEl = document.getElementById("tempo-tot");
    const hoaxEl = document.getElementById("tempo-hoax");
    const slider = document.getElementById("tempo-slider");
    const goBtn = document.getElementById("tempo-go");
    const resetBtn = document.getElementById("tempo-reset");
    const isVisible = trackVisibility(canvas);

    let playing = false, animT = 0;

    function updateReadouts() {
      const y = +slider.value;
      const count = Math.round(interp(TEMPO, y));
      countEl.textContent = count;
      totEl.textContent = TEMPO_TOT.toLocaleString("it-IT");
      hoaxEl.textContent = "centinaia";
      chipEl.textContent = y < 1980 ? "fase iniziale" : (y < 1991 ? "boom mediatico" : (y < 2001 ? "post-confessione" : "era degli artisti"));
    }

    function reset() {
      playing = false;
      slider.value = 1991;
      updateReadouts();
    }

    goBtn.addEventListener("click", () => { playing = true; animT = 0; slider.value = TEMPO_START; });
    resetBtn.addEventListener("click", reset);

    function update(dt) {
      if (!isVisible()) return;
      if (playing) {
        animT += dt;
        const y = Math.round(lerp(TEMPO_START, TEMPO_END, clamp(animT / 7, 0, 1)));
        slider.value = y;
        if (y >= TEMPO_END) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const padL = 52, padR = 16, padT = 18, padB = 26;
      const pw = w - padL - padR, ph = h - padT - padB;
      const yMin = 0, yMax = 140;
      const xOf = y => padL + ((y - TEMPO_START) / (TEMPO_END - TEMPO_START)) * pw;
      const yOf = v => padT + (1 - (v - yMin) / (yMax - yMin)) * ph;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0e1420"); bg.addColorStop(1, "#131b2b");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(127,208,198,0.12)"; ctx.lineWidth = 1;
      ctx.font = "10px 'IBM Plex Mono', monospace"; ctx.fillStyle = "rgba(139,149,163,0.6)";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (const v of [50, 100]) {
        const yy = yOf(v);
        ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
        ctx.fillText(v + "", padL - 8, yy);
      }
      ctx.textAlign = "left";
      for (const yr of [1972, 1985, 1991, 2000, 2025]) {
        const xx = xOf(yr);
        ctx.beginPath(); ctx.moveTo(xx, padT); ctx.lineTo(xx, h - padB); ctx.stroke();
        ctx.fillText(String(yr), xx, h - padB + 12);
      }

      // linea confessione 1991
      const y91 = xOf(1991);
      ctx.strokeStyle = "rgba(240,180,90,0.9)"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(y91, padT); ctx.lineTo(y91, h - padB); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#f0b45a"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText("1991 · confessione Bower & Chorley", y91 + 6, padT + 10);

      const curY = +slider.value;
      const barW = pw / (TEMPO_END - TEMPO_START) * 0.6;
      for (let y = TEMPO_START; y <= curY; y++) {
        const v = Math.round(interp(TEMPO, y));
        const xx = xOf(y);
        const isCurrent = y === curY;
        ctx.fillStyle = isCurrent ? "#f7d49a" : (y >= 1991 ? "rgba(127,208,198,0.75)" : "rgba(240,180,90,0.85)");
        ctx.fillRect(xx - barW / 2, yOf(v), barW, Math.max(2, h - padB - yOf(v)));
      }

      ctx.fillStyle = "rgba(236,228,208,0.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText("cerchi documentati per anno · Inghilterra", w * 0.05, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Esperimento 02 · Corda e tavola ---------- */
  const cordaSim = (() => {
    const canvas = document.getElementById("canvas-corda");
    const chipEl = document.getElementById("corda-chip");
    const raggioEl = document.getElementById("corda-raggio");
    const toolsEl = document.getElementById("corda-tools");
    const tempoEl = document.getElementById("corda-tempo");
    const slider = document.getElementById("corda-slider");
    const goBtn = document.getElementById("corda-go");
    const resetBtn = document.getElementById("corda-reset");
    const isVisible = trackVisibility(canvas);

    let playing = false, animT = 0;

    function updateReadouts() {
      const r = +slider.value;
      raggioEl.textContent = fmt(r, 1) + " m";
      toolsEl.textContent = "corda 2 m · tavola 1,2 m";
      tempoEl.textContent = Math.round(1 + r * 1.1) + " min";
      chipEl.textContent = "piolo · corda · tavola";
    }

    function reset() {
      playing = false;
      slider.value = 5;
      updateReadouts();
    }

    goBtn.addEventListener("click", () => { playing = true; animT = 0; slider.value = 15; });
    resetBtn.addEventListener("click", reset);

    function update(dt) {
      if (!isVisible()) return;
      if (playing) {
        animT += dt;
        const r = Math.round(lerp(+slider.value, 15, clamp(animT / 4, 0, 1)) * 2) / 2;
        slider.value = r;
        if (r >= 15) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const r = +slider.value;
      const R = Math.min(w, h) * 0.32;
      const cx = w * 0.38, cy = h * 0.52;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0b111c"); bg.addColorStop(1, "#142035");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // campo: righe di grano
      ctx.strokeStyle = "rgba(240,180,90,0.14)"; ctx.lineWidth = 1.5;
      for (let i = -7; i <= 7; i++) {
        const x = cx + i * 12;
        ctx.beginPath(); ctx.moveTo(x, cy - R - 30); ctx.lineTo(x, cy + R + 30); ctx.stroke();
      }

      // cerchio schiacciato (con l'area)
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(127,208,198,0.18)";
      ctx.fill();

      // bordo del cerchio
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "#7fd0c6"; ctx.lineWidth = 2; ctx.stroke();

      // piolo centrale
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#f7d49a"; ctx.fill();
      ctx.strokeStyle = "#f0b45a"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.stroke();

      // tavola che percorre il giro (rotante)
      const ang = performance.now() / 1200;
      const tx = cx + Math.cos(ang) * R, ty = cy + Math.sin(ang) * R;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(ang);
      ctx.fillStyle = "#8a6a3a";
      ctx.fillRect(-16, -5, 32, 10);
      ctx.strokeStyle = "rgba(236,228,208,0.5)"; ctx.lineWidth = 1;
      ctx.strokeRect(-16, -5, 32, 10);
      ctx.restore();

      // corda
      ctx.strokeStyle = "rgba(236,228,208,0.7)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(236,228,208,0.55)";
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText("raggio " + fmt(r, 1) + " m · corda fissa al piolo", w * 0.05, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Esperimento 03 · Geometria del compasso ---------- */
  const geometriaSim = (() => {
    const canvas = document.getElementById("canvas-geometria");
    const chipEl = document.getElementById("geometria-chip");
    const nEl = document.getElementById("geometria-n");
    const angEl = document.getElementById("geometria-ang");
    const distEl = document.getElementById("geometria-dist");
    const slider = document.getElementById("geometria-slider");
    const goBtn = document.getElementById("geometria-go");
    const resetBtn = document.getElementById("geometria-reset");
    const isVisible = trackVisibility(canvas);

    let playing = false, animT = 0;

    function updateReadouts() {
      const n = +slider.value;
      const R = 10;
      const ang = 360 / n;
      const dist = 2 * R * Math.sin(Math.PI / n);
      nEl.textContent = n;
      angEl.textContent = Math.round(ang) + "°";
      distEl.textContent = fmt(dist, 1) + " m";
      chipEl.textContent = n >= 8 ? "stella / figura complessa" : "poligono regolare";
    }

    function reset() {
      playing = false;
      slider.value = 5;
      updateReadouts();
    }

    goBtn.addEventListener("click", () => { playing = true; animT = 0; slider.value = 3; });
    resetBtn.addEventListener("click", reset);

    function update(dt) {
      if (!isVisible()) return;
      if (playing) {
        animT += dt;
        const n = Math.round(lerp(+slider.value, 12, clamp(animT / 5, 0, 1)));
        slider.value = n;
        if (n >= 12) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const n = +slider.value;
      const R = Math.min(w, h) * 0.3;
      const cx = w * 0.5, cy = h * 0.5;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0c1220"); bg.addColorStop(1, "#101a2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // circonferenza base
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(127,208,198,0.35)"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
      ctx.stroke(); ctx.setLineDash([]);

      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        pts.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R });
      }

      // corde tese (poligono)
      ctx.strokeStyle = "#f0b45a"; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p = pts[i];
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath(); ctx.stroke();

      // stella (salti di 2) se n dispari
      if (n % 2 === 1 && n >= 5) {
        ctx.strokeStyle = "rgba(240,180,90,0.4)"; ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]);
        ctx.beginPath();
        for (let k = 0; k <= n; k++) {
          const p = pts[(k * 2) % n];
          if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke(); ctx.setLineDash([]);
      }

      // pioli
      for (const p of pts) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#f7d49a"; ctx.fill();
        ctx.strokeStyle = "rgba(240,180,90,0.5)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.stroke();
      }

      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(236,228,208,0.55)";
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText("passo di corda = lato = " + fmt(2 * 10 * Math.sin(Math.PI / n), 1) + " m (R 10 m)", w * 0.05, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Esperimento 04 · Nodi piegati ---------- */
  const nodiSim = (() => {
    const canvas = document.getElementById("canvas-nodi");
    const chipEl = document.getElementById("nodi-chip");
    const pieEl = document.getElementById("nodi-pie");
    const angEl = document.getElementById("nodi-ang");
    const tempoEl = document.getElementById("nodi-tempo");
    const slider = document.getElementById("nodi-slider");
    const goBtn = document.getElementById("nodi-go");
    const resetBtn = document.getElementById("nodi-reset");
    const isVisible = trackVisibility(canvas);

    let playing = false, animT = 0;

    function updateReadouts() {
      const p = +slider.value;
      const frac = clamp(5 + p * 22.5, 5, 100);
      const ang = clamp(20 + p * 18, 20, 180);
      pieEl.textContent = fmt(frac, 0) + " %";
      angEl.textContent = Math.round(ang) + "°";
      tempoEl.textContent = Math.round(30 - p * 1.5) + " s";
      chipEl.textContent = p < 1 ? "niente da schiacciare" : (p < 6 ? "pressione dolce" : "pressione forte");
    }

    function reset() {
      playing = false;
      slider.value = 4;
      updateReadouts();
    }

    goBtn.addEventListener("click", () => { playing = true; animT = 0; slider.value = 10; });
    resetBtn.addEventListener("click", reset);

    function update(dt) {
      if (!isVisible()) return;
      if (playing) {
        animT += dt;
        const p = Math.round(lerp(+slider.value, 10, clamp(animT / 4, 0, 1)) * 2) / 2;
        slider.value = p;
        if (p >= 10) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const p = +slider.value;
      const frac = clamp(5 + p * 22.5, 5, 100);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0c111c"); bg.addColorStop(1, "#131c2c");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const groundY = h * 0.78;
      ctx.fillStyle = "#1c2a3e";
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.fillStyle = "#2a3d57";
      ctx.fillRect(0, groundY, w, 3);

      // fusti: eretti o piegati secondo frac
      const nS = 12;
      const baseX = w * 0.18, span = w * 0.64;
      for (let i = 0; i < nS; i++) {
        const x = baseX + (i / (nS - 1)) * span;
        const bent = (i / (nS - 1)) < frac / 100;
        const topY = groundY - h * 0.5;
        ctx.strokeStyle = bent ? "#7fd0c6" : "rgba(236,228,208,0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (bent) {
          // piega al nodo (a ~ metà altezza)
          const nodeY = groundY - h * 0.26;
          ctx.moveTo(x, groundY);
          ctx.lineTo(x, nodeY);
          ctx.lineTo(x + 18, nodeY - 6);
        } else {
          ctx.moveTo(x, groundY);
          ctx.lineTo(x, topY);
        }
        ctx.stroke();
        // nodo (pallino)
        ctx.beginPath(); ctx.arc(x, groundY - h * 0.26, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(240,180,90,0.8)"; ctx.fill();
      }

      // tavola che scende
      const pressA = clamp(p / 10, 0, 1);
      if (pressA > 0.05) {
        const tY = groundY - h * 0.26 + (1 - pressA) * h * 0.26 - 8;
        ctx.fillStyle = "#8a6a3a";
        ctx.fillRect(w * 0.16, tY, w * 0.68, 10);
        ctx.strokeStyle = "rgba(236,228,208,0.4)"; ctx.lineWidth = 1;
        ctx.strokeRect(w * 0.16, tY, w * 0.68, 10);
        ctx.font = "10px 'IBM Plex Mono', monospace";
        ctx.fillStyle = "rgba(236,228,208,0.7)";
        ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
        ctx.fillText("tavola (pounder)", w * 0.5, tY - 6);
      }

      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(236,228,208,0.55)";
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText("steli piegati al nodo senza rottura: " + fmt(frac, 0) + " %", w * 0.05, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Esperimento 05 · Mappa ---------- */
  const mappaSim = (() => {
    const canvas = document.getElementById("canvas-mappa");
    const chipEl = document.getElementById("mappa-chip");
    const distEl = document.getElementById("mappa-dist");
    const pctEl = document.getElementById("mappa-pct");
    const regEl = document.getElementById("mappa-reg");
    const slider = document.getElementById("mappa-slider");
    const goBtn = document.getElementById("mappa-go");
    const resetBtn = document.getElementById("mappa-reset");
    const isVisible = trackVisibility(canvas);

    let playing = false, animT = 0;

    function pctWithin(km) { return Math.round(lerp(38, 92, clamp((km - 0.5) / 4.5, 0, 1))); }

    function updateReadouts() {
      const km = +slider.value;
      distEl.textContent = fmt(km, 1) + " km";
      pctEl.textContent = pctWithin(km) + " %";
      regEl.textContent = "Wiltshire, UK";
      chipEl.textContent = km < 1.5 ? "cluster molto vicino" : "cluster vicino alle strade";
    }

    function reset() {
      playing = false;
      slider.value = 2;
      updateReadouts();
    }

    goBtn.addEventListener("click", () => { playing = true; animT = 0; slider.value = 5; });
    resetBtn.addEventListener("click", reset);

    function update(dt) {
      if (!isVisible()) return;
      if (playing) {
        animT += dt;
        const km = Math.round(lerp(+slider.value, 5, clamp(animT / 4, 0, 1)) * 10) / 10;
        slider.value = km;
        if (km >= 5) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const km = +slider.value;
      const cx = w * 0.42, cy = h * 0.5;
      const scale = Math.min(w, h) * 0.42 / 30; // 30 km in R

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0b1018"); bg.addColorStop(1, "#111b2a");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // strade (linee)
      ctx.strokeStyle = "rgba(127,208,198,0.4)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w * 0.05, h * 0.2); ctx.lineTo(w * 0.95, h * 0.75); ctx.stroke();
      ctx.strokeStyle = "rgba(127,208,198,0.3)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(w * 0.15, h * 0.95); ctx.lineTo(w * 0.8, h * 0.08); ctx.stroke();

      // anelli di distanza
      for (const rkm of [10, 20, 30]) {
        ctx.beginPath(); ctx.arc(cx, cy, rkm * scale, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(139,149,163,0.2)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
        ctx.stroke(); ctx.setLineDash([]);
      }

      // cerchi: cluster vicino alle strade
      const seed = [0.3, 0.7, 0.12, 0.55, 0.42, 0.9, 0.62, 0.28, 0.75, 0.48,
        0.2, 0.84, 0.38, 0.67, 0.14, 0.52, 0.95, 0.33, 0.6, 0.81];
      const rkm = km;
      const inRadius = pctWithin(rkm) / 100;
      for (let i = 0; i < seed.length; i += 2) {
        const dx = (seed[i] - 0.5) * 2, dy = (seed[i + 1] - 0.5) * 2;
        const d = Math.sqrt(dx * dx + dy * dy);
        const within = d < 0.85; // prossimità al cluster centrale
        const reachable = d < rkm / 15;
        const visible = reachable || within;
        if (!visible) continue;
        ctx.beginPath(); ctx.arc(cx + dx * 70, cy + dy * 70, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = within ? "#f0b45a" : "rgba(127,208,198,0.8)";
        ctx.fill();
      }

      // etichette
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(236,228,208,0.55)";
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText("cerchi documentati · distanza media dalle strade " + fmt(km, 1) + " km", w * 0.05, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Esperimento 06 · Statistica ---------- */
  const statisticaSim = (() => {
    const canvas = document.getElementById("canvas-statistica");
    const chipEl = document.getElementById("statistica-chip");
    const notoEl = document.getElementById("statistica-noto");
    const apertiEl = document.getElementById("statistica-aperti");
    const zeroEl = document.getElementById("statistica-zero");
    const slider = document.getElementById("statistica-slider");
    const goBtn = document.getElementById("statistica-go");
    const resetBtn = document.getElementById("statistica-reset");
    const isVisible = trackVisibility(canvas);

    let playing = false, animT = 0;

    function updateReadouts() {
      const v = +slider.value;
      notoEl.textContent = "molti";
      apertiEl.textContent = "qualche centinaio";
      zeroEl.textContent = "0";
      chipEl.textContent = v < 50 ? "inchiesta in corso" : "bilancio chiuso";
    }

    function reset() {
      playing = false;
      slider.value = 100;
      updateReadouts();
    }

    goBtn.addEventListener("click", () => { playing = true; animT = 0; slider.value = 0; });
    resetBtn.addEventListener("click", reset);

    function update(dt) {
      if (!isVisible()) return;
      if (playing) {
        animT += dt;
        const v = Math.round(lerp(+slider.value, 100, clamp(animT / 3, 0, 1)));
        slider.value = v;
        if (v >= 100) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const v = +slider.value;
      const frac = v / 100;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0e121c"); bg.addColorStop(1, "#131a2a");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const cx = w * 0.32, cy = h * 0.5, R = Math.min(w, h) * 0.28;

      // donut: cause note (99%) vs paranormale (0%)
      const a0 = -Math.PI / 2;
      const known = 0.99 * frac;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a0, a0 + known * Math.PI * 2); ctx.closePath();
      ctx.fillStyle = "#7fd0c6"; ctx.fill();
      if (frac > 0.01) {
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, a0 + known * Math.PI * 2, a0 + Math.PI * 2); ctx.closePath();
        ctx.fillStyle = "#5b6472"; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = bg; ctx.fill();

      // leggenda
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#7fd0c6";
      ctx.fillRect(w * 0.55, h * 0.36, 12, 12);
      ctx.fillStyle = "rgba(236,228,208,0.75)";
      ctx.fillText("cause note / repliche / confessati — " + Math.round(99 * frac) + " %", w * 0.55 + 18, h * 0.36 + 10);
      ctx.fillStyle = "#5b6472";
      ctx.fillRect(w * 0.55, h * 0.5, 12, 12);
      ctx.fillStyle = "rgba(236,228,208,0.75)";
      ctx.fillText("senza autore noto (irrisolti)", w * 0.55 + 18, h * 0.5 + 10);

      // lo zero evidenziato
      ctx.font = "14px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "#f7d49a";
      ctx.textAlign = "center";
      ctx.fillText("causa paranormale dimostrata: 0", w * 0.5, h * 0.82);

      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(236,228,208,0.5)";
      ctx.textAlign = "left";
      ctx.fillText("bilancio dei cerchi nel grano · " + Math.round(frac * 100) + " % dei casi verificati", w * 0.05, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Quiz ---------- */

  const QUIZ = [
    {
      q: "Quali strumenti bastano per tracciare un cerchio perfetto nel grano?",
      opts: ["Piolo, corda e una tavola", "Laser e GPS da satellite", "Un campo magnetico artificiale"],
      correct: 0,
      fb: "Il compasso è la costruzione più antica: un punto fisso, una distanza fissa, un giro. Bower e Chorley usavano esattamente piolo, corda e tavola."
    },
    {
      q: "Quando hanno confessato Doug Bower e Dave Chorley?",
      opts: ["Nel 1991, dopo ~13 anni di cerchi", "Nel 1972, al primo cerchio", "Mai: sono rimasti anonimi"],
      correct: 0,
      fb: "Nel 1991 hanno rivelato al 'Today' di aver tracciato centinaia di cerchi dal 1978, dimostrando la tecnica davanti alle telecamere."
    },
    {
      q: "Perché il grano nei cerchi è piegato senza rompersi?",
      opts: ["Una tavola che rotola piega i nodi senza spezzarli", "È stato tagliato con un laser", "Il calore lo ha rammollito"],
      correct: 0,
      fb: "La replica fisica di Richard Taylor (2010) ha mostrato che la pressione dolce di una tavola piega i nodi senza rottura, con angoli di ~90°."
    },
    {
      q: "I poligoni e le stelle nei cerchi si costruiscono…",
      opts: ["passando una corda tra pioli e archi di raggio fisso", "con disegni al computer proiettati dall'alto", "per caso, senza schema"],
      correct: 0,
      fb: "Con una corda della lunghezza del raggio si marcano punti a passi uguali: 5 passi danno il pentagono, 6 l'esagono. È geometria dei poligoni."
    },
    {
      q: "Dove si addensano di più i cerchi documentati?",
      opts: ["Vicino a strade, villaggi e aree turistiche", "In zone isolate senza accesso", "Solo sopra antiche linee 'energetiche'"],
      correct: 0,
      fb: "I cluster seguono l'accessibilità: dove si può arrivare di notte e dove la scoperta farà notizia. È una curva di accesso, non di energia."
    },
    {
      q: "Quanti cerchi nel grano hanno una causa paranormale dimostrata?",
      opts: ["Zero", "Qualche decina", "Tutti quelli 'inspiegati'"],
      correct: 0,
      fb: "Nessuno: 'senza autore noto' è un caso irrisolto, non una causa aliena. Di nessun cerchio è mai stata prodotta una prova di origine non umana."
    }
  ];

  const VERDICTS = [
    { min: 6, text: "Perfetto: hai gli esperimenti di questo quaderno a memoria. Ottimo." },
    { min: 4, text: "Ottimo. Sai già distinguere un dato da un'opinione." },
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
    tempoSim.update(dt);
    tempoSim.draw();
    cordaSim.update(dt);
    cordaSim.draw();
    geometriaSim.update(dt);
    geometriaSim.draw();
    nodiSim.update(dt);
    nodiSim.draw();
    mappaSim.update(dt);
    mappaSim.draw();
    statisticaSim.update(dt);
    statisticaSim.draw();
    requestAnimationFrame(loop);
  }

  /* ---------- Boot ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initQuiz();
    requestAnimationFrame(loop);
  });
})();