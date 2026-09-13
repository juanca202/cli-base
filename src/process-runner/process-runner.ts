import { spawn, type ChildProcess } from 'node:child_process';
import { ProcessError } from '../errors.js';
import { processAbortSignal } from './process-signals.js';

const KILL_GRACE_MS = 2_000;

export type ProcessRunOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export type ProcessRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type ProcessStreamHandlers = {
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
};

export class ProcessRunner {
  run(
    command: string,
    args: string[] = [],
    options: ProcessRunOptions = {},
  ): Promise<ProcessRunResult> {
    return this.execute(command, args, options);
  }

  stream(
    command: string,
    args: string[] = [],
    options: ProcessRunOptions = {},
    handlers: ProcessStreamHandlers = {},
  ): Promise<ProcessRunResult> {
    return this.execute(command, args, options, handlers);
  }

  cancel(child: ChildProcess): void {
    this.escalate(child);
  }

  timeout(child: ChildProcess, ms: number): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      this.escalate(child);
    }, ms);
  }

  private execute(
    command: string,
    args: string[],
    options: ProcessRunOptions,
    handlers: ProcessStreamHandlers = {},
  ): Promise<ProcessRunResult> {
    const signal = options.signal ?? processAbortSignal();

    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new ProcessError(`proceso cancelado: ${command}`));
        return;
      }

      const child = spawn(command, args, {
        cwd: options.cwd,
        env: options.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let killTimer: ReturnType<typeof setTimeout> | undefined;
      const timeoutTimer =
        options.timeoutMs !== undefined ? this.timeout(child, options.timeoutMs) : undefined;

      const onAbort = () => {
        killTimer = this.escalate(child) ?? killTimer;
      };
      signal.addEventListener('abort', onAbort, { once: true });

      const cleanup = () => {
        signal.removeEventListener('abort', onAbort);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (killTimer) clearTimeout(killTimer);
      };

      child.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stdout += text;
        handlers.onStdout?.(text);
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stderr += text;
        handlers.onStderr?.(text);
      });

      child.on('error', (err) => {
        cleanup();
        reject(new ProcessError(`no se pudo iniciar ${command}`, { cause: err }));
      });

      child.on('close', (code) => {
        cleanup();
        if (signal.aborted) {
          reject(new ProcessError(`proceso cancelado: ${command}`));
          return;
        }
        const exitCode = code ?? 1;
        if (exitCode !== 0) {
          reject(new ProcessError(`${command} terminó con código ${exitCode}`));
          return;
        }
        resolve({ stdout, stderr, exitCode });
      });
    });
  }

  private escalate(child: ChildProcess): ReturnType<typeof setTimeout> | undefined {
    if (child.exitCode !== null || child.signalCode !== null) {
      return undefined;
    }
    child.kill('SIGTERM');
    return setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
      }
    }, KILL_GRACE_MS);
  }
}
