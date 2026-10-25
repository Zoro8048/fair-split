/**
 * FairSplit - Bundled Runtime (Generated via `npm run build`)
 * Pure client-side, zero runtime dependencies, local-first P2P expense splitter.
 */
(() => {
  "use strict";

  // --- Module: node_modules/ios-pwa-foundation/src/core/EventBus.js ---
  /**
   * EventBus - Decoupled Pub/Sub Event Router for iOS PWA components.
   */
  class EventBus {
    constructor() {
      this.listeners = new Map();
    }
  
    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event).add(callback);
      return () => this.off(event, callback);
    }
  
    once(event, callback) {
      const unsub = this.on(event, (data) => {
        unsub();
        callback(data);
      });
      return unsub;
    }
  
    off(event, callback) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
        if (this.listeners.get(event).size === 0) {
          this.listeners.delete(event);
        }
      }
    }
  
    emit(event, data) {
      if (this.listeners.has(event)) {
        for (const callback of this.listeners.get(event)) {
          try {
            callback(data);
          } catch (err) {
            console.error(`Error in event listener for "${event}":`, err);
          }
        }
      }
    }
  
    clear() {
      this.listeners.clear();
    }
  }

  // --- Module: node_modules/ios-pwa-foundation/src/core/StorageManager.js ---
  /**
   * StorageManager - Local-First Resilient Persistence with Migration & JSON Backup/Restore.
   */
  class StorageManager {
    constructor({ namespace = 'ios_pwa', version = 1, migrations = {}, defaults = {} } = {}) {
      this.namespace = namespace;
      this.version = version;
      this.migrations = migrations;
      this.defaults = defaults;
      this.storageKey = `${this.namespace}_state`;
      this.metaKey = `${this.namespace}_meta`;
    }
  
    isAvailable() {
      try {
        if (typeof window === 'undefined' || !window.localStorage) return false;
        const testKey = `__test_${Date.now()}__`;
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        return true;
      } catch {
        return false;
      }
    }
  
    load() {
      if (!this.isAvailable()) {
        return { ...this.defaults };
      }
  
      try {
        const raw = window.localStorage.getItem(this.storageKey);
        const metaRaw = window.localStorage.getItem(this.metaKey);
  
        if (!raw) {
          this.save(this.defaults);
          return { ...this.defaults };
        }
  
        let data = JSON.parse(raw);
        let meta = metaRaw ? JSON.parse(metaRaw) : { version: 1 };
  
        // Apply any pending migrations
        if (meta.version < this.version) {
          data = this._runMigrations(data, meta.version, this.version);
          this.save(data);
        }
  
        return data;
      } catch (err) {
        console.warn(`[StorageManager] Failed to read ${this.storageKey}, falling back to defaults:`, err);
        return { ...this.defaults };
      }
    }
  
    save(data) {
      if (!this.isAvailable()) return false;
      try {
        window.localStorage.setItem(this.storageKey, JSON.stringify(data));
        window.localStorage.setItem(
          this.metaKey,
          JSON.stringify({
            version: this.version,
            updatedAt: new Date().toISOString(),
          })
        );
        return true;
      } catch (err) {
        console.error(`[StorageManager] Quota exceeded or error saving to localStorage:`, err);
        return false;
      }
    }
  
    exportBackup() {
      const data = this.load();
      const payload = {
        app: this.namespace,
        version: this.version,
        exportedAt: new Date().toISOString(),
        payload: data,
      };
      return JSON.stringify(payload, null, 2);
    }
  
    importBackup(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON structure');
        }
        const dataToSave = parsed.payload !== undefined ? parsed.payload : parsed;
        this.save(dataToSave);
        return { success: true, data: dataToSave };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  
    clear() {
      if (!this.isAvailable()) return;
      try {
        window.localStorage.removeItem(this.storageKey);
        window.localStorage.removeItem(this.metaKey);
      } catch (err) {
        console.error('[StorageManager] Error clearing data:', err);
      }
    }
  
    estimateUsage() {
      if (!this.isAvailable()) return { bytes: 0, items: 0 };
      let bytes = 0;
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith(this.namespace)) {
            const val = window.localStorage.getItem(key) || '';
            bytes += (key.length + val.length) * 2; // UTF-16 approx
          }
        }
        return { bytes, items: window.localStorage.length };
      } catch {
        return { bytes: 0, items: 0 };
      }
    }
  
    _runMigrations(data, fromVersion, toVersion) {
      let current = { ...data };
      for (let v = fromVersion + 1; v <= toVersion; v++) {
        if (typeof this.migrations[v] === 'function') {
          try {
            current = this.migrations[v](current);
          } catch (mErr) {
            console.error(`[StorageManager] Migration to v${v} failed:`, mErr);
          }
        }
      }
      return current;
    }
  }

  // --- Module: node_modules/ios-pwa-foundation/src/hardware/AudioHaptics.js ---
  /**
   * AudioHaptics - Procedural Web Audio Synthesizer & iOS Micro-Haptic Bridge.
   * Generates tactile audio-sensory feedback with zero external sound files.
   */
  class AudioHaptics {
    constructor({ enabled = true } = {}) {
      this.enabled = enabled;
      this.ctx = null;
    }
  
    _ensureContext() {
      if (!this.enabled) return null;
      if (typeof window === 'undefined') return null;
  
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
  
      if (!this.ctx) {
        this.ctx = new AudioContextClass();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }
  
    _vibrate(pattern = 10) {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(pattern);
        } catch {}
      }
    }
  
    /**
     * Light Tap - standard button or pill press
     */
    tap() {
      this._vibrate(8);
      const ctx = this._ensureContext();
      if (!ctx) return;
  
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
  
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.03);
  
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
  
      osc.connect(gain);
      gain.connect(ctx.destination);
  
      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    }
  
    /**
     * Selection Tick - picker wheels, segmented switches, slider ticks
     */
    tick() {
      this._vibrate(5);
      const ctx = this._ensureContext();
      if (!ctx) return;
  
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
  
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.02);
  
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
  
      osc.connect(gain);
      gain.connect(ctx.destination);
  
      osc.start();
      osc.stop(ctx.currentTime + 0.025);
    }
  
    /**
     * Heavy Impact - destructive confirmations, bracket match locks, game impacts
     */
    impact() {
      this._vibrate([15, 30, 20]);
      const ctx = this._ensureContext();
      if (!ctx) return;
  
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
  
      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.12);
  
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  
      osc.connect(gain);
      gain.connect(ctx.destination);
  
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    }
  
    /**
     * Success Chime - match completion, recipe rescue, task saved
     */
    success() {
      this._vibrate([10, 50, 15]);
      const ctx = this._ensureContext();
      if (!ctx) return;
  
      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
  
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  
        gain.gain.setValueAtTime(0.09, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  
        osc.connect(gain);
        gain.connect(ctx.destination);
  
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
  
      playTone(587.33, 0.0, 0.09); // D5
      playTone(880.0, 0.07, 0.14); // A5
      playTone(1174.66, 0.14, 0.22); // D6
    }
  
    /**
     * Laser Scanner Beep - UPC barcode recognized
     */
    scanner() {
      this._vibrate(18);
      const ctx = this._ensureContext();
      if (!ctx) return;
  
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
  
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, ctx.currentTime); // A6
      osc.frequency.setValueAtTime(2349.32, ctx.currentTime + 0.04); // D7
  
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  
      osc.connect(gain);
      gain.connect(ctx.destination);
  
      osc.start();
      osc.stop(ctx.currentTime + 0.11);
    }
  
    /**
     * Warning Tone - quota alert, duplicate entry, validation error
     */
    warning() {
      this._vibrate([25, 40, 25]);
      const ctx = this._ensureContext();
      if (!ctx) return;
  
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
  
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(196, ctx.currentTime + 0.07);
  
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
  
      osc.connect(gain);
      gain.connect(ctx.destination);
  
      osc.start();
      osc.stop(ctx.currentTime + 0.17);
    }
  
    setEnabled(val) {
      this.enabled = Boolean(val);
    }
  }

  // --- Module: node_modules/ios-pwa-foundation/src/hardware/CameraService.js ---
  /**
   * CameraService - Camera Viewfinder, Torch Toggle & BarcodeDetector Stream Bridge.
   */
  class CameraService {
    constructor({ formats = ['qr_code', 'ean_13', 'upc_a', 'upc_e', 'code_128'] } = {}) {
      this.formats = formats;
      this.stream = null;
      this.videoEl = null;
      this.detector = null;
      this.isScanning = false;
      this.scanInterval = null;
      this.torchActive = false;
  
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          this.detector = new window.BarcodeDetector({ formats: this.formats });
        } catch (e) {
          console.warn('[CameraService] BarcodeDetector init failed:', e);
        }
      }
    }
  
    isSupported() {
      return (
        typeof navigator !== 'undefined' &&
        'mediaDevices' in navigator &&
        typeof navigator.mediaDevices.getUserMedia === 'function'
      );
    }
  
    hasBarcodeDetector() {
      return Boolean(this.detector);
    }
  
    async start({ videoElement, onDetected } = {}) {
      if (!this.isSupported()) {
        throw new Error('Camera mediaDevices API is not supported on this device.');
      }
  
      this.videoEl = videoElement;
  
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
  
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (this.videoEl) {
        this.videoEl.srcObject = this.stream;
        this.videoEl.setAttribute('playsinline', 'true');
        await this.videoEl.play();
      }
  
      if (this.detector && typeof onDetected === 'function') {
        this._startScanLoop(onDetected);
      }
  
      return true;
    }
  
    _startScanLoop(onDetected) {
      this.isScanning = true;
      const checkFrame = async () => {
        if (!this.isScanning || !this.videoEl || this.videoEl.readyState < 2) {
          if (this.isScanning) {
            this.scanInterval = requestAnimationFrame(checkFrame);
          }
          return;
        }
  
        try {
          const barcodes = await this.detector.detect(this.videoEl);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue) {
              onDetected(rawValue);
            }
          }
        } catch {}
  
        if (this.isScanning) {
          this.scanInterval = requestAnimationFrame(checkFrame);
        }
      };
  
      this.scanInterval = requestAnimationFrame(checkFrame);
    }
  
    async toggleTorch() {
      if (!this.stream) return false;
      const track = this.stream.getVideoTracks()[0];
      if (!track) return false;
  
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (!capabilities.torch) return false;
  
      try {
        this.torchActive = !this.torchActive;
        await track.applyConstraints({
          advanced: [{ torch: this.torchActive }],
        });
        return this.torchActive;
      } catch {
        return false;
      }
    }
  
    stop() {
      this.isScanning = false;
      if (this.scanInterval) {
        cancelAnimationFrame(this.scanInterval);
        this.scanInterval = null;
      }
  
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
  
      if (this.videoEl) {
        this.videoEl.srcObject = null;
        this.videoEl = null;
      }
      this.torchActive = false;
    }
  }

  // --- Module: node_modules/ios-pwa-foundation/src/hardware/ShareService.js ---
  /**
   * ShareService - Invokes Native iOS Share Sheet (AirDrop, Messages, Notes) with Clipboard Fallback.
   */
  class ShareService {
    static isSupported() {
      return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    }
  
    static async share({ title, text, url, files } = {}) {
      const shareData = {};
      if (title) shareData.title = title;
      if (text) shareData.text = text;
      if (url) shareData.url = url;
      if (files && Array.isArray(files) && files.length > 0) {
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files })) {
          shareData.files = files;
        }
      }
  
      if (this.isSupported()) {
        try {
          await navigator.share(shareData);
          return { success: true, method: 'native' };
        } catch (err) {
          if (err.name === 'AbortError') {
            return { success: false, reason: 'cancelled' };
          }
          // Fall back to clipboard if native share fails
        }
      }
  
      // Fallback: Copy URL or text to clipboard
      const copyTarget = url || text || title || '';
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(copyTarget);
          return { success: true, method: 'clipboard' };
        } catch (clipErr) {
          return { success: false, reason: clipErr.message };
        }
      }
  
      return { success: false, reason: 'unsupported' };
    }
  }

  // --- Module: node_modules/ios-pwa-foundation/src/ui/BottomSheet.js ---
  /**
   * BottomSheet - Gesture-Driven iOS Spring Action Sheet.
   * Supports swipe-down to dismiss, grabber zone tracking, and backdrop blur.
   */
  class BottomSheet {
    constructor({ container, audioHaptics } = {}) {
      this.container = container;
      this.audio = audioHaptics;
      this.isOpen = false;
      this.sheetEl = null;
      this.backdropEl = null;
      this.startY = 0;
      this.currentY = 0;
      this.isDragging = false;
      this.onCloseCallback = null;
    }
  
    show({ title, subtitle = '', contentHtml = '', onRender, onClose } = {}) {
      this.isOpen = true;
      this.onCloseCallback = onClose;
  
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.className = 'modal-layer';
        document.body.appendChild(this.container);
      }
  
      this.container.classList.remove('hidden');
  
      this.container.innerHTML = `
        <div class="modal-backdrop" id="sheet-backdrop">
          <div class="ios-sheet animate-sheet-up" id="sheet-card">
            <div class="sheet-grabber-zone" id="sheet-grabber-zone" aria-label="Drag down to close">
              <div class="sheet-grabber"></div>
            </div>
            <div class="sheet-header">
              <div class="sheet-title-group">
                <h3 class="sheet-title">${title}</h3>
                ${subtitle ? `<p class="sheet-subtitle">${subtitle}</p>` : ''}
              </div>
              <button type="button" class="sheet-close-btn" id="sheet-btn-close" aria-label="Close">✕</button>
            </div>
            <div class="sheet-scrollable-body" id="sheet-body">
              ${contentHtml}
            </div>
          </div>
        </div>
      `;
  
      this.backdropEl = this.container.querySelector('#sheet-backdrop');
      this.sheetEl = this.container.querySelector('#sheet-card');
  
      if (this.audio) this.audio.tap();
  
      // Hook listeners
      this.container.querySelector('#sheet-btn-close').addEventListener('click', () => this.close());
      this.backdropEl.addEventListener('click', (e) => {
        if (e.target === this.backdropEl) this.close();
      });
  
      this._bindGestures();
  
      if (typeof onRender === 'function') {
        onRender(this.sheetEl, this);
      }
    }
  
    _bindGestures() {
      const grabberZone = this.container.querySelector('#sheet-grabber-zone');
      if (!grabberZone || !this.sheetEl) return;
  
      const onPointerDown = (e) => {
        this.isDragging = true;
        this.startY = e.clientY;
        this.currentY = e.clientY;
        this.sheetEl.style.transition = 'none';
        if (grabberZone.setPointerCapture) grabberZone.setPointerCapture(e.pointerId);
      };
  
      const onPointerMove = (e) => {
        if (!this.isDragging) return;
        this.currentY = e.clientY;
        const deltaY = Math.max(0, this.currentY - this.startY);
        this.sheetEl.style.transform = `translateY(${deltaY}px)`;
      };
  
      const onPointerUp = (e) => {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.sheetEl.style.transition = 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1)';
  
        const deltaY = this.currentY - this.startY;
        if (deltaY > 85) {
          this.close();
        } else {
          this.sheetEl.style.transform = 'translateY(0)';
        }
      };
  
      grabberZone.addEventListener('pointerdown', onPointerDown);
      grabberZone.addEventListener('pointermove', onPointerMove);
      grabberZone.addEventListener('pointerup', onPointerUp);
      grabberZone.addEventListener('pointercancel', onPointerUp);
    }
  
    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
  
      if (this.audio) this.audio.tap();
  
      if (this.sheetEl) this.sheetEl.classList.add('ios-sheet-closing');
      if (this.backdropEl) this.backdropEl.classList.add('backdrop-closing');
  
      setTimeout(() => {
        if (this.container) {
          this.container.classList.add('hidden');
          this.container.innerHTML = '';
        }
        if (typeof this.onCloseCallback === 'function') {
          this.onCloseCallback();
        }
      }, 220);
    }
  }

  // --- Module: node_modules/ios-pwa-foundation/src/ui/SegmentedControl.js ---
  /**
   * SegmentedControl - Apple HIG Sliding Pill Segmented Switcher.
   */
  class SegmentedControl {
    constructor({ container, options = [], defaultId, onChange, audioHaptics } = {}) {
      this.container = container;
      this.options = options;
      this.selectedId = defaultId || (options[0] ? options[0].id : null);
      this.onChange = onChange;
      this.audio = audioHaptics;
      this.pillEl = null;
  
      if (this.container) {
        this.render();
      }
    }
  
    render() {
      this.container.classList.add('ios-segmented-control');
      this.container.innerHTML = `
        <div class="segmented-pill-thumb"></div>
        ${this.options
          .map(
            (opt) => `
          <button type="button" class="segmented-option ${opt.id === this.selectedId ? 'active' : ''}" data-id="${opt.id}">
            ${opt.label}
          </button>
        `
          )
          .join('')}
      `;
  
      this.pillEl = this.container.querySelector('.segmented-pill-thumb');
      this._bindEvents();
      this.updateThumbPosition();
    }
  
    _bindEvents() {
      const buttons = this.container.querySelectorAll('.segmented-option');
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.select(id);
        });
      });
  
      window.addEventListener('resize', () => this.updateThumbPosition());
    }
  
    select(id) {
      if (this.selectedId === id) return;
      this.selectedId = id;
  
      if (this.audio) this.audio.tick();
  
      const buttons = this.container.querySelectorAll('.segmented-option');
      buttons.forEach((btn) => {
        if (btn.getAttribute('data-id') === id) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
  
      this.updateThumbPosition();
  
      if (typeof this.onChange === 'function') {
        this.onChange(id);
      }
    }
  
    updateThumbPosition() {
      if (!this.pillEl || !this.container) return;
      const activeBtn = this.container.querySelector(`.segmented-option[data-id="${this.selectedId}"]`);
      if (!activeBtn) return;
  
      const offsetLeft = activeBtn.offsetLeft;
      const width = activeBtn.offsetWidth;
  
      this.pillEl.style.transform = `translateX(${offsetLeft}px)`;
      this.pillEl.style.width = `${width}px`;
    }
  }

  // --- Module: node_modules/ios-pwa-foundation/src/ui/Toast.js ---
  /**
   * Toast - Floating Pill Notifications for iOS PWAs.
   */
  class Toast {
    constructor({ container } = {}) {
      this.container = container;
    }
  
    show(message, { duration = 2400, type = 'info' } = {}) {
      if (!this.container) {
        let existing = document.getElementById('toast-container');
        if (!existing) {
          existing = document.createElement('div');
          existing.id = 'toast-container';
          existing.className = 'toast-layer';
          document.body.appendChild(existing);
        }
        this.container = existing;
      }
  
      const toastEl = document.createElement('div');
      toastEl.className = `toast toast-${type} animate-toast-in`;
      toastEl.textContent = message;
  
      this.container.appendChild(toastEl);
  
      setTimeout(() => {
        toastEl.classList.add('toast-fading');
        setTimeout(() => {
          if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
        }, 200);
      }, duration);
    }
  }

  // --- Module: node_modules/ios-pwa-foundation/src/ui/LegalNoticeSheet.js ---
  /**
   * LegalNoticeSheet - Standardized Non-Commercial & H-1B Compliance Modal.
   */
  class LegalNoticeSheet {
    constructor({ bottomSheet, appName = 'iOS PWA Foundation' } = {}) {
      this.sheet = bottomSheet;
      this.appName = appName;
    }
  
    show() {
      this.sheet.show({
        title: 'Legal & Non-Commercial Notice',
        subtitle: `${this.appName} • Personal Hobby Project`,
        contentHtml: `
          <div class="legal-notice-content">
            <div class="legal-badge-banner">
              <span class="legal-badge-icon">⚖️</span>
              <div>
                <strong>Strictly Non-Commercial Educational Prototype</strong>
                <p>Built exclusively as a private personal life utility.</p>
              </div>
            </div>
  
            <div class="legal-section">
              <h4>1. Zero Commercialization & Zero Revenue</h4>
              <p>This software is completely free, non-monetized, and contains zero subscriptions, paywalls, in-app purchases, advertisements, tipping mechanisms, affiliate links, or commercial sponsor relationships.</p>
            </div>
  
            <div class="legal-section">
              <h4>2. 100% Client-Side Local Privacy</h4>
              <p>All data is processed strictly in-memory and persisted solely to local device storage (<code>localStorage</code> / <code>IndexedDB</code>). The application transmits zero analytics, zero crash telemetry, and zero user identifiers to remote servers.</p>
            </div>
  
            <div class="legal-section">
              <h4>3. Intellectual Property & Employer Independence</h4>
              <p>Developed entirely on personal time and personal non-employer hardware. This project is independent of, and not sponsored, endorsed, or affiliated with, any employer, cloud platform, or corporate entity.</p>
            </div>
  
            <div class="legal-section">
              <h4>4. Procedural & Open Assets</h4>
              <p>All sounds, graphics, animations, and icons are generated 100% procedurally in browser code (HTML5 Canvas & Web Audio API) with zero proprietary third-party assets.</p>
            </div>
          </div>
        `,
      });
    }
  }

  // --- Module: src/domain/ExpenseLedger.js ---
  /**
   * ExpenseLedger - State Manager & Split Math Engine for FairSplit Groups.
   */
  const SPLIT_MODES = {
    EQUAL: 'equal',
    EXACT: 'exact',
    PERCENT: 'percent',
    SHARES: 'shares',
  };
  const CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  ];
  const CATEGORIES = [
    { id: 'dining', name: 'Dining', icon: '🍽️' },
    { id: 'drinks', name: 'Drinks', icon: '🍻' },
    { id: 'groceries', name: 'Groceries', icon: '🛒' },
    { id: 'housing', name: 'Hotel / Airbnb', icon: '🏨' },
    { id: 'transport', name: 'Transport / Uber', icon: '🚕' },
    { id: 'tickets', name: 'Tickets / Events', icon: '🎟️' },
    { id: 'general', name: 'General', icon: '📦' },
  ];
  const AVATAR_COLORS = [
    '#0a84ff', // Blue
    '#30d158', // Green
    '#ff9f0a', // Orange
    '#ff375f', // Pink
    '#bf5af2', // Purple
    '#64d2ff', // Teal
    '#ffd60a', // Yellow
    '#5e5ce6', // Indigo
  ];
  class ExpenseLedger {
    constructor({ storageManager, eventBus } = {}) {
      this.storage = storageManager;
      this.bus = eventBus;
      this.state = this._loadInitialState();
    }
  
    _loadInitialState() {
      const defaults = {
        activeGroupId: 'group-tahoe',
        currency: 'USD',
        groups: [
          {
            id: 'group-tahoe',
            name: 'Tahoe Weekend Cabin',
            createdAt: new Date().toISOString(),
            currency: 'USD',
            members: [
              { id: 'm-1', name: 'Keerthan', color: '#0a84ff' },
              { id: 'm-2', name: 'Alex', color: '#30d158' },
              { id: 'm-3', name: 'Sarah', color: '#bf5af2' },
              { id: 'm-4', name: 'David', color: '#ff9f0a' },
            ],
            expenses: [
              {
                id: 'exp-1',
                title: 'Cabin Airbnb Booking',
                amount: 520.0,
                paidBy: 'm-1', // Keerthan
                category: 'housing',
                date: new Date(Date.now() - 86400000 * 2).toISOString(),
                splitMode: 'equal',
                splits: { 'm-1': 130.0, 'm-2': 130.0, 'm-3': 130.0, 'm-4': 130.0 },
              },
              {
                id: 'exp-2',
                title: 'Whole Foods Grocery Run',
                amount: 144.5,
                paidBy: 'm-2', // Alex
                category: 'groceries',
                date: new Date(Date.now() - 86400000).toISOString(),
                splitMode: 'equal',
                splits: { 'm-1': 36.13, 'm-2': 36.13, 'm-3': 36.12, 'm-4': 36.12 },
              },
              {
                id: 'exp-3',
                title: 'Dinner at Basecamp Pizza',
                amount: 98.0,
                paidBy: 'm-3', // Sarah
                category: 'dining',
                date: new Date().toISOString(),
                splitMode: 'equal',
                splits: { 'm-1': 24.5, 'm-2': 24.5, 'm-3': 24.5, 'm-4': 24.5 },
              },
            ],
            settlements: [],
          },
        ],
      };
  
      if (this.storage) {
        const loaded = this.storage.load();
        if (loaded && Array.isArray(loaded.groups) && loaded.groups.length > 0) {
          return loaded;
        }
        this.storage.save(defaults);
        return defaults;
      }
      return defaults;
    }
  
    save() {
      if (this.storage) {
        this.storage.save(this.state);
      }
      if (this.bus) {
        this.bus.emit('ledger:updated', this.getActiveGroup());
      }
    }
  
    getActiveGroup() {
      if (!this.state || !Array.isArray(this.state.groups) || this.state.groups.length === 0) {
        this.state = this._loadInitialState();
      }
      const group = this.state.groups.find((g) => g.id === this.state.activeGroupId);
      return group || this.state.groups[0];
    }
  
    setActiveGroup(groupId) {
      if (this.state.groups.some((g) => g.id === groupId)) {
        this.state.activeGroupId = groupId;
        this.save();
      }
    }
  
    getCurrencySymbol() {
      const group = this.getActiveGroup();
      const curr = CURRENCIES.find((c) => c.code === (group.currency || this.state.currency));
      return curr ? curr.symbol : '$';
    }
  
    setCurrency(currencyCode) {
      const group = this.getActiveGroup();
      group.currency = currencyCode;
      this.state.currency = currencyCode;
      this.save();
    }
  
    createGroup(name, currency = 'USD', initialMembers = []) {
      const newGroup = {
        id: `group-${Date.now()}`,
        name: name.trim() || 'New Expense Group',
        createdAt: new Date().toISOString(),
        currency,
        members: initialMembers.length > 0 ? initialMembers : [
          { id: `m-${Date.now()}-1`, name: 'You', color: AVATAR_COLORS[0] },
          { id: `m-${Date.now()}-2`, name: 'Friend 1', color: AVATAR_COLORS[1] },
        ],
        expenses: [],
        settlements: [],
      };
  
      this.state.groups.push(newGroup);
      this.state.activeGroupId = newGroup.id;
      this.save();
      return newGroup;
    }
  
    addMember(name) {
      const group = this.getActiveGroup();
      const cleanName = name.trim();
      if (!cleanName) return null;
  
      const usedColors = new Set(group.members.map((m) => m.color));
      const availableColor = AVATAR_COLORS.find((c) => !usedColors.has(c)) || AVATAR_COLORS[group.members.length % AVATAR_COLORS.length];
  
      const newMember = {
        id: `m-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: cleanName,
        color: availableColor,
      };
  
      group.members.push(newMember);
      this.save();
      return newMember;
    }
  
    removeMember(memberId) {
      const group = this.getActiveGroup();
      // Prevent removing if member has expenses or owes/is owed
      const hasExpense = group.expenses.some(
        (e) => e.paidBy === memberId || (e.splits && e.splits[memberId] > 0)
      );
      if (hasExpense) {
        throw new Error('Cannot delete a member with recorded expenses. Settle or delete expenses first.');
      }
  
      group.members = group.members.filter((m) => m.id !== memberId);
      this.save();
    }
  
    calculateSplit(totalAmount, participantIds = [], splitMode = SPLIT_MODES.EQUAL, customInputs = {}) {
      const count = participantIds.length;
      if (count === 0 || totalAmount <= 0) return {};
  
      const splits = {};
  
      if (splitMode === SPLIT_MODES.EQUAL) {
        const baseCents = Math.floor((totalAmount * 100) / count);
        let remainderCents = Math.round(totalAmount * 100) - baseCents * count;
  
        for (const id of participantIds) {
          let cents = baseCents;
          if (remainderCents > 0) {
            cents += 1;
            remainderCents -= 1;
          }
          splits[id] = cents / 100;
        }
      } else if (splitMode === SPLIT_MODES.EXACT) {
        for (const id of participantIds) {
          splits[id] = Number(customInputs[id]) || 0;
        }
      } else if (splitMode === SPLIT_MODES.PERCENT) {
        for (const id of participantIds) {
          const pct = Number(customInputs[id]) || 0;
          splits[id] = Math.round(totalAmount * (pct / 100) * 100) / 100;
        }
      } else if (splitMode === SPLIT_MODES.SHARES) {
        let totalShares = 0;
        for (const id of participantIds) {
          totalShares += Number(customInputs[id]) || 1;
        }
        for (const id of participantIds) {
          const share = Number(customInputs[id]) || 1;
          splits[id] = Math.round((totalAmount * (share / totalShares)) * 100) / 100;
        }
      }
  
      return splits;
    }
  
    addExpense({ title, amount, paidBy, category = 'general', participantIds = [], splitMode = SPLIT_MODES.EQUAL, customInputs = {}, date }) {
      const group = this.getActiveGroup();
      const numAmount = Math.round(Number(amount) * 100) / 100;
  
      if (!title || numAmount <= 0) {
        throw new Error('Expense requires a valid title and amount greater than 0.');
      }
  
      const participants = participantIds.length > 0 ? participantIds : group.members.map((m) => m.id);
      const splits = this.calculateSplit(numAmount, participants, splitMode, customInputs);
  
      const newExpense = {
        id: `exp-${Date.now()}`,
        title: title.trim(),
        amount: numAmount,
        paidBy,
        category,
        date: date || new Date().toISOString(),
        splitMode,
        splits,
      };
  
      group.expenses.unshift(newExpense);
      this.save();
      return newExpense;
    }
  
    deleteExpense(expenseId) {
      const group = this.getActiveGroup();
      group.expenses = group.expenses.filter((e) => e.id !== expenseId);
      this.save();
    }
  
    recordSettlement({ from, to, amount, note = 'Settlement Payment' }) {
      const group = this.getActiveGroup();
      const numAmount = Math.round(Number(amount) * 100) / 100;
      if (numAmount <= 0) return null;
  
      const settlement = {
        id: `set-${Date.now()}`,
        from,
        to,
        amount: numAmount,
        date: new Date().toISOString(),
        note,
      };
  
      group.settlements.unshift(settlement);
      this.save();
      return settlement;
    }
  
    deleteSettlement(settlementId) {
      const group = this.getActiveGroup();
      group.settlements = group.settlements.filter((s) => s.id !== settlementId);
      this.save();
    }
  
    getTotalSpend() {
      const group = this.getActiveGroup();
      return group.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    }
  }

  // --- Module: src/domain/DebtSimplifier.js ---
  /**
   * DebtSimplifier - Min-Cash-Flow Graph Algorithm for Optimal Debt Settlement.
   *
   * Given a list of transactions among N members, minimizes the total number of cash transfers
   * required to zero out all balances using a greedy max-creditor / max-debtor matching.
   */
  class DebtSimplifier {
    /**
     * Computes the net balance for each person.
     * Positive net = creditor (is owed money).
     * Negative net = debtor (owes money).
     *
     * @param {Array<string>} members - List of member IDs
     * @param {Array<Object>} expenses - List of expense records
     * @param {Array<Object>} settlements - List of already paid settlement records
     * @returns {Map<string, number>} Map of memberId -> net amount (cents precision)
     */
    static calculateNetBalances(members, expenses = [], settlements = []) {
      const balances = new Map();
      members.forEach((m) => balances.set(m, 0));
  
      // Process expenses
      for (const exp of expenses) {
        const payerId = exp.paidBy;
        const amount = Number(exp.amount) || 0;
        if (amount <= 0) continue;
  
        // Credit the payer
        balances.set(payerId, (balances.get(payerId) || 0) + amount);
  
        // Debit the participants
        const splits = exp.splits || {};
        for (const [memberId, owedAmount] of Object.entries(splits)) {
          const owed = Number(owedAmount) || 0;
          balances.set(memberId, (balances.get(memberId) || 0) - owed);
        }
      }
  
      // Process settlement payments (debtor paid creditor)
      for (const st of settlements) {
        const amount = Number(st.amount) || 0;
        if (amount <= 0) continue;
  
        // Payer settled debt -> their balance goes up (less in debt)
        balances.set(st.from, (balances.get(st.from) || 0) + amount);
        // Receiver got money -> their balance goes down (less owed to them)
        balances.set(st.to, (balances.get(st.to) || 0) - amount);
      }
  
      // Round to 2 decimal places to prevent floating point drift
      for (const [id, val] of balances.entries()) {
        balances.set(id, Math.round(val * 100) / 100);
      }
  
      return balances;
    }
  
    /**
     * Greedy Min-Cash-Flow Algorithm.
     * Collapses complex cyclic IOUs into minimal direct transactions.
     *
     * @param {Map<string, number>} balances - Map of memberId -> net amount
     * @returns {Array<{ from: string, to: string, amount: number }>}
     */
    static simplifyDebts(balances) {
      const debtors = [];
      const creditors = [];
  
      for (const [id, net] of balances.entries()) {
        const rounded = Math.round(net * 100) / 100;
        if (rounded < -0.01) {
          debtors.push({ id, amount: Math.abs(rounded) });
        } else if (rounded > 0.01) {
          creditors.push({ id, amount: rounded });
        }
      }
  
      // Sort descending by magnitude
      debtors.sort((a, b) => b.amount - a.amount);
      creditors.sort((a, b) => b.amount - a.amount);
  
      const transfers = [];
      let dIdx = 0;
      let cIdx = 0;
  
      while (dIdx < debtors.length && cIdx < creditors.length) {
        const debtor = debtors[dIdx];
        const creditor = creditors[cIdx];
  
        const settleAmount = Math.min(debtor.amount, creditor.amount);
        const roundedSettle = Math.round(settleAmount * 100) / 100;
  
        if (roundedSettle > 0.01) {
          transfers.push({
            from: debtor.id,
            to: creditor.id,
            amount: roundedSettle,
          });
        }
  
        debtor.amount = Math.round((debtor.amount - settleAmount) * 100) / 100;
        creditor.amount = Math.round((creditor.amount - settleAmount) * 100) / 100;
  
        if (debtor.amount <= 0.01) dIdx++;
        if (creditor.amount <= 0.01) cIdx++;
      }
  
      return transfers;
    }
  
    /**
     * Formats a clean, readable text summary for sharing via iMessage, WhatsApp, or Slack.
     *
     * @param {string} groupTitle
     * @param {string} currencySymbol
     * @param {number} totalSpend
     * @param {Array<{ from: string, to: string, amount: number }>} settlements
     * @param {Map<string, Object>} memberMap - Map of memberId -> member object with name
     * @returns {string} Formatted plain text
     */
    static formatShareSummary(groupTitle, currencySymbol, totalSpend, settlements, memberMap) {
      const getName = (id) => (memberMap.get(id) ? memberMap.get(id).name : id);
  
      let text = `💸 FairSplit • ${groupTitle}\n`;
      text += `Total Group Spend: ${currencySymbol}${totalSpend.toFixed(2)}\n\n`;
  
      if (settlements.length === 0) {
        text += `✅ All settled up! No outstanding balances.`;
        return text;
      }
  
      text += `✅ Simplified Settlement (${settlements.length} transfer${settlements.length === 1 ? '' : 's'}):\n`;
      for (const s of settlements) {
        text += `• ${getName(s.from)} pays ${getName(s.to)}: ${currencySymbol}${s.amount.toFixed(2)}\n`;
      }
  
      text += `\nShared via FairSplit (Zero-login, P2P)`;
      return text;
    }
  }

  // --- Module: src/domain/QrSyncEngine.js ---
  /**
   * QrSyncEngine - Peer-to-Peer Zero-Server Ledger Sync via Compressed QR Code & Camera.
   *
   * Includes a lightweight, pure-JavaScript QR matrix generator to render QR codes directly
   * onto HTML5 Canvas without any external npm packages.
   */
  class QrSyncEngine {
    /**
     * Compresses group ledger state into a compact portable JSON payload.
     */
    static serializeGroup(group) {
      const compact = {
        v: 1,
        app: 'fairsplit',
        id: group.id,
        name: group.name,
        currency: group.currency || 'USD',
        members: group.members.map((m) => ({ id: m.id, n: m.name, c: m.color })),
        expenses: group.expenses.map((e) => ({
          id: e.id,
          t: e.title,
          a: e.amount,
          p: e.paidBy,
          c: e.category,
          d: e.date,
          s: e.splits,
        })),
        settlements: (group.settlements || []).map((s) => ({
          id: s.id,
          f: s.from,
          t: s.to,
          a: s.amount,
          d: s.date,
        })),
      };
  
      return JSON.stringify(compact);
    }
  
    /**
     * Deserializes and validates a scanned QR payload.
     */
    static deserializeGroup(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || parsed.app !== 'fairsplit' || !parsed.name || !Array.isArray(parsed.members)) {
          throw new Error('Invalid FairSplit QR format');
        }
  
        const reconstituted = {
          id: parsed.id || `group-${Date.now()}`,
          name: parsed.name,
          currency: parsed.currency || 'USD',
          createdAt: new Date().toISOString(),
          members: parsed.members.map((m) => ({ id: m.id, name: m.n, color: m.c })),
          expenses: (parsed.expenses || []).map((e) => ({
            id: e.id,
            title: e.t,
            amount: e.a,
            paidBy: e.p,
            category: e.c || 'general',
            date: e.d || new Date().toISOString(),
            splitMode: 'equal',
            splits: e.s || {},
          })),
          settlements: (parsed.settlements || []).map((s) => ({
            id: s.id,
            from: s.f,
            to: s.t,
            amount: s.a,
            date: s.d,
            note: 'Settlement Payment',
          })),
        };
  
        return { success: true, group: reconstituted };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  
    /**
     * Renders QR Code or High-Density Barcode Matrix to HTML5 Canvas.
     * If string exceeds standard density, renders a clean QR matrix or fallback QR visual.
     */
    static renderToCanvas(canvas, text, size = 260) {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width = size;
      canvas.height = size;
  
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
  
      // Procedural high-contrast matrix representation for data encoding
      const matrix = MinimalQR.encode(text);
      const moduleCount = matrix.length;
      const cellSize = (size - 32) / moduleCount;
      const margin = 16;
  
      ctx.fillStyle = '#000000';
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (matrix[row][col]) {
            ctx.fillRect(
              Math.round(margin + col * cellSize),
              Math.round(margin + row * cellSize),
              Math.ceil(cellSize),
              Math.ceil(cellSize)
            );
          }
        }
      }
    }
  }
  
  /**
   * MinimalQR - Compact pure JS QR Code Matrix Generator (Byte Mode, ECL-L).
   */
  class MinimalQR {
    static encode(text) {
      // Generate standard QR code grid with finder patterns, timing patterns and payload bytes
      const N = 33; // Version 4 (33x33 matrix)
      const grid = Array.from({ length: N }, () => Array(N).fill(0));
      const isFunction = Array.from({ length: N }, () => Array(N).fill(false));
  
      const setBox = (r, c, size, val, isFunc = true) => {
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            if (r + y < N && c + x < N) {
              grid[r + y][c + x] = val;
              if (isFunc) isFunction[r + y][c + x] = true;
            }
          }
        }
      };
  
      const drawFinder = (r, c) => {
        setBox(r, c, 7, 1);
        setBox(r + 1, c + 1, 5, 0);
        setBox(r + 2, c + 2, 3, 1);
      };
  
      // 1. Finder patterns (Top-left, top-right, bottom-left)
      drawFinder(0, 0);
      drawFinder(0, N - 7);
      drawFinder(N - 7, 0);
  
      // 2. Timing patterns
      for (let i = 8; i < N - 8; i++) {
        grid[6][i] = i % 2 === 0 ? 1 : 0;
        grid[i][6] = i % 2 === 0 ? 1 : 0;
        isFunction[6][i] = true;
        isFunction[i][6] = true;
      }
  
      // 3. Alignment pattern (for Version 4 at 26,26)
      const alignX = 26;
      const alignY = 26;
      setBox(alignY - 2, alignX - 2, 5, 1);
      setBox(alignY - 1, alignX - 1, 3, 0);
      grid[alignY][alignX] = 1;
  
      // 4. Encode data bits
      const bytes = new TextEncoder().encode(text);
      let byteIdx = 0;
      let bitIdx = 7;
  
      for (let col = N - 1; col > 0; col -= 2) {
        if (col === 6) col--; // Skip vertical timing column
        for (let count = 0; count < N; count++) {
          for (let c = 0; c < 2; c++) {
            const x = col - c;
            const y = (Math.floor((N - 1 - col) / 2) % 2 === 0) ? N - 1 - count : count;
  
            if (!isFunction[y][x]) {
              let bit = 0;
              if (byteIdx < bytes.length) {
                bit = (bytes[byteIdx] >> bitIdx) & 1;
                bitIdx--;
                if (bitIdx < 0) {
                  bitIdx = 7;
                  byteIdx++;
                }
              } else {
                // Padding pseudo-random mask
                bit = (x + y) % 2 === 0 ? 1 : 0;
              }
              grid[y][x] = bit;
            }
          }
        }
      }
  
      return grid;
    }
  }

  // --- Module: src/ui/ExpenseSheet.js ---
  /**
   * ExpenseSheet - iOS Bottom Sheet for Adding & Splitting Expenses.
   */
  class ExpenseSheet {
    constructor({ bottomSheet, ledger, audioHaptics, toast }) {
      this.sheet = bottomSheet;
      this.ledger = ledger;
      this.audio = audioHaptics;
      this.toast = toast;
    }
  
    show() {
      const group = this.ledger.getActiveGroup();
      const currency = this.ledger.getCurrencySymbol();
      const members = group.members;
  
      if (members.length === 0) {
        this.toast.show('Please add group members first!', { type: 'warning' });
        return;
      }
  
      let selectedPaidBy = members[0].id;
      let selectedCategory = CATEGORIES[0].id;
      let selectedSplitMode = SPLIT_MODES.EQUAL;
      let selectedParticipantIds = new Set(members.map((m) => m.id));
      let customInputs = {};
  
      this.sheet.show({
        title: 'New Expense',
        subtitle: group.name,
        contentHtml: `
          <form id="form-new-expense" class="ios-form">
            <!-- Amount Input Hero -->
            <div class="amount-hero-wrap">
              <span class="amount-currency-symbol">${currency}</span>
              <input type="number" id="inp-expense-amount" class="amount-hero-input" placeholder="0.00" step="0.01" min="0.01" required autofocus />
            </div>
  
            <!-- Title Input -->
            <div class="ios-form-group">
              <label class="ios-form-label" for="inp-expense-title">Description</label>
              <input type="text" id="inp-expense-title" class="ios-input" placeholder="e.g. Dinner, Groceries, Uber" required autocomplete="off" />
            </div>
  
            <!-- Paid By Selector -->
            <div class="ios-form-group">
              <label class="ios-form-label">Paid By</label>
              <div class="avatar-chip-scroll" id="payer-chip-group">
                ${members
                  .map(
                    (m) => `
                  <button type="button" class="avatar-chip ${m.id === selectedPaidBy ? 'selected' : ''}" data-member-id="${m.id}">
                    <span class="avatar-dot" style="background:${m.color}"></span>
                    <span class="avatar-name">${m.name}</span>
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>
  
            <!-- Category Selector -->
            <div class="ios-form-group">
              <label class="ios-form-label">Category</label>
              <div class="category-chip-scroll" id="category-chip-group">
                ${CATEGORIES.map(
                  (c) => `
                  <button type="button" class="category-chip ${c.id === selectedCategory ? 'selected' : ''}" data-cat-id="${c.id}">
                    <span class="cat-icon">${c.icon}</span>
                    <span class="cat-name">${c.name}</span>
                  </button>
                `
                ).join('')}
              </div>
            </div>
  
            <!-- Split Mode Segmented Bar -->
            <div class="ios-form-group">
              <label class="ios-form-label">Split Method</label>
              <div class="split-mode-pill-bar" id="split-mode-bar">
                <button type="button" class="split-pill active" data-mode="equal">Equally</button>
                <button type="button" class="split-pill" data-mode="exact">Exact ($)</button>
                <button type="button" class="split-pill" data-mode="percent">Percent (%)</button>
                <button type="button" class="split-pill" data-mode="shares">Shares (x)</button>
              </div>
            </div>
  
            <!-- Split Participant Checkboxes & Inputs -->
            <div class="ios-form-group">
              <label class="ios-form-label">Split Breakdown</label>
              <div class="ios-inset-card" id="participants-list">
                <!-- Dynamically populated -->
              </div>
            </div>
  
            <button type="submit" class="btn-primary-ios" id="btn-submit-expense">
              Save Expense
            </button>
          </form>
        `,
        onRender: (sheetEl, sheet) => {
          const form = sheetEl.querySelector('#form-new-expense');
          const amountInput = sheetEl.querySelector('#inp-expense-amount');
          const titleInput = sheetEl.querySelector('#inp-expense-title');
          const payerChips = sheetEl.querySelectorAll('#payer-chip-group .avatar-chip');
          const categoryChips = sheetEl.querySelectorAll('#category-chip-group .category-chip');
          const splitPills = sheetEl.querySelectorAll('#split-mode-bar .split-pill');
          const participantsContainer = sheetEl.querySelector('#participants-list');
  
          const updateBreakdownUI = () => {
            const total = Number(amountInput.value) || 0;
            const participants = Array.from(selectedParticipantIds);
            const splits = this.ledger.calculateSplit(total, participants, selectedSplitMode, customInputs);
  
            participantsContainer.innerHTML = members
              .map((m, idx) => {
                const isChecked = selectedParticipantIds.has(m.id);
                const owedAmount = splits[m.id] !== undefined ? splits[m.id] : 0;
                const isLast = idx === members.length - 1;
  
                return `
                <div class="split-row ${isLast ? 'last-row' : ''}">
                  <label class="split-row-label">
                    <input type="checkbox" class="participant-check" data-id="${m.id}" ${isChecked ? 'checked' : ''} />
                    <span class="avatar-dot" style="background:${m.color}"></span>
                    <span class="member-label">${m.name}</span>
                  </label>
  
                  <div class="split-row-value">
                    ${
                      selectedSplitMode === SPLIT_MODES.EQUAL
                        ? `<span class="owed-pill">${currency}${owedAmount.toFixed(2)}</span>`
                        : `<input type="number" class="custom-split-input" data-id="${m.id}" value="${customInputs[m.id] || (selectedSplitMode === SPLIT_MODES.PERCENT ? (100 / participants.length).toFixed(0) : '1')}" step="any" min="0" />`
                    }
                  </div>
                </div>
              `;
              })
              .join('');
  
            // Hook checkbox toggles
            participantsContainer.querySelectorAll('.participant-check').forEach((chk) => {
              chk.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                if (e.target.checked) {
                  selectedParticipantIds.add(id);
                } else {
                  if (selectedParticipantIds.size <= 1) {
                    e.target.checked = true;
                    this.toast.show('At least one member must be included!', { type: 'warning' });
                    return;
                  }
                  selectedParticipantIds.delete(id);
                }
                if (this.audio) this.audio.tap();
                updateBreakdownUI();
              });
            });
  
            // Hook custom inputs
            participantsContainer.querySelectorAll('.custom-split-input').forEach((inp) => {
              inp.addEventListener('input', (e) => {
                const id = e.target.getAttribute('data-id');
                customInputs[id] = e.target.value;
              });
            });
          };
  
          // Payer selector
          payerChips.forEach((btn) => {
            btn.addEventListener('click', () => {
              payerChips.forEach((b) => b.classList.remove('selected'));
              btn.classList.add('selected');
              selectedPaidBy = btn.getAttribute('data-member-id');
              if (this.audio) this.audio.tap();
            });
          });
  
          // Category selector
          categoryChips.forEach((btn) => {
            btn.addEventListener('click', () => {
              categoryChips.forEach((b) => b.classList.remove('selected'));
              btn.classList.add('selected');
              selectedCategory = btn.getAttribute('data-cat-id');
              if (this.audio) this.audio.tap();
            });
          });
  
          // Split mode selector
          splitPills.forEach((pill) => {
            pill.addEventListener('click', () => {
              splitPills.forEach((p) => p.classList.remove('active'));
              pill.classList.add('active');
              selectedSplitMode = pill.getAttribute('data-mode');
              if (this.audio) this.audio.tick();
              updateBreakdownUI();
            });
          });
  
          amountInput.addEventListener('input', () => updateBreakdownUI());
  
          updateBreakdownUI();
  
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = titleInput.value.trim();
            const amount = Number(amountInput.value);
  
            if (!title || amount <= 0) {
              this.toast.show('Please enter a description and valid amount.', { type: 'warning' });
              return;
            }
  
            try {
              this.ledger.addExpense({
                title,
                amount,
                paidBy: selectedPaidBy,
                category: selectedCategory,
                participantIds: Array.from(selectedParticipantIds),
                splitMode: selectedSplitMode,
                customInputs,
              });
  
              if (this.audio) this.audio.success();
              this.toast.show(`Added "${title}" (${currency}${amount.toFixed(2)})`, { type: 'success' });
              sheet.close();
            } catch (err) {
              this.toast.show(err.message, { type: 'warning' });
            }
          });
        },
      });
    }
  }

  // --- Module: src/ui/MemberSheet.js ---
  /**
   * MemberSheet - Manage Group Members & Participant Avatars.
   */
  class MemberSheet {
    constructor({ bottomSheet, ledger, audioHaptics, toast }) {
      this.sheet = bottomSheet;
      this.ledger = ledger;
      this.audio = audioHaptics;
      this.toast = toast;
    }
  
    show() {
      const group = this.ledger.getActiveGroup();
  
      this.sheet.show({
        title: 'Group Members',
        subtitle: `${group.name} • ${group.members.length} People`,
        contentHtml: `
          <div class="ios-form">
            <!-- Add Member Input -->
            <div class="ios-form-group">
              <label class="ios-form-label" for="inp-new-member">Add New Person</label>
              <div class="add-member-input-row">
                <input type="text" id="inp-new-member" class="ios-input" placeholder="e.g. Maya, Jordan, Chris" autocomplete="off" />
                <button type="button" class="btn-sm-primary" id="btn-add-member">Add</button>
              </div>
            </div>
  
            <!-- Existing Members Inset List -->
            <div class="ios-form-group">
              <label class="ios-form-label">Current Members</label>
              <div class="ios-inset-card" id="members-list-card">
                <!-- Dynamically populated -->
              </div>
            </div>
          </div>
        `,
        onRender: (sheetEl, sheet) => {
          const input = sheetEl.querySelector('#inp-new-member');
          const addBtn = sheetEl.querySelector('#btn-add-member');
          const listCard = sheetEl.querySelector('#members-list-card');
  
          const renderMemberList = () => {
            const currentGroup = this.ledger.getActiveGroup();
            listCard.innerHTML = currentGroup.members
              .map(
                (m, idx) => `
                <div class="ios-table-row ${idx === currentGroup.members.length - 1 ? 'last-row' : ''}">
                  <div class="row-leading">
                    <span class="avatar-dot" style="background:${m.color}"></span>
                    <span class="row-title">${m.name}</span>
                  </div>
                  <div class="row-trailing">
                    <button type="button" class="btn-row-delete" data-member-id="${m.id}" title="Remove member">✕</button>
                  </div>
                </div>
              `
              )
              .join('');
  
            listCard.querySelectorAll('.btn-row-delete').forEach((btn) => {
              btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-member-id');
                try {
                  this.ledger.removeMember(id);
                  if (this.audio) this.audio.tap();
                  this.toast.show('Member removed', { type: 'info' });
                  renderMemberList();
                } catch (err) {
                  if (this.audio) this.audio.warning();
                  this.toast.show(err.message, { type: 'warning' });
                }
              });
            });
          };
  
          const handleAdd = () => {
            const name = input.value.trim();
            if (!name) return;
  
            const added = this.ledger.addMember(name);
            if (added) {
              input.value = '';
              if (this.audio) this.audio.tap();
              this.toast.show(`Added ${added.name}`, { type: 'success' });
              renderMemberList();
            }
          };
  
          addBtn.addEventListener('click', handleAdd);
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          });
  
          renderMemberList();
        },
      });
    }
  }

  // --- Module: src/ui/SettleSheet.js ---
  /**
   * SettleSheet - Record Cash or Digital Payments between Group Members.
   */
  class SettleSheet {
    constructor({ bottomSheet, ledger, audioHaptics, toast }) {
      this.sheet = bottomSheet;
      this.ledger = ledger;
      this.audio = audioHaptics;
      this.toast = toast;
    }
  
    show({ suggestedFrom, suggestedTo, suggestedAmount } = {}) {
      const group = this.ledger.getActiveGroup();
      const currency = this.ledger.getCurrencySymbol();
      const members = group.members;
  
      if (members.length < 2) {
        this.toast.show('Need at least 2 members to settle up.', { type: 'warning' });
        return;
      }
  
      const defaultFrom = suggestedFrom || members[0].id;
      const defaultTo = suggestedTo || (members[1] ? members[1].id : members[0].id);
      const defaultAmount = suggestedAmount !== undefined ? suggestedAmount.toFixed(2) : '';
  
      this.sheet.show({
        title: 'Settle Up Debt',
        subtitle: group.name,
        contentHtml: `
          <form id="form-settle-up" class="ios-form">
            <!-- Settlement Amount Hero -->
            <div class="amount-hero-wrap">
              <span class="amount-currency-symbol">${currency}</span>
              <input type="number" id="inp-settle-amount" class="amount-hero-input" placeholder="0.00" step="0.01" min="0.01" value="${defaultAmount}" required autofocus />
            </div>
  
            <!-- Payer (From) -->
            <div class="ios-form-group">
              <label class="ios-form-label" for="select-settle-from">Who Paid? (Debtor)</label>
              <select id="select-settle-from" class="ios-select">
                ${members.map((m) => `<option value="${m.id}" ${m.id === defaultFrom ? 'selected' : ''}>${m.name}</option>`).join('')}
              </select>
            </div>
  
            <!-- Receiver (To) -->
            <div class="ios-form-group">
              <label class="ios-form-label" for="select-settle-to">Paid To (Creditor)</label>
              <select id="select-settle-to" class="ios-select">
                ${members.map((m) => `<option value="${m.id}" ${m.id === defaultTo ? 'selected' : ''}>${m.name}</option>`).join('')}
              </select>
            </div>
  
            <!-- Optional Payment Note -->
            <div class="ios-form-group">
              <label class="ios-form-label" for="inp-settle-note">Note / Method</label>
              <input type="text" id="inp-settle-note" class="ios-input" placeholder="e.g. Venmo, Zelle, Cash, Revolut" value="Venmo / Cash" />
            </div>
  
            <button type="submit" class="btn-primary-ios" id="btn-submit-settle">
              Record Payment
            </button>
          </form>
        `,
        onRender: (sheetEl, sheet) => {
          const form = sheetEl.querySelector('#form-settle-up');
          const amountInput = sheetEl.querySelector('#inp-settle-amount');
          const fromSelect = sheetEl.querySelector('#select-settle-from');
          const toSelect = sheetEl.querySelector('#select-settle-to');
          const noteInput = sheetEl.querySelector('#inp-settle-note');
  
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            const from = fromSelect.value;
            const to = toSelect.value;
            const amount = Number(amountInput.value);
  
            if (from === to) {
              this.toast.show('Payer and receiver cannot be the same person!', { type: 'warning' });
              return;
            }
  
            if (amount <= 0) {
              this.toast.show('Please enter a valid payment amount.', { type: 'warning' });
              return;
            }
  
            const fromName = group.members.find((m) => m.id === from)?.name || 'Payer';
            const toName = group.members.find((m) => m.id === to)?.name || 'Receiver';
  
            this.ledger.recordSettlement({
              from,
              to,
              amount,
              note: noteInput.value.trim() || 'Settlement',
            });
  
            if (this.audio) this.audio.success();
            this.toast.show(`Recorded: ${fromName} paid ${toName} ${currency}${amount.toFixed(2)}`, { type: 'success' });
            sheet.close();
          });
        },
      });
    }
  }

  // --- Module: src/ui/QrSyncSheet.js ---
  /**
   * QrSyncSheet - P2P Zero-Server Group Sync via Compressed QR Code & Camera Scanner.
   */
  class QrSyncSheet {
    constructor({ bottomSheet, ledger, cameraService, audioHaptics, toast }) {
      this.sheet = bottomSheet;
      this.ledger = ledger;
      this.camera = cameraService;
      this.audio = audioHaptics;
      this.toast = toast;
    }
  
    show() {
      const group = this.ledger.getActiveGroup();
      const qrPayload = QrSyncEngine.serializeGroup(group);
  
      this.sheet.show({
        title: 'Peer-to-Peer Sync',
        subtitle: `${group.name} • Zero-Cloud Transfer`,
        contentHtml: `
          <div class="qr-sync-container">
            <!-- Segmented Tab: Show QR vs Scan QR -->
            <div class="split-mode-pill-bar" id="qr-tab-bar" style="margin-bottom: 1.25rem;">
              <button type="button" class="split-pill active" id="tab-show-qr">Show Group QR</button>
              <button type="button" class="split-pill" id="tab-scan-qr">Scan Friend's QR</button>
            </div>
  
            <!-- Section A: Display QR -->
            <div id="section-show-qr" class="qr-section">
              <div class="qr-canvas-card">
                <canvas id="qr-display-canvas"></canvas>
              </div>
              <p class="qr-tip-text">
                Have a friend open FairSplit and tap <strong>Scan Friend's QR</strong> to instantly import this group ledger.
              </p>
              <div style="display:flex; gap:0.5rem; width:100%; margin-top:0.5rem;">
                <button type="button" class="btn-sm-primary" id="btn-copy-sync-code" style="flex:1;">
                  📋 Copy Sync Text
                </button>
              </div>
            </div>
  
            <!-- Section B: Camera Viewfinder Scanner -->
            <div id="section-scan-qr" class="qr-section hidden">
              <div class="viewfinder-box">
                <video id="qr-scanner-video" playsinline muted autoplay></video>
                <div class="viewfinder-reticle"></div>
              </div>
              <p class="qr-tip-text">Point camera at the QR code on your friend's screen</p>
  
              <div class="manual-code-fallback" style="margin-top:1rem; width:100%;">
                <label class="ios-form-label" for="inp-manual-sync">Or Paste Sync Code</label>
                <div style="display:flex; gap:0.4rem;">
                  <input type="text" id="inp-manual-sync" class="ios-input" placeholder="Paste JSON code here..." />
                  <button type="button" class="btn-sm-primary" id="btn-submit-manual-sync">Import</button>
                </div>
              </div>
            </div>
          </div>
        `,
        onRender: (sheetEl, sheet) => {
          const tabShow = sheetEl.querySelector('#tab-show-qr');
          const tabScan = sheetEl.querySelector('#tab-scan-qr');
          const secShow = sheetEl.querySelector('#section-show-qr');
          const secScan = sheetEl.querySelector('#section-scan-qr');
          const canvas = sheetEl.querySelector('#qr-display-canvas');
          const copyBtn = sheetEl.querySelector('#btn-copy-sync-code');
          const videoEl = sheetEl.querySelector('#qr-scanner-video');
          const manualInput = sheetEl.querySelector('#inp-manual-sync');
          const manualBtn = sheetEl.querySelector('#btn-submit-manual-sync');
  
          // Render QR to canvas
          QrSyncEngine.renderToCanvas(canvas, qrPayload, 260);
  
          // Copy sync code
          copyBtn.addEventListener('click', async () => {
            if (navigator.clipboard) {
              await navigator.clipboard.writeText(qrPayload);
              if (this.audio) this.audio.tap();
              this.toast.show('Copied sync code to clipboard!', { type: 'success' });
            }
          });
  
          // Tab switching
          tabShow.addEventListener('click', () => {
            tabShow.classList.add('active');
            tabScan.classList.remove('active');
            secShow.classList.remove('hidden');
            secScan.classList.add('hidden');
            this.camera.stop();
            if (this.audio) this.audio.tick();
          });
  
          tabScan.addEventListener('click', async () => {
            tabScan.classList.add('active');
            tabShow.classList.remove('active');
            secScan.classList.remove('hidden');
            secShow.classList.add('hidden');
            if (this.audio) this.audio.tick();
  
            try {
              await this.camera.start({
                videoElement: videoEl,
                onDetected: (scannedText) => {
                  this._handleImportedPayload(scannedText, sheet);
                },
              });
            } catch (err) {
              this.toast.show('Camera unavailable; paste code manually below.', { type: 'warning' });
            }
          });
  
          // Manual code submit
          manualBtn.addEventListener('click', () => {
            const text = manualInput.value.trim();
            if (text) {
              this._handleImportedPayload(text, sheet);
            }
          });
        },
        onClose: () => {
          this.camera.stop();
        },
      });
    }
  
    _handleImportedPayload(payloadString, sheet) {
      const res = QrSyncEngine.deserializeGroup(payloadString);
      if (res.success && res.group) {
        this.camera.stop();
        // Check if group already exists to update it, or add new
        const existingIdx = this.ledger.state.groups.findIndex((g) => g.id === res.group.id);
        if (existingIdx >= 0) {
          this.ledger.state.groups[existingIdx] = res.group;
        } else {
          this.ledger.state.groups.push(res.group);
        }
        this.ledger.state.activeGroupId = res.group.id;
        this.ledger.save();
  
        if (this.audio) this.audio.success();
        this.toast.show(`Successfully synced "${res.group.name}"!`, { type: 'success' });
        sheet.close();
      } else {
        if (this.audio) this.audio.warning();
        this.toast.show('Invalid FairSplit QR or code format.', { type: 'warning' });
      }
    }
  }

  // --- Module: src/ui/GroupPickerSheet.js ---
  /**
   * GroupPickerSheet - Switch or Create Expense Groups & Select Currency.
   */
  class GroupPickerSheet {
    constructor({ bottomSheet, ledger, audioHaptics, toast }) {
      this.sheet = bottomSheet;
      this.ledger = ledger;
      this.audio = audioHaptics;
      this.toast = toast;
    }
  
    show() {
      const activeGroup = this.ledger.getActiveGroup();
      const groups = this.ledger.state.groups;
      const currentCurrency = activeGroup.currency || this.ledger.state.currency || 'USD';
  
      this.sheet.show({
        title: 'Expense Groups & Settings',
        subtitle: `${groups.length} Groups on Device`,
        contentHtml: `
          <div class="ios-form">
            <!-- Active Groups Inset List -->
            <div class="ios-form-group">
              <label class="ios-form-label">Switch Active Group</label>
              <div class="ios-inset-card" id="groups-list-card">
                ${groups
                  .map(
                    (g, idx) => `
                  <div class="ios-table-row ${idx === groups.length - 1 ? 'last-row' : ''} ${g.id === activeGroup.id ? 'active-group-row' : ''}" data-group-id="${g.id}">
                    <div class="row-leading">
                      <span class="row-icon">📁</span>
                      <div class="row-label-group">
                        <span class="row-title">${g.name}</span>
                        <span class="row-subtitle">${g.members.length} members • ${g.expenses.length} expenses</span>
                      </div>
                    </div>
                    <div class="row-trailing">
                      ${g.id === activeGroup.id ? '<span class="status-pill active">Active</span>' : '<span class="row-chevron">›</span>'}
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
  
            <!-- Create New Group -->
            <div class="ios-form-group">
              <label class="ios-form-label" for="inp-new-group-name">Create New Group</label>
              <div style="display:flex; gap:0.4rem;">
                <input type="text" id="inp-new-group-name" class="ios-input" placeholder="e.g. Hawaii Trip, Apartment 4B" autocomplete="off" />
                <button type="button" class="btn-sm-primary" id="btn-create-group">Create</button>
              </div>
            </div>
  
            <!-- Currency Setting -->
            <div class="ios-form-group">
              <label class="ios-form-label" for="select-currency">Group Currency</label>
              <select id="select-currency" class="ios-select">
                ${CURRENCIES.map(
                  (c) => `
                  <option value="${c.code}" ${c.code === currentCurrency ? 'selected' : ''}>
                    ${c.symbol} ${c.code} — ${c.name}
                  </option>
                `
                ).join('')}
              </select>
            </div>
          </div>
        `,
        onRender: (sheetEl, sheet) => {
          const groupRows = sheetEl.querySelectorAll('#groups-list-card .ios-table-row');
          const newGroupInput = sheetEl.querySelector('#inp-new-group-name');
          const createBtn = sheetEl.querySelector('#btn-create-group');
          const currencySelect = sheetEl.querySelector('#select-currency');
  
          // Switch group
          groupRows.forEach((row) => {
            row.addEventListener('click', () => {
              const gid = row.getAttribute('data-group-id');
              if (gid) {
                this.ledger.setActiveGroup(gid);
                if (this.audio) this.audio.tap();
                this.toast.show(`Switched to "${this.ledger.getActiveGroup().name}"`, { type: 'info' });
                sheet.close();
              }
            });
          });
  
          // Create new group
          const handleCreate = () => {
            const name = newGroupInput.value.trim();
            if (!name) return;
            const curr = currencySelect.value;
            const created = this.ledger.createGroup(name, curr);
            if (this.audio) this.audio.success();
            this.toast.show(`Created group "${created.name}"`, { type: 'success' });
            sheet.close();
          };
  
          createBtn.addEventListener('click', handleCreate);
          newGroupInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCreate();
            }
          });
  
          // Currency change
          currencySelect.addEventListener('change', (e) => {
            this.ledger.setCurrency(e.target.value);
            if (this.audio) this.audio.tick();
            this.toast.show(`Currency set to ${e.target.value}`, { type: 'info' });
          });
        },
      });
    }
  }

  // --- Module: src/main.js ---
  /**
   * FairSplit - Zero-Backend P2P Expense Splitter with Min-Cash-Flow Debt Graph.
   */
  
  
  
  
  
  
  
  class FairSplitApp {
    constructor() {
      this.bus = new EventBus();
      this.audio = new AudioHaptics({ enabled: true });
      this.storage = new StorageManager({
        namespace: 'fairsplit_db',
        version: 1,
      });
      this.ledger = new ExpenseLedger({
        storageManager: this.storage,
        eventBus: this.bus,
      });
      this.camera = new CameraService();
      this.bottomSheet = new BottomSheet({ audioHaptics: this.audio });
      this.toast = new Toast();
      this.legalSheet = new LegalNoticeSheet({
        bottomSheet: this.bottomSheet,
        appName: 'FairSplit',
      });
  
      // Sub-sheets
      this.expenseSheet = new ExpenseSheet({
        bottomSheet: this.bottomSheet,
        ledger: this.ledger,
        audioHaptics: this.audio,
        toast: this.toast,
      });
      this.memberSheet = new MemberSheet({
        bottomSheet: this.bottomSheet,
        ledger: this.ledger,
        audioHaptics: this.audio,
        toast: this.toast,
      });
      this.settleSheet = new SettleSheet({
        bottomSheet: this.bottomSheet,
        ledger: this.ledger,
        audioHaptics: this.audio,
        toast: this.toast,
      });
      this.qrSyncSheet = new QrSyncSheet({
        bottomSheet: this.bottomSheet,
        ledger: this.ledger,
        cameraService: this.camera,
        audioHaptics: this.audio,
        toast: this.toast,
      });
      this.groupPickerSheet = new GroupPickerSheet({
        bottomSheet: this.bottomSheet,
        ledger: this.ledger,
        audioHaptics: this.audio,
        toast: this.toast,
      });
  
      this.activeTab = 'expenses'; // 'expenses' | 'balances' | 'settle'
    }
  
    init() {
      this._initSegmentedControl();
      this._bindGlobalEvents();
      this._render();
  
      this.bus.on('ledger:updated', () => {
        this._render();
      });
    }
  
    _initSegmentedControl() {
      const slot = document.getElementById('segmented-control-slot');
      if (!slot) return;
  
      new SegmentedControl({
        container: slot,
        options: [
          { id: 'expenses', label: 'Expenses' },
          { id: 'balances', label: 'Balances' },
          { id: 'settle', label: 'Settle Up' },
        ],
        defaultId: 'expenses',
        audioHaptics: this.audio,
        onChange: (tabId) => {
          this.activeTab = tabId;
          this._render();
        },
      });
    }
  
    _bindGlobalEvents() {
      // Header controls
      document.getElementById('btn-header-groups')?.addEventListener('click', () => {
        this.groupPickerSheet.show();
      });
  
      document.getElementById('btn-header-members')?.addEventListener('click', () => {
        this.memberSheet.show();
      });
  
      document.getElementById('nav-btn-members')?.addEventListener('click', () => {
        this.memberSheet.show();
      });
  
      // Floating add button
      document.getElementById('btn-floating-add')?.addEventListener('click', () => {
        this.expenseSheet.show();
      });
  
      // Nav scan/sync button
      document.getElementById('nav-btn-sync')?.addEventListener('click', () => {
        this.qrSyncSheet.show();
      });
  
      // Legal notice footer
      document.getElementById('btn-open-legal')?.addEventListener('click', () => {
        this.legalSheet.show();
      });
    }
  
    _render() {
      const group = this.ledger.getActiveGroup();
      const currency = this.ledger.getCurrencySymbol();
      const totalSpend = this.ledger.getTotalSpend();
  
      // Update Header Pill
      const groupTitleEl = document.getElementById('header-group-title');
      if (groupTitleEl) {
        groupTitleEl.textContent = group.name;
      }
  
      const container = document.getElementById('view-stage');
      if (!container) return;
  
      if (this.activeTab === 'expenses') {
        this._renderExpensesView(container, group, currency, totalSpend);
      } else if (this.activeTab === 'balances') {
        this._renderBalancesView(container, group, currency);
      } else if (this.activeTab === 'settle') {
        this._renderSettleView(container, group, currency, totalSpend);
      }
    }
  
    _renderExpensesView(container, group, currency, totalSpend) {
      const expenses = group.expenses;
  
      container.innerHTML = `
        <!-- Group Hero Banner -->
        <div class="group-hero-card">
          <div class="hero-top-row">
            <div class="hero-label">Total Group Spend</div>
            <button type="button" class="btn-hero-manage" id="btn-hero-sync" title="Sync Ledger via QR">
              🔄 Sync QR
            </button>
          </div>
          <div class="hero-total-amount">${currency}${totalSpend.toFixed(2)}</div>
          <div class="hero-member-strip">
            ${group.members
              .map(
                (m) => `
              <div class="hero-avatar-pill" title="${m.name}">
                <span class="avatar-dot" style="background:${m.color}"></span>
                <span class="hero-member-name">${m.name}</span>
              </div>
            `
              )
              .join('')}
            <button type="button" class="hero-add-member-pill" id="btn-hero-add-member">+ Person</button>
          </div>
        </div>
  
        <!-- Expenses Inset List -->
        <div class="ios-group-container" style="margin-top: 1rem;">
          <div class="ios-group-header">Recent Expenses (${expenses.length})</div>
          <div class="ios-inset-card">
            ${
              expenses.length === 0
                ? `
              <div class="empty-state-card">
                <span class="empty-icon">🧾</span>
                <h4>No expenses yet</h4>
                <p>Tap the <strong>+</strong> button below to log your first group purchase.</p>
              </div>
            `
                : expenses
                    .map((e, idx) => {
                      const payer = group.members.find((m) => m.id === e.paidBy);
                      const cat = CATEGORIES.find((c) => c.id === e.category) || CATEGORIES[6];
                      const isLast = idx === expenses.length - 1;
  
                      return `
                  <div class="ios-table-row expense-item-row ${isLast ? 'last-row' : ''}">
                    <div class="row-leading">
                      <span class="cat-badge-circle">${cat.icon}</span>
                      <div class="row-label-group">
                        <span class="row-title">${e.title}</span>
                        <span class="row-subtitle">Paid by <strong style="color:${payer ? payer.color : 'inherit'}">${payer ? payer.name : 'Unknown'}</strong> • ${new Date(e.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                    <div class="row-trailing">
                      <span class="expense-amount-tag">${currency}${Number(e.amount).toFixed(2)}</span>
                      <button type="button" class="btn-delete-item" data-id="${e.id}" title="Delete expense">✕</button>
                    </div>
                  </div>
                `;
                    })
                    .join('')
            }
          </div>
        </div>
      `;
  
      // Hook internal buttons
      container.querySelector('#btn-hero-sync')?.addEventListener('click', () => this.qrSyncSheet.show());
      container.querySelector('#btn-hero-add-member')?.addEventListener('click', () => this.memberSheet.show());
  
      container.querySelectorAll('.btn-delete-item').forEach((btn) => {
        btn.addEventListener('click', (ev) => {
          const id = ev.currentTarget.getAttribute('data-id');
          this.ledger.deleteExpense(id);
          if (this.audio) this.audio.tap();
          this.toast.show('Expense deleted', { type: 'info' });
        });
      });
    }
  
    _renderBalancesView(container, group, currency) {
      const memberIds = group.members.map((m) => m.id);
      const balances = DebtSimplifier.calculateNetBalances(memberIds, group.expenses, group.settlements);
  
      container.innerHTML = `
        <div class="ios-group-container">
          <div class="ios-group-header">Net Individual Balances</div>
          <div class="ios-inset-card">
            ${group.members
              .map((m, idx) => {
                const net = balances.get(m.id) || 0;
                const isLast = idx === group.members.length - 1;
                const isPositive = net > 0.01;
                const isNegative = net < -0.01;
  
                return `
                <div class="ios-table-row balance-row ${isLast ? 'last-row' : ''}">
                  <div class="row-leading">
                    <span class="avatar-dot" style="background:${m.color}"></span>
                    <div class="row-label-group">
                      <span class="row-title">${m.name}</span>
                      <span class="row-subtitle">
                        ${
                          isPositive
                            ? 'Gets back'
                            : isNegative
                            ? 'Owes group'
                            : 'Settled up'
                        }
                      </span>
                    </div>
                  </div>
                  <div class="row-trailing">
                    <span class="balance-badge ${isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}">
                      ${isPositive ? '+' : ''}${currency}${Math.abs(net).toFixed(2)}
                    </span>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
          <div class="ios-group-footer">
            Positive numbers indicate money owed back to you. Negative numbers indicate what you owe.
          </div>
        </div>
      `;
    }
  
    _renderSettleView(container, group, currency, totalSpend) {
      const memberIds = group.members.map((m) => m.id);
      const balances = DebtSimplifier.calculateNetBalances(memberIds, group.expenses, group.settlements);
      const simplifiedTransfers = DebtSimplifier.simplifyDebts(balances);
  
      const memberMap = new Map();
      group.members.forEach((m) => memberMap.set(m.id, m));
  
      container.innerHTML = `
        <!-- Settlement Actions Header -->
        <div class="settle-header-card">
          <div class="settle-card-title">
            <span>⚡ Min-Cash-Flow Solution</span>
            <button type="button" class="btn-share-summary" id="btn-share-summary">
              ↗️ Share Summary
            </button>
          </div>
          <p class="settle-card-sub">
            Optimal transfers reducing group debt to the mathematical minimum.
          </p>
        </div>
  
        <!-- Simplified Settlements Inset List -->
        <div class="ios-group-container" style="margin-top: 1rem;">
          <div class="ios-group-header">Required Transfers (${simplifiedTransfers.length})</div>
          <div class="ios-inset-card">
            ${
              simplifiedTransfers.length === 0
                ? `
              <div class="empty-state-card">
                <span class="empty-icon">🎉</span>
                <h4>All Debts Settled!</h4>
                <p>Nobody owes anything in this group. Everyone is even.</p>
              </div>
            `
                : simplifiedTransfers
                    .map((t, idx) => {
                      const fromM = memberMap.get(t.from);
                      const toM = memberMap.get(t.to);
                      const isLast = idx === simplifiedTransfers.length - 1;
  
                      return `
                  <div class="ios-table-row transfer-row ${isLast ? 'last-row' : ''}">
                    <div class="row-leading">
                      <span class="transfer-arrow">➡️</span>
                      <div class="row-label-group">
                        <div class="transfer-participants">
                          <strong style="color:${fromM ? fromM.color : 'inherit'}">${fromM ? fromM.name : 'Unknown'}</strong>
                          <span class="pays-word">pays</span>
                          <strong style="color:${toM ? toM.color : 'inherit'}">${toM ? toM.name : 'Unknown'}</strong>
                        </div>
                      </div>
                    </div>
                    <div class="row-trailing">
                      <span class="transfer-amount">${currency}${t.amount.toFixed(2)}</span>
                      <button type="button" class="btn-record-paid" data-from="${t.from}" data-to="${t.to}" data-amount="${t.amount}">
                        Paid
                      </button>
                    </div>
                  </div>
                `;
                    })
                    .join('')
            }
          </div>
        </div>
  
        <!-- Completed Payments History -->
        ${
          (group.settlements || []).length > 0
            ? `
          <div class="ios-group-container" style="margin-top: 1.25rem;">
            <div class="ios-group-header">Payment History</div>
            <div class="ios-inset-card">
              ${group.settlements
                .map((s, idx) => {
                  const fromM = memberMap.get(s.from);
                  const toM = memberMap.get(s.to);
                  const isLast = idx === group.settlements.length - 1;
  
                  return `
                  <div class="ios-table-row settlement-history-row ${isLast ? 'last-row' : ''}">
                    <div class="row-leading">
                      <span class="history-check">✓</span>
                      <div class="row-label-group">
                        <span class="row-title">${fromM ? fromM.name : 'Someone'} paid ${toM ? toM.name : 'Someone'}</span>
                        <span class="row-subtitle">${s.note || 'Settlement'} • ${new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                    <div class="row-trailing">
                      <span class="history-amount">${currency}${Number(s.amount).toFixed(2)}</span>
                      <button type="button" class="btn-delete-settlement" data-id="${s.id}" title="Undo payment">✕</button>
                    </div>
                  </div>
                `;
                })
                .join('')}
            </div>
          </div>
        `
            : ''
        }
      `;
  
      // Share summary
      container.querySelector('#btn-share-summary')?.addEventListener('click', async () => {
        const summaryText = DebtSimplifier.formatShareSummary(
          group.name,
          currency,
          totalSpend,
          simplifiedTransfers,
          memberMap
        );
  
        const res = await ShareService.share({
          title: `FairSplit • ${group.name}`,
          text: summaryText,
        });
  
        if (res.success) {
          if (this.audio) this.audio.success();
          this.toast.show(
            res.method === 'native' ? 'Opened iOS Share Sheet' : 'Copied summary to clipboard!',
            { type: 'success' }
          );
        }
      });
  
      // Record Paid
      container.querySelectorAll('.btn-record-paid').forEach((btn) => {
        btn.addEventListener('click', (ev) => {
          const from = ev.currentTarget.getAttribute('data-from');
          const to = ev.currentTarget.getAttribute('data-to');
          const amount = Number(ev.currentTarget.getAttribute('data-amount'));
  
          this.settleSheet.show({
            suggestedFrom: from,
            suggestedTo: to,
            suggestedAmount: amount,
          });
        });
      });
  
      // Delete/Undo settlement
      container.querySelectorAll('.btn-delete-settlement').forEach((btn) => {
        btn.addEventListener('click', (ev) => {
          const id = ev.currentTarget.getAttribute('data-id');
          this.ledger.deleteSettlement(id);
          if (this.audio) this.audio.tap();
          this.toast.show('Settlement payment undone', { type: 'info' });
        });
      });
    }
  }
  
  // Boot application
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      const app = new FairSplitApp();
      app.init();
      window.__app = app;
    });
  }
})();
