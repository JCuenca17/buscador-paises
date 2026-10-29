import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TipoErrorApi } from "../../api/http";
import {
  BANDERA_PERU,
  BANDERAS,
  CAPITALES,
  RUTA_BANDERAS,
  RUTA_CAPITALES,
  simularFetch,
  sobre,
} from "./datos-prueba";
import { buscarFicha, obtenerCapitalesCompartidas, reiniciarCache } from "./ficha.service";

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

  it.each(["   ", "\t", " \n "])(
    "devuelve capital null si la capital solo tiene espacios (%j)",
    async (capital) => {
      vi.stubGlobal(
        "fetch",
        simularFetch({
          [RUTA_CAPITALES]: sobre(CAPITALES.map((c) => (c.iso2 === "PE" ? { ...c, capital } : c))),
          [RUTA_BANDERAS]: sobre(BANDERAS),
        }),
      );

      const resultado = await buscarFicha("Peru");
      expect(resultado).toMatchObject({ tipo: "encontrado", pais: { nombre: "Peru", capital: null } });
    },
  );

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

  it("comparte la promesa de capitales con búsqueda inteligente sin duplicar la descarga", async () => {
    const fetchFalso = simularFetch();
    vi.stubGlobal("fetch", fetchFalso);

    const primeraLectura = obtenerCapitalesCompartidas();
    const segundaLectura = obtenerCapitalesCompartidas();
    expect(segundaLectura).toBe(primeraLectura);

    const ficha = buscarFicha("Peru");
    await expect(primeraLectura).resolves.toEqual(CAPITALES);
    await expect(ficha).resolves.toMatchObject({ tipo: "encontrado", pais: { nombre: "Peru" } });
    expect(llamadasA(fetchFalso, RUTA_CAPITALES)).toBe(1);
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

describe("buscarFicha: país inexistente (historia 2)", () => {
  beforeEach(() => {
    reiniciarCache();
    vi.stubGlobal("fetch", simularFetch());
  });

  it.each([
    ["un nombre que no existe", "Atlantida"],
    ["un nombre en español (solo nombres en inglés, FR-005)", "España"],
    ["un nombre sin su tilde (no se quitan tildes, FR-005)", "Reunion"],
  ])("devuelve no-encontrado para %s", async (_caso, texto) => {
    await expect(buscarFicha(texto)).resolves.toEqual({ tipo: "no-encontrado" });
  });

  it("encuentra Réunion escrito con su tilde", async () => {
    await expect(buscarFicha("réunion")).resolves.toMatchObject({
      tipo: "encontrado",
      pais: { nombre: "Réunion", iso2: "RE" },
    });
  });
});

/** Respuesta que la prueba resuelve cuando quiere. */
function respuestaDiferida() {
  let resolver!: (r: Response) => void;
  const promesa = new Promise<Response>((res) => (resolver = res));
  return { pedir: () => promesa, responder: (cuerpo: unknown) => resolver(respuestaJson(cuerpo)) };
}

const noJson = () => new Response("<html>error</html>", { status: 200 });
const errorDeRed = () => Promise.reject(new TypeError("Failed to fetch"));

/** Cuántas veces se pidió cada ruta. */
function llamadasA(fetchFalso: ReturnType<typeof simularFetch>, ruta: string): number {
  return fetchFalso.mock.calls.filter(([url]) => url.endsWith(ruta)).length;
}

describe("buscarFicha: traducción de errores (historia 3)", () => {
  afterEach(() => {
    vi.doUnmock("../../api/http");
    vi.resetModules();
  });

  /** Importa un ficha.service nuevo cuyo obtenerJson rechaza con `motivo`. */
  async function servicioQueFallaCon(motivo: (real: typeof import("../../api/http")) => unknown) {
    vi.resetModules();
    vi.doMock("../../api/http", async (importOriginal) => {
      const real = await importOriginal<typeof import("../../api/http")>();
      return { ...real, obtenerJson: vi.fn(() => Promise.reject(motivo(real))) };
    });
    return import("./ficha.service");
  }

  it.each<TipoErrorApi>(["sin-conexion", "tiempo-agotado", "respuesta-invalida", "cancelada"])(
    "traduce ErrorApi %s al resultado del mismo tipo, sin rechazar",
    async (tipo) => {
      const servicio = await servicioQueFallaCon((real) => new real.ErrorApi(tipo));
      await expect(servicio.buscarFicha("Peru")).resolves.toEqual({ tipo });
    },
  );

  it("traduce cualquier otra excepción a respuesta-invalida", async () => {
    const servicio = await servicioQueFallaCon(() => new Error("inesperado"));
    await expect(servicio.buscarFicha("Peru")).resolves.toEqual({ tipo: "respuesta-invalida" });
  });
});

describe("buscarFicha: errores con fetch simulado (historia 3)", () => {
  beforeEach(() => {
    reiniciarCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve sin-conexion si fetch falla por la red", async () => {
    vi.stubGlobal(
      "fetch",
      simularFetch({ [RUTA_CAPITALES]: errorDeRed, [RUTA_BANDERAS]: sobre(BANDERAS) }),
    );
    await expect(buscarFicha("Peru")).resolves.toEqual({ tipo: "sin-conexion" });
  });

  it("devuelve tiempo-agotado si una lista no llega en 10 s", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      simularFetch({
        [RUTA_CAPITALES]: sobre(CAPITALES),
        [RUTA_BANDERAS]: (init?: RequestInit) =>
          new Promise<Response>((_res, rechazar) =>
            init?.signal?.addEventListener("abort", () =>
              rechazar(new DOMException("Abortado", "AbortError")),
            ),
          ),
      }),
    );

    const resultado = buscarFicha("Peru");
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(resultado).resolves.toEqual({ tipo: "tiempo-agotado" });
  });

  it("si fallan ambas listas devuelve el error de la de capitales, aunque llegue después", async () => {
    vi.stubGlobal(
      "fetch",
      simularFetch({
        [RUTA_CAPITALES]: () =>
          new Promise<Response>((_res, rechazar) =>
            setTimeout(() => rechazar(new TypeError("Failed to fetch")), 20),
          ),
        [RUTA_BANDERAS]: noJson,
      }),
    );
    await expect(buscarFicha("Peru")).resolves.toEqual({ tipo: "sin-conexion" });
  });

  it("si falla la lista de banderas, la siguiente búsqueda solo vuelve a pedir banderas", async () => {
    let fallarBanderas = true;
    const fetchFalso = simularFetch({
      [RUTA_CAPITALES]: sobre(CAPITALES),
      [RUTA_BANDERAS]: () =>
        fallarBanderas ? new Response("error", { status: 500 }) : respuestaJson(sobre(BANDERAS)),
    });
    vi.stubGlobal("fetch", fetchFalso);

    await expect(buscarFicha("Peru")).resolves.toEqual({ tipo: "respuesta-invalida" });
    fallarBanderas = false;
    await expect(buscarFicha("Peru")).resolves.toMatchObject({ tipo: "encontrado" });

    expect(llamadasA(fetchFalso, RUTA_CAPITALES)).toBe(1);
    expect(llamadasA(fetchFalso, RUTA_BANDERAS)).toBe(2);
  });

  it("una búsqueda cancelada no borra de la caché la descarga compartida en curso", async () => {
    const capitales = respuestaDiferida();
    const fetchFalso = simularFetch({
      [RUTA_CAPITALES]: capitales.pedir,
      [RUTA_BANDERAS]: sobre(BANDERAS),
    });
    vi.stubGlobal("fetch", fetchFalso);
    const controlador = new AbortController();

    const cancelada = buscarFicha("Peru", { signal: controlador.signal });
    controlador.abort();
    await expect(cancelada).resolves.toEqual({ tipo: "cancelada" });

    capitales.responder(sobre(CAPITALES));
    await expect(buscarFicha("Chile")).resolves.toMatchObject({ tipo: "encontrado" });
    expect(llamadasA(fetchFalso, RUTA_CAPITALES)).toBe(1);
    expect(llamadasA(fetchFalso, RUTA_BANDERAS)).toBe(1);
  });

  it("al cancelar A, B recibe la ficha de la misma descarga y fetch no recibe la signal de A", async () => {
    const capitales = respuestaDiferida();
    const banderas = respuestaDiferida();
    const fetchFalso = simularFetch({
      [RUTA_CAPITALES]: capitales.pedir,
      [RUTA_BANDERAS]: banderas.pedir,
    });
    vi.stubGlobal("fetch", fetchFalso);
    const controladorA = new AbortController();

    const a = buscarFicha("Peru", { signal: controladorA.signal });
    const b = buscarFicha("Chile", { signal: new AbortController().signal });
    controladorA.abort();
    await expect(a).resolves.toEqual({ tipo: "cancelada" });

    capitales.responder(sobre(CAPITALES));
    banderas.responder(sobre(BANDERAS));
    await expect(b).resolves.toMatchObject({
      tipo: "encontrado",
      pais: { nombre: "Chile", capital: "Santiago" },
    });

    expect(llamadasA(fetchFalso, RUTA_CAPITALES)).toBe(1);
    expect(llamadasA(fetchFalso, RUTA_BANDERAS)).toBe(1);
    for (const [, init] of fetchFalso.mock.calls) {
      expect(init?.signal).not.toBe(controladorA.signal);
      expect(init?.signal?.aborted).toBe(false);
    }
  });
});

