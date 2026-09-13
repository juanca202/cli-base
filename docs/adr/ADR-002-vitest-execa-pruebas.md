---
id: ADR-002
status: Accepted
last_update: 2026-09-13
deciders: [Equipo]
tags: [testing, vitest, coverage, node, e2e, execa]
supersedes: null
superseded_by: null
emits: [testing/CR-001, testing/CR-002, testing/CR-003, testing/CR-004, testing/CR-005, testing/CR-006, testing/CR-007]
---

# ADR-002: Vitest, cobertura V8 y Execa para pruebas unitarias y E2E

## Contexto

La compuerta de calidad de un CLI Node+TypeScript trata las pruebas unitarias y la cobertura como chequeos bloqueantes. Había que elegir runner y recolector de cobertura que encajaran con ESM, TypeScript 5.9 y el layout `src/**/*.test.ts`. El default del ecosistema Jest se descartó a favor de Vitest, el default Node+TS del harness.

La suite unitaria ejercita el entry point importándolo en proceso y mockeando `process.argv`, `stdout`/`stderr` y las señales (`src/cli.test.ts`) — nunca invoca el binario real. Como plantilla base para arrancar CLIs (`cli-base`), el contrato externo que fija ADR-004 (E/S) y ADR-005 (códigos de salida) es justamente lo que cada proyecto derivado va a depender, así que además de la señal unitaria hace falta una capa que valide ese contrato desde fuera del proceso, contra el entry point real.

## Decisión

Adoptar Vitest como runner tanto para la suite unitaria como para la suite E2E, y `@vitest/coverage-v8` como recolector de cobertura de la suite unitaria. Los scripts canónicos son `npm test` (`vitest run`) y `npm run test:coverage` (`vitest run --coverage`), con configuración en `vitest.config.ts`. El comando de ejemplo `hello` queda cubierto en `src/commands/hello.test.ts`.

El umbral de cobertura exigido es ≥ 80% en los cuatro indicadores (líneas, sentencias, funciones y ramas), declarado en `coverage.thresholds` de `vitest.config.ts` para que `npm run test:coverage` lo aplique como compuerta bloqueante.

Para la suite E2E se adopta Execa para lanzar el CLI como proceso hijo real. Las pruebas E2E ejecutan el entry point real del CLI (el binario empaquetado) y validan su comportamiento observable: código de salida, stdout, stderr, el manejo de argumentos y opciones, el comportamiento ante entradas válidas e inválidas, y los efectos observables sobre el filesystem o recursos temporales cuando corresponda. La suite E2E se mantiene separada de las pruebas unitarias y de las de integración: vive en su propia ubicación, con su propio script canónico, sin mezclarse con `npm test`.

## Alternativas consideradas

- Jest: default histórico de muchos scaffolds Node; más pesado y peor encaje ESM nativo que Vitest en un proyecto TypeScript contemporáneo.

## Consecuencias

### Positivas

- Mismo toolchain (Vite/Vitest) que el default Node+TS: watch rápido, ESM nativo, API familiar (`describe`/`it`/`expect`).
- La cobertura se recolecta sin un runner aparte (nyc/c8 suelto).
- La compuerta unit + coverage queda cableada desde la inicialización.
- La suite E2E con Execa cierra el hueco de la unitaria: cazar fallos de empaquetado o del binario publicado que un test en proceso no puede ver.
- Un solo framework de pruebas (Vitest) para ambas capas: no se introduce un segundo runner ni una curva de aprendizaje adicional.

### Negativas / trade-offs

- La suite E2E necesita el binario construido (`npm run build`) antes de ejecutarse: su ciclo de feedback es más lento que el de la suite unitaria.
- Añade `execa` como dependencia nueva y un segundo eje de configuración de pruebas a mantener junto al de Vitest unitario.

## Referencias

- [ADR-004: Contratos de entrada/salida — modo humano y `--output json`](ADR-004-contratos-entrada-salida.md)
- [ADR-005: Modelo de errores y códigos de salida](ADR-005-modelo-errores-codigos-salida.md)
- [Vitest](https://vitest.dev/)
- [@vitest/coverage-v8](https://vitest.dev/guide/coverage)
- [Execa](https://github.com/sindresorhus/execa)
- [Estándares de Pruebas](../standards/testing.md)
