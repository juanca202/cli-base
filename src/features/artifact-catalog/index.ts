// API pública de la capacidad `artifact-catalog`: catálogo, ids, inventario,
// localización y marcas de estado. Las demás capacidades solo importan de aquí.
export {
  ARTIFACT_CATALOG,
  ARTIFACT_TYPES,
  catalogOrder,
  getDescriptor,
  nameRegExp,
  type ArtifactKind,
  type ArtifactScope,
  type ArtifactType,
  type ArtifactTypeDescriptor,
} from './catalog.js';
export {
  formatArtifactId,
  normalizeArtifactType,
  parseArtifactId,
  type ParsedArtifactId,
} from './artifact-id.js';
export {
  ARCHITECTURE_ROOT,
  buildInventory,
  filterArtifacts,
  foldersFor,
  joinPosix,
  sortArtifacts,
  type ArtifactParentRef,
  type ArtifactRef,
  type ArtifactState,
  type BasePaths,
  type FolderSpec,
  type IgnoredEntry,
  type Inventory,
  type InventoryFilter,
} from './inventory.js';
export {
  locateById,
  parseStateFilter,
  resolveCapability,
  resolveParent,
  type LocateContext,
  type LocateQuery,
} from './locate.js';
export { nextId, type NextIdQuery, type NextIdResult } from './next-id.js';
export { listArtifacts, type ListQuery, type ListResult } from './list.js';
export { lineAt, maskCode, readHtmlComments, type HtmlComment } from './markdown.js';
export {
  attachStatus,
  parseMarkerPairs,
  readFrontMatterStatus,
  readStatusMarks,
  type StatusMark,
} from './status-marker.js';
export { createFileSystem, type RepositoryFileSystem } from './infra/filesystem.js';
