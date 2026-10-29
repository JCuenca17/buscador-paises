import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaisFicha } from "../ficha/tipos";
import { seccionCiudades } from "./ciudades.component";
import { obtenerCiudades, type ResultadoCiudades } from "./ciudades.service";

vi.mock("./ciudades.service", async (original) => ({
  ...await original<typeof import("./ciudades.service")>(), obtenerCiudades: vi.fn(),
}));

const pais: PaisFicha = { nombre: "Peru", capital: "Lima", bandera: null, iso2: "PE", iso3: "PER" };
const nombres = (n: number) => Array.from({ length: n }, (_, i) => `Ciudad ${String(i + 1).padStart(2, "0")}`);
const servicio = vi.mocked(obtenerCiudades);
let seccion: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  seccion = document.createElement("section");
  const h3 = document.createElement("h3");
  h3.textContent = "Ciudades";
  seccion.append(h3);
  document.body.append(seccion);
  servicio.mockReset();
});

async function montar(ciudades: string[]) {
  servicio.mockResolvedValue({ tipo: "disponibles", ciudades });
  await seccionCiudades.renderizar(pais, seccion, new AbortController().signal);
}
const campo = () => seccion.querySelector<HTMLInputElement>("input")!;
const lista = () => [...seccion.querySelectorAll("li")].map((li) => li.textContent);
const boton = (texto: string) => [...seccion.querySelectorAll("button")].find((b) => b.textContent === texto)!;
function filtrar(texto: string) {
  campo().value = texto;
  campo().dispatchEvent(new Event("input", { bubbles: true }));
}

describe("vista de ciudades", () => {
  it.each([0, 1, 20, 21, 40, 41])("muestra máximo 20 ciudades de %i, contador global y límites", async (total) => {
    await montar(nombres(total));
    expect(lista()).toEqual(nombres(total).slice(0, 20));
    expect(seccion.querySelector('[role="status"]')?.textContent).toContain(`${total} resultados`);
    expect(boton("Anterior").disabled).toBe(true);
    expect(boton("Siguiente").disabled).toBe(total <= 20);
    expect(seccion.querySelector("h3")?.textContent).toBe("Ciudades");
    expect(seccion.querySelector<HTMLElement>(".ciudades__filtro")?.hidden).toBe(total === 0);
    if (total === 0) expect(seccion.textContent).toContain("No hay ciudades registradas para este país");
  });

  it("recorre 41 ciudades sin omisiones y mantiene foco disponible", async () => {
    await montar(nombres(41));
    const siguiente = boton("Siguiente");
    const anterior = boton("Anterior");
    siguiente.focus();
    siguiente.click();
    expect(lista()).toEqual(nombres(41).slice(20, 40));
    siguiente.click();
    expect(lista()).toEqual(["Ciudad 41"]);
    expect(seccion.querySelector('[role="status"]')?.textContent).toContain("Página 3 de 3");
    expect(siguiente.disabled).toBe(true);
    expect(document.activeElement).toBe(anterior);
    anterior.click();
    anterior.click();
    expect(lista()).toEqual(nombres(41).slice(0, 20));
    expect(document.activeElement).toBe(siguiente);
  });

  it("no agrega página vacía con múltiplos de 20", async () => {
    await montar(nombres(40));
    boton("Siguiente").click();
    expect(lista()).toHaveLength(20);
    expect(seccion.querySelector('[role="status"]')?.textContent).toContain("Mostrando 21-40. Página 2 de 2");
    expect(boton("Siguiente").disabled).toBe(true);
  });

  it("filtra toda la lista sin mayúsculas ni tildes y reinicia página", async () => {
    await montar([...nombres(21), "Huánuco"]);
    boton("Siguiente").click();
    campo().focus();
    for (const filtro of ["HUANUCO", "huánuco", "hua\u0301nuco", " uan "]) {
      filtrar(filtro);
      expect(lista()).toEqual(["Huánuco"]);
      expect(seccion.querySelector('[role="status"]')?.textContent).toContain("1 resultados. Mostrando 1-1. Página 1 de 1");
    }
    expect(document.activeElement).toBe(campo());
    expect(servicio).toHaveBeenCalledTimes(1);
    filtrar("  ");
    expect(lista()).toHaveLength(20);
    expect(seccion.querySelector('[role="status"]')?.textContent).toContain("22 resultados");
  });

  it("muestra cero coincidencias y recupera lista al vaciar filtro", async () => {
    await montar(["Lima"]);
    filtrar("zzzzzz");
    expect(lista()).toEqual([]);
    expect(seccion.textContent).toContain("No hay ciudades que coincidan con el filtro");
    expect(seccion.querySelector('[role="status"]')?.textContent).toBe("0 resultados");
    filtrar("");
    expect(lista()).toEqual(["Lima"]);
  });

  it("asocia etiqueta, anuncia contador e inserta nombres como texto seguro", async () => {
    const texto = '<img src=x onerror="alert(1)">';
    await montar([texto]);
    expect(seccion.querySelector("label")?.htmlFor).toBe(campo().id);
    expect(campo().labels?.[0]?.textContent).toBe("Filtrar ciudades");
    expect(seccion.querySelector('[role="status"]')?.getAttribute("aria-live")).toBe("polite");
    expect(seccion.querySelector("li")?.textContent).toBe(texto);
    expect(seccion.querySelector("img")).toBeNull();
    expect([...seccion.querySelectorAll("button")].every((b) => b.type === "button")).toBe(true);
  });
});

