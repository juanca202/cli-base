/**
 * Utilidades de lectura de Markdown. Lo que está dentro de un bloque de código
 * (cercado con ``` o ~~~) o de código en línea no es contenido del documento:
 * las marcas y los enlaces que contiene son ejemplos, no datos.
 */

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Devuelve el documento con el código sustituido por espacios, conservando la
 * longitud, los saltos de línea y por tanto cada posición y número de línea.
 */
export function maskCode(markdown: string): string {
  const lines = markdown.split('\n');
  const masked: string[] = [];
  let fence: { char: string; length: number } | null = null;

  for (const line of lines) {
    if (fence !== null) {
      const closing = new RegExp(`^ {0,3}${fence.char}{${fence.length},}\\s*$`);
      masked.push(' '.repeat(line.length));
      if (closing.test(line)) fence = null;
      continue;
    }
    const open = FENCE_OPEN.exec(line);
    if (open !== null) {
      const marker = open[1] ?? '';
      fence = { char: marker[0] ?? '`', length: marker.length };
      masked.push(' '.repeat(line.length));
      continue;
    }
    masked.push(line);
  }

  return maskInlineCode(masked.join('\n'));
}

function maskInlineCode(text: string): string {
  const chars = text.split('');
  let index = 0;
  while (index < chars.length) {
    if (chars[index] !== '`') {
      index++;
      continue;
    }
    let runEnd = index;
    while (chars[runEnd] === '`') runEnd++;
    const runLength = runEnd - index;
    const closing = findClosingRun(chars, runEnd, runLength);
    if (closing === -1) {
      index = runEnd;
      continue;
    }
    for (let i = index; i < closing + runLength; i++) {
      if (chars[i] !== '\n') chars[i] = ' ';
    }
    index = closing + runLength;
  }
  return chars.join('');
}

function findClosingRun(chars: string[], from: number, length: number): number {
  let index = from;
  while (index < chars.length) {
    if (chars[index] !== '`') {
      index++;
      continue;
    }
    let runEnd = index;
    while (chars[runEnd] === '`') runEnd++;
    if (runEnd - index === length) return index;
    index = runEnd;
  }
  return -1;
}

/** Línea (1-based) de una posición del texto. */
export function lineAt(text: string, position: number): number {
  let line = 1;
  for (let i = 0; i < position && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

export type HtmlComment = {
  /** Contenido entre `<!--` y `-->`, sin recortar. */
  text: string;
  /** Línea (1-based) donde empieza el comentario. */
  line: number;
};

/** Comentarios HTML fuera de bloques de código y de código en línea. */
export function readHtmlComments(markdown: string): HtmlComment[] {
  const masked = maskCode(markdown);
  const comments: HtmlComment[] = [];
  const pattern = /<!--([\s\S]*?)-->/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(masked)) !== null) {
    comments.push({ text: markdown.slice(match.index + 4, match.index + match[0].length - 3), line: lineAt(markdown, match.index) });
  }
  return comments;
}
