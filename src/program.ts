import { Command } from 'commander';
import { registerHelloCommand } from './commands/hello.js';
import { ValidationError } from './errors.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('cli-base')
    .description('Plantilla CLI reutilizable')
    .version('0.0.0')
    .exitOverride()
    .option('--output <format>', 'formato de salida: human o json', 'human')
    .hook('preAction', (thisCommand) => {
      const format = thisCommand.optsWithGlobals()['output'];
      if (format !== 'human' && format !== 'json') {
        throw new ValidationError(`--output debe ser human o json; recibido: ${String(format)}`);
      }
    });

  registerHelloCommand(program);

  return program;
}
