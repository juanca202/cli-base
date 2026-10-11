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

const SETTINGS_ENABLED = JSON.stringify({
  projectManagement: {
    enabled: true,
    provider: 'azure-devops',
    host: 'https://dev.azure.com/acme',
    workspace: 'acme',
    project: 'sdd-platform',
  },
});

describe('next', () => {
  it('modo humano: el identificador va solo en la primera línea', async () => {
    fx.write('docs/specs/changes/user-stories/US-023-x/README.md');
    fx.write('docs/specs/archived/user-stories/US-022-y/README.md');

    const run = await next('US');

    expect(run.exitCode).toBe(0);
    expect(run.stdout).toBe(
      [
        'US-024',
        'ruta destino: docs/specs/changes/user-stories/US-024-<slug>',
        'hermanos: 2',
        '  docs/specs/changes/user-stories/US-023-x',
        '  docs/specs/archived/user-stories/US-022-y',
        'gestor de proyectos: deshabilitado',
        '',
      ].join('\n'),
    );
  });

  it('modo humano indica cuántos hermanos se muestran cuando hay recorte', async () => {
    for (const n of ['001', '002', '003']) {
      fx.write(`docs/specs/changes/user-stories/US-${n}-x/README.md`);
    }

    const run = await next('US', '--limit', '2');

    expect(run.stdout.split('\n').slice(0, 5)).toEqual([
      'US-004',
      'ruta destino: docs/specs/changes/user-stories/US-004-<slug>',
      'hermanos: 3 (se muestran 2, de mayor a menor)',
      '  docs/specs/changes/user-stories/US-003-x',
      '  docs/specs/changes/user-stories/US-002-x',
    ]);
  });

  it('modo humano de un WF muestra la ruta destino y sus hermanos', async () => {
    fx.write('docs/specs/changes/user-stories/US-022-equipo/README.md');
    fx.write('docs/specs/changes/user-stories/US-022-equipo/wireframes/WF-003-team.md');

    const run = await next('WF', '--parent', 'US-022');

    expect(run.stdout.split('\n').slice(0, 4)).toEqual([
      'WF-004',
      'ruta destino: docs/specs/changes/user-stories/US-022-equipo/wireframes/WF-004-<slug>.md',
      'hermanos: 1',
      '  docs/specs/changes/user-stories/US-022-equipo/wireframes/WF-003-team.md',
    ]);
  });

  it('con el gestor habilitado la primera línea no es un identificador', async () => {
    fx.write('.sdd-devkit/settings.json', SETTINGS_ENABLED);
    fx.write('docs/specs/changes/user-stories/US-1847-a/README.md');

    const run = await next('US');

    expect(run.stdout).toBe(
      [
        'id: lo asigna el gestor de proyectos',
        'ruta destino: docs/specs/changes/user-stories/<id>-<slug>',
        'hermanos: 1',
        '  docs/specs/changes/user-stories/US-1847-a',
        'gestor de proyectos: azure-devops (acme/sdd-platform)',
        '',
      ].join('\n'),
    );
  });

  it('--output json emite la envolvente cli-next/v1 con MD-005 en data', async () => {
    fx.write('docs/specs/changes/user-stories/US-001-a/README.md');

    const run = await next('us', '--output', 'json');

    expect(run.stdout.endsWith('\n')).toBe(true);
    expect(run.stdout.trimEnd().split('\n')).toHaveLength(1);
    expect(JSON.parse(run.stdout)).toEqual({
      schema: 'cli-next/v1',
      command: 'next',
      ok: true,
      data: {
        next: 'US-002',
        siblings: ['docs/specs/changes/user-stories/US-001-a'],
        total: 1,
        truncated: false,
        targetPath: 'docs/specs/changes/user-stories/US-002-<slug>',
        projectManagement: { enabled: false },
      },
    });
  });

  it('--output json con el gestor habilitado devuelve next null y los datos de conexión', async () => {
    fx.write('.sdd-devkit/settings.json', SETTINGS_ENABLED);

    const run = await next('WI', '--output', 'json');

    expect(JSON.parse(run.stdout).data).toEqual({
      next: null,
      siblings: [],
      total: 0,
      truncated: false,
      targetPath: 'docs/specs/changes/work-items/<id>-<slug>',
      projectManagement: {
        enabled: true,
        provider: 'azure-devops',
        host: 'https://dev.azure.com/acme',
        workspace: 'acme',
        project: 'sdd-platform',
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
    [['US', '--limit', '-1'], 'INVALID_FLAG_VALUE'],
    [['US', '--limit', 'abc'], 'INVALID_FLAG_VALUE'],
  ])('%j es un ValidationError %s con código 2', async (args, code) => {
    const run = await next(...args);

    expect(run.exitCode).toBe(2);
    expect(run.error).toMatchObject({ type: 'ValidationError', exitCode: 2, code });
    expect(run.stdout).toBe('');
  });

  it('un padre archivado es ARTIFACT_ARCHIVED con código 2 y no crea nada', async () => {
    fx.write('docs/specs/archived/user-stories/US-003-c/README.md');

    const run = await next('TK', '--parent', 'US-003');

    expect(run.exitCode).toBe(2);
    expect(run.error).toMatchObject({ type: 'ValidationError', code: 'ARTIFACT_ARCHIVED' });
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
