import { beforeEach, describe, expect, it, vi } from "vitest";
import { montarFicha } from "../ficha/ficha.component";
import { buscarFicha } from "../ficha/ficha.service";
import type { PaisFicha, ResultadoBusqueda } from "../ficha/tipos";
import { construirCatalogoPaises, resolverPais } from "./busqueda.service";
import { montarSugerencias } from "./busqueda.component";

vi.mock("../ficha/ficha.service");

const nombres = {
  of: (iso2: string) =>
    ({ PE: "Perú", ES: "España", DE: "Alemania", AA: "País compartido", BB: "País compartido" })[
      iso2
    ],
};
const catalogo = construirCatalogoPaises(
  [
    { name: "Peru", iso2: "PE" },
    { name: "Spain", iso2: "ES" },
    { name: "Germany", iso2: "DE" },
    { name: "Alpha", iso2: "AA" },
    { name: "Beta", iso2: "BB" },
  ],
  nombres,
);

const resultados: Record<string, PaisFicha> = {
  Peru: { nombre: "Peru", capital: "Lima", bandera: null, iso2: "PE", iso3: "PER" },
  Spain: { nombre: "Spain", capital: "Madrid", bandera: null, iso2: "ES", iso3: "ESP" },
  Germany: { nombre: "Germany", capital: "Berlin", bandera: null, iso2: "DE", iso3: "DEU" },
  Alpha: { nombre: "Alpha", capital: "A", bandera: null, iso2: "AA", iso3: "AAA" },
  Beta: { nombre: "Beta", capital: "B", bandera: null, iso2: "BB", iso3: "BBB" },
};
const encontrado = (pais: PaisFicha): ResultadoBusqueda => ({ tipo: "encontrado", pais });

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0));
const input = () => document.querySelector<HTMLInputElement>("#nombre-pais")!;
const botonBuscar = () => document.querySelector<HTMLButtonElement>('form button[type="submit"]')!;
const opciones = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')];

function escribir(texto: string): void {
  input().value = texto;
  input().dispatchEvent(new Event("input", { bubbles: true }));
}

function montarFlujo() {
  const resolver = async (texto: string) => resolverPais(catalogo, texto) ?? texto;
  montarFicha(document.body, resolver);
  montarSugerencias(input(), {
    obtenerCatalogo: async () => catalogo,
    alSeleccionar: () => input().form!.requestSubmit(),
  });
}

describe("integración búsqueda inteligente con la ficha base", () => {
  beforeEach(() => {
    vi.mocked(buscarFicha).mockReset();
    vi.mocked(buscarFicha).mockImplementation(async (texto) => {
      const pais = resultados[texto];
      return pais ? encontrado(pais) : { tipo: "no-encontrado" };
    });
    document.body.replaceChildren();
    montarFlujo();
  });

  it("resuelve búsqueda manual en español con el botón y Enter al nombre canónico", async () => {
    escribir("España");
    botonBuscar().click();
    await esperar();
    expect(buscarFicha).toHaveBeenLastCalledWith("Spain", expect.any(Object));
    expect(document.querySelector("[data-ficha] h2")?.textContent).toBe("Spain");

    escribir("ALEMANIA");
    input().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    input().form!.requestSubmit();
    await esperar();
    expect(buscarFicha).toHaveBeenLastCalledWith("Germany", expect.any(Object));
    expect(document.querySelector("[data-ficha] h2")?.textContent).toBe("Germany");
  });

  it("al elegir una sugerencia con el ratón conserva su etiqueta española y envía el formulario existente", async () => {
    escribir("esp");
    await vi.waitFor(() => expect(opciones()).toHaveLength(1));
    opciones()[0]!.click();
    await esperar();

    expect(input().value).toBe("España");
    expect(buscarFicha).toHaveBeenCalledTimes(1);
    expect(buscarFicha).toHaveBeenCalledWith("Spain", expect.any(Object));
    expect(document.querySelector("[data-ficha] h2")?.textContent).toBe("Spain");
    expect(document.querySelectorAll("form")).toHaveLength(1);
  });

  it("selecciona la opción duplicada correcta con teclado usando el nombre y el ISO2", async () => {
    escribir("país compartido");
    await vi.waitFor(() => expect(opciones()).toHaveLength(2));
    expect(opciones().map((opcion) => opcion.textContent)).toEqual([
      "País compartido — Alpha (AA)",
      "País compartido — Beta (BB)",
    ]);

    input().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    input().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    input().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await esperar();

    expect(input().value).toBe("País compartido — Beta (BB)");
    expect(buscarFicha).toHaveBeenCalledWith("Beta", expect.any(Object));
    expect(document.querySelector("[data-ficha] h2")?.textContent).toBe("Beta");
  });
});
