#!/usr/bin/env node
// Empaqueta el CLI en un único módulo ESM autocontenido (`dist/sdd-devkit.mjs`), con `commander` incluido,
// para distribuirlo como un solo archivo ejecutable con Node.js (`node sdd-devkit.mjs <comando>`), sin
// `node_modules` ni instalación previa. El shebang de `src/cli.ts` se conserva como primera línea.
import { build } from 'esbuild';
import { chmodSync } from 'node:fs';

const outfile = 'dist/sdd-devkit.mjs';

await build({
  entryPoints: ['src/cli.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // Dependencias CJS empaquetadas que usan `require` dinámico dentro de un módulo ESM.
  banner: { js: "import{createRequire}from'module';const require=createRequire(import.meta.url);" },
  legalComments: 'none',
  logLevel: 'info',
});

chmodSync(outfile, 0o755);
