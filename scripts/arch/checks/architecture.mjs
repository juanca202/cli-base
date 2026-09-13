#!/usr/bin/env node
// =============================================================================
// Fitness functions del estándar Estándares de Arquitectura y Diseño — checks/architecture.mjs
// -----------------------------------------------------------------------------
// UN archivo por ESTÁNDAR (no por criterio): agrupa los chequeos de todos los
// criterios de cumplimiento (CR) automatizables de este estándar de dominio
// (docs/standards/architecture.md). La trazabilidad al criterio se indica
// en cada chequeo: su referencia CR-XXX (en el registro del chequeo y en la
// línea de salida) y un comentario junto al chequeo con el detalle.
// =============================================================================
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { colorStatus } from '../lib/colors.mjs';

const STANDARD = 'architecture';
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

async function checkAsync(cr, enfoque, descripcion, fn) {
  try {
    await fn();
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

function srcCorpus() {
  const srcRoot = join(repoRoot, 'src');
  return listSrcFiles(srcRoot)
    .map((file) => ({ rel: relative(repoRoot, file), source: readFileSync(file, 'utf8') }));
}

function srcText() {
  return srcCorpus().map(({ source }) => source).join('\n');
}

function hasNearby(corpus, left, right) {
  return new RegExp(`${left}[\\s\\S]{0,200}${right}|${right}[\\s\\S]{0,200}${left}`).test(corpus);
}

function restrictedChildProcess(configs) {
  for (const entry of configs) {
    const rule = entry?.rules?.['no-restricted-imports'];
    if (!rule) continue;
    const severity = Array.isArray(rule) ? rule[0] : rule;
    const opts = Array.isArray(rule) ? rule[1] : undefined;
    const isError = severity === 'error' || severity === 2;
    if (!isError || !opts) continue;
    const names = (opts.paths ?? []).map((p) => (typeof p === 'string' ? p : p.name));
    if (names.includes('child_process') && names.includes('node:child_process')) {
      return true;
    }
  }
  return false;
}

function readPkg() {
  return JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
}

function parseMinVersion(raw) {
  const match = String(raw).match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) {
    throw new Error(`No se pudo interpretar engines.node: ${raw}`);
  }
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3] ?? 0) };
}

function isAtLeast(actual, required) {
  if (actual.major !== required.major) return actual.major > required.major;
  if (actual.minor !== required.minor) return actual.minor > required.minor;
  return actual.patch >= required.patch;
}

// --- CR-001 (bloqueante) -----------------------------------------------------
// El manifiesto DEBE declarar Node >=22.12 y el proyecto DEBE ser ESM.
// Audita cableado en package.json; no ejecuta Node ni la CLI.
check('CR-001', 'bloqueante', 'engines.node ≥ 22.12 y type module configurados', () => {
  const pkg = readPkg();
  if (pkg.type !== 'module') {
    throw new Error(`package.json.type debe ser "module"; encontrado: ${JSON.stringify(pkg.type)}`);
  }
  const raw = pkg.engines?.node;
  if (!raw) {
    throw new Error('package.json no declara engines.node');
  }
  const min = parseMinVersion(raw);
  if (!isAtLeast(min, { major: 22, minor: 12, patch: 0 })) {
    throw new Error(`engines.node (${raw}) es inferior a 22.12`);
  }
});

