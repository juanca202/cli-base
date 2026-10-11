import type { Command } from 'commander';
import { readGlobalOptions } from '../cli-options.js';
import { openRepository } from '../command-context.js';
import {
  locateById,
  type LocateQuery,
} from '../features/artifact-catalog/index.js';
import { resolveOutputFormat, writeSuccess } from '../output.js';

function optionText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
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
      writeSuccess('find', { matches, total: matches.length }, resolveOutputFormat(globals.output));
    });
}
