/**
 * Estado del modelo anterior de cabeceras (WI-070): marca oculta `<!-- {prefijo}:status=… -->` que el plugin
 * `sdd-devkit` sustituyó por el `status` del frontmatter YAML.
 *
 * Todo el soporte del modelo anterior vive aquí. Para retirarlo, borrar este módulo y la llamada de
 * `readLegacyStatusMarks` en `status-marker.ts`.
 *
 * @deprecated Modelo de cabecera anterior; solo se consulta cuando el documento no tiene frontmatter.
 */
import type { ArtifactType } from './catalog.js';
import { readHtmlComments } from './markdown.js';
import type { StatusMark } from './status-marker.js';

const PAIR_SEPARATOR = ' · ';

/**
 * Clave de la marca oculta de estado por tipo en el modelo anterior; los tipos sin entrada no tenían marca.
 *
 * @deprecated
 */
export const LEGACY_STATUS_MARKERS: Partial<Record<ArtifactType, string>> = {
  SRS: 'srs:status',
  RQ: 'rq:status',
  US: 'us:status',
  TK: 'tk:status',
  WI: 'wi:status',
  FT: 'ft:status',
  TC: 'tc:status',
  RS: 'rs:status',
  WF: 'wireframe:review-status',
};

/**
 * Pares `clave=valor` de una marca (`<!-- tc:status=Ready · testType=Unit -->`).
 *
 * @deprecated
 */
export function parseMarkerPairs(comment: string): Map<string, string> {
  const pairs = new Map<string, string>();
  for (const part of comment.trim().split(PAIR_SEPARATOR)) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key !== '' && !pairs.has(key)) pairs.set(key, value);
  }
  return pairs;
}

/**
 * Todas las marcas ocultas de estado del tipo dado, en orden de aparición. Devuelve lo escrito sin validarlo.
 *
 * @deprecated
 */
export function readLegacyStatusMarks(markdown: string, type: ArtifactType): StatusMark[] {
  const marker = LEGACY_STATUS_MARKERS[type];
  if (marker === undefined) return [];
  const marks: StatusMark[] = [];
  for (const comment of readHtmlComments(markdown)) {
    const value = parseMarkerPairs(comment.text).get(marker);
    if (value !== undefined) marks.push({ value, line: comment.line });
  }
  return marks;
}
