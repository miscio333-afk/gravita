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

  /* ---------- Esperimento 01 · Caduta libera ---------- */

  const fallSim = (() => {
    const canvas = document.getElementById("canvas-fall");
    const statusEl = document.getElementById("fall-status");
    const timeEl = document.getElementById("fall-time");
    const hammerTEl = document.getElementById("fall-hammer-t");
    const featherTEl = document.getElementById("fall-feather-t");
    const toggleBtn = document.getElementById("fall-toggle");
    const resetBtn = document.getElementById("fall-reset");
    const asideEl = document.getElementById("fall-aside");

    const G = 9.81;
    const H_METERS = 9.8;
    const K = { hammer: 0.02, feather: 2.4 };
    const TOP = 18;
    const BOT = 8;

    let ctx, W, H, scale, groundY;
    let mode = "vacuum";
    let t = 0;
    const bodies = {
      hammer: { y: 0, v: 0, landed: false, landT: null },
      feather: { y: 0, v: 0, landed: false, landT: null }
    };

    function reset() {
      t = 0;
      for (const k of Object.keys(bodies)) {
        bodies[k].y = 0;
        bodies[k].v = 0;
        bodies[k].landed = false;
        bodies[k].landT = null;
      }
      hammerTEl.textContent = "—";
      featherTEl.textContent = "—";
      updateChip();
    }

    function setup() {
      const s = sizeCanvas(canvas);
      ctx = s.ctx;
      W = s.w;
      H = s.h;
      scale = (H - TOP - BOT) / H_METERS;
      groundY = H - BOT;
      reset();
    }

    function update(dt) {
      if (bodies.hammer.landed && bodies.feather.landed) {
        updateChip();
        return;
      }
      t += dt;
      for (const key of Object.keys(bodies)) {
        const b = bodies[key];
        if (b.landed) continue;
        const k = mode === "air" ? K[key] : 0;
        const v = b.v;
        let a = G - k * v * v;
        a = Math.max(0, a);
        b.v += a * dt;
        b.y += b.v * dt;
        if (b.y >= H_METERS) {
          b.y = H_METERS;
          b.landed = true;
          b.landT = t;
        }
      }
      timeEl.textContent = `${t.toFixed(2)} s`;
      if (bodies.hammer.landed) hammerTEl.textContent = `${bodies.hammer.landT.toFixed(2)} s`;
      if (bodies.feather.landed) featherTEl.textContent = `${bodies.feather.landT.toFixed(2)} s`;
      updateChip();
    }

    function updateChip() {
      const done = bodies.hammer.landed && bodies.feather.landed;
      const base = mode === "vacuum" ? "Nel vuoto" : "Con aria";
      statusEl.textContent = done ? `${base} · verdetto` : base;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = "rgba(240,180,90,0.14)";
      ctx.fillStyle = "rgba(240,180,90,0.35)";
      ctx.lineWidth = 1;
      for (let m = 0; m <= H_METERS; m++) {
        const y = TOP + m * scale;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
        ctx.font = "9px 'IBM Plex Mono', monospace";
        ctx.fillText(`${m} m`, 6, y - 3);
      }

      ctx.strokeStyle = "rgba(236,228,208,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(W, groundY);
      ctx.stroke();

      for (const [key, b] of Object.entries(bodies)) {
        const y = TOP + b.y * scale;
        const isHammer = key === "hammer";
        const x = isHammer ? W * 0.32 : W * 0.68;
        const r = isHammer ? 11 : 7;
        const jitter = mode === "air" && !isHammer && !b.landed ? Math.sin(t * 16) * 3 : 0;
        const bx = x + jitter;

        if (isHammer) {
          ctx.fillStyle = "#2e2a3a";
          ctx.strokeStyle = "#f0b45a";
          ctx.lineWidth = 1.5;
        } else {
          ctx.fillStyle = "#f5efe2";
          ctx.strokeStyle = "rgba(245,239,226,0.6)";
          ctx.lineWidth = 1;
        }
        ctx.beginPath();
        ctx.arc(bx, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = "10px 'IBM Plex Mono', monospace";
        ctx.fillStyle = "rgba(141,149,163,0.9)";
        ctx.textAlign = "center";
        ctx.fillText(isHammer ? "martello" : "piuma", bx, y - r - 8);

        if (b.landed) {
          ctx.fillStyle = "rgba(240,180,90,0.85)";
          ctx.fillText(`${b.landT.toFixed(2)} s`, bx, y + r + 16);
        }
      }
      ctx.textAlign = "left";
    }

    function setMode(next) {
      mode = next;
      reset();
      toggleBtn.textContent = mode === "vacuum" ? "Inserisci l'aria" : "Togli l'aria";
      toggleBtn.classList.toggle("is-active", mode === "air");
      asideEl.textContent =
        mode === "vacuum"
          ? "Nel vuoto non c'è nulla che freni la piuma: entrambi arrivano insieme, come sulla Luna nel 1971."
          : "Con l'aria la resistenza rallenta la piuma: ora è il martello ad arrivare prima. È l'aria a cambiare le regole, non la gravità.";
    }

    toggleBtn.addEventListener("click", () => {
      setMode(mode === "vacuum" ? "air" : "vacuum");
    });
    resetBtn.addEventListener("click", reset);

    setup();
    window.addEventListener("resize", setup);

    return { update, draw };
  })();

  /* ---------- Esperimento 02 · Pozzo di gravità ---------- */

  const wellSim = (() => {
    const canvas = document.getElementById("canvas-well");
    const vSlider = document.getElementById("well-v");
    const massSlider = document.getElementById("well-mass");
    const resetBtn = document.getElementById("well-reset");
    const stateEl = document.getElementById("well-state");
    const vOutEl = document.getElementById("well-v-out");
    const vcircEl = document.getElementById("well-vcirc");
    const massOutEl = document.getElementById("well-mass-out");

    const R0 = 165;
    const STAR_R = 16;
    const BASE_MU = 105 * 105 * R0;

    let ctx, W, H, cx, cy;
    let mu, proj, trail, running, done, simT;

    function setup() {
      const s = sizeCanvas(canvas);
      ctx = s.ctx;
      W = s.w;
      H = s.h;
      cx = W / 2;
      cy = H / 2;
      relaunch();
    }

    function currentMu() {
      return BASE_MU * parseFloat(massSlider.value);
    }

    function vcirc(r) {
      return Math.sqrt(mu / r);
    }

    function relaunch() {
      mu = currentMu();
      const vTarget = parseFloat(vSlider.value) * vcirc(R0);
      proj = { x: cx - R0, y: cy, vx: 0, vy: -vTarget };
      trail = [];
      running = true;
      done = null;
      simT = 0;
      stateEl.textContent = "orbita in corso";
      updateReadouts(vTarget);
    }

    function updateReadouts(vTarget) {
      const vc = vcirc(R0);
      vOutEl.textContent = `${Math.round(vTarget)} px/s`;
      vcircEl.textContent = `${Math.round(vc)} px/s`;
      massOutEl.textContent = `${parseFloat(massSlider.value).toFixed(1)} ×`;
    }

    function update(dt) {
      if (!running || done) return;
      simT += dt;
      const steps = 4;
      const step = Math.min(dt, 1 / 30) / steps;
      for (let i = 0; i < steps; i++) {
        const dx = cx - proj.x;
        const dy = cy - proj.y;
        const r = Math.hypot(dx, dy);
        if (r < STAR_R) {
          done = "impact";
          stateEl.textContent = "caduta: impatto";
          return;
        }
        const a = mu / (r * r);
        proj.vx += (dx / r) * a * step;
        proj.vy += (dy / r) * a * step;
        proj.x += proj.vx * step;
        proj.y += proj.vy * step;
      }

      const dx = cx - proj.x;
      const dy = cy - proj.y;
      const r = Math.hypot(dx, dy);
      const v = Math.hypot(proj.vx, proj.vy);
      const eps = 0.5 * v * v - mu / r;

      if (eps >= 0) {
        done = "escape";
        stateEl.textContent = "fuga dal pozzo";
      } else {
        const vc = Math.sqrt(mu / r);
        const vr = (proj.vx * dx + proj.vy * dy) / r;
        if (Math.abs(vr) < 0.04 * v && Math.abs(v - vc) / vc < 0.09) {
          stateEl.textContent = "orbita circolare";
        } else {
          stateEl.textContent = "orbita ellittica";
        }
      }

      trail.push({ x: proj.x, y: proj.y });
      if (trail.length > 600) trail.shift();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = "rgba(141,149,163,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(W, cy);
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, H);
      ctx.stroke();

      ctx.setLineDash([3, 6]);
      for (const r of [R0, R0 * 1.4, R0 * 1.9]) {
        ctx.strokeStyle = "rgba(240,180,90,0.10)";
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, STAR_R * 3.4);
      glow.addColorStop(0, "rgba(240,180,90,0.5)");
      glow.addColorStop(0.55, "rgba(240,180,90,0.12)");
      glow.addColorStop(1, "rgba(240,180,90,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, STAR_R * 3.4, 0, Math.PI * 2);
      ctx.fill();

      const star = ctx.createRadialGradient(cx, cy, 0, cx, cy, STAR_R);
      star.addColorStop(0, "#fff3d6");
      star.addColorStop(0.5, "#f0b45a");
      star.addColorStop(1, "#c98a35");
      ctx.fillStyle = star;
      ctx.beginPath();
      ctx.arc(cx, cy, STAR_R, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 1; i < trail.length; i++) {
        const a0 = (i / trail.length) * 0.7;
        ctx.strokeStyle = `rgba(127,208,198,${a0.toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#7fd0c6";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#eafaf7";
      ctx.fill();
    }

    function handlePreset(e) {
      const btn = e.target.closest("[data-preset]");
      if (!btn) return;
      const map = { caduta: 0.35, circolare: 1, ellittica: 1.25, fuga: 1.45 };
      vSlider.value = String(map[btn.dataset.preset]);
      relaunch();
    }

    document.querySelectorAll(".preset").forEach(b => b.addEventListener("click", handlePreset));
    vSlider.addEventListener("input", relaunch);
    massSlider.addEventListener("input", relaunch);
    resetBtn.addEventListener("click", relaunch);

    setup();
    window.addEventListener("resize", setup);

    return { update, draw };
  })();

  /* ---------- Visibility helper ---------- */

  function trackVisibility(el) {
    let visible = false;
    const obs = new IntersectionObserver(
      entries => { visible = entries[0].isIntersecting; },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => visible;
  }

  /* ---------- Mini chart ---------- */

  function drawChart(canvas, values, { min = 0, max = 1, color = "#7fd0c6" } = {}) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const n = values.length;
    if (n < 2) return;
    const pad = 6;
    const span = max - min || 1;
    ctx.strokeStyle = "rgba(141,149,163,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, h - pad - ((0 - min) / span) * (h - pad * 2));
    ctx.lineTo(w - pad, h - pad - ((0 - min) / span) * (h - pad * 2));
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = pad + (i / (n - 1)) * (w - pad * 2);
      const y = h - pad - ((values[i] - min) / span) * (h - pad * 2);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    const ly = h - pad - ((values[n - 1] - min) / span) * (h - pad * 2);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(w - pad, ly, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ---------- Esperimento 03.01 · GPS ---------- */

  const gpsSim = (() => {
    const canvas = document.getElementById("canvas-gps");
    const chipEl = document.getElementById("gps-chip");
    const dayEl = document.getElementById("gps-day");
    const errEl = document.getElementById("gps-error");
    const satEl = document.getElementById("gps-sat");
    const toggleBtn = document.getElementById("gps-toggle");
    const resetBtn = document.getElementById("gps-reset");
    const chart = document.getElementById("chart-gps");

    const DAY = 12;
    const DRIFT_PX = 110;

    let ctx, W, H, route, routeLen;
    let t = 0, correction = true, trail = [], errSeries = [];
    const isVisible = trackVisibility(canvas);

    function arcLen(pts) {
      let L = 0;
      for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      return L;
    }

    function pointAtFrac(f) {
      const target = f * routeLen;
      let acc = 0;
      for (let i = 1; i < route.length; i++) {
        const seg = Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
        if (acc + seg >= target || i === route.length - 1) {
          const local = seg === 0 ? 0 : (target - acc) / seg;
          return {
            x: route[i - 1].x + (route[i].x - route[i - 1].x) * local,
            y: route[i - 1].y + (route[i].y - route[i - 1].y) * local,
            nx: (route[i].y - route[i - 1].y) / (seg || 1),
            ny: -(route[i].x - route[i - 1].x) / (seg || 1)
          };
        }
        acc += seg;
      }
      return { x: route[route.length - 1].x, y: route[route.length - 1].y, nx: 1, ny: 0 };
    }

    function setup() {
      const s = sizeCanvas(canvas);
      ctx = s.ctx;
      W = s.w;
      H = s.h;
      route = [
        { x: W * 0.14, y: H * 0.82 },
        { x: W * 0.38, y: H * 0.82 },
        { x: W * 0.38, y: H * 0.5 },
        { x: W * 0.62, y: H * 0.5 },
        { x: W * 0.62, y: H * 0.24 },
        { x: W * 0.84, y: H * 0.24 }
      ];
      routeLen = arcLen(route);
      reset();
    }

    function reset() {
      t = 0;
      trail = [];
      errSeries = [];
      chipEl.textContent = correction ? "correzione attiva" : "correzione disattivata";
      toggleBtn.textContent = correction ? "Spegni la correzione" : "Riaccendi la correzione";
    }

    function update(dt) {
      if (!isVisible()) return;
      const done = t >= DAY;
      if (!done) t += dt;
      const f = clamp(t / DAY, 0, 1);
      const errKm = correction ? 0 : f * 10;
      const drift = (errKm / 10) * DRIFT_PX;
      const p = pointAtFrac(f);
      const car = { x: p.x + p.nx * drift, y: p.y + p.ny * drift };
      trail.push(car);
      if (trail.length > 400) trail.shift();

      const h = Math.floor(f * 24);
      const m = Math.floor((f * 24 - h) * 60);
      dayEl.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      errEl.textContent = `${errKm.toFixed(1)} km`;
      satEl.textContent = `${(f * 38).toFixed(1)} µs`;

      errSeries.push(errKm);
      if (errSeries.length > 480) errSeries.shift();

      if (done) chipEl.textContent = correction ? "destinazione raggiunta" : "fuori di ~10 km";
    }

    function draw() {
      if (!isVisible()) return;
      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = "rgba(141,149,163,0.10)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 44) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y += 44) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(127,208,198,0.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      route.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
      ctx.stroke();

      const dest = route[route.length - 1];
      ctx.strokeStyle = "#f0b45a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dest.x - 7, dest.y - 7);
      ctx.lineTo(dest.x + 7, dest.y + 7);
      ctx.moveTo(dest.x + 7, dest.y - 7);
      ctx.lineTo(dest.x - 7, dest.y + 7);
      ctx.stroke();
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "#f0b45a";
      ctx.textAlign = "center";
      ctx.fillText("META", dest.x, dest.y - 14);

      for (let i = 1; i < trail.length; i++) {
        const a0 = (i / trail.length) * 0.65;
        ctx.strokeStyle = `rgba(240,180,90,${a0.toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }

      const car = trail[trail.length - 1];
      if (car) {
        ctx.fillStyle = "#ece4d0";
        ctx.beginPath();
        ctx.arc(car.x, car.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0b0e15";
        ctx.beginPath();
        ctx.arc(car.x, car.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!correction && t >= DAY) {
        ctx.setLineDash([4, 5]);
        ctx.strokeStyle = "rgba(240,120,100,0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(dest.x, dest.y);
        ctx.lineTo(car.x, car.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#f07864";
        ctx.fillText("~10 km", (dest.x + car.x) / 2, (dest.y + car.y) / 2 - 8);
      }
      ctx.textAlign = "left";

      drawChart(chart, errSeries, { min: 0, max: 10, color: "#f0b45a" });
    }

    toggleBtn.addEventListener("click", () => {
      correction = !correction;
      reset();
    });
    resetBtn.addEventListener("click", reset);
    setup();
    window.addEventListener("resize", setup);

    return { update, draw };
  })();

  /* ---------- Esperimento 03.02 · Maree ---------- */

  const tideSim = (() => {
    const canvas = document.getElementById("canvas-tide");
    const chipEl = document.getElementById("tide-chip");
    const clockEl = document.getElementById("tide-clock");
    const levelEl = document.getElementById("tide-level");
    const nextEl = document.getElementById("tide-next");
    const sunBtn = document.getElementById("tide-sun");
    const chart = document.getElementById("chart-tide");

    const DAY2S = 20;
    const TL = 12.42;
    const TS = 12;
    const A_LUNAR = 1.0;
    const A_SUN = 0.4;

    let ctx, W, H, cx, cy, R;
    let t = 0, sunOn = false, series = [];
    const isVisible = trackVisibility(canvas);

    function setup() {
      const s = sizeCanvas(canvas);
      ctx = s.ctx;
      W = s.w;
      H = s.h;
      cx = W / 2;
      cy = H / 2;
      R = Math.min(W, H) * 0.2;
    }

    function levelAt(hours) {
      return (
        A_LUNAR * Math.cos((2 * Math.PI * hours) / TL) +
        (sunOn ? A_SUN * Math.cos((2 * Math.PI * hours) / TS) : 0)
      );
    }

    function nextHigh(h0) {
      let best = { h: h0 + 13, v: -Infinity };
      for (let hh = 0.05; hh <= 13.01; hh += 0.05) {
        const v = levelAt(h0 + hh);
        if (v > best.v) best = { h: h0 + hh, v };
      }
      const delta = best.h - h0;
      const totalMin = delta * 60;
      const hh = Math.floor(totalMin / 60);
      const mm = Math.floor(totalMin % 60);
      return `tra ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }

    function update(dt) {
      if (!isVisible()) return;
      t += dt;
      const h = (t / DAY2S) * 24;
      const level = levelAt(h);
      const hour = Math.floor(h) % 24;
      const min = Math.floor((h % 1) * 60);
      clockEl.textContent = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      levelEl.textContent = `${level >= 0 ? "+" : ""}${level.toFixed(1)} m`;
      nextEl.textContent = nextHigh(h);

      if (level > 0.5) chipEl.textContent = "marea: alta";
      else if (level < -0.5) chipEl.textContent = "marea: bassa";
      else chipEl.textContent = "mezza marea";

      series.push({ h, level });
      if (series.length > 240) series.shift();
    }

    function draw() {
      if (!isVisible()) return;
      ctx.clearRect(0, 0, W, H);
      const h = (t / DAY2S) * 24;
      const moonA = (t / (DAY2S * 1.0347)) * 2 * Math.PI - Math.PI / 2;
      const sunA = (t / DAY2S) * 2 * Math.PI + Math.PI * 0.25;
      const level = levelAt(h);

      ctx.beginPath();
      const steps = 160;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * 2 * Math.PI;
        const r = R + 3 + 7 * Math.cos(a - moonA) + (sunOn ? 2.8 * Math.cos(a - sunA) : 0);
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      const ocean = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R + 16);
      ocean.addColorStop(0, "#1c3a47");
      ocean.addColorStop(1, "#0e2733");
      ctx.fillStyle = ocean;
      ctx.fill();

      const land = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
      land.addColorStop(0, "#35503f");
      land.addColorStop(1, "#23352c");
      ctx.fillStyle = land;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(127,208,198,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R + 3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(141,149,163,0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R + 48, 0, Math.PI * 2);
      ctx.stroke();

      const mx = cx + (R + 48) * Math.cos(moonA);
      const my = cy + (R + 48) * Math.sin(moonA);
      ctx.fillStyle = "#cfd3da";
      ctx.beginPath();
      ctx.arc(mx, my, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(120,125,135,0.7)";
      ctx.beginPath();
      ctx.arc(mx - 2, my - 1, 2.4, 0, Math.PI * 2);
      ctx.arc(mx + 2, my + 2, 1.8, 0, Math.PI * 2);
      ctx.fill();

      if (sunOn) {
        const sx = cx + (R + 70) * Math.cos(sunA);
        const sy = cy + (R + 70) * Math.sin(sunA);
        const sunGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 18);
        sunGlow.addColorStop(0, "rgba(240,180,90,0.9)");
        sunGlow.addColorStop(1, "rgba(240,180,90,0)");
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sx, sy, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f0b45a";
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      const gx = W * 0.08;
      const gTop = H * 0.28;
      const gBot = H * 0.72;
      const gMid = (gTop + gBot) / 2;
      const half = (gBot - gTop) / 2;
      ctx.strokeStyle = "rgba(141,149,163,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gx, gTop);
      ctx.lineTo(gx, gBot);
      ctx.stroke();
      ctx.lineWidth = 1;
      for (let v = -1; v <= 1; v++) {
        const y = gMid - (v / 1.5) * half;
        ctx.beginPath();
        ctx.moveTo(gx - 5, y);
        ctx.lineTo(gx + 5, y);
        ctx.stroke();
        ctx.fillStyle = "rgba(141,149,163,0.6)";
        ctx.font = "9px 'IBM Plex Mono', monospace";
        ctx.fillText(`${v > 0 ? "+" : ""}${v}`, gx - 26, y + 3);
      }
      const markerY = gMid - (level / 1.5) * half;
      ctx.fillStyle = "#7fd0c6";
      ctx.beginPath();
      ctx.arc(gx, markerY, 4, 0, Math.PI * 2);
      ctx.fill();

      drawChart(chart, series.map(s => s.level), { min: -1.5, max: 1.5, color: "#7fd0c6" });
    }

    sunBtn.addEventListener("click", () => {
      sunOn = !sunOn;
      sunBtn.textContent = `Sole: ${sunOn ? "on" : "off"}`;
      sunBtn.classList.toggle("is-active", sunOn);
    });
    setup();
    window.addEventListener("resize", setup);

    return { update, draw };
  })();

  /* ---------- Esperimento 03.03 · Sfericità ---------- */

  const sphereSim = (() => {
    const canvSmall = document.getElementById("canvas-sphere-small");
    const canvBig = document.getElementById("canvas-sphere-big");
    const pctS = document.getElementById("sphere-small-pct");
    const pctB = document.getElementById("sphere-big-pct");
    const gSlider = document.getElementById("sphere-g");
    const goBtn = document.getElementById("sphere-go");
    const resetBtn = document.getElementById("sphere-reset");

    const SMALL = { n: 70, factor: 0.28, jitterBase: 0.5, jitterExtra: 0.8, minD: 10, color: "#9aa3b2" };
    const BIG = { n: 150, factor: 1, jitterBase: 0, jitterExtra: 0.05, minD: 6, color: "#7fd0c6" };

    let ctxS, ctxB, WS, HS, WB, HB;
    let small, big, running = false;
    const isVisible = trackVisibility(canvSmall);

    function setup() {
      const s = sizeCanvas(canvSmall);
      ctxS = s.ctx;
      WS = s.w;
      HS = s.h;
      const b = sizeCanvas(canvBig);
      ctxB = b.ctx;
      WB = b.w;
      HB = b.h;
      generate();
    }

    function generate() {
      small = genParticles(SMALL);
      big = genParticles(BIG);
    }

    function genParticles(cfg) {
      const pts = [];
      for (let i = 0; i < cfg.n; i++) {
        const ccx = (Math.random() - 0.5) * 50;
        const ccy = (Math.random() - 0.5) * 50;
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * 38;
        pts.push({ x: ccx + Math.cos(ang) * rad, y: ccy + Math.sin(ang) * rad, vx: 0, vy: 0 });
      }
      return pts;
    }

    function comOf(pts) {
      let x = 0, y = 0;
      for (const p of pts) { x += p.x; y += p.y; }
      return { x: x / pts.length, y: y / pts.length };
    }

    function step(pts, cfg, g) {
      const com = comOf(pts);
      for (const p of pts) {
        const dx = com.x - p.x, dy = com.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const acc = g * cfg.factor * d * 0.006;
        p.vx += (dx / d) * acc;
        p.vy += (dy / d) * acc;
        if (d < cfg.minD) {
          p.vx -= (dx / d) * 0.5;
          p.vy -= (dy / d) * 0.5;
        }
        const jit = cfg.jitterBase + cfg.jitterExtra * (1 - g);
        if (jit > 0) {
          p.vx += (Math.random() - 0.5) * jit * 1.4;
          p.vy += (Math.random() - 0.5) * jit * 1.4;
        }
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.x += p.vx;
        p.y += p.vy;
      }
    }

    function sphericity(pts) {
      const com = comOf(pts);
      let sum = 0, sum2 = 0;
      for (const p of pts) {
        const d = Math.hypot(p.x - com.x, p.y - com.y);
        sum += d;
        sum2 += d * d;
      }
      const mean = sum / pts.length;
      const std = Math.sqrt(Math.max(0, sum2 / pts.length - mean * mean));
      return Math.round(clamp(1 - std / mean, 0, 1) * 100);
    }

    function drawCloud(ctx, w, h, pts, cfg) {
      ctx.clearRect(0, 0, w, h);
      const com = comOf(pts);
      let sum = 0;
      for (const p of pts) sum += Math.hypot(p.x - com.x, p.y - com.y);
      const mean = sum / pts.length;
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = "rgba(240,180,90,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, mean, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(127,208,198,0.4)";
      ctx.beginPath();
      ctx.moveTo(w / 2 - mean, h / 2);
      ctx.lineTo(w / 2 + mean, h / 2);
      ctx.moveTo(w / 2, h / 2 - mean);
      ctx.lineTo(w / 2, h / 2 + mean);
      ctx.stroke();
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(w / 2 + p.x, h / 2 + p.y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = cfg.color;
        ctx.fill();
      }
    }

    function update(dt) {
      if (!isVisible()) return;
      const g = parseFloat(gSlider.value) / 100;
      if (running && g > 0) {
        step(small, SMALL, g);
        step(big, BIG, g);
      }
      pctS.textContent = sphericity(small) + "%";
      pctB.textContent = sphericity(big) + "%";
    }

    function draw() {
      if (!isVisible()) return;
      drawCloud(ctxS, WS, HS, small, SMALL);
      drawCloud(ctxB, WB, HB, big, BIG);
    }

    goBtn.addEventListener("click", () => {
      running = !running;
      goBtn.textContent = running ? "Metti in pausa" : "Accendi la gravità";
      goBtn.classList.toggle("is-active", running);
    });
    resetBtn.addEventListener("click", () => {
      gSlider.value = "0";
      running = false;
      goBtn.textContent = "Accendi la gravità";
      goBtn.classList.remove("is-active");
      generate();
    });
    setup();
    window.addEventListener("resize", setup);

    return { update, draw };
  })();

  /* ---------- Esperimento 03.04 · Sonde spaziali ---------- */

  const probeSim = (() => {
    const canvas = document.getElementById("canvas-probe");
    const chipEl = document.getElementById("probe-chip");
    const durEl = document.getElementById("probe-dur");
    const outEl = document.getElementById("probe-out");
    const phaseSlider = document.getElementById("probe-phase");
    const launchBtn = document.getElementById("probe-launch");
    const guideBtn = document.getElementById("probe-guide");

    const wE = (2 * Math.PI) / 12;
    const wM = (2 * Math.PI) / 24;
    const Ttr = 7;
    const idealLead = Math.PI - wM * Ttr;

    let ctx, W, H, cx, cy, rE, rM;
    let state = "idle", tEarth = 0, probe = null, guide = false;
    const isVisible = trackVisibility(canvas);

    function setup() {
      const s = sizeCanvas(canvas);
      ctx = s.ctx;
      W = s.w;
      H = s.h;
      cx = W / 2;
      cy = H / 2;
      rE = Math.min(W, H) * 0.3;
      rM = rE * 1.524;
      reset();
    }

    function reset() {
      state = "idle";
      probe = null;
      tEarth = 0;
      durEl.textContent = "—";
      outEl.textContent = "—";
      chipEl.textContent = "in attesa";
    }

    function phaseRad() {
      return (parseFloat(phaseSlider.value) * Math.PI) / 180;
    }

    function launch() {
      if (state === "flight") return;
      const eA = tEarth * wE;
      probe = { nu: 0, t: 0, theta0: eA, mars0: eA + idealLead + phaseRad() };
      state = "flight";
      chipEl.textContent = "viaggio in corso";
      durEl.textContent = "≈ 9 mesi";
    }

    function update(dt) {
      if (!isVisible()) return;
      tEarth += dt;
      if (state === "flight" && probe) {
        probe.t += dt;
        const f = clamp(probe.t / Ttr, 0, 1);
        probe.nu = f * Math.PI;
        if (f >= 1) {
          state = "arrived";
          const a = (rE + rM) / 2;
          const e = (rM - rE) / (rM + rE);
          const rArr = (a * (1 - e * e)) / (1 + e * Math.cos(Math.PI));
          const marsA = probe.mars0 + wM * Ttr;
          const ax = cx + rArr * Math.cos(probe.theta0 + Math.PI);
          const ay = cy + rArr * Math.sin(probe.theta0 + Math.PI);
          const mx = cx + rM * Math.cos(marsA);
          const my = cy + rM * Math.sin(marsA);
          const dist = Math.hypot(ax - mx, ay - my);
          const missMkm = Math.round((dist * 150) / rE);
          probe.hit = dist < 20;
          if (probe.hit) {
            chipEl.textContent = "presa!";
            outEl.textContent = "sonda su Marte";
          } else {
            chipEl.textContent = "mancato";
            outEl.textContent = `mancata di ${missMkm} M km`;
          }
        }
      }
    }

    function ellipsePoint(nu, theta0) {
      const a = (rE + rM) / 2;
      const e = (rM - rE) / (rM + rE);
      const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
      return { x: cx + r * Math.cos(theta0 + nu), y: cy + r * Math.sin(theta0 + nu) };
    }

    function draw() {
      if (!isVisible()) return;
      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = "rgba(141,149,163,0.18)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, rE, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(240,120,100,0.22)";
      ctx.beginPath();
      ctx.arc(cx, cy, rM, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(141,149,163,0.85)";
      ctx.fillText("Terra", cx + rE + 6, cy + 4);
      ctx.fillStyle = "rgba(240,120,100,0.85)";
      ctx.fillText("Marte", cx + rM + 6, cy + 4);

      const sunGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26);
      sunGlow.addColorStop(0, "rgba(240,180,90,0.8)");
      sunGlow.addColorStop(1, "rgba(240,180,90,0)");
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f0b45a";
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();

      const eA = tEarth * wE;
      const ex = cx + rE * Math.cos(eA);
      const ey = cy + rE * Math.sin(eA);
      ctx.fillStyle = "#7fd0c6";
      ctx.beginPath();
      ctx.arc(ex, ey, 5, 0, Math.PI * 2);
      ctx.fill();

      let marsA;
      if (!probe || state === "idle") {
        marsA = eA + idealLead + phaseRad();
      } else {
        marsA = probe.mars0 + (state === "flight" ? probe.t : Ttr) * wM;
      }
      const mx = cx + rM * Math.cos(marsA);
      const my = cy + rM * Math.sin(marsA);
      ctx.fillStyle = "#f07864";
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = "rgba(240,180,90,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const wA = eA + idealLead;
      ctx.arc(cx, cy, rM, wA - 0.1, wA + 0.1);
      ctx.stroke();
      ctx.setLineDash([]);

      if (guide && state !== "idle" && probe) {
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = "rgba(127,208,198,0.55)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i <= 60; i++) {
          const p = ellipsePoint((i / 60) * Math.PI, probe.theta0);
          i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (probe && state !== "idle") {
        const p = ellipsePoint(probe.nu, probe.theta0);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#ece4d0";
        ctx.fill();
        if (state === "arrived" && !probe.hit) {
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = "rgba(240,120,100,0.7)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    launchBtn.addEventListener("click", launch);
    guideBtn.addEventListener("click", () => {
      guide = !guide;
      guideBtn.textContent = `Guida: ${guide ? "on" : "off"}`;
      guideBtn.classList.toggle("is-active", guide);
    });
    setup();
    window.addEventListener("resize", setup);

    return { update, draw };
  })();

  /* ---------- Esperimento 00.1 · Piani inclinati ---------- */

  const rampSim = (() => {
    const canvas = document.getElementById("canvas-ramp");
    const chipEl = document.getElementById("ramp-chip");
    const angleEl = document.getElementById("ramp-angle");
    const heavyT = document.getElementById("ramp-heavy-t");
    const lightT = document.getElementById("ramp-light-t");
    const distEl = document.getElementById("ramp-dist");
    const slider = document.getElementById("ramp-a");
    const goBtn = document.getElementById("ramp-go");
    const resetBtn = document.getElementById("ramp-reset");

    const LEN = 100;
    const G = 11.1;

    let ctx, W, H, S, E, Lpx;
    let running = false, done = false;
    let s = 0, t = 0, markers = [];
    const isVisible = trackVisibility(canvas);

    function setup() {
      const s = sizeCanvas(canvas);
      ctx = s.ctx;
      W = s.w;
      H = s.h;
      Lpx = Math.min(W, H) * 0.52;
      const theta = angleRad();
      E = { x: W * 0.8, y: H * 0.78 };
      S = { x: E.x - Lpx * Math.cos(theta), y: E.y - Lpx * Math.sin(theta) };
      reset();
    }

    function angleDeg() { return parseFloat(slider.value); }
    function angleRad() { return (angleDeg() * Math.PI) / 180; }

    function reset() {
      running = false;
      done = false;
      s = 0;
      t = 0;
      markers = [];
      chipEl.textContent = "a riposo";
      heavyT.textContent = "—";
      lightT.textContent = "—";
      distEl.textContent = "0,0 cm";
    }

    function pointAt(sv) {
      return {
        x: S.x + (sv / LEN) * (E.x - S.x),
        y: S.y + (sv / LEN) * (E.y - S.y)
      };
    }

    function update(dt) {
      if (!isVisible()) return;
      if (!running) return;
      const a = G * Math.sin(angleRad());
      t += dt;
      s = 0.5 * a * t * t;
      if (s >= LEN) {
        s = LEN;
        running = false;
        done = true;
        chipEl.textContent = "arrivate insieme";
      }
      if (markers.length === 0 || t - markers[markers.length - 1].t >= 0.8) {
        markers.push({ t, s });
      }
      const fmt = v => `${v.toFixed(1).replace(".", ",")} s`;
      heavyT.textContent = fmt(t);
      lightT.textContent = fmt(t);
      distEl.textContent = `${s.toFixed(1).replace(".", ",")} cm`;
    }

    function draw() {
      if (!isVisible()) return;
      ctx.clearRect(0, 0, W, H);

      const gy = H * 0.82;
      ctx.strokeStyle = "rgba(141,149,163,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W * 0.08, gy);
      ctx.lineTo(W * 0.95, gy);
      ctx.stroke();

      ctx.strokeStyle = "#c9c2ae";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(S.x, S.y);
      ctx.lineTo(E.x, E.y);
      ctx.stroke();
      ctx.lineCap = "butt";

      for (let cm = 0; cm <= LEN; cm += 20) {
        const p = pointAt(cm);
        ctx.strokeStyle = "rgba(141,149,163,0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x - 4, p.y + 4);
        ctx.lineTo(p.x + 4, p.y - 4);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(127,208,198,0.18)";
      for (const m of markers) {
        const p = pointAt(m.s);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      const normal = (() => {
        const dx = E.x - S.x, dy = E.y - S.y;
        const d = Math.hypot(dx, dy) || 1;
        return { x: -dy / d, y: dx / d };
      })();
      const bp = pointAt(s);

      ctx.fillStyle = "#7fd0c6";
      ctx.beginPath();
      ctx.arc(bp.x + normal.x * 8, bp.y + normal.y * 8, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f0b45a";
      ctx.beginPath();
      ctx.arc(bp.x - normal.x * 8, bp.y - normal.y * 8, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(141,149,163,0.85)";
      ctx.fillText(`${angleDeg()}°`, S.x - 30, S.y + 4);
    }

    slider.addEventListener("input", () => {
      angleEl.textContent = `${angleDeg()}°`;
      setup();
    });
    goBtn.addEventListener("click", () => {
      if (done) return;
      running = true;
      chipEl.textContent = "rotolando…";
    });
    resetBtn.addEventListener("click", reset);
    setup();
    window.addEventListener("resize", setup);

    return { update, draw };
  })();

  /* ---------- Esperimento 00.2 · L'esperimento ideale ---------- */

  const thoughtSim = (() => {
    const canvas = document.getElementById("canvas-thought");
    const chipEl = document.getElementById("thought-chip");
    const comboEl = document.getElementById("thought-combo");
    const aristEl = document.getElementById("thought-arist");
    const logicEl = document.getElementById("thought-logic");
    const tieBtn = document.getElementById("thought-tie");
    const resetBtn = document.getElementById("thought-reset");

    let ctx, W, H;
    let phase = 0, phaseT = 0;
    const isVisible = trackVisibility(canvas);

    function setup() {
      const s = sizeCanvas(canvas);
      ctx = s.ctx;
      W = s.w;
      H = s.h;
      reset();
    }

    function reset() {
      phase = 0;
      phaseT = 0;
      chipEl.textContent = "in attesa";
      comboEl.textContent = "pesante + leggero";
      aristEl.textContent = "più pesante → più veloce";
      logicEl.textContent = "frena il pesante";
      tieBtn.textContent = "Legali insieme";
      tieBtn.classList.remove("is-active");
    }

    function update(dt) {
      if (!isVisible()) return;
      if (phase === 0) return;
      phaseT += dt;
      if (phase === 1 && phaseT >= 1.4) {
        phase = 2;
        phaseT = 0;
      } else if (phase === 2 && phaseT >= 3) {
        phase = 3;
        chipEl.textContent = "contraddizione → cadono uguali";
      }
    }

    function draw() {
      if (!isVisible()) return;
      ctx.clearRect(0, 0, W, H);

      const gy = H * 0.84;
      ctx.strokeStyle = "rgba(141,149,163,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W * 0.08, gy);
      ctx.lineTo(W * 0.92, gy);
      ctx.stroke();

      const heavy = { x: W * 0.36, y: H * 0.42, r: 16 };
      const light = { x: W * 0.64, y: H * 0.42, r: 9 };

      if (phase === 0) {
        ctx.fillStyle = "#7fd0c6";
        ctx.beginPath();
        ctx.arc(heavy.x, heavy.y, heavy.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f0b45a";
        ctx.beginPath();
        ctx.arc(light.x, light.y, light.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "11px 'IBM Plex Mono', monospace";
        ctx.fillStyle = "rgba(141,149,163,0.9)";
        ctx.fillText("pesante", heavy.x - 26, heavy.y + heavy.r + 22);
        ctx.fillText("leggero", light.x - 24, light.y + light.r + 22);
      } else {
        const prog = phase === 1 ? 0 : clamp(phaseT / 3, 0, 1);
        const fall = prog * (gy - H * 0.42 - heavy.r);
        const hy = H * 0.42 + fall;
        const ly = H * 0.42 + fall;

        if (prog < 1) {
          ctx.strokeStyle = "rgba(127,208,198,0.75)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(heavy.x, heavy.y);
          ctx.quadraticCurveTo(
            (heavy.x + light.x) / 2,
            (heavy.y + light.y) / 2 - 34,
            light.x, light.y
          );
          ctx.stroke();
        }

        ctx.fillStyle = "#7fd0c6";
        ctx.beginPath();
        ctx.arc(heavy.x, hy, heavy.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f0b45a";
        ctx.beginPath();
        ctx.arc(light.x, ly, light.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = "10px 'IBM Plex Mono', monospace";
        if (phase >= 2) {
          ctx.fillStyle = "rgba(127,208,198,0.95)";
          ctx.fillText("più veloce!", heavy.x - 30, hy - heavy.r - 12);
          ctx.fillStyle = "rgba(240,180,90,0.95)";
          ctx.fillText("più lento?", light.x - 28, ly - light.r - 12);
        } else {
          ctx.fillStyle = "rgba(141,149,163,0.9)";
          ctx.fillText("li ho legati…", W / 2 - 44, H * 0.16);
        }

        if (phase === 3) {
          ctx.fillStyle = "#7fd0c6";
          ctx.font = "bold 20px 'IBM Plex Mono', monospace";
          ctx.fillText("✓ uguali", W / 2 - 46, H * 0.18);
        }
      }
    }

    tieBtn.addEventListener("click", () => {
      if (phase !== 0) return;
      phase = 1;
      phaseT = 0;
      chipEl.textContent = "il sistema pesa più di prima";
      comboEl.textContent = "pesante + leggero = ancora più pesante";
      aristEl.textContent = "→ dovrebbe cadere più veloce";
      logicEl.textContent = "→ il leggero lo tira indietro";
      tieBtn.textContent = "Due previsioni opposte";
      tieBtn.classList.add("is-active");
    });
    resetBtn.addEventListener("click", reset);
    setup();
    window.addEventListener("resize", setup);

    return { update, draw };
  })();

  /* ---------- Esperimento 00.3 · L'ascensore di Einstein ---------- */

  const elevSim = (() => {
    const canvas = document.getElementById("canvas-elevator");
    const chipEl = document.getElementById("elev-chip");
    const resultEl = document.getElementById("elev-result");
    const timeEl = document.getElementById("elev-time");
    const spaceBtn = document.getElementById("elev-mode-space");
    const earthBtn = document.getElementById("elev-mode-earth");
    const dropBtn = document.getElementById("elev-drop");
    const resetBtn = document.getElementById("elev-reset");

    let ctx, W, H;
    let mode = "space", state = "idle";
    let t = 0, dropDist, aPx, stars = [];
    const isVisible = trackVisibility(canvas);

    function setup() {
      const s = sizeCanvas(canvas);
      ctx = s.ctx;
      W = s.w;
      H = s.h;
      dropDist = H * 0.58;
      aPx = (2 * dropDist) / (1.4 * 1.4);
      stars = [];
      for (let i = 0; i < 46; i++) {
        stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.2 + 0.2 });
      }
      reset();
    }

    function reset() {
      state = "idle";
      t = 0;
      resultEl.textContent = "—";
      timeEl.textContent = "—";
      chipEl.textContent = mode === "space" ? "spazio profondo · accelera a 1g" : "fermo sulla Terra · gravità 1g";
    }

    function setMode(m) {
      mode = m;
      spaceBtn.classList.toggle("is-active", m === "space");
      earthBtn.classList.toggle("is-active", m === "earth");
      reset();
    }

    function update(dt) {
      if (!isVisible()) return;
      if (state !== "falling") return;
      t += dt;
      const d = 0.5 * aPx * t * t;
      if (d >= dropDist) {
        state = "done";
        t = Math.sqrt((2 * dropDist) / aPx);
        resultEl.textContent = "toccano il pavimento insieme";
        timeEl.textContent = `${t.toFixed(1).replace(".", ",")} s`;
      }
    }

    function draw() {
      if (!isVisible()) return;
      ctx.clearRect(0, 0, W, H);

      const cw = W * 0.76;
      const cx0 = (W - cw) / 2;
      const cy0 = H * 0.1;
      const ch = H * 0.72;
      const floorY = cy0 + ch;

      if (mode === "space") {
        ctx.fillStyle = "rgba(217,214,200,0.7)";
        for (const st of stars) {
          ctx.beginPath();
          ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.strokeStyle = "rgba(127,208,198,0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(W / 2, floorY + H * 0.6, H * 0.5, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = "rgba(240,120,100,0.25)";
        ctx.fillRect(W * 0.12, floorY + 3, W * 0.76, 3);
        ctx.font = "10px 'IBM Plex Mono', monospace";
        ctx.fillStyle = "rgba(141,149,163,0.8)";
        ctx.fillText("Terra", W * 0.08, floorY + 20);
      }

      ctx.fillStyle = "rgba(20,24,34,0.82)";
      ctx.fillRect(cx0, cy0, cw, ch);
      ctx.strokeStyle = "rgba(127,208,198,0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(cx0, cy0, cw, ch);
      ctx.strokeStyle = "rgba(127,208,198,0.22)";
      ctx.beginPath();
      ctx.moveTo(cx0, floorY);
      ctx.lineTo(cx0 + cw, floorY);
      ctx.stroke();

      const ox = W * 0.3;
      const hx = W * 0.52;
      const fx = W * 0.62;
      const releaseY = cy0 + H * 0.14;
      const fall = state === "falling" ? Math.min(0.5 * aPx * t * t, dropDist) : 0;
      const hfY = Math.min(releaseY + fall, floorY - 6);
      const ffY = Math.min(releaseY + fall, floorY - 4);

      ctx.strokeStyle = "rgba(236,228,208,0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ox, floorY - 30, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox, floorY - 23);
      ctx.lineTo(ox, floorY - 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox, floorY - 20);
      ctx.lineTo(ox - 7, floorY);
      ctx.moveTo(ox, floorY - 20);
      ctx.lineTo(ox + 7, floorY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox, floorY - 17);
      ctx.lineTo(ox + 14, floorY - 10);
      ctx.moveTo(ox, floorY - 17);
      ctx.lineTo(ox + 14, floorY + 2);
      ctx.stroke();

      ctx.fillStyle = "#7fd0c6";
      ctx.fillRect(hx - 9, hfY - 12, 18, 12);
      ctx.beginPath();
      ctx.moveTo(hx - 9, hfY - 12);
      ctx.lineTo(hx - 11, hfY - 20);
      ctx.lineTo(hx - 4, hfY - 12);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#f0b45a";
      ctx.beginPath();
      ctx.ellipse(fx, ffY - 6, 6, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f0b45a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(fx, ffY - 15);
      ctx.lineTo(fx + 12, ffY - 24);
      ctx.stroke();

      if (mode === "space") {
        ctx.fillStyle = "rgba(141,149,163,0.6)";
        ctx.fillRect(cx0 + cw / 2 - 16, floorY, 32, 16);
        ctx.beginPath();
        ctx.moveTo(cx0 + cw / 2 - 12, floorY + 16);
        ctx.lineTo(cx0 + cw / 2 + 12, floorY + 16);
        ctx.lineTo(cx0 + cw / 2 + 5, floorY + 44);
        ctx.lineTo(cx0 + cw / 2 - 5, floorY + 44);
        ctx.closePath();
        const fl = ctx.createLinearGradient(0, floorY + 16, 0, floorY + 46);
        fl.addColorStop(0, "rgba(240,180,90,0.95)");
        fl.addColorStop(1, "rgba(240,120,60,0)");
        ctx.fillStyle = fl;
        ctx.fill();
        ctx.fillStyle = "rgba(141,149,163,0.8)";
        ctx.font = "10px 'IBM Plex Mono', monospace";
        ctx.fillText("razzo accende", cx0 + cw / 2 - 42, floorY + 58);
      } else {
        ctx.fillStyle = "rgba(141,149,163,0.8)";
        ctx.font = "10px 'IBM Plex Mono', monospace";
        ctx.fillText("cabina ferma al suolo", cx0 + cw / 2 - 62, floorY + 20);
      }

      if (state === "falling") {
        ctx.fillStyle = "rgba(127,208,198,0.6)";
        ctx.font = "10px 'IBM Plex Mono', monospace";
        ctx.fillText(`${t.toFixed(1).replace(".", ",")} s`, cx0 + 10, cy0 + 18);
      }
    }

    spaceBtn.addEventListener("click", () => setMode("space"));
    earthBtn.addEventListener("click", () => setMode("earth"));
    dropBtn.addEventListener("click", () => {
      if (state !== "idle") return;
      state = "falling";
      t = 0;
      resultEl.textContent = "cadono…";
    });
    resetBtn.addEventListener("click", reset);
    setup();
    window.addEventListener("resize", setup);

    return { update, draw };
  })();

  /* ---------- Esperimento 00.4 · Le lastre di Eddington ---------- */

  const eddingSim = (() => {
    const canvas = document.getElementById("canvas-eddington");
    const chipEl = document.getElementById("edding-chip");
    const expectedEl = document.getElementById("edding-expected");
    const measuredEl = document.getElementById("edding-measured");
    const outcomeEl = document.getElementById("edding-outcome");
    const slider = document.getElementById("edding-slider");
    const newtonBtn = document.getElementById("edding-newton");
    const einsteinBtn = document.getElementById("edding-einstein");
    const measureBtn = document.getElementById("edding-measure");
    const resetBtn = document.getElementById("edding-reset");

    const SHIFT_PX = 16;
    const PX_PER_AS = SHIFT_PX / 1.75;
    const trueStar = { r: 1.0, theta: 0 };
    let ctx, W, H, S, R, stars = [];
    let theory = "einstein", measureState = "idle", measT = 0;
    const isVisible = trackVisibility(canvas);

    function setup() {
      const s = sizeCanvas(canvas);
      ctx = s.ctx;
      W = s.w;
      H = s.h;
      S = { x: W * 0.72, y: H * 0.52 };
      R = Math.min(W, H) * 0.14;
      stars = [];
      const rMin = R + 34;
      const rMax = R + 68;
      for (let i = 0; i < 8; i++) {
        const theta = Math.PI * (0.82 + 0.36 * (i / 7));
        const r = rMin + (rMax - rMin) * Math.random();
        stars.push({ r, theta, isNear: i === 3 });
      }
      reset();
    }

    function reset() {
      measureState = "idle";
      measT = 0;
      measuredEl.textContent = "—";
      outcomeEl.textContent = "—";
      applyTheory(theory, false);
      setChip();
    }

    function applyTheory(t, setReadout = true) {
      theory = t;
      newtonBtn.classList.toggle("is-active", t === "newton");
      einsteinBtn.classList.toggle("is-active", t === "einstein");
      if (setReadout) {
        expectedEl.textContent = t === "newton" ? "0,87″ · Newton" : "1,75″ · Einstein";
        if (measureState === "done") updateOutcome();
      }
    }

    function updateOutcome() {
      if (theory === "einstein") {
        outcomeEl.textContent = "concorda con Einstein";
        outcomeEl.style.color = "";
      } else {
        outcomeEl.textContent = "incompatibile con Newton";
        outcomeEl.style.color = "";
      }
    }

    function setChip() {
      const v = parseFloat(slider.value);
      if (measureState === "measuring") {
        chipEl.textContent = "misura in corso…";
      } else if (measureState === "done") {
        chipEl.textContent = theory === "einstein" ? "Einstein confermato" : "Newton smentito";
      } else if (v === 0) {
        chipEl.textContent = "eclissi · giugno 1919";
      } else if (v === 100) {
        chipEl.textContent = "notturno · mesi dopo";
      } else {
        chipEl.textContent = "confronto delle lastre";
      }
    }

    function starPos(star, shiftPx) {
      const rad = star.r + shiftPx;
      return { x: S.x + rad * Math.cos(star.theta), y: S.y + rad * Math.sin(star.theta) };
    }

    function update(dt) {
      if (!isVisible()) return;
      if (measureState !== "measuring") return;
      measT += dt / 2.2;
      if (measT >= 1) {
        measT = 1;
        measureState = "done";
        measuredEl.textContent = "1,75″";
        updateOutcome();
      } else {
        measuredEl.textContent = `${(1.75 * measT).toFixed(2).replace(".", ",")}″`;
      }
      setChip();
    }

    function draw() {
      if (!isVisible()) return;
      ctx.clearRect(0, 0, W, H);

      const t = parseFloat(slider.value) / 100;

      const glow = ctx.createRadialGradient(S.x, S.y, 0, S.x, S.y, R * 3);
      glow.addColorStop(0, "rgba(240,180,90,0.9)");
      glow.addColorStop(0.35, "rgba(240,180,90,0.28)");
      glow.addColorStop(1, "rgba(240,180,90,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(S.x, S.y, R * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f0b45a";
      ctx.beginPath();
      ctx.arc(S.x, S.y, R, 0, Math.PI * 2);
      ctx.fill();

      const near = stars.find(s => s.isNear) || stars[0];
      const eclipseP = starPos(near, SHIFT_PX);
      const trueP = starPos(near, 0);

      if (measureState !== "idle") {
        const p = measT < 1 ? 0.92 : 1;
        const inv = 1 - p;
        const ax = eclipseP.x * p + trueP.x * inv;
        const ay = eclipseP.y * p + trueP.y * inv;
        ctx.strokeStyle = "rgba(127,208,198,0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(trueP.x, trueP.y);
        ctx.lineTo(ax, ay);
        ctx.stroke();
        ctx.fillStyle = "#7fd0c6";
        ctx.beginPath();
        ctx.arc(ax, ay, 4, 0, Math.PI * 2);
        ctx.fill();

        const pxPer = 1 / PX_PER_AS;
        const t87 = { x: trueP.x + (eclipseP.x - trueP.x) * 0.87 / 1.75, y: trueP.y + (eclipseP.y - trueP.y) * 0.87 / 1.75 };
        const highlight = theory === "newton";
        ctx.strokeStyle = highlight ? "rgba(240,180,90,0.95)" : "rgba(141,149,163,0.5)";
        ctx.lineWidth = highlight ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(t87.x - 5, t87.y - 5);
        ctx.lineTo(t87.x + 5, t87.y + 5);
        ctx.stroke();
        ctx.font = "10px 'IBM Plex Mono', monospace";
        ctx.fillStyle = highlight ? "#f0b45a" : "rgba(141,149,163,0.75)";
        ctx.fillText("0,87″", t87.x + 8, t87.y + 10);

        ctx.font = "10px 'IBM Plex Mono', monospace";
        ctx.fillStyle = "rgba(127,208,198,0.9)";
        ctx.fillText("1,75″", trueP.x + 8, trueP.y + 10);
      }

      for (const star of stars) {
        const ep = starPos(star, SHIFT_PX);
        const tp = starPos(star, 0);
        if (star.isNear) continue;
        const x = ep.x * (1 - t) + tp.x * t;
        const y = ep.y * (1 - t) + tp.y * t;
        ctx.fillStyle = "rgba(236,228,208,0.3)";
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(127,208,198,0.3)";
        ctx.beginPath();
        ctx.arc(ep.x, ep.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ece4d0";
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(141,149,163,0.7)";
      ctx.fillText("deflessione esagerata ×~1000", W * 0.06, H - 14);
      ctx.fillText("Sole", S.x - 14, S.y + R + 18);
    }

    slider.addEventListener("input", setChip);
    newtonBtn.addEventListener("click", () => applyTheory("newton"));
    einsteinBtn.addEventListener("click", () => applyTheory("einstein"));
    measureBtn.addEventListener("click", () => {
      if (measureState === "measuring") return;
      measureState = "measuring";
      measT = 0;
      setChip();
    });
    resetBtn.addEventListener("click", reset);
    setup();
    window.addEventListener("resize", setup);

    return { update, draw };
  })();

  /* ---------- Esperimento 00.5 · La camera a vuoto ---------- */

  const vacSim = (() => {
    const canvas = document.getElementById("canvas-vacuum");
    const chipEl = document.getElementById("vacuum-chip");
    const ballTimeEl = document.getElementById("vacuum-time-ball");
    const featherTimeEl = document.getElementById("vacuum-time-feather");
    const outcomeEl = document.getElementById("vacuum-outcome");
    const airBtn = document.getElementById("vacuum-air");
    const vacuumBtn = document.getElementById("vacuum-vacuum");
    const dropBtn = document.getElementById("vacuum-drop");
    const resetBtn = document.getElementById("vacuum-reset");

    let ctx, W, H, chamber, dist;
    let mode = "air", falling = false, t = 0;
    const landed = { ball: false, feather: false };
    let molecules = [];
    const isVisible = trackVisibility(canvas);

    function setup() {
      const s = sizeCanvas(canvas);
      ctx = s.ctx;
      W = s.w;
      H = s.h;
      chamber = { x0: W * 0.26, x1: W * 0.74, top: 46, floor: H - 64 };
      dist = chamber.floor - chamber.top - 30;
      molecules = [];
      for (let i = 0; i < 46; i++) {
        molecules.push({
          x: chamber.x0 + 8 + Math.random() * (chamber.x1 - chamber.x0 - 16),
          y: chamber.top + 10 + Math.random() * (chamber.floor - chamber.top - 20),
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 0.5) * 8
        });
      }
      reset();
    }

    function reset() {
      falling = false;
      t = 0;
      landed.ball = false;
      landed.feather = false;
      ballTimeEl.textContent = "—";
      featherTimeEl.textContent = "—";
      outcomeEl.textContent = "—";
    }

    function setMode(m) {
      mode = m;
      airBtn.classList.toggle("is-active", m === "air");
      vacuumBtn.classList.toggle("is-active", m === "vacuum");
      chipEl.textContent = m === "air" ? "con aria" : "vuoto";
    }

    const T = { ball: { air: 1.7, vacuum: 1.4 }, feather: { air: 3.6, vacuum: 1.4 } };

    function update(dt) {
      if (!isVisible() || !falling) return;
      t += dt;
      if (!landed.ball && t >= T.ball[mode]) {
        landed.ball = true;
        ballTimeEl.textContent = `${T.ball[mode].toFixed(2).replace(".", ",")} s`;
      }
      if (!landed.feather && t >= T.feather[mode]) {
        landed.feather = true;
        featherTimeEl.textContent = `${T.feather[mode].toFixed(2).replace(".", ",")} s`;
      }
      if (landed.ball && landed.feather) {
        falling = false;
        outcomeEl.textContent = mode === "vacuum"
          ? "toccano il suolo insieme"
          : "la piuma resta indietro";
      }
    }

    function draw() {
      if (!isVisible()) return;
      ctx.clearRect(0, 0, W, H);
      const c = chamber;

      ctx.fillStyle = "rgba(9,11,17,0.6)";
      ctx.strokeStyle = "rgba(141,149,163,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(c.x0, c.top, c.x1 - c.x0, c.floor - c.top, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(141,149,163,0.5)";
      ctx.fillRect(c.x0, c.top, c.x1 - c.x0, 10);

      if (mode === "air") {
        ctx.fillStyle = "rgba(141,149,163,0.35)";
        for (const m of molecules) {
          m.x += m.vx * 0.016;
          m.y += m.vy * 0.016;
          if (m.x < c.x0 + 4) m.x = c.x1 - 4;
          if (m.x > c.x1 - 4) m.x = c.x0 + 4;
          if (m.y < c.top + 12) m.y = c.floor - 4;
          if (m.y > c.floor - 4) m.y = c.top + 12;
          ctx.beginPath();
          ctx.arc(m.x, m.y, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const startY = c.top + 30;
      const ballR = 13;
      const balls = [
        { x: W * 0.42, r: ballR },
        { x: W * 0.58, r: ballR }
      ];
      for (const b of balls) {
        const y = falling ? startY + (c.floor - startY) * Math.min(1, t / T.ball[mode]) ** 2 : startY;
        const cy = Math.min(y, c.floor - b.r);
        ctx.fillStyle = "#7fd0c6";
        ctx.beginPath();
        ctx.arc(b.x, cy, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(236,228,208,0.5)";
        ctx.beginPath();
        ctx.arc(b.x - 4, cy - 5, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      const fx = W * 0.5;
      const fy = falling ? startY + (c.floor - startY) * Math.min(1, t / T.feather[mode]) ** 2 : startY;
      const fcy = Math.min(fy, c.floor - 14);
      ctx.save();
      ctx.translate(fx, fcy);
      ctx.rotate(-0.5);
      ctx.fillStyle = "#f0b45a";
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(9,11,17,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(0, 13);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = "rgba(127,208,198,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.x0, c.floor);
      ctx.lineTo(c.x1, c.floor);
      ctx.stroke();
    }

    airBtn.addEventListener("click", () => setMode("air"));
    vacuumBtn.addEventListener("click", () => setMode("vacuum"));
    dropBtn.addEventListener("click", () => {
      reset();
      falling = true;
    });
    resetBtn.addEventListener("click", reset);
    setup();
    window.addEventListener("resize", setup);

    return { update, draw };
  })();

  /* ---------- Esperimento 00.6 · MICROSCOPE in orbita ---------- */

  const microSim = (() => {
    const canvas = document.getElementById("canvas-microscope");
    const precisionEl = document.getElementById("micro-precision");
    const outcomeEl = document.getElementById("micro-outcome");
    const slider = document.getElementById("micro-slider");

    const LEVELS = ["10⁻³", "10⁻⁶", "10⁻⁹", "10⁻¹²", "10⁻¹⁵"];
    const BAND = [28, 22, 16, 10, 4];
    let ctx, W, H, level = 0, bob = 0;
    const isVisible = trackVisibility(canvas);

    function setup() {
      const s = sizeCanvas(canvas);
      ctx = s.ctx;
      W = s.w;
      H = s.h;
    }

    function setLevel(l) {
      level = l;
      precisionEl.textContent = `≤ ${LEVELS[l]}`;
      outcomeEl.textContent = l === 4 ? "identici a 1 parte su 10¹⁵" : "ancora identici";
    }

    function update(dt) {
      if (!isVisible()) return;
      bob += dt * 1.4;
    }

    function draw() {
      if (!isVisible()) return;
      ctx.clearRect(0, 0, W, H);

      const ey = H * 0.78;
      const er = H * 0.34;
      const glow = ctx.createRadialGradient(W / 2, ey, 0, W / 2, ey, er * 1.7);
      glow.addColorStop(0, "rgba(127,208,198,0.28)");
      glow.addColorStop(1, "rgba(127,208,198,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(W / 2, ey, er * 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(127,208,198,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W / 2, ey, er, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      ctx.fillStyle = "rgba(236,228,208,0.35)";
      for (let i = 0; i < 26; i++) {
        const x = (i * 53.7 + 31) % W;
        const y = (i * 29.3 + 13) % (H * 0.55);
        ctx.beginPath();
        ctx.arc(x, y, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }

      const bobOff = Math.sin(bob) * 2.5;
      const sx = W / 2, sy = H * 0.34;
      ctx.fillStyle = "rgba(15,19,28,0.9)";
      ctx.strokeStyle = "rgba(141,149,163,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(sx - 96, sy - 34, 192, 68, 10);
      ctx.fill();
      ctx.stroke();

      const cylW = 46, cylH = 30, gap = 20;
      const cylY = sy + bobOff;
      for (const cyl of [{ x: sx - gap / 2 - cylW, fill: "#7fd0c6", label: "Ti" },
                         { x: sx + gap / 2, fill: "#f0b45a", label: "Pt" }]) {
        ctx.strokeStyle = "rgba(141,149,163,0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cyl.x + cylW / 2, sy - 34);
        ctx.lineTo(cyl.x + cylW / 2, cylY - cylH / 2);
        ctx.moveTo(cyl.x + cylW / 2, cylY + cylH / 2);
        ctx.lineTo(cyl.x + cylW / 2, sy + 34);
        ctx.stroke();
        ctx.fillStyle = cyl.fill;
        ctx.beginPath();
        ctx.roundRect(cyl.x, cylY - cylH / 2, cylW, cylH, 6);
        ctx.fill();
        ctx.font = "11px 'IBM Plex Mono', monospace";
        ctx.fillStyle = "rgba(9,11,17,0.8)";
        ctx.textAlign = "center";
        ctx.fillText(cyl.label, cyl.x + cylW / 2, cylY + 4);
        ctx.textAlign = "left";
      }

      const meterY = H * 0.72;
      const x0 = W * 0.16, x1 = W * 0.84;
      ctx.strokeStyle = "rgba(141,149,163,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, meterY);
      ctx.lineTo(x1, meterY);
      ctx.stroke();
      const mid = (x0 + x1) / 2;
      ctx.strokeStyle = "rgba(141,149,163,0.55)";
      ctx.beginPath();
      ctx.moveTo(mid, meterY - 8);
      ctx.lineTo(mid, meterY + 8);
      ctx.stroke();

      const noise = (Math.random() - 0.5) * BAND[level];
      const nw = Math.max(3, BAND[level] / 2);
      for (const c of [{ fill: "#7fd0c6", dy: -4 }, { fill: "#f0b45a", dy: 4 }]) {
        ctx.fillStyle = c.fill;
        ctx.beginPath();
        ctx.roundRect(mid - nw / 2 + noise, meterY - 9 + c.dy, nw, 7, 3);
        ctx.fill();
      }
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(141,149,163,0.75)";
      ctx.fillText("rumore strumentale", x0 + 4, meterY + 22);
      ctx.fillStyle = "rgba(127,208,198,0.8)";
      ctx.fillText("differenza = 0", x1 - 96, meterY + 22);
    }

    slider.addEventListener("input", (e) => setLevel(parseInt(e.target.value, 10)));
    setup();
    window.addEventListener("resize", setup);

    return { update, draw };
  })();

  /* ---------- Esperimento 00.7 · Il laser che misura la Luna ---------- */

  const laserSim = (() => {
    const canvas = document.getElementById("canvas-laser");
    const chipEl = document.getElementById("laser-chip");
    const timeEl = document.getElementById("laser-time");
    const distEl = document.getElementById("laser-distance");
    const countEl = document.getElementById("laser-count");
    const fireBtn = document.getElementById("laser-fire");
    const resetBtn = document.getElementById("laser-reset");

    const TOTAL = 2.51;
    let ctx, W, H, earth, moon, state = "idle", t = 0, count = 0;
    const isVisible = trackVisibility(canvas);

    function setup() {
      const s = sizeCanvas(canvas);
      ctx = s.ctx;
      W = s.w;
      H = s.h;
      earth = { x: W * 0.17, y: H * 0.55, r: Math.min(46, W * 0.09) };
      moon = { x: W * 0.84, y: H * 0.48, r: Math.min(38, W * 0.075) };
    }

    function reset() {
      state = "idle";
      t = 0;
      timeEl.textContent = "—";
      distEl.textContent = "—";
      chipEl.textContent = "Apollo 11 · 14 · 15";
    }

    function update(dt) {
      if (!isVisible() || state !== "flying") return;
      t += dt;
      if (t >= 1) {
        t = 1;
        state = "done";
        timeEl.textContent = "≈ 2,5 s";
        count += 1;
        countEl.textContent = count;
        const jit = Math.random() * 0.004;
        const km = (384400 + jit).toFixed(3).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        distEl.textContent = `${km} km`;
        chipEl.textContent = "Apollo 11 · 14 · 15";
      } else {
        timeEl.textContent = `${(TOTAL * t).toFixed(2).replace(".", ",")} s …`;
      }
    }

    function draw() {
      if (!isVisible()) return;
      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = "rgba(236,228,208,0.3)";
      for (let i = 0; i < 30; i++) {
        const x = (i * 61.7 + 17) % W;
        const y = (i * 37.3 + 41) % (H * 0.9);
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      const e = earth, m = moon;

      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = "rgba(141,149,163,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(e.x + e.r, e.y - 6);
      ctx.lineTo(m.x - m.r, m.y - 6);
      ctx.stroke();
      ctx.setLineDash([]);

      const glowE = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 2);
      glowE.addColorStop(0, "rgba(127,208,198,0.35)");
      glowE.addColorStop(1, "rgba(127,208,198,0)");
      ctx.fillStyle = glowE;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7fd0c6";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(9,11,17,0.8)";
      ctx.fillText("Terra", e.x - 16, e.y + 4);

      const glowM = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 2);
      glowM.addColorStop(0, "rgba(141,149,163,0.35)");
      glowM.addColorStop(1, "rgba(141,149,163,0)");
      ctx.fillStyle = glowM;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8d95a3";
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(9,11,17,0.8)";
      ctx.fillText("Luna", m.x - 16, m.y + 4);

      ctx.fillStyle = "#f0b45a";
      ctx.fillRect(m.x - m.r, m.y - 12, 6, 24);
      ctx.fillRect(e.x + e.r, e.y - 14, 7, 16);

      if (state === "flying") {
        const p = Math.min(1, t);
        const tx = e.x + e.r + (m.x - m.r - (e.x + e.r)) * p;
        const photonY = e.y - 6 + (m.y - e.y) * p;
        const returning = p >= 0.5;
        const q = returning ? (p - 0.5) * 2 : p * 2;
        const px = returning ? (m.x - m.r) - ((m.x - m.r) - (e.x + e.r)) * q : tx;
        const py = returning ? (m.y - 6) - ((m.y - 6) - (e.y - 6)) * q : photonY;
        ctx.fillStyle = returning ? "#f0b45a" : "#7fd0c6";
        ctx.beginPath();
        ctx.arc(px, py, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    fireBtn.addEventListener("click", () => {
      if (state === "flying") return;
      state = "flying";
      t = 0;
      chipEl.textContent = "segnale in transito…";
    });
    resetBtn.addEventListener("click", reset);
    setup();
    window.addEventListener("resize", setup);

    return { update, draw };
  })();

  /* ---------- Esperimento 04 · Le onde gravitazionali ---------- */

  const gwSim = (() => {
    const canvas = document.getElementById("canvas-gw");
    const chipEl = document.getElementById("gw-chip");
    const freqEl = document.getElementById("gw-freq");
    const strainEl = document.getElementById("gw-strain");
    const lengthEl = document.getElementById("gw-length");
    const energyEl = document.getElementById("gw-energy");
    const runBtn = document.getElementById("gw-run");
    const resetBtn = document.getElementById("gw-reset");

    const INSPIRAL = 2.6, MERGER = 0.35, RING = 1.0;
    const RING_START = INSPIRAL;
    const TOTAL = INSPIRAL + MERGER + RING;
    const MAX = 14;
    let ctx, W, H, C, armLen, BH, R0, wf = [];
    let state = "idle", e = 0, phase = 0, amp = 0, sep = 0;
    let ripples = [], lastSpawn = 0, bigSpawned = true;
    const isVisible = trackVisibility(canvas);

    function setup() {
      const s = sizeCanvas(canvas);
      ctx = s.ctx;
      W = s.w;
      H = s.h;
      C = { x: W * 0.6, y: H * 0.4 };
      armLen = Math.min(W * 0.3, H * 0.42);
      BH = { x: W * 0.2, y: H * 0.4 };
      R0 = Math.min(95, W * 0.2);
      buildWave();
      reset();
    }

    function buildWave() {
      wf = [];
      const N = 1600, TMAX = 0.8;
      let ph = 0;
      for (let i = 0; i < N; i++) {
        const ts = (i / N) * TMAX;
        let f, A;
        if (ts < 0.2) { f = 35 + 215 * (ts / 0.2); A = Math.pow(f / 35, 2 / 3) * 0.6; }
        else if (ts < 0.3) { f = 250; A = 0.6 + 0.4 * ((ts - 0.2) / 0.1); }
        else { f = 250; A = Math.exp(-(ts - 0.3) * 4); }
        ph += 2 * Math.PI * f * (TMAX / N);
        wf.push({ ts, h: A * Math.sin(ph) });
      }
    }

    function reset() {
      state = "idle";
      e = 0; phase = 0; amp = 0; sep = R0;
      ripples = []; lastSpawn = 0; bigSpawned = true;
      chipEl.textContent = "in attesa";
      freqEl.textContent = "—";
      strainEl.textContent = "—";
      lengthEl.textContent = "—";
      energyEl.textContent = "—";
    }

    function run() {
      if (state !== "idle") return;
      state = "inspiral";
      e = 0; phase = 0; amp = 0; sep = R0;
      ripples = []; lastSpawn = 0; bigSpawned = false;
      chipEl.textContent = "ispirazione · GW150914";
    }

    function update(dt) {
      if (!isVisible()) return;
      if (state === "idle" || state === "done") return;
      e += dt;

      if (e < INSPIRAL) {
        const p = Math.min(1, e / INSPIRAL);
        const P = 2.4 - (2.4 - 0.25) * p;
        phase += (2 * Math.PI / P) * dt;
        amp = 0.06 + 0.5 * p;
        sep = R0 * (1 - 0.8 * p);
        freqEl.textContent = `${Math.round(35 + 215 * p)} Hz`;
        chipEl.textContent = "ispirazione · GW150914";
        if (e - lastSpawn > 0.22) { ripples.push({ r: 6, a: 0.4 * p }); lastSpawn = e; }
      } else if (e < RING_START + MERGER) {
        if (state !== "merger") { state = "merger"; bigSpawned = false; }
        phase += (2 * Math.PI / 0.12) * dt;
        amp = 0.7 + 0.3 * Math.min(1, (e - RING_START) / MERGER);
        sep = R0 * 0.16;
        freqEl.textContent = "≈ 250 Hz";
        chipEl.textContent = "fusione";
        if (!bigSpawned) { ripples.push({ r: 12, a: 1 }); bigSpawned = true; }
      } else if (e < TOTAL) {
        if (state !== "ringdown") state = "ringdown";
        const r = (e - RING_START - MERGER) / RING;
        phase += (2 * Math.PI / 0.12) * dt;
        amp = Math.exp(-r * 2.2);
        freqEl.textContent = "ringdown · 250 Hz →";
        chipEl.textContent = "ringdown";
        if (e - lastSpawn > 0.3) { ripples.push({ r: 6, a: 0.4 * Math.exp(-r * 2.2) }); lastSpawn = e; }
      } else {
        state = "done";
        amp = 0;
        chipEl.textContent = "rilevato · 14 settembre 2015";
        freqEl.textContent = "chirp · 35 → 250 Hz";
        strainEl.textContent = "~10⁻²¹";
        lengthEl.textContent = "< 10⁻¹⁸ m · un millesimo di protone";
        energyEl.textContent = "≈ 3 Soli in un istante";
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += dt * 240;
        if (rp.r > W * 1.3) ripples.splice(i, 1);
      }
    }

    function drawHole(p, r, merged) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.4);
      g.addColorStop(0, merged ? "rgba(240,180,90,0.7)" : "rgba(127,208,198,0.55)");
      g.addColorStop(1, "rgba(127,208,198,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#05070b";
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = merged ? "rgba(240,180,90,0.9)" : "rgba(127,208,198,0.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    function draw() {
      if (!isVisible()) return;
      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = "rgba(236,228,208,0.3)";
      for (let i = 0; i < 28; i++) {
        const x = (i * 53.7 + 17) % W;
        const y = (i * 37.3 + 41) % (H * 0.7);
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      const delta = amp * MAX * Math.sin(phase);
      const d1 = C.x + armLen + delta;
      const d2 = C.y + armLen - delta;

      ctx.strokeStyle = "rgba(141,149,163,0.35)";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(C.x, C.y);
      ctx.lineTo(d1, C.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(C.x, C.y);
      ctx.lineTo(C.x, d2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(127,208,198,0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(C.x, C.y);
      ctx.lineTo(d1, C.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(C.x, C.y);
      ctx.lineTo(C.x, d2);
      ctx.stroke();

      ctx.fillStyle = "#8d95a3";
      ctx.fillRect(d1 - 3, C.y - 10, 5, 20);
      ctx.fillRect(C.x - 10, d2 - 3, 20, 5);

      ctx.save();
      ctx.translate(C.x, C.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#8d95a3";
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();

      ctx.fillStyle = "#8d95a3";
      ctx.fillRect(C.x - 18, C.y - 18, 7, 12);

      const intensity = Math.abs(amp * Math.sin(phase));
      const dX = C.x + 18, dY = C.y + 18;
      const glowR = 5 + 13 * intensity;
      const g = ctx.createRadialGradient(dX, dY, 0, dX, dY, glowR + 8);
      g.addColorStop(0, intensity > 0.02 ? "rgba(127,208,198,0.9)" : "rgba(141,149,163,0.3)");
      g.addColorStop(1, "rgba(127,208,198,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(dX, dY, glowR + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = intensity > 0.02 ? "#7fd0c6" : "#8d95a3";
      ctx.beginPath();
      ctx.arc(dX, dY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "9px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(141,149,163,0.7)";
      ctx.fillText("rivelatore", dX - 22, dY + 18);
      ctx.fillText("laser", C.x - 26, C.y - 14);

      const ang = phase;
      const merged = e >= INSPIRAL;
      if (!merged) {
        const h1 = { x: BH.x + sep / 2 * Math.cos(ang), y: BH.y + sep / 2 * Math.sin(ang) };
        const h2 = { x: BH.x - sep / 2 * Math.cos(ang), y: BH.y - sep / 2 * Math.sin(ang) };
        drawHole(h1, 16, false);
        drawHole(h2, 16, false);
      } else {
        drawHole(BH, 26, true);
      }

      for (const rp of ripples) {
        const a = rp.a * (1 - rp.r / (W * 1.3));
        if (a <= 0.02) continue;
        ctx.strokeStyle = `rgba(240,180,90,${a})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(BH.x, BH.y, rp.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.font = "9px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(141,149,163,0.7)";
      ctx.fillText("deformazione esagerata ×10¹⁹", W * 0.05, H * 0.72);

      const cx0 = W * 0.08, cx1 = W * 0.92;
      const cy0 = H * 0.88, cy1 = H * 0.965;
      const cyMid = (cy0 + cy1) / 2;
      ctx.strokeStyle = "rgba(141,149,163,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx0, cyMid);
      ctx.lineTo(cx1, cyMid);
      ctx.stroke();

      const tsMax = (state === "idle") ? 0 : Math.min(0.8, state === "done" ? 0.8 : (e / TOTAL) * 0.8);
      ctx.strokeStyle = "#f0b45a";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < wf.length; i++) {
        const w = wf[i];
        if (w.ts > tsMax) break;
        const x = cx0 + (w.ts / 0.8) * (cx1 - cx0);
        const y = cyMid - w.h * (cy1 - cy0) * 0.42;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (state !== "idle" && tsMax > 0.005) {
        const mx = cx0 + (tsMax / 0.8) * (cx1 - cx0);
        ctx.fillStyle = "#7fd0c6";
        ctx.beginPath();
        ctx.arc(mx, cyMid, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.font = "9px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(141,149,163,0.7)";
      ctx.fillText("35 Hz", cx0, cy0 - 4);
      ctx.fillText("250 Hz", cx1 - 30, cy0 - 4);
      ctx.fillText("il chirp di GW150914", cx0, cy1 + 12);
    }

    runBtn.addEventListener("click", run);
    resetBtn.addEventListener("click", reset);
    setup();
    window.addEventListener("resize", setup);

    return { update, draw };
  })();

  /* ---------- Esperimento 05 · Einstein Telescope ---------- */

  const etSim = (() => {
    const canvas = document.getElementById("canvas-et");
    const chipEl = document.getElementById("et-chip");
    const volEl = document.getElementById("et-volume");
    const srcEl = document.getElementById("et-sources");
    const layoutEl = document.getElementById("et-layout");
    const slider = document.getElementById("et-slider");

    let ctx, W, H, horizon, sos, lus, dots = [], tSim = 0, f = 0;
    const isVisible = trackVisibility(canvas);

    function setup() {
      const s = sizeCanvas(canvas);
      ctx = s.ctx;
      W = s.w;
      H = s.h;
      horizon = { x: W * 0.5, y: H * 0.52 };
      sos = { x: W * 0.18, y: H * 0.9 };
      lus = { x: W * 0.82, y: H * 0.9 };
      dots = [];
      const N = 1500;
      for (let i = 0; i < N; i++) {
        dots.push({
          x: Math.random() * W,
          y: Math.random() * H * 0.84,
          th: i < 6 ? 0 : Math.random(),
          r: Math.random() * 1.6 + 1.2,
          phase: Math.random() * Math.PI * 2,
          hot: Math.random() > 0.82
        });
      }
      setF(parseFloat(slider.value) / 100, false);
    }

    function setF(v, fromInput) {
      f = Math.min(1, Math.max(0, v));
      if (fromInput) {
        const vol = Math.round(Math.pow(1000, f));
        volEl.textContent = `×${vol}`;
        const src = Math.round(100 * Math.pow(1000, f));
        srcEl.textContent = `~${src.toLocaleString("it-IT")}`;
        layoutEl.textContent = f === 0
          ? "LIGO / Virgo · oggi"
          : f === 1
            ? "2L · Sos Enattos + Lusazia"
            : "transizione verso l'ET";
        chipEl.textContent = f === 1
          ? "ET · pronta ad ascoltare il Big Bang"
          : "in attesa della decisione · dicembre 2026";
      }
    }

    function update(dt) {
      if (!isVisible()) return;
      tSim += dt;
    }

    function draw() {
      if (!isVisible()) return;
      ctx.clearRect(0, 0, W, H);

      const R = Math.min(W, H) * (0.13 + 0.33 * f);

      const g = ctx.createRadialGradient(horizon.x, horizon.y, 0, horizon.x, horizon.y, R);
      g.addColorStop(0, "rgba(127,208,198,0.12)");
      g.addColorStop(0.85, "rgba(127,208,198,0.04)");
      g.addColorStop(1, "rgba(127,208,198,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(horizon.x, horizon.y, R, 0, Math.PI * 2);
      ctx.fill();

      for (const d of dots) {
        const seen = f >= d.th;
        if (seen) {
          const tw = 0.55 + 0.45 * Math.sin(tSim * 2.2 + d.phase);
          ctx.fillStyle = d.hot ? `rgba(240,180,90,${tw})` : `rgba(127,208,198,${tw * 0.9})`;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "rgba(141,149,163,0.07)";
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.setLineDash([4, 7]);
      ctx.strokeStyle = "rgba(141,149,163,0.45)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sos.x, sos.y - 8);
      ctx.lineTo(lus.x, lus.y - 8);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "9px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(141,149,163,0.75)";
      ctx.fillText("1.200 km · baseline 2L", horizon.x - 76, H - 18);

      for (const site of [{ p: sos, n: "Sos Enattos" }, { p: lus, n: "Lusazia" }]) {
        ctx.strokeStyle = "#7fd0c6";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(site.p.x - 9, site.p.y - 4);
        ctx.lineTo(site.p.x - 9, site.p.y - 20);
        ctx.lineTo(site.p.x + 7, site.p.y - 20);
        ctx.stroke();
        ctx.font = "10px 'IBM Plex Mono', monospace";
        ctx.fillStyle = "rgba(127,208,198,0.9)";
        ctx.fillText(site.n, site.p.x - 8, site.p.y - 26);
      }

      ctx.strokeStyle = "rgba(127,208,198,0.8)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(horizon.x, horizon.y, R, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(141,149,163,0.7)";
      ctx.fillText(f === 1 ? "ET · terza generazione" : "LIGO / Virgo", W * 0.05, H * 0.12);
    }

    slider.addEventListener("input", (e) => setF(parseInt(e.target.value, 10) / 100, true));
    setup();
    window.addEventListener("resize", setup);

    return { update, draw };
  })();

  /* ---------- Loop ---------- */

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    starfield.draw(now / 1000);
    fallSim.update(dt);
    fallSim.draw();
    wellSim.update(dt);
    wellSim.draw();
    gpsSim.update(dt);
    gpsSim.draw();
    tideSim.update(dt);
    tideSim.draw();
    sphereSim.update(dt);
    sphereSim.draw();
    probeSim.update(dt);
    probeSim.draw();
    rampSim.update(dt);
    rampSim.draw();
    thoughtSim.update(dt);
    thoughtSim.draw();
    elevSim.update(dt);
    elevSim.draw();
    eddingSim.update(dt);
    eddingSim.draw();
    vacSim.update(dt);
    vacSim.draw();
    microSim.update(dt);
    microSim.draw();
    laserSim.update(dt);
    laserSim.draw();
    gwSim.update(dt);
    gwSim.draw();
    etSim.update(dt);
    etSim.draw();
    requestAnimationFrame(loop);
  }

  /* ---------- Quiz ---------- */

  const QUIZ = [
    {
      q: "Nel vuoto, una piuma e un martello vengono lasciati cadere dalla stessa altezza. Cosa tocca terra per prima?",
      opts: ["Ha più massa: il martello", "La piuma, che pesa meno", "Arrivano insieme"],
      correct: 2,
      fb: "Nel vuoto non c'è aria a frenare la piuma: la gravità accelera ogni corpo allo stesso modo. Lo dimostrò l'esperimento Apollo 15, sulla Luna, il 2 agosto 1971."
    },
    {
      q: "Perché un satellite non cade sulla Terra?",
      opts: ["In orbita la gravità smette di agire", "La sua velocità laterale compensa la caduta", "È costruito con materiali che non la sentono"],
      correct: 1,
      fb: "Il satellite cade continuamente, ma la Terra si incurva 'via' sotto di lui alla stessa velocità: questa è l'orbita. Cadere, e non arrivare mai."
    },
    {
      q: "In fisica, chiamare la gravità una 'teoria' significa...",
      opts: ["Che è solo un'ipotesi non dimostrata", "Che è il grado più alto di solidità verificata", "Che è un'opinione personale di Newton"],
      correct: 1,
      fb: "In scienza, 'teoria' è il livello massimo: spiega tutto ciò che osserviamo e ha previsto fenomeni mai visti prima, che poi sono stati trovati."
    },
    {
      q: "Senza le correzioni relativistiche, il GPS sbaglierebbe di circa...",
      opts: ["10 mm al giorno", "1 metro al giorno", "10 km al giorno"],
      correct: 2,
      fb: "Gli orologi dei satelliti corrono 38 microsecondi al giorno più veloci: senza correzione, il navigatore ti porterebbe fuori strada in poche ore."
    },
    {
      q: "Cosa NON sappiamo ancora sulla gravità?",
      opts: ["Se esista davvero", "Come si unifichi con le altre tre forze", "Perché le mele cadono"],
      correct: 1,
      fb: "Che esista è fuori discussione. Il mistero vero è come dialoghi con il mondo quantistico: il gravitone non è mai stato osservato."
    },
    {
      q: "Un corpo in orbita che accelera oltre ~1,41 volte la velocità circolare...",
      opts: ["Precipita al centro del pozzo", "Allarga la sua orbita ellittica", "Lascia il pozzo di gravità per sempre"],
      correct: 2,
      fb: "La velocità di fuga è √2 (circa 1,41) volte quella circolare. Superatala, il corpo sfugge per sempre alla gravità che lo teneva."
    }
  ];

  const VERDICTS = [
    { min: 6, text: "Perfetto: sei pronto a spiegarla a chiunque, con gli esperimenti di questo quaderno." },
    { min: 4, text: "Ottimo. Hai gli strumenti per una conversazione che non finirà a mezzanotte." },
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
        const tagIdx = optionBtns.length && Array.from(optionBtns).indexOf(b);
        if (b === btn) {
          b.classList.add(i === item.correct ? "correct" : "wrong");
        } else if (tagIdx === item.correct) {
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

  /* ---------- Boot ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initQuiz();
    requestAnimationFrame(loop);
  });
})();