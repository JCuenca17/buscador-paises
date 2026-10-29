import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { normalizarClaveBusqueda } from "./busqueda.service";

const letra = fc.constantFrom( ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZáéíóúÁÉÍÓÚñÑ" );
const texto = fc.string({ unit: letra, maxLength: 60 });
const espacio = fc.constantFrom(" ", "\t", "\n", "\r", " ");
const relleno = fc.array(espacio, { maxLength: 4 }).map((partes) => partes.join(""));

describe("normalizarClaveBusqueda (fast-check)", () => {
  it("es idempotente para cualquier texto generado", () => {
    fc.assert(
      fc.property(texto, (valor) => {
        expect(normalizarClaveBusqueda(normalizarClaveBusqueda(valor))).toBe(
          normalizarClaveBusqueda(valor),
        );
      }),
    );
  });

  it("es invariante a mayúsculas y espacios externos", () => {
    fc.assert(
      fc.property(texto, relleno, relleno, (valor, inicio, fin) => {
        expect(normalizarClaveBusqueda(`${inicio}${valor.toUpperCase()}${fin}`)).toBe(
          normalizarClaveBusqueda(valor),
        );
      }),
    );
  });

  it("normaliza igual caracteres acentuados precompuestos y descompuestos", () => {
    fc.assert(
      fc.property(fc.constantFrom("á", "é", "í", "ó", "ú", "ñ"), (caracter) => {
        const descompuesto = caracter.normalize("NFD");
        expect(normalizarClaveBusqueda(caracter)).toBe(normalizarClaveBusqueda(descompuesto));
      }),
    );
  });
});
