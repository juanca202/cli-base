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
    expect(stdoutWrite).toHaveBeenCalledWith('hello Ada\n');
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
    const { stderrWrite } = await runCli(['bogus']);
    expect(process.exitCode).toBe(2);
    expect(stderrWrite).toHaveBeenCalled();
  });

  it('un ValidationError fuera de Commander se reporta con su propio exit code', async () => {
    const { stderrWrite } = await runCli(['hello', '--output', 'xml']);
    expect(process.exitCode).toBe(2);
    expect(stderrWrite).toHaveBeenCalledWith(
      expect.stringContaining('--output debe ser human o json'),
    );
  });
});
