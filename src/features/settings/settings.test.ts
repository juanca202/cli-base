import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigurationError, ProcessError, ValidationError } from '../../errors.js';
import { ProcessRunner } from '../../process-runner/process-runner.js';
import { findRepositoryRoot } from './infra/git-root.js';
import {
  DEFAULT_ARCHIVED_PATH,
  DEFAULT_CHANGES_PATH,
  DEFAULT_CURRENT_PATH,
  DEFAULT_WORKTREE_PATH,
  normalizeBasePath,
  parseFileSettings,
  resolveSettings,
} from './settings.js';

let dir: string;

function git(cwd: string, ...args: string[]): void {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

function initRepo(path: string): void {
  mkdirSync(path, { recursive: true });
  git(path, 'init', '-q');
}

function writeSettings(repo: string, content: string): void {
  mkdirSync(join(repo, '.sdd-devkit'), { recursive: true });
  writeFileSync(join(repo, '.sdd-devkit', 'settings.json'), content);
}

beforeEach(() => {
  dir = realpathSync(mkdtempSync(join(tmpdir(), 'cli-settings-')));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('resolveSettings', () => {
  it('sin settings.json aplica los valores por defecto', async () => {
    initRepo(dir);
    const settings = await resolveSettings({ repo: dir, cwd: dir });
    expect(settings).toEqual({
      repoRoot: dir,
      changesPath: DEFAULT_CHANGES_PATH,
      currentPath: DEFAULT_CURRENT_PATH,
      archivedPath: DEFAULT_ARCHIVED_PATH,
      archRoot: '.',
      workTreePath: DEFAULT_WORKTREE_PATH,
      projectManagement: { enabled: false },
    });
  });

  it('lee projectManagement habilitado con sus datos de conexión', async () => {
    initRepo(dir);
    const connection = {
      enabled: true,
      provider: 'azure-devops',
      host: 'https://dev.azure.com/acme',
      workspace: 'acme',
      project: 'sdd-platform',
    };
    writeSettings(dir, JSON.stringify({ projectManagement: connection }));
    const settings = await resolveSettings({ repo: dir, cwd: dir });
    expect(settings.projectManagement).toEqual(connection);
  });

  it('projectManagement deshabilitado no exige el resto de sus claves', async () => {
    initRepo(dir);
    writeSettings(dir, JSON.stringify({ projectManagement: { enabled: false } }));
    const settings = await resolveSettings({ repo: dir, cwd: dir });
    expect(settings.projectManagement).toEqual({ enabled: false });
  });

  it.each([
    [{ enabled: 'si' }],
    [{ enabled: true, provider: 'jira' }],
  ])('projectManagement inválido %j es INVALID_SETTINGS', async (projectManagement) => {
    initRepo(dir);
    writeSettings(dir, JSON.stringify({ projectManagement }));
    await expect(resolveSettings({ repo: dir, cwd: dir })).rejects.toMatchObject({
      code: 'INVALID_SETTINGS',
      exitCode: 3,
    });
  });

  it('lee las rutas de settings.json y normaliza barra final y ./', async () => {
    initRepo(dir);
    writeSettings(
      dir,
      JSON.stringify({
        specification: { changesPath: './specs/changes/', archivedPath: 'specs/archived' },
        implementation: { workTreePath: '.wt/' },
      }),
    );
    const settings = await resolveSettings({ repo: dir, cwd: dir });
    expect(settings.changesPath).toBe('specs/changes');
    expect(settings.archivedPath).toBe('specs/archived');
    expect(settings.currentPath).toBe(DEFAULT_CURRENT_PATH);
    expect(settings.workTreePath).toBe('.wt');
  });

  it('los flags tienen precedencia sobre settings.json', async () => {
    initRepo(dir);
    mkdirSync(join(dir, 'otra'));
    writeSettings(dir, JSON.stringify({ specification: { changesPath: 'declarada' } }));
    const settings = await resolveSettings({ repo: dir, cwd: dir, changes: 'otra' });
    expect(settings.changesPath).toBe('otra');
  });

  it('ignora las claves heredadas basePath y archivePath', async () => {
    initRepo(dir);
    writeSettings(dir, JSON.stringify({ basePath: 'viejo', archivePath: 'viejo/archivo' }));
    const settings = await resolveSettings({ repo: dir, cwd: dir });
    expect(settings.changesPath).toBe(DEFAULT_CHANGES_PATH);
    expect(settings.archivedPath).toBe(DEFAULT_ARCHIVED_PATH);
  });

  it('un JSON inválido es INVALID_SETTINGS sin caer a los valores por defecto', async () => {
    initRepo(dir);
    writeSettings(dir, '{ no es json');
    await expect(resolveSettings({ repo: dir, cwd: dir })).rejects.toMatchObject({
      name: 'ConfigurationError',
      code: 'INVALID_SETTINGS',
      exitCode: 3,
    });
  });

  it.each([
    ['raíz que no es objeto', '[]'],
    ['specification que no es objeto', '{"specification": 3}'],
    ['changesPath que no es cadena', '{"specification": {"changesPath": 7}}'],
    ['workTreePath vacío', '{"implementation": {"workTreePath": ""}}'],
  ])('rechaza %s con INVALID_SETTINGS', async (_name, content) => {
    initRepo(dir);
    writeSettings(dir, content);
    const error = await resolveSettings({ repo: dir, cwd: dir }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConfigurationError);
    expect(error).toMatchObject({ code: 'INVALID_SETTINGS' });
  });

  it('una ruta explícita inexistente es BASE_PATH_NOT_FOUND con la ruta relativa en details', async () => {
    initRepo(dir);
    const error = await resolveSettings({ repo: dir, cwd: dir, current: 'no/existe' }).catch(
      (e: unknown) => e,
    );
    expect(error).toMatchObject({
      code: 'BASE_PATH_NOT_FOUND',
      exitCode: 3,
      details: { flag: '--current', path: 'no/existe' },
    });
  });

  it('una ruta explícita absoluta inexistente no expone la ruta en details', async () => {
    initRepo(dir);
    const error = await resolveSettings({
      repo: dir,
      cwd: dir,
      archived: join(dir, 'x'),
    }).catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'BASE_PATH_NOT_FOUND', details: { flag: '--archived' } });
  });

  it('una ruta declarada en settings.json que no existe no es error', async () => {
    initRepo(dir);
    writeSettings(dir, JSON.stringify({ specification: { changesPath: 'no/existe' } }));
    await expect(resolveSettings({ repo: dir, cwd: dir })).resolves.toMatchObject({
      changesPath: 'no/existe',
    });
  });

  it('--repo que no es un repositorio git es NOT_A_GIT_REPOSITORY', async () => {
    const error = await resolveSettings({ repo: dir, cwd: dir }).catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'NOT_A_GIT_REPOSITORY', exitCode: 3 });
  });

  it('--repo inexistente es NOT_A_GIT_REPOSITORY', async () => {
    const error = await resolveSettings({ repo: join(dir, 'nada'), cwd: dir }).catch(
      (e: unknown) => e,
    );
    expect(error).toMatchObject({ code: 'NOT_A_GIT_REPOSITORY' });
  });

  it('sin --repo usa la raíz git del directorio de trabajo', async () => {
    initRepo(dir);
    const sub = join(dir, 'a', 'b');
    mkdirSync(sub, { recursive: true });
    const settings = await resolveSettings({ cwd: sub });
    expect(settings.repoRoot).toBe(dir);
  });

  it('sin --repo desde un submódulo usa el superproyecto', async () => {
    const parent = join(dir, 'parent');
    const child = join(dir, 'child');
    initRepo(parent);
    initRepo(child);
    git(child, '-c', 'user.email=a@b.c', '-c', 'user.name=n', 'commit', '-q', '--allow-empty', '-m', 'x');
    git(parent, '-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', child, 'sub');
    const settings = await resolveSettings({ cwd: join(parent, 'sub') });
    expect(settings.repoRoot).toBe(parent);
  });
});

