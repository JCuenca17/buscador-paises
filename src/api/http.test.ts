import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorApi, URL_BASE, obtenerJson, type TipoErrorApi } from "./http";

const esArreglo = (data: unknown): data is unknown[] => Array.isArray(data);

function respuestaJson(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  });
}

/** fetch falso que respeta init.signal: rechaza con AbortError al abortar. */
function fetchQueEspera(): ReturnType<typeof vi.fn> {
  return vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolver, rechazar) => {
        const signal = init?.signal;
        const abortar = () => rechazar(new DOMException("Abortado", "AbortError"));
        if (signal?.aborted) abortar();
        signal?.addEventListener("abort", abortar);
      }),
  );
}

async function esperarErrorApi(promesa: Promise<unknown>, tipo: TipoErrorApi): Promise<void> {
  const error = await promesa.then(
    () => {
      throw new Error("se esperaba un rechazo");
    },
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ErrorApi);
  expect((error as ErrorApi).tipo).toBe(tipo);
}

describe("obtenerJson", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rechaza sin-conexion sin llamar a fetch si navigator.onLine es false", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);

    await esperarErrorApi(obtenerJson("/x", { validar: esArreglo }), "sin-conexion");
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("rechaza sin-conexion si fetch rechaza con TypeError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await esperarErrorApi(obtenerJson("/x", { validar: esArreglo }), "sin-conexion");
  });

  it("rechaza tiempo-agotado y aborta la solicitud si no hay respuesta en 10 000 ms", async () => {
    const fetchFalso = fetchQueEspera();
    vi.stubGlobal("fetch", fetchFalso);

    const promesa = obtenerJson("/x", { validar: esArreglo });
    const verificacion = esperarErrorApi(promesa, "tiempo-agotado");
    await vi.advanceTimersByTimeAsync(10_000);
    await verificacion;

    const init = fetchFalso.mock.calls[0]![1] as RequestInit;
    expect(init.signal!.aborted).toBe(true);
  });

  it("no rechaza antes de los 10 000 ms", async () => {
    vi.stubGlobal("fetch", fetchQueEspera());
    let terminada = false;
    obtenerJson("/x", { validar: esArreglo }).catch(() => {
      terminada = true;
    });

    await vi.advanceTimersByTimeAsync(9_999);
    expect(terminada).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(terminada).toBe(true);
  });

  it("rechaza cancelada si la signal externa se aborta durante la espera", async () => {
    const fetchFalso = fetchQueEspera();
    vi.stubGlobal("fetch", fetchFalso);
    const controlador = new AbortController();

    const promesa = obtenerJson("/x", { validar: esArreglo, signal: controlador.signal });
    const verificacion = esperarErrorApi(promesa, "cancelada");
    controlador.abort();
    await verificacion;

    const init = fetchFalso.mock.calls[0]![1] as RequestInit;
    expect(init.signal!.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rechaza cancelada sin llamar a fetch si la signal ya está abortada", async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    const controlador = new AbortController();
    controlador.abort();

    await esperarErrorApi(
      obtenerJson("/x", { validar: esArreglo, signal: controlador.signal }),
      "cancelada",
    );
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("rechaza respuesta-invalida si response.ok es false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respuestaJson({ error: false, data: [] }, 500)),
    );

    await esperarErrorApi(obtenerJson("/x", { validar: esArreglo }), "respuesta-invalida");
  });

  it("rechaza respuesta-invalida si el cuerpo no es JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>no</html>")));

    await esperarErrorApi(obtenerJson("/x", { validar: esArreglo }), "respuesta-invalida");
  });

  it.each([
    ["no es objeto", [1, 2, 3]],
    ["es null", null],
    ["no tiene data", { error: false, msg: "ok" }],
    ["tiene error: true", { error: true, msg: "falla", data: [] }],
  ])("rechaza respuesta-invalida si el JSON %s", async (_caso, cuerpo) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuestaJson(cuerpo)));

    await esperarErrorApi(obtenerJson("/x", { validar: esArreglo }), "respuesta-invalida");
  });

  it("rechaza respuesta-invalida si validar devuelve false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respuestaJson({ error: false, msg: "ok", data: "texto" })),
    );

    await esperarErrorApi(obtenerJson("/x", { validar: esArreglo }), "respuesta-invalida");
  });

  it("resuelve con data, llama a URL_BASE + ruta y no deja temporizadores pendientes", async () => {
    const datos = [{ name: "Peru" }];
    const fetchFalso = vi
      .fn()
      .mockResolvedValue(respuestaJson({ error: false, msg: "ok", data: datos }));
    vi.stubGlobal("fetch", fetchFalso);

    await expect(obtenerJson("/countries/capital", { validar: esArreglo })).resolves.toEqual(
      datos,
    );
    expect(fetchFalso).toHaveBeenCalledWith(
      URL_BASE + "/countries/capital",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it("respeta limiteMs cuando se indica", async () => {
    vi.stubGlobal("fetch", fetchQueEspera());

    const verificacion = esperarErrorApi(
      obtenerJson("/x", { validar: esArreglo, limiteMs: 50 }),
      "tiempo-agotado",
    );
    await vi.advanceTimersByTimeAsync(50);
    await verificacion;
  });
});
