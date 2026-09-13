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
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

function findE2eConfig() {
  for (const rel of ['vitest.e2e.config.ts', 'vitest.e2e.config.js', 'vitest.e2e.config.mjs']) {
    const abs = join(repoRoot, rel);
    if (existsSync(abs)) return { rel, abs };
  }
  return null;
}

function walkFiles(dir, matches) {
  if (!existsSync(dir)) return [];
  const results = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const abs = join(current, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (matches(entry.name)) results.push(abs);
    }
  };
  walk(dir);
  return results;
}

function listE2eTestFiles() {
  return walkFiles(join(repoRoot, 'tests', 'e2e'), (name) => name.endsWith('.e2e.test.ts'));
}

function listE2eHelperFiles() {
  return walkFiles(
    join(repoRoot, 'tests', 'helpers'),
    (name) => name.endsWith('.ts') && !name.endsWith('.test.ts'),
  );
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

// --- CR-004 (bloqueante) -----------------------------------------------------
// Las pruebas E2E DEBEN implementarse con Vitest y Execa.
// Audita cableado (dependencia execa, config e2e, script test:e2e); no ejecuta la suite.
check('CR-004', 'bloqueante', 'Execa configurado como cliente de proceso para la suite E2E', () => {
  const pkg = readPkg();
  if (!pkg.devDependencies?.execa && !pkg.dependencies?.execa) {
    throw new Error('execa no está declarado en package.json');
  }
  const e2eScript = pkg.scripts?.['test:e2e'] ?? '';
  if (!e2eScript) {
    throw new Error('falta scripts["test:e2e"]');
  }
  if (!e2eScript.includes('vitest')) {
    throw new Error(`scripts["test:e2e"] no usa Vitest: ${JSON.stringify(e2eScript)}`);
  }
  if (!findE2eConfig()) {
    throw new Error('falta vitest.e2e.config.ts (o .js/.mjs)');
  }
});

// --- CR-005 (bloqueante) -----------------------------------------------------
// La suite E2E DEBE mantenerse separada de las pruebas unitarias y de las de
// integración: ubicación y script canónico propios, sin mezclarse con npm test.
// Audita cableado (script propio, config propia, sin solape de include); no ejecuta la suite.
check('CR-005', 'bloqueante', 'suite E2E con ubicación, script y config propios', () => {
  const pkg = readPkg();
  const unitScript = pkg.scripts?.test ?? '';
  const e2eScript = pkg.scripts?.['test:e2e'] ?? '';
  if (!e2eScript) {
    throw new Error('falta scripts["test:e2e"]');
  }
  if (e2eScript === unitScript) {
    throw new Error('scripts["test:e2e"] es idéntico a scripts.test: no hay separación de script');
  }
  const unitCfg = findVitestConfig();
  const e2eCfg = findE2eConfig();
  if (!e2eCfg) {
    throw new Error('falta vitest.e2e.config.ts (o .js/.mjs)');
  }
  if (unitCfg && unitCfg.abs === e2eCfg.abs) {
    throw new Error('la config E2E es la misma que la config unitaria: falta separación');
  }
  if (unitCfg) {
    const unitSrc = readFileSync(unitCfg.abs, 'utf8');
    if (/['"`][^'"`]*e2e[^'"`]*['"`]/i.test(unitSrc)) {
      throw new Error(`${unitCfg.rel} incluye un patrón que referencia e2e: revisar solape con la suite unitaria`);
    }
  }
});

// --- CR-006 (bloqueante) -----------------------------------------------------
// Las pruebas E2E DEBEN invocar el binario/entry point real vía Execa y NO
// DEBEN importar código interno de src/features/ ni src/commands/ (caja negra:
// nunca una versión importada en proceso o mockeada). Execa puede invocarse
// directamente en el test o a través de un helper de tests/helpers/ (p. ej.
// cli-runner.ts).
// Heurística: exige al menos un archivo tests/e2e/**/*.e2e.test.ts, que en el
// conjunto tests/e2e/ + tests/helpers/ exista uso de execa, y que ningún
// archivo de esas carpetas importe el CLI, src/features/ ni src/commands/.
check('CR-006', 'bloqueante', 'pruebas E2E invocan el binario real vía Execa, sin importar código interno', () => {
  const testFiles = listE2eTestFiles();
  if (testFiles.length === 0) {
    throw new Error('no se encontraron pruebas E2E en tests/e2e/**/*.e2e.test.ts');
  }
  const helperFiles = listE2eHelperFiles();
  const allFiles = [...testFiles, ...helperFiles];
  const usesExeca = /from\s+['"]execa['"]|require\(\s*['"]execa['"]\s*\)/;
  const internalImportPattern = /from\s+['"][^'"]*\/src\/(cli(\.(js|ts))?|features\/|commands\/)[^'"]*['"]/;

  const anyExeca = allFiles.some((file) => usesExeca.test(readFileSync(file, 'utf8')));
  if (!anyExeca) {
    throw new Error('ningún archivo de tests/e2e/ o tests/helpers/ usa execa para invocar el CLI');
  }

  const withInternalImport = [];
  for (const file of allFiles) {
    const src = readFileSync(file, 'utf8');
    if (internalImportPattern.test(src)) {
      withInternalImport.push(file.slice(repoRoot.length + 1));
    }
  }
  if (withInternalImport.length > 0) {
    throw new Error(`importan código interno del CLI (src/cli, src/features o src/commands) en vez de invocar el binario: ${withInternalImport.join(', ')}`);
  }
});

process.exit(blockingFailures > 0 ? 1 : 0);
