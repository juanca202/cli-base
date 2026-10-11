import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFileSystem, type RepositoryFileSystem } from './infra/filesystem.js';
import { buildInventory, filterArtifacts, foldersFor, joinPosix, type BasePaths } from './inventory.js';
import { getDescriptor } from './catalog.js';

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

function dir(path: string): void {
  mkdirSync(join(root, path), { recursive: true });
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'cli-inventory-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('buildInventory', () => {
  it('un repositorio vacío no aporta entradas', async () => {
    const inventory = await buildInventory(createFileSystem(root), BASE);
    expect(inventory).toEqual({ artifacts: [], ignored: [] });
  });

  it('lista activos y archivados con padre, estado heredado y documentPath', async () => {
    touch('docs/specs/changes/user-stories/US-010-cli/README.md');
    touch('docs/specs/changes/user-stories/US-010-cli/TK-001-base.md');
    touch('docs/specs/changes/user-stories/US-010-cli/test-cases/TC-001-uno.md');
    touch('docs/specs/changes/user-stories/US-010-cli/wireframes/WF-001-pantalla.md');
    touch('docs/specs/changes/user-stories/US-010-cli/wireframes/WF-001-pantalla.svg');
    touch('docs/specs/archived/user-stories/US-002-vieja/README.md');
    touch('docs/specs/archived/user-stories/US-002-vieja/TK-001-vieja.md');
    touch('docs/specs/current/FT-001-feature/README.md');
    touch('docs/specs/current/FT-001-feature/test-cases/TC-001-ft.md');
    touch('docs/adr/ADR-001-decision.md');
    touch('docs/architecture/cli/models/MD-001-modelo.md');

    const { artifacts, ignored } = await buildInventory(createFileSystem(root), BASE);

    expect(artifacts.map((a) => `${a.id}|${a.state}|${a.path}`)).toEqual([
      'US-002|ARCHIVED|docs/specs/archived/user-stories/US-002-vieja',
      'US-010|ACTIVE|docs/specs/changes/user-stories/US-010-cli',
      'TK-001|ARCHIVED|docs/specs/archived/user-stories/US-002-vieja/TK-001-vieja.md',
      'TK-001|ACTIVE|docs/specs/changes/user-stories/US-010-cli/TK-001-base.md',
      'FT-001|ACTIVE|docs/specs/current/FT-001-feature',
      'TC-001|ACTIVE|docs/specs/changes/user-stories/US-010-cli/test-cases/TC-001-uno.md',
      'TC-001|ACTIVE|docs/specs/current/FT-001-feature/test-cases/TC-001-ft.md',
      'WF-001|ACTIVE|docs/specs/changes/user-stories/US-010-cli/wireframes/WF-001-pantalla.md',
      'ADR-001|ACTIVE|docs/adr/ADR-001-decision.md',
      'MD-001|ACTIVE|docs/architecture/cli/models/MD-001-modelo.md',
    ]);
    expect(ignored).toEqual([]);

    const us = artifacts.find((a) => a.id === 'US-010');
    expect(us).toMatchObject({
      slug: 'cli',
      kind: 'directory',
      documentPath: 'docs/specs/changes/user-stories/US-010-cli/README.md',
      parent: null,
    });
    const tk = artifacts.find((a) => a.id === 'TK-001' && a.state === 'ARCHIVED');
    expect(tk).toMatchObject({
      slug: 'vieja',
      kind: 'file',
      documentPath: tk?.path,
      parent: { id: 'US-002', type: 'US', path: 'docs/specs/archived/user-stories/US-002-vieja' },
    });
  });

  it('el orden no depende del recorrido: catálogo, secuencial y ruta por bytes', async () => {
    touch('docs/specs/changes/user-stories/US-011-b/README.md');
    touch('docs/specs/changes/user-stories/US-002-z/README.md');
    touch('docs/specs/archived/user-stories/US-002-a/README.md');
    touch('docs/specs/changes/requirements/RQ-001-r/README.md');
    touch('docs/specs/changes/requirements/SRS-009-s/README.md');
    const ids = (await buildInventory(createFileSystem(root), BASE)).artifacts.map(
      (a) => `${a.id}:${a.path.split('/').slice(-1)[0]}`,
    );
    expect(ids).toEqual(['SRS-009:SRS-009-s', 'RQ-001:RQ-001-r', 'US-002:US-002-a', 'US-002:US-002-z', 'US-011:US-011-b']);
  });

  it('SRS y RQ comparten carpeta sin reportarse entre sí como no conformes', async () => {
    touch('docs/specs/changes/requirements/SRS-001-plataforma/README.md');
    touch('docs/specs/changes/requirements/RQ-005-importacion/README.md');
    const { artifacts, ignored } = await buildInventory(createFileSystem(root), BASE);
    expect(artifacts.map((a) => a.id)).toEqual(['SRS-001', 'RQ-005']);
    expect(ignored).toEqual([]);
  });

  it('expone los nombres no conformes sin que cuenten como artefactos', async () => {
    dir('docs/specs/changes/user-stories/US-002-z');
    dir('docs/specs/changes/user-stories/US-10-x');
    dir('docs/specs/changes/user-stories/us-011-y');
    dir('docs/specs/changes/user-stories/US-012');
    touch('docs/specs/changes/user-stories/README.md');
    touch('docs/specs/changes/user-stories/.gitkeep');
    touch('docs/specs/changes/user-stories/US-002-z/TK-1-corto.md');
    touch('docs/specs/changes/user-stories/US-002-z/README.md');
    touch('docs/specs/changes/user-stories/US-002-z/progress.md');
    touch('docs/specs/changes/user-stories/US-002-z/wireframes/WF-1-mal.md');
    touch('docs/specs/changes/user-stories/US-002-z/wireframes/WF-2-mal.svg');

    const { artifacts, ignored } = await buildInventory(createFileSystem(root), BASE);

    expect(artifacts.map((a) => a.id)).toEqual(['US-002']);
    expect(ignored.map((i) => i.path)).toEqual([
      'docs/specs/changes/user-stories/US-002-z/TK-1-corto.md',
      'docs/specs/changes/user-stories/US-002-z/wireframes/WF-1-mal.md',
      'docs/specs/changes/user-stories/US-012',
      'docs/specs/changes/user-stories/US-10-x',
      'docs/specs/changes/user-stories/us-011-y',
    ]);
    expect(ignored[0]).toMatchObject({ types: ['TK'], folder: 'docs/specs/changes/user-stories/US-002-z' });
  });

  it('un archivo con nombre de carpeta (o al revés) no cuenta como el tipo', async () => {
    touch('docs/specs/changes/user-stories/US-001-archivo');
    touch('docs/specs/changes/user-stories/US-002-ok/README.md');
    dir('docs/specs/changes/user-stories/US-002-ok/TK-001-carpeta.md');
    const { artifacts, ignored } = await buildInventory(createFileSystem(root), BASE);
    expect(artifacts.map((a) => a.id)).toEqual(['US-002']);
    expect(ignored.map((i) => i.path).sort()).toEqual([
      'docs/specs/changes/user-stories/US-001-archivo',
      'docs/specs/changes/user-stories/US-002-ok/TK-001-carpeta.md',
    ]);
  });

  it('las investigaciones sueltas y las anidadas heredan estado y padre', async () => {
    touch('docs/specs/changes/research/RS-001-suelta/README.md');
    touch('docs/specs/archived/research/RS-002-archivada/README.md');
    touch('docs/specs/archived/user-stories/US-003-x/README.md');
    touch('docs/specs/archived/user-stories/US-003-x/research/RS-001-anidada/README.md');
    const { artifacts } = await buildInventory(createFileSystem(root), BASE);
    expect(artifacts.map((a) => `${a.id}|${a.state}|${a.parent?.id ?? '-'}`)).toEqual([
      'US-003|ARCHIVED|-',
      'RS-001|ARCHIVED|US-003',
      'RS-001|ACTIVE|-',
      'RS-002|ARCHIVED|-',
    ]);
  });

  it('un directorio ilegible es RuntimeError INTERNAL (código 1) con la ruta relativa', async () => {
    dir('docs/specs/changes/user-stories/US-001-x');
    chmodSync(join(root, 'docs/specs/changes/user-stories'), 0o000);
    try {
      await expect(buildInventory(createFileSystem(root), BASE)).rejects.toMatchObject({
        name: 'RuntimeError',
        code: 'INTERNAL',
        exitCode: 1,
        details: { path: 'docs/specs/changes/user-stories' },
      });
    } finally {
      chmodSync(join(root, 'docs/specs/changes/user-stories'), 0o755);
    }
  });

  it('respeta rutas base configuradas y capabilities con puntos ocultos', async () => {
    touch('specs/c/user-stories/US-001-a/README.md');
    touch('arch/docs/adr/ADR-001-x.md');
    dir('docs/architecture/.hidden/models');
    const inventory = await buildInventory(createFileSystem(root), {
      ...BASE,
      changesPath: 'specs/c',
      archRoot: 'arch',
    });
    expect(inventory.artifacts.map((a) => a.path)).toEqual([
      'specs/c/user-stories/US-001-a',
      'arch/docs/adr/ADR-001-x.md',
    ]);
  });
});