describe("buscarFicha: respuesta inválida completa (historia 3)", () => {
  beforeEach(() => {
    reiniciarCache();
  });

  it.each([
    ["el cuerpo no es JSON", noJson],
    ["error es true", { error: true, msg: "falla", data: [] }],
    ["data no es un arreglo", { error: false, msg: "ok", data: { name: "Peru" } }],
  ])("devuelve respuesta-invalida si %s", async (_caso, capitales) => {
    vi.stubGlobal(
      "fetch",
      simularFetch({ [RUTA_CAPITALES]: capitales, [RUTA_BANDERAS]: sobre(BANDERAS) }),
    );
    await expect(buscarFicha("Peru")).resolves.toEqual({ tipo: "respuesta-invalida" });
  });

  it.each([
    ["capitales", RUTA_CAPITALES],
    ["banderas", RUTA_BANDERAS],
  ])(
    "si la lista de %s queda vacía tras filtrar, devuelve respuesta-invalida y borra ambas de la caché",
    async (_lista, rutaVacia) => {
      const fetchFalso = simularFetch({
        [RUTA_CAPITALES]: sobre(CAPITALES),
        [RUTA_BANDERAS]: sobre(BANDERAS),
        [rutaVacia]: sobre([{ name: "", iso2: "" }, null, { iso2: "PE" }]),
      });
      vi.stubGlobal("fetch", fetchFalso);

      await expect(buscarFicha("Peru")).resolves.toEqual({ tipo: "respuesta-invalida" });
      await expect(buscarFicha("Peru")).resolves.toEqual({ tipo: "respuesta-invalida" });

      expect(llamadasA(fetchFalso, RUTA_CAPITALES)).toBe(2);
      expect(llamadasA(fetchFalso, RUTA_BANDERAS)).toBe(2);
    },
  );
});

