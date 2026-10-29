import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorApi } from "../../api/http";
import { obtenerCapitalesCompartidas } from "../ficha/ficha.service";
import {
  buscarSugerencias,
  construirCatalogoPaises,
  obtenerCatalogoPaises,
  resolverPais,
  reiniciarCacheBusqueda,
} from "./busqueda.service";

vi.mock("../ficha/ficha.service", () => ({
  obtenerCapitalesCompartidas: vi.fn(),
}));

const capitales = [
  { name: "Peru", iso2: "PE" },
  { name: "Spain", iso2: "ES" },
  { name: "Germany", iso2: "DE" },
  { name: "Cocos Islands", iso2: "CC" },
  { name: "Cocos (Keeling) Islands", iso2: "CC" },
];

const displayNamesFalso = {
  of: (iso2: string) =>
    ({ PE: "Perú", ES: "España", DE: "Alemania", CC: "Islas Cocos" })[iso2] ?? iso2,
};

function datosCatalogo(): ReturnType<typeof construirCatalogoPaises> {
  return construirCatalogoPaises(capitales, displayNamesFalso);
}

const obtenerCapitalesMock = vi.mocked(obtenerCapitalesCompartidas);

beforeEach(() => {
  reiniciarCacheBusqueda();
  obtenerCapitalesMock.mockReset();
});

describe("normalización y catálogo", () => {
  it("genera nombres españoles con Intl.DisplayNames y el iso2 en mayúsculas", () => {
    const displayNames = new Intl.DisplayNames(["es"], { type: "region" });
    const catalogo = construirCatalogoPaises([{ name: "Peru", iso2: "pe" }]);

    expect(catalogo).toHaveLength(1);
    expect(catalogo[0]).toMatchObject({
      nombreApi: "Peru",
      iso2: "PE",
      nombreEspanol: displayNames.of("PE"),
      etiquetaSugerencia: displayNames.of("PE"),
    });
  });

  it("ignora elementos inválidos o con iso2 que no produce un nombre de región", () => {
    const catalogo = construirCatalogoPaises(
      [null, 8, { name: "", iso2: "PE" }, { name: "Sin iso2" }, { name: "Mal iso", iso2: "1" }],
      { of: () => undefined },
    );

    expect(catalogo).toEqual([]);
  });

  it("resuelve nombres en español sin tildes y conserva prioridad del nombre canónico", () => {
    const catalogo = datosCatalogo();

    expect(resolverPais(catalogo, "Perú")).toBe("Peru");
    expect(resolverPais(catalogo, "PERU")).toBe("Peru");
    expect(resolverPais(catalogo, "  eSpAñA  ")).toBe("Spain");
    expect(resolverPais(catalogo, "ALEMANIA")).toBe("Germany");
    expect(resolverPais(catalogo, "Spain")).toBe("Spain");
  });

  it("devuelve null para nombres desconocidos y aliases ambiguos sin diferenciador", () => {
    const catalogo = datosCatalogo();

    expect(resolverPais(catalogo, "Atlantida")).toBeNull();
    expect(resolverPais(catalogo, "Islas Cocos")).toBeNull();
  });

  it("diferencia aliases españoles duplicados y resuelve cada etiqueta al registro exacto", () => {
    const catalogo = datosCatalogo();
    const cocos = catalogo.filter((pais) => pais.iso2 === "CC");

    expect(cocos).toHaveLength(2);
    expect(cocos[0]!.etiquetaSugerencia).not.toBe(cocos[1]!.etiquetaSugerencia);
    expect(resolverPais(catalogo, cocos[0]!.etiquetaSugerencia)).toBe(cocos[0]!.nombreApi);
    expect(resolverPais(catalogo, cocos[1]!.etiquetaSugerencia)).toBe(cocos[1]!.nombreApi);
  });
});

describe("sugerencias", () => {
  it("busca por prefijo inglés o español en el orden de origen, con máximo cinco", () => {
    const muchos = Array.from({ length: 8 }, (_, indice) => ({
      name: `Country ${indice}`,
      iso2: `X${indice}`,
    }));
    const displayNames = { of: () => "Territorio compartido" };
    const catalogo = construirCatalogoPaises(muchos, displayNames);

    expect(buscarSugerencias(datosCatalogo(), "alem").map((pais) => pais.nombreApi)).toEqual([
      "Germany",
    ]);
    expect(buscarSugerencias(datosCatalogo(), "SPA").map((pais) => pais.nombreApi)).toEqual([
      "Spain",
    ]);
    expect(buscarSugerencias(catalogo, "terr")).toHaveLength(5);
    expect(buscarSugerencias(catalogo, "sin coincidencia")).toEqual([]);
  });
});

describe("carga del catálogo", () => {
  it("comparte la carga del catálogo derivado a partir de capitales cacheadas", async () => {
    const respuesta = Promise.resolve(capitales);
    obtenerCapitalesMock.mockReturnValue(respuesta);

    const primera = obtenerCatalogoPaises();
    const segunda = obtenerCatalogoPaises();
    expect(segunda).toBe(primera);
    await expect(primera).resolves.toHaveLength(5);
    expect(obtenerCapitalesMock).toHaveBeenCalledTimes(1);
  });

  it.each<"sin-conexion" | "tiempo-agotado" | "respuesta-invalida">([
    "sin-conexion",
    "tiempo-agotado",
    "respuesta-invalida",
  ])("propaga ErrorApi %s y permite reintentar", async (tipo) => {
    obtenerCapitalesMock
      .mockRejectedValueOnce(new ErrorApi(tipo))
      .mockResolvedValueOnce(capitales);

    await expect(obtenerCatalogoPaises()).rejects.toMatchObject({ tipo });
    await expect(obtenerCatalogoPaises()).resolves.toHaveLength(5);
    expect(obtenerCapitalesMock).toHaveBeenCalledTimes(2);
  });
});
