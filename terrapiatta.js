(() => {
  "use strict";

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- Canvas sizing ---------- */

  function sizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: rect.width, h: rect.height };
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
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.3 + 0.2,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.02 + 0.005,
          hue: Math.random() > 0.85 ? "accent" : "plain"
        });
      }
    }

    function draw(now) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(now * s.speed + s.phase));
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        if (s.hue === "accent") {
          ctx.fillStyle = "#f0b45a";
          ctx.shadowColor = "#f0b45a";
          ctx.shadowBlur = 6;
        } else {
          ctx.fillStyle = "#d9d6c8";
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }

    window.addEventListener("resize", rebuild);
    rebuild();
    return { draw };
  })();

  /* ---------- Reveal on scroll ---------- */

  function initReveal() {
    const observer = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            observer.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

    const heroChildren = Array.from(document.querySelectorAll(".hero > *"));
    heroChildren.forEach((el, i) => {
      el.classList.add("reveal");
      el.style.transitionDelay = `${0.09 * i + 0.05}s`;
    });
    requestAnimationFrame(() => {
      heroChildren.forEach(el => el.classList.add("in"));
    });
  }

  /* ---------- Visibility gate ---------- */

  function trackVisibility(el) {
    let visible = false;
    const obs = new IntersectionObserver(
      entries => { visible = entries[0].isIntersecting; },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => visible;
  }

  /* ---------- Esperimento 06 · La nave all'orizzonte ---------- */

  const shipSim = (() => {
    const canvas = document.getElementById("canvas-ship");
    const chipEl = document.getElementById("ship-chip");
    const distEl = document.getElementById("ship-dist");
    const hullEl = document.getElementById("ship-hull");
    const mastEl = document.getElementById("ship-mast");
    const slider = document.getElementById("ship-slider");
    const flatBtn = document.getElementById("ship-flat");
    const sphereBtn = document.getElementById("ship-sphere");

    const R = 6371;            // raggio terrestre, km
    const EYE = 5;             // altezza dell'osservatore, m
    const HULL_M = 8;          // scafo sopra l'acqua, m
    const MAST_M = 30;         // cima dell'albero sopra l'acqua, m
    const D_MAX = 40;          // distanza massima, km

    let mode = "sphere";
    let dist = 0;              // 0..1
    let t = 0;
    const isVisible = trackVisibility(canvas);

    flatBtn.addEventListener("click", () => {
      mode = "flat";
      flatBtn.classList.add("is-active");
      sphereBtn.classList.remove("is-active");
    });
    sphereBtn.addEventListener("click", () => {
      mode = "sphere";
      sphereBtn.classList.add("is-active");
      flatBtn.classList.remove("is-active");
    });
    slider.addEventListener("input", () => { dist = slider.value / 100; });

    function hiddenMeters(dKm) {
      const drop = (dKm * dKm) / (2 * R) * 1000;   // metri
      return Math.max(0, drop - EYE);
    }

    function drawShip(ctx, x, baseY, hullPx, mastPx, clipH) {
      const bob = Math.sin(t * 1.6) * 1.2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, ctx.canvas.width, clipH * Math.min(window.devicePixelRatio || 1, 2));
      ctx.clip();

      ctx.translate(x, baseY + bob);

      const hw = hullPx * 2.1;
      ctx.beginPath();
      ctx.moveTo(-hw, 0);
      ctx.quadraticCurveTo(-hw * 0.4, -hullPx * 0.4, 0, -hullPx);
      ctx.quadraticCurveTo(hw * 0.5, -hullPx * 0.35, hw, 0);
      ctx.closePath();
      ctx.fillStyle = "#3a4256";
      ctx.fill();
      ctx.strokeStyle = "rgba(232,226,210,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -hullPx);
      ctx.lineTo(0, -(hullPx + mastPx));
      ctx.strokeStyle = "#1c212d";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -(hullPx + mastPx * 0.92));
      ctx.lineTo(hw * 0.95, -hullPx * 0.25);
      ctx.lineTo(0, -hullPx * 0.28);
      ctx.closePath();
      ctx.fillStyle = "rgba(232,226,210,0.9)";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -(hullPx + mastPx));
      ctx.lineTo(2.5, -(hullPx + mastPx + 7));
      ctx.lineTo(-2.5, -(hullPx + mastPx + 7));
      ctx.closePath();
      ctx.fillStyle = "#f0b45a";
      ctx.fill();

      ctx.restore();
    }

    function draw() {
      const { ctx, w, h } = sizeCanvas(canvas);
      const hy = h * 0.42;
      const dKm = dist * D_MAX;

      const sky = ctx.createLinearGradient(0, 0, 0, hy);
      sky.addColorStop(0, "#0a0f1c");
      sky.addColorStop(1, "#18243c");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, hy);

      const sunX = w * 0.22;
      const sunY = h * 0.18;
      const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
      glow.addColorStop(0, "rgba(240,180,90,0.5)");
      glow.addColorStop(1, "rgba(240,180,90,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(sunX - 90, sunY - 90, 180, 180);
      ctx.beginPath();
      ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(240,180,90,0.85)";
      ctx.fill();

      const sea = ctx.createLinearGradient(0, hy, 0, h);
      sea.addColorStop(0, "#1b3a47");
      sea.addColorStop(1, "#0d1a24");
      ctx.fillStyle = sea;
      ctx.fillRect(0, hy, w, h - hy);

      ctx.fillStyle = "rgba(127,208,198,0.18)";
      ctx.fillRect(0, hy, w, 1.2);

      for (let i = 1; i <= 11; i++) {
        const y = hy + i * ((h - hy) / 12);
        ctx.fillStyle = `rgba(160, 205, 214, ${0.05 + i * 0.008})`;
        ctx.fillRect(0, y, w, 1);
      }

      const scale = 1 - 0.72 * dist;
      const hullPx = 18 * scale;
      const mastPx = 34 * scale;
      const shipH = hullPx + mastPx;

      let hiddenPx = 0;
      if (mode === "sphere") {
        const hid = hiddenMeters(dKm);
        hiddenPx = (hid / MAST_M) * shipH;
      }

      const x = lerp(w * 0.30, w * 0.74, dist);
      const baseY = hy + hiddenPx;

      drawShip(ctx, x, baseY, hullPx, mastPx, hy);

      const hullHidden = hiddenPx >= hullPx;
      const mastHidden = hiddenPx >= shipH;
      hullEl.textContent = hullHidden ? "nascosto" : "visibile";
      mastEl.textContent = mastHidden ? "nascosto" : "visibile";
      distEl.textContent = `${Math.round(dKm)} km`;
      chipEl.textContent = mode === "flat"
        ? "intera, sempre visibile · solo più piccola"
        : mastHidden
          ? "scomparsa dietro la curvatura"
          : hullHidden
            ? "la chiglia è sotto l'orizzonte"
            : "guarda la chiglia: sprofonda per prima";
    }

    function update(dt) { t += dt; }

    return { update, draw };
  })();

  /* ---------- Esperimento 07 · L'esperimento di Eratostene ---------- */

  const eratoSim = (() => {
    const canvas = document.getElementById("canvas-erato");
    const distEl = document.getElementById("erato-dist");
    const angleEl = document.getElementById("erato-angle");
    const circEl = document.getElementById("erato-circ");
    const slider = document.getElementById("erato-slider");

    const R = 6371;
    const isVisible = trackVisibility(canvas);

    function calc(v) {
      const d = 100 + v * 1900;              // km, 100..2000 (v: 0..1)
      const theta = d / R;                   // rad
      return { d, theta, thetaDeg: theta * 180 / Math.PI };
    }

    function fmtAngle(deg) {
      return deg.toFixed(1).replace(".", ",");
    }

    function fmtNum(n) {
      return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    function draw() {
      const { ctx, w, h } = sizeCanvas(canvas);
      const v = slider.value / 100;
      const { d, theta, thetaDeg } = calc(v);

      const R_arc = w * 1.15;
      const topY = h * 0.34;
      const cx = w * 0.5;
      const cy = topY + R_arc;
      const a1 = -Math.PI / 2 - theta / 2;
      const a2 = -Math.PI / 2 + theta / 2;

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#0a0f1c");
      sky.addColorStop(1, "#121c2f");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 34; i++) {
        const sx = Math.random() * w;
        const sy = Math.random() * topY;
        ctx.globalAlpha = 0.25 + Math.random() * 0.4;
        ctx.fillStyle = Math.random() > 0.85 ? "#f0b45a" : "#d9d6c8";
        ctx.beginPath();
        ctx.arc(sx, sy, Math.random() * 1 + 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const sunX = w * 0.18;
      const sunY = h * 0.11;
      const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 110);
      glow.addColorStop(0, "rgba(240,180,90,0.55)");
      glow.addColorStop(1, "rgba(240,180,90,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(sunX - 110, sunY - 110, 220, 220);
      ctx.beginPath();
      ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(240,180,90,0.9)";
      ctx.fill();

      const slope = Math.tan(theta / 2);
      ctx.strokeStyle = "rgba(240,180,90,0.4)";
      ctx.lineWidth = 1.6;
      const cityX1 = cx + R_arc * Math.cos(a1);
      for (let i = -1; i <= 1; i++) {
        const x0 = cityX1 + i * 46;
        ctx.beginPath();
        ctx.moveTo(x0, -30);
        ctx.lineTo(x0 + slope * h * 1.1, h * 1.05);
        ctx.stroke();
      }

      const ground = ctx.createLinearGradient(0, topY, 0, h);
      ground.addColorStop(0, "#16202f");
      ground.addColorStop(1, "#0b121c");
      ctx.fillStyle = ground;
      ctx.fillRect(0, topY, w, h - topY);

      ctx.beginPath();
      ctx.arc(cx, cy, R_arc, a1, a2, false);
      ctx.strokeStyle = "#2b3c50";
      ctx.lineWidth = 30;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, R_arc, a1, a2, false);
      ctx.strokeStyle = "rgba(127,208,198,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();

      const p1 = { x: cx + R_arc * Math.cos(a1), y: cy + R_arc * Math.sin(a1) };
      const p2 = { x: cx + R_arc * Math.cos(a2), y: cy + R_arc * Math.sin(a2) };
      const gh = 46;
      const n1 = { x: Math.cos(a1), y: Math.sin(a1) };
      const n2 = { x: Math.cos(a2), y: Math.sin(a2) };

      ctx.strokeStyle = "#c9d6e8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p1.x - n1.x * gh, p1.y - n1.y * gh);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p2.x - n2.x * gh, p2.y - n2.y * gh);
      ctx.stroke();

      const tang = { x: Math.cos(a2 + Math.PI / 2), y: Math.sin(a2 + Math.PI / 2) };
      const shadowLen = clamp(gh * Math.tan(theta), 3, 42);
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p2.x + tang.x * shadowLen, p2.y + tang.y * shadowLen);
      ctx.stroke();

      const tip = { x: p2.x - n2.x * gh, y: p2.y - n2.y * gh };
      ctx.strokeStyle = "rgba(240,180,90,0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(p2.x + tang.x * shadowLen, p2.y + tang.y * shadowLen);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(p2.x, p2.y, 15, Math.atan2(-n2.y, -n2.x), Math.atan2(-tang.y, -tang.x), true);
      ctx.strokeStyle = "#f0b45a";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#f0b45a";
      ctx.font = "500 11px 'IBM Plex Mono', monospace";
      ctx.fillText("θ = " + fmtAngle(thetaDeg) + "°", p2.x + 18, p2.y - 26);

      ctx.strokeStyle = "rgba(240,180,90,0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, R_arc - 16, a1, a2, false);
      ctx.stroke();
      const midA = (a1 + a2) / 2;
      const mid = {
        x: cx + (R_arc - 16) * Math.cos(midA),
        y: cy + (R_arc - 16) * Math.sin(midA)
      };
      ctx.fillStyle = "#f0b45a";
      ctx.font = "500 11px 'IBM Plex Mono', monospace";
      ctx.fillText("d = " + Math.round(d) + " km", mid.x - 42, mid.y - 14);

      ctx.fillStyle = "#7fd0c6";
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 3, 0, Math.PI * 2);
      ctx.arc(p2.x, p2.y, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "400 10px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(217,214,200,0.75)";
      ctx.fillText("Siene", p1.x - 18, p1.y + 26);
      ctx.fillText("· nessuna ombra", p1.x - 46, p1.y + 40);
      ctx.fillText("Alessandria", p2.x - 30, p2.y + 26);

      distEl.textContent = `${Math.round(d)} km`;
      angleEl.textContent = `${fmtAngle(thetaDeg)}°`;
      circEl.textContent = `≈ ${fmtNum(Math.round((2 * Math.PI * R) / 100) * 100)} km`;
    }

    return { update() {}, draw };
  })();

  /* ---------- Esperimento 08 · L'eclissi di Luna ---------- */

  const eclipseSim = (() => {
    const canvas = document.getElementById("canvas-eclipse");
    const chipEl = document.getElementById("eclipse-chip");
    const shapeEl = document.getElementById("eclipse-shape");
    const tiltEl = document.getElementById("eclipse-tiltval");
    const slider = document.getElementById("eclipse-tilt");
    const sphereBtn = document.getElementById("eclipse-sphere");
    const diskBtn = document.getElementById("eclipse-disk");

    let mode = "sphere";
    let tilt = 0;
    const isVisible = trackVisibility(canvas);

    sphereBtn.addEventListener("click", () => {
      mode = "sphere";
      sphereBtn.classList.add("is-active");
      diskBtn.classList.remove("is-active");
    });
    diskBtn.addEventListener("click", () => {
      mode = "disk";
      diskBtn.classList.add("is-active");
      sphereBtn.classList.remove("is-active");
    });
    slider.addEventListener("input", () => { tilt = +slider.value; });

    const bgStars = [];
    for (let i = 0; i < 26; i++) {
      bgStars.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.2 + 0.2,
        amber: Math.random() > 0.88
      });
    }

    function draw() {
      const { ctx, w, h } = sizeCanvas(canvas);
      const tiltRad = (tilt * Math.PI) / 180;
      const rEarth = Math.max(26, w * 0.085);
      const rMoon = rEarth * 0.62;

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#0a0f1c");
      sky.addColorStop(1, "#131c2e");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      for (const s of bgStars) {
        ctx.globalAlpha = 0.3 + s.r * 0.2;
        ctx.fillStyle = s.amber ? "#f0b45a" : "#d9d6c8";
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const sun = { x: w * 0.15, y: h * 0.5 };
      const glow = ctx.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, rEarth * 2.2);
      glow.addColorStop(0, "rgba(240,180,90,0.55)");
      glow.addColorStop(1, "rgba(240,180,90,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(sun.x - rEarth * 2.2, sun.y - rEarth * 2.2, rEarth * 4.4, rEarth * 4.4);
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, rEarth * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(240,180,90,0.92)";
      ctx.fill();

      ctx.strokeStyle = "rgba(240,180,90,0.18)";
      ctx.lineWidth = 1.4;
      for (let i = -1; i <= 1; i++) {
        const y = sun.y + i * rEarth * 0.5;
        ctx.beginPath();
        ctx.moveTo(sun.x + rEarth * 0.5, y);
        ctx.lineTo(w * 0.42, y + (w * 0.27) * (i * 0.06));
        ctx.stroke();
      }

      const ec = { x: w * 0.5, y: h * 0.5 };
      const rx = mode === "sphere" ? rEarth : rEarth * Math.cos(tiltRad);
      const ry = rEarth;

      const earthGrad = ctx.createRadialGradient(ec.x - rx * 0.3, ec.y - ry * 0.35, ry * 0.1, ec.x, ec.y, ry);
      earthGrad.addColorStop(0, "#3a4a63");
      earthGrad.addColorStop(1, "#0c131f");
      ctx.beginPath();
      ctx.ellipse(ec.x, ec.y, Math.max(1, rx), ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = earthGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(127,208,198,0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (mode === "disk") {
        ctx.beginPath();
        ctx.ellipse(ec.x, ec.y, Math.max(1, rx), ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(240,180,90,0.55)";
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const mc = { x: w * 0.82, y: h * 0.5 };
      const moonGrad = ctx.createRadialGradient(mc.x - rMoon * 0.3, mc.y - rMoon * 0.3, rMoon * 0.1, mc.x, mc.y, rMoon);
      moonGrad.addColorStop(0, "#2a3450");
      moonGrad.addColorStop(1, "#141b2c");
      ctx.beginPath();
      ctx.arc(mc.x, mc.y, rMoon, 0, Math.PI * 2);
      ctx.fillStyle = moonGrad;
      ctx.fill();

      const srx = Math.max(1, rx * 0.72);
      const sry = ry * 0.72;
      const shadow = ctx.createRadialGradient(mc.x, mc.y, sry * 0.2, mc.x, mc.y, Math.max(srx, sry));
      shadow.addColorStop(0, "rgba(3,6,12,0.92)");
      shadow.addColorStop(1, "rgba(3,6,12,0.55)");
      ctx.beginPath();
      ctx.save();
      ctx.beginPath();
      ctx.arc(mc.x, mc.y, rMoon, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(mc.x, mc.y, srx, sry, 0, 0, Math.PI * 2);
      ctx.fillStyle = shadow;
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "rgba(127,208,198,0.35)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.font = "400 11px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(217,214,200,0.8)";
      ctx.fillText("Sole", sun.x - 13, sun.y + rEarth * 0.7);
      ctx.fillText("Terra", ec.x - 17, ec.y + ry + 18);
      ctx.fillText("Luna", mc.x - 15, mc.y + rMoon + 16);

      const ellittica = mode === "disk" && tilt > 5;
      shapeEl.textContent = ellittica ? "ellittica" : "circolare";
      tiltEl.textContent = `${tilt}°`;
      chipEl.textContent = mode === "sphere"
        ? "un cerchio, in ogni orientamento"
        : ellittica
          ? "un'ellisse quando è inclinato"
          : "un cerchio, finché è allineato";
    }

    function update() {}

    return { update, draw };
  })();

  /* ---------- Esperimento 09 · Le stelle cambiano con la latitudine ---------- */

  const starsSim = (() => {
    const canvas = document.getElementById("canvas-stars");
    const chipEl = document.getElementById("stars-chip");
    const latEl = document.getElementById("stars-lat");
    const polarisEl = document.getElementById("stars-polaris");
    const slider = document.getElementById("stars-lat-slider");

    const isVisible = trackVisibility(canvas);

    const CLUSTERS = [
      { name: "Orsa Maggiore", dec: 55, x: 0.30, r: 1.8,
        dots: [[-15, -6], [-7, -8], [-1, -12], [8, -8], [13, -2], [8, 3], [-1, 3]] },
      { name: "Cassiopea", dec: 60, x: 0.72, r: 1.7,
        dots: [[-13, 0], [-5, -9], [0, 3], [7, -7], [13, 1]] },
      { name: "Vega", dec: 39, x: 0.55, r: 2.3, dots: [[0, 0]] },
      { name: "Croce del Sud", dec: -60, x: 0.40, r: 1.9,
        dots: [[0, -12], [0, 12], [-9, 0], [9, 0], [0, 0]] },
      { name: "Canopo", dec: -52, x: 0.66, r: 2.5, dots: [[0, 0]] }
    ];

    const randStars = [];
    for (let i = 0; i < 40; i++) {
      randStars.push({
        dec: Math.round(lerp(-70, 70, Math.random())),
        x: Math.random() * 0.88 + 0.06,
        dx: (Math.random() - 0.5) * 90,
        dy: (Math.random() - 0.5) * 40,
        r: Math.random() * 1.3 + 0.3,
        amber: Math.random() > 0.9
      });
    }

    function altitude(phi, dec) { return 90 - Math.abs(phi - dec); }

    function draw() {
      const { ctx, w, h } = sizeCanvas(canvas);
      const phi = +slider.value;
      const horizonY = h * 0.6;
      const topPad = h * 0.06;
      const band = horizonY - topPad;

      const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
      sky.addColorStop(0, "#070c16");
      sky.addColorStop(1, "#131d31");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, horizonY);

      const yOf = alt => horizonY - clamp(alt / 90, -1, 1) * band;

      function drawDot(x, y, r, amber, alpha) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = amber ? "#f0b45a" : "#d9d6c8";
        if (amber) {
          ctx.shadowColor = "#f0b45a";
          ctx.shadowBlur = 6;
        }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      for (const s of randStars) {
        const alt = altitude(phi, s.dec);
        if (alt < 0.5) continue;
        drawDot(clamp(s.x * w + s.dx, 4, w - 4), yOf(alt) + s.dy, s.r, s.amber, 0.5);
      }

      for (const c of CLUSTERS) {
        const alt = altitude(phi, c.dec);
        if (alt < 3) continue;
        const cx = c.x * w;
        const cy = yOf(alt);
        for (const [dx, dy] of c.dots) {
          drawDot(cx + dx, cy + dy, c.r, false, 0.95);
        }
        if (alt > 6) {
          ctx.font = "400 10px 'IBM Plex Mono', monospace";
          ctx.fillStyle = "rgba(217,214,200,0.55)";
          ctx.fillText(c.name, cx - 34, cy - 22);
        }
      }

      const polarisAlt = altitude(phi, 90);
      const px = w * 0.5;
      const py = yOf(polarisAlt);
      if (polarisAlt >= 1) {
        drawDot(px, py, 3.4, true, 1);
        ctx.font = "500 11px 'IBM Plex Mono', monospace";
        ctx.fillStyle = "#f0b45a";
        ctx.fillText("Stella Polare", px + 10, py - 8);
        ctx.fillText("· nord", px + 10, py + 6);
      }

      const ground = ctx.createLinearGradient(0, horizonY, 0, h);
      ground.addColorStop(0, "#101a28");
      ground.addColorStop(1, "#070b12");
      ctx.fillStyle = ground;
      ctx.fillRect(0, horizonY, w, h - horizonY);
      ctx.fillStyle = "rgba(127,208,198,0.25)";
      ctx.fillRect(0, horizonY, w, 1.2);
      ctx.fillStyle = "rgba(127,208,198,0.08)";
      ctx.fillRect(0, horizonY + 6, w, 1);

      latEl.textContent = phi === 0 ? "0° · equatore" : `${Math.abs(phi)}° ${phi > 0 ? "N" : "S"}`;
      polarisEl.textContent = polarisAlt >= 15
        ? "alta nel cielo"
        : polarisAlt > 0
          ? "bassa sull'orizzonte"
          : "sotto l'orizzonte";
      chipEl.textContent = polarisAlt >= 15
        ? "la Polare è alta: siamo a nord"
        : polarisAlt > 0
          ? "la Polare è bassa sull'orizzonte"
          : "la Polare è sotto l'orizzonte";
    }

    function update() {}

    return { update, draw };
  })();

  /* ---------- Esperimento 10 · E perché è tonda? ---------- */

  const roundSim = (() => {
    const canvas = document.getElementById("canvas-round");
    const chipEl = document.getElementById("round-chip");
    const reliefEl = document.getElementById("round-relief");
    const stateEl = document.getElementById("round-state");
    const slider = document.getElementById("round-height");
    const collapseBtn = document.getElementById("round-collapse");
    const resetBtn = document.getElementById("round-reset");

    const DUR = 1.9;
    let relief = +slider.value;
    let collapsing = false;
    let p = 0;
    const isVisible = trackVisibility(canvas);

    const particles = [];
    for (let i = 0; i < 14; i++) {
      particles.push({ i, side: i % 2 === 0 ? -1 : 1, lag: (i % 7) / 7 });
    }

    collapseBtn.addEventListener("click", () => {
      if (!collapsing) { collapsing = true; p = 0; }
    });
    resetBtn.addEventListener("click", () => {
      collapsing = false;
      p = 0;
      relief = +slider.value;
    });
    slider.addEventListener("input", () => {
      if (!collapsing || p >= 1) {
        collapsing = false;
        p = 0;
        relief = +slider.value;
      }
    });

    function ease(t) { return 1 - Math.pow(1 - t, 3); }

    function update(dt) {
      if (collapsing) {
        p = Math.min(1, p + dt / DUR);
        if (p >= 1) collapsing = false;
      }
    }

    function draw() {
      const { ctx, w, h } = sizeCanvas(canvas);
      const cx = w * 0.5;
      const cy = h * 0.64;
      const r = Math.max(60, h * 0.26);

      const sky = ctx.createLinearGradient(0, 0, 0, cy - r);
      sky.addColorStop(0, "#0a0f1c");
      sky.addColorStop(1, "#141e30");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      const reliefNow = collapsing || p >= 1 ? relief * (1 - ease(p)) : relief;
      const reliefPx = (reliefNow / 12) * r * 0.5;

      const planetGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.15, cx, cy, r);
      planetGrad.addColorStop(0, "#2b3a52");
      planetGrad.addColorStop(1, "#0a111d");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = planetGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(127,208,198,0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();

      const topY = cy - r;
      const peakY = topY - reliefPx;
      const bw = r * 0.3;

      if (reliefPx > 0.5) {
        ctx.beginPath();
        ctx.moveTo(cx - bw, topY + 3);
        ctx.quadraticCurveTo(cx - bw * 0.4, topY + 4, cx, peakY);
        ctx.quadraticCurveTo(cx + bw * 0.4, topY + 4, cx + bw, topY + 3);
        ctx.closePath();
        ctx.fillStyle = "#42516e";
        ctx.fill();
        ctx.strokeStyle = "rgba(232,226,210,0.35)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (collapsing || p >= 1) {
        for (const pt of particles) {
          const pp = (ease(p) + pt.lag) % 1;
          const px = cx + pt.side * bw * pp;
          const py = topY + (peakY - topY) * (1 - pp) * 0.9 + (pt.side > 0 ? topY + 3 : topY + 3) * 0 + pp * 4;
          ctx.globalAlpha = 0.9 * (1 - pp);
          ctx.fillStyle = pt.side > 0 ? "#f0b45a" : "#7fd0c6";
          ctx.beginPath();
          ctx.arc(px, py, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (reliefPx <= 0.5 && !collapsing) {
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(240,180,90,0.6)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      reliefEl.textContent = `${reliefNow.toFixed(0)} km`;
      stateEl.textContent = collapsing
        ? "collassando"
        : p >= 1
          ? "sferica"
          : "irregolare";
      chipEl.textContent = collapsing
        ? "il materiale fluisce verso il centro"
        : p >= 1
          ? "perfettamente sferica"
          : "la gravità tirerà tutto verso il centro";
    }

    return { update, draw };
  })();

  /* ---------- Loop ---------- */

  let last = 0;
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    starfield.draw(now / 1000);
    shipSim.update(dt);
    shipSim.draw();
    eratoSim.update(dt);
    eratoSim.draw();
    eclipseSim.update(dt);
    eclipseSim.draw();
    starsSim.update(dt);
    starsSim.draw();
    roundSim.update(dt);
    roundSim.draw();
    requestAnimationFrame(loop);
  }

  initReveal();
  requestAnimationFrame(loop);
})();