import { afterEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../errors.js';
import { createProgram } from '../program.js';

describe('hello', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emite TOON por defecto cuando no hay nombre', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const program = createProgram();
    program.exitOverride();

    await program.parseAsync(['hello'], { from: 'user' });

    expect(write).toHaveBeenCalledWith('greeting: hello world\n');
  });

  it('emite TOON con el nombre dado', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const program = createProgram();
    program.exitOverride();

    await program.parseAsync(['hello', 'Ada'], { from: 'user' });

    expect(write).toHaveBeenCalledWith('greeting: hello Ada\n');
  });

  it('emite JSON contractual con --output json', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const program = createProgram();
    program.exitOverride();

    await program.parseAsync(['hello', 'Ada', '--output', 'json'], { from: 'user' });

    expect(write).toHaveBeenCalledWith(`${JSON.stringify({ greeting: 'hello Ada' })}\n`);
  });

  it('rechaza --output distinto de toon o json (incluido human)', async () => {
    const program = createProgram();

    for (const value of ['xml', 'human']) {
      const fresh = createProgram();
      await expect(fresh.parseAsync(['hello', '--output', value], { from: 'user' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    }
    void program;
  });
});

