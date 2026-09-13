import { describe, expect, it } from 'vitest';
import { runCli } from '../helpers/cli-runner.js';

describe('cli-base (E2E)', () => {
  it('hello <nombre> saluda por stdout y sale con código 0', async () => {
    const result = await runCli(['hello', 'Ada']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('hello Ada');
    expect(result.stderr).toBe('');
  });

  it('hello sin argumento usa el valor por defecto "world"', async () => {
    const result = await runCli(['hello']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('hello world');
  });

  it('--output json devuelve el resultado como JSON por stdout', async () => {
    const result = await runCli(['hello', 'Ada', '--output', 'json']);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ greeting: 'hello Ada' });
  });

  it('--output inválido sale con código 2 y escribe el diagnóstico en stderr', async () => {
    const result = await runCli(['hello', '--output', 'xml']);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('--output debe ser human o json');
  });

  it('un comando desconocido sale con código distinto de 0 y escribe el error en stderr', async () => {
    const result = await runCli(['no-existe']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.length).toBeGreaterThan(0);
  });
});
