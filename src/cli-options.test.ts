import { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { readGlobalOptions, registerGlobalOptions } from './cli-options.js';

function parse(args: string[]) {
  const program = new Command().exitOverride().option('--output <format>', 'formato', 'human');
  registerGlobalOptions(program);
  let captured: ReturnType<typeof readGlobalOptions> | undefined;
  program
    .command('probe')
    .action((_opts: unknown, command: Command) => {
      captured = readGlobalOptions(command);
    });
  program.parse(['node', 'cli', ...args]);
  return captured;
}

describe('readGlobalOptions', () => {
  it('sin flags devuelve human y ninguna ruta base', () => {
    expect(parse(['probe'])).toEqual({ output: 'human' });
  });

  it('lee --output y los flags de rutas base como texto sin resolverlos', () => {
    expect(
      parse([
        '--output',
        'json',
        '--repo',
        '/tmp/repo',
        '--changes',
        'docs/c',
        '--current',
        'docs/cur',
        '--archived',
        'docs/arch',
        '--arch-root',
        'cli',
        'probe',
      ]),
    ).toEqual({
      output: 'json',
      repo: '/tmp/repo',
      changes: 'docs/c',
      current: 'docs/cur',
      archived: 'docs/arch',
      archRoot: 'cli',
    });
  });

  it('acepta los flags después del subcomando (opciones globales)', () => {
    expect(parse(['probe', '--repo', 'x', '--output', 'json'])).toEqual({
      output: 'json',
      repo: 'x',
    });
  });

  it('un --output fuera de human/json se conserva para que el programa lo rechace', () => {
    expect(parse(['probe', '--output', 'xml'])?.output).toBe('xml');
  });
});
