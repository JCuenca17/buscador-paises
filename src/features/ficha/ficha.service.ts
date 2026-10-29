/**
 * Servicio de la ficha: descarga y caché de las listas, índice y búsqueda. Sin acceso al DOM.
 * Contrato: specs/001-ficha-base/contracts/ficha-service.md
 */
import { ErrorApi, obtenerJson } from "../../api/http";
import { normalizarNombre } from "./normalizar";
import type { IndicePaises, ResultadoBusqueda, ResultadoIndice } from "./tipos";

const RUTA_CAPITALES = "/countries/capital";
const RUTA_BANDERAS = "/countries/flag/images";

/** Validador para obtenerJson: solo exige que data sea un arreglo (research.md §R5). */
export function esArreglo(data: unknown): data is unknown[] {
  return Array.isArray(data);
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function esTextoNoVacio(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim() !== "";
}

/** Elemento con `name` e `iso2` de texto no vacío; los demás campos se validan al buscar. */
function esElementoValido(
  valor: unknown,
): valor is Record<string, unknown> & { name: string; iso2: string } {
  return esObjeto(valor) && esTextoNoVacio(valor.name) && esTextoNoVacio(valor.iso2);
}

/**
 * Ignora los elementos sin name o iso2 válidos, indexa capitales por nombre normalizado y
 * banderas por iso2. Devuelve null si alguna lista queda vacía tras filtrar.
 */
export function crearIndice(capitales: unknown[], banderas: unknown[]): IndicePaises | null {
  const porNombre = new Map<string, Record<string, unknown>>();
  for (const elemento of capitales) {
    if (!esElementoValido(elemento)) continue;
    const clave = normalizarNombre(elemento.name);
    if (!porNombre.has(clave)) porNombre.set(clave, elemento);
  }

  const banderaPorIso2 = new Map<string, Record<string, unknown>>();
  for (const elemento of banderas) {
    if (!esElementoValido(elemento)) continue;
    if (!banderaPorIso2.has(elemento.iso2)) banderaPorIso2.set(elemento.iso2, elemento);
  }

  if (porNombre.size === 0 || banderaPorIso2.size === 0) return null;
  return { porNombre, banderaPorIso2 };
}

/**
 * Busca el texto (se normaliza dentro) y valida el elemento del país encontrado: capital no
 * textual, iso3 vacío o flag no textual dan respuesta-invalida (research.md §R5).
 */
export function buscarEnIndice(indice: IndicePaises, texto: string): ResultadoIndice {
  const elemento = indice.porNombre.get(normalizarNombre(texto));
  if (!elemento) return { tipo: "no-encontrado" };

  const { name, iso2, iso3, capital } = elemento;
  if (!esTextoNoVacio(name) || !esTextoNoVacio(iso2)) return { tipo: "respuesta-invalida" };
  if (typeof capital !== "string" || !esTextoNoVacio(iso3)) return { tipo: "respuesta-invalida" };

  const elementoBandera = indice.banderaPorIso2.get(iso2);
  const flag = elementoBandera?.flag;
  if (elementoBandera && typeof flag !== "string") return { tipo: "respuesta-invalida" };

  return {
    tipo: "encontrado",
    pais: {
      nombre: name.trim(),
      capital: capital.trim() === "" ? null : capital,
      bandera: typeof flag === "string" && flag.startsWith("https:") ? flag : null,
      iso2,
      iso3,
    },
  };
}

// Caché de sesión: se guarda la promesa de cada lista (research.md §R4).
const RUTAS = { capitales: RUTA_CAPITALES, banderas: RUTA_BANDERAS } as const;
type Lista = keyof typeof RUTAS;

const listas: Record<Lista, Promise<unknown[]> | null> = { capitales: null, banderas: null };
let indiceActual: { capitales: unknown[]; banderas: unknown[]; indice: IndicePaises | null } | null =
  null;

/** Devuelve la lista de la caché o la pide. Si la descarga falla, se borra solo esa lista. */
function obtenerLista(lista: Lista): Promise<unknown[]> {
  const enCache = listas[lista];
  if (enCache) return enCache;

  // Las descargas no reciben la signal de la búsqueda: las comparten todas las búsquedas.
  const promesa = obtenerJson(RUTAS[lista], { validar: esArreglo });
  listas[lista] = promesa;
  promesa.catch((error: unknown) => {
    const cancelada = error instanceof ErrorApi && error.tipo === "cancelada";
    if (!cancelada && listas[lista] === promesa) listas[lista] = null;
  });
  return promesa;
}

async function obtenerIndice(): Promise<IndicePaises | null> {
  // Se piden las dos en paralelo, pero se espera primero capitales: si falla, su error es el
  // resultado sin esperar a banderas (y, si fallan ambas, manda el de capitales).
  const promesaCapitales = obtenerLista("capitales");
  const promesaBanderas = obtenerLista("banderas");
  const listaCapitales = await promesaCapitales;
  const listaBanderas = await promesaBanderas;
  if (indiceActual?.capitales !== listaCapitales || indiceActual.banderas !== listaBanderas) {
    indiceActual = {
      capitales: listaCapitales,
      banderas: listaBanderas,
      indice: crearIndice(listaCapitales, listaBanderas),
    };
  }

  if (indiceActual.indice === null) {
    // Lista vacía tras filtrar: se vuelven a pedir las dos.
    if (listas.capitales === promesaCapitales) listas.capitales = null;
    if (listas.banderas === promesaBanderas) listas.banderas = null;
    indiceActual = null;
    return null;
  }
  return indiceActual.indice;
}

/** Se resuelve cuando la signal se aborta; nunca, si no hay signal. */
function esperarAborto(signal?: AbortSignal): Promise<"cancelada"> {
  return new Promise((resolver) => {
    signal?.addEventListener("abort", () => resolver("cancelada"), { once: true });
  });
}

export async function buscarFicha(
  texto: string,
  opciones: { signal?: AbortSignal } = {},
): Promise<ResultadoBusqueda> {
  const { signal } = opciones;
  if (signal?.aborted) return { tipo: "cancelada" };

  try {
    // La signal solo hace que esta búsqueda deje de esperar; la descarga compartida sigue.
    const indice = await Promise.race([obtenerIndice(), esperarAborto(signal)]);
    if (indice === "cancelada") return { tipo: "cancelada" };
    if (indice === null) return { tipo: "respuesta-invalida" };

    return buscarEnIndice(indice, texto);
  } catch (error) {
    // Nunca rechaza: cada ErrorApi se traduce a su resultado; lo demás es respuesta-invalida.
    return { tipo: error instanceof ErrorApi ? error.tipo : "respuesta-invalida" };
  }
}

/** Solo para pruebas: vacía la caché de listas. */
export function reiniciarCache(): void {
  listas.capitales = null;
  listas.banderas = null;
  indiceActual = null;
}
