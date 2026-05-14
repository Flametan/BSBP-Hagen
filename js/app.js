(function () {
  "use strict";

  /* ─── Konfiguration ─────────────────────────────────────── */
  const CFG = {
    REF: { hf: 8, ps: 10, er: 90 },
    THR: { ok: 90, warn: 70 },
    BEZIRKE: [
      { name: "Hagen-Mitte",       ist: 96 },
      { name: "Haspe",             ist: 91 },
      { name: "Vorhalle",          ist: 84 },
      { name: "Altenhagen",        ist: 88 },
      { name: "Boele-Kabel",       ist: 79 },
      { name: "Eilpe/Delstern",    ist: 75 },
      { name: "Emst",              ist: 68 },
      { name: "Hohenlimburg",      ist: 58 },
    ],
    OBJ_TYPES: [
      { key:"hochhaus",    label:"Hochhäuser",           cat:"A", col:"var(--red)",    n:4 },
      { key:"krankenhaus", label:"Krankenhäuser",        cat:"A", col:"var(--red)",    n:8 },
      { key:"industrie",   label:"Industrie/KRITIS",     cat:"A", col:"var(--red)",    n:5 },
      { key:"schule",      label:"Schulen/Bildung",      cat:"B", col:"var(--amber)",  n:22 },
      { key:"mfh",         label:"Mehrfamilienhäuser",   cat:"B", col:"var(--amber)",  n:25 },
      { key:"tunnel",      label:"Tunnel/Verkehr",       cat:"B", col:"var(--orange)", n:3 },
      { key:"efh",         label:"Einfamilienhäuser",    cat:"C", col:"var(--blue)",   n:312 },
    ],
    DEF: { warn: 5, crit: 15 },
  };

  /* ─── Zentraler State ──────────────────────────────────── */
  const S = {
    hf: 8, ps: 10, er: 90,
    active: new Set(CFG.OBJ_TYPES.map(o => o.key)),
  };

  /* ─── UI-Modul ───────────────────────────────────────────
     Alle DOM-Schreibzugriffe gebündelt.                     */
  const UI = {

    setPillar(field, val) {
      const el = document.getElementById(`v-${field}`);
      if (!el) return;
      el.textContent = val;
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");

      let col;
      if (field === "hf") col = val <= CFG.REF.hf ? "var(--green)" : val <= CFG.REF.hf+2 ? "var(--amber)" : "var(--red)";
      else if (field === "ps") col = val >= CFG.REF.ps ? "var(--green)" : val >= CFG.REF.ps-2 ? "var(--amber)" : "var(--red)";
      else col = val >= CFG.THR.ok ? "var(--green)" : val >= CFG.THR.warn ? "var(--amber)" : "var(--red)";
      el.style.color = col;
    },

    syncSlider(field, val) {
      const sl = document.getElementById(`sl-${field}`);
      const ni = document.getElementById(`ni-${field}`);
      const sv = document.getElementById(`sv-${field}`);
      if (sl) {
        sl.value = val;
        const pct = ((val - sl.min) / (sl.max - sl.min)) * 100;
        sl.style.setProperty("--pct", `${pct}%`);
      }
      if (ni) ni.value = val;
      if (sv) sv.textContent = field === "hf" ? `${val} Min` : field === "ps" ? `${val} Kräfte` : `${val} %`;
    },

    setDelta(field, val) {
      const ref = CFG.REF[field];
      const delta = val - ref;
      const invert = field === "hf";
      const isGood = invert ? delta <= 0 : delta >= 0;
      const unit = field === "hf" ? " Min" : field === "er" ? " %" : "";

      const dEl  = document.getElementById(`d-${field}`);
      const pbEl = document.getElementById(`pb-${field}`);
      if (dEl) {
        dEl.textContent = (delta >= 0 ? "+" : "") + delta + unit;
        dEl.style.color = isGood
          ? (delta === 0 ? "var(--text-3)" : "var(--green)")
          : (Math.abs(delta) > 2 ? "var(--red)" : "var(--amber)");
      }
      if (pbEl) {
        const sl = document.getElementById(`sl-${field}`);
        if (sl) {
          const pct = ((val - sl.min) / (sl.max - sl.min)) * 100;
          pbEl.style.width = `${pct}%`;
          pbEl.style.background = isGood ? "var(--green)" : (Math.abs(delta) > 2 ? "var(--red)" : "var(--amber)");
        }
      }
    },

    calcScore() {
      const hfScore = Math.max(0, Math.min(100, 100 - (S.hf - CFG.REF.hf) * 12.5));
      const psScore = Math.max(0, Math.min(100, 100 - (CFG.REF.ps - S.ps) * 10));
      const erScore = S.er;
      const total   = Math.round(hfScore * .4 + psScore * .3 + erScore * .3);
      return { total, hfScore, psScore, erScore };
    },

    setGauge(score) {
      const circ  = document.getElementById("g-fill");
      const pctEl = document.getElementById("gauge-pct");
      if (!circ || !pctEl) return;

      const TRACK = 339;
      const filled = Math.round((score / 100) * TRACK);
      circ.style.strokeDashoffset = TRACK - filled;

      let col = "var(--green)";
      if (score < CFG.THR.warn) col = "var(--red)";
      else if (score < CFG.THR.ok) col = "var(--amber)";

      circ.style.stroke = col;
      pctEl.textContent = `${score}%`;
      pctEl.style.color  = col;
    },

    setTrafficLight(score) {
      ["tl-r","tl-y","tl-g"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.className = "tl-seg";
      });
      const el = document.getElementById(
        score >= CFG.THR.ok ? "tl-g" : score >= CFG.THR.warn ? "tl-y" : "tl-r"
      );
      const cls = score >= CFG.THR.ok ? "on-green" : score >= CFG.THR.warn ? "on-amber" : "on-red";
      el?.classList.add(cls);
    },

    setPill(score) {
      const el = document.getElementById("status-pill");
      if (!el) return;
      el.className = "status-pill";
      if (score >= CFG.THR.ok) {
        el.classList.add("pill-ok"); el.textContent = "✓ Schutzziel erfüllt";
      } else if (score >= CFG.THR.warn) {
        el.classList.add("pill-warn"); el.textContent = "⚠ Eingeschränkt";
      } else {
        el.classList.add("pill-critical"); el.textContent = "✕ Kritisches Defizit";
      }
    },

    setScoreInfo(hfScore, psScore, erScore) {
      const fmt = v => `${Math.round(v)} Pkt`;
      ["hf","ps","er"].forEach((f, i) => {
        const el = document.getElementById(`si-${f}`);
        if (el) el.textContent = fmt([hfScore, psScore, erScore][i]);
      });
    },

    setBMRows() {
      const refMap = {
        hf: { cur: S.hf, ref: CFG.REF.hf, unit:" Min", goodWhen:"le" },
        ps: { cur: S.ps, ref: CFG.REF.ps, unit:" Kräfte", goodWhen:"ge" },
        er: { cur: S.er, ref: CFG.REF.er, unit:" %", goodWhen:"ge" },
      };

      Object.entries(refMap).forEach(([f, d]) => {
        const valEl  = document.getElementById(`bm-${f}`);
        const chipEl = document.getElementById(`bm-${f}-c`);
        if (!valEl || !chipEl) return;
        valEl.textContent = d.cur + d.unit;
        const ok = d.goodWhen === "le" ? d.cur <= d.ref : d.cur >= d.ref;
        const diff = d.cur - d.ref;
        let cls, txt;
        if (ok) { cls="chip-green"; txt="✓ Erfüllt"; }
        else if (Math.abs(diff) <= 2) { cls="chip-amber"; txt="⚠ Grenzbereich"; }
        else { cls="chip-red"; txt="✕ Defizit"; }
        chipEl.innerHTML = `<span class="chip ${cls}">${txt}</span>`;
      });
    },

    setRiskCounts() {
      const counts = { A:0, B:0, C:0 };
      CFG.OBJ_TYPES.forEach(o => {
        if (S.active.has(o.key)) counts[o.cat] += o.n;
      });
      ["A","B","C"].forEach(c => {
        const el = document.getElementById(`r2-${c.toLowerCase()}`);
        if (el) el.textContent = counts[c];
      });
    },

    setDefTable() {
      const tbody = document.getElementById("def-tbody");
      if (!tbody) return;

      const hfF = Math.max(.6, 1 - (S.hf - CFG.REF.hf) * .04);
      const psF = Math.max(.7, S.ps / CFG.REF.ps);

      const rows = CFG.BEZIRKE.map(b => ({
        ...b,
        ist:  Math.round(Math.min(100, b.ist * hfF * psF)),
        soll: S.er,
      })).sort((a,b) => (b.soll - b.ist) - (a.soll - a.ist));

      tbody.innerHTML = rows.map(r => {
        const delta = r.soll - r.ist;
        const barW  = r.ist;
        const barCol = r.ist >= CFG.THR.ok ? "var(--green)" : r.ist >= CFG.THR.warn ? "var(--amber)" : "var(--red)";
        let cc, ct, statusKey;
        if (delta > CFG.DEF.crit)      { cc="chip-red";   ct="Kritisch"; statusKey="crit"; }
        else if (delta > CFG.DEF.warn) { cc="chip-amber"; ct="Warnung";  statusKey="warn"; }
        else                            { cc="chip-green"; ct="OK";       statusKey="ok";   }
        return `
          <tr data-status="${statusKey}">
            <td style="font-weight:500;color:var(--text-1)">${r.name}</td>
            <td>
              <div style="font-family:var(--font-mono);font-size:.75rem;color:${barCol}">${r.ist}%</div>
              <div class="prog-track" style="width:80px;margin-top:2px">
                <div class="prog-fill" style="width:${barW}%;background:${barCol}"></div>
              </div>
            </td>
            <td style="font-family:var(--font-mono)">${r.soll}%</td>
            <td style="font-family:var(--font-mono);color:${delta>0?"var(--red)":"var(--green)"}">
              ${delta>0?"−":"+"}${Math.abs(delta)} PP
            </td>
            <td><span class="chip ${cc}">${ct}</span></td>
          </tr>`;
      }).join("");
    },

    clock() {
      const el = document.getElementById("live-clock");
      if (!el) return;
      const n = new Date();
      const p = v => String(v).padStart(2, "0");
      el.textContent = `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
    },
  };

  /* ─── Charts-Modul ───────────────────────────────────────
     Chart.js-Instanz für Soll/Ist-Diagramm (Tab 4).        */
  const Charts = {
    siChart:  null,
    siReady:  false,

    compute() {
      const hfF = Math.max(.6, 1 - (S.hf - CFG.REF.hf) * .04);
      const psF = Math.max(.7, S.ps / CFG.REF.ps);
      const ist  = CFG.BEZIRKE.map(b => Math.round(Math.min(100, b.ist * hfF * psF)));
      const soll = CFG.BEZIRKE.map(() => S.er);
      return { labels: CFG.BEZIRKE.map(b => b.name), ist, soll };
    },

    updateKPI() {
      const { ist } = this.compute();
      const ok   = ist.filter(v => v >= CFG.THR.ok).length;
      const crit = ist.filter(v => v <  CFG.THR.warn).length;
      const avg  = (ist.reduce((a, b) => a + b, 0) / ist.length).toFixed(1);
      const elOk   = document.getElementById("kpi-ok");
      const elCrit = document.getElementById("kpi-crit");
      const elAvg  = document.getElementById("kpi-avg");
      if (elOk)   elOk.textContent   = ok;
      if (elCrit) elCrit.textContent = crit;
      if (elAvg)  elAvg.textContent  = avg + "%";
    },

    initSI() {
      const canvas = document.getElementById("chart-si");
      if (!canvas || !window.Chart) return;
      this.siReady = true;

      const { labels, ist, soll } = this.compute();

      this.siChart = new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Ist-Wert (%)",
              data:  ist,
              backgroundColor: ist.map(v =>
                v >= CFG.THR.ok   ? "rgba(34,197,94,.6)"  :
                v >= CFG.THR.warn ? "rgba(245,158,11,.6)" :
                                    "rgba(239,68,68,.6)"
              ),
              borderColor: ist.map(v =>
                v >= CFG.THR.ok   ? "rgba(34,197,94,1)"  :
                v >= CFG.THR.warn ? "rgba(245,158,11,1)" :
                                    "rgba(239,68,68,1)"
              ),
              borderWidth: 1,
              borderRadius: 4,
            },
            {
              label: "Soll-Wert (%)",
              type:  "line",
              data:  soll,
              borderColor:     "rgba(245,158,11,.8)",
              backgroundColor: "transparent",
              borderWidth: 2,
              borderDash: [6,3],
              pointRadius: 4,
              pointBackgroundColor: "var(--amber)",
              tension: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 500, easing: "easeInOutQuart" },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#131825",
              borderColor: "#1c2438",
              borderWidth: 1,
              titleColor: "#e2e8f0",
              bodyColor:  "#8b98b1",
              callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}%` },
            },
          },
          scales: {
            x: {
              grid:  { color: "rgba(28,36,56,.8)" },
              ticks: { color: "#4b5571", font: { family: "'JetBrains Mono', 'Courier New'", size: 10 } },
            },
            y: {
              min: 40, max: 105,
              grid:  { color: "rgba(28,36,56,.8)" },
              ticks: {
                color: "#4b5571",
                font:  { family: "'JetBrains Mono', 'Courier New'", size: 10 },
                callback: v => `${v}%`,
              },
            },
          },
        },
      });
    },

    updateSI() {
      this.updateKPI();
      if (!this.siChart) return;
      const { ist, soll } = this.compute();
      this.siChart.data.datasets[0].data = ist;
      this.siChart.data.datasets[0].backgroundColor = ist.map(v =>
        v >= CFG.THR.ok ? "rgba(34,197,94,.6)" : v >= CFG.THR.warn ? "rgba(245,158,11,.6)" : "rgba(239,68,68,.6)");
      this.siChart.data.datasets[0].borderColor = ist.map(v =>
        v >= CFG.THR.ok ? "rgba(34,197,94,1)"  : v >= CFG.THR.warn ? "rgba(245,158,11,1)"  : "rgba(239,68,68,1)");
      this.siChart.data.datasets[1].data = soll;
      this.siChart.update("active");
    },
  };

  /* ─── App – Öffentliche API ──────────────────────────────
     Exponiert als window.App für onclick-Handler.          */
  window._bsbpCharts = Charts;

  window.App = {

    update(field, raw) {
      const sl  = document.getElementById(`sl-${field}`);
      const min = sl ? +sl.min : 0;
      const max = sl ? +sl.max : 100;
      const val = Math.max(min, Math.min(max, Math.round(+raw)));

      S[field] = val;

      UI.syncSlider(field, val);
      UI.setPillar(field, val);
      UI.setDelta(field, val);

      const { total, hfScore, psScore, erScore } = UI.calcScore();
      UI.setGauge(total);
      UI.setTrafficLight(total);
      UI.setPill(total);
      UI.setScoreInfo(hfScore, psScore, erScore);
      UI.setBMRows();
      UI.setDefTable();
      Charts.updateSI();
    },

    reset() {
      Object.entries(CFG.REF).forEach(([f, v]) => App.update(f, v));
    },
  };

  /* ─── Objekt-Toggles (Tab 2) ─────────────────────────── */
  function initToggles() {
    const c = document.getElementById("obj-toggles");
    if (!c) return;
    c.innerHTML = CFG.OBJ_TYPES.map(o => `
      <div class="obj-toggle on" data-key="${o.key}"
           style="--ot-color:${o.col}"
           role="checkbox" aria-checked="true" tabindex="0">
        <div class="ot-dot"></div>
        <span>${o.label} (${o.cat}) – ${o.n}</span>
      </div>
    `).join("");

    c.addEventListener('click', function(e) {
      var toggle = e.target.closest('[data-key]');
      if (toggle) _toggleObj(toggle.dataset.key);
    });
    c.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var toggle = e.target.closest('[data-key]');
        if (toggle) _toggleObj(toggle.dataset.key);
      }
    });
  }

  function _toggleObj(key) {
    S.active.has(key) ? S.active.delete(key) : S.active.add(key);
    const btn = document.querySelector(`[data-key="${key}"]`);
    if (btn) {
      btn.classList.toggle("on", S.active.has(key));
      btn.setAttribute("aria-checked", String(S.active.has(key)));
    }
    UI.setRiskCounts();
  }

  /* ─── Bootstrap ──────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    if (window.Chart) {
      Chart.defaults.color       = "#8b98b1";
      Chart.defaults.borderColor = "#1c2438";
      Chart.defaults.font.family = "'JetBrains Mono', 'Courier New', monospace";
    }

    // ── 1. TAB-SWITCHING ────────────────────────────────────────────────
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.getAttribute('data-tab');
        if (!id) return;
        document.querySelectorAll('.tab-panel').forEach(function(p) {
          p.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(function(b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        var panel = document.getElementById(id);
        if (panel) panel.classList.add('active');
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        if (id === 't4' && !Charts.siReady) Charts.initSI();
        wrapTables();
      });
    });

    // ── 2. SLIDER + NUMBER-INPUTS ───────────────────────────────────────
    document.querySelectorAll('[data-field]').forEach(function(el) {
      var field = el.getAttribute('data-field');
      el.addEventListener('input', function() {
        App.update(field, el.value);
      });
    });

    // ── 3. RESET-BUTTON ──────────────────────────────────────────────────
    var resetBtn = document.querySelector('[data-action="reset"]');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() { App.reset(); });
    }

    // ── 4. TABELLEN-WRAPPER (Funktion, mehrfach aufrufbar) ───────────────
    function wrapTables() {
      document.querySelectorAll('.data-table').forEach(function(tbl) {
        if (tbl.parentElement && !tbl.parentElement.classList.contains('tbl-scroll')) {
          var cols = tbl.querySelectorAll('th').length;
          var wrap = document.createElement('div');
          wrap.className = 'tbl-scroll' + (cols <= 3 ? ' tbl-narrow' : '');
          tbl.parentNode.insertBefore(wrap, tbl);
          wrap.appendChild(tbl);
        }
      });
    }
    wrapTables();

    // ── 5. APP-INIT ──────────────────────────────────────────────────────
    App.reset();

    UI.clock();
    setInterval(function() { UI.clock(); }, 1000);
  });

})(); // IIFE
