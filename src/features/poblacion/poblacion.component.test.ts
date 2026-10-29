import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaisFicha } from "../ficha/tipos";
import { seccionPoblacion } from "./poblacion.component";
import { obtenerPoblacion, type ResultadoPoblacion } from "./poblacion.service";

vi.mock("./poblacion.service", async (original) => ({
  ...await original<typeof import("./poblacion.service")>(), obtenerPoblacion: vi.fn(),
}));

const pais: PaisFicha = { nombre: "Perú", capital: "Lima", bandera: null, iso2: "PE", iso3: "PER" };
const servicio = vi.mocked(obtenerPoblacion);
let seccion: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  seccion = document.createElement("section");
  const h3 = document.createElement("h3");
  h3.textContent = "Población";
  seccion.append(h3);
  document.body.append(seccion);
  servicio.mockReset();
});

async function montar(resultado: ResultadoPoblacion) {
  servicio.mockResolvedValue(resultado);
  await seccionPoblacion.renderizar(pais, seccion, new AbortController().signal);
}
const estado = () => seccion.querySelector('[role="status"]')!.textContent;
const alerta = () => seccion.querySelector<HTMLElement>('[role="alert"]')!;
const boton = () => seccion.querySelector("button")!;

describe("sección de población", () => {
  it("muestra cifra con separadores, año de referencia y no altera el encabezado", async () => {
    await montar({ tipo: "disponible", cifra: 31_800_000, anio: 2018 });
    expect(estado()).toBe("31.800.000 hab.");
    expect(seccion.textContent).toContain("Dato de 2018");
    expect(seccion.querySelector("h3")?.textContent).toBe("Población");
    expect(boton().hidden).toBe(true);
  });

  it("muestra «Cargando población…» mientras espera", async () => {
    servicio.mockReturnValue(new Promise(() => {}));
    void seccionPoblacion.renderizar(pais, seccion, new AbortController().signal);
    await Promise.resolve();
    expect(estado()).toBe("Cargando población…");
  });

  it("muestra «Sin datos» sin botón Reintentar", async () => {
    await montar({ tipo: "sin-datos" });
    expect(estado()).toBe("Sin datos");
    expect(boton().hidden).toBe(true);
  });

  it.each([
    ["sin-conexion", "No hay conexión para cargar la población. Revisa tu conexión e inténtalo de nuevo."],
    ["tiempo-agotado", "El servicio tardó demasiado en cargar la población. Inténtalo de nuevo."],
    ["respuesta-invalida", "No se pudo obtener la población. La respuesta del servicio no es válida."],
  ] as const)("muestra el error %s con Reintentar", async (tipo, mensaje) => {
    await montar({ tipo });
    expect(alerta().textContent).toBe(mensaje);
    expect(alerta().hidden).toBe(false);
    expect(boton().hidden).toBe(false);
    expect(boton().textContent).toBe("Reintentar");
  });

  it("Reintentar vuelve a consultar y recupera la cifra", async () => {
    await montar({ tipo: "sin-conexion" });
    servicio.mockResolvedValueOnce({ tipo: "disponible", cifra: 1_000_000, anio: 2018 });
    boton().click();
    await vi.waitFor(() => expect(estado()).toBe("1.000.000 hab."));
    expect(servicio).toHaveBeenCalledTimes(2);
    expect(alerta().hidden).toBe(true);
  });

  it("no muestra nada si la consulta fue cancelada", async () => {
    servicio.mockResolvedValue({ tipo: "cancelada" });
    await seccionPoblacion.renderizar(pais, seccion, new AbortController().signal);
    expect(estado()).toBe("Cargando población…");
    expect(alerta().hidden).toBe(true);
  });

  it("un rechazo inesperado se presenta como respuesta inválida", async () => {
    servicio.mockRejectedValue(new Error("boom"));
    await seccionPoblacion.renderizar(pais, seccion, new AbortController().signal);
    expect(alerta().textContent).toContain("La respuesta del servicio no es válida");
  });
});
