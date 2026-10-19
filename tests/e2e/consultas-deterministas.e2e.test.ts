import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execa } from 'execa';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCli } from '../helpers/cli-runner.js';

/**
 * FR-002 (SRS-001, §13): cada consulta determinista (`next`, `find`, `list`) devuelve el mismo resultado ante el
 * mismo input y soporta `--output json`. US-010 sacó `fingerprint`, `fresh` y `verdict` del alcance.
 */
describe('consultas deterministas (E2E)', () => {
  let repo: string;

  beforeAll(async () => {
    repo = await mkdtemp(join(tmpdir(), 'cli-e2e-consultas-'));
    await execa('git', ['init', '-q'], { cwd: repo });
    for (const [state, id, slug] of [
      ['changes', 'US-001', 'primera'],
      ['changes', 'US-002', 'segunda'],
      ['archived', 'US-003', 'archivada'],
    ] as const) {
      const folder = join(repo, 'docs', 'specs', state, 'user-stories', `${id}-${slug}`);
      await mkdir(folder, { recursive: true });
      await writeFile(join(folder, 'README.md'), `# ${id}: ${slug}\n`);
    }
  });

  afterAll(async () => {
    await rm(repo, { recursive: true, force: true });
  });

  const queries: Array<[string, string[]]> = [
    ['next', ['next', 'US']],
    ['find', ['find', 'US-001']],
    ['list', ['list', 'US']],
  ];

  it.each(queries)('%s devuelve el mismo resultado ante el mismo input', async (_name, args) => {
    const first = await runCli([...args, '--repo', repo, '--output', 'json']);
    const second = await runCli([...args, '--repo', repo, '--output', 'json']);

    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(0);
    expect(second.stdout).toBe(first.stdout);
  });

  it.each(queries)('%s soporta --output json', async (_name, args) => {
    const result = await runCli([...args, '--repo', repo, '--output', 'json']);

    expect(result.exitCode).toBe(0);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  it('next cuenta los archivados al elegir el siguiente identificador', async () => {
    const result = await runCli(['next', 'US', '--repo', repo, '--output', 'json']);

    expect(JSON.stringify(JSON.parse(result.stdout))).toContain('US-004');
  });
});
