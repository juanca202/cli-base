export type OutputFormat = 'human' | 'json';

export function resolveOutputFormat(value: unknown): OutputFormat {
  return value === 'json' ? 'json' : 'human';
}

export function writeResult(payload: unknown, format: OutputFormat): void {
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }
  process.stdout.write(`${typeof payload === 'string' ? payload : JSON.stringify(payload)}\n`);
}

export function writeDiagnostic(message: string): void {
  process.stderr.write(`${message}\n`);
}
