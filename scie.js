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

  /* ---------- Esperimento 01 · Schmidt-Appleman ---------- */

  const saSim = (() => {
    const canvas = document.getElementById("canvas-sa");
    const chipEl = document.getElementById("sa-chip");
    const tempEl = document.getElementById("sa-temp");
    const rhEl = document.getElementById("sa-rh");
    const threshEl = document.getElementById("sa-thresh");
    const tempSlider = document.getElementById("sa-temp-slider");
    const rhSlider = document.getElementById("sa-rh-slider");
    const goBtn = document.getElementById("sa-go");
    const resetBtn = document.getElementById("sa-reset");
    const isVisible = trackVisibility(canvas);

    const THRESH = -42; // °C, soglia Schmidt-Appleman tipica
    let flying = false;
    let planeX = 0;
    let trail = [];

    function temp() { return +tempSlider.value; }
    function rh() { return +rhSlider.value; }

    function updateReadouts() {
      tempEl.textContent = fmt(temp(), 1) + " °C";
      rhEl.textContent = rh() + " %";
      threshEl.textContent = THRESH + " °C";
    }

    function verdict() {
      const T = temp();
      const H = rh();
      if (T > THRESH) return "aria troppo calda: nessuna scia";
      if (H < 30) return "scia breve: evapora subito";
      if (H < 70) return "scia persistente: dura minuti";
      return "scia persistente: si allarga in cirri";
    }

    function ready() {
      flying = false;
      planeX = 0;
      trail = [];
      chipEl.textContent = "in attesa del decollo";
      updateReadouts();
    }

    goBtn.addEventListener("click", () => {
      if (flying) return;
      flying = true;
      planeX = -0.06;
      trail = [];
      chipEl.textContent = "in volo…";
    });
    resetBtn.addEventListener("click", ready);
    tempSlider.addEventListener("input", () => { if (!flying) updateReadouts(); });
    rhSlider.addEventListener("input", () => { if (!flying) updateReadouts(); });

    function update(dt) {
      if (!isVisible()) return;
      updateReadouts();
      if (!flying) return;
      const speed = 0.22; // frazioni di larghezza al secondo
      planeX += speed * dt;
      const T = temp();
      const H = rh();
      if (T <= THRESH) {
        const persist = H >= 30;
        const fade = H < 30 ? 0.25 : 1;
        trail.push({ x: planeX, y: 0, fade, persist });
        if (trail.length > 300) trail.shift();
      } else {
        trail = [];
      }
      if (planeX > 1.06) {
        flying = false;
        chipEl.textContent = verdict();
      }
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0d2440");
      bg.addColorStop(0.6, "#1a3557");
      bg.addColorStop(1, "#2c1e3d");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // sole pallido e orizzonte
      const sunY = h * 0.3;
      ctx.fillStyle = "rgba(240,180,90,0.14)";
      ctx.beginPath();
      ctx.arc(w * 0.85, sunY, Math.min(w, h) * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(240,180,90,0.25)";
      ctx.beginPath();
      ctx.arc(w * 0.85, sunY, Math.min(w, h) * 0.13, 0, Math.PI * 2);
      ctx.stroke();
      const groundY = h * 0.78;
      ctx.fillStyle = "#16213a";
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.strokeStyle = "rgba(127,208,198,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(w, groundY);
      ctx.stroke();

      const planeY = h * 0.3;

      // scia
      ctx.strokeStyle = "rgba(236,228,208,0.9)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i];
        const b = trail[i - 1];
        if (!a.persist && a.fade < 1) continue;
        ctx.globalAlpha = a.fade;
        ctx.beginPath();
        ctx.moveTo(b.x * w, planeY + b.y);
        ctx.lineTo(a.x * w, planeY + a.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // aereo
      if (flying) {
        const px = planeX * w;
        ctx.save();
        ctx.translate(px, planeY);
        ctx.rotate(-0.06);
        ctx.fillStyle = "#ece4d0";
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-12, -6);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-12, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // quota marcata
      ctx.fillStyle = "rgba(236,228,208,0.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("quota di crociera ~10 km", w * 0.06, planeY - 16);
      if (temp() > THRESH) {
        ctx.fillStyle = "rgba(240,180,90,0.85)";
        ctx.font = "12px 'IBM Plex Mono', monospace";
        ctx.fillText("aria sopra la soglia: il vapore non condensa", w * 0.06, h - 22);
      }
    }

    ready();
    return { update, draw };
  })();

  /* ---------- Esperimento 02 · Persistenza e cirri ---------- */

  const persSim = (() => {
    const canvas = document.getElementById("canvas-pers");
    const chipEl = document.getElementById("pers-chip");
    const durEl = document.getElementById("pers-dur");
    const widthEl = document.getElementById("pers-width");
    const rhEl = document.getElementById("pers-rh");
    const slider = document.getElementById("pers-slider");
    const runBtn = document.getElementById("pers-run");
    const resetBtn = document.getElementById("pers-reset");
    const isVisible = trackVisibility(canvas);

    let running = false;
    let t = 0;
    let done = false;
    let model = null;

    function rh() { return +slider.value; }

    function modelFor() {
      const H = rh();
      if (H < 30) return { dur: 1.2, wF: 0.15, label: "evapora in secondi", durText: "~30 s", wText: "~0,1 km" };
      if (H < 70) return { dur: 3, wF: 0.5, label: "persistente: dura minuti", durText: "~8 min", wText: "~2 km" };
      return { dur: 9, wF: 1, label: "si allarga in cirro: dura ore", durText: "~3 h", wText: "~15 km" };
    }

    function updateReadouts() {
      rhEl.textContent = rh() + " %";
      if (!model) return;
      durEl.textContent = model.durText;
      widthEl.textContent = model.wText;
    }

    function ready() {
      running = false;
      t = 0;
      done = false;
      model = null;
      durEl.textContent = "—";
      widthEl.textContent = "—";
      chipEl.textContent = "pronto al time-lapse";
      updateReadouts();
    }

    runBtn.addEventListener("click", () => {
      if (running || done) return;
      running = true;
      t = 0;
      model = modelFor();
      durEl.textContent = "…";
      widthEl.textContent = "…";
      chipEl.textContent = "time-lapse in corso…";
    });
    resetBtn.addEventListener("click", ready);
    slider.addEventListener("input", () => { if (!running && !done) updateReadouts(); });

    function update(dt) {
      if (!isVisible()) return;
      updateReadouts();
      if (!running) return;
      t += dt;
      if (t >= model.dur) {
        running = false;
        done = true;
        chipEl.textContent = model.label;
        updateReadouts();
      }
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0c1b33");
      bg.addColorStop(1, "#1f3350");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const groundY = h * 0.8;
      ctx.fillStyle = "#16213a";
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.strokeStyle = "rgba(127,208,198,0.2)";
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(w, groundY);
      ctx.stroke();

      const planeY = h * 0.32;
      const cx = w * 0.5;

      // espansione della scia in base al progresso
      const prog = clamp(t / (model ? model.dur : 1), 0, 1);
      const H = rh();

      // alone del cirro (larghezza cresce col tempo)
      if (running || done) {
        const spread = lerp(0.12, 0.9, prog) * w * 0.5;
        const alpha = 0.1 + 0.3 * Math.min(1, prog * 3);
        ctx.fillStyle = "rgba(236,228,208," + (H < 30 ? 0.15 : alpha * (H < 70 ? 0.7 : 1)) + ")";
        ctx.beginPath();
        ctx.ellipse(cx, planeY, spread, spread * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // linea della scia
      if (running || done) {
        const wAlpha = H < 30 ? Math.max(0, 1 - prog * 3) : 0.85;
        ctx.strokeStyle = "rgba(236,228,208," + wAlpha + ")";
        ctx.lineWidth = H < 70 ? 3 : 2.5;
        ctx.beginPath();
        ctx.moveTo(w * 0.18, planeY);
        ctx.lineTo(w * 0.82, planeY);
        ctx.stroke();
      }

      // aereo che passa (all'inizio del time-lapse)
      const planeX = lerp(-0.08, 1.08, clamp(prog * 2.5, 0, 1));
      ctx.save();
      ctx.translate(planeX * w, planeY);
      ctx.rotate(-0.06);
      ctx.fillStyle = "#ece4d0";
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -5);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // scala del tempo
      ctx.fillStyle = "rgba(236,228,208,0.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("time-lapse: minuti → ore", w * 0.06, h - 20);
    }

    ready();
    return { update, draw };
  })();

  /* ---------- Esperimento 03 · ADS-B ---------- */

  const adsbSim = (() => {
    const canvas = document.getElementById("canvas-adsb");
    const chipEl = document.getElementById("adsb-chip");
    const flightsEl = document.getElementById("adsb-flights");
    const callEl = document.getElementById("adsb-call");
    const altEl = document.getElementById("adsb-alt");
    const dataBtn = document.getElementById("adsb-data");
    const nextBtn = document.getElementById("adsb-next");
    const isVisible = trackVisibility(canvas);

    const FLIGHTS = [
      { call: "DLH432 · Lufthansa", alt: "11.200 m", t: "14:37" },
      { call: "AFR125 · Air France", alt: "10.600 m", t: "14:41" },
      { call: "UAL88 · United", alt: "9.800 m", t: "14:55" },
      { call: "BAW264 · British Airways", alt: "12.000 m", t: "15:02" },
      { call: "EZY44G · easyJet", alt: "10.300 m", t: "15:14" },
      { call: "SWA775 · Southwest", alt: "9.500 m", t: "15:26" },
      { call: "IBE624 · Iberia", alt: "11.800 m", t: "15:33" },
      { call: "RYR92A · Ryanair", alt: "10.900 m", t: "15:47" }
    ];

    // rotte: [x0, y0, x1, y1, t_start, t_span]
    const ROUTES = [
      [0.0, 0.30, 1.0, 0.30, 0.0, 1.0],
      [0.0, 0.52, 1.0, 0.52, 0.2, 1.1],
      [0.0, 0.74, 1.0, 0.74, 0.4, 0.9],
      [0.3, 0.0, 0.3, 1.0, 0.1, 1.3],
      [0.55, 0.0, 0.55, 1.0, 0.5, 1.2],
      [0.78, 0.0, 0.78, 1.0, 0.3, 1.0],
      [0.1, 0.0, 0.9, 1.0, 0.6, 1.4],
      [0.9, 0.0, 0.1, 1.0, 0.15, 1.2]
    ];

    let showData = false;
    let sel = 0;

    function updateReadouts() {
      flightsEl.textContent = FLIGHTS.length + " voli";
      callEl.textContent = FLIGHTS[sel].call;
      altEl.textContent = FLIGHTS[sel].alt + " · " + FLIGHTS[sel].t;
    }

    dataBtn.addEventListener("click", () => {
      showData = !showData;
      dataBtn.classList.toggle("is-active", showData);
      dataBtn.textContent = showData ? "Nascondi dati volo" : "Mostra dati volo";
      chipEl.textContent = showData ? "dati ADS-B attivi" : "rotte aeree reali";
    });
    nextBtn.addEventListener("click", () => {
      sel = (sel + 1) % FLIGHTS.length;
      updateReadouts();
    });

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0c1b33");
      bg.addColorStop(1, "#1f3350");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const now = performance.now() / 1000;

      // rotte
      ROUTES.forEach((r, i) => {
        const tt = ((now / 4 + r[4]) % r[5]) / r[5];
        const x = lerp(r[0], r[2], tt) * w;
        const y = lerp(r[1], r[3], tt) * h;

        // scia
        ctx.strokeStyle = i === sel && showData ? "rgba(240,180,90,0.55)" : "rgba(236,228,208,0.22)";
        ctx.lineWidth = i === sel && showData ? 2 : 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(r[0] * w, r[1] * h);
        ctx.lineTo(r[2] * w, r[3] * h);
        ctx.stroke();
        ctx.setLineDash([]);

        // aereo
        ctx.fillStyle = i === sel && showData ? "#f0b45a" : "#ece4d0";
        ctx.beginPath();
        ctx.arc(x, y, 3.4, 0, Math.PI * 2);
        ctx.fill();
        if (i === sel && showData) {
          ctx.shadowColor = "#f0b45a";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(x, y, 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // etichette
        if (showData) {
          ctx.fillStyle = i === sel ? "#f7d49a" : "rgba(236,228,208,0.55)";
          ctx.font = "10px 'IBM Plex Mono', monospace";
          ctx.fillText(FLIGHTS[i].call.split(" · ")[0], x + 8, y - 8);
          ctx.fillText(FLIGHTS[i].alt + " · " + FLIGHTS[i].t, x + 8, y + 4);
        }
      });
    }

    updateReadouts();
    return { update() {}, draw };
  })();


  /* ---------- Esperimento 04 · Spruzzo agricolo vs jet ---------- */

  const spraySim = (() => {
    const canvas = document.getElementById("canvas-spray");
    const chipEl = document.getElementById("spray-chip");
    const altEl = document.getElementById("spray-alt");
    const speedEl = document.getElementById("spray-speed");
    const relEl = document.getElementById("spray-rel");
    const agroBtn = document.getElementById("spray-agro");
    const jetBtn = document.getElementById("spray-jet");
    const isVisible = trackVisibility(canvas);

    const MODES = {
      agro: {
        label: "Irroratore agricolo · 300 m",
        altText: "300 m",
        speedText: "~250 km/h",
        relText: "pesticidi / fertilizzanti (liquidi)",
        chip: "irrorazione agricola · bassa quota",
        planeY: 0.82,
        wingSpan: 22,
        speed: 0.28
      },
      jet: {
        label: "Jet di linea · 10,5 km",
        altText: "10.500 m",
        speedText: "~900 km/h",
        relText: "vapore acqueo → cristalli di ghiaccio",
        chip: "scia di condensazione · alta quota",
        planeY: 0.3,
        wingSpan: 34,
        speed: 0.42
      }
    };
    let mode = "jet";
    let x = 0.1;

    function setMode(m) {
      mode = m;
      agroBtn.classList.toggle("is-active", m === "agro");
      jetBtn.classList.toggle("is-active", m === "jet");
      const M = MODES[m];
      chipEl.textContent = M.chip;
      altEl.textContent = M.altText;
      speedEl.textContent = M.speedText;
      relEl.textContent = M.relText;
    }
    agroBtn.addEventListener("click", () => setMode("agro"));
    jetBtn.addEventListener("click", () => setMode("jet"));

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);
      const M = MODES[mode];

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0d2440");
      bg.addColorStop(0.7, "#1a3557");
      bg.addColorStop(1, "#2c1e3d");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // campo agricolo
      const groundY = h * 0.88;
      ctx.fillStyle = "#1b3a2b";
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.strokeStyle = "rgba(127,208,198,0.15)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const gy = groundY + ((i * 7) % (h - groundY));
        ctx.beginPath();
        ctx.moveTo(0, groundY + (i * 5));
        ctx.lineTo(w, groundY + (i * 5));
        ctx.stroke();
      }

      // linea di quota tratteggiata
      const y = h * M.planeY;
      ctx.strokeStyle = "rgba(240,180,90,0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(240,180,90,0.8)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("quota " + M.altText, w * 0.05, y - 8);

      // velivolo
      const px = x * w;
      ctx.save();
      ctx.translate(px, y);
      ctx.fillStyle = "#ece4d0";
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-8, -7);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-8, 7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(236,228,208,0.4)";
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(-26, 0);
      ctx.stroke();
      ctx.restore();

      // scia / spruzzo
      if (mode === "agro") {
        ctx.fillStyle = "rgba(127,208,198,0.45)";
        ctx.beginPath();
        ctx.moveTo(px - 24, y);
        ctx.lineTo(px - 60, y + 16);
        ctx.lineTo(px - 60, y - 16);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(127,208,198,0.2)";
        ctx.beginPath();
        ctx.moveTo(px - 50, y);
        ctx.lineTo(px - 90, y + 24);
        ctx.lineTo(px - 90, y - 24);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.strokeStyle = "rgba(236,228,208,0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px - 20, y);
        ctx.lineTo(px - w * 0.4, y);
        ctx.stroke();
      }

      // etichette
      ctx.fillStyle = "rgba(236,228,208,0.55)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      if (mode === "agro") {
        ctx.fillText("nuvola liquida visibile", w * 0.5, h * 0.6);
      } else {
        ctx.fillText("vapore acqueo → microcristalli di ghiaccio", w * 0.5, h * 0.45);
      }
    }

    function update(dt) {
      if (!isVisible()) return;
      x += MODES[mode].speed * dt;
      if (x > 1.2) x = -0.2;
    }

    setMode("jet");
    return { update, draw };
  })();

  /* ---------- Esperimento 05 · MODIS ---------- */

  const modisSim = (() => {
    const canvas = document.getElementById("canvas-modis");
    const chipEl = document.getElementById("modis-chip");
    const covEl = document.getElementById("modis-cov");
    const avgEl = document.getElementById("modis-avg");
    const incEl = document.getElementById("modis-inc");
    const slider = document.getElementById("modis-slider");
    const scanBtn = document.getElementById("modis-scan");
    const resetBtn = document.getElementById("modis-reset");
    const isVisible = trackVisibility(canvas);

    let scanX = -0.05; // posizione della linea di scan
    let scanning = false;

    const CONTRAILS = [];
    for (let i = 0; i < 60; i++) {
      CONTRAILS.push({
        x: Math.random(),
        y: Math.random(),
        len: 0.12 + Math.random() * 0.2,
        horiz: Math.random() > 0.5
      });
    }

    function coverage() {
      const tr = +slider.value / 100;
      return tr * tr * 0.4; // 0 → ~0,40 %
    }

    function chipText() {
      const tr = +slider.value;
      if (tr < 15) return "cielo quasi pulito";
      if (tr < 60) return "qualche scia sui corridoi";
      return "corridoi trafficati";
    }

    function updateReadouts() {
      covEl.textContent = fmt(coverage(), 2) + " %";
      avgEl.textContent = "0,13 %";
      incEl.textContent = "~1 %";
    }

    scanBtn.addEventListener("click", () => { scanning = true; scanX = -0.05; chipEl.textContent = "scan in corso…"; });
    resetBtn.addEventListener("click", () => {
      scanning = false;
      slider.value = 30;
      scanX = 1.1;
      chipEl.textContent = chipText();
      updateReadouts();
    });
    slider.addEventListener("input", () => {
      if (!scanning) chipEl.textContent = chipText();
      updateReadouts();
    });

    function update(dt) {
      if (!isVisible()) return;
      if (scanning) {
        scanX += 0.7 * dt;
        if (scanX >= 1.05) {
          scanning = false;
          chipEl.textContent = chipText();
        }
      }
      updateReadouts();
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#071018");
      bg.addColorStop(1, "#0e1a26");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // maglia terrestre stilizzata
      ctx.strokeStyle = "rgba(127,208,198,0.1)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 7; i++) {
        ctx.beginPath();
        ctx.moveTo((w / 7) * i, 0);
        ctx.lineTo((w / 7) * i, h);
        ctx.stroke();
      }
      for (let j = 1; j < 5; j++) {
        ctx.beginPath();
        ctx.moveTo(0, (h / 5) * j);
        ctx.lineTo(w, (h / 5) * j);
        ctx.stroke();
      }

      // scie in base al traffico
      const tr = +slider.value / 100;
      const visibleCount = Math.round(CONTRAILS.length * tr);
      for (let i = 0; i < visibleCount; i++) {
        const c = CONTRAILS[i];
        ctx.strokeStyle = "rgba(236,228,208,0.5)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        if (c.horiz) {
          ctx.moveTo(c.x * w, c.y * h);
          ctx.lineTo((c.x + c.len) * w, c.y * h);
        } else {
          ctx.moveTo(c.x * w, c.y * h);
          ctx.lineTo(c.x * w, (c.y + c.len) * h);
        }
        ctx.stroke();
      }

      // linea di scan
      if (scanning) {
        const sx = scanX * w;
        ctx.fillStyle = "rgba(240,180,90,0.35)";
        ctx.fillRect(sx - 1, 0, 2, h);
        ctx.fillStyle = "#f0b45a";
        ctx.beginPath();
        ctx.moveTo(sx - 8, h * 0.12);
        ctx.lineTo(sx, h * 0.06);
        ctx.lineTo(sx + 8, h * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(240,180,90,0.9)";
        ctx.font = "11px 'IBM Plex Mono', monospace";
        ctx.fillText("MODIS", sx + 12, h * 0.1);
      }

      // bordo "satellite"
      ctx.fillStyle = "rgba(236,228,208,0.45)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("copertura stimata: " + fmt(coverage(), 2) + " %", w * 0.05, h - 16);
    }

    resetBtn.click();
    return { update, draw };
  })();

  /* ---------- Esperimento 06 · Cloud seeding ---------- */

  const seedSim = (() => {
    const canvas = document.getElementById("canvas-seed");
    const chipEl = document.getElementById("seed-chip");
    const amountEl = document.getElementById("seed-amount");
    const rainEl = document.getElementById("seed-rain");
    const regEl = document.getElementById("seed-reg");
    const runBtn = document.getElementById("seed-run");
    const resetBtn = document.getElementById("seed-reset");
    const isVisible = trackVisibility(canvas);

    let seeding = false;
    let cloudGrowth = 0; // 0..1
    let t = 0;

    function ready() {
      seeding = false;
      cloudGrowth = 0;
      t = 0;
      chipEl.textContent = "nuvola naturale";
      amountEl.textContent = "0 g/km";
      rainEl.textContent = "+0 %";
      regEl.textContent = "WMRA · NOAA";
    }

    runBtn.addEventListener("click", () => {
      if (seeding) return;
      seeding = true;
      t = 0;
      chipEl.textContent = "seeding in corso…";
      amountEl.textContent = "~10 g/km";
    });
    resetBtn.addEventListener("click", ready);

    function update(dt) {
      if (!isVisible()) return;
      if (!seeding) return;
      t += dt;
      cloudGrowth = clamp(t / 6, 0, 1);
      if (t >= 6) {
        seeding = false;
        chipEl.textContent = "seeding completato: pioggia leggermente aumentata";
        rainEl.textContent = "+4 %";
        amountEl.textContent = "~10 g/km";
      }
    }

    function draw() {
      if (!isVisible()) return;
      const { ctx, w, h } = sizeCanvas(canvas);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0c1b33");
      bg.addColorStop(1, "#1f3350");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // terra
      const groundY = h * 0.82;
      ctx.fillStyle = "#1b3a2b";
      ctx.fillRect(0, groundY, w, h - groundY);

      // nuvola cumulo
      const cx = w * 0.42, cy = h * 0.32;
      const r = Math.min(w, h) * 0.1 * (1 + cloudGrowth * 0.35);
      ctx.fillStyle = "rgba(236,228,208,0.16)";
      ctx.beginPath();
      ctx.arc(cx - r * 0.7, cy, r * 0.7, 0, Math.PI * 2);
      ctx.arc(cx + r * 0.2, cy - r * 0.3, r * 0.9, 0, Math.PI * 2);
      ctx.arc(cx + r * 0.8, cy, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(236,228,208,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx - r * 0.7, cy, r * 0.7, 0, Math.PI * 2);
      ctx.arc(cx + r * 0.2, cy - r * 0.3, r * 0.9, 0, Math.PI * 2);
      ctx.arc(cx + r * 0.8, cy, r * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      // pioggia
      if (cloudGrowth > 0.4) {
        ctx.strokeStyle = "rgba(127,208,198,0.5)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 14; i++) {
          const rx = cx - r * 0.6 + (i / 13) * r * 1.2;
          const drop = ((t * 1.5 + i * 0.7) % 0.4) * 0.4;
          ctx.beginPath();
          ctx.moveTo(rx, cy + r + drop);
          ctx.lineTo(rx - 2, cy + r + drop + 12);
          ctx.stroke();
        }
      }

      // aereo del seeding
      if (seeding) {
        const ax = cx + Math.sin(t * 0.8) * w * 0.18;
        const ay = cy + r * 1.2;
        ctx.save();
        ctx.translate(ax, ay);
        ctx.fillStyle = "#ece4d0";
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-7, -5);
        ctx.lineTo(-3, 0);
        ctx.lineTo(-7, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // scarico di AgI
        ctx.fillStyle = "rgba(240,180,90,0.4)";
        for (let i = 0; i < 5; i++) {
          const dx = ax - 14 - i * 6;
          ctx.beginPath();
          ctx.arc(dx, ay + 3 - (i % 2) * 3, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.fillStyle = "rgba(236,228,208,0.5)";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("nuvola singola · area delimitata", w * 0.05, h - 16);
    }

    ready();
    return { update, draw };
  })();


  /* ---------- Quiz ---------- */

  const QUIZ = [
    {
      q: "Cosa serve, in fisica, perché un aereo lasci una scia?",
      opts: ["Aria molto fredda in quota e vapore dei motori", "Serbatoi riempiti con sostanze speciali", "Un'antenna segreta a bordo"],
      correct: 0,
      fb: "I motori producono vapore acqueo; a −40/−60 °C si condensa in microcristalli di ghiaccio attorno alle particelle di scarico. È lo stesso fiato visibile d'inverno."
    },
    {
      q: "Perché alcune scie durano ore e si allargano?",
      opts: ["Perché l'aria a quella quota è satura di ghiaccio", "Perché contengono sostanze chimiche", "Perché il sole le congela"],
      correct: 0,
      fb: "In aria secca i cristalli evaporano in secondi. Se l'aria è satura di ghiaccio, la scia persiste, si allarga col vento e diventa un cirro: solo vapore, ma durevole."
    },
    {
      q: "Le 'griglie' che si vedono nel cielo sono…",
      opts: ["Le rotte del traffico aereo, visibili su ADS-B", "Un coordinamento segreto di irrorazioni", "Fenomeni magnetici ad alta quota"],
      correct: 0,
      fb: "Gli aerei seguono corridoi fissi — le autostrade del cielo — che si incrociano. Ogni linea corrisponde a un volo reale che puoi identificare con i dati ADS-B pubblici."
    },
    {
      q: "Il paper USAF 'Owning the Weather in 2025' del 1996 era…",
      opts: ["Un esercizio dichiaratamente fittizio", "Il progetto segreto in corso", "Un manuale operativo dell'aviazione"],
      correct: 0,
      fb: "Era un compito accademico della Air University con scenari dichiaratamente ipotetici. L'aeronautica ha chiarito nel 2005 che non riflette né politica né pratica."
    },
    {
      q: "Quanti esperti, in uno studio del 2016, hanno trovato prove di un programma segreto di irrorazione?",
      opts: ["Nessuno: 76 su 77 non ne hanno trovate", "Quasi tutti", "Solo gli esperti militari"],
      correct: 0,
      fb: "Su 77 chimici dell'atmosfera intervistati, 76 (98,7%) hanno dichiarato di non aver mai incontrato prove di un programma del genere."
    },
    {
      q: "Il cloud seeding, l'irrorazione di nuvole…",
      opts: ["Esiste, ma è locale, regolato e su nuvole esistenti", "È un'invenzione, non esiste", "Serve solo a scopi militari"],
      correct: 0,
      fb: "Esiste dal 1946: si aggiungono ghiaccio secco o argento ioduro a nuvole esistenti, in aree delimitate e con report obbligatori. Non lascia griglie di scie a 10 km di quota."
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
    saSim.update(dt);
    saSim.draw();
    persSim.update(dt);
    persSim.draw();
    adsbSim.update(dt);
    adsbSim.draw();
    spraySim.update(dt);
    spraySim.draw();
    modisSim.update(dt);
    modisSim.draw();
    seedSim.update(dt);
    seedSim.draw();
    requestAnimationFrame(loop);
  }

  /* ---------- Boot ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initQuiz();
    requestAnimationFrame(loop);
  });
})();
