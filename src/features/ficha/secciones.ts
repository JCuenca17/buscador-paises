/**
 * Registro de secciones de la ficha para otras funcionalidades (FR-018).
 * Contrato: specs/001-ficha-base/contracts/secciones-ficha.md
 */
import type { PaisFicha } from "./tipos";

export interface SeccionFicha {
  /** Único; se usa como data-seccion. */
  id: string;
  /** Título visible en español, como encabezado de la sección. */
  titulo: string;
  /**
   * Pinta la sección dentro de `contenedor` (el <section> que crea la ficha, con su <h3>).
   * Debe usar textContent para datos externos y llamar a la red solo con obtenerJson.
   * `signal` se aborta cuando empieza otra búsqueda.
   */
  renderizar(pais: PaisFicha, contenedor: HTMLElement, signal: AbortSignal): void | Promise<void>;
}

const secciones: SeccionFicha[] = [];

export function registrarSeccion(seccion: SeccionFicha): void {
  if (secciones.some((s) => s.id === seccion.id)) {
    throw new Error(`Ya hay una sección registrada con el id "${seccion.id}"`);
  }
  secciones.push(seccion);
}

/** Secciones en orden de registro. */
export function obtenerSecciones(): readonly SeccionFicha[] {
  return [...secciones];
}

/** Solo para pruebas: vacía el registro. */
export function reiniciarSecciones(): void {
  secciones.length = 0;
}
