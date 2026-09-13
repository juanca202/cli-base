/**
 * Registro de comandos exentos de `--dry-run` (Estándares de CLI, requisito
 * dry-run, ADR-008): cada entrada documenta por qué ese comando no implementa
 * el mecanismo compartido de src/dry-run.ts.
 */
export const DRY_RUN_EXEMPTIONS: Record<string, string> = {
  hello: 'comando de ejemplo sin efectos secundarios: solo imprime un saludo, no requiere --dry-run',
};
