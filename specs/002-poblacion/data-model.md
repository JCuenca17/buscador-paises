# Data Model: Población del país

**Feature**: `002-poblacion` · **Fuente**: `GET /countries/population` (CountriesNow)

## Entidades

### RegistroPoblacion (fuente)

| Campo | Tipo | Validación |
|---|---|---|
| `year` | entero | Requerido; entero positivo |
| `value` | entero | Requerido; entero no negativo |

### FilaPoblacion (fuente)

| Campo | Tipo | Validación |
|---|---|---|
| `iso3` | texto de 3 letras | Requerido; se normaliza a mayúsculas para indexar |
| `country` | texto | Requerido; no vacío |
| `populationCounts` | lista de RegistroPoblacion | Requerido; puede estar vacía |

Filas con `iso3` inválido se ignoran al indexar; no bloquean otros países.

### ResultadoPoblacion (salida del servicio)

Unión discriminada:

- `{ tipo: "disponible", cifra: number, anio: number }` — cifra del año más reciente.
- `{ tipo: "sin-datos" }` — país ausente o con `populationCounts` vacía.
- `{ tipo: "sin-conexion" | "tiempo-agotado" | "respuesta-invalida" | "cancelada" }` — mapeado desde `ErrorApi`.

### CatalogoPoblacion (estado de sesión)

- Índice `iso3 → FilaPoblacion`, construido una vez por sesión a partir de una descarga exitosa.
- Una descarga fallida no se guarda; la siguiente consulta puede reintentar.

### VistaPoblacion (estado de la sección)

- `cargando` · `disponible(cifra, anio)` · `sin-datos` · `error(tipo)`.

## Reglas de transición

- Cambiar de país reemplaza la consulta activa; la respuesta de la consulta anterior se descarta.
- `error(tipo)` ofrece Reintentar, que vuelve a `cargando`.
- Un registro con varios años se resuelve al año más reciente antes de presentar.
