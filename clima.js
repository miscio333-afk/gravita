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

  /* ---------- Esperimento 01 · Keeling ---------- */
  const KEELING = [
    [1958, 315], [1960, 316.9], [1965, 320.0], [1970, 325.7], [1975, 331.1],
    [1980, 338.7], [1985, 346.0], [1990, 354.4], [1995, 360.9], [2000, 369.5],
    [2005, 379.8], [2010, 389.9], [2015, 400.8], [2020, 414.2], [2024, 424.6], [2026, 429]
  ];
  const K_START = 1958, K_END = 2026;

  const keelingSim = (() => {
    const canvas = document.getElementById("canvas-keeling");
    const chipEl = document.getElementById("keeling-chip");
    const ppmEl = document.getElementById("keeling-ppm");
    const incEl = document.getElementById("keeling-inc");
    const preEl = document.getElementById("keeling-pre");
    const slider = document.getElementById("keeling-slider");
    const goBtn = document.getElementById("keeling-go");
    const resetBtn = document.getElementById("keeling-reset");
    const isVisible = trackVisibility(canvas);

    let playing = false;
    let animT = 0;

    function reset() {
      playing = false;
      slider.value = K_END;
      updateReadouts();
    }

    function updateReadouts() {
      const y = +slider.value;
      const ppm = interp(KEELING, y);
      ppmEl.textContent = fmt(ppm, 1) + " ppm";
      incEl.textContent = "+" + Math.round(ppm - KEELING[0][1]) + " ppm";
      preEl.textContent = "280 ppm";
      chipEl.textContent = `${Math.round(y - K_START)} anni di misura`;
    }

    goBtn.addEventListener("click", () => { playing = true; animT = 0; slider.value = K_START; });
    resetBtn.addEventListener("click", reset);

    function update(dt) {
      if (!isVisible()) return;
      if (playing) {
        animT += dt;
        const y = Math.round(lerp(K_START, K_END, clamp(animT / 7, 0, 1)));
        slider.value = y;
        if (y >= K_END) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const padL = 52, padR = 16, padT = 18, padB = 26;
      const pw = w - padL - padR, ph = h - padT - padB;
      const yMin = 300, yMax = 440;
      const xOf = year => padL + ((year - K_START) / (K_END - K_START)) * pw;
      const yOf = ppm => padT + (1 - (ppm - yMin) / (yMax - yMin)) * ph;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#071018"); bg.addColorStop(1, "#0e1a26");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(127,208,198,0.12)"; ctx.lineWidth = 1;
      ctx.font = "10px 'IBM Plex Mono', monospace"; ctx.fillStyle = "rgba(139,149,163,0.6)";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (const [lbl, ppm] of [[300, "300"], [340, "340"], [380, "380"], [420, "420"]]) {
        const yy = yOf(ppm);
        ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
        ctx.fillText(lbl + " ppm", padL - 8, yy);
      }
      ctx.textAlign = "left";
      for (const yr of [1960, 1980, 2000, 2020]) {
        const xx = xOf(yr);
        ctx.beginPath(); ctx.moveTo(xx, padT); ctx.lineTo(xx, h - padB); ctx.stroke();
        ctx.fillText(String(yr), xx, h - padB + 12);
      }

      // curva con "respiro" stagionale
      const curY = +slider.value;
      ctx.strokeStyle = "rgba(236,228,208,0.18)"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = K_START; y <= curY; y += 0.2) {
        const base = interp(KEELING, y);
        const seas = 7 * Math.sin((y - K_START) * Math.PI * 2);
        const xx = xOf(y), yy = yOf(base + seas);
        if (y === K_START) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();

      // linea di base (media annuale)
      ctx.strokeStyle = "#f0b45a"; ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let y = K_START; y <= curY; y += 1) {
        const xx = xOf(y), yy = yOf(interp(KEELING, y));
        if (y === K_START) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();

      // punto corrente
      const px = xOf(curY), py = yOf(interp(KEELING, curY));
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#f7d49a"; ctx.fill();
      ctx.strokeStyle = "#f0b45a"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.stroke();

      ctx.fillStyle = "rgba(236,228,208,0.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText("Mauna Loa · osservatorio di Keeling", w * 0.05, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Esperimento 02 · Tyndall ---------- */
  const tyndallSim = (() => {
    const canvas = document.getElementById("canvas-tyndall");
    const chipEl = document.getElementById("tyndall-chip");
    const co2El = document.getElementById("tyndall-co2");
    const absEl = document.getElementById("tyndall-abs");
    const forzEl = document.getElementById("tyndall-forz");
    const slider = document.getElementById("tyndall-slider");
    const goBtn = document.getElementById("tyndall-go");
    const resetBtn = document.getElementById("tyndall-reset");
    const isVisible = trackVisibility(canvas);

    const C0 = 280;
    let playing = false, animT = 0;

    function absFrac(C) {
      const r = Math.log(C / 180) / Math.log(840 / 180);
      return clamp(0.20 + 0.40 * r, 0, 0.8);
    }
    function forcing(C) { return 5.35 * Math.log(C / C0); }

    function updateReadouts() {
      const C = +slider.value;
      co2El.textContent = Math.round(C) + " ppm";
      absEl.textContent = fmt(absFrac(C) * 100, 0) + " %";
      forzEl.textContent = (forcing(C) >= 0 ? "+" : "−") + fmt(Math.abs(forcing(C)), 1) + " W/m²";
      chipEl.textContent = C > 560 ? "bande saturate" : (C > 380 ? "bande in allargamento" : "spettro quasi pulito");
    }

    function reset() {
      playing = false;
      slider.value = 424;
      updateReadouts();
    }

    goBtn.addEventListener("click", () => { playing = true; animT = 0; });
    resetBtn.addEventListener("click", reset);

    function update(dt) {
      if (!isVisible()) return;
      if (playing) {
        animT += dt;
        const C = Math.round(lerp(+slider.value, 840, clamp(animT / 5, 0, 1)));
        slider.value = C;
        if (C >= 840) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const padL = 46, padR = 14, padT = 18, padB = 26;
      const pw = w - padL - padR, ph = h - padT - padB;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a1020"); bg.addColorStop(1, "#101828");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const xOf = lam => padL + (Math.log(lam) - Math.log(4)) / (Math.log(40) - Math.log(4)) * pw;
      const yOf = v => padT + (1 - v) * ph;

      // griglia
      ctx.strokeStyle = "rgba(127,208,198,0.1)"; ctx.lineWidth = 1;
      ctx.font = "10px 'IBM Plex Mono', monospace"; ctx.fillStyle = "rgba(139,149,163,0.6)";
      ctx.textBaseline = "middle";
      for (const lam of [5, 10, 15, 20, 30]) {
        const xx = xOf(lam);
        ctx.beginPath(); ctx.moveTo(xx, padT); ctx.lineTo(xx, h - padB); ctx.stroke();
        ctx.fillText(lam + " µm", xx, h - padB + 12);
      }

      // emissione termica della Terra (corpo nero ~288 K, picco ~10 µm)
      function planck(v) {
        const lam = Math.exp(Math.log(4) + (Math.log(40) - Math.log(4)) * v);
        return Math.exp(-Math.pow(Math.log(lam / 10.2) / 0.55, 2));
      }
      ctx.fillStyle = "rgba(240,180,90,0.16)";
      ctx.beginPath();
      ctx.moveTo(padL, h - padB);
      for (let i = 0; i <= pw; i++) {
        ctx.lineTo(padL + i, yOf(planck(i / pw) * 0.9));
      }
      ctx.lineTo(w - padR, h - padB);
      ctx.closePath(); ctx.fill();

      const C = +slider.value;
      const abs = absFrac(C);
      const bands = [[2.7, 0.06], [4.3, 0.12], [15, 0.5]];
      for (const [lam, width] of bands) {
        const cx = xOf(lam), hw = (Math.log(1 + width * abs * 6) / Math.log(1 + 6)) * pw * 0.05;
        const xx = Math.max(padL, cx - hw), xx2 = Math.min(w - padR, cx + hw);
        const top = yOf(0.9 - abs * 0.75);
        const grad = ctx.createLinearGradient(0, top, 0, h - padB);
        grad.addColorStop(0, "rgba(240,180,90,0.85)");
        grad.addColorStop(1, "rgba(240,180,90,0.08)");
        ctx.fillStyle = grad;
        ctx.fillRect(xx, top, xx2 - xx, h - padB - top);
      }

      // etichette gas
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(236,228,208,0.55)";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("N₂ · O₂ trasparenti", padL, padT + 8);
      ctx.fillText("CO₂ · 15 µm", xOf(15) - 20, padT + 20);
      ctx.fillText("assorbito: " + fmt(abs * 100, 0) + " %", padL, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Esperimento 03 · Forzante ---------- */
  const forzanteSim = (() => {
    const canvas = document.getElementById("canvas-forzante");
    const chipEl = document.getElementById("forzante-chip");
    const dfEl = document.getElementById("forzante-df");
    const dtEl = document.getElementById("forzante-dt");
    const sensEl = document.getElementById("forzante-sens");
    const slider = document.getElementById("forzante-slider");
    const goBtn = document.getElementById("forzante-go");
    const resetBtn = document.getElementById("forzante-reset");
    const isVisible = trackVisibility(canvas);

    const C0 = 280, LAMBDA = 0.8;
    let playing = false, animT = 0;

    function forcing(C) { return 5.35 * Math.log(C / C0); }

    function updateReadouts() {
      const C = +slider.value;
      const df = forcing(C);
      dfEl.textContent = (df >= 0 ? "+" : "−") + fmt(Math.abs(df), 1) + " W/m²";
      dtEl.textContent = (df >= 0 ? "+" : "−") + fmt(Math.abs(df * LAMBDA), 1) + " °C";
      sensEl.textContent = "2,5–4,0 °C";
      chipEl.textContent = df < 0.1 ? "bilancio in equilibrio" : "squilibrio in corso";
    }

    function reset() {
      playing = false;
      slider.value = 424;
      updateReadouts();
    }

    goBtn.addEventListener("click", () => { playing = true; animT = 0; });
    resetBtn.addEventListener("click", reset);

    function update(dt) {
      if (!isVisible()) return;
      if (playing) {
        animT += dt;
        const C = Math.round(lerp(+slider.value, 560, clamp(animT / 5, 0, 1)));
        slider.value = C;
        if (C >= 560) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const C = +slider.value;
      const df = forcing(C);
      const escapeFrac = clamp(1 - df / 8, 0.4, 1);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const surfaceY = h * 0.78;
      const layerY = h * 0.34;

      // sole
      ctx.beginPath(); ctx.arc(w * 0.5, h * 0.12, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#f0b45a"; ctx.fill();

      // superficie
      ctx.fillStyle = "#1b3350";
      ctx.fillRect(0, surfaceY, w, h - surfaceY);
      ctx.fillStyle = "#2a4a6b";
      ctx.fillRect(0, surfaceY, w, 3);

      // strato di CO2
      const layerA = clamp(0.12 + (C / 560) * 0.5, 0.12, 0.62);
      ctx.fillStyle = `rgba(127,208,198,${layerA})`;
      ctx.fillRect(0, layerY, w, 8);

      // raggi solari in entrata (fissi)
      const nIn = 6;
      for (let i = 0; i < nIn; i++) {
        const xx = w * (0.18 + (i / (nIn - 1)) * 0.64);
        ctx.strokeStyle = "rgba(240,180,90,0.7)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(xx, h * 0.18); ctx.lineTo(xx, surfaceY); ctx.stroke();
        ctx.beginPath(); ctx.arc(xx, h * 0.16, 2.4, 0, Math.PI * 2); ctx.fillStyle = "#f0b45a"; ctx.fill();
      }

      // raggi IR in uscita: alcuni trattenuti dallo strato
      const nOut = 8;
      for (let i = 0; i < nOut; i++) {
        const xx = w * (0.18 + (i / (nOut - 1)) * 0.64);
        const escapes = i / (nOut - 1) < escapeFrac;
        ctx.strokeStyle = escapes ? "rgba(240,180,90,0.65)" : "rgba(240,180,90,0.18)";
        ctx.lineWidth = escapes ? 2 : 2;
        ctx.setLineDash(escapes ? [] : [4, 4]);
        ctx.beginPath();
        ctx.moveTo(xx, surfaceY - 4);
        if (escapes) { ctx.lineTo(xx, layerY - 4); }
        else { ctx.lineTo(xx, layerY - 4); ctx.moveTo(xx, layerY + 12); ctx.lineTo(xx, surfaceY - 20); }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // gauge
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(236,228,208,0.55)";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("in entrata ≈ 340 W/m²", w * 0.05, h - 8);
      ctx.fillText("squilibrio: " + (df >= 0 ? "+" : "−") + fmt(Math.abs(df), 1) + " W/m²", w * 0.55, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Esperimento 04 · Carote di ghiaccio ---------- */
  const caroteSim = (() => {
    const canvas = document.getElementById("canvas-carote");
    const chipEl = document.getElementById("carote-chip");
    const co2El = document.getElementById("carote-co2");
    const dtEl = document.getElementById("carote-dt");
    const oggiEl = document.getElementById("carote-oggi");
    const slider = document.getElementById("carote-slider");
    const goBtn = document.getElementById("carote-go");
    const resetBtn = document.getElementById("carote-reset");
    const isVisible = trackVisibility(canvas);

    const TODAY_CO2 = 424;
    let playing = false, animT = 0;

    function co2Of(ky) { return 230 + 55 * Math.cos((ky / 100) * Math.PI * 2); }
    function tempOf(ky) { return (co2Of(ky) - co2Of(0)) * 0.08; }

    function updateReadouts() {
      const ky = +slider.value;
      const co2 = co2Of(ky);
      co2El.textContent = Math.round(co2) + " ppm";
      dtEl.textContent = (tempOf(ky) >= 0 ? "+" : "−") + fmt(Math.abs(tempOf(ky)), 1) + " °C";
      oggiEl.textContent = TODAY_CO2 + " ppm";
      chipEl.textContent = ky < 2 ? "oggi" : (co2 < 210 ? "massimo glaciale" : "interglaciale");
    }

    function reset() {
      playing = false;
      slider.value = 0;
      updateReadouts();
    }

    goBtn.addEventListener("click", () => { playing = true; animT = 0; });
    resetBtn.addEventListener("click", reset);

    function update(dt) {
      if (!isVisible()) return;
      if (playing) {
        animT += dt;
        const ky = Math.round(lerp(0, 800, clamp(animT / 8, 0, 1)));
        slider.value = ky;
        if (ky >= 800) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const padL = 52, padR = 16, padT = 18, padB = 26;
      const pw = w - padL - padR, ph = h - padT - padB;
      const yMin = 160, yMax = 440;
      const xOf = ky => padL + (ky / 800) * pw;
      const yOf = ppm => padT + (1 - (ppm - yMin) / (yMax - yMin)) * ph;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0b1a2e"); bg.addColorStop(1, "#102438");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // righelli scala
      ctx.strokeStyle = "rgba(127,208,198,0.12)"; ctx.lineWidth = 1;
      ctx.font = "10px 'IBM Plex Mono', monospace"; ctx.fillStyle = "rgba(139,149,163,0.6)";
      ctx.textBaseline = "middle"; ctx.textAlign = "right";
      for (const [lbl, ppm] of [[200, "200"], [300, "300"], [400, "400"]]) {
        const yy = yOf(ppm);
        ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
        ctx.fillText(lbl + " ppm", padL - 8, yy);
      }
      ctx.textAlign = "left";
      for (const ky of [0, 200, 400, 600, 800]) {
        const xx = xOf(ky);
        ctx.beginPath(); ctx.moveTo(xx, padT); ctx.lineTo(xx, h - padB); ctx.stroke();
        ctx.fillText((ky ? "−" : "") + ky + " ka", xx, h - padB + 12);
      }

      // linea di oggi
      ctx.strokeStyle = "rgba(240,180,90,0.9)"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      const yToday = yOf(TODAY_CO2);
      ctx.beginPath(); ctx.moveTo(padL, yToday); ctx.lineTo(w - padR, yToday); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#f0b45a"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText("oggi: " + TODAY_CO2 + " ppm", w - padR - 8, yToday - 8);

      // curva CO2 paleoclimatica (8 cicli)
      ctx.strokeStyle = "rgba(127,208,198,0.9)"; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let ky = 0; ky <= 800; ky += 2) {
        const xx = xOf(ky), yy = yOf(co2Of(ky));
        if (ky === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();

      // marker
      const ky = +slider.value;
      const mx = xOf(ky), my = yOf(co2Of(ky));
      ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#f7d49a"; ctx.fill();
      ctx.strokeStyle = "#7fd0c6"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(mx, my, 9, 0, Math.PI * 2); ctx.stroke();

      ctx.fillStyle = "rgba(236,228,208,0.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText("EPICA Dome C · 800.000 anni", w * 0.05, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Esperimento 05 · Temperatura globale ---------- */
  const TEMP = [
    [1880, -0.16], [1890, -0.10], [1900, -0.12], [1910, -0.20], [1920, -0.12],
    [1930, -0.06], [1940, 0.06], [1945, 0.12], [1950, -0.03], [1955, -0.09],
    [1960, -0.01], [1965, 0.02], [1970, 0.04], [1975, 0.05], [1980, 0.20],
    [1985, 0.30], [1990, 0.40], [1995, 0.50], [2000, 0.60], [2005, 0.72],
    [2010, 0.85], [2015, 1.00], [2016, 1.15], [2020, 1.20], [2023, 1.45], [2024, 1.55]
  ];
  const T_START = 1880, T_END = 2024;

  const tempSim = (() => {
    const canvas = document.getElementById("canvas-temp");
    const chipEl = document.getElementById("temp-chip");
    const anomEl = document.getElementById("temp-anom");
    const recEl = document.getElementById("temp-rec");
    const rateEl = document.getElementById("temp-rate");
    const slider = document.getElementById("temp-slider");
    const goBtn = document.getElementById("temp-go");
    const resetBtn = document.getElementById("temp-reset");
    const isVisible = trackVisibility(canvas);

    let playing = false, animT = 0;

    function reset() {
      playing = false;
      slider.value = T_END;
      updateReadouts();
    }

    function updateReadouts() {
      const y = +slider.value;
      const anom = interp(TEMP, y);
      let bestY = T_START, bestV = -Infinity;
      for (const [yr, v] of TEMP) {
        if (yr <= y && v > bestV) { bestV = v; bestY = yr; }
      }
      anomEl.textContent = (anom >= 0 ? "+" : "−") + fmt(Math.abs(anom), 2) + " °C";
      recEl.textContent = bestY + " · il più caldo finora";
      rateEl.textContent = "+0,20 °C";
      chipEl.textContent = `${y} · serie globale`;
    }

    goBtn.addEventListener("click", () => { playing = true; animT = 0; slider.value = T_START; });
    resetBtn.addEventListener("click", reset);

    function update(dt) {
      if (!isVisible()) return;
      if (playing) {
        animT += dt;
        const y = Math.round(lerp(T_START, T_END, clamp(animT / 6, 0, 1)));
        slider.value = y;
        if (y >= T_END) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const padL = 52, padR = 16, padT = 18, padB = 26;
      const pw = w - padL - padR, ph = h - padT - padB;
      const yMin = -0.4, yMax = 1.8;
      const xOf = y => padL + ((y - T_START) / (T_END - T_START)) * pw;
      const yOf = v => padT + (1 - (v - yMin) / (yMax - yMin)) * ph;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#10141d"); bg.addColorStop(1, "#0b0e15");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // linea zero
      const y0 = yOf(0);
      ctx.strokeStyle = "rgba(236,228,208,0.3)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, y0); ctx.lineTo(w - padR, y0); ctx.stroke();
      ctx.font = "10px 'IBM Plex Mono', monospace"; ctx.fillStyle = "rgba(139,149,163,0.6)";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (const [lbl, v] of [["0", 0], ["+1 °C", 1]]) {
        const yy = yOf(v);
        ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
        ctx.fillText(lbl, padL - 8, yy);
      }
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      for (const yr of [1900, 1950, 2000]) {
        const xx = xOf(yr);
        ctx.beginPath(); ctx.moveTo(xx, padT); ctx.lineTo(xx, h - padB); ctx.stroke();
        ctx.fillText(String(yr), xx, h - padB + 12);
      }

      // barre anni fino al selezionato
      const curY = +slider.value;
      const barW = pw / (T_END - T_START) * 0.72;
      for (let y = T_START; y <= curY; y++) {
        const v = interp(TEMP, y);
        const xx = xOf(y);
        const isCurrent = y === curY;
        ctx.fillStyle = v >= 0 ? "rgba(240,180,90,0.85)" : "rgba(127,208,198,0.7)";
        if (isCurrent) { ctx.fillStyle = v >= 0 ? "#f7d49a" : "#a6e3dc"; }
        const top = v >= 0 ? yOf(v) : y0;
        const bot = v >= 0 ? y0 : yOf(v);
        ctx.fillRect(xx - barW / 2, top, barW, Math.max(2, bot - top));
      }

      ctx.fillStyle = "rgba(236,228,208,0.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("anomalia vs 1850–1900 · HadCRUT5/GISTEMP/Berkeley", w * 0.05, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Esperimento 06 · Ghiacciai ---------- */
  const GLAC = [
    [1950, 0], [1955, -0.9], [1960, -1.9], [1965, -3.0], [1970, -4.2],
    [1975, -5.6], [1980, -7.1], [1985, -8.8], [1990, -10.6], [1995, -12.8],
    [2000, -15.0], [2005, -17.7], [2010, -20.4], [2015, -23.0], [2020, -25.5], [2024, -27.0]
  ];
  const G_START = 1950, G_END = 2024;

  const ghiacciaiSim = (() => {
    const canvas = document.getElementById("canvas-ghiacciai");
    const chipEl = document.getElementById("ghiacciai-chip");
    const cumEl = document.getElementById("ghiacciai-cum");
    const yearEl = document.getElementById("ghiacciai-year");
    const accEl = document.getElementById("ghiacciai-acc");
    const slider = document.getElementById("ghiacciai-slider");
    const goBtn = document.getElementById("ghiacciai-go");
    const resetBtn = document.getElementById("ghiacciai-reset");
    const isVisible = trackVisibility(canvas);

    let playing = false, animT = 0;

    function reset() {
      playing = false;
      slider.value = G_END;
      updateReadouts();
    }

    function updateReadouts() {
      const y = +slider.value;
      const cum = interp(GLAC, y);
      const prev = interp(GLAC, Math.max(G_START, y - 1));
      cumEl.textContent = fmt(cum, 1) + " m";
      yearEl.textContent = fmt(cum - prev, 1) + " m";
      accEl.textContent = "×" + fmt(Math.abs((interp(GLAC, 2024) - interp(GLAC, 2000)) / (interp(GLAC, 1980) - interp(GLAC, 1960))), 1);
      chipEl.textContent = `bilancia ${y}`;
    }

    goBtn.addEventListener("click", () => { playing = true; animT = 0; slider.value = G_START; });
    resetBtn.addEventListener("click", reset);

    function update(dt) {
      if (!isVisible()) return;
      if (playing) {
        animT += dt;
        const y = Math.round(lerp(G_START, G_END, clamp(animT / 6, 0, 1)));
        slider.value = y;
        if (y >= G_END) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const padL = 52, padR = 16, padT = 18, padB = 26;
      const pw = w - padL - padR, ph = h - padT - padB;
      const xOf = y => padL + ((y - G_START) / (G_END - G_START)) * pw;
      const yOf = m => padT + (m / 30) * ph;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#101c2c"); bg.addColorStop(1, "#16263a");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // righelli
      ctx.strokeStyle = "rgba(127,208,198,0.12)"; ctx.lineWidth = 1;
      ctx.font = "10px 'IBM Plex Mono', monospace"; ctx.fillStyle = "rgba(139,149,163,0.6)";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (const m of [-5, -10, -15, -20, -25]) {
        const yy = yOf(m);
        ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
        ctx.fillText(m + " m", padL - 8, yy);
      }
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      for (const yr of [1960, 1980, 2000, 2020]) {
        const xx = xOf(yr);
        ctx.beginPath(); ctx.moveTo(xx, padT); ctx.lineTo(xx, h - padB); ctx.stroke();
        ctx.fillText(String(yr), xx, h - padB + 12);
      }

      // area sotto la curva (perdita cumulativa)
      const curY = +slider.value;
      ctx.fillStyle = "rgba(127,208,198,0.15)";
      ctx.beginPath();
      ctx.moveTo(padL, padT);
      for (let y = G_START; y <= curY; y++) {
        ctx.lineTo(xOf(y), yOf(interp(GLAC, y)));
      }
      ctx.lineTo(xOf(curY), padT);
      ctx.closePath(); ctx.fill();

      // curva
      ctx.strokeStyle = "#7fd0c6"; ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let y = G_START; y <= curY; y++) {
        const xx = xOf(y), yy = yOf(interp(GLAC, y));
        if (y === G_START) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();

      // punto corrente
      const mx = xOf(curY), my = yOf(interp(GLAC, curY));
      ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#a6e3dc"; ctx.fill();
      ctx.strokeStyle = "#7fd0c6"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(mx, my, 9, 0, Math.PI * 2); ctx.stroke();

      ctx.fillStyle = "rgba(236,228,208,0.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("media ghiacciai di riferimento · WGMS", w * 0.05, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Quiz ---------- */

  const QUIZ = [
    {
      q: "Da quando e dove si misura la CO₂ senza interruzioni?",
      opts: ["Mauna Loa, Hawaii, dal 1958", "Roma, dal 1900", "Dalla Stazione Spaziale, dal 2000"],
      correct: 0,
      fb: "L'Osservatorio di Mauna Loa misura la CO₂ dal marzo 1958 (serie di Keeling): oggi è la più lunga al mondo, con la base che sale di ~2 ppm l'anno."
    },
    {
      q: "Cosa ha dimostrato John Tyndall nel 1859?",
      opts: ["Che CO₂ e vapore assorbono l'infrarosso", "Che la CO₂ è trasparente al calore", "Che il clima non può cambiare"],
      correct: 0,
      fb: "N₂ e O₂ sono trasparenti al calore; CO₂, vapore e ozono lo assorbono. L'effetto serra ha una base sperimentale da 160 anni."
    },
    {
      q: "Qual è il valore più alto di CO₂ negli ultimi 800.000 anni, prima d'oggi?",
      opts: ["~300 ppm", "~500 ppm", "~424 ppm"],
      correct: 0,
      fb: "Le carote di ghiaccio (EPICA Dome C) mostrano che la CO₂ è oscillata tra ~172 e ~300 ppm. Oggi a 424 ppm siamo fuori scala."
    },
    {
      q: "Il 2024, rispetto al livello preindustriale, è stato…",
      opts: ["l'anno più caldo mai misurato, ~+1,55 °C", "nella media", "più freddo del 1950"],
      correct: 0,
      fb: "Le sei serie globali concordano: 2024 ≈ +1,55 °C sopra il 1850–1900. I 10 anni più caldi della storia sono tutti dal 2015 in poi."
    },
    {
      q: "Perché lo 0,04% di CO₂ può scaldare il pianeta?",
      opts: ["Assorbe l'infrarosso in uscita dalla Terra", "Sostituisce l'ossigeno dell'aria", "Brucia nell'atmosfera"],
      correct: 0,
      fb: "La CO₂ intercetta il calore che la Terra emette verso lo spazio e lo rinvia indietro: un pizzico basta perché l'effetto è logaritmico nella concentrazione."
    },
    {
      q: "I ghiacciai di riferimento del mondo, misurati dal 1950, hanno una bilancia di massa…",
      opts: ["negativa quasi ogni anno, in accelerazione", "positiva, crescono", "stabile da 70 anni"],
      correct: 0,
      fb: "Il WGMS misura ogni anno decine di ghiacciai: il saldo cumulativo è sottozero dal 1950 (~−27 m di acqua) e il ritmo è più che raddoppiato dal 2000."
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
    keelingSim.update(dt);
    keelingSim.draw();
    tyndallSim.update(dt);
    tyndallSim.draw();
    forzanteSim.update(dt);
    forzanteSim.draw();
    caroteSim.update(dt);
    caroteSim.draw();
    tempSim.update(dt);
    tempSim.draw();
    ghiacciaiSim.update(dt);
    ghiacciaiSim.draw();
    requestAnimationFrame(loop);
  }

  /* ---------- Boot ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initQuiz();
    requestAnimationFrame(loop);
  });
})();
