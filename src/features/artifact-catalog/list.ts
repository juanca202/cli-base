import { ERROR_CODES, ValidationError } from '../../errors.js';
import { normalizeArtifactType } from './artifact-id.js';
import { ARTIFACT_TYPES, type ArtifactType } from './catalog.js';
import {
  filterArtifacts,
  type ArtifactRef,
  type InventoryFilter,
} from './inventory.js';
import { parseStateFilter, resolveCapability, resolveParent, type LocateContext } from './locate.js';
import { attachStatus } from './status-marker.js';

export type ListQuery = {
  /** Tipo tal como llegó; sin él se listan todos, en el orden del catálogo. */
  type?: string;
  /** Id o ruta del artefacto cuyo subárbol se lista. */
  parent?: string;
  capability?: string;
  /** Sensible a mayúsculas; por defecto `all`. */
  state?: string;
  withStatus?: boolean;
  limit?: number;
  offset?: number;
};

export type ListResult = {
  items: ArtifactRef[];
  total: number;
  returned: number;
  offset: number;
  limit: number | null;
};

function invalidValue(flag: string, value: unknown): ValidationError {
  return new ValidationError(`${flag} no es válido: ${String(value)}.`, {
    code: ERROR_CODES.INVALID_FLAG_VALUE,
    details: { flag, value: String(value) },
  });
}

function checkNonNegativeInteger(flag: string, value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value < 0) throw invalidValue(flag, value);
  return value;
}

/**
 * Listado filtrable del inventario (API-007 `list`). El orden es el del
 * inventario (catálogo, secuencial, ruta) y la ventana se aplica después.
 * `--state active` es el índice de activos: nunca incluye nada archivado.
 */
export async function listArtifacts(
  context: LocateContext,
  query: ListQuery = {},
): Promise<ListResult> {
  const state = parseStateFilter(query.state);
  const limit = checkNonNegativeInteger('--limit', query.limit);
  const offset = checkNonNegativeInteger('--offset', query.offset) ?? 0;

  const filter: InventoryFilter = { state };
  if (query.type !== undefined) filter.types = [normalizeArtifactType(query.type)];
  if (query.parent !== undefined) {
    const anyType: readonly ArtifactType[] = ARTIFACT_TYPES;
    filter.parentPath = resolveParent(context, query.parent, anyType).path;
  }
  if (query.capability !== undefined) {
    filter.capability = await resolveCapability(context.fs, query.capability);
  }

  const matched = filterArtifacts(context.artifacts, filter);
  const window = matched.slice(offset, limit === undefined ? undefined : offset + limit);
  const items = query.withStatus === true ? await attachStatus(context.fs, window) : window;

  return {
    items,
    total: matched.length,
    returned: items.length,
    offset,
    limit: limit ?? null,
  };
}
