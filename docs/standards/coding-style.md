---
name: Estándares de Estilo de Código
domain: coding-style
status: Active
last_update: 2026-09-13
source_adrs: [ADR-003]
tags: [coding-style, eslint, typescript-eslint]
---

# Estándares de Estilo de Código

Normas de consistencia sintáctica del código TypeScript de la plantilla. Aplica a `src/` y al resto de fuentes que cubra `eslint.config.js`.

## Linter
**ID:** eslint
**Estado:** Active

El linter es la compuerta de estilo del repositorio. El código TypeScript **DEBE** pasar `npm run lint` (ESLint + typescript-eslint) sin errores. La configuración es flat config en `eslint.config.js` (`@eslint/js` recommended + `typescript-eslint` recommended).

### Excepciones
Ninguna.

## Criterios de cumplimiento

| ID | Requisito | Descripción | Automatizable | Enfoque | Verificación |
|----|-----------|-------------|---------------|---------|--------------|
| CR-001 | eslint | El código TypeScript **DEBE** pasar `npm run lint` (ESLint + typescript-eslint) sin errores. | yes | bloqueante | [checks/coding-style.mjs](../../scripts/arch/checks/coding-style.mjs) |

## Referencias

- ADR de origen: [ADR-003](../adr/ADR-003-linter-eslint.md)
- [ESLint](https://eslint.org/)
- [typescript-eslint](https://typescript-eslint.io/)
