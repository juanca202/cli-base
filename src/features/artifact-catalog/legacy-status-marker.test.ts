import { describe, expect, it } from 'vitest';
import { getDescriptor } from './catalog.js';
import { LEGACY_STATUS_MARKERS, parseMarkerPairs, readLegacyStatusMarks } from './legacy-status-marker.js';
import { readStatusMarks } from './status-marker.js';

/** WI-070 — modelo anterior (marca oculta) aislado y sin frontmatter. */
describe('legacy-status-marker', () => {
  it.each(Object.entries(LEGACY_STATUS_MARKERS))('AC-003: %s lee su marca %s', (type, marker) => {
    const doc = `# X\n\n<!-- ${marker}=Ready -->\n`;
    expect(readLegacyStatusMarks(doc, type as never)).toEqual([{ value: 'Ready', line: 3 }]);
    expect(readStatusMarks(doc, getDescriptor(type as never))).toEqual([{ value: 'Ready', line: 3 }]);
  });

  it('AC-003: una marca con pares extra toma solo el estado', () => {
    const doc = '<!-- tc:status=Ready · testType=Unit -->';
    expect(readLegacyStatusMarks(doc, 'TC')).toEqual([{ value: 'Ready', line: 1 }]);
    expect(parseMarkerPairs('tc:status=Draft · testType=E2E').get('tc:status')).toBe('Draft');
  });

  it('un tipo sin marca en el modelo anterior (ADR, MD) devuelve []', () => {
    expect(readLegacyStatusMarks('<!-- status=Ready -->', 'ADR')).toEqual([]);
    expect(readLegacyStatusMarks('<!-- us:status=Ready -->', 'MD')).toEqual([]);
  });
});
