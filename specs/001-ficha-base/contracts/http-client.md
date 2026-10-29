# Contrato: cliente HTTP compartido (`src/api`)

Lo usan todas las funcionalidades. Es el **único** módulo que llama a `fetch` (Principio III).
Cambiarlo afecta a todo el equipo: cualquier modificación posterior requiere justificación en el
plan de quien lo cambie y aprobación del responsable de `001-ficha-base`.

## Firma

```ts
type TipoErrorApi = "sin-conexion" | "tiempo-agotado" | "respuesta-invalida" | "cancelada";

class ErrorApi extends Error {
  readonly tipo: TipoErrorApi;
}

interface OpcionesObtener<T> {
  /** Comprueba la forma de `data`; si devuelve false → "respuesta-invalida". */
  validar: (data: unknown) => data is T;
  /** Señal externa para cancelar (búsqueda reemplazada). */
  signal?: AbortSignal;
  /** Por defecto 10 000 ms (Principio II). Solo se cambia en pruebas. */
  limiteMs?: number;
}

const URL_BASE = "https://countriesnow.space/api/v0.1";

function obtenerJson<T>(ruta: string, opciones: OpcionesObtener<T>): Promise<T>;
```

`ruta` es relativa a `URL_BASE` (por ejemplo, `"/countries/capital"`). La función resuelve con
`sobre.data` ya validado o rechaza **siempre** con `ErrorApi`.

El validador decide cuánto se revisa en el cliente. La ficha base pasa `esArreglo` y filtra los
elementos en su servicio, así que un elemento mal formado no invalida toda la respuesta
([ficha-service.md](./ficha-service.md)).

## Comportamiento

| Situación | Resultado |
|-----------|-----------|
| `navigator.onLine === false` | rechaza `sin-conexion` sin llamar a `fetch` |
| `fetch` rechaza (error de red) | `sin-conexion` |
| no hay respuesta en `limiteMs` | aborta la solicitud y rechaza `tiempo-agotado` |
| `signal` externa abortada | aborta la solicitud y rechaza `cancelada` |
| `response.ok === false` | `respuesta-invalida` |
| cuerpo no es JSON | `respuesta-invalida` |
| JSON sin objeto, sin `data` o con `error === true` | `respuesta-invalida` |
| `validar(data) === false` | `respuesta-invalida` |
| todo correcto | resuelve con `data` |

El temporizador se limpia siempre, también cuando la solicitud termina antes.

## Pruebas exigidas (`src/api/http.test.ts`)

`fetch` simulado con `vi.stubGlobal`; temporizadores simulados para el límite. Un caso por fila
de la tabla, más: el temporizador no queda pendiente tras una respuesta correcta, y una señal ya
abortada rechaza `cancelada` sin llamar a `fetch`.
