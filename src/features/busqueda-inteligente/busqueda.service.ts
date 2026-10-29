import { ErrorApi } from "../../api/http";
import { obtenerCapitalesCompartidas } from "../ficha/ficha.service";
import { normalizarNombre } from "../ficha/normalizar";

export interface PaisSugerible {
  id: string;
  nombreApi: string;
  iso2: string;
  nombreEspanol: string;
  etiquetaSugerencia: string;
  clavesBusqueda: readonly string[];
}

interface DisplayNamesLike {
  of(code: string): string | undefined;
}

let catalogoEnCache: Promise<readonly PaisSugerible[]> | null = null;

export function normalizarClaveBusqueda(texto: string): string {
  return normalizarNombre(texto).normalize("NFD").replace(/\p{M}/gu, "");
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

export function construirCatalogoPaises(
  elementos: readonly unknown[],
  displayNames: DisplayNamesLike = new Intl.DisplayNames(["es"], { type: "region" }),
): PaisSugerible[] {
  const candidatos: Omit<PaisSugerible, "etiquetaSugerencia" | "clavesBusqueda">[] = [];
  const vistos = new Set<string>();

  for (const elemento of elementos) {
    if (!esObjeto(elemento)) continue;
    if (typeof elemento.name !== "string" || elemento.name.trim() === "") continue;
    if (typeof elemento.iso2 !== "string" || elemento.iso2.trim() === "") continue;

    const nombreApi = elemento.name.trim();
    const iso2 = elemento.iso2.trim().toUpperCase();
    if (iso2.length !== 2) continue;

    const claveIdentidad = `${normalizarClaveBusqueda(nombreApi)}|${iso2}`;
    if (vistos.has(claveIdentidad)) continue;
    vistos.add(claveIdentidad);

    const nombreEspanol = displayNames.of(iso2)?.trim();
    if (!nombreEspanol || nombreEspanol.toUpperCase() === iso2) continue;

    candidatos.push({
      id: `${iso2}-${candidatos.length}`,
      nombreApi,
      iso2,
      nombreEspanol,
    });
  }

  const repeticiones = new Map<string, number>();
  for (const candidato of candidatos) {
    const clave = normalizarClaveBusqueda(candidato.nombreEspanol);
    repeticiones.set(clave, (repeticiones.get(clave) ?? 0) + 1);
  }

  return candidatos.map((candidato) => {
    const aliasEspanol = normalizarClaveBusqueda(candidato.nombreEspanol);
    const esAmbiguo = (repeticiones.get(aliasEspanol) ?? 0) > 1;
    const etiquetaSugerencia = esAmbiguo
      ? `${candidato.nombreEspanol} — ${candidato.nombreApi} (${candidato.iso2})`
      : candidato.nombreEspanol;
    const clavesBusqueda = [
      normalizarClaveBusqueda(candidato.nombreApi),
      aliasEspanol,
      normalizarClaveBusqueda(etiquetaSugerencia),
    ];

    return { ...candidato, etiquetaSugerencia, clavesBusqueda };
  });
}

export function resolverPais(
  catalogo: readonly PaisSugerible[],
  texto: string,
): string | null {
  const clave = normalizarClaveBusqueda(texto);
  if (clave === "") return null;

  const canonicos = catalogo.filter((pais) => normalizarClaveBusqueda(pais.nombreApi) === clave);
  if (canonicos.length === 1) return canonicos[0]!.nombreApi;
  if (canonicos.length > 1) return null;

  const alias = catalogo.filter((pais) => pais.clavesBusqueda.includes(clave));
  if (alias.length === 1) return alias[0]!.nombreApi;
  return null;
}

export function buscarSugerencias(
  catalogo: readonly PaisSugerible[],
  texto: string,
): PaisSugerible[] {
  const clave = normalizarClaveBusqueda(texto);
  if (clave === "") return [];

  return catalogo
    .filter((pais) =>
      [normalizarClaveBusqueda(pais.nombreApi), normalizarClaveBusqueda(pais.nombreEspanol)].some(
        (alias) => alias.startsWith(clave),
      ),
    )
    .slice(0, 5);
}

export function obtenerCatalogoPaises(): Promise<readonly PaisSugerible[]> {
  if (catalogoEnCache) return catalogoEnCache;

  const promesa = Promise.resolve()
    .then(() => obtenerCapitalesCompartidas())
    .then((elementos) => {
      const catalogo = construirCatalogoPaises(elementos);
      if (catalogo.length === 0) throw new ErrorApi("respuesta-invalida");
      return catalogo;
    });

  catalogoEnCache = promesa;
  promesa.catch(() => {
    if (catalogoEnCache === promesa) catalogoEnCache = null;
  });
  return promesa;
}

export function reiniciarCacheBusqueda(): void {
  catalogoEnCache = null;
}
