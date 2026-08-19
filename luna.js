(() => {
  "use strict";

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmt = (n, d) => n.toFixed(d).replace(".", ",");

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

  /* ---------- Esperimento 01 · Laser Ranging ---------- */

  const llrSim = (() => {
    const canvas = document.getElementById("canvas-llr");
    const chipEl = document.getElementById("llr-chip");
    const distEl = document.getElementById("llr-dist");
    const timeEl = document.getElementById("llr-time");
    const slider = document.getElementById("llr-slider");
    const fireBtn = document.getElementById("llr-fire");
    const resetBtn = document.getElementById("llr-reset");
    const isVisible = trackVisibility(canvas);

    const C = 299792.458; // km/s
    let pulse = null;

    function ready() {
      pulse = null;
      chipEl.textContent = "pronto a sparare";
      timeEl.textContent = "—";
      distEl.textContent = (+slider.value).toLocaleString("it-IT") + " km";
    }

    fireBtn.addEventListener("click", () => {
      pulse = { p: 0, dur: (2 * +slider.value) / C };
    });
    resetBtn.addEventListener("click", ready);
    slider.addEventListener("input", () => {
      distEl.textContent = (+slider.value).toLocaleString("it-IT") + " km";
      if (!pulse) timeEl.textContent = "—";
    });

    function update(dt) {
      if (!isVisible()) return;
      if (pulse) {
        pulse.p += dt / pulse.dur;
        if (pulse.p >= 1) {
          pulse.p = 1;
          chipEl.textContent = "raggio tornato · " + fmt(pulse.dur, 2) + " s";
          timeEl.textContent = fmt(pulse.dur, 2) + " s";
          pulse = null;
        } else {
          chipEl.textContent = "in transito…";
        }
      }
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c");
      bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const earth = { x: w * 0.16, y: h * 0.62, r: Math.min(w, h) * 0.09 };
      const moon = { x: w * 0.84, y: h * 0.4, r: Math.min(w, h) * 0.07 };

      ctx.strokeStyle = "rgba(127,208,198,0.18)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 7]);
      ctx.beginPath();
      ctx.moveTo(earth.x, earth.y);
      ctx.lineTo(moon.x, moon.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(earth.x, earth.y, earth.r, 0, Math.PI * 2);
      ctx.fillStyle = "#274b57";
      ctx.fill();
      ctx.strokeStyle = "rgba(127,208,198,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2);
      ctx.fillStyle = "#4a4a52";
      ctx.fill();
      ctx.strokeStyle = "rgba(236,228,208,0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "rgba(240,180,90,0.9)";
      ctx.fillRect(moon.x - 5, moon.y - moon.r + 6, 10, 4);

      ctx.fillStyle = "rgba(236,228,208,0.7)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("Terra", earth.x - 16, earth.y + earth.r + 20);
      ctx.fillText("Tranquility Base", moon.x - 42, moon.y + moon.r + 20);

      if (pulse) {
        const ex = earth.x + (moon.x - earth.x) * pulse.p;
        const ey = earth.y + (moon.y - earth.y) * pulse.p;
        ctx.shadowColor = "#f0b45a";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = "#f7d49a";
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    ready();
    return { update, draw };
  })();

  /* ---------- Esperimento 02 · Piuma e martello ---------- */

  const featherSim = (() => {
    const canvas = document.getElementById("canvas-feather");
    const chipEl = document.getElementById("feather-chip");
    const timeH = document.getElementById("feather-time-h");
    const timeF = document.getElementById("feather-time-f");
    const heightEl = document.getElementById("feather-height");
    const slider = document.getElementById("feather-slider");
    const moonBtn = document.getElementById("feather-moon");
    const earthBtn = document.getElementById("feather-earth");
    const dropBtn = document.getElementById("feather-drop");
    const resetBtn = document.getElementById("feather-reset");
    const isVisible = trackVisibility(canvas);

    let mode = "moon";
    let falling = false;
    let tElapsed = 0;
    let hY = 0, fY = 0;
    let vH = 0, vF = 0;
    let doneH = false, doneF = false;

    function setMode(m) {
      mode = m;
      moonBtn.classList.toggle("is-active", m === "moon");
      earthBtn.classList.toggle("is-active", m === "earth");
      reset();
    }
    moonBtn.addEventListener("click", () => setMode("moon"));
    earthBtn.addEventListener("click", () => setMode("earth"));

    function reset() {
      falling = false;
      tElapsed = 0;
      hY = 0; fY = 0; vH = 0; vF = 0;
      doneH = false; doneF = false;
      timeH.textContent = "—";
      timeF.textContent = "—";
      heightEl.textContent = fmt(+slider.value, 1) + " m";
      chipEl.textContent = mode === "moon"
        ? "Sulla Luna: cadono insieme"
        : "Sulla Terra: la piuma resta indietro";
    }

    slider.addEventListener("input", () => {
      heightEl.textContent = fmt(+slider.value, 1) + " m";
    });
    dropBtn.addEventListener("click", () => {
      if (falling) return;
      falling = true;
      tElapsed = 0;
      hY = 0; fY = 0; vH = 0; vF = 0;
      doneH = false; doneF = false;
      timeH.textContent = "…";
      timeF.textContent = "…";
      chipEl.textContent = "caduta in corso…";
    });
    resetBtn.addEventListener("click", reset);

    function update(dt) {
      if (!isVisible()) return;
      if (!falling) return;
      tElapsed += dt;
      const H = +slider.value;
      const g = mode === "moon" ? 1.62 : 9.81;

      if (!doneH) {
        vH += g * dt;
        hY += vH * dt;
        if (hY >= H) { hY = H; doneH = true; timeH.textContent = fmt(tElapsed, 2) + " s"; }
      }
      if (!doneF) {
        if (mode === "moon") {
          vF += g * dt;
        } else {
          const k = g / 1.5;
          vF += (g - k * vF) * dt;
        }
        fY += vF * dt;
        if (fY >= H) { fY = H; doneF = true; timeF.textContent = fmt(tElapsed, 2) + " s"; }
      }
      if (doneH && doneF) {
        falling = false;
        if (mode === "moon") {
          chipEl.textContent = "cadono insieme: ~" + fmt(tElapsed, 2) + " s";
        } else {
          chipEl.textContent = "il martello vince di molto";
        }
      }
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0c1220");
      bg.addColorStop(1, "#141b2c");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const groundY = h * 0.78;
      ctx.fillStyle = "#1d2333";
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.strokeStyle = "rgba(236,228,208,0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(w, groundY);
      ctx.stroke();

      // scala di altezza
      const H = +slider.value;
      const scaleH = h * 0.6;
      const dropTop = groundY - scaleH;
      for (let i = 0; i <= 4; i++) {
        const y = groundY - (scaleH * i) / 4;
        const mark = fmt((H * i) / 4, 1) + " m";
        ctx.strokeStyle = "rgba(236,228,208,0.1)";
        ctx.beginPath();
        ctx.moveTo(w * 0.84, y);
        ctx.lineTo(w * 0.9, y);
        ctx.stroke();
        ctx.fillStyle = "rgba(236,228,208,0.45)";
        ctx.font = "10px 'IBM Plex Mono', monospace";
        ctx.fillText(mark, w * 0.91, y + 3);
      }

      // astronauta
      const ax = w * 0.2;
      const aScale = scaleH / H;
      const aTop = dropTop + 30;
      ctx.strokeStyle = "rgba(217,214,200,0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ax, groundY);
      ctx.lineTo(ax, aTop);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ax, aTop - 10, 11, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(217,214,200,0.12)";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ax, aTop - 10, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#0c1220";
      ctx.fill();
      // braccio
      const dropX = w * 0.42;
      ctx.beginPath();
      ctx.moveTo(ax, aTop + 6);
      ctx.lineTo(dropX, aTop + 6);
      ctx.stroke();

      // oggetti
      const px = dropX, py = aTop + 6;
      const hFall = hY * aScale;
      const fFall = fY * aScale;
      const hx = px - 16, fx = px + 16;
      const hy = py + hFall, fy = py + fFall;

      if (hY < H) {
        ctx.fillStyle = "#c9c2ae";
        ctx.fillRect(hx - 9, hy - 4, 18, 8);
        ctx.fillRect(hx - 4, hy - 8, 8, 4);
      } else {
        ctx.fillStyle = "#c9c2ae";
        ctx.fillRect(hx - 9, groundY - 4, 18, 8);
      }
      if (fY < H) {
        const sway = mode === "earth" ? Math.sin(tElapsed * 14) * 3 : 0;
        ctx.fillStyle = "#ece4d0";
        ctx.beginPath();
        ctx.ellipse(fx + sway, fy, 6, 2.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#ece4d0";
        ctx.beginPath();
        ctx.ellipse(fx, groundY - 2, 6, 2.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "rgba(240,180,90,0.85)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("martello 1,32 kg", hx - 34, hy - 14);
      ctx.fillText("piuma 0,03 kg", fx + 8, fy - 14);
    }

    reset();
    return { update, draw };
  })();

  /* ---------- Esperimento 03 · Le rocce lunari ---------- */

  const rocksSim = (() => {
    const canvas = document.getElementById("canvas-rocks");
    const chipEl = document.getElementById("rocks-chip");
    const ageEl = document.getElementById("rocks-age");
    const ar40El = document.getElementById("rocks-ar40");
    const slider = document.getElementById("rocks-slider");
    const btn60025 = document.getElementById("rocks-60025");
    const btnBasalt = document.getElementById("rocks-basalt");
    const runBtn = document.getElementById("rocks-run");
    const resetBtn = document.getElementById("rocks-reset");
    const isVisible = trackVisibility(canvas);

    const HALF = 1.25; // Ga, vita media potassio-40 → argon-40
    const LAM = Math.log(2) / HALF;
    const ROCKS = {
      anorthosite: { age: 4.44, label: "Anortosite 60025 · Apollo 16" },
      basalt: { age: 3.4, label: "Basalto dei mari · ~Apollo 11" }
    };
    let rock = "anorthosite";
    let running = false;

    function setRock(r) {
      rock = r;
      btn60025.classList.toggle("is-active", r === "anorthosite");
      btnBasalt.classList.toggle("is-active", r === "basalt");
      updateReadouts();
    }
    btn60025.addEventListener("click", () => setRock("anorthosite"));
    btnBasalt.addEventListener("click", () => setRock("basalt"));

    function t() {
      return +slider.value / 10;
    }
    function ar40() {
      return (1 - Math.exp(-LAM * t())) * 100;
    }

    function updateReadouts() {
      const age = t();
      const a = ar40();
      ageEl.textContent = fmt(age, 2) + " Ga";
      ar40El.textContent = fmt(a, 1) + " %";
      const realAge = ROCKS[rock].age;
      if (age < realAge - 0.08) {
        chipEl.textContent = "l'orologio è ancora in corso…";
      } else if (age > realAge + 0.08) {
        chipEl.textContent = "oltre l'età del campione";
      } else {
        chipEl.textContent = "coincide con l'età reale: " + fmt(realAge, 2) + " Ga";
      }
    }

    slider.addEventListener("input", () => { running = false; updateReadouts(); });
    runBtn.addEventListener("click", () => { running = true; });
    resetBtn.addEventListener("click", () => {
      running = false;
      slider.value = 0;
      updateReadouts();
    });

    function update(dt) {
      if (!isVisible()) return;
      if (running && t() < 4.6) {
        slider.value = Math.min(46, Math.round(+slider.value + dt * 25));
        updateReadouts();
      }
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0b0e15");
      bg.addColorStop(1, "#131a26");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const cx = w * 0.4, cy = h * 0.5;
      const rockR = Math.min(w, h) * 0.16;

      // roccia (poligono irregolare)
      const pts = [
        [0, -rockR], [0.72 * rockR, -0.42 * rockR], [0.9 * rockR, 0.25 * rockR],
        [0.4 * rockR, 0.88 * rockR], [-0.45 * rockR, 0.82 * rockR],
        [-0.85 * rockR, 0.18 * rockR], [-0.6 * rockR, -0.6 * rockR]
      ];
      ctx.beginPath();
      pts.forEach((p, i) => {
        if (i === 0) ctx.moveTo(cx + p[0], cy + p[1]);
        else ctx.lineTo(cx + p[0], cy + p[1]);
      });
      ctx.closePath();
      ctx.fillStyle = "#3a3f4d";
      ctx.fill();
      ctx.strokeStyle = "rgba(236,228,208,0.25)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "rgba(236,228,208,0.55)";
      ctx.font = "12px 'IBM Plex Mono', monospace";
      ctx.fillText(ROCKS[rock].label, cx - 90, cy + rockR + 26);

      // orologio radiometrico (anello)
      const ringR = rockR * 1.5;
      const frac = clamp(t() / 4.6, 0, 1);
      ctx.strokeStyle = "rgba(236,228,208,0.12)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#f0b45a";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();

      // barra argon-40
      const barW = rockR * 2.1, barH = 10;
      const bx = cx - barW / 2, by = cy + rockR + 58;
      ctx.fillStyle = "rgba(236,228,208,0.1)";
      ctx.fillRect(bx, by, barW, barH);
      const a = ar40() / 100;
      ctx.fillStyle = "#7fd0c6";
      ctx.fillRect(bx, by, barW * a, barH);
      ctx.fillStyle = "rgba(236,228,208,0.6)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("argon-40", bx, by - 8);

      // curva di decadimento (in alto a destra)
      const mx = w * 0.78, my = h * 0.2, mw = w * 0.18, mh = h * 0.22;
      ctx.strokeStyle = "rgba(236,228,208,0.15)";
      ctx.strokeRect(mx, my, mw, mh);
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const tt = (i / 60) * 4.6;
        const v = 1 - Math.exp(-LAM * tt);
        const x = mx + (i / 60) * mw;
        const y = my + mh - v * mh;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#7fd0c6";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      const curX = mx + (t() / 4.6) * mw;
      const curY = my + mh - (ar40() / 100) * mh;
      ctx.fillStyle = "#f0b45a";
      ctx.beginPath();
      ctx.arc(curX, curY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    updateReadouts();
    return { update, draw };
  })();

  /* ---------- Esperimento 04 · La Luna trema ---------- */

  const seismoSim = (() => {
    const canvas = document.getElementById("canvas-seismo");
    const chipEl = document.getElementById("seismo-chip");
    const eventEl = document.getElementById("seismo-event");
    const durEl = document.getElementById("seismo-dur");
    const depthEl = document.getElementById("seismo-depth");
    const sivbBtn = document.getElementById("seismo-sivb");
    const meteorBtn = document.getElementById("seismo-meteor");
    const tideBtn = document.getElementById("seismo-tide");
    const resetBtn = document.getElementById("seismo-reset");
    const isVisible = trackVisibility(canvas);

    let history = [];
    let event = null;

    const EVENTS = {
      sivb: {
        name: "Impatto S-IVB", durText: "oltre 30 min", depthText: "superficiale",
        modelDur: 9,
        amp(t) { return 1.0 * Math.exp(-t / 3.2) * (0.75 + 0.25 * Math.sin(2 * Math.PI * 1.2 * t)); }
      },
      meteor: {
        name: "Meteorite", durText: "pochi minuti", depthText: "superficiale",
        modelDur: 4,
        amp(t) { return 0.6 * Math.exp(-t / 1.6) * (0.75 + 0.25 * Math.sin(2 * Math.PI * 2.2 * t)); }
      },
      tide: {
        name: "Sismicità di marea", durText: "~10 min", depthText: "~800 km (profondo)",
        modelDur: 7,
        amp(t) { return 0.3 * Math.exp(-t / 6) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.6 * t)); }
      }
    };

    function startEvent(key) {
      event = { ...EVENTS[key], elapsed: 0 };
      chipEl.textContent = event.name;
      eventEl.textContent = event.name;
      durEl.textContent = event.durText;
      depthEl.textContent = event.depthText;
      history = history.slice(-80);
    }
    sivbBtn.addEventListener("click", () => startEvent("sivb"));
    meteorBtn.addEventListener("click", () => startEvent("meteor"));
    tideBtn.addEventListener("click", () => startEvent("tide"));
    resetBtn.addEventListener("click", () => {
      event = null;
      history = [];
      chipEl.textContent = "in ascolto";
      eventEl.textContent = "—";
      durEl.textContent = "—";
      depthEl.textContent = "—";
    });

    function update(dt) {
      if (!isVisible()) return;
      let amp = (Math.random() - 0.5) * 0.04;
      if (event) {
        event.elapsed += dt;
        amp += event.amp(event.elapsed);
        if (event.elapsed > event.modelDur) {
          event = null;
          chipEl.textContent = "in ascolto";
        }
      }
      history.push(amp);
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0b0f18");
      bg.addColorStop(1, "#111724");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // griglia
      ctx.strokeStyle = "rgba(236,228,208,0.06)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 32) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += 32) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      }

      // linea base
      const baseY = h / 2;
      ctx.strokeStyle = "rgba(236,228,208,0.18)";
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      ctx.lineTo(w, baseY);
      ctx.stroke();

      if (history.length > w) history = history.slice(history.length - w);

      // traccia (disegna verso sinistra, la penna è a destra)
      ctx.strokeStyle = "#f0b45a";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const start = Math.max(0, history.length - w);
      for (let i = start; i < history.length; i++) {
        const x = w - (history.length - i);
        const y = baseY - history[i] * h * 0.42;
        if (i === start) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // penna
      ctx.fillStyle = "#7fd0c6";
      ctx.fillRect(w - 3, baseY - 8, 3, 16);
      ctx.fillStyle = "rgba(236,228,208,0.35)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("ALSEP · in ascolto", 12, 22);
    }

    return { update, draw };
  })();

  /* ---------- Esperimento 05 · LRO / LROC ---------- */

  const lroSim = (() => {
    const canvas = document.getElementById("canvas-lro");
    const chipEl = document.getElementById("lro-chip");
    const scaleEl = document.getElementById("lro-scale");
    const slider = document.getElementById("lro-slider");
    const btn15 = document.getElementById("lro-15");
    const btn17 = document.getElementById("lro-17");
    const isVisible = trackVisibility(canvas);

    const SITES = {
      "15": { label: "Apollo 15 · Hadley", rover: true },
      "17": { label: "Apollo 17 · Taurus–Littrow", rover: false }
    };
    let site = "15";

    function setSite(s) {
      site = s;
      btn15.classList.toggle("is-active", s === "15");
      btn17.classList.toggle("is-active", s === "17");
      chipEl.textContent = SITES[s].label;
    }
    btn15.addEventListener("click", () => setSite("15"));
    btn17.addEventListener("click", () => setSite("17"));

    const craters = [
      [-150, -120, 40], [220, 80, 55], [-40, 160, 25], [180, -160, 35],
      [-230, 40, 20], [60, -260, 45], [-260, -200, 30], [300, 220, 38]
    ];
    const path1 = [[2, -2], [12, -8], [24, -6], [38, -14], [52, -12]];
    const path2 = [[2, 2], [15, 10], [28, 9], [40, 16], [50, 24]];
    const rover = [[2, 0], [-10, -20], [-30, -35], [-48, -30], [-70, -44]];

    function scaleText() {
      const z = +slider.value / 100;
      const ppm = lerp(0.1, 2, z);
      const s = 1 / ppm;
      scaleEl.textContent = (s >= 1 ? fmt(s, 1) : fmt(s, 2)) + " m/px";
      return ppm;
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const ppm = scaleText();

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0c1018");
      bg.addColorStop(1, "#151a24");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // piccoli puntini di regolite
      ctx.fillStyle = "rgba(236,228,208,0.05)";
      for (let i = 0; i < 60; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(ppm, ppm);

      // crateri
      for (const [cx, cy, r] of craters) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.85, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.32)";
        ctx.fill();
        ctx.strokeStyle = "rgba(236,228,208,0.14)";
        ctx.lineWidth = 2 / ppm;
        ctx.stroke();
      }

      // piste dei piedi
      ctx.strokeStyle = "rgba(240,180,90,0.75)";
      ctx.lineWidth = 0.6;
      ctx.setLineDash([1.2, 1.2]);
      ctx.beginPath();
      for (const p of path1) { ctx.lineTo(p[0], p[1]); }
      ctx.moveTo(path2[0][0], path2[0][1]);
      for (const p of path2) { ctx.lineTo(p[0], p[1]); }
      ctx.stroke();
      ctx.setLineDash([]);

      // tracce del rover (solo Apollo 15)
      if (SITES[site].rover) {
        ctx.strokeStyle = "rgba(127,208,198,0.7)";
        ctx.lineWidth = 1;
        ctx.setLineDash([1.4, 1.8]);
        ctx.beginPath();
        for (const p of rover) { ctx.lineTo(p[0], p[1]); }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // modulo di discesa
      ctx.fillStyle = "#c9c2ae";
      ctx.fillRect(-2, -3, 4, 3);
      ctx.fillStyle = "#f0b45a";
      ctx.fillRect(-2, -3, 1, 3);
      ctx.fillRect(1, -3, 1, 3);
      ctx.strokeStyle = "rgba(236,228,208,0.6)";
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(-1.2, 0);
      ctx.lineTo(-0.4, -3);
      ctx.stroke();

      // etichetta del sito (solo a basso zoom)
      if (ppm < 0.4) {
        ctx.fillStyle = "rgba(236,228,208,0.7)";
        ctx.font = `${Math.round(clamp(12 / ppm, 5, 14))}px 'IBM Plex Mono', monospace`;
        ctx.fillText(SITES[site].label, 8, -10);
      }

      ctx.restore();

      // barra di scala (schermo)
      const barPx = 70;
      const meters = barPx / ppm;
      const bx = 16, by = h - 18;
      ctx.strokeStyle = "rgba(236,228,208,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + barPx, by);
      ctx.stroke();
      ctx.fillStyle = "rgba(236,228,208,0.6)";
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillText((meters >= 10 ? Math.round(meters) : fmt(meters, 1)) + " m", bx, by - 6);
    }

    return { update() {}, draw };
  })();

  /* ---------- Esperimento 06 · Telemetria radio / Doppler ---------- */

  const dopplerSim = (() => {
    const canvas = document.getElementById("canvas-doppler");
    const chipEl = document.getElementById("doppler-chip");
    const distEl = document.getElementById("doppler-dist");
    const velEl = document.getElementById("doppler-vel");
    const delayEl = document.getElementById("doppler-delay");
    const slider = document.getElementById("doppler-slider");
    const callBtn = document.getElementById("doppler-call");
    const resetBtn = document.getElementById("doppler-reset");
    const isVisible = trackVisibility(canvas);

    const C = 299792.458; // km/s
    const F_SBAND = 2.2e9; // Hz
    let tx = false;
    let phase = 0;

    function frac() {
      return +slider.value / 100;
    }

    function updateReadouts(now) {
      const f = frac();
      const dist = f * 384400; // km
      const v = 1100 * (1 - f); // m/s radiale
      const df = F_SBAND * v / (C * 1000); // Hz (C in km/s → v in km/s)
      distEl.textContent = Math.round(dist).toLocaleString("it-IT") + " km";
      velEl.textContent = (df >= 0 ? "+" : "−") + fmt(Math.abs(df) / 1000, 1) + " kHz";
      delayEl.textContent = fmt((2 * dist) / C, 1) + " s";
      if (tx) chipEl.textContent = "in contatto radio";
      if (now !== undefined) phase = now;
    }

    callBtn.addEventListener("click", () => {
      tx = !tx;
      callBtn.textContent = tx ? "Interrompi" : "Trasmette";
      callBtn.classList.toggle("is-active", tx);
      updateReadouts();
    });
    resetBtn.addEventListener("click", () => {
      slider.value = 0;
      tx = false;
      callBtn.textContent = "Trasmette";
      callBtn.classList.remove("is-active");
      chipEl.textContent = "a riposo a Terra";
      updateReadouts();
    });
    slider.addEventListener("input", updateReadouts);

    function update(dt) {
      if (!isVisible()) return;
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a0f1c");
      bg.addColorStop(1, "#131c2e");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const earth = { x: w * 0.16, y: h * 0.66, r: Math.min(w, h) * 0.08 };
      const moon = { x: w * 0.82, y: h * 0.36, r: Math.min(w, h) * 0.06 };

      // orbita di trasferimento (curva quadratica)
      const mx = (earth.x + moon.x) / 2;
      const my = (earth.y + moon.y) / 2 - h * 0.22;
      const ship = bezierPoint(earth, moon, { x: mx, y: my }, frac());

      ctx.strokeStyle = "rgba(127,208,198,0.15)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const p = bezierPoint(earth, moon, { x: mx, y: my }, i / 40);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Terra
      ctx.beginPath();
      ctx.arc(earth.x, earth.y, earth.r, 0, Math.PI * 2);
      ctx.fillStyle = "#274b57";
      ctx.fill();
      ctx.strokeStyle = "rgba(127,208,198,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Luna
      ctx.beginPath();
      ctx.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2);
      ctx.fillStyle = "#4a4a52";
      ctx.fill();
      ctx.strokeStyle = "rgba(236,228,208,0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // navicella
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#f0b45a";
      ctx.fill();
      ctx.fillStyle = "rgba(236,228,208,0.7)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("Apollo", ship.x + 10, ship.y - 10);

      // segnale radio (se in trasmissione)
      if (tx) {
        const dx = ship.x - earth.x, dy = ship.y - earth.y;
        const len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len;
        const px = -uy, py = ux;
        ctx.strokeStyle = "rgba(240,180,90,0.55)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i <= 80; i++) {
          const t = i / 80;
          const x = earth.x + dx * t;
          const y = earth.y + dy * t;
          const wv = Math.sin(t * 40 - phase * 3) * 3;
          if (i === 0) ctx.moveTo(x + px * wv, y + py * wv);
          else ctx.lineTo(x + px * wv, y + py * wv);
        }
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(236,228,208,0.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("Terra", earth.x - 16, earth.y + earth.r + 18);
      ctx.fillText("Luna", moon.x - 14, moon.y + moon.r + 18);
    }

    return { update, draw };
  })();

  function bezierPoint(a, b, c, t) {
    const u = 1 - t;
    return {
      x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * c.y + t * t * b.y
    };
  }

  /* ---------- Quiz ---------- */

  const QUIZ = [
    {
      q: "Cosa rimbalza ancora oggi sullo specchio lasciato da Apollo 11?",
      opts: ["Un raggio laser", "Un'onda radio", "Una piuma d'oca"],
      correct: 0,
      fb: "Il laser parte dalla Terra, colpisce lo specchio di Tranquility Base e torna ~2,5 secondi dopo. Così la distanza Terra–Luna è misurata in millimetri."
    },
    {
      q: "Quante rocce lunari hanno riportato le missioni Apollo?",
      opts: ["382 kg", "3,82 kg", "38.200 kg"],
      correct: 0,
      fb: "382 kg, studiati da migliaia di scienziati in tutto il mondo. Dentro ogni sasso c'è un orologio radioattivo che dice la sua età."
    },
    {
      q: "Sulla Luna, martello e piuma cadono insieme perché…",
      opts: ["Non c'è aria che rallenti la piuma", "La piuma è finta", "Il martello è di gomma"],
      correct: 0,
      fb: "Nel vuoto tutti i corpi cadono allo stesso modo, come Galileo aveva capito nel 1638. La differenza la fa l'aria, non il peso."
    },
    {
      q: "Quanto impiega la luce ad andare e tornare dalla Luna?",
      opts: ["~2,5 secondi", "Un istante", "30 minuti"],
      correct: 0,
      fb: "Circa 1,25 secondi per andare e 2,5 secondi per andare e tornare. È lo stesso ritardo che sentivano gli astronauti in radio."
    },
    {
      q: "Sulla Luna, un impatto dello stadio S-IVB fece suonare il sismografo per…",
      opts: ["Più di 30 minuti", "Pochi secondi", "Un'ora esatta"],
      correct: 0,
      fb: "Senza acqua e atmosfera che assorbono l'energia, la Luna risuona come una campana: il rintocco si protrasse per oltre mezz'ora."
    },
    {
      q: "Chi ha fotografato i siti di Apollo dallo spazio dopo il 2009?",
      opts: ["LRO (NASA), ma anche Kaguya e Chandrayaan-1", "Nessuno", "Solo la NASA, già nel 1969"],
      correct: 0,
      fb: "La NASA con LRO (2009), ma anche la giapponese Kaguya e l'indiana Chandrayaan-1. Chiunque possa osservare oggi conferma le tracce."
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
    llrSim.update(dt);
    llrSim.draw();
    featherSim.update(dt);
    featherSim.draw();
    rocksSim.update(dt);
    rocksSim.draw();
    seismoSim.update(dt);
    seismoSim.draw();
    lroSim.update(dt);
    lroSim.draw();
    dopplerSim.update(dt);
    dopplerSim.draw();
    requestAnimationFrame(loop);
  }

  /* ---------- Boot ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initQuiz();
    requestAnimationFrame(loop);
  });
})();
