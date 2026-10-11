import { ERROR_CODES, ValidationError } from '../../errors.js';
import { normalizeBasePath } from '../settings/index.js';
import { parseArtifactId } from './artifact-id.js';
import type { ArtifactType } from './catalog.js';
import type { RepositoryFileSystem } from './infra/filesystem.js';
import {
  ARCHITECTURE_ROOT,
  filterArtifacts,
  joinPosix,
  type ArtifactRef,
  type InventoryFilter,
} from './inventory.js';

export type LocateQuery = {
  /** Identificador a localizar; el prefijo determina el tipo. */
  id: string;
  state?: InventoryFilter['state'];
  /** Id o ruta del artefacto padre. */
  parent?: string;
  capability?: string;
};

export type LocateContext = {
  fs: RepositoryFileSystem;
  /** Raíz absoluta del repositorio; permite aceptar `--parent` como ruta absoluta. */
  repoRoot: string;
  artifacts: readonly ArtifactRef[];
};

function looksLikePath(value: string): boolean {
  return value.includes('/') || value.endsWith('.md');
}

/**
 * Resuelve `--parent` (id o ruta de su carpeta o documento) a un artefacto de
 * uno de los `parentTypes`. Inexistente o de otro tipo → `PARENT_NOT_FOUND`.
 */
export function resolveParent(
  context: Pick<LocateContext, 'artifacts' | 'repoRoot'>,
  value: string,
  parentTypes: readonly ArtifactType[],
): ArtifactRef {
  const candidates = context.artifacts.filter((ref) => parentTypes.includes(ref.type));
  let matches: ArtifactRef[];
  let label: string;

  if (looksLikePath(value)) {
    const wanted = normalizeBasePath(context.repoRoot, value);
    matches = candidates.filter((ref) => ref.path === wanted || ref.documentPath === wanted);
    label = wanted;
  } else {
    const parsed = parseArtifactId(value);
    matches = candidates.filter((ref) => ref.id === parsed.id);
    label = parsed.id;
  }

  const [first, second] = matches;
  if (first === undefined) {
    throw new ValidationError(
      `El padre ${label} no existe o no es de un tipo admitido (${parentTypes.join(', ')}).`,
      {
        code: ERROR_CODES.PARENT_NOT_FOUND,
        details: { parent: value, parentTypes: [...parentTypes] },
      },
    );
  }
  if (second !== undefined) {
    throw new ValidationError(
      `El padre ${label} es ambiguo (${matches.length} coincidencias); indica la ruta de su carpeta.`,
      {
        code: ERROR_CODES.INVALID_FLAG_VALUE,
        details: { parent: value, matches: matches.length },
      },
    );
  }
  return first;
}

/** Comprueba que `docs/architecture/<name>` exista; si no, `CAPABILITY_NOT_FOUND`. */
export async function resolveCapability(
  fs: RepositoryFileSystem,
  name: string,
): Promise<string> {
  const folder = joinPosix(ARCHITECTURE_ROOT, name);
  const valid = name !== '' && !name.includes('/') && !name.startsWith('.');
  if (!valid || (await fs.readDirectory(folder)) === null) {
    throw new ValidationError(`La capability ${name} no existe en ${ARCHITECTURE_ROOT}/.`, {
      code: ERROR_CODES.CAPABILITY_NOT_FOUND,
      details: { capability: name },
    });
  }
  return name;
}

/**
 * Todas las coincidencias de un id en activo y archivo (semántica de `find`).
 * No encontrar nada devuelve `[]`: es una respuesta válida, no un error.
 */
export async function locateById(
  context: LocateContext,
  query: LocateQuery,
): Promise<ArtifactRef[]> {
  const parsed = parseArtifactId(query.id);
  const filter: InventoryFilter = { types: [parsed.type] };
  if (query.state !== undefined) filter.state = query.state;
  if (query.parent !== undefined) {
    // Cualquier tipo de padre: la restricción es la carpeta del artefacto indicado.
    const parent = resolveParent(context, query.parent, [
      'SRS',
      'RQ',
      'US',
      'TK',
      'WI',
      'FT',
      'TC',
      'RS',
      'WF',
    ]);
    filter.parentPath = parent.path;
  }
  if (query.capability !== undefined) {
    filter.capability = await resolveCapability(context.fs, query.capability);
  }
  return filterArtifacts(context.artifacts, filter).filter((ref) => ref.id === parsed.id);
}
