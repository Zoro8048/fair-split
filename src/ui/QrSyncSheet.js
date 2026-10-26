/**
 * QrSyncSheet - P2P Zero-Server Group Sync via Compressed QR Code & Camera Scanner.
 */
import { QrSyncEngine } from '../domain/QrSyncEngine.js';

export class QrSyncSheet {
  constructor({ bottomSheet, ledger, cameraService, audioHaptics, toast }) {
    this.sheet = bottomSheet;
    this.ledger = ledger;
    this.camera = cameraService;
    this.audio = audioHaptics;
    this.toast = toast;
  }

  show() {
    const group = this.ledger.getActiveGroup();
    const shareableUrl = QrSyncEngine.getShareableUrl(group);
    const jsonPayload = QrSyncEngine.serializeGroup(group);

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
              Point any smartphone camera (iPhone / Android) at this QR code to open and import this group instantly.
            </p>
            <div style="display:flex; gap:0.5rem; width:100%; margin-top:0.75rem;">
              <button type="button" class="btn-sm-primary" id="btn-copy-sync-link" style="flex:1;">
                🔗 Copy Web Link
              </button>
              <button type="button" class="btn-sm-primary" id="btn-copy-sync-code" style="flex:1; background: rgba(255,255,255,0.12);">
                📄 Copy JSON Code
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
              <label class="ios-form-label" for="inp-manual-sync">Or Paste Sync Code / Link</label>
              <div style="display:flex; gap:0.4rem;">
                <input type="text" id="inp-manual-sync" class="ios-input" placeholder="Paste URL or JSON code here..." />
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
        const copyLinkBtn = sheetEl.querySelector('#btn-copy-sync-link');
        const copyCodeBtn = sheetEl.querySelector('#btn-copy-sync-code');
        const videoEl = sheetEl.querySelector('#qr-scanner-video');
        const manualInput = sheetEl.querySelector('#inp-manual-sync');
        const manualBtn = sheetEl.querySelector('#btn-submit-manual-sync');

        // Render ISO QR Code to canvas with shareable URL
        QrSyncEngine.renderToCanvas(canvas, shareableUrl, 260);

        // Copy direct link
        copyLinkBtn.addEventListener('click', async () => {
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(shareableUrl);
            if (this.audio) this.audio.tap();
            this.toast.show('Copied shareable link to clipboard!', { type: 'success' });
          }
        });

        // Copy raw JSON
        copyCodeBtn.addEventListener('click', async () => {
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(jsonPayload);
            if (this.audio) this.audio.tap();
            this.toast.show('Copied sync JSON code to clipboard!', { type: 'success' });
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
            console.warn('[QrSyncSheet] Camera start failed:', err);
            this.toast.show('Camera access unavailable; paste code manually below.', { type: 'warning' });
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
