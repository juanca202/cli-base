import type { Command } from 'commander';
import { readGlobalOptions } from '../cli-options.js';
import { openRepository } from '../command-context.js';
import {
  locateById,
  parseArtifactId,
  type ArtifactRef,
  type LocateQuery,
} from '../features/artifact-catalog/index.js';
import { renderTable, resolveOutputFormat, writeSuccess } from '../output.js';

type FindResult = { matches: ArtifactRef[]; total: number };

function optionText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function renderFind(result: FindResult, id: string, state: string): string {
  if (result.matches.length === 0) {
    return `sin coincidencias para ${id} (estado: ${state})`;
  }
  return renderTable(
    ['ID', 'TIPO', 'ESTADO', 'RUTA'],
    result.matches.map((ref) => [ref.id, ref.type, ref.state, ref.path]),
  );
}

export function registerFindCommand(program: Command): void {
  program
    .command('find')
    .description('Localiza un artefacto por su identificador, en activo y en archivo')
    .argument('<id>', 'identificador a localizar (<PREFIJO>-<3 dígitos>)')
    .option('--parent <id|path>', 'restringe la búsqueda a la carpeta de ese artefacto padre')
    .option('--capability <name>', 'restringe MD, API, FL y DG a una capability')
    .option('--state <state>', 'active, archived o all', 'all')
    .action(async (id: string, opts: Record<string, unknown>, command: Command) => {
      const globals = readGlobalOptions(command);
      const { locate } = await openRepository(globals);
      const state = optionText(opts['state']) ?? 'all';
      const query: LocateQuery = { id, state };
      const parent = optionText(opts['parent']);
      const capability = optionText(opts['capability']);
      if (parent !== undefined) query.parent = parent;
      if (capability !== undefined) query.capability = capability;

      const matches = await locateById(locate, query);
      const canonicalId = parseArtifactId(id).id;
      writeSuccess(
        'find',
        { matches, total: matches.length },
        resolveOutputFormat(globals.output),
        (result) => renderFind(result, canonicalId, state),
      );
    });
}
