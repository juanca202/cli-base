import { describe, expect, it } from 'vitest';
import { getDescriptor } from './catalog.js';
import type { RepositoryFileSystem } from './infra/filesystem.js';
import type { ArtifactRef } from './inventory.js';
import { lineAt, maskCode, readHtmlComments } from './markdown.js';
import { parseMarkerPairs } from './legacy-status-marker.js';
import { attachStatus, readFrontMatterStatus, readStatusMarks } from './status-marker.js';

const US = getDescriptor('US');
const TC = getDescriptor('TC');
const ADR = getDescriptor('ADR');

describe('readStatusMarks', () => {
  it('lee la marca oculta con su línea', () => {
    const doc = '# US-001\n\n<!-- us:status=Ready -->\n**Estado:** Listo\n';
    expect(readStatusMarks(doc, US)).toEqual([{ value: 'Ready', line: 3 }]);
  });

  it('separa pares con « · » y toma solo el de la clave del tipo', () => {
    const doc = '<!-- tc:status=Ready · testType=Unit · criterion=AC-001 -->';
    expect(readStatusMarks(doc, TC)).toEqual([{ value: 'Ready', line: 1 }]);
    expect(parseMarkerPairs('tc:status=Draft · testType=E2E')).toEqual(
      new Map([
        ['tc:status', 'Draft'],
        ['testType', 'E2E'],
      ]),
    );
  });

  it('ignora marcas dentro de bloques de código y de código en línea', () => {
    const doc = [
      'Ejemplo en línea: `<!-- us:status=Ready -->`',
      '',
      '```md',
      '<!-- us:status=Draft -->',
      '```',
      '',
      '~~~',
      '<!-- us:status=Draft -->',
      '~~~',
      '',
      '<!-- us:status=Ready -->',
    ].join('\n');
    expect(readStatusMarks(doc, US)).toEqual([{ value: 'Ready', line: 11 }]);
  });

  it('devuelve todas las marcas encontradas y no valida contra statusValues', () => {
    const doc = '<!-- us:status=Ready -->\n\n<!-- us:status=listo -->\n<!-- otra:clave=1 -->';
    expect(readStatusMarks(doc, US)).toEqual([
      { value: 'Ready', line: 1 },
      { value: 'listo', line: 3 },
    ]);
  });

  it('un documento sin marca o un tipo sin marca devuelve []', () => {
    expect(readStatusMarks('# Sin marca', US)).toEqual([]);
    expect(readStatusMarks('<!-- us:status=Ready -->', getDescriptor('MD'))).toEqual([]);
  });

  it('en ADR lee el status del front matter, con o sin comillas', () => {
    expect(readStatusMarks('---\nname: x\nstatus: Accepted\n---\n# ADR', ADR)).toEqual([
      { value: 'Accepted', line: 3 },
    ]);
    expect(readFrontMatterStatus('---\nstatus: "Draft"\n---')).toEqual({ value: 'Draft', line: 2 });
    expect(readFrontMatterStatus('# sin front matter\nstatus: Ready')).toBeNull();
    expect(readFrontMatterStatus('---\nname: x\n---\nstatus: Ready')).toBeNull();
    expect(readFrontMatterStatus('---\nname: sin cierre')).toBeNull();
  });
});

describe('markdown', () => {
  it('maskCode conserva longitud y saltos de línea', () => {
    const doc = 'a `b` c\n```\ncódigo\n```\nz';
    const masked = maskCode(doc);
    expect(masked).toHaveLength(doc.length);
    expect(masked.split('\n')).toHaveLength(doc.split('\n').length);
    expect(masked).not.toContain('b');
    expect(masked).not.toContain('código');
    expect(masked.startsWith('a ')).toBe(true);
  });

  it('un cercado de más backticks no se cierra con uno más corto', () => {
    const doc = '````\n```\n<!-- us:status=Draft -->\n```\n````\n<!-- us:status=Ready -->';
    expect(readHtmlComments(doc).map((c) => c.text.trim())).toEqual(['us:status=Ready']);
  });

  it('un backtick sin cierre no enmascara el resto', () => {
    expect(readHtmlComments('un ` suelto\n<!-- a=1 -->').map((c) => c.line)).toEqual([2]);
  });

  it('lineAt cuenta saltos de línea', () => {
    expect(lineAt('a\nb\nc', 0)).toBe(1);
    expect(lineAt('a\nb\nc', 4)).toBe(3);
  });
});

describe('attachStatus', () => {
  const refs: ArtifactRef[] = [
    { id: 'US-001', type: 'US', slug: 'a', kind: 'directory', state: 'ACTIVE', path: 'us/a', documentPath: 'us/a/README.md', parent: null },
    { id: 'US-002', type: 'US', slug: 'b', kind: 'directory', state: 'ACTIVE', path: 'us/b', documentPath: 'us/b/README.md', parent: null },
    { id: 'US-003', type: 'US', slug: 'c', kind: 'directory', state: 'ACTIVE', path: 'us/c', documentPath: 'us/c/README.md', parent: null },
  ];
  const docs: Record<string, string> = {
    'us/a/README.md': '<!-- us:status=Ready -->',
    'us/b/README.md': '# sin marca',
  };
  const fs: RepositoryFileSystem = {
    readDirectory: () => Promise.resolve(null),
    readText: (path) => Promise.resolve(docs[path] ?? null),
  };

  it('emite el valor verbatim, null sin marca y null si el documento no existe', async () => {
    const result = await attachStatus(fs, refs);
    expect(result.map((r) => r.status)).toEqual(['Ready', null, null]);
    expect(refs[0]?.status).toBeUndefined();
  });
});
