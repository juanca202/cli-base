import {
  ARTIFACT_CATALOG,
  catalogOrder,
  getDescriptor,
  nameRegExp,
  type ArtifactKind,
  type ArtifactType,
  type ArtifactTypeDescriptor,
} from './catalog.js';
import type { DirectoryEntry, RepositoryFileSystem } from './infra/filesystem.js';

export type ArtifactState = 'ACTIVE' | 'ARCHIVED';

export type ArtifactParentRef = {
  id: string;
  type: ArtifactType;
  path: string;
};

/** Artefacto localizado (MD-004). `status` lo añade `attachStatus` bajo demanda. */
export type ArtifactRef = {
  id: string;
  type: ArtifactType;
  slug: string;
  kind: ArtifactKind;
  state: ArtifactState;
  path: string;
  documentPath: string;
  parent: ArtifactParentRef | null;
  status?: string | null;
};

/** Entrada que no cumple el `namePattern` de ningún tipo de su carpeta. */
export type IgnoredEntry = {
  path: string;
  /** Carpeta barrida en la que apareció. */
  folder: string;
  /** Tipos con los que se evaluó (en el orden del catálogo). */
  types: ArtifactType[];
};

/** Rutas base relativas al repositorio (`ResolvedSettings` sin `repoRoot`). */
export type BasePaths = {
  changesPath: string;
  currentPath: string;
  archivedPath: string;
  archRoot: string;
};

export type Inventory = {
  /** Orden del catálogo, secuencial ascendente y ruta por bytes. */
  artifacts: ArtifactRef[];
  ignored: IgnoredEntry[];
};

export type FolderSpec = {
  path: string;
  state: ArtifactState;
};

/** Carpeta de elementos de arquitectura: `docs/architecture/<capability>`. */
export const ARCHITECTURE_ROOT = 'docs/architecture';

export function joinPosix(...segments: string[]): string {
  const parts: string[] = [];
  for (const segment of segments) {
    for (const part of segment.split('/')) {
      if (part === '' || part === '.') continue;
      if (part === '..') {
        parts.pop();
      } else {
        parts.push(part);
      }
    }
  }
  return parts.join('/');
}

function compareBytes(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a), Buffer.from(b));
}

function substitute(template: string, base: BasePaths, parentPath?: string, capability?: string): string {
  const replaced = template
    .replace('<changes>', base.changesPath)
    .replace('<current>', base.currentPath)
    .replace('<archived>', base.archivedPath)
    .replace('<arch-root>', base.archRoot)
    .replace('<parent>', parentPath ?? '')
    .replace('<capability>', capability === undefined ? '' : joinPosix(ARCHITECTURE_ROOT, capability));
  return joinPosix(replaced);
}

/**
 * Carpetas que se barren para un tipo. Tipos `GLOBAL`: ruta activa y, si se
 * archiva, la de archivo. Tipos `PARENT`: la carpeta del padre dado, en el
 * estado del padre (`RS` sin padre: la suelta activa y la de archivo).
 * `CAPABILITY`: la carpeta de la capability indicada.
 */
export function foldersFor(
  descriptor: ArtifactTypeDescriptor,
  base: BasePaths,
  options: { parent?: ArtifactRef | null; capability?: string } = {},
): FolderSpec[] {
  const { parent = null, capability } = options;
  if (descriptor.scope === 'PARENT') {
    if (parent !== null) {
      return [{ path: substitute(descriptor.activePathTemplate, base, parent.path), state: parent.state }];
    }
    if (descriptor.unparentedPathTemplate === undefined) return [];
    const folders: FolderSpec[] = [
      { path: substitute(descriptor.unparentedPathTemplate, base), state: 'ACTIVE' },
    ];
    if (descriptor.archivePathTemplate !== null) {
      folders.push({ path: substitute(descriptor.archivePathTemplate, base), state: 'ARCHIVED' });
    }
    return folders;
  }
  const folders: FolderSpec[] = [
    { path: substitute(descriptor.activePathTemplate, base, undefined, capability), state: 'ACTIVE' },
  ];
  if (descriptor.archivePathTemplate !== null) {
    folders.push({ path: substitute(descriptor.archivePathTemplate, base), state: 'ARCHIVED' });
  }
  return folders;
}

/** Nombres que nunca cuentan como «no conformes»: índices y archivos ocultos. */
function isExempt(name: string): boolean {
  return name.startsWith('.') || name === 'README.md';
}

