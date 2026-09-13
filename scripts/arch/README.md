# Validaciones de arquitectura (fitness functions)

Este directorio agrupa las **fitness functions** de arquitectura del proyecto:
chequeos automatizados que validan que el código respeta los **criterios de
cumplimiento** (`CR-XXX`) de los estándares de dominio (`docs/standards/`). Cada CR
(p. ej. «cobertura ≥ 80%» dentro del requisito «Unit testing» de *Testing Standards*)
es una regla verificable; los ADR (`docs/adr/`) registran la decisión que lo fijó.

Los scripts se escriben en el **lenguaje del stack del repositorio**: Node
(`.mjs`) en un proyecto Angular/React/Vue/Node, Python en uno Python, PHP en uno
PHP, etc. Los archivos de este directorio son la **implementación de referencia en
Node**; para otro stack se genera el equivalente respetando el mismo contrato.

## Estructura

```
scripts/arch/
├── verify.mjs             # Runner: ejecuta las validaciones (todas, o las del estándar indicado)
├── lib/
│   └── colors.mjs         # colorStatus() / stripAnsi() — color de PASS/WARN/FAIL (ver nota del contrato)
└── checks/
    ├── testing.mjs        # UN archivo por ESTÁNDAR (nombre = slug del estándar)
    └── frontend.mjs       # Dentro, un chequeo por CR, con su trazabilidad (CR-XXX)
```

- **`verify.mjs`** — punto de entrada único. Descubre los `checks/<slug>.mjs` por
  convención (no se edita al añadir validaciones), ejecuta **todos los estándares
  por defecto** o solo los indicados por argumento, reenvía la salida de cada
  check, imprime un resumen (criterios PASS/WARN/FAIL) y sale con código distinto
  de 0 solo si algún check reportó un CR **bloqueante** violado.
- **`checks/<slug-estándar>.mjs`** — las fitness functions de **un estándar**
  completo: un chequeo por cada CR automatizable, cada uno con su referencia
  `CR-XXX` (trazabilidad en la línea de salida y en comentarios). El **Enfoque**
  de cada CR se implementa dentro del script: un chequeo `bloqueante` que falla
  produce `FAIL` y hace salir el script con código ≠ 0; uno `warning` produce
  `WARN` sin cambiar el código de salida. Cada chequeo invoca la herramienta real
  (dependency-cruiser, ESLint, runner del framework…) — no duplica su lógica.

## Contrato (igual en cualquier stack)

1. El check de un estándar imprime **una línea de protocolo por criterio**:
   `PASS|FAIL|WARN <slug-estándar>/CR-XXX — <detalle corto>`.
2. El check sale con código `0` si ningún CR bloqueante falló; `≠ 0` si alguno falló.
3. El runner ejecuta cada check como subproceso, cuenta las líneas de protocolo
   para el resumen y sale `≠ 0` solo si algún check salió `≠ 0`.
4. Un slug pedido por argumento que no tiene check registrado es un error (`≠ 0`).

> **Nota — color (no es parte del contrato).** La implementación de referencia en Node colorea los
> estados (`PASS` verde, `WARN` amarillo, `FAIL` rojo) cuando la salida es una terminal real, o cuando
> se fuerza con `FORCE_COLOR`, y respeta `NO_COLOR`. Como los checks corren como subprocesos con stdout
> por pipe (nunca TTY), es el **runner** quien decide si hay color y lo propaga a cada hijo vía
> `FORCE_COLOR=1` (`util.styleText` la respeta aunque el stream no sea TTY); por eso su conteo del
> resumen quita los códigos ANSI (`stripAnsi`) antes de comparar el prefijo de cada línea. En otro
> stack, colorear es una **mejora opcional** con el mecanismo propio de ese ecosistema (o se omite):
> el contrato mínimo es el texto `PASS|FAIL|WARN`, no el color.

## Ejecutar las validaciones

Todos los estándares:

```bash
node scripts/arch/verify.mjs
```

Solo un estándar:

```bash
node scripts/arch/verify.mjs testing
```

O, si el repo lo cablea, mediante el mecanismo nativo del stack
(`npm run arch`, un target de `Makefile`, un job de CI, etc.). En un stack
no-Node, el comando es el equivalente del runner generado
(`python scripts/arch/verify.py`, `php scripts/arch/verify.php`, …).

## Añadir una validación

El skill `arch-manage` registra cada fitness function aprobada en el archivo de
su estándar (`checks/<slug-estándar>.mjs`), creándolo desde
`checks/example.mjs.template` si es el primer CR automatizable de ese estándar.
Manualmente: si el archivo del estándar ya existe, añade dentro un bloque
`check('CR-XXX', 'bloqueante' | 'warning', '…', () => { … })` con su comentario
de trazabilidad; si no existe, copia la plantilla, renómbrala al slug del
estándar y reemplaza el chequeo de ejemplo por el real.
