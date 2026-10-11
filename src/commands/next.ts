import type { Command } from 'commander';
import { readGlobalOptions } from '../cli-options.js';
import { openRepository } from '../command-context.js';
import { nextId, type NextIdQuery, type NextIdResult } from '../features/artifact-catalog/index.js';
import { renderKeyValue, resolveOutputFormat, writeSuccess } from '../output.js';

function optionText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Identificador solo en la primera línea; el contexto, debajo. */
export function renderNext(result: NextIdResult): string {
  const context = [`tipo: ${result.type}`, `alcance: ${result.scope}`];
  if (result.parent !== null) context.push(`padre: ${result.parent.id}`);
  if (result.capability !== null) context.push(`capability: ${result.capability}`);
  context.push(`máximo ocupado: ${result.highestUsed ?? 'ninguno'}`);

  const header = context.join(' · ');
  const details = renderKeyValue([
    ['rutas consultadas', result.scannedPaths.join(', ')],
    ...(result.ignored.length > 0
      ? ([['entradas no conformes', result.ignored.join(', ')]] as [string, string][])
      : []),
  ]);
  return `${result.nextId}\n${header}\n${details}`;
}

export function registerNextCommand(program: Command): void {
  program
    .command('next')
    .description('Siguiente identificador libre de un tipo, considerando activos y archivados')
    .argument('<type>', 'tipo de artefacto (SRS, RQ, US, TK, WI, FT, TC, RS, WF, ADR, MD, API, FL, DG)')
    .option('--parent <id|path>', 'artefacto padre (obligatorio en TK, TC y WF; opcional en RS)')
    .option('--capability <name>', 'capability de docs/architecture/ (obligatoria en MD, API, FL y DG)')
    .action(async (type: string, opts: Record<string, unknown>, command: Command) => {
      const globals = readGlobalOptions(command);
      const { locate, base } = await openRepository(globals);
      const query: NextIdQuery = { type };
      const parent = optionText(opts['parent']);
      const capability = optionText(opts['capability']);
      if (parent !== undefined) query.parent = parent;
      if (capability !== undefined) query.capability = capability;

      const result = await nextId(locate, base, query);
      writeSuccess('next', result, resolveOutputFormat(globals.output), renderNext);
    });
}
