import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveOutputFormat, writeDiagnostic, writeResult } from './output.js';

describe('resolveOutputFormat', () => {
  it('reconoce json', () => {
    expect(resolveOutputFormat('json')).toBe('json');
  });

  it('cae a human para cualquier otro valor', () => {
    expect(resolveOutputFormat('human')).toBe('human');
    expect(resolveOutputFormat('xml')).toBe('human');
    expect(resolveOutputFormat(undefined)).toBe('human');
  });
});

describe('writeResult', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('escribe el payload serializado en JSON cuando el formato es json', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    writeResult({ greeting: 'hola' }, 'json');
    expect(write).toHaveBeenCalledWith(`${JSON.stringify({ greeting: 'hola' })}\n`);
  });

  it('escribe el string tal cual en formato human', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    writeResult('hola', 'human');
    expect(write).toHaveBeenCalledWith('hola\n');
  });

  it('serializa a JSON un payload no-string en formato human', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    writeResult({ greeting: 'hola' }, 'human');
    expect(write).toHaveBeenCalledWith(`${JSON.stringify({ greeting: 'hola' })}\n`);
  });
});

describe('writeDiagnostic', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('escribe el mensaje en stderr', () => {
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    writeDiagnostic('algo falló');
    expect(write).toHaveBeenCalledWith('algo falló\n');
  });
});
