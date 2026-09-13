// =============================================================================
// colors.mjs — Color de las líneas de protocolo (PASS/WARN/FAIL)
// -----------------------------------------------------------------------------
// IMPLEMENTACIÓN DE REFERENCIA EN NODE. Usa util.styleText (nativo, sin
// dependencias), que respeta NO_COLOR y FORCE_COLOR: como los checks corren como
// subprocesos con stdout por pipe (nunca TTY), es el runner (../verify.mjs) quien
// decide si hay color y lo propaga a cada hijo vía FORCE_COLOR=1.
// El color es presentación: el contrato del protocolo sigue siendo el texto
// `PASS|FAIL|WARN` — por eso el runner cuenta con stripAnsi().
// =============================================================================
import { styleText } from 'node:util';

const STATUS_COLORS = { PASS: 'green', WARN: 'yellow', FAIL: 'red' };

// Envuelve 'PASS' | 'WARN' | 'FAIL' con su color; cualquier otro valor pasa tal cual.
export function colorStatus(status) {
  const color = STATUS_COLORS[status];
  return color ? styleText(color, status) : status;
}

// Quita códigos ANSI — para comparar/contar líneas de protocolo aunque lleguen coloreadas.
const ESC = String.fromCharCode(0x1b);
const ANSI_RE = new RegExp(`${ESC}\\[[0-9;]*m`, 'g');
export function stripAnsi(text) {
  return text.replace(ANSI_RE, '');
}
