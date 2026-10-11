import { describe, expect, it } from 'vitest';
import {
  ConfigurationError,
  ConnectionError,
  EXIT,
  ExternalServiceError,
  ProcessError,
  RuntimeError,
  SUCCESS,
  ValidationError,
  exitCodeFor,
  toCliErrorFields,
} from './errors.js';

describe('causa estable y datos de apoyo', () => {
  it('cada especialización tiene una causa por defecto y details vacío', () => {
    expect(new RuntimeError('x').code).toBe('INTERNAL');
    expect(new ValidationError('x').code).toBe('INVALID_FLAG_VALUE');
    expect(new ConfigurationError('x').code).toBe('INVALID_SETTINGS');
    expect(new ProcessError('x').code).toBe('GIT_FAILED');
    expect(new ConnectionError('x').code).toBe('INTERNAL');
    expect(new ExternalServiceError('x').code).toBe('INTERNAL');
    expect(new ValidationError('x').details).toBeUndefined();
  });

  it('acepta una causa y details explícitos conservando cause', () => {
    const cause = new Error('origen');
    const error = new ValidationError('tipo desconocido', {
      code: 'UNKNOWN_ARTIFACT_TYPE',
      details: { type: 'XX' },
      cause,
    });
    expect(error.code).toBe('UNKNOWN_ARTIFACT_TYPE');
    expect(error.details).toEqual({ type: 'XX' });
    expect(error.cause).toBe(cause);
    expect(error.exitCode).toBe(EXIT.INVALID_ARGUMENTS);
  });

  it('toCliErrorFields clasifica errores propios y no clasificados', () => {
    expect(
      toCliErrorFields(
        new ConfigurationError('ruta', { code: 'BASE_PATH_NOT_FOUND', details: { path: 'x' } }),
      ),
    ).toEqual({
      type: 'ConfigurationError',
      exitCode: 3,
      code: 'BASE_PATH_NOT_FOUND',
      message: 'ruta',
      details: { path: 'x' },
    });
    expect(toCliErrorFields(new Error('boom'))).toEqual({
      type: 'RuntimeError',
      exitCode: 1,
      code: 'INTERNAL',
      message: 'boom',
    });
    expect(toCliErrorFields('texto')).toEqual({
      type: 'RuntimeError',
      exitCode: 1,
      code: 'INTERNAL',
      message: 'texto',
    });
  });
});

describe('exitCodeFor', () => {
  it('mapea cada tipo al código acordado', () => {
    expect(exitCodeFor(new RuntimeError('x'))).toBe(EXIT.INTERNAL_ERROR);
    expect(exitCodeFor(new ValidationError('x'))).toBe(EXIT.INVALID_ARGUMENTS);
    expect(exitCodeFor(new ConfigurationError('x'))).toBe(EXIT.CONFIGURATION_ERROR);
    expect(exitCodeFor(new ConnectionError('x'))).toBe(EXIT.RUNTIME_UNAVAILABLE);
    expect(exitCodeFor(new ProcessError('x'))).toBe(EXIT.EXTERNAL_PROCESS_ERROR);
    expect(exitCodeFor(new ExternalServiceError('x'))).toBe(EXIT.EXTERNAL_PROCESS_ERROR);
  });

  it('usa código 1 para errores no clasificados y 0 para éxito', () => {
    expect(exitCodeFor(new Error('x'))).toBe(1);
    expect(SUCCESS).toBe(0);
  });
});
