/**
 * 100X WBC Differential Counter Overlay
 * For virtual microscope slides at 100X magnification.
 *
 * Default Key Controls:
 *   [1] : Segmented Neutrophil (SEG)
 *   [2] : Lymphocyte (LYMPH)
 *   [3] : Monocyte (MONO)
 *   [4] : Band Neutrophil (BAND)
 *   [5] : Eosinophil (EO)
 *   [6] : Basophil (BASO)
 *   [7] : Metamyelocyte (META)
 *   [8] : Myelocyte (MYELO)
 *   [9] : Promyelocyte (PRO)
 *   [0] : Variant Lymphocyte (VLYMPH)
 *   [+] or [=] : Blast (BLAST)
 *   [.] : Nucleated RBC (NRBC) - counted separately
 *   [/] or [?] : Smudge Cell (SMUDGE) - counted separately
 *
 *   [Shift + Key] : Subtract 1 from that cell type
 *   [Z] or [Backspace] : Undo last action
 *   [R] : Reset all counts
 */
(function () {
  if (window.__Differential100XInitialized) return;
  window.__Differential100XInitialized = true;

  function getViewer() {
    return window.viewer || window.__osdViewer || null;
  }

  const NUMPAD_CELL_DEFS = [
    { key: "1", code: "Digit1", npCode: "Numpad1", id: "seg", name: "Segmented Neutrophil", acronym: "SEG", isWbc: true },
    { key: "2", code: "Digit2", npCode: "Numpad2", id: "lymph", name: "Lymphocyte", acronym: "LYMPH", isWbc: true },
    { key: "3", code: "Digit3", npCode: "Numpad3", id: "mono", name: "Monocyte", acronym: "MONO", isWbc: true },
    { key: "4", code: "Digit4", npCode: "Numpad4", id: "band", name: "Band Neutrophil", acronym: "BAND", isWbc: true },
    { key: "5", code: "Digit5", npCode: "Numpad5", id: "eo", name: "Eosinophil", acronym: "EO", isWbc: true },
    { key: "6", code: "Digit6", npCode: "Numpad6", id: "baso", name: "Basophil", acronym: "BASO", isWbc: true },
    { key: "7", code: "Digit7", npCode: "Numpad7", id: "meta", name: "Metamyelocyte", acronym: "META", isWbc: true },
    { key: "8", code: "Digit8", npCode: "Numpad8", id: "myelo", name: "Myelocyte", acronym: "MYELO", isWbc: true },
    { key: "9", code: "Digit9", npCode: "Numpad9", id: "pro", name: "Promyelocyte", acronym: "PRO", isWbc: true },
    { key: "0", code: "Digit0", npCode: "Numpad0", id: "vlymph", name: "Variant Lymphocyte", acronym: "VLYMPH", isWbc: true },
    { key: "+", altKey: "=", code: "Equal", npCode: "NumpadAdd", id: "blast", name: "Blast", acronym: "BLAST", isWbc: true },
    { dividerBefore: true, key: ".", code: "Period", npCode: "NumpadDecimal", id: "nrbc", name: "Nucleated RBC", acronym: "NRBC", isWbc: false },
    { key: "/", altKey: "?", code: "Slash", npCode: "NumpadDivide", id: "smudge", name: "Smudge Cell", acronym: "SMUDGE", isWbc: false }
  ];

  const QWERTY_CELL_DEFS = [
    { key: "f", code: "KeyF", id: "seg", name: "Segmented Neutrophil", acronym: "SEG", isWbc: true },
    { key: "g", code: "KeyG", id: "band", name: "Band Neutrophil", acronym: "BAND", isWbc: true },
    { key: "d", code: "KeyD", id: "lymph", name: "Lymphocyte", acronym: "LYMPH", isWbc: true },
    { key: "s", code: "KeyS", id: "mono", name: "Monocyte", acronym: "MONO", isWbc: true },
    { key: "t", code: "KeyT", id: "eo", name: "Eosinophil", acronym: "EO", isWbc: true },
    { key: "r", code: "KeyR", id: "baso", name: "Basophil", acronym: "BASO", isWbc: true },
    { key: "c", code: "KeyC", id: "vlymph", name: "Variant Lymphocyte", acronym: "VLYMPH", isWbc: true },
    { key: "e", code: "KeyE", id: "meta", name: "Metamyelocyte", acronym: "META", isWbc: true },
    { key: "w", code: "KeyW", id: "myelo", name: "Myelocyte", acronym: "MYELO", isWbc: true },
    { key: "q", code: "KeyQ", id: "pro", name: "Promyelocyte", acronym: "PRO", isWbc: true },
    { key: "z", code: "KeyZ", id: "blast", name: "Blast", acronym: "BLAST", isWbc: true },
    { dividerBefore: true, key: "v", code: "KeyV", id: "nrbc", name: "Nucleated RBC", acronym: "NRBC", isWbc: false },
    { key: "b", code: "KeyB", id: "smudge", name: "Smudge Cell", acronym: "SMUDGE", isWbc: false }
  ];

  let currentKeyPreset = "numpad"; // 'numpad', 'qwerty', 'user'

  // Load custom key bindings if saved
  function loadCellDefs() {
    try {
      const savedPreset = localStorage.getItem("diff100x_preset");
      if (savedPreset === "qwerty" || savedPreset === "user" || savedPreset === "numpad") {
        currentKeyPreset = savedPreset;
      }
      
      if (currentKeyPreset === "qwerty") {
        return QWERTY_CELL_DEFS.map(d => ({ ...d }));
      }
      
      if (currentKeyPreset === "user") {
        const saved = localStorage.getItem("diff100x_custom_keys");
        if (saved) {
          const parsed = JSON.parse(saved);
          return NUMPAD_CELL_DEFS.map(d => {
            if (parsed[d.id]) {
              return {
                ...d,
                key: parsed[d.id].key || d.key,
                altKey: parsed[d.id].altKey || null,
                code: parsed[d.id].code || d.code,
                npCode: parsed[d.id].npCode || d.npCode
              };
            }
            return { ...d };
          });
        }
        return NUMPAD_CELL_DEFS.map(d => ({ ...d }));
      }
    } catch (e) {
      console.warn("Could not load custom keys from localStorage:", e);
    }
    currentKeyPreset = "numpad";
    return NUMPAD_CELL_DEFS.map(d => ({ ...d }));
  }

  let CELL_DEFS = loadCellDefs();

  const STYLES = `
    .diff100x-wrapper {
      position: fixed;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      user-select: none;
      display: flex;
      align-items: center;
      transition: filter 0.2s ease, opacity 0.2s ease;
    }

    .diff100x-wrapper.inactive {
      filter: grayscale(0.85) contrast(0.9);
      opacity: 0.78;
    }

    .diff100x-wrapper.inactive:hover {
      filter: grayscale(0.3) contrast(0.98);
      opacity: 0.95;
    }

    .diff100x-wrapper.minimized {
      top: 50%;
      transform: translateY(calc(-50% - 48px));
    }

    .diff100x-wrapper.minimized.displaced-top {
      top: 50% !important;
      transform: translateY(var(--diff100x-displaced-top, calc(-50% - 320px))) !important;
    }

    .diff100x-wrapper.minimized.displaced-bottom {
      top: 50% !important;
      transform: translateY(var(--diff100x-displaced-bottom, calc(-50% + 320px))) !important;
    }

    .diff100x-card {
      position: relative;
      background: #ffffff;
      color: #1e1b4b;
      border: 1px solid #c4b5fd;
      border-left: none;
      border-radius: 0 14px 14px 0;
      box-shadow: 0 12px 30px -5px rgba(109, 40, 217, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
      padding: 10px 12px;
      width: 255px;
      max-height: calc(100vh - 180px);
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    .diff100x-wrapper.minimized .diff100x-card {
      width: 154px;
      box-sizing: border-box;
      padding: 6px 10px 7px 10px;
      border-radius: 0 10px 10px 0;
      box-shadow: 0 4px 14px rgba(109, 40, 217, 0.16);
      cursor: pointer;
    }

    .diff100x-wrapper.minimized .diff100x-card:hover {
      background: #fdfcff;
      border-color: #a78bfa;
      box-shadow: 0 6px 18px rgba(109, 40, 217, 0.22);
    }

    .diff100x-wrapper.minimized .diff100x-status-bar,
    .diff100x-wrapper.minimized .diff100x-progress-card,
    .diff100x-wrapper.minimized #diff100xReturnBannerContainer,
    .diff100x-wrapper.minimized .diff100x-table-container,
    .diff100x-wrapper.minimized .diff100x-bottom-section {
      display: none !important;
    }

    .diff100x-status-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      box-sizing: border-box;
      padding: 4px 8px;
      margin-bottom: 8px;
      background: #fbf9ff;
      border: 1px solid #ede9fe;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #7c3aed;
      user-select: none;
    }

    .diff100x-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
      padding-bottom: 5px;
      border-bottom: 1px solid #ede9fe;
      width: 100%;
      box-sizing: border-box;
    }

    .diff100x-wrapper.minimized .diff100x-header {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    .diff100x-wrapper:not(.minimized) .diff100x-collapse-indicator {
      display: none !important;
    }

    .diff100x-title-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      width: 100%;
    }

    .diff100x-wrapper:not(.minimized) .diff100x-title-group {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }

    .diff100x-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      width: 100%;
    }

    .diff100x-wrapper.minimized .diff100x-title-row {
      justify-content: center;
    }

    .diff100x-collapse-indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 9999px;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease;
      line-height: 1.3;
    }

    .diff100x-collapse-indicator.perform {
      background: #f5f3ff;
      color: #7c3aed;
      border: 1px solid #ddd6fe;
    }
    .diff100x-collapse-indicator.perform:hover {
      background: #ede9fe;
      border-color: #c4b5fd;
      color: #6d28d9;
    }

    .diff100x-collapse-indicator.in-progress {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
    }
    .diff100x-collapse-indicator.in-progress:hover {
      background: #dbeafe;
      border-color: #93c5fd;
      color: #1d4ed8;
    }

    .diff100x-collapse-indicator.complete {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }
    .diff100x-collapse-indicator.complete:hover {
      background: #d1fae5;
      border-color: #6ee7b7;
      color: #047857;
    }

    .diff100x-collapse-indicator-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }

    .diff100x-help-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #f5f3ff;
      color: #7c3aed;
      border: 1.5px solid #ddd6fe;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: all 0.15s ease;
      flex-shrink: 0;
      margin-left: auto;
    }

    .diff100x-help-btn:hover {
      background: #7c3aed;
      color: #ffffff;
      border-color: #7c3aed;
    }

    .diff100x-wrapper.minimized .diff100x-help-btn {
      display: none !important;
    }

    .diff100x-title {
      font-size: 14px;
      line-height: 1.25;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #5b21b6;
      text-align: left;
      flex: 1;
    }

    .diff100x-wrapper.minimized .diff100x-title {
      font-size: 12px;
      text-align: center;
      flex: none;
    }

    .diff100x-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #7c3aed;
      box-shadow: 0 0 6px rgba(124, 58, 237, 0.6);
    }

    .diff100x-dot.inactive {
      background: #94a3b8;
      box-shadow: none;
    }

    .diff100x-dot.review {
      background: #0284c7;
      box-shadow: 0 0 6px rgba(2, 132, 199, 0.6);
    }

    /* Primary Progress Banner */
    .diff100x-progress-card {
      background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
      border: 1px solid #ddd6fe;
      border-radius: 8px;
      padding: 6px 10px;
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .diff100x-progress-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      color: #4c1d95;
    }

    .diff100x-progress-header-label {
      font-weight: 700;
      color: #4c1d95;
    }

    .diff100x-progress-header-val {
      font-weight: 700;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .diff100x-progress-bar-bg {
      width: 100%;
      height: 6px;
      background: #ddd6fe;
      border-radius: 999px;
      overflow: hidden;
      position: relative;
    }

    .diff100x-progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #8b5cf6, #6d28d9);
      width: 0%;
      transition: width 0.2s ease;
      border-radius: 999px;
    }

    .diff100x-progress-bar-fill.complete {
      background: linear-gradient(90deg, #10b981, #059669);
    }

    /* Return to previous view banner */
    .diff100x-return-banner {
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: 5px 8px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      font-size: 10.5px;
      color: #92400e;
      animation: diff100xSlideDown 0.2s ease-out;
    }

    @keyframes diff100xSlideDown {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .diff100x-return-btn {
      background: #f59e0b;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      padding: 3px 7px;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      transition: background-color 0.15s;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .diff100x-return-btn:hover {
      background: #d97706;
    }

    /* Cell Table */
    .diff100x-table-container {
      flex: 1;
      overflow-y: auto;
      min-height: 110px;
      max-height: calc(100vh - 300px);
      border: 1px solid #ede9fe;
      border-radius: 6px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
    }

    .diff100x-table-header {
      display: grid;
      grid-template-columns: 1fr 34px 62px 22px;
      padding: 4px 6px 4px 8px;
      background: #f5f3ff;
      border-bottom: 1px solid #ede9fe;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #6d28d9;
      position: sticky;
      top: 0;
      z-index: 2;
      align-items: center;
    }

    .diff100x-table-header span:nth-child(2) { text-align: right; }
    .diff100x-table-header span:nth-child(3) { text-align: right; }
    .diff100x-table-header span:nth-child(4) { text-align: center; display: flex; align-items: center; justify-content: center; }

    .diff100x-divider {
      height: 1px;
      background: #c4b5fd;
      margin: 4px 6px;
      position: relative;
    }

    .diff100x-row-group {
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid #f5f3ff;
    }

    .diff100x-row-group:last-child {
      border-bottom: none;
    }

    .diff100x-row {
      display: grid;
      grid-template-columns: 1fr 34px 62px 22px;
      align-items: center;
      padding: 3.5px 6px 3.5px 8px;
      font-size: 11px;
      cursor: pointer;
      transition: background-color 0.12s ease;
      box-sizing: border-box;
    }

    .diff100x-row:hover {
      background: #f5f3ff;
    }

    .diff100x-row.active {
      background: #ede9fe;
      box-shadow: inset 3.5px 0 0 #7c3aed;
    }

    .diff100x-row.active .diff100x-acronym {
      color: #5b21b6;
      font-weight: 800;
    }

    .diff100x-cell-name {
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #334155;
      font-weight: 500;
    }

    .diff100x-key-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9px;
      font-weight: 700;
      background: #ede9fe;
      color: #6d28d9;
      padding: 1px 4px;
      border-radius: 3px;
      min-width: 11px;
      text-align: center;
      flex-shrink: 0;
    }

    .diff100x-acronym {
      font-weight: 700;
      font-size: 11px;
      color: #1e1b4b;
    }

    .diff100x-cell-num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      font-size: 11.5px;
    }

    .diff100x-cell-pct {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-size: 10.5px;
      white-space: nowrap;
    }

    .diff100x-val-grayed {
      color: #94a3b8;
      font-weight: 400;
    }

    .diff100x-val-counted {
      color: #5b21b6;
      font-weight: 700;
    }

    .diff100x-filter-btn {
      background: none;
      border: none;
      padding: 2px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #8b5cf6;
      border-radius: 3px;
      transition: all 0.12s;
    }

    .diff100x-filter-btn:hover {
      background: #ede9fe;
      color: #6d28d9;
    }

    .diff100x-filter-btn.filtered {
      color: #cbd5e1;
    }

    /* Sub-log for cell items */
    .diff100x-sublog-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2.5px 6px;
      border-radius: 4px;
      font-size: 10px;
      background: #ffffff;
      border: 1px solid #ede9fe;
      color: #4c1d95;
      cursor: pointer;
      transition: all 0.12s;
    }

    .diff100x-sublog-item:hover {
      background: #ede9fe;
      border-color: #c4b5fd;
    }

    .diff100x-sublog-item.active {
      background: #7c3aed;
      color: #ffffff;
      border-color: #7c3aed;
      font-weight: 700;
    }

    .diff100x-sublog-item.active .diff100x-sublog-tag {
      color: #ede9fe;
    }

    .diff100x-sublog-tag {
      font-size: 8.5px;
      color: #8b5cf6;
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }

    /* Bottom Visited Section */
    .diff100x-bottom-section {
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .diff100x-log-toggle-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 6px;
      background: #f5f3ff;
      border: 1px solid #ede9fe;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      color: #5b21b6;
      cursor: pointer;
      transition: background-color 0.12s;
    }

    .diff100x-log-toggle-header:hover {
      background: #ede9fe;
    }

    .diff100x-filter-badge {
      font-size: 8.5px;
      font-weight: 700;
      color: #d97706;
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 1px 4px;
      border-radius: 3px;
      text-transform: uppercase;
    }

    .diff100x-full-log-list {
      max-height: 120px;
      overflow-y: auto;
      border: 1px solid #ede9fe;
      border-radius: 5px;
      background: #faf5ff;
      padding: 3px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .diff100x-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      margin-top: 4px;
    }

    .diff100x-btn {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      border: 1px solid transparent;
      outline: none;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .diff100x-btn-primary {
      background: #7c3aed;
      color: #ffffff;
      border-color: #6d28d9;
    }

    .diff100x-btn-primary:hover:not(:disabled) {
      background: #6d28d9;
    }

    .diff100x-btn-secondary {
      background: #f5f3ff;
      color: #5b21b6;
      border-color: #ddd6fe;
    }

    .diff100x-btn-secondary:hover:not(:disabled) {
      background: #ede9fe;
      color: #4c1d95;
    }

    .diff100x-btn-minimize {
      width: 100%;
      margin-top: 4px;
      background: #f8fafc;
      color: #64748b;
      border: 1px solid #e2e8f0;
      font-size: 10.5px;
      font-weight: 600;
      padding: 5px 8px;
    }

    .diff100x-btn-minimize:hover:not(:disabled) {
      background: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }

    .diff100x-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Flash snapshot overlay */
    /* Procedure / Configuration Modals */
    .diff100x-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(30, 27, 75, 0.65);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
      z-index: 1000001;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.22s ease-out;
      padding: 16px;
      box-sizing: border-box;
      user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .diff100x-modal-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }

    .diff100x-modal {
      background: #ffffff;
      color: #1e1b4b;
      border-radius: 14px;
      box-shadow: 0 25px 50px -12px rgba(109, 40, 217, 0.35);
      width: 100%;
      max-width: 620px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: scale(0.95) translateY(10px);
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid #c4b5fd;
    }

    .diff100x-modal-backdrop.open .diff100x-modal {
      transform: scale(1) translateY(0);
    }

    .diff100x-modal-header {
      padding: 14px 18px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .diff100x-modal-title {
      font-size: 15px;
      font-weight: 700;
      color: #1e1b4b;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .diff100x-modal-close-btn {
      background: none;
      border: none;
      color: #64748b;
      font-size: 16px;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .diff100x-modal-close-btn:hover {
      background: #ede9fe;
      color: #5b21b6;
    }

    .diff100x-modal-body {
      padding: 16px 18px;
      overflow-y: auto;
      font-size: 12.5px;
      line-height: 1.5;
      color: #334155;
    }

    .diff100x-modal-lead {
      margin-bottom: 12px;
      font-size: 12px;
      color: #64748b;
    }

    .diff100x-steps-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 14px;
    }

    .diff100x-step-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
    }

    .diff100x-step-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #7c3aed;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .diff100x-step-content {
      flex: 1;
      font-size: 12px;
    }

    .diff100x-step-title {
      font-weight: 700;
      color: #1e1b4b;
      margin-bottom: 2px;
    }

    .diff100x-calc-formula {
      background: #f5f3ff;
      border: 1px solid #ddd6fe;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 4px;
    }

    .diff100x-calc-formula-title {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6d28d9;
    }

    .diff100x-calc-formula-equation {
      font-size: 13.5px;
      font-weight: 700;
      color: #5b21b6;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .diff100x-shortcuts-grid {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
    }

    .diff100x-shortcuts-title {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #475569;
      margin-bottom: 6px;
    }

    .diff100x-shortcuts-table {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px 12px;
    }

    .diff100x-shortcut-cell {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11.5px;
    }

    .diff100x-modal-footer {
      padding: 12px 18px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .diff100x-startup-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: #64748b;
      cursor: pointer;
    }

    .diff100x-startup-toggle input {
      cursor: pointer;
      margin: 0;
    }

    .diff100x-modal-start-btn {
      padding: 7px 18px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      background: #7c3aed;
      color: #ffffff;
      border: 1px solid #6d28d9;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background-color 0.15s ease;
    }

    .diff100x-modal-start-btn:hover {
      background: #6d28d9;
    }

    /* Key Configuration Modal Specifics */
    .diff100x-preset-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 12px;
      background: #f5f3ff;
      border: 1px solid #ede9fe;
      border-radius: 8px;
      padding: 4px;
    }

    .diff100x-preset-btn {
      flex: 1;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      border: 1px solid transparent;
      background: transparent;
      color: #6d28d9;
      transition: all 0.15s ease;
      outline: none;
    }

    .diff100x-preset-btn:hover {
      background: #ede9fe;
    }

    .diff100x-preset-btn.active {
      background: #ffffff;
      color: #5b21b6;
      border-color: #c4b5fd;
      box-shadow: 0 2px 5px rgba(109, 40, 217, 0.08);
    }

    /* Keypad Layout View Switcher for Numpad */
    .diff100x-view-switcher {
      display: inline-flex;
      align-items: center;
      background: #e2e8f0;
      padding: 2px;
      border-radius: 6px;
      gap: 2px;
      margin-bottom: 12px;
    }

    .diff100x-view-switch-btn {
      border: none;
      background: transparent;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.12s;
    }

    .diff100x-view-switch-btn:hover {
      color: #1e293b;
    }

    .diff100x-view-switch-btn.active {
      background: #ffffff;
      color: #5b21b6;
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    /* Keypad / Keyboard Container - Light Mode */
    .diff100x-keypad-panel {
      background: #f1f5f9;
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04);
      border: 1px solid #cbd5e1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
    }

    .diff100x-keycap {
      background: #ffffff;
      color: #1e293b;
      border: 1px solid #cbd5e1;
      border-bottom: 3px solid #94a3b8;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 4px 3px;
      font-family: inherit;
      position: relative;
      user-select: none;
      transition: transform 0.08s, background-color 0.12s, border-color 0.12s;
      box-sizing: border-box;
      min-width: 0;
    }

    .diff100x-keycap.active-cell {
      background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%);
      border-color: #c4b5fd;
      border-bottom-color: #8b5cf6;
    }

    .diff100x-keycap.special-cell {
      background: linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%);
      border-color: #7dd3fc;
      border-bottom-color: #0284c7;
    }

    .diff100x-keycap.unused-key {
      opacity: 0.55;
      background: #e2e8f0;
      border-color: #cbd5e1;
      border-bottom-color: #94a3b8;
    }

    .diff100x-keycap-letter {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.1;
      color: #0f172a;
    }

    .diff100x-keycap.active-cell .diff100x-keycap-letter {
      color: #5b21b6;
    }

    .diff100x-keycap.special-cell .diff100x-keycap-letter {
      color: #0369a1;
    }

    .diff100x-keycap-acronym {
      font-size: 8.5px;
      font-weight: 800;
      color: #6d28d9;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      letter-spacing: -0.2px;
    }

    .diff100x-keycap.special-cell .diff100x-keycap-acronym {
      color: #0284c7;
    }

    /* Literal Numpad Grid */
    .diff100x-numpad-matrix {
      display: grid;
      grid-template-columns: repeat(4, 58px);
      grid-auto-rows: 52px;
      gap: 7px;
    }

    .diff100x-numpad-matrix .diff100x-keycap-tall {
      grid-row: span 2;
    }

    .diff100x-numpad-matrix .diff100x-keycap-wide {
      grid-column: span 2;
    }

    /* Top Row Layout Matrix */
    .diff100x-toprow-matrix {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      max-width: 560px;
    }

    .diff100x-toprow-line {
      display: flex;
      gap: 5px;
      justify-content: center;
      width: 100%;
    }

    .diff100x-toprow-matrix .diff100x-keycap {
      flex: 1;
      height: 52px;
    }

    /* QWERTY Keyboard Matrix with natural key offsets */
    .diff100x-qwerty-matrix {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
      max-width: 480px;
      padding: 4px 10px;
      box-sizing: border-box;
    }

    .diff100x-qwerty-line {
      display: flex;
      gap: 6px;
      width: 100%;
    }

    .diff100x-qwerty-line.row-1 {
      padding-left: 0px;
      justify-content: flex-start;
    }

    .diff100x-qwerty-line.row-2 {
      padding-left: 14px;
      justify-content: flex-start;
    }

    .diff100x-qwerty-line.row-3 {
      padding-left: 28px;
      justify-content: flex-start;
    }

    .diff100x-qwerty-matrix .diff100x-keycap {
      flex: 1;
      height: 52px;
      max-width: 68px;
    }

    /* Custom Rebind List */
    .diff100x-keyconfig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 12px;
      max-height: 280px;
      overflow-y: auto;
      padding: 4px;
    }

    .diff100x-keyconfig-row {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 5px 8px;
    }

    .diff100x-keyconfig-input {
      width: 42px;
      height: 24px;
      text-align: center;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      font-weight: 700;
      color: #6d28d9;
      background: #ffffff;
      border: 1.5px solid #c4b5fd;
      border-radius: 4px;
      cursor: pointer;
      outline: none;
      transition: all 0.15s;
      flex-shrink: 0;
    }

    .diff100x-keyconfig-input:focus {
      border-color: #7c3aed;
      background: #faf5ff;
      box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
    }

    .diff100x-keyconfig-input:disabled {
      background: #f1f5f9;
      color: #94a3b8;
      border-color: #cbd5e1;
      cursor: not-allowed;
    }

    .diff100x-keyconfig-name {
      font-weight: 700;
      font-size: 11px;
      color: #1e1b4b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Toast */
    .diff100x-toast {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.4px;
      padding: 10px 22px;
      border-radius: 28px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
      z-index: 1000001;
      opacity: 0;
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .diff100x-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(-8px);
    }

    /* Live Differential Pop-in Bubble Tray */
    .diff100x-bubble-tray {
      position: fixed;
      bottom: 36px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      z-index: 999990;
      pointer-events: none;
      transition: opacity 0.35s ease-out, transform 0.35s ease-out;
    }

    .diff100x-bubble-tray.fading-out {
      opacity: 0;
      transform: translateX(-50%) translateY(14px) scale(0.95);
    }

    .diff100x-live-bubble {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 14px 28px;
      border-radius: 999px;
      box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.4), 0 6px 14px -3px rgba(0, 0, 0, 0.25);
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-weight: 700;
      letter-spacing: 0.3px;
      border: 2.5px solid rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      animation: diff100xPopIn 0.26s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      transform-origin: center bottom;
      pointer-events: none;
    }

    .diff100x-live-bubble.pulse {
      animation: diff100xBubblePulse 0.22s ease-out forwards;
    }

    @keyframes diff100xBubblePulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.18); }
      100% { transform: scale(1); }
    }

    @keyframes diff100xPopIn {
      0% {
        opacity: 0;
        transform: scale(0.3) translateY(20px);
      }
      70% {
        transform: scale(1.08) translateY(-3px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .diff100x-bubble-acronym {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
    }

    .diff100x-bubble-num {
      font-size: 24px;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.25);
      border-radius: 999px;
      padding: 2px 14px;
      line-height: 1.3;
    }

    /* Large Review Mode Bubble Overlay & Flanking Navigation */
    .diff100x-review-bubble-container {
      position: fixed;
      bottom: 36px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999990;
      transition: opacity 0.35s ease-out, transform 0.35s ease-out;
      opacity: 0;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 16px;
      pointer-events: auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .diff100x-review-bubble-container.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    .diff100x-review-bubble-container.fading-out {
      opacity: 0;
      transform: translateX(-50%) translateY(16px) scale(0.95);
      pointer-events: none;
    }

    .diff100x-review-side-col {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .diff100x-review-side-col.left {
      justify-content: flex-end;
    }

    .diff100x-review-side-col.right {
      justify-content: flex-start;
    }

    .diff100x-review-arrow-btn {
      width: 78px;
      height: 78px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: #6d28d9;
      border: 2px solid #c4b5fd;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 12px 30px -4px rgba(109, 40, 217, 0.28), 0 6px 14px -3px rgba(0, 0, 0, 0.15);
      transition: all 0.15s ease;
      padding: 0;
      user-select: none;
      flex-shrink: 0;
    }

    .diff100x-review-arrow-btn:hover:not(:disabled) {
      background: #7c3aed;
      color: #ffffff;
      border-color: #7c3aed;
      transform: scale(1.06);
    }

    .diff100x-review-arrow-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      box-shadow: none;
    }

    .diff100x-review-return-btn {
      width: 78px;
      height: 78px;
      border-radius: 50%;
      background: #f59e0b;
      color: #ffffff;
      border: 2px solid #fde68a;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 12px 30px -4px rgba(245, 158, 11, 0.4), 0 6px 14px -3px rgba(0, 0, 0, 0.15);
      transition: all 0.15s ease;
      padding: 0;
      user-select: none;
      flex-shrink: 0;
    }

    .diff100x-review-return-btn:hover {
      background: #d97706;
      border-color: #f59e0b;
      transform: scale(1.06);
    }

    .diff100x-review-bubble {
      display: inline-flex;
      align-items: center;
      gap: 20px;
      padding: 16px 38px;
      border-radius: 999px;
      color: #ffffff;
      box-shadow: 0 16px 40px -6px rgba(0, 0, 0, 0.45), 0 8px 16px -4px rgba(0, 0, 0, 0.3);
      border: 3px solid rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      text-align: center;
      animation: diff100xReviewPopIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    @keyframes diff100xReviewPopIn {
      0% {
        opacity: 0;
        transform: scale(0.65) translateY(10px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .diff100x-review-bubble-title {
      font-size: 42px;
      font-weight: 800;
      letter-spacing: 0.8px;
      line-height: 1.1;
      text-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
      text-transform: uppercase;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .diff100x-review-bubble-sub {
      font-size: 21px;
      font-weight: 600;
      opacity: 0.96;
      background: rgba(0, 0, 0, 0.22);
      padding: 7px 22px;
      border-radius: 999px;
      letter-spacing: 0.3px;
      white-space: nowrap;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
  `;

  // Audio synthesizer
  let audioCtx = null;
  function playBeep(freq = 600, type = "sine", duration = 0.05, gainVal = 0.1) {
    try {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gainNode.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio not supported or blocked
    }
  }

  function soundSuccess() {
    playBeep(659, "sine", 0.05, 0.12);
  }

  function sound100Milestone() {
    playBeep(523.25, "triangle", 0.08, 0.15);
    setTimeout(() => playBeep(659.25, "triangle", 0.08, 0.15), 80);
    setTimeout(() => playBeep(783.99, "triangle", 0.08, 0.15), 160);
    setTimeout(() => playBeep(1046.50, "triangle", 0.18, 0.2), 240);
  }

  function soundError() {
    playBeep(220, "sawtooth", 0.12, 0.15);
  }

  function soundUndo() {
    playBeep(440, "sine", 0.06, 0.1);
  }

  // State
  const state = {
    minimized: true,
    mouseInWindow: true,
    cellCounts: {}, // id -> number
    cells: [], // [{ id, seqNumber, typeId, typeNumber, center: {x,y}, zoom, timestamp }]
    history: [], // stack of undo actions
    hiddenTypeIds: new Set(), // cell type IDs hidden in visited log
    isBottomLogExpanded: true,
    inspectingCellId: null,
    previousViewportBeforeInspect: null,
    isReviewMode: false,
    hasMilestoneChimed: false,
    activeBubblesFieldCenter: null // Viewport center when current live bubble tray was started
  };

  CELL_DEFS.forEach(def => {
    state.cellCounts[def.id] = 0;
  });

  // Cell Color Themes
  function getCellColorStyle(typeId) {
    switch (typeId) {
      // Pink to purple for myeloid / granulocyte / blast lineage
      case "seg":
        return {
          bg: "linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)",
          border: "#fda4af",
          text: "#ffffff"
        };
      case "band":
        return {
          bg: "linear-gradient(135deg, #e11d48 0%, #db2777 100%)",
          border: "#f472b6",
          text: "#ffffff"
        };
      case "meta":
        return {
          bg: "linear-gradient(135deg, #c026d3 0%, #a21caf 100%)",
          border: "#e879f9",
          text: "#ffffff"
        };
      case "myelo":
        return {
          bg: "linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)",
          border: "#c084fc",
          text: "#ffffff"
        };
      case "pro":
        return {
          bg: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
          border: "#a78bfa",
          text: "#ffffff"
        };
      case "blast":
        return {
          bg: "linear-gradient(135deg, #d946ef 0%, #c026d3 100%)",
          border: "#f0abfc",
          text: "#ffffff"
        };

      // Blue to dark blue for lymphoid lineage
      case "lymph":
        return {
          bg: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
          border: "#7dd3fc",
          text: "#ffffff"
        };
      case "vlymph":
        return {
          bg: "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)",
          border: "#60a5fa",
          text: "#ffffff"
        };

      // Blue-gray for Monocyte
      case "mono":
        return {
          bg: "linear-gradient(135deg, #64748b 0%, #334155 100%)",
          border: "#94a3b8",
          text: "#ffffff"
        };

      // Orange for Eosinophil
      case "eo":
        return {
          bg: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
          border: "#fdba74",
          text: "#ffffff"
        };

      // Dark purple for Basophil
      case "baso":
        return {
          bg: "linear-gradient(135deg, #4c1d95 0%, #3b0764 100%)",
          border: "#8b5cf6",
          text: "#ffffff"
        };

      // Dark gray for NRBC
      case "nrbc":
        return {
          bg: "linear-gradient(135deg, #475569 0%, #1e293b 100%)",
          border: "#64748b",
          text: "#ffffff"
        };

      // Light gray for Smudge cell
      case "smudge":
        return {
          bg: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
          border: "#cbd5e1",
          text: "#ffffff"
        };

      default:
        return {
          bg: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
          border: "#c4b5fd",
          text: "#ffffff"
        };
    }
  }

  // Live Bubble Tray Management
  let liveBubbleTrayEl = null;
  let liveBubbleFadeTimer = null;
  const currentFieldCellCounts = {}; // typeId -> count in current field

  function ensureBubbleTray() {
    if (!liveBubbleTrayEl || !liveBubbleTrayEl.parentElement) {
      liveBubbleTrayEl = document.createElement("div");
      liveBubbleTrayEl.className = "diff100x-bubble-tray";
      liveBubbleTrayEl.id = "diff100xBubbleTray";
      document.body.appendChild(liveBubbleTrayEl);
    }
    return liveBubbleTrayEl;
  }

  function addLiveCellBubble(cellRecord) {
    // Dismiss review bubble if active
    fadeoutReviewBubble(true);

    const tray = ensureBubbleTray();
    tray.classList.remove("fading-out");
    if (liveBubbleFadeTimer) {
      clearTimeout(liveBubbleFadeTimer);
      liveBubbleFadeTimer = null;
    }

    currentFieldCellCounts[cellRecord.typeId] = (currentFieldCellCounts[cellRecord.typeId] || 0) + 1;
    const fieldCount = currentFieldCellCounts[cellRecord.typeId];

    // Look for existing bubble of this cell type in the live tray
    let existingBubble = tray.querySelector(`.diff100x-live-bubble[data-type-id="${cellRecord.typeId}"]`);
    if (existingBubble) {
      const numEl = existingBubble.querySelector(".diff100x-bubble-num");
      if (numEl) numEl.textContent = `x ${fieldCount}`;
      existingBubble.classList.remove("pulse");
      void existingBubble.offsetWidth; // trigger reflow
      existingBubble.classList.add("pulse");
    } else {
      const colorStyle = getCellColorStyle(cellRecord.typeId);
      const bubble = document.createElement("div");
      bubble.className = "diff100x-live-bubble";
      bubble.style.background = colorStyle.bg;
      bubble.style.borderColor = colorStyle.border;
      bubble.style.color = colorStyle.text;
      bubble.setAttribute("data-type-id", cellRecord.typeId);

      bubble.innerHTML = `
        <span class="diff100x-bubble-acronym">${cellRecord.typeAcronym}</span>
        <span class="diff100x-bubble-num">x ${fieldCount}</span>
      `;

      tray.appendChild(bubble);
    }
    state.activeBubblesFieldCenter = { x: cellRecord.center.x, y: cellRecord.center.y };
  }

  function fadeoutLiveBubbles(instant = false) {
    if (!liveBubbleTrayEl) return;
    if (instant) {
      liveBubbleTrayEl.innerHTML = "";
      liveBubbleTrayEl.classList.remove("fading-out");
      state.activeBubblesFieldCenter = null;
      for (const k in currentFieldCellCounts) delete currentFieldCellCounts[k];
      return;
    }

    if (liveBubbleTrayEl.children.length === 0) return;
    if (liveBubbleTrayEl.classList.contains("fading-out")) return;

    liveBubbleTrayEl.classList.add("fading-out");
    if (liveBubbleFadeTimer) clearTimeout(liveBubbleFadeTimer);
    liveBubbleFadeTimer = setTimeout(() => {
      if (liveBubbleTrayEl) {
        liveBubbleTrayEl.innerHTML = "";
        liveBubbleTrayEl.classList.remove("fading-out");
      }
      state.activeBubblesFieldCenter = null;
      for (const k in currentFieldCellCounts) delete currentFieldCellCounts[k];
      liveBubbleFadeTimer = null;
    }, 360);
  }

  // Review Mode Bubble Overlay
  let reviewBubbleContainerEl = null;
  let reviewBubbleFadeTimer = null;

  function ensureReviewBubbleContainer() {
    if (!reviewBubbleContainerEl || !reviewBubbleContainerEl.parentElement) {
      reviewBubbleContainerEl = document.createElement("div");
      reviewBubbleContainerEl.className = "diff100x-review-bubble-container";
      reviewBubbleContainerEl.id = "diff100xReviewBubbleContainer";
      document.body.appendChild(reviewBubbleContainerEl);
    }
    return reviewBubbleContainerEl;
  }

  function showReviewCellBubble(cellRecord) {
    // Also fade out live bubbles
    fadeoutLiveBubbles(true);

    const container = ensureReviewBubbleContainer();
    if (reviewBubbleFadeTimer) {
      clearTimeout(reviewBubbleFadeTimer);
      reviewBubbleFadeTimer = null;
    }

    const colorStyle = getCellColorStyle(cellRecord.typeId);
    const def = CELL_DEFS.find(d => d.id === cellRecord.typeId) || { name: cellRecord.typeAcronym };

    const visibleCells = getVisibleCellsList();
    const currentIndex = visibleCells.findIndex(c => c.id === cellRecord.id);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex >= 0 && currentIndex < visibleCells.length - 1;
    const cellCountText = currentIndex >= 0 ? `${currentIndex + 1} of ${visibleCells.length}` : "";

    container.innerHTML = `
      <div class="diff100x-review-side-col left">
        <button class="diff100x-review-arrow-btn" id="diff100xReviewPrevBtn" title="Previous cell (Left / Up arrow)">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>
      <div class="diff100x-review-bubble" style="background: ${colorStyle.bg}; border-color: ${colorStyle.border}; color: ${colorStyle.text};">
        <div class="diff100x-review-bubble-title">${cellRecord.typeAcronym}</div>
        <div class="diff100x-review-bubble-sub">${def.name} • Cell #${cellRecord.seqNumber}</div>
      </div>
      <div class="diff100x-review-side-col right">
        <button class="diff100x-review-arrow-btn" id="diff100xReviewNextBtn" title="Next cell (Right / Down arrow)">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <button class="diff100x-review-return-btn" id="diff100xReviewReturnBtn" title="Return to Diff">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 14 4 9 9 4"></polyline>
            <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
          </svg>
        </button>
      </div>
    `;

    const prevBtn = document.getElementById("diff100xReviewPrevBtn");
    const nextBtn = document.getElementById("diff100xReviewNextBtn");
    const returnBtn = document.getElementById("diff100xReviewReturnBtn");
    if (prevBtn) {
      prevBtn.onclick = (e) => {
        e.stopPropagation();
        navigateInspectedCell(-1);
      };
    }
    if (nextBtn) {
      nextBtn.onclick = (e) => {
        e.stopPropagation();
        navigateInspectedCell(1);
      };
    }
    if (returnBtn) {
      returnBtn.onclick = (e) => {
        e.stopPropagation();
        returnToPreviousViewport();
      };
    }

    container.classList.remove("fading-out");
    void container.offsetWidth; // Force reflow
    container.classList.add("show");
  }

  function fadeoutReviewBubble(instant = false) {
    if (!reviewBubbleContainerEl) return;
    if (instant) {
      reviewBubbleContainerEl.classList.remove("show", "fading-out");
      reviewBubbleContainerEl.innerHTML = "";
      return;
    }

    if (!reviewBubbleContainerEl.classList.contains("show")) return;
    if (reviewBubbleContainerEl.classList.contains("fading-out")) return;

    reviewBubbleContainerEl.classList.add("fading-out");
    if (reviewBubbleFadeTimer) clearTimeout(reviewBubbleFadeTimer);
    reviewBubbleFadeTimer = setTimeout(() => {
      if (reviewBubbleContainerEl) {
        reviewBubbleContainerEl.classList.remove("show", "fading-out");
        reviewBubbleContainerEl.innerHTML = "";
      }
      reviewBubbleFadeTimer = null;
    }, 360);
  }

  let isWindowResizing = false;
  let windowResizeTimer = null;
  window.addEventListener("resize", () => {
    isWindowResizing = true;
    if (windowResizeTimer) clearTimeout(windowResizeTimer);
    windowResizeTimer = setTimeout(() => {
      isWindowResizing = false;
      windowResizeTimer = null;
    }, 250);
  });

  function attachViewerPanZoomListeners() {
    const v = getViewer();
    if (!v) return;

    if (!v.__diffBubbleListenersAttached) {
      v.__diffBubbleListenersAttached = true;

      const handleUserPanZoom = (event) => {
        // Ignore zoom/pan events caused by window resizing
        if (isWindowResizing) return;
        if (event && event.type === "resize") return;

        // Ignore pan/zoom events triggered during smooth pan/zoom animation
        if (currentGlideAnimId !== null) return;

        // In review mode / while inspecting cells, maintain visibility of review pill & controls
        if (state.inspectingCellId || state.isReviewMode) {
          fadeoutLiveBubbles();
          return;
        }

        // Fade out live bubble tray and review bubble on user pan/zoom during active counting
        fadeoutLiveBubbles();
        fadeoutReviewBubble();
      };

      if (typeof v.addHandler === "function") {
        v.addHandler("pan", handleUserPanZoom);
        v.addHandler("zoom", handleUserPanZoom);
        v.addHandler("canvas-drag", handleUserPanZoom);
        v.addHandler("canvas-scroll", handleUserPanZoom);
        v.addHandler("canvas-pinch", handleUserPanZoom);
      }
    }
  }

  function captureCurrentViewport() {
    const v = getViewer();
    if (v && v.viewport) {
      const center = v.viewport.getCenter();
      const zoom = v.viewport.getZoom();
      return {
        center: { x: center.x, y: center.y },
        zoom: zoom
      };
    }
    return { center: { x: 0.5, y: 0.5 }, zoom: 1 };
  }

  function getTotalWbcCount() {
    let sum = 0;
    CELL_DEFS.forEach(def => {
      if (def.isWbc) {
        sum += (state.cellCounts[def.id] || 0);
      }
    });
    return sum;
  }

  function recordCell(typeId, isDecrement = false) {
    const def = CELL_DEFS.find(d => d.id === typeId);
    if (!def) return;

    if (isDecrement) {
      if ((state.cellCounts[typeId] || 0) <= 0) {
        soundError();
        return;
      }

      // Find the most recent cell of this type to remove
      let removedCell = null;
      let removedIdx = -1;
      for (let i = state.cells.length - 1; i >= 0; i--) {
        if (state.cells[i].typeId === typeId) {
          removedCell = state.cells[i];
          removedIdx = i;
          break;
        }
      }

      if (removedIdx >= 0) {
        state.cells.splice(removedIdx, 1);
        state.cellCounts[typeId]--;
        state.history.push({
          type: "remove_cell",
          cell: removedCell,
          typeId: typeId
        });
        soundUndo();
        renderUI();
      }
      return;
    }

    // Adding cell (+1)
    const vp = captureCurrentViewport();
    const currentTypeCount = (state.cellCounts[typeId] || 0) + 1;
    state.cellCounts[typeId] = currentTypeCount;

    const cellRecord = {
      id: "c_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      seqNumber: state.cells.length + 1,
      typeId: typeId,
      typeAcronym: def.acronym,
      typeNumber: currentTypeCount,
      center: vp.center,
      zoom: vp.zoom,
      timestamp: Date.now()
    };

    state.cells.push(cellRecord);
    state.history.push({
      type: "add_cell",
      cell: cellRecord,
      typeId: typeId
    });

    // Spawn live pop-in bubble in bottom tray
    addLiveCellBubble(cellRecord);
    attachViewerPanZoomListeners();

    const totalWbc = getTotalWbcCount();
    if (totalWbc === 100 && !state.hasMilestoneChimed) {
      state.hasMilestoneChimed = true;
      sound100Milestone();
      showToast("🎉 100 WBC Target Reached! (Continuing count permitted)");
    } else {
      soundSuccess();
    }

    renderUI();
  }

  function undoLastAction() {
    if (state.history.length === 0) {
      soundError();
      return;
    }

    const last = state.history.pop();
    if (last.type === "add_cell") {
      const idx = state.cells.findIndex(c => c.id === last.cell.id);
      if (idx >= 0) state.cells.splice(idx, 1);
      state.cellCounts[last.typeId] = Math.max(0, (state.cellCounts[last.typeId] || 0) - 1);
      if (currentFieldCellCounts[last.typeId]) {
        currentFieldCellCounts[last.typeId] = Math.max(0, currentFieldCellCounts[last.typeId] - 1);
      }
      const remainingFieldCount = currentFieldCellCounts[last.typeId] || 0;
      if (liveBubbleTrayEl) {
        const existingBubble = liveBubbleTrayEl.querySelector(`.diff100x-live-bubble[data-type-id="${last.typeId}"]`);
        if (existingBubble) {
          if (remainingFieldCount <= 0) {
            existingBubble.remove();
          } else {
            const numEl = existingBubble.querySelector(".diff100x-bubble-num");
            if (numEl) numEl.textContent = `x ${remainingFieldCount}`;
            existingBubble.classList.remove("pulse");
            void existingBubble.offsetWidth;
            existingBubble.classList.add("pulse");
          }
        }
      }
      soundUndo();
    } else if (last.type === "remove_cell") {
      state.cells.push(last.cell);
      state.cellCounts[last.typeId] = (state.cellCounts[last.typeId] || 0) + 1;
      soundUndo();
    }

    renderUI();
  }

  function resetAll() {
    if (state.cells.length === 0) return;
    if (window.confirm("Reset all WBC differential counts?")) {
      CELL_DEFS.forEach(def => { state.cellCounts[def.id] = 0; });
      state.cells = [];
      state.history = [];
      state.inspectingCellId = null;
      state.previousViewportBeforeInspect = null;
      state.hasMilestoneChimed = false;
      fadeoutLiveBubbles(true);
      fadeoutReviewBubble(true);
      soundUndo();
      renderUI();
    }
  }

  function showToast(message, icon = "✓") {
    let toast = document.getElementById("diff100xToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "diff100x-toast";
      toast.id = "diff100xToast";
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3200);
  }

  let currentGlideAnimId = null;
  function smoothPanAndZoomTo(v, targetCenter, targetZoom, duration = 450) {
    if (currentGlideAnimId) {
      cancelAnimationFrame(currentGlideAnimId);
      currentGlideAnimId = null;
    }

    if (!v || !v.viewport || !window.OpenSeadragon || !window.OpenSeadragon.Point) {
      return;
    }

    const startCenter = v.viewport.getCenter();
    const startZoom = v.viewport.getZoom();
    const startX = startCenter.x;
    const startY = startCenter.y;
    const targetX = targetCenter.x;
    const targetY = targetCenter.y;
    const finalZoom = (typeof targetZoom === "number" && targetZoom > 0) ? targetZoom : startZoom;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dz = finalZoom - startZoom;

    if (Math.abs(dx) < 0.00001 && Math.abs(dy) < 0.00001 && Math.abs(dz) < 0.00001) {
      v.viewport.panTo(new window.OpenSeadragon.Point(targetX, targetY), true);
      v.viewport.zoomTo(finalZoom, null, true);
      v.viewport.applyConstraints();
      return;
    }

    const startTime = performance.now();
    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, Math.max(0, elapsed / duration));
      const ease = easeInOutCubic(progress);

      const currentX = startX + dx * ease;
      const currentY = startY + dy * ease;
      const currentZoom = startZoom + dz * ease;

      const pt = new window.OpenSeadragon.Point(currentX, currentY);
      v.viewport.panTo(pt, true);
      v.viewport.zoomTo(currentZoom, null, true);
      v.viewport.applyConstraints();

      if (progress < 1) {
        currentGlideAnimId = requestAnimationFrame(step);
      } else {
        currentGlideAnimId = null;
        v.viewport.panTo(new window.OpenSeadragon.Point(targetX, targetY), true);
        v.viewport.zoomTo(finalZoom, null, true);
        v.viewport.applyConstraints();
      }
    }

    currentGlideAnimId = requestAnimationFrame(step);
  }

  function getVisibleCellsList() {
    return state.cells
      .filter(c => !state.hiddenTypeIds.has(c.typeId))
      .slice()
      .reverse(); // Newest first
  }

  function inspectCell(cell) {
    if (!cell) return;
    if (!state.previousViewportBeforeInspect) {
      state.previousViewportBeforeInspect = captureCurrentViewport();
    }
    state.inspectingCellId = cell.id;

    attachViewerPanZoomListeners();

    const v = getViewer();
    if (v && v.viewport) {
      soundSuccess();
      smoothPanAndZoomTo(v, cell.center, cell.zoom, 450);
    }

    // Show large review bubble overlay for the inspected cell
    showReviewCellBubble(cell);

    renderUI();
  }

  function navigateInspectedCell(direction) {
    // direction: +1 for next (down / right), -1 for prev (up / left)
    const visibleCells = getVisibleCellsList();
    if (visibleCells.length === 0) return;

    let currentIndex = visibleCells.findIndex(c => c.id === state.inspectingCellId);
    if (currentIndex === -1) {
      inspectCell(visibleCells[0]);
      return;
    }

    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) {
      nextIndex = visibleCells.length - 1; // Wrap to last cell
    } else if (nextIndex >= visibleCells.length) {
      nextIndex = 0; // Wrap to first cell
    }

    inspectCell(visibleCells[nextIndex]);
  }

  function returnToPreviousViewport() {
    if (!state.previousViewportBeforeInspect) return;
    const vp = state.previousViewportBeforeInspect;
    state.previousViewportBeforeInspect = null;
    state.inspectingCellId = null;
    fadeoutReviewBubble(true);

    const v = getViewer();
    if (v && v.viewport) {
      soundSuccess();
      smoothPanAndZoomTo(v, vp.center, vp.zoom, 450);
    }
    renderUI();
  }

  function updateTrackingStatus(active) {
    state.mouseInWindow = active;
    const wrapper = document.getElementById("diff100xWrapper");
    if (state.isReviewMode) {
      if (wrapper) wrapper.classList.remove("inactive");
      return;
    }

    if (wrapper) {
      if (active) wrapper.classList.remove("inactive");
      else wrapper.classList.add("inactive");
    }

    const dot = document.getElementById("diff100xDot");
    const text = document.getElementById("diff100xStatusText");
    if (dot && text) {
      if (active) {
        dot.className = "diff100x-dot";
        text.textContent = "ACTIVE";
        text.style.color = "#7c3aed";
      } else {
        dot.className = "diff100x-dot inactive";
        text.textContent = "INACTIVE";
        text.style.color = "#94a3b8";
      }
    }
  }

  function getSharePayload() {
    if (state.cells.length === 0) return null;
    const compactData = state.cells.map(c => ({
      t: c.typeId,
      sn: c.seqNumber,
      tn: c.typeNumber,
      x: Math.round(c.center.x * 100000) / 100000,
      y: Math.round(c.center.y * 100000) / 100000,
      z: Math.round(c.zoom * 100000) / 100000
    }));

    const jsonStr = JSON.stringify(compactData);
    return btoa(encodeURIComponent(jsonStr));
  }

  function generateUnifiedShareUrl() {
    const url = new URL(window.location.href);

    // WBC Differential
    const diffStatus = getWbcStatus();
    if (diffStatus.isComplete || state.isReviewMode) {
      const wbcPayload = getSharePayload();
      if (wbcPayload) url.searchParams.set("diff_review", wbcPayload);
    }

    // RBC Morphology
    if (window.__RbcMorphology100X && typeof window.__RbcMorphology100X.getStatus === "function") {
      const rbcStatus = window.__RbcMorphology100X.getStatus();
      if (rbcStatus.isComplete && typeof window.__RbcMorphology100X.getSharePayload === "function") {
        const rbcPayload = window.__RbcMorphology100X.getSharePayload();
        if (rbcPayload) url.searchParams.set("rbc_review", rbcPayload);
      }
    }

    // Platelet Estimate
    if (window.__Counter100X && typeof window.__Counter100X.getStatus === "function") {
      const pltStatus = window.__Counter100X.getStatus();
      if (pltStatus.isComplete && typeof window.__Counter100X.getSharePayload === "function") {
        const pltPayload = window.__Counter100X.getSharePayload();
        if (pltPayload) url.searchParams.set("plt_review", pltPayload);
      }
    }

    return url.toString();
  }

  window.__generateUnifiedLabShareUrl = generateUnifiedShareUrl;

  function generateShareUrl() {
    const unified = generateUnifiedShareUrl();
    if (unified) return unified;

    const encoded = getSharePayload();
    if (!encoded) return null;
    const url = new URL(window.location.href);
    url.searchParams.set("diff_review", encoded);
    return url.toString();
  }

  function copyShareLink() {
    if (state.cells.length === 0 && !state.isReviewMode) {
      soundError();
      showToast("Classify a cell before sharing.", "ℹ");
      return;
    }

    const totalWbc = getTotalWbcCount();
    if (!state.isReviewMode && totalWbc < 100) {
      soundError();
      showToast("First complete 100 WBC before sharing.", "ℹ");
      return;
    }

    const shareUrl = generateShareUrl();
    if (!shareUrl) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        soundSuccess();
        showToast("Review link copied to clipboard!");
      }).catch(() => {
        window.prompt("Copy this review link:", shareUrl);
      });
    } else {
      window.prompt("Copy this review link:", shareUrl);
    }
  }

  function loadReviewFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const reviewParam = params.get("diff_review");
    if (!reviewParam) return false;

    try {
      const decodedJson = decodeURIComponent(atob(reviewParam));
      const rawCells = JSON.parse(decodedJson);
      if (Array.isArray(rawCells) && rawCells.length > 0) {
        CELL_DEFS.forEach(d => { state.cellCounts[d.id] = 0; });
        state.cells = rawCells.map((c, i) => {
          const def = CELL_DEFS.find(d => d.id === c.t) || { acronym: c.t.toUpperCase() };
          state.cellCounts[c.t] = (state.cellCounts[c.t] || 0) + 1;
          return {
            id: "c_rev_" + (i + 1),
            seqNumber: c.sn || (i + 1),
            typeId: c.t,
            typeAcronym: def.acronym,
            typeNumber: c.tn || state.cellCounts[c.t],
            center: { x: c.x !== undefined ? c.x : 0.5, y: c.y !== undefined ? c.y : 0.5 },
            zoom: c.z !== undefined ? c.z : 1,
            timestamp: Date.now()
          };
        });

        state.isReviewMode = true;
        return true;
      }
    } catch (e) {
      console.error("Failed to load differential review state:", e);
    }
    return false;
  }

  function toggleAllCellTypeFilters() {
    if (state.hiddenTypeIds.size > 0) {
      // If any hidden, show all
      state.hiddenTypeIds.clear();
    } else {
      // Hide all
      CELL_DEFS.forEach(def => state.hiddenTypeIds.add(def.id));
    }
    renderUI();
  }

  function renderUI() {
    const totalWbc = getTotalWbcCount();
    const totalAllCells = state.cells.length;
    const pctProgress = Math.min(100, Math.round((totalWbc / 100) * 100));

    // Update Progress header with right-justified active count
    const progressFill = document.getElementById("diff100xProgressFill");
    const progressVal = document.getElementById("diff100xProgressVal");
    if (progressFill && progressVal) {
      progressFill.style.width = `${pctProgress}%`;
      if (totalWbc >= 100) {
        progressFill.classList.add("complete");
        progressVal.innerHTML = `<span style="color: #059669">${totalWbc}</span> / 100`;
      } else {
        progressFill.classList.remove("complete");
        progressVal.innerHTML = `<span>${totalWbc}</span> / 100`;
      }
    }

    // Return to previous view banner
    const returnBannerContainer = document.getElementById("diff100xReturnBannerContainer");
    if (returnBannerContainer) {
      if (state.previousViewportBeforeInspect) {
        const inspectedCell = state.cells.find(c => c.id === state.inspectingCellId);
        const cellLabel = inspectedCell ? `${inspectedCell.typeAcronym} #${inspectedCell.typeNumber}` : "Cell";
        returnBannerContainer.innerHTML = `
          <div class="diff100x-return-banner">
            <span>Viewing <b>${cellLabel}</b></span>
            <button class="diff100x-return-btn" id="diff100xReturnBtn">
              <span>↩</span> Return to Diff
            </button>
          </div>
        `;
        const returnBtn = document.getElementById("diff100xReturnBtn");
        if (returnBtn) returnBtn.onclick = returnToPreviousViewport;
      } else {
        returnBannerContainer.innerHTML = "";
      }
    }

    // Header Bulk Eye Toggle Icon in Type table
    const allFiltered = CELL_DEFS.length > 0 && state.hiddenTypeIds.size === CELL_DEFS.length;
    const anyFiltered = state.hiddenTypeIds.size > 0;
    const headerEyeEl = document.getElementById("diff100xHeaderEyeBtn");
    if (headerEyeEl) {
      headerEyeEl.className = `diff100x-filter-btn ${anyFiltered ? "filtered" : ""}`;
      headerEyeEl.title = anyFiltered ? "Unhide all cell types in log" : "Hide all cell types from log";
      headerEyeEl.innerHTML = anyFiltered ? `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      ` : `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
    }

    // Render Cell Table Rows
    const tableBodyEl = document.getElementById("diff100xTableBody");
    if (tableBodyEl) {
      let rowsHtml = "";
      const activeTypeId = state.inspectingCellId
        ? (state.cells.find(c => c.id === state.inspectingCellId)?.typeId || null)
        : (state.cells.length > 0 ? state.cells[state.cells.length - 1].typeId : null);

      CELL_DEFS.forEach((def) => {
        if (def.dividerBefore) {
          rowsHtml += `<div class="diff100x-divider" title="Non-WBC Counts (Excluded from 100-WBC Denominator)"></div>`;
        }

        const count = state.cellCounts[def.id] || 0;
        const isCounted = count > 0;
        let pctStr = "0.0";
        if (def.isWbc) {
          pctStr = totalWbc > 0 ? ((count / totalWbc) * 100).toFixed(1) : "0.0";
        } else {
          pctStr = totalWbc > 0 ? `/ ${totalWbc} WBC` : `/ 0 WBC`;
        }

        const isFiltered = state.hiddenTypeIds.has(def.id);
        const isActive = def.id === activeTypeId;

        const eyeIcon = isFiltered ? `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        ` : `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `;

        rowsHtml += `
          <div class="diff100x-row-group">
            <div class="diff100x-row ${isActive ? "active" : ""}" data-type-id="${def.id}">
              <div class="diff100x-cell-name">
                <span class="diff100x-key-badge">${def.key.toUpperCase()}</span>
                <span class="diff100x-acronym">${def.acronym}</span>
              </div>
              <div class="diff100x-cell-num ${isCounted ? "diff100x-val-counted" : "diff100x-val-grayed"}">${count}</div>
              <div class="diff100x-cell-pct ${isCounted ? "diff100x-val-counted" : "diff100x-val-grayed"}">${pctStr}</div>
              <button class="diff100x-filter-btn ${isFiltered ? "filtered" : ""}" data-filter-id="${def.id}" title="${isFiltered ? "Show in visited log" : "Hide from visited log"}">
                ${eyeIcon}
              </button>
            </div>
          </div>
        `;
      });

      tableBodyEl.innerHTML = rowsHtml;

      // Event listeners for filter eye buttons and row selection
      tableBodyEl.querySelectorAll(".diff100x-filter-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const typeId = btn.getAttribute("data-filter-id");
          if (state.hiddenTypeIds.has(typeId)) {
            state.hiddenTypeIds.delete(typeId);
          } else {
            state.hiddenTypeIds.add(typeId);
          }
          renderUI();
        });
      });

      tableBodyEl.querySelectorAll(".diff100x-row").forEach(rowEl => {
        rowEl.addEventListener("click", (e) => {
          if (e.target.closest(".diff100x-filter-btn")) return;
          const typeId = rowEl.getAttribute("data-type-id");
          const targetCell = state.cells.slice().reverse().find(c => c.typeId === typeId);
          if (targetCell) {
            inspectCell(targetCell);
          }
        });
      });
    }

    // Update Header Status Indicator (Perform / In Progress / Complete)
    const statusIndicatorEl = document.getElementById("diff100xStatusIndicator");
    if (statusIndicatorEl) {
      if (totalWbc >= 100) {
        statusIndicatorEl.className = "diff100x-collapse-indicator complete";
        statusIndicatorEl.innerHTML = `<span class="diff100x-collapse-indicator-dot"></span><span>COMPLETE</span>`;
        statusIndicatorEl.title = "Task complete (100+ WBC logged). Click to expand/collapse.";
      } else if (totalAllCells > 0) {
        statusIndicatorEl.className = "diff100x-collapse-indicator in-progress";
        statusIndicatorEl.innerHTML = `<span class="diff100x-collapse-indicator-dot"></span><span>IN PROGRESS</span>`;
        statusIndicatorEl.title = `In progress (${totalWbc}/100 WBC). Click to expand/collapse.`;
      } else {
        statusIndicatorEl.className = "diff100x-collapse-indicator perform";
        statusIndicatorEl.innerHTML = `<span>PERFORM</span>`;
        statusIndicatorEl.title = "Click to perform WBC Differential";
      }
    }

    // Bottom Visited Log overview (descending order)
    const fullLogToggleEl = document.getElementById("diff100xFullLogToggle");
    const fullLogListEl = document.getElementById("diff100xFullLogList");
    if (fullLogToggleEl && fullLogListEl) {
      const hasActiveFilter = state.hiddenTypeIds.size > 0;
      const visibleCells = getVisibleCellsList();

      fullLogToggleEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 5px;">
          <span>Visited Cells Log (${visibleCells.length}${hasActiveFilter ? ` / ${totalAllCells}` : ""})</span>
          ${hasActiveFilter ? `<span class="diff100x-filter-badge">Filtered</span>` : ""}
        </div>
        <svg class="diff100x-toggle-btn-svg" style="width: 10px; height: 10px; transition: transform 0.15s; transform: ${state.isBottomLogExpanded ? "rotate(90deg)" : "none"}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
      `;

      if (state.isBottomLogExpanded) {
        fullLogListEl.style.display = "flex";
        if (visibleCells.length === 0) {
          fullLogListEl.innerHTML = `<div style="font-size: 10px; color: #94a3b8; font-style: italic; text-align: center; padding: 8px;">${hasActiveFilter ? "All cells hidden by filter." : "No cells logged yet."}</div>`;
        } else {
          const activeLogCellId = state.inspectingCellId || (state.cells.length > 0 ? state.cells[state.cells.length - 1].id : null);
          fullLogListEl.innerHTML = visibleCells.map(c => `
            <div class="diff100x-sublog-item ${activeLogCellId === c.id ? "active" : ""}" data-cell-id="${c.id}">
              <span><b>${c.typeAcronym} #${c.typeNumber}</b> (Cell #${c.seqNumber})</span>
              <span class="diff100x-sublog-tag">view</span>
            </div>
          `).join("");

          fullLogListEl.querySelectorAll(".diff100x-sublog-item").forEach(cellEl => {
            cellEl.addEventListener("click", (e) => {
              e.stopPropagation();
              const cellId = cellEl.getAttribute("data-cell-id");
              const targetCell = state.cells.find(c => c.id === cellId);
              if (targetCell) inspectCell(targetCell);
            });
          });
        }
      } else {
        fullLogListEl.style.display = "none";
      }
    }

    // Sync Share button enabled/disabled state
    const shareBtn = document.getElementById("diff100xShareBtn");
    if (shareBtn) {
      const isShareDisabled = !state.isReviewMode && state.cells.length === 0;
      shareBtn.disabled = isShareDisabled;
      if (isShareDisabled) {
        shareBtn.setAttribute("title", "Classify a cell to enable sharing");
      } else {
        shareBtn.setAttribute("title", "Share Review Link");
      }
    }
  }

  function showProcedureModal() {
    const backdrop = document.getElementById("diff100xModalBackdrop");
    if (!backdrop) return;
    const chk = document.getElementById("diff100xDontShowAgain");
    if (chk) {
      chk.checked = localStorage.getItem("diff100x_hide_procedure") === "1";
    }
    backdrop.classList.add("open");
  }

  function closeProcedureModal() {
    const backdrop = document.getElementById("diff100xModalBackdrop");
    if (!backdrop) return;
    const chk = document.getElementById("diff100xDontShowAgain");
    if (chk) {
      if (chk.checked) {
        try { localStorage.setItem("diff100x_hide_procedure", "1"); } catch (e) {}
      } else {
        try { localStorage.removeItem("diff100x_hide_procedure"); } catch (e) {}
      }
    }
    backdrop.classList.remove("open");
  }

  let numpadViewMode = "numpad"; // 'numpad' (grid) or 'toprow' (horizontal 1-0)
  try {
    const savedNumpadView = localStorage.getItem("diff100x_numpad_view");
    if (savedNumpadView === "toprow" || savedNumpadView === "numpad") {
      numpadViewMode = savedNumpadView;
    }
  } catch (e) {}

  function showKeyConfigModal() {
    const backdrop = document.getElementById("diff100xKeyConfigBackdrop");
    if (!backdrop) return;
    renderKeyConfigInputs();
    backdrop.classList.add("open");
  }

  function closeKeyConfigModal() {
    const backdrop = document.getElementById("diff100xKeyConfigBackdrop");
    if (backdrop) backdrop.classList.remove("open");
  }

  function setPreset(presetName) {
    currentKeyPreset = presetName;
    try {
      localStorage.setItem("diff100x_preset", presetName);
    } catch (e) {}

    if (presetName === "numpad") {
      CELL_DEFS = NUMPAD_CELL_DEFS.map(d => ({ ...d }));
    } else if (presetName === "qwerty") {
      CELL_DEFS = QWERTY_CELL_DEFS.map(d => ({ ...d }));
    } else if (presetName === "user") {
      CELL_DEFS = loadCellDefs();
    }
    renderKeyConfigInputs();
    renderUI();
  }

  function setNumpadView(mode) {
    numpadViewMode = mode;
    try {
      localStorage.setItem("diff100x_numpad_view", mode);
    } catch (e) {}
    renderKeyConfigInputs();
  }

  function renderKeyConfigInputs() {
    const container = document.getElementById("diff100xKeyConfigContent");
    if (!container) return;

    // Update preset buttons active status
    const npBtn = document.getElementById("diff100xPresetNumpad");
    const qwBtn = document.getElementById("diff100xPresetQwerty");
    const usBtn = document.getElementById("diff100xPresetUser");
    if (npBtn) npBtn.className = `diff100x-preset-btn ${currentKeyPreset === "numpad" ? "active" : ""}`;
    if (qwBtn) qwBtn.className = `diff100x-preset-btn ${currentKeyPreset === "qwerty" ? "active" : ""}`;
    if (usBtn) usBtn.className = `diff100x-preset-btn ${currentKeyPreset === "user" ? "active" : ""}`;

    const keyMap = {};
    CELL_DEFS.forEach(d => {
      const k = (d.key || "").toLowerCase();
      keyMap[k] = d;
      if (d.altKey) keyMap[d.altKey.toLowerCase()] = d;
    });

    if (currentKeyPreset === "numpad") {
      let layoutHtml = "";
      if (numpadViewMode === "numpad") {
        // Realistic 4-column Numpad matrix
        // Row 1: NumLock (unused), / (SMUDGE), * (unused), - (unused)
        // Row 2: 7 (META), 8 (MYELO), 9 (PRO), + (BLAST tall)
        // Row 3: 4 (BAND), 5 (EO), 6 (BASO)
        // Row 4: 1 (SEG), 2 (LYMPH), 3 (MONO), Enter (tall)
        // Row 5: 0 (VLYMPH wide), . (NRBC)
        const cellSmudge = keyMap["/"];
        const cell7 = keyMap["7"];
        const cell8 = keyMap["8"];
        const cell9 = keyMap["9"];
        const cellBlast = keyMap["+"] || keyMap["="];
        const cell4 = keyMap["4"];
        const cell5 = keyMap["5"];
        const cell6 = keyMap["6"];
        const cell1 = keyMap["1"];
        const cell2 = keyMap["2"];
        const cell3 = keyMap["3"];
        const cell0 = keyMap["0"];
        const cellDot = keyMap["."];

        layoutHtml = `
          <div class="diff100x-numpad-matrix">
            <div class="diff100x-keycap unused-key"><span class="diff100x-keycap-letter" style="font-size: 9px;">Num</span></div>
            <div class="diff100x-keycap ${cellSmudge ? "special-cell" : "unused-key"}">
              <span class="diff100x-keycap-letter">/</span>
              <span class="diff100x-keycap-acronym">${cellSmudge ? cellSmudge.acronym : ""}</span>
            </div>
            <div class="diff100x-keycap unused-key"><span class="diff100x-keycap-letter">*</span></div>
            <div class="diff100x-keycap unused-key"><span class="diff100x-keycap-letter">-</span></div>

            <div class="diff100x-keycap ${cell7 ? "active-cell" : "unused-key"}">
              <span class="diff100x-keycap-letter">7</span>
              <span class="diff100x-keycap-acronym">${cell7 ? cell7.acronym : ""}</span>
            </div>
            <div class="diff100x-keycap ${cell8 ? "active-cell" : "unused-key"}">
              <span class="diff100x-keycap-letter">8</span>
              <span class="diff100x-keycap-acronym">${cell8 ? cell8.acronym : ""}</span>
            </div>
            <div class="diff100x-keycap ${cell9 ? "active-cell" : "unused-key"}">
              <span class="diff100x-keycap-letter">9</span>
              <span class="diff100x-keycap-acronym">${cell9 ? cell9.acronym : ""}</span>
            </div>
            <div class="diff100x-keycap diff100x-keycap-tall ${cellBlast ? "active-cell" : "unused-key"}" style="justify-content: center; gap: 4px;">
              <span class="diff100x-keycap-letter" style="font-size: 15px;">+</span>
              <span class="diff100x-keycap-acronym">${cellBlast ? cellBlast.acronym : ""}</span>
            </div>

            <div class="diff100x-keycap ${cell4 ? "active-cell" : "unused-key"}">
              <span class="diff100x-keycap-letter">4</span>
              <span class="diff100x-keycap-acronym">${cell4 ? cell4.acronym : ""}</span>
            </div>
            <div class="diff100x-keycap ${cell5 ? "active-cell" : "unused-key"}">
              <span class="diff100x-keycap-letter">5</span>
              <span class="diff100x-keycap-acronym">${cell5 ? cell5.acronym : ""}</span>
            </div>
            <div class="diff100x-keycap ${cell6 ? "active-cell" : "unused-key"}">
              <span class="diff100x-keycap-letter">6</span>
              <span class="diff100x-keycap-acronym">${cell6 ? cell6.acronym : ""}</span>
            </div>

            <div class="diff100x-keycap ${cell1 ? "active-cell" : "unused-key"}">
              <span class="diff100x-keycap-letter">1</span>
              <span class="diff100x-keycap-acronym">${cell1 ? cell1.acronym : ""}</span>
            </div>
            <div class="diff100x-keycap ${cell2 ? "active-cell" : "unused-key"}">
              <span class="diff100x-keycap-letter">2</span>
              <span class="diff100x-keycap-acronym">${cell2 ? cell2.acronym : ""}</span>
            </div>
            <div class="diff100x-keycap ${cell3 ? "active-cell" : "unused-key"}">
              <span class="diff100x-keycap-letter">3</span>
              <span class="diff100x-keycap-acronym">${cell3 ? cell3.acronym : ""}</span>
            </div>
            <div class="diff100x-keycap diff100x-keycap-tall unused-key" style="justify-content: center;">
              <span class="diff100x-keycap-letter" style="font-size: 9px;">Enter</span>
            </div>

            <div class="diff100x-keycap diff100x-keycap-wide ${cell0 ? "active-cell" : "unused-key"}">
              <span class="diff100x-keycap-letter">0</span>
              <span class="diff100x-keycap-acronym">${cell0 ? cell0.acronym : ""}</span>
            </div>
            <div class="diff100x-keycap ${cellDot ? "special-cell" : "unused-key"}">
              <span class="diff100x-keycap-letter">.</span>
              <span class="diff100x-keycap-acronym">${cellDot ? cellDot.acronym : ""}</span>
            </div>
          </div>
        `;
      } else {
        // Top Row View: [1] through [0], [= / +], [.], [/] in left-to-right top-down orientation
        const row1Keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
        const row2Keys = [
          { k: "+", label: "+ / =", alt: "=" },
          { k: ".", label: "." },
          { k: "/", label: "/", alt: "?" }
        ];

        layoutHtml = `
          <div class="diff100x-toprow-matrix">
            <div class="diff100x-toprow-line">
              ${row1Keys.map(k => {
                const def = keyMap[k];
                return `
                  <div class="diff100x-keycap ${def ? "active-cell" : "unused-key"}">
                    <span class="diff100x-keycap-letter">${k}</span>
                    <span class="diff100x-keycap-acronym">${def ? def.acronym : ""}</span>
                  </div>
                `;
              }).join("")}
            </div>
            <div class="diff100x-toprow-line" style="max-width: 320px; align-self: center;">
              ${row2Keys.map(item => {
                const def = keyMap[item.k] || (item.alt ? keyMap[item.alt] : null);
                const isSpecial = def && !def.isWbc;
                return `
                  <div class="diff100x-keycap ${def ? (isSpecial ? "special-cell" : "active-cell") : "unused-key"}">
                    <span class="diff100x-keycap-letter">${item.label}</span>
                    <span class="diff100x-keycap-acronym">${def ? def.acronym : ""}</span>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        `;
      }

      container.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 10px;">
          <div class="diff100x-view-switcher">
            <button class="diff100x-view-switch-btn ${numpadViewMode === "numpad" ? "active" : ""}" id="diff100xViewNumPad">
              ⊞ NumPad
            </button>
            <button class="diff100x-view-switch-btn ${numpadViewMode === "toprow" ? "active" : ""}" id="diff100xViewTopRow">
              ⌨ Top Row
            </button>
          </div>
        </div>
        <div class="diff100x-keypad-panel">
          ${layoutHtml}
        </div>
        <div style="font-size: 10.5px; color: #64748b; text-align: center; margin-top: 4px;">
          Standard numeric keypad mapping: <b>1-0</b> for standard WBCs, <b>+</b> for Blast, <b>.</b> for nRBC, <b>/</b> for Smudge.
        </div>
      `;

      const viewNpBtn = document.getElementById("diff100xViewNumPad");
      const viewTrBtn = document.getElementById("diff100xViewTopRow");
      if (viewNpBtn) viewNpBtn.onclick = () => setNumpadView("numpad");
      if (viewTrBtn) viewTrBtn.onclick = () => setNumpadView("toprow");

    } else if (currentKeyPreset === "qwerty") {
      // Clean 3-row layout: Q-Y, A-H, Z-N showing active cell keys
      const row1 = ["q", "w", "e", "r", "t", "y"];
      const row2 = ["a", "s", "d", "f", "g", "h"];
      const row3 = ["z", "x", "c", "v", "b", "n"];

      const renderKeyRow = (keys) => keys.map(k => {
        const def = keyMap[k.toLowerCase()];
        const isSpecial = def && !def.isWbc;
        return `
          <div class="diff100x-keycap ${def ? (isSpecial ? "special-cell" : "active-cell") : "unused-key"}">
            <span class="diff100x-keycap-letter">${k.toUpperCase()}</span>
            <span class="diff100x-keycap-acronym">${def ? def.acronym : ""}</span>
          </div>
        `;
      }).join("");

      container.innerHTML = `
        <div style="margin-bottom: 8px; font-size: 11px; color: #64748b; font-weight: 500; text-align: center;">
          Standard QWERTY Keyboard Map (Keys positioned for rapid touch-typing):
        </div>
        <div class="diff100x-keypad-panel">
          <div class="diff100x-qwerty-matrix">
            <div class="diff100x-qwerty-line row-1">
              ${renderKeyRow(row1)}
            </div>
            <div class="diff100x-qwerty-line row-2">
              ${renderKeyRow(row2)}
            </div>
            <div class="diff100x-qwerty-line row-3">
              ${renderKeyRow(row3)}
            </div>
          </div>
        </div>
        <div style="font-size: 10.5px; color: #64748b; text-align: center; margin-top: 4px;">
          QWERTY Home Row layout centered on <b>F</b> (SEG), <b>G</b> (BAND), <b>D</b> (LYMPH), <b>S</b> (MONO), <b>T</b> (EO), <b>R</b> (BASO).
        </div>
      `;

    } else if (currentKeyPreset === "user") {
      // User custom keybinding grid
      container.innerHTML = `
        <div style="margin-bottom: 8px; font-size: 11.5px; color: #64748b;">
          Click any input box below and press a key to rebind that cell type:
        </div>
        <div class="diff100x-keyconfig-grid">
          ${CELL_DEFS.map(def => `
            <div class="diff100x-keyconfig-row">
              <input class="diff100x-keyconfig-input" data-type-id="${def.id}" value="${def.key.toUpperCase()}" maxlength="1" readonly title="Click and press a key to rebind" />
              <span class="diff100x-keyconfig-name" title="${def.name || def.acronym}"><b>${def.acronym}</b> <span style="font-weight: 500; color: #64748b; font-size: 10px;">(${def.name || def.acronym})</span></span>
            </div>
          `).join("")}
        </div>
      `;

      container.querySelectorAll(".diff100x-keyconfig-input").forEach(input => {
        input.addEventListener("keydown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const key = e.key;
          if (key === "Escape" || key === "Tab") return;

          input.value = key.toUpperCase();
          input.setAttribute("data-new-key", key);
          input.setAttribute("data-new-code", e.code || "");
        });
      });
    }
  }

  function saveKeyConfig() {
    const container = document.getElementById("diff100xKeyConfigContent");
    if (!container) return;

    if (currentKeyPreset === "user") {
      const customMap = {};
      container.querySelectorAll(".diff100x-keyconfig-input").forEach(input => {
        const typeId = input.getAttribute("data-type-id");
        const keyVal = input.getAttribute("data-new-key") || input.value.toLowerCase() || "";
        const codeVal = input.getAttribute("data-new-code") || "";
        if (typeId && keyVal) {
          customMap[typeId] = {
            key: keyVal,
            code: codeVal
          };
        }
      });

      try {
        localStorage.setItem("diff100x_custom_keys", JSON.stringify(customMap));
        localStorage.setItem("diff100x_preset", "user");
      } catch (e) {
        console.warn("Could not save custom keys to localStorage:", e);
      }
    }

    CELL_DEFS = loadCellDefs();
    closeKeyConfigModal();
    showToast("Keys configuration applied!");
    renderUI();
  }

  function createModals() {
    // Procedure Modal - Styled identically to platelet counter
    const procModalHtml = `
      <div class="diff100x-modal" role="dialog" aria-modal="true" aria-labelledby="diff100xModalTitle">
        <div class="diff100x-modal-header">
          <div class="diff100x-modal-title" id="diff100xModalTitle">
            <span>Procedure: WBC 100-Cell Differential</span>
          </div>
          <button class="diff100x-modal-close-btn" id="diff100xModalCloseBtn" title="Close">✕</button>
        </div>
        <div class="diff100x-modal-body">
          <div class="diff100x-modal-lead">
            Follow standard laboratory hematology guidelines at <b>100X oil immersion</b> to perform a manual differential count:
          </div>

          <div class="diff100x-steps-list">
            <div class="diff100x-step-item">
              <div class="diff100x-step-num">1</div>
              <div class="diff100x-step-content">
                <div class="diff100x-step-title">Locate the Ideal Monolayer Zone</div>
                <div>Scan in the feathered edge/monolayer where red blood cells are evenly distributed with minimal overlap.</div>
              </div>
            </div>

            <div class="diff100x-step-item">
              <div class="diff100x-step-num">2</div>
              <div class="diff100x-step-content">
                <div class="diff100x-step-title">Perform a Battlement Track Scan</div>
                <div>Move systematically across consecutive fields in a back-and-forth serpentine (battlement) track to avoid recount.</div>
              </div>
            </div>

            <div class="diff100x-step-item">
              <div class="diff100x-step-num">3</div>
              <div class="diff100x-step-content">
                <div class="diff100x-step-title">Classify 100 White Blood Cells</div>
                <div>Press the corresponding key for each identified WBC type. A chime rings at 100 cells, while permitting continued counting.</div>
              </div>
            </div>

            <div class="diff100x-step-item">
              <div class="diff100x-step-num">4</div>
              <div class="diff100x-step-content">
                <div class="diff100x-step-title">Nucleated RBCs & Smudge Cells</div>
                <div>nRBCs and Smudge cells are tracked independently and reported per 100 WBCs (not included in the 100 WBC denominator).</div>
              </div>
            </div>

            <div class="diff100x-step-item">
              <div class="diff100x-step-num">5</div>
              <div class="diff100x-step-content">
                <div class="diff100x-step-title">Inspect Visited Cells & Toggle Filter</div>
                <div>Click any logged cell or use arrow keys / overlay buttons to inspect coordinates. Use the eye icons to filter cell types.</div>
              </div>
            </div>
          </div>

          <div class="diff100x-calc-formula">
            <span class="diff100x-calc-formula-title">Differential Percentage Formula</span>
            <span class="diff100x-calc-formula-equation">% Cell Type = (Count of Specific WBC Type / Total WBCs) × 100</span>
          </div>

          <div class="diff100x-shortcuts-grid">
            <div class="diff100x-shortcuts-title">Key Controls:</div>
            <div class="diff100x-shortcuts-table">
              <div class="diff100x-shortcut-cell">
                <span>Subtract Cell:</span>
                <span class="diff100x-key-badge">Shift + Key</span>
              </div>
              <div class="diff100x-shortcut-cell">
                <span>Undo Last:</span>
                <span class="diff100x-key-badge">Z / Backspace</span>
              </div>
              <div class="diff100x-shortcut-cell">
                <span>Reset All:</span>
                <span class="diff100x-key-badge">R</span>
              </div>
              <div class="diff100x-shortcut-cell">
                <span>Configure Keys:</span>
                <span class="diff100x-key-badge">Keys Button</span>
              </div>
            </div>
          </div>
        </div>
        <div class="diff100x-modal-footer">
          <label class="diff100x-startup-toggle">
            <input type="checkbox" id="diff100xDontShowAgain">
            <span>Don't show on startup</span>
          </label>
          <button class="diff100x-modal-start-btn" id="diff100xModalStartBtn">
            <span>Start Counting</span>
            <span>→</span>
          </button>
        </div>
      </div>
    `;

    const procBackdrop = document.createElement("div");
    procBackdrop.className = "diff100x-modal-backdrop";
    procBackdrop.id = "diff100xModalBackdrop";
    procBackdrop.innerHTML = procModalHtml;
    document.body.appendChild(procBackdrop);

    const closeBtn = document.getElementById("diff100xModalCloseBtn");
    const startBtn = document.getElementById("diff100xModalStartBtn");
    if (closeBtn) closeBtn.onclick = closeProcedureModal;
    if (startBtn) startBtn.onclick = closeProcedureModal;
    procBackdrop.onclick = (e) => { if (e.target === procBackdrop) closeProcedureModal(); };

    // Key Config Modal with NumPad, QWERTY, and User preset options
    const keyModalHtml = `
      <div class="diff100x-modal" role="dialog" aria-modal="true">
        <div class="diff100x-modal-header">
          <div class="diff100x-modal-title">Configure Key Shortcuts</div>
          <button class="diff100x-modal-close-btn" id="diff100xKeyConfigCloseBtn">✕</button>
        </div>
        <div class="diff100x-modal-body">
          <div class="diff100x-preset-bar">
            <button class="diff100x-preset-btn ${currentKeyPreset === "numpad" ? "active" : ""}" id="diff100xPresetNumpad">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                <path d="M7 7h.01M12 7h.01M17 7h.01M7 12h.01M12 12h.01M17 12h.01M7 17h.01M12 17h.01M17 17h.01"></path>
              </svg>
              NumPad
            </button>
            <button class="diff100x-preset-btn ${currentKeyPreset === "qwerty" ? "active" : ""}" id="diff100xPresetQwerty">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"></path>
              </svg>
              QWERTY
            </button>
            <button class="diff100x-preset-btn ${currentKeyPreset === "user" ? "active" : ""}" id="diff100xPresetUser">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Custom
            </button>
          </div>

          <div id="diff100xKeyConfigContent"></div>
        </div>
        <div class="diff100x-modal-footer">
          <button class="diff100x-btn diff100x-btn-secondary" id="diff100xKeyCancelBtn">Cancel</button>
          <button class="diff100x-btn diff100x-btn-primary" id="diff100xKeySaveBtn">Apply & Save</button>
        </div>
      </div>
    `;

    const keyBackdrop = document.createElement("div");
    keyBackdrop.className = "diff100x-modal-backdrop";
    keyBackdrop.id = "diff100xKeyConfigBackdrop";
    keyBackdrop.innerHTML = keyModalHtml;
    document.body.appendChild(keyBackdrop);

    const keyCloseBtn = document.getElementById("diff100xKeyConfigCloseBtn");
    const keyCancelBtn = document.getElementById("diff100xKeyCancelBtn");
    const keySaveBtn = document.getElementById("diff100xKeySaveBtn");
    const npBtn = document.getElementById("diff100xPresetNumpad");
    const qwBtn = document.getElementById("diff100xPresetQwerty");
    const usBtn = document.getElementById("diff100xPresetUser");

    if (keyCloseBtn) keyCloseBtn.onclick = closeKeyConfigModal;
    if (keyCancelBtn) keyCancelBtn.onclick = closeKeyConfigModal;
    if (keySaveBtn) keySaveBtn.onclick = saveKeyConfig;
    if (npBtn) npBtn.onclick = () => setPreset("numpad");
    if (qwBtn) qwBtn.onclick = () => setPreset("qwerty");
    if (usBtn) usBtn.onclick = () => setPreset("user");

    keyBackdrop.onclick = (e) => { if (e.target === keyBackdrop) closeKeyConfigModal(); };
  }

  function getWbcStatus() {
    const totalWbc = getTotalWbcCount();
    if (totalWbc >= 100 || state.isReviewMode) {
      return { text: "COMPLETE", className: "complete", isComplete: true };
    }
    if (state.cells.length > 0) {
      return { text: "IN PROGRESS", className: "in-progress", isComplete: false };
    }
    return { text: "PERFORM", className: "perform", isComplete: false };
  }

  function createStartupTaskModal() {
    if (document.getElementById("labTaskSelectionModalBackdrop")) return;

    const taskModalHtml = `
      <div class="diff100x-modal" style="max-width: 480px;" role="dialog" aria-modal="true">
        <div class="diff100x-modal-header" style="justify-content: center; background: #ffffff; border-bottom: 1px solid #f1f5f9; padding: 20px 20px 12px; position: relative;">
          <div style="text-align: center;">
            <div id="labTaskModalTitle" style="font-size: 18px; font-weight: 800; color: #1e1b4b; letter-spacing: -0.2px;">Select Task</div>
          </div>
          <button id="labTaskModalCloseBtn" style="position: absolute; right: 16px; top: 18px; background: transparent; border: none; font-size: 18px; color: #94a3b8; cursor: pointer; padding: 4px; display: none; line-height: 1;">✕</button>
        </div>
        <div class="diff100x-modal-body" style="padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 14px;">
          <div style="display: flex; flex-direction: row; gap: 16px; justify-content: center;">
            <button id="labTaskSelectDiffBtn" style="
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 20px 14px;
              background: #f5f3ff;
              color: #5b21b6;
              border: 1.5px solid #c4b5fd;
              border-radius: 12px;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(124, 58, 237, 0.08);
              transition: all 0.16s ease;
              font-family: inherit;
              text-align: center;
            ">
              <span style="font-size: 24px; font-weight: 800; letter-spacing: 0.5px; line-height: 1.15; color: #6d28d9;">WBC</span>
              <span style="font-size: 13px; font-weight: 600; color: #7c3aed; margin-top: 5px; letter-spacing: 0.2px;">Differential</span>
              <span class="lab-task-status-pill" id="labTaskDiffStatusPill" style="display: none; margin-top: 8px; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase;"></span>
            </button>

            <button id="labTaskSelectRbcBtn" style="
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 20px 14px;
              background: #fff1f2;
              color: #be123c;
              border: 1.5px solid #fda4af;
              border-radius: 12px;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(225, 29, 72, 0.08);
              transition: all 0.16s ease;
              font-family: inherit;
              text-align: center;
            ">
              <span style="font-size: 24px; font-weight: 800; letter-spacing: 0.5px; line-height: 1.15; color: #e11d48;">RBC</span>
              <span style="font-size: 13px; font-weight: 600; color: #be123c; margin-top: 5px; letter-spacing: 0.2px;">Morphology</span>
              <span class="lab-task-status-pill" id="labTaskRbcStatusPill" style="display: none; margin-top: 8px; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase;"></span>
            </button>

            <button id="labTaskSelectPltBtn" style="
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 20px 14px;
              background: #f0f9ff;
              color: #0369a1;
              border: 1.5px solid #7dd3fc;
              border-radius: 12px;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(2, 132, 199, 0.08);
              transition: all 0.16s ease;
              font-family: inherit;
              text-align: center;
            ">
              <span style="font-size: 24px; font-weight: 800; letter-spacing: 0.5px; line-height: 1.15; color: #0284c7;">PLT</span>
              <span style="font-size: 13px; font-weight: 600; color: #0369a1; margin-top: 5px; letter-spacing: 0.2px;">Estimate</span>
              <span class="lab-task-status-pill" id="labTaskPltStatusPill" style="display: none; margin-top: 8px; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase;"></span>
            </button>
          </div>

          <button id="labTaskSelectViewOnlyBtn" style="
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 16px 14px;
            background: #f8fafc;
            color: #334155;
            border: 1.5px solid #cbd5e1;
            border-radius: 12px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(51, 65, 85, 0.06);
            transition: all 0.16s ease;
            font-family: inherit;
            text-align: center;
          ">
            <span style="font-size: 24px; font-weight: 800; letter-spacing: 0.5px; line-height: 1.15; color: #334155;">Scan</span>
            <span style="font-size: 13px; font-weight: 600; color: #64748b; margin-top: 5px; letter-spacing: 0.2px;">View Only</span>
          </button>
        </div>
      </div>
    `;

    const backdrop = document.createElement("div");
    backdrop.className = "diff100x-modal-backdrop";
    backdrop.id = "labTaskSelectionModalBackdrop";
    backdrop.innerHTML = taskModalHtml;
    document.body.appendChild(backdrop);

    const closeBtn = document.getElementById("labTaskModalCloseBtn");
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.preventDefault();
        backdrop.classList.remove("open");
      };
    }
    backdrop.onclick = (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove("open");
      }
    };
  }

  function showStartupTaskModal() {
    createStartupTaskModal();
    const backdrop = document.getElementById("labTaskSelectionModalBackdrop");
    const titleEl = document.getElementById("labTaskModalTitle");
    const closeBtn = document.getElementById("labTaskModalCloseBtn");
    const diffBtn = document.getElementById("labTaskSelectDiffBtn");
    const rbcBtn = document.getElementById("labTaskSelectRbcBtn");
    const pltBtn = document.getElementById("labTaskSelectPltBtn");
    const viewOnlyBtn = document.getElementById("labTaskSelectViewOnlyBtn");

    if (titleEl) titleEl.textContent = "Select Task";
    if (closeBtn) closeBtn.style.display = "none";

    // Configure diff button for selection
    if (diffBtn) {
      diffBtn.disabled = false;
      diffBtn.style.opacity = "1";
      diffBtn.style.cursor = "pointer";
      diffBtn.style.background = "#f5f3ff";
      diffBtn.style.borderColor = "#c4b5fd";
      diffBtn.style.boxShadow = "0 2px 8px rgba(124, 58, 237, 0.08)";
      diffBtn.title = "Start WBC Differential";
      const pill = document.getElementById("labTaskDiffStatusPill");
      if (pill) pill.style.display = "none";

      diffBtn.onclick = (e) => {
        e.preventDefault();
        if (backdrop) backdrop.classList.remove("open");
        window.__Differential100X.expand();
      };
      diffBtn.onmouseenter = () => {
        diffBtn.style.transform = "translateY(-2px)";
        diffBtn.style.background = "#ede9fe";
        diffBtn.style.borderColor = "#8b5cf6";
        diffBtn.style.boxShadow = "0 6px 16px rgba(109, 40, 217, 0.18)";
      };
      diffBtn.onmouseleave = () => {
        diffBtn.style.transform = "none";
        diffBtn.style.background = "#f5f3ff";
        diffBtn.style.borderColor = "#c4b5fd";
        diffBtn.style.boxShadow = "0 2px 8px rgba(124, 58, 237, 0.08)";
      };
    }

    // Configure RBC button for selection
    if (rbcBtn) {
      rbcBtn.disabled = false;
      rbcBtn.style.opacity = "1";
      rbcBtn.style.cursor = "pointer";
      rbcBtn.style.background = "#fff1f2";
      rbcBtn.style.borderColor = "#fda4af";
      rbcBtn.style.boxShadow = "0 2px 8px rgba(225, 29, 72, 0.08)";
      rbcBtn.title = "Start RBC Morphology";
      const pill = document.getElementById("labTaskRbcStatusPill");
      if (pill) pill.style.display = "none";

      rbcBtn.onclick = (e) => {
        e.preventDefault();
        if (backdrop) backdrop.classList.remove("open");
        if (window.__RbcMorphology100X && typeof window.__RbcMorphology100X.expand === "function") {
          window.__RbcMorphology100X.expand();
        }
      };
      rbcBtn.onmouseenter = () => {
        rbcBtn.style.transform = "translateY(-2px)";
        rbcBtn.style.background = "#ffe4e6";
        rbcBtn.style.borderColor = "#fb7185";
        rbcBtn.style.boxShadow = "0 6px 16px rgba(225, 29, 72, 0.18)";
      };
      rbcBtn.onmouseleave = () => {
        rbcBtn.style.transform = "none";
        rbcBtn.style.background = "#fff1f2";
        rbcBtn.style.borderColor = "#fda4af";
        rbcBtn.style.boxShadow = "0 2px 8px rgba(225, 29, 72, 0.08)";
      };
    }

    // Configure PLT button for selection
    if (pltBtn) {
      pltBtn.disabled = false;
      pltBtn.style.opacity = "1";
      pltBtn.style.cursor = "pointer";
      pltBtn.style.background = "#f0f9ff";
      pltBtn.style.borderColor = "#7dd3fc";
      pltBtn.style.boxShadow = "0 2px 8px rgba(2, 132, 199, 0.08)";
      pltBtn.title = "Start Platelet Estimate";
      const pill = document.getElementById("labTaskPltStatusPill");
      if (pill) pill.style.display = "none";

      pltBtn.onclick = (e) => {
        e.preventDefault();
        if (backdrop) backdrop.classList.remove("open");
        if (window.__Counter100X && typeof window.__Counter100X.expand === "function") {
          window.__Counter100X.expand();
        }
      };
      pltBtn.onmouseenter = () => {
        pltBtn.style.transform = "translateY(-2px)";
        pltBtn.style.background = "#e0f2fe";
        pltBtn.style.borderColor = "#38bdf8";
        pltBtn.style.boxShadow = "0 6px 16px rgba(2, 132, 199, 0.18)";
      };
      pltBtn.onmouseleave = () => {
        pltBtn.style.transform = "none";
        pltBtn.style.background = "#f0f9ff";
        pltBtn.style.borderColor = "#7dd3fc";
        pltBtn.style.boxShadow = "0 2px 8px rgba(2, 132, 199, 0.08)";
      };
    }

    // Configure View Only button
    if (viewOnlyBtn) {
      viewOnlyBtn.style.display = "flex";
      viewOnlyBtn.onclick = (e) => {
        e.preventDefault();
        if (backdrop) backdrop.classList.remove("open");
        if (window.__Differential100X && typeof window.__Differential100X.collapse === "function") {
          window.__Differential100X.collapse();
        }
        if (window.__RbcMorphology100X && typeof window.__RbcMorphology100X.collapse === "function") {
          window.__RbcMorphology100X.collapse();
        }
        if (window.__Counter100X && typeof window.__Counter100X.collapse === "function") {
          window.__Counter100X.collapse();
        }
        if (typeof window.__update100xTaskPositions === "function") {
          window.__update100xTaskPositions();
        }
      };
      viewOnlyBtn.onmouseenter = () => {
        viewOnlyBtn.style.transform = "translateY(-2px)";
        viewOnlyBtn.style.background = "#f1f5f9";
        viewOnlyBtn.style.borderColor = "#94a3b8";
        viewOnlyBtn.style.boxShadow = "0 6px 16px rgba(51, 65, 85, 0.14)";
      };
      viewOnlyBtn.onmouseleave = () => {
        viewOnlyBtn.style.transform = "none";
        viewOnlyBtn.style.background = "#f8fafc";
        viewOnlyBtn.style.borderColor = "#cbd5e1";
        viewOnlyBtn.style.boxShadow = "0 2px 8px rgba(51, 65, 85, 0.06)";
      };
    }

    if (backdrop) backdrop.classList.add("open");
  }

  function showShareTaskModal() {
    createStartupTaskModal();
    const backdrop = document.getElementById("labTaskSelectionModalBackdrop");
    const titleEl = document.getElementById("labTaskModalTitle");
    const closeBtn = document.getElementById("labTaskModalCloseBtn");
    const diffBtn = document.getElementById("labTaskSelectDiffBtn");
    const rbcBtn = document.getElementById("labTaskSelectRbcBtn");
    const pltBtn = document.getElementById("labTaskSelectPltBtn");
    const viewOnlyBtn = document.getElementById("labTaskSelectViewOnlyBtn");

    if (titleEl) titleEl.textContent = "Share Task";
    if (closeBtn) closeBtn.style.display = "block";
    if (viewOnlyBtn) viewOnlyBtn.style.display = "none";

    // Query status of each task
    const diffComplete = getWbcStatus().isComplete;
    const rbcComplete = (window.__RbcMorphology100X && typeof window.__RbcMorphology100X.getStatus === "function")
      ? window.__RbcMorphology100X.getStatus().isComplete
      : false;
    const pltComplete = (window.__Counter100X && typeof window.__Counter100X.getStatus === "function")
      ? window.__Counter100X.getStatus().isComplete
      : false;

    // Helper to style active/grayed button
    function applyShareButtonStyle(btn, pillEl, isComplete, activeBg, activeBorder, activeShadow, hoverBg, hoverBorder, hoverShadow, onShareClick, taskName, disabledReason) {
      if (!btn) return;
      if (pillEl) {
        pillEl.style.display = "inline-block";
        pillEl.textContent = isComplete ? "Complete" : "Incomplete";
        pillEl.style.background = isComplete ? "#dcfce7" : "#e2e8f0";
        pillEl.style.color = isComplete ? "#15803d" : "#64748b";
        pillEl.style.border = isComplete ? "1px solid #bbf7d0" : "1px solid #cbd5e1";
      }

      if (isComplete) {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
        btn.style.background = activeBg;
        btn.style.borderColor = activeBorder;
        btn.style.boxShadow = activeShadow;
        btn.title = `Share ${taskName} review link`;

        btn.onclick = (e) => {
          e.preventDefault();
          if (backdrop) backdrop.classList.remove("open");
          onShareClick();
        };
        btn.onmouseenter = () => {
          btn.style.transform = "translateY(-2px)";
          btn.style.background = hoverBg;
          btn.style.borderColor = hoverBorder;
          btn.style.boxShadow = hoverShadow;
        };
        btn.onmouseleave = () => {
          btn.style.transform = "none";
          btn.style.background = activeBg;
          btn.style.borderColor = activeBorder;
          btn.style.boxShadow = activeShadow;
        };
      } else {
        btn.disabled = true;
        btn.style.opacity = "0.45";
        btn.style.cursor = "not-allowed";
        btn.style.background = "#f1f5f9";
        btn.style.borderColor = "#cbd5e1";
        btn.style.boxShadow = "none";
        btn.style.transform = "none";
        btn.title = `${taskName} is not complete. ${disabledReason}`;
        btn.onclick = null;
        btn.onmouseenter = null;
        btn.onmouseleave = null;
      }
    }

    applyShareButtonStyle(
      diffBtn,
      document.getElementById("labTaskDiffStatusPill"),
      diffComplete,
      "#f5f3ff", "#c4b5fd", "0 2px 8px rgba(124, 58, 237, 0.08)",
      "#ede9fe", "#8b5cf6", "0 6px 16px rgba(109, 40, 217, 0.18)",
      () => copyShareLink(),
      "WBC Differential",
      "Complete 100 WBC before sharing."
    );

    applyShareButtonStyle(
      rbcBtn,
      document.getElementById("labTaskRbcStatusPill"),
      rbcComplete,
      "#fff1f2", "#fda4af", "0 2px 8px rgba(225, 29, 72, 0.08)",
      "#ffe4e6", "#fb7185", "0 6px 16px rgba(225, 29, 72, 0.18)",
      () => {
        if (window.__RbcMorphology100X && typeof window.__RbcMorphology100X.copyShareLink === "function") {
          window.__RbcMorphology100X.copyShareLink();
        }
      },
      "RBC Morphology",
      "Complete 10 fields and calculate average before sharing."
    );

    applyShareButtonStyle(
      pltBtn,
      document.getElementById("labTaskPltStatusPill"),
      pltComplete,
      "#f0f9ff", "#7dd3fc", "0 2px 8px rgba(2, 132, 199, 0.08)",
      "#e0f2fe", "#38bdf8", "0 6px 16px rgba(2, 132, 199, 0.18)",
      () => {
        if (window.__Counter100X && typeof window.__Counter100X.copyShareLink === "function") {
          window.__Counter100X.copyShareLink();
        }
      },
      "PLT Estimate",
      "Complete 10 fields before sharing."
    );

    if (backdrop) backdrop.classList.add("open");
  }

  window.__showLabShareTaskModal = showShareTaskModal;

  function initDifferential() {
    const styleEl = document.createElement("style");
    styleEl.innerHTML = STYLES;
    document.head.appendChild(styleEl);

    createModals();

    const wrapper = document.createElement("div");
    wrapper.className = "diff100x-wrapper" + (state.minimized ? " minimized" : "");
    wrapper.id = "diff100xWrapper";

    wrapper.innerHTML = `
      <div class="diff100x-card">
        <div class="diff100x-status-bar" id="diff100xStatusBar">
          <div class="diff100x-dot" id="diff100xDot"></div>
          <span id="diff100xStatusText">ACTIVE</span>
        </div>

        <div class="diff100x-header">
          <div class="diff100x-title-group" id="diff100xHeaderTitleGroup">
            <div class="diff100x-title-row">
              <div class="diff100x-title">WBC Differential</div>
              <button class="diff100x-help-btn" id="diff100xHelpBtn" title="Keys & Procedure">?</button>
            </div>
            <div id="diff100xStatusIndicator" class="diff100x-collapse-indicator perform">
              <span>PERFORM</span>
            </div>
          </div>
        </div>

        <div class="diff100x-progress-card">
          <div class="diff100x-progress-header">
            <span class="diff100x-progress-header-label">Total WBC</span>
            <span class="diff100x-progress-header-val" id="diff100xProgressVal">0 / 100</span>
          </div>
          <div class="diff100x-progress-bar-bg">
            <div class="diff100x-progress-bar-fill" id="diff100xProgressFill"></div>
          </div>
        </div>

        <div id="diff100xReturnBannerContainer"></div>

        <div class="diff100x-table-container">
          <div class="diff100x-table-header">
            <span>Type</span>
            <span>#</span>
            <span>%</span>
            <span>
              <button class="diff100x-filter-btn" id="diff100xHeaderEyeBtn" title="Toggle all cell types in log">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </span>
          </div>
          <div id="diff100xTableBody"></div>
        </div>

        <div class="diff100x-bottom-section">
          <div class="diff100x-log-toggle-header" id="diff100xFullLogToggle"></div>
          <div class="diff100x-full-log-list" id="diff100xFullLogList" style="display: none;"></div>

          <div class="diff100x-actions">
            <button class="diff100x-btn diff100x-btn-secondary" id="diff100xKeysBtn" title="Custom Key Bindings">
              <span>⌨</span> Keys
            </button>
            <button class="diff100x-btn diff100x-btn-secondary" id="diff100xShareBtn" title="Classify a cell to enable sharing" disabled>
              <span>🔗</span> Share
            </button>
            <button class="diff100x-btn diff100x-btn-secondary" id="diff100xResetBtn" title="Reset Counts">
              <span>↻</span> Reset
            </button>
          </div>
          <button class="diff100x-btn diff100x-btn-minimize" id="diff100xMinimizeBtn" title="Minimize WBC Differential">
            <span>▾</span> Minimize Task
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);

    // Dynamic Task Positioning Coordinator (calculates exact gaps based on active card height)
    function updateTaskPositions() {
      const diffWrapper = document.getElementById("diff100xWrapper");
      const rbcWrapper = document.getElementById("rbcMorph100xWrapper");
      const counterWrapper = document.getElementById("counter100xWrapper");
      const gap = 14;

      const diffExpanded = diffWrapper && !diffWrapper.classList.contains("minimized");
      const rbcExpanded = rbcWrapper && !rbcWrapper.classList.contains("minimized");
      const counterExpanded = counterWrapper && !counterWrapper.classList.contains("minimized");

      // Clear existing displacements first
      [diffWrapper, rbcWrapper, counterWrapper].forEach(w => {
        if (!w) return;
        w.classList.remove("displaced-top", "displaced-bottom");
        w.style.transform = "";
        w.style.removeProperty("--diff100x-displaced-top");
        w.style.removeProperty("--diff100x-displaced-bottom");
        w.style.removeProperty("--rbcMorph100x-displaced-top");
        w.style.removeProperty("--rbcMorph100x-displaced-bottom");
        w.style.removeProperty("--counter100x-displaced-top");
        w.style.removeProperty("--counter100x-displaced-bottom");
      });

      // Update status bar active/inactive indicators
      const diffStatusBar = document.getElementById("diff100xStatusBar");
      const diffStatusDot = document.getElementById("diff100xDot");
      const diffStatusText = document.getElementById("diff100xStatusText");
      if (diffStatusBar && diffStatusDot && diffStatusText) {
        const isFocused = (typeof document !== "undefined" && typeof document.hasFocus === "function") ? document.hasFocus() : true;
        const isWindowActive = Boolean(state.mouseInWindow || isFocused);
        if (state.isReviewMode) {
          diffStatusBar.classList.remove("inactive");
          diffStatusDot.className = "diff100x-dot review";
          diffStatusText.textContent = "REVIEW";
          diffStatusText.style.color = "#7c3aed";
        } else if (isWindowActive) {
          diffStatusBar.classList.remove("inactive");
          diffStatusDot.className = "diff100x-dot";
          diffStatusText.textContent = "ACTIVE";
          diffStatusText.style.color = "#7c3aed";
        } else {
          diffStatusBar.classList.add("inactive");
          diffStatusDot.className = "diff100x-dot inactive";
          diffStatusText.textContent = "INACTIVE";
          diffStatusText.style.color = "#94a3b8";
        }
      }

      // Dynamic Task Positioning Coordinator (vertically centers and aligns entire active task stack)
      const activeTasks = [diffWrapper, rbcWrapper, counterWrapper].filter(Boolean);
      if (activeTasks.length === 0) return;

      // Measure height of each task card
      const heights = activeTasks.map(w => {
        const card = w.querySelector(".diff100x-card, .rbcMorph100x-card, .counter100x-card") || w.firstElementChild;
        if (card && card.offsetHeight > 0) {
          return card.offsetHeight;
        }
        return w.classList.contains("minimized") ? 40 : 500;
      });

      const totalHeight = heights.reduce((sum, h) => sum + h, 0) + (activeTasks.length - 1) * gap;

      // Vertically center the entire stack around 50vh (top: 50%)
      let currentTop = -totalHeight / 2;
      const windowH = window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 800);
      if (windowH / 2 + currentTop < 8) {
        currentTop = 8 - windowH / 2;
      }

      activeTasks.forEach((w, i) => {
        const centerY = Math.round(currentTop + heights[i] / 2);
        if (centerY === 0) {
          w.style.transform = "translateY(-50%)";
        } else if (centerY > 0) {
          w.style.transform = `translateY(calc(-50% + ${centerY}px))`;
        } else {
          w.style.transform = `translateY(calc(-50% - ${Math.abs(centerY)}px))`;
        }
        currentTop += heights[i] + gap;
      });
    }

    window.__update100xTaskPositions = updateTaskPositions;

    // Observe active card size changes (e.g. log toggle, adding cells, window resizing)
    const diffCardEl = wrapper.querySelector(".diff100x-card");
    if (diffCardEl && typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(() => {
        updateTaskPositions();
      });
      resizeObserver.observe(diffCardEl);
    }
    window.addEventListener("resize", updateTaskPositions);

    // Expose API for coordination
    window.__Differential100X = {
      expand: () => {
        // If Counter100X or RbcMorphology100X is currently expanded, collapse first to prevent overlapping transitions
        if (window.__Counter100X && typeof window.__Counter100X.isMinimized === "function" && !window.__Counter100X.isMinimized()) {
          window.__Counter100X.collapse();
        }
        if (window.__Counter100X && typeof window.__Counter100X.closeProcedure === "function") {
          window.__Counter100X.closeProcedure();
        }
        if (window.__RbcMorphology100X && typeof window.__RbcMorphology100X.isMinimized === "function" && !window.__RbcMorphology100X.isMinimized()) {
          window.__RbcMorphology100X.collapse();
        }
        if (window.__RbcMorphology100X && typeof window.__RbcMorphology100X.closeProcedure === "function") {
          window.__RbcMorphology100X.closeProcedure();
        }
        state.minimized = false;
        wrapper.classList.remove("minimized");
        if (typeof window.__update100xTaskPositions === "function") {
          window.__update100xTaskPositions();
        } else {
          updateTaskPositions();
        }
        // Show procedure if not suppressed
        try {
          if (localStorage.getItem("diff100x_hide_procedure") !== "1") {
            showProcedureModal();
          }
        } catch (err) {
          showProcedureModal();
        }
      },
      collapse: () => {
        state.minimized = true;
        wrapper.classList.add("minimized");
        if (typeof window.__update100xTaskPositions === "function") {
          window.__update100xTaskPositions();
        } else {
          updateTaskPositions();
        }
      },
      isMinimized: () => Boolean(state.minimized),
      showProcedure: showProcedureModal,
      closeProcedure: closeProcedureModal,
      showKeys: showKeyConfigModal,
      closeKeys: closeKeyConfigModal,
      getStatus: getWbcStatus,
      getSharePayload: getSharePayload,
      getEncodedData: getSharePayload,
      copyShareLink: copyShareLink,
      showShareModal: showShareTaskModal
    };

    // Event listeners
    const helpBtn = document.getElementById("diff100xHelpBtn");
    if (helpBtn) {
      helpBtn.onclick = (e) => {
        e.stopPropagation();
        showProcedureModal();
      };
    }

    const keysBtn = document.getElementById("diff100xKeysBtn");
    if (keysBtn) {
      keysBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        showKeyConfigModal();
      };
    }

    const minimizeBtn = document.getElementById("diff100xMinimizeBtn");
    if (minimizeBtn) {
      minimizeBtn.onclick = (e) => {
        e.stopPropagation();
        window.__Differential100X.collapse();
      };
    }

    const statusIndicatorElInit = document.getElementById("diff100xStatusIndicator");
    if (statusIndicatorElInit) {
      statusIndicatorElInit.onclick = (e) => {
        e.stopPropagation();
        if (state.minimized) {
          window.__Differential100X.expand();
        } else {
          window.__Differential100X.collapse();
        }
      };
    }

    // Clicking anywhere on card when minimized expands task
    const cardEl = wrapper.querySelector(".diff100x-card");
    if (cardEl) {
      cardEl.addEventListener("click", (e) => {
        if (state.minimized) {
          window.__Differential100X.expand();
        }
      });
    }

    const shareBtn = document.getElementById("diff100xShareBtn");
    if (shareBtn) {
      shareBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        showShareTaskModal();
      };
    }

    const resetBtn = document.getElementById("diff100xResetBtn");
    if (resetBtn) resetBtn.onclick = resetAll;

    const fullLogToggle = document.getElementById("diff100xFullLogToggle");
    if (fullLogToggle) {
      fullLogToggle.onclick = () => {
        state.isBottomLogExpanded = !state.isBottomLogExpanded;
        renderUI();
      };
    }

    // Window focus / mouse tracking
    document.addEventListener("mouseenter", () => updateTrackingStatus(true));
    document.addEventListener("mousemove", () => {
      if (!state.mouseInWindow) updateTrackingStatus(true);
    }, { passive: true });
    document.addEventListener("mouseleave", (e) => {
      if (!e.relatedTarget && !e.toElement) updateTrackingStatus(false);
    });
    window.addEventListener("focus", () => updateTrackingStatus(true));
    window.addEventListener("blur", () => updateTrackingStatus(false));

    // Global Key Listener
    window.addEventListener("keydown", function (e) {
      const procBackdrop = document.getElementById("diff100xModalBackdrop");
      const keyBackdrop = document.getElementById("diff100xKeyConfigBackdrop");
      const taskBackdrop = document.getElementById("labTaskSelectionModalBackdrop");
      if ((procBackdrop && procBackdrop.classList.contains("open")) ||
          (keyBackdrop && keyBackdrop.classList.contains("open")) ||
          (taskBackdrop && taskBackdrop.classList.contains("open"))) {
        if (e.key === "Escape") {
          closeProcedureModal();
          closeKeyConfigModal();
          if (taskBackdrop) taskBackdrop.classList.remove("open");
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      // Handle Arrow key navigation when a cell is actively inspected
      if (state.inspectingCellId) {
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          navigateInspectedCell(-1);
          e.preventDefault();
          e.stopPropagation();
          return;
        } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          navigateInspectedCell(1);
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      if (state.isReviewMode) return;

      // If differential is minimized, ignore differential key controls
      if (state.minimized) return;

      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return;

      const key = e.key;
      const code = e.code;
      const isShift = e.shiftKey;
      let handled = false;

      const matchedDef = CELL_DEFS.find(d => {
        if (d.key && d.key.toLowerCase() === key.toLowerCase()) return true;
        if (d.altKey && d.altKey === key) return true;
        if (d.code && d.code === code) return true;
        if (d.npCode && d.npCode === code) return true;
        return false;
      });

      if (matchedDef) {
        recordCell(matchedDef.id, isShift);
        handled = true;
      } else if (key === "z" || key === "Z" || key === "Backspace") {
        undoLastAction();
        handled = true;
      } else if (key === "r" || key === "R") {
        resetAll();
        handled = true;
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    const isReview = loadReviewFromUrl();
    if (isReview) {
      state.minimized = false;
      wrapper.classList.remove("minimized");
      updateCollapseIndicator();
      if (typeof window.__update100xTaskPositions === "function") {
        window.__update100xTaskPositions();
      } else {
        updateTaskPositions();
      }
    }
    renderUI();
    attachViewerPanZoomListeners();

    // Check if any tool's review link is present
    let hasAnyReview = Boolean(isReview);
    try {
      const initialParams = new URLSearchParams(window.location.search);
      if (initialParams.has("diff_review") || initialParams.has("rbc_review") || initialParams.has("rbc") || initialParams.has("review") || initialParams.has("plt_review")) {
        hasAnyReview = true;
      }
    } catch (e) {}

    // Show initial task selection modal only if not in any review mode
    if (!hasAnyReview) {
      setTimeout(showStartupTaskModal, 50);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDifferential);
  } else {
    initDifferential();
  }
})();
