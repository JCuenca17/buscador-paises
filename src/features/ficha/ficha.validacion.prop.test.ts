/**
 * Regla general de validación de los datos de la API (Principio IV, research.md §R5).
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { buscarEnIndice, crearIndice } from "./ficha.service";
import { normalizarNombre } from "./normalizar";

const textoNoVacio = fc.string({ minLength: 1 }).filter((s) => s.trim() !== "");

/** Campo que a veces es válido y a veces no. */
const campoCualquiera = fc.oneof(fc.string(), fc.anything());

/** Elemento con la forma de la API, con campos de tipo arbitrario. */
const elementoConForma = fc.record({
  name: fc.oneof(textoNoVacio, fc.anything()),
  iso2: fc.oneof(textoNoVacio, fc.constantFrom("PE", "CL", "CC"), fc.anything()),
  iso3: campoCualquiera,
  capital: campoCualquiera,
  flag: fc.oneof(fc.webUrl(), campoCualquiera),
});

/** Lista con elementos arbitrarios mezclados con elementos con forma. */
const lista = fc.array(fc.oneof(fc.anything(), elementoConForma), { maxLength: 20 });

function esElementoValido(e: unknown): e is { name: string; iso2: string } {
  if (typeof e !== "object" || e === null) return false;
  const { name, iso2 } = e as Record<string, unknown>;
  return (
    typeof name === "string" && name.trim() !== "" && typeof iso2 === "string" && iso2.trim() !== ""
  );
}

describe("validación de datos (propiedades)", () => {
  it("1. crearIndice nunca lanza con arreglos arbitrarios", () => {
    fc.assert(
      fc.property(fc.array(fc.anything()), fc.array(fc.anything()), (capitales, banderas) => {
        const indice = crearIndice(capitales, banderas);
        expect(indice === null || typeof indice === "object").toBe(true);
      }),
    );
    fc.assert(
      fc.property(lista, lista, (capitales, banderas) => {
        crearIndice(capitales, banderas);
      }),
    );
  });

  it("2. toda clave del índice viene de un elemento con name e iso2 válidos", () => {
    fc.assert(
      fc.property(lista, lista, (capitales, banderas) => {
        const indice = crearIndice(capitales, banderas);
        if (indice === null) return;
        for (const [clave, elemento] of indice.porNombre) {
          expect(capitales).toContain(elemento);
          expect(esElementoValido(elemento)).toBe(true);
          expect(clave).toBe(normalizarNombre(elemento.name as string));
        }
        for (const [iso2, elemento] of indice.banderaPorIso2) {
          expect(banderas).toContain(elemento);
          expect(esElementoValido(elemento)).toBe(true);
          expect(elemento.iso2).toBe(iso2);
        }
      }),
    );
  });

  it("3. buscarEnIndice nunca lanza ni devuelve encontrado con tipos incorrectos", () => {
    fc.assert(
      fc.property(lista, lista, fc.string(), (capitales, banderas, textoLibre) => {
        const indice = crearIndice(capitales, banderas);
        if (indice === null) return;
        // El texto libre y todos los nombres del índice, para cubrir también los encontrados.
        const textos = [textoLibre, ...capitales.filter(esElementoValido).map((e) => e.name)];
        for (const texto of textos) {
          const resultado = buscarEnIndice(indice, texto);
          expect(["encontrado", "no-encontrado", "respuesta-invalida"]).toContain(resultado.tipo);
          if (resultado.tipo !== "encontrado") continue;
          const { pais } = resultado;
          expect(typeof pais.nombre).toBe("string");
          expect(pais.capital === null || typeof pais.capital === "string").toBe(true);
          expect(pais.capital).not.toBe("");
          expect(typeof pais.iso2 === "string" && pais.iso2.trim() !== "").toBe(true);
          expect(typeof pais.iso3 === "string" && pais.iso3.trim() !== "").toBe(true);
          expect(pais.bandera === null || pais.bandera.startsWith("https:")).toBe(true);
        }
      }),
    );
  });

  it("4. todo flag de texto que no empieza por https: da bandera null", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.startsWith("https:")),
        (flag) => {
          const indice = crearIndice(
            [{ name: "Peru", capital: "Lima", iso2: "PE", iso3: "PER" }],
            [{ name: "Peru", flag, iso2: "PE", iso3: "PER" }],
          )!;
          expect(buscarEnIndice(indice, "Peru")).toMatchObject({
            tipo: "encontrado",
            pais: { bandera: null },
          });
        },
      ),
    );
  });
});
