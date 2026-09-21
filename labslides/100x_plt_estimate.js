/**
 * Platelet Estimate Counter Overlay
 * For virtual microscope slides at 100X magnification.
 *
 * Controls:
 *   [1] : New Field (saves viewport center & zoom, triggers snapshot indicator)
 *   [2] : Add Platelet (+1)
 *   [Shift + 1] : Subtract Field
 *   [Shift + 2] : Subtract Platelet (-1)
 *   [Z] or [Backspace] : Undo last action
 *   [R] : Reset all counts
 */
(function () {
  if (window.__Counter100XInitialized) return;
  window.__Counter100XInitialized = true;

  function getViewer() {
    return window.viewer || window.__osdViewer || null;
  }

  const STYLES = `
    .counter100x-wrapper {
      position: fixed;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      z-index: 999998;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      user-select: none;
      display: flex;
      align-items: center;
      transition: filter 0.2s ease, opacity 0.2s ease;
    }

    .counter100x-wrapper.inactive {
      filter: grayscale(1) contrast(0.85);
      opacity: 0.72;
    }

    .counter100x-wrapper.inactive:hover {
      filter: grayscale(0.45) contrast(0.95);
      opacity: 0.9;
    }

    .counter100x-wrapper.minimized {
      top: 50%;
      transform: translateY(calc(-50% + 48px));
    }

    .counter100x-wrapper.minimized.displaced-top {
      top: 50% !important;
      transform: translateY(var(--counter100x-displaced-top, calc(-50% - 320px))) !important;
    }

    .counter100x-wrapper.minimized.displaced-bottom {
      top: 50% !important;
      transform: translateY(var(--counter100x-displaced-bottom, calc(-50% + 320px))) !important;
    }

    .counter100x-card {
      position: relative;
      background: #ffffff;
      color: #1e293b;
      border: 1px solid #cbd5e1;
      border-left: none;
      border-radius: 0 14px 14px 0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      padding: 12px 14px;
      width: 228px;
      max-height: calc(100vh - 180px);
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    .counter100x-wrapper.minimized .counter100x-card {
      width: 154px;
      box-sizing: border-box;
      padding: 6px 10px 7px 10px;
      border-radius: 0 10px 10px 0;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.16);
      cursor: pointer;
    }

    .counter100x-wrapper.minimized .counter100x-card:hover {
      background: #f8fafc;
      border-color: #38bdf8;
      box-shadow: 0 6px 18px rgba(2, 132, 199, 0.22);
    }

    .counter100x-wrapper.minimized .counter100x-status-bar,
    .counter100x-wrapper.minimized .counter100x-progress-card,
    .counter100x-wrapper.minimized #counter100xModePanel,
    .counter100x-wrapper.minimized .counter100x-summary,
    .counter100x-wrapper.minimized .counter100x-history-title,
    .counter100x-wrapper.minimized .counter100x-history-list,
    .counter100x-wrapper.minimized .counter100x-bottom-actions {
      display: none !important;
    }

    .counter100x-status-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      box-sizing: border-box;
      padding: 4px 8px;
      margin-bottom: 8px;
      background: #f0f9ff;
      border: 1px solid #e0f2fe;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #0284c7;
      user-select: none;
    }

    .counter100x-status-bar.inactive {
      background: #f8fafc;
      border-color: #e2e8f0;
      color: #64748b;
    }

    .counter100x-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
      width: 100%;
      box-sizing: border-box;
    }

    .counter100x-wrapper.minimized .counter100x-header {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    .counter100x-wrapper:not(.minimized) .counter100x-collapse-indicator {
      display: none !important;
    }

    .counter100x-title-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      width: 100%;
    }

    .counter100x-wrapper:not(.minimized) .counter100x-title-group {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }

    .counter100x-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      width: 100%;
    }

    .counter100x-wrapper.minimized .counter100x-title-row {
      justify-content: center;
    }

    .counter100x-collapse-indicator {
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

    .counter100x-collapse-indicator.perform {
      background: #f0f9ff;
      color: #0284c7;
      border: 1px solid #bae6fd;
    }
    .counter100x-collapse-indicator.perform:hover {
      background: #e0f2fe;
      border-color: #7dd3fc;
      color: #0369a1;
    }

    .counter100x-collapse-indicator.in-progress {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
    }
    .counter100x-collapse-indicator.in-progress:hover {
      background: #dbeafe;
      border-color: #93c5fd;
      color: #1d4ed8;
    }

    .counter100x-collapse-indicator.complete {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }
    .counter100x-collapse-indicator.complete:hover {
      background: #d1fae5;
      border-color: #6ee7b7;
      color: #047857;
    }

    .counter100x-collapse-indicator-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }

    .counter100x-help-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #f1f5f9;
      color: #0284c7;
      border: 1.5px solid #cbd5e1;
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

    .counter100x-help-btn:hover {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
    }

    .counter100x-wrapper.minimized .counter100x-help-btn {
      display: none !important;
    }

    .counter100x-title {
      font-size: 14px;
      line-height: 1.25;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #0369a1;
      text-align: left;
      flex: 1;
    }

    .counter100x-wrapper.minimized .counter100x-title {
      font-size: 12px;
      text-align: center;
      flex: none;
    }

    .counter100x-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #0284c7;
      box-shadow: 0 0 6px rgba(2, 132, 199, 0.6);
    }

    .counter100x-dot.inactive {
      background: #94a3b8;
      box-shadow: none;
    }

    .counter100x-dot.review {
      background: #0284c7;
      box-shadow: 0 0 6px rgba(2, 132, 199, 0.6);
    }

    /* Primary Progress Banner matching WBC differential */
    .counter100x-progress-card {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 6px 10px;
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .counter100x-progress-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      color: #0369a1;
    }

    .counter100x-progress-header-label {
      font-weight: 700;
      color: #0369a1;
    }

    .counter100x-progress-header-val {
      font-weight: 700;
      text-align: right;
      font-variant-numeric: tabular-nums;
      color: #0284c7;
    }

    .counter100x-progress-bar-bg {
      width: 100%;
      height: 6px;
      background: #bae6fd;
      border-radius: 999px;
      overflow: hidden;
      position: relative;
    }

    .counter100x-progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #0284c7, #0369a1);
      width: 0%;
      transition: width 0.2s ease;
      border-radius: 999px;
    }

    .counter100x-progress-bar-fill.complete {
      background: linear-gradient(90deg, #10b981, #059669);
    }

    .counter100x-summary {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 8px;
    }

    .counter100x-stat-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 9px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .counter100x-stat-label {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      font-weight: 600;
      color: #64748b;
    }

    .counter100x-stat-val {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      font-variant-numeric: tabular-nums;
      transition: transform 0.15s ease, color 0.15s ease;
    }

    .counter100x-pulse {
      animation: counter100xPulseAnim 0.25s ease-out;
    }

    @keyframes counter100xPulseAnim {
      0% { transform: scale(1); }
      50% { transform: scale(1.22); color: #0284c7; }
      100% { transform: scale(1); }
    }

    .counter100x-instructions {
      font-size: 10.5px;
      color: #334155;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 7px 9px;
      margin-bottom: 8px;
    }

    .counter100x-instructions-title {
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 5px;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.4px;
    }

    .counter100x-instructions-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      line-height: 1.55;
    }

    .counter100x-key {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 10px;
      background: #e2e8f0;
      color: #1e293b;
      padding: 1px 5px;
      border-radius: 3px;
      font-weight: 600;
    }

    .counter100x-history-title {
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

    .counter100x-history-list {
      flex: 1;
      overflow-y: auto;
      min-height: 60px;
      max-height: 140px;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      background: #fafafa;
      padding: 2px 0;
    }

    .counter100x-history-empty {
      font-size: 10.5px;
      color: #94a3b8;
      font-style: italic;
      text-align: center;
      padding: 16px 6px;
      line-height: 1.35;
    }

    .counter100x-history-item {
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

    .counter100x-history-item:last-child {
      border-bottom: none;
    }

    .counter100x-history-item:hover {
      background: #e0f2fe;
    }

    .counter100x-history-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 6px;
    }

    .counter100x-history-item.active {
      background: #e0f2fe;
      border-left: 3px solid #0284c7;
      padding-left: 5px;
      font-weight: 700;
    }

    .counter100x-history-item.active .counter100x-history-field-name {
      color: #0369a1;
    }

    .counter100x-history-item.active .counter100x-history-count {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
    }

    .counter100x-chevron {
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

    .counter100x-history-item.expanded .counter100x-chevron {
      transform: rotate(90deg);
      color: #0284c7;
    }

    .counter100x-cell-list {
      display: flex;
      flex-direction: column;
      margin-top: 5px;
      padding-top: 4px;
      padding-left: 10px;
      border-top: 1px dashed #e2e8f0;
      gap: 3px;
    }

    .counter100x-cell-item {
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

    .counter100x-cell-item:hover {
      background: #e0f2fe;
      color: #0369a1;
      border-color: #bae6fd;
    }

    .counter100x-cell-item.active {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
      font-weight: 700;
    }

    .counter100x-cell-item.active .counter100x-cell-jump-tag {
      color: #e0f2fe;
    }

    .counter100x-cell-jump-tag {
      font-size: 9px;
      color: #94a3b8;
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }

    .counter100x-history-field-name {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #334155;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }

    .counter100x-history-count {
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

    .counter100x-history-jump-icon {
      color: #0284c7;
      font-size: 10.5px;
      margin-left: 1px;
      flex-shrink: 0;
    }

    .counter100x-review-badge {
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

    .counter100x-history-item.in-progress {
      background: #f0fdf4;
      border-left: 3px solid #10b981;
      padding-left: 5px;
      padding-bottom: 5px;
    }

    .counter100x-history-item.in-progress .counter100x-history-field-name {
      color: #065f46;
      font-weight: 700;
    }

    .counter100x-history-item.in-progress .counter100x-history-count {
      border-color: #a7f3d0;
      background: #ffffff;
      color: #047857;
    }

    .counter100x-badge-in-progress {
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

    .counter100x-badge-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #16a34a;
      animation: counter100xBadgePulse 1.4s ease-in-out infinite;
      flex-shrink: 0;
    }

    @keyframes counter100xBadgePulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.35; transform: scale(0.75); }
    }

    .counter100x-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      margin-top: 4px;
    }

    .counter100x-bottom-actions {
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      width: 100%;
      box-sizing: border-box;
    }

    .counter100x-btn {
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

    .counter100x-btn-primary {
      background: #0284c7;
      color: #ffffff;
      border-color: #0369a1;
    }

    .counter100x-btn-primary:hover:not(:disabled) {
      background: #0369a1;
    }

    .counter100x-btn-secondary {
      background: #f0f9ff;
      color: #0369a1;
      border-color: #bae6fd;
    }

    .counter100x-btn-secondary:hover:not(:disabled) {
      background: #e0f2fe;
      color: #0284c7;
    }

    .counter100x-btn-minimize {
      width: 100%;
      margin-top: 4px;
      background: #f8fafc;
      color: #64748b;
      border: 1px solid #e2e8f0;
      font-size: 10.5px;
      font-weight: 600;
      padding: 5px 8px;
    }

    .counter100x-btn-minimize:hover:not(:disabled) {
      background: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }

    .counter100x-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .counter100x-review-notice {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 8px;
      font-size: 10.5px;
      color: #1e40af;
      line-height: 1.4;
    }

    .counter100x-toast {
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

    .counter100x-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(-8px);
    }

    .counter100x-snapshot-flash {
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

    .counter100x-snapshot-flash.active {
      opacity: 1;
      transition: none;
    }

    /* Procedure Modal */
    .counter100x-modal-backdrop {
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

    .counter100x-modal-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }

    .counter100x-modal {
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

    .counter100x-modal-backdrop.open .counter100x-modal {
      transform: scale(1) translateY(0);
    }

    .counter100x-modal-header {
      padding: 14px 18px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .counter100x-modal-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .counter100x-modal-close-btn {
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

    .counter100x-modal-close-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .counter100x-modal-body {
      padding: 16px 18px;
      overflow-y: auto;
      font-size: 12.5px;
      line-height: 1.5;
      color: #334155;
    }

    .counter100x-modal-lead {
      margin-bottom: 12px;
      font-size: 12px;
      color: #64748b;
    }

    .counter100x-steps-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 14px;
    }

    .counter100x-step-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
    }

    .counter100x-step-num {
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

    .counter100x-step-content {
      flex: 1;
      font-size: 12px;
    }

    .counter100x-step-title {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }

    .counter100x-calc-formula {
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

    .counter100x-calc-formula-title {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1d4ed8;
    }

    .counter100x-calc-formula-equation {
      font-size: 14px;
      font-weight: 700;
      color: #0369a1;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .counter100x-shortcuts-grid {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
    }

    .counter100x-shortcuts-title {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #475569;
      margin-bottom: 6px;
    }

    .counter100x-shortcuts-table {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px 12px;
    }

    .counter100x-shortcut-cell {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11.5px;
    }

    .counter100x-modal-footer {
      padding: 12px 18px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .counter100x-startup-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: #64748b;
      cursor: pointer;
    }

    .counter100x-startup-toggle input {
      cursor: pointer;
      margin: 0;
    }

    .counter100x-modal-start-btn {
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

    .counter100x-modal-start-btn:hover {
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
    minimized: true,
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
    const flashEl = document.getElementById("counter100xSnapshotFlash");
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

  function scrollHistoryListToTop(smooth = true) {
    requestAnimationFrame(() => {
      const listEl = document.getElementById("counter100xHistoryList");
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

  function scrollHistoryListToBottom(smooth = true) {
    requestAnimationFrame(() => {
      const listEl = document.getElementById("counter100xHistoryList");
      if (!listEl) return;
      if (smooth && typeof listEl.scrollTo === "function") {
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
      pulseElement("counter100xTotalFields");
      renderUI();
      scrollHistoryListToTop(true);
      return;
    }

    // Committing the active field and advancing to next field
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
    pulseElement("counter100xTotalFields");
    renderUI();
    scrollHistoryListToTop(true);
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

    // Add platelet (+1)
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
    pulseElement("counter100xAvgCells");
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
    if (window.confirm("Reset all counted fields and platelet estimates?")) {
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

  function showToast(message, icon = "✓") {
    let toast = document.getElementById("counter100xToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "counter100x-toast";
      toast.id = "counter100xToast";
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
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

  function getSharePayload() {
    const fieldsToShare = getAllFieldsForShare();
    if (fieldsToShare.length === 0) return null;
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
    url.searchParams.set("plt_review", encoded);
    return url.toString();
  }

  function copyShareLink() {
    const totalFields = state.fields.length + (!state.isReviewMode && state.activeFieldStarted ? 1 : 0);
    if (totalFields === 0 && !state.isReviewMode) {
      soundError();
      showToast("Count a field before sharing.", "ℹ");
      return;
    }

    if (!state.isReviewMode && totalFields < 10) {
      soundError();
      showToast("First complete 10 fields before sharing.", "ℹ");
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
      if (url.searchParams.has("plt_review")) {
        url.searchParams.delete("plt_review");
        changed = true;
      }
      if (url.searchParams.has("review")) {
        url.searchParams.delete("review");
        changed = true;
      }
      if (changed) {
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
      setTimeout(() => {
        if (!jumped) {
          triggerJump();
        }
      }, 900);
    } else {
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
    const reviewParam = params.get("plt_review") || params.get("review");
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
        state.minimized = false;
        state.activeFieldStarted = true;
        state.currentFieldCells = 0;
        state.currentFieldCellViews = [];
        state.selectedFieldId = null;
        state.selectedCellId = null;
        state.expandedFieldIds.clear();

        // Collapse other tasks
        if (window.__Differential100X && typeof window.__Differential100X.collapse === "function") {
          window.__Differential100X.collapse();
        }
        if (window.__Differential100X && typeof window.__Differential100X.closeProcedure === "function") {
          window.__Differential100X.closeProcedure();
        }
        if (window.__RbcMorphology100X && typeof window.__RbcMorphology100X.collapse === "function") {
          window.__RbcMorphology100X.collapse();
        }
        if (window.__RbcMorphology100X && typeof window.__RbcMorphology100X.closeProcedure === "function") {
          window.__RbcMorphology100X.closeProcedure();
        }

        // Close any startup modal backdrop or procedure modals
        const taskBackdrop = document.getElementById("labTaskSelectionModalBackdrop");
        if (taskBackdrop) taskBackdrop.classList.remove("open");
        closeProcedureModal();

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

  function jumpToField(field) {
    if (!field) return;
    state.selectedFieldId = field.id;
    state.selectedCellId = null;

    const listEl = document.getElementById("counter100xHistoryList");
    if (listEl) {
      const items = listEl.querySelectorAll(".counter100x-history-item");
      items.forEach(item => {
        if (item.getAttribute("data-id") === field.id) {
          item.classList.add("active");
          item.scrollIntoView({ block: "nearest", behavior: "smooth" });
        } else {
          item.classList.remove("active");
        }
      });
      listEl.querySelectorAll(".counter100x-cell-item").forEach(item => {
        item.classList.remove("active");
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

  function jumpToCell(cell, parentFieldId) {
    if (!cell) return;
    state.selectedCellId = cell.id;
    if (parentFieldId) {
      state.selectedFieldId = parentFieldId;
    }

    const listEl = document.getElementById("counter100xHistoryList");
    if (listEl) {
      listEl.querySelectorAll(".counter100x-cell-item").forEach(item => {
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
      el.classList.remove("counter100x-pulse");
      void el.offsetWidth;
      el.classList.add("counter100x-pulse");
    }
  }

  function updateTrackingStatus(active) {
    state.mouseInWindow = active;
    const wrapper = document.getElementById("counter100xWrapper");
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

    const dot = document.getElementById("counter100xDot");
    const text = document.getElementById("counter100xStatusText");
    if (dot && text) {
      if (active) {
        dot.className = "counter100x-dot";
        text.textContent = "ACTIVE";
        text.style.color = "#0284c7";
      } else {
        dot.className = "counter100x-dot inactive";
        text.textContent = "INACTIVE";
        text.style.color = "#64748b";
      }
    }
  }

  function getPltStatus() {
    const committedFields = state.fields.length;
    if (committedFields >= 10 || state.isReviewMode) {
      return { text: "COMPLETE", className: "complete", isComplete: true };
    }
    if (committedFields > 0 || state.activeFieldStarted || state.currentFieldCells > 0) {
      return { text: "IN PROGRESS", className: "in-progress", isComplete: false };
    }
    return { text: "PERFORM", className: "perform", isComplete: false };
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
    const wrapper = document.getElementById("counter100xWrapper");
    const dotEl = document.getElementById("counter100xDot");
    const statusTextEl = document.getElementById("counter100xStatusText");
    if (wrapper) {
      if (state.isReviewMode || state.mouseInWindow) {
        wrapper.classList.remove("inactive");
      } else {
        wrapper.classList.add("inactive");
      }
    }
    if (dotEl && statusTextEl) {
      if (state.isReviewMode) {
        dotEl.className = "counter100x-dot review";
        statusTextEl.textContent = "REVIEW";
        statusTextEl.style.color = "#0284c7";
      } else if (state.mouseInWindow) {
        dotEl.className = "counter100x-dot";
        statusTextEl.textContent = "ACTIVE";
        statusTextEl.style.color = "#10b981";
      } else {
        dotEl.className = "counter100x-dot inactive";
        statusTextEl.textContent = "INACTIVE";
        statusTextEl.style.color = "#94a3b8";
      }
    }

    // Render instructions / mode panel
    const modePanelEl = document.getElementById("counter100xModePanel");
    if (modePanelEl) {
      if (state.isReviewMode) {
        modePanelEl.innerHTML = `
          <div class="counter100x-review-notice">
            <b>Reviewing Shared Slide State</b><br>
            Keyboard counting is locked. Click any field below to jump to that location.
          </div>
          <div class="counter100x-actions">
            <button class="counter100x-btn counter100x-btn-secondary" id="counter100xExitReviewBtn">
              <span>✕</span> Exit Review / New Count
            </button>
          </div>
        `;
      } else {
        modePanelEl.innerHTML = `
          <div class="counter100x-instructions">
            <div class="counter100x-instructions-title">Instructions:</div>
            <div class="counter100x-instructions-row">
              <span class="counter100x-key">1</span>
              <span>New Field</span>
            </div>
            <div class="counter100x-instructions-row">
              <span class="counter100x-key">2</span>
              <span>Add Platelet</span>
            </div>
            <div class="counter100x-instructions-row">
              <span class="counter100x-key">Shift+1</span>
              <span>Subtract Field</span>
            </div>
            <div class="counter100x-instructions-row">
              <span class="counter100x-key">Shift+2</span>
              <span>Subtract Platelet</span>
            </div>
            <div class="counter100x-instructions-row">
              <span class="counter100x-key">Z / Backspace</span>
              <span>Undo</span>
            </div>
            <div class="counter100x-instructions-row">
              <span class="counter100x-key">R</span>
              <span>Reset</span>
            </div>
          </div>
        `;
      }

      const exitReviewBtn = document.getElementById("counter100xExitReviewBtn");
      if (exitReviewBtn) {
        exitReviewBtn.onclick = (e) => {
          e.preventDefault();
          exitReviewMode();
        };
      }
    }

    // Render Progress Card (Target: 10 Fields, styled like WBC Diff)
    const progressCardEl = document.getElementById("counter100xProgressCard");
    if (progressCardEl) {
      const targetFields = 10;
      const pct = Math.min(100, Math.round((committedFields / targetFields) * 100));
      const isComplete = committedFields >= targetFields;
      progressCardEl.innerHTML = `
        <div class="counter100x-progress-header">
          <span class="counter100x-progress-header-label">Total Fields Evaluated</span>
          <span class="counter100x-progress-header-val">
            <b>${committedFields}</b> / ${targetFields} Fields
          </span>
        </div>
        <div class="counter100x-progress-bar-bg">
          <div class="counter100x-progress-bar-fill ${isComplete ? "complete" : ""}" style="width: ${pct}%;"></div>
        </div>
      `;
    }

    // Update stats
    const totalFieldsEl = document.getElementById("counter100xTotalFields");
    const totalCellsEl = document.getElementById("counter100xTotalCells");
    const avgCellsEl = document.getElementById("counter100xAvgCells");

    if (totalFieldsEl) totalFieldsEl.textContent = currentFieldCount;
    if (totalCellsEl) totalCellsEl.textContent = totalCells;
    if (avgCellsEl) avgCellsEl.textContent = avgCells;

    // Render Visited Fields List (Sorted descending: in-progress first, then newest committed fields)
    const listEl = document.getElementById("counter100xHistoryList");
    if (listEl) {
      const showInProgress = !state.isReviewMode && state.activeFieldStarted;
      const totalDisplayCount = state.fields.length + (showInProgress ? 1 : 0);

      if (totalDisplayCount === 0) {
        listEl.innerHTML = `<div class="counter100x-history-empty">No fields completed yet.<br>${state.isReviewMode ? "No fields recorded in shared link." : "Press <b>[1]</b> for New Field."}</div>`;
      } else {
        let itemsHtml = "";

        // 1. Render currently active field first (if in progress)
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
                <div class="counter100x-cell-list">
                  ${cellViews.map(cv => `
                    <div class="counter100x-cell-item ${state.selectedCellId === cv.id ? "active" : ""}" data-field-id="${activeFieldId}" data-cell-id="${cv.id}" title="Click to view Platelet ${cv.number} location">
                      <span>Platelet ${cv.number}</span>
                      <span class="counter100x-cell-jump-tag">
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
                <div class="counter100x-cell-list">
                  <div style="font-size: 9.5px; color: #94a3b8; font-style: italic; padding: 2px 4px;">No platelet coordinates recorded yet</div>
                </div>
              `;
            }
          }

          itemsHtml += `
            <div class="counter100x-history-item in-progress ${isSelected ? "active" : ""} ${isExpanded ? "expanded" : ""}" data-id="${activeFieldId}" title="Current Field ${inProgressNumber} (In Progress) - Click to view and toggle platelets">
              <div class="counter100x-history-row">
                <span class="counter100x-history-field-name">
                  <svg class="counter100x-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                  <b>Field ${inProgressNumber}</b>
                </span>
                <span class="counter100x-history-count">${state.currentFieldCells} platelet${state.currentFieldCells === 1 ? "" : "s"}</span>
              </div>
              <div class="counter100x-badge-in-progress">
                <span class="counter100x-badge-dot"></span>
                <span>In Progress</span>
              </div>
              ${cellsListHtml}
            </div>
          `;
        }

        // 2. Render all committed fields (reverse slice for descending order)
        itemsHtml += state.fields
          .slice()
          .reverse()
          .map((f) => {
            const isExpanded = state.expandedFieldIds.has(f.id);
            const isSelected = state.selectedFieldId === f.id;
            const cellViews = Array.isArray(f.cellViews) ? f.cellViews : [];
            const hasCells = cellViews.length > 0;

            let cellsListHtml = "";
            if (isExpanded) {
              if (hasCells) {
                cellsListHtml = `
                  <div class="counter100x-cell-list">
                    ${cellViews.map(cv => `
                      <div class="counter100x-cell-item ${state.selectedCellId === cv.id ? "active" : ""}" data-field-id="${f.id}" data-cell-id="${cv.id}" title="Click to view Platelet ${cv.number} location">
                        <span>Platelet ${cv.number}</span>
                        <span class="counter100x-cell-jump-tag">
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
                  <div class="counter100x-cell-list">
                    <div style="font-size: 9.5px; color: #94a3b8; font-style: italic; padding: 2px 4px;">No platelet coordinates recorded</div>
                  </div>
                `;
              }
            }

            return `
              <div class="counter100x-history-item ${isSelected ? "active" : ""} ${isExpanded ? "expanded" : ""}" data-id="${f.id}" title="Click to view Field ${f.number} location and toggle platelets">
                <div class="counter100x-history-row">
                  <span class="counter100x-history-field-name">
                    <svg class="counter100x-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                    <b>Field ${f.number}</b>
                  </span>
                  <span class="counter100x-history-count">${f.cells} platelet${f.cells === 1 ? "" : "s"}</span>
                </div>
                ${cellsListHtml}
              </div>
            `;
          })
          .join("");

        listEl.innerHTML = itemsHtml;

        // Attach click handlers to field header rows (toggle accordion + jump to field)
        listEl.querySelectorAll(".counter100x-history-item").forEach((item) => {
          const id = item.getAttribute("data-id");
          const rowEl = item.querySelector(".counter100x-history-row");
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
        listEl.querySelectorAll(".counter100x-cell-item").forEach((cellEl) => {
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

    // Render Share & Minimize Action below field log
    const bottomActionsEl = document.getElementById("counter100xBottomActions");
    if (bottomActionsEl) {
      const isShareDisabled = !state.isReviewMode && currentFieldCount === 0;
      bottomActionsEl.innerHTML = `
        <div class="counter100x-actions">
          <button class="counter100x-btn counter100x-btn-secondary" id="counter100xShareBtn" title="${isShareDisabled ? "Count a field to enable sharing" : "Share Review Link"}" ${isShareDisabled ? "disabled" : ""}>
            <span>🔗</span> Share
          </button>
          <button class="counter100x-btn counter100x-btn-secondary" id="counter100xResetBtn" title="Reset Counts">
            <span>↻</span> Reset
          </button>
        </div>
        <button class="counter100x-btn counter100x-btn-minimize" id="counter100xMinimizeBtn" title="Minimize Platelet Estimate">
          <span>▾</span> Minimize Task
        </button>
      `;

      const shareBtn = document.getElementById("counter100xShareBtn");
      if (shareBtn) {
        shareBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof window.__showLabShareTaskModal === "function") {
            window.__showLabShareTaskModal();
          } else {
            copyShareLink();
          }
        };
      }

      const resetBtn = document.getElementById("counter100xResetBtn");
      if (resetBtn) {
        resetBtn.onclick = (e) => {
          e.preventDefault();
          resetAll();
        };
      }

      const minimizeBtn = document.getElementById("counter100xMinimizeBtn");
      if (minimizeBtn) {
        minimizeBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.__Counter100X.collapse();
        };
      }
    }

    // Update Header Status Indicator (Perform / In Progress / Complete)
    const statusIndicatorEl = document.getElementById("counter100xStatusIndicator");
    if (statusIndicatorEl) {
      if (committedFields >= 10) {
        statusIndicatorEl.className = "counter100x-collapse-indicator complete";
        statusIndicatorEl.innerHTML = `<span class="counter100x-collapse-indicator-dot"></span><span>COMPLETE</span>`;
        statusIndicatorEl.title = `Task complete (${committedFields} fields logged). Click to expand/collapse.`;
      } else if (committedFields > 0 || state.activeFieldStarted || state.currentFieldCells > 0) {
        statusIndicatorEl.className = "counter100x-collapse-indicator in-progress";
        statusIndicatorEl.innerHTML = `<span class="counter100x-collapse-indicator-dot"></span><span>IN PROGRESS</span>`;
        statusIndicatorEl.title = `In progress (${currentFieldCount}/10 fields). Click to expand/collapse.`;
      } else {
        statusIndicatorEl.className = "counter100x-collapse-indicator perform";
        statusIndicatorEl.innerHTML = `<span>PERFORM</span>`;
        statusIndicatorEl.title = "Click to perform Platelet Estimate";
      }
    }
  }

  function showProcedureModal() {
    const backdrop = document.getElementById("counter100xModalBackdrop");
    if (!backdrop) return;
    const chk = document.getElementById("counter100xDontShowAgain");
    if (chk) {
      chk.checked = localStorage.getItem("counter100x_hide_procedure") === "1";
    }
    backdrop.classList.add("open");
  }

  function closeProcedureModal() {
    const backdrop = document.getElementById("counter100xModalBackdrop");
    if (!backdrop) return;
    const chk = document.getElementById("counter100xDontShowAgain");
    if (chk) {
      if (chk.checked) {
        try { localStorage.setItem("counter100x_hide_procedure", "1"); } catch (e) {}
      } else {
        try { localStorage.removeItem("counter100x_hide_procedure"); } catch (e) {}
      }
    }
    backdrop.classList.remove("open");
  }

  function isProcedureModalOpen() {
    const backdrop = document.getElementById("counter100xModalBackdrop");
    return backdrop && backdrop.classList.contains("open");
  }

  function createProcedureModal() {
    const modalHtml = `
      <div class="counter100x-modal" role="dialog" aria-modal="true" aria-labelledby="counter100xModalTitle">
        <div class="counter100x-modal-header">
          <div class="counter100x-modal-title" id="counter100xModalTitle">
            <span>Procedure: Platelet Estimate</span>
          </div>
          <button class="counter100x-modal-close-btn" id="counter100xModalCloseBtn" title="Close">✕</button>
        </div>
        <div class="counter100x-modal-body">
          <div class="counter100x-modal-lead">
            Follow these standard laboratory steps at <b>100X magnification</b> to perform an accurate Platelet Estimate:
          </div>

          <div class="counter100x-steps-list">
            <div class="counter100x-step-item">
              <div class="counter100x-step-num">1</div>
              <div class="counter100x-step-content">
                <div class="counter100x-step-title">Scan at Least 10 Fields</div>
                <div>Pan systematically across the specimen to evaluate at least <b>10 representative, non-overlapping fields</b>.</div>
              </div>
            </div>

            <div class="counter100x-step-item">
              <div class="counter100x-step-num">2</div>
              <div class="counter100x-step-content">
                <div class="counter100x-step-title">Record / Advance Field</div>
                <div>Press <span class="counter100x-key">1</span> to log the field count and capture the current slide viewport location.</div>
              </div>
            </div>

            <div class="counter100x-step-item">
              <div class="counter100x-step-num">3</div>
              <div class="counter100x-step-content">
                <div class="counter100x-step-title">Count Platelets</div>
                <div>Count all platelets present in the active field using the <span class="counter100x-key">2</span> key (or <span class="counter100x-key">Shift+2</span> to subtract).</div>
              </div>
            </div>

            <div class="counter100x-step-item">
              <div class="counter100x-step-num">4</div>
              <div class="counter100x-step-content">
                <div class="counter100x-step-title">Calculate Average per Field</div>
                <div>Determine the average number of platelets per field across all evaluated fields.</div>
              </div>
            </div>

            <div class="counter100x-step-item">
              <div class="counter100x-step-num">5</div>
              <div class="counter100x-step-content">
                <div class="counter100x-step-title">Multiply by 20,000 for Platelet Estimate</div>
                <div>Multiply your average field count by <b>20,000</b> to obtain the estimated platelet count.</div>
              </div>
            </div>
          </div>

          <div class="counter100x-calc-formula">
            <span class="counter100x-calc-formula-title">Platelet Estimation Formula</span>
            <span class="counter100x-calc-formula-equation">Estimated Platelets = (Average Platelets / Field) × 20,000</span>
          </div>

          <div class="counter100x-shortcuts-grid">
            <div class="counter100x-shortcuts-title">Key Controls:</div>
            <div class="counter100x-shortcuts-table">
              <div class="counter100x-shortcut-cell">
                <span>New Field:</span>
                <span class="counter100x-key">1</span>
              </div>
              <div class="counter100x-shortcut-cell">
                <span>Add Platelet (+1):</span>
                <span class="counter100x-key">2</span>
              </div>
              <div class="counter100x-shortcut-cell">
                <span>Subtract Field:</span>
                <span class="counter100x-key">Shift + 1</span>
              </div>
              <div class="counter100x-shortcut-cell">
                <span>Subtract Platelet:</span>
                <span class="counter100x-key">Shift + 2</span>
              </div>
              <div class="counter100x-shortcut-cell">
                <span>Undo:</span>
                <span class="counter100x-key">Z / Backspace</span>
              </div>
              <div class="counter100x-shortcut-cell">
                <span>Reset All:</span>
                <span class="counter100x-key">R</span>
              </div>
            </div>
          </div>
        </div>
        <div class="counter100x-modal-footer">
          <label class="counter100x-startup-toggle">
            <input type="checkbox" id="counter100xDontShowAgain">
            <span>Don't show on startup</span>
          </label>
          <button class="counter100x-modal-start-btn" id="counter100xModalStartBtn">
            <span>Start Counting</span>
            <span>→</span>
          </button>
        </div>
      </div>
    `;

    const backdrop = document.createElement("div");
    backdrop.className = "counter100x-modal-backdrop";
    backdrop.id = "counter100xModalBackdrop";
    backdrop.innerHTML = modalHtml;
    document.body.appendChild(backdrop);

    // Event listeners
    const closeBtn = document.getElementById("counter100xModalCloseBtn");
    const startBtn = document.getElementById("counter100xModalStartBtn");

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
    flashEl.className = "counter100x-snapshot-flash";
    flashEl.id = "counter100xSnapshotFlash";
    document.body.appendChild(flashEl);

    // Create Procedure Modal
    createProcedureModal();

    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "counter100x-wrapper" + (state.minimized ? " minimized" : "");
    wrapper.id = "counter100xWrapper";

    wrapper.innerHTML = `
      <div class="counter100x-card">
        <div class="counter100x-status-bar" id="counter100xStatusBar">
          <div class="counter100x-dot" id="counter100xDot"></div>
          <span id="counter100xStatusText">ACTIVE</span>
        </div>

        <div class="counter100x-header">
          <div class="counter100x-title-group" id="counter100xHeaderTitleGroup">
            <div class="counter100x-title-row">
              <div class="counter100x-title">Platelet Estimate</div>
              <button class="counter100x-help-btn" id="counter100xHelpBtn" title="Procedure & Key Controls">?</button>
            </div>
            <div id="counter100xStatusIndicator" class="counter100x-collapse-indicator perform">
              <span>PERFORM</span>
            </div>
          </div>
        </div>

        <div class="counter100x-progress-card" id="counter100xProgressCard"></div>

        <div id="counter100xModePanel"></div>

        <div class="counter100x-summary">
          <div class="counter100x-stat-box">
            <span class="counter100x-stat-label">Field Count</span>
            <span class="counter100x-stat-val" id="counter100xTotalFields">0</span>
          </div>
          <div class="counter100x-stat-box">
            <span class="counter100x-stat-label">Avg / Field</span>
            <span class="counter100x-stat-val" id="counter100xAvgCells">0.0</span>
          </div>
        </div>

        <div class="counter100x-history-title">
          <span>Visited Fields</span>
          <span style="font-size: 10px; color: #64748b; font-weight: normal;">Total: <b id="counter100xTotalCells">0</b></span>
        </div>

        <div class="counter100x-history-list" id="counter100xHistoryList">
          <div class="counter100x-history-empty">No fields completed yet.<br>Press <b>[1]</b> for New Field.</div>
        </div>

        <div class="counter100x-bottom-actions" id="counter100xBottomActions"></div>
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
      const counterStatusBar = document.getElementById("counter100xStatusBar");
      const counterStatusDot = document.getElementById("counter100xDot");
      const counterStatusText = document.getElementById("counter100xStatusText");
      if (counterStatusBar && counterStatusDot && counterStatusText) {
        const isFocused = (typeof document !== "undefined" && typeof document.hasFocus === "function") ? document.hasFocus() : true;
        const isWindowActive = Boolean(state.mouseInWindow || isFocused);
        if (state.isReviewMode) {
          counterStatusBar.classList.remove("inactive");
          counterStatusDot.className = "counter100x-dot review";
          counterStatusText.textContent = "REVIEW";
          counterStatusText.style.color = "#0284c7";
        } else if (isWindowActive) {
          counterStatusBar.classList.remove("inactive");
          counterStatusDot.className = "counter100x-dot";
          counterStatusText.textContent = "ACTIVE";
          counterStatusText.style.color = "#0284c7";
        } else {
          counterStatusBar.classList.add("inactive");
          counterStatusDot.className = "counter100x-dot inactive";
          counterStatusText.textContent = "INACTIVE";
          counterStatusText.style.color = "#64748b";
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

    window.__update100xTaskPositions = updateTaskPositions;

    // Expose API for coordination
    window.__Counter100X = {
      expand: () => {
        // If Differential100X or RbcMorphology100X is currently expanded, collapse first to prevent overlapping transitions
        if (window.__Differential100X && typeof window.__Differential100X.isMinimized === "function" && !window.__Differential100X.isMinimized()) {
          window.__Differential100X.collapse();
        }
        if (window.__Differential100X && typeof window.__Differential100X.closeProcedure === "function") {
          window.__Differential100X.closeProcedure();
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
          if (localStorage.getItem("counter100x_hide_procedure") !== "1") {
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
      getStatus: getPltStatus,
      getSharePayload: getSharePayload,
      getEncodedData: getSharePayload,
      copyShareLink: copyShareLink
    };

    // Observe active card size changes (e.g. visited fields toggle, adding fields, window resizing)
    const counterCardEl = wrapper.querySelector(".counter100x-card");
    if (counterCardEl && typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(() => {
        if (typeof window.__update100xTaskPositions === "function") {
          window.__update100xTaskPositions();
        } else {
          updateTaskPositions();
        }
      });
      resizeObserver.observe(counterCardEl);
    }
    window.addEventListener("resize", () => {
      if (typeof window.__update100xTaskPositions === "function") {
        window.__update100xTaskPositions();
      } else {
        updateTaskPositions();
      }
    });

    // Help button click listener
    const helpBtn = document.getElementById("counter100xHelpBtn");
    if (helpBtn) {
      helpBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showProcedureModal();
      });
    }

    const statusIndicatorElInit = document.getElementById("counter100xStatusIndicator");
    if (statusIndicatorElInit) {
      statusIndicatorElInit.onclick = (e) => {
        e.stopPropagation();
        if (state.minimized) {
          window.__Counter100X.expand();
        } else {
          window.__Counter100X.collapse();
        }
      };
    }

    // Clicking anywhere on card when minimized expands task
    const cardEl = wrapper.querySelector(".counter100x-card");
    if (cardEl) {
      cardEl.addEventListener("click", (e) => {
        if (state.minimized) {
          window.__Counter100X.expand();
        }
      });
    }

    // Window focus / blur tracking
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

    // Global keyboard listener
    window.addEventListener("keydown", function (e) {
      const procBackdrop = document.getElementById("counter100xModalBackdrop");
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

      // If counter is minimized or if differential counter is active, ignore counter_100x key controls
      if (state.minimized || (window.__Differential100XInitialized && window.__Differential100X && !window.__Differential100X.isMinimized?.())) {
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
    if (isReview) {
      state.minimized = false;
      wrapper.classList.remove("minimized");
      updateBadge();
      if (typeof window.__update100xTaskPositions === "function") {
        window.__update100xTaskPositions();
      } else {
        updateTaskPositions();
      }
    }
    renderUI();

    // Show initial startup modal only if differential_100x is not loaded (if standalone)
    if (!isReview && !window.__Differential100XInitialized) {
      try {
        if (localStorage.getItem("counter100x_hide_procedure") !== "1") {
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
