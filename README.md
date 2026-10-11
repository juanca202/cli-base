# cli

CLI en Node.js con consultas deterministas para facilitar actividades comunes del ciclo de desarrollo de
`sdd-platform` (por ejemplo, estado de puertas de calidad y otras verificaciones repetibles entre los
repositorios de la plataforma), evitando reimplementar esa lógica en cada flujo.

Generado a partir de la plantilla `cli-base` (conservada como remote `upstream`), que aporta la
estructura, convenciones y estándares de arquitectura ya documentados en `docs/adr/` y `docs/standards/`.

## Uso

```bash
cli <comando> [argumentos] [opciones]
```

> **Disponibilidad:** `next`, `find` y `list` están implementados como adaptadores en `src/commands/`, pero
> todavía no están registrados en `src/program.ts` (el registro y los E2E son parte de TK-006 de US-010). Hasta
> entonces solo `hello` responde desde el binario.

### Opciones globales

| Opción | Descripción |
| ------ | ----------- |
| `--output <human\|json>` | Formato de salida (por defecto `human`). Con `json`, una envolvente `cli-<comando>/v1` en una línea por stdout; un fallo es `cli-error/v1` |
| `--repo <path>` | Repositorio de especificaciones (por defecto, la raíz git del directorio de trabajo) |
| `--changes <path>` · `--current <path>` · `--archived <path>` | Rutas base; por defecto las de `.sdd-devkit/settings.json` o `docs/specs/changes`, `docs/specs/current`, `docs/specs/archived`. Una ruta explícita inexistente es error (código 3) |
| `--arch-root <path>` | Raíz de arquitectura para los `ADR` |

Códigos de salida: `0` éxito, `1` error interno, `2` argumentos inválidos, `3` error de configuración,
`5` error de proceso externo. Todos los comandos de consulta son de solo lectura y no admiten `--dry-run`.

### `next <type>` — siguiente identificador libre

Devuelve el siguiente identificador del tipo considerando la ruta activa **y** la archivada (no rellena huecos),
sus hermanos más recientes, la ruta donde se creará y el estado del gestor de proyectos.

```bash
cli next US
# US-024
# ruta destino: docs/specs/changes/user-stories/US-024-<slug>
# hermanos: 23 (se muestran 3, de mayor a menor)
#   docs/specs/changes/user-stories/US-023-x
#   ...
# gestor de proyectos: deshabilitado

cli next TK --parent US-010          # TK, TC, WF (y RS anidada) exigen --parent
cli next WF --parent US-022          # numera dentro de wireframes/ del padre
cli next MD --capability cli         # MD, API, FL y DG exigen --capability
cli next US --limit 10               # máximo de hermanos a mostrar (por defecto 50)
cli next US --output json            # envolvente cli-next/v1; `data` con next, siblings, total, truncated, targetPath y projectManagement
```

La primera línea de la salida humana es solo el identificador. El secuencial tiene mínimo 3 dígitos y puede
tener más (`US-1043`). Con `projectManagement` habilitado en `settings.json`, el id de `US`, `WI` y `TC` lo asigna
el gestor: `next` devuelve `next: null` y `<id>` en la ruta destino. Un `--parent` archivado falla con
`ARTIFACT_ARCHIVED` (no se crea nada sobre un artefacto archivado). Los nombres fuera de patrón no aparecen en
`next`: los reporta `check`.

### `find <id>` — localizar un artefacto

```bash
cli find US-010
# ID      TIPO  ESTADO  RUTA
# US-010  US    ACTIVE  docs/specs/changes/user-stories/US-010-cli-de-consultas-deterministas

cli find WF-001                      # todas las coincidencias (el secuencial de WF es por padre)
cli find WF-001 --parent US-021      # restringe a la carpeta de un padre
cli find MD-001 --capability cli
cli find US-010 --state archived     # active | archived | all (por defecto all)
```

Sin coincidencias imprime `sin coincidencias para US-042 (estado: all)` y sale con `0`.

### `list [type]` — listar artefactos

```bash
cli list --state active                  # índice de artefactos activos (nunca incluye archivados)
cli list US --state all
cli list TK --parent US-010
cli list WF --parent US-021 --with-status   # añade STATUS desde la marca oculta del documento
cli list --state active --limit 20 --offset 40
```

Sin `type` lista todos los tipos en el orden del catálogo. `--limit`/`--offset` (enteros ≥ 0) abren una ventana
sobre el resultado ya ordenado; `--state` es sensible a mayúsculas. La salida humana termina con un resumen
`<returned> de <total> artefactos (…)`.

### Tipos de artefacto

`SRS`, `RQ`, `US`, `TK`, `WI`, `FT`, `TC`, `RS`, `WF`, `ADR`, `MD`, `API`, `FL`, `DG` (se acepta en cualquier
capitalización). Contrato completo en `docs/architecture/cli/apis/API-007-localizacion-de-artefactos.md` del
repositorio de especificaciones.
