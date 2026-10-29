import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorApi } from "../../api/http";
import { construirCatalogoPaises, type PaisSugerible } from "./busqueda.service";
import { montarSugerencias } from "./busqueda.component";

const nombresFalsos = {
  of: (iso2: string) => ({ PE: "Perú", ES: "España", DE: "Alemania", CC: "Islas Cocos" })[iso2],
};
const catalogo = construirCatalogoPaises(
  [
    { name: "Peru", iso2: "PE" },
    { name: "Spain", iso2: "ES" },
    { name: "Germany", iso2: "DE" },
    { name: "Cocos Islands", iso2: "CC" },
    { name: "Cocos (Keeling) Islands", iso2: "CC" },
  ],
  nombresFalsos,
);

const entrada = () => document.querySelector<HTMLInputElement>("#nombre-pais")!;
const lista = () => document.querySelector<HTMLElement>('[role="listbox"]')!;
const opciones = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
const error = () => document.querySelector<HTMLElement>('[role="alert"]')!;
const reintentar = () => document.querySelector<HTMLButtonElement>("[data-reintentar-sugerencias]")!;

function escribir(texto: string): void {
  entrada().value = texto;
  entrada().dispatchEvent(new Event("input", { bubbles: true }));
}

async function esperarActualizacion(): Promise<void> {
  await vi.waitFor(() => expect(lista().hidden).toBe(false));
}

describe("montarSugerencias", () => {
  let seleccionar: (pais: PaisSugerible) => void;
  let obtenerCatalogo: () => Promise<readonly PaisSugerible[]>;
  let seleccionarMock: ReturnType<typeof vi.fn<(pais: PaisSugerible) => void>>;
  let obtenerCatalogoMock: ReturnType<typeof vi.fn<() => Promise<readonly PaisSugerible[]>>>;
  let destruir: (() => void) | undefined;

  beforeEach(() => {
    document.body.innerHTML = '<form><label for="nombre-pais">Nombre del país</label><input id="nombre-pais" aria-describedby="validacion-pais"><p id="validacion-pais"></p><button type="submit">Buscar</button></form>';
    seleccionarMock = vi.fn<(pais: PaisSugerible) => void>();
    obtenerCatalogoMock = vi.fn<() => Promise<readonly PaisSugerible[]>>(async () => catalogo);
    seleccionar = seleccionarMock;
    obtenerCatalogo = obtenerCatalogoMock;
    destruir = montarSugerencias(entrada(), { obtenerCatalogo, alSeleccionar: seleccionar });
  });

  afterEach(() => {
    destruir?.();
    destruir = undefined;
    vi.restoreAllMocks();
  });

  it("configura el combobox accesible y conserva aria-describedby existente", () => {
    expect(entrada().getAttribute("role")).toBe("combobox");
    expect(entrada().getAttribute("aria-autocomplete")).toBe("list");
    expect(entrada().getAttribute("aria-expanded")).toBe("false");
    expect(entrada().getAttribute("aria-describedby")).toBe("validacion-pais");
    expect(entrada().getAttribute("aria-controls")).toBe(lista().id);
  });

  it("muestra coincidencias en español y no más de cinco", async () => {
    escribir("co");
    await esperarActualizacion();

    expect(opciones()).toHaveLength(2);
    expect(opciones().map((opcion) => opcion.textContent)).toEqual([
      "Islas Cocos — Cocos Islands (CC)",
      "Islas Cocos — Cocos (Keeling) Islands (CC)",
    ]);
  });

  it("usa ArrowDown/ArrowUp, Enter selecciona y Escape cierra sin seleccionar", async () => {
    escribir("es");
    await esperarActualizacion();

    entrada().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(entrada().getAttribute("aria-activedescendant")).toBe(opciones()[0]!.id);
    expect(opciones()[0]!.getAttribute("aria-selected")).toBe("true");

    entrada().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    expect(entrada().getAttribute("aria-activedescendant")).toBe(opciones()[0]!.id);

    entrada().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(lista().hidden).toBe(true);
    expect(seleccionarMock).not.toHaveBeenCalled();
  });

  it("confirma la opción activa con Enter sin enviar dos veces el formulario", async () => {
    const submit = vi.fn((evento: Event) => evento.preventDefault());
    entrada().form!.addEventListener("submit", submit);
    escribir("per");
    await esperarActualizacion();
    entrada().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

    const evento = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    entrada().dispatchEvent(evento);

    expect(evento.defaultPrevented).toBe(true);
    expect(entrada().value).toBe("Perú");
    expect(seleccionarMock).toHaveBeenCalledWith(catalogo[0]);
    expect(submit).not.toHaveBeenCalled();
    expect(lista().hidden).toBe(true);
  });

  it("selecciona con ratón, mantiene el foco y no reabre la lista por el input programático", async () => {
    escribir("alem");
    await esperarActualizacion();
    entrada().focus();
    opciones()[0]!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    opciones()[0]!.click();

    expect(entrada().value).toBe("Alemania");
    expect(document.activeElement).toBe(entrada());
    expect(seleccionarMock).toHaveBeenCalledWith(catalogo[2]);
    expect(lista().hidden).toBe(true);
  });

  it("invalida opciones anteriores al cambiar la consulta y oculta la lista sin coincidencias", async () => {
    escribir("per");
    await esperarActualizacion();
    entrada().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

    escribir("zzz");
    await vi.waitFor(() => expect(obtenerCatalogoMock).toHaveBeenCalledTimes(2));

    expect(opciones()).toHaveLength(0);
    expect(lista().hidden).toBe(true);
    expect(entrada().hasAttribute("aria-activedescendant")).toBe(false);
  });

  it.each([
    ["sin-conexion", "No hay conexión. Revisa tu conexión a internet e inténtalo de nuevo."],
    ["tiempo-agotado", "El servicio tardó demasiado en responder. Inténtalo de nuevo."],
    ["respuesta-invalida", "No se pudo obtener la información del país. Inténtalo de nuevo."],
  ] as const)("muestra el mensaje de %s y reintenta solo el catálogo", async (tipo, mensaje) => {
    const formulario = entrada().form!;
    const submit = vi.fn((evento: Event) => evento.preventDefault());
    formulario.addEventListener("submit", submit);
    obtenerCatalogoMock.mockRejectedValueOnce(new ErrorApi(tipo)).mockResolvedValue(catalogo);

    escribir("per");
    await vi.waitFor(() => expect(error().textContent).toContain(mensaje));
    expect(error().getAttribute("role")).toBe("alert");
    expect(entrada().getAttribute("aria-describedby")).toBe(`validacion-pais ${error().id}`);
    expect(reintentar().textContent).toBe("Reintentar sugerencias");

    reintentar().click();
    await esperarActualizacion();

    expect(obtenerCatalogoMock).toHaveBeenCalledTimes(2);
    expect(entrada().value).toBe("per");
    expect(entrada().getAttribute("aria-describedby")).toBe("validacion-pais");
    expect(submit).not.toHaveBeenCalled();
    expect(error().hidden).toBe(true);
  });

  it("no carga ni muestra sugerencias para una consulta vacía", () => {
    escribir("   ");

    expect(obtenerCatalogoMock).not.toHaveBeenCalled();
    expect(lista().hidden).toBe(true);
  });
});
