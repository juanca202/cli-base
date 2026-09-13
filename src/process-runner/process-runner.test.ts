import { describe, expect, it } from 'vitest';
import { ProcessError } from '../errors.js';
import { ProcessRunner } from './process-runner.js';

describe('ProcessRunner', () => {
  const runner = new ProcessRunner();

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
});

