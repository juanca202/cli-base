import { toCliErrorFields, type CliErrorFields } from './errors.js';
import { encodeToon } from './toon.js';

export type OutputFormat = 'human' | 'json' | 'toon';

/** Comandos de la envolvente MD-001 (`cli-<comando>/v1`). */
export type CommandName = 'next' | 'find' | 'list' | 'worktree' | 'relations' | 'check';

export type SuccessEnvelope<T> = {
  schema: string;
  command: CommandName;
  ok: true;
  data: T;
};

export type FailureEnvelope = {
  schema: 'cli-error/v1';
  command: CommandName | null;
  ok: false;
  error: CliErrorFields;
};

/**
 * Formato de salida pedido con `--output`; un valor ausente o desconocido es
 * `human` (el programa rechaza los desconocidos antes de ejecutar el comando).
 */
export function resolveOutputFormat(value: unknown): OutputFormat {
  return value === 'json' || value === 'toon' ? value : 'human';
}

/**
 * Comandos que no tienen formato humano: su salida por defecto es `toon` y
 * `--output human` es un error (`next`, cuyo consumidor es un agente o skill).
 */
const MACHINE_ONLY_COMMANDS: readonly string[] = ['next'];

export function isMachineOnly(command: string | null): boolean {
  return command !== null && MACHINE_ONLY_COMMANDS.includes(command);
}

/** Formato efectivo de un comando: el pedido, o `toon` si es solo-máquina y no se pidió. */
export function effectiveFormat(command: string | null, requested: unknown): OutputFormat {
  if (isMachineOnly(command)) return requested === 'json' ? 'json' : 'toon';
  return resolveOutputFormat(requested);
}

export function writeResult(payload: unknown, format: OutputFormat): void {
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }
  if (format === 'toon') {
    process.stdout.write(`${encodeToon(payload)}\n`);
    return;
  }
  process.stdout.write(`${typeof payload === 'string' ? payload : JSON.stringify(payload)}\n`);
}

export function writeDiagnostic(message: string): void {
  process.stderr.write(`${message}\n`);
}

export function successEnvelope<T>(command: CommandName, data: T): SuccessEnvelope<T> {
  return { schema: `cli-${command}/v1`, command, ok: true, data };
}

export function failureEnvelope(command: CommandName | null, error: unknown): FailureEnvelope {
  return { schema: 'cli-error/v1', command, ok: false, error: toCliErrorFields(error) };
}

/**
 * Éxito de un comando: en `json`, el envolvente MD-001 en una sola línea por
 * stdout; en `toon`, el mismo envolvente en TOON; en `human`, el texto que
 * produce `renderHuman`.
 */
export function writeSuccess<T>(
  command: CommandName,
  data: T,
  format: OutputFormat,
  renderHuman: (data: T) => string,
): void {
  if (format === 'json' || format === 'toon') {
    writeResult(successEnvelope(command, data), format);
    return;
  }
  writeResult(renderHuman(data), 'human');
}

/**
 * Fallo clasificado: en `json`, un único `cli-error/v1` por stdout (sin
 * diagnóstico); en `human`, el mensaje por stderr.
 */
/**
 * Éxito de un comando solo-máquina: el payload tal cual, sin envolvente
 * (`next`), en `toon` por defecto o en `json`.
 */
export function writePayload(data: unknown, format: OutputFormat): void {
  writeResult(data, format === 'json' ? 'json' : 'toon');
}

export function writeFailure(error: unknown, command: CommandName | null, format: OutputFormat): void {
  if (format === 'json' || format === 'toon') {
    writeResult(failureEnvelope(command, error), format);
    return;
  }
  writeDiagnostic(toCliErrorFields(error).message);
}

const COLUMN_GAP = 2;

/**
 * Tabla de ancho fijo: cada columna mide lo que su celda más ancha y se separa
 * con dos espacios; la última no se rellena. Independiente del locale.
 */
export function renderTable(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => (row[index] ?? '').length)),
  );
  const renderRow = (cells: readonly string[]): string =>
    cells
      .map((cell, index) =>
        index === cells.length - 1 ? cell : cell.padEnd((widths[index] ?? 0) + COLUMN_GAP),
      )
      .join('');
  return [renderRow(headers), ...rows.map(renderRow)].join('\n');
}

/** Líneas `clave: valor`, en el orden recibido. */
export function renderKeyValue(pairs: readonly (readonly [string, string])[]): string {
  return pairs.map(([key, value]) => `${key}: ${value}`).join('\n');
}