// --- CR-002 (bloqueante) -----------------------------------------------------
// La CLI DEBE implementarse en TypeScript con Commander.js.
// Audita dependencias, tsconfig y el import de commander en src/program.ts.
check('CR-002', 'bloqueante', 'TypeScript y Commander.js declarados', () => {
  const pkg = readPkg();
  const hasTypescript = Boolean(pkg.devDependencies?.typescript || pkg.dependencies?.typescript);
  const hasCommander = Boolean(pkg.dependencies?.commander || pkg.devDependencies?.commander);
  if (!hasTypescript) {
    throw new Error('typescript no está declarado en package.json');
  }
  if (!hasCommander) {
    throw new Error('commander no está declarado en package.json');
  }
  if (!existsSync(join(repoRoot, 'tsconfig.json'))) {
    throw new Error('falta tsconfig.json');
  }
  const programPath = join(repoRoot, 'src/program.ts');
  if (!existsSync(programPath)) {
    throw new Error('falta src/program.ts');
  }
  const programSrc = readFileSync(programPath, 'utf8');
  if (!/from\s+['"]commander['"]/.test(programSrc)) {
    throw new Error('src/program.ts no importa commander');
  }
});

// --- CR-003 (bloqueante) -----------------------------------------------------
// El layout DEBE incluir src/cli.ts, src/program.ts y src/commands/.
check('CR-003', 'bloqueante', 'layout src/cli.ts, src/program.ts y src/commands/ presente', () => {
  const required = ['src/cli.ts', 'src/program.ts'];
  for (const rel of required) {
    if (!existsSync(join(repoRoot, rel))) {
      throw new Error(`falta ${rel}`);
    }
  }
  const commandsDir = join(repoRoot, 'src/commands');
  if (!existsSync(commandsDir) || !statSync(commandsDir).isDirectory()) {
    throw new Error('falta el directorio src/commands/');
  }
});

// --- CR-004 (bloqueante) -----------------------------------------------------
// src/ NO DEBE importar child_process fuera de ProcessRunner.
// Audita que la regla ESLint esté en error; no re-ejecuta ESLint.
await checkAsync(
  'CR-004',
  'bloqueante',
  'regla de child_process restringido activa [regla ESLint: no-restricted-imports]',
  async () => {
    const configPath = join(repoRoot, 'eslint.config.js');
    if (!existsSync(configPath)) {
      throw new Error('falta eslint.config.js');
    }
    const mod = await import(pathToFileURL(configPath).href);
    const configs = Array.isArray(mod.default) ? mod.default : [mod.default];
    if (!restrictedChildProcess(configs)) {
      throw new Error(
        'eslint.config.js no restringe los imports de child_process y node:child_process en error',
      );
    }
  },
);

// --- CR-005 (bloqueante) -----------------------------------------------------
// ProcessRunner DEBE exponer run, stream, cancel y timeout.
check('CR-005', 'bloqueante', 'API ProcessRunner (run, stream, cancel, timeout) declarada', () => {
  const corpus = srcText();
  if (!/\bProcessRunner\b/.test(corpus)) {
    throw new Error('no aparece ProcessRunner en src/');
  }
  const missing = ['run', 'stream', 'cancel', 'timeout'].filter((method) => !new RegExp(`\\b${method}\\s*\\(`).test(corpus));
  if (missing.length > 0) {
    throw new Error(`ProcessRunner no declara: ${missing.join(', ')}`);
  }
});

// --- CR-006 (bloqueante) -----------------------------------------------------
// El runner DEBE usar spawn, no exec.
check('CR-006', 'bloqueante', 'ProcessRunner usa spawn (no exec)', () => {
  const files = srcCorpus().filter(
    ({ rel, source }) => /process-runner/i.test(rel) || /\bProcessRunner\b/.test(source),
  );
  if (files.length === 0) {
    throw new Error('no hay implementación de ProcessRunner en src/');
  }
  const text = files.map(({ source }) => source).join('\n');
  if (!/\bspawn\s*\(/.test(text)) {
    throw new Error('ProcessRunner no invoca spawn(');
  }
  if (/\bexec\s*\(/.test(text) || /\bexecFile\s*\(/.test(text)) {
    throw new Error('ProcessRunner usa exec/execFile; debe usar spawn');
  }
});

// --- CR-007 (bloqueante) -----------------------------------------------------
// cancel/timeout DEBEN enviar SIGTERM y luego SIGKILL.
check('CR-007', 'bloqueante', 'cancel/timeout escalan SIGTERM y SIGKILL', () => {
  const corpus = srcText();
  if (!/\bSIGTERM\b/.test(corpus) || !/\bSIGKILL\b/.test(corpus)) {
    throw new Error('src/ no declara la escalada SIGTERM → SIGKILL');
  }
});

// --- CR-008 (bloqueante) -----------------------------------------------------
// Exit ≠ 0 del hijo DEBE mapearse a ProcessError.
check('CR-008', 'bloqueante', 'exit del hijo mapeado a ProcessError', () => {
  const corpus = srcText();
  if (!hasNearby(corpus, 'ProcessError', 'ProcessRunner') && !hasNearby(corpus, 'ProcessError', 'spawn')) {
    throw new Error('src/ no asocia ProcessError con el runner de procesos');
  }
});

// --- CR-009 (bloqueante) -----------------------------------------------------
// La lógica DEBE vivir en src/features/<nombre>/.
check('CR-009', 'bloqueante', 'directorio src/features/ presente', () => {
  const featuresDir = join(repoRoot, 'src/features');
  if (!existsSync(featuresDir) || !statSync(featuresDir).isDirectory()) {
    throw new Error('falta el directorio src/features/');
  }
});

// --- CR-010 (bloqueante) -----------------------------------------------------
// src/commands/ DEBE ser solo adaptadores Commander (hello de scaffold exceptuado).
check('CR-010', 'bloqueante', 'commands solo adaptan Commander (excepto hello)', () => {
  const commandsDir = join(repoRoot, 'src/commands');
  if (!existsSync(commandsDir)) {
    throw new Error('falta src/commands/');
  }
  const deepFeatureImport = /from\s+['"](?:\.\.\/)+features\/[^'"]+\/(?!index(?:\.js)?['"])/;
  for (const file of listSrcFiles(commandsDir)) {
    const rel = relative(repoRoot, file);
    if (rel.endsWith('commands/hello.ts')) {
      continue;
    }
    const source = readFileSync(file, 'utf8');
    if (deepFeatureImport.test(source)) {
      throw new Error(`${rel} importa internos de una feature; solo index público`);
    }
    if (/\bProcessRunner\b/.test(source) || /\bconsole\.log\b/.test(source)) {
      throw new Error(`${rel} no es un adaptador fino (ProcessRunner o console.log en el comando)`);
    }
  }
});

// --- CR-011 (bloqueante) -----------------------------------------------------
// Una feature NO DEBE importar internos de otra.
// Ejecuta dependency-cruiser (no es compuerta lint/test).
check('CR-011', 'bloqueante', 'dependency-cruiser: sin imports internos entre features', () => {
  const pkg = readPkg();
  if (!pkg.devDependencies?.['dependency-cruiser'] && !pkg.dependencies?.['dependency-cruiser']) {
    throw new Error('dependency-cruiser no está declarado en package.json');
  }
  const configPath = join(repoRoot, '.dependency-cruiser.mjs');
  if (!existsSync(configPath)) {
    throw new Error('falta .dependency-cruiser.mjs');
  }
  const configSrc = readFileSync(configPath, 'utf8');
  if (!configSrc.includes('no-feature-internals')) {
    throw new Error('.dependency-cruiser.mjs no declara la regla no-feature-internals');
  }
  execSync('npx dependency-cruiser src --config .dependency-cruiser.mjs', {
    cwd: repoRoot,
    stdio: 'pipe',
    encoding: 'utf8',
  });
});

// --- CR-012 (bloqueante) -----------------------------------------------------
// Si una feature hace I/O, ese código DEBE vivir en un slice infra.
check('CR-012', 'bloqueante', 'I/O de features aislado en slice infra', () => {
  const featuresDir = join(repoRoot, 'src/features');
  if (!existsSync(featuresDir)) {
    return;
  }
  const infraHint = /[/\\]infra(?:structure)?[/\\]/;
  const ioRe = /\bProcessRunner\b|from\s+['"]node:(fs|net|http|https|child_process)['"]/;
  for (const file of listSrcFiles(featuresDir)) {
    const rel = relative(repoRoot, file);
    const source = readFileSync(file, 'utf8');
    if (ioRe.test(source) && !infraHint.test(rel)) {
      throw new Error(`${rel} usa I/O fuera de un slice infra/ o infrastructure/`);
    }
  }
});

process.exit(blockingFailures > 0 ? 1 : 0);
