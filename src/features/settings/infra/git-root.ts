import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ConfigurationError, ERROR_CODES, ProcessError } from '../../../errors.js';
import { ProcessRunner } from '../../../process-runner/process-runner.js';

export type RepositoryRootRequest = {
  /** Valor de `--repo` tal como llegó, si se indicó. */
  repo?: string | undefined;
  /** Directorio de trabajo contra el que se resuelve un `--repo` relativo. */
  cwd: string;
};

function isMissingBinary(error: unknown): boolean {
  const cause = error instanceof Error ? error.cause : undefined;
  return (cause as NodeJS.ErrnoException | undefined)?.code === 'ENOENT';
}

async function git(runner: ProcessRunner, cwd: string, args: string[]): Promise<string> {
  try {
    return (await runner.run('git', args, { cwd })).stdout.trim();
  } catch (error) {
    if (error instanceof ProcessError && isMissingBinary(error)) {
      throw new ProcessError('git no está disponible en el entorno.', {
        code: ERROR_CODES.GIT_UNAVAILABLE,
        cause: error,
      });
    }
    if (error instanceof ProcessError && error.details?.['exitCode'] !== undefined) {
      throw new ConfigurationError('El directorio no está dentro de un repositorio git.', {
        code: ERROR_CODES.NOT_A_GIT_REPOSITORY,
        cause: error,
      });
    }
    throw error;
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Raíz del repositorio de especificaciones. Con `--repo`, ese directorio (debe
 * ser un repositorio git); sin él, el superproyecto si se invoca desde un
 * submódulo y, si no, la raíz git del directorio de trabajo.
 */
export async function findRepositoryRoot(
  request: RepositoryRootRequest,
  runner: ProcessRunner = new ProcessRunner(),
): Promise<string> {
  if (request.repo !== undefined) {
    const explicit = resolve(request.cwd, request.repo);
    if (!(await isDirectory(explicit))) {
      throw new ConfigurationError('--repo no apunta a un directorio existente.', {
        code: ERROR_CODES.NOT_A_GIT_REPOSITORY,
      });
    }
    await git(runner, explicit, ['rev-parse', '--show-toplevel']);
    return explicit;
  }

  const superproject = await git(runner, request.cwd, [
    'rev-parse',
    '--show-superproject-working-tree',
  ]);
  if (superproject !== '') {
    return superproject;
  }
  return git(runner, request.cwd, ['rev-parse', '--show-toplevel']);
}

/**
 * Rama actual del repositorio (`git branch --show-current`); `null` con HEAD
 * desacoplado, donde git no imprime ninguna.
 */
export async function readCurrentBranch(
  repoRoot: string,
  runner: ProcessRunner = new ProcessRunner(),
): Promise<string | null> {
  const branch = await git(runner, repoRoot, ['branch', '--show-current']);
  return branch === '' ? null : branch;
}
