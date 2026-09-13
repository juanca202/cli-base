export const SUCCESS = 0;

/**
 * Códigos de salida 0–5:
 * 0 success / éxito
 * 1 Internal error / error interno — RuntimeError→1
 * 2 Invalid arguments / argumentos inválidos — ValidationError→2
 * 3 Configuration error / error de configuración — ConfigurationError→3
 * 4 Runtime unavailable / runtime no disponible — ConnectionError→4
 * 5 External process error / error de proceso — ProcessError→5 ExternalServiceError→5
 */
export const EXIT = {
  SUCCESS: 0,
  INTERNAL_ERROR: 1,
  INVALID_ARGUMENTS: 2,
  CONFIGURATION_ERROR: 3,
  RUNTIME_UNAVAILABLE: 4,
  EXTERNAL_PROCESS_ERROR: 5,
} as const;

export class RuntimeError extends Error {
  readonly exitCode: number = EXIT.INTERNAL_ERROR;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RuntimeError';
  }
}

export class ValidationError extends RuntimeError {
  override readonly exitCode = EXIT.INVALID_ARGUMENTS;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends RuntimeError {
  override readonly exitCode = EXIT.CONFIGURATION_ERROR;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ConfigurationError';
  }
}

export class ConnectionError extends RuntimeError {
  override readonly exitCode = EXIT.RUNTIME_UNAVAILABLE;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ConnectionError';
  }
}

export class ProcessError extends RuntimeError {
  override readonly exitCode = EXIT.EXTERNAL_PROCESS_ERROR;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ProcessError';
  }
}

export class ExternalServiceError extends RuntimeError {
  override readonly exitCode = EXIT.EXTERNAL_PROCESS_ERROR;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ExternalServiceError';
  }
}

export function exitCodeFor(error: unknown): number {
  if (error instanceof RuntimeError) {
    return error.exitCode;
  }
  return EXIT.INTERNAL_ERROR;
}
