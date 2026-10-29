import { beforeEach, expect, it, vi } from "vitest";
import { montarFicha } from "../ficha/ficha.component";
import { CAPITALES, BANDERAS } from "../ficha/datos-prueba";
import { reiniciarCache } from "../ficha/ficha.service";
import { registrarSeccion, reiniciarSecciones } from "../ficha/secciones";
import { seccionCiudades } from "./ciudades.component";
import { reiniciarCacheCiudades } from "./ciudades.service";

const peru = { country: "Peru", iso2: "PE", iso3: "PER", cities: ["Lima", "Cusco", "Huánuco"] };
const chile = { country: "Chile", iso2: "CL", iso3: "CHL", cities: ["Santiago"] };
const respuesta = (data: unknown) => new Response(JSON.stringify({ error: false, data }));
let raiz: HTMLElement;

beforeEach(() => {
  reiniciarCache();
  reiniciarCacheCiudades();
  reiniciarSecciones();
  document.body.replaceChildren();
  raiz = document.createElement("div");
  raiz.id = "app";
  document.body.append(raiz);
});

function red(pedirCiudades = () => Promise.resolve(respuesta([peru, chile]))) {
  const fetchFalso = vi.fn((url: string) => {
    if (url.endsWith("/countries/capital")) return Promise.resolve(respuesta(CAPITALES));
    if (url.endsWith("/countries/flag/images")) return Promise.resolve(respuesta(BANDERAS));
    if (url.endsWith("/countries")) return pedirCiudades();
    throw new Error(`Ruta inesperada en prueba: ${url}`);
  });
  vi.stubGlobal("fetch", fetchFalso);
  return fetchFalso;
}

function montar() {
  registrarSeccion(seccionCiudades);
  montarFicha(raiz);
}

function buscar(texto: string) {
  raiz.querySelector<HTMLInputElement>("#nombre-pais")!.value = texto;
  raiz.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

it("main registra ciudades, conserva ficha y reinicia filtro al cambiar país sin otra descarga", async () => {
  const fetchFalso = red();
  await import("../../main");
  buscar("Peru");
  await vi.waitFor(() => expect(raiz.querySelector('[data-seccion="ciudades"] li')?.textContent).toBe("Cusco"));
  expect(raiz.querySelector("[data-capital]")?.textContent).toBe("Lima");
  expect(raiz.querySelector("[data-bandera] img")).not.toBeNull();
  const filtro = raiz.querySelector<HTMLInputElement>('[data-seccion="ciudades"] input')!;
  filtro.value = "HUANUCO";
  filtro.dispatchEvent(new Event("input"));
  expect([...raiz.querySelectorAll('[data-seccion="ciudades"] li')].map((li) => li.textContent)).toEqual(["Huánuco"]);
  buscar("Chile");
  await vi.waitFor(() => expect(raiz.querySelector('[data-seccion="ciudades"] li')?.textContent).toBe("Santiago"));
  expect(raiz.querySelector<HTMLInputElement>('[data-seccion="ciudades"] input')?.value).toBe("");
  expect(fetchFalso.mock.calls.filter(([url]) => url.endsWith("/countries"))).toHaveLength(1);
  buscar("asdfgh");
  await vi.waitFor(() => expect(raiz.textContent).toContain("No se encontró el país"));
  expect(raiz.querySelector('[data-seccion="ciudades"]')).toBeNull();
  buscar("");
  expect(raiz.textContent).toContain("Escribe el nombre de un país");
});

it("un error de ciudades conserva capital/bandera y el reintento solo pide ciudades", async () => {
  let fallar = true;
  const fetchFalso = red(() => fallar ? Promise.reject(new TypeError("red")) : Promise.resolve(respuesta([peru])));
  montar();
  buscar("Peru");
  await vi.waitFor(() => expect(raiz.querySelector('[data-seccion="ciudades"] [role="alert"]')?.textContent).toContain("No hay conexión"));
  expect(raiz.querySelector<HTMLElement>("[data-ficha]")?.hidden).toBe(false);
  expect(raiz.querySelector("[data-capital]")?.textContent).toBe("Lima");
  expect(raiz.querySelector("[data-bandera] img")).not.toBeNull();
  fallar = false;
  [...raiz.querySelectorAll("button")].find((b) => b.textContent === "Reintentar")!.click();
  await vi.waitFor(() => expect(raiz.querySelectorAll('[data-seccion="ciudades"] li')).toHaveLength(3));
  expect(fetchFalso.mock.calls.filter(([url]) => url.endsWith("/countries"))).toHaveLength(2);
  expect(fetchFalso.mock.calls.filter(([url]) => url.endsWith("/countries/capital"))).toHaveLength(1);
});

it("una búsqueda reemplazada no pinta ciudades viejas y comparte la descarga pendiente", async () => {
  let resolver!: (r: Response) => void;
  const pendiente = new Promise<Response>((r) => (resolver = r));
  const fetchFalso = red(() => pendiente);
  montar();
  buscar("Peru");
  await vi.waitFor(() => expect(raiz.textContent).toContain("Cargando ciudades…"));
  buscar("Chile");
  await vi.waitFor(() => expect(raiz.querySelector("h2")?.textContent).toBe("Chile"));
  resolver(respuesta([peru, chile]));
  await vi.waitFor(() => expect(raiz.querySelector('[data-seccion="ciudades"] li')?.textContent).toBe("Santiago"));
  expect(raiz.querySelectorAll('[data-seccion="ciudades"]')).toHaveLength(1);
  expect(raiz.querySelector('[data-seccion="ciudades"]')?.textContent).not.toContain("Huánuco");
  expect(fetchFalso.mock.calls.filter(([url]) => url.endsWith("/countries"))).toHaveLength(1);
});
