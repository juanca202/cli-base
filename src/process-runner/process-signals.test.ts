import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  abortRunningProcesses,
  installProcessSignalHandlers,
  processAbortSignal,
} from './process-signals.js';

describe('process signals', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('processAbortSignal siempre devuelve la misma señal compartida', () => {
    expect(processAbortSignal()).toBe(processAbortSignal());
  });

  it('abortRunningProcesses aborta la señal compartida', () => {
    const signal = processAbortSignal();
    expect(signal.aborted).toBe(false);

    abortRunningProcesses();

    expect(signal.aborted).toBe(true);
  });

  it('abortRunningProcesses es idempotente si ya está abortada', () => {
    abortRunningProcesses();
    expect(processAbortSignal().aborted).toBe(true);

    expect(() => abortRunningProcesses()).not.toThrow();
    expect(processAbortSignal().aborted).toBe(true);
  });

  it('installProcessSignalHandlers instala los listeners de SIGINT y SIGTERM una sola vez', () => {
    const onSpy = vi.spyOn(process, 'on').mockReturnValue(process);

    installProcessSignalHandlers();
    installProcessSignalHandlers();

    const signalCalls = onSpy.mock.calls.filter(
      ([event]) => event === 'SIGINT' || event === 'SIGTERM',
    );
    expect(signalCalls).toHaveLength(2);
  });
});
