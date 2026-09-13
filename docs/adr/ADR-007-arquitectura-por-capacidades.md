---
id: ADR-007
status: Accepted
last_update: 2026-09-13
deciders: [Equipo]
tags: [architecture, capabilities, feature-based, modularity]
supersedes: null
superseded_by: null
emits: [architecture/CR-009, architecture/CR-010, architecture/CR-011, architecture/CR-012]
---

# ADR-007: Arquitectura organizada por capacidades

## Contexto

El scaffold de ADR-001 deja `src/commands/` como carpeta plana de comandos. En cuanto el CLI deje de ser un `hello` de muestra y pase a orquestar runtime, git, procesos y contratos JSON, esa carpeta se convierte en un cajón de lógica mezclada con flags de Commander. Los límites que importan no son “un archivo por comando”, sino las **capacidades** del producto (qué problema resuelve cada trozo).

Hace falta un criterio de modularidad que escale sin imponer hexagonal completo en cada carpeta. Una separación ligera entrada / aplicación / infraestructura solo aporta cuando la capacidad habla de verdad con el exterior (ProcessRunner, red, disco).

## Decisión

Organizar el código por **capacidades** (feature-based). Esas capacidades son el límite principal de modularidad.

- La lógica vive en `src/features/<nombre>/`.
- `src/commands/` se queda como capa de **adaptadores finos**: registra Commander, traduce argumentos y delega en la API pública de una capacidad. No concentra reglas ni orquestación.
- Dentro de una capacidad, la separación entrada / aplicación / infraestructura es **opcional y ligera**: se introduce cuando esa capacidad lo requiere (I/O, procesos, persistencia), no por defecto en todas.

`src/cli.ts` y `src/program.ts` siguen siendo la entrada global (ADR-001). ProcessRunner y los contratos de I/O/errores son infraestructura compartida; las capacidades los usan, no los reimplementan.

## Consecuencias

### Positivas

- Un cambio de negocio se localiza en una carpeta de capacidad, no repartido entre comandos sueltos.
- Commander no dicta el diseño interno: el comando es un adaptador.
- Se evita el costo de capas vacías en capacidades simples.

### Negativas / trade-offs

- Hay que decidir el nombre y la API pública de cada capacidad; el límite es de diseño, no solo de carpetas.
- Dos capacidades no deben husmear en los internos de la otra; hace falta disciplina (y, si se audita, reglas de import).
- El scaffold aún no tiene `src/features/`; el `hello` actual en `src/commands/` no cumple aún este modelo. El código tiene que alcanzar la decisión, no al revés.

## Referencias

- [ADR-001: TypeScript y Commander.js como stack de la plantilla CLI](ADR-001-typescript-commander-cli.md)
- [ADR-006: Gestión de procesos hijos mediante ProcessRunner](ADR-006-gestion-procesos-hijos.md)
- [Estándares de Arquitectura y Diseño](../standards/architecture.md)
