/**
 * CameraService - Camera Viewfinder, Torch Toggle & Universal QR/Barcode Stream Bridge.
 * Supports native hardware BarcodeDetector with automatic pure-JS jsQR fallback.
 */
export class CameraService {
  constructor({ formats = ['qr_code'] } = {}) {
    this.formats = formats;
    this.stream = null;
    this.videoEl = null;
    this.detector = null;
    this.isScanning = false;
    this.scanInterval = null;
    this.torchActive = false;
    this._scanCanvas = null;
    this._scanCtx = null;

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        this.detector = new window.BarcodeDetector({ formats: ['qr_code'] });
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
      this.videoEl.setAttribute('muted', 'true');
      await this.videoEl.play();
    }

    if (typeof onDetected === 'function') {
      this._startScanLoop(onDetected);
    }

    return true;
  }

  _startScanLoop(onDetected) {
    this.isScanning = true;
    let isProcessing = false;

    const checkFrame = async () => {
      if (!this.isScanning || !this.videoEl || this.videoEl.readyState < 2) {
        if (this.isScanning) {
          this.scanInterval = requestAnimationFrame(checkFrame);
        }
        return;
      }

      if (isProcessing) {
        if (this.isScanning) {
          this.scanInterval = requestAnimationFrame(checkFrame);
        }
        return;
      }

      isProcessing = true;

      try {
        // 1. Hardware accelerated native BarcodeDetector
        if (this.detector) {
          const barcodes = await this.detector.detect(this.videoEl);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue) {
              onDetected(rawValue);
              isProcessing = false;
              return;
            }
          }
        }
      } catch (err) {
        // Fallback to jsQR
      }

      // 2. jsQR software decoding fallback (100% universal across browsers)
      const jsQRDecoder = typeof window !== 'undefined' ? (window.jsQR || globalThis.jsQR) : null;
      if (jsQRDecoder && this.videoEl && this.videoEl.videoWidth > 0) {
        try {
          if (!this._scanCanvas) {
            this._scanCanvas = document.createElement('canvas');
            this._scanCtx = this._scanCanvas.getContext('2d', { willReadFrequently: true });
          }
          const vWidth = this.videoEl.videoWidth;
          const vHeight = this.videoEl.videoHeight;
          const targetWidth = Math.min(640, vWidth);
          const targetHeight = Math.round((vHeight / vWidth) * targetWidth);

          this._scanCanvas.width = targetWidth;
          this._scanCanvas.height = targetHeight;
          this._scanCtx.drawImage(this.videoEl, 0, 0, targetWidth, targetHeight);

          const imgData = this._scanCtx.getImageData(0, 0, targetWidth, targetHeight);
          const code = jsQRDecoder(imgData.data, targetWidth, targetHeight, {
            inversionAttempts: 'dontInvert',
          });
          if (code && code.data) {
            onDetected(code.data);
            isProcessing = false;
            return;
          }
        } catch (e) {}
      }

      isProcessing = false;
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
