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
    requestAnimationFrame(loop);
  }

  initReveal();
  requestAnimationFrame(loop);
})();