import { ERROR_CODES, ValidationError } from '../../errors.js';
import { ARTIFACT_TYPES, type ArtifactType } from './catalog.js';

export type ParsedArtifactId = {
  type: ArtifactType;
  sequence: number;
  /** Forma canónica: `<PREFIJO>-<3 dígitos>`. */
  id: string;
};

const ID_PATTERN = /^([A-Za-z]+)-(\d{3})$/;

function isArtifactType(value: string): value is ArtifactType {
  return (ARTIFACT_TYPES as readonly string[]).includes(value);
}

/** Normaliza un tipo (cualquier capitalización) o lo rechaza con `UNKNOWN_ARTIFACT_TYPE`. */
export function normalizeArtifactType(input: string): ArtifactType {
  const type = input.trim().toUpperCase();
  if (!isArtifactType(type)) {
    throw new ValidationError(
      `Tipo de artefacto desconocido: ${input}. Tipos admitidos: ${ARTIFACT_TYPES.join(', ')}.`,
      { code: ERROR_CODES.UNKNOWN_ARTIFACT_TYPE, details: { type: input } },
    );
  }
  return type;
}

export function formatArtifactId(type: ArtifactType, sequence: number): string {
  return `${type}-${String(sequence).padStart(3, '0')}`;
}

/**
 * Valida un identificador `<PREFIJO>-<3 dígitos>`: forma incorrecta →
 * `MALFORMED_ID`; prefijo fuera del catálogo → `UNKNOWN_ARTIFACT_TYPE`.
 */
export function parseArtifactId(input: string): ParsedArtifactId {
  const match = ID_PATTERN.exec(input.trim());
  if (match === null) {
    throw new ValidationError(
      `Identificador mal formado: ${input}. Se espera <TIPO>-<3 dígitos>, p. ej. US-010.`,
      { code: ERROR_CODES.MALFORMED_ID, details: { id: input } },
    );
  }
  const type = normalizeArtifactType(match[1] ?? '');
  const sequence = Number(match[2]);
  return { type, sequence, id: formatArtifactId(type, sequence) };
}