describe("buscarFicha: validación de elementos (historia 3)", () => {
  beforeEach(() => {
    reiniciarCache();
  });

  it("ignora los elementos sin name o iso2 válidos y sigue encontrando Peru", async () => {
    const basura = [
      null,
      42,
      "Peru",
      [],
      { name: "", iso2: "XX", capital: "X", iso3: "XXX" },
      { name: "   ", iso2: "XY", capital: "X", iso3: "XXY" },
      { name: "Sin Iso2", capital: "X", iso3: "XXZ" },
      { name: "Iso2 numérico", iso2: 7, capital: "X", iso3: "XXW" },
      { iso2: "PE", capital: "Otra", iso3: "PER" },
    ];
    vi.stubGlobal(
      "fetch",
      simularFetch({
        [RUTA_CAPITALES]: sobre([...basura, ...CAPITALES]),
        [RUTA_BANDERAS]: sobre([...basura, ...BANDERAS]),
      }),
    );

    await expect(buscarFicha("Peru")).resolves.toEqual({
      tipo: "encontrado",
      pais: { nombre: "Peru", capital: "Lima", bandera: BANDERA_PERU, iso2: "PE", iso3: "PER" },
    });
    await expect(buscarFicha("Sin Iso2")).resolves.toEqual({ tipo: "no-encontrado" });
  });

  /** Capitales con el elemento de Peru modificado. */
  const capitalesConPeru = (cambios: Record<string, unknown>, quitar?: string) =>
    CAPITALES.map((c) => {
      if (c.iso2 !== "PE") return c;
      const copia: Record<string, unknown> = { ...c, ...cambios };
      if (quitar) delete copia[quitar];
      return copia;
    });

  it.each([
    ["capital no textual", sobre(capitalesConPeru({ capital: 42 })), sobre(BANDERAS)],
    ["capital null", sobre(capitalesConPeru({ capital: null })), sobre(BANDERAS)],
    ["iso3 ausente", sobre(capitalesConPeru({}, "iso3")), sobre(BANDERAS)],
    ["iso3 vacío", sobre(capitalesConPeru({ iso3: "" })), sobre(BANDERAS)],
    ["iso3 no textual", sobre(capitalesConPeru({ iso3: 604 })), sobre(BANDERAS)],
    ["flag no textual", sobre(CAPITALES), sobre(banderasConPeru(42))],
    ["flag null", sobre(CAPITALES), sobre(banderasConPeru(null))],
  ])(
    "con %s en Peru devuelve respuesta-invalida, mientras Chile se encuentra",
    async (_caso, capitales, banderas) => {
      vi.stubGlobal(
        "fetch",
        simularFetch({ [RUTA_CAPITALES]: capitales, [RUTA_BANDERAS]: banderas }),
      );

      await expect(buscarFicha("Peru")).resolves.toEqual({ tipo: "respuesta-invalida" });
      await expect(buscarFicha("Chile")).resolves.toMatchObject({
        tipo: "encontrado",
        pais: { nombre: "Chile", capital: "Santiago", iso2: "CL", iso3: "CHL" },
      });
    },
  );
});

describe("buscarFicha: orden de espera de las listas", () => {
  beforeEach(() => {
    reiniciarCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("si capitales falla enseguida, devuelve su error sin esperar a banderas", async () => {
    vi.useFakeTimers();
    const fetchFalso = simularFetch({
      [RUTA_CAPITALES]: errorDeRed,
      // Banderas no responde: solo terminaría por el tope de 10 s.
      [RUTA_BANDERAS]: (init?: RequestInit) =>
        new Promise<Response>((_res, rechazar) =>
          init?.signal?.addEventListener("abort", () =>
            rechazar(new DOMException("Abortado", "AbortError")),
          ),
        ),
    });
    vi.stubGlobal("fetch", fetchFalso);

    let resultado: unknown;
    void buscarFicha("Peru").then((r) => (resultado = r));
    await vi.advanceTimersByTimeAsync(0);

    expect(resultado).toEqual({ tipo: "sin-conexion" });
    // Las dos listas se pidieron en paralelo y banderas sigue en curso.
    expect(llamadasA(fetchFalso, RUTA_BANDERAS)).toBe(1);
    expect(vi.getTimerCount()).toBe(1);
  });
});
