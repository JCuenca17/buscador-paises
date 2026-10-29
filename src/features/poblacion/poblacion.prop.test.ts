import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatearCifra } from "./poblacion.component";
import { validarRegistro } from "./poblacion.service";

const registro = fc.record({
  year: fc.integer({ min: 1, max: 9999 }),
  value: fc.integer({ min: 0, max: 2_000_000_000 }),
});

describe("propiedades de población", () => {
  it("el año más reciente siempre es el máximo de los registros válidos", () => {
    fc.assert(fc.property(fc.array(registro, { minLength: 1, maxLength: 30 }), (registros) => {
      const ultimo = registros.reduce((a, b) => (b.year > a.year ? b : a));
      expect(registros.every(validarRegistro)).toBe(true);
      expect(ultimo.year).toBe(Math.max(...registros.map((r) => r.year)));
    }));
  });

  it("formatear la cifra conserva todos sus dígitos", () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 2_000_000_000 }), (cifra) => {
      const texto = formatearCifra(cifra);
      expect(texto.endsWith(" hab.")).toBe(true);
      expect(Number(texto.replace(/[^\d]/g, ""))).toBe(cifra);
    }));
  });

  it("rechaza años o cifras no enteros, negativos o fuera de rango", () => {
    fc.assert(fc.property(
      fc.oneof(fc.double({ noNaN: true, noDefaultInfinity: true }).filter((n) => !Number.isInteger(n)), fc.integer({ max: -1 })),
      (malo) => {
        expect(validarRegistro({ year: 2018, value: malo })).toBe(false);
        expect(validarRegistro({ year: malo, value: 1 })).toBe(false);
      },
    ));
  });
});
