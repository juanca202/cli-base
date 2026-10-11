import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createRepoFixture,
  runQueryCommand,
  type RepoFixture,
} from '../test-support/query-command.js';
import { registerNextCommand } from './next.js';

let fx: RepoFixture;

beforeEach(async () => {
  fx = await createRepoFixture();
});

afterEach(() => {
  fx.dispose();
});

const next = (...args: string[]) => runQueryCommand(registerNextCommand, ['next', ...args, '--repo', fx.root]);

describe('next', () => {
  it('modo humano: el identificador va solo en la primera línea', async () => {
    fx.write('docs/specs/changes/user-stories/US-023-x/README.md');

    const run = await next('US');

    expect(run.exitCode).toBe(0);
    expect(run.stdout).toBe(
      [
        'US-024',
        'tipo: US · alcance: GLOBAL · máximo ocupado: US-023',
        'rutas consultadas: docs/specs/changes/user-stories, docs/specs/archived/user-stories',
        '',
      ].join('\n'),
    );
  });

  it('modo humano de un WF muestra el padre', async () => {
    fx.write('docs/specs/archived/user-stories/US-022-equipo/README.md');
    fx.write('docs/specs/archived/user-stories/US-022-equipo/wireframes/WF-003-team.md');

    const run = await next('WF', '--parent', 'US-022');

    expect(run.stdout.split('\n').slice(0, 3)).toEqual([
      'WF-004',
      'tipo: WF · alcance: PARENT · padre: US-022 · máximo ocupado: WF-003',
      'rutas consultadas: docs/specs/archived/user-stories/US-022-equipo/wireframes',
    ]);
  });

  it('lista las entradas no conformes en modo humano', async () => {
    fx.write('docs/specs/changes/user-stories/US-10-x/README.md');

    const run = await next('US');

    expect(run.stdout).toContain('entradas no conformes: docs/specs/changes/user-stories/US-10-x');
  });

  it('--output json emite la envolvente cli-next/v1 en una línea', async () => {
    fx.write('docs/specs/changes/user-stories/US-001-a/README.md');

    const run = await next('us', '--output', 'json');

    expect(run.stdout.endsWith('\n')).toBe(true);
    expect(JSON.parse(run.stdout)).toEqual({
      schema: 'cli-next/v1',
      command: 'next',
      ok: true,
      data: {
        type: 'US',
        nextId: 'US-002',
        sequence: 2,
        highestUsed: 'US-001',
        scope: 'GLOBAL',
        parent: null,
        capability: null,
        scannedPaths: ['docs/specs/changes/user-stories', 'docs/specs/archived/user-stories'],
        usedIds: ['US-001'],
        ignored: [],
      },
    });
  });

  it('la misma entrada produce la misma salida byte a byte', async () => {
    fx.write('docs/specs/changes/user-stories/US-001-a/README.md');
    fx.write('docs/specs/archived/user-stories/US-005-e/README.md');

    const first = await next('US', '--output', 'json');
    const second = await next('US', '--output', 'json');

    expect(second.stdout).toBe(first.stdout);
  });

  it.each([
    [['XX'], 'UNKNOWN_ARTIFACT_TYPE'],
    [['TK'], 'MISSING_PARENT'],
    [['WF', '--parent', 'US-999'], 'PARENT_NOT_FOUND'],
    [['MD'], 'MISSING_CAPABILITY'],
    [['MD', '--capability', 'nada'], 'CAPABILITY_NOT_FOUND'],
  ])('%j es un ValidationError %s con código 2', async (args, code) => {
    const run = await next(...args);

    expect(run.exitCode).toBe(2);
    expect(run.error).toMatchObject({ type: 'ValidationError', exitCode: 2, code });
    expect(run.stdout).toBe('');
  });

  it('una ruta raíz explícita inexistente es ConfigurationError con código 3', async () => {
    const run = await next('US', '--archived', 'docs/no-existe');

    expect(run.exitCode).toBe(3);
    expect(run.error).toMatchObject({ type: 'ConfigurationError', code: 'BASE_PATH_NOT_FOUND' });
  });

  it('un directorio que no es repositorio git es ConfigurationError con código 3', async () => {
    const run = await runQueryCommand(registerNextCommand, ['next', 'US', '--repo', '/no/existe/jamas']);

    expect(run.exitCode).toBe(3);
  });
});
