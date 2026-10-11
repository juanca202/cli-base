#!/usr/bin/env node
import { CommanderError } from 'commander';
import { createProgram } from './program.js';
import { EXIT, ERROR_CODES, SUCCESS, ValidationError, exitCodeFor, type ErrorCode } from './errors.js';
import { resolveOutputFormat, writeFailure, type CommandName } from './output.js';
import { installProcessSignalHandlers } from './process-runner/process-signals.js';

installProcessSignalHandlers();

const COMMAND_NAMES: readonly string[] = ['next', 'find', 'list', 'worktree', 'relations', 'check'];

const MISSING_REQUIRED_CODES: readonly string[] = [
  'commander.missingArgument',
  'commander.optionMissingArgument',
  'commander.missingMandatoryOptionValue',
];

function asCommandName(name: string | null): CommandName | null {
  return name !== null && COMMAND_NAMES.includes(name) ? (name as CommandName) : null;
}

async function main(): Promise<void> {
  let resolvedCommand: string | null = null;
  const program = createProgram({
    onCommandResolved: (name) => {
      resolvedCommand = name;
    },
  });

  try {
    await program.parseAsync(process.argv);
    process.exitCode = SUCCESS;
  } catch (error) {
    // Un `--output` inválido no se trata como json: el fallo sale en TOON, el formato por defecto.
    const command = asCommandName(resolvedCommand);
    const format = resolveOutputFormat(program.opts()['output']);

    if (error instanceof CommanderError) {
      if (
        error.exitCode === 0 ||
        error.code === 'commander.helpDisplayed' ||
        error.code === 'commander.versionDisplayed'
      ) {
        process.exitCode = SUCCESS;
        return;
      }
      const code: ErrorCode = MISSING_REQUIRED_CODES.includes(error.code)
        ? ERROR_CODES.MISSING_REQUIRED_FLAG
        : ERROR_CODES.INVALID_FLAG_VALUE;
      writeFailure(new ValidationError(error.message, { code, cause: error }), command, format);
      process.exitCode = EXIT.INVALID_ARGUMENTS;
      return;
    }

    writeFailure(error, command, format);
    process.exitCode = error instanceof ValidationError ? error.exitCode : exitCodeFor(error);
  }
}

void main();
