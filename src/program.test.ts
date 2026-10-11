import { describe, expect, it } from 'vitest';
import { createProgram } from './program.js';

function commandNames(): string[] {
  return createProgram().commands.map((command) => command.name());
}

describe('createProgram', () => {
  it.each(['next', 'find', 'list'])('registra el comando %s', (name) => {
    expect(commandNames()).toContain(name);
  });

  it('no expone --dry-run en los comandos de solo lectura', () => {
    const program = createProgram();
    for (const name of ['next', 'find', 'list']) {
      const command = program.commands.find((candidate) => candidate.name() === name);
      const flags = command?.options.map((option) => option.long) ?? [];
      expect(flags).not.toContain('--dry-run');
    }
  });

  it('next no tiene formato humano: --output human es INVALID_OUTPUT_FORMAT', async () => {
    const program = createProgram();
    await expect(
      program.parseAsync(['node', 'cli', 'next', 'US', '--output', 'human', '--repo', '/no/existe']),
    ).rejects.toMatchObject({ code: 'INVALID_OUTPUT_FORMAT', exitCode: 2 });
  });

  it('--output acepta toon, json y human en el resto de los comandos', async () => {
    for (const format of ['toon', 'json', 'human']) {
      const program = createProgram();
      // Falla después de validar --output (el repo no existe): el formato no es la causa.
      await expect(
        program.parseAsync(['node', 'cli', 'find', 'US-001', '--output', format, '--repo', '/no/existe']),
      ).rejects.not.toMatchObject({ code: 'INVALID_OUTPUT_FORMAT' });
    }
  });
});
