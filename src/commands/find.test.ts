import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createRepoFixture,
  runQueryCommand,
  type RepoFixture,
} from '../test-support/query-command.js';
import { registerFindCommand } from './find.js';

let fx: RepoFixture;

beforeEach(async () => {
  fx = await createRepoFixture();
  fx.write('docs/specs/changes/user-stories/US-010-cli/README.md');
  fx.write('docs/specs/changes/user-stories/US-010-cli/TK-001-a.md');
  fx.write('docs/specs/archived/user-stories/US-021-menu/README.md');
  fx.write('docs/specs/archived/user-stories/US-021-menu/wireframes/WF-001-menu.md');
  fx.write('docs/specs/archived/work-items/WI-029-caja/README.md');
  fx.write('docs/specs/archived/work-items/WI-029-caja/wireframes/WF-001-caja.md');
});

afterEach(() => {
  fx.dispose();
});

const find = (...args: string[]) => runQueryCommand(registerFindCommand, ['find', ...args, '--repo', fx.root]);

describe('find', () => {
  it('por defecto emite el envolvente cli-find/v1 en TOON con una tabla de coincidencias', async () => {
    const run = await find('US-010');

    expect(run.exitCode).toBe(0);
    expect(run.stdout.split('\n').slice(0, 5)).toEqual([
      'schema: cli-find/v1',
      'command: find',
      'ok: true',
      'data:',
      '  matches[1]{id,type,slug,kind,state,path,documentPath,parent}:',
    ]);
    expect(run.stdout).toContain(
      '    US-010,US,cli,directory,ACTIVE,docs/specs/changes/user-stories/US-010-cli,docs/specs/changes/user-stories/US-010-cli/README.md,null',
    );
    expect(run.stdout).toContain('  total: 1');
  });

  it('un wireframe sin --parent devuelve todas sus coincidencias', async () => {
    const run = await find('WF-001');

    const body = JSON.parse((await find('WF-001', '--output', 'json')).stdout);
    expect(body.data.matches.map((ref: { path: string }) => ref.path)).toEqual([
      'docs/specs/archived/user-stories/US-021-menu/wireframes/WF-001-menu.md',
      'docs/specs/archived/work-items/WI-029-caja/wireframes/WF-001-caja.md',
    ]);
    // `parent` es un objeto: las coincidencias de un WF van como lista, no como tabla.
    expect(run.stdout).toContain('  matches[2]:');
    expect(run.stdout).toContain('        id: US-021');
  });

  it('--parent deja solo la coincidencia del padre', async () => {
    const run = await find('WF-001', '--parent', 'US-021', '--output', 'json');

    expect(JSON.parse(run.stdout).data.total).toBe(1);
  });

  it('sin coincidencias es matches vacío en TOON y sale con 0', async () => {
    const run = await find('us-042');

    expect(run.exitCode).toBe(0);
    expect(run.stdout).toBe(
      'schema: cli-find/v1\ncommand: find\nok: true\ndata:\n  matches[0]:\n  total: 0\n',
    );
  });

  it('sin coincidencias en JSON es matches vacío con ok true', async () => {
    const run = await find('US-042', '--state', 'active', '--output', 'json');

    expect(JSON.parse(run.stdout)).toEqual({
      schema: 'cli-find/v1',
      command: 'find',
      ok: true,
      data: { total: 0, matches: [] },
    });
  });

  it('JSON: cada coincidencia lleva la forma de ArtifactRef', async () => {
    const run = await find('US-010', '--output', 'json');

    expect(JSON.parse(run.stdout).data.matches).toEqual([
      {
        id: 'US-010',
        type: 'US',
        slug: 'cli',
        kind: 'directory',
        state: 'ACTIVE',
        path: 'docs/specs/changes/user-stories/US-010-cli',
        documentPath: 'docs/specs/changes/user-stories/US-010-cli/README.md',
        parent: null,
      },
    ]);
  });

  it('--state restringe a activos o archivados', async () => {
    const archived = await find('US-010', '--state', 'archived', '--output', 'json');
    expect(JSON.parse(archived.stdout).data.total).toBe(0);
  });

  it.each([
    [['US-1'], 'MALFORMED_ID'],
    [['BUG-001'], 'UNKNOWN_ARTIFACT_TYPE'],
    [['US-010', '--state', 'todos'], 'INVALID_FLAG_VALUE'],
    [['TK-001', '--parent', 'US-999'], 'PARENT_NOT_FOUND'],
    [['MD-001', '--capability', 'nada'], 'CAPABILITY_NOT_FOUND'],
  ])('%j es un ValidationError %s con código 2', async (args, code) => {
    const run = await find(...args);

    expect(run.exitCode).toBe(2);
    expect(run.error).toMatchObject({ type: 'ValidationError', code });
  });
});
