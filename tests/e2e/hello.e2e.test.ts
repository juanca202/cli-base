import { describe, expect, it } from 'vitest';
import { runCli } from '../helpers/cli-runner.js';

describe('cli (E2E)', () => {
  it('hello <nombre> emite TOON por stdout y sale con código 0', async () => {
    const result = await runCli(['hello', 'Ada']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('greeting: hello Ada');
    expect(result.stderr).toBe('');
  });

  it('hello sin argumento usa el valor por defecto "world"', async () => {
    const result = await runCli(['hello']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('greeting: hello world');
  });

  it('--output json devuelve el resultado como JSON por stdout', async () => {
    const result = await runCli(['hello', 'Ada', '--output', 'json']);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ greeting: 'hello Ada' });
  });

  it.each(['xml', 'human'])('--output %s sale con código 2 y el fallo va en TOON por stdout', async (value) => {
    const result = await runCli(['hello', '--output', value]);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain('schema: cli-error/v1');
    expect(result.stdout).toContain('code: INVALID_OUTPUT_FORMAT');
    expect(result.stderr).toBe('');
  });

  it('un comando desconocido sale con código distinto de 0 y escribe el error en stderr', async () => {
    const result = await runCli(['no-existe']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.length).toBeGreaterThan(0);
  });
});
