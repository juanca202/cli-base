---
name: Estándares de Pruebas
domain: testing
status: Active
last_update: 2026-09-13
source_adrs: [ADR-002]
tags: [testing, vitest, coverage, e2e, execa]
---

# Estándares de Pruebas

Normas de verificación de la plantilla CLI. Aplica a la suite unitaria, a la recolección de cobertura y a la suite E2E; no define pruebas de contrato HTTP/API.

## Pruebas unitarias
**ID:** unit-testing
**Estado:** Active

Las pruebas unitarias ejercitan comandos y unidades de `src/` de forma observable (salida, código de salida, comportamiento del programa). Las pruebas unitarias **DEBEN** implementarse con Vitest. El script canónico es `npm test` (`vitest run`); la configuración vive en `vitest.config.ts` y los tests junto al código (`src/**/*.test.ts`).

### Excepciones
Ninguna.

## Cobertura
**ID:** coverage
**Estado:** Active

La compuerta de calidad necesita poder medir cobertura sin un recolector ajeno al runner. La suite **DEBE** poder ejecutarse con cobertura vía `npm run test:coverage`. El proveedor configurado es `@vitest/coverage-v8`.

### Excepciones
Ninguna. El umbral numérico no pertenece a este requisito: vive en `coverage-threshold`.

## Umbral de cobertura
**ID:** coverage-threshold
**Estado:** Active

La cobertura del código de producción **DEBE** ser ≥ 80% en todos los indicadores: líneas, sentencias, funciones y ramas. Los cuatro umbrales se declaran en la configuración del recolector de cobertura para que la compuerta `npm run test:coverage` los aplique; los archivos de test no cuentan hacia el porcentaje.

### Excepciones
Ninguna.

## E2E testing
**ID:** e2e-testing
**Estado:** Active

Las pruebas E2E prueban el CLI como una caja negra: lo ejercitan desde fuera del proceso, como lo observaría un consumidor real, nunca importando su código interno. **DEBEN** implementarse con Vitest (mismo runner que la suite unitaria) y Execa para lanzar el binario compilado o el punto de entrada (`src/cli.ts`) como proceso hijo real. **DEBEN** ubicarse fuera de `src/`, bajo `tests/`, con su propio script canónico `npm run test:e2e` y su propia configuración (`vitest.e2e.config.ts`), sin mezclarse con `npm test` ni con las pruebas de integración. Una prueba E2E **NO DEBE** importar código interno de `src/features/` ni de `src/commands/`.

La carpeta `tests/` organiza la suite E2E así:

```
tests/
├── setup.ts              # Helpers globales (compilar el binario, mocks de entorno)
├── helpers/
│   └── cli-runner.ts      # Runner que ejecuta `node dist/cli.js ...` vía Execa
├── e2e/                   # Pruebas E2E por comando o flujo: <comando>.e2e.test.ts
└── fixtures/              # Archivos de apoyo (proyectos ficticios, JSONs, etc.)
```

Solo `tests/e2e/**/*.e2e.test.ts` es la suite verificable por este requisito; `helpers/`, `fixtures/` y `setup.ts` son soporte de esa suite, no pruebas en sí.

Cada prueba E2E **DEBE** evaluar entradas (argumentos, variables de entorno, entradas por stdin) contra salidas observables: código de salida del proceso, stdout, stderr, y efectos reales en disco o red cuando el comando bajo prueba los produzca, incluyendo el comportamiento ante entradas válidas e inválidas. Que cada prueba individual asierta el comportamiento observable correcto (y no solo que el comando no lance una excepción) se verifica mediante revisión de código en el pull request.

### Excepciones
Ninguna.

## Criterios de cumplimiento

| ID | Requisito | Descripción | Automatizable | Enfoque | Verificación |
|----|-----------|-------------|---------------|---------|--------------|
| CR-001 | unit-testing | Las pruebas unitarias **DEBEN** implementarse con Vitest. | yes | bloqueante | [checks/testing.mjs](../../scripts/arch/checks/testing.mjs) |
| CR-002 | coverage | La suite **DEBE** poder ejecutarse con cobertura vía `npm run test:coverage`. | yes | bloqueante | [checks/testing.mjs](../../scripts/arch/checks/testing.mjs) |
| CR-003 | coverage-threshold | La cobertura de líneas, sentencias, funciones y ramas **DEBE** ser ≥ 80% en cada indicador. | yes | bloqueante | [checks/testing.mjs](../../scripts/arch/checks/testing.mjs) |
| CR-004 | e2e-testing | Las pruebas E2E **DEBEN** implementarse con Vitest y Execa. | yes | bloqueante | [checks/testing.mjs](../../scripts/arch/checks/testing.mjs) |
| CR-005 | e2e-testing | La suite E2E **DEBE** vivir fuera de `src/` (`tests/e2e/`), con script (`test:e2e`) y config (`vitest.e2e.config.ts`) propios, separados de `npm test`. | yes | bloqueante | [checks/testing.mjs](../../scripts/arch/checks/testing.mjs) |
| CR-006 | e2e-testing | Las pruebas E2E **DEBEN** invocar el binario/entry point real vía Execa y **NO DEBEN** importar código interno de `src/features/` ni `src/commands/`. | yes | bloqueante | [checks/testing.mjs](../../scripts/arch/checks/testing.mjs) |
| CR-007 | e2e-testing | Cada prueba E2E **DEBE** aserir comportamiento observable concreto (código de salida, stdout, stderr o efectos en disco/red), no solo la ausencia de excepción. | no | bloqueante | Pending — verificación manual en pull request |

## Referencias

- ADR de origen: [ADR-002](../adr/ADR-002-vitest-execa-pruebas.md) (CR-001, CR-002, CR-003, CR-004, CR-005, CR-006, CR-007)
- [Vitest](https://vitest.dev/)
- [Execa](https://github.com/sindresorhus/execa)
