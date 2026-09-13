import { spawn } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProcessError } from '../errors.js';
import { ProcessRunner } from './process-runner.js';

describe('ProcessRunner', () => {
  const runner = new ProcessRunner();

  afterEach(() => {
    vi.useRealTimers();
  });

  it('run captura stdout cuando el hijo termina 0', async () => {
    const result = await runner.run(process.execPath, ['-e', "process.stdout.write('ok')"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('ok');
  });

  it('run lanza ProcessError si el hijo sale distinto de 0', async () => {
    await expect(runner.run(process.execPath, ['-e', 'process.exit(2)'])).rejects.toBeInstanceOf(
      ProcessError,
    );
  });

  it('run rechaza si el AbortSignal ya está abortado', async () => {
    const signal = AbortSignal.abort();
    await expect(
      runner.run(process.execPath, ['-e', "process.stdout.write('ok')"], { signal }),
    ).rejects.toBeInstanceOf(ProcessError);
  });

  it('run cancela el hijo cuando se aborta el signal', async () => {
    const controller = new AbortController();
    const pending = runner.run(process.execPath, ['-e', 'setTimeout(() => {}, 30_000)'], {
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(ProcessError);
  });

  it('run rechaza con ProcessError si el comando no existe', async () => {
    await expect(runner.run('este-comando-no-existe-xyz')).rejects.toBeInstanceOf(ProcessError);
  });

  it('cancel no hace nada si el hijo ya terminó', async () => {
    const child = spawn(process.execPath, ['-e', 'process.exit(0)']);
    await new Promise((resolve) => child.once('exit', resolve));

    const killSpy = vi.spyOn(child, 'kill');
    runner.cancel(child);

    expect(killSpy).not.toHaveBeenCalled();
  });

  it('escalate manda SIGKILL si el hijo ignora SIGTERM tras el tiempo de gracia', async () => {
    const child = spawn(process.execPath, [
      '-e',
      "process.on('SIGTERM', () => {}); process.stdout.write('ready\\n'); setInterval(() => {}, 1000);",
    ]);
    // Espera a que el hijo confirme (por stdout) que instaló su propio handler
    // de SIGTERM antes de cancelarlo, en vez de un sleep fijo.
    await new Promise<void>((resolve) => {
      child.stdout?.once('data', () => resolve());
    });

    const exited = new Promise<string | null>((resolve) => {
      child.once('exit', (_code, signal) => resolve(signal));
    });

    vi.useFakeTimers();
    runner.cancel(child);
    await vi.advanceTimersByTimeAsync(2_000);
    vi.useRealTimers();

    const signal = await exited;
    expect(signal).toBe('SIGKILL');
  });
});

