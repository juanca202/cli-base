import type { Command } from 'commander';
import { readGlobalOptions } from '../cli-options.js';
import { openRepository, parseCount } from '../command-context.js';
import { nextId, type NextIdQuery } from '../features/artifact-catalog/index.js';
import { effectiveFormat, writePayload } from '../output.js';

function optionText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function registerNextCommand(program: Command): void {
  program
    .command('next')
    .description('Siguiente identificador libre de un tipo, considerando activos y archivados (salida toon por defecto, o json con --output json)')
    .argument('<type>', 'tipo de artefacto (SRS, RQ, US, TK, WI, FT, TC, RS, WF, ADR, MD, API, FL, DG)')
    .option('--parent <id|path>', 'artefacto padre (obligatorio en TK, TC y WF; opcional en RS)')
    .option('--capability <name>', 'capability de docs/architecture/ (obligatoria en MD, API, FL y DG)')
    .option('--limit <n>', 'máximo de hermanos a mostrar (por defecto 50)')
    .action(async (type: string, opts: Record<string, unknown>, command: Command) => {
      const globals = readGlobalOptions(command);
      const { locate, base, projectManagement } = await openRepository(globals);
      const query: NextIdQuery = { type, projectManagement };
      const limit = parseCount(optionText(opts['limit']));
      if (limit !== undefined) query.limit = limit;
      const parent = optionText(opts['parent']);
      const capability = optionText(opts['capability']);
      if (parent !== undefined) query.parent = parent;
      if (capability !== undefined) query.capability = capability;

      const result = await nextId(locate, base, query);
      writePayload(result, effectiveFormat('next', globals.output));
    });
}