function matchesKind(entry: DirectoryEntry, kind: ArtifactKind): boolean {
  return kind === 'directory' ? entry.isDirectory : entry.isFile;
}

type SweepRequest = {
  folder: FolderSpec;
  types: ArtifactTypeDescriptor[];
  parent: ArtifactRef | null;
  /**
   * `true` si la carpeta es compartida con contenido ajeno al tipo (las `TK`
   * conviven con `README.md`, `test-cases/`…): solo se reportan como no
   * conformes los nombres que empiezan con el prefijo del tipo.
   */
  shared: boolean;
};

function sweepEntries(
  request: SweepRequest,
  entries: DirectoryEntry[],
): { artifacts: ArtifactRef[]; ignored: IgnoredEntry[] } {
  const artifacts: ArtifactRef[] = [];
  const ignored: IgnoredEntry[] = [];
  const { folder, types, parent, shared } = request;
  const matchers = types.map((descriptor) => ({ descriptor, regExp: nameRegExp(descriptor) }));

  for (const entry of [...entries].sort((a, b) => compareBytes(a.name, b.name))) {
    const entryPath = joinPosix(folder.path, entry.name);
    const hit = matchers.find(
      ({ descriptor, regExp }) => matchesKind(entry, descriptor.kind) && regExp.test(entry.name),
    );
    if (hit !== undefined) {
      const { descriptor } = hit;
      const sequence = hit.regExp.exec(entry.name)?.[1] ?? '000';
      const slugSource =
        descriptor.kind === 'file' ? entry.name.replace(/\.md$/, '') : entry.name;
      artifacts.push({
        id: `${descriptor.type}-${sequence}`,
        type: descriptor.type,
        slug: slugSource.slice(`${descriptor.type}-${sequence}-`.length),
        kind: descriptor.kind,
        state: folder.state,
        path: entryPath,
        documentPath: descriptor.kind === 'directory' ? `${entryPath}/README.md` : entryPath,
        parent:
          parent === null ? null : { id: parent.id, type: parent.type, path: parent.path },
      });
      continue;
    }
    if (isExempt(entry.name)) continue;
    // En `wireframes/` solo cuentan los .md: el SVG hermano es un recurso.
    if (types.every((d) => d.type === 'WF') && !entry.name.endsWith('.md')) continue;
    if (shared && !types.some((d) => entry.name.toUpperCase().startsWith(`${d.type}-`))) continue;
    ignored.push({ path: entryPath, folder: folder.path, types: types.map((d) => d.type) });
  }
  return { artifacts, ignored };
}

/**
 * Barre una sola carpeta: clasifica sus entradas con los `namePattern` de
 * `types` (conformes → `artifacts`, no conformes → `ignored`). Una carpeta
 * inexistente aporta cero entradas. Lo usa `next` para su cálculo acotado.
 */
export async function sweepFolder(
  fs: RepositoryFileSystem,
  folder: FolderSpec,
  types: ArtifactTypeDescriptor[],
  parent: ArtifactRef | null,
): Promise<{ artifacts: ArtifactRef[]; ignored: IgnoredEntry[] }> {
  const shared = types.some((d) => SHARED_PARENT_FOLDER_TYPES.includes(d.type));
  return sweep(fs, { folder, types, parent, shared });
}

async function sweep(
  fs: RepositoryFileSystem,
  request: SweepRequest,
): Promise<{ artifacts: ArtifactRef[]; ignored: IgnoredEntry[] }> {
  const entries = await fs.readDirectory(request.folder.path);
  if (entries === null) return { artifacts: [], ignored: [] };
  return sweepEntries(request, entries);
}

function compareRefs(a: ArtifactRef, b: ArtifactRef): number {
  return (
    catalogOrder(a.type) - catalogOrder(b.type) ||
    compareBytes(a.id, b.id) ||
    compareBytes(a.path, b.path)
  );
}

/** Orden documentado: catálogo, secuencial ascendente y ruta por bytes. */
export function sortArtifacts(artifacts: ArtifactRef[]): ArtifactRef[] {
  return [...artifacts].sort(compareRefs);
}

const SHARED_PARENT_FOLDER_TYPES: readonly ArtifactType[] = ['TK'];

