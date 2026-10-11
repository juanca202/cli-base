import { Command } from 'commander';
import { registerGlobalOptions } from './cli-options.js';
import { registerHelloCommand } from './commands/hello.js';
import { ERROR_CODES, ValidationError } from './errors.js';

export type ProgramHooks = {
  /** Se invoca con el nombre del comando una vez validadas las opciones globales. */
  onCommandResolved?: (name: string) => void;
};

export function createProgram(hooks: ProgramHooks = {}): Command {
  const program = new Command();

  program
    .name('cli')
    .description('Consultas deterministas para el ciclo de desarrollo de sdd-platform')
    .version('0.0.0')
    .exitOverride()
    .option('--output <format>', 'formato de salida: human o json', 'human');

  registerGlobalOptions(program);

  program.hook('preAction', (thisCommand, actionCommand) => {
    const format = thisCommand.optsWithGlobals()['output'];
    if (format !== 'human' && format !== 'json') {
      throw new ValidationError(`--output debe ser human o json; recibido: ${String(format)}`, {
        code: ERROR_CODES.INVALID_OUTPUT_FORMAT,
        details: { value: String(format) },
      });
    }
    hooks.onCommandResolved?.(actionCommand.name());
  });

  registerHelloCommand(program);

  return program;
}
