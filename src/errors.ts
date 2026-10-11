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

/**
 * Catálogo cerrado de causas estables (`error.code` de MD-002). Un consumidor
 * ramifica por `code` y `exitCode`, nunca por el texto del mensaje.
 */
export const ERROR_CODES = {
  // Código 2
  UNKNOWN_ARTIFACT_TYPE: 'UNKNOWN_ARTIFACT_TYPE',
  MALFORMED_ID: 'MALFORMED_ID',
  MISSING_PARENT: 'MISSING_PARENT',
  PARENT_NOT_FOUND: 'PARENT_NOT_FOUND',
  MISSING_CAPABILITY: 'MISSING_CAPABILITY',
  CAPABILITY_NOT_FOUND: 'CAPABILITY_NOT_FOUND',
  ARTIFACT_NOT_FOUND: 'ARTIFACT_NOT_FOUND',
  INVALID_FLAG_VALUE: 'INVALID_FLAG_VALUE',
  INVALID_FLAG_COMBINATION: 'INVALID_FLAG_COMBINATION',
  MISSING_REQUIRED_FLAG: 'MISSING_REQUIRED_FLAG',
  INVALID_OUTPUT_FORMAT: 'INVALID_OUTPUT_FORMAT',
  UNSUPPORTED_ARTIFACT_TYPE: 'UNSUPPORTED_ARTIFACT_TYPE',
  UNSUPPORTED_WORK_ITEM_TYPE: 'UNSUPPORTED_WORK_ITEM_TYPE',
  ARTIFACT_ARCHIVED: 'ARTIFACT_ARCHIVED',
  MISSING_REPOSITORY_FIELD: 'MISSING_REPOSITORY_FIELD',
  DETACHED_HEAD: 'DETACHED_HEAD',
  WORKTREE_CONFLICT: 'WORKTREE_CONFLICT',
  // Código 3
  INVALID_SETTINGS: 'INVALID_SETTINGS',
  NOT_A_GIT_REPOSITORY: 'NOT_A_GIT_REPOSITORY',
  BASE_PATH_NOT_FOUND: 'BASE_PATH_NOT_FOUND',
  REPOSITORY_NOT_FOUND: 'REPOSITORY_NOT_FOUND',
  // Código 5
  GIT_UNAVAILABLE: 'GIT_UNAVAILABLE',
  GIT_FAILED: 'GIT_FAILED',
  // Código 1
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Datos de apoyo del caso concreto: sin rutas absolutas ni contenido del entorno. */
export type ErrorDetails = Record<string, unknown>;

export type CliErrorOptions = ErrorOptions & {
  code?: ErrorCode;
  details?: ErrorDetails;
};

export type CliErrorType =
  | 'RuntimeError'
  | 'ValidationError'
  | 'ConfigurationError'
  | 'ConnectionError'
  | 'ProcessError'
  | 'ExternalServiceError';

export class RuntimeError extends Error {
  readonly exitCode: number = EXIT.INTERNAL_ERROR;
  readonly code: ErrorCode;
  readonly details?: ErrorDetails;

  constructor(message: string, options?: CliErrorOptions, defaultCode: ErrorCode = ERROR_CODES.INTERNAL) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'RuntimeError';
    this.code = options?.code ?? defaultCode;
    if (options?.details !== undefined) {
      this.details = options.details;
    }
  }
}

export class ValidationError extends RuntimeError {
  override readonly exitCode = EXIT.INVALID_ARGUMENTS;

  constructor(message: string, options?: CliErrorOptions) {
    super(message, options, ERROR_CODES.INVALID_FLAG_VALUE);
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends RuntimeError {
  override readonly exitCode = EXIT.CONFIGURATION_ERROR;

  constructor(message: string, options?: CliErrorOptions) {
    super(message, options, ERROR_CODES.INVALID_SETTINGS);
    this.name = 'ConfigurationError';
  }
}

export class ConnectionError extends RuntimeError {
  override readonly exitCode = EXIT.RUNTIME_UNAVAILABLE;

  constructor(message: string, options?: CliErrorOptions) {
    super(message, options);
    this.name = 'ConnectionError';
  }
}

export class ProcessError extends RuntimeError {
  override readonly exitCode = EXIT.EXTERNAL_PROCESS_ERROR;

  constructor(message: string, options?: CliErrorOptions) {
    super(message, options, ERROR_CODES.GIT_FAILED);
    this.name = 'ProcessError';
  }
}

export class ExternalServiceError extends RuntimeError {
  override readonly exitCode = EXIT.EXTERNAL_PROCESS_ERROR;

  constructor(message: string, options?: CliErrorOptions) {
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

export type CliErrorFields = {
  type: CliErrorType;
  exitCode: number;
  code: ErrorCode;
  message: string;
  details?: ErrorDetails;
};

/** Proyección de cualquier error al bloque `error` de MD-002. */
export function toCliErrorFields(error: unknown): CliErrorFields {
  if (error instanceof RuntimeError) {
    const fields: CliErrorFields = {
      type: error.name as CliErrorType,
      exitCode: error.exitCode,
      code: error.code,
      message: error.message,
    };
    if (error.details !== undefined) {
      fields.details = error.details;
    }
    return fields;
  }
  return {
    type: 'RuntimeError',
    exitCode: EXIT.INTERNAL_ERROR,
    code: ERROR_CODES.INTERNAL,
    message: error instanceof Error ? error.message : String(error),
  };
}
