/**
 * Servicio de la ficha: descarga y caché de las listas, índice y búsqueda. Sin acceso al DOM.
 * Contrato: specs/001-ficha-base/contracts/ficha-service.md
 */
import { obtenerJson } from "../../api/http";
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

/** Busca el texto (se normaliza dentro) y construye el PaisFicha. */
export function buscarEnIndice(indice: IndicePaises, texto: string): ResultadoIndice {
  const elemento = indice.porNombre.get(normalizarNombre(texto));
  if (!elemento) return { tipo: "no-encontrado" };

  const nombre = String(elemento.name).trim();
  const iso2 = String(elemento.iso2);
  const flag = indice.banderaPorIso2.get(iso2)?.flag;

  return {
    tipo: "encontrado",
    pais: {
      nombre,
      capital: typeof elemento.capital === "string" && elemento.capital !== "" ? elemento.capital : null,
      bandera: typeof flag === "string" && flag.startsWith("https:") ? flag : null,
      iso2,
      iso3: String(elemento.iso3),
    },
  };
}

// Caché de sesión: se guarda la promesa de cada lista (research.md §R4).
let capitales: Promise<unknown[]> | null = null;
let banderas: Promise<unknown[]> | null = null;
let indiceActual: { capitales: unknown[]; banderas: unknown[]; indice: IndicePaises | null } | null =
  null;

async function obtenerIndice(): Promise<IndicePaises | null> {
  // Las descargas no reciben la signal de la búsqueda: las comparten todas las búsquedas.
  capitales ??= obtenerJson(RUTA_CAPITALES, { validar: esArreglo });
  banderas ??= obtenerJson(RUTA_BANDERAS, { validar: esArreglo });
  const [listaCapitales, listaBanderas] = await Promise.all([capitales, banderas]);

  if (indiceActual?.capitales !== listaCapitales || indiceActual.banderas !== listaBanderas) {
    indiceActual = {
      capitales: listaCapitales,
      banderas: listaBanderas,
      indice: crearIndice(listaCapitales, listaBanderas),
    };
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

  // La signal solo hace que esta búsqueda deje de esperar; la descarga compartida sigue.
  const indice = await Promise.race([obtenerIndice(), esperarAborto(signal)]);
  if (indice === "cancelada") return { tipo: "cancelada" };
  if (indice === null) return { tipo: "respuesta-invalida" };

  return buscarEnIndice(indice, texto);
}

/** Solo para pruebas: vacía la caché de listas. */
export function reiniciarCache(): void {
  capitales = null;
  banderas = null;
  indiceActual = null;
}
