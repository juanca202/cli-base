import type { Command } from 'commander';
import { resolveOutputFormat, writeResult } from '../output.js';

export function registerHelloCommand(program: Command): void {
  program
    .command('hello')
    .description('Saludo de ejemplo del scaffold')
    .argument('[name]', 'nombre a saludar', 'world')
    .action((name: string, _opts: unknown, command: Command) => {
      const format = resolveOutputFormat(command.optsWithGlobals()['output']);
      if (format === 'json') {
        writeResult({ greeting: `hello ${name}` }, format);
        return;
      }
      writeResult(`hello ${name}`, format);
    });
}
