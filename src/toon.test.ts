import { describe, expect, it } from 'vitest';
import { encodeToon } from './toon.js';

describe('encodeToon', () => {
  it('codifica objetos planos con sus primitivos', () => {
    expect(encodeToon({ id: 7, ok: true, note: null, name: 'abc' })).toBe(
      'id: 7\nok: true\nnote: null\nname: abc',
    );
  });

  it('anida objetos por indentación', () => {
    expect(encodeToon({ a: { b: { c: 1 } }, d: 2 })).toBe('a:\n  b:\n    c: 1\nd: 2');
  });

  it('arreglos primitivos van en línea con su cantidad; vacío es [0]:', () => {
    expect(encodeToon({ tags: ['a', 'b', 'c'], none: [] })).toBe('tags[3]: a,b,c\nnone[0]:');
  });

  it('arreglos de objetos uniformes van en tabla', () => {
    expect(
      encodeToon({
        items: [
          { id: 'US-001', type: 'US' },
          { id: 'US-002', type: 'US' },
        ],
      }),
    ).toBe('items[2]{id,type}:\n  US-001,US\n  US-002,US');
  });

  it('arreglos no uniformes van como lista', () => {
    expect(encodeToon({ xs: [1, { a: 1, b: 2 }, 'z'] })).toBe('xs[3]:\n  - 1\n  - a: 1\n    b: 2\n  - z');
  });

  it.each([
    ['', '""'],
    [' x', '" x"'],
    ['true', '"true"'],
    ['null', '"null"'],
    ['42', '"42"'],
    ['-x', '"-x"'],
    ['a,b', '"a,b"'],
    ['a:b', '"a:b"'],
    ['say "hi"', '"say \\"hi\\""'],
    ['l1\nl2', '"l1\\nl2"'],
    ['docs/specs/<slug>', 'docs/specs/<slug>'],
  ])('cita (o no) la cadena %j', (input, expected) => {
    expect(encodeToon({ v: input })).toBe(`v: ${expected}`);
  });

  it('cita las claves que no son identificadores', () => {
    expect(encodeToon({ 'a b': 1 })).toBe('"a b": 1');
  });

  it('es determinista: respeta el orden de las claves', () => {
    expect(encodeToon({ z: 1, a: 2 })).toBe('z: 1\na: 2');
  });
});
