/**
 * Zero-dependency ES Module -> IIFE Bundler for FairSplit.
 * Concatenates modular src/ and foundation files in topological order into app.js
 * so the application works seamlessly offline, via file://, and on GitHub Pages.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const MODULE_ORDER = [
  'node_modules/ios-pwa-foundation/src/core/EventBus.js',
  'node_modules/ios-pwa-foundation/src/core/StorageManager.js',
  'node_modules/ios-pwa-foundation/src/hardware/AudioHaptics.js',
  'node_modules/ios-pwa-foundation/src/hardware/CameraService.js',
  'node_modules/ios-pwa-foundation/src/hardware/ShareService.js',
  'node_modules/ios-pwa-foundation/src/ui/BottomSheet.js',
  'node_modules/ios-pwa-foundation/src/ui/SegmentedControl.js',
  'node_modules/ios-pwa-foundation/src/ui/Toast.js',
  'node_modules/ios-pwa-foundation/src/ui/LegalNoticeSheet.js',
  'src/domain/ExpenseLedger.js',
  'src/domain/DebtSimplifier.js',
  'src/domain/QrSyncEngine.js',
  'src/ui/ExpenseSheet.js',
  'src/ui/MemberSheet.js',
  'src/ui/SettleSheet.js',
  'src/ui/QrSyncSheet.js',
  'src/ui/GroupPickerSheet.js',
  'src/main.js',
];

function stripImportsAndExports(code) {
  return code
    // Remove import statements (single or multiline)
    .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    // Convert `export class/function/const/let` to plain declarations
    .replace(/^\s*export\s+(class|function|const|let|var)\s+/gm, '$1 ')
    .trim();
}

const chunks = [
  '/**',
  ' * FairSplit - Bundled Runtime (Generated via `npm run build`)',
  ' * Pure client-side, zero runtime dependencies, local-first P2P expense splitter.',
  ' */',
  '(() => {',
  '  "use strict";',
];

for (const relPath of MODULE_ORDER) {
  let fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    // Fallback if node_modules not yet populated or linked in sibling repo
    const fallbackPath = path.resolve(rootDir, '..', relPath.replace(/^node_modules\//, ''));
    if (fs.existsSync(fallbackPath)) {
      fullPath = fallbackPath;
    } else {
      throw new Error(`Module file not found: ${fullPath}. Did you run "npm install"?`);
    }
  }
  const raw = fs.readFileSync(fullPath, 'utf8');
  const transformed = stripImportsAndExports(raw);
  chunks.push(`\n  // --- Module: ${relPath} ---\n  ${transformed.split('\n').join('\n  ')}`);
}

chunks.push('})();\n');

const outputPath = path.join(rootDir, 'app.js');
fs.writeFileSync(outputPath, chunks.join('\n'), 'utf8');
console.log(`Successfully bundled ${MODULE_ORDER.length} modules into app.js`);
