---
name: Estándares de Pruebas
domain: testing
status: Active
last_update: 2026-09-13
source_adrs: [ADR-002]
tags: [testing, vitest, coverage]
---

# Estándares de Pruebas

Normas de verificación de la plantilla CLI. Aplica a la suite unitaria y a la recolección de cobertura; no define E2E ni pruebas de API.

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

La cobertura del código de producción **DEBE** ser ≥ 80% en todos los indicadores: líneas, sentencias, funciones y ramas. Los cuatro umbrales se declaran en la configuración del recolector de cobertura para que la compuerta `npm run test:coverage` los aplique; los archivos de test no cuentan hacia el porcentaje. La decisión de origen de este umbral está pendiente de documentar como ADR.

### Excepciones
Ninguna.

## Criterios de cumplimiento

| ID | Requisito | Descripción | Automatizable | Enfoque | Verificación |
|----|-----------|-------------|---------------|---------|--------------|
| CR-001 | unit-testing | Las pruebas unitarias **DEBEN** implementarse con Vitest. | yes | bloqueante | [checks/testing.mjs](../../scripts/arch/checks/testing.mjs) |
| CR-002 | coverage | La suite **DEBE** poder ejecutarse con cobertura vía `npm run test:coverage`. | yes | bloqueante | [checks/testing.mjs](../../scripts/arch/checks/testing.mjs) |
| CR-003 | coverage-threshold | La cobertura de líneas, sentencias, funciones y ramas **DEBE** ser ≥ 80% en cada indicador. | yes | bloqueante | [checks/testing.mjs](../../scripts/arch/checks/testing.mjs) |

## Referencias

- ADR de origen: [ADR-002](../adr/ADR-002-vitest-cobertura-unitaria.md) (CR-001, CR-002)
- CR-003: decisión de origen pendiente de documentar como ADR
- [Vitest](https://vitest.dev/)
