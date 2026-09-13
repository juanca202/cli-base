---
name: Estándares de CLI
domain: cli
status: Active
last_update: 2026-09-13
source_adrs: [ADR-004, ADR-005, ADR-008]
tags: [cli, output, json, contratos, errors, exit-codes, dry-run]
---

# Estándares de CLI

Normas de la interfaz de línea de comandos de esta plantilla: salida a humanos y a consumidores automatizados, y cómo se clasifican los fallos y los códigos de proceso.

## Contratos de entrada/salida
**ID:** io-contracts
**Estado:** Active

La CLI tiene dos modos de salida. El modo humano es el predeterminado y está pensado para lectura en terminal. El modo máquina se activa con `--output json` y es el contrato estable para integración automatizada. Todo comando que produzca un resultado observable **DEBE** aceptar `--output json` y, en ese modo, emitir por stdout un JSON parseable y versionable, sin mezclar prosa humana. Los mensajes de progreso o diagnóstico **NO DEBEN** contaminar stdout en modo máquina.

### Excepciones
Comandos que no producen un resultado de negocio (solo `--help`, `--version` nativos del parser) **PUEDEN** conservar la salida de ayuda/versión del framework.

## Modelo de errores y códigos de salida
**ID:** error-model
**Estado:** Active

Los fallos se clasifican con `RuntimeError` como tipo base y las especializaciones `ConfigurationError`, `ValidationError`, `ProcessError`, `ConnectionError` y `ExternalServiceError`. El proceso **DEBE** terminar con un código de salida del conjunto fijo 0–5: 0 éxito; 1 `RuntimeError`; 2 `ValidationError`; 3 `ConfigurationError`; 4 `ConnectionError`; 5 `ProcessError` o `ExternalServiceError`. Ese código es el contrato para que skills y agents reaccionen sin parsear la salida humana.

### Excepciones
`--help` y `--version` del parser **PUEDEN** usar el código de salida que defina Commander (habitualmente 0). Un `process.exit` de emergencia fuera de la CLI (señal, abort del runtime) queda fuera de este requisito.

## Dry-run
**ID:** dry-run
**Estado:** Active

Todo comando que produzca efectos secundarios (escritura en filesystem, procesos externos, cambios de configuración o de recursos externos) **DEBE** soportar un modo `--dry-run`, salvo excepción justificada y documentada. `--dry-run` **DEBE** usar una semántica consistente en todos los comandos: el comando ejecuta sus validaciones normalmente, determina las acciones que realizaría, las informa al usuario de forma clara e indicando que se trata de una simulación, y evita cualquier efecto secundario persistente. El comportamiento normal del comando **NO DEBE** depender de `--dry-run`; la bandera únicamente conmuta la ejecución de las operaciones con efectos secundarios. Las operaciones simuladas **DEBEN** ser lo más representativas posible de la ejecución real. Los comandos inherentemente de solo lectura (`status`, `list`, y equivalentes) **NO** requieren implementar `--dry-run` — pero, igual que cualquier comando exento, **DEBEN** quedar registrados en `src/commands/dry-run-exemptions.ts` con una justificación breve (p. ej. "solo lectura, sin efectos secundarios"), de modo que la ausencia de `--dry-run` en cualquier comando siempre tenga una razón documentada y verificable, nunca un olvido silencioso.

### Excepciones
Un comando con efectos secundarios que no pueda simularse de forma significativa **PUEDE** quedar exento, siempre que la excepción quede documentada junto al comando con su justificación (mismo registro que los comandos de solo lectura).

## Criterios de cumplimiento

| ID | Requisito | Descripción | Automatizable | Enfoque | Verificación |
|----|-----------|-------------|---------------|---------|--------------|
| CR-001 | io-contracts | Todo comando con resultado observable **DEBE** aceptar `--output json`. | yes | bloqueante | [checks/cli.mjs](../../scripts/arch/checks/cli.mjs) |
| CR-002 | io-contracts | En modo máquina, los mensajes de progreso o diagnóstico **NO DEBEN** escribirse en stdout. | yes | bloqueante | [checks/cli.mjs](../../scripts/arch/checks/cli.mjs) |
| CR-003 | error-model | La jerarquía de errores **DEBE** incluir `RuntimeError` y las especializaciones `ConfigurationError`, `ValidationError`, `ProcessError`, `ConnectionError` y `ExternalServiceError`. | yes | bloqueante | [checks/cli.mjs](../../scripts/arch/checks/cli.mjs) |
| CR-004 | error-model | El éxito **DEBE** terminar con código de salida 0. | yes | bloqueante | [checks/cli.mjs](../../scripts/arch/checks/cli.mjs) |
| CR-005 | error-model | Los códigos de salida **DEBEN** ser únicamente 0–5 con los significados acordados (éxito, error interno, argumentos inválidos, configuración, runtime no disponible, proceso externo). | yes | bloqueante | [checks/cli.mjs](../../scripts/arch/checks/cli.mjs) |
| CR-006 | error-model | Cada tipo de error **DEBE** mapear al código acordado (`RuntimeError`→1, `ValidationError`→2, `ConfigurationError`→3, `ConnectionError`→4, `ProcessError`/`ExternalServiceError`→5). | yes | bloqueante | [checks/cli.mjs](../../scripts/arch/checks/cli.mjs) |
| CR-007 | dry-run | Existe un mecanismo compartido de `--dry-run` (opción + reporte de simulación) con semántica consistente, reutilizable por cualquier comando. | yes | bloqueante | [checks/cli.mjs](../../scripts/arch/checks/cli.mjs) |
| CR-008 | dry-run | Todo comando de `src/commands/` con efectos secundarios **DEBE** usar el mecanismo compartido de `--dry-run`, o quedar listado con su justificación en el registro de excepciones documentadas. | yes | bloqueante | [checks/cli.mjs](../../scripts/arch/checks/cli.mjs) |
| CR-009 | dry-run | En `--dry-run`, el comando **DEBE** ejecutar sus validaciones normales, evitar efectos secundarios reales y reportar las acciones previstas de forma representativa de la ejecución real. | no | bloqueante | Pending — verificación manual en pull request |

## Referencias

- ADR de origen: [ADR-004](../adr/ADR-004-contratos-entrada-salida.md), [ADR-005](../adr/ADR-005-modelo-errores-codigos-salida.md), [ADR-008](../adr/ADR-008-dry-run-comandos-con-efectos-secundarios.md)
- [ADR-001](../adr/ADR-001-typescript-commander-cli.md)
