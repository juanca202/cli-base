import { afterEach, describe, expect, it, vi } from 'vitest';

const originalArgv = process.argv;

async function runCli(args: string[]) {
  vi.resetModules();
  process.argv = ['node', 'cli.js', ...args];
  process.exitCode = undefined;

  vi.spyOn(process, 'on').mockReturnValue(process);
  const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

  await import('./cli.js');
  // `main()` corre en fire-and-forget (`void main()`); darle un par de vueltas
  // al loop de eventos alcanza porque los comandos de prueba no hacen I/O real.
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  return { stdoutWrite, stderrWrite };
}

describe('cli entrypoint', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    process.argv = originalArgv;
    process.exitCode = undefined;
  });

  it('ejecuta un comando válido y sale con éxito', async () => {
    const { stdoutWrite } = await runCli(['hello', 'Ada']);
    expect(process.exitCode).toBe(0);
    expect(stdoutWrite).toHaveBeenCalledWith('greeting: hello Ada\n');
  });

  it('--help sale con éxito sin ejecutar comandos', async () => {
    await runCli(['--help']);
    expect(process.exitCode).toBe(0);
  });

  it('--version sale con éxito', async () => {
    const { stdoutWrite } = await runCli(['--version']);
    expect(process.exitCode).toBe(0);
    expect(stdoutWrite).toHaveBeenCalledWith('0.0.0\n');
  });

  it('un comando desconocido reporta el error de Commander y sale con INVALID_ARGUMENTS', async () => {
    const { stdoutWrite } = await runCli(['bogus']);
    expect(process.exitCode).toBe(2);
    expect(String(stdoutWrite.mock.calls[0]?.[0])).toContain('schema: cli-error/v1');
  });

  it('un ValidationError fuera de Commander se reporta con su propio exit code', async () => {
    const { stdoutWrite } = await runCli(['hello', '--output', 'xml']);
    expect(process.exitCode).toBe(2);
    expect(String(stdoutWrite.mock.calls[0]?.[0])).toContain('--output debe ser toon o json');
  });

  it('en modo json un comando desconocido emite un único cli-error/v1 por stdout con command null', async () => {
    const { stdoutWrite } = await runCli(['bogus', '--output', 'json']);
    expect(process.exitCode).toBe(2);
    expect(stdoutWrite).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(stdoutWrite.mock.calls[0]?.[0]));
    expect(payload).toMatchObject({
      schema: 'cli-error/v1',
      command: null,
      ok: false,
      error: { type: 'ValidationError', exitCode: 2, code: 'INVALID_FLAG_VALUE' },
    });
  });

  it('en modo json un argumento requerido ausente se clasifica como MISSING_REQUIRED_FLAG', async () => {
    const { stdoutWrite } = await runCli(['--output', 'json', '--repo']);
    expect(process.exitCode).toBe(2);
    const payload = JSON.parse(String(stdoutWrite.mock.calls[0]?.[0]));
    expect(payload.error.code).toBe('MISSING_REQUIRED_FLAG');
    expect(payload.command).toBeNull();
  });

  it('un --output inválido (incluido human) es INVALID_OUTPUT_FORMAT, código 2, en TOON por stdout', async () => {
    for (const value of ['JSON', 'human']) {
      const { stdoutWrite } = await runCli(['hello', '--output', value]);
      expect(process.exitCode).toBe(2);
      const out = String(stdoutWrite.mock.calls[0]?.[0]);
      expect(out).toContain('schema: cli-error/v1');
      expect(out).toContain('code: INVALID_OUTPUT_FORMAT');
      vi.restoreAllMocks();
    }
  });

  it('por defecto un fallo es un cli-error/v1 en TOON por stdout, sin texto humano por stderr', async () => {
    const { stdoutWrite } = await runCli(['bogus']);
    expect(process.exitCode).toBe(2);
    expect(String(stdoutWrite.mock.calls[0]?.[0])).toMatch(/^schema: cli-error\/v1\ncommand: null\nok: false\n/);
  });

  it('un error no clasificado en una acción sale con código 1 y causa INTERNAL', async () => {
    vi.doMock('./commands/hello.js', () => ({
      registerHelloCommand: (program: import('commander').Command) => {
        program.command('hello').action(() => {
          throw new Error('fallo inesperado');
        });
      },
    }));
    const { stdoutWrite } = await runCli(['hello', '--output', 'json']);
    vi.doUnmock('./commands/hello.js');
    expect(process.exitCode).toBe(1);
    const payload = JSON.parse(String(stdoutWrite.mock.calls[0]?.[0]));
    expect(payload).toMatchObject({
      command: null,
      error: { type: 'RuntimeError', exitCode: 1, code: 'INTERNAL', message: 'fallo inesperado' },
    });
  });
});
