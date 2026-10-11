import type { Command } from 'commander';
import { readGlobalOptions } from '../cli-options.js';
import { openRepository, parseCount } from '../command-context.js';
import { nextId, type NextIdQuery, type NextIdResult } from '../features/artifact-catalog/index.js';
import { resolveOutputFormat, writeSuccess } from '../output.js';

function optionText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function renderProjectManagement(state: NextIdResult['projectManagement']): string {
  if (!state.enabled) return 'deshabilitado';
  return `${state.provider} (${state.workspace}/${state.project})`;
}

/** Identificador solo en la primera línea; ruta destino, hermanos y gestor, debajo. */
export function renderNext(result: NextIdResult): string {
  const lines = [
    result.next ?? 'id: lo asigna el gestor de proyectos',
    `ruta destino: ${result.targetPath}`,
    result.truncated
      ? `hermanos: ${result.total} (se muestran ${result.siblings.length}, de mayor a menor)`
      : `hermanos: ${result.total}`,
    ...result.siblings.map((sibling) => `  ${sibling}`),
    `gestor de proyectos: ${renderProjectManagement(result.projectManagement)}`,
  ];
  return lines.join('\n');
}

export function registerNextCommand(program: Command): void {
  program
    .command('next')
    .description('Siguiente identificador libre de un tipo, considerando activos y archivados')
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
      writeSuccess('next', result, resolveOutputFormat(globals.output), renderNext);
    });
}
