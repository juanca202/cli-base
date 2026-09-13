---
id: ADR-008
status: Accepted
last_update: 2026-09-13
deciders: [Equipo]
tags: [cli, dry-run, side-effects]
supersedes: null
superseded_by: null
emits: [cli/CR-007, cli/CR-008, cli/CR-009]
---

# ADR-008: `--dry-run` para comandos con efectos secundarios

## Contexto

Esta plantilla está pensada para que agents y skills la invoquen de forma automatizada (ADR-004 fija el contrato `--output json` justamente para eso). A medida que se añaden comandos con efectos secundarios reales — escritura en filesystem, procesos externos vía `ProcessRunner` (ADR-006), cambios de configuración — un consumidor automatizado necesita poder previsualizar qué haría un comando antes de comprometerse a ejecutarlo. Sin una convención única, cada comando terminaría inventando su propia bandera de "vista previa" con semántica distinta, lo que rompe la previsibilidad que el resto de la CLI ya garantiza.

## Decisión

Adoptar `--dry-run` como la bandera estándar para todo comando con efectos secundarios. Con `--dry-run` habilitado, el comando:

- ejecuta las validaciones necesarias para determinar si la operación sería válida;
- determina las acciones que realizaría;
- informa las acciones previstas al usuario;
- evita cualquier efecto secundario persistente (no modifica archivos, procesos, configuración ni recursos externos).

El comportamiento normal del comando no depende de `--dry-run`: la bandera únicamente conmuta la ejecución de las operaciones con efectos secundarios, nunca la lógica de validación ni de decisión. Los comandos inherentemente de solo lectura (`status`, `list`, y equivalentes) quedan fuera de esta obligación. Un comando con efectos secundarios que no pueda simularse de forma significativa puede quedar exento, siempre que la excepción quede documentada junto al comando.

## Consecuencias

### Positivas

- Semántica de simulación consistente entre comandos: un consumidor automatizado aprende `--dry-run` una vez y lo reutiliza en toda la CLI.
- Habilita automatización más segura por parte de agents/skills: pueden previsualizar antes de comprometerse a una operación con efectos secundarios.
- Se apoya en convenciones ya existentes (un mecanismo compartido, en la línea de `ProcessRunner` de ADR-006 o los helpers de `output.ts`) en vez de que cada comando reinvente su propia bandera.

### Negativas / trade-offs

- Cada comando con efectos secundarios nuevo asume el costo de implementar una simulación representativa, no solo un stub.
- Simular una operación "de forma representativa" puede ser una tarea de ingeniería no trivial para operaciones complejas o con dependencias externas.
- El registro de excepciones exige disciplina: una excepción no justificada de verdad erosiona la garantía que da la convención.

## Referencias

- [ADR-004: Contratos de entrada/salida — modo humano y `--output json`](ADR-004-contratos-entrada-salida.md)
- [ADR-006: Gestión de procesos hijos mediante ProcessRunner](ADR-006-gestion-procesos-hijos.md)
- [Estándares de CLI](../standards/cli.md)
