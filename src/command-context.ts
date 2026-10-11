import {
  buildInventory,
  createFileSystem,
  type BasePaths,
  type LocateContext,
} from './features/artifact-catalog/index.js';
import {
  resolveSettings,
  type ProjectManagementSettings,
  type TestCasesPolicy,
} from './features/settings/index.js';
import type { GlobalOptions } from './cli-options.js';

export type RepositoryContext = {
  /** Lectura del inventario ya construido, lista para `locateById`, `nextId`, `listArtifacts`. */
  locate: LocateContext;
  base: BasePaths;
  /** Integración con el gestor de proyectos declarada en `settings.json`. */
  projectManagement: ProjectManagementSettings;
  /** Contexto de ejecución que `next` devuelve junto al identificador. */
  environment: { branch: string | null; language: string | null; testCases: TestCasesPolicy };
};

/**
 * Resuelve el repositorio y sus rutas base (flags > settings.json > defaults) y
 * construye el inventario una sola vez. Es el punto de entrada común de los
 * comandos de consulta; vive fuera de `src/commands/` porque ahí cada archivo
 * es un comando.
 */
export async function openRepository(options: GlobalOptions): Promise<RepositoryContext> {
  const settings = await resolveSettings({
    repo: options.repo,
    changes: options.changes,
    current: options.current,
    archived: options.archived,
    archRoot: options.archRoot,
  });
  const fs = createFileSystem(settings.repoRoot);
  const base: BasePaths = {
    changesPath: settings.changesPath,
    currentPath: settings.currentPath,
    archivedPath: settings.archivedPath,
    archRoot: settings.archRoot,
  };
  const { artifacts } = await buildInventory(fs, base);
  return {
    locate: { fs, repoRoot: settings.repoRoot, artifacts },
    base,
    projectManagement: settings.projectManagement,
    environment: {
      branch: settings.branch,
      language: settings.language,
      testCases: settings.testCases,
    },
  };
}

/**
 * Entero ≥ 0 de un flag numérico (`--limit`, `--offset`): cualquier otra cosa
 * se deja pasar como `NaN` para que la capacidad la rechace con
 * `INVALID_FLAG_VALUE` y un único mensaje.
 */
export function parseCount(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  return /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : Number.NaN;
}
