import { describe, expect, it } from 'vitest';
import { formatArtifactId, normalizeArtifactType, parseArtifactId } from './artifact-id.js';

describe('normalizeArtifactType', () => {
  it('normaliza cualquier capitalización a mayúsculas', () => {
    expect(normalizeArtifactType('us')).toBe('US');
    expect(normalizeArtifactType('Srs')).toBe('SRS');
    expect(normalizeArtifactType(' wf ')).toBe('WF');
  });

  it('rechaza un tipo fuera del catálogo con UNKNOWN_ARTIFACT_TYPE y código 2', () => {
    expect(() => normalizeArtifactType('XX')).toThrowError(
      expect.objectContaining({
        name: 'ValidationError',
        code: 'UNKNOWN_ARTIFACT_TYPE',
        exitCode: 2,
        details: { type: 'XX' },
      }),
    );
  });
});

describe('parseArtifactId', () => {
  it('acepta un id bien formado y lo devuelve en forma canónica', () => {
    expect(parseArtifactId('US-010')).toEqual({ type: 'US', sequence: 10, id: 'US-010' });
    expect(parseArtifactId('tk-001')).toEqual({ type: 'TK', sequence: 1, id: 'TK-001' });
  });

  it.each(['US-10', 'US-0100', 'US010', '010', 'US-', 'US-abc', ''])(
    'rechaza %j como MALFORMED_ID',
    (input) => {
      expect(() => parseArtifactId(input)).toThrowError(
        expect.objectContaining({ code: 'MALFORMED_ID', exitCode: 2 }),
      );
    },
  );

  it('un prefijo bien formado pero fuera del catálogo es UNKNOWN_ARTIFACT_TYPE', () => {
    expect(() => parseArtifactId('QQ-001')).toThrowError(
      expect.objectContaining({ code: 'UNKNOWN_ARTIFACT_TYPE' }),
    );
  });
});

describe('formatArtifactId', () => {
  it('rellena el secuencial a tres dígitos', () => {
    expect(formatArtifactId('US', 7)).toBe('US-007');
    expect(formatArtifactId('TC', 123)).toBe('TC-123');
  });
});
