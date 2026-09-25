/**
 * RBC Morphology 100X Evaluation Overlay
 * For virtual microscope slides at 100X magnification.
 *
 * Features:
 *   - Automated per-field tracking with viewport coordinates & zoom capture (matching PLT estimate)
 *   - Persistent 95% height square overlay that fades out on viewport pan/zoom
 *   - Read-only Current Field Status (Normal / Abnormal) unavailable for manual clicking
 *   - Defaults to Normal on every new field, automatically transitions to Abnormal upon selecting any morphology
 *   - [1] shortcut key & on-screen "New Field" button with sleek progress bar matching WBC differential
 *   - Visited fields log sorted descending (newest/active first) with click-to-jump viewport navigation
 *   - [R] shortcut key & Reset button to reset all recorded fields
 *   - Shareable review links with encoded per-field evaluations
 *   - 3-Way Layout coordination with Differential (100X) and Platelet Estimate (100X) counters
 *   - Clinical Help & Morphology Grading Guide modal
 */
(function () {
  if (window.__RbcMorphology100XInitialized) return;
  window.__RbcMorphology100XInitialized = true;

  function getViewer() {
    return window.viewer || window.__osdViewer || null;
  }

  // --- MORPHOLOGY DEFINITIONS & SECTIONS ---
  const MORPHOLOGY_SECTIONS = [
    {
      id: "size_color_sec",
      title: "SIZE & COLOR",
      hasGrades: true,
      items: [
        {
          id: "anisocytosis",
          name: "Anisocytosis",
          description: "Abnormal variation in RBC diameter/volume (high RDW).",
          category: "size"
        },
        {
          id: "microcytosis",
          name: "Microcytosis",
          description: "Small RBCs (< 6 µm diameter, MCV < 80 fL).",
          category: "size"
        },
        {
          id: "macrocytosis",
          name: "Macrocytosis",
          description: "Large RBCs (> 8 µm diameter, MCV > 100 fL).",
          category: "size"
        },
        {
          id: "hypochromia",
          name: "Hypochromia",
          description: "Increased central pallor (> 1/3 of cell diameter) due to decreased hemoglobin content.",
          category: "color"
        },
        {
          id: "polychromasia",
          name: "Polychromasia",
          description: "RBCs with a bluish-gray or lavender tint indicative of young reticulocytes releasing into circulation.",
          category: "color"
        }
      ]
    },
    {
      id: "shape_sec",
      title: "SHAPE",
      hasGrades: true,
      items: [
        {
          id: "poikilocytosis",
          name: "Poikilocytosis",
          description: "General variation in RBC shape (nonspecific).",
          category: "shape"
        },
        {
          id: "acanthocyte",
          name: "Acanthocyte",
          description: "Spur cells with 2-10 irregularly spaced, sharp/blunt spicules of variable length.",
          category: "shape"
        },
        {
          id: "bite_cell",
          name: "Bite cell",
          description: "Degmacyte; cell with one or more semi-circular 'bites' removed by splenic macrophages.",
          category: "shape"
        },
        {
          id: "blister_cell",
          name: "Blister cell",
          description: "Cell with a submembrane vacuole or pseudovacuole resembling a blister.",
          category: "shape"
        },
        {
          id: "echinocyte",
          name: "Echinocyte",
          description: "Burr cells / crenated cells with 10-30 short, uniform, regularly spaced blunt projections.",
          category: "shape"
        },
        {
          id: "elliptocyte",
          name: "Ellipto/Ovalocyte",
          description: "Oval or elongated pencil/cigar-shaped erythrocytes.",
          category: "shape"
        },
        {
          id: "folded_cell",
          name: "Folded cell",
          description: "RBC with folded or curled over edges.",
          category: "shape"
        },
        {
          id: "schistocyte",
          name: "Schistocyte",
          description: "Fragmented RBCs (helmet cells, triangular fragments) indicative of microangiopathic hemolysis.",
          category: "shape"
        },
        {
          id: "sickle_cell",
          name: "Sickle cell",
          description: "Drepanocyte; crescent or sickle-shaped RBC with pointed ends (HbS polymerization).",
          category: "shape"
        },
        {
          id: "spherocyte",
          name: "Spherocyte",
          description: "Dense, spherical RBCs lacking central pallor with reduced surface-to-volume ratio.",
          category: "shape"
        },
        {
          id: "stomatocyte",
          name: "Stomatocyte",
          description: "Cell with a slit-like, mouth-shaped or oval area of central pallor.",
          category: "shape"
        },
        {
          id: "target_cell",
          name: "Target cell",
          description: "Codocyte / bullseye cell with central hemoglobinized area surrounded by a clear ring.",
          category: "shape"
        },
        {
          id: "teardrop",
          name: "Teardrop",
          description: "Dacrocyte; pear-shaped or teardrop-shaped erythrocyte (myelofibrosis, marrow infiltrates).",
          category: "shape"
        }
      ]
    },
    {
      id: "inclusions_sec",
      title: "INCLUSIONS & DISTRIBUTION",
      hasGrades: false,
      items: [
        {
          id: "howell_jolly",
          name: "Howell-Jolly Bodies",
          description: "Small, round, dense dark-purple nuclear DNA remnants.",
          category: "inclusion"
        },
        {
          id: "pappenheimer",
          name: "Pappenheimer Bodies",
          description: "Small, irregular blue-purple granules of iron (siderotic granules) near cell periphery.",
          category: "inclusion"
        },
        {
          id: "basophilic_stippling",
          name: "Basophilic Stippling",
          description: "Fine or coarse punctate blue granules of precipitated ribosomal RNA throughout cytoplasm.",
          category: "inclusion"
        },
        {
          id: "agglutinates",
          name: "Agglutinates",
          description: "Irregular clumps of RBCs (cold agglutinins, antigen-antibody crosslinking).",
          category: "distribution"
        },
        {
          id: "rouleaux",
          name: "Rouleaux",
          description: "Linear alignment of RBCs resembling stacked coins (elevated plasma proteins, paraproteinemia).",
          category: "distribution"
        }
      ]
    }
  ];

  const ITEM_MAP = {};
  MORPHOLOGY_SECTIONS.forEach(sec => {
    sec.items.forEach(it => {
      ITEM_MAP[it.id] = it;
    });
  });

  // --- AUDIO SYNTHESIS FEEDBACK ---
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playBeep(freq, type = "sine", duration = 0.08, gainVal = 0.12) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gainNode.gain.setValueAtTime(gainVal, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio not supported or blocked
    }
  }

  function soundSuccess() {
    playBeep(780, "sine", 0.06, 0.12);
  }

  function soundFieldCommit() {
    playBeep(520, "triangle", 0.05, 0.15);
    setTimeout(() => playBeep(880, "triangle", 0.08, 0.15), 60);
  }

  function soundError() {
    playBeep(220, "sawtooth", 0.12, 0.15);
  }

  function soundUndo() {
    playBeep(440, "sine", 0.06, 0.1);
  }

  // --- STATE ---
  const state = {
    minimized: true,
    mouseInWindow: true,
    activeFieldStarted: false, // true once user starts Field #1
    activeFieldViewport: null, // { center: {x, y}, zoom }
    currentFieldStatus: "Normal", // "Normal" | "Abnormal"
    currentFieldSelections: {}, // { [itemId]: "1+" | "2+" | "3+" | "Present" }
    fields: [], // [{ id, number, status, selections, center: {x, y}, zoom, summary }]
    selectedFieldId: null,
    expandedFieldIds: new Set(),
    isReviewMode: false,
    avgRevealed: false,
    expandedReviewSections: new Set()
  };

  // Clean up any legacy saved session state from localStorage so refreshing starts fresh
  try {
    localStorage.removeItem("rbcMorph100x_state_v2");
    localStorage.removeItem("rbcMorph100x_state");
  } catch (e) {}

  // --- STYLES ---
  const STYLES = `
    .rbcMorph100x-wrapper {
      position: fixed;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      z-index: 999997;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      user-select: none;
      display: flex;
      align-items: center;
      transition: filter 0.2s ease, opacity 0.2s ease;
    }

    .rbcMorph100x-wrapper.inactive {
      filter: grayscale(0.85) contrast(0.9);
      opacity: 0.78;
    }

    .rbcMorph100x-wrapper.inactive:hover {
      filter: grayscale(0.3) contrast(0.98);
      opacity: 0.95;
    }

    .rbcMorph100x-wrapper.minimized {
      top: 50%;
      transform: translateY(-50%);
    }

    .rbcMorph100x-wrapper.minimized.displaced-top {
      top: 50% !important;
      transform: translateY(var(--rbcMorph100x-displaced-top, calc(-50% - 320px))) !important;
    }

    .rbcMorph100x-wrapper.minimized.displaced-bottom {
      top: 50% !important;
      transform: translateY(var(--rbcMorph100x-displaced-bottom, calc(-50% + 320px))) !important;
    }

    .rbcMorph100x-card {
      position: relative;
      background: #ffffff;
      color: #1f2937;
      border: 1px solid #fecdd3;
      border-left: none;
      border-radius: 0 14px 14px 0;
      box-shadow: 0 12px 30px -5px rgba(225, 29, 72, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
      padding: 10px 12px;
      width: 275px;
      max-height: calc(100vh - 180px);
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      overflow: hidden;
    }

    .rbcMorph100x-wrapper.minimized .rbcMorph100x-card {
      width: 154px;
      box-sizing: border-box;
      padding: 6px 10px 7px 10px;
      border-radius: 0 10px 10px 0;
      box-shadow: 0 4px 14px rgba(225, 29, 72, 0.16);
      cursor: pointer;
    }

    .rbcMorph100x-wrapper.minimized .rbcMorph100x-card:hover {
      background: #fff5f7;
      border-color: #fb7185;
      box-shadow: 0 6px 18px rgba(225, 29, 72, 0.22);
    }

    .rbcMorph100x-wrapper.minimized .rbcMorph100x-status-bar,
    .rbcMorph100x-wrapper.minimized .rbcMorph100x-sticky-overall,
    .rbcMorph100x-wrapper.minimized .rbcMorph100x-progress-card,
    .rbcMorph100x-wrapper.minimized #rbcMorph100xModePanel,
    .rbcMorph100x-wrapper.minimized .rbcMorph100x-table-container,
    .rbcMorph100x-wrapper.minimized .rbcMorph100x-history-container,
    .rbcMorph100x-wrapper.minimized .rbcMorph100x-bottom-actions {
      display: none !important;
    }

    .rbcMorph100x-status-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      box-sizing: border-box;
      padding: 4px 8px;
      margin-bottom: 6px;
      background: #fff1f2;
      border: 1px solid #ffe4e6;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #e11d48;
      user-select: none;
    }

    .rbcMorph100x-status-bar.inactive {
      background: #f8fafc;
      border-color: #e2e8f0;
      color: #64748b;
    }

    .rbcMorph100x-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
      padding-bottom: 5px;
      border-bottom: 1px solid #ffe4e6;
      width: 100%;
      box-sizing: border-box;
    }

    .rbcMorph100x-wrapper.minimized .rbcMorph100x-header {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    .rbcMorph100x-wrapper:not(.minimized) .rbcMorph100x-collapse-indicator {
      display: none !important;
    }

    .rbcMorph100x-title-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      width: 100%;
    }

    .rbcMorph100x-wrapper:not(.minimized) .rbcMorph100x-title-group {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }

    .rbcMorph100x-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      width: 100%;
    }

    .rbcMorph100x-wrapper.minimized .rbcMorph100x-title-row {
      justify-content: center;
    }

    .rbcMorph100x-collapse-indicator {
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

    .rbcMorph100x-collapse-indicator.perform {
      background: #fff1f2;
      color: #e11d48;
      border: 1px solid #fecdd3;
    }
    .rbcMorph100x-collapse-indicator.perform:hover {
      background: #ffe4e6;
      border-color: #fda4af;
      color: #be123c;
    }

    .rbcMorph100x-collapse-indicator.complete {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }
    .rbcMorph100x-collapse-indicator.complete:hover {
      background: #d1fae5;
      border-color: #6ee7b7;
      color: #047857;
    }

    .rbcMorph100x-collapse-indicator.in-progress {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
    }
    .rbcMorph100x-collapse-indicator.in-progress:hover {
      background: #dbeafe;
      border-color: #93c5fd;
      color: #1d4ed8;
    }

    .rbcMorph100x-collapse-indicator-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }

    .rbcMorph100x-help-btn {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #fff1f2;
      color: #e11d48;
      border: 1.5px solid #fecdd3;
      font-size: 14px;
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

    .rbcMorph100x-help-btn:hover {
      background: #e11d48;
      color: #ffffff;
      border-color: #e11d48;
    }

    .rbcMorph100x-wrapper.minimized .rbcMorph100x-help-btn {
      display: none !important;
    }

    .rbcMorph100x-title {
      font-size: 12.5px;
      line-height: 1.25;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #9f1239;
      text-align: left;
      flex: 1;
    }

    .rbcMorph100x-wrapper.minimized .rbcMorph100x-title {
      font-size: 11.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #9f1239;
      text-align: center;
      line-height: 1.2;
      flex: none;
    }

    .rbcMorph100x-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #e11d48;
      box-shadow: 0 0 6px rgba(225, 29, 72, 0.6);
    }

    .rbcMorph100x-dot.inactive {
      background: #94a3b8;
      box-shadow: none;
    }

    .rbcMorph100x-dot.review {
      background: #0284c7;
      box-shadow: 0 0 6px rgba(2, 132, 199, 0.6);
    }

    /* Progress Banner matching WBC differential */
    .rbcMorph100x-progress-card {
      background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%);
      border: 1px solid #fecdd3;
      border-radius: 8px;
      padding: 6px 10px;
      margin-bottom: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .rbcMorph100x-progress-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      color: #881337;
    }

    .rbcMorph100x-progress-header-label {
      font-weight: 700;
      color: #881337;
    }

    .rbcMorph100x-progress-header-val {
      font-weight: 700;
      text-align: right;
      font-variant-numeric: tabular-nums;
      color: #9f1239;
    }

    .rbcMorph100x-progress-bar-bg {
      width: 100%;
      height: 6px;
      background: #fecdd3;
      border-radius: 999px;
      overflow: hidden;
      position: relative;
    }

    .rbcMorph100x-progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #f43f5e, #be123c);
      width: 0%;
      transition: width 0.2s ease;
      border-radius: 999px;
    }

    .rbcMorph100x-progress-bar-fill.complete {
      background: linear-gradient(90deg, #10b981, #059669);
    }

    .rbcMorph100x-calc-avg-wrap {
      margin-top: 5px;
      width: 100%;
    }

    .rbcMorph100x-calc-avg-btn {
      width: 100%;
      padding: 5px 8px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 800;
      font-family: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 1px solid #059669;
      background: linear-gradient(135deg, #10b981 0%, #047857 100%);
      color: #ffffff;
      box-shadow: 0 2px 5px rgba(5, 150, 105, 0.25);
      outline: none;
      transition: all 0.15s ease;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      box-sizing: border-box;
    }

    .rbcMorph100x-calc-avg-btn:hover {
      background: linear-gradient(135deg, #34d399 0%, #059669 100%);
      border-color: #34d399;
      box-shadow: 0 3px 8px rgba(5, 150, 105, 0.35);
      transform: translateY(-0.5px);
    }

    .rbcMorph100x-calc-avg-btn:active {
      transform: translateY(0);
      box-shadow: 0 1px 3px rgba(5, 150, 105, 0.2);
    }

    .rbcMorph100x-calc-avg-arrow {
      font-size: 12px;
      line-height: 1;
      transition: transform 0.15s ease;
    }

    .rbcMorph100x-calc-avg-btn:hover .rbcMorph100x-calc-avg-arrow {
      transform: translateX(2px);
    }

    /* Instructions banner matching platelet estimate */
    .rbcMorph100x-instructions {
      font-size: 10.5px;
      color: #334155;
      background: #fff5f7;
      border: 1px solid #fecdd3;
      border-radius: 6px;
      padding: 6px 9px;
      margin-bottom: 6px;
      box-sizing: border-box;
    }

    .rbcMorph100x-instructions-title {
      font-weight: 700;
      color: #9f1239;
      margin-bottom: 4px;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.4px;
    }

    .rbcMorph100x-instructions-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      line-height: 1.5;
    }

    .rbcMorph100x-key {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 10px;
      background: #ffe4e6;
      color: #9f1239;
      padding: 1px 5px;
      border-radius: 3px;
      font-weight: 700;
    }

    /* Overall Status Container */
    .rbcMorph100x-sticky-overall {
      background: #ffffff;
      border: 1px solid #fecdd3;
      border-radius: 7px;
      margin-bottom: 6px;
      padding: 5px 8px;
      box-shadow: 0 1px 3px rgba(225, 29, 72, 0.05);
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-sizing: border-box;
      user-select: none;
    }

    .rbcMorph100x-sticky-overall.is-clickable {
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .rbcMorph100x-sticky-overall.is-clickable:hover {
      background: #fff1f2;
      border-color: #fda4af;
      box-shadow: 0 2px 5px rgba(225, 29, 72, 0.1);
    }

    .rbcMorph100x-overall-prompt {
      width: 100%;
      text-align: center;
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #9f1239;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 1px 0;
      user-select: none;
    }

    .rbcMorph100x-overall-label {
      font-size: 12.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #881337;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .rbcMorph100x-overall-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2.5px 8px;
      border-radius: 9999px;
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      user-select: none;
      transition: all 0.15s ease;
    }

    .rbcMorph100x-overall-badge.normal {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
      box-shadow: 0 1px 2px rgba(16, 185, 129, 0.15);
    }

    .rbcMorph100x-overall-badge.abnormal {
      background: #fff1f2;
      color: #e11d48;
      border: 1px solid #fecdd3;
      box-shadow: 0 1px 2px rgba(225, 29, 72, 0.15);
    }

    .rbcMorph100x-overall-badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    /* Table Container */
    .rbcMorph100x-table-container {
      flex: 1 1 auto;
      overflow-y: auto;
      overflow-x: hidden;
      min-height: 90px;
      max-height: calc(100vh - 380px);
      border: 1px solid #ffe4e6;
      border-radius: 6px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .rbcMorph100x-table-container.is-locked,
    .rbcMorph100x-table-container.is-locked .rbcMorph100x-row,
    .rbcMorph100x-table-container.is-locked .rbcMorph100x-cell-name,
    .rbcMorph100x-table-container.is-locked .rbcMorph100x-radio-col,
    .rbcMorph100x-table-container.is-locked .rbcMorph100x-radio-btn,
    .rbcMorph100x-table-container.is-locked .rbcMorph100x-present-badge-btn {
      cursor: not-allowed !important;
    }

    .rbcMorph100x-table-container.is-locked .rbcMorph100x-row:hover {
      background: #ffffff;
    }

    .rbcMorph100x-table-container.is-locked .rbcMorph100x-row.active:hover {
      background: #fff1f2;
    }

    .rbcMorph100x-section {
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .rbcMorph100x-section-body {
      background: #ffffff;
      position: relative;
      z-index: 1;
      overflow: hidden;
    }

    .rbcMorph100x-section-toggle-btn {
      width: 100%;
      box-sizing: border-box;
      padding: 5px 8px;
      background: #f8fafc;
      border: none;
      border-top: 1px dashed #e2e8f0;
      color: #475569;
      font-size: 10px;
      font-weight: 600;
      font-family: inherit;
      letter-spacing: 0.3px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: background-color 0.12s ease, color 0.12s ease;
      user-select: none;
    }

    .rbcMorph100x-section-toggle-btn:hover {
      background: #f1f5f9;
      color: #1e293b;
    }

    .rbcMorph100x-section-toggle-btn span:first-child {
      font-size: 13px;
      font-weight: 800;
      line-height: 1;
    }

    .rbcMorph100x-section-header {
      position: relative;
      background: #ffe4e6;
      color: #881337;
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 4px 7px;
      box-shadow: inset 0 -1px 0 #fecdd3, inset 0 1px 0 #fecdd3;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-sizing: border-box;
      user-select: none;
      cursor: pointer;
      z-index: 10;
      transition: background-color 0.12s ease;
      will-change: transform;
    }

    /* Opaque mask on top-pinned headers so that any text scrolling under/behind never peeks above or in subpixel seams */
    .rbcMorph100x-section-header.pinned-top::before {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: 100%;
      height: 40px;
      background: #ffe4e6;
      pointer-events: none;
      z-index: 100;
    }

    .rbcMorph100x-section:first-child .rbcMorph100x-section-header {
      box-shadow: inset 0 -1px 0 #fecdd3;
    }

    .rbcMorph100x-section-header:hover {
      background: #fecdd3;
    }

    .rbcMorph100x-section-header.pinned-top {
      box-shadow: inset 0 -1px 0 #fecdd3, inset 0 1px 0 #fecdd3, 0 2px 5px rgba(225, 29, 72, 0.15);
    }

    .rbcMorph100x-section-header.pinned-bottom {
      box-shadow: inset 0 -1px 0 #fecdd3, inset 0 1px 0 #fecdd3, 0 -2px 5px rgba(225, 29, 72, 0.15);
    }

    .rbcMorph100x-section-title-wrap {
      display: flex;
      align-items: center;
    }

    .rbcMorph100x-header-grades {
      display: grid;
      grid-template-columns: 22px 22px 22px;
      text-align: center;
      font-size: 8.5px;
      font-weight: 800;
      color: #9f1239;
      gap: 3px;
    }

    .rbcMorph100x-header-grades.has-avg {
      grid-template-columns: 26px 22px 22px 22px;
      gap: 3px;
    }

    .rbcMorph100x-header-avg {
      color: #b91c1c;
      font-weight: 800;
      letter-spacing: 0.2px;
      margin-right: 5px;
    }

    /* Morphology Rows */
    .rbcMorph100x-row {
      display: grid;
      grid-template-columns: 1fr 22px 22px 22px;
      gap: 3px;
      align-items: center;
      padding: 3px 5px 3px 7px;
      font-size: 10.5px;
      border-bottom: 1px solid #fff5f7;
      transition: background-color 0.12s ease;
      box-sizing: border-box;
      background: #ffffff;
    }

    .rbcMorph100x-row.has-avg {
      grid-template-columns: 1fr 26px 22px 22px 22px;
      gap: 3px;
    }

    .rbcMorph100x-row.has-avg .rbcMorph100x-avg-col {
      margin-right: 5px;
    }

    .rbcMorph100x-row:last-child {
      border-bottom: none;
    }

    .rbcMorph100x-row:hover {
      background: #fff8f9;
    }

    .rbcMorph100x-row.active {
      background: #fff1f2;
      box-shadow: inset 3px 0 0 #f43f5e;
    }

    .rbcMorph100x-row.active .rbcMorph100x-cell-name {
      font-weight: 700;
      color: #9f1239;
    }

    .rbcMorph100x-cell-name {
      display: flex;
      align-items: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #374151;
      font-size: 10.5px;
    }

    /* Avg column cell */
    .rbcMorph100x-avg-col {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .rbcMorph100x-avg-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 18px;
      padding: 0 3px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 800;
      box-sizing: border-box;
      text-align: center;
      letter-spacing: 0.2px;
    }

    .rbcMorph100x-avg-badge.has-value {
      background: #fff1f2;
      color: #be123c;
      border: 1px solid #fecdd3;
    }

    .rbcMorph100x-avg-badge.empty {
      background: #f8fafc;
      color: #cbd5e1;
      border: 1px solid #f1f5f9;
      font-weight: 600;
      font-size: 9px;
    }

    /* Radio button custom styling */
    .rbcMorph100x-radio-col {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .rbcMorph100x-radio-btn {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1.5px solid #cbd5e1;
      background: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      box-sizing: border-box;
      position: relative;
    }

    .rbcMorph100x-radio-btn:hover {
      border-color: #fb7185;
      background: #fff1f2;
      transform: scale(1.08);
    }

    .rbcMorph100x-radio-btn.checked {
      border-color: #e11d48;
      background: #e11d48;
      box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.2);
    }

    .rbcMorph100x-radio-btn.checked::after {
      content: "";
      width: 4.5px;
      height: 4.5px;
      border-radius: 50%;
      background: #ffffff;
    }

    /* Single / Present column row spanning */
    .rbcMorph100x-row.single-action {
      grid-template-columns: 1fr 72px;
    }

    .rbcMorph100x-row.single-action.has-avg {
      grid-template-columns: 1fr 34px 72px;
    }

    .rbcMorph100x-present-badge-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      box-sizing: border-box;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1.5px solid #cbd5e1;
      background: #f8fafc;
      color: #475569;
      font-size: 9.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .rbcMorph100x-present-badge-btn:hover {
      border-color: #fb7185;
      background: #fff1f2;
      color: #be123c;
    }

    .rbcMorph100x-present-badge-btn.checked {
      border-color: #e11d48;
      background: #e11d48;
      color: #ffffff;
      box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.2);
    }

    .rbcMorph100x-radio-btn.disabled {
      cursor: not-allowed;
      pointer-events: none;
    }

    .rbcMorph100x-radio-btn:not(.checked).disabled {
      opacity: 0.35;
    }

    .rbcMorph100x-radio-btn.checked.disabled {
      border-color: #e11d48 !important;
      background: #e11d48 !important;
      box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.3) !important;
      opacity: 1 !important;
    }

    .rbcMorph100x-present-badge-btn:disabled,
    .rbcMorph100x-present-badge-btn.disabled {
      cursor: not-allowed;
      pointer-events: none;
    }

    .rbcMorph100x-present-badge-btn:not(.checked):disabled,
    .rbcMorph100x-present-badge-btn:not(.checked).disabled {
      opacity: 0.35;
    }

    .rbcMorph100x-present-badge-btn.checked:disabled,
    .rbcMorph100x-present-badge-btn.checked.disabled {
      border-color: #e11d48 !important;
      background: #e11d48 !important;
      color: #ffffff !important;
      box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.3) !important;
      opacity: 1 !important;
    }

    /* Visited Fields History Section (Descending) */
    .rbcMorph100x-history-container {
      margin-top: 6px;
      border: 1px solid #ffe4e6;
      border-radius: 6px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex-shrink: 0;
    }

    .rbcMorph100x-history-header {
      background: #fff1f2;
      padding: 4px 7px;
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #9f1239;
      border-bottom: 1px solid #fecdd3;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .rbcMorph100x-history-list {
      max-height: 110px;
      overflow-y: auto;
      padding: 4px 5px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      background: #fffcfc;
    }

    .rbcMorph100x-history-empty {
      font-size: 10px;
      color: #94a3b8;
      font-style: italic;
      text-align: center;
      padding: 8px 4px;
      line-height: 1.4;
    }

    .rbcMorph100x-history-item {
      background: #ffffff;
      border: 1px solid #fecdd3;
      border-radius: 5px;
      padding: 4px 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .rbcMorph100x-history-item:hover {
      background: #fff5f7;
      border-color: #fb7185;
    }

    .rbcMorph100x-history-item.active {
      border-color: #e11d48;
      background: #fff1f2;
      box-shadow: 0 0 0 1px #e11d48;
    }

    .rbcMorph100x-history-item.in-progress {
      border-style: dashed;
      background: #fafafa;
    }

    .rbcMorph100x-history-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      width: 100%;
    }

    .rbcMorph100x-history-title {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10.5px;
      font-weight: 700;
      color: #1e293b;
    }

    .rbcMorph100x-history-chevron {
      width: 10px;
      height: 10px;
      transition: transform 0.15s ease;
      color: #94a3b8;
    }

    .rbcMorph100x-history-item.expanded .rbcMorph100x-history-chevron {
      transform: rotate(90deg);
    }

    .rbcMorph100x-history-status-pill {
      font-size: 8.5px;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .rbcMorph100x-history-status-pill.normal {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }

    .rbcMorph100x-history-status-pill.abnormal {
      background: #fff1f2;
      color: #e11d48;
      border: 1px solid #fecdd3;
    }

    .rbcMorph100x-history-locked-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      font-size: 8.5px;
      font-weight: 800;
      color: #b45309;
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 1px 4px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .rbcMorph100x-history-jump-tag {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 8.5px;
      font-weight: 700;
      color: #e11d48;
      background: #fff1f2;
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid #fecdd3;
      margin-left: auto;
    }

    .rbcMorph100x-history-actions-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-top: 4px;
      margin-top: 2px;
      border-top: 1px dashed #ffe4e6;
    }

    .rbcMorph100x-history-action-btn {
      flex: 1;
      padding: 3.5px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      border: 1px solid transparent;
      outline: none;
      transition: all 0.15s ease;
      user-select: none;
      white-space: nowrap;
    }

    .rbcMorph100x-history-lock-btn {
      background: #fffbeb;
      color: #b45309;
      border-color: #fde68a;
    }

    .rbcMorph100x-history-lock-btn:hover {
      background: #fef3c7;
      border-color: #fcd34d;
      color: #92400e;
    }

    .rbcMorph100x-history-lock-btn.is-locked {
      background: #fef3c7;
      color: #92400e;
      border-color: #f59e0b;
    }

    .rbcMorph100x-history-delete-btn {
      background: #fff1f2;
      color: #be123c;
      border-color: #fecdd3;
    }

    .rbcMorph100x-history-delete-btn:hover {
      background: #ffe4e6;
      border-color: #fda4af;
      color: #9f1239;
    }

    .rbcMorph100x-history-delete-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #f1f5f9;
      color: #94a3b8;
      border-color: #e2e8f0;
    }

    .rbcMorph100x-history-details {
      font-size: 9.5px;
      color: #64748b;
      padding-top: 2px;
      border-top: 1px dashed #ffe4e6;
      line-height: 1.35;
      word-break: break-word;
    }

    /* Bottom Actions */
    .rbcMorph100x-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      margin-top: 4px;
    }

    .rbcMorph100x-bottom-actions {
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
      box-sizing: border-box;
      flex-shrink: 0;
    }

    .rbcMorph100x-btn {
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

    .rbcMorph100x-btn-secondary {
      background: #fff1f2;
      color: #be123c;
      border-color: #fecdd3;
    }

    .rbcMorph100x-btn-secondary:hover:not(:disabled) {
      background: #ffe4e6;
      color: #9f1239;
    }

    .rbcMorph100x-btn-minimize {
      width: 100%;
      background: #f8fafc;
      color: #64748b;
      border: 1px solid #e2e8f0;
      font-size: 10px;
      font-weight: 600;
      padding: 4px 8px;
    }

    .rbcMorph100x-btn-minimize:hover:not(:disabled) {
      background: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }

    .rbcMorph100x-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Review Notice */
    .rbcMorph100x-review-notice {
      background: #e0f2fe;
      border: 1px solid #bae6fd;
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 10.5px;
      color: #0369a1;
      text-align: center;
      line-height: 1.35;
      margin-bottom: 4px;
    }

    /* Semitransparent Reticle in Center of View: 97% View Height Dashed Circle in beige (#fecdd3) */
    .rbcMorph100x-reticle {
      position: fixed;
      top: 50%;
      left: 50%;
      height: 97vh;
      width: 97vh;
      max-width: 97vw;
      max-height: 97vh;
      aspect-ratio: 1 / 1;
      transform: translate(-50%, -50%) scale(0.98);
      border-radius: 50%;
      border: 3.5px dashed #fecdd3;
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
      pointer-events: none;
      z-index: 999992;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.25s ease-out;
      box-sizing: border-box;
    }

    .rbcMorph100x-reticle.visible {
      opacity: 1;
      visibility: visible;
      transform: translate(-50%, -50%) scale(1);
    }

    .rbcMorph100x-reticle-pill {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      color: #ffffff;
      border: 1.5px solid rgba(254, 205, 211, 0.75);
      border-radius: 12px;
      padding: 6px 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      pointer-events: none;
      user-select: none;
      white-space: nowrap;
      text-align: center;
    }

    .rbcMorph100x-reticle-pill-title {
      font-size: 13.5px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: #ffffff;
      line-height: 1.2;
    }

    .rbcMorph100x-reticle-pill-shortcut {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      font-size: 11px;
      color: #cbd5e1;
      line-height: 1.2;
    }

    .rbcMorph100x-reticle-pill-key {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      background: #ffe4e6;
      color: #9f1239;
      border: 1px solid #fecdd3;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 12.5px;
      font-weight: 800;
      letter-spacing: 0.3px;
    }

    .rbcMorph100x-reticle-pill-or {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: lowercase;
    }

    .rbcMorph100x-reticle-mouse-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #f1f5f9;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 1.5px 6px;
      border-radius: 4px;
    }

    .rbcMorph100x-reticle-mouse-icon {
      flex-shrink: 0;
      stroke: #fecdd3;
    }

    /* Persistent 95% Height Square Overlay */
    .rbcMorph100x-field-square {
      position: fixed;
      top: 50%;
      left: 50%;
      height: 95vh;
      width: 95vh;
      max-width: 95vw;
      max-height: 95vh;
      aspect-ratio: 1 / 1;
      transform: translate(-50%, -50%);
      border: 2px dashed #059669;
      box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.12);
      border-radius: 4px;
      pointer-events: none;
      z-index: 999990;
      opacity: 0;
      transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .rbcMorph100x-field-square.visible {
      opacity: 1;
    }

    .rbcMorph100x-field-square.abnormal {
      border-color: #e11d48;
    }

    .rbcMorph100x-field-square.normal {
      border-color: #059669;
    }

    .rbcMorph100x-field-square-pill {
      position: absolute;
      top: 12px;
      left: 12px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      color: #ffffff;
      border: 1.5px solid rgba(16, 185, 129, 0.6);
      border-radius: 9999px;
      padding: 4px 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      pointer-events: none;
      user-select: none;
      transition: border-color 0.2s ease;
    }

    .rbcMorph100x-field-square-pill.abnormal {
      border-color: rgba(244, 63, 94, 0.7);
    }

    .rbcMorph100x-field-square-pill.normal {
      border-color: rgba(16, 185, 129, 0.6);
    }

    .rbcMorph100x-field-square-delete-pill {
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: rgba(225, 29, 72, 0.92);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      color: #ffffff;
      border: 1.5px solid rgba(254, 205, 211, 0.6);
      border-radius: 9999px;
      padding: 6px 18px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 16.5px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      pointer-events: auto !important;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      z-index: 999995;
      outline: none;
    }

    .rbcMorph100x-field-square-delete-pill:hover {
      background: #be123c;
      border-color: #fda4af;
      box-shadow: 0 5px 18px rgba(225, 29, 72, 0.65);
      transform: scale(1.05);
    }

    .rbcMorph100x-field-square-lock-pill {
      position: absolute;
      bottom: 12px;
      left: 12px;
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      color: #f1f5f9;
      border: 1.5px solid rgba(255, 255, 255, 0.35);
      border-radius: 9999px;
      padding: 6px 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      display: inline-flex;
      align-items: center;
      gap: 7px;
      pointer-events: auto !important;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, color 0.15s ease;
      z-index: 999995;
      outline: none;
    }

    .rbcMorph100x-field-square-lock-pill:hover {
      background: rgba(30, 41, 59, 0.98);
      color: #fde68a;
      border-color: #fde68a;
      box-shadow: 0 5px 18px rgba(0, 0, 0, 0.55);
      transform: scale(1.05);
    }

    .rbcMorph100x-field-square-lock-pill:active {
      transform: scale(0.95);
    }

    .rbcMorph100x-field-square-locked-pill {
      position: absolute;
      bottom: 12px;
      left: 12px;
      background: rgba(30, 41, 59, 0.92);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      color: #fde68a;
      border: 1.5px solid rgba(253, 230, 138, 0.6);
      border-radius: 9999px;
      padding: 6px 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      display: inline-flex;
      align-items: center;
      gap: 7px;
      pointer-events: auto !important;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, color 0.15s ease;
      z-index: 999995;
      outline: none;
    }

    .rbcMorph100x-field-square-locked-pill:hover {
      background: rgba(180, 83, 9, 0.95);
      color: #ffffff;
      border-color: #fde68a;
      box-shadow: 0 5px 18px rgba(217, 119, 6, 0.65);
      transform: scale(1.05);
    }

    .rbcMorph100x-field-square-locked-pill:active {
      transform: scale(0.95);
    }

    .rbcMorph100x-field-square-locked-pill .locked-text,
    .rbcMorph100x-field-square-locked-pill .locked-icon {
      display: inline-flex;
      align-items: center;
    }

    .rbcMorph100x-field-square-locked-pill .unlock-text,
    .rbcMorph100x-field-square-locked-pill .unlock-icon {
      display: none;
      align-items: center;
    }

    .rbcMorph100x-field-square-locked-pill:hover .locked-text,
    .rbcMorph100x-field-square-locked-pill:hover .locked-icon {
      display: none !important;
    }

    .rbcMorph100x-field-square-locked-pill:hover .unlock-text,
    .rbcMorph100x-field-square-locked-pill:hover .unlock-icon {
      display: inline-flex !important;
    }

    /* Visited Field Map Overlay on Slide (OSD Overlay) - Always Visible */
    .rbcMorph100x-map-field-overlay {
      border: 2px dashed #059669;
      background: rgba(5, 150, 105, 0.08);
      border-radius: 4px;
      box-sizing: border-box;
      pointer-events: auto;
      cursor: pointer;
      opacity: 1;
      visibility: visible;
      transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
      z-index: 999980;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .rbcMorph100x-map-field-overlay:hover {
      background: rgba(5, 150, 105, 0.18);
      border-color: #047857;
      box-shadow: 0 0 10px rgba(5, 150, 105, 0.35);
    }

    .rbcMorph100x-map-field-overlay.abnormal {
      border-color: #e11d48;
      background: rgba(225, 29, 72, 0.08);
    }

    .rbcMorph100x-map-field-overlay.abnormal:hover {
      background: rgba(225, 29, 72, 0.18);
      border-color: #be123c;
      box-shadow: 0 0 10px rgba(225, 29, 72, 0.35);
    }

    .rbcMorph100x-map-field-overlay.normal {
      border-color: #059669;
      background: rgba(5, 150, 105, 0.08);
    }

    .rbcMorph100x-map-field-overlay.normal:hover {
      background: rgba(5, 150, 105, 0.18);
      border-color: #047857;
      box-shadow: 0 0 10px rgba(5, 150, 105, 0.35);
    }

    .rbcMorph100x-map-field-overlay.focused-field.no-fill,
    .rbcMorph100x-map-field-overlay.focused-field.no-fill:hover {
      background: transparent !important;
      box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.05);
      transition: box-shadow 0.25s ease-out;
    }

    .rbcMorph100x-map-field-overlay.focused-field.no-fill::before {
      content: "";
      position: absolute;
      top: -3000px;
      left: -3000px;
      right: -3000px;
      bottom: -3000px;
      padding: 3000px;
      box-sizing: border-box;
      pointer-events: none;
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      background: rgba(15, 23, 42, 0.04);
      mask-image: linear-gradient(#000 0 0), linear-gradient(#000 0 0);
      mask-clip: border-box, content-box;
      mask-composite: exclude;
      -webkit-mask-image: linear-gradient(#000 0 0), linear-gradient(#000 0 0);
      -webkit-mask-clip: border-box, content-box;
      -webkit-mask-composite: xor;
      opacity: 1;
      transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), backdrop-filter 0.25s ease-out;
      z-index: -1;
    }

    .rbcMorph100x-map-field-overlay.focused-field.no-fill.unblurred-exterior {
      box-shadow: none !important;
    }

    .rbcMorph100x-map-field-overlay.focused-field.no-fill.unblurred-exterior::before {
      opacity: 0;
      backdrop-filter: blur(0px);
      -webkit-backdrop-filter: blur(0px);
    }

    .rbcMorph100x-map-field-pill {
      position: absolute;
      top: 8px;
      left: 8px;
      max-width: 80%;
      box-sizing: border-box;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 9999px;
      padding: 3px 9px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      display: inline-flex;
      align-items: center;
      gap: 5px;
      pointer-events: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rbcMorph100x-map-field-pill.compact {
      top: 4px;
      left: 4px;
      max-width: 80%;
      padding: 2px 6px;
      font-size: 9px;
      gap: 4px;
    }

    .rbcMorph100x-map-field-pill span:last-child {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .rbcMorph100x-map-field-delete-pill {
      position: absolute;
      bottom: 8px;
      right: 8px;
      box-sizing: border-box;
      background: rgba(225, 29, 72, 0.92);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      color: #ffffff;
      border: 1.5px solid rgba(254, 205, 211, 0.6);
      border-radius: 9999px;
      padding: 5px 14px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      pointer-events: auto;
      cursor: pointer;
      white-space: nowrap;
      user-select: none;
      transition: background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      outline: none;
      z-index: 2;
    }

    .rbcMorph100x-map-field-delete-pill:hover {
      background: #be123c;
      border-color: #fda4af;
      box-shadow: 0 4px 14px rgba(225, 29, 72, 0.6);
      transform: scale(1.05);
    }

    .rbcMorph100x-map-field-delete-pill:active {
      transform: scale(0.95);
    }

    .rbcMorph100x-map-field-delete-pill svg {
      flex-shrink: 0;
    }

    .rbcMorph100x-map-field-lock-pill {
      position: absolute;
      bottom: 8px;
      left: 8px;
      box-sizing: border-box;
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 9999px;
      padding: 5px 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
      display: inline-flex;
      align-items: center;
      gap: 5px;
      pointer-events: auto !important;
      cursor: pointer;
      white-space: nowrap;
      user-select: none;
      transition: background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, color 0.15s ease;
      outline: none;
      z-index: 2;
    }

    .rbcMorph100x-map-field-lock-pill:hover {
      background: rgba(30, 41, 59, 0.98);
      color: #fde68a;
      border-color: #fde68a;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
      transform: scale(1.05);
    }

    .rbcMorph100x-map-field-lock-pill:active {
      transform: scale(0.95);
    }

    .rbcMorph100x-map-field-lock-pill.compact {
      display: none !important;
    }

    .rbcMorph100x-map-field-lock-pill svg {
      flex-shrink: 0;
    }

    .rbcMorph100x-map-field-locked-pill {
      position: absolute;
      bottom: 8px;
      left: 8px;
      box-sizing: border-box;
      background: rgba(30, 41, 59, 0.92);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      color: #fde68a;
      border: 1.5px solid rgba(253, 230, 138, 0.6);
      border-radius: 9999px;
      padding: 5px 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
      display: inline-flex;
      align-items: center;
      gap: 5px;
      pointer-events: auto !important;
      cursor: pointer;
      white-space: nowrap;
      user-select: none;
      transition: background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, color 0.15s ease;
      outline: none;
      z-index: 2;
    }

    .rbcMorph100x-map-field-locked-pill:hover {
      background: rgba(180, 83, 9, 0.95);
      color: #ffffff;
      border-color: #fde68a;
      box-shadow: 0 4px 14px rgba(217, 119, 6, 0.65);
      transform: scale(1.05);
    }

    .rbcMorph100x-map-field-locked-pill:active {
      transform: scale(0.95);
    }

    .rbcMorph100x-map-field-locked-pill .locked-text,
    .rbcMorph100x-map-field-locked-pill .locked-icon {
      display: inline-flex;
      align-items: center;
    }

    .rbcMorph100x-map-field-locked-pill .unlock-text,
    .rbcMorph100x-map-field-locked-pill .unlock-icon {
      display: none;
      align-items: center;
    }

    .rbcMorph100x-map-field-locked-pill:hover .locked-text,
    .rbcMorph100x-map-field-locked-pill:hover .locked-icon {
      display: none !important;
    }

    .rbcMorph100x-map-field-locked-pill:hover .unlock-text,
    .rbcMorph100x-map-field-locked-pill:hover .unlock-icon {
      display: inline-flex !important;
    }

    .rbcMorph100x-map-field-locked-pill.compact {
      display: none !important;
    }

    .rbcMorph100x-map-field-locked-pill svg {
      flex-shrink: 0;
    }

    /* Pulse animation */
    .rbcMorph100x-pulse {
      animation: rbcMorph100xPulseAnim 0.3s ease-in-out;
    }

    @keyframes rbcMorph100xPulseAnim {
      0% { transform: scale(1); }
      50% { transform: scale(1.08); }
      100% { transform: scale(1); }
    }

    /* Procedure Modal */
    .rbcMorph100x-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.65);
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

    .rbcMorph100x-modal-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }

    .rbcMorph100x-modal {
      background: #ffffff;
      color: #1f2937;
      border-radius: 14px;
      box-shadow: 0 25px 50px -12px rgba(225, 29, 72, 0.35);
      width: 100%;
      max-width: 580px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: scale(0.95) translateY(10px);
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid #fecdd3;
    }

    .rbcMorph100x-modal-backdrop.open .rbcMorph100x-modal {
      transform: scale(1) translateY(0);
    }

    .rbcMorph100x-modal-header {
      padding: 14px 18px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .rbcMorph100x-modal-title {
      font-size: 15px;
      font-weight: 700;
      color: #881337;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .rbcMorph100x-modal-close-btn {
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

    .rbcMorph100x-modal-close-btn:hover {
      background: #ffe4e6;
      color: #881337;
    }

    .rbcMorph100x-modal-body {
      padding: 16px 18px;
      overflow-y: auto;
      font-size: 12.5px;
      line-height: 1.5;
      color: #334155;
    }

    .rbcMorph100x-modal-lead {
      margin-bottom: 12px;
      font-size: 12px;
      color: #64748b;
    }

    .rbcMorph100x-steps-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 14px;
    }

    .rbcMorph100x-step-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
    }

    .rbcMorph100x-step-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #e11d48;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .rbcMorph100x-step-content {
      flex: 1;
      font-size: 12px;
    }

    .rbcMorph100x-step-title {
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 2px;
    }

    .rbcMorph100x-calc-formula {
      background: #fff1f2;
      border: 1px solid #fecdd3;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 4px;
    }

    .rbcMorph100x-calc-formula-title {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #be123c;
    }

    .rbcMorph100x-shortcuts-grid {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
    }

    .rbcMorph100x-shortcuts-title {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #475569;
      margin-bottom: 6px;
    }

    .rbcMorph100x-shortcuts-table {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px 12px;
    }

    .rbcMorph100x-shortcut-cell {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11.5px;
    }

    .rbcMorph100x-key-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9.5px;
      font-weight: 700;
      background: #ffe4e6;
      color: #be123c;
      padding: 1px 5px;
      border-radius: 3px;
      text-align: center;
    }

    .rbcMorph100x-modal-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 11.5px;
    }

    .rbcMorph100x-modal-table th, .rbcMorph100x-modal-table td {
      border: 1px solid #e2e8f0;
      padding: 5px 8px;
      text-align: left;
    }

    .rbcMorph100x-modal-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .rbcMorph100x-modal-footer {
      padding: 12px 18px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .rbcMorph100x-startup-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: #64748b;
      cursor: pointer;
    }

    .rbcMorph100x-startup-toggle input {
      cursor: pointer;
      margin: 0;
    }

    .rbcMorph100x-modal-start-btn {
      padding: 7px 18px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      background: #e11d48;
      color: #ffffff;
      border: 1px solid #be123c;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background-color 0.15s ease;
    }

    .rbcMorph100x-modal-start-btn:hover {
      background: #be123c;
    }

    /* Custom Toast */
    .rbcMorph100x-toast {
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
      box-shadow: 0 6px 18px rgba(0,0,0,0.25);
      z-index: 1000001;
      opacity: 0;
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .rbcMorph100x-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(-8px);
    }
  `;

  // Helper to reliably attach click & pointer interception for lock pills on OpenSeadragon overlays
  function attachLockPillHandlers(btn, targetFieldIdOrGetter) {
    if (!btn || btn.__lockAttached) return;
    btn.__lockAttached = true;

    const getFieldId = () => {
      if (typeof targetFieldIdOrGetter === "function") {
        return targetFieldIdOrGetter();
      }
      return targetFieldIdOrGetter || btn.getAttribute("data-field-id");
    };

    const stopEvt = (e) => {
      if (e) {
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") {
          e.stopImmediatePropagation();
        }
      }
    };

    const doLock = () => {
      const id = getFieldId();
      if (!id) return;
      const targetField = state.fields.find(f => f.id === id);
      if (!targetField) return;

      targetField.locked = true;
      state.expandedFieldIds = new Set([targetField.id]);
      jumpToField(targetField);
      soundSuccess();
      showToast(`Field ${targetField.number} locked.`);
      syncAllFieldOverlays();
      renderUI();
    };

    // Stop all pointer events from bubbling to OpenSeadragon's viewport tracker
    ["pointerdown", "mousedown", "touchstart", "pointerup", "mouseup", "touchend"].forEach(evtName => {
      btn.addEventListener(evtName, (e) => {
        stopEvt(e);
      }, { capture: true });
    });

    btn.addEventListener("click", (e) => {
      stopEvt(e);
      if (e.preventDefault) e.preventDefault();
      doLock();
    });

    // Native OpenSeadragon MouseTracker integration
    if (window.OpenSeadragon && window.OpenSeadragon.MouseTracker) {
      try {
        new window.OpenSeadragon.MouseTracker({
          element: btn,
          clickHandler: function(e) {
            if (e && e.preventDefaultAction !== undefined) {
              e.preventDefaultAction = true;
            }
            doLock();
          },
          stopDelay: 0
        });
      } catch (err) {
        console.warn("Failed to attach MouseTracker to lock button", err);
      }
    }
  }

  // Helper to reliably attach click & pointer interception for unlock pills on OpenSeadragon overlays
  function attachUnlockPillHandlers(btn, targetFieldIdOrGetter) {
    if (!btn || btn.__unlockAttached) return;
    btn.__unlockAttached = true;

    const getFieldId = () => {
      if (typeof targetFieldIdOrGetter === "function") {
        return targetFieldIdOrGetter();
      }
      return targetFieldIdOrGetter || btn.getAttribute("data-field-id");
    };

    const stopEvt = (e) => {
      if (e) {
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") {
          e.stopImmediatePropagation();
        }
      }
    };

    const doUnlock = () => {
      const id = getFieldId();
      if (!id) return;
      const targetField = state.fields.find(f => f.id === id);
      if (!targetField) return;

      targetField.locked = false;
      state.expandedFieldIds = new Set([targetField.id]);
      jumpToField(targetField);
      soundUndo();
      showToast(`Field ${targetField.number} unlocked.`);
      syncAllFieldOverlays();
      renderUI();
    };

    // Stop all pointer events from bubbling to OpenSeadragon's viewport tracker
    ["pointerdown", "mousedown", "touchstart", "pointerup", "mouseup", "touchend"].forEach(evtName => {
      btn.addEventListener(evtName, (e) => {
        stopEvt(e);
      }, { capture: true });
    });

    btn.addEventListener("click", (e) => {
      stopEvt(e);
      if (e.preventDefault) e.preventDefault();
      doUnlock();
    });

    // Native OpenSeadragon MouseTracker integration
    if (window.OpenSeadragon && window.OpenSeadragon.MouseTracker) {
      try {
        new window.OpenSeadragon.MouseTracker({
          element: btn,
          clickHandler: function(e) {
            if (e && e.preventDefaultAction !== undefined) {
              e.preventDefaultAction = true;
            }
            doUnlock();
          },
          stopDelay: 0
        });
      } catch (err) {
        console.warn("Failed to attach MouseTracker to unlock button", err);
      }
    }
  }

  // Helper to reliably attach click & pointer interception on OpenSeadragon overlays
  function attachDeletePillHandlers(btn, targetFieldIdOrGetter) {
    if (!btn || btn.__deleteAttached) return;
    btn.__deleteAttached = true;

    const getFieldId = () => {
      if (typeof targetFieldIdOrGetter === "function") {
        return targetFieldIdOrGetter();
      }
      return targetFieldIdOrGetter || btn.getAttribute("data-field-id");
    };

    const stopEvt = (e) => {
      if (e) {
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") {
          e.stopImmediatePropagation();
        }
      }
    };

    // Stop all pointer events from bubbling to OpenSeadragon's viewport tracker
    ["pointerdown", "mousedown", "touchstart", "pointerup", "mouseup", "touchend"].forEach(evtName => {
      btn.addEventListener(evtName, (e) => {
        stopEvt(e);
      }, { capture: true });
    });

    btn.addEventListener("click", (e) => {
      stopEvt(e);
      if (e.preventDefault) e.preventDefault();
      const id = getFieldId();
      if (id) deleteField(id);
    });

    // Native OpenSeadragon MouseTracker integration
    if (window.OpenSeadragon && window.OpenSeadragon.MouseTracker) {
      try {
        new window.OpenSeadragon.MouseTracker({
          element: btn,
          clickHandler: function(e) {
            if (e && e.preventDefaultAction !== undefined) {
              e.preventDefaultAction = true;
            }
            const id = getFieldId();
            if (id) deleteField(id);
          },
          stopDelay: 0
        });
      } catch (err) {
        console.warn("Failed to attach MouseTracker to delete button", err);
      }
    }
  }

  // --- PERSISTENT SQUARE OVERLAY (95% Height) & VISITED FIELDS MAP OVERLAYS ---
  function updateFieldSquarePill(fieldNum, status) {
    let squareEl = document.getElementById("rbcMorph100xFieldSquare");
    if (!squareEl) return;
    let pillEl = squareEl.querySelector(".rbcMorph100x-field-square-pill");
    if (!pillEl) {
      pillEl = document.createElement("div");
      pillEl.className = "rbcMorph100x-field-square-pill";
      squareEl.appendChild(pillEl);
    }
    const activeField = state.selectedFieldId 
      ? state.fields.find(f => f.id === state.selectedFieldId) 
      : (state.fields.length > 0 ? state.fields[state.fields.length - 1] : null);

    const isCurrentLocked = activeField ? Boolean(activeField.locked) : false;
    const currentNum = fieldNum || (activeField ? activeField.number : (state.fields.length + (!state.isReviewMode && state.activeFieldStarted ? 1 : 0)));
    const currentStat = status || (activeField ? activeField.status : (state.currentFieldStatus || "Normal"));
    const isAbnormal = currentStat === "Abnormal";
    
    squareEl.classList.toggle("abnormal", isAbnormal);
    squareEl.classList.toggle("normal", !isAbnormal);
    pillEl.classList.toggle("abnormal", isAbnormal);
    pillEl.classList.toggle("normal", !isAbnormal);

    pillEl.innerHTML = `<span>Field ${currentNum}</span>`;

    // Persistent square lock button (top right when unlocked)
    let lockBtn = squareEl.querySelector(".rbcMorph100x-field-square-lock-pill");
    if (!lockBtn) {
      lockBtn = document.createElement("button");
      lockBtn.className = "rbcMorph100x-field-square-lock-pill";
      lockBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <span>Lock</span>
      `;
      squareEl.appendChild(lockBtn);
      attachLockPillHandlers(lockBtn, () => {
        return state.selectedFieldId || (state.fields.length > 0 ? state.fields[state.fields.length - 1].id : null);
      });
    } else {
      attachLockPillHandlers(lockBtn, () => {
        return state.selectedFieldId || (state.fields.length > 0 ? state.fields[state.fields.length - 1].id : null);
      });
    }

    // Persistent square locked pill (top right when locked)
    let lockedPill = squareEl.querySelector(".rbcMorph100x-field-square-locked-pill");
    if (!lockedPill) {
      lockedPill = document.createElement("div");
      lockedPill.className = "rbcMorph100x-field-square-locked-pill";
      lockedPill.innerHTML = `
        <span class="locked-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </span>
        <span class="locked-text">Locked</span>
        <span class="unlock-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
          </svg>
        </span>
        <span class="unlock-text">Unlock</span>
      `;
      squareEl.appendChild(lockedPill);
      attachUnlockPillHandlers(lockedPill, () => {
        return state.selectedFieldId || (state.fields.length > 0 ? state.fields[state.fields.length - 1].id : null);
      });
    } else {
      attachUnlockPillHandlers(lockedPill, () => {
        return state.selectedFieldId || (state.fields.length > 0 ? state.fields[state.fields.length - 1].id : null);
      });
    }

    // Persistent square delete pill (bottom right)
    let deleteBtn = squareEl.querySelector(".rbcMorph100x-field-square-delete-pill");
    if (!deleteBtn) {
      deleteBtn = document.createElement("button");
      deleteBtn.className = "rbcMorph100x-field-square-delete-pill";
      deleteBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        <span>Delete</span>
      `;
      squareEl.appendChild(deleteBtn);
      attachDeletePillHandlers(deleteBtn, () => {
        return state.selectedFieldId || (state.fields.length > 0 ? state.fields[state.fields.length - 1].id : null);
      });
    }

    if (state.isReviewMode || state.fields.length === 0) {
      if (lockBtn) lockBtn.style.display = "none";
      if (deleteBtn) deleteBtn.style.display = "none";
      if (lockedPill) lockedPill.style.display = "none";
    } else if (isCurrentLocked) {
      if (lockBtn) lockBtn.style.display = "none";
      if (deleteBtn) deleteBtn.style.display = "none";
      if (lockedPill) lockedPill.style.display = "";
    } else {
      if (lockBtn) {
        lockBtn.style.display = "";
        lockBtn.setAttribute("title", `Lock Field ${currentNum}`);
      }
      if (deleteBtn) {
        deleteBtn.style.display = "";
        deleteBtn.setAttribute("title", `Delete Field ${currentNum}`);
      }
      if (lockedPill) lockedPill.style.display = "none";
    }
  }

  function showFieldSquare(fieldNum, status) {
    let squareEl = document.getElementById("rbcMorph100xFieldSquare");
    if (!squareEl) {
      squareEl = document.createElement("div");
      squareEl.id = "rbcMorph100xFieldSquare";
      squareEl.className = "rbcMorph100x-field-square";
      document.body.appendChild(squareEl);
    }
    const currentStat = status || state.currentFieldStatus || "Normal";
    updateFieldSquarePill(fieldNum, currentStat);
    squareEl.classList.add("visible");
  }

  function hideFieldSquare() {
    const squareEl = document.getElementById("rbcMorph100xFieldSquare");
    if (squareEl) {
      squareEl.classList.remove("visible");
    }
  }

  // --- VISITED FIELD OVERLAYS ON SLIDE ---
  const mapOverlayElements = new Map(); // fieldId -> DOMElement

  function clearAllMapOverlays() {
    const v = getViewer();
    mapOverlayElements.forEach((el, fieldId) => {
      if (v && v.removeOverlay) {
        try { v.removeOverlay(el); } catch (e) {}
      }
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    mapOverlayElements.clear();
  }

  function getFieldRectInViewportCoords(f, v) {
    if (!f) return null;
    if (f.rect && typeof f.rect.x === "number" && typeof f.rect.width === "number") {
      return f.rect;
    }
    if (!f.center) return null;
    if (!v || !v.viewport || !window.OpenSeadragon || !window.OpenSeadragon.Point) return null;

    try {
      const containerSize = v.viewport.getContainerSize();
      const fZoom = (f.zoom && f.zoom > 0) ? f.zoom : 1;
      const sizePx = Math.min(containerSize.y * 0.95, containerSize.x * 0.95);
      // In OpenSeadragon viewport coordinates, width of 1.0 = containerSize.x * zoom pixels.
      const vpSize = sizePx / (containerSize.x * fZoom);
      return {
        x: f.center.x - (vpSize / 2),
        y: f.center.y - (vpSize / 2),
        width: vpSize,
        height: vpSize
      };
    } catch (e) {
      return null;
    }
  }

  function updateFieldOverlaysVisibility() {
    const v = getViewer();
    if (!v || !v.viewport) return;

    let containerHeight = 0;
    try {
      const containerSize = v.viewport.getContainerSize();
      if (containerSize && containerSize.y > 0) {
        containerHeight = containerSize.y;
      }
    } catch (e) {}
    if (!containerHeight) {
      containerHeight = window.innerHeight || 800;
    }
    const fillThresholdPx = containerHeight * 0.8;
    const compactThresholdPx = containerHeight * 0.5;

    const activeFocusedFieldId = state.selectedFieldId || (state.fields.length > 0 ? state.fields[state.fields.length - 1].id : null);

    state.fields.forEach(f => {
      if (!f || !f.id || !f.center) return;

      let el = mapOverlayElements.get(f.id);
      const fRect = getFieldRectInViewportCoords(f, v);
      if (!fRect) return;

      let renderedHeight = el ? (el.offsetHeight || 0) : 0;
      if (!renderedHeight && fRect) {
        try {
          const currentZoom = v.viewport.getZoom(true);
          const containerSize = v.viewport.getContainerSize();
          renderedHeight = fRect.height * containerSize.x * currentZoom;
        } catch (e) {}
      }

      const isCompact = renderedHeight < compactThresholdPx;
      const isLarge = renderedHeight > fillThresholdPx;
      const isFocusedField = (f.id === activeFocusedFieldId) && isLarge;
      const isAbnormal = f.status === "Abnormal";
      const isLocked = Boolean(f.locked);
      const labelText = `Field ${f.number}`;
      const showLock = !isCompact && !state.isReviewMode && !isLocked;
      const showDelete = !isCompact && !state.isReviewMode && !isLocked;
      const showLocked = !isCompact && !state.isReviewMode && isLocked;

      if (!el) {
        el = document.createElement("div");
        el.id = "rbcMapOverlay_" + f.id;
        el.className = `rbcMorph100x-map-field-overlay ${isAbnormal ? "abnormal" : "normal"} ${isLarge ? "no-fill" : ""} ${isFocusedField ? "focused-field" : ""}`;
        el.innerHTML = `
          <div class="rbcMorph100x-map-field-pill ${isCompact ? "compact" : ""}">
            <span>${labelText}</span>
          </div>
          <button class="rbcMorph100x-map-field-lock-pill ${isCompact ? "compact" : ""}" data-field-id="${f.id}" title="Lock Field ${f.number}" ${showLock ? '' : 'style="display:none;"'}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Lock</span>
          </button>
          <button class="rbcMorph100x-map-field-delete-pill ${isCompact ? "compact" : ""}" data-field-id="${f.id}" title="Delete Field ${f.number}" ${showDelete ? '' : 'style="display:none;"'}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Delete</span>
          </button>
          <div class="rbcMorph100x-map-field-locked-pill ${isCompact ? "compact" : ""}" data-field-id="${f.id}" title="Locked - Click to unlock" ${showLocked ? '' : 'style="display:none;"'}>
            <span class="locked-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </span>
            <span class="locked-text">Locked</span>
            <span class="unlock-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
              </svg>
            </span>
            <span class="unlock-text">Unlock</span>
          </div>
        `;

        const lockBtn = el.querySelector(".rbcMorph100x-map-field-lock-pill");
        if (lockBtn) {
          attachLockPillHandlers(lockBtn, f.id);
        }

        const deleteBtn = el.querySelector(".rbcMorph100x-map-field-delete-pill");
        if (deleteBtn) {
          attachDeletePillHandlers(deleteBtn, f.id);
        }

        const lockedPill = el.querySelector(".rbcMorph100x-map-field-locked-pill");
        if (lockedPill) {
          attachUnlockPillHandlers(lockedPill, f.id);
        }

        el.addEventListener("click", (e) => {
          if (e.target.closest(".rbcMorph100x-map-field-lock-pill") || e.target.closest(".rbcMorph100x-map-field-delete-pill") || e.target.closest(".rbcMorph100x-map-field-locked-pill")) return;
          e.stopPropagation();
          // Mimic clicking on the respective field in the visited log: only expand active field
          state.expandedFieldIds = new Set([f.id]);
          jumpToField(f);
          renderUI();
        });

        if (window.OpenSeadragon && window.OpenSeadragon.Rect && v.addOverlay) {
          const osdRect = new window.OpenSeadragon.Rect(fRect.x, fRect.y, fRect.width, fRect.height);
          try {
            v.addOverlay({
              element: el,
              location: osdRect
            });
            mapOverlayElements.set(f.id, el);
          } catch (err) {
            console.warn("Failed to add OSD overlay for field", f.id, err);
          }
        }
      } else {
        // Ensure class and pill text reflect current field status and compact mode
        el.classList.toggle("abnormal", isAbnormal);
        el.classList.toggle("normal", !isAbnormal);
        el.classList.toggle("no-fill", isLarge);
        el.classList.toggle("focused-field", isFocusedField);
        if (!isFocusedField) {
          el.classList.remove("unblurred-exterior");
        }

        const pill = el.querySelector(".rbcMorph100x-map-field-pill");
        if (pill) {
          pill.classList.toggle("compact", isCompact);
        }

        const pillText = el.querySelector(".rbcMorph100x-map-field-pill span:last-child");
        if (pillText && pillText.textContent !== labelText) {
          pillText.textContent = labelText;
        }

        let lockPill = el.querySelector(".rbcMorph100x-map-field-lock-pill");
        if (!lockPill) {
          lockPill = document.createElement("button");
          lockPill.className = `rbcMorph100x-map-field-lock-pill ${isCompact ? "compact" : ""}`;
          lockPill.setAttribute("data-field-id", f.id);
          lockPill.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Lock</span>
          `;
          el.appendChild(lockPill);
          attachLockPillHandlers(lockPill, f.id);
        } else {
          lockPill.setAttribute("data-field-id", f.id);
          attachLockPillHandlers(lockPill, f.id);
        }

        lockPill.classList.toggle("compact", isCompact);
        lockPill.setAttribute("title", `Lock Field ${f.number}`);
        lockPill.style.display = showLock ? "" : "none";

        let deletePill = el.querySelector(".rbcMorph100x-map-field-delete-pill");
        if (!deletePill) {
          deletePill = document.createElement("button");
          deletePill.className = `rbcMorph100x-map-field-delete-pill ${isCompact ? "compact" : ""}`;
          deletePill.setAttribute("data-field-id", f.id);
          deletePill.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Delete</span>
          `;
          el.appendChild(deletePill);
          attachDeletePillHandlers(deletePill, f.id);
        } else {
          deletePill.setAttribute("data-field-id", f.id);
          attachDeletePillHandlers(deletePill, f.id);
        }

        deletePill.classList.toggle("compact", isCompact);
        deletePill.setAttribute("title", `Delete Field ${f.number}`);
        deletePill.style.display = showDelete ? "" : "none";

        let lockedPill = el.querySelector(".rbcMorph100x-map-field-locked-pill");
        if (!lockedPill) {
          lockedPill = document.createElement("div");
          lockedPill.className = `rbcMorph100x-map-field-locked-pill ${isCompact ? "compact" : ""}`;
          lockedPill.setAttribute("data-field-id", f.id);
          lockedPill.setAttribute("title", "Locked - Click to unlock");
          lockedPill.innerHTML = `
            <span class="locked-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </span>
            <span class="locked-text">Locked</span>
            <span class="unlock-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
              </svg>
            </span>
            <span class="unlock-text">Unlock</span>
          `;
          el.appendChild(lockedPill);
          attachUnlockPillHandlers(lockedPill, f.id);
        } else {
          lockedPill.setAttribute("data-field-id", f.id);
          lockedPill.setAttribute("title", "Locked - Click to unlock");
          attachUnlockPillHandlers(lockedPill, f.id);
        }
        lockedPill.classList.toggle("compact", isCompact);
        lockedPill.style.display = showLocked ? "" : "none";
      }
    });
  }

  function syncAllFieldOverlays() {
    const v = getViewer();
    if (!v || !v.viewport) return;

    // Remove overlays for fields no longer in state.fields
    const currentIds = new Set(state.fields.map(f => f.id));
    mapOverlayElements.forEach((el, id) => {
      if (!currentIds.has(id)) {
        if (v.removeOverlay) {
          try { v.removeOverlay(el); } catch (e) {}
        }
        if (el.parentNode) el.parentNode.removeChild(el);
        mapOverlayElements.delete(id);
      }
    });

    updateFieldOverlaysVisibility();
  }

  // --- RETICLE ON PAN / ZOOM ---
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

  let reticleFadeTimer = null;
  let isReticlePointerDown = false;

  function findObservedFieldAtPoint(pt, v) {
    if (!pt || !v || !state.fields || state.fields.length === 0) return null;
    for (let i = state.fields.length - 1; i >= 0; i--) {
      const f = state.fields[i];
      const fRect = getFieldRectInViewportCoords(f, v);
      if (!fRect) continue;
      if (
        pt.x >= fRect.x &&
        pt.x <= (fRect.x + fRect.width) &&
        pt.y >= fRect.y &&
        pt.y <= (fRect.y + fRect.height)
      ) {
        return f;
      }
    }
    return null;
  }

  function findObservedFieldAtCurrentView() {
    const v = getViewer();
    if (!v || !v.viewport || !state.fields || state.fields.length === 0) return null;
    let center = null;
    try {
      center = v.viewport.getCenter(true);
    } catch (e) {
      return null;
    }
    return findObservedFieldAtPoint(center, v);
  }

  function isCurrentViewInsideObservedField() {
    return Boolean(findObservedFieldAtCurrentView());
  }

  function createReticleElement() {
    let reticleEl = document.getElementById("rbcMorph100xReticle");
    if (!reticleEl) {
      reticleEl = document.createElement("div");
      reticleEl.id = "rbcMorph100xReticle";
      reticleEl.className = "rbcMorph100x-reticle";
      reticleEl.innerHTML = `
        <div class="rbcMorph100x-reticle-pill">
          <div class="rbcMorph100x-reticle-pill-title">Observe</div>
          <div class="rbcMorph100x-reticle-pill-shortcut">
            <span class="rbcMorph100x-reticle-pill-key">[1]</span>
            <span class="rbcMorph100x-reticle-pill-or">or</span>
            <span class="rbcMorph100x-reticle-mouse-badge">
              <svg class="rbcMorph100x-reticle-mouse-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="2" width="12" height="20" rx="6"></rect>
                <line x1="12" y1="6" x2="12" y2="10"></line>
              </svg>
              <span>Double Click</span>
            </span>
          </div>
        </div>
      `;
      document.body.appendChild(reticleEl);
    }
    return reticleEl;
  }

  function isRbcActive() {
    if (state.minimized) return false;
    if (state.isReviewMode) return false;
    const diffWrapper = document.getElementById("diff100xWrapper");
    if (diffWrapper && !diffWrapper.classList.contains("minimized")) {
      return false;
    }
    const counterWrapper = document.getElementById("counter100xWrapper");
    if (counterWrapper && !counterWrapper.classList.contains("minimized")) {
      return false;
    }
    if (window.__Differential100XInitialized && window.__Differential100X && typeof window.__Differential100X.isMinimized === "function" && !window.__Differential100X.isMinimized()) {
      return false;
    }
    if (window.__Counter100X && typeof window.__Counter100X.isMinimized === "function" && !window.__Counter100X.isMinimized()) {
      return false;
    }
    return true;
  }

  function showReticle() {
    let reticleEl = document.getElementById("rbcMorph100xReticle");
    if (!reticleEl) {
      reticleEl = createReticleElement();
    }
    if (!reticleEl) return;

    if (!isRbcActive() || isCurrentViewInsideObservedField()) {
      reticleEl.classList.remove("visible");
      if (reticleFadeTimer) {
        clearTimeout(reticleFadeTimer);
        reticleFadeTimer = null;
      }
      return;
    }

    if (reticleFadeTimer) {
      clearTimeout(reticleFadeTimer);
      reticleFadeTimer = null;
    }
    reticleEl.classList.add("visible");
  }

  function triggerReticleActive(delay = 450) {
    if (!isRbcActive() || isCurrentViewInsideObservedField()) {
      let reticleEl = document.getElementById("rbcMorph100xReticle");
      if (reticleEl) {
        reticleEl.classList.remove("visible");
      }
      if (reticleFadeTimer) {
        clearTimeout(reticleFadeTimer);
        reticleFadeTimer = null;
      }
      return;
    }

    showReticle();

    if (!isReticlePointerDown) {
      if (reticleFadeTimer) {
        clearTimeout(reticleFadeTimer);
      }
      reticleFadeTimer = setTimeout(() => {
        let reticleEl = document.getElementById("rbcMorph100xReticle");
        if (reticleEl && !isReticlePointerDown) {
          reticleEl.classList.remove("visible");
        }
        reticleFadeTimer = null;
      }, delay);
    }
  }

  let initialOriginalViewport = null;
  function captureInitialViewport() {
    const v = getViewer();
    if (!v || !v.viewport) return;
    if (v.isOpen && v.isOpen()) {
      if (!initialOriginalViewport) {
        initialOriginalViewport = {
          center: { x: v.viewport.getCenter().x, y: v.viewport.getCenter().y },
          zoom: v.viewport.getZoom()
        };
      }
    }
  }

  function restoreInitialOriginalViewport(smooth = true) {
    const v = getViewer();
    if (!v || !v.viewport) return;
    if (typeof v.viewport.goHome === "function") {
      v.viewport.goHome(!smooth);
    } else if (initialOriginalViewport) {
      if (smooth && typeof smoothPanAndZoomTo === "function") {
        smoothPanAndZoomTo(v, initialOriginalViewport.center, initialOriginalViewport.zoom);
      } else {
        const centerPt = new window.OpenSeadragon.Point(initialOriginalViewport.center.x, initialOriginalViewport.center.y);
        v.viewport.panTo(centerPt, true);
        v.viewport.zoomTo(initialOriginalViewport.zoom, centerPt, true);
        v.viewport.applyConstraints();
      }
    }
  }

  function attachViewerPanZoomListeners() {
    const v = getViewer();
    if (!v) {
      setTimeout(attachViewerPanZoomListeners, 300);
      return;
    }

    if (v && v.addHandler && !v.__rbcOverlaysHandlersAttached) {
      v.__rbcOverlaysHandlersAttached = true;
      v.addHandler("open", () => {
        if (!initialOriginalViewport && v.viewport) {
          initialOriginalViewport = {
            center: { x: v.viewport.getCenter().x, y: v.viewport.getCenter().y },
            zoom: v.viewport.getZoom()
          };
        }
        setTimeout(syncAllFieldOverlays, 300);
      });
      if (v.isOpen && v.isOpen() && !initialOriginalViewport && v.viewport) {
        initialOriginalViewport = {
          center: { x: v.viewport.getCenter().x, y: v.viewport.getCenter().y },
          zoom: v.viewport.getZoom()
        };
      }

      const handleUserPanZoom = (event) => {
        if (isWindowResizing) return;
        if (event && event.type === "resize") return;

        triggerReticleActive();
        updateFieldOverlaysVisibility();
      };

      const handlePointerPress = () => {
        if (!isRbcActive()) return;
        isReticlePointerDown = true;
        showReticle();
      };

      const handlePointerRelease = () => {
        isReticlePointerDown = false;
        if (!isRbcActive()) {
          const reticleEl = document.getElementById("rbcMorph100xReticle");
          if (reticleEl) reticleEl.classList.remove("visible");
          if (reticleFadeTimer) {
            clearTimeout(reticleFadeTimer);
            reticleFadeTimer = null;
          }
          return;
        }
        triggerReticleActive(450);
      };

      const handleDoubleClick = (event) => {
        if (event && event.preventDefaultAction !== undefined) {
          event.preventDefaultAction = true;
        }
        if (!isRbcActive()) return;

        // Check if double click was within an existing observed field
        let clickVp = null;
        if (event && event.position && v && v.viewport && v.viewport.pointFromPixel) {
          try {
            clickVp = v.viewport.pointFromPixel(event.position);
          } catch (e) {}
        }

        const matchedField = (clickVp && findObservedFieldAtPoint(clickVp, v)) || findObservedFieldAtCurrentView();
        if (matchedField) {
          // Mimic the action of clicking the respective field from the log
          if (state.expandedFieldIds.has(matchedField.id)) {
            state.expandedFieldIds.clear();
          } else {
            state.expandedFieldIds = new Set([matchedField.id]);
          }
          jumpToField(matchedField);
          renderUI();
          return;
        }

        handleNewField();
      };

      const handleCanvasClick = (event) => {
        if (!v || !v.viewport || !v.viewport.pointFromPixel) return;
        if (!isRbcActive()) {
          return;
        }

        let clickVp = null;
        if (event && event.position) {
          try {
            clickVp = v.viewport.pointFromPixel(event.position);
          } catch (e) {}
        }

        const matchedField = clickVp ? findObservedFieldAtPoint(clickVp, v) : null;
        if (matchedField) {
          if (event && event.preventDefaultAction !== undefined) {
            event.preventDefaultAction = true;
          }
          state.expandedFieldIds = new Set([matchedField.id]);
          jumpToField(matchedField);
          renderUI();
        }
      };

      v.addHandler("pan", handleUserPanZoom);
      v.addHandler("zoom", handleUserPanZoom);
      v.addHandler("animation", handleUserPanZoom);
      v.addHandler("canvas-drag", handleUserPanZoom);
      v.addHandler("canvas-scroll", handleUserPanZoom);
      v.addHandler("canvas-pinch", handleUserPanZoom);
      v.addHandler("canvas-press", handlePointerPress);
      v.addHandler("canvas-release", handlePointerRelease);
      v.addHandler("canvas-click", handleCanvasClick);
      v.addHandler("canvas-double-click", handleDoubleClick);

      let mouseMoveThrottle = false;
      const handleViewerMouseMove = (e) => {
        if (mouseMoveThrottle) return;
        mouseMoveThrottle = true;
        requestAnimationFrame(() => {
          mouseMoveThrottle = false;
          if (!v || !v.viewport || !v.viewport.pointFromPixel) return;
          try {
            const rect = v.element.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            if (mouseX < 0 || mouseY < 0 || mouseX > rect.width || mouseY > rect.height) {
              mapOverlayElements.forEach(el => el.classList.remove("unblurred-exterior"));
              return;
            }

            const activeFieldId = state.selectedFieldId || (state.fields.length > 0 ? state.fields[state.fields.length - 1].id : null);
            const activeOverlayEl = activeFieldId ? mapOverlayElements.get(activeFieldId) : null;

            if (!activeOverlayEl || !activeOverlayEl.classList.contains("focused-field") || !activeOverlayEl.classList.contains("no-fill")) {
              mapOverlayElements.forEach(el => el.classList.remove("unblurred-exterior"));
              return;
            }

            const activeField = state.fields.find(field => field.id === activeFieldId);
            if (!activeField) return;
            const fRect = getFieldRectInViewportCoords(activeField, v);
            if (!fRect) return;

            const vpPt = v.viewport.pointFromPixel(new window.OpenSeadragon.Point(mouseX, mouseY));
            const isInside = (
              vpPt.x >= fRect.x &&
              vpPt.x <= (fRect.x + fRect.width) &&
              vpPt.y >= fRect.y &&
              vpPt.y <= (fRect.y + fRect.height)
            );

            // Inside active field square: exterior blurred. Outside active field (exterior): unblur.
            if (isInside) {
              activeOverlayEl.classList.remove("unblurred-exterior");
            } else {
              activeOverlayEl.classList.add("unblurred-exterior");
            }
          } catch (err) {}
        });
      };

      // Listen on viewer element for immediate press and release
      if (v.element) {
        v.element.addEventListener("mousedown", handlePointerPress);
        v.element.addEventListener("mouseup", handlePointerRelease);
        v.element.addEventListener("touchstart", handlePointerPress, { passive: true });
        v.element.addEventListener("touchend", handlePointerRelease, { passive: true });
        v.element.addEventListener("mousemove", handleViewerMouseMove, { passive: true });
        v.element.addEventListener("mouseleave", () => {
          mapOverlayElements.forEach(el => el.classList.remove("unblurred-exterior"));
        });
      }
      document.addEventListener("mouseup", handlePointerRelease);
    }
  }

  function showToast(msg, icon = "✓") {
    let toast = document.getElementById("rbcMorph100xToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "rbcMorph100xToast";
      toast.className = "rbcMorph100x-toast";
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2400);
  }

  function pulseElement(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove("rbcMorph100x-pulse");
      void el.offsetWidth;
      el.classList.add("rbcMorph100x-pulse");
    }
  }

  // --- VIEWPORT CAPTURE & NAVIGATION ---
  function captureCurrentViewport() {
    const v = getViewer();
    if (v && v.viewport && window.OpenSeadragon && window.OpenSeadragon.Point) {
      const center = v.viewport.getCenter(true);
      const zoom = v.viewport.getZoom(true);
      let rect = null;
      try {
        const containerSize = v.viewport.getContainerSize();
        if (containerSize && containerSize.x > 0 && containerSize.y > 0) {
          const sizePx = Math.min(containerSize.y * 0.95, containerSize.x * 0.95);
          const leftPx = (containerSize.x - sizePx) / 2;
          const topPx = (containerSize.y - sizePx) / 2;

          const topLeftVp = v.viewport.pointFromPixel(new window.OpenSeadragon.Point(leftPx, topPx), true);
          const bottomRightVp = v.viewport.pointFromPixel(new window.OpenSeadragon.Point(leftPx + sizePx, topPx + sizePx), true);

          rect = {
            x: topLeftVp.x,
            y: topLeftVp.y,
            width: bottomRightVp.x - topLeftVp.x,
            height: bottomRightVp.y - topLeftVp.y
          };
        }
      } catch (e) {
        console.warn("Could not calculate exact viewport rect", e);
      }

      return {
        center: { x: center.x, y: center.y },
        zoom: zoom,
        rect: rect
      };
    }
    return { center: { x: 0.5, y: 0.5 }, zoom: 1, rect: null };
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

    if (!v.__rbcGlideUserHandlersAttached && v.addHandler) {
      v.__rbcGlideUserHandlersAttached = true;
      const cancelGlide = () => {
        if (currentGlideAnimId) {
          cancelAnimationFrame(currentGlideAnimId);
          currentGlideAnimId = null;
        }
      };
      v.addHandler("canvas-drag", cancelGlide);
      v.addHandler("canvas-press", cancelGlide);
      v.addHandler("canvas-scroll", cancelGlide);
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
      triggerReticleActive();

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

  function jumpToField(field) {
    if (!field) return;
    state.selectedFieldId = field.id;
    state.expandedFieldIds = new Set([field.id]);
    state.currentFieldSelections = { ...(field.selections || {}) };
    state.currentFieldStatus = field.status || (Object.keys(state.currentFieldSelections).length > 0 ? "Abnormal" : "Normal");

    const listEl = document.getElementById("rbcMorph100xHistoryList");
    if (listEl) {
      const items = listEl.querySelectorAll(".rbcMorph100x-history-item");
      items.forEach(item => {
        if (item.getAttribute("data-id") === field.id) {
          item.classList.add("active");
          if (typeof item.scrollIntoView === "function") {
            item.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }
        } else {
          item.classList.remove("active");
        }
      });
    }

    const v = getViewer();
    if (!v || !v.viewport) {
      console.warn("OpenSeadragon viewer not yet ready.");
      return;
    }

    soundSuccess();
    smoothPanAndZoomTo(v, field.center, field.zoom, 450);
  }

  function deleteField(fieldId) {
    if (state.isReviewMode) return;
    const idx = state.fields.findIndex(f => f.id === fieldId);
    if (idx === -1) return;

    const deletedField = state.fields.splice(idx, 1)[0];
    state.expandedFieldIds.delete(fieldId);

    // Re-index remaining fields sequentially
    state.fields.forEach((f, i) => {
      f.number = i + 1;
    });

    // If deleted field was the currently selected/active field, select adjacent or reset
    if (state.selectedFieldId === fieldId) {
      if (state.fields.length > 0) {
        const nextSelectedIdx = Math.min(idx, state.fields.length - 1);
        const nextField = state.fields[nextSelectedIdx];
        state.selectedFieldId = nextField.id;
        state.expandedFieldIds = new Set([nextField.id]);
        state.currentFieldSelections = { ...(nextField.selections || {}) };
        state.currentFieldStatus = nextField.status || "Normal";
        state.activeFieldViewport = {
          center: nextField.center,
          zoom: nextField.zoom,
          rect: nextField.rect
        };
      } else {
        state.selectedFieldId = null;
        state.expandedFieldIds.clear();
        state.currentFieldSelections = {};
        state.currentFieldStatus = "Normal";
        state.activeFieldStarted = false;
        state.activeFieldViewport = null;
        hideFieldSquare();
      }
    }

    soundUndo();
    state.avgRevealed = false;
    syncAllFieldOverlays();
    renderUI();
    showToast(`Field ${deletedField.number} deleted.`);
  }

  function scrollHistoryListToTop(smooth = true) {
    requestAnimationFrame(() => {
      const listEl = document.getElementById("rbcMorph100xHistoryList");
      if (!listEl) return;
      if (smooth && typeof listEl.scrollTo === "function") {
        listEl.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      } else {
        listEl.scrollTop = 0;
      }
    });
  }

  // --- MORPHOLOGY FORMATTING & AVERAGE CALCULATION ---
  function calculateMorphologyAverages(fields) {
    const averages = {};
    if (!fields || fields.length === 0) return averages;

    const totalFields = fields.length;

    MORPHOLOGY_SECTIONS.forEach(sec => {
      sec.items.forEach(item => {
        if (sec.hasGrades) {
          let sumGrade = 0;
          fields.forEach(f => {
            const val = f.selections ? f.selections[item.id] : null;
            if (val === "1+") sumGrade += 1;
            else if (val === "2+") sumGrade += 2;
            else if (val === "3+") sumGrade += 3;
          });
          const mean = sumGrade / totalFields;
          let grade = "";
          if (mean < 0.5) {
            grade = "";
          } else if (mean < 1.5) {
            grade = "1+";
          } else if (mean < 2.5) {
            grade = "2+";
          } else {
            grade = "3+";
          }
          averages[item.id] = {
            grade: grade,
            mean: mean
          };
        } else {
          // Qualitative / Inclusions: Present if observed in any field
          let presentCount = 0;
          fields.forEach(f => {
            const val = f.selections ? f.selections[item.id] : null;
            if (val === "Present") presentCount++;
          });
          averages[item.id] = {
            grade: presentCount > 0 ? "Present" : "",
            count: presentCount,
            total: totalFields
          };
        }
      });
    });

    return averages;
  }

  function formatSelectionsSummary(selections) {
    const keys = Object.keys(selections || {}).filter(k => Boolean(selections[k]));
    if (keys.length === 0) {
      return "Normal (Normocytic, normochromic)";
    }

    const sizeItems = [];
    const shapeItems = [];
    const inclusionItems = [];

    keys.forEach(k => {
      const val = selections[k];
      if (!val) return;
      const def = ITEM_MAP[k];
      if (!def) return;

      if (def.category === "size" || def.category === "color") {
        sizeItems.push(`${def.name} (${val})`);
      } else if (def.category === "shape") {
        shapeItems.push(`${def.name} (${val})`);
      } else if (def.category === "inclusion" || def.category === "distribution") {
        inclusionItems.push(`${def.name} (${val})`);
      }
    });

    const parts = [];
    if (sizeItems.length > 0) parts.push(sizeItems.join(", "));
    if (shapeItems.length > 0) parts.push(shapeItems.join(", "));
    if (inclusionItems.length > 0) parts.push(inclusionItems.join(", "));

    return parts.length > 0 ? parts.join("; ") : "Abnormal RBC morphology";
  }

  function getAllFieldsForShare() {
    return state.fields.slice();
  }

  function getSharePayload() {
    const fieldsToShare = getAllFieldsForShare();
    if (fieldsToShare.length === 0) return null;

    const compactFields = fieldsToShare.map(f => ({
      n: f.number,
      s: f.status === "Normal" ? 0 : 1,
      sel: f.selections || {},
      x: Math.round(f.center.x * 100000) / 100000,
      y: Math.round(f.center.y * 100000) / 100000,
      z: Math.round(f.zoom * 100000) / 100000
    }));

    const jsonStr = JSON.stringify(compactFields);
    return btoa(encodeURIComponent(jsonStr));
  }

  function generateShareUrl() {
    if (typeof window.__generateUnifiedLabShareUrl === "function") {
      const unified = window.__generateUnifiedLabShareUrl();
      if (unified) return unified;
    }
    const encoded = getSharePayload();
    if (!encoded) return null;

    const url = new URL(window.location.href);
    url.searchParams.set("rbc_review", encoded);
    return url.toString();
  }

  function copyShareLink() {
    const totalFields = state.fields.length;
    if (totalFields === 0 && !state.isReviewMode) {
      soundError();
      showToast("Start a field before sharing.", "ℹ");
      return;
    }

    if (!state.isReviewMode && (totalFields < 10 || !state.avgRevealed)) {
      soundError();
      if (totalFields < 10) {
        showToast("First complete 10 fields before sharing.", "ℹ");
      } else {
        showToast("Click 'Complete & Calculate Avg' before sharing.", "ℹ");
      }
      return;
    }

    const shareUrl = generateShareUrl();
    if (!shareUrl) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        soundSuccess();
        showToast("Review link copied to clipboard!");
      }).catch(() => {
        fallbackCopy(shareUrl);
      });
    } else {
      fallbackCopy(shareUrl);
    }
  }

  function fallbackCopy(text) {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      soundSuccess();
      showToast("Review link copied to clipboard!");
    } catch (e) {
      window.prompt("Copy this review link:", text);
    }
  }

  function cleanUrlReviewParam() {
    try {
      const url = new URL(window.location.href);
      let changed = false;
      if (url.searchParams.has("rbc_review")) {
        url.searchParams.delete("rbc_review");
        changed = true;
      }
      if (url.searchParams.has("rbc")) {
        url.searchParams.delete("rbc");
        changed = true;
      }
      if (changed) {
        const cleanPath = url.pathname + (url.search ? url.search : "") + url.hash;
        window.history.replaceState({}, document.title, cleanPath);
      }
    } catch (e) {
      console.error("Failed to clean rbc review param from URL:", e);
    }
  }

  function exitReviewMode() {
    state.isReviewMode = false;
    state.fields = [];
    state.activeFieldStarted = false;
    state.activeFieldViewport = null;
    state.currentFieldSelections = {};
    state.currentFieldStatus = "Normal";
    state.selectedFieldId = null;
    state.expandedFieldIds.clear();
    state.avgRevealed = false;
    state.expandedReviewSections.clear();
    hideFieldSquare();
    clearAllMapOverlays();

    restoreInitialOriginalViewport(true);

    cleanUrlReviewParam();
    soundUndo();
    showToast("Exited review mode. Started fresh evaluation.");
    renderUI();
  }

  function loadReviewFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const reviewParam = params.get("rbc_review") || params.get("rbc");
    if (!reviewParam) return false;

    cleanUrlReviewParam();

    try {
      let rawFields = null;
      try {
        const decodedJson = decodeURIComponent(atob(reviewParam));
        rawFields = JSON.parse(decodedJson);
      } catch (e) {
        const decodedJson = decodeURIComponent(reviewParam);
        rawFields = JSON.parse(decodedJson);
      }

      if (Array.isArray(rawFields) && rawFields.length > 0) {
        state.fields = rawFields.map((f, i) => {
          const fieldId = "f_rev_" + (i + 1);
          const selections = f.sel || f.selections || {};
          const status = (f.s === 1 || f.status === "Abnormal") ? "Abnormal" : "Normal";
          return {
            id: fieldId,
            number: f.n !== undefined ? f.n : (i + 1),
            status: status,
            selections: selections,
            center: { x: f.x !== undefined ? f.x : 0.5, y: f.y !== undefined ? f.y : 0.5 },
            zoom: f.z !== undefined ? f.z : 1,
            summary: formatSelectionsSummary(selections)
          };
        });
        state.isReviewMode = true;
        state.minimized = false;
        state.activeFieldStarted = true;
        state.expandedReviewSections.clear();
        const firstField = state.fields[0];
        state.selectedFieldId = firstField.id;
        state.currentFieldSelections = { ...(firstField.selections || {}) };
        state.currentFieldStatus = firstField.status || (Object.keys(state.currentFieldSelections).length > 0 ? "Abnormal" : "Normal");
        state.expandedFieldIds = new Set([firstField.id]);

        // Collapse other tasks
        if (window.__Differential100X && typeof window.__Differential100X.collapse === "function") {
          window.__Differential100X.collapse();
        }
        if (window.__Differential100X && typeof window.__Differential100X.closeProcedure === "function") {
          window.__Differential100X.closeProcedure();
        }
        if (window.__Counter100X && typeof window.__Counter100X.collapse === "function") {
          window.__Counter100X.collapse();
        }
        if (window.__Counter100X && typeof window.__Counter100X.closeProcedure === "function") {
          window.__Counter100X.closeProcedure();
        }

        // Close any startup modal backdrop or procedure modals
        const taskBackdrop = document.getElementById("labTaskSelectionModalBackdrop");
        if (taskBackdrop) taskBackdrop.classList.remove("open");
        closeProcedureModal();

        // Ensure reticle is hidden in review mode
        let reticleEl = document.getElementById("rbcMorph100xReticle");
        if (reticleEl) reticleEl.classList.remove("visible");

        // Maintain initial original page zoom pan state
        restoreInitialOriginalViewport(false);
        return true;
      }
    } catch (err) {
      console.error("Failed to parse RBC review state from URL:", err);
    }
    return false;
  }

  // --- BADGE STATUS ---
  function getBadgeStatus() {
    const totalFields = state.fields.length;
    if (totalFields === 0) {
      return { text: "PERFORM", className: "perform", isComplete: false };
    }
    if ((totalFields >= 10 && state.avgRevealed) || state.isReviewMode) {
      return { text: "COMPLETE", className: "complete", isComplete: true };
    }
    return { text: "IN PROGRESS", className: "in-progress", isComplete: false };
  }

  // --- FIELD EVALUATION ACTIONS ---
  let lastNewFieldTime = 0;
  function handleNewField() {
    if (state.isReviewMode) return;
    const now = Date.now();
    if (now - lastNewFieldTime < 350) return;
    lastNewFieldTime = now;

    attachViewerPanZoomListeners();

    state.activeFieldStarted = true;

    // Reset morphology task selections to Normal for the newly observed field
    state.currentFieldSelections = {};
    state.currentFieldStatus = "Normal";

    const currentVp = captureCurrentViewport();
    const fieldNum = state.fields.length + 1;

    const fieldRecord = {
      id: "f_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      number: fieldNum,
      status: "Normal",
      locked: false,
      selections: {},
      center: currentVp.center,
      zoom: currentVp.zoom,
      rect: currentVp.rect,
      summary: formatSelectionsSummary({})
    };

    state.fields.push(fieldRecord);
    state.selectedFieldId = fieldRecord.id;
    state.expandedFieldIds = new Set([fieldRecord.id]);
    state.activeFieldViewport = currentVp;
    state.avgRevealed = false;

    soundFieldCommit();
    syncAllFieldOverlays();
    renderUI();
    scrollHistoryListToTop(true);
  }

  function toggleFieldLock(fieldId) {
    if (state.isReviewMode) return;
    const f = state.fields.find(field => field.id === fieldId);
    if (!f) return;

    f.locked = !f.locked;
    if (f.locked) {
      soundSuccess();
      showToast(`Field ${f.number} locked.`);
    } else {
      soundUndo();
      showToast(`Field ${f.number} unlocked.`);
    }

    syncAllFieldOverlays();
    renderUI();
  }

  function handleToggleGrade(itemId, grade) {
    if (state.isReviewMode) return;
    attachViewerPanZoomListeners();

    // If no field started or selected yet, auto-observe Field 1 at current viewport
    if (!state.activeFieldStarted || !state.selectedFieldId || state.fields.length === 0) {
      handleNewField();
    }

    // Find the currently active/selected field
    let currentField = state.fields.find(f => f.id === state.selectedFieldId);
    if (!currentField && state.fields.length > 0) {
      currentField = state.fields[state.fields.length - 1];
      state.selectedFieldId = currentField.id;
    }

    if (currentField && currentField.locked) {
      soundError();
      showToast(`Field ${currentField.number} is locked from changes.`);
      return;
    }

    if (state.currentFieldSelections[itemId] === grade) {
      // Deselect
      delete state.currentFieldSelections[itemId];
      soundUndo();
    } else {
      // Select
      state.currentFieldSelections[itemId] = grade;
      soundSuccess();
    }

    // Any new morphology selection invalidates previously revealed calculated average
    state.avgRevealed = false;

    // Automated Normal / Abnormal evaluation
    const keys = Object.keys(state.currentFieldSelections).filter(k => Boolean(state.currentFieldSelections[k]));
    state.currentFieldStatus = keys.length > 0 ? "Abnormal" : "Normal";

    // Update the connected field in state.fields
    if (currentField) {
      currentField.selections = { ...state.currentFieldSelections };
      currentField.status = state.currentFieldStatus;
      currentField.summary = formatSelectionsSummary(currentField.selections);
    }

    updateFieldOverlaysVisibility();
    renderUI();
  }

  function handleToggleSingle(itemId) {
    if (state.isReviewMode) return;
    attachViewerPanZoomListeners();

    // If no field started or selected yet, auto-observe Field 1 at current viewport
    if (!state.activeFieldStarted || !state.selectedFieldId || state.fields.length === 0) {
      handleNewField();
    }

    // Find the currently active/selected field
    let currentField = state.fields.find(f => f.id === state.selectedFieldId);
    if (!currentField && state.fields.length > 0) {
      currentField = state.fields[state.fields.length - 1];
      state.selectedFieldId = currentField.id;
    }

    if (currentField && currentField.locked) {
      soundError();
      showToast(`Field ${currentField.number} is locked from changes.`);
      return;
    }

    if (state.currentFieldSelections[itemId] === "Present") {
      // Deselect
      delete state.currentFieldSelections[itemId];
      soundUndo();
    } else {
      // Select Present
      state.currentFieldSelections[itemId] = "Present";
      soundSuccess();
    }

    // Any new morphology selection invalidates previously revealed calculated average
    state.avgRevealed = false;

    // Automated Normal / Abnormal evaluation
    const keys = Object.keys(state.currentFieldSelections).filter(k => Boolean(state.currentFieldSelections[k]));
    state.currentFieldStatus = keys.length > 0 ? "Abnormal" : "Normal";

    // Update the connected field in state.fields
    if (currentField) {
      currentField.selections = { ...state.currentFieldSelections };
      currentField.status = state.currentFieldStatus;
      currentField.summary = formatSelectionsSummary(currentField.selections);
    }

    updateFieldOverlaysVisibility();
    renderUI();
  }

  function resetAll() {
    if (!state.activeFieldStarted && state.fields.length === 0 && Object.keys(state.currentFieldSelections).length === 0) return;
    if (window.confirm("Reset all evaluated fields and RBC morphology gradings?")) {
      state.fields = [];
      state.activeFieldStarted = false;
      state.activeFieldViewport = null;
      state.currentFieldSelections = {};
      state.currentFieldStatus = "Normal";
      state.selectedFieldId = null;
      state.expandedFieldIds.clear();
      state.avgRevealed = false;
      hideFieldSquare();
      clearAllMapOverlays();
      restoreInitialOriginalViewport(true);
      soundUndo();
      renderUI();
      showToast("All morphology evaluations reset.");
    }
  }

  // --- PROCEDURE MODAL ---
  function showProcedureModal() {
    const backdrop = document.getElementById("rbcMorph100xModalBackdrop");
    if (!backdrop) return;
    const chk = document.getElementById("rbcMorph100xDontShowAgain");
    if (chk) {
      chk.checked = localStorage.getItem("rbcMorph100x_hide_procedure") === "1";
    }
    backdrop.classList.add("open");
  }

  function closeProcedureModal() {
    const backdrop = document.getElementById("rbcMorph100xModalBackdrop");
    if (!backdrop) return;
    const chk = document.getElementById("rbcMorph100xDontShowAgain");
    if (chk) {
      if (chk.checked) {
        try { localStorage.setItem("rbcMorph100x_hide_procedure", "1"); } catch (e) {}
      } else {
        try { localStorage.removeItem("rbcMorph100x_hide_procedure"); } catch (e) {}
      }
    }
    backdrop.classList.remove("open");
  }

  function isProcedureModalOpen() {
    const backdrop = document.getElementById("rbcMorph100xModalBackdrop");
    return backdrop && backdrop.classList.contains("open");
  }

  function createProcedureModal() {
    let existing = document.getElementById("rbcMorph100xModalBackdrop");
    if (existing) existing.remove();

    const modalHtml = `
      <div class="rbcMorph100x-modal" role="dialog" aria-modal="true" aria-labelledby="rbcMorph100xModalTitle">
        <div class="rbcMorph100x-modal-header">
          <div class="rbcMorph100x-modal-title" id="rbcMorph100xModalTitle">
            <span>Procedure: RBC Morphology Evaluation</span>
          </div>
          <button class="rbcMorph100x-modal-close-btn" id="rbcMorph100xModalCloseBtn" title="Close">✕</button>
        </div>
        <div class="rbcMorph100x-modal-body">
          <div class="rbcMorph100x-modal-lead">
            Follow standard laboratory hematology guidelines at <b>100X oil immersion</b> to perform red blood cell morphology evaluation across multiple visited fields:
          </div>

          <div class="rbcMorph100x-steps-list">
            <div class="rbcMorph100x-step-item">
              <div class="rbcMorph100x-step-num">1</div>
              <div class="rbcMorph100x-step-content">
                <div class="rbcMorph100x-step-title">Examine the Ideal Monolayer Zone</div>
                <div>Scan behind the feathered edge where red blood cells are evenly distributed, touching with minimal overlap. The 95% height reticle marks your field of evaluation.</div>
              </div>
            </div>

            <div class="rbcMorph100x-step-item">
              <div class="rbcMorph100x-step-num">2</div>
              <div class="rbcMorph100x-step-content">
                <div class="rbcMorph100x-step-title">Observe Field & Automated Evaluation</div>
                <div>Each field automatically defaults to <b>Normal</b>. If any abnormal morphology is observed, select its severity grade (1+, 2+, 3+, or Present) and the status transitions to <b>Abnormal</b>.</div>
              </div>
            </div>

            <div class="rbcMorph100x-step-item">
              <div class="rbcMorph100x-step-num">3</div>
              <div class="rbcMorph100x-step-content">
                <div class="rbcMorph100x-step-title">Commit Field & Pan to Next</div>
                <div>Press <b>[1]</b> or <b>Double Click</b> to log the current field's coordinates and evaluation. The counter resets to Normal for the next field.</div>
              </div>
            </div>

            <div class="rbcMorph100x-step-item">
              <div class="rbcMorph100x-step-num">4</div>
              <div class="rbcMorph100x-step-content">
                <div class="rbcMorph100x-step-title">Review Visited Fields Log</div>
                <div>Click any field in the <b>Visited Fields</b> list to smoothly jump the microscope viewport back to that exact recorded position.</div>
              </div>
            </div>
          </div>

          <div class="rbcMorph100x-calc-formula">
            <span class="rbcMorph100x-calc-formula-title">Standard Grading Scale (100X Oil Immersion)</span>
            <table class="rbcMorph100x-modal-table">
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>Designation</th>
                  <th>Criteria (% of RBCs Involved)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Normal</strong></td>
                  <td>Within Normal Limits</td>
                  <td>Uniform size (6–8 µm), normochromic biconcave discs.</td>
                </tr>
                <tr>
                  <td><strong>1+</strong></td>
                  <td>Slight (SL)</td>
                  <td>2% – 10% of RBCs per high-power field (HPF).</td>
                </tr>
                <tr>
                  <td><strong>2+</strong></td>
                  <td>Moderate (MD)</td>
                  <td>11% – 25% of RBCs per HPF.</td>
                </tr>
                <tr>
                  <td><strong>3+</strong></td>
                  <td>Marked (MK)</td>
                  <td>&gt; 25% of RBCs per HPF.</td>
                </tr>
                <tr>
                  <td><strong>Present</strong></td>
                  <td>Inclusions & Distribution</td>
                  <td>Qualitative finding when observed (e.g., Howell-Jolly, Rouleaux).</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="rbcMorph100x-shortcuts-grid">
            <div class="rbcMorph100x-shortcuts-title">Controls & Shortcuts:</div>
            <div class="rbcMorph100x-shortcuts-table">
              <div class="rbcMorph100x-shortcut-cell">
                <span>New Field:</span>
                <span class="rbcMorph100x-key-badge">[1] / Double Click</span>
              </div>
              <div class="rbcMorph100x-shortcut-cell">
                <span>Reset All:</span>
                <span class="rbcMorph100x-key-badge">[R]</span>
              </div>
            </div>
          </div>
        </div>
        <div class="rbcMorph100x-modal-footer">
          <label class="rbcMorph100x-startup-toggle">
            <input type="checkbox" id="rbcMorph100xDontShowAgain">
            <span>Don't show on startup</span>
          </label>
          <button class="rbcMorph100x-modal-start-btn" id="rbcMorph100xModalStartBtn">
            <span>Start Evaluation</span>
            <span>→</span>
          </button>
        </div>
      </div>
    `;

    const backdrop = document.createElement("div");
    backdrop.className = "rbcMorph100x-modal-backdrop";
    backdrop.id = "rbcMorph100xModalBackdrop";
    backdrop.innerHTML = modalHtml;
    document.body.appendChild(backdrop);

    const closeBtn = document.getElementById("rbcMorph100xModalCloseBtn");
    const startBtn = document.getElementById("rbcMorph100xModalStartBtn");

    if (closeBtn) closeBtn.addEventListener("click", closeProcedureModal);
    if (startBtn) startBtn.addEventListener("click", closeProcedureModal);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        closeProcedureModal();
      }
    });
  }

  // --- 3-WAY LAYOUT COORDINATION ---
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
    const rbcStatusBar = document.getElementById("rbcMorph100xStatusBar");
    const rbcStatusDot = document.getElementById("rbcMorph100xStatusDot");
    const rbcStatusText = document.getElementById("rbcMorph100xStatusText");
    if (rbcStatusBar && rbcStatusDot && rbcStatusText) {
      const isFocused = (typeof document !== "undefined" && typeof document.hasFocus === "function") ? document.hasFocus() : true;
      const isWindowActive = Boolean(state.mouseInWindow || isFocused);
      if (state.isReviewMode) {
        rbcStatusBar.classList.remove("inactive");
        rbcStatusDot.className = "rbcMorph100x-dot review";
        rbcStatusText.textContent = "REVIEW";
        rbcStatusText.style.color = "#0284c7";
      } else if (isWindowActive) {
        rbcStatusBar.classList.remove("inactive");
        rbcStatusDot.className = "rbcMorph100x-dot";
        rbcStatusText.textContent = "ACTIVE";
        rbcStatusText.style.color = "#e11d48";
      } else {
        rbcStatusBar.classList.add("inactive");
        rbcStatusDot.className = "rbcMorph100x-dot inactive";
        rbcStatusText.textContent = "INACTIVE";
        rbcStatusText.style.color = "#64748b";
      }
    }

    if (!isRbcActive()) {
      const reticleEl = document.getElementById("rbcMorph100xReticle");
      if (reticleEl) reticleEl.classList.remove("visible");
      if (reticleFadeTimer) {
        clearTimeout(reticleFadeTimer);
        reticleFadeTimer = null;
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
    updateStickyHeaderStack();
  }

  window.__update100xTaskPositions = updateTaskPositions;

  // --- STICKY STACK SECTION HEADERS (TOP AND BOTTOM) ---
  let stickyStackPendingRaf = null;
  function updateStickyHeaderStack() {
    const container = document.getElementById("rbcMorph100xTable");
    if (!container) return;
    const V = container.clientHeight;
    if (!V) {
      // Container not yet laid out or minimized; schedule retry
      if (!stickyStackPendingRaf) {
        stickyStackPendingRaf = requestAnimationFrame(() => {
          stickyStackPendingRaf = null;
          updateStickyHeaderStack();
        });
      }
      return;
    }
    const scrollTop = container.scrollTop;
    const sections = container.querySelectorAll(".rbcMorph100x-section");
    const N = sections.length;
    if (N === 0) return;

    const firstHdr = sections[0].querySelector(".rbcMorph100x-section-header");
    const headerH = firstHdr && firstHdr.offsetHeight > 0 ? firstHdr.offsetHeight : 24;

    sections.forEach((sec, i) => {
      const hdr = sec.querySelector(".rbcMorph100x-section-header");
      if (!hdr) return;

      const naturalTop = sec.offsetTop;
      const naturalYInView = naturalTop - scrollTop;
      const minY = i * headerH;
      const maxY = V - (N - i) * headerH;

      const clampedY = Math.max(minY, Math.min(maxY, naturalYInView));
      const translateY = clampedY - naturalYInView;

      hdr.style.transform = `translateY(${translateY}px)`;
      
      const isPinnedTop = (clampedY <= minY + 0.5);
      const isPinnedBottom = (clampedY >= maxY - 0.5);

      // Top pinned: section 0 is on top of section 1 (highest z-index first)
      // Bottom pinned: section 2 is below section 1 (highest z-index last or based on position)
      // Natural scrolling headers sit between them
      if (isPinnedTop) {
        sec.style.zIndex = 50 + (N - i);
        hdr.style.zIndex = 60 + (N - i);
      } else if (isPinnedBottom) {
        sec.style.zIndex = 30 + i;
        hdr.style.zIndex = 40 + i;
      } else {
        sec.style.zIndex = 10 + (N - i);
        hdr.style.zIndex = 20 + (N - i);
      }

      hdr.classList.toggle("pinned-top", isPinnedTop);
      hdr.classList.toggle("pinned-bottom", isPinnedBottom);
    });
  }

  function scrollToSection(sectionId) {
    const container = document.getElementById("rbcMorph100xTable");
    if (!container) return;
    const sec = container.querySelector(`.rbcMorph100x-section[data-section-id="${sectionId}"]`);
    if (!sec) return;
    const sections = Array.from(container.querySelectorAll(".rbcMorph100x-section"));
    const idx = sections.indexOf(sec);
    const firstHdr = sec.querySelector(".rbcMorph100x-section-header");
    const headerH = firstHdr ? firstHdr.offsetHeight : 24;
    const targetScrollTop = Math.max(0, sec.offsetTop - (idx * headerH));
    if (typeof container.scrollTo === "function") {
      container.scrollTo({ top: targetScrollTop, behavior: "smooth" });
    } else {
      container.scrollTop = targetScrollTop;
    }
  }

  // --- RENDER FUNCTION ---
  function renderUI() {
    const activeField = state.fields.find(f => f.id === state.selectedFieldId) || (state.fields.length > 0 ? state.fields[state.fields.length - 1] : null);
    if (activeField && (state.isReviewMode || state.selectedFieldId)) {
      state.currentFieldSelections = { ...(activeField.selections || {}) };
      state.currentFieldStatus = activeField.status || (Object.keys(state.currentFieldSelections).length > 0 ? "Abnormal" : "Normal");
    }

    const isAbnormal = state.currentFieldStatus === "Abnormal";
    const statusText = isAbnormal ? "ABNORMAL" : "NORMAL";
    const statusClass = isAbnormal ? "abnormal" : "normal";

    const activeFieldLabel = activeField ? `#${activeField.number}` : "??: [1] or Double Click";
    const completedFields = state.fields.length;
    const progressPercent = Math.min(100, Math.round((completedFields / 10) * 100));
    const showAvgButton = !state.isReviewMode && completedFields >= 10 && !state.avgRevealed;
    const showAvg = state.isReviewMode ? (completedFields >= 10) : (completedFields >= 10 && state.avgRevealed);

    // 1. Instructions Panel (Matching Platelet Estimate)
    const modePanelEl = document.getElementById("rbcMorph100xModePanel");
    if (modePanelEl) {
      if (state.isReviewMode) {
        modePanelEl.innerHTML = `
          <div class="rbcMorph100x-review-notice">
            <b>Reviewing Shared Slide Evaluation</b><br>
            Evaluation is locked. Click any visited field below to jump to that location.
          </div>
          <div class="rbcMorph100x-actions">
            <button class="rbcMorph100x-btn rbcMorph100x-btn-secondary" id="rbcMorph100xExitReviewBtn">
              <span>✕</span> Exit Review / New Count
            </button>
          </div>
        `;
        const exitBtn = document.getElementById("rbcMorph100xExitReviewBtn");
        if (exitBtn) exitBtn.onclick = exitReviewMode;
      } else {
        modePanelEl.innerHTML = `
          <div class="rbcMorph100x-instructions">
            <div class="rbcMorph100x-instructions-title">Instructions:</div>
            <div class="rbcMorph100x-instructions-row">
              <span class="rbcMorph100x-key">1 / Double Click</span>
              <span>New Field</span>
            </div>
            <div class="rbcMorph100x-instructions-row">
              <span class="rbcMorph100x-key">Click</span>
              <span>Toggle Grade / Type</span>
            </div>
            <div class="rbcMorph100x-instructions-row">
              <span class="rbcMorph100x-key">R</span>
              <span>Reset</span>
            </div>
          </div>
        `;
      }
    }

    // 2. Progress Banner matching WBC differential
    const progressCardEl = document.getElementById("rbcMorph100xProgressCard");
    if (progressCardEl) {
      progressCardEl.innerHTML = `
        <div class="rbcMorph100x-progress-header">
          <span class="rbcMorph100x-progress-header-label">Total Fields Evaluated:</span>
          <span class="rbcMorph100x-progress-header-val" id="rbcMorph100xHeaderTotal">${completedFields} / 10</span>
        </div>
        <div class="rbcMorph100x-progress-bar-bg">
          <div class="rbcMorph100x-progress-bar-fill ${completedFields >= 10 ? 'complete' : ''}" style="width: ${progressPercent}%;"></div>
        </div>
        ${showAvgButton ? `
          <div class="rbcMorph100x-calc-avg-wrap">
            <button class="rbcMorph100x-calc-avg-btn" id="rbcMorph100xCalcAvgBtn" title="Calculate & reveal average RBC morphology across all evaluated fields">
              <span>Complete & Calculate Avg</span>
              <span class="rbcMorph100x-calc-avg-arrow">→</span>
            </button>
          </div>
        ` : ''}
      `;

      if (showAvgButton) {
        const calcAvgBtn = document.getElementById("rbcMorph100xCalcAvgBtn");
        if (calcAvgBtn) {
          calcAvgBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            state.avgRevealed = true;
            soundSuccess();
            renderUI();
          });
        }
      }
    }

    // 3. Overall Header Section (Current Field)
    const fieldNum = activeField ? activeField.number : 1;
    const isCurrentFieldLocked = activeField ? Boolean(activeField.locked) : false;
    const isTableLocked = state.isReviewMode || isCurrentFieldLocked;

    const overallSectionEl = document.getElementById("rbcMorph100xOverallSection");
    if (overallSectionEl) {
      if (!state.isReviewMode && state.fields.length === 0) {
        overallSectionEl.removeAttribute("title");
        overallSectionEl.classList.remove("is-clickable");
        overallSectionEl.innerHTML = `
          <div class="rbcMorph100x-overall-prompt">
            <span>Observe Field to Begin</span>
            <span>Zoom In + [1] or Double Click</span>
          </div>
        `;
      } else {
        overallSectionEl.classList.add("is-clickable");
        overallSectionEl.title = `Click to jump microscope to Field ${fieldNum}`;
        overallSectionEl.innerHTML = `
          <div class="rbcMorph100x-overall-label">
            <span>Field ${fieldNum}${isCurrentFieldLocked ? ' • Locked' : ''}${state.isReviewMode ? ' • Review' : ''}</span>
          </div>
          <div class="rbcMorph100x-overall-badge ${statusClass}">
            <span class="rbcMorph100x-overall-badge-dot"></span>
            <span>${statusText}</span>
          </div>
        `;
      }
    }

    // 4. Morphology Table Rows
    const tableContainer = document.getElementById("rbcMorph100xTable");
    if (tableContainer) {
      const averages = (showAvg || state.isReviewMode) ? calculateMorphologyAverages(state.fields) : {};
      let html = "";
      MORPHOLOGY_SECTIONS.forEach((section, sIdx) => {
        const isSectionExpanded = state.expandedReviewSections.has(section.id);
        const zeroItems = section.items.filter(item => {
          const avgData = averages[item.id];
          if (!section.hasGrades) {
            return !avgData || (avgData.count === 0);
          }
          return !avgData || (avgData.mean === 0);
        });
        const hasCollapsible = zeroItems.length > 0;

        html += `
          <div class="rbcMorph100x-section" data-section-id="${section.id}" data-section-index="${sIdx}">
            <div class="rbcMorph100x-section-header" data-section-id="${section.id}">
              <div class="rbcMorph100x-section-title-wrap">
                <span class="rbcMorph100x-section-title">${section.title}</span>
              </div>
              ${section.hasGrades ? `
                <div class="rbcMorph100x-header-grades ${showAvg ? 'has-avg' : ''}">
                  ${showAvg ? `<span class="rbcMorph100x-header-avg" title="Average evaluation across all 10+ fields">Avg</span>` : ''}
                  <span title="Slight / 1+">1+</span>
                  <span title="Moderate / 2+">2+</span>
                  <span title="Marked / 3+">3+</span>
                </div>
              ` : ''}
            </div>
            <div class="rbcMorph100x-section-body">
        `;

        section.items.forEach(item => {
          const isSingle = !section.hasGrades;
          const currentVal = state.currentFieldSelections[item.id] || null;
          const isRowActive = Boolean(currentVal);
          const avgData = (showAvg || state.isReviewMode) ? averages[item.id] : null;
          const avgVal = avgData ? (avgData.grade || "") : "";
          const isZeroScore = isSingle ? (!avgData || avgData.count === 0) : (!avgData || avgData.mean === 0);

          if (state.isReviewMode && isZeroScore && !isSectionExpanded) {
            return;
          }

          if (isSingle) {
            const isChecked = currentVal === "Present";
            const count = avgData ? (avgData.count || 0) : 0;
            const total = avgData ? (avgData.total || completedFields) : completedFields;
            const avgTitle = avgVal ? `Average (${count}/${total}): Present` : `Average (0/${total}): None`;
            html += `
              <div class="rbcMorph100x-row single-action ${showAvg ? 'has-avg' : ''} ${isRowActive ? "active" : ""}" data-item-id="${item.id}">
                <div class="rbcMorph100x-cell-name">
                  <span title="${item.name}">${item.name}</span>
                </div>
                ${showAvg ? `
                  <div class="rbcMorph100x-avg-col">
                    <span class="rbcMorph100x-avg-badge ${avgVal ? 'has-value' : 'empty'}" title="${avgTitle}">${avgVal ? 'Pres' : '—'}</span>
                  </div>
                ` : ''}
                <div class="rbcMorph100x-radio-col">
                  <button class="rbcMorph100x-present-badge-btn ${isChecked ? "checked" : ""} ${isTableLocked ? "disabled" : ""}" 
                          data-action="toggle-single" 
                          data-item-id="${item.id}" 
                          ${isTableLocked ? "disabled" : ""} 
                          title="${isTableLocked ? 'Field is locked from changes' : (isChecked ? 'Click to deselect' : 'Click to mark as Present')}">
                    <span>Present</span>
                  </button>
                </div>
              </div>
            `;
          } else {
            const numMeanStr = avgData && typeof avgData.mean === "number" ? avgData.mean.toFixed(1) : "0.0";
            const avgTitle = avgVal ? `Average (${numMeanStr}): ${avgVal}` : `Average (${numMeanStr}): None`;
            html += `
              <div class="rbcMorph100x-row ${showAvg ? 'has-avg' : ''} ${isRowActive ? "active" : ""}" data-item-id="${item.id}">
                <div class="rbcMorph100x-cell-name">
                  <span title="${item.name}">${item.name}</span>
                </div>
                ${showAvg ? `
                  <div class="rbcMorph100x-avg-col">
                    <span class="rbcMorph100x-avg-badge ${avgVal ? 'has-value' : 'empty'}" title="${avgTitle}">${avgVal || '—'}</span>
                  </div>
                ` : ''}
                <div class="rbcMorph100x-radio-col">
                  <div class="rbcMorph100x-radio-btn ${currentVal === "1+" ? "checked" : ""} ${isTableLocked ? "disabled" : ""}" 
                       data-action="toggle-grade" 
                       data-item-id="${item.id}" 
                       data-grade="1+" 
                       title="${isTableLocked ? 'Field is locked from changes' : `Slight / 1+ (${currentVal === '1+' ? 'Click to deselect' : 'Click to select'})`}"></div>
                </div>
                <div class="rbcMorph100x-radio-col">
                  <div class="rbcMorph100x-radio-btn ${currentVal === "2+" ? "checked" : ""} ${isTableLocked ? "disabled" : ""}" 
                       data-action="toggle-grade" 
                       data-item-id="${item.id}" 
                       data-grade="2+" 
                       title="${isTableLocked ? 'Field is locked from changes' : `Moderate / 2+ (${currentVal === '2+' ? 'Click to deselect' : 'Click to select'})`}"></div>
                </div>
                <div class="rbcMorph100x-radio-col">
                  <div class="rbcMorph100x-radio-btn ${currentVal === "3+" ? "checked" : ""} ${isTableLocked ? "disabled" : ""}" 
                       data-action="toggle-grade" 
                       data-item-id="${item.id}" 
                       data-grade="3+" 
                       title="${isTableLocked ? 'Field is locked from changes' : `Marked / 3+ (${currentVal === '3+' ? 'Click to deselect' : 'Click to select'})`}"></div>
                </div>
              </div>
            `;
          }
        });

        if (state.isReviewMode && hasCollapsible) {
          html += `
            <button class="rbcMorph100x-section-toggle-btn" data-action="toggle-section-expand" data-section-id="${section.id}">
              ${isSectionExpanded ? '<span>−</span> Show Less' : `<span>+</span> Show More (${zeroItems.length})`}
            </button>
          `;
        }

        html += `
            </div>
          </div>
        `;
      });

      tableContainer.classList.toggle("is-locked", isTableLocked);
      tableContainer.innerHTML = html;
      requestAnimationFrame(updateStickyHeaderStack);
    }

    // 5. Visited Fields List (Sorted Descending: Newest First)
    const historyListEl = document.getElementById("rbcMorph100xHistoryList");
    const historyCountEl = document.getElementById("rbcMorph100xHistoryCount");
    if (historyListEl) {
      const totalCount = state.fields.length;

      if (historyCountEl) {
        historyCountEl.textContent = `(${totalCount})`;
      }

      if (totalCount === 0) {
        historyListEl.innerHTML = `
          <div class="rbcMorph100x-history-empty">
            No fields evaluated yet.<br>${state.isReviewMode ? "No fields recorded in shared link." : "Press <b>[1]</b> for New Field."}
          </div>
        `;
      } else {
        let itemsHtml = "";

        // Render committed fields sorted descending (latest to oldest)
        const descendingFields = state.fields.slice().reverse();
        descendingFields.forEach(f => {
          const isSelected = state.selectedFieldId === f.id;
          const isExpanded = state.expandedFieldIds.has(f.id);
          const statusClass = f.status === "Abnormal" ? "abnormal" : "normal";
          const isLocked = Boolean(f.locked);

          itemsHtml += `
            <div class="rbcMorph100x-history-item ${isSelected ? "active" : ""} ${isExpanded ? "expanded" : ""}" data-id="${f.id}" title="Click to jump microscope to Field ${f.number}">
              <div class="rbcMorph100x-history-row">
                <span class="rbcMorph100x-history-title">
                  <svg class="rbcMorph100x-history-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                  <span>Field ${f.number}</span>
                </span>
                ${isLocked ? `
                  <span class="rbcMorph100x-history-locked-badge" title="Field is locked from changes">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Locked
                  </span>
                ` : ''}
                <span class="rbcMorph100x-history-status-pill ${statusClass}">${f.status}</span>
                <span class="rbcMorph100x-history-jump-tag">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 14 14"></polyline>
                  </svg>
                  view
                </span>
              </div>
              ${isExpanded ? `
                <div class="rbcMorph100x-history-actions-wrap">
                  <button class="rbcMorph100x-history-action-btn rbcMorph100x-history-lock-btn ${isLocked ? 'is-locked' : ''}" 
                          data-action="toggle-lock" 
                          data-id="${f.id}" 
                          title="${isLocked ? 'Unlock field to allow changes' : 'Lock field to prevent changes'}">
                    ${isLocked ? `
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                      </svg>
                      <span>Unlock</span>
                    ` : `
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                      <span>Lock</span>
                    `}
                  </button>
                  <button class="rbcMorph100x-history-action-btn rbcMorph100x-history-delete-btn" 
                          data-action="delete-field" 
                          data-id="${f.id}" 
                          ${isLocked || state.isReviewMode ? 'disabled' : ''} 
                          title="${isLocked ? 'Unlock field first to delete' : `Delete Field ${f.number}`}">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              ` : ''}
            </div>
          `;
        });

        historyListEl.innerHTML = itemsHtml;

        // Attach click listeners
        historyListEl.querySelectorAll(".rbcMorph100x-history-item").forEach(item => {
          const id = item.getAttribute("data-id");

          // Handle lock button click
          const lockBtn = item.querySelector("[data-action='toggle-lock']");
          if (lockBtn) {
            lockBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              toggleFieldLock(id);
            });
          }

          // Handle delete button click
          const deleteBtn = item.querySelector("[data-action='delete-field']");
          if (deleteBtn) {
            deleteBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              const targetF = state.fields.find(field => field.id === id);
              if (targetF && targetF.locked) {
                soundError();
                showToast(`Unlock Field ${targetF.number} before deleting.`);
                return;
              }
              deleteField(id);
            });
          }

          item.addEventListener("click", (e) => {
            if (e.target.closest("[data-action='toggle-lock']") || e.target.closest("[data-action='delete-field']")) {
              return;
            }
            e.stopPropagation();
            if (state.expandedFieldIds.has(id) && state.selectedFieldId === id) {
              state.expandedFieldIds.clear();
            } else {
              state.expandedFieldIds = new Set([id]);
            }

            if (id === "f_in_progress") {
              const vp = state.activeFieldViewport || captureCurrentViewport();
              jumpToField({
                id: "f_in_progress",
                number: state.fields.length + 1,
                center: vp.center,
                zoom: vp.zoom
              });
            } else {
              const f = state.fields.find(field => field.id === id);
              if (f) jumpToField(f);
            }
            renderUI();
          });
        });
      }
    }

    // Update share button state
    const shareBtn = document.getElementById("rbcMorph100xShareBtn");
    if (shareBtn) {
      const isShareDisabled = !state.isReviewMode && state.fields.length === 0;
      shareBtn.disabled = isShareDisabled;
      if (isShareDisabled) {
        shareBtn.setAttribute("title", "Observe a field to enable sharing");
      } else {
        shareBtn.setAttribute("title", "Share Review Link & Report");
      }
    }

    // Update collapsed status indicator
    updateBadge();
    updateTaskPositions();
  }

  function updateBadge() {
    const badgeStatus = getBadgeStatus();
    const indicatorEl = document.getElementById("rbcMorph100xStatusIndicator");
    const badgeTextEl = document.getElementById("rbcMorph100xStatusBadgeText");

    if (indicatorEl && badgeTextEl) {
      indicatorEl.className = `rbcMorph100x-collapse-indicator ${badgeStatus.className}`;
      badgeTextEl.textContent = badgeStatus.text;
    }
  }

  function updateTrackingStatus(active) {
    state.mouseInWindow = active;
    const wrapper = document.getElementById("rbcMorph100xWrapper");
    if (state.isReviewMode) {
      if (wrapper) wrapper.classList.remove("inactive");
      const statusBar = document.getElementById("rbcMorph100xStatusBar");
      const dot = document.getElementById("rbcMorph100xStatusDot");
      const text = document.getElementById("rbcMorph100xStatusText");
      if (statusBar && dot && text) {
        statusBar.classList.remove("inactive");
        dot.className = "rbcMorph100x-dot review";
        text.textContent = "REVIEW";
        text.style.color = "#0284c7";
      }
      return;
    }

    if (wrapper) {
      if (active) {
        wrapper.classList.remove("inactive");
      } else {
        wrapper.classList.add("inactive");
      }
    }

    const statusBar = document.getElementById("rbcMorph100xStatusBar");
    const dot = document.getElementById("rbcMorph100xStatusDot");
    const text = document.getElementById("rbcMorph100xStatusText");
    if (statusBar && dot && text) {
      if (active) {
        statusBar.classList.remove("inactive");
        dot.className = "rbcMorph100x-dot";
        text.textContent = "ACTIVE";
        text.style.color = "#e11d48";
      } else {
        statusBar.classList.add("inactive");
        dot.className = "rbcMorph100x-dot inactive";
        text.textContent = "INACTIVE";
        text.style.color = "#64748b";
      }
    }
  }

  // --- INITIALIZATION ---
  function initRbcMorphology() {
    if (!document.body) return;

    // Inject styles
    const styleEl = document.createElement("style");
    styleEl.innerHTML = STYLES;
    document.head.appendChild(styleEl);

    // Create reticle element
    createReticleElement();
    attachViewerPanZoomListeners();

    // Create wrapper
    let wrapper = document.getElementById("rbcMorph100xWrapper");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.id = "rbcMorph100xWrapper";
      wrapper.className = `rbcMorph100x-wrapper ${state.minimized ? "minimized" : ""}`;

      wrapper.innerHTML = `
        <div class="rbcMorph100x-card" id="rbcMorph100xCard">
          <!-- Status bar -->
          <div class="rbcMorph100x-status-bar" id="rbcMorph100xStatusBar">
            <span class="rbcMorph100x-dot" id="rbcMorph100xStatusDot"></span>
            <span id="rbcMorph100xStatusText">ACTIVE</span>
          </div>

          <!-- Header -->
          <div class="rbcMorph100x-header">
            <div class="rbcMorph100x-title-group" id="rbcMorph100xHeaderTitleGroup">
              <div class="rbcMorph100x-title-row">
                <span class="rbcMorph100x-title">RBC Morphology</span>
                <button class="rbcMorph100x-help-btn" id="rbcMorph100xHelpBtn" title="Morphology Evaluation Guide">?</button>
              </div>
              <div id="rbcMorph100xStatusIndicator" class="rbcMorph100x-collapse-indicator perform" title="Click to open RBC Morphology">
                <span class="rbcMorph100x-collapse-indicator-dot"></span>
                <span id="rbcMorph100xStatusBadgeText">PERFORM</span>
              </div>
            </div>
          </div>

          <!-- Instructions / Mode Panel -->
          <div class="rbcMorph100x-mode-panel" id="rbcMorph100xModePanel">
            <!-- Rendered via JS -->
          </div>

          <!-- Progress Card matching WBC differential -->
          <div class="rbcMorph100x-progress-card" id="rbcMorph100xProgressCard">
            <!-- Rendered via JS -->
          </div>

          <!-- Overall Read-Only Status -->
          <div class="rbcMorph100x-sticky-overall" id="rbcMorph100xOverallSection">
            <!-- Rendered via JS -->
          </div>

          <!-- Main table -->
          <div class="rbcMorph100x-table-container" id="rbcMorph100xTable">
            <!-- Rendered via JS -->
          </div>

          <!-- Visited Fields History (Descending) -->
          <div class="rbcMorph100x-history-container" id="rbcMorph100xHistorySection">
            <div class="rbcMorph100x-history-header">
              <span>VISITED FIELDS</span>
              <span id="rbcMorph100xHistoryCount">(0)</span>
            </div>
            <div class="rbcMorph100x-history-list" id="rbcMorph100xHistoryList">
              <!-- Rendered via JS -->
            </div>
          </div>

          <!-- Bottom actions -->
          <div class="rbcMorph100x-bottom-actions">
            <div class="rbcMorph100x-actions">
              <button class="rbcMorph100x-btn rbcMorph100x-btn-secondary" id="rbcMorph100xShareBtn" title="Observe a field to enable sharing" disabled>
                <span>🔗</span> Share
              </button>
              <button class="rbcMorph100x-btn rbcMorph100x-btn-secondary" id="rbcMorph100xResetBtn" title="Reset all morphology evaluations">
                <span>↻</span> Reset
              </button>
            </div>
            <button class="rbcMorph100x-btn rbcMorph100x-btn-minimize" id="rbcMorph100xMinimizeBtn" title="Minimize RBC Morphology">
              <span>▾</span> Minimize Task
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(wrapper);
    }

    // Delegated table clicks for radio grades and present buttons
    const tableEl = document.getElementById("rbcMorph100xTable");
    if (tableEl) {
      tableEl.addEventListener("click", (e) => {
        const toggleBtn = e.target.closest("[data-action='toggle-section-expand']");
        if (toggleBtn) {
          const sectionId = toggleBtn.getAttribute("data-section-id");
          if (sectionId) {
            if (state.expandedReviewSections.has(sectionId)) {
              state.expandedReviewSections.delete(sectionId);
            } else {
              state.expandedReviewSections.add(sectionId);
            }
            renderUI();
          }
          return;
        }

        if (state.isReviewMode) return;
        const gradeBtn = e.target.closest("[data-action='toggle-grade']");
        if (gradeBtn) {
          const itemId = gradeBtn.getAttribute("data-item-id");
          const grade = gradeBtn.getAttribute("data-grade");
          handleToggleGrade(itemId, grade);
          return;
        }

        const singleBtn = e.target.closest("[data-action='toggle-single']");
        if (singleBtn) {
          const itemId = singleBtn.getAttribute("data-item-id");
          handleToggleSingle(itemId);
          return;
        }

        const secHdr = e.target.closest(".rbcMorph100x-section-header");
        if (secHdr) {
          const secId = secHdr.getAttribute("data-section-id");
          if (secId) scrollToSection(secId);
          return;
        }
      });

      tableEl.addEventListener("scroll", updateStickyHeaderStack, { passive: true });

      if (typeof ResizeObserver !== "undefined") {
        const tableRo = new ResizeObserver(() => {
          updateStickyHeaderStack();
        });
        tableRo.observe(tableEl);
      }
    }

    // Overall Section Click (Mimics visited field click - only after first field has been identified)
    const overallSectionEl = document.getElementById("rbcMorph100xOverallSection");
    if (overallSectionEl) {
      overallSectionEl.addEventListener("click", (e) => {
        if (state.minimized) return;
        if (state.fields.length === 0) return; // Only allowed after first field is identified
        e.stopPropagation();

        const activeField = state.fields.find(f => f.id === state.selectedFieldId) || state.fields[state.fields.length - 1];
        if (activeField) {
          if (state.expandedFieldIds.has(activeField.id)) {
            state.expandedFieldIds.clear();
          } else {
            state.expandedFieldIds = new Set([activeField.id]);
          }
          jumpToField(activeField);
          renderUI();
        }
      });
    }

    // Reset button
    const resetBtn = document.getElementById("rbcMorph100xResetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", (e) => {
        e.preventDefault();
        resetAll();
      });
    }

    // Share button
    const shareBtn = document.getElementById("rbcMorph100xShareBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.__showLabShareTaskModal === "function") {
          window.__showLabShareTaskModal();
        } else {
          copyShareLink();
        }
      });
    }

    // Minimize button
    const minimizeBtn = document.getElementById("rbcMorph100xMinimizeBtn");
    if (minimizeBtn) {
      minimizeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.__RbcMorphology100X.collapse();
      });
    }

    // Create Procedure Modal
    createProcedureModal();

    // Help button
    const helpBtn = document.getElementById("rbcMorph100xHelpBtn");
    if (helpBtn) {
      helpBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showProcedureModal();
      });
    }

    // Collapsed Badge Click
    const statusIndicatorEl = document.getElementById("rbcMorph100xStatusIndicator");
    if (statusIndicatorEl) {
      statusIndicatorEl.onclick = (e) => {
        e.stopPropagation();
        if (state.minimized) {
          window.__RbcMorphology100X.expand();
        } else {
          window.__RbcMorphology100X.collapse();
        }
      };
    }

    // Card click when minimized
    const cardEl = document.getElementById("rbcMorph100xCard");
    if (cardEl) {
      cardEl.addEventListener("click", (e) => {
        if (state.minimized) {
          window.__RbcMorphology100X.expand();
        }
      });

      if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => {
          if (typeof window.__update100xTaskPositions === "function") {
            window.__update100xTaskPositions();
          } else {
            updateTaskPositions();
          }
        });
        ro.observe(cardEl);
      }
    }

    // Mouse & focus tracking
    document.addEventListener("mouseenter", () => updateTrackingStatus(true));
    document.addEventListener("mousemove", () => {
      if (!state.mouseInWindow) updateTrackingStatus(true);
    }, { passive: true });
    document.addEventListener("mouseleave", (e) => {
      if (!e.relatedTarget && !e.toElement) {
        updateTrackingStatus(false);
      }
    });
    window.addEventListener("focus", () => updateTrackingStatus(true));
    window.addEventListener("blur", () => updateTrackingStatus(false));
    window.addEventListener("resize", updateTaskPositions);

    // Global Key Listener for [1] and [R]
    window.addEventListener("keydown", function (e) {
      const procBackdrop = document.getElementById("rbcMorph100xModalBackdrop");
      const taskBackdrop = document.getElementById("labTaskSelectionModalBackdrop");
      if ((procBackdrop && procBackdrop.classList.contains("open")) ||
          (taskBackdrop && taskBackdrop.classList.contains("open"))) {
        if (e.key === "Escape") {
          closeProcedureModal();
          if (taskBackdrop) taskBackdrop.classList.remove("open");
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      if (state.isReviewMode) {
        return;
      }

      // If RBC Morphology is minimized, or if Differential counter is active, ignore rbc morphology keys
      if (state.minimized || (window.__Differential100XInitialized && window.__Differential100X && !window.__Differential100X.isMinimized?.())) {
        return;
      }

      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return;
      }

      if (e.repeat) {
        return;
      }

      const key = e.key;
      const code = e.code;
      let handled = false;

      if (key === "1" || code === "Digit1" || code === "Numpad1") {
        handleNewField();
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

    // Expose API
    window.__RbcMorphology100X = {
      expand: () => {
        if (window.__Differential100X && typeof window.__Differential100X.collapse === "function" && !window.__Differential100X.isMinimized()) {
          window.__Differential100X.collapse();
        }
        if (window.__Differential100X && typeof window.__Differential100X.closeProcedure === "function") {
          window.__Differential100X.closeProcedure();
        }
        if (window.__Counter100X && typeof window.__Counter100X.collapse === "function" && !window.__Counter100X.isMinimized()) {
          window.__Counter100X.collapse();
        }
        if (window.__Counter100X && typeof window.__Counter100X.closeProcedure === "function") {
          window.__Counter100X.closeProcedure();
        }
        state.minimized = false;
        state.mouseInWindow = true;
        wrapper.classList.remove("minimized");
        updateBadge();
        updateTrackingStatus(true);
        if (typeof window.__update100xTaskPositions === "function") {
          window.__update100xTaskPositions();
        } else {
          updateTaskPositions();
        }
        requestAnimationFrame(() => {
          updateStickyHeaderStack();
          setTimeout(updateStickyHeaderStack, 60);
        });
        // Show procedure if not suppressed
        try {
          if (localStorage.getItem("rbcMorph100x_hide_procedure") !== "1") {
            showProcedureModal();
          }
        } catch (err) {
          showProcedureModal();
        }
      },
      collapse: () => {
        state.minimized = true;
        wrapper.classList.add("minimized");
        updateBadge();
        const reticleEl = document.getElementById("rbcMorph100xReticle");
        if (reticleEl) reticleEl.classList.remove("visible");
        if (reticleFadeTimer) {
          clearTimeout(reticleFadeTimer);
          reticleFadeTimer = null;
        }
        if (typeof window.__update100xTaskPositions === "function") {
          window.__update100xTaskPositions();
        } else {
          updateTaskPositions();
        }
      },
      isMinimized: () => Boolean(state.minimized),
      reset: resetAll,
      showProcedure: showProcedureModal,
      closeProcedure: closeProcedureModal,
      showGuide: showProcedureModal,
      isProcedureOpen: isProcedureModalOpen,
      getStatus: getBadgeStatus,
      getSharePayload: getSharePayload,
      getEncodedData: getSharePayload,
      copyShareLink: copyShareLink,
      getSummary: () => formatSelectionsSummary(state.currentFieldSelections),
      showFieldSquare: showFieldSquare,
      hideFieldSquare: hideFieldSquare,
      syncFieldOverlays: syncAllFieldOverlays,
      deleteField: deleteField
    };

    const isReview = loadReviewFromUrl();
    if (isReview) {
      state.minimized = false;
      wrapper.classList.remove("minimized");
      updateBadge();
      if (typeof window.__update100xTaskPositions === "function") {
        window.__update100xTaskPositions();
      } else {
        updateTaskPositions();
      }
      requestAnimationFrame(() => {
        updateStickyHeaderStack();
        setTimeout(updateStickyHeaderStack, 60);
      });
    }
    syncAllFieldOverlays();
    renderUI();
  }

  // Hook DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRbcMorphology);
  } else {
    initRbcMorphology();
  }
})();
