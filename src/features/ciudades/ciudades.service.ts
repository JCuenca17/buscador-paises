import { ErrorApi, obtenerJson, type TipoErrorApi } from "../../api/http";
import { normalizarNombre } from "../ficha/normalizar";

export type ResultadoCiudades =
  | { tipo: "disponibles"; ciudades: readonly string[] }
  | { tipo: TipoErrorApi };

interface FilaCiudades extends Record<string, unknown> {
  iso2: string;
  iso3: string;
  country: string;
  cities: string[];
}

type IndiceCiudades = ReadonlyMap<string, Record<string, unknown>>;
let catalogo: Promise<IndiceCiudades> | null = null;
const ordenEspanol = new Intl.Collator("es", { sensitivity: "base" });

/** Complementa la normalización de ficha sin cambiar su contrato de nombres de países. */
export function normalizarFiltro(texto: string): string {
  return normalizarNombre(texto).normalize("NFD").replace(/\p{M}/gu, "");
}

function codigoValido(valor: unknown, longitud: number): valor is string {
  return typeof valor === "string" && new RegExp(`^[a-zA-Z]{${longitud}}$`).test(valor.trim());
}

export function validarCiudades(fila: Record<string, unknown>): fila is FilaCiudades {
  return codigoValido(fila.iso2, 2) && codigoValido(fila.iso3, 3)
    && typeof fila.country === "string" && fila.country.trim() !== ""
    && Array.isArray(fila.cities)
    && fila.cities.every((c: unknown) => typeof c === "string" && c.trim() !== "");
}

/** Indexa identidad primero; una fila ajena defectuosa no invalida todos los países. */
export function crearIndiceCiudades(data: unknown[]): IndiceCiudades {
  const indice = new Map<string, Record<string, unknown>>();
  for (const fila of data) {
    if (typeof fila !== "object" || fila === null || Array.isArray(fila)) continue;
    const registro = fila as Record<string, unknown>;
    if (!codigoValido(registro.iso3, 3)) continue;
    const codigo = registro.iso3.trim().toUpperCase();
    if (!indice.has(codigo)) indice.set(codigo, registro);
  }
  if (indice.size === 0) throw new ErrorApi("respuesta-invalida");
  return indice;
}

function cargarCatalogo(): Promise<IndiceCiudades> {
  if (catalogo) return catalogo;
  // No usar la signal del consumidor: la descarga pertenece a toda la sesión.
  const nueva = obtenerJson("/countries", {
    validar: (data: unknown): data is unknown[] => Array.isArray(data),
  }).then(crearIndiceCiudades).catch((error: unknown) => {
    if (catalogo === nueva) catalogo = null;
    throw error;
  });
  catalogo = nueva;
  return nueva;
}

/** Cancela solo la espera; el cliente HTTP conserva su propio timeout de 10 s. */
function esperar<T>(promesa: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promesa;
  return new Promise<T>((resolver, rechazar) => {
    const alCancelar = () => {
      signal.removeEventListener("abort", alCancelar);
      rechazar(new ErrorApi("cancelada"));
    };
    signal.addEventListener("abort", alCancelar, { once: true });
    promesa.then(
      (valor) => {
        signal.removeEventListener("abort", alCancelar);
        resolver(valor);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", alCancelar);
        rechazar(error);
      },
    );
    if (signal.aborted) alCancelar();
  });
}

export async function obtenerCiudades(iso3: string, signal?: AbortSignal): Promise<ResultadoCiudades> {
  if (signal?.aborted) return { tipo: "cancelada" };
  if (!codigoValido(iso3, 3)) return { tipo: "respuesta-invalida" };
  try {
    const descarga = cargarCatalogo();
    const indice = await esperar(descarga, signal);
    if (signal?.aborted) return { tipo: "cancelada" };
    const fila = indice.get(iso3.trim().toUpperCase());
    if (!fila) return { tipo: "disponibles", ciudades: [] };
    if (!validarCiudades(fila)) {
      // Permite recuperarse de datos mal formados en el siguiente intento.
      if (catalogo === descarga) catalogo = null;
      return { tipo: "respuesta-invalida" };
    }
    return {
      tipo: "disponibles",
      ciudades: fila.cities.map((ciudad) => ciudad.trim()).sort(ordenEspanol.compare),
    };
  } catch (error: unknown) {
    return { tipo: error instanceof ErrorApi ? error.tipo : "respuesta-invalida" };
  }
}

/** Solo para aislar pruebas: no altera una descarga que ya esté en curso. */
export function reiniciarCacheCiudades(): void {
  catalogo = null;
}
