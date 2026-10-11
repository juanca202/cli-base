import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Command } from 'commander';
import { vi } from 'vitest';
import { registerGlobalOptions } from '../cli-options.js';
import { exitCodeFor, toCliErrorFields, type CliErrorFields } from '../errors.js';
import { ProcessRunner } from '../process-runner/process-runner.js';

export type RepoFixture = {
  root: string;
  write(path: string, content?: string): void;
  dispose(): void;
};

/** Repositorio git temporal sobre el que los comandos de consulta corren con `--repo`. */
export async function createRepoFixture(): Promise<RepoFixture> {
  const root = mkdtempSync(join(tmpdir(), 'cli-command-'));
  await new ProcessRunner().run('git', ['init', '-q', '-b', 'main'], { cwd: root });
  return {
    root,
    write(path, content = '') {
      const absolute = join(root, path);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, content);
    },
    dispose() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

export type CommandRun = {
  stdout: string;
  stderr: string;
  exitCode: number;
  error: CliErrorFields | null;
};

/**
 * Ejecuta un adaptador sobre un `Command` de prueba (el registro en el programa
 * es de TK-006). Captura stdout/stderr y traduce un fallo a su código de salida.
 */
export async function runQueryCommand(
  register: (program: Command) => void,
  args: string[],
): Promise<CommandRun> {
  const out: string[] = [];
  const err: string[] = [];
  const stdout = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    out.push(String(chunk));
    return true;
  });
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    err.push(String(chunk));
    return true;
  });

  const program = new Command().exitOverride().option('--output <format>', 'formato');
  registerGlobalOptions(program);
  register(program);

  try {
    await program.parseAsync(args, { from: 'user' });
    return { stdout: out.join(''), stderr: err.join(''), exitCode: 0, error: null };
  } catch (error) {
    return {
      stdout: out.join(''),
      stderr: err.join(''),
      exitCode: exitCodeFor(error),
      error: toCliErrorFields(error),
    };
  } finally {
    stdout.mockRestore();
    stderr.mockRestore();
  }
}
