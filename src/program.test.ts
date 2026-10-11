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
});
