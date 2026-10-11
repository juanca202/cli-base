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

const ENABLED = {
  enabled: true,
  provider: 'azure-devops',
  host: 'https://dev.azure.com/acme',
  workspace: 'acme',
  project: 'sdd-platform',
} as const;

describe('nextId — alcance GLOBAL', () => {
  it('toma el máximo de la unión de activos y archivados', async () => {
    for (const name of ['US-001-a', 'US-002-b', 'US-004-d']) {
      touch(`docs/specs/changes/user-stories/${name}/README.md`);
    }
    for (const name of ['US-003-c', 'US-007-g']) {
      touch(`docs/specs/archived/user-stories/${name}/README.md`);
    }

    const result = await run({ type: 'US' });

    expect(result).toEqual({
      next: 'US-008',
      siblings: [
        'docs/specs/archived/user-stories/US-007-g',
        'docs/specs/changes/user-stories/US-004-d',
        'docs/specs/archived/user-stories/US-003-c',
        'docs/specs/changes/user-stories/US-002-b',
        'docs/specs/changes/user-stories/US-001-a',
      ],
      total: 5,
      truncated: false,
      targetPath: 'docs/specs/changes/user-stories/US-008-<slug>',
      projectManagement: { enabled: false },
    });
  });

  it('sin artefactos devuelve <T>-001, sin hermanos y con la ruta destino', async () => {
    const result = await run({ type: 'US' });

    expect(result).toMatchObject({
      next: 'US-001',
      siblings: [],
      total: 0,
      truncated: false,
      targetPath: 'docs/specs/changes/user-stories/US-001-<slug>',
    });
  });

  it('no rellena huecos y lista ambas rutas de un secuencial repetido', async () => {
    touch('docs/specs/changes/user-stories/US-001-a/README.md');
    touch('docs/specs/changes/user-stories/US-004-d/README.md');
    touch('docs/specs/archived/user-stories/US-004-d-anterior/README.md');

    const result = await run({ type: 'US' });

    expect(result.next).toBe('US-005');
    expect(result.siblings).toEqual([
      'docs/specs/archived/user-stories/US-004-d-anterior',
      'docs/specs/changes/user-stories/US-004-d',
      'docs/specs/changes/user-stories/US-001-a',
    ]);
    expect(result.total).toBe(3);
  });

  it('el secuencial tiene mínimo 3 dígitos y admite más', async () => {
    touch('docs/specs/changes/user-stories/US-999-a/README.md');
    expect((await run({ type: 'US' })).next).toBe('US-1000');

    touch('docs/specs/changes/user-stories/US-1042-b/README.md');
    const result = await run({ type: 'US' });
    expect(result.next).toBe('US-1043');
    expect(result.targetPath).toBe('docs/specs/changes/user-stories/US-1043-<slug>');
    expect(result.siblings[0]).toBe('docs/specs/changes/user-stories/US-1042-b');
  });

  it('las entradas no conformes no cuentan ni aparecen ni suben el máximo', async () => {
    touch('docs/specs/changes/user-stories/US-002-z/README.md');
    touch('docs/specs/changes/user-stories/US-10-x/README.md');
    touch('docs/specs/changes/user-stories/us-011-y/README.md');
    touch('docs/specs/changes/user-stories/US-012/README.md');

    const result = await run({ type: 'US' });

    expect(result.next).toBe('US-003');
    expect(result.siblings).toEqual(['docs/specs/changes/user-stories/US-002-z']);
    expect(result.total).toBe(1);
  });

  it('SRS y RQ comparten carpeta sin invadirse', async () => {
    touch('docs/specs/changes/requirements/SRS-001-plataforma/README.md');
    touch('docs/specs/changes/requirements/RQ-005-importacion/README.md');

    const srs = await run({ type: 'SRS' });
    const rq = await run({ type: 'RQ' });

    expect(srs).toMatchObject({
      next: 'SRS-002',
      siblings: ['docs/specs/changes/requirements/SRS-001-plataforma'],
    });
    expect(rq).toMatchObject({
      next: 'RQ-006',
      siblings: ['docs/specs/changes/requirements/RQ-005-importacion'],
    });
  });

  it('FT se numera solo sobre la ruta de features', async () => {
    touch('docs/specs/current/FT-003-x/README.md');

    const result = await run({ type: 'FT' });

    expect(result).toMatchObject({
      next: 'FT-004',
      siblings: ['docs/specs/current/FT-003-x'],
      targetPath: 'docs/specs/current/FT-004-<slug>',
    });
  });

  it('ADR se numera sobre la raíz de arquitectura y su ruta destino es un .md', async () => {
    touch('docs/adr/ADR-002-x.md');

    const result = await run({ type: 'ADR' });

    expect(result).toMatchObject({
      next: 'ADR-003',
      siblings: ['docs/adr/ADR-002-x.md'],
      targetPath: 'docs/adr/ADR-003-<slug>.md',
    });
  });

  it('normaliza la capitalización del tipo', async () => {
    const result = await run({ type: 'us' });
    expect(result.next).toBe('US-001');
  });

  it('rechaza un tipo fuera del catálogo con UNKNOWN_ARTIFACT_TYPE', async () => {
    const error = await failure({ type: 'XX' });
    expect(error.code).toBe('UNKNOWN_ARTIFACT_TYPE');
    expect(error.details).toEqual({ type: 'XX' });
  });
});

