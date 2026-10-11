import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFileSystem } from './infra/filesystem.js';
import { buildInventory, type BasePaths } from './inventory.js';
import { nextId, type NextIdQuery } from './next-id.js';

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

async function run(query: NextIdQuery) {
  const fs = createFileSystem(root);
  const { artifacts } = await buildInventory(fs, BASE);
  return nextId({ fs, repoRoot: root, artifacts }, BASE, query);
}

async function failure(query: NextIdQuery): Promise<{ code?: unknown; details?: unknown }> {
  try {
    await run(query);
  } catch (error) {
    return error as { code?: unknown; details?: unknown };
  }
  throw new Error('se esperaba un error');
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'cli-next-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('nextId — alcance GLOBAL', () => {
  it('toma el máximo de la unión de activos y archivados', async () => {
    for (const name of ['US-001-a', 'US-002-b', 'US-004-d']) {
      touch(`docs/specs/changes/user-stories/${name}/README.md`);
    }
    for (const name of ['US-003-c', 'US-007-g']) {
      touch(`docs/specs/archived/user-stories/${name}/README.md`);
    }

    const result = await run({ type: 'US' });

    expect(result).toMatchObject({
      type: 'US',
      nextId: 'US-008',
      sequence: 8,
      highestUsed: 'US-007',
      scope: 'GLOBAL',
      parent: null,
      capability: null,
      scannedPaths: ['docs/specs/changes/user-stories', 'docs/specs/archived/user-stories'],
      usedIds: ['US-001', 'US-002', 'US-003', 'US-004', 'US-007'],
      ignored: [],
    });
  });

  it('sin artefactos devuelve <T>-001 y lista las rutas inexistentes', async () => {
    const result = await run({ type: 'US' });

    expect(result).toMatchObject({
      nextId: 'US-001',
      sequence: 1,
      highestUsed: null,
      usedIds: [],
      scannedPaths: ['docs/specs/changes/user-stories', 'docs/specs/archived/user-stories'],
    });
  });

  it('no rellena huecos y cuenta una vez el secuencial repetido', async () => {
    touch('docs/specs/changes/user-stories/US-001-a/README.md');
    touch('docs/specs/changes/user-stories/US-004-d/README.md');
    touch('docs/specs/archived/user-stories/US-004-d/README.md');

    const result = await run({ type: 'US' });

    expect(result.nextId).toBe('US-005');
    expect(result.usedIds).toEqual(['US-001', 'US-004']);
  });

  it('reporta en ignored los nombres no conformes sin subir el máximo', async () => {
    touch('docs/specs/changes/user-stories/US-002-z/README.md');
    touch('docs/specs/changes/user-stories/US-10-x/README.md');
    touch('docs/specs/changes/user-stories/us-011-y/README.md');
    touch('docs/specs/changes/user-stories/US-012/README.md');

    const result = await run({ type: 'US' });

    expect(result.nextId).toBe('US-003');
    expect(result.usedIds).toEqual(['US-002']);
    expect(result.ignored).toEqual([
      'docs/specs/changes/user-stories/US-012',
      'docs/specs/changes/user-stories/US-10-x',
      'docs/specs/changes/user-stories/us-011-y',
    ]);
  });

  it('SRS y RQ comparten carpeta sin invadirse', async () => {
    touch('docs/specs/changes/requirements/SRS-001-plataforma/README.md');
    touch('docs/specs/changes/requirements/RQ-005-importacion/README.md');

    const srs = await run({ type: 'SRS' });
    const rq = await run({ type: 'RQ' });

    expect(srs).toMatchObject({ nextId: 'SRS-002', usedIds: ['SRS-001'], ignored: [] });
    expect(rq).toMatchObject({ nextId: 'RQ-006', usedIds: ['RQ-005'], ignored: [] });
  });

  it('FT se numera solo sobre la ruta de features', async () => {
    touch('docs/specs/current/FT-003-x/README.md');

    const result = await run({ type: 'FT' });

    expect(result.nextId).toBe('FT-004');
    expect(result.scannedPaths).toEqual(['docs/specs/current']);
  });

  it('ADR se numera sobre la raíz de arquitectura', async () => {
    touch('docs/adr/ADR-002-x.md');

    const result = await run({ type: 'ADR' });

    expect(result).toMatchObject({ nextId: 'ADR-003', scope: 'ARCHITECTURE_ROOT' });
    expect(result.scannedPaths).toEqual(['docs/adr']);
  });

  it('normaliza la capitalización del tipo', async () => {
    const result = await run({ type: 'us' });
    expect(result.type).toBe('US');
  });

  it('rechaza un tipo fuera del catálogo con UNKNOWN_ARTIFACT_TYPE', async () => {
    const error = await failure({ type: 'XX' });
    expect(error.code).toBe('UNKNOWN_ARTIFACT_TYPE');
    expect(error.details).toEqual({ type: 'XX' });
  });
});

