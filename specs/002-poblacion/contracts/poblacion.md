# Contrato: servicio de población

**Módulo**: `src/features/poblacion/poblacion.service.ts`
**Fuente HTTP**: única llamada a `obtenerJson` de `src/api/http.ts` (Principio III).

## Fuente externa

```
GET {URL_BASE}/countries/population
```

Respuesta esperada:

```json
{
  "error": false,
  "msg": "...",
  "data": [
    { "country": "Peru", "code": "PER", "iso3": "PER",
      "populationCounts": [ { "year": 2018, "value": 31000000 } ] }
  ]
}
```

- `error: true` o falta `data` → `respuesta-invalida` (lo gestiona `obtenerJson`).

## API del servicio

```ts
export type ResultadoPoblacion =
  | { tipo: "disponible"; cifra: number; anio: number }
  | { tipo: "sin-datos" }
  | { tipo: "sin-conexion" | "tiempo-agotado" | "respuesta-invalida" | "cancelada" };

export function obtenerPoblacion(iso3: string, signal?: AbortSignal): Promise<ResultadoPoblacion>;

/** Solo para pruebas. */
export function reiniciarCachePoblacion(): void;
```

## Reglas

1. `iso3` inválido → `respuesta-invalida`.
2. País ausente del índice → `sin-datos`.
3. `populationCounts` vacía → `sin-datos`.
4. Cualquier registro con `year` o `value` no válido para el país solicitado → `respuesta-invalida`.
5. Se devuelve el registro de `year` máximo.
6. Descarga fallida no se cachea; la siguiente llamada reintenta.
7. Cancelar una llamada no cancela la descarga compartida.

## Presentación (componente)

| Estado | Texto |
|---|---|
| cargando | «Cargando población…» |
| disponible | «33.715.000 hab.» + «Dato de 2018» |
| sin-datos | «Sin datos» |
| sin-conexion | Mensaje de sin conexión + botón «Reintentar» |
| tiempo-agotado | Mensaje de tiempo agotado + botón «Reintentar» |
| respuesta-invalida | Mensaje de respuesta inválida + botón «Reintentar» |

Capital y bandera permanecen visibles en todos los estados.
