---
id: ADR-005
status: Accepted
last_update: 2026-09-13
deciders: [Equipo]
tags: [cli, errors, exit-codes, agents]
supersedes: null
superseded_by: null
emits: [cli/CR-003, cli/CR-004, cli/CR-005, cli/CR-006]
---

# ADR-005: Modelo de errores y códigos de salida

## Contexto

Los consumers de esta plantilla no son solo personas: skills y agents invocan la CLI y tienen que decidir el siguiente paso según *qué* falló. Un `exit 1` genérico o un `Error` de JavaScript no distinguen un argumento inválido de un runtime caído o de un proceso externo. ADR-004 ya fija cómo se *emite* el resultado (`--output json`); faltaba cómo se *clasifica* el fallo y qué código de proceso lo señala, para que un agente reaccione sin parsear prosa.

## Decisión

Adoptar una jerarquía de errores con `RuntimeError` como tipo base y cinco especializaciones: `ConfigurationError`, `ValidationError`, `ProcessError`, `ConnectionError` y `ExternalServiceError`.

Adoptar un conjunto fijo de códigos de salida, estable para integraciones automatizadas:

| Código | Significado | Tipo asociado |
|--------|-------------|----------------|
| 0 | Success | — |
| 1 | Internal error | `RuntimeError` (base u otro no clasificado) |
| 2 | Invalid arguments | `ValidationError` |
| 3 | Configuration error | `ConfigurationError` |
| 4 | Runtime unavailable | `ConnectionError` |
| 5 | External process error | `ProcessError`, `ExternalServiceError` |

El código de salida es el contrato programático; el tipo de error es la clasificación interna que alimenta ese código (y, en modo máquina, el payload).

## Consecuencias

### Positivas

- Skills y agents pueden ramificar por `process.exitCode` sin interpretar texto.
- La taxonomía es corta y estable: un agente no tiene que conocer decenas de subtipos.
- Encaja con ADR-004: el modo JSON puede incluir el tipo; el código de salida vale también en modo humano.

### Negativas / trade-offs

- Hay que mapear cada fallo a un tipo; el residual cae en `RuntimeError` / código 1 y pierde matiz.
- `ConnectionError` y «runtime unavailable» quedan unidos: un fallo de red a un servicio que no es el runtime comparte el código 4.
- `ProcessError` y `ExternalServiceError` comparten el código 5; la distinción vive en el tipo, no en el exit code.
- El scaffold aún no declara la jerarquía ni el mapeo; el código tiene que alcanzar la decisión, no al revés.

## Referencias

- [ADR-004: Contratos de entrada/salida — modo humano y `--output json`](ADR-004-contratos-entrada-salida.md)
- [Estándares de CLI](../standards/cli.md)
