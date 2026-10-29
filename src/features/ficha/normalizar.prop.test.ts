import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { BANDERAS, CAPITALES } from "./datos-prueba";
import { buscarEnIndice, crearIndice } from "./ficha.service";
import { normalizarNombre } from "./normalizar";

/** Espacios en blanco que el usuario puede escribir o pegar. */
const espacio = fc.constantFrom(" ", "\t", "\n", "\r", " ");
const espacios = (minLength: number) =>
  fc.array(espacio, { minLength, maxLength: 4 }).map((a) => a.join(""));

/**
 * Letras cuya conversión a mayúsculas y de vuelta a minúsculas es reversible (evita casos como
 * «ß» → «SS», que no pertenecen a FR-003).
 */
const letra = fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZáéíóúñÉÑ(),.-'");
const palabra = fc.string({ unit: letra, minLength: 1, maxLength: 8 });

/** Cambia aleatoriamente mayúsculas/minúsculas y los espacios de un nombre. */
const variante = (nombre: string) => {
  const palabras = nombre.trim().split(/\s+/);
  return fc
    .record({
      mayusculas: fc.array(fc.boolean(), { minLength: nombre.length, maxLength: nombre.length }),
      inicio: espacios(0),
      fin: espacios(0),
      separadores: fc.array(espacios(1), {
        minLength: palabras.length,
        maxLength: palabras.length,
      }),
    })
    .map(({ mayusculas, inicio, fin, separadores }) => {
      const conEspacios =
        inicio + palabras.map((p, i) => (i === 0 ? p : separadores[i]! + p)).join("") + fin;
      return [...conEspacios]
        .map((c, i) => (mayusculas[i % mayusculas.length] ? c.toUpperCase() : c.toLowerCase()))
        .join("");
    });
};

describe("normalizarNombre (propiedades)", () => {
  it("es idempotente", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme" }), (s) => {
        expect(normalizarNombre(normalizarNombre(s))).toBe(normalizarNombre(s));
      }),
    );
  });

  it("no deja espacios extremos ni espacios seguidos", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme" }), (s) => {
        const r = normalizarNombre(s);
        expect(r).toBe(r.trim());
        expect(r).not.toMatch(/\s{2,}/);
      }),
    );
  });

  it("es invariante a toUpperCase()", () => {
    fc.assert(
      fc.property(fc.array(palabra, { maxLength: 5 }), espacios(1), (palabras, sep) => {
        const s = palabras.join(sep);
        expect(normalizarNombre(s.toUpperCase())).toBe(normalizarNombre(s));
      }),
    );
  });

  it("es invariante a espacios añadidos al inicio, al final y entre palabras", () => {
    fc.assert(
      fc.property(
        fc.array(palabra, { minLength: 1, maxLength: 5 }),
        espacios(0),
        espacios(0),
        fc.array(espacios(1), { minLength: 5, maxLength: 5 }),
        (palabras, inicio, fin, separadores) => {
          const base = palabras.join(" ");
          const conEspacios =
            inicio + palabras.map((p, i) => (i === 0 ? p : separadores[i]! + p)).join("") + fin;
          expect(normalizarNombre(conEspacios)).toBe(normalizarNombre(base));
        },
      ),
    );
  });

  it("toda variante de mayúsculas o espacios de un nombre encuentra el mismo país", () => {
    const indice = crearIndice(CAPITALES, BANDERAS)!;
    expect(indice).not.toBeNull();
    const nombres = CAPITALES.map((c) => c.name as string);

    for (const nombre of nombres) {
      const esperado = buscarEnIndice(indice, nombre);
      expect(esperado.tipo).toBe("encontrado");
      fc.assert(
        fc.property(variante(nombre), (texto) => {
          expect(buscarEnIndice(indice, texto)).toEqual(esperado);
        }),
        { numRuns: 50 },
      );
    }
  });
});
