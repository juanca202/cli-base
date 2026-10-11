---
id: ADR-009
status: Accepted
last_update: 2026-10-11
deciders: [Equipo]
tags: [cli, output, toon, json, contratos, agents]
supersedes: ADR-004
superseded_by: null
emits: [cli/CR-001, cli/CR-002]
---

# ADR-009: Salida TOON por defecto y JSON, sin formato humano

## Contexto

ADR-004 fijó dos modos de salida: humano (por defecto) y `--output json`. En la práctica los únicos
consumidores del CLI son agents y skills, que leen stdout y deciden el siguiente paso: el modo humano obliga a
mantener y probar un tercer contrato (tablas, resúmenes, mensajes por stderr) que nadie parsea, y el JSON de una
línea es costoso en tokens para quien lo lee. TOON (Token-Oriented Object Notation) representa la misma
estructura de forma compacta y sigue siendo determinista y parseable.

## Decisión

- `--output` acepta **solo dos valores**: `toon` (por defecto) y `json`. Cualquier otro (incluido `human`) es
  `INVALID_OUTPUT_FORMAT` (`ValidationError`, código 2), reportado en TOON por stdout.
- **No existe formato humano**: no hay tablas de ancho fijo, líneas de resumen ni mensajes de error por stderr.
- Todos los comandos emiten en éxito el envolvente `cli-<comando>/v<n>` (`schema`, `command`, `ok`, `data`) en el
  formato elegido; **`next` es la excepción**: emite su objeto plano, sin envolvente (formato dado por el usuario).
- Los fallos son el envolvente `cli-error/v1` por stdout en el mismo formato, con su código de salida (ADR-005).
  stderr queda solo para diagnóstico o progreso.
- `--dry-run` responde en el mismo formato (`{ dryRun, actions }`).
- La salida es determinista: mismo estado del repositorio, mismos bytes, en ambos formatos.

## Consecuencias

### Positivas

- Un solo contrato estructurado, con dos codificaciones del mismo objeto; menos código y menos pruebas.
- El formato por defecto es más barato en tokens para agents y skills.

### Negativas / trade-offs

- Una persona en terminal lee TOON, no tablas: es legible pero no está pensado para ojos humanos.
- Es un cambio incompatible respecto de ADR-004: los consumidores que leían texto humano deben migrar.
- El codificador TOON es propio (`src/toon.ts`) y cubre el subconjunto que usan los payloads del CLI.

## Referencias

- [ADR-004: Contratos de entrada/salida — modo humano y `--output json`](ADR-004-contratos-entrada-salida.md)
- [ADR-005: Modelo de errores y códigos de salida](ADR-005-modelo-errores-codigos-salida.md)
- [Estándares de CLI](../standards/cli.md)
