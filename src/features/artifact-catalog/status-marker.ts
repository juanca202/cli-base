import type { ArtifactTypeDescriptor } from './catalog.js';
import type { RepositoryFileSystem } from './infra/filesystem.js';
import type { ArtifactRef } from './inventory.js';
import { getDescriptor } from './catalog.js';
import { readLegacyStatusMarks } from './legacy-status-marker.js';

export type StatusMark = {
  /** Valor tal cual está escrito, sin espacios alrededor; no se valida. */
  value: string;
  /** Línea (1-based) de la marca. */
  line: number;
};

/** `true` si el documento abre con un bloque de frontmatter (`---` en la línea 1). */
function hasFrontMatter(markdown: string): boolean {
  return markdown.split('\n', 1)[0]?.trim() === '---';
}

/** `status` del front matter YAML de un documento (ADR), con su línea. */
export function readFrontMatterStatus(markdown: string): StatusMark | null {
  const lines = markdown.split('\n');
  if (lines[0]?.trim() !== '---') return null;
  const close = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (close === -1) return null;
  for (let index = 1; index < close; index++) {
    const match = /^status:\s*(.*?)\s*$/.exec(lines[index] ?? '');
    if (match !== null) {
      const value = (match[1] ?? '').replace(/^(['"])(.*)\1$/, '$2');
      return { value, line: index + 1 };
    }
  }
  return null;
}

/**
 * Todas las marcas de estado del documento para el tipo dado, en orden de aparición: el `status` del
 * frontmatter si el documento abre con uno (a lo sumo una marca); si no, la marca oculta del modelo
 * anterior ({@link readLegacyStatusMarks}). Devuelve lo escrito sin validarlo contra `statusValues`: eso lo
 * decide `check`. Un tipo sin estado (`MD`, `API`, `FL`, `DG`) devuelve `[]`.
 */
export function readStatusMarks(
  markdown: string,
  descriptor: Pick<ArtifactTypeDescriptor, 'type' | 'statusValues'>,
): StatusMark[] {
  if (descriptor.statusValues === null) return [];
  if (!hasFrontMatter(markdown)) return readLegacyStatusMarks(markdown, descriptor.type);
  const mark = readFrontMatterStatus(markdown);
  return mark === null ? [] : [mark];
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
