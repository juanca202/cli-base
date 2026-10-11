import { describe, expect, it } from 'vitest';
import { DRY_RUN_EXEMPTIONS } from './dry-run-exemptions.js';

describe('dry-run-exemptions', () => {
  it.each(['next', 'find', 'list'])(
    'documenta %s como solo lectura, exento de --dry-run',
    (name) => {
      expect(DRY_RUN_EXEMPTIONS[name]).toBe('solo lectura, sin efectos secundarios');
    },
  );

  it('documenta la justificación de hello, exento de --dry-run', () => {
    expect(DRY_RUN_EXEMPTIONS.hello).toBeTruthy();
  });
});