describe("carga y recuperación", () => {
  it.each([
    ["sin-conexion", "No hay conexión para cargar las ciudades"],
    ["tiempo-agotado", "El servicio tardó demasiado en cargar las ciudades"],
    ["respuesta-invalida", "La respuesta del servicio no es válida"],
  ] as const)("presenta %s y reintenta con foco en filtro", async (tipo, mensaje) => {
    servicio.mockResolvedValueOnce({ tipo }).mockResolvedValueOnce({ tipo: "disponibles", ciudades: ["Lima"] });
    await seccionCiudades.renderizar(pais, seccion, new AbortController().signal);
    expect(seccion.querySelector('[role="alert"]')?.textContent).toContain(mensaje);
    expect(seccion.querySelector('[role="alert"]')?.textContent?.endsWith(".")).toBe(true);
    boton("Reintentar").click();
    await vi.waitFor(() => expect(lista()).toEqual(["Lima"]));
    expect(servicio).toHaveBeenCalledTimes(2);
    expect(document.activeElement).toBe(campo());
  });

  it("al reintentar sin ciudades lleva el foco al estado y oculta el filtro", async () => {
    servicio.mockResolvedValueOnce({ tipo: "sin-conexion" }).mockResolvedValueOnce({ tipo: "disponibles", ciudades: [] });
    await seccionCiudades.renderizar(pais, seccion, new AbortController().signal);
    boton("Reintentar").click();
    await vi.waitFor(() => expect(seccion.querySelector('[role="status"]')?.textContent).toBe("0 resultados"));
    expect(seccion.querySelector<HTMLElement>(".ciudades__filtro")?.hidden).toBe(true);
    expect(document.activeElement).toBe(seccion.querySelector('[role="status"]'));
  });

  it("muestra carga y descarta respuesta tardía al cancelar", async () => {
    let resolver!: (r: ResultadoCiudades) => void;
    servicio.mockImplementation(() => new Promise((r) => (resolver = r)));
    const controlador = new AbortController();
    const pendiente = seccionCiudades.renderizar(pais, seccion, controlador.signal);
    expect(seccion.textContent).toContain("Cargando ciudades…");
    controlador.abort();
    resolver({ tipo: "disponibles", ciudades: ["Respuesta vieja"] });
    await pendiente;
    expect(lista()).toEqual([]);
    expect(seccion.textContent).not.toContain("Respuesta vieja");
  });

  it("contiene excepciones inesperadas del servicio con reintento", async () => {
    servicio.mockRejectedValueOnce(new Error("inesperado"));
    await seccionCiudades.renderizar(pais, seccion, new AbortController().signal);
    expect(seccion.querySelector('[role="alert"]')?.textContent).toContain("La respuesta del servicio no es válida");
    expect(boton("Reintentar")).toBeDefined();
  });
});
