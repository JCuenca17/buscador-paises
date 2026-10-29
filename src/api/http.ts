/**
 * Cliente HTTP compartido. Es el único módulo del proyecto que llama a fetch (Principio III).
 * Contrato: specs/001-ficha-base/contracts/http-client.md
 */

export const URL_BASE = "https://countriesnow.space/api/v0.1";

export type TipoErrorApi = "sin-conexion" | "tiempo-agotado" | "respuesta-invalida" | "cancelada";

export class ErrorApi extends Error {
  readonly tipo: TipoErrorApi;

  constructor(tipo: TipoErrorApi) {
    super(`Error de la API: ${tipo}`);
    this.name = "ErrorApi";
    this.tipo = tipo;
  }
}

export interface OpcionesObtener<T> {
  /** Comprueba la forma de `data`; si devuelve false → "respuesta-invalida". */
  validar: (data: unknown) => data is T;
  /** Señal externa para cancelar (búsqueda reemplazada). */
  signal?: AbortSignal;
  /** Por defecto 10 000 ms (Principio II). Solo se cambia en pruebas. */
  limiteMs?: number;
}

/** Pide `URL_BASE + ruta` y resuelve con `sobre.data` validado; rechaza siempre con ErrorApi. */
export async function obtenerJson<T>(ruta: string, opciones: OpcionesObtener<T>): Promise<T> {
  const { validar, signal, limiteMs = 10_000 } = opciones;

  if (signal?.aborted) throw new ErrorApi("cancelada");
  if (navigator.onLine === false) throw new ErrorApi("sin-conexion");

  const controlador = new AbortController();
  let motivo: "tiempo-agotado" | "cancelada" | null = null;
  const abortar = (tipo: "tiempo-agotado" | "cancelada") => {
    motivo ??= tipo;
    controlador.abort();
  };
  const alCancelar = () => abortar("cancelada");
  const temporizador = setTimeout(() => abortar("tiempo-agotado"), limiteMs);
  signal?.addEventListener("abort", alCancelar);

  try {
    let respuesta: Response;
    try {
      respuesta = await fetch(URL_BASE + ruta, { signal: controlador.signal });
    } catch {
      throw new ErrorApi(motivo ?? "sin-conexion");
    }

    if (!respuesta.ok) throw new ErrorApi("respuesta-invalida");

    let sobre: unknown;
    try {
      sobre = await respuesta.json();
    } catch {
      throw new ErrorApi(motivo ?? "respuesta-invalida");
    }

    if (
      typeof sobre !== "object" ||
      sobre === null ||
      !("data" in sobre) ||
      ("error" in sobre && sobre.error === true)
    ) {
      throw new ErrorApi("respuesta-invalida");
    }
    if (!validar(sobre.data)) throw new ErrorApi("respuesta-invalida");
    return sobre.data;
  } finally {
    clearTimeout(temporizador);
    signal?.removeEventListener("abort", alCancelar);
  }
}
