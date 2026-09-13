#!/usr/bin/env node
// =============================================================================
// Fitness functions del estándar Estándares de CLI — checks/cli.mjs
// -----------------------------------------------------------------------------
// UN archivo por ESTÁNDAR (no por criterio): agrupa los chequeos de todos los
// criterios de cumplimiento (CR) automatizables de este estándar de dominio
// (docs/standards/cli.md). La trazabilidad al criterio se indica
// en cada chequeo: su referencia CR-XXX (en el registro del chequeo y en la
// línea de salida) y un comentario junto al chequeo con el detalle.
// =============================================================================
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { colorStatus } from '../lib/colors.mjs';

const STANDARD = 'cli';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const srcRoot = join(repoRoot, 'src');
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

function listSrcFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSrcFiles(full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

function readSrcFiles() {
  return listSrcFiles(srcRoot).map((file) => ({
    file,
    rel: relative(repoRoot, file),
    source: readFileSync(file, 'utf8'),
  }));
}

// --- CR-001 (bloqueante) -----------------------------------------------------
// Todo comando con resultado observable DEBE aceptar --output json.
// Audita el programa y los comandos en src/: que --output esté registrado y
// admita el valor json. No ejecuta la CLI.
check('CR-001', 'bloqueante', '--output json registrado en el programa o los comandos', () => {
  const files = readSrcFiles();
  if (files.length === 0) {
    throw new Error('no hay fuentes TypeScript bajo src/');
  }
  const optionRe = /--output\b/;
  const jsonRe = /\bjson\b/i;
  const hits = files.filter(({ source }) => optionRe.test(source) && jsonRe.test(source));
  if (hits.length === 0) {
    throw new Error(
      'ningún archivo en src/ registra la opción --output con valor json (p. ej. en src/program.ts)',
    );
  }
});

// --- CR-002 (bloqueante) -----------------------------------------------------
// En modo máquina, diagnóstico NO DEBE ir a stdout.
// Audita que exista una capa de salida que escriba diagnóstico en stderr
// (process.stderr o console.error). No ejecuta la CLI.
check('CR-002', 'bloqueante', 'capa de salida que envía diagnóstico a stderr', () => {
  const files = readSrcFiles();
  const helperRe = /output|diagnostic|stderr|\bio\b/i;
  const stderrRe = /process\.stderr|console\.error/;
  const hits = files.filter(({ rel, source }) => helperRe.test(rel) || helperRe.test(source));
  const withStderr = hits.filter(({ source }) => stderrRe.test(source));
  if (withStderr.length === 0) {
    throw new Error(
      'falta una capa de salida que escriba progreso o diagnóstico en process.stderr o console.error',
    );
  }
});

const ERROR_TYPES = [
  'RuntimeError',
  'ConfigurationError',
  'ValidationError',
  'ProcessError',
  'ConnectionError',
  'ExternalServiceError',
];

const EXIT_MEANINGS = [
  { code: 0, labels: [/success/i, /\béxito\b/i] },
  { code: 1, labels: [/internal error/i, /error interno/i] },
  { code: 2, labels: [/invalid arguments/i, /argumentos? inv[aá]lid/i] },
  { code: 3, labels: [/configuration error/i, /error de configuraci[oó]n/i] },
  { code: 4, labels: [/runtime unavailable/i, /runtime no disponible/i] },
  { code: 5, labels: [/external process error/i, /error de proceso/i] },
];

const TYPE_TO_CODE = [
  ['RuntimeError', 1],
  ['ValidationError', 2],
  ['ConfigurationError', 3],
  ['ConnectionError', 4],
  ['ProcessError', 5],
  ['ExternalServiceError', 5],
];

function srcCorpus() {
  return readSrcFiles()
    .map(({ source }) => source)
    .join('\n');
}

function hasNearby(corpus, left, right) {
  const windowed = new RegExp(`${left}[\\s\\S]{0,160}${right}|${right}[\\s\\S]{0,160}${left}`);
  return windowed.test(corpus);
}

// --- CR-003 (bloqueante) -----------------------------------------------------
// La jerarquía DEBE incluir RuntimeError y las cinco especializaciones.
// Audita identificadores en src/; no ejecuta la CLI.
check('CR-003', 'bloqueante', 'jerarquía RuntimeError y cinco especializaciones declarada', () => {
  const corpus = srcCorpus();
  const missing = ERROR_TYPES.filter((name) => !new RegExp(`\\b${name}\\b`).test(corpus));
  if (missing.length > 0) {
    throw new Error(`faltan tipos en src/: ${missing.join(', ')}`);
  }
});

// --- CR-004 (bloqueante) -----------------------------------------------------
// El éxito DEBE terminar con código 0.
check('CR-004', 'bloqueante', 'código de éxito 0 declarado', () => {
  const corpus = srcCorpus();
  const declared =
    /\bSUCCESS\s*[:=]\s*0\b/.test(corpus) ||
    hasNearby(corpus, '0', '(?:Success|éxito|EXIT_SUCCESS)');
  if (!declared) {
    throw new Error('no se declara el código de éxito 0 (p. ej. SUCCESS = 0)');
  }
});

// --- CR-005 (bloqueante) -----------------------------------------------------
// Los códigos DEBEN ser solo 0–5 con los significados acordados.
check('CR-005', 'bloqueante', 'conjunto de códigos de salida 0–5 declarado', () => {
  const corpus = srcCorpus();
  const missing = EXIT_MEANINGS.filter(
    ({ code, labels }) => !labels.some((label) => hasNearby(corpus, String(code), label.source)),
  );
  if (missing.length > 0) {
    throw new Error(
      `faltan códigos o significados en src/: ${missing.map(({ code }) => code).join(', ')}`,
    );
  }
});

// --- CR-006 (bloqueante) -----------------------------------------------------
// Cada tipo DEBE mapear al código acordado.
check('CR-006', 'bloqueante', 'mapeo tipo de error → código de salida declarado', () => {
  const corpus = srcCorpus();
  const missing = TYPE_TO_CODE.filter(
    ([type, code]) => !hasNearby(corpus, type, String(code)),
  );
  if (missing.length > 0) {
    throw new Error(
      `falta el mapeo en src/: ${missing.map(([type, code]) => `${type}→${code}`).join(', ')}`,
    );
  }
});

// --- CR-007 (bloqueante) -----------------------------------------------------
// Existe un mecanismo compartido de --dry-run (opción + reporte) con
// semántica consistente, reutilizable por cualquier comando.
// Audita que src/dry-run.ts exporte la API esperada; no ejecuta la CLI.
check('CR-007', 'bloqueante', 'mecanismo compartido de --dry-run (opción + reporte) disponible', () => {
  const file = join(srcRoot, 'dry-run.ts');
  if (!existsSync(file)) {
    throw new Error('falta src/dry-run.ts');
  }
  const src = readFileSync(file, 'utf8');
  const missing = ['registerDryRunOption', 'isDryRun', 'reportDryRun'].filter(
    (name) => !new RegExp(`export function ${name}\\b`).test(src),
  );
  if (missing.length > 0) {
    throw new Error(`src/dry-run.ts no exporta: ${missing.join(', ')}`);
  }
});

// --- CR-008 (bloqueante) -----------------------------------------------------
// Todo comando con efectos secundarios DEBE usar el mecanismo compartido de
// --dry-run, o quedar listado con su justificación en el registro de
// excepciones documentadas (src/commands/dry-run-exemptions.ts).
// Heurística: por cada archivo de src/commands/, exige uso de
// registerDryRunOption() o una entrada con justificación no vacía en el
// registro de excepciones. No ejecuta la CLI ni juzga si el comando "debería"
// tener efectos secundarios: eso lo decide el propio registro de excepciones.
function listCommandFiles() {
  const dir = join(srcRoot, 'commands');
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.ts') &&
        !entry.name.endsWith('.test.ts') &&
        entry.name !== 'dry-run-exemptions.ts',
    )
    .map((entry) => ({ name: entry.name.replace(/\.ts$/, ''), file: join(dir, entry.name) }));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Acota la búsqueda al cuerpo del objeto DRY_RUN_EXEMPTIONS (no al archivo
// completo): un comentario o texto suelto fuera de ese literal no debe poder
// simular una entrada de excepción real.
function extractExemptionsObjectSrc(fileSrc) {
  const match = fileSrc.match(/DRY_RUN_EXEMPTIONS[^=]*=\s*\{([\s\S]*?)\}/);
  return match ? match[1] : '';
}

check('CR-008', 'bloqueante', 'comandos con efectos secundarios usan --dry-run o están exentos con justificación', () => {
  const commands = listCommandFiles();
  if (commands.length === 0) {
    return;
  }
  const exemptionsFile = join(srcRoot, 'commands', 'dry-run-exemptions.ts');
  const exemptionsSrc = existsSync(exemptionsFile) ? readFileSync(exemptionsFile, 'utf8') : '';
  const exemptionsObjectSrc = extractExemptionsObjectSrc(exemptionsSrc);
  const usesHelper = /registerDryRunOption\s*\(/;
  const missing = [];
  for (const { name, file } of commands) {
    const source = readFileSync(file, 'utf8');
    if (usesHelper.test(source)) {
      continue;
    }
    const escapedName = escapeRegExp(name);
    const exemptionRe = new RegExp(`['"\`]?${escapedName}['"\`]?\\s*:\\s*['"\`][^'"\`]+['"\`]`);
    if (exemptionRe.test(exemptionsObjectSrc)) {
      continue;
    }
    missing.push(name);
  }
  if (missing.length > 0) {
    throw new Error(
      `comandos sin --dry-run ni excepción documentada en src/commands/dry-run-exemptions.ts: ${missing.join(', ')}`,
    );
  }
});

process.exit(blockingFailures > 0 ? 1 : 0);
