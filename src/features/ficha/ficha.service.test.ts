import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BANDERA_PERU,
  BANDERAS,
  CAPITALES,
  RUTA_BANDERAS,
  RUTA_CAPITALES,
  simularFetch,
  sobre,
} from "./datos-prueba";
import { buscarFicha, reiniciarCache } from "./ficha.service";

function respuestaJson(cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/** Banderas con la de Peru reemplazada por `flag`. */
function banderasConPeru(flag: unknown): Record<string, unknown>[] {
  return BANDERAS.map((b) => (b.iso2 === "PE" ? { ...b, flag } : b));
}

describe("buscarFicha: casos normales", () => {
  beforeEach(() => {
    reiniciarCache();
  });

  it("encuentra Peru con nombre, capital, bandera https, iso2 e iso3", async () => {
    vi.stubGlobal("fetch", simularFetch());

    await expect(buscarFicha("Peru")).resolves.toEqual({
      tipo: "encontrado",
      pais: { nombre: "Peru", capital: "Lima", bandera: BANDERA_PERU, iso2: "PE", iso3: "PER" },
    });
  });

  it("devuelve capital null si la capital es una cadena vacía (Antarctica)", async () => {
    vi.stubGlobal("fetch", simularFetch());

    const resultado = await buscarFicha("Antarctica");
    expect(resultado).toMatchObject({ tipo: "encontrado", pais: { capital: null } });
  });

  it("devuelve bandera null si el país no está en la lista de banderas (Bolivia)", async () => {
    vi.stubGlobal("fetch", simularFetch());

    const resultado = await buscarFicha("Bolivia");
    expect(resultado).toMatchObject({
      tipo: "encontrado",
      pais: { nombre: "Bolivia", bandera: null, iso2: "BO", iso3: "BOL" },
    });
  });

  it.each([
    "http://upload.wikimedia.org/wikipedia/commons/c/cf/Flag_of_Peru.svg",
    "javascript:alert(1)",
    "data:image/svg+xml,<svg/>",
    "",
  ])("devuelve bandera null si la URL no usa https: (%s)", async (flag) => {
    vi.stubGlobal(
      "fetch",
      simularFetch({
        [RUTA_CAPITALES]: sobre(CAPITALES),
        [RUTA_BANDERAS]: sobre(banderasConPeru(flag)),
      }),
    );

    const resultado = await buscarFicha("Peru");
    expect(resultado).toMatchObject({ tipo: "encontrado", pais: { bandera: null } });
  });

  it("encuentra un nombre de la API con espacio final y lo devuelve sin él", async () => {
    vi.stubGlobal("fetch", simularFetch());

    const resultado = await buscarFicha("bonaire, saint eustatius and saba");
    expect(resultado).toMatchObject({
      tipo: "encontrado",
      pais: { nombre: "Bonaire, Saint Eustatius and Saba", iso2: "BQ" },
    });
  });

  it("encuentra por separado dos países con el mismo iso2 (Cocos)", async () => {
    vi.stubGlobal("fetch", simularFetch());

    await expect(buscarFicha("Cocos Islands")).resolves.toMatchObject({
      tipo: "encontrado",
      pais: { nombre: "Cocos Islands", iso2: "CC" },
    });
    await expect(buscarFicha("Cocos (Keeling) Islands")).resolves.toMatchObject({
      tipo: "encontrado",
      pais: { nombre: "Cocos (Keeling) Islands", iso2: "CC" },
    });
  });

  it("normaliza el texto del usuario antes de buscar", async () => {
    vi.stubGlobal("fetch", simularFetch());

    await expect(buscarFicha("  pERU ")).resolves.toMatchObject({
      tipo: "encontrado",
      pais: { nombre: "Peru" },
    });
  });

  it("pide las dos listas en paralelo y las reutiliza en la siguiente búsqueda", async () => {
    const pendientes: Array<() => void> = [];
    const responderLuego = (cuerpo: unknown) => () =>
      new Promise<Response>((resolver) => pendientes.push(() => resolver(respuestaJson(cuerpo))));
    const fetchFalso = simularFetch({
      [RUTA_CAPITALES]: responderLuego(sobre(CAPITALES)),
      [RUTA_BANDERAS]: responderLuego(sobre(BANDERAS)),
    });
    vi.stubGlobal("fetch", fetchFalso);

    const primera = buscarFicha("Peru");
    // Las dos solicitudes empiezan antes de que llegue cualquiera de las respuestas.
    await vi.waitFor(() => expect(fetchFalso).toHaveBeenCalledTimes(2));
    expect(fetchFalso.mock.calls.map(([url]) => url).sort()).toEqual(
      [
        "https://countriesnow.space/api/v0.1" + RUTA_BANDERAS,
        "https://countriesnow.space/api/v0.1" + RUTA_CAPITALES,
      ].sort(),
    );
    pendientes.forEach((responder) => responder());
    await expect(primera).resolves.toMatchObject({ tipo: "encontrado" });

    await expect(buscarFicha("Chile")).resolves.toMatchObject({
      tipo: "encontrado",
      pais: { nombre: "Chile", capital: "Santiago" },
    });
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });

  it("no pasa la signal de la búsqueda a las descargas", async () => {
    const fetchFalso = simularFetch();
    vi.stubGlobal("fetch", fetchFalso);
    const controlador = new AbortController();

    await buscarFicha("Peru", { signal: controlador.signal });
    for (const [, init] of fetchFalso.mock.calls) {
      expect(init?.signal).not.toBe(controlador.signal);
    }
  });

  it("devuelve cancelada si la signal se aborta mientras espera las listas", async () => {
    vi.stubGlobal(
      "fetch",
      simularFetch({
        [RUTA_CAPITALES]: () => new Promise<Response>(() => {}),
        [RUTA_BANDERAS]: sobre(BANDERAS),
      }),
    );
    const controlador = new AbortController();

    const resultado = buscarFicha("Peru", { signal: controlador.signal });
    controlador.abort();
    await expect(resultado).resolves.toEqual({ tipo: "cancelada" });
  });
});