describe('nextId — siblings y --limit', () => {
  beforeEach(() => {
    for (const name of ['US-001-a', 'US-002-b', 'US-004-d']) {
      touch(`docs/specs/changes/user-stories/${name}/README.md`);
    }
    touch('docs/specs/archived/user-stories/US-003-c/README.md');
  });

  it('recorta a --limit conservando el total y marca truncated', async () => {
    const result = await run({ type: 'US', limit: 2 });

    expect(result.next).toBe('US-005');
    expect(result.siblings).toEqual([
      'docs/specs/changes/user-stories/US-004-d',
      'docs/specs/archived/user-stories/US-003-c',
    ]);
    expect(result.total).toBe(4);
    expect(result.truncated).toBe(true);
  });

  it('--limit 0 devuelve siblings vacío con el total intacto', async () => {
    const result = await run({ type: 'US', limit: 0 });

    expect(result).toMatchObject({ next: 'US-005', siblings: [], total: 4, truncated: true });
  });

  it('por defecto el límite es 50', async () => {
    for (let n = 5; n <= 60; n += 1) {
      touch(`docs/specs/changes/user-stories/US-${String(n).padStart(3, '0')}-x/README.md`);
    }

    const result = await run({ type: 'US' });

    expect(result.siblings).toHaveLength(50);
    expect(result.total).toBe(60);
    expect(result.truncated).toBe(true);
  });

  it.each([-1, 1.5, Number.NaN])('rechaza --limit %s con INVALID_FLAG_VALUE', async (limit) => {
    const error = await failure({ type: 'US', limit });
    expect(error.code).toBe('INVALID_FLAG_VALUE');
  });
});

describe('nextId — gestor de proyectos', () => {
  beforeEach(() => {
    touch('docs/specs/changes/user-stories/US-1847-a/README.md');
    touch('docs/specs/changes/user-stories/US-1847-a/test-cases/TC-1900-x.md');
    touch('docs/specs/changes/work-items/WI-210-y/README.md');
    touch('docs/specs/changes/requirements/SRS-001-plataforma/README.md');
  });

  it.each([
    ['US', undefined, 'docs/specs/changes/user-stories/<id>-<slug>'],
    ['WI', undefined, 'docs/specs/changes/work-items/<id>-<slug>'],
    ['TC', 'US-1847', 'docs/specs/changes/user-stories/US-1847-a/test-cases/<id>-<slug>.md'],
  ] as const)('%s habilitado: next es null y la ruta lleva <id>', async (type, parent, targetPath) => {
    const query: NextIdQuery =
      parent === undefined
        ? { type, projectManagement: ENABLED }
        : { type, parent, projectManagement: ENABLED };

    const result = await run(query);

    expect(result.next).toBeNull();
    expect(result.targetPath).toBe(targetPath);
    expect(result.projectManagement).toEqual(ENABLED);
    expect(result.total).toBe(1);
  });

  it('los demás tipos conservan el secuencial local', async () => {
    const result = await run({ type: 'SRS', projectManagement: ENABLED });

    expect(result.next).toBe('SRS-002');
    expect(result.projectManagement).toEqual(ENABLED);
  });

  it('deshabilitado calcula el secuencial local de US', async () => {
    const result = await run({ type: 'US', projectManagement: { enabled: false } });

    expect(result.next).toBe('US-1848');
  });
});

