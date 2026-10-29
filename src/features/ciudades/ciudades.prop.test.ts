import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { crearIndiceCiudades, normalizarFiltro, validarCiudades } from "./ciudades.service";

describe("propiedades de ciudades", () => {
  it("normalizar es idempotente y equivalente para NFC y NFD", () => {
    fc.assert(fc.property(fc.string(), (texto) => {
      expect(normalizarFiltro(normalizarFiltro(texto))).toBe(normalizarFiltro(texto));
      expect(normalizarFiltro(texto.normalize("NFC"))).toBe(normalizarFiltro(texto.normalize("NFD")));
    }));
  });

  it("no distingue mayúsculas ni tildes de nombres españoles", () => {
    fc.assert(fc.property(fc.array(fc.constantFrom("a", "á", "e", "é", "i", "í", "o", "ó", "u", "ú", "ñ", " ")), (letras) => {
      const texto = letras.join("");
      expect(normalizarFiltro(texto.toUpperCase())).toBe(normalizarFiltro(texto));
      expect(normalizarFiltro(texto.replace(/[áéíóúñ]/g, (c) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u", ñ: "n" })[c]!))).toBe(normalizarFiltro(texto));
    }));
  });

  it("mantiene idempotencia con marcas combinadas entre espacios", () => {
    fc.assert(fc.property(fc.array(fc.constantFrom("a", "á", "ñ", " ", "\t", "\u0301", "\u0308")), (letras) => {
      const texto = letras.join("");
      expect(normalizarFiltro(normalizarFiltro(texto))).toBe(normalizarFiltro(texto));
    }));
  });

  it("validar valores arbitrarios no lanza y solo admite cadenas no vacías", () => {
    fc.assert(fc.property(fc.jsonValue(), (cities) => {
      const fila = { iso2: "PE", iso3: "PER", country: "Peru", cities };
      const esperada = Array.isArray(cities) && cities.every((c) => typeof c === "string" && c.trim() !== "");
      expect(validarCiudades(fila)).toBe(esperada);
    }));
  });

  it("una fila válida sigue indexada aunque haya entradas arbitrarias", () => {
    fc.assert(fc.property(fc.array(fc.jsonValue()), (basura) => {
      const fila = { iso2: "PE", iso3: "PER", country: "Peru", cities: ["Lima"] };
      expect(crearIndiceCiudades([fila, ...basura]).get("PER")).toBe(fila);
    }));
  });
});
