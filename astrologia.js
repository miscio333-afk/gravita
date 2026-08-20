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
  function fmtSci(x, unit) {
    if (x === 0) return "0" + (unit ? " " + unit : "");
    const exp = Math.floor(Math.log10(Math.abs(x)));
    const mant = x / Math.pow(10, exp);
    const m = mant.toFixed(2).replace(".", ",");
    const e = String(exp).split("").map(c => SUP[c] || c).join("");
    return `${m} × 10${e}${unit ? " " + unit : ""}`;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
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

  /* ---------- Esperimento 01 · Forza in sala parto ---------- */
  const forzaSim = (() => {
    const canvas = document.getElementById("canvas-forza");
    const chipEl = document.getElementById("forza-chip");
    const marteEl = document.getElementById("forza-marte");
    const docEl = document.getElementById("forza-doc");
    const terraEl = document.getElementById("forza-terra");
    const slider = document.getElementById("forza-slider");
    const goBtn = document.getElementById("forza-go");
    const resetBtn = document.getElementById("forza-reset");
    const isVisible = trackVisibility(canvas);

    const G = 6.674e-11, MM = 6.417e23, MB = 3.5, MD = 70, RD = 1, G9 = 9.81;
    const FD = (G * MD * MB) / (RD * RD);   // 1,635 × 10⁻⁸ N
    const FE = MB * G9;                     // 34,335 N

    let placed = false;
    goBtn.addEventListener("click", () => { placed = true; });
    resetBtn.addEventListener("click", () => { placed = false; });

    function fMars(rMkm) {
      const r = rMkm * 1e9;
      return (G * MM * MB) / (r * r);
    }
    function ratioStr(a, b) {
      const r = a / b;
      return r >= 10 ? `~${fmtInt(r)}× Marte` : `~${r.toFixed(1).replace(".", ",")}× Marte`;
    }

    function update(dt) {
      if (!isVisible()) return;
      const r = +slider.value;
      const FM = fMars(r);
      const rT = FE / FM;
      marteEl.textContent = fmtSci(FM, "N");
      docEl.textContent = `${fmtSci(FD, "N")} · ${ratioStr(FD, FM)}`;
      terraEl.textContent = rT >= 1e6
        ? `${FE.toFixed(1).replace(".", ",")} N · ≈ ${fmtSci(rT, "")}× Marte`
        : `${FE.toFixed(1).replace(".", ",")} N · ~${fmtInt(rT)}× Marte`;
      chipEl.textContent = placed
        ? `pesato · a ${r} milioni di km, Marte tira ${fmtSci(FM, "N")}`
        : "sposta la distanza";
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const r = +slider.value;
      const FM = fMars(r);
      const bx = w * 0.5, by = h * 0.72;
      const dx = w * 0.24, dy = h * 0.6;
      const logMin = Math.log10(55), logMax = Math.log10(400);
      const mx = lerp(w * 0.5, w * 0.9, (Math.log10(r) - logMin) / (logMax - logMin));
      const my = h * 0.26;

      // pavimento
      ctx.strokeStyle = "rgba(236,228,208,.18)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, h * 0.84); ctx.lineTo(w, h * 0.84); ctx.stroke();

      // neonato (al centro)
      ctx.fillStyle = "#ece4d0";
      ctx.beginPath(); ctx.arc(bx, by - 16, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bx, by, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f0b45a";
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("neonato", bx, by + 24);

      // ostetrica (sinistra)
      ctx.strokeStyle = "#7fd0c6";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(dx, dy - 14, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dx, dy - 7); ctx.lineTo(dx, dy + 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dx - 6, dy - 2); ctx.lineTo(dx + 6, dy - 2); ctx.stroke();
      ctx.fillStyle = "#7fd0c6";
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("ostetrica", dx, dy + 22);

      // Marte (destra, distanza via slider)
      ctx.fillStyle = "#f0b45a";
      ctx.beginPath(); ctx.arc(mx, my, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(240,180,90,.35)";
      ctx.beginPath(); ctx.arc(mx, my, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#f0b45a";
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillText("Marte", mx, my - 16);
      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.fillText(`${r} Mkm`, mx, my + 24);

      // frecce di forza (lunghezza ∝ log della forza relativa)
      const len = (F) => clamp(Math.log10(F) + 8, 6, w * 0.3);
      const arrow = (x0, y0, x1, y1, col, label) => {
        const ang = Math.atan2(y1 - y0, x1 - x0);
        const L = Math.hypot(x1 - x0, y1 - y0);
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - 8 * Math.cos(ang - 0.4), y1 - 8 * Math.sin(ang - 0.4));
        ctx.lineTo(x1 - 8 * Math.cos(ang + 0.4), y1 - 8 * Math.sin(ang + 0.4));
        ctx.closePath(); ctx.fillStyle = col; ctx.fill();
        if (label) {
          ctx.fillStyle = col;
          ctx.font = "10px 'IBM Plex Mono', monospace";
          ctx.fillText(label, (x0 + x1) / 2, (y0 + y1) / 2 - 6);
        }
      };
      arrow(bx, by - 6, bx - len(FD), by - 6, "#7fd0c6", `F ostetrica · ${fmtSci(FD, "N")}`);
      arrow(bx, by - 6, bx + len(FM), by - 6, "#f0b45a", `F Marte · ${fmtSci(FM, "N")}`);

      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("forza gravitazionale F = G·m₁·m₂/d² · la geometria vince sulla massa", w * 0.5, h - 10);
    }

    return { update, draw };
  })();

  /* ---------- Esperimento 02 · Carlson 1985 ---------- */
  const carlsonSim = (() => {
    const canvas = document.getElementById("canvas-carlson");
    const chipEl = document.getElementById("carlson-chip");
    const hitEl = document.getElementById("carlson-hit");
    const pctEl = document.getElementById("carlson-pct");
    const attesoEl = document.getElementById("carlson-atteso");
    const slider = document.getElementById("carlson-slider");
    const goBtn = document.getElementById("carlson-go");
    const resetBtn = document.getElementById("carlson-reset");
    const isVisible = trackVisibility(canvas);

    let measured = false;
    goBtn.addEventListener("click", () => { measured = true; });
    resetBtn.addEventListener("click", () => { measured = false; });

    function rollHits(n) {
      const rng = mulberry32(n * 7919 + 13);
      let c = 0;
      for (let i = 0; i < n; i++) { if (rng() < 1 / 3) c++; }
      return c;
    }

    function update(dt) {
      if (!isVisible()) return;
      const n = +slider.value;
      const h = rollHits(n);
      const p = n === 0 ? 0 : (h / n) * 100;
      hitEl.textContent = n === 0 ? "0 su 0" : `${h} su ${n}`;
      pctEl.textContent = n === 0 ? "—" : `${p.toFixed(1).replace(".", ",")} %`;
      attesoEl.textContent = "caso: 33,3 % · astrologi: ≥ 50 %";
      chipEl.textContent = measured
        ? `test alla cieca · ${(n ? h / n : 0).toFixed(2).replace(".", ",")} = caso`
        : "sposta il numero di temi";
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const n = +slider.value;
      const hits = rollHits(n);
      const obs = n === 0 ? 0 : hits / n;
      const rows = [
        { label: "osservato (116 temi)", val: obs, color: "#f0b45a" },
        { label: "atteso dal caso", val: 1 / 3, color: "#7fd0c6" },
        { label: "previsto dagli astrologi", val: 0.5, color: "#f0666a" }
      ];
      const barW = Math.min(w * 0.55, 320);
      const bx = w * 0.35, by0 = h * 0.26, rowH = h * 0.14;
      const maxV = 0.6;

      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left";
      rows.forEach((row, i) => {
        const y = by0 + i * rowH;
        const bw = barW * (row.val / maxV);
        ctx.fillStyle = row.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(bx, y, Math.max(2, bw), rowH * 0.4);
        ctx.globalAlpha = 1;
        ctx.fillStyle = row.color;
        ctx.fillText(`${row.label} · ${(row.val * 100).toFixed(0).replace(".", ",")} %`, bx, y - 6);
      });

      // linea del 50% (soglia dichiarata)
      const x50 = bx + barW * (0.5 / maxV);
      ctx.strokeStyle = "rgba(240,102,106,.6)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(x50, by0 - 16); ctx.lineTo(x50, by0 + 2 * rowH); ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("28 astrologi · 116 temi · 3 profili · 0,34 ± 0,044 = il caso (1985, Nature)", w * 0.5, h - 10);
    }

    return { update, draw };
  })();

  /* ---------- Esperimento 03 · Segni / Hartmann ---------- */
  const segniSim = (() => {
    const canvas = document.getElementById("canvas-segni");
    const chipEl = document.getElementById("segni-chip");
    const nEl = document.getElementById("segni-n");
    const corrEl = document.getElementById("segni-corr");
    const testEl = document.getElementById("segni-test");
    const slider = document.getElementById("segni-slider");
    const goBtn = document.getElementById("segni-go");
    const resetBtn = document.getElementById("segni-reset");
    const isVisible = trackVisibility(canvas);

    const SIGNS = ["Ariete", "Toro", "Gemelli", "Cancro", "Leone", "Vergine", "Bilancia", "Scorpione", "Sagittario", "Capricorno", "Acquario", "Pesci"];
    let ran = false;
    goBtn.addEventListener("click", () => { ran = true; });
    resetBtn.addEventListener("click", () => { ran = false; });

    function update(dt) {
      if (!isVisible()) return;
      const n = +slider.value;
      nEl.textContent = fmtInt(n);
      corrEl.textContent = "0";
      testEl.textContent = "3 · segno · elemento · genere";
      chipEl.textContent = ran
        ? `esaminati ${fmtInt(n)} soggetti · correlazione: 0`
        : "sposta i soggetti";
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const ox = w * 0.08, oy = h * 0.66;
      const gw = w * 0.84, gh = h * 0.4;
      const n = +slider.value;

      // asse y: correlazione -0,1 .. +0,1
      ctx.strokeStyle = "rgba(236,228,208,.25)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + gw, oy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, oy - gh); ctx.lineTo(ox, oy + gh * 0.25); ctx.stroke();

      // linea zero
      ctx.strokeStyle = "rgba(127,208,198,.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + gw, oy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#7fd0c6";
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText("correlazione = 0", ox + 6, oy - 8);

      // 12 barre: nessuna differisce da zero
      const rng = mulberry32(42);
      ctx.font = "9px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      for (let i = 0; i < 12; i++) {
        const cx = ox + (i + 0.5) * (gw / 12);
        const val = clamp((rng() - 0.5) * 0.016, -0.1, 0.1); // rumore sotto soglia
        const bh = (val / 0.1) * gh * 0.35;
        ctx.fillStyle = i % 2 ? "rgba(240,180,90,.5)" : "rgba(240,180,90,.28)";
        ctx.fillRect(cx - 3, Math.min(oy, oy - bh), 6, Math.abs(bh) + 1);
        ctx.fillStyle = "rgba(236,228,208,.6)";
        ctx.fillText(SIGNS[i].slice(0, 4), cx, oy + 14);
      }

      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText(`n = ${fmtInt(n)} soggetti · nessun segno differisce da zero (Hartmann, 2006)`, w * 0.5, h - 10);
    }

    return { update, draw };
  })();

  /* ---------- Esperimento 04 · Precessione ---------- */
  const precessioneSim = (() => {
    const canvas = document.getElementById("canvas-precessione");
    const chipEl = document.getElementById("precessione-chip");
    const tropEl = document.getElementById("prec-trop");
    const siderEl = document.getElementById("prec-sider");
    const scartoEl = document.getElementById("prec-scarto");
    const slider = document.getElementById("precessione-slider");
    const goBtn = document.getElementById("precessione-go");
    const resetBtn = document.getElementById("precessione-reset");
    const isVisible = trackVisibility(canvas);

    const SIGNS = ["Ariete", "Toro", "Gemelli", "Cancro", "Leone", "Vergine", "Bilancia", "Scorpione", "Sagittario", "Capricorno", "Acquario", "Pesci"];
    const TROP_IDX = 4;          // Leone, nati il 15 agosto
    const REF_YEAR = 285;        // quando tropicale e siderale coincidevano
    const PRE = 71.6;            // gradi al secolo ~ 25.800 anni per 360°

    let ran = false;
    goBtn.addEventListener("click", () => { ran = true; });
    resetBtn.addEventListener("click", () => { ran = false; });

    function offset(year) { return (year - REF_YEAR) / PRE; }

    function update(dt) {
      if (!isVisible()) return;
      const y = +slider.value;
      const off = offset(y);
      const shift = Math.round(off / 30);
      const sid = ((TROP_IDX - shift) % 12 + 12) % 12;
      tropEl.textContent = "Leone (15 agosto)";
      siderEl.textContent = SIGNS[sid];
      const scarto = Math.abs(off);
      scartoEl.textContent = `${scarto.toFixed(1).replace(".", ",")}° · circa ${Math.abs(shift)} segno${Math.abs(shift) === 1 ? "" : "i"}`;
      chipEl.textContent = ran
        ? `anno ${y} · il Sole sta in ${SIGNS[sid]} (${off.toFixed(1).replace(".", ",")}° di scarto)`
        : "sposta l'anno";
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const y = +slider.value;
      const off = offset(y);
      const segW = w * 0.86 / 12;
      const x0 = w * 0.07;
      const topY = h * 0.3, stripH = h * 0.16, bottomY = h * 0.56;
      const markerX = x0 + (TROP_IDX + 0.5) * segW;
      const xBase = x0 + (0.5 + off / 30) * segW;

      // striscia superiore (tropicale, fissa)
      ctx.font = "9px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      for (let i = 0; i < 12; i++) {
        const sx = x0 + i * segW;
        const isTrop = i === TROP_IDX;
        ctx.fillStyle = isTrop ? "#f0b45a" : "rgba(236,228,208,.14)";
        ctx.fillRect(sx, topY, segW, stripH);
        ctx.strokeStyle = "rgba(236,228,208,.15)";
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, topY, segW, stripH);
        ctx.fillStyle = isTrop ? "#0a0f1c" : "rgba(236,228,208,.75)";
        ctx.fillText(SIGNS[i], sx + segW / 2, topY + stripH / 2 + 3);
      }
      ctx.fillStyle = "rgba(236,228,208,.6)";
      ctx.fillText("il tuo oroscopo (tropicale, fisso)", w * 0.5, topY - 8);

      // striscia inferiore (siderale, scivolata)
      for (let i = 0; i < 12; i++) {
        const sx = xBase + i * segW;
        if (sx + segW < x0 || sx > x0 + w * 0.86) continue;
        ctx.fillStyle = "rgba(127,208,198,.16)";
        ctx.fillRect(sx, bottomY, segW, stripH);
        ctx.strokeStyle = "rgba(236,228,208,.15)";
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, bottomY, segW, stripH);
        ctx.fillStyle = "rgba(127,208,198,.9)";
        ctx.fillText(SIGNS[i], sx + segW / 2, bottomY + stripH / 2 + 3);
      }
      ctx.fillStyle = "rgba(236,228,208,.6)";
      ctx.fillText("il cielo reale (costellazioni, scivola di ~1° ogni 72 anni)", w * 0.5, bottomY + stripH + 18);

      // marker della data di nascita
      ctx.strokeStyle = "#ece4d0";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(markerX, topY - 18); ctx.lineTo(markerX, bottomY + stripH + 8); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ece4d0";
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillText("15 ago", markerX, topY - 22);

      // didascalia
      const shift = Math.round(off / 30);
      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText(`anno ${y} · scarto ${Math.abs(off).toFixed(1).replace(".", ",")}° (~${Math.abs(shift)} segno) · 25.800 anni per un giro`, w * 0.5, h - 10);
    }

    return { update, draw };
  })();

  /* ---------- Esperimento 05 · Forer ---------- */
  const forerSim = (() => {
    const canvas = document.getElementById("canvas-forer");
    const chipEl = document.getElementById("forer-chip");
    const nEl = document.getElementById("forer-n");
    const avgEl = document.getElementById("forer-avg");
    const testoEl = document.getElementById("forer-testo");
    const slider = document.getElementById("forer-slider");
    const goBtn = document.getElementById("forer-go");
    const resetBtn = document.getElementById("forer-reset");
    const isVisible = trackVisibility(canvas);

    const RATINGS = Array.from({ length: 39 }, (_, i) => {
      const r = mulberry32(i + 7);
      return clamp(4.26 + (r() - 0.5) * 1.4, 2.6, 5);
    });

    let ran = false;
    goBtn.addEventListener("click", () => { ran = true; });
    resetBtn.addEventListener("click", () => { ran = false; });

    function update(dt) {
      if (!isVisible()) return;
      const n = +slider.value;
      let sum = 0;
      for (let i = 0; i < n; i++) sum += RATINGS[i];
      const avg = sum / n;
      nEl.textContent = `${n} / 39`;
      avgEl.textContent = `${avg.toFixed(2).replace(".", ",")} / 5`;
      testoEl.textContent = "no · uno solo per tutti";
      chipEl.textContent = ran ? `effetto Forer · 1 testo per tutti · ${avg.toFixed(2).replace(".", ",")}/5` : "sposta gli studenti";
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const n = +slider.value;
      const maxN = 39;
      const plotW = w * 0.5, bx = w * 0.4;
      const rowH = Math.min((h * 0.7) / maxN, 13);
      const y0 = h * 0.14;
      const scale = (v) => bx + ((v - 2) / 3) * plotW;

      // righe di valutazione (2..5)
      ctx.font = "8px 'IBM Plex Mono', monospace";
      ctx.textAlign = "right";
      for (let i = 0; i < n; i++) {
        const y = y0 + i * rowH;
        ctx.fillStyle = "rgba(236,228,208,.08)";
        ctx.fillRect(bx, y, plotW, rowH - 2);
        ctx.fillStyle = "#f0b45a";
        ctx.fillRect(bx, y, scale(RATINGS[i]) - bx, rowH - 2);
        ctx.fillStyle = "rgba(236,228,208,.5)";
        ctx.fillText(String(i + 1), bx - 6, y + rowH - 4);
      }

      // linea 4,26
      const lx = scale(4.26);
      ctx.strokeStyle = "rgba(127,208,198,.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(lx, y0 - 10); ctx.lineTo(lx, y0 + n * rowH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#7fd0c6";
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText("4,26/5", lx + 6, y0 - 10);

      // rivelazione: stesso testo per tutti
      if (ran) {
        ctx.fillStyle = "rgba(240,180,90,.14)";
        ctx.fillRect(bx, y0 - 8, plotW, n * rowH + 6);
        ctx.strokeStyle = "#f0b45a";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, y0 - 8, plotW, n * rowH + 6);
        ctx.fillStyle = "#f0b45a";
        ctx.font = "600 11px 'IBM Plex Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("LO STESSO TESTO PER TUTTI", bx + plotW / 2, y0 + n * rowH + 22);
      }

      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("valutazione di accuratezza (2–5) · 39 studenti · 1 solo oroscopo", w * 0.5, h - 10);
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
      realeEl.textContent = "3 · Carlson · Hartmann · Forer";
      chipEl.textContent = ran ? "bilancio chiuso · prove per l'astrologia: 0" : "conto in sospeso";
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

      // anello: rivendicazioni (3)
      ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
      ctx.strokeStyle = "rgba(240,180,90,.7)"; ctx.lineWidth = 22;
      ctx.stroke();

      // segmento verde: i 3 test controllati riprodotti
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
      ctx.fillText("prove per l'astrologia", cx, cy + 22);

      ctx.fillStyle = "rgba(236,228,208,.5)";
      ctx.fillText("rivendicazioni esaminate: " + n + " · prove controllate: 0 · test reali: Carlson · Hartmann · Forer", w * 0.5, h - 10);
    }

    return { update, draw };
  })();

  /* ---------- Quiz ---------- */

  const QUIZ = [
    {
      q: "Alla distanza media dalla Terra, l'attrazione gravitazionale dell'ostetrica su un neonato è…",
      opts: ["circa 6 volte quella di Marte", "circa un milionesimo di quella di Marte", "uguale a quella della Terra"],
      correct: 0,
      fb: "Fraknoi (1988): l'ostetrica a un metro tira circa 6 volte più di Marte alla distanza media; la Terra tira un miliardo di volte più di tutti i pianeti."
    },
    {
      q: "Nel test alla cieca di Carlson (1985, Nature), gli astrologi hanno abbinato correttamente…",
      opts: ["quanto il caso: ~34%", "il 90% dei temi", "il 50%, come avevano previsto"],
      correct: 0,
      fb: "0,34 ± 0,044 su 116 temi: esattamente il caso (33%), contro il ≥50% che gli astrologi avevano dichiarato prima del test."
    },
    {
      q: "Nell'esperimento di Forer (1948), gli studenti…",
      opts: ["ricevettero tutti lo stesso testo, valutato 4,26/5", "ricevettero 39 testi diversi", "smascherarono subito il trucco"],
      correct: 0,
      fb: "Tutti ricevettero il medesimo oroscopo da edicola: voto medio 4,26/5. L'effetto Forer funziona perché il testo è vago e universale."
    },
    {
      q: "Hartmann (2006), su oltre 15.000 soggetti, tra segno e personalità trovò…",
      opts: ["zero correlazioni", "correlazioni deboli ma reali", "forti differenze tra i segni"],
      correct: 0,
      fb: "Nessuna correlazione con segno solare, elementi o genere astrologico: la personalità non varia con la data di nascita."
    },
    {
      q: "Per la precessione degli equinozi, chi oggi è nato il 15 agosto (oroscopo Leone)…",
      opts: ["ha il Sole nella costellazione del Cancro", "ha il Sole nel Leone, come 2.000 anni fa", "non ha alcun segno"],
      correct: 0,
      fb: "Lo zodiaco tropicale è fisso all'equinozio, ma il cielo è scivolato di ~24° (quasi un segno): il Sole reale sta nel Cancro."
    },
    {
      q: "Le repliche indipendenti dell'effetto Marte di Gauquelin…",
      opts: ["non l'hanno riprodotto", "lo hanno confermato al 100%", "lo hanno trovato solo nelle donne"],
      correct: 0,
      fb: "Zelen, il test americano (408 campioni) e il CFEPP francese (1.120 campioni) non hanno riprodotto l'effetto: dipendeva dalla selezione dei dati."
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
    forzaSim.update(dt);
    forzaSim.draw();
    carlsonSim.update(dt);
    carlsonSim.draw();
    segniSim.update(dt);
    segniSim.draw();
    precessioneSim.update(dt);
    precessioneSim.draw();
    forerSim.update(dt);
    forerSim.draw();
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