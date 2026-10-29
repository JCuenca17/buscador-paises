/**
 * Datos simulados de CountriesNow para las pruebas (solo lo importan los *.test.ts).
 * Reproducen las anomalías reales de research.md §R2.
 */
import { vi } from "vitest";
import { URL_BASE } from "../../api/http";

export const RUTA_CAPITALES = "/countries/capital";
export const RUTA_BANDERAS = "/countries/flag/images";

export const BANDERA_PERU = "https://upload.wikimedia.org/wikipedia/commons/c/cf/Flag_of_Peru.svg";

export const CAPITALES: Record<string, unknown>[] = [
  { name: "Peru", capital: "Lima", iso2: "PE", iso3: "PER" },
  { name: "Chile", capital: "Santiago", iso2: "CL", iso3: "CHL" },
  { name: "Antarctica", capital: "", iso2: "AQ", iso3: "ATA" },
  { name: "Bolivia", capital: "Sucre", iso2: "BO", iso3: "BOL" },
  { name: "Bonaire, Saint Eustatius and Saba ", capital: "Kralendijk", iso2: "BQ", iso3: "BES" },
  { name: "Cocos Islands", capital: "West Island", iso2: "CC", iso3: "CCK" },
  { name: "Cocos (Keeling) Islands", capital: "West Island", iso2: "CC", iso3: "CCK" },
  { name: "Réunion", capital: "Saint-Denis", iso2: "RE", iso3: "REU" },
];

// Bolivia no tiene elemento en banderas, como en la fuente real.
export const BANDERAS: Record<string, unknown>[] = [
  { name: "Peru", flag: BANDERA_PERU, iso2: "PE", iso3: "PER" },
  {
    name: "Chile",
    flag: "https://upload.wikimedia.org/wikipedia/commons/7/78/Flag_of_Chile.svg",
    iso2: "CL",
    iso3: "CHL",
  },
  {
    name: "Antarctica",
    flag: "https://upload.wikimedia.org/wikipedia/commons/b/bb/Proposed_flag_of_Antarctica_%28Graham_Bartram%29.svg",
    iso2: "AQ",
    iso3: "ATA",
  },
  {
    name: "Bonaire, Saint Eustatius and Saba",
    flag: "https://upload.wikimedia.org/wikipedia/commons/2/20/Flag_of_the_Netherlands.svg",
    iso2: "BQ",
    iso3: "BES",
  },
  {
    name: "Cocos (Keeling) Islands",
    flag: "https://upload.wikimedia.org/wikipedia/commons/7/74/Flag_of_the_Cocos_%28Keeling%29_Islands.svg",
    iso2: "CC",
    iso3: "CCK",
  },
  {
    name: "Réunion",
    flag: "https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg",
    iso2: "RE",
    iso3: "REU",
  },
];

/** Sobre de CountriesNow: { error, msg, data }. */
export function sobre(data: unknown): { error: false; msg: string; data: unknown } {
  return { error: false, msg: "ok", data };
}

/**
 * Valor que devuelve una ruta: un cuerpo JSON, o una función que recibe el `init` de fetch y
 * devuelve la respuesta (para respuestas pendientes, errores o cuerpos no JSON).
 */
export type RespuestaSimulada = unknown | ((init?: RequestInit) => Response | Promise<Response>);

/** fetch falso por ruta (relativa a URL_BASE). Por defecto, las listas de capitales y banderas. */
export function simularFetch(
  respuestas: Record<string, RespuestaSimulada> = {
    [RUTA_CAPITALES]: sobre(CAPITALES),
    [RUTA_BANDERAS]: sobre(BANDERAS),
  },
) {
  return vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    const ruta = url.startsWith(URL_BASE) ? url.slice(URL_BASE.length) : url;
    if (!(ruta in respuestas)) throw new Error(`Ruta no simulada: ${url}`);
    const respuesta = respuestas[ruta];
    if (typeof respuesta === "function") return respuesta(init);
    return new Response(JSON.stringify(respuesta), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}
