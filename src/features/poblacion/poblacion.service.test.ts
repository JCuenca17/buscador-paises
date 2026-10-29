import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { obtenerPoblacion, reiniciarCachePoblacion } from "./poblacion.service";

const peru = {
  country: "Peru", code: "PER", iso3: "PER",
  populationCounts: [{ year: 2016, value: 31_000_000 }, { year: 2018, value: 31_800_000 }, { year: 2017, value: 31_400_000 }],
};
const chile = { country: "Chile", code: "CHL", iso3: "CHL", populationCounts: [{ year: 2018, value: 18_000_000 }] };
const vacio = { country: "Nada", code: "NAD", iso3: "NAD", populationCounts: [] };
const responder = (data: unknown) => new Response(JSON.stringify({ error: false, data }));

beforeEach(() => reiniciarCachePoblacion());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("catálogo de población", () => {
  it("usa /countries/population por el cliente compartido y elige el año más reciente", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(responder([peru, chile]));
    vi.stubGlobal("fetch", fetchFalso);
    expect(await obtenerPoblacion(" per ")).toEqual({ tipo: "disponible", cifra: 31_800_000, anio: 2018 });
    expect(fetchFalso.mock.calls[0][0]).toBe("https://countriesnow.space/api/v0.1/countries/population");
    expect(await obtenerPoblacion("CHL")).toEqual({ tipo: "disponible", cifra: 18_000_000, anio: 2018 });
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it("devuelve sin-datos para país ausente o con populationCounts vacía", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(responder([peru, vacio])));
    await expect(obtenerPoblacion("ESP")).resolves.toEqual({ tipo: "sin-datos" });
    await expect(obtenerPoblacion("NAD")).resolves.toEqual({ tipo: "sin-datos" });
  });

  it("acepta una cifra de 0 como dato válido", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(responder([{ iso3: "ATA", populationCounts: [{ year: 2018, value: 0 }] }])));
    await expect(obtenerPoblacion("ATA")).resolves.toEqual({ tipo: "disponible", cifra: 0, anio: 2018 });
  });

  it("ignora filas ajenas defectuosas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(responder([null, 42, { iso3: "X" }, { iso3: "CHL", populationCounts: "mal" }, peru])));
    await expect(obtenerPoblacion("PER")).resolves.toMatchObject({ tipo: "disponible", anio: 2018 });
  });

  it.each([
    { ...peru, populationCounts: null },
    { ...peru, populationCounts: [{ year: 2018 }] },
    { ...peru, populationCounts: [{ year: "2018", value: 1 }] },
    { ...peru, populationCounts: [{ year: 2018, value: -1 }] },
    { ...peru, populationCounts: [{ year: 2018, value: 1.5 }] },
    { ...peru, populationCounts: [null] },
  ])("rechaza registros inválidos del país consultado y permite reintento (%j)", async (fila) => {
    const fetchFalso = vi.fn().mockResolvedValueOnce(responder([fila])).mockResolvedValueOnce(responder([peru]));
    vi.stubGlobal("fetch", fetchFalso);
    await expect(obtenerPoblacion("PER")).resolves.toEqual({ tipo: "respuesta-invalida" });
    await expect(obtenerPoblacion("PER")).resolves.toMatchObject({ tipo: "disponible" });
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });

  it("rechaza catálogo global inválido y código consultado inválido sin descargar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(responder({})));
    await expect(obtenerPoblacion("PER")).resolves.toEqual({ tipo: "respuesta-invalida" });
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    await expect(obtenerPoblacion("??")).resolves.toEqual({ tipo: "respuesta-invalida" });
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("no descarga si la señal ya estaba cancelada", async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    const cancelado = new AbortController();
    cancelado.abort();
    await expect(obtenerPoblacion("PER", cancelado.signal)).resolves.toEqual({ tipo: "cancelada" });
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("cancelar una consulta no cancela la descarga que usa otra", async () => {
    let resolver!: (r: Response) => void;
    const fetchFalso = vi.fn(() => new Promise<Response>((r) => (resolver = r)));
    vi.stubGlobal("fetch", fetchFalso);
    const controlador = new AbortController();
    const a = obtenerPoblacion("PER", controlador.signal);
    const b = obtenerPoblacion("CHL");
    controlador.abort();
    await expect(a).resolves.toEqual({ tipo: "cancelada" });
    resolver(responder([peru, chile]));
    await expect(b).resolves.toMatchObject({ tipo: "disponible", cifra: 18_000_000 });
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });
});

describe("fallos recuperables", () => {
  it("clasifica sin conexión y reintenta con nueva descarga", async () => {
    const fetchFalso = vi.fn().mockRejectedValueOnce(new TypeError("red")).mockResolvedValueOnce(responder([peru]));
    vi.stubGlobal("fetch", fetchFalso);
    await expect(obtenerPoblacion("PER")).resolves.toEqual({ tipo: "sin-conexion" });
    await expect(obtenerPoblacion("PER")).resolves.toMatchObject({ tipo: "disponible" });
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });

  it("respeta navigator offline con caché fría", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    await expect(obtenerPoblacion("PER")).resolves.toEqual({ tipo: "sin-conexion" });
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("agota el tiempo a los 10 segundos", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_r, rechazar) => {
      init.signal?.addEventListener("abort", () => rechazar(new DOMException("abort", "AbortError")));
    })));
    const resultado = obtenerPoblacion("PER");
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
    await expect(obtenerPoblacion("PER")).resolves.toEqual({ tipo: "respuesta-invalida" });
  });
});
