---
name: Estándares de CLI
domain: cli
status: Active
last_update: 2026-09-13
source_adrs: [ADR-004, ADR-005]
tags: [cli, output, json, contratos, errors, exit-codes]
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

## Criterios de cumplimiento

| ID | Requisito | Descripción | Automatizable | Enfoque | Verificación |
|----|-----------|-------------|---------------|---------|--------------|
| CR-001 | io-contracts | Todo comando con resultado observable **DEBE** aceptar `--output json`. | yes | bloqueante | [checks/cli.mjs](../../scripts/arch/checks/cli.mjs) |
| CR-002 | io-contracts | En modo máquina, los mensajes de progreso o diagnóstico **NO DEBEN** escribirse en stdout. | yes | bloqueante | [checks/cli.mjs](../../scripts/arch/checks/cli.mjs) |
| CR-003 | error-model | La jerarquía de errores **DEBE** incluir `RuntimeError` y las especializaciones `ConfigurationError`, `ValidationError`, `ProcessError`, `ConnectionError` y `ExternalServiceError`. | yes | bloqueante | [checks/cli.mjs](../../scripts/arch/checks/cli.mjs) |
| CR-004 | error-model | El éxito **DEBE** terminar con código de salida 0. | yes | bloqueante | [checks/cli.mjs](../../scripts/arch/checks/cli.mjs) |
| CR-005 | error-model | Los códigos de salida **DEBEN** ser únicamente 0–5 con los significados acordados (éxito, error interno, argumentos inválidos, configuración, runtime no disponible, proceso externo). | yes | bloqueante | [checks/cli.mjs](../../scripts/arch/checks/cli.mjs) |
| CR-006 | error-model | Cada tipo de error **DEBE** mapear al código acordado (`RuntimeError`→1, `ValidationError`→2, `ConfigurationError`→3, `ConnectionError`→4, `ProcessError`/`ExternalServiceError`→5). | yes | bloqueante | [checks/cli.mjs](../../scripts/arch/checks/cli.mjs) |

## Referencias

- ADR de origen: [ADR-004](../adr/ADR-004-contratos-entrada-salida.md), [ADR-005](../adr/ADR-005-modelo-errores-codigos-salida.md)
- [ADR-001](../adr/ADR-001-typescript-commander-cli.md)
