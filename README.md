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
> todavía no están registrados en `src/program.ts` (el registro es parte de TK-006 de US-010). Hasta
> entonces solo `hello` responde desde el binario.

### Opciones globales

| Opción | Descripción |
| ------ | ----------- |
| `--output <toon\|json>` | Formato de salida (por defecto `toon`; no hay formato humano, ver [ADR-009](docs/adr/ADR-009-salida-toon-por-defecto-sin-formato-humano.md)). Una envolvente `cli-<comando>/v1` por stdout, en [TOON](https://toonformat.dev) o en JSON de una línea (`next` emite su objeto plano); un fallo es `cli-error/v1` en el mismo formato |
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
# next: US-024
# siblings[3]: docs/specs/changes/user-stories/US-023-x,docs/specs/archived/user-stories/US-022-y,...
# total: 23
# truncated: true
# targetPath: docs/specs/changes/user-stories/US-024-<slug>
# projectManagement:
#   enabled: false
# branch: develop
# language: es
# testCases:
#   createMode: ask
#   createDetailsMode: never

cli next US --output json            # el mismo objeto como JSON plano, en una línea
cli next TK --parent US-010          # TK, TC, WF (y RS anidada) exigen --parent
cli next WF --parent US-022          # numera dentro de wireframes/ del padre
cli next MD --capability cli         # MD, API, FL y DG exigen --capability
cli next US --limit 10               # máximo de hermanos a mostrar (por defecto 50)
```

`next` emite el objeto JSON o TOON **sin envolvente** (`next`, `siblings`, `total`, `truncated`, `targetPath`,
`projectManagement`, `branch`, `language`, `testCases`); `--output human` es `INVALID_OUTPUT_FORMAT`. Un fallo sí
es `cli-error/v1`, en el mismo formato. `branch` es la rama actual del repositorio de especificaciones (`null` con
HEAD desacoplado), `language` el `language` de `settings.json` (`null` si no está) y `testCases` la política
`specification.testCases` (`ask`/`ask` por defecto; solo en `US` y `WI`; se omite en los demás tipos). El secuencial tiene mínimo 3 dígitos y puede tener más
(`US-1043`). Con `projectManagement` habilitado en `settings.json`, el id de `US`, `WI` y `TC`
lo asigna el gestor: `next` devuelve `next: null` y `<id>` en la ruta destino. Un `--parent` archivado falla con
`ARTIFACT_ARCHIVED` (no se crea nada sobre un artefacto archivado). Los nombres fuera de patrón no aparecen en
`next`: los reporta `check`.

### `find <id>` — localizar un artefacto

```bash
cli find US-010
# schema: cli-find/v1
# command: find
# ok: true
# data:
#   matches[1]{id,type,slug,kind,state,path,documentPath,parent}:
#     US-010,US,cli-de-consultas-deterministas,directory,ACTIVE,docs/specs/changes/user-stories/US-010-cli-de-consultas-deterministas,docs/specs/changes/user-stories/US-010-cli-de-consultas-deterministas/README.md,null
#   total: 1

cli find WF-001                      # todas las coincidencias (el secuencial de WF es por padre)
cli find WF-001 --parent US-021      # restringe a la carpeta de un padre
cli find MD-001 --capability cli
cli find US-010 --state archived     # active | archived | all (por defecto all)
```

Sin coincidencias devuelve `matches[0]:` con `total: 0` y sale con `0`.

### `list [type]` — listar artefactos

```bash
cli list --state active                  # índice de artefactos activos (nunca incluye archivados)
cli list US --state all
cli list TK --parent US-010
cli list WF --parent US-021 --with-status   # añade `status` desde el frontmatter del documento
cli list --state active --limit 20 --offset 40
```

Sin `type` lista todos los tipos en el orden del catálogo. `--limit`/`--offset` (enteros ≥ 0) abren una ventana
sobre el resultado ya ordenado; `--state` es sensible a mayúsculas. El payload lleva `items`, `total`, `returned`,
`offset` y `limit`.

### Tipos de artefacto

`SRS`, `RQ`, `US`, `TK`, `WI`, `FT`, `TC`, `RS`, `WF`, `ADR`, `MD`, `API`, `FL`, `DG` (se acepta en cualquier
capitalización). Contrato completo en `docs/architecture/cli/apis/API-007-localizacion-de-artefactos.md` del
repositorio de especificaciones.
