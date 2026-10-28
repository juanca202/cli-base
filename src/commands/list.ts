import type { Command } from 'commander';
import { readGlobalOptions } from '../cli-options.js';
import { openRepository, parseCount } from '../command-context.js';
import { listArtifacts, type ListQuery } from '../features/artifact-catalog/index.js';
import { resolveOutputFormat, writeSuccess } from '../output.js';

function optionText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('Lista artefactos de un tipo o de todos; --state active es el índice de activos')
    .argument('[type]', 'tipo de artefacto; sin él se listan todos, en el orden del catálogo')
    .option('--parent <id|path>', 'restringe al subárbol de ese artefacto')
    .option('--capability <name>', 'restringe MD, API, FL y DG a una capability')
    .option('--state <state>', 'active, archived o all', 'all')
    .option('--with-status', 'añade el estado leído del status del frontmatter del documento')
    .option('--limit <n>', 'ventana: máximo de artefactos a devolver')
    .option('--offset <n>', 'ventana: artefactos a saltar')
    .action(async (type: string | undefined, opts: Record<string, unknown>, command: Command) => {
      const globals = readGlobalOptions(command);
      const { locate } = await openRepository(globals);
      const query: ListQuery = {
        state: optionText(opts['state']) ?? 'all',
        withStatus: opts['withStatus'] === true,
      };
      const parent = optionText(opts['parent']);
      const capability = optionText(opts['capability']);
      const limit = parseCount(optionText(opts['limit']));
      const offset = parseCount(optionText(opts['offset']));
      if (type !== undefined) query.type = type;
      if (parent !== undefined) query.parent = parent;
      if (capability !== undefined) query.capability = capability;
      if (limit !== undefined) query.limit = limit;
      if (offset !== undefined) query.offset = offset;

      const result = await listArtifacts(locate, query);
      writeSuccess('list', result, resolveOutputFormat(globals.output));
    });
}
