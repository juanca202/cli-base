import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFileSystem } from './infra/filesystem.js';
import { buildInventory, type BasePaths } from './inventory.js';
import { locateById, resolveCapability, resolveParent, type LocateContext } from './locate.js';

const BASE: BasePaths = {
  changesPath: 'docs/specs/changes',
  currentPath: 'docs/specs/current',
  archivedPath: 'docs/specs/archived',
  archRoot: '.',
};

let root: string;

function touch(path: string): void {
  const absolute = join(root, path);
  mkdirSync(join(absolute, '..'), { recursive: true });
  writeFileSync(absolute, '');
}

async function context(): Promise<LocateContext> {
  const fs = createFileSystem(root);
  const { artifacts } = await buildInventory(fs, BASE);
  return { fs, repoRoot: root, artifacts };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'cli-locate-'));
  touch('docs/specs/changes/user-stories/US-010-cli/README.md');
  touch('docs/specs/changes/user-stories/US-010-cli/TK-001-a.md');
  touch('docs/specs/changes/work-items/WI-001-w/README.md');
  touch('docs/specs/changes/work-items/WI-001-w/test-cases/TC-001-w.md');
  touch('docs/specs/archived/user-stories/US-002-v/README.md');
  touch('docs/specs/archived/user-stories/US-002-v/TK-001-v.md');
  touch('docs/architecture/cli/models/MD-001-m.md');
  touch('docs/architecture/core/models/MD-001-n.md');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('locateById', () => {
  it('devuelve todas las coincidencias en activo y archivo', async () => {
    const matches = await locateById(await context(), { id: 'TK-001' });
    expect(matches.map((m) => m.path)).toEqual([
      'docs/specs/archived/user-stories/US-002-v/TK-001-v.md',
      'docs/specs/changes/user-stories/US-010-cli/TK-001-a.md',
    ]);
  });

  it('sin coincidencias devuelve [] (no es un error)', async () => {
    expect(await locateById(await context(), { id: 'US-042' })).toEqual([]);
  });

  it('normaliza la capitalización del prefijo', async () => {
    const matches = await locateById(await context(), { id: 'us-010' });
    expect(matches.map((m) => m.id)).toEqual(['US-010']);
  });

  it('filtra por estado', async () => {
    const active = await locateById(await context(), { id: 'TK-001', state: 'active' });
    expect(active.map((m) => m.state)).toEqual(['ACTIVE']);
    const archived = await locateById(await context(), { id: 'TK-001', state: 'archived' });
    expect(archived.map((m) => m.state)).toEqual(['ARCHIVED']);
  });

  it('restringe por padre (id o ruta)', async () => {
    const byId = await locateById(await context(), { id: 'TK-001', parent: 'US-010' });
    expect(byId.map((m) => m.path)).toEqual([
      'docs/specs/changes/user-stories/US-010-cli/TK-001-a.md',
    ]);
    const byPath = await locateById(await context(), {
      id: 'TC-001',
      parent: 'docs/specs/changes/work-items/WI-001-w/',
    });
    expect(byPath).toHaveLength(1);
  });

  it('restringe por capability', async () => {
    const matches = await locateById(await context(), { id: 'MD-001', capability: 'core' });
    expect(matches.map((m) => m.path)).toEqual(['docs/architecture/core/models/MD-001-n.md']);
    expect(await locateById(await context(), { id: 'MD-001' })).toHaveLength(2);
  });

  it('un id mal formado o con prefijo desconocido es error de validación', async () => {
    await expect(locateById(await context(), { id: 'US-1' })).rejects.toMatchObject({
      code: 'MALFORMED_ID',
    });
    await expect(locateById(await context(), { id: 'QQ-001' })).rejects.toMatchObject({
      code: 'UNKNOWN_ARTIFACT_TYPE',
    });
  });

  it('un padre inexistente es PARENT_NOT_FOUND', async () => {
    await expect(
      locateById(await context(), { id: 'TK-001', parent: 'US-099' }),
    ).rejects.toMatchObject({ code: 'PARENT_NOT_FOUND', exitCode: 2 });
  });

  it('una capability inexistente es CAPABILITY_NOT_FOUND', async () => {
    await expect(
      locateById(await context(), { id: 'MD-001', capability: 'nada' }),
    ).rejects.toMatchObject({ code: 'CAPABILITY_NOT_FOUND', exitCode: 2 });
  });
});

describe('resolveParent', () => {
  it('acepta id, carpeta, documento y ruta absoluta dentro del repositorio', async () => {
    const ctx = await context();
    const expected = 'docs/specs/changes/user-stories/US-010-cli';
    expect(resolveParent(ctx, 'US-010', ['US']).path).toBe(expected);
    expect(resolveParent(ctx, `${expected}/`, ['US']).path).toBe(expected);
    expect(resolveParent(ctx, `./${expected}/README.md`, ['US']).path).toBe(expected);
    expect(resolveParent(ctx, join(root, expected), ['US']).path).toBe(expected);
  });

  it('un artefacto de un tipo fuera de parentTypes es PARENT_NOT_FOUND', async () => {
    expect(() => resolveParent({ ...{ artifacts: [], repoRoot: root } }, 'US-010', ['US'])).toThrowError(
      expect.objectContaining({ code: 'PARENT_NOT_FOUND' }),
    );
    const ctx = await context();
    expect(() => resolveParent(ctx, 'WI-001', ['US'])).toThrowError(
      expect.objectContaining({ code: 'PARENT_NOT_FOUND', details: { parent: 'WI-001', parentTypes: ['US'] } }),
    );
  });

  it('un padre mal formado es MALFORMED_ID', async () => {
    const ctx = await context();
    expect(() => resolveParent(ctx, 'US-1', ['US'])).toThrowError(
      expect.objectContaining({ code: 'MALFORMED_ID' }),
    );
  });

  it('un id repetido (activo y archivado) es ambiguo y pide la ruta', async () => {
    touch('docs/specs/archived/user-stories/US-010-copia/README.md');
    const ctx = await context();
    expect(() => resolveParent(ctx, 'US-010', ['US'])).toThrowError(
      expect.objectContaining({ code: 'INVALID_FLAG_VALUE', details: { parent: 'US-010', matches: 2 } }),
    );
    expect(
      resolveParent(ctx, 'docs/specs/archived/user-stories/US-010-copia', ['US']).state,
    ).toBe('ARCHIVED');
  });
});

describe('resolveCapability', () => {
  it('acepta una capability existente', async () => {
    const { fs } = await context();
    await expect(resolveCapability(fs, 'cli')).resolves.toBe('cli');
  });

  it.each(['', 'nada', 'a/b', '.oculta'])('rechaza %j', async (name) => {
    const { fs } = await context();
    await expect(resolveCapability(fs, name)).rejects.toMatchObject({
      code: 'CAPABILITY_NOT_FOUND',
    });
  });
});
