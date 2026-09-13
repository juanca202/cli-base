import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa, type Result } from 'execa';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cliPath = join(repoRoot, 'dist', 'cli.js');

export function runCli(args: string[] = []): Promise<Result> {
  return execa('node', [cliPath, ...args], { reject: false });
}
