import type { Command } from 'commander';
import type { OutputFormat } from './output.js';
import { writeResult } from './output.js';

export function registerDryRunOption(command: Command): Command {
  return command.option('--dry-run', 'simula la operación sin producir efectos secundarios', false);
}

export function isDryRun(command: Command): boolean {
  return Boolean(command.optsWithGlobals()['dryRun']);
}

export function reportDryRun(actions: string[], format: OutputFormat = 'toon'): void {
  writeResult({ dryRun: true, actions }, format);
}
