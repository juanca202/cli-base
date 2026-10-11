import { toCliErrorFields, type CliErrorFields } from './errors.js';

export type OutputFormat = 'human' | 'json';

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

export function resolveOutputFormat(value: unknown): OutputFormat {
  return value === 'json' ? 'json' : 'human';
}

export function writeResult(payload: unknown, format: OutputFormat): void {
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
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
 * stdout; en `human`, el texto que produce `renderHuman`.
 */
export function writeSuccess<T>(
  command: CommandName,
  data: T,
  format: OutputFormat,
  renderHuman: (data: T) => string,
): void {
  if (format === 'json') {
    writeResult(successEnvelope(command, data), 'json');
    return;
  }
  writeResult(renderHuman(data), 'human');
}

/**
 * Fallo clasificado: en `json`, un único `cli-error/v1` por stdout (sin
 * diagnóstico); en `human`, el mensaje por stderr.
 */
export function writeFailure(error: unknown, command: CommandName | null, format: OutputFormat): void {
  if (format === 'json') {
    writeResult(failureEnvelope(command, error), 'json');
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
