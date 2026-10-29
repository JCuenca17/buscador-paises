/** Datos del país que muestra la ficha y que reciben las secciones de otras funcionalidades. */
export interface PaisFicha {
  /** Tal como lo entrega la fuente, sin espacios extremos. */
  nombre: string;
  capital: string | null;
  /** URL https: o null. */
  bandera: string | null;
  iso2: string;
  iso3: string;
}

export type ResultadoBusqueda =
  | { tipo: "encontrado"; pais: PaisFicha }
  | { tipo: "no-encontrado" }
  | { tipo: "sin-conexion" }
  | { tipo: "tiempo-agotado" }
  | { tipo: "respuesta-invalida" }
  | { tipo: "cancelada" };

/** Caché de sesión: listas de la API indexadas para buscar. */
export interface IndicePaises {
  /** normalizarNombre(name) → elemento de capitales. */
  porNombre: Map<string, Record<string, unknown>>;
  /** iso2 → elemento de banderas. */
  banderaPorIso2: Map<string, Record<string, unknown>>;
}

export type ResultadoIndice =
  | { tipo: "encontrado"; pais: PaisFicha }
  | { tipo: "no-encontrado" }
  | { tipo: "respuesta-invalida" };
