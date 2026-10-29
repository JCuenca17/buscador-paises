import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { obtenerCiudades, reiniciarCacheCiudades } from "./ciudades.service";

const peru = { iso2: "PE", iso3: "PER", country: "Peru", cities: ["Lima", "Áncash", "Cusco"] };
const chile = { iso2: "CL", iso3: "CHL", country: "Chile", cities: ["Santiago"] };
const responder = (data: unknown) => new Response(JSON.stringify({ error: false, data }));

beforeEach(() => reiniciarCacheCiudades());
afterEach(() => vi.useRealTimers());

describe("catálogo de ciudades", () => {
  it("usa /countries por el cliente compartido, cruza por ISO3 y ordena sin mutar", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(responder([peru, chile]));
    vi.stubGlobal("fetch", fetchFalso);
    expect(await obtenerCiudades(" per ")).toEqual({ tipo: "disponibles", ciudades: ["Áncash", "Cusco", "Lima"] });
    expect(fetchFalso.mock.calls[0][0]).toBe("https://countriesnow.space/api/v0.1/countries");
    expect(peru.cities).toEqual(["Lima", "Áncash", "Cusco"]);
    expect(await obtenerCiudades("CHL")).toEqual({ tipo: "disponibles", ciudades: ["Santiago"] });
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it("reutiliza una descarga simultánea aunque un consumidor se cancele", async () => {
    let resolver!: (r: Response) => void;
    const fetchFalso = vi.fn(() => new Promise<Response>((r) => (resolver = r)));
    vi.stubGlobal("fetch", fetchFalso);
    const controlador = new AbortController();
    const a = obtenerCiudades("PER", controlador.signal);
    const b = obtenerCiudades("CHL");
    controlador.abort();
    await expect(a).resolves.toEqual({ tipo: "cancelada" });
    resolver(responder([peru, chile]));
    await expect(b).resolves.toEqual({ tipo: "disponibles", ciudades: ["Santiago"] });
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const signalFetch = (fetchFalso.mock.calls as unknown as [string, RequestInit][])[0][1].signal;
    expect(signalFetch?.aborted).toBe(false);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await expect(obtenerCiudades("PER")).resolves.toMatchObject({ tipo: "disponibles" });
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it("no descarga si la señal ya estaba cancelada y retira listeners tras terminar", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(responder([peru]));
    vi.stubGlobal("fetch", fetchFalso);
    const cancelado = new AbortController();
    cancelado.abort();
    await expect(obtenerCiudades("PER", cancelado.signal)).resolves.toEqual({ tipo: "cancelada" });
    expect(fetchFalso).not.toHaveBeenCalled();
    const controlador = new AbortController();
    const retirar = vi.spyOn(controlador.signal, "removeEventListener");
    await obtenerCiudades("PER", controlador.signal);
    expect(retirar).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("devuelve vacío para país ausente o cities:[] y conserva duplicados", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(responder([peru, { ...chile, cities: [] }])));
    await expect(obtenerCiudades("CHL")).resolves.toEqual({ tipo: "disponibles", ciudades: [] });
    await expect(obtenerCiudades("ESP")).resolves.toEqual({ tipo: "disponibles", ciudades: [] });
    reiniciarCacheCiudades();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(responder([{ ...peru, cities: [" Lima ", "Lima"] }])));
    await expect(obtenerCiudades("PER")).resolves.toEqual({ tipo: "disponibles", ciudades: ["Lima", "Lima"] });
  });

  it("ignora basura ajena y conserva la primera fila con el mismo ISO3", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(responder([
      null, 42, { iso3: "CHL", cities: null }, peru, { ...peru, cities: ["Otra"] },
    ])));
    await expect(obtenerCiudades("PER")).resolves.toMatchObject({ tipo: "disponibles", ciudades: ["Áncash", "Cusco", "Lima"] });
  });

  it.each([
    { ...peru, cities: null }, { ...peru, cities: [1] }, { ...peru, cities: [" "] },
    { ...peru, country: "" }, { ...peru, iso2: 12 }, { ...peru, iso2: "P" },
  ])("rechaza fila consultada inválida y permite reintento (%j)", async (fila) => {
    const fetchFalso = vi.fn().mockResolvedValueOnce(responder([fila, chile])).mockResolvedValueOnce(responder([peru]));
    vi.stubGlobal("fetch", fetchFalso);
    await expect(obtenerCiudades("PER")).resolves.toEqual({ tipo: "respuesta-invalida" });
    await expect(obtenerCiudades("PER")).resolves.toMatchObject({ tipo: "disponibles" });
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });

  it.each([{}, [], [null, 7, { iso3: "" }]])("rechaza catálogo global inválido (%j)", async (data) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(responder(data)));
    await expect(obtenerCiudades("PER")).resolves.toEqual({ tipo: "respuesta-invalida" });
  });

  it("rechaza código consultado inválido sin descargar", async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    await expect(obtenerCiudades("??")).resolves.toEqual({ tipo: "respuesta-invalida" });
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});

describe("fallos recuperables", () => {
  it("clasifica sin conexión y vuelve a descargar al reintentar", async () => {
    const fetchFalso = vi.fn().mockRejectedValueOnce(new TypeError("red")).mockResolvedValueOnce(responder([peru]));
    vi.stubGlobal("fetch", fetchFalso);
    await expect(obtenerCiudades("PER")).resolves.toEqual({ tipo: "sin-conexion" });
    await expect(obtenerCiudades("PER")).resolves.toMatchObject({ tipo: "disponibles" });
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });

  it("respeta navigator offline con caché fría", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    await expect(obtenerCiudades("PER")).resolves.toEqual({ tipo: "sin-conexion" });
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("agota el tiempo a los 10 segundos usando el cliente real", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_r, rechazar) => {
      init.signal?.addEventListener("abort", () => rechazar(new DOMException("abort", "AbortError")));
    })));
    const resultado = obtenerCiudades("PER");
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(resultado).resolves.toEqual({ tipo: "tiempo-agotado" });
  });

  it.each([
    () => new Response("error", { status: 500 }),
    () => new Response("no JSON"),
    () => new Response(JSON.stringify({ error: true, data: [peru] })),
    () => new Response(JSON.stringify({ msg: "sin datos" })),
  ])("clasifica HTTP, JSON o sobre inválidos", async (respuesta) => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(respuesta));
    await expect(obtenerCiudades("PER")).resolves.toEqual({ tipo: "respuesta-invalida" });
  });

  it("un fallo viejo no borra la promesa nueva tras reiniciar la caché", async () => {
    let rechazar!: (e: Error) => void;
    const fetchFalso = vi.fn().mockImplementationOnce(() => new Promise<Response>((_r, rechazo) => (rechazar = rechazo)))
      .mockResolvedValueOnce(responder([peru, chile]));
    vi.stubGlobal("fetch", fetchFalso);
    const vieja = obtenerCiudades("PER");
    reiniciarCacheCiudades();
    await obtenerCiudades("PER");
    rechazar(new Error("red vieja"));
    await vieja;
    await obtenerCiudades("CHL");
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });
});