describe('findRepositoryRoot', () => {
  it('sin git instalado es GIT_UNAVAILABLE (código 5)', async () => {
    initRepo(dir);
    const runner = new ProcessRunner();
    runner.run = () =>
      Promise.reject(
        new ProcessError('no se pudo iniciar git', {
          cause: Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' }),
        }),
      );
    const error = await findRepositoryRoot({ cwd: dir }, runner).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProcessError);
    expect(error).toMatchObject({ code: 'GIT_UNAVAILABLE', exitCode: 5 });
  });

  it('un fallo de git que no es de salida distinta de 0 se propaga tal cual', async () => {
    initRepo(dir);
    const runner = new ProcessRunner();
    const cancelled = new ProcessError('proceso cancelado: git');
    runner.run = () => Promise.reject(cancelled);
    await expect(findRepositoryRoot({ cwd: dir }, runner)).rejects.toBe(cancelled);
  });
});

describe('parseFileSettings y normalizeBasePath', () => {
  it('parseFileSettings de undefined es vacío', () => {
    expect(parseFileSettings(undefined)).toEqual({});
  });

  it('ValidationError no se confunde con ConfigurationError', () => {
    expect(new ValidationError('x')).not.toBeInstanceOf(ConfigurationError);
  });

  it('normalizeBasePath conserva como absoluta una ruta fuera del repositorio', () => {
    expect(normalizeBasePath('/repo', '/otra/ruta/')).toBe('/otra/ruta');
    expect(normalizeBasePath('/repo', '/repo/docs')).toBe('docs');
    expect(normalizeBasePath('/repo', '.')).toBe('.');
  });
});
