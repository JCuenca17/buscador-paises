/**
 * Normaliza un nombre de país para compararlo (FR-003): quita espacios extremos, colapsa los
 * internos y pasa a minúsculas. No quita tildes ni traduce (FR-005). Usa toLowerCase() y no
 * toLocaleLowerCase() para dar el mismo resultado en cualquier configuración regional.
 */
export function normalizarNombre(texto: string): string {
  return texto.trim().replace(/\s+/g, " ").toLowerCase();
}