describe('nextId — alcance PARENT', () => {
  it('rechaza un padre archivado con ARTIFACT_ARCHIVED en TK y WF', async () => {
    touch('docs/specs/archived/user-stories/US-003-c/README.md');
    touch('docs/specs/archived/user-stories/US-003-c/TK-001-a.md');
    touch('docs/specs/archived/user-stories/US-003-c/wireframes/WF-001-x.md');

    for (const type of ['TK', 'WF'] as const) {
      const error = await failure({ type, parent: 'US-003' });
      expect(error.code).toBe('ARTIFACT_ARCHIVED');
      expect(error.details).toEqual({ type, parent: 'US-003' });
    }
  });

  it('numera un TK bajo una historia activa y no cuenta los de otra', async () => {
    touch('docs/specs/changes/user-stories/US-004-d/README.md');
    touch('docs/specs/changes/user-stories/US-004-d/TK-005-otra.md');
    touch('docs/specs/changes/user-stories/US-001-a/README.md');
    touch('docs/specs/changes/user-stories/US-001-a/TK-001-a.md');
    touch('docs/specs/changes/user-stories/US-001-a/TK-002-b.md');
    touch('docs/specs/changes/user-stories/US-001-a/test-cases/TC-001-x.md');

    const result = await run({ type: 'TK', parent: 'US-001' });

    expect(result).toMatchObject({
      next: 'TK-003',
      siblings: [
        'docs/specs/changes/user-stories/US-001-a/TK-002-b.md',
        'docs/specs/changes/user-stories/US-001-a/TK-001-a.md',
      ],
      total: 2,
      targetPath: 'docs/specs/changes/user-stories/US-001-a/TK-003-<slug>.md',
    });
  });

  it('en una carpeta compartida las entradas no conformes no cuentan', async () => {
    touch('docs/specs/changes/user-stories/US-001-a/README.md');
    touch('docs/specs/changes/user-stories/US-001-a/TK-001-a.md');
    touch('docs/specs/changes/user-stories/US-001-a/TK-2-mal.md');
    touch('docs/specs/changes/user-stories/US-001-a/notas.md');

    const result = await run({ type: 'TK', parent: 'US-001' });

    expect(result.next).toBe('TK-002');
    expect(result.siblings).toEqual(['docs/specs/changes/user-stories/US-001-a/TK-001-a.md']);
  });

  it('WF numera dentro de wireframes/ del padre activo y no cuenta los SVG', async () => {
    touch('docs/specs/changes/user-stories/US-022-equipo/README.md');
    for (const name of [
      'WF-001-lista.md',
      'WF-001-lista.svg',
      'WF-003-team.md',
      'WF-003-team.svg',
      'WF-003-team-miembro.svg',
    ]) {
      touch(`docs/specs/changes/user-stories/US-022-equipo/wireframes/${name}`);
    }

    const byId = await run({ type: 'WF', parent: 'US-022' });
    const byPath = await run({
      type: 'WF',
      parent: 'docs/specs/changes/user-stories/US-022-equipo',
    });

    expect(byId).toMatchObject({
      next: 'WF-004',
      siblings: [
        'docs/specs/changes/user-stories/US-022-equipo/wireframes/WF-003-team.md',
        'docs/specs/changes/user-stories/US-022-equipo/wireframes/WF-001-lista.md',
      ],
      total: 2,
      targetPath: 'docs/specs/changes/user-stories/US-022-equipo/wireframes/WF-004-<slug>.md',
    });
    expect(byPath).toEqual(byId);
  });

  it('WF mal nombrado (.md) dentro de wireframes/ no cuenta', async () => {
    touch('docs/specs/changes/user-stories/US-001-a/README.md');
    touch('docs/specs/changes/user-stories/US-001-a/wireframes/WF-001-ok.md');
    touch('docs/specs/changes/user-stories/US-001-a/wireframes/wf-002-mal.md');

    const result = await run({ type: 'WF', parent: 'US-001' });

    expect(result.next).toBe('WF-002');
    expect(result.total).toBe(1);
  });

  it('WF con wireframes/ inexistente devuelve WF-001 sin crear carpetas', async () => {
    touch('docs/specs/changes/user-stories/US-030-nueva/README.md');

    const result = await run({ type: 'WF', parent: 'US-030' });

    expect(result).toMatchObject({ next: 'WF-001', siblings: [], total: 0, truncated: false });
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

    expect(nested).toMatchObject({ next: 'RS-002' });
    expect(loose).toMatchObject({
      next: 'RS-006',
      siblings: ['docs/specs/archived/research/RS-005-z', 'docs/specs/changes/research/RS-004-y'],
      targetPath: 'docs/specs/changes/research/RS-006-<slug>',
    });
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
      next: 'MD-004',
      siblings: ['docs/architecture/cli/models/MD-003-c.md', 'docs/architecture/cli/models/MD-001-a.md'],
      targetPath: 'docs/architecture/cli/models/MD-004-<slug>.md',
    });
  });

  it('API se numera como archivos de apis/', async () => {
    touch('docs/architecture/cli/apis/API-007-x.md');
    const result = await run({ type: 'API', capability: 'cli' });
    expect(result.next).toBe('API-008');
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