describe('nextId — alcance PARENT', () => {
  it('numera un TK dentro de la carpeta archivada de su historia', async () => {
    touch('docs/specs/archived/user-stories/US-003-c/README.md');
    touch('docs/specs/archived/user-stories/US-003-c/TK-001-a.md');
    touch('docs/specs/archived/user-stories/US-003-c/TK-002-b.md');
    touch('docs/specs/archived/user-stories/US-003-c/test-cases/TC-001-x.md');

    const result = await run({ type: 'TK', parent: 'US-003' });

    expect(result).toMatchObject({
      nextId: 'TK-003',
      scope: 'PARENT',
      parent: { id: 'US-003', type: 'US', path: 'docs/specs/archived/user-stories/US-003-c' },
      scannedPaths: ['docs/specs/archived/user-stories/US-003-c'],
      usedIds: ['TK-001', 'TK-002'],
      ignored: [],
    });
  });

  it('en una carpeta compartida solo reporta como no conforme lo que lleva el prefijo del tipo', async () => {
    touch('docs/specs/changes/user-stories/US-001-a/README.md');
    touch('docs/specs/changes/user-stories/US-001-a/TK-001-a.md');
    touch('docs/specs/changes/user-stories/US-001-a/TK-2-mal.md');
    touch('docs/specs/changes/user-stories/US-001-a/notas.md');

    const result = await run({ type: 'TK', parent: 'US-001' });

    expect(result.nextId).toBe('TK-002');
    expect(result.ignored).toEqual(['docs/specs/changes/user-stories/US-001-a/TK-2-mal.md']);
  });

  it('WF numera dentro de wireframes/ del padre e ignora los SVG', async () => {
    touch('docs/specs/archived/user-stories/US-022-equipo/README.md');
    for (const name of [
      'WF-001-lista.md',
      'WF-001-lista.svg',
      'WF-003-team.md',
      'WF-003-team.svg',
      'WF-003-team-miembro.svg',
    ]) {
      touch(`docs/specs/archived/user-stories/US-022-equipo/wireframes/${name}`);
    }

    const byId = await run({ type: 'WF', parent: 'US-022' });
    const byPath = await run({
      type: 'WF',
      parent: 'docs/specs/archived/user-stories/US-022-equipo',
    });

    expect(byId).toMatchObject({
      nextId: 'WF-004',
      highestUsed: 'WF-003',
      scope: 'PARENT',
      scannedPaths: ['docs/specs/archived/user-stories/US-022-equipo/wireframes'],
      usedIds: ['WF-001', 'WF-003'],
      ignored: [],
    });
    expect(byPath).toEqual(byId);
  });

  it('WF mal nombrado (.md) dentro de wireframes/ va a ignored', async () => {
    touch('docs/specs/changes/user-stories/US-001-a/README.md');
    touch('docs/specs/changes/user-stories/US-001-a/wireframes/WF-001-ok.md');
    touch('docs/specs/changes/user-stories/US-001-a/wireframes/wf-002-mal.md');

    const result = await run({ type: 'WF', parent: 'US-001' });

    expect(result.nextId).toBe('WF-002');
    expect(result.ignored).toEqual(['docs/specs/changes/user-stories/US-001-a/wireframes/wf-002-mal.md']);
  });

  it('WF con wireframes/ inexistente devuelve WF-001 sin crear carpetas', async () => {
    touch('docs/specs/changes/user-stories/US-030-nueva/README.md');

    const result = await run({ type: 'WF', parent: 'US-030' });

    expect(result).toMatchObject({ nextId: 'WF-001', highestUsed: null, usedIds: [] });
    expect(() => mkdirSync(join(root, 'docs/specs/changes/user-stories/US-030-nueva/wireframes'))).not.toThrow();
  });

  it.each([
    ['WF', undefined, 'MISSING_PARENT'],
    ['TK', undefined, 'MISSING_PARENT'],
    ['TC', undefined, 'MISSING_PARENT'],
    ['WF', 'FT-001', 'PARENT_NOT_FOUND'],
    ['WF', 'TK-001', 'PARENT_NOT_FOUND'],
    ['WF', 'US-999', 'PARENT_NOT_FOUND'],
    ['TK', 'US-1', 'MALFORMED_ID'],
  ] as const)('%s con --parent %s → %s', async (type, parent, code) => {
    touch('docs/specs/current/FT-001-legado/README.md');
    touch('docs/specs/changes/user-stories/US-001-a/TK-001-a.md');
    touch('docs/specs/changes/user-stories/US-001-a/README.md');

    const query: NextIdQuery = parent === undefined ? { type } : { type, parent };
    const error = await failure(query);

    expect(error.code).toBe(code);
  });

  it('MISSING_PARENT lleva type y scope en details', async () => {
    const error = await failure({ type: 'TK' });
    expect(error.details).toEqual({ type: 'TK', scope: 'PARENT' });
  });

  it('RS con padre numera su research/; sin padre, el global', async () => {
    touch('docs/specs/changes/user-stories/US-001-a/README.md');
    touch('docs/specs/changes/user-stories/US-001-a/research/RS-001-x/README.md');
    touch('docs/specs/changes/research/RS-004-y/README.md');
    touch('docs/specs/archived/research/RS-005-z/README.md');

    const nested = await run({ type: 'RS', parent: 'US-001' });
    const loose = await run({ type: 'RS' });

    expect(nested).toMatchObject({ nextId: 'RS-002', scope: 'PARENT' });
    expect(loose).toMatchObject({ nextId: 'RS-006', usedIds: ['RS-004', 'RS-005'] });
  });

  it('rechaza --parent en un tipo que no es de alcance PARENT', async () => {
    touch('docs/specs/changes/user-stories/US-001-a/README.md');
    const error = await failure({ type: 'US', parent: 'US-001' });
    expect(error.code).toBe('INVALID_FLAG_COMBINATION');
  });
});

