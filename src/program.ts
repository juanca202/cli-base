import { Command } from 'commander';
import { registerGlobalOptions } from './cli-options.js';
import { registerFindCommand } from './commands/find.js';
import { registerHelloCommand } from './commands/hello.js';
import { registerListCommand } from './commands/list.js';
import { registerNextCommand } from './commands/next.js';
import { ERROR_CODES, ValidationError } from './errors.js';
import { isMachineOnly } from './output.js';

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
    .option('--output <format>', 'formato de salida: human, json o toon (por defecto human; toon en `next`)');

  registerGlobalOptions(program);

  program.hook('preAction', (thisCommand, actionCommand) => {
    hooks.onCommandResolved?.(actionCommand.name());
    const format = thisCommand.optsWithGlobals()['output'];
    const known = format === undefined || format === 'human' || format === 'json' || format === 'toon';
    if (!known) {
      throw new ValidationError(`--output debe ser human, json o toon; recibido: ${String(format)}`, {
        code: ERROR_CODES.INVALID_OUTPUT_FORMAT,
        details: { value: String(format) },
      });
    }
    if (format === 'human' && isMachineOnly(actionCommand.name())) {
      throw new ValidationError(
        `${actionCommand.name()} no tiene formato humano: usa toon (por defecto) o json.`,
        { code: ERROR_CODES.INVALID_OUTPUT_FORMAT, details: { value: 'human', command: actionCommand.name() } },
      );
    }
  });

  registerNextCommand(program);
  registerFindCommand(program);
  registerListCommand(program);
  registerHelloCommand(program);

  return program;
}
