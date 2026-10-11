import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigurationError, RuntimeError, ValidationError } from './errors.js';
import {
  failureEnvelope,
  resolveOutputFormat,
  successEnvelope,
  writeDiagnostic,
  writeFailure,
  writeResult,
  writePayload,
  writeSuccess,
} from './output.js';

describe('resolveOutputFormat', () => {
  it('reconoce json', () => {
    expect(resolveOutputFormat('json')).toBe('json');
  });

  it('cae a toon (el formato por defecto) para cualquier otro valor', () => {
    expect(resolveOutputFormat('toon')).toBe('toon');
    expect(resolveOutputFormat('human')).toBe('toon');
    expect(resolveOutputFormat('xml')).toBe('toon');
    expect(resolveOutputFormat(undefined)).toBe('toon');
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

  it('escribe el payload como TOON cuando el formato es toon', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    writeResult({ greeting: 'hola', tags: ['a', 'b'] }, 'toon');
    expect(write).toHaveBeenCalledWith('greeting: hola\ntags[2]: a,b\n');
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

describe('successEnvelope', () => {
  it('construye el envolvente MD-001 con el esquema del comando', () => {
    expect(successEnvelope('next', { nextId: 'US-024' })).toEqual({
      schema: 'cli-next/v1',
      command: 'next',
      ok: true,
      data: { nextId: 'US-024' },
    });
  });
});

describe('failureEnvelope', () => {
  it('construye el payload MD-002 con tipo, código de salida y causa', () => {
    const error = new ValidationError('tipo desconocido', {
      code: 'UNKNOWN_ARTIFACT_TYPE',
      details: { type: 'XX' },
    });
    expect(failureEnvelope('next', error)).toEqual({
      schema: 'cli-error/v1',
      command: 'next',
      ok: false,
      error: {
        type: 'ValidationError',
        exitCode: 2,
        code: 'UNKNOWN_ARTIFACT_TYPE',
        message: 'tipo desconocido',
        details: { type: 'XX' },
      },
    });
  });

  it('usa command null y omite details cuando no existen', () => {
    const payload = failureEnvelope(null, new RuntimeError('boom'));
    expect(payload.command).toBeNull();
    expect(payload.error).toEqual({
      type: 'RuntimeError',
      exitCode: 1,
      code: 'INTERNAL',
      message: 'boom',
    });
    expect('details' in payload.error).toBe(false);
  });
});

describe('writeSuccess', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('en json escribe un único objeto en una sola línea por stdout', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    writeSuccess('find', { matches: [], total: 0 }, 'json');
    expect(write).toHaveBeenCalledTimes(1);
    const line = String(write.mock.calls[0]?.[0]);
    expect(line.endsWith('\n')).toBe(true);
    expect(line.slice(0, -1)).not.toContain('\n');
    expect(JSON.parse(line)).toEqual({
      schema: 'cli-find/v1',
      command: 'find',
      ok: true,
      data: { matches: [], total: 0 },
    });
  });

  it('en toon escribe el mismo envolvente codificado en TOON', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    writeSuccess('find', { matches: [], total: 0 }, 'toon');
    expect(write).toHaveBeenCalledWith(
      'schema: cli-find/v1\ncommand: find\nok: true\ndata:\n  matches[0]:\n  total: 0\n',
    );
  });

  it('writePayload emite el objeto tal cual, sin envolvente', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    writePayload({ next: 'US-001' }, 'json');
    expect(write).toHaveBeenCalledWith('{"next":"US-001"}\n');
  });
});

describe('writeFailure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('en json escribe un único cli-error/v1 por stdout y nada por stderr', () => {
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    writeFailure(new ConfigurationError('sin repo', { code: 'NOT_A_GIT_REPOSITORY' }), 'list', 'json');
    expect(out).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(out.mock.calls[0]?.[0]))).toMatchObject({
      schema: 'cli-error/v1',
      command: 'list',
      ok: false,
      error: { exitCode: 3, code: 'NOT_A_GIT_REPOSITORY' },
    });
    expect(err).not.toHaveBeenCalled();
  });

  it('en toon escribe el cli-error/v1 en TOON por stdout y nada por stderr', () => {
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    writeFailure(new ValidationError('argumento inválido'), null, 'toon');
    expect(String(out.mock.calls[0]?.[0])).toContain('schema: cli-error/v1\ncommand: null\nok: false\n');
    expect(String(out.mock.calls[0]?.[0])).toContain('  message: argumento inválido');
    expect(err).not.toHaveBeenCalled();
  });
});
