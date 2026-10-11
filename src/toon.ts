/**
 * Codificador TOON (Token-Oriented Object Notation) de los payloads del CLI:
 * objetos por indentación, arreglos primitivos en línea, arreglos de objetos
 * uniformes en tabla y el resto como lista. Es determinista: respeta el orden
 * de las claves y no depende del locale ni del entorno.
 */
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const INDENT = '  ';
const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_.]*$/;
const NUMERIC_LIKE = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$|^0\d+$/;
// eslint-disable-next-line no-control-regex
const NEEDS_QUOTES = /[,:"\\[\]{}\u0000-\u001f]/;

function isPrimitive(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value !== 'object';
}

function quote(text: string): string {
  const escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `"${escaped}"`;
}

function formatString(text: string): string {
  const plain =
    text !== '' &&
    text === text.trim() &&
    text !== 'true' &&
    text !== 'false' &&
    text !== 'null' &&
    !text.startsWith('-') &&
    !NUMERIC_LIKE.test(text) &&
    !NEEDS_QUOTES.test(text);
  return plain ? text : quote(text);
}

function formatPrimitive(value: string | number | boolean | null): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return formatString(value);
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  return value ? 'true' : 'false';
}

function formatKey(key: string): string {
  return KEY_PATTERN.test(key) ? key : quote(key);
}

function tabularFields(items: Json[]): string[] | null {
  const first = items[0];
  if (items.length === 0 || first === null || typeof first !== 'object' || Array.isArray(first)) {
    return null;
  }
  const fields = Object.keys(first);
  if (fields.length === 0) return null;
  for (const item of items) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) return null;
    const keys = Object.keys(item);
    if (keys.length !== fields.length || keys.some((key, index) => key !== fields[index])) {
      return null;
    }
    if (!Object.values(item).every(isPrimitive)) return null;
  }
  return fields;
}

function encodeArray(label: string, items: Json[], depth: number): string[] {
  const pad = INDENT.repeat(depth);
  const head = `${pad}${label}[${items.length}]`;
  if (items.length === 0) return [`${head}:`];
  if (items.every(isPrimitive)) {
    return [`${head}: ${items.map((item) => formatPrimitive(item as never)).join(',')}`];
  }
  const fields = tabularFields(items);
  if (fields !== null) {
    const rows = items.map((item) => {
      const record = item as { [key: string]: Json };
      return `${pad}${INDENT}${fields.map((field) => formatPrimitive(record[field] as never)).join(',')}`;
    });
    return [`${head}{${fields.map(formatKey).join(',')}}:`, ...rows];
  }
  const lines = [`${head}:`];
  for (const item of items) {
    if (isPrimitive(item)) {
      lines.push(`${pad}${INDENT}- ${formatPrimitive(item)}`);
    } else if (Array.isArray(item)) {
      const [first = '', ...rest] = encodeArray('', item, depth + 2);
      lines.push(`${pad}${INDENT}- ${first.trimStart()}`, ...rest);
    } else {
      const [first = '', ...rest] = encodeObject(item, depth + 2);
      lines.push(`${pad}${INDENT}- ${first.trimStart()}`, ...rest);
    }
  }
  return lines;
}

function encodeObject(value: { [key: string]: Json }, depth: number): string[] {
  const pad = INDENT.repeat(depth);
  const lines: string[] = [];
  for (const [rawKey, entry] of Object.entries(value)) {
    const key = formatKey(rawKey);
    if (isPrimitive(entry)) {
      lines.push(`${pad}${key}: ${formatPrimitive(entry)}`);
    } else if (Array.isArray(entry)) {
      lines.push(...encodeArray(key, entry, depth));
    } else if (Object.keys(entry).length === 0) {
      lines.push(`${pad}${key}:`);
    } else {
      lines.push(`${pad}${key}:`, ...encodeObject(entry, depth + 1));
    }
  }
  return lines;
}

/** Codifica `value` como TOON, sin salto de línea final. */
export function encodeToon(value: unknown): string {
  const json = value as Json;
  if (isPrimitive(json)) return formatPrimitive(json);
  if (Array.isArray(json)) return encodeArray('', json, 0).join('\n');
  return encodeObject(json, 0).join('\n');
}
