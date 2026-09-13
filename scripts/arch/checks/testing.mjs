#!/usr/bin/env node
// =============================================================================
// Fitness functions del estándar Estándares de Pruebas — checks/testing.mjs
// -----------------------------------------------------------------------------
// UN archivo por ESTÁNDAR (no por criterio): agrupa los chequeos de todos los
// criterios de cumplimiento (CR) automatizables de este estándar de dominio
// (docs/standards/testing.md). La trazabilidad al criterio se indica
// en cada chequeo: su referencia CR-XXX (en el registro del chequeo y en la
// línea de salida) y un comentario junto al chequeo con el detalle.
// =============================================================================
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { colorStatus } from '../lib/colors.mjs';

const STANDARD = 'testing';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
let blockingFailures = 0;

function check(cr, enfoque, descripcion, fn) {
  try {
    fn();
    console.log(`${colorStatus('PASS')} ${STANDARD}/${cr} — ${descripcion}`);
  } catch (err) {
    const status = enfoque === 'warning' ? 'WARN' : 'FAIL';
    if (status === 'FAIL') blockingFailures += 1;
    console.log(`${colorStatus(status)} ${STANDARD}/${cr} — ${descripcion}`);
    const detail = err?.stdout?.toString?.() || err?.message || '';
    if (detail) console.log(detail.trim().split('\n').map((l) => `     ${l}`).join('\n'));
  }
}

function readPkg() {
  return JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
}

function findVitestConfig() {
  for (const rel of ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mjs']) {
    const abs = join(repoRoot, rel);
    if (existsSync(abs)) return { rel, abs };
  }
  return null;
}

// --- CR-001 (bloqueante) -----------------------------------------------------
// Las pruebas unitarias DEBEN implementarse con Vitest.
// Audita cableado (dependencia, script test, vitest.config); no ejecuta la suite.
check('CR-001', 'bloqueante', 'Vitest configurado como runner de pruebas unitarias', () => {
  const pkg = readPkg();
  if (!pkg.devDependencies?.vitest && !pkg.dependencies?.vitest) {
    throw new Error('vitest no está declarado en package.json');
  }
  const testScript = pkg.scripts?.test ?? '';
  if (!testScript.includes('vitest')) {
    throw new Error(`scripts.test no usa Vitest: ${JSON.stringify(testScript)}`);
  }
  if (!findVitestConfig()) {
    throw new Error('falta vitest.config.ts (o .js/.mjs)');
  }
});

// --- CR-002 (bloqueante) -----------------------------------------------------
// La suite DEBE poder ejecutarse con cobertura vía npm run test:coverage.
// Audita script, @vitest/coverage-v8 y provider v8 en config; no corre cobertura.
check('CR-002', 'bloqueante', 'script test:coverage y proveedor v8 configurados', () => {
  const pkg = readPkg();
  const coverageScript = pkg.scripts?.['test:coverage'] ?? '';
  if (!coverageScript) {
    throw new Error('falta scripts["test:coverage"]');
  }
  if (!coverageScript.includes('coverage')) {
    throw new Error(`scripts["test:coverage"] no recolecta cobertura: ${JSON.stringify(coverageScript)}`);
  }
  if (!pkg.devDependencies?.['@vitest/coverage-v8'] && !pkg.dependencies?.['@vitest/coverage-v8']) {
    throw new Error('@vitest/coverage-v8 no está declarado en package.json');
  }
  const cfg = findVitestConfig();
  if (!cfg) {
    throw new Error('falta vitest.config.ts (o .js/.mjs)');
  }
  const src = readFileSync(cfg.abs, 'utf8');
  if (!src.includes('coverage') || !/\bv8\b/.test(src)) {
    throw new Error(`${cfg.rel} no declara coverage.provider v8`);
  }
});

// --- CR-003 (bloqueante) -----------------------------------------------------
// La cobertura de líneas, sentencias, funciones y ramas DEBE ser ≥ 80% en cada indicador.
// Audita cableado (coverage.thresholds.{lines,statements,functions,branches} en vitest.config);
// no corre la suite.
const COVERAGE_THRESHOLD_METRICS = ['lines', 'statements', 'functions', 'branches'];
const MIN_COVERAGE_THRESHOLD = 80;

check('CR-003', 'bloqueante', 'umbrales de cobertura ≥ 80% configurados (líneas, sentencias, funciones, ramas)', () => {
  const cfg = findVitestConfig();
  if (!cfg) {
    throw new Error('falta vitest.config.ts (o .js/.mjs)');
  }
  const src = readFileSync(cfg.abs, 'utf8');
  const thresholdsBlock = src.match(/thresholds\s*:\s*\{([^}]*)\}/);
  if (!thresholdsBlock) {
    throw new Error(`${cfg.rel} no declara coverage.thresholds`);
  }
  const block = thresholdsBlock[1];
  const missing = [];
  const below = [];
  for (const metric of COVERAGE_THRESHOLD_METRICS) {
    const match = block.match(new RegExp(`\\b${metric}\\s*:\\s*(\\d+(?:\\.\\d+)?)`));
    if (!match) {
      missing.push(metric);
      continue;
    }
    const value = Number(match[1]);
    if (Number.isNaN(value) || value < MIN_COVERAGE_THRESHOLD) {
      below.push(`coverage.thresholds.${metric}=${value}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(`${cfg.rel} no declara coverage.thresholds para: ${missing.join(', ')}`);
  }
  if (below.length > 0) {
    throw new Error(`umbrales por debajo de ${MIN_COVERAGE_THRESHOLD}: ${below.join(', ')}`);
  }
});

process.exit(blockingFailures > 0 ? 1 : 0);
