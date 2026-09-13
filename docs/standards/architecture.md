---
name: Estándares de Arquitectura y Diseño
domain: architecture
status: Active
last_update: 2026-09-13
source_adrs: [ADR-001, ADR-006, ADR-007]
tags: [architecture, typescript, commander, cli, esm, process-runner, capabilities]
---

# Estándares de Arquitectura y Diseño

Normas de estructura y runtime de la plantilla CLI: lenguaje, framework, layout, límites entre módulos y cómo se lanzan procesos hijos.

## Stack de la plantilla CLI
**ID:** cli-stack
**Estado:** Active

La plantilla es un CLI Node en TypeScript, no un binario nativo ni un servicio HTTP. El proyecto **DEBE** implementar la CLI en TypeScript con Commander.js, layout `src/cli.ts` + `src/program.ts` + `src/commands/`, ESM y Node >= 22.12. `src/cli.ts` es el bin de entrada; `src/program.ts` construye el `Command` raíz; cada comando vive en `src/commands/` y se registra desde el programa.

### Excepciones
Ninguna.

## Gestión de procesos hijos
**ID:** process-runner
**Estado:** Active

Los procesos hijos (Claude CLI, Git, npm, tests u otros) se lanzan solo a través de `ProcessRunner`. La aplicación **NO DEBE** llamar a `child_process.spawn`, `exec`, `execFile` ni `fork` fuera de la implementación del runner. `ProcessRunner` **DEBE** exponer `run()`, `stream()`, `cancel()` y `timeout()`, usar `spawn` (no `exec`), cancelar y vencer timeout con `SIGTERM` y luego `SIGKILL`, y mapear un exit distinto de 0 del hijo a `ProcessError`. `run()` captura stdout/stderr; `stream()` los emite en tiempo real sin mezclarlos con el stdout contractual de la CLI.

### Excepciones
La implementación de `ProcessRunner` **PUEDE** importar `child_process`. Los tests **PUEDEN** mockear `child_process` o el runner. Herramientas de tooling fuera de `src/` (scripts de build, fitness functions) quedan fuera de este requisito.

## Modularidad por capacidades
**ID:** capability-modularity
**Estado:** Active

El sistema se organiza por capacidades en `src/features/<nombre>/`. Esas carpetas **DEBEN** ser el límite principal de modularidad: la lógica de una capacidad vive ahí y se expone por una API pública. `src/commands/` **DEBE** limitarse a adaptadores de Commander hacia esa API. Una capacidad **NO DEBE** importar internos de otra. La separación entrada / aplicación / infraestructura **PUEDE** omitirse en capacidades simples y **DEBE** usarse cuando la capacidad habla con infraestructura (procesos, red, disco).

### Excepciones
`src/cli.ts`, `src/program.ts` y la infraestructura compartida (p. ej. `ProcessRunner`, salida JSON, tipos de error) **PUEDEN** vivir fuera de una capacidad. El comando de scaffold `hello` **PUEDE** permanecer en `src/commands/` hasta que exista su capacidad.

## Criterios de cumplimiento

| ID | Requisito | Descripción | Automatizable | Enfoque | Verificación |
|----|-----------|-------------|---------------|---------|--------------|
| CR-001 | cli-stack | El manifiesto **DEBE** declarar Node `>=22.12` y el proyecto **DEBE** ser ESM (`"type": "module"`). | yes | bloqueante | [checks/architecture.mjs](../../scripts/arch/checks/architecture.mjs) |
| CR-002 | cli-stack | La CLI **DEBE** implementarse en TypeScript con Commander.js. | yes | bloqueante | [checks/architecture.mjs](../../scripts/arch/checks/architecture.mjs) |
| CR-003 | cli-stack | El layout **DEBE** incluir `src/cli.ts`, `src/program.ts` y el directorio `src/commands/`. | yes | bloqueante | [checks/architecture.mjs](../../scripts/arch/checks/architecture.mjs) |
| CR-004 | process-runner | `src/` **NO DEBE** importar `child_process` ni `node:child_process` fuera de la implementación de `ProcessRunner`. | yes | bloqueante | [checks/architecture.mjs](../../scripts/arch/checks/architecture.mjs) |
| CR-005 | process-runner | `ProcessRunner` **DEBE** exponer `run()`, `stream()`, `cancel()` y `timeout()`. | yes | bloqueante | [checks/architecture.mjs](../../scripts/arch/checks/architecture.mjs) |
| CR-006 | process-runner | `ProcessRunner` **DEBE** crear procesos con `spawn`, no con `exec`. | yes | bloqueante | [checks/architecture.mjs](../../scripts/arch/checks/architecture.mjs) |
| CR-007 | process-runner | `cancel()` y `timeout()` **DEBEN** enviar `SIGTERM` y, si el hijo no termina, `SIGKILL`. | yes | bloqueante | [checks/architecture.mjs](../../scripts/arch/checks/architecture.mjs) |
| CR-008 | process-runner | Un código de salida distinto de 0 del hijo **DEBE** mapearse a `ProcessError`. | yes | bloqueante | [checks/architecture.mjs](../../scripts/arch/checks/architecture.mjs) |
| CR-009 | capability-modularity | La lógica de cada capacidad **DEBE** vivir en `src/features/<nombre>/`. | yes | bloqueante | [checks/architecture.mjs](../../scripts/arch/checks/architecture.mjs) |
| CR-010 | capability-modularity | `src/commands/` **DEBE** limitarse a adaptadores de Commander hacia la API pública de una feature (`hello` de scaffold exceptuado). | yes | bloqueante | [checks/architecture.mjs](../../scripts/arch/checks/architecture.mjs) |
| CR-011 | capability-modularity | Una feature **NO DEBE** importar internos de otra; solo su `index` público. | yes | bloqueante | [checks/architecture.mjs](../../scripts/arch/checks/architecture.mjs) |
| CR-012 | capability-modularity | El I/O de una feature **DEBE** vivir en un slice `infra/` (o `infrastructure/`) de esa feature. | yes | bloqueante | [checks/architecture.mjs](../../scripts/arch/checks/architecture.mjs) |

## Referencias

- ADR de origen: [ADR-001](../adr/ADR-001-typescript-commander-cli.md), [ADR-006](../adr/ADR-006-gestion-procesos-hijos.md), [ADR-007](../adr/ADR-007-arquitectura-por-capacidades.md)
- [Commander.js](https://github.com/tj/commander.js)
