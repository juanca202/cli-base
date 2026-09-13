const processAbort = new AbortController();
let installed = false;
const FORCE_EXIT_MS = 2_250;

export function processAbortSignal(): AbortSignal {
  return processAbort.signal;
}

export function abortRunningProcesses(): void {
  if (!processAbort.signal.aborted) {
    processAbort.abort();
  }
}

export function installProcessSignalHandlers(): void {
  if (installed) {
    return;
  }
  installed = true;
  const onSignal = () => {
    abortRunningProcesses();
    const force = setTimeout(() => {
      process.exit(130);
    }, FORCE_EXIT_MS);
    force.unref();
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
}
