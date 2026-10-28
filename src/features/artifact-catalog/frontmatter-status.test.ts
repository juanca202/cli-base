import { describe, expect, it } from 'vitest';
import { ARTIFACT_TYPES, getDescriptor } from './catalog.js';
import { readStatusMarks } from './status-marker.js';

/** WI-070 — el estado se lee del `status` del frontmatter; la marca oculta es solo el modelo anterior. */
const doc = (status: string): string => `---\nid: X-001\ntype: x\nstatus: ${status}\n---\n# X-001: Título\n`;

const WITH_STATUS = ARTIFACT_TYPES.filter((type) => getDescriptor(type).statusValues !== null);

describe('readStatusMarks con frontmatter', () => {
  it.each(WITH_STATUS)('AC-001: %s devuelve el status del frontmatter con su línea', (type) => {
    const value = getDescriptor(type).statusValues?.[0] ?? '';
    expect(readStatusMarks(doc(value), getDescriptor(type))).toEqual([{ value, line: 4 }]);
  });

  it('AC-001: quita las comillas del valor', () => {
    expect(readStatusMarks(doc('"Ready"'), getDescriptor('US'))).toEqual([{ value: 'Ready', line: 4 }]);
    expect(readStatusMarks(doc("'Ready'"), getDescriptor('US'))).toEqual([{ value: 'Ready', line: 4 }]);
  });

  it('AC-002: un wireframe lee Proposed/Approved de status', () => {
    expect(readStatusMarks(doc('Approved'), getDescriptor('WF'))).toEqual([{ value: 'Approved', line: 4 }]);
    expect(readStatusMarks(doc('Proposed'), getDescriptor('WF'))).toEqual([{ value: 'Proposed', line: 4 }]);
  });

  it('AC-005: frontmatter sin status da [] y no cae a la marca oculta', () => {
    const content = '---\nid: US-001\n---\n# US-001\n\n<!-- us:status=Ready -->\n';
    expect(readStatusMarks(content, getDescriptor('US'))).toEqual([]);
  });

  it('AC-005: frontmatter sin cierre da [] sin lanzar', () => {
    expect(readStatusMarks('---\nid: US-001\nstatus: Ready\n# US-001\n', getDescriptor('US'))).toEqual([]);
  });

  it('un tipo sin estado devuelve [] aunque haya status', () => {
    expect(readStatusMarks(doc('Ready'), getDescriptor('MD'))).toEqual([]);
  });
});
