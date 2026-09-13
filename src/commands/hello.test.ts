import { afterEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../errors.js';
import { createProgram } from '../program.js';

describe('hello', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('imprime hello world cuando no hay nombre', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const program = createProgram();
    program.exitOverride();

    await program.parseAsync(['hello'], { from: 'user' });

    expect(write).toHaveBeenCalledWith('hello world\n');
  });

  it('imprime hello con el nombre dado', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const program = createProgram();
    program.exitOverride();

    await program.parseAsync(['hello', 'Ada'], { from: 'user' });

    expect(write).toHaveBeenCalledWith('hello Ada\n');
  });

  it('emite JSON contractual con --output json', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const program = createProgram();
    program.exitOverride();

    await program.parseAsync(['hello', 'Ada', '--output', 'json'], { from: 'user' });

    expect(write).toHaveBeenCalledWith(`${JSON.stringify({ greeting: 'hello Ada' })}\n`);
  });

  it('rechaza --output distinto de human o json', async () => {
    const program = createProgram();

    await expect(program.parseAsync(['hello', '--output', 'xml'], { from: 'user' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

