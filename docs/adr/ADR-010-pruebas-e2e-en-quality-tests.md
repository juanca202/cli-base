---
id: ADR-010
status: Accepted
last_update: 2026-10-25
deciders: [juanca202]
tags: [testing, e2e, quality-tests]
supersedes: ADR-002
superseded_by: null
emits: []
---

# ADR-010: Las pruebas E2E se trasladan al repositorio quality-tests

## Contexto

ADR-002 fijó una suite E2E propia en este repositorio (Vitest + Execa, `tests/e2e/`, `vitest.e2e.config.ts`,
`npm run test:e2e`) para validar el CLI como caja negra. La solución sdd-platform consolidó después las pruebas de
calidad de todos sus componentes en un repositorio dedicado: la regla de la solución es que las pruebas de calidad
(E2E y de API) se implementan en el repositorio `quality-tests`, no en cada repositorio de implementación. Mantener
una suite E2E aquí duplicaría la del repositorio de pruebas y dejaría dos fuentes de verdad para el mismo contrato
observable.

## Decisión

Las pruebas E2E del CLI se trasladan al repositorio `quality-tests` (su ADR-012, «Vitest como runner de las pruebas
e2e de CLI»), que las mantiene y ejecuta. Este repositorio deja de alojar suite, configuración, script y
dependencias E2E, y conserva solo la suite unitaria y la cobertura.

Esta decisión supersede **parcialmente** a [ADR-002](ADR-002-vitest-execa-pruebas.md): solo en lo relativo a la
suite E2E y a Execa. La parte unitaria y de cobertura de ADR-002 sigue vigente.

## Consecuencias

### Positivas

- Una sola ubicación para las pruebas de calidad de la solución, con su propio pipeline e informes.
- El repositorio pierde la dependencia `execa`, la configuración E2E y el paso de build previo a las pruebas.

### Negativas / trade-offs

- Los fallos de empaquetado o del binario dejan de detectarse en el pipeline de este repositorio: se detectan al
  ejecutar la suite de `quality-tests`.
- Un cambio del contrato observable del CLI requiere actualizar las pruebas en otro repositorio.

## Referencias

- [ADR-002: Vitest, cobertura V8 y Execa para pruebas unitarias y E2E](ADR-002-vitest-execa-pruebas.md)
- [Estándares de Pruebas](../standards/testing.md)
- Repositorio `quality-tests`, ADR-012: Vitest como runner de las pruebas e2e de CLI
