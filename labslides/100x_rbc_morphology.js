/**
 * RBC Morphology 100X Evaluation Overlay
 * For virtual microscope slides at 100X magnification.
 *
 * Features:
 *   - Sections: Overall (Normal / Abnormal pills), Size & Color, Shape, Inclusions & Distribution
 *   - Non-collapsible static section headers
 *   - 1+ 2+ 3+ in section headers for Size & Color and Shape
 *   - Radial grading buttons: SL/1+, MD/2+, MK/3+ for size/shape, Present pill for inclusions
 *   - Mutual exclusion per row with click-to-deselect toggle support
 *   - Selecting any morphology automatically marks Overall as Abnormal
 *   - Selecting Normal clears all abnormal selections
 *   - Sticky Overall header & selection row always visible at top of scroll
 *   - Category headers sticky during scroll
 *   - Collapsed RBC Morphology badge styled identically to Differential and Platelet Estimate:
 *       Line 1: "RBC Morphology"
 *       Line 2: "Perform", "In Progress", or "Complete"
 *   - Reset, Share, and Minimize buttons at the bottom (matching Platelet Estimate / Differential style & width)
 *   - Card height capped to guarantee top/bottom viewport margins and gaps to other tasks
 *   - Full 3-way layout coordination with Differential (100X) and Platelet (100X) counters
 *   - Clinical Help & Grading Guide modal
 */
