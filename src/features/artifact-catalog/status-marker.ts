import type { ArtifactTypeDescriptor } from './catalog.js';
import type { RepositoryFileSystem } from './infra/filesystem.js';
import type { ArtifactRef } from './inventory.js';
import { getDescriptor } from './catalog.js';
import { readHtmlComments } from './markdown.js';

export type StatusMark = {
  /** Valor tal cual está escrito, sin espacios alrededor; no se valida. */
  value: string;
  /** Línea (1-based) de la marca. */
  line: number;
};

const PAIR_SEPARATOR = ' · ';

/** Pares `clave=valor` de una marca (`<!-- tc:status=Ready · testType=Unit -->`). */
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

/** `status` del front matter YAML de un documento (ADR), con su línea. */
export function readFrontMatterStatus(markdown: string): StatusMark | null {
  const lines = markdown.split('\n');
  if (lines[0]?.trim() !== '---') return null;
  for (let index = 1; index < lines.length; index++) {
    const line = lines[index] ?? '';
    if (line.trim() === '---') return null;
    const match = /^status:\s*(.*?)\s*$/.exec(line);
    if (match !== null) {
      const value = (match[1] ?? '').replace(/^(['"])(.*)\1$/, '$2');
      return { value, line: index + 1 };
    }
  }
  return null;
}

/**
 * Todas las marcas de estado del documento para el tipo dado, en orden de
 * aparición. Devuelve lo escrito sin validarlo contra `statusValues`: eso lo
 * decide `check`. Un tipo sin marca (`MD`, `API`, `FL`, `DG`) devuelve `[]`.
 */
export function readStatusMarks(
  markdown: string,
  descriptor: Pick<ArtifactTypeDescriptor, 'statusMarker'>,
): StatusMark[] {
  const { statusMarker } = descriptor;
  if (statusMarker === null) return [];
  if (statusMarker === 'status') {
    const mark = readFrontMatterStatus(markdown);
    return mark === null ? [] : [mark];
  }
  const marks: StatusMark[] = [];
  for (const comment of readHtmlComments(markdown)) {
    const value = parseMarkerPairs(comment.text).get(statusMarker);
    if (value !== undefined) marks.push({ value, line: comment.line });
  }
  return marks;
}

/**
 * Añade `status` (primera marca del documento, o `null`) a cada artefacto, para
 * `list --with-status`. El documento ausente o sin marca da `null`.
 */
export async function attachStatus(
  fs: RepositoryFileSystem,
  artifacts: readonly ArtifactRef[],
): Promise<ArtifactRef[]> {
  const result: ArtifactRef[] = [];
  for (const ref of artifacts) {
    const content = await fs.readText(ref.documentPath);
    const mark =
      content === null ? undefined : readStatusMarks(content, getDescriptor(ref.type))[0];
    result.push({ ...ref, status: mark?.value ?? null });
  }
  return result;
}
