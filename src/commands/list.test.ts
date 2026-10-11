import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createRepoFixture,
  runQueryCommand,
  type RepoFixture,
} from '../test-support/query-command.js';
import { registerListCommand } from './list.js';

let fx: RepoFixture;

beforeEach(async () => {
  fx = await createRepoFixture();
  fx.write('docs/specs/changes/requirements/SRS-001-plataforma/README.md');
  fx.write('docs/specs/changes/user-stories/US-001-alta/README.md');
  fx.write('docs/specs/changes/user-stories/US-010-cli/README.md');
  fx.write('docs/specs/archived/user-stories/US-021-menu/README.md');
  fx.write(
    'docs/specs/archived/user-stories/US-021-menu/wireframes/WF-001-menu.md',
    '<!-- wireframe:review-status=Proposed -->\n',
  );
  fx.write('docs/specs/archived/user-stories/US-021-menu/wireframes/WF-002-etiqueta.md');
});

afterEach(() => {
  fx.dispose();
});

const list = (...args: string[]) => runQueryCommand(registerListCommand, ['list', ...args, '--repo', fx.root]);

describe('list', () => {
  it('por defecto emite cli-list/v1 en TOON con tabla de items y la ventana', async () => {
    const run = await list('--state', 'active');

    expect(run.exitCode).toBe(0);
    expect(run.stdout.split('\n').slice(0, 5)).toEqual([
      'schema: cli-list/v1',
      'command: list',
      'ok: true',
      'data:',
      '  items[3]{id,type,slug,kind,state,path,documentPath,parent}:',
    ]);
    expect(run.stdout).toContain('  total: 3\n  returned: 3\n  offset: 0\n  limit: null');
  });

  it('--with-status añade status con la marca verbatim y null si no hay', async () => {
    const run = await list('WF', '--parent', 'US-021', '--with-status');

    expect(run.stdout).toContain('  items[2]:');
    expect(run.stdout).toContain('      status: Proposed\n');
    expect(run.stdout).toContain('      status: null\n');
  });

  it('JSON: cli-list/v1 con la ventana --limit/--offset', async () => {
    const run = await list('US', '--limit', '1', '--offset', '1', '--output', 'json');
    const body = JSON.parse(run.stdout);

    expect(body).toMatchObject({
      schema: 'cli-list/v1',
      command: 'list',
      ok: true,
      data: { total: 3, returned: 1, offset: 1, limit: 1 },
    });
    expect(body.data.items.map((item: { id: string }) => item.id)).toEqual(['US-010']);
  });

  it('JSON vacío: items [] con código 0', async () => {
    const run = await list('FT', '--output', 'json');

    expect(run.exitCode).toBe(0);
    expect(JSON.parse(run.stdout).data).toEqual({
      items: [],
      total: 0,
      returned: 0,
      offset: 0,
      limit: null,
    });
  });

  it('la misma entrada produce la misma salida byte a byte', async () => {
    const first = await list('--output', 'json');
    const second = await list('--output', 'json');
    expect(second.stdout).toBe(first.stdout);
  });

  it.each([
    [['--state', 'activos'], 'INVALID_FLAG_VALUE'],
    [['--state', 'ACTIVE'], 'INVALID_FLAG_VALUE'],
    [['XX', '--state', 'active'], 'UNKNOWN_ARTIFACT_TYPE'],
    [['--parent', 'US-999'], 'PARENT_NOT_FOUND'],
    [['--limit', '-1'], 'INVALID_FLAG_VALUE'],
    [['--limit', 'abc'], 'INVALID_FLAG_VALUE'],
    [['--offset', '1.5'], 'INVALID_FLAG_VALUE'],
  ])('%j es un ValidationError %s con código 2 y sin listado', async (args, code) => {
    const run = await list(...args, '--output', 'json');

    expect(run.exitCode).toBe(2);
    expect(run.error).toMatchObject({ type: 'ValidationError', exitCode: 2, code });
    expect(run.stdout).toBe('');
  });
});
