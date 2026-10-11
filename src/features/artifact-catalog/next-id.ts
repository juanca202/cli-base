import { ERROR_CODES, ValidationError } from '../../errors.js';
import { formatArtifactId, normalizeArtifactType } from './artifact-id.js';
import {
  ARTIFACT_CATALOG,
  getDescriptor,
  type ArtifactScope,
  type ArtifactType,
  type ArtifactTypeDescriptor,
} from './catalog.js';
import {
  foldersFor,
  sweepFolder,
  type ArtifactParentRef,
  type ArtifactRef,
  type BasePaths,
} from './inventory.js';
import { resolveCapability, resolveParent, type LocateContext } from './locate.js';

export type NextIdQuery = {
  /** Tipo tal como llegó; se normaliza a mayúsculas. */
  type: string;
  /** Id o ruta del artefacto padre (alcance `PARENT`). */
  parent?: string;
  /** Capability de `docs/architecture/` (alcance `CAPABILITY`). */
  capability?: string;
};

/** Siguiente identificador libre y la evidencia del cálculo (MD-005). */
export type NextIdResult = {
  type: ArtifactType;
  nextId: string;
  sequence: number;
  highestUsed: string | null;
  scope: ArtifactScope;
  parent: ArtifactParentRef | null;
  capability: string | null;
  scannedPaths: string[];
  usedIds: string[];
  ignored: string[];
};

function compareBytes(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a), Buffer.from(b));
}

function missing(
  descriptor: ArtifactTypeDescriptor,
  flag: '--parent' | '--capability',
): ValidationError {
  const isParent = flag === '--parent';
  return new ValidationError(
    `${descriptor.type} se numera por ${isParent ? 'padre' : 'capability'}: indica ${flag}.`,
    {
      code: isParent ? ERROR_CODES.MISSING_PARENT : ERROR_CODES.MISSING_CAPABILITY,
      details: { type: descriptor.type, scope: descriptor.scope },
    },
  );
}

function notApplicable(descriptor: ArtifactTypeDescriptor, flag: string): ValidationError {
  return new ValidationError(
    `${flag} no aplica a ${descriptor.type}: su alcance de numeración es ${descriptor.scope}.`,
    {
      code: ERROR_CODES.INVALID_FLAG_COMBINATION,
      details: { type: descriptor.type, scope: descriptor.scope, flag },
    },
  );
}

/** Tipos que comparten carpeta con `descriptor` (`SRS` y `RQ` en `requirements/`). */
function folderMates(descriptor: ArtifactTypeDescriptor): ArtifactTypeDescriptor[] {
  return ARTIFACT_CATALOG.filter(
    (candidate) =>
      candidate.scope === descriptor.scope &&
      candidate.kind === descriptor.kind &&
      candidate.activePathTemplate === descriptor.activePathTemplate,
  );
}

/**
 * Siguiente identificador libre de un tipo en su alcance de numeración
 * (FL-001): unión de la ruta activa y la de archivo, máximo + 1, sin rellenar
 * huecos. Solo lee; no crea ninguna carpeta.
 */
export async function nextId(
  context: LocateContext,
  base: BasePaths,
  query: NextIdQuery,
): Promise<NextIdResult> {
  const type = normalizeArtifactType(query.type);
  const descriptor = getDescriptor(type);
  const usesParent = descriptor.scope === 'PARENT';
  const usesCapability = descriptor.scope === 'CAPABILITY';

  if (query.parent !== undefined && !usesParent) throw notApplicable(descriptor, '--parent');
  if (query.capability !== undefined && !usesCapability) {
    throw notApplicable(descriptor, '--capability');
  }
  if (usesParent && descriptor.requiresParent && query.parent === undefined) {
    throw missing(descriptor, '--parent');
  }
  if (usesCapability && query.capability === undefined) {
    throw missing(descriptor, '--capability');
  }

  let parent: ArtifactRef | null = null;
  if (usesParent && query.parent !== undefined) {
    parent = resolveParent(context, query.parent, descriptor.parentTypes);
  }
  let capability: string | null = null;
  if (usesCapability && query.capability !== undefined) {
    capability = await resolveCapability(context.fs, query.capability);
  }

  const folderOptions: { parent: ArtifactRef | null; capability?: string } = { parent };
  if (capability !== null) folderOptions.capability = capability;
  const folders = foldersFor(descriptor, base, folderOptions);
  const mates = folderMates(descriptor);

  const used = new Map<string, number>();
  const ignored = new Set<string>();
  for (const folder of folders) {
    const swept = await sweepFolder(context.fs, folder, mates, parent);
    for (const artifact of swept.artifacts) {
      if (artifact.type !== type) continue;
      used.set(artifact.id, Number(artifact.id.slice(type.length + 1)));
    }
    for (const entry of swept.ignored) ignored.add(entry.path);
  }

  const usedIds = [...used.entries()].sort((a, b) => a[1] - b[1] || compareBytes(a[0], b[0]));
  const highest = usedIds[usedIds.length - 1];
  const sequence = (highest?.[1] ?? 0) + 1;

  return {
    type,
    nextId: formatArtifactId(type, sequence),
    sequence,
    highestUsed: highest?.[0] ?? null,
    scope: descriptor.scope,
    parent: parent === null ? null : { id: parent.id, type: parent.type, path: parent.path },
    capability,
    scannedPaths: folders.map((folder) => folder.path),
    usedIds: usedIds.map(([id]) => id),
    ignored: [...ignored].sort(compareBytes),
  };
}
