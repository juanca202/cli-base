import { isAbsolute, relative, resolve, sep } from 'node:path';
import { ConfigurationError, ERROR_CODES } from '../../errors.js';
import { findRepositoryRoot } from './infra/git-root.js';
import {
  SETTINGS_RELATIVE_PATH,
  pathExists,
  readSettingsFile,
} from './infra/settings-file.js';

export const DEFAULT_CHANGES_PATH = 'docs/specs/changes';
export const DEFAULT_CURRENT_PATH = 'docs/specs/current';
export const DEFAULT_ARCHIVED_PATH = 'docs/specs/archived';
export const DEFAULT_WORKTREE_PATH = '.worktrees';
export const DEFAULT_ARCH_ROOT = '.';

/** Flags globales de ruta tal como llegaron (relativos a `--repo` salvo absolutos). */
export type SettingsRequest = {
  repo?: string | undefined;
  changes?: string | undefined;
  current?: string | undefined;
  archived?: string | undefined;
  archRoot?: string | undefined;
  /** Directorio de trabajo; por defecto el del proceso. */
  cwd?: string | undefined;
};

/**
 * Repositorio y rutas base resueltos. `repoRoot` es absoluta y se usa solo
 * para I/O; cada ruta base es POSIX, sin barra final, relativa a `repoRoot`
 * (o absoluta si cae fuera del repositorio).
 */
export type ResolvedSettings = {
  repoRoot: string;
  changesPath: string;
  currentPath: string;
  archivedPath: string;
  archRoot: string;
  workTreePath: string;
};

export type SettingsPorts = {
  findRepositoryRoot: typeof findRepositoryRoot;
  readSettingsFile: (repoRoot: string) => Promise<unknown>;
  pathExists: (absolutePath: string) => Promise<boolean>;
};

const DEFAULT_PORTS: SettingsPorts = { findRepositoryRoot, readSettingsFile, pathExists };

type FileSettings = {
  changesPath?: string;
  currentPath?: string;
  archivedPath?: string;
  workTreePath?: string;
};

function invalidSettings(reason: string): ConfigurationError {
  return new ConfigurationError(`${SETTINGS_RELATIVE_PATH} no es válido: ${reason}.`, {
    code: ERROR_CODES.INVALID_SETTINGS,
    details: { path: SETTINGS_RELATIVE_PATH },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(section: Record<string, unknown>, key: string, label: string): string | undefined {
  const value = section[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value === '') {
    throw invalidSettings(`${label} debe ser una cadena no vacía`);
  }
  return value;
}

function readSection(root: Record<string, unknown>, key: string): Record<string, unknown> {
  const section = root[key];
  if (section === undefined) return {};
  if (!isRecord(section)) {
    throw invalidSettings(`${key} debe ser un objeto`);
  }
  return section;
}

/**
 * Extrae las cuatro claves que interpreta el CLI. Las claves heredadas
 * `basePath`/`archivePath` y cualquier otra se ignoran.
 */
export function parseFileSettings(raw: unknown): FileSettings {
  if (raw === undefined) return {};
  if (!isRecord(raw)) {
    throw invalidSettings('la raíz debe ser un objeto');
  }
  const specification = readSection(raw, 'specification');
  const implementation = readSection(raw, 'implementation');
  const parsed: FileSettings = {};
  const changes = readString(specification, 'changesPath', 'specification.changesPath');
  const current = readString(specification, 'currentPath', 'specification.currentPath');
  const archived = readString(specification, 'archivedPath', 'specification.archivedPath');
  const workTree = readString(implementation, 'workTreePath', 'implementation.workTreePath');
  if (changes !== undefined) parsed.changesPath = changes;
  if (current !== undefined) parsed.currentPath = current;
  if (archived !== undefined) parsed.archivedPath = archived;
  if (workTree !== undefined) parsed.workTreePath = workTree;
  return parsed;
}

function toPosix(path: string): string {
  return sep === '/' ? path : path.split(sep).join('/');
}

/**
 * Normaliza una ruta contra la raíz del repositorio: POSIX, sin barra final y
 * sin `./` inicial; relativa al repositorio salvo que caiga fuera de él.
 */
export function normalizeBasePath(repoRoot: string, value: string): string {
  const absolute = resolve(repoRoot, value);
  const rel = relative(repoRoot, absolute);
  if (rel === '') return '.';
  if (rel.startsWith('..') || isAbsolute(rel)) return toPosix(absolute);
  return toPosix(rel);
}

async function ensureExplicitExists(
  ports: SettingsPorts,
  repoRoot: string,
  flag: string,
  value: string,
): Promise<void> {
  if (await ports.pathExists(resolve(repoRoot, value))) return;
  throw new ConfigurationError(`La ruta indicada con ${flag} no existe.`, {
    code: ERROR_CODES.BASE_PATH_NOT_FOUND,
    details: isAbsolute(value) ? { flag } : { flag, path: toPosix(value) },
  });
}

/**
 * Resuelve el repositorio y las rutas base con la precedencia
 * flags > `settings.json` > valores por defecto. Una ruta explícita inexistente
 * es `BASE_PATH_NOT_FOUND`; una declarada en `settings.json` que no exista
 * aporta simplemente cero entradas.
 */
export async function resolveSettings(
  request: SettingsRequest = {},
  ports: SettingsPorts = DEFAULT_PORTS,
): Promise<ResolvedSettings> {
  const cwd = request.cwd ?? process.cwd();
  const repoRoot = await ports.findRepositoryRoot({ repo: request.repo, cwd });
  const file = parseFileSettings(await ports.readSettingsFile(repoRoot));

  const explicit: [string, string | undefined][] = [
    ['--changes', request.changes],
    ['--current', request.current],
    ['--archived', request.archived],
    ['--arch-root', request.archRoot],
  ];
  for (const [flag, value] of explicit) {
    if (value !== undefined) {
      await ensureExplicitExists(ports, repoRoot, flag, value);
    }
  }

  const pick = (flag: string | undefined, declared: string | undefined, fallback: string): string =>
    normalizeBasePath(repoRoot, flag ?? declared ?? fallback);

  return {
    repoRoot,
    changesPath: pick(request.changes, file.changesPath, DEFAULT_CHANGES_PATH),
    currentPath: pick(request.current, file.currentPath, DEFAULT_CURRENT_PATH),
    archivedPath: pick(request.archived, file.archivedPath, DEFAULT_ARCHIVED_PATH),
    archRoot: pick(request.archRoot, undefined, DEFAULT_ARCH_ROOT),
    workTreePath: pick(undefined, file.workTreePath, DEFAULT_WORKTREE_PATH),
  };
}
