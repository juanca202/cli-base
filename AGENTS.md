# Fuentes de contexto

- @../.agents/MEMORY.md — Preferencias de la solución (repositorio de especificaciones)
- @docs/adr/README.md — Índice de decisiones arquitectónicas de este repositorio
- @docs/standards/README.md — Índice de estándares de arquitectura de este repositorio
- @README.md — Acerca de este repositorio
- @../README.md — Acerca de la solución completa (repositorio de especificaciones)

# Reglas generales

<!-- Normas de trabajo para agentes que no son preferencias (MEMORY), decisiones de arquitectura (ADR/estándares) ni stack: convenciones de código, comandos del repo, restricciones operativas. Ejemplo: "Seguir el estilo del código vecino; no reformatear líneas que no formen parte del cambio." -->

# Stack tecnológico

- **Lenguaje:** TypeScript 5.9 (ESM)
- **Runtime:** Node.js >= 22.12
- **Framework CLI:** Commander.js 15
- **Gestor de paquetes / build:** npm 11.13 · `tsc` (`npm run build`, `npm run typecheck`)
- **Desarrollo:** tsx (`npm run dev`)
- **Calidad:** ESLint 10 + typescript-eslint · Vitest 5 (unit) · `@vitest/coverage-v8` (`npm test`, `npm run test:coverage`, `npm run lint`)
