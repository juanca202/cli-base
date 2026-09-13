---
id: ADR-002
status: Accepted
last_update: 2026-09-13
deciders: [Equipo]
tags: [testing, vitest, coverage, node]
supersedes: null
superseded_by: null
emits: [testing/CR-001, testing/CR-002]
---

# ADR-002: Vitest y cobertura V8 para pruebas unitarias

## Contexto

La compuerta de calidad de un CLI Node+TypeScript trata las pruebas unitarias y la cobertura como chequeos bloqueantes. Esta plantilla no tiene UI ni HTTP, así que E2E y API testing no aportan señal: la suite relevante es unitaria, rápida y ejecutable en local y en CI.

Había que elegir runner y recolector de cobertura que encajaran con ESM, TypeScript 5.9 y el layout `src/**/*.test.ts`. El default del ecosistema Jest se descartó a favor de Vitest, el default Node+TS del harness.

## Decisión

Adoptar Vitest como runner de pruebas unitarias y `@vitest/coverage-v8` como recolector de cobertura. Los scripts canónicos son `npm test` (`vitest run`) y `npm run test:coverage` (`vitest run --coverage`), con configuración en `vitest.config.ts`. El comando de ejemplo `hello` queda cubierto en `src/commands/hello.test.ts`.

No se añaden capas E2E ni de contrato HTTP: no hay superficie que las justifique en esta plantilla.

## Alternativas consideradas

- Jest: default histórico de muchos scaffolds Node; más pesado y peor encaje ESM nativo que Vitest en un proyecto TypeScript contemporáneo.

## Consecuencias

### Positivas

- Mismo toolchain (Vite/Vitest) que el default Node+TS: watch rápido, ESM nativo, API familiar (`describe`/`it`/`expect`).
- La cobertura se recolecta sin un runner aparte (nyc/c8 suelto).
- La compuerta unit + coverage queda cableada desde la inicialización.

### Negativas / trade-offs

- No hay red de seguridad E2E: un fallo de empaquetado o del bin publicado no lo caza esta suite.
- El umbral numérico de cobertura no forma parte de esta decisión; solo la capacidad de ejecutarla.

## Referencias

- [Vitest](https://vitest.dev/)
- [@vitest/coverage-v8](https://vitest.dev/guide/coverage)
- [Estándares de Pruebas](../standards/testing.md)
