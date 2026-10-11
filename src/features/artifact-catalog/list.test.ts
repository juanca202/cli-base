import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFileSystem } from './infra/filesystem.js';
import { buildInventory, type BasePaths } from './inventory.js';
import { listArtifacts, type ListQuery } from './list.js';

const BASE: BasePaths = {
  changesPath: 'docs/specs/changes',
  currentPath: 'docs/specs/current',
  archivedPath: 'docs/specs/archived',
  archRoot: '.',
};

let root: string;

function write(path: string, content = ''): void {
  const absolute = join(root, path);
  mkdirSync(join(absolute, '..'), { recursive: true });
  writeFileSync(absolute, content);
}

async function run(query: ListQuery = {}) {
  const fs = createFileSystem(root);
  const { artifacts } = await buildInventory(fs, BASE);
  return listArtifacts({ fs, repoRoot: root, artifacts }, query);
}

async function failureCode(query: ListQuery): Promise<unknown> {
  try {
    await run(query);
  } catch (error) {
    return (error as { code?: unknown }).code;
  }
  throw new Error('se esperaba un error');
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'cli-list-'));
  write('docs/specs/changes/requirements/SRS-001-plataforma/README.md');
  write('docs/specs/changes/user-stories/US-001-alta/README.md', '<!-- us:status=Draft -->\n');
  write('docs/specs/changes/user-stories/US-001-alta/TK-001-modelo.md');
  write('docs/specs/changes/user-stories/US-001-alta/test-cases/TC-001-alta-happy.md');
  write('docs/specs/changes/user-stories/US-001-alta/wireframes/WF-001-formulario.md', '<!-- wireframe:review-status=Proposed -->\n');
  write('docs/specs/changes/user-stories/US-001-alta/wireframes/WF-001-formulario.svg');
  write('docs/specs/changes/work-items/WI-002-refactor/README.md');
  write('docs/specs/archived/user-stories/US-003-baja/README.md');
  write('docs/specs/archived/user-stories/US-003-baja/TK-001-borrado.md');
  write('docs/specs/archived/user-stories/US-003-baja/wireframes/WF-001-confirmacion.md');
  write('docs/specs/archived/work-items/WI-001-viejo/README.md');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('listArtifacts', () => {
  it('--state active es el índice de activos, sin hijos de archivados, en orden del catálogo', async () => {
    const result = await run({ state: 'active' });

    expect(result.items.map((item) => item.id)).toEqual([
      'SRS-001',
      'US-001',
      'TK-001',
      'WI-002',
      'TC-001',
      'WF-001',
    ]);
    expect(result.items.every((item) => item.state === 'ACTIVE')).toBe(true);
    expect(result.items.some((item) => item.path.includes('archived'))).toBe(false);
    expect(result).toMatchObject({ total: 6, returned: 6, offset: 0, limit: null });
    expect(result.items[2]?.parent).toEqual({
      id: 'US-001',
      type: 'US',
      path: 'docs/specs/changes/user-stories/US-001-alta',
    });
    expect(result.items[0]?.parent).toBeNull();
  });

  it('por defecto el estado es all y cada fila lleva su propio state', async () => {
    const result = await run({ type: 'tk' });

    expect(result.items.map((item) => [item.path, item.state])).toEqual([
      ['docs/specs/archived/user-stories/US-003-baja/TK-001-borrado.md', 'ARCHIVED'],
      ['docs/specs/changes/user-stories/US-001-alta/TK-001-modelo.md', 'ACTIVE'],
    ]);
  });

  it('--parent restringe al subárbol; un padre archivado no tiene hijos activos', async () => {
    const active = await run({ parent: 'US-003', state: 'active' });
    expect(active).toMatchObject({ items: [], total: 0, returned: 0 });

    const all = await run({ parent: 'US-003', state: 'all' });
    expect(all.items.map((item) => [item.id, item.state])).toEqual([
      ['TK-001', 'ARCHIVED'],
      ['WF-001', 'ARCHIVED'],
    ]);
  });

  it('el SVG hermano de un wireframe no es una entrada', async () => {
    const result = await run({ type: 'WF', state: 'active' });
    expect(result.items).toHaveLength(1);
  });

  it('--with-status lee la marca oculta verbatim y null si no hay', async () => {
    const wf = await run({ type: 'WF', parent: 'US-001', withStatus: true });
    expect(wf.items[0]?.status).toBe('Proposed');

    const us = await run({ type: 'US', withStatus: true, state: 'all' });
    expect(us.items.map((item) => [item.id, item.status])).toEqual([
      ['US-001', 'Draft'],
      ['US-003', null],
    ]);
  });

  it('sin --with-status los items no llevan status', async () => {
    const result = await run({ type: 'US' });
    expect(result.items.every((item) => !('status' in item))).toBe(true);
  });

  it('la ventana --limit/--offset se aplica sobre el resultado ya ordenado', async () => {
    const result = await run({ state: 'active', limit: 2, offset: 1 });

    expect(result.items.map((item) => item.id)).toEqual(['US-001', 'TK-001']);
    expect(result).toMatchObject({ total: 6, returned: 2, offset: 1, limit: 2 });
  });

  it('offset más allá del total devuelve una ventana vacía', async () => {
    const result = await run({ state: 'active', offset: 50 });
    expect(result).toMatchObject({ items: [], total: 6, returned: 0, offset: 50, limit: null });
  });

  it('repositorio vacío devuelve un listado vacío con código 0', async () => {
    rmSync(join(root, 'docs'), { recursive: true });
    expect(await run({ state: 'active' })).toMatchObject({ items: [], total: 0 });
  });

  it('incluye FT y elementos de arquitectura como activos', async () => {
    write('docs/specs/current/FT-001-legado/README.md');
    write('docs/adr/ADR-001-x.md', '---\nstatus: Accepted\n---\n');
    write('docs/architecture/ventas/models/MD-001-m.md');
    write('docs/architecture/ventas/apis/API-002-a.md', '# API-002 (Obsoleto)\n');

    const result = await run({ state: 'active', withStatus: true });
    const ids = result.items.map((item) => item.id);
    expect(ids).toEqual(
      expect.arrayContaining(['FT-001', 'ADR-001', 'MD-001', 'API-002']),
    );
    expect(ids.indexOf('FT-001')).toBeGreaterThan(ids.indexOf('WI-002'));
    expect(ids.indexOf('ADR-001')).toBeGreaterThan(ids.indexOf('WF-001'));
    expect(result.items.find((item) => item.id === 'ADR-001')?.status).toBe('Accepted');
    expect(result.items.find((item) => item.id === 'MD-001')?.status).toBeNull();

    const md = await run({ type: 'MD', capability: 'ventas', state: 'active' });
    expect(md.items.map((item) => item.id)).toEqual(['MD-001']);
  });

  it.each([
    [{ state: 'activos' }, 'INVALID_FLAG_VALUE'],
    [{ state: 'ACTIVE' }, 'INVALID_FLAG_VALUE'],
    [{ type: 'XX', state: 'active' }, 'UNKNOWN_ARTIFACT_TYPE'],
    [{ parent: 'US-999', state: 'active' }, 'PARENT_NOT_FOUND'],
    [{ capability: 'nada' }, 'CAPABILITY_NOT_FOUND'],
    [{ limit: -1 }, 'INVALID_FLAG_VALUE'],
    [{ offset: 1.5 }, 'INVALID_FLAG_VALUE'],
  ] as const)('rechaza %j con %s', async (query, code) => {
    expect(await failureCode(query as ListQuery)).toBe(code);
  });
});
