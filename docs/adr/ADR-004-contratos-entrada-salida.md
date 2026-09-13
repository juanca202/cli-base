---
id: ADR-004
status: Accepted
last_update: 2026-09-13
deciders: [Equipo]
tags: [cli, output, json, contratos, agents]
supersedes: null
superseded_by: null
emits: [cli/CR-001, cli/CR-002]
---

# ADR-004: Contratos de entrada/salida — modo humano y `--output json`

## Contexto

Esta plantilla no solo la usarán personas en un terminal. Los consumidores primarios de un CLI derivado incluyen agents y skills: procesos que invocan comandos, leen stdout y deciden el siguiente paso. Una salida pensada solo para lectura humana (frases, columnas, colores) rompe esa integración: no es parseable de forma estable ni versionable.

Hace falta un contrato de I/O desde el inicio, no como añadido posterior. El flag `--output json` es ese contrato: estable, explícito y compartido por todos los comandos que producen un resultado. El ejemplo de referencia es un comando de estado en modo humano frente al mismo comando con `--output json` y un objeto JSON contractual (`status`, `sessionId`, …).

Esta decisión complementa ADR-001 (stack Commander): el parser ya existe; lo que faltaba era la política de salida hacia humanos y hacia máquinas.

## Decisión

Adoptar dos modos de salida en la plantilla CLI:

- **Modo humano** — por defecto, cuando no se pide otro formato. Texto pensado para lectura en terminal.
- **Modo máquina** — `--output json`. Salida estructurada, parseable y versionable.

Toda integración automatizada (agents, skills, scripts) debe poder usar esa salida estructurada. `--output json` es el contrato estable desde el primer comando, no un extra opcional de algunos subcomandos.

## Consecuencias

### Positivas

- Agents y skills consumen un contrato JSON explícito en lugar de parsear prosa.
- El flag es uno solo (`--output`) y el valor `json` queda fijo como formato de máquina.
- Versionar el payload permite evolucionar el contrato sin romper clientes antiguos.

### Negativas / trade-offs

- Cada comando con resultado observable tiene que emitir las dos formas (humano y JSON).
- El contrato JSON hay que diseñar y versionar; no basta con `JSON.stringify` de un objeto interno.
- El scaffold aún no implementa el flag; el código tiene que alcanzar la decisión, no al revés.

## Referencias

- [ADR-001: TypeScript y Commander.js como stack de la plantilla CLI](ADR-001-typescript-commander-cli.md)
- [Estándares de CLI](../standards/cli.md)
