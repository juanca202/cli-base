import { describe, expect, it } from 'vitest';
import { DRY_RUN_EXEMPTIONS } from './dry-run-exemptions.js';

describe('dry-run-exemptions', () => {
  it('documenta la justificación de hello, exento de --dry-run', () => {
    expect(DRY_RUN_EXEMPTIONS.hello).toBeTruthy();
  });
});
