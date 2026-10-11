import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ERROR_CODES, RuntimeError } from '../../../errors.js';

export type DirectoryEntry = {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
};

/**
 * Puerto de lectura del filesystem del repositorio de especificaciones. Las
 * rutas son POSIX relativas a la raíz del repositorio.
 */
export type RepositoryFileSystem = {
  /** Entradas de un directorio; `null` si no existe (o no es un directorio). */
  readDirectory(path: string): Promise<DirectoryEntry[] | null>;
  /** Contenido de un documento; `null` si no existe. */
  readText(path: string): Promise<string | null>;
};

function isAbsent(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException).code;
  return code === 'ENOENT' || code === 'ENOTDIR';
}

function unreadable(path: string, error: unknown): RuntimeError {
  return new RuntimeError(`No se puede leer ${path}.`, {
    code: ERROR_CODES.INTERNAL,
    details: { path },
    cause: error,
  });
}

/** Lectura real; un permiso denegado u otro fallo de I/O es `RuntimeError` / `INTERNAL`. */
export function createFileSystem(repoRoot: string): RepositoryFileSystem {
  const absolute = (path: string): string => join(repoRoot, path);
  return {
    async readDirectory(path) {
      try {
        const entries = await readdir(absolute(path), { withFileTypes: true });
        return entries.map((entry) => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
        }));
      } catch (error) {
        if (isAbsent(error)) return null;
        throw unreadable(path, error);
      }
    },
    async readText(path) {
      try {
        return await readFile(absolute(path), 'utf8');
      } catch (error) {
        if (isAbsent(error)) return null;
        throw unreadable(path, error);
      }
    },
  };
}
