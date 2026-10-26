/**
 * QrSyncEngine - Peer-to-Peer Zero-Server Ledger Sync via Compressed QR Code & Camera.
 *
 * Employs standard ISO/IEC 18004 QR generation with Reed-Solomon error correction
 * and quiet zones so any smartphone camera or in-app viewfinder scans it reliably.
 */
import qrcode from 'qrcode-generator';

export class QrSyncEngine {
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
        d: e.date ? e.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        s: e.splits,
      })),
      settlements: (group.settlements || []).map((s) => ({
        id: s.id,
        f: s.from,
        t: s.to,
        a: s.amount,
        d: s.date ? s.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      })),
    };

    return JSON.stringify(compact);
  }

  /**
   * Generates a direct Web Link containing the import payload.
   * When scanned by the native iOS/Android camera, it opens Safari/Chrome and imports automatically.
   */
  static getShareableUrl(group) {
    const json = QrSyncEngine.serializeGroup(group);
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      return `${origin}${pathname}#import=${encodeURIComponent(json)}`;
    }
    return `https://zoro8048.github.io/fairsplit/#import=${encodeURIComponent(json)}`;
  }

  /**
   * Deserializes and validates a scanned QR payload (supports raw JSON or #import= URL).
   */
  static deserializeGroup(inputString) {
    try {
      if (!inputString || typeof inputString !== 'string') {
        throw new Error('Input payload must be a non-empty string');
      }

      let jsonString = inputString.trim();

      // If scanned as a URL containing #import= or #sync=
      if (jsonString.includes('#import=') || jsonString.includes('#sync=')) {
        const hashMatch = jsonString.match(/#(?:import|sync)=(.+)$/);
        if (hashMatch && hashMatch[1]) {
          jsonString = decodeURIComponent(hashMatch[1]);
        }
      }

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
   * Renders ISO/IEC 18004 Standard QR Code to HTML5 Canvas with quiet margin.
   */
  static renderToCanvas(canvas, text, size = 260) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;

    // Resolve qrcode generator function (module or global)
    const qrGenerator = typeof qrcode !== 'undefined'
      ? qrcode
      : (typeof window !== 'undefined' && window.qrcode ? window.qrcode : null);

    if (qrGenerator) {
      try {
        // type 0 = auto-select version (1..40) based on payload length
        // Error correction: 'L' (Low 7%) to keep cell sizes large and effortless to scan
        const qr = qrGenerator(0, 'L');
        qr.addData(text);
        qr.make();

        const moduleCount = qr.getModuleCount();
        const margin = 2; // quiet zone modules
        const totalModules = moduleCount + margin * 2;
        const cellSize = size / totalModules;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        ctx.fillStyle = '#000000';
        for (let row = 0; row < moduleCount; row++) {
          for (let col = 0; col < moduleCount; col++) {
            if (qr.isDark(row, col)) {
              ctx.fillRect(
                Math.floor((col + margin) * cellSize),
                Math.floor((row + margin) * cellSize),
                Math.ceil(cellSize),
                Math.ceil(cellSize)
              );
            }
          }
        }
        return;
      } catch (err) {
        console.warn('[QrSyncEngine] QR generation error:', err);
      }
    }

    // Fallback display if QR generator fails
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#ff453a';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QR Generator Failed', size / 2, size / 2);
  }
}
