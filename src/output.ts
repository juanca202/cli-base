import { toCliErrorFields, type CliErrorFields } from './errors.js';
import { encodeToon } from './toon.js';

/** Formatos de salida: TOON (por defecto) y JSON. No hay formato humano. */
export type OutputFormat = 'toon' | 'json';

export const OUTPUT_FORMATS: readonly OutputFormat[] = ['toon', 'json'];

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

export function isOutputFormat(value: unknown): value is OutputFormat {
  return value === 'toon' || value === 'json';
}

/** Formato pedido con `--output`; ausente o desconocido es `toon` (el programa rechaza los desconocidos). */
export function resolveOutputFormat(value: unknown): OutputFormat {
  return value === 'json' ? 'json' : 'toon';
}

/** Un único documento por stdout: JSON en una línea, o TOON; ambos terminan en `\n`. */
export function writeResult(payload: unknown, format: OutputFormat): void {
  const text = format === 'json' ? JSON.stringify(payload) : encodeToon(payload);
  process.stdout.write(`${text}\n`);
}

/** Diagnóstico o progreso: siempre por stderr, nunca mezclado con el payload. */
export function writeDiagnostic(message: string): void {
  process.stderr.write(`${message}\n`);
}

export function successEnvelope<T>(command: CommandName, data: T): SuccessEnvelope<T> {
  return { schema: `cli-${command}/v1`, command, ok: true, data };
}

export function failureEnvelope(command: CommandName | null, error: unknown): FailureEnvelope {
  return { schema: 'cli-error/v1', command, ok: false, error: toCliErrorFields(error) };
}

/** Éxito de un comando: el envolvente MD-001 en el formato pedido. */
export function writeSuccess<T>(command: CommandName, data: T, format: OutputFormat): void {
  writeResult(successEnvelope(command, data), format);
}

/** Éxito de `next`: el payload tal cual, sin envolvente (excepción de MD-001). */
export function writePayload(data: unknown, format: OutputFormat): void {
  writeResult(data, format);
}

/** Fallo clasificado: un único `cli-error/v1` por stdout en el formato pedido. */
export function writeFailure(error: unknown, command: CommandName | null, format: OutputFormat): void {
  writeResult(failureEnvelope(command, error), format);
}
