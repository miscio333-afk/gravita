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

  /* ---------- Esperimento 01 · PM2,5 ---------- */
  const pm25Sim = (() => {
    const canvas = document.getElementById("canvas-pm25");
    const chipEl = document.getElementById("pm25-chip");
    const valEl = document.getElementById("pm25-val");
    const limitEl = document.getElementById("pm25-limit");
    const bandEl = document.getElementById("pm25-band");
    const slider = document.getElementById("pm25-slider");
    const goBtn = document.getElementById("pm25-go");
    const resetBtn = document.getElementById("pm25-reset");
    const isVisible = trackVisibility(canvas);

    const LIMIT = 15;
    let playing = false, animT = 0;

    function pmOf(h) {
      const base = 10;
      const rush = 22 * Math.exp(-Math.pow((h - 8) / 1.7, 2)) + 26 * Math.exp(-Math.pow((h - 19) / 1.9, 2));
      const night = 4 * Math.exp(-Math.pow((h - 1) / 3, 2));
      return base + rush + night;
    }

    function bandOf(v) {
      if (v < 10) return "Buona";
      if (v < 20) return "Discreta";
      if (v < 35) return "Mediocre";
      if (v < 50) return "Scarsa";
      return "Molto scadente";
    }

    function updateReadouts() {
      const h = +slider.value;
      const v = pmOf(h);
      valEl.textContent = fmt(v, 0) + " µg/m³";
      limitEl.textContent = LIMIT + " µg/m³";
      bandEl.textContent = bandOf(v);
      chipEl.textContent = v > LIMIT ? "sopra il limite WHO" : "sotto il limite WHO";
    }

    function reset() {
      playing = false;
      slider.value = 6;
      updateReadouts();
    }

    goBtn.addEventListener("click", () => { playing = true; animT = 0; slider.value = 0; });
    resetBtn.addEventListener("click", reset);

    function update(dt) {
      if (!isVisible()) return;
      if (playing) {
        animT += dt;
        const h = Math.round(lerp(0, 24, clamp(animT / 7, 0, 1)) * 2) / 2;
        slider.value = h;
        if (h >= 24) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const padL = 52, padR = 16, padT = 18, padB = 26;
      const pw = w - padL - padR, ph = h - padT - padB;
      const yMin = 0, yMax = 45;
      const xOf = hr => padL + (hr / 24) * pw;
      const yOf = v => padT + (1 - (v - yMin) / (yMax - yMin)) * ph;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0c141c"); bg.addColorStop(1, "#101c28");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // griglia
      ctx.strokeStyle = "rgba(127,208,198,0.12)"; ctx.lineWidth = 1;
      ctx.font = "10px 'IBM Plex Mono', monospace"; ctx.fillStyle = "rgba(139,149,163,0.6)";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (const [lbl, v] of [[15, "15"], [30, "30"], [45, "45"]]) {
        const yy = yOf(v);
        ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
        ctx.fillText(lbl + " µg", padL - 8, yy);
      }
      ctx.textAlign = "left";
      for (const hr of [0, 6, 12, 18, 24]) {
        const xx = xOf(hr);
        ctx.beginPath(); ctx.moveTo(xx, padT); ctx.lineTo(xx, h - padB); ctx.stroke();
        ctx.fillText(hr, xx, h - padB + 12);
      }

      // linea del limite WHO
      const yLim = yOf(LIMIT);
      ctx.strokeStyle = "rgba(240,180,90,0.9)"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(padL, yLim); ctx.lineTo(w - padR, yLim); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#f0b45a"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText("limite OMS 24 h: 15 µg/m³", padL, yLim - 8);

      // curva della giornata
      const curH = +slider.value;
      ctx.fillStyle = "rgba(127,208,198,0.14)";
      ctx.beginPath();
      ctx.moveTo(padL, h - padB);
      for (let hr = 0; hr <= curH; hr += 0.1) ctx.lineTo(xOf(hr), yOf(pmOf(hr)));
      ctx.lineTo(xOf(curH), h - padB);
      ctx.closePath(); ctx.fill();

      ctx.strokeStyle = "#7fd0c6"; ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let hr = 0; hr <= curH; hr += 0.1) {
        const xx = xOf(hr), yy = yOf(pmOf(hr));
        if (hr === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();

      // punto corrente
      const mx = xOf(curH), my = yOf(pmOf(curH));
      ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#a6e3dc"; ctx.fill();
      ctx.strokeStyle = "#7fd0c6"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(mx, my, 9, 0, Math.PI * 2); ctx.stroke();

      ctx.fillStyle = "rgba(236,228,208,0.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText("contatore ottico · giornata invernale in città", w * 0.05, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Esperimento 02 · Pennacchio ---------- */
  const pennacchioSim = (() => {
    const canvas = document.getElementById("canvas-pennacchio");
    const chipEl = document.getElementById("pennacchio-chip");
    const maxEl = document.getElementById("pennacchio-max");
    const distEl = document.getElementById("pennacchio-dist");
    const windEl = document.getElementById("pennacchio-wind");
    const slider = document.getElementById("pennacchio-slider");
    const goBtn = document.getElementById("pennacchio-go");
    const resetBtn = document.getElementById("pennacchio-reset");
    const isVisible = trackVisibility(canvas);

    const STACK = 0.55;
    let playing = false, animT = 0;

    function cMax(u) { return 56 / u; }
    function distOf(u) { return 260 + 80 * u; }

    function updateReadouts() {
      const u = +slider.value;
      maxEl.textContent = fmt(cMax(u), 0) + " µg/m³";
      distEl.textContent = Math.round(distOf(u)) + " m";
      windEl.textContent = fmt(u, 1) + " m/s";
      chipEl.textContent = u > 6 ? "pennacchio spazzato via" : (u < 2 ? "pennacchio che ricade vicino" : "pennacchio in dispersione");
    }

    function reset() {
      playing = false;
      slider.value = 2;
      updateReadouts();
    }

    goBtn.addEventListener("click", () => { playing = true; animT = 0; });
    resetBtn.addEventListener("click", reset);

    function update(dt) {
      if (!isVisible()) return;
      if (playing) {
        animT += dt;
        const u = Math.round(lerp(+slider.value, 10, clamp(animT / 5, 0, 1)) * 10) / 10;
        slider.value = u;
        if (u >= 10) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const u = +slider.value;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a1020"); bg.addColorStop(1, "#111a2c");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const groundY = h * 0.86;
      // suolo
      ctx.fillStyle = "#1c2a3e";
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.fillStyle = "#2a3d57";
      ctx.fillRect(0, groundY, w, 3);

      // camino
      const sx = w * 0.16, sy = groundY;
      const sh = h * STACK;
      ctx.fillStyle = "#31465f";
      ctx.fillRect(sx - 7, sy - sh, 14, sh);
      ctx.fillStyle = "#3d5875";
      ctx.fillRect(sx - 9, sy - sh - 4, 18, 4);

      // pennacchio: serie di cerchi spostati dal vento, sigma crescente
      const nP = 26;
      for (let i = 0; i < nP; i++) {
        const t = i / (nP - 1);
        const px = sx + t * (w - sx - 24);
        const sigma = 3 + t * (10 + 26 / u);
        const rise = -sh * (1 - t * 0.9);
        const a = Math.max(0, 0.5 * (1 - t) - (u < 1.5 ? 0.1 : 0));
        ctx.beginPath();
        ctx.arc(px, sy + rise, sigma, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240,180,90,${a})`;
        ctx.fill();
      }

      // fascia di deposizione al suolo
      ctx.fillStyle = "rgba(240,180,90,0.22)";
      const dMax = distOf(u);
      const dFrac = Math.min(1, dMax / (w * 0.9));
      ctx.fillRect(sx + w * 0.05, groundY - 6, (w - sx) * 0.9 * dFrac, 6);

      // etichette
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(236,228,208,0.55)";
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText("vento " + fmt(u, 1) + " m/s", w * 0.05, h - 8);
      ctx.fillText("max al suolo ≈ " + fmt(cMax(u), 0) + " µg/m³ a " + Math.round(distOf(u)) + " m", w * 0.45, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Esperimento 03 · Ozono ---------- */
  const ozonoSim = (() => {
    const canvas = document.getElementById("canvas-ozono");
    const chipEl = document.getElementById("ozono-chip");
    const o3El = document.getElementById("ozono-o3");
    const no2El = document.getElementById("ozono-no2");
    const sunEl = document.getElementById("ozono-sun");
    const slider = document.getElementById("ozono-slider");
    const goBtn = document.getElementById("ozono-go");
    const resetBtn = document.getElementById("ozono-reset");
    const isVisible = trackVisibility(canvas);

    let playing = false, animT = 0;

    function sunOf(h) {
      const s = Math.sin((h - 6) * Math.PI / 12);
      return clamp(s, 0, 1) * 1000;
    }
    function no2Of(h) {
      const base = 18;
      const rush = 30 * Math.exp(-Math.pow((h - 8) / 1.6, 2)) + 26 * Math.exp(-Math.pow((h - 19) / 1.8, 2));
      return base + rush;
    }
    function o3Of(h) {
      const s = Math.sin((h - 7.5) * Math.PI / 12);
      return 30 + 120 * clamp(s, 0, 1);
    }

    function updateReadouts() {
      const h = +slider.value;
      o3El.textContent = Math.round(o3Of(h)) + " µg/m³";
      no2El.textContent = Math.round(no2Of(h)) + " µg/m³";
      sunEl.textContent = Math.round(sunOf(h)) + " W/m²";
      chipEl.textContent = o3Of(h) > 120 ? "smog estivo in corso" : "aria diurna stabile";
    }

    function reset() {
      playing = false;
      slider.value = 14;
      updateReadouts();
    }

    goBtn.addEventListener("click", () => { playing = true; animT = 0; slider.value = 0; });
    resetBtn.addEventListener("click", reset);

    function update(dt) {
      if (!isVisible()) return;
      if (playing) {
        animT += dt;
        const h = Math.round(lerp(0, 24, clamp(animT / 8, 0, 1)) * 2) / 2;
        slider.value = h;
        if (h >= 24) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const padL = 52, padR = 16, padT = 18, padB = 26;
      const pw = w - padL - padR, ph = h - padT - padB;
      const yMin = 0, yMax = 200;
      const xOf = hr => padL + (hr / 24) * pw;
      const yOf = v => padT + (1 - (v - yMin) / (yMax - yMin)) * ph;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0e1220"); bg.addColorStop(1, "#161b2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // griglia
      ctx.strokeStyle = "rgba(127,208,198,0.12)"; ctx.lineWidth = 1;
      ctx.font = "10px 'IBM Plex Mono', monospace"; ctx.fillStyle = "rgba(139,149,163,0.6)";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (const [lbl, v] of [[100, "100"], [200, "200"]]) {
        const yy = yOf(v);
        ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
        ctx.fillText(lbl + " µg", padL - 8, yy);
      }
      ctx.textAlign = "left";
      for (const hr of [0, 6, 12, 18, 24]) {
        const xx = xOf(hr);
        ctx.beginPath(); ctx.moveTo(xx, padT); ctx.lineTo(xx, h - padB); ctx.stroke();
        ctx.fillText(hr, xx, h - padB + 12);
      }

      // curva NO2 (chiara) e O3 (accento)
      const curH = +slider.value;
      ctx.strokeStyle = "rgba(139,149,163,0.55)"; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let hr = 0; hr <= curH; hr += 0.1) {
        const xx = xOf(hr), yy = yOf(no2Of(hr));
        if (hr === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();

      ctx.strokeStyle = "#f0b45a"; ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let hr = 0; hr <= curH; hr += 0.1) {
        const xx = xOf(hr), yy = yOf(o3Of(hr));
        if (hr === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();

      // soglia UE 8h
      const yLim = yOf(120);
      ctx.strokeStyle = "rgba(240,180,90,0.7)"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(padL, yLim); ctx.lineTo(w - padR, yLim); ctx.stroke();
      ctx.setLineDash([]);

      // punto corrente
      const mx = xOf(curH);
      ctx.beginPath(); ctx.arc(mx, yOf(o3Of(curH)), 5, 0, Math.PI * 2);
      ctx.fillStyle = "#f7d49a"; ctx.fill();
      ctx.strokeStyle = "#f0b45a"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(mx, yOf(o3Of(curH)), 9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(mx, yOf(no2Of(curH)), 4, 0, Math.PI * 2);
      ctx.fillStyle = "#c9c2ae"; ctx.fill();

      ctx.fillStyle = "rgba(236,228,208,0.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText("NO₂ grigio · O₃ ambra · soglia 8 h = 120 µg/m³", w * 0.05, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Esperimento 04 · Inversione termica ---------- */
  const inversioneSim = (() => {
    const canvas = document.getElementById("canvas-inversione");
    const chipEl = document.getElementById("inversione-chip");
    const pmEl = document.getElementById("inversione-pm");
    const visEl = document.getElementById("inversione-vis");
    const dtEl = document.getElementById("inversione-dt");
    const slider = document.getElementById("inversione-slider");
    const goBtn = document.getElementById("inversione-go");
    const resetBtn = document.getElementById("inversione-reset");
    const isVisible = trackVisibility(canvas);

    let playing = false, animT = 0;

    function dTof(i) { return -2 + i; }
    function pmOf(i) { return 18 + 5.5 * i; }
    function visOf(i) { return Math.max(1, 25 - 3 * i); }

    function updateReadouts() {
      const i = +slider.value;
      pmEl.textContent = fmt(pmOf(i), 0) + " µg/m³";
      visEl.textContent = fmt(visOf(i), 0) + " km";
      dtEl.textContent = (dTof(i) >= 0 ? "+" : "−") + fmt(Math.abs(dTof(i)), 1) + " °C";
      chipEl.textContent = i > 2 ? "cappa presente" : "cappa assente";
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
        const i = Math.round(lerp(+slider.value, 8, clamp(animT / 4, 0, 1)) * 10) / 10;
        slider.value = i;
        if (i >= 8) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const i = +slider.value;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0c1118"); bg.addColorStop(1, "#131c28");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const groundY = h * 0.88;
      ctx.fillStyle = "#1c2a3e";
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.fillStyle = "#2a3d57";
      ctx.fillRect(0, groundY, w, 3);

      // cappa: strato caldo in alto
      if (i > 0.2) {
        const capA = clamp(0.08 + i * 0.06, 0.08, 0.5);
        const capY = h * 0.18;
        ctx.fillStyle = `rgba(240,180,90,${capA})`;
        ctx.fillRect(0, capY, w, 10);
        ctx.fillStyle = "rgba(240,180,90,0.35)";
        ctx.font = "10px 'IBM Plex Mono', monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("strato caldo (inversione)", w / 2, capY + 5);
      }

      // particolato al suolo: densità di punti che cresce con i
      const nD = 14;
      for (let k = 0; k < nD; k++) {
        const x = w * (0.08 + (k / nD) * 0.84);
        const y = groundY - 4 - Math.random() * clamp(6 + i * 5, 0, 46);
        const a = clamp(0.15 + i * 0.08, 0.1, 0.8);
        ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(236,228,208,${a})`;
        ctx.fill();
      }

      // camino: il fumo sale o si appiattisce
      const sx = w * 0.5, sy = groundY;
      ctx.fillStyle = "#31465f";
      ctx.fillRect(sx - 5, sy - h * 0.22, 10, h * 0.22);
      const flat = i > 2 ? clamp((i - 2) / 4, 0, 1) : 0;
      for (let k = 0; k < 9; k++) {
        const t = k / 8;
        const px = sx + (t - 0.5) * 30 * flat + (Math.random() - 0.5) * 3;
        const py = sy - h * 0.22 - t * h * 0.34 * (1 - flat * 0.85);
        ctx.beginPath(); ctx.arc(px, py, 2 + t * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,149,163,${0.35 * (1 - t * 0.5)})`;
        ctx.fill();
      }

      // profilo temperatura: valore in alto, segno in basso
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(236,228,208,0.55)";
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText("ΔT suolo→300 m: " + (dTof(i) >= 0 ? "+" : "−") + fmt(Math.abs(dTof(i)), 1) + " °C", w * 0.05, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Esperimento 05 · Pioggia acida ---------- */
  const pioggiaSim = (() => {
    const canvas = document.getElementById("canvas-pioggia");
    const chipEl = document.getElementById("pioggia-chip");
    const phEl = document.getElementById("pioggia-ph");
    const depEl = document.getElementById("pioggia-dep");
    const sogliaEl = document.getElementById("pioggia-soglia");
    const slider = document.getElementById("pioggia-slider");
    const goBtn = document.getElementById("pioggia-go");
    const resetBtn = document.getElementById("pioggia-reset");
    const isVisible = trackVisibility(canvas);

    const SOGLIA = 5.0;
    let playing = false, animT = 0;

    function phOf(e) { return 5.6 - 0.02 * e; }
    function depOf(e) { return 0.5 + 0.18 * e; }

    function updateReadouts() {
      const e = +slider.value;
      phEl.textContent = fmt(phOf(e), 1);
      depEl.textContent = fmt(depOf(e), 0) + " kg";
      sogliaEl.textContent = "5,0";
      chipEl.textContent = phOf(e) < SOGLIA ? "pioggia acida" : "pioggia normale";
    }

    function reset() {
      playing = false;
      slider.value = 10;
      updateReadouts();
    }

    goBtn.addEventListener("click", () => { playing = true; animT = 0; });
    resetBtn.addEventListener("click", reset);

    function update(dt) {
      if (!isVisible()) return;
      if (playing) {
        animT += dt;
        const e = Math.round(lerp(+slider.value, 65, clamp(animT / 4, 0, 1)));
        slider.value = e;
        if (e >= 65) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const e = +slider.value;
      const ph = phOf(e);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0b101c"); bg.addColorStop(1, "#131c2c");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // nube
      ctx.fillStyle = "rgba(127,208,198,0.22)";
      ctx.beginPath();
      ctx.arc(w * 0.35, h * 0.16, 22, 0, Math.PI * 2);
      ctx.arc(w * 0.45, h * 0.12, 26, 0, Math.PI * 2);
      ctx.arc(w * 0.55, h * 0.16, 22, 0, Math.PI * 2);
      ctx.fill();

      // molecole SO2/NOx nella nube
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(240,180,90,0.75)";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("SO₂", w * 0.42, h * 0.10);
      ctx.fillText("NOₓ", w * 0.53, h * 0.10);
      ctx.fillStyle = "rgba(240,180,90,0.5)";
      ctx.fillText("H₂SO₄ · HNO₃", w * 0.5, h * 0.22);

      // gocce: colore dal pH (più acide = più arancio/rosso)
      const acidTint = clamp((5.6 - ph) / 1.4, 0, 1);
      const drops = 16;
      for (let k = 0; k < drops; k++) {
        const x = w * (0.2 + (k / drops) * 0.6);
        const y = h * 0.28 + (k % 4) * (h * 0.11) + Math.sin(k * 2.7) * 6;
        ctx.beginPath(); ctx.ellipse(x, y, 2.4, 3.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = acidTint > 0.3 ? `rgba(240,150,90,${0.5 + acidTint * 0.4})` : `rgba(127,208,198,${0.55})`;
        ctx.fill();
      }

      // gauge del pH
      const gaugeX = w * 0.82, gaugeY = h * 0.3, gaugeH = h * 0.5;
      const pHMax = 7, pHMin = 3;
      for (let p = 3; p < 7; p += 0.05) {
        const t = (p - pHMin) / (pHMax - pHMin);
        const r = Math.round(lerp(240, 127, t));
        const g = Math.round(lerp(150, 208, t));
        const b = Math.round(lerp(90, 198, t));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(gaugeX - 8, gaugeY + gaugeH * (1 - t), 16, gaugeH / 80 + 1);
      }
      const phT = (ph - pHMin) / (pHMax - pHMin);
      const phY = gaugeY + gaugeH * (1 - phT);
      ctx.strokeStyle = "#f7d49a"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(gaugeX - 16, phY); ctx.lineTo(gaugeX + 16, phY); ctx.stroke();
      ctx.fillStyle = "#f7d49a"; ctx.font = "12px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText("pH " + fmt(ph, 1), gaugeX + 20, phY);

      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(236,228,208,0.55)";
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText("pioggia naturale ≈ pH 5,6 · acida < 5,0", w * 0.05, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Esperimento 06 · Sorgenti ---------- */
  const sorgentiSim = (() => {
    const canvas = document.getElementById("canvas-sorgenti");
    const chipEl = document.getElementById("sorgenti-chip");
    const heatEl = document.getElementById("sorgenti-heat");
    const trafficEl = document.getElementById("sorgenti-traffic");
    const natEl = document.getElementById("sorgenti-nat");
    const slider = document.getElementById("sorgenti-slider");
    const goBtn = document.getElementById("sorgenti-go");
    const resetBtn = document.getElementById("sorgenti-reset");
    const isVisible = trackVisibility(canvas);

    let playing = false, animT = 0;

    function shares(t) {
      const heat = lerp(34, 15, t);
      const traffic = lerp(26, 32, t);
      const nat = lerp(12, 22, t);
      const other = 100 - heat - traffic - nat;
      return { heat, traffic, nat, other };
    }

    function updateReadouts() {
      const t = +slider.value;
      const s = shares(t);
      heatEl.textContent = Math.round(s.heat) + " %";
      trafficEl.textContent = Math.round(s.traffic) + " %";
      natEl.textContent = Math.round(s.nat) + " %";
      chipEl.textContent = t < 0.5 ? "stagione invernale" : "stagione estiva";
    }

    function reset() {
      playing = false;
      slider.value = 0;
      updateReadouts();
    }

    goBtn.addEventListener("click", () => { playing = true; animT = 0; });
    resetBtn.addEventListener("click", () => { playing = false; slider.value = 0; updateReadouts(); });

    function update(dt) {
      if (!isVisible()) return;
      if (playing) {
        animT += dt;
        const t = Math.round(lerp(+slider.value, 1, clamp(animT / 4, 0, 1)) * 100) / 100;
        slider.value = t;
        if (t >= 1) playing = false;
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const t = +slider.value;
      const s = shares(t);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0e141e"); bg.addColorStop(1, "#101828");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const cx = w / 2, cy = h * 0.42, R = Math.min(w, h) * 0.26;

      // anello del donut
      const segments = [
        { v: s.heat, color: "#f0b45a", label: "riscaldamento + industria" },
        { v: s.traffic, color: "#7fd0c6", label: "traffico" },
        { v: s.nat, color: "#c9c2ae", label: "polveri naturali" },
        { v: s.other, color: "#5b6472", label: "secondario organico" }
      ];
      const total = segments.reduce((a, x) => a + x.v, 0);
      let a0 = -Math.PI / 2;
      for (const seg of segments) {
        const ang = (seg.v / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, a0, a0 + ang);
        ctx.closePath();
        ctx.fillStyle = seg.color;
        ctx.fill();
        a0 += ang;
      }
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = bg; ctx.fill();

      // leggenda
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      let ly = h * 0.78;
      for (const seg of segments) {
        ctx.fillStyle = seg.color;
        ctx.fillRect(w * 0.2, ly - 9, 12, 12);
        ctx.fillStyle = "rgba(236,228,208,0.75)";
        ctx.fillText(seg.label + " — " + Math.round(seg.v) + " %", w * 0.2 + 18, ly);
        ly += 22;
      }

      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(236,228,208,0.5)";
      ctx.fillText("apportionment del PM2,5 urbano · " + (t < 0.5 ? "inverno" : "estate"), w * 0.05, h - 8);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Quiz ---------- */

  const QUIZ = [
    {
      q: "Cosa misura un contatore ottico di PM2,5?",
      opts: ["Una massa di particelle < 2,5 µm, ora per ora", "La quantità di nebbia nell'aria", "L'umidità relativa dell'atmosfera"],
      correct: 0,
      fb: "Il contatore pesa le particelle più piccole di 2,5 micrometri. La foschia è vapore acqueo; il PM2,5 è materia — e si misura."
    },
    {
      q: "Qual è la guida dell'OMS per il PM2,5 in 24 ore (2021)?",
      opts: ["15 µg/m³", "5 µg/m³", "150 µg/m³"],
      correct: 0,
      fb: "La guida per 24 ore è 15 µg/m³; quella annuale è 5. In molte città europee d'inverno la media giornaliera li supera regolarmente."
    },
    {
      q: "Perché con vento forte la concentrazione al suolo del fumo di un camino scende?",
      opts: ["Il vento diluisce il pennacchio in più aria", "Il fumo diventa più pesante", "Il camino smette di emettere"],
      correct: 0,
      fb: "Il pennacchio si allarga e si diluisce col vento: la stessa massa di inquinante si sparpaglia in un volume maggiore. Con vento debole, il massimo al suolo sale."
    },
    {
      q: "L'ozono troposferico (quello dello smog estivo) come si forma?",
      opts: ["Dagli ossidi di azoto delle auto, con la luce solare", "Dai vulcani in eruzione", "È l'ozono che ci protegge dai raggi UV"],
      correct: 0,
      fb: "Il NO₂ delle auto, scisso dalla luce, innesca la catena che produce ozono al suolo. È lo stesso O₃ che in stratosfera ci protegge — ma respirato è uno smog."
    },
    {
      q: "In un'inversione termica invernale, l'aria in quota è…",
      opts: ["più calda del suolo: lo smog resta imprigionato", "più fredda del suolo: il fumo sale", "uguale al suolo: nessun effetto"],
      correct: 0,
      fb: "Normalmente l'aria scende di ~6,5 °C/km con la quota. Quando uno strato caldo sta sopra aria fredda, il fumo non sale: il PM si accumula al suolo, triplicando in una notte."
    },
    {
      q: "Il pH della pioggia naturale è circa…",
      opts: ["5,6 — leggermente acido per la CO₂", "7,0 — neutro", "8,5 — basico"],
      correct: 0,
      fb: "La CO₂ dell'aria sciolta nelle gocce porta il pH a 5,6. Con gli ossidi di zolfo e azoto scende sotto 5: negli anni '80 in Europa si misurava fino a 4,3."
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
    pm25Sim.update(dt);
    pm25Sim.draw();
    pennacchioSim.update(dt);
    pennacchioSim.draw();
    ozonoSim.update(dt);
    ozonoSim.draw();
    inversioneSim.update(dt);
    inversioneSim.draw();
    pioggiaSim.update(dt);
    pioggiaSim.draw();
    sorgentiSim.update(dt);
    sorgentiSim.draw();
    requestAnimationFrame(loop);
  }

  /* ---------- Boot ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initQuiz();
    requestAnimationFrame(loop);
  });
})();