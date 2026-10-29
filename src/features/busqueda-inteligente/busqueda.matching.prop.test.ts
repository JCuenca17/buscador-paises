import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { construirCatalogoPaises, resolverPais } from "./busqueda.service";

const catalogo = construirCatalogoPaises(
  [{ name: "Peru", iso2: "PE" }],
  { of: () => "Perú" },
);
const mayusculas = fc.array(fc.boolean(), { minLength: 4, maxLength: 4 });
const conTilde = fc.boolean();

describe("matching de nombres de país (fast-check)", () => {
  it("resuelve todas las variantes generadas de mayúsculas y tilde al mismo país", () => {
    fc.assert(
      fc.property(mayusculas, conTilde, (capitalizar, incluirTilde) => {
        const caracteres = [...(incluirTilde ? "Perú" : "Peru")];
        const variante = caracteres
          .map((caracter, indice) =>
            capitalizar[indice] ? caracter.toUpperCase() : caracter.toLowerCase(),
          )
          .join("");

        expect(resolverPais(catalogo, variante)).toBe("Peru");
      }),
    );
  });
});
