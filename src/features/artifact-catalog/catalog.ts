/**
 * Catálogo cerrado de tipos de artefacto y de elemento de arquitectura
 * (MD-003). Constante versionada del CLI: es la fuente de verdad de rutas,
 * patrones de nombre, padres admitidos y conjuntos de estados; el plugin se
 * alinea con ella. Cambiar un conjunto de estados es un cambio de contrato.
 */

/** Orden del catálogo: es el orden de toda colección que emite el CLI. */
export const ARTIFACT_TYPES = [
  'SRS',
  'RQ',
  'US',
  'TK',
  'WI',
  'FT',
  'TC',
  'RS',
  'WF',
  'ADR',
  'MD',
  'API',
  'FL',
  'DG',
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export type ArtifactScope = 'GLOBAL' | 'PARENT' | 'ARCHITECTURE_ROOT' | 'CAPABILITY';

export type ArtifactKind = 'directory' | 'file';

export type ArtifactTypeDescriptor = {
  type: ArtifactType;
  scope: ArtifactScope;
  kind: ArtifactKind;
  /**
   * Plantilla de la ruta activa, con `<changes>`, `<current>`, `<archived>`,
   * `<parent>`, `<arch-root>` y `<capability>` (`docs/architecture/<name>`).
   */
  activePathTemplate: string;
  /** Ruta activa cuando el tipo admite padre opcional y no se indicó (`RS`). */
  unparentedPathTemplate?: string;
  /** `null` si el tipo no se archiva o hereda el archivado de su padre. */
  archivePathTemplate: string | null;
  /** Patrón del nombre de carpeta o archivo, sin anclar; secuencial de mínimo 3 dígitos (`\\d{3}` se lee `\\d{3,}`). */
  namePattern: string;
  parentTypes: readonly ArtifactType[];
  requiresParent: boolean;
  requiresCapability: boolean;
  /** Conjunto cerrado de valores del `status` del frontmatter; `null` en `MD`, `API`, `FL` y `DG` (sin estado). */
  statusValues: readonly string[] | null;
};

const DRAFT_READY = ['Draft', 'Ready'] as const;

export const ARTIFACT_CATALOG: readonly ArtifactTypeDescriptor[] = [
  {
    type: 'SRS',
    scope: 'GLOBAL',
    kind: 'directory',
    activePathTemplate: '<changes>/requirements/',
    archivePathTemplate: '<archived>/requirements/',
    namePattern: 'SRS-\\d{3}-[a-z0-9-]+',
    parentTypes: [],
    requiresParent: false,
    requiresCapability: false,
    statusValues: DRAFT_READY,
  },
  {
    type: 'RQ',
    scope: 'GLOBAL',
    kind: 'directory',
    activePathTemplate: '<changes>/requirements/',
    archivePathTemplate: '<archived>/requirements/',
    namePattern: 'RQ-\\d{3}-[a-z0-9-]+',
    parentTypes: [],
    requiresParent: false,
    requiresCapability: false,
    statusValues: DRAFT_READY,
  },
  {
    type: 'US',
    scope: 'GLOBAL',
    kind: 'directory',
    activePathTemplate: '<changes>/user-stories/',
    archivePathTemplate: '<archived>/user-stories/',
    namePattern: 'US-\\d{3}-[a-z0-9-]+',
    parentTypes: [],
    requiresParent: false,
    requiresCapability: false,
    statusValues: DRAFT_READY,
  },
  {
    type: 'TK',
    scope: 'PARENT',
    kind: 'file',
    activePathTemplate: '<parent>/',
    archivePathTemplate: null,
    namePattern: 'TK-\\d{3}-[a-z0-9-]+\\.md',
    parentTypes: ['US'],
    requiresParent: true,
    requiresCapability: false,
    statusValues: DRAFT_READY,
  },
  {
    type: 'WI',
    scope: 'GLOBAL',
    kind: 'directory',
    activePathTemplate: '<changes>/work-items/',
    archivePathTemplate: '<archived>/work-items/',
    namePattern: 'WI-\\d{3}-[a-z0-9-]+',
    parentTypes: [],
    requiresParent: false,
    requiresCapability: false,
    statusValues: DRAFT_READY,
  },
  {
    type: 'FT',
    scope: 'GLOBAL',
    kind: 'directory',
    activePathTemplate: '<current>/',
    archivePathTemplate: null,
    namePattern: 'FT-\\d{3}-[a-z0-9-]+',
    parentTypes: [],
    requiresParent: false,
    requiresCapability: false,
    statusValues: DRAFT_READY,
  },
  {
    type: 'TC',
    scope: 'PARENT',
    kind: 'file',
    activePathTemplate: '<parent>/test-cases/',
    archivePathTemplate: null,
    namePattern: 'TC-\\d{3}-[a-z0-9-]+\\.md',
    parentTypes: ['US', 'WI', 'FT', 'RQ'],
    requiresParent: true,
    requiresCapability: false,
    statusValues: ['Draft', 'Ready', 'Obsolete'],
  },
  {
    type: 'RS',
    scope: 'PARENT',
    kind: 'directory',
    activePathTemplate: '<parent>/research/',
    unparentedPathTemplate: '<changes>/research/',
    archivePathTemplate: '<archived>/research/',
    namePattern: 'RS-\\d{3}-[a-z0-9-]+',
    parentTypes: ['SRS', 'RQ', 'US', 'WI', 'FT'],
    requiresParent: false,
    requiresCapability: false,
    statusValues: DRAFT_READY,
  },
  {
    type: 'WF',
    scope: 'PARENT',
    kind: 'file',
    activePathTemplate: '<parent>/wireframes/',
    archivePathTemplate: null,
    namePattern: 'WF-\\d{3}-[a-z0-9-]+\\.md',
    parentTypes: ['SRS', 'US', 'WI'],
    requiresParent: true,
    requiresCapability: false,
    statusValues: ['Proposed', 'Approved'],
  },
  {
    type: 'ADR',
    scope: 'ARCHITECTURE_ROOT',
    kind: 'file',
    activePathTemplate: '<arch-root>/docs/adr/',
    archivePathTemplate: null,
    namePattern: 'ADR-\\d{3}-[a-z0-9-]+\\.md',
    parentTypes: [],
    requiresParent: false,
    requiresCapability: false,
    statusValues: ['Draft', 'Proposed', 'Accepted', 'Deprecated', 'Superseded'],
  },
  ...(
    [
      ['MD', 'models'],
      ['API', 'apis'],
      ['FL', 'flows'],
      ['DG', 'diagrams'],
    ] as const
  ).map(
    ([type, folder]): ArtifactTypeDescriptor => ({
      type,
      scope: 'CAPABILITY',
      kind: 'file',
      activePathTemplate: `<capability>/${folder}/`,
      archivePathTemplate: null,
      namePattern: `${type}-\\d{3}-[a-z0-9-]+\\.md`,
      parentTypes: [],
      requiresParent: false,
      requiresCapability: true,
      statusValues: null,
    }),
  ),
];

const BY_TYPE: ReadonlyMap<ArtifactType, ArtifactTypeDescriptor> = new Map(
  ARTIFACT_CATALOG.map((descriptor) => [descriptor.type, descriptor]),
);

export function getDescriptor(type: ArtifactType): ArtifactTypeDescriptor {
  const descriptor = BY_TYPE.get(type);
  if (descriptor === undefined) {
    throw new Error(`Tipo fuera del catálogo: ${type}`);
  }
  return descriptor;
}

/** Posición del tipo en el catálogo; ordena toda colección. */
export function catalogOrder(type: ArtifactType): number {
  return ARTIFACT_TYPES.indexOf(type);
}

/** Expresión anclada del patrón de nombre; el grupo 1 captura el secuencial. */
export function nameRegExp(descriptor: ArtifactTypeDescriptor): RegExp {
  return new RegExp(`^${descriptor.namePattern.replace('\\d{3}', '(\\d{3,})')}$`);
}
