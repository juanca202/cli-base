import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { ConfigurationError, ERROR_CODES } from '../../../errors.js';

export const SETTINGS_RELATIVE_PATH = '.sdd-devkit/settings.json';

/**
 * Lee `<repo>/.sdd-devkit/settings.json`. Un archivo ausente devuelve `undefined`
 * (no es un error); uno ilegible o que no es JSON es `INVALID_SETTINGS`, sin
 * caer a los valores por defecto.
 */
export async function readSettingsFile(repoRoot: string): Promise<unknown> {
  let raw: string;
  try {
    raw = await readFile(join(repoRoot, SETTINGS_RELATIVE_PATH), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw new ConfigurationError(`No se pudo leer ${SETTINGS_RELATIVE_PATH}.`, {
      code: ERROR_CODES.INVALID_SETTINGS,
      details: { path: SETTINGS_RELATIVE_PATH },
      cause: error,
    });
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw new ConfigurationError(`${SETTINGS_RELATIVE_PATH} no es JSON válido.`, {
      code: ERROR_CODES.INVALID_SETTINGS,
      details: { path: SETTINGS_RELATIVE_PATH },
      cause: error,
    });
  }
}

export async function pathExists(absolutePath: string): Promise<boolean> {
  try {
    await stat(absolutePath);
    return true;
  } catch {
    return false;
  }
}
