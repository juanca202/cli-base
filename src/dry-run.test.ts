import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveOutputFormat, writeResult } from './output.js';
import { isDryRun, registerDryRunOption, reportDryRun } from './dry-run.js';

describe('dry-run', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registra --dry-run como opción booleana (false por defecto)', () => {
    const program = new Command();
    registerDryRunOption(program);

    program.parse([], { from: 'user' });

    expect(isDryRun(program)).toBe(false);
  });

  it('isDryRun refleja --dry-run cuando se pasa la bandera', () => {
    const program = new Command();
    registerDryRunOption(program);

    program.parse(['--dry-run'], { from: 'user' });

    expect(isDryRun(program)).toBe(true);
  });

  it('reportDryRun imprime el resumen de simulación por stdout en modo humano (por defecto)', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    reportDryRun(['Validate project configuration', 'Create runtime directory']);

    const output = write.mock.calls.map(([chunk]) => String(chunk)).join('');
    expect(output).toContain('DRY RUN');
    expect(output).toContain('Would perform:');
    expect(output).toContain('✓ Validate project configuration');
    expect(output).toContain('✓ Create runtime directory');
    expect(output).toContain('No changes were made.');
  });

  it('reportDryRun emite JSON parseable en modo máquina, sin prosa humana', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    reportDryRun(['Validate project configuration'], 'json');

    expect(write).toHaveBeenCalledTimes(1);
    const [chunk] = write.mock.calls[0] as [string];
    expect(JSON.parse(chunk)).toEqual({
      dryRun: true,
      actions: ['Validate project configuration'],
    });
  });

  it('compone con un comando real: --dry-run evita el efecto y respeta --output', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    let sideEffectRan = false;
    const program = new Command().exitOverride().option('--output <format>', '', 'human');
    registerDryRunOption(program);
    program.action((_opts, command: Command) => {
      const format = resolveOutputFormat(command.optsWithGlobals()['output']);
      if (isDryRun(command)) {
        reportDryRun(['Write config file'], format);
        return;
      }
      sideEffectRan = true;
      writeResult('done', format);
    });

    await program.parseAsync(['--dry-run', '--output', 'json'], { from: 'user' });

    expect(sideEffectRan).toBe(false);
    const output = write.mock.calls.map(([chunk]) => String(chunk)).join('');
    expect(JSON.parse(output)).toEqual({ dryRun: true, actions: ['Write config file'] });
  });
});
