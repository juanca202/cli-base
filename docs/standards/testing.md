---
name: Estándares de Pruebas
domain: testing
status: Active
last_update: 2026-10-25
source_adrs: [ADR-002, ADR-010]
tags: [testing, vitest, coverage]
---

# Estándares de Pruebas

Normas de verificación de la plantilla CLI. Aplica a la suite unitaria y a la recolección de cobertura. Las pruebas E2E y de API no viven en este repositorio: se implementan en el repositorio `quality-tests`.

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
**Estado:** Superseded

Retirado por [ADR-010](../adr/ADR-010-pruebas-e2e-en-quality-tests.md): las pruebas E2E del CLI y sus requisitos viven en el repositorio `quality-tests` (su ADR-012 y su estándar de pruebas). Este repositorio no aloja suite, configuración, script ni dependencias E2E.

### Excepciones
Ninguna.

## Criterios de cumplimiento

| ID | Requisito | Descripción | Automatizable | Enfoque | Verificación |
|----|-----------|-------------|---------------|---------|--------------|
| CR-001 | unit-testing | Las pruebas unitarias **DEBEN** implementarse con Vitest. | yes | bloqueante | [checks/testing.mjs](../../scripts/arch/checks/testing.mjs) |
| CR-002 | coverage | La suite **DEBE** poder ejecutarse con cobertura vía `npm run test:coverage`. | yes | bloqueante | [checks/testing.mjs](../../scripts/arch/checks/testing.mjs) |
| CR-003 | coverage-threshold | La cobertura de líneas, sentencias, funciones y ramas **DEBE** ser ≥ 80% en cada indicador. | yes | bloqueante | [checks/testing.mjs](../../scripts/arch/checks/testing.mjs) |
| CR-004 | e2e-testing | Las pruebas E2E **DEBEN** implementarse con Vitest y Execa. | yes | bloqueante | Retirado — Superseded por [ADR-010](../adr/ADR-010-pruebas-e2e-en-quality-tests.md); vive en `quality-tests` |
| CR-005 | e2e-testing | La suite E2E **DEBE** vivir fuera de `src/` (`tests/e2e/`), con script (`test:e2e`) y config (`vitest.e2e.config.ts`) propios, separados de `npm test`. | yes | bloqueante | Retirado — Superseded por [ADR-010](../adr/ADR-010-pruebas-e2e-en-quality-tests.md); vive en `quality-tests` |
| CR-006 | e2e-testing | Las pruebas E2E **DEBEN** invocar el binario/entry point real vía Execa y **NO DEBEN** importar código interno de `src/features/` ni `src/commands/`. | yes | bloqueante | Retirado — Superseded por [ADR-010](../adr/ADR-010-pruebas-e2e-en-quality-tests.md); vive en `quality-tests` |
| CR-007 | e2e-testing | Cada prueba E2E **DEBE** aserir comportamiento observable concreto (código de salida, stdout, stderr o efectos en disco/red), no solo la ausencia de excepción. | no | bloqueante | Retirado — Superseded por [ADR-010](../adr/ADR-010-pruebas-e2e-en-quality-tests.md); vive en `quality-tests` |

## Referencias

- ADR de origen: [ADR-002](../adr/ADR-002-vitest-execa-pruebas.md) (CR-001, CR-002, CR-003; CR-004 a CR-007 retirados), [ADR-010](../adr/ADR-010-pruebas-e2e-en-quality-tests.md) (retira CR-004 a CR-007)
- [Vitest](https://vitest.dev/)
