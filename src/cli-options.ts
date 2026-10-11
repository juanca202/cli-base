import type { Command } from 'commander';
import type { OutputFormat } from './output.js';

/**
 * Opciones globales del programa: formato de salida y rutas base del
 * repositorio de especificaciones. Los flags de ruta son relativos a `--repo`
 * salvo que sean absolutos; su resolución vive en la capacidad `settings`.
 *
 * Vive fuera de `src/commands/` porque el registro de `--dry-run` trata cada
 * archivo de esa carpeta como un comando.
 */
export type GlobalOptions = {
  /** Valor tal cual llegó (`undefined` si no se pasó); el programa lo valida en `preAction`. */
  output: OutputFormat | undefined;
  repo?: string;
  changes?: string;
  current?: string;
  archived?: string;
  archRoot?: string;
};

export function registerGlobalOptions(program: Command): Command {
  return program
    .option('--repo <path>', 'repositorio de especificaciones sobre el que se opera')
    .option('--changes <path>', 'raíz de lo que cambia el sistema (relativa a --repo)')
    .option('--current <path>', 'raíz de las features FT-XXX (relativa a --repo)')
    .option('--archived <path>', 'raíz del trabajo archivado (relativa a --repo)')
    .option('--arch-root <path>', 'raíz de arquitectura para los ADR (relativa a --repo)');
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function readGlobalOptions(command: Command): GlobalOptions {
  const opts = command.optsWithGlobals();
  const options: GlobalOptions = { output: opts['output'] as OutputFormat };
  const repo = optionalText(opts['repo']);
  const changes = optionalText(opts['changes']);
  const current = optionalText(opts['current']);
  const archived = optionalText(opts['archived']);
  const archRoot = optionalText(opts['archRoot']);
  if (repo !== undefined) options.repo = repo;
  if (changes !== undefined) options.changes = changes;
  if (current !== undefined) options.current = current;
  if (archived !== undefined) options.archived = archived;
  if (archRoot !== undefined) options.archRoot = archRoot;
  return options;
}