(function () {
  if (window.__RbcMorphology100XInitialized) return;
  window.__RbcMorphology100XInitialized = true;

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

  // --- STATE ---
  let state = {
    minimized: true,
    overall: null, // "Normal" | "Abnormal" | null
    selections: {} // { [itemId]: "1+" | "2+" | "3+" | "Present" }
  };

  // Try to load cached state (selections and overall, but keep auto-collapsed on page load)
  try {
    const saved = localStorage.getItem("rbcMorph100x_state");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed) {
        if (typeof parsed.overall === "string" || parsed.overall === null) {
          state.overall = parsed.overall;
        }
        if (parsed.selections && typeof parsed.selections === "object") {
          state.selections = parsed.selections || {};
        }
      }
    }
  } catch (e) {
    console.warn("Could not load RBC morphology state from localStorage", e);
  }

  // Load URL state if shared
  try {
    const params = new URLSearchParams(window.location.search);
    const rbcParam = params.get("rbc");
    if (rbcParam) {
      const decoded = JSON.parse(decodeURIComponent(rbcParam));
      if (decoded) {
        if (decoded.overall) state.overall = decoded.overall;
        if (decoded.selections) state.selections = decoded.selections;
        state.minimized = false;
      }
    }
  } catch (e) {
    // Ignore URL parse error
  }

  function saveState() {
    try {
      localStorage.setItem("rbcMorph100x_state", JSON.stringify({
        minimized: state.minimized,
        overall: state.overall,
        selections: state.selections
      }));
    } catch (e) {
      // ignore storage errors
    }
  }

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
      width: 255px;
      max-height: calc(100vh - 180px);
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
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
    .rbcMorph100x-wrapper.minimized .rbcMorph100x-table-container,
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
      margin-bottom: 8px;
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
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #fff1f2;
      color: #e11d48;
      border: 1.5px solid #fecdd3;
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

    .rbcMorph100x-help-btn:hover {
      background: #e11d48;
      color: #ffffff;
      border-color: #e11d48;
    }

    .rbcMorph100x-wrapper.minimized .rbcMorph100x-help-btn {
      display: none !important;
    }

    .rbcMorph100x-title {
      font-size: 13px;
      line-height: 1.25;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
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

    /* Table Container */
    .rbcMorph100x-table-container {
      flex: 1;
      overflow-y: auto;
      min-height: 120px;
      max-height: calc(100vh - 280px);
      border: 1px solid #ffe4e6;
      border-radius: 6px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
    }

    /* Sticky OVERALL Container at Top */
    .rbcMorph100x-sticky-overall {
      position: sticky;
      top: 0;
      z-index: 10;
      background: #ffffff;
      border-bottom: 1px solid #fecdd3;
      box-shadow: 0 2px 4px rgba(225, 29, 72, 0.06);
    }

    .rbcMorph100x-section-header {
      background: #ffe4e6;
      color: #881337;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 5px 8px;
      border-top: 1px solid #fecdd3;
      border-bottom: 1px solid #fecdd3;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 57px; /* Sits directly below sticky overall header */
      z-index: 5;
      box-sizing: border-box;
      user-select: none;
    }

    .rbcMorph100x-sticky-overall .rbcMorph100x-section-header {
      position: static;
      top: auto;
      z-index: auto;
      border-top: none;
    }

    .rbcMorph100x-section-title-wrap {
      display: flex;
      align-items: center;
    }

    .rbcMorph100x-header-grades {
      display: grid;
      grid-template-columns: 24px 24px 24px;
      text-align: center;
      font-size: 9px;
      font-weight: 800;
      color: #9f1239;
      gap: 4px;
    }

    /* Overall Row */
    .rbcMorph100x-overall-row {
      display: flex;
      gap: 6px;
      padding: 6px 8px;
      background: #ffffff;
    }

    .rbcMorph100x-overall-btn {
      flex: 1;
      padding: 4.5px 8px;
      border-radius: 6px;
      border: 1.5px solid #cbd5e1;
      background: #f8fafc;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: center;
    }

    .rbcMorph100x-overall-btn:hover {
      border-color: #fda4af;
      background: #fff1f2;
      color: #be123c;
    }

    .rbcMorph100x-overall-btn.active.normal {
      background: #10b981;
      border-color: #059669;
      color: #ffffff;
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.25);
    }

    .rbcMorph100x-overall-btn.active.abnormal {
      background: #e11d48;
      border-color: #be123c;
      color: #ffffff;
      box-shadow: 0 2px 4px rgba(225, 29, 72, 0.25);
    }

    /* Morphology Rows */
    .rbcMorph100x-row {
      display: grid;
      grid-template-columns: 1fr 24px 24px 24px;
      gap: 4px;
      align-items: center;
      padding: 3.5px 6px 3.5px 8px;
      font-size: 11px;
      border-bottom: 1px solid #fff5f7;
      transition: background-color 0.12s ease;
      box-sizing: border-box;
      background: #ffffff;
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
      font-size: 11px;
    }

    /* Radio button custom styling */
    .rbcMorph100x-radio-col {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .rbcMorph100x-radio-btn {
      width: 17px;
      height: 17px;
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
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #ffffff;
    }

    /* Single / Present column row spanning */
    .rbcMorph100x-row.single-action {
      grid-template-columns: 1fr 80px;
    }

    .rbcMorph100x-present-badge-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      box-sizing: border-box;
      padding: 2.5px 6px;
      border-radius: 5px;
      border: 1.5px solid #cbd5e1;
      background: #f8fafc;
      color: #475569;
      font-size: 10px;
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

    /* Bottom Actions matching Platelet Estimate */
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
      gap: 5px;
      width: 100%;
      box-sizing: border-box;
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

    .rbcMorph100x-btn-primary {
      background: #e11d48;
      color: #ffffff;
      border-color: #be123c;
    }

    .rbcMorph100x-btn-primary:hover:not(:disabled) {
      background: #be123c;
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
      margin-top: 4px;
      background: #f8fafc;
      color: #64748b;
      border: 1px solid #e2e8f0;
      font-size: 10.5px;
      font-weight: 600;
      padding: 5px 8px;
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

    .rbcMorph100x-calc-formula-equation {
      font-size: 13.5px;
      font-weight: 700;
      color: #881337;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
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
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      color: #ffffff;
      font-size: 12px;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 1000001;
      opacity: 0;
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: none;
    }

    .rbcMorph100x-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(-6px);
    }
  `;

  // --- TOAST HELPER ---
  function showToast(msg) {
    let toast = document.getElementById("rbcMorph100xToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "rbcMorph100xToast";
      toast.className = "rbcMorph100x-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2000);
  }

  // --- GENERATE SUMMARY STRING & SHARE URL ---
  function getMorphologySummary() {
    const keys = Object.keys(state.selections).filter(k => Boolean(state.selections[k]));

    if (state.overall === "Normal" || (keys.length === 0 && state.overall !== "Abnormal")) {
      return "Normal RBC morphology (Normocytic, normochromic).";
    }

    const sizeItems = [];
    const shapeItems = [];
    const inclusionItems = [];

    const itemMap = {};
    MORPHOLOGY_SECTIONS.forEach(sec => {
      sec.items.forEach(it => {
        itemMap[it.id] = it;
      });
    });

    keys.forEach(k => {
      const val = state.selections[k];
      if (!val) return;
      const def = itemMap[k];
      if (!def) return;

      if (def.category === "size" || def.category === "color") {
        sizeItems.push(`${def.name} (${val})`);
      } else if (def.category === "shape") {
        shapeItems.push(`${def.name} (${val})`);
      } else if (def.category === "inclusion" || def.category === "distribution") {
        shapeItems.push(`${def.name} (${val})`);
      }
    });

    const parts = [];
    if (sizeItems.length > 0) parts.push(sizeItems.join(", "));
    if (shapeItems.length > 0) parts.push(shapeItems.join(", "));
    if (inclusionItems.length > 0) parts.push(inclusionItems.join(", "));

    return parts.length > 0 ? parts.join("; ") : "Abnormal RBC morphology.";
  }

  function generateShareUrl() {
    const url = new URL(window.location.href);
    const payload = {
      overall: state.overall,
      selections: state.selections
    };
    url.searchParams.set("rbc", encodeURIComponent(JSON.stringify(payload)));
    return url.toString();
  }

  function copyShareLink() {
    const summary = getMorphologySummary();
    const shareUrl = generateShareUrl();
    const fullText = `RBC MORPHOLOGY REPORT (100X):\n${summary}\n\nReview Link: ${shareUrl}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullText).then(() => {
        showToast("Share link & report copied to clipboard!");
      }).catch(() => {
        fallbackCopy(fullText);
      });
    } else {
      fallbackCopy(fullText);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast("Share link & report copied to clipboard!");
    } catch (err) {
      showToast("Could not copy share link.");
    }
    document.body.removeChild(ta);
  }

  // --- SUMMARY BADGE STATUS ---
  function getBadgeStatus() {
    if (state.overall === "Normal") {
      return { text: "COMPLETE", className: "complete" };
    }
    const keys = Object.keys(state.selections).filter(k => Boolean(state.selections[k]));
    if (keys.length === 0 && !state.overall) {
      return { text: "PERFORM", className: "perform" };
    }
    return { text: "IN PROGRESS", className: "in-progress" };
  }

  // --- PROCEDURE MODAL FUNCTIONS ---
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
            Follow standard laboratory hematology guidelines at <b>100X oil immersion</b> to perform an accurate red blood cell morphology evaluation:
          </div>

          <div class="rbcMorph100x-steps-list">
            <div class="rbcMorph100x-step-item">
              <div class="rbcMorph100x-step-num">1</div>
              <div class="rbcMorph100x-step-content">
                <div class="rbcMorph100x-step-title">Examine the Ideal Monolayer Zone</div>
                <div>Scan behind the feathered edge where red blood cells are evenly distributed, touching with minimal overlap.</div>
              </div>
            </div>

            <div class="rbcMorph100x-step-item">
              <div class="rbcMorph100x-step-num">2</div>
              <div class="rbcMorph100x-step-content">
                <div class="rbcMorph100x-step-title">Assess Overall RBC Appearance</div>
                <div>Pan across representative fields to determine if morphology is <b>Normal</b> (normocytic, normochromic) or <b>Abnormal</b>.</div>
              </div>
            </div>

            <div class="rbcMorph100x-step-item">
              <div class="rbcMorph100x-step-num">3</div>
              <div class="rbcMorph100x-step-content">
                <div class="rbcMorph100x-step-title">Grade Size & Color Variations</div>
                <div>Quantify anisocytosis, microcytosis, macrocytosis, and hypochromia using the <b>1+ (Slight)</b>, <b>2+ (Moderate)</b>, and <b>3+ (Marked)</b> scale.</div>
              </div>
            </div>

            <div class="rbcMorph100x-step-item">
              <div class="rbcMorph100x-step-num">4</div>
              <div class="rbcMorph100x-step-content">
                <div class="rbcMorph100x-step-title">Classify Specific Poikilocytes</div>
                <div>Record abnormal shapes (schistocytes, spherocytes, sickle cells, target cells, teardrops, etc.) by selecting their respective severity grade.</div>
              </div>
            </div>

            <div class="rbcMorph100x-step-item">
              <div class="rbcMorph100x-step-num">5</div>
              <div class="rbcMorph100x-step-content">
                <div class="rbcMorph100x-step-title">Report Inclusions & Distribution</div>
                <div>Mark significant intracellular inclusions (Howell-Jolly, Pappenheimer bodies, Basophilic stippling) and distribution patterns (Rouleaux, Agglutinates) as <b>Present</b>.</div>
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
            <div class="rbcMorph100x-shortcuts-title">Key Clinical Associations:</div>
            <div class="rbcMorph100x-shortcuts-table">
              <div class="rbcMorph100x-shortcut-cell">
                <span>Microcytosis / Hypochromia:</span>
                <span class="rbcMorph100x-key-badge">IDA / Thal / ACD</span>
              </div>
              <div class="rbcMorph100x-shortcut-cell">
                <span>Macrocytosis:</span>
                <span class="rbcMorph100x-key-badge">B12/Folate / Liver</span>
              </div>
              <div class="rbcMorph100x-shortcut-cell">
                <span>Schistocytes:</span>
                <span class="rbcMorph100x-key-badge">MAHA (TTP/HUS/DIC)</span>
              </div>
              <div class="rbcMorph100x-shortcut-cell">
                <span>Spherocytes:</span>
                <span class="rbcMorph100x-key-badge">HS / AIHA</span>
              </div>
              <div class="rbcMorph100x-shortcut-cell">
                <span>Target Cells (Codocytes):</span>
                <span class="rbcMorph100x-key-badge">HbC/HbS / Thal / Liver</span>
              </div>
              <div class="rbcMorph100x-shortcut-cell">
                <span>Teardrops (Dacrocytes):</span>
                <span class="rbcMorph100x-key-badge">Myelofibrosis / Marrow</span>
              </div>
              <div class="rbcMorph100x-shortcut-cell">
                <span>Howell-Jolly Bodies:</span>
                <span class="rbcMorph100x-key-badge">Hyposplenism / Asplenia</span>
              </div>
              <div class="rbcMorph100x-shortcut-cell">
                <span>Basophilic Stippling:</span>
                <span class="rbcMorph100x-key-badge">Lead / Thal / Porphyria</span>
              </div>
              <div class="rbcMorph100x-shortcut-cell">
                <span>Rouleaux:</span>
                <span class="rbcMorph100x-key-badge">Multiple Myeloma / ESR</span>
              </div>
              <div class="rbcMorph100x-shortcut-cell">
                <span>Agglutinates:</span>
                <span class="rbcMorph100x-key-badge">Cold Agglutinins</span>
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
      if (rbcExpanded) {
        rbcStatusBar.classList.remove("inactive");
        rbcStatusDot.classList.remove("inactive");
        rbcStatusText.textContent = "ACTIVE";
      } else {
        rbcStatusBar.classList.add("inactive");
        rbcStatusDot.classList.add("inactive");
        rbcStatusText.textContent = "INACTIVE";
      }
    }

    // When all are minimized:
    // Space badges cleanly with gap
    if (!diffExpanded && !rbcExpanded && !counterExpanded) {
      const rbcCard = rbcWrapper ? rbcWrapper.querySelector(".rbcMorph100x-card") : null;
      const diffCard = diffWrapper ? diffWrapper.querySelector(".diff100x-card") : null;
      const counterCard = counterWrapper ? counterWrapper.querySelector(".counter100x-card") : null;

      const rbcH = rbcCard ? rbcCard.offsetHeight : 46;
      const diffH = diffCard ? diffCard.offsetHeight : 46;
      const counterH = counterCard ? counterCard.offsetHeight : 46;

      const topOffset = Math.round(rbcH / 2 + gap + diffH / 2);
      const bottomOffset = Math.round(rbcH / 2 + gap + counterH / 2);

      if (diffWrapper) {
        diffWrapper.style.transform = `translateY(calc(-50% - ${topOffset}px))`;
      }
      if (rbcWrapper) {
        rbcWrapper.style.transform = "translateY(-50%)";
      }
      if (counterWrapper) {
        counterWrapper.style.transform = `translateY(calc(-50% + ${bottomOffset}px))`;
      }
      return;
    }

    // If RBC Morphology is expanded (middle)
    if (rbcExpanded) {
      const rbcCard = rbcWrapper.querySelector(".rbcMorph100x-card");
      const rbcHeight = rbcCard ? rbcCard.offsetHeight : 440;

      if (diffWrapper && diffWrapper.classList.contains("minimized")) {
        const diffCard = diffWrapper.querySelector(".diff100x-card");
        const diffHeight = diffCard ? diffCard.offsetHeight : 40;
        const offsetPx = Math.round(rbcHeight / 2 + gap + diffHeight / 2);
        diffWrapper.style.setProperty("--diff100x-displaced-top", `calc(-50% - ${offsetPx}px)`);
        diffWrapper.classList.add("displaced-top");
      }

      if (counterWrapper && counterWrapper.classList.contains("minimized")) {
        const counterCard = counterWrapper.querySelector(".counter100x-card");
        const counterHeight = counterCard ? counterCard.offsetHeight : 40;
        const offsetPx = Math.round(rbcHeight / 2 + gap + counterHeight / 2);
        counterWrapper.style.setProperty("--counter100x-displaced-bottom", `calc(-50% + ${offsetPx}px)`);
        counterWrapper.classList.add("displaced-bottom");
      }
      return;
    }

    // If Differential is expanded (top)
    if (diffExpanded) {
      const diffCard = diffWrapper.querySelector(".diff100x-card");
      const diffHeight = diffCard ? diffCard.offsetHeight : 540;

      if (rbcWrapper && rbcWrapper.classList.contains("minimized")) {
        const rbcCard = rbcWrapper.querySelector(".rbcMorph100x-card");
        const rbcBadgeHeight = rbcCard ? rbcCard.offsetHeight : 40;
        const offsetPx = Math.round(diffHeight / 2 + gap + rbcBadgeHeight / 2);
        rbcWrapper.style.setProperty("--rbcMorph100x-displaced-bottom", `calc(-50% + ${offsetPx}px)`);
        rbcWrapper.classList.add("displaced-bottom");

        if (counterWrapper && counterWrapper.classList.contains("minimized")) {
          const counterCard = counterWrapper.querySelector(".counter100x-card");
          const counterBadgeHeight = counterCard ? counterCard.offsetHeight : 40;
          const counterOffsetPx = offsetPx + rbcBadgeHeight + gap;
          counterWrapper.style.setProperty("--counter100x-displaced-bottom", `calc(-50% + ${counterOffsetPx}px)`);
          counterWrapper.classList.add("displaced-bottom");
        }
      }
      return;
    }

    // If Counter / Platelet is expanded (bottom)
    if (counterExpanded) {
      const counterCard = counterWrapper.querySelector(".counter100x-card");
      const counterHeight = counterCard ? counterCard.offsetHeight : 480;

      if (rbcWrapper && rbcWrapper.classList.contains("minimized")) {
        const rbcCard = rbcWrapper.querySelector(".rbcMorph100x-card");
        const rbcBadgeHeight = rbcCard ? rbcCard.offsetHeight : 40;
        const offsetPx = Math.round(counterHeight / 2 + gap + rbcBadgeHeight / 2);
        rbcWrapper.style.setProperty("--rbcMorph100x-displaced-top", `calc(-50% - ${offsetPx}px)`);
        rbcWrapper.classList.add("displaced-top");

        if (diffWrapper && diffWrapper.classList.contains("minimized")) {
          const diffCard = diffWrapper.querySelector(".diff100x-card");
          const diffBadgeHeight = diffCard ? diffCard.offsetHeight : 40;
          const diffOffsetPx = offsetPx + rbcBadgeHeight + gap;
          diffWrapper.style.setProperty("--diff100x-displaced-top", `calc(-50% - ${diffOffsetPx}px)`);
          diffWrapper.classList.add("displaced-top");
        }
      }
      return;
    }
  }

  // Expose global coordinator
  window.__update100xTaskPositions = updateTaskPositions;

  // --- INITIALIZATION FUNCTION ---
  function initRbcMorphology() {
    if (!document.body) return;

    // Inject styles
    const styleEl = document.createElement("style");
    styleEl.innerHTML = STYLES;
    document.head.appendChild(styleEl);

    // Create DOM wrapper
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

          <!-- Main table -->
          <div class="rbcMorph100x-table-container" id="rbcMorph100xTable">
            <!-- Rendered via JS -->
          </div>

          <!-- Bottom actions -->
          <div class="rbcMorph100x-bottom-actions">
            <div class="rbcMorph100x-actions">
              <button class="rbcMorph100x-btn rbcMorph100x-btn-secondary" id="rbcMorph100xShareBtn" title="Share Review Link & Report">
                <span>🔗</span> Share
              </button>
              <button class="rbcMorph100x-btn rbcMorph100x-btn-secondary" id="rbcMorph100xResetBtn" title="Reset all morphology gradings">
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

    // --- RENDER TABLE ROWS ---
    function renderTable() {
      const tableContainer = document.getElementById("rbcMorph100xTable");
      if (!tableContainer) return;

      let html = `
        <!-- Sticky OVERALL Container at Top -->
        <div class="rbcMorph100x-sticky-overall">
          <div class="rbcMorph100x-section-header overall-header">
            <div class="rbcMorph100x-section-title-wrap">
              <span class="rbcMorph100x-section-title">OVERALL</span>
            </div>
          </div>
          <div class="rbcMorph100x-overall-row">
            <button class="rbcMorph100x-overall-btn ${state.overall === 'Normal' ? 'active normal' : ''}" 
                    data-action="set-overall" 
                    data-val="Normal"
                    title="Mark as Normal (clears abnormal findings)">
              Normal
            </button>
            <button class="rbcMorph100x-overall-btn ${state.overall === 'Abnormal' ? 'active abnormal' : ''}" 
                    data-action="set-overall" 
                    data-val="Abnormal"
                    title="Mark as Abnormal">
              Abnormal
            </button>
          </div>
        </div>
      `;

      MORPHOLOGY_SECTIONS.forEach(section => {
        html += `
          <div class="rbcMorph100x-section-header" data-section-id="${section.id}">
            <div class="rbcMorph100x-section-title-wrap">
              <span class="rbcMorph100x-section-title">${section.title}</span>
            </div>
            ${section.hasGrades ? `
              <div class="rbcMorph100x-header-grades">
                <span title="Slight / 1+">1+</span>
                <span title="Moderate / 2+">2+</span>
                <span title="Marked / 3+">3+</span>
              </div>
            ` : ''}
          </div>
        `;

        section.items.forEach(item => {
          const isSingle = !section.hasGrades;
          const currentVal = state.selections[item.id] || null;
          const isRowActive = Boolean(currentVal);

          if (isSingle) {
            const isChecked = currentVal === "Present";
            html += `
              <div class="rbcMorph100x-row single-action ${isRowActive ? "active" : ""}" data-item-id="${item.id}">
                <div class="rbcMorph100x-cell-name">
                  <span title="${item.name}">${item.name}</span>
                </div>
                <div class="rbcMorph100x-radio-col">
                  <button class="rbcMorph100x-present-badge-btn ${isChecked ? "checked" : ""}" 
                          data-action="toggle-single" 
                          data-item-id="${item.id}"
                          title="${isChecked ? 'Click to deselect' : 'Click to mark as Present'}">
                    <span>Present</span>
                  </button>
                </div>
              </div>
            `;
          } else {
            // Scale rows: 1+, 2+, 3+
            html += `
              <div class="rbcMorph100x-row ${isRowActive ? "active" : ""}" data-item-id="${item.id}">
                <div class="rbcMorph100x-cell-name">
                  <span title="${item.name}">${item.name}</span>
                </div>
                <div class="rbcMorph100x-radio-col">
                  <div class="rbcMorph100x-radio-btn ${currentVal === "1+" ? "checked" : ""}" 
                       data-action="toggle-grade" 
                       data-item-id="${item.id}" 
                       data-grade="1+" 
                       title="Slight / 1+ (${currentVal === '1+' ? 'Click to deselect' : 'Click to select'})"></div>
                </div>
                <div class="rbcMorph100x-radio-col">
                  <div class="rbcMorph100x-radio-btn ${currentVal === "2+" ? "checked" : ""}" 
                       data-action="toggle-grade" 
                       data-item-id="${item.id}" 
                       data-grade="2+" 
                       title="Moderate / 2+ (${currentVal === '2+' ? 'Click to deselect' : 'Click to select'})"></div>
                </div>
                <div class="rbcMorph100x-radio-col">
                  <div class="rbcMorph100x-radio-btn ${currentVal === "3+" ? "checked" : ""}" 
                       data-action="toggle-grade" 
                       data-item-id="${item.id}" 
                       data-grade="3+" 
                       title="Marked / 3+ (${currentVal === '3+' ? 'Click to deselect' : 'Click to select'})"></div>
                </div>
              </div>
            `;
          }
        });
      });

      tableContainer.innerHTML = html;
      updateBadge();
    }

    // --- UPDATE BADGE ---
    function updateBadge() {
      const badgeStatus = getBadgeStatus();
      const indicatorEl = document.getElementById("rbcMorph100xStatusIndicator");
      const badgeTextEl = document.getElementById("rbcMorph100xStatusBadgeText");

      if (indicatorEl && badgeTextEl) {
        indicatorEl.className = `rbcMorph100x-collapse-indicator ${badgeStatus.className}`;
        badgeTextEl.textContent = badgeStatus.text;
      }
    }

    // --- EVENT HANDLING ---
    function handleToggleGrade(itemId, grade) {
      if (state.selections[itemId] === grade) {
        // Toggle off (deselect)
        delete state.selections[itemId];
      } else {
        // Select new grade
        state.selections[itemId] = grade;
        // Selecting any abnormal morphology automatically marks overall as Abnormal
        state.overall = "Abnormal";
      }
      saveState();
      renderTable();
    }

    function handleToggleSingle(itemId) {
      if (state.selections[itemId] === "Present") {
        // Toggle off
        delete state.selections[itemId];
      } else {
        // Select Present
        state.selections[itemId] = "Present";
        // Selecting any abnormal inclusion/distribution automatically marks overall as Abnormal
        state.overall = "Abnormal";
      }
      saveState();
      renderTable();
    }

    function handleSetOverall(val) {
      if (state.overall === val) {
        state.overall = null;
      } else {
        state.overall = val;
        if (val === "Normal") {
          // Normal clears all other selections
          state.selections = {};
        }
      }
      saveState();
      renderTable();
    }

    // Delegated table clicks
    const tableEl = document.getElementById("rbcMorph100xTable");
    if (tableEl) {
      tableEl.addEventListener("click", (e) => {
        const overallBtn = e.target.closest("[data-action='set-overall']");
        if (overallBtn) {
          const val = overallBtn.getAttribute("data-val");
          handleSetOverall(val);
          return;
        }

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
      });
    }

    // Reset button
    const resetBtn = document.getElementById("rbcMorph100xResetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", (e) => {
        e.preventDefault();
        state.overall = null;
        state.selections = {};
        saveState();
        renderTable();
        showToast("All morphology evaluations reset.");
      });
    }

    // Share button
    const shareBtn = document.getElementById("rbcMorph100xShareBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", (e) => {
        e.preventDefault();
        copyShareLink();
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

    // --- MINIMIZE / EXPAND CONTROL ---
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
        wrapper.classList.remove("minimized");
        saveState();
        updateBadge();
        updateTaskPositions();
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
        saveState();
        updateBadge();
        updateTaskPositions();
      },
      isMinimized: () => Boolean(state.minimized),
      reset: () => {
        state.overall = null;
        state.selections = {};
        saveState();
        renderTable();
      },
      showProcedure: showProcedureModal,
      closeProcedure: closeProcedureModal,
      showGuide: showProcedureModal,
      isProcedureOpen: isProcedureModalOpen,
      getSummary: getMorphologySummary
    };

    const cardEl = document.getElementById("rbcMorph100xCard");
    if (cardEl) {
      cardEl.addEventListener("click", (e) => {
        if (state.minimized) {
          window.__RbcMorphology100X.expand();
        }
      });

      if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => {
          updateTaskPositions();
        });
        ro.observe(cardEl);
      }
    }

    window.addEventListener("resize", updateTaskPositions);

    // Initial render
    renderTable();
    updateBadge();
    updateTaskPositions();
  }

  // Hook DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRbcMorphology);
  } else {
    initRbcMorphology();
  }
})();
