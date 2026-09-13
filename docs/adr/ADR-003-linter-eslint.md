---
id: ADR-003
status: Accepted
last_update: 2026-09-13
deciders: [Equipo]
tags: [coding-style, eslint, typescript-eslint]
supersedes: null
superseded_by: null
emits: [coding-style/CR-001]
---

# ADR-003: ESLint y typescript-eslint como linter

## Contexto

En el stack Node+TypeScript el linter es bloqueante en la compuerta de calidad. El scaffold manual de Commander no lo incluía: había que elegir herramienta y cablearla para que `npm run lint` fuera la verificación única de estilo y de reglas TypeScript-aware.

Se aceptó ESLint con `typescript-eslint` en flat config (`eslint.config.js`). TypeScript se ancló a 5.9 porque TypeScript 7 todavía no declara peer compatible con `typescript-eslint`.

## Decisión

Adoptar ESLint + `typescript-eslint` (flat config) como linter del repositorio. El script canónico es `npm run lint` (`eslint .`), con `eslint.config.js` combinando las configuraciones recommended de ESLint y de `typescript-eslint`.

No se añade un formateador aparte en esta decisión: el alcance es el linter bloqueante que faltaba en el scaffold.

## Alternativas consideradas

- Quedar sin linter: el scaffold de Commander no lo trae; dejaría la compuerta de calidad incompleta.
- Biome u otra herramienta all-in-one: unificaría lint y format, pero se eligió el par ESLint + typescript-eslint por ser el default del ecosistema TypeScript y el que fija el techo de versión de TypeScript.

## Consecuencias

### Positivas

- El lint queda como compuerta propia, separable de tests y de las fitness functions de arquitectura.
- `typescript-eslint` aporta reglas conscientes del tipado sobre el mismo código que compila `tsc`.

### Negativas / trade-offs

- TypeScript no puede subir a 7 mientras `typescript-eslint` no publique peer compatible.
- Sin formateador en esta decisión, el estilo visual (Prettier/Biome) queda fuera de la norma.

## Referencias

- [ESLint](https://eslint.org/)
- [typescript-eslint](https://typescript-eslint.io/)
- [Estándares de Estilo de Código](../standards/coding-style.md)
