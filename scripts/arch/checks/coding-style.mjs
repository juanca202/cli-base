#!/usr/bin/env node
// =============================================================================
// Fitness functions del estándar Estándares de Estilo de Código — checks/coding-style.mjs
// -----------------------------------------------------------------------------
// UN archivo por ESTÁNDAR (no por criterio): agrupa los chequeos de todos los
// criterios de cumplimiento (CR) automatizables de este estándar de dominio
// (docs/standards/coding-style.md). La trazabilidad al criterio se indica
// en cada chequeo: su referencia CR-XXX (en el registro del chequeo y en la
// línea de salida) y un comentario junto al chequeo con el detalle.
// =============================================================================
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { colorStatus } from '../lib/colors.mjs';

const STANDARD = 'coding-style';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
let blockingFailures = 0;

async function check(cr, enfoque, descripcion, fn) {
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

function readPkg() {
  return JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
}

function hasTypescriptEslint(configs) {
  return configs.some((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const plugins = entry.plugins;
    if (plugins && typeof plugins === 'object') {
      return Object.keys(plugins).some((name) => name === '@typescript-eslint' || name.includes('typescript-eslint'));
    }
    return false;
  });
}

// --- CR-001 (bloqueante) -----------------------------------------------------
// El código TypeScript DEBE pasar npm run lint (ESLint + typescript-eslint) sin errores.
// Audita cableado (script lint, dependencias, eslint.config.js + plugin);
// no re-ejecuta ESLint — las violaciones las reporta la compuerta `lint`.
await check(
  'CR-001',
  'bloqueante',
  'script lint y typescript-eslint configurados [regla ESLint: @typescript-eslint]',
  async () => {
    const pkg = readPkg();
    const lintScript = pkg.scripts?.lint ?? '';
    if (!lintScript.includes('eslint')) {
      throw new Error(`scripts.lint no usa ESLint: ${JSON.stringify(lintScript)}`);
    }
    if (!pkg.devDependencies?.eslint && !pkg.dependencies?.eslint) {
      throw new Error('eslint no está declarado en package.json');
    }
    if (!pkg.devDependencies?.['typescript-eslint'] && !pkg.dependencies?.['typescript-eslint']) {
      throw new Error('typescript-eslint no está declarado en package.json');
    }
    const configPath = join(repoRoot, 'eslint.config.js');
    if (!existsSync(configPath)) {
      throw new Error('falta eslint.config.js');
    }

    const mod = await import(pathToFileURL(configPath).href);
    const configs = Array.isArray(mod.default) ? mod.default : [mod.default];
    if (!hasTypescriptEslint(configs)) {
      throw new Error('eslint.config.js no registra el plugin @typescript-eslint');
    }
  },
);

process.exit(blockingFailures > 0 ? 1 : 0);
