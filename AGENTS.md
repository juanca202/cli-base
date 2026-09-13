# Fuentes de contexto

- @.agents/MEMORY.md — Preferencias del proyecto
- @docs/adr/README.md — Índice de decisiones arquitectónicas <!-- omitir esta línea y la siguiente si este repositorio está clasificado "Solo specs" (siempre el caso del repositorio de especificaciones en modo multi-repo) — nunca recibe estos índices -->
- @docs/standards/README.md — Índice de estándares de arquitectura
- @README.md — Acerca del proyecto

# Reglas generales

<!-- Normas de trabajo para agentes que no son preferencias (MEMORY), decisiones de arquitectura (ADR/estándares) ni stack: convenciones de código, comandos del repo, restricciones operativas. Ejemplo: "Seguir el estilo del código vecino; no reformatear líneas que no formen parte del cambio." -->

# Stack tecnológico

- **Lenguaje:** TypeScript 5.9 (ESM)
- **Runtime:** Node.js >= 22.12
- **Framework CLI:** Commander.js 15
- **Gestor de paquetes / build:** npm 11.13 · `tsc` (`npm run build`, `npm run typecheck`)
- **Desarrollo:** tsx (`npm run dev`)
- **Calidad:** ESLint 10 + typescript-eslint · Vitest 5 (unit) · `@vitest/coverage-v8` (`npm test`, `npm run test:coverage`, `npm run lint`)
