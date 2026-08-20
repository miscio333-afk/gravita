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

  function fmtInt(n) {
    return Math.round(n).toLocaleString("it-IT");
  }

  const SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
  function fmtSci(x) {
    if (x === 0) return "0";
    const exp = Math.floor(Math.log10(Math.abs(x)));
    const mant = x / Math.pow(10, exp);
    const m = mant.toFixed(2).replace(".", ",");
    const e = String(exp).split("").map(c => SUP[c] || c).join("");
    return `${m} × 10${e} eV`;
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

  /* ---------- Esperimento 01 · Spettro ---------- */
  const spettroSim = (() => {
    const canvas = document.getElementById("canvas-spettro");
    const chipEl = document.getElementById("spettro-chip");
    const freqEl = document.getElementById("spettro-freq");
    const waveEl = document.getElementById("spettro-wave");
    const regionEl = document.getElementById("spettro-region");
    const slider = document.getElementById("spettro-slider");
    const goBtn = document.getElementById("spettro-go");
    const resetBtn = document.getElementById("spettro-reset");
    const isVisible = trackVisibility(canvas);

    let placed = false;
    goBtn.addEventListener("click", () => { placed = true; });
    resetBtn.addEventListener("click", () => { placed = false; });

    const BANDS = [
      { lo: 7.5, hi: 9.0, label: "radio", color: "#3f6f6b" },
      { lo: 9.0, hi: 11.2, label: "microonde", color: "#f0b45a" },
      { lo: 11.2, hi: 14.0, label: "infrarosso", color: "#e0894f" },
      { lo: 14.0, hi: 14.95, label: "visibile", color: "#7fd0c6" },
      { lo: 14.95, hi: 16.2, label: "ultravioletto", color: "#8f7fd0" },
      { lo: 16.2, hi: 19.0, label: "raggi X", color: "#c67fd0" },
      { lo: 19.0, hi: 20.5, label: "raggi γ", color: "#f0666a" }
    ];

    function freqInfo(fMHz) {
      const fHz = fMHz * 1e6;
      const wl = 299792458 / fHz;   // metri
      const ghz = fMHz / 1000;
      const region = ghz <= 1 ? "radio · non ionizzante"
        : ghz <= 30 ? "microonde · non ionizzante"
        : "onde millimetriche · non ionizzante";
      let wlStr;
      if (wl >= 1) wlStr = `${(wl).toFixed(1).replace(".", ",")} m`;
      else if (wl >= 0.01) wlStr = `${(wl * 100).toFixed(1).replace(".", ",")} cm`;
      else wlStr = `${(wl * 1000).toFixed(1).replace(".", ",")} mm`;
      return { ghz, wlStr, region };
    }

    function update(dt) {
      if (!isVisible()) return;
      const fMHz = +slider.value;
      const { ghz, wlStr, region } = freqInfo(fMHz);
      freqEl.textContent = `${ghz.toFixed(1).replace(".", ",")} GHz`;
      waveEl.textContent = wlStr;
      regionEl.textContent = region;
      chipEl.textContent = placed ? `posizionato · ${ghz.toFixed(1).replace(".", ",")} GHz · microonde` : "sposta il cursore";
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const lo = 7.5, hi = 20.5;
      const x = (lg) => w * 0.05 + ((lg - lo) / (hi - lo)) * w * 0.9;
      const barY = h * 0.55, barH = 30;

      // bande
      for (const b of BANDS) {
        const bx = x(b.lo), bw = x(b.hi) - x(b.lo);
        ctx.fillStyle = b.color;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(bx, barY, bw, barH);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(236,228,208,.2)";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, barY, bw, barH);
      }

      // etichette bande
      ctx.font = "9px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(236,228,208,.75)";
      for (const b of BANDS) {
        const bx = x(b.lo), bw = x(b.hi) - x(b.lo);
        ctx.save();
        ctx.translate(bx + bw / 2, barY + barH + 12);
        ctx.rotate(-0.35);
        ctx.fillText(b.label, 0, 0);
        ctx.restore();
      }

      // marker del 5G
      const fMHz = +slider.value;
      const mx = x(Math.log10(fMHz * 1e6));
      ctx.strokeStyle = "#f0b45a";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx, barY - 14); ctx.lineTo(mx, barY + barH + 8); ctx.stroke();
      ctx.fillStyle = "#f0b45a";
      ctx.beginPath();
      ctx.moveTo(mx, barY - 18); ctx.lineTo(mx - 6, barY - 8); ctx.lineTo(mx + 6, barY - 8);
      ctx.closePath(); ctx.fill();

      // linea ionizzante
      const uvX = x(14.95);
      ctx.strokeStyle = "rgba(240,102,106,.7)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(uvX, barY - 20); ctx.lineTo(uvX, barY + barH + 8); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(240,102,106,.9)";
      ctx.font = "9px 'IBM Plex Mono', monospace";
      ctx.fillText("qui inizia l'ionizzazione", uvX, barY - 24);

      // didascalia
      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("log (frequenza, Hz) · il 5G è in fondo, sotto la luce", w * 0.5, h - 10);
    }

    return { update, draw };
  })();

  /* ---------- Esperimento 02 · Fotone ---------- */
  const fotoneSim = (() => {
    const canvas = document.getElementById("canvas-fotone");
    const chipEl = document.getElementById("fotone-chip");
    const eEl = document.getElementById("fotone-e");
    const termEl = document.getElementById("fotone-term");
    const bondEl = document.getElementById("fotone-bond");
    const slider = document.getElementById("fotone-slider");
    const goBtn = document.getElementById("fotone-go");
    const resetBtn = document.getElementById("fotone-reset");
    const isVisible = trackVisibility(canvas);

    const H = 6.626e-34, Q = 1.602e-19, KT = 0.0379;
    let measured = false;
    goBtn.addEventListener("click", () => { measured = true; });
    resetBtn.addEventListener("click", () => { measured = false; });

    function energy(fMHz) {
      return (H * fMHz * 1e6) / Q;
    }

    function update(dt) {
      if (!isVisible()) return;
      const fMHz = +slider.value;
      const E = energy(fMHz);
      const ratio = KT / E;
      const need = 1 / E;
      eEl.textContent = fmtSci(E);
      termEl.textContent = `il calore a 20 °C vale ${fmtInt(ratio)}× più`;
      bondEl.textContent = `≈ ${fmtInt(need)} fotoni`;
      chipEl.textContent = measured ? `misurato · ${fmtSci(E)} · troppo debole per un legame` : "sposta il cursore";
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const lo = -6.2, hi = 2.2;
      const x = (le) => w * 0.08 + ((le - lo) / (hi - lo)) * w * 0.84;
      const barY = h * 0.5, barH = 30;

      // scala logaritmica dell'energia (eV)
      const grad = ctx.createLinearGradient(x(lo), 0, x(hi), 0);
      grad.addColorStop(0, "#3f6f6b");
      grad.addColorStop(0.35, "#7fd0c6");
      grad.addColorStop(0.6, "#f0b45a");
      grad.addColorStop(1, "#f0666a");
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(x(lo), barY, x(hi) - x(lo), barH);
      ctx.globalAlpha = 1;

      // marker fotone 5G
      const fMHz = +slider.value;
      const E = energy(fMHz);
      const mx = x(Math.log10(E));
      ctx.strokeStyle = "#7fd0c6";
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(mx, barY - 12); ctx.lineTo(mx, barY + barH + 8); ctx.stroke();
      ctx.fillStyle = "#7fd0c6";
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillText("fotone 5G", mx, barY - 18);

      // riferimenti: termico, legame, ionizzazione
      const marks = [
        { val: 0.0379, label: "calore 20 °C", color: "#f0b45a" },
        { val: 1, label: "legame chimico", color: "#ece4d0" },
        { val: 12.6, label: "ionizzazione acqua", color: "#f0666a" }
      ];
      for (const m of marks) {
        const lx = x(Math.log10(m.val));
        ctx.strokeStyle = m.color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(lx, barY - 12); ctx.lineTo(lx, barY + barH + 8); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = m.color;
        ctx.font = "9px 'IBM Plex Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(m.label, lx, barY + barH + 16);
      }

      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("energia (eV, scala log) · il fotone 5G non raggiunge un legame", w * 0.5, h - 10);
    }

    return { update, draw };
  })();

  /* ---------- Esperimento 03 · Pelle ---------- */
  const pelleSim = (() => {
    const canvas = document.getElementById("canvas-pelle");
    const chipEl = document.getElementById("pelle-chip");
    const depthEl = document.getElementById("pelle-depth");
    const powerEl = document.getElementById("pelle-power");
    const organEl = document.getElementById("pelle-organ");
    const slider = document.getElementById("pelle-slider");
    const goBtn = document.getElementById("pelle-go");
    const resetBtn = document.getElementById("pelle-reset");
    const isVisible = trackVisibility(canvas);

    let ran = false;
    goBtn.addEventListener("click", () => { ran = true; });
    resetBtn.addEventListener("click", () => { ran = false; });

    function skinDepth(fGHz) {
      // ~1 mm a 28 GHz, diminuisce con 1/sqrt(f)
      return 5.29 / Math.sqrt(fGHz);
    }

    function update(dt) {
      if (!isVisible()) return;
      const fGHz = +slider.value;
      const d = skinDepth(fGHz);
      const pow1 = Math.exp(-1 / d);   // potenza residua a 1 mm
      depthEl.textContent = `${d.toFixed(2).replace(".", ",")} mm`;
      powerEl.textContent = `${(pow1 * 100).toFixed(0).replace(".", ",")} %`;
      organEl.textContent = "no · si ferma in epidermide e derma";
      chipEl.textContent = ran ? `onda a ${fGHz} GHz · δ = ${d.toFixed(2).replace(".", ",")} mm` : "sposta la frequenza";
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const fGHz = +slider.value;
      const d = skinDepth(fGHz);
      const scale = (mm) => w * 0.16 + (mm / 3.5) * w * 0.72;   // 0..3.5 mm
      const skinY = h * 0.55, skinH = h * 0.24;

      // strati di pelle
      ctx.fillStyle = "#2a2418";
      ctx.fillRect(scale(0), skinY, scale(3.5) - scale(0), skinH);
      ctx.fillStyle = "#3a2f1d";
      ctx.fillRect(scale(0), skinY, scale(0.1) - scale(0), skinH);
      ctx.fillStyle = "#241f16";
      ctx.fillRect(scale(0.1), skinY, scale(2) - scale(0.1), skinH);
      ctx.strokeStyle = "rgba(236,228,208,.25)";
      ctx.lineWidth = 1;
      ctx.strokeRect(scale(0), skinY, scale(3.5) - scale(0), skinH);

      // etichette strati
      ctx.font = "9px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#7fd0c6";
      ctx.fillText("epidermide 0,1 mm", (scale(0) + scale(0.1)) / 2, skinY - 6);
      ctx.fillStyle = "rgba(236,228,208,.7)";
      ctx.fillText("derma 2 mm", (scale(0.1) + scale(2)) / 2, skinY - 6);
      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.fillText("sottocute", (scale(2) + scale(3.5)) / 2, skinY - 6);

      // onda che decade (potenza)
      ctx.strokeStyle = "#f0b45a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let mm = 0; mm <= 3.5; mm += 0.02) {
        const x = scale(mm);
        const y = skinY - 8 - Math.exp(-mm / d) * h * 0.16;
        if (mm === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // linea di penetrazione δ
      const dx = scale(d);
      ctx.strokeStyle = "rgba(127,208,198,.9)";
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(dx, skinY - h * 0.2); ctx.lineTo(dx, skinY + skinH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#7fd0c6";
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillText(`δ = ${d.toFixed(2).replace(".", ",")} mm`, dx, skinY - h * 0.2 - 6);

      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("potenza dell'onda (curva) · la pelle la assorbe nei primi millimetri", w * 0.5, h - 10);
    }

    return { update, draw };
  })();

  /* ---------- Esperimento 04 · Antenne ---------- */
  const antenneSim = (() => {
    const canvas = document.getElementById("canvas-antenne");
    const chipEl = document.getElementById("antenne-chip");
    const pdEl = document.getElementById("antenne-pd");
    const pctEl = document.getElementById("antenne-pct");
    const ofcomEl = document.getElementById("antenne-ofcom");
    const slider = document.getElementById("antenne-slider");
    const goBtn = document.getElementById("antenne-go");
    const resetBtn = document.getElementById("antenne-reset");
    const isVisible = trackVisibility(canvas);

    const P = 100;      // potenza equivalente isotropa (W, tipica)
    const LIMIT = 10;   // W/m², riferimento ICNIRP pubblico
    let measured = false;
    goBtn.addEventListener("click", () => { measured = true; });
    resetBtn.addEventListener("click", () => { measured = false; });

    function update(dt) {
      if (!isVisible()) return;
      const r = +slider.value;
      const pd = P / (4 * Math.PI * r * r);
      const pct = (pd / LIMIT) * 100;
      pdEl.textContent = pd >= 0.001
        ? `${pd.toFixed(3).replace(".", ",")} W/m²`
        : `${(pd * 1000).toFixed(2).replace(".", ",")} mW/m²`;
      pctEl.textContent = pct < 0.01
        ? `${pct.toFixed(4).replace(".", ",")} %`
        : `${pct.toFixed(2).replace(".", ",")} %`;
      chipEl.textContent = measured ? `misurato a ${r} m · ${pct.toFixed(2).replace(".", ",")} % del limite` : "sposta la distanza";
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const r = +slider.value;
      const tx = w * 0.12;
      const ty = h * 0.5;
      const logMin = Math.log10(5), logMax = Math.log10(500);
      const px = w * 0.12 + ((Math.log10(r) - logMin) / (logMax - logMin)) * w * 0.72;
      const py = h * 0.78;

      // torre
      ctx.strokeStyle = "#f0b45a";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tx, ty + 20); ctx.lineTo(tx, ty - 40); ctx.stroke();
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(tx, ty - 30 + i * 10); ctx.lineTo(tx + 12, ty - 34 + i * 10); ctx.stroke();
      }
      ctx.fillStyle = "#f0b45a";
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("antenna", tx, ty - 48);

      // cerchi di intensità (decadimento)
      for (let i = 1; i <= 4; i++) {
        const rr = (i / 4) * w * 0.7;
        ctx.beginPath(); ctx.arc(tx, ty, rr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(127,208,198,${0.06 + i * 0.015})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // persona alla distanza scelta
      ctx.fillStyle = "#7fd0c6";
      ctx.beginPath(); ctx.arc(px, py - 16, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#7fd0c6";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, py - 10); ctx.lineTo(px, py + 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px - 5, py - 6); ctx.lineTo(px + 5, py - 6); ctx.stroke();
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(px, py - 12); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#7fd0c6";
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillText(`${r} m`, px, py + 16);

      // barra % del limite
      const pd = P / (4 * Math.PI * r * r);
      const pct = (pd / LIMIT) * 100;
      const barW = w * 0.5, bx = w * 0.25, by = h * 0.16;
      ctx.fillStyle = "rgba(236,228,208,.1)";
      ctx.fillRect(bx, by, barW, 10);
      ctx.fillStyle = "#f0b45a";
      ctx.fillRect(bx, by, Math.max(1, barW * Math.min(pct / 10, 1)), 10);
      ctx.fillStyle = "rgba(236,228,208,.7)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`limit ICNIRP 10 W/m² · qui: ${pct.toFixed(2).replace(".", ",")} %`, bx, by - 8);

      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.textAlign = "center";
      ctx.fillText("densità di potenza ∝ 1 / distanza² · l'energia si disperde subito", w * 0.5, h - 10);
    }

    return { update, draw };
  })();

  /* ---------- Esperimento 05 · COVID ---------- */
  const covidSim = (() => {
    const canvas = document.getElementById("canvas-covid");
    const chipEl = document.getElementById("covid-chip");
    const casesEl = document.getElementById("covid-cases");
    const sitesEl = document.getElementById("covid-sites");
    const attacksEl = document.getElementById("covid-attacks");
    const slider = document.getElementById("covid-slider");
    const goBtn = document.getElementById("covid-go");
    const resetBtn = document.getElementById("covid-reset");
    const isVisible = trackVisibility(canvas);

    // mesi 0..12 = gen 2020 .. gen 2021 (dati indicativi, UK)
    const CASES = [0, 20, 40, 120, 180, 270, 320, 400, 530, 750, 1100, 1700, 2600];  // migliaia
    const SITES = [250, 1000, 2000, 3000, 4500, 6000, 8000, 10000, 13000, 16000, 20000, 24000, 30000];
    let ran = false;
    goBtn.addEventListener("click", () => { ran = true; });
    resetBtn.addEventListener("click", () => { ran = false; });

    function update(dt) {
      if (!isVisible()) return;
      const m = +slider.value;
      casesEl.textContent = `${fmtInt(CASES[m])} migliaia`;
      sitesEl.textContent = fmtInt(SITES[m]);
      attacksEl.textContent = "159";
      chipEl.textContent = ran ? `mese ${m} · entrambe salgono · causalità: 0` : "sposta il mese";
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const ox = w * 0.1, oy = h * 0.62;
      const gw = w * 0.8, gh = h * 0.38;
      const maxM = 12;

      // assi
      ctx.strokeStyle = "rgba(236,228,208,.25)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + gw, oy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy - gh); ctx.stroke();

      // due curve normalizzate al proprio massimo
      const plot = (data, col) => {
        const max = Math.max(...data);
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath();
        for (let m = 0; m <= maxM; m++) {
          const x = ox + (m / maxM) * gw;
          const y = oy - (data[m] / max) * gh;
          if (m === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };
      plot(CASES, "#f0b45a");
      plot(SITES, "#7fd0c6");

      // picchi degli attacchi (aprile-maggio 2020)
      ctx.fillStyle = "rgba(240,102,106,.85)";
      for (const m of [3, 4, 5]) {
        const x = ox + (m / maxM) * gw;
        ctx.beginPath(); ctx.arc(x, oy - 10 - m * 3, 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "rgba(240,102,106,.9)";
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText("incendi antenne (apr–mag 2020)", ox + (4 / maxM) * gw + 8, oy - 26);

      // marker mese corrente
      const m = +slider.value;
      const mx = ox + (m / maxM) * gw;
      ctx.strokeStyle = "#ece4d0";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(mx, oy - gh); ctx.lineTo(mx, oy); ctx.stroke();

      // legenda
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = "#f0b45a";
      ctx.fillText("COVID (casi cumulativi)", ox, h * 0.12);
      ctx.fillStyle = "#7fd0c6";
      ctx.fillText("siti 5G", ox, h * 0.12 + 16);

      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.textAlign = "center";
      ctx.fillText("due curve che salgono insieme · correlazione ≠ causalità", w * 0.5, h - 10);
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
      realeEl.textContent = "1 · Ofcom 2020 (0,039%)";
      chipEl.textContent = ran ? "bilancio chiuso · danno dimostrato: 0" : "conto in sospeso";
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

      // anello: rivendicazioni di danno (3)
      ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
      ctx.strokeStyle = "rgba(240,180,90,.7)"; ctx.lineWidth = 22;
      ctx.stroke();

      // segmento verde: misura reale (1/3 dell'anello)
      ctx.beginPath();
      ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 0.667);
      ctx.strokeStyle = "#7fd0c6"; ctx.lineWidth = 22;
      ctx.stroke();

      ctx.fillStyle = "#ece4d0";
      ctx.font = "900 40px 'Fraunces', Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("0", cx, cy - 4);
      ctx.fillStyle = "rgba(236,228,208,.6)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("danni dimostrati", cx, cy + 22);

      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.fillText("rivendicazioni esaminate: " + n + " · danni dimostrati: 0 · l'unica misura è Ofcom", w * 0.5, h - 10);
    }

    return { update, draw };
  })();

  /* ---------- Quiz ---------- */

  const QUIZ = [
    {
      q: "A 3,5 GHz, l'energia di un fotone 5G è…",
      opts: ["circa 1,45 × 10⁻⁵ eV", "circa 12,6 eV", "circa 1 eV"],
      correct: 0,
      fb: "Il fotone 5G porta 1,45 × 10⁻⁵ eV: milioni di volte sotto i 12,6 eV necessari a ionizzare l'acqua. Non può rompere un legame chimico."
    },
    {
      q: "Rispetto all'energia termica a 20 °C, il fotone 5G più energetico (52,6 GHz) è…",
      opts: ["~174 volte più debole", "~174 volte più forte", "uguale"],
      correct: 0,
      fb: "Il calore dell'ambiente a 20 °C (0,0379 eV) vale circa 174 volte il fotone 5G più energetico. Se il calore non danneggia le cellule, il 5G non può nemmeno cominciare."
    },
    {
      q: "A 28 GHz, un'onda millimetrica penetra nella pelle per…",
      opts: ["circa 1 millimetro, fermandosi in epidermide e derma", "decine di centimetri, fino agli organi", "solo 0,001 millimetri"],
      correct: 0,
      fb: "La profondità di penetrazione a 28 GHz è circa 1 mm: l'energia si esaurisce nei primi strati della pelle, senza raggiungere organi o sangue."
    },
    {
      q: "Nelle misure di Ofcom (aprile 2020), i soli segnali 5G valevano…",
      opts: ["lo 0,039% dei limiti di sicurezza", "il 50% dei limiti", "il 200% dei limiti"],
      correct: 0,
      fb: "Ofcom ha misurato 22 siti in 10 città: il massimo di tutte le tecnologie era l'1,5% del limite; la sola parte 5G valeva lo 0,039%."
    },
    {
      q: "Molte antenne incendiate nel Regno Unito nel 2020…",
      opts: ["non erano antenne 5G", "trasmettevano solo 5G a piena potenza", "erano tutte stazioni 5G di nuova generazione"],
      correct: 0,
      fb: "La torre bruciata a Birmingham trasmetteva solo 2G/3G/4G, e così altre torri danneggiate. Bruciare antenne ha colpito spesso reti che non erano 5G."
    },
    {
      q: "Nel 2020 i casi di COVID e i siti 5G crescevano insieme. Questo dimostra…",
      opts: ["correlazione, non causalità", "che il 5G causa il COVID", "che il COVID causa la diffusione del 5G"],
      correct: 0,
      fb: "Due curve che salgono insieme dimostrano solo una coincidenza temporale. Il COVID ha colpito ovunque, 5G o no: i dati non mostrano alcun legame causale."
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
    spettroSim.update(dt);
    spettroSim.draw();
    fotoneSim.update(dt);
    fotoneSim.draw();
    pelleSim.update(dt);
    pelleSim.draw();
    antenneSim.update(dt);
    antenneSim.draw();
    covidSim.update(dt);
    covidSim.draw();
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