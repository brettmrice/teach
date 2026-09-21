/**
 * Nucleated Cell Estimate Counter Overlay
 * For virtual microscope slides at 40X magnification.
 *
 * Controls:
 *   [1] : New Field (saves viewport center & zoom, triggers snapshot indicator)
 *   [2] : Add Cell (+1)
 *   [Shift + 1] : Subtract Field
 *   [Shift + 2] : Subtract Cell (-1)
 *   [Z] or [Backspace] : Undo last action
 *   [R] : Reset all counts
 */
(function () {
  if (window.__Counter40XInitialized) return;
  window.__Counter40XInitialized = true;

  function getViewer() {
    return window.viewer || window.__osdViewer || null;
  }

  const STYLES = `
    .counter40x-wrapper {
      position: fixed;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      user-select: none;
      display: flex;
      align-items: center;
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s ease, opacity 0.2s ease;
    }

    .counter40x-wrapper.inactive {
      filter: grayscale(1) contrast(0.85);
      opacity: 0.72;
    }

    .counter40x-wrapper.inactive:hover {
      filter: grayscale(0.45) contrast(0.95);
      opacity: 0.9;
    }

    .counter40x-wrapper.minimized {
      transform: translateY(-50%) translateX(calc(-100% + 28px));
    }

    .counter40x-card {
      position: relative;
      background: #ffffff;
      color: #1e293b;
      border: 1px solid #cbd5e1;
      border-left: none;
      border-radius: 0 14px 14px 0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      padding: 12px 14px;
      width: 228px;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    .counter40x-status-tab {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-bottom: 1px solid #ffffff;
      border-radius: 6px 6px 0 0;
      padding: 3px 9px 2px 9px;
      margin-bottom: -1px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.04);
      color: #10b981;
      pointer-events: none;
      z-index: 10;
      white-space: nowrap;
    }

    .counter40x-toggle-btn {
      width: 26px;
      height: 54px;
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

    .counter40x-toggle-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .counter40x-toggle-btn svg {
      transition: transform 0.25s ease;
    }

    .counter40x-wrapper.minimized .counter40x-toggle-btn svg {
      transform: rotate(180deg);
    }

    .counter40x-header {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
      text-align: center;
    }

    .counter40x-title-group {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
    }

    .counter40x-help-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #f1f5f9;
      color: #0284c7;
      border: 1.5px solid #cbd5e1;
      font-size: 20px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .counter40x-help-btn:hover {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
    }

    .counter40x-title {
      font-size: 12.5px;
      line-height: 1.25;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
      text-align: center;
    }

    .counter40x-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
    }

    .counter40x-dot.inactive {
      background: #94a3b8;
      box-shadow: none;
    }

    .counter40x-dot.review {
      background: #0284c7;
      box-shadow: 0 0 6px rgba(2, 132, 199, 0.6);
    }

    .counter40x-summary {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 8px;
    }

    .counter40x-stat-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 9px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .counter40x-stat-label {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      font-weight: 600;
      color: #64748b;
    }

    .counter40x-stat-val {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      font-variant-numeric: tabular-nums;
      transition: transform 0.15s ease, color 0.15s ease;
    }

    .counter40x-pulse {
      animation: counter40xPulseAnim 0.25s ease-out;
    }

    @keyframes counter40xPulseAnim {
      0% { transform: scale(1); }
      50% { transform: scale(1.22); color: #0284c7; }
      100% { transform: scale(1); }
    }



    .counter40x-instructions {
      font-size: 10.5px;
      color: #334155;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 7px 9px;
      margin-bottom: 8px;
    }

    .counter40x-instructions-title {
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 5px;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.4px;
    }

    .counter40x-instructions-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      line-height: 1.55;
    }

    .counter40x-key {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 10px;
      background: #e2e8f0;
      color: #1e293b;
      padding: 1px 5px;
      border-radius: 3px;
      font-weight: 600;
    }

    .counter40x-history-title {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .counter40x-history-list {
      flex: 1;
      overflow-y: auto;
      min-height: 60px;
      max-height: 140px;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      background: #fafafa;
      padding: 2px 0;
    }

    .counter40x-history-empty {
      font-size: 10.5px;
      color: #94a3b8;
      font-style: italic;
      text-align: center;
      padding: 16px 6px;
      line-height: 1.35;
    }

    .counter40x-history-item {
      display: flex;
      flex-direction: column;
      padding: 6px 8px;
      font-size: 11px;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      transition: background-color 0.12s ease;
      box-sizing: border-box;
      position: relative;
    }

    .counter40x-history-item:last-child {
      border-bottom: none;
    }

    .counter40x-history-item:hover {
      background: #e0f2fe;
    }

    .counter40x-history-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 6px;
    }

    .counter40x-history-item.active {
      background: #e0f2fe;
      border-left: 3px solid #0284c7;
      padding-left: 5px;
      font-weight: 700;
    }

    .counter40x-history-item.active .counter40x-history-field-name {
      color: #0369a1;
    }

    .counter40x-history-item.active .counter40x-history-count {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
    }

    .counter40x-chevron {
      width: 11px;
      height: 11px;
      margin-right: 2px;
      transition: transform 0.2s ease;
      color: #64748b;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .counter40x-history-item.expanded .counter40x-chevron {
      transform: rotate(90deg);
      color: #0284c7;
    }

    .counter40x-cell-list {
      display: flex;
      flex-direction: column;
      margin-top: 5px;
      padding-top: 4px;
      padding-left: 10px;
      border-top: 1px dashed #e2e8f0;
      gap: 3px;
    }

    .counter40x-cell-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 10.5px;
      color: #475569;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      cursor: pointer;
      transition: all 0.12s ease;
    }

    .counter40x-cell-item:hover {
      background: #e0f2fe;
      color: #0369a1;
      border-color: #bae6fd;
    }

    .counter40x-cell-item.active {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
      font-weight: 700;
    }

    .counter40x-cell-item.active .counter40x-cell-jump-tag {
      color: #e0f2fe;
    }

    .counter40x-cell-jump-tag {
      font-size: 9px;
      color: #94a3b8;
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }

    .counter40x-history-field-name {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #334155;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }

    .counter40x-history-count {
      font-weight: 700;
      color: #0f172a;
      background: #ffffff;
      padding: 1px 7px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      font-size: 10.5px;
      white-space: nowrap;
      flex-shrink: 0;
      box-sizing: border-box;
      font-variant-numeric: tabular-nums;
    }

    .counter40x-history-jump-icon {
      color: #0284c7;
      font-size: 10.5px;
      margin-left: 1px;
      flex-shrink: 0;
    }

    .counter40x-pulse {
      animation: counterPulseAnim 0.25s ease-out;
    }

    @keyframes counterPulseAnim {
      0% { transform: scale(1.2); color: #2563eb; }
      100% { transform: scale(1); }
    }

    .counter40x-review-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      border-radius: 9999px;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }

    .counter40x-history-item.in-progress {
      background: #f0fdf4;
      border-left: 3px solid #10b981;
      padding-left: 5px;
      padding-bottom: 5px;
    }

    .counter40x-history-item.in-progress .counter40x-history-field-name {
      color: #065f46;
      font-weight: 700;
    }

    .counter40x-history-item.in-progress .counter40x-history-count {
      border-color: #a7f3d0;
      background: #ffffff;
      color: #047857;
    }

    .counter40x-badge-in-progress {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      width: fit-content;
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
      padding: 2px 7px;
      border-radius: 4px;
      margin: 4px auto 0 auto;
      line-height: 1.2;
      box-sizing: border-box;
    }

    .counter40x-badge-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #16a34a;
      animation: counter40xBadgePulse 1.4s ease-in-out infinite;
      flex-shrink: 0;
    }

    @keyframes counter40xBadgePulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.35; transform: scale(0.75); }
    }

    .counter40x-actions {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
    }

    .counter40x-bottom-actions {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      width: 100%;
      box-sizing: border-box;
    }

    .counter40x-btn {
      width: auto;
      max-width: 100%;
      margin: 0 auto;
      padding: 6px 8px 6px 6px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      border: 1px solid transparent;
      outline: none;
      transition: all 0.15s ease;
      box-sizing: border-box;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .counter40x-btn-primary {
      background: #0284c7;
      color: #ffffff;
      border-color: #0369a1;
    }

    .counter40x-btn-primary:hover:not(:disabled) {
      background: #0369a1;
    }

    .counter40x-btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }

    .counter40x-btn-secondary:hover:not(:disabled) {
      background: #e2e8f0;
      color: #0f172a;
    }

    .counter40x-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .counter40x-review-notice {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 8px;
      font-size: 10.5px;
      color: #1e40af;
      line-height: 1.4;
    }

    .counter40x-toast {
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

    .counter40x-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(-8px);
    }

    .counter40x-snapshot-flash {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(255, 255, 255, 0.7);
      box-shadow: inset 0 0 80px rgba(59, 130, 246, 0.35);
      z-index: 999998;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.22s ease-out;
    }

    .counter40x-snapshot-flash.active {
      opacity: 1;
      transition: none;
    }

    /* Procedure Modal */
    .counter40x-modal-backdrop {
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

    .counter40x-modal-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }

    .counter40x-modal {
      background: #ffffff;
      color: #1e293b;
      border-radius: 14px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
      width: 100%;
      max-width: 530px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: scale(0.95) translateY(10px);
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid #cbd5e1;
    }

    .counter40x-modal-backdrop.open .counter40x-modal {
      transform: scale(1) translateY(0);
    }

    .counter40x-modal-header {
      padding: 14px 18px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .counter40x-modal-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .counter40x-modal-close-btn {
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

    .counter40x-modal-close-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .counter40x-modal-body {
      padding: 16px 18px;
      overflow-y: auto;
      font-size: 12.5px;
      line-height: 1.5;
      color: #334155;
    }

    .counter40x-modal-lead {
      margin-bottom: 12px;
      font-size: 12px;
      color: #64748b;
    }

    .counter40x-steps-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 14px;
    }

    .counter40x-step-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
    }

    .counter40x-step-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #0284c7;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .counter40x-step-content {
      flex: 1;
      font-size: 12px;
    }

    .counter40x-step-title {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }

    .counter40x-calc-formula {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 4px;
    }

    .counter40x-calc-formula-title {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1d4ed8;
    }

    .counter40x-calc-formula-equation {
      font-size: 14px;
      font-weight: 700;
      color: #0369a1;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .counter40x-shortcuts-grid {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
    }

    .counter40x-shortcuts-title {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #475569;
      margin-bottom: 6px;
    }

    .counter40x-shortcuts-table {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px 12px;
    }

    .counter40x-shortcut-cell {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11.5px;
    }

    .counter40x-modal-footer {
      padding: 12px 18px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .counter40x-startup-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: #64748b;
      cursor: pointer;
    }

    .counter40x-startup-toggle input {
      cursor: pointer;
      margin: 0;
    }

    .counter40x-modal-start-btn {
      padding: 7px 18px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      background: #0284c7;
      color: #ffffff;
      border: 1px solid #0369a1;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background-color 0.15s ease;
    }

    .counter40x-modal-start-btn:hover {
      background: #0369a1;
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

  // State
  const state = {
    minimized: false,
    mouseInWindow: true,
    activeFieldStarted: false, // true when user presses [1] to begin Field #1
    activeFieldViewport: null, // { center: {x, y}, zoom } captured when current field begins
    currentFieldCells: 0,
    currentFieldCellViews: [], // [{ id, number, center: {x, y}, zoom }]
    fields: [], // [{ id, number, cells, center: {x, y}, zoom, cellViews: [] }]
    history: [], // stack of actions for undo
    isReviewMode: false,
    selectedFieldId: null,
    selectedCellId: null,
    expandedFieldIds: new Set()
  };

  function triggerSnapshotFlash() {
    const flashEl = document.getElementById("counter40xSnapshotFlash");
    if (!flashEl) return;
    flashEl.classList.remove("active");
    void flashEl.offsetWidth; // trigger reflow
    flashEl.classList.add("active");
    setTimeout(() => {
      flashEl.classList.remove("active");
    }, 20);
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

  function scrollHistoryListToBottom(smooth = true) {
    requestAnimationFrame(() => {
      const listEl = document.getElementById("counter40xHistoryList");
      if (!listEl) return;
      if (smooth) {
        listEl.scrollTo({
          top: listEl.scrollHeight,
          behavior: "smooth"
        });
      } else {
        listEl.scrollTop = listEl.scrollHeight;
      }
    });
  }

  function handleNewField() {
    triggerSnapshotFlash();

    if (!state.activeFieldStarted) {
      // Starting Field #1 from initial Field #0 state
      state.activeFieldStarted = true;
      state.activeFieldViewport = captureCurrentViewport();
      state.currentFieldCells = 0;
      state.currentFieldCellViews = [];
      state.history.push({
        type: "start_first_field"
      });
      soundFieldCommit();
      pulseElement("counter40xTotalFields");
      renderUI();
      scrollHistoryListToBottom(true);
      return;
    }

    // Committing the active field and advancing to next field
    // The committed field gets the position where it was being counted (activeFieldViewport),
    // or current viewport if activeFieldViewport wasn't set yet.
    const committedVp = state.activeFieldViewport || captureCurrentViewport();
    const newFieldVp = captureCurrentViewport(); // New field begins at current location
    const previousVp = state.activeFieldViewport;

    const fieldNum = state.fields.length + 1;
    const fieldRecord = {
      id: "f_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      number: fieldNum,
      cells: state.currentFieldCellViews.length,
      center: committedVp.center,
      zoom: committedVp.zoom,
      cellViews: state.currentFieldCellViews.slice()
    };

    state.fields.push(fieldRecord);
    const previousCells = state.currentFieldCells;
    const previousCellViews = state.currentFieldCellViews.slice();
    state.currentFieldCells = 0;
    state.currentFieldCellViews = [];
    state.activeFieldViewport = newFieldVp;

    state.history.push({
      type: "commit_field",
      fieldRecord: fieldRecord,
      previousCells: previousCells,
      previousCellViews: previousCellViews,
      previousVp: previousVp
    });

    soundFieldCommit();
    pulseElement("counter40xTotalFields");
    renderUI();
    scrollHistoryListToBottom(true);
  }

  function incrementCell(amount = 1) {
    let wasFirstFieldStarted = false;
    if (!state.activeFieldStarted) {
      // Auto-start field 1 if user starts counting right away
      state.activeFieldStarted = true;
      state.activeFieldViewport = captureCurrentViewport();
      triggerSnapshotFlash();
      wasFirstFieldStarted = true;
    } else if (!state.activeFieldViewport) {
      state.activeFieldViewport = captureCurrentViewport();
    }

    if (amount < 0) {
      if (state.currentFieldCells <= 0 || state.currentFieldCellViews.length === 0) {
        soundError();
        return;
      }
      const removedCell = state.currentFieldCellViews.pop();
      state.currentFieldCells = state.currentFieldCellViews.length;
      state.history.push({
        type: "modify_cells",
        amount: -1,
        removedCell: removedCell
      });
      soundUndo();
      renderUI();
      return;
    }

    // Add cell (+1)
    const vp = captureCurrentViewport();
    const cellNum = state.currentFieldCellViews.length + 1;
    const cellRecord = {
      id: "c_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      number: cellNum,
      center: vp.center,
      zoom: vp.zoom
    };

    state.currentFieldCellViews.push(cellRecord);
    state.currentFieldCells = state.currentFieldCellViews.length;
    state.history.push({
      type: "modify_cells",
      amount: 1,
      cellRecord: cellRecord
    });

    soundSuccess();
    pulseElement("counter40xAvgCells");
    renderUI();
    if (wasFirstFieldStarted) {
      scrollHistoryListToBottom(true);
    }
  }

  function undoLastAction() {
    if (state.history.length === 0) {
      soundError();
      return;
    }

    const last = state.history.pop();
    if (last.type === "modify_cells") {
      if (last.amount > 0) {
        state.currentFieldCellViews.pop();
      } else if (last.amount < 0 && last.removedCell) {
        state.currentFieldCellViews.push(last.removedCell);
      }
      state.currentFieldCells = state.currentFieldCellViews.length;
      soundUndo();
    } else if (last.type === "commit_field") {
      state.fields.pop();
      state.currentFieldCellViews = last.previousCellViews || [];
      state.currentFieldCells = state.currentFieldCellViews.length;
      state.activeFieldViewport = last.previousVp || null;
      soundUndo();
    } else if (last.type === "start_first_field") {
      state.activeFieldStarted = false;
      state.activeFieldViewport = null;
      state.currentFieldCells = 0;
      state.currentFieldCellViews = [];
      soundUndo();
    } else if (last.type === "remove_field") {
      state.fields.push(last.removed);
      soundUndo();
    }

    renderUI();
  }

  function removeLastField() {
    if (state.fields.length === 0) {
      if (state.activeFieldStarted && state.currentFieldCells === 0) {
        state.activeFieldStarted = false;
        state.activeFieldViewport = null;
        state.currentFieldCellViews = [];
        soundUndo();
        renderUI();
        return;
      }
      soundError();
      return;
    }

    const removed = state.fields.pop();
    state.history.push({
      type: "remove_field",
      removed: removed
    });
    soundUndo();
    renderUI();
  }

  function resetAll() {
    if (!state.activeFieldStarted && state.fields.length === 0 && state.currentFieldCells === 0) return;
    if (window.confirm("Reset all counted fields and cell estimates?")) {
      state.fields = [];
      state.currentFieldCells = 0;
      state.currentFieldCellViews = [];
      state.activeFieldStarted = false;
      state.activeFieldViewport = null;
      state.history = [];
      state.selectedFieldId = null;
      state.selectedCellId = null;
      state.expandedFieldIds.clear();
      soundUndo();
      renderUI();
    }
  }

  function showToast(message) {
    let toast = document.getElementById("counter40xToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "counter40x-toast";
      toast.id = "counter40xToast";
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2800);
  }

  function getAllFieldsForShare() {
    const list = state.fields.slice();
    if (!state.isReviewMode && state.activeFieldStarted) {
      const vp = state.activeFieldViewport || captureCurrentViewport();
      list.push({
        id: "f_active",
        number: list.length + 1,
        cells: state.currentFieldCellViews.length,
        center: vp.center,
        zoom: vp.zoom,
        cellViews: state.currentFieldCellViews.slice()
      });
    }
    return list;
  }

  function generateShareUrl() {
    const fieldsToShare = getAllFieldsForShare();
    if (fieldsToShare.length === 0) return null;
    // Minimize payload: accurate center and zoom to 5 decimal places, fields count, and cell views
    const compactFields = fieldsToShare.map(f => {
      const fieldData = {
        n: f.number,
        c: f.cells,
        x: Math.round(f.center.x * 100000) / 100000,
        y: Math.round(f.center.y * 100000) / 100000,
        z: Math.round(f.zoom * 100000) / 100000
      };
      if (Array.isArray(f.cellViews) && f.cellViews.length > 0) {
        fieldData.cv = f.cellViews.map(cv => ({
          n: cv.number,
          x: Math.round(cv.center.x * 100000) / 100000,
          y: Math.round(cv.center.y * 100000) / 100000,
          z: Math.round(cv.zoom * 100000) / 100000
        }));
      }
      return fieldData;
    });

    const jsonStr = JSON.stringify(compactFields);
    const encoded = btoa(encodeURIComponent(jsonStr));

    const url = new URL(window.location.href);
    url.searchParams.set("review", encoded);
    return url.toString();
  }

  function copyShareLink() {
    const totalFields = state.fields.length + (!state.isReviewMode && state.activeFieldStarted ? 1 : 0);
    if (totalFields === 0) {
      soundError();
      showToast("No fields counted yet to share.");
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
      if (url.searchParams.has("review")) {
        url.searchParams.delete("review");
        const cleanPath = url.pathname + (url.search ? url.search : "") + url.hash;
        window.history.replaceState({}, document.title, cleanPath);
      }
    } catch (e) {
      console.error("Failed to clean review param from URL:", e);
    }
  }

  function exitReviewMode() {
    state.isReviewMode = false;
    state.fields = [];
    state.currentFieldCells = 0;
    state.currentFieldCellViews = [];
    state.activeFieldStarted = false;
    state.activeFieldViewport = null;
    state.history = [];
    state.selectedFieldId = null;
    state.selectedCellId = null;
    state.expandedFieldIds.clear();

    cleanUrlReviewParam();

    soundUndo();
    showToast("Exited review mode. Started fresh count.");
    renderUI();
  }

  function autoJumpToFirstFieldWhenReady() {
    if (!state.fields || state.fields.length === 0) return;
    const firstField = state.fields[0];
    let jumped = false;

    function triggerJump() {
      if (jumped) return;
      jumped = true;
      setTimeout(() => {
        jumpToField(firstField);
      }, 400);
    }

    const v = getViewer();
    if (v && v.viewport && v.isOpen && v.isOpen()) {
      triggerJump();
    } else if (v && v.addHandler) {
      const openHandler = function () {
        if (v.removeHandler) {
          v.removeHandler("open", openHandler);
        }
        triggerJump();
      };
      v.addHandler("open", openHandler);
      // Fallback timer if open event already fired or is delayed
      setTimeout(() => {
        if (!jumped) {
          triggerJump();
        }
      }, 900);
    } else {
      // Viewer not yet created; poll briefly until viewer is accessible
      let attempts = 0;
      const pollInterval = setInterval(() => {
        attempts++;
        if (jumped) {
          clearInterval(pollInterval);
          return;
        }
        const viewerInst = getViewer();
        if (viewerInst && viewerInst.viewport) {
          clearInterval(pollInterval);
          if (viewerInst.isOpen && viewerInst.isOpen()) {
            triggerJump();
          } else if (viewerInst.addHandler) {
            viewerInst.addHandler("open", function onOpen() {
              if (viewerInst.removeHandler) viewerInst.removeHandler("open", onOpen);
              triggerJump();
            });
            setTimeout(triggerJump, 700);
          } else {
            triggerJump();
          }
        } else if (attempts > 30) {
          clearInterval(pollInterval);
        }
      }, 100);
    }
  }

  function loadReviewFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const reviewParam = params.get("review");
    if (!reviewParam) return false;

    // Clean review param from the URL after the shared link has been read
    cleanUrlReviewParam();

    try {
      const decodedJson = decodeURIComponent(atob(reviewParam));
      const rawFields = JSON.parse(decodedJson);
      if (Array.isArray(rawFields) && rawFields.length > 0) {
        state.fields = rawFields.map((f, i) => {
          const fieldId = "f_rev_" + (i + 1);
          const cellViews = Array.isArray(f.cv) ? f.cv.map((c, ci) => ({
            id: "c_rev_" + (i + 1) + "_" + (ci + 1),
            number: c.n !== undefined ? c.n : (ci + 1),
            center: { x: c.x !== undefined ? c.x : 0.5, y: c.y !== undefined ? c.y : 0.5 },
            zoom: c.z !== undefined ? c.z : 1
          })) : [];

          return {
            id: fieldId,
            number: f.n !== undefined ? f.n : (i + 1),
            cells: f.c !== undefined ? f.c : cellViews.length,
            center: { x: f.x !== undefined ? f.x : 0.5, y: f.y !== undefined ? f.y : 0.5 },
            zoom: f.z !== undefined ? f.z : 1,
            cellViews: cellViews
          };
        });
        state.isReviewMode = true;
        state.activeFieldStarted = true;
        state.currentFieldCells = 0;
        state.currentFieldCellViews = [];
        state.selectedFieldId = null;
        state.selectedCellId = null;
        state.expandedFieldIds.clear();

        autoJumpToFirstFieldWhenReady();
        return true;
      }
    } catch (err) {
      console.error("Failed to parse review state from URL:", err);
    }
    return false;
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

    // Attach user cancellation listeners once if viewer supports it
    if (!v.__glideUserHandlersAttached && v.addHandler) {
      v.__glideUserHandlersAttached = true;
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

    // If movement is negligible, snap directly
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
        // Final position
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
    state.selectedCellId = null;

    // Update active highlight on all items in list
    const listEl = document.getElementById("counter40xHistoryList");
    if (listEl) {
      const items = listEl.querySelectorAll(".counter40x-history-item");
      items.forEach(item => {
        if (item.getAttribute("data-id") === field.id) {
          item.classList.add("active");
          // Ensure visible in scroll view
          item.scrollIntoView({ block: "nearest", behavior: "smooth" });
        } else {
          item.classList.remove("active");
        }
      });
      listEl.querySelectorAll(".counter40x-cell-item").forEach(item => {
        item.classList.remove("active");
      });
    }

    const v = getViewer();
    if (!v || !v.viewport) {
      console.warn("OpenSeadragon viewer not yet ready.");
      return;
    }

    soundSuccess();
    // Smooth and quick glide to saved location
    smoothPanAndZoomTo(v, field.center, field.zoom, 450);
  }

  function jumpToCell(cell, parentFieldId) {
    if (!cell) return;
    state.selectedCellId = cell.id;
    if (parentFieldId) {
      state.selectedFieldId = parentFieldId;
    }

    // Update active highlight on all items in list
    const listEl = document.getElementById("counter40xHistoryList");
    if (listEl) {
      listEl.querySelectorAll(".counter40x-cell-item").forEach(item => {
        if (item.getAttribute("data-cell-id") === cell.id) {
          item.classList.add("active");
          item.scrollIntoView({ block: "nearest", behavior: "smooth" });
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
    smoothPanAndZoomTo(v, cell.center, cell.zoom, 450);
  }

  function pulseElement(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove("counter40x-pulse");
      void el.offsetWidth;
      el.classList.add("counter40x-pulse");
    }
  }

  function updateTrackingStatus(active) {
    state.mouseInWindow = active;
    const wrapper = document.getElementById("counter40xWrapper");
    if (state.isReviewMode) {
      if (wrapper) wrapper.classList.remove("inactive");
      return;
    }

    if (wrapper) {
      if (active) {
        wrapper.classList.remove("inactive");
      } else {
        wrapper.classList.add("inactive");
      }
    }

    const dot = document.getElementById("counter40xDot");
    const text = document.getElementById("counter40xStatusText");
    if (dot && text) {
      if (active) {
        dot.className = "counter40x-dot";
        text.textContent = "ACTIVE";
        text.style.color = "#10b981";
      } else {
        dot.className = "counter40x-dot inactive";
        text.textContent = "INACTIVE";
        text.style.color = "#94a3b8";
      }
    }
  }

  function renderUI() {
    const committedFields = state.fields.length;
    const currentFieldCount = state.isReviewMode
      ? committedFields
      : (committedFields + (state.activeFieldStarted ? 1 : 0));

    let committedCells = 0;
    state.fields.forEach(f => { committedCells += f.cells; });
    const totalCells = committedCells + state.currentFieldCells;

    // Average per field
    let avgCells = "0.0";
    if (committedFields > 0) {
      avgCells = (committedCells / committedFields).toFixed(1);
    } else if (state.currentFieldCells > 0) {
      avgCells = state.currentFieldCells.toFixed(1);
    }

    // Update status dot and text in top appendage tab, and wrapper inactive state
    const wrapper = document.getElementById("counter40xWrapper");
    const dotEl = document.getElementById("counter40xDot");
    const statusTextEl = document.getElementById("counter40xStatusText");
    if (wrapper) {
      if (state.isReviewMode || state.mouseInWindow) {
        wrapper.classList.remove("inactive");
      } else {
        wrapper.classList.add("inactive");
      }
    }
    if (dotEl && statusTextEl) {
      if (state.isReviewMode) {
        dotEl.className = "counter40x-dot review";
        statusTextEl.textContent = "REVIEW";
        statusTextEl.style.color = "#0284c7";
      } else if (state.mouseInWindow) {
        dotEl.className = "counter40x-dot";
        statusTextEl.textContent = "ACTIVE";
        statusTextEl.style.color = "#10b981";
      } else {
        dotEl.className = "counter40x-dot inactive";
        statusTextEl.textContent = "INACTIVE";
        statusTextEl.style.color = "#94a3b8";
      }
    }

    // Render instructions / mode panel
    const modePanelEl = document.getElementById("counter40xModePanel");
    if (modePanelEl) {
      if (state.isReviewMode) {
        modePanelEl.innerHTML = `
          <div class="counter40x-review-notice">
            <b>Reviewing Shared Slide State</b><br>
            Keyboard counting is locked. Click any field below to jump to that location.
          </div>
          <div class="counter40x-actions">
            <button class="counter40x-btn counter40x-btn-secondary" id="counter40xExitReviewBtn">
              <span>✕</span> Exit Review / New Count
            </button>
          </div>
        `;
      } else {
        modePanelEl.innerHTML = `
          <div class="counter40x-instructions">
            <div class="counter40x-instructions-title">Instructions:</div>
            <div class="counter40x-instructions-row">
              <span class="counter40x-key">1</span>
              <span>New Field</span>
            </div>
            <div class="counter40x-instructions-row">
              <span class="counter40x-key">2</span>
              <span>Add Cell</span>
            </div>
            <div class="counter40x-instructions-row">
              <span class="counter40x-key">Shift+1</span>
              <span>Subtract Field</span>
            </div>
            <div class="counter40x-instructions-row">
              <span class="counter40x-key">Shift+2</span>
              <span>Subtract Cell</span>
            </div>
            <div class="counter40x-instructions-row">
              <span class="counter40x-key">Z / Backspace</span>
              <span>Undo</span>
            </div>
            <div class="counter40x-instructions-row">
              <span class="counter40x-key">R</span>
              <span>Reset</span>
            </div>
          </div>
        `;
      }

      const exitReviewBtn = document.getElementById("counter40xExitReviewBtn");
      if (exitReviewBtn) {
        exitReviewBtn.onclick = (e) => {
          e.preventDefault();
          exitReviewMode();
        };
      }
    }

    // Update stats
    const totalFieldsEl = document.getElementById("counter40xTotalFields");
    const totalCellsEl = document.getElementById("counter40xTotalCells");
    const avgCellsEl = document.getElementById("counter40xAvgCells");

    if (totalFieldsEl) totalFieldsEl.textContent = currentFieldCount;
    if (totalCellsEl) totalCellsEl.textContent = totalCells;
    if (avgCellsEl) avgCellsEl.textContent = avgCells;

    // Render Visited Fields List
    const listEl = document.getElementById("counter40xHistoryList");
    if (listEl) {
      const showInProgress = !state.isReviewMode && state.activeFieldStarted;
      const totalDisplayCount = state.fields.length + (showInProgress ? 1 : 0);

      if (totalDisplayCount === 0) {
        listEl.innerHTML = `<div class="counter40x-history-empty">No fields completed yet.<br>${state.isReviewMode ? "No fields recorded in shared link." : "Press <b>[1]</b> for New Field."}</div>`;
      } else {
        let itemsHtml = "";

        // 1. Render all committed fields
        itemsHtml += state.fields
          .map((f) => {
            const isExpanded = state.expandedFieldIds.has(f.id);
            const isSelected = state.selectedFieldId === f.id;
            const cellViews = Array.isArray(f.cellViews) ? f.cellViews : [];
            const hasCells = cellViews.length > 0;

            let cellsListHtml = "";
            if (isExpanded) {
              if (hasCells) {
                cellsListHtml = `
                  <div class="counter40x-cell-list">
                    ${cellViews.map(cv => `
                      <div class="counter40x-cell-item ${state.selectedCellId === cv.id ? "active" : ""}" data-field-id="${f.id}" data-cell-id="${cv.id}" title="Click to view Cell ${cv.number} location">
                        <span>Cell ${cv.number}</span>
                        <span class="counter40x-cell-jump-tag">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 14 14"></polyline>
                          </svg>
                          view
                        </span>
                      </div>
                    `).join("")}
                  </div>
                `;
              } else {
                cellsListHtml = `
                  <div class="counter40x-cell-list">
                    <div style="font-size: 9.5px; color: #94a3b8; font-style: italic; padding: 2px 4px;">No cell coordinates recorded</div>
                  </div>
                `;
              }
            }

            return `
              <div class="counter40x-history-item ${isSelected ? "active" : ""} ${isExpanded ? "expanded" : ""}" data-id="${f.id}" title="Click to view Field ${f.number} location and toggle cells">
                <div class="counter40x-history-row">
                  <span class="counter40x-history-field-name">
                    <svg class="counter40x-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                    <b>Field ${f.number}</b>
                  </span>
                  <span class="counter40x-history-count">${f.cells} cell${f.cells === 1 ? "" : "s"}</span>
                </div>
                ${cellsListHtml}
              </div>
            `;
          })
          .join("");

        // 2. Render currently active field with 'in progress' indicator at bottom
        if (showInProgress) {
          const inProgressNumber = state.fields.length + 1;
          const activeFieldId = "f_in_progress";
          const isSelected = state.selectedFieldId === activeFieldId;
          const isExpanded = state.expandedFieldIds.has(activeFieldId);
          const cellViews = state.currentFieldCellViews;
          const hasCells = cellViews.length > 0;

          let cellsListHtml = "";
          if (isExpanded) {
            if (hasCells) {
              cellsListHtml = `
                <div class="counter40x-cell-list">
                  ${cellViews.map(cv => `
                    <div class="counter40x-cell-item ${state.selectedCellId === cv.id ? "active" : ""}" data-field-id="${activeFieldId}" data-cell-id="${cv.id}" title="Click to view Cell ${cv.number} location">
                      <span>Cell ${cv.number}</span>
                      <span class="counter40x-cell-jump-tag">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 14 14"></polyline>
                        </svg>
                        view
                      </span>
                    </div>
                  `).join("")}
                </div>
              `;
            } else {
              cellsListHtml = `
                <div class="counter40x-cell-list">
                  <div style="font-size: 9.5px; color: #94a3b8; font-style: italic; padding: 2px 4px;">No cell coordinates recorded yet</div>
                </div>
              `;
            }
          }

          itemsHtml += `
            <div class="counter40x-history-item in-progress ${isSelected ? "active" : ""} ${isExpanded ? "expanded" : ""}" data-id="${activeFieldId}" title="Current Field ${inProgressNumber} (In Progress) - Click to view and toggle cells">
              <div class="counter40x-history-row">
                <span class="counter40x-history-field-name">
                  <svg class="counter40x-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                  <b>Field ${inProgressNumber}</b>
                </span>
                <span class="counter40x-history-count">${state.currentFieldCells} cell${state.currentFieldCells === 1 ? "" : "s"}</span>
              </div>
              <div class="counter40x-badge-in-progress">
                <span class="counter40x-badge-dot"></span>
                <span>In Progress</span>
              </div>
              ${cellsListHtml}
            </div>
          `;
        }

        listEl.innerHTML = itemsHtml;

        // Attach click handlers to field header rows (toggle accordion + jump to field)
        listEl.querySelectorAll(".counter40x-history-item").forEach((item) => {
          const id = item.getAttribute("data-id");
          const rowEl = item.querySelector(".counter40x-history-row");
          if (rowEl) {
            rowEl.addEventListener("click", (e) => {
              e.stopPropagation();
              if (state.expandedFieldIds.has(id)) {
                state.expandedFieldIds.delete(id);
              } else {
                state.expandedFieldIds.add(id);
              }

              if (id === "f_in_progress") {
                const vp = state.activeFieldViewport || captureCurrentViewport();
                jumpToField({
                  id: "f_in_progress",
                  number: state.fields.length + 1,
                  cells: state.currentFieldCells,
                  center: vp.center,
                  zoom: vp.zoom
                });
              } else {
                const f = state.fields.find(field => field.id === id);
                if (f) jumpToField(f);
              }
              renderUI();
            });
          }
        });

        // Attach click handlers to cell items (jump to cell viewport)
        listEl.querySelectorAll(".counter40x-cell-item").forEach((cellEl) => {
          cellEl.addEventListener("click", (e) => {
            e.stopPropagation();
            const fieldId = cellEl.getAttribute("data-field-id");
            const cellId = cellEl.getAttribute("data-cell-id");

            let targetCell = null;
            if (fieldId === "f_in_progress") {
              targetCell = state.currentFieldCellViews.find(c => c.id === cellId);
            } else {
              const f = state.fields.find(field => field.id === fieldId);
              if (f && f.cellViews) {
                targetCell = f.cellViews.find(c => c.id === cellId);
              }
            }

            if (targetCell) {
              jumpToCell(targetCell, fieldId);
            }
          });
        });
      }
    }

    // Render Share Action below field log
    const bottomActionsEl = document.getElementById("counter40xBottomActions");
    if (bottomActionsEl) {
      bottomActionsEl.innerHTML = `
        <button class="counter40x-btn counter40x-btn-primary" id="counter40xShareBtn" ${currentFieldCount === 0 ? "disabled" : ""}>
          <span>🔗</span> ${state.isReviewMode ? "Copy Share Link" : "Share Review Link"}
        </button>
      `;

      const shareBtn = document.getElementById("counter40xShareBtn");
      if (shareBtn) {
        shareBtn.onclick = (e) => {
          e.preventDefault();
          copyShareLink();
        };
      }
    }
  }

  function showProcedureModal() {
    const backdrop = document.getElementById("counter40xModalBackdrop");
    if (!backdrop) return;
    const chk = document.getElementById("counter40xDontShowAgain");
    if (chk) {
      chk.checked = localStorage.getItem("counter40x_hide_procedure") === "1";
    }
    backdrop.classList.add("open");
  }

  function closeProcedureModal() {
    const backdrop = document.getElementById("counter40xModalBackdrop");
    if (!backdrop) return;
    const chk = document.getElementById("counter40xDontShowAgain");
    if (chk) {
      if (chk.checked) {
        try { localStorage.setItem("counter40x_hide_procedure", "1"); } catch (e) {}
      } else {
        try { localStorage.removeItem("counter40x_hide_procedure"); } catch (e) {}
      }
    }
    backdrop.classList.remove("open");
  }

  function isProcedureModalOpen() {
    const backdrop = document.getElementById("counter40xModalBackdrop");
    return backdrop && backdrop.classList.contains("open");
  }

  function createProcedureModal() {
    const modalHtml = `
      <div class="counter40x-modal" role="dialog" aria-modal="true" aria-labelledby="counter40xModalTitle">
        <div class="counter40x-modal-header">
          <div class="counter40x-modal-title" id="counter40xModalTitle">
            <span>Procedure: Total Nucleated Cell (TNC) Estimate</span>
          </div>
          <button class="counter40x-modal-close-btn" id="counter40xModalCloseBtn" title="Close">✕</button>
        </div>
        <div class="counter40x-modal-body">
          <div class="counter40x-modal-lead">
            Follow these standard laboratory steps at <b>40X magnification</b> to perform an accurate Total Nucleated Cell estimate:
          </div>

          <div class="counter40x-steps-list">
            <div class="counter40x-step-item">
              <div class="counter40x-step-num">1</div>
              <div class="counter40x-step-content">
                <div class="counter40x-step-title">Scan at Least 10 Fields</div>
                <div>Pan systematically across the specimen to evaluate at least <b>10 representative, non-overlapping fields</b>.</div>
              </div>
            </div>

            <div class="counter40x-step-item">
              <div class="counter40x-step-num">2</div>
              <div class="counter40x-step-content">
                <div class="counter40x-step-title">Record / Advance Field</div>
                <div>Press <span class="counter40x-key">1</span> to log the field count and capture the current slide viewport location.</div>
              </div>
            </div>

            <div class="counter40x-step-item">
              <div class="counter40x-step-num">3</div>
              <div class="counter40x-step-content">
                <div class="counter40x-step-title">Count Nucleated Cells</div>
                <div>Count all nucleated cells present in the active field using the <span class="counter40x-key">2</span> key (or <span class="counter40x-key">Shift+2</span> to subtract).</div>
              </div>
            </div>

            <div class="counter40x-step-item">
              <div class="counter40x-step-num">4</div>
              <div class="counter40x-step-content">
                <div class="counter40x-step-title">Calculate Average per Field</div>
                <div>Determine the average number of nucleated cells per field across all evaluated fields.</div>
              </div>
            </div>

            <div class="counter40x-step-item">
              <div class="counter40x-step-num">5</div>
              <div class="counter40x-step-content">
                <div class="counter40x-step-title">Multiply by 2,000 for Total TNC</div>
                <div>Multiply your average field count by <b>2,000</b> to obtain the estimated Total Nucleated Cell count.</div>
              </div>
            </div>
          </div>

          <div class="counter40x-calc-formula">
            <span class="counter40x-calc-formula-title">TNC Estimation Formula</span>
            <span class="counter40x-calc-formula-equation">Total TNC = (Average Cells / Field) × 2,000</span>
          </div>

          <div class="counter40x-shortcuts-grid">
            <div class="counter40x-shortcuts-title">Key Controls:</div>
            <div class="counter40x-shortcuts-table">
              <div class="counter40x-shortcut-cell">
                <span>New Field:</span>
                <span class="counter40x-key">1</span>
              </div>
              <div class="counter40x-shortcut-cell">
                <span>Add Cell (+1):</span>
                <span class="counter40x-key">2</span>
              </div>
              <div class="counter40x-shortcut-cell">
                <span>Subtract Field:</span>
                <span class="counter40x-key">Shift + 1</span>
              </div>
              <div class="counter40x-shortcut-cell">
                <span>Subtract Cell:</span>
                <span class="counter40x-key">Shift + 2</span>
              </div>
              <div class="counter40x-shortcut-cell">
                <span>Undo:</span>
                <span class="counter40x-key">Z / Backspace</span>
              </div>
              <div class="counter40x-shortcut-cell">
                <span>Reset All:</span>
                <span class="counter40x-key">R</span>
              </div>
            </div>
          </div>
        </div>
        <div class="counter40x-modal-footer">
          <label class="counter40x-startup-toggle">
            <input type="checkbox" id="counter40xDontShowAgain">
            <span>Don't show on startup</span>
          </label>
          <button class="counter40x-modal-start-btn" id="counter40xModalStartBtn">
            <span>Start Counting</span>
            <span>→</span>
          </button>
        </div>
      </div>
    `;

    const backdrop = document.createElement("div");
    backdrop.className = "counter40x-modal-backdrop";
    backdrop.id = "counter40xModalBackdrop";
    backdrop.innerHTML = modalHtml;
    document.body.appendChild(backdrop);

    // Event listeners
    const closeBtn = document.getElementById("counter40xModalCloseBtn");
    const startBtn = document.getElementById("counter40xModalStartBtn");

    if (closeBtn) closeBtn.addEventListener("click", closeProcedureModal);
    if (startBtn) startBtn.addEventListener("click", closeProcedureModal);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        closeProcedureModal();
      }
    });
  }

  function initCounter() {
    // Inject styles
    const styleEl = document.createElement("style");
    styleEl.innerHTML = STYLES;
    document.head.appendChild(styleEl);

    // Full window snapshot flash overlay
    const flashEl = document.createElement("div");
    flashEl.className = "counter40x-snapshot-flash";
    flashEl.id = "counter40xSnapshotFlash";
    document.body.appendChild(flashEl);

    // Create Procedure Modal
    createProcedureModal();

    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "counter40x-wrapper";
    wrapper.id = "counter40xWrapper";

    wrapper.innerHTML = `
      <div class="counter40x-card">
        <div class="counter40x-status-tab" id="counter40xStatusTab">
          <div class="counter40x-dot" id="counter40xDot"></div>
          <span id="counter40xStatusText">ACTIVE</span>
        </div>

        <div class="counter40x-header">
          <div class="counter40x-title-group">
            <div class="counter40x-title">
              <span>Nucleated Cell Estimate</span>
            </div>
            <button class="counter40x-help-btn" id="counter40xHelpBtn" title="Procedure & Key Controls">?</button>
          </div>
        </div>

        <div id="counter40xModePanel"></div>

        <div class="counter40x-summary">
          <div class="counter40x-stat-box">
            <span class="counter40x-stat-label">Field Count</span>
            <span class="counter40x-stat-val" id="counter40xTotalFields">0</span>
          </div>
          <div class="counter40x-stat-box">
            <span class="counter40x-stat-label">Avg / Field</span>
            <span class="counter40x-stat-val" id="counter40xAvgCells">0.0</span>
          </div>
        </div>

        <div class="counter40x-history-title">
          <span>Visited Fields</span>
          <span style="font-size: 10px; color: #64748b; font-weight: normal;">Total: <b id="counter40xTotalCells">0</b></span>
        </div>

        <div class="counter40x-history-list" id="counter40xHistoryList">
          <div class="counter40x-history-empty">No fields completed yet.<br>Press <b>[1]</b> for New Field.</div>
        </div>

        <div class="counter40x-bottom-actions" id="counter40xBottomActions"></div>
      </div>

      <button class="counter40x-toggle-btn" id="counter40xToggleBtn" title="Collapse/Expand Counter">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
    `;

    document.body.appendChild(wrapper);

    // Help button click listener
    const helpBtn = document.getElementById("counter40xHelpBtn");
    if (helpBtn) {
      helpBtn.addEventListener("click", (e) => {
        e.preventDefault();
        showProcedureModal();
      });
    }

    // Toggle button collapse/expand
    const toggleBtn = document.getElementById("counter40xToggleBtn");
    toggleBtn.addEventListener("click", () => {
      state.minimized = !state.minimized;
      if (state.minimized) {
        wrapper.classList.add("minimized");
      } else {
        wrapper.classList.remove("minimized");
      }
    });

    // Window focus / blur tracking
    document.addEventListener("mouseenter", () => updateTrackingStatus(true));
    document.addEventListener("mouseleave", (e) => {
      if (!e.relatedTarget && !e.toElement) {
        updateTrackingStatus(false);
      }
    });
    window.addEventListener("focus", () => updateTrackingStatus(true));
    window.addEventListener("blur", () => updateTrackingStatus(false));

    // Global keyboard listener
    window.addEventListener("keydown", function (e) {
      if (isProcedureModalOpen()) {
        if (e.key === "Escape") {
          closeProcedureModal();
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      if (state.isReviewMode) {
        // Counting controls locked in review mode
        return;
      }

      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return;
      }

      const key = e.key;
      const code = e.code;
      const isShift = e.shiftKey;
      let handled = false;

      if (key === "1" || code === "Digit1" || code === "Numpad1") {
        if (isShift) {
          removeLastField();
        } else {
          handleNewField();
        }
        handled = true;
      } else if (key === "2" || code === "Digit2" || code === "Numpad2") {
        incrementCell(isShift ? -1 : 1);
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
    renderUI();

    // Show procedure modal on initial page load if not in review mode and not suppressed
    if (!isReview) {
      try {
        if (localStorage.getItem("counter40x_hide_procedure") !== "1") {
          showProcedureModal();
        }
      } catch (err) {
        showProcedureModal();
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCounter);
  } else {
    initCounter();
  }
})();