describe('determinismo', () => {
  it('el mismo repositorio da el mismo inventario sin importar el orden de lectura del filesystem', async () => {
    touch('docs/specs/changes/user-stories/US-002-b/README.md');
    touch('docs/specs/changes/user-stories/US-001-a/README.md');
    touch('docs/specs/changes/user-stories/US-001-a/TK-002-y.md');
    touch('docs/specs/changes/user-stories/US-001-a/TK-001-x.md');
    touch('docs/specs/changes/user-stories/US-9-mal/README.md');
    const real = createFileSystem(root);
    const reversed: RepositoryFileSystem = {
      readText: (path) => real.readText(path),
      readDirectory: async (path) => (await real.readDirectory(path))?.reverse() ?? null,
    };
    const forward = await buildInventory(real, BASE);
    const backward = await buildInventory(reversed, BASE);
    expect(backward).toEqual(forward);
    expect(JSON.stringify(backward)).toBe(JSON.stringify(forward));
  });
});

describe('orden por secuencial', () => {
  it('ordena numéricamente cuando el secuencial pasa de 3 dígitos', async () => {
    touch('docs/specs/changes/user-stories/US-1000-b/README.md');
    touch('docs/specs/changes/user-stories/US-999-a/README.md');
    touch('docs/specs/changes/user-stories/US-1043-c/README.md');
    touch('docs/specs/changes/user-stories/US-100-d/README.md');

    const { artifacts } = await buildInventory(createFileSystem(root), BASE);

    expect(artifacts.map((ref) => ref.id)).toEqual(['US-100', 'US-999', 'US-1000', 'US-1043']);
  });
});