async function listCapabilities(fs: RepositoryFileSystem): Promise<string[]> {
  const entries = (await fs.readDirectory(ARCHITECTURE_ROOT)) ?? [];
  return entries
    .filter((entry) => entry.isDirectory && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort(compareBytes);
}

/**
 * Inventario determinista de todos los artefactos activos y archivados: una
 * sola lectura por directorio, sin depender del orden de recorrido del
 * filesystem. Una ruta inexistente aporta cero entradas; un directorio
 * ilegible lo reporta el puerto como `RuntimeError` / `INTERNAL`.
 */
export async function buildInventory(
  fs: RepositoryFileSystem,
  base: BasePaths,
): Promise<Inventory> {
  const artifacts: ArtifactRef[] = [];
  const ignored: IgnoredEntry[] = [];
  const collect = (result: { artifacts: ArtifactRef[]; ignored: IgnoredEntry[] }): void => {
    artifacts.push(...result.artifacts);
    ignored.push(...result.ignored);
  };

  // 1. Tipos sin padre: carpetas globales (SRS y RQ comparten `requirements/`).
  const roots = new Map<string, { folder: FolderSpec; types: ArtifactTypeDescriptor[] }>();
  const addRoot = (folder: FolderSpec, descriptor: ArtifactTypeDescriptor): void => {
    const key = `${folder.state}:${folder.path}`;
    const known = roots.get(key);
    if (known === undefined) {
      roots.set(key, { folder, types: [descriptor] });
    } else {
      known.types.push(descriptor);
    }
  };
  for (const descriptor of ARTIFACT_CATALOG) {
    if (descriptor.scope === 'GLOBAL' || descriptor.scope === 'ARCHITECTURE_ROOT') {
      foldersFor(descriptor, base).forEach((folder) => addRoot(folder, descriptor));
    } else if (descriptor.type === 'RS') {
      foldersFor(descriptor, base).forEach((folder) => addRoot(folder, descriptor));
    }
  }
  for (const { folder, types } of roots.values()) {
    collect(await sweep(fs, { folder, types, parent: null, shared: false }));
  }

  // 2. Elementos de arquitectura por capability.
  const capabilities = await listCapabilities(fs);
  for (const descriptor of ARTIFACT_CATALOG.filter((d) => d.scope === 'CAPABILITY')) {
    for (const capability of capabilities) {
      for (const folder of foldersFor(descriptor, base, { capability })) {
        collect(await sweep(fs, { folder, types: [descriptor], parent: null, shared: false }));
      }
    }
  }

  // 3. Tipos con padre: se barren las carpetas de cada padre localizado. Los
  //    padres de una ola pueden ser a su vez hijos (RS anidada no es padre de nada).
  const parents = sortArtifacts(artifacts).filter((ref) => ref.kind === 'directory');
  for (const descriptor of ARTIFACT_CATALOG.filter((d) => d.scope === 'PARENT')) {
    for (const parent of parents) {
      if (!descriptor.parentTypes.includes(parent.type)) continue;
      for (const folder of foldersFor(descriptor, base, { parent })) {
        collect(
          await sweep(fs, {
            folder,
            types: [descriptor],
            parent,
            shared: SHARED_PARENT_FOLDER_TYPES.includes(descriptor.type),
          }),
        );
      }
    }
  }

  return {
    artifacts: sortArtifacts(artifacts),
    ignored: [...ignored].sort((a, b) => compareBytes(a.path, b.path)),
  };
}

export type InventoryFilter = {
  /** Por defecto `all`. `active` excluye todo lo que cuelga de `--archived`. */
  state?: 'active' | 'archived' | 'all';
  types?: readonly ArtifactType[];
  /** Ruta de un artefacto: restringe al subárbol de ese artefacto. */
  parentPath?: string;
  /** Capability de `docs/architecture/`: restringe `MD`/`API`/`FL`/`DG`. */
  capability?: string;
};

/** Aplica los filtros sin alterar el orden del inventario. */
export function filterArtifacts(
  artifacts: readonly ArtifactRef[],
  filter: InventoryFilter,
): ArtifactRef[] {
  const { state = 'all', types, parentPath, capability } = filter;
  return artifacts.filter((ref) => {
    if (state === 'active' && ref.state !== 'ACTIVE') return false;
    if (state === 'archived' && ref.state !== 'ARCHIVED') return false;
    if (types !== undefined && !types.includes(ref.type)) return false;
    if (parentPath !== undefined && !ref.path.startsWith(`${parentPath}/`)) return false;
    if (
      capability !== undefined &&
      getDescriptor(ref.type).scope === 'CAPABILITY' &&
      !ref.path.startsWith(`${joinPosix(ARCHITECTURE_ROOT, capability)}/`)
    ) {
      return false;
    }
    return true;
  });
}
