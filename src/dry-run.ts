import type { Command } from 'commander';
import type { OutputFormat } from './output.js';
import { writeResult } from './output.js';

export function registerDryRunOption(command: Command): Command {
  return command.option('--dry-run', 'simula la operación sin producir efectos secundarios', false);
}

export function isDryRun(command: Command): boolean {
  return Boolean(command.optsWithGlobals()['dryRun']);
}

export function reportDryRun(actions: string[], format: OutputFormat = 'human'): void {
  if (format === 'json') {
    writeResult({ dryRun: true, actions }, format);
    return;
  }
  const lines = [
    'DRY RUN',
    '',
    'Would perform:',
    ...actions.map((action) => `  ✓ ${action}`),
    '',
    'No changes were made.',
  ];
  writeResult(lines.join('\n'), format);
}
