#!/usr/bin/env node
import { CommanderError } from 'commander';
import { createProgram } from './program.js';
import { EXIT, SUCCESS, ValidationError, exitCodeFor } from './errors.js';
import { writeDiagnostic } from './output.js';
import { installProcessSignalHandlers } from './process-runner/process-signals.js';

installProcessSignalHandlers();

async function main(): Promise<void> {
  try {
    await createProgram().parseAsync(process.argv);
    process.exitCode = SUCCESS;
  } catch (error) {
    if (error instanceof CommanderError) {
      if (
        error.exitCode === 0 ||
        error.code === 'commander.helpDisplayed' ||
        error.code === 'commander.versionDisplayed'
      ) {
        process.exitCode = SUCCESS;
        return;
      }
      writeDiagnostic(error.message);
      process.exitCode = EXIT.INVALID_ARGUMENTS;
      return;
    }

    writeDiagnostic(error instanceof Error ? error.message : String(error));
    process.exitCode =
      error instanceof ValidationError ? error.exitCode : exitCodeFor(error);
  }
}

void main();
