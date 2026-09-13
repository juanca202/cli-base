---
id: ADR-006
status: Accepted
last_update: 2026-09-13
deciders: [Equipo]
tags: [architecture, process-runner, spawn, child-process]
supersedes: null
superseded_by: null
emits: [architecture/CR-004, architecture/CR-005, architecture/CR-006, architecture/CR-007, architecture/CR-008]
---

# ADR-006: Gestión de procesos hijos mediante ProcessRunner

## Contexto

El runtime de esta plantilla va a lanzar procesos ajenos — Claude CLI, Git, npm, suites de test y equivalentes —. Si cada comando o servicio llama a `child_process.spawn` por su cuenta, se dispersan timeout, cancelación, señales, captura de streams y el mapeo a `ProcessError` (ADR-005). Un Ctrl+C o un timeout mal manejado deja huérfanos; mezclar el stderr del hijo con el JSON de la CLI (ADR-004) rompe a agents y skills.

Hace falta un único dueño de los procesos hijos, con una API que cubra tanto la ejecución bloqueante como el streaming.

## Decisión

Introducir la abstracción `ProcessRunner` como único punto de creación y control de procesos hijos. Su API incluye `run()`, `stream()`, `cancel()` y `timeout()`.

Detrás de esa API se usa `spawn`, no `exec`: `run()` y `stream()` necesitan un proceso vivo, streams incrementales y la capacidad de cancelar o vencer por timeout. `exec` bufferiza y no encaja.

Política de ciclo de vida:

- `SIGINT` y `SIGTERM` recibidos por la CLI se resuelven con `cancel()`: primero `SIGTERM` al hijo, luego `SIGKILL` si no termina.
- `timeout()` aplica la misma escalada cuando vence el plazo.
- Un código de salida distinto de 0 del hijo se propaga como `ProcessError` (código de proceso 5, ADR-005).
- `run()` captura stdout y stderr al terminar; `stream()` los emite conforme llegan, sin mezclarlos con el stdout contractual de la CLI.

Ningún otro módulo de la aplicación llama a `child_process.spawn` (ni a `exec` / `execFile` / `fork`). Solo la implementación de `ProcessRunner` habla con `child_process`.

## Consecuencias

### Positivas

- Timeout, cancelación y señales viven en un solo sitio.
- Los comandos dependen de una API estable, no de detalles de `child_process`.
- Encaja con ADR-004 (streams del hijo no contaminan `--output json`) y ADR-005 (`ProcessError` / código 5).

### Negativas / trade-offs

- Un `spawn` puntual “por urgencia” queda prohibido: hay que pasar por el runner aunque el caso sea trivial.
- La implementación del runner es el único sitio que conoce `child_process`; hay que mantenerla con cuidado (grupos de proceso, Windows vs POSIX).
- El scaffold aún no tiene `ProcessRunner` en `src/`; el código tiene que alcanzar la decisión, no al revés.

## Referencias

- [ADR-004: Contratos de entrada/salida — modo humano y `--output json`](ADR-004-contratos-entrada-salida.md)
- [ADR-005: Modelo de errores y códigos de salida](ADR-005-modelo-errores-codigos-salida.md)
- [Estándares de Arquitectura y Diseño](../standards/architecture.md)
- [Node.js child_process](https://nodejs.org/api/child_process.html)