describe('nextId — alcance CAPABILITY', () => {
  it('numera MD dentro de models/ de la capability', async () => {
    touch('docs/architecture/cli/models/MD-001-a.md');
    touch('docs/architecture/cli/models/MD-003-c.md');
    touch('docs/architecture/core/models/MD-009-z.md');

    const result = await run({ type: 'MD', capability: 'cli' });

    expect(result).toMatchObject({
      nextId: 'MD-004',
      scope: 'CAPABILITY',
      capability: 'cli',
      scannedPaths: ['docs/architecture/cli/models'],
    });
  });

  it('API se numera como archivos de apis/', async () => {
    touch('docs/architecture/cli/apis/API-007-x.md');
    const result = await run({ type: 'API', capability: 'cli' });
    expect(result.nextId).toBe('API-008');
  });

  it('sin --capability es MISSING_CAPABILITY; inexistente es CAPABILITY_NOT_FOUND', async () => {
    touch('docs/architecture/cli/models/MD-001-a.md');
    expect((await failure({ type: 'MD' })).code).toBe('MISSING_CAPABILITY');
    expect((await failure({ type: 'MD', capability: 'nada' })).code).toBe('CAPABILITY_NOT_FOUND');
  });

  it('rechaza --capability en un tipo que no es de alcance CAPABILITY', async () => {
    touch('docs/architecture/cli/models/MD-001-a.md');
    const error = await failure({ type: 'US', capability: 'cli' });
    expect(error.code).toBe('INVALID_FLAG_COMBINATION');
  });
});
