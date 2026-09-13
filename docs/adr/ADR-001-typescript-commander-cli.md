---
id: ADR-001
status: Accepted
last_update: 2026-09-13
deciders: [Equipo]
tags: [architecture, typescript, commander, cli, node, esm]
supersedes: null
superseded_by: null
emits: [architecture/CR-001, architecture/CR-002, architecture/CR-003]
---

# ADR-001: TypeScript y Commander.js como stack de la plantilla CLI

## Contexto

Este repositorio es una plantilla CLI reutilizable (starter/base), no un producto de negocio. Tiene que ser instalable, copiable y servir de origen para futuros CLIs. Había que elegir runtime y framework de esa base: el scaffold debía quedar opinado pero ligero — punto de entrada, registro de comandos y un comando de ejemplo — sin arrastrar un generador ni un modelo de plugins que la plantilla no necesita hoy.

Se valoró un runtime con tipado, un parser maduro en ESM y un layout manual predecible (`src/cli.ts`, `src/program.ts`, `src/commands/`). TypeScript 5.9 se ancló porque TypeScript 7 aún no tiene peer compatible de `typescript-eslint`. Commander 15 es ESM nativo. El runtime mínimo quedó en Node >= 22.12.

## Decisión

Adoptar TypeScript + Commander.js como stack de la plantilla CLI, con scaffold manual ESM: bin `cli-base`, Node >= 22.12, npm, TypeScript 5.9 y Commander 15. El layout fijo es `src/cli.ts` (entrada), `src/program.ts` (programa) y `src/commands/` (comandos).

Se eligió este par frente a la recomendación de investigación (TypeScript + oclif) porque Commander cubre el parser y el modelo de comandos sin imponer generador, plugins ni empaquetado standalone. El resto de opciones (Python + Typer + uv, Go + Cobra, Rust + clap) se descartaron para mantener un único ecosistema Node+TS alineado con la compuerta de calidad del harness.

## Alternativas consideradas

- TypeScript + oclif: scaffold y plugins oficiales; más pesado y opinado de lo que pide una plantilla mínima.
- Python + Typer + uv: DX excelente; otro runtime y otro ecosistema de empaquetado.
- Go + Cobra: binario nativo y arranque rápido; menos alineado con el toolchain Node del harness.
- Rust + clap: máximo desempeño y binario estático; curva y toolchain ajenos a esta base.

## Consecuencias

### Positivas

- Stack único (Node + TypeScript + npm) compartido con lint, tests y el runner de arquitectura.
- Commander 15 es ESM, ligero y suficiente para comandos, flags y help.
- El layout manual se copia a un CLI derivado sin pasar por un generador.

### Negativas / trade-offs

- No hay generador oficial de comandos ni modelo de plugins (oclif sí los trae).
- TypeScript queda anclado en 5.9 hasta que `typescript-eslint` soporte una major posterior.
- Quien instale un CLI derivado necesita Node; no se empaqueta un binario standalone.

## Referencias

- [Commander.js](https://github.com/tj/commander.js)
- [TypeScript](https://www.typescriptlang.org/)
- [Estándares de Arquitectura y Diseño](../standards/architecture.md)
