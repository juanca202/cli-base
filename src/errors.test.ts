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
} from './errors.js';

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
