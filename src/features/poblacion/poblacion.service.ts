import { ErrorApi, obtenerJson, type TipoErrorApi } from "../../api/http";

export type ResultadoPoblacion =
  | { tipo: "disponible"; cifra: number; anio: number }
  | { tipo: "sin-datos" }
  | { tipo: TipoErrorApi };

export interface RegistroPoblacion {
  year: number;
  value: number;
}

type IndicePoblacion = ReadonlyMap<string, Record<string, unknown>>;
let catalogo: Promise<IndicePoblacion> | null = null;

function codigoIso3(valor: unknown): valor is string {
  return typeof valor === "string" && /^[a-zA-Z]{3}$/.test(valor.trim());
}

function entero(valor: unknown, minimo: number): valor is number {
  return typeof valor === "number" && Number.isSafeInteger(valor) && valor >= minimo;
}

export function validarRegistro(registro: unknown): registro is RegistroPoblacion {
  if (typeof registro !== "object" || registro === null) return false;
  const { year, value } = registro as Record<string, unknown>;
  return entero(year, 1) && entero(value, 0);
}

/** Indexa por ISO3; una fila ajena defectuosa no invalida a los demás países. */
export function crearIndicePoblacion(data: unknown[]): IndicePoblacion {
  const indice = new Map<string, Record<string, unknown>>();
  for (const fila of data) {
    if (typeof fila !== "object" || fila === null || Array.isArray(fila)) continue;
    const registro = fila as Record<string, unknown>;
    if (!codigoIso3(registro.iso3)) continue;
    const codigo = registro.iso3.trim().toUpperCase();
    if (!indice.has(codigo)) indice.set(codigo, registro);
  }
  if (indice.size === 0) throw new ErrorApi("respuesta-invalida");
  return indice;
}

function cargarCatalogo(): Promise<IndicePoblacion> {
  if (catalogo) return catalogo;
  // La descarga pertenece a la sesión: no se usa la señal de un consumidor concreto.
  const nueva = obtenerJson("/countries/population", {
    validar: (data: unknown): data is unknown[] => Array.isArray(data),
  }).then(crearIndicePoblacion).catch((error: unknown) => {
    if (catalogo === nueva) catalogo = null;
    throw error;
  });
  catalogo = nueva;
  return nueva;
}

/** Cancela solo la espera; la descarga compartida sigue su curso. */
function esperar<T>(promesa: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promesa;
  return new Promise<T>((resolver, rechazar) => {
    const alCancelar = () => {
      signal.removeEventListener("abort", alCancelar);
      rechazar(new ErrorApi("cancelada"));
    };
    signal.addEventListener("abort", alCancelar, { once: true });
    promesa.then(
      (valor) => {
        signal.removeEventListener("abort", alCancelar);
        resolver(valor);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", alCancelar);
        rechazar(error);
      },
    );
    if (signal.aborted) alCancelar();
  });
}

export async function obtenerPoblacion(iso3: string, signal?: AbortSignal): Promise<ResultadoPoblacion> {
  if (signal?.aborted) return { tipo: "cancelada" };
  if (!codigoIso3(iso3)) return { tipo: "respuesta-invalida" };
  try {
    const descarga = cargarCatalogo();
    const indice = await esperar(descarga, signal);
    if (signal?.aborted) return { tipo: "cancelada" };
    const fila = indice.get(iso3.trim().toUpperCase());
    if (!fila) return { tipo: "sin-datos" };

    const registros = fila.populationCounts;
    const invalidar = () => {
      // Permite reintentar tras datos defectuosos del país consultado.
      if (catalogo === descarga) catalogo = null;
      return { tipo: "respuesta-invalida" } as const;
    };
    if (!Array.isArray(registros)) return invalidar();
    if (registros.length === 0) return { tipo: "sin-datos" };
    if (!registros.every(validarRegistro)) return invalidar();

    const ultimo = registros.reduce((a, b) => (b.year > a.year ? b : a));
    return { tipo: "disponible", cifra: ultimo.value, anio: ultimo.year };
  } catch (error: unknown) {
    return { tipo: error instanceof ErrorApi ? error.tipo : "respuesta-invalida" };
  }
}

/** Solo para aislar pruebas: no altera una descarga que ya esté en curso. */
export function reiniciarCachePoblacion(): void {
  catalogo = null;
}
