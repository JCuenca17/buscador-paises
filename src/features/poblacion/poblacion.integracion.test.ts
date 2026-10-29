import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaisFicha } from "../ficha/tipos";
import { seccionPoblacion } from "./poblacion.component";
import { reiniciarCachePoblacion } from "./poblacion.service";

const peru = { iso3: "PER", country: "Peru", populationCounts: [{ year: 2018, value: 31_800_000 }] };
const chile = { iso3: "CHL", country: "Chile", populationCounts: [{ year: 2018, value: 18_000_000 }] };
const responder = (data: unknown) => new Response(JSON.stringify({ error: false, data }));
const pais = (iso3: string, nombre: string): PaisFicha => ({ nombre, capital: null, bandera: null, iso2: iso3.slice(0, 2), iso3 });

function contenedor(): HTMLElement {
  const el = document.createElement("section");
  document.body.append(el);
  return el;
}

beforeEach(() => {
  document.body.replaceChildren();
  reiniciarCachePoblacion();
  vi.restoreAllMocks();
});

describe("población de extremo a extremo", () => {
  it("una sola descarga por sesión al cambiar de país", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(responder([peru, chile]));
    vi.stubGlobal("fetch", fetchFalso);
    const a = contenedor();
    const b = contenedor();
    await seccionPoblacion.renderizar(pais("PER", "Perú"), a, new AbortController().signal);
    await seccionPoblacion.renderizar(pais("CHL", "Chile"), b, new AbortController().signal);
    expect(a.textContent).toContain("31.800.000 hab.");
    expect(b.textContent).toContain("18.000.000 hab.");
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it("una respuesta tardía de un país anterior no llega a su sección", async () => {
    let resolver!: (r: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((r) => (resolver = r))));
    const anterior = new AbortController();
    const viejo = contenedor();
    const nuevo = contenedor();
    const vieja = seccionPoblacion.renderizar(pais("PER", "Perú"), viejo, anterior.signal);
    anterior.abort();
    const actual = seccionPoblacion.renderizar(pais("CHL", "Chile"), nuevo, new AbortController().signal);
    resolver(responder([peru, chile]));
    await Promise.all([vieja, actual]);
    expect(viejo.textContent).not.toContain("hab.");
    expect(nuevo.textContent).toContain("18.000.000 hab.");
  });

  it("tras un fallo, Reintentar descarga de nuevo y muestra la cifra", async () => {
    const fetchFalso = vi.fn()
      .mockResolvedValueOnce(new Response("error", { status: 500 }))
      .mockResolvedValueOnce(responder([peru]));
    vi.stubGlobal("fetch", fetchFalso);
    const el = contenedor();
    await seccionPoblacion.renderizar(pais("PER", "Perú"), el, new AbortController().signal);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain("no es válida");
    el.querySelector("button")!.click();
    await vi.waitFor(() => expect(el.textContent).toContain("31.800.000 hab."));
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });
});