describe('filterArtifacts', () => {
  async function fixture() {
    touch('docs/specs/changes/user-stories/US-010-a/README.md');
    touch('docs/specs/changes/user-stories/US-010-a/TK-001-x.md');
    touch('docs/specs/archived/user-stories/US-001-b/README.md');
    touch('docs/specs/archived/user-stories/US-001-b/TK-001-y.md');
    touch('docs/architecture/cli/models/MD-001-m.md');
    touch('docs/architecture/core/models/MD-001-n.md');
    return (await buildInventory(createFileSystem(root), BASE)).artifacts;
  }

  it('active excluye lo archivado y sus hijos; archived solo lo archivado', async () => {
    const all = await fixture();
    expect(filterArtifacts(all, { state: 'active' }).map((a) => a.path)).not.toContain(
      'docs/specs/archived/user-stories/US-001-b/TK-001-y.md',
    );
    expect(
      filterArtifacts(all, { state: 'archived' }).every((a) => a.state === 'ARCHIVED'),
    ).toBe(true);
    expect(filterArtifacts(all, { state: 'all' })).toHaveLength(all.length);
  });

  it('filtra por tipo, por subárbol del padre y por capability', async () => {
    const all = await fixture();
    expect(filterArtifacts(all, { types: ['TK'] }).map((a) => a.id)).toEqual(['TK-001', 'TK-001']);
    expect(
      filterArtifacts(all, { parentPath: 'docs/specs/changes/user-stories/US-010-a' }).map(
        (a) => a.id,
      ),
    ).toEqual(['TK-001']);
    expect(
      filterArtifacts(all, { types: ['MD'], capability: 'core' }).map((a) => a.path),
    ).toEqual(['docs/architecture/core/models/MD-001-n.md']);
    // La capability solo restringe tipos de arquitectura.
    expect(filterArtifacts(all, { capability: 'core' }).some((a) => a.type === 'US')).toBe(true);
  });
});

describe('foldersFor y joinPosix', () => {
  it('RS sin padre barre la suelta activa y la de archivo', () => {
    expect(foldersFor(getDescriptor('RS'), BASE)).toEqual([
      { path: 'docs/specs/changes/research', state: 'ACTIVE' },
      { path: 'docs/specs/archived/research', state: 'ARCHIVED' },
    ]);
  });

  it('un tipo con padre obligatorio sin padre no tiene carpeta; con padre usa su estado', () => {
    expect(foldersFor(getDescriptor('TK'), BASE)).toEqual([]);
    const parent = {
      id: 'US-001',
      type: 'US',
      slug: 'x',
      kind: 'directory',
      state: 'ARCHIVED',
      path: 'docs/specs/archived/user-stories/US-001-x',
      documentPath: 'docs/specs/archived/user-stories/US-001-x/README.md',
      parent: null,
    } as const;
    expect(foldersFor(getDescriptor('TK'), BASE, { parent })).toEqual([
      { path: 'docs/specs/archived/user-stories/US-001-x', state: 'ARCHIVED' },
    ]);
  });

  it('joinPosix colapsa ., .. y separadores repetidos', () => {
    expect(joinPosix('a//b/', './c', '../d')).toBe('a/b/d');
    expect(joinPosix('.', '')).toBe('');
  });
});

describe('createFileSystem', () => {
  it('readText devuelve null si el documento no existe y el contenido si existe', async () => {
    const fs: RepositoryFileSystem = createFileSystem(root);
    writeFileSync(join(root, 'a.md'), 'hola');
    expect(await fs.readText('a.md')).toBe('hola');
    expect(await fs.readText('b.md')).toBeNull();
    expect(await fs.readDirectory('a.md')).toBeNull();
  });
});
