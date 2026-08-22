(function () {
  // Prevent multiple initializations
  if (window.__HemocytometerCounterInitialized) return;
  window.__HemocytometerCounterInitialized = true;

  const STYLES = `
    .hemo-counter-wrapper {
      position: fixed;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      user-select: none;
      display: flex;
      align-items: center;
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .hemo-counter-wrapper.minimized {
      transform: translateY(-50%) translateX(calc(-100% + 28px));
    }

    .hemo-counter-card {
      background: #ffffff;
      color: #1e293b;
      border: 1px solid #cbd5e1;
      border-left: none;
      border-radius: 0 14px 14px 0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      padding: 14px 16px 12px 14px;
      width: 230px;
      box-sizing: border-box;
    }

    .hemo-counter-toggle-btn {
      width: 26px;
      height: 52px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-left: none;
      border-radius: 0 8px 8px 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      box-shadow: 3px 0 8px rgba(0, 0, 0, 0.08);
      outline: none;
      padding: 0;
      transition: background-color 0.15s, color 0.15s;
    }

    .hemo-counter-toggle-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .hemo-counter-toggle-btn svg {
      transition: transform 0.25s ease;
    }

    .hemo-counter-wrapper.minimized .hemo-counter-toggle-btn svg {
      transform: rotate(180deg);
    }

    .hemo-counter-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }

    .hemo-counter-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
    }

    .hemo-status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      font-weight: 600;
      color: #10b981;
    }

    .hemo-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
    }

    .hemo-status-dot.inactive {
      background: #94a3b8;
      box-shadow: none;
    }

    .hemo-side-selector {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 10px;
    }

    .hemo-side-btn {
      padding: 6px 4px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #475569;
      border-radius: 6px;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s ease;
      outline: none;
    }

    .hemo-side-btn:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    .hemo-side-btn.active {
      background: #2563eb;
      color: #ffffff;
      border-color: #1d4ed8;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
    }

    .hemo-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 12px;
    }

    .hemo-table th {
      font-weight: 600;
      color: #64748b;
      padding: 4px 6px;
      font-size: 11px;
      text-align: center;
      border-bottom: 1px solid #e2e8f0;
    }

    .hemo-table th.col-label {
      text-align: left;
      padding-left: 2px;
    }

    .hemo-table th.active-col {
      color: #2563eb;
      font-weight: 700;
    }

    .hemo-table td {
      padding: 5px 6px;
      text-align: center;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }

    .hemo-table td.cell-name {
      text-align: left;
      font-weight: 600;
      padding-left: 2px;
    }

    .hemo-key-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 4px;
      background: #e2e8f0;
      color: #475569;
      margin-left: 4px;
    }

    .hemo-table td.count-val {
      font-variant-numeric: tabular-nums;
      font-weight: 500;
      transition: background-color 0.2s, transform 0.1s;
    }

    .hemo-table td.active-col {
      background: rgba(37, 99, 235, 0.06);
      color: #1d4ed8;
      font-weight: 700;
    }

    .hemo-table tr.total-row td {
      border-top: 2px solid #e2e8f0;
      border-bottom: none;
      font-weight: 700;
      color: #0f172a;
      padding-top: 6px;
    }

    .hemo-pulse {
      animation: hemoPulseAnim 0.3s ease-out;
    }

    @keyframes hemoPulseAnim {
      0% { transform: scale(1.25); color: #2563eb; background: rgba(37, 99, 235, 0.25); }
      100% { transform: scale(1); }
    }

    .hemo-actions {
      display: flex;
      gap: 6px;
      margin-top: 8px;
    }

    .hemo-action-btn {
      flex: 1;
      padding: 5px 0;
      font-size: 11px;
      font-weight: 500;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #475569;
      border-radius: 6px;
      cursor: pointer;
      outline: none;
      transition: all 0.15s ease;
    }

    .hemo-action-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
      border-color: #cbd5e1;
    }

    .hemo-action-btn.btn-reset:hover {
      background: #fee2e2;
      color: #dc2626;
      border-color: #fca5a5;
    }

    .hemo-shortcuts-hint {
      font-size: 9.5px;
      color: #94a3b8;
      text-align: center;
      margin-top: 8px;
      line-height: 1.3;
    }
  `;

  function initCounter() {
    // Inject CSS
    const styleEl = document.createElement("style");
    styleEl.type = "text/css";
    styleEl.innerHTML = STYLES;
    document.head.appendChild(styleEl);

    // Initial state
    const state = {
      activeSide: 1, // 1 or 2
      mouseInWindow: true,
      counts: {
        1: { wbc: 0, rbc: 0, plt: 0 },
        2: { wbc: 0, rbc: 0, plt: 0 }
      },
      history: []
    };

    // Build DOM
    const wrapper = document.createElement("div");
    wrapper.className = "hemo-counter-wrapper";
    wrapper.id = "hemoCounterWrapper";

    wrapper.innerHTML = `
      <div class="hemo-counter-card">
        <div class="hemo-counter-header">
          <div class="hemo-counter-title">Cell Counter</div>
          <div class="hemo-status-indicator" id="hemoStatusIndicator" title="Mouse tracking active">
            <span class="hemo-status-dot" id="hemoStatusDot"></span>
            <span id="hemoStatusText">Active</span>
          </div>
        </div>

        <div class="hemo-side-selector">
          <button type="button" class="hemo-side-btn active" id="hemoBtnSide1" title="Side 1 (Press Tab or S)">Side 1</button>
          <button type="button" class="hemo-side-btn" id="hemoBtnSide2" title="Side 2 (Press Tab or S)">Side 2</button>
        </div>

        <table class="hemo-table">
          <thead>
            <tr>
              <th class="col-label">Cell</th>
              <th id="hemoThSide1" class="active-col">Side 1</th>
              <th id="hemoThSide2">Side 2</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="cell-name">WBC <span class="hemo-key-badge">2</span></td>
              <td class="count-val active-col" id="hemo-count-1-wbc">0</td>
              <td class="count-val" id="hemo-count-2-wbc">0</td>
            </tr>
            <tr>
              <td class="cell-name">RBC <span class="hemo-key-badge">3</span></td>
              <td class="count-val active-col" id="hemo-count-1-rbc">0</td>
              <td class="count-val" id="hemo-count-2-rbc">0</td>
            </tr>
            <tr>
              <td class="cell-name">PLT <span class="hemo-key-badge">1</span></td>
              <td class="count-val active-col" id="hemo-count-1-plt">0</td>
              <td class="count-val" id="hemo-count-2-plt">0</td>
            </tr>
            <tr class="total-row">
              <td class="cell-name">Total</td>
              <td class="count-val active-col" id="hemo-total-1">0</td>
              <td class="count-val" id="hemo-total-2">0</td>
            </tr>
          </tbody>
        </table>

        <div class="hemo-actions">
          <button type="button" class="hemo-action-btn" id="hemoBtnUndo" title="Undo last count (Press Z or Shift+Key)">Undo</button>
          <button type="button" class="hemo-action-btn btn-reset" id="hemoBtnReset" title="Reset all counts (Press R)">Reset</button>
        </div>

        <div class="hemo-shortcuts-hint">
          Keys: <b>2</b>=WBC &nbsp;<b>3</b>=RBC &nbsp;<b>1</b>=PLT<br/>
          <b>Tab</b>/<b>S</b>=Side &nbsp;<b>Shift</b>=Subtract
        </div>
      </div>
      <button type="button" class="hemo-counter-toggle-btn" id="hemoToggleBtn" title="Minimize / Expand Counter">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
    `;

    document.body.appendChild(wrapper);

    // Elements
    const btnSide1 = document.getElementById("hemoBtnSide1");
    const btnSide2 = document.getElementById("hemoBtnSide2");
    const thSide1 = document.getElementById("hemoThSide1");
    const thSide2 = document.getElementById("hemoThSide2");
    const btnUndo = document.getElementById("hemoBtnUndo");
    const btnReset = document.getElementById("hemoBtnReset");
    const toggleBtn = document.getElementById("hemoToggleBtn");
    const statusDot = document.getElementById("hemoStatusDot");
    const statusText = document.getElementById("hemoStatusText");

    function renderActiveSide() {
      if (state.activeSide === 1) {
        btnSide1.classList.add("active");
        btnSide2.classList.remove("active");
        thSide1.classList.add("active-col");
        thSide2.classList.remove("active-col");
      } else {
        btnSide2.classList.add("active");
        btnSide1.classList.remove("active");
        thSide2.classList.add("active-col");
        thSide1.classList.remove("active-col");
      }

      ["wbc", "rbc", "plt"].forEach(function (type) {
        const el1 = document.getElementById("hemo-count-1-" + type);
        const el2 = document.getElementById("hemo-count-2-" + type);
        if (state.activeSide === 1) {
          el1.classList.add("active-col");
          el2.classList.remove("active-col");
        } else {
          el2.classList.add("active-col");
          el1.classList.remove("active-col");
        }
      });

      const totalEl1 = document.getElementById("hemo-total-1");
      const totalEl2 = document.getElementById("hemo-total-2");
      if (state.activeSide === 1) {
        totalEl1.classList.add("active-col");
        totalEl2.classList.remove("active-col");
      } else {
        totalEl2.classList.add("active-col");
        totalEl1.classList.remove("active-col");
      }
    }

    function renderCounts(pulseSide, pulseType) {
      [1, 2].forEach(function (side) {
        let total = 0;
        ["wbc", "rbc", "plt"].forEach(function (type) {
          const val = state.counts[side][type];
          total += val;
          const el = document.getElementById("hemo-count-" + side + "-" + type);
          if (el) {
            el.textContent = val;
            if (pulseSide === side && pulseType === type) {
              el.classList.remove("hemo-pulse");
              void el.offsetWidth; // Trigger reflow
              el.classList.add("hemo-pulse");
            }
          }
        });
        const totalEl = document.getElementById("hemo-total-" + side);
        if (totalEl) totalEl.textContent = total;
      });
    }

    function setActiveSide(side) {
      if (state.activeSide !== side) {
        state.activeSide = side;
        renderActiveSide();
      }
    }

    function modifyCount(side, cellType, delta) {
      const current = state.counts[side][cellType];
      if (delta < 0 && current <= 0) return; // Prevent negative counts

      state.history.push({
        side: side,
        cellType: cellType,
        delta: delta
      });

      state.counts[side][cellType] = Math.max(0, current + delta);
      renderCounts(side, cellType);
    }

    function undo() {
      if (state.history.length === 0) return;
      const lastAction = state.history.pop();
      const current = state.counts[lastAction.side][lastAction.cellType];
      state.counts[lastAction.side][lastAction.cellType] = Math.max(0, current - lastAction.delta);
      renderCounts(lastAction.side, lastAction.cellType);
    }

    function reset() {
      state.counts[1] = { wbc: 0, rbc: 0, plt: 0 };
      state.counts[2] = { wbc: 0, rbc: 0, plt: 0 };
      state.history = [];
      renderCounts();
    }

    // Toggle minimize
    toggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      wrapper.classList.toggle("minimized");
    });

    // Side buttons
    btnSide1.addEventListener("click", function () { setActiveSide(1); });
    btnSide2.addEventListener("click", function () { setActiveSide(2); });

    // Action buttons
    btnUndo.addEventListener("click", function () { undo(); });
    btnReset.addEventListener("click", function () { reset(); });

    // Track mouse in window
    function updateTrackingStatus(active) {
      state.mouseInWindow = active;
      if (active) {
        statusDot.classList.remove("inactive");
        statusText.textContent = "Active";
      } else {
        statusDot.classList.add("inactive");
        statusText.textContent = "Inactive";
      }
    }

    document.addEventListener("mouseenter", function () {
      updateTrackingStatus(true);
    });

    document.addEventListener("mouseleave", function (e) {
      if (!e.relatedTarget && !e.toElement) {
        updateTrackingStatus(false);
      }
    });

    window.addEventListener("focus", function () {
      updateTrackingStatus(true);
    });

    window.addEventListener("blur", function () {
      updateTrackingStatus(false);
    });

    // Keyboard event listener
    window.addEventListener("keydown", function (e) {
      // Ignore when user is focusing input/textarea/select
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return;
      }

      // Check if mouse is in window / active
      if (!state.mouseInWindow && !document.hasFocus()) {
        return;
      }

      const key = e.key;
      const code = e.code;
      const isShift = e.shiftKey;

      let matched = false;

      if (key === "2" || code === "Digit2" || code === "Numpad2") {
        modifyCount(state.activeSide, "wbc", isShift ? -1 : 1);
        matched = true;
      } else if (key === "3" || code === "Digit3" || code === "Numpad3") {
        modifyCount(state.activeSide, "rbc", isShift ? -1 : 1);
        matched = true;
      } else if (key === "1" || code === "Digit1" || code === "Numpad1") {
        modifyCount(state.activeSide, "plt", isShift ? -1 : 1);
        matched = true;
      } else if (key === "Tab" || key === "s" || key === "S") {
        setActiveSide(state.activeSide === 1 ? 2 : 1);
        matched = true;
      } else if (key === "z" || key === "Z" || key === "Backspace") {
        undo();
        matched = true;
      } else if (key === "r" || key === "R") {
        reset();
        matched = true;
      }

      if (matched) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    // Initial render
    renderActiveSide();
    renderCounts();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCounter);
  } else {
    initCounter();
  }
})();
