import { ERROR_CODES, ValidationError } from '../../errors.js';
import { formatArtifactId, normalizeArtifactType } from './artifact-id.js';
import {
  ARTIFACT_CATALOG,
  getDescriptor,
  type ArtifactType,
  type ArtifactTypeDescriptor,
} from './catalog.js';
import {
  foldersFor,
  joinPosix,
  sweepFolder,
  type ArtifactRef,
  type BasePaths,
} from './inventory.js';
import { resolveCapability, resolveParent, type LocateContext } from './locate.js';

/** Estado del gestor de proyectos tal como lo declara `settings.json` (sin credenciales). */
export type NextProjectManagement =
  | { enabled: false }
  | { enabled: true; provider: string; host: string; workspace: string; project: string };

export type NextIdQuery = {
  /** Tipo tal como llegó; se normaliza a mayúsculas. */
  type: string;
  /** Id o ruta del artefacto padre (alcance `PARENT`). */
  parent?: string;
  /** Capability de `docs/architecture/` (alcance `CAPABILITY`). */
  capability?: string;
  /** Máximo de rutas en `siblings`; por defecto {@link DEFAULT_SIBLINGS_LIMIT}. */
  limit?: number;
  /** Integración con el gestor de proyectos; por defecto deshabilitada. */
  projectManagement?: NextProjectManagement;
};

/** Máximo de hermanos devueltos cuando no se indica `--limit`. */
export const DEFAULT_SIBLINGS_LIMIT = 50;

/**
 * Tipos cuyo identificador asigna el gestor de proyectos cuando la integración
 * está habilitada: `next` no los calcula.
 */
const PROJECT_MANAGED_TYPES: readonly ArtifactType[] = ['US', 'WI', 'TC'];

/** Siguiente identificador libre, sus hermanos y la ruta destino (MD-005). */
export type NextIdResult = {
  /** `null` cuando el gestor de proyectos asigna el identificador (`US`, `WI`, `TC`). */
  next: string | null;
  siblings: string[];
  total: number;
  truncated: boolean;
  targetPath: string;
  projectManagement: NextProjectManagement;
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
  const limit = query.limit ?? DEFAULT_SIBLINGS_LIMIT;
  if (!Number.isInteger(limit) || limit < 0) {
    throw new ValidationError(`--limit debe ser un entero ≥ 0 (recibido: ${String(query.limit)}).`, {
      code: ERROR_CODES.INVALID_FLAG_VALUE,
      details: { flag: '--limit' },
    });
  }

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
    if (parent.state === 'ARCHIVED') {
      throw new ValidationError(
        `El padre ${parent.id} está archivado: no se crea nada sobre un artefacto archivado; desarchívalo primero.`,
        {
          code: ERROR_CODES.ARTIFACT_ARCHIVED,
          details: { type: descriptor.type, parent: parent.id },
        },
      );
    }
  }
  let capability: string | null = null;
  if (usesCapability && query.capability !== undefined) {
    capability = await resolveCapability(context.fs, query.capability);
  }

  const folderOptions: { parent: ArtifactRef | null; capability?: string } = { parent };
  if (capability !== null) folderOptions.capability = capability;
  const folders = foldersFor(descriptor, base, folderOptions);
  const mates = folderMates(descriptor);

  const siblings: { path: string; sequence: number }[] = [];
  for (const folder of folders) {
    const swept = await sweepFolder(context.fs, folder, mates, parent);
    for (const artifact of swept.artifacts) {
      if (artifact.type !== type) continue;
      siblings.push({ path: artifact.path, sequence: Number(artifact.id.slice(type.length + 1)) });
    }
  }
  siblings.sort((a, b) => b.sequence - a.sequence || compareBytes(a.path, b.path));

  const projectManagement: NextProjectManagement = query.projectManagement ?? { enabled: false };
  const assignedByManager = projectManagement.enabled && PROJECT_MANAGED_TYPES.includes(type);
  const highest = siblings[0]?.sequence ?? 0;
  const next = assignedByManager ? null : formatArtifactId(type, highest + 1);

  const activeFolder = folders[0]?.path ?? '';
  const fileName = `${next ?? '<id>'}-<slug>${descriptor.kind === 'file' ? '.md' : ''}`;

  return {
    next,
    siblings: siblings.slice(0, limit).map((sibling) => sibling.path),
    total: siblings.length,
    truncated: siblings.length > limit,
    targetPath: joinPosix(activeFolder, fileName),
    projectManagement,
  };
}
