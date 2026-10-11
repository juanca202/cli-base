import type { Command } from 'commander';
import { readGlobalOptions } from '../cli-options.js';
import { openRepository, parseCount } from '../command-context.js';
import {
  listArtifacts,
  type ListQuery,
  type ListResult,
} from '../features/artifact-catalog/index.js';
import { renderTable, resolveOutputFormat, writeSuccess } from '../output.js';

type ListFilters = {
  type: string | undefined;
  parent: string | undefined;
  capability: string | undefined;
  state: string;
  withStatus: boolean;
  limit: number | undefined;
  offset: number | undefined;
};

function optionText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Tabla con `STATUS` solo con `--with-status`, y una línea de resumen. */
export function renderList(result: ListResult, filters: ListFilters): string {
  const { withStatus } = filters;
  const headers = withStatus ? ['ID', 'TIPO', 'ESTADO', 'STATUS', 'RUTA'] : ['ID', 'TIPO', 'ESTADO', 'RUTA'];
  const rows = result.items.map((ref) =>
    withStatus
      ? [ref.id, ref.type, ref.state, ref.status ?? '-', ref.path]
      : [ref.id, ref.type, ref.state, ref.path],
  );

  const types =
    filters.type !== undefined
      ? [filters.type.toUpperCase()]
      : [...new Set(result.items.map((ref) => ref.type))];
  const parts: string[] = [];
  if (types.length > 0) parts.push(`tipo ${types.join(', ')}`);
  if (filters.parent !== undefined) parts.push(`padre ${filters.parent}`);
  if (filters.capability !== undefined) parts.push(`capability ${filters.capability}`);
  parts.push(`estado ${filters.state}`);
  if (filters.offset !== undefined) parts.push(`offset ${filters.offset}`);
  if (filters.limit !== undefined) parts.push(`limit ${filters.limit}`);

  return `${renderTable(headers, rows)}\n\n${result.returned} de ${result.total} artefactos (${parts.join(' · ')})`;
}

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('Lista artefactos de un tipo o de todos; --state active es el índice de activos')
    .argument('[type]', 'tipo de artefacto; sin él se listan todos, en el orden del catálogo')
    .option('--parent <id|path>', 'restringe al subárbol de ese artefacto')
    .option('--capability <name>', 'restringe MD, API, FL y DG a una capability')
    .option('--state <state>', 'active, archived o all', 'all')
    .option('--with-status', 'añade el estado leído de la marca oculta del documento')
    .option('--limit <n>', 'ventana: máximo de artefactos a devolver')
    .option('--offset <n>', 'ventana: artefactos a saltar')
    .action(async (type: string | undefined, opts: Record<string, unknown>, command: Command) => {
      const globals = readGlobalOptions(command);
      const { locate } = await openRepository(globals);
      const filters: ListFilters = {
        type,
        parent: optionText(opts['parent']),
        capability: optionText(opts['capability']),
        state: optionText(opts['state']) ?? 'all',
        withStatus: opts['withStatus'] === true,
        limit: parseCount(optionText(opts['limit'])),
        offset: parseCount(optionText(opts['offset'])),
      };

      const query: ListQuery = { state: filters.state, withStatus: filters.withStatus };
      if (filters.type !== undefined) query.type = filters.type;
      if (filters.parent !== undefined) query.parent = filters.parent;
      if (filters.capability !== undefined) query.capability = filters.capability;
      if (filters.limit !== undefined) query.limit = filters.limit;
      if (filters.offset !== undefined) query.offset = filters.offset;

      const result = await listArtifacts(locate, query);
      writeSuccess('list', result, resolveOutputFormat(globals.output), (data) =>
        renderList(data, filters),
      );
    });
}
