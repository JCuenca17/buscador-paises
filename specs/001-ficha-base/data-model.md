# Modelo de datos (Fase 1): Ficha base

**Funcionalidad**: [spec.md](./spec.md) · **Investigación**: [research.md](./research.md)

No hay almacenamiento persistente. Todas las entidades viven en memoria durante la sesión.

## Datos de entrada (API)

### ElementoCapital — `GET /countries/capital`

| Campo | Tipo | Regla | Si no cumple |
|-------|------|-------|--------------|
| `name` | texto no vacío | puede traer espacios extremos | el elemento se ignora |
| `iso2` | texto no vacío | puede repetirse entre elementos | el elemento se ignora |
| `capital` | texto | puede ser `""` o solo espacios (capital inexistente) | `respuesta-invalida` al buscar ese país |
| `iso3` | texto no vacío | lo usan otras funcionalidades | `respuesta-invalida` al buscar ese país |

### ElementoBandera — `GET /countries/flag/images`

| Campo | Tipo | Regla | Si no cumple |
|-------|------|-------|--------------|
| `name` | texto no vacío | no se usa para unir | el elemento se ignora |
| `iso2` | texto no vacío | clave de unión con ElementoCapital | el elemento se ignora |
| `flag` | texto | solo se usa si empieza por `https:`; si no, bandera inexistente | `respuesta-invalida` al buscar ese país |
| `iso3` | — | no se usa | — |

Sobre: `{ error: boolean, msg: string, data: unknown[] }`. La respuesta completa es
`respuesta-invalida` solo si no es JSON, si `error === true`, si `data` no es un arreglo o si la
lista queda vacía después de ignorar los elementos sin `name` o `iso2` válidos
([research.md §R5](./research.md#r5-validación-de-los-datos)).

## Entidades de la funcionalidad

### ConsultaBusqueda

| Campo | Tipo | Regla |
|-------|------|-------|
| `texto` | texto | lo que escribió el usuario, máximo 100 caracteres |
| `normalizado` | texto | `normalizarNombre(texto)`; si es `""` → validación, sin consulta |

Es lo que repite «Reintentar» (FR-013).

### PaisFicha

| Campo | Tipo | Origen |
|-------|------|--------|
| `nombre` | texto | `ElementoCapital.name` sin espacios extremos, tal como lo entrega la fuente |
| `capital` | texto o `null` | `ElementoCapital.capital`; vacía tras `trim()` (`""` o solo espacios) → `null`; si no, se usa tal cual |
| `bandera` | texto (URL) o `null` | `ElementoBandera.flag` con el mismo `iso2`; sin coincidencia o sin `https:` → `null` |
| `iso2` | texto | `ElementoCapital.iso2`; lo usan las secciones de otras funcionalidades |
| `iso3` | texto | `ElementoCapital.iso3`; lo usan las secciones de otras funcionalidades (por ejemplo, la lista de población de CountriesNow se relaciona por `iso3`) |

Un `PaisFicha` solo se crea si el elemento del país cumple todas las reglas anteriores; si no, la
búsqueda devuelve `respuesta-invalida`.

### IndicePaises (caché de sesión)

- `porNombre`: mapa `normalizarNombre(name) → elemento de capitales` (solo elementos con `name` e
  `iso2` válidos; `capital` e `iso3` se validan al buscar).
- `banderaPorIso2`: mapa `iso2 → elemento de banderas` (`flag` se valida al buscar).
- Se construye cuando ambas listas están disponibles. Cada lista se guarda como promesa; si
  falla, se borra solo esa lista ([research.md §R4](./research.md#r4-memoria-de-las-listas-durante-la-sesión)).

### ResultadoBusqueda (unión discriminada)

| `tipo` | Datos | Qué se muestra | «Reintentar» |
|--------|-------|----------------|--------------|
| `encontrado` | `pais: PaisFicha` | ficha | no |
| `no-encontrado` | — | «No se encontró el país» | no |
| `sin-conexion` | — | «No hay conexión. Revisa tu conexión a internet e inténtalo de nuevo.» | sí |
| `tiempo-agotado` | — | «El servicio tardó demasiado en responder. Inténtalo de nuevo.» | sí |
| `respuesta-invalida` | — (incluye datos mal formados del país buscado) | «No se pudo obtener la información del país. Inténtalo de nuevo.» | sí |
| `cancelada` | — | nada (se descarta) | — |

La validación de campo vacío no es un `ResultadoBusqueda`: la resuelve el componente antes de
llamar al servicio.

### TipoErrorApi

`"sin-conexion" | "tiempo-agotado" | "respuesta-invalida" | "cancelada"`. Lo produce `src/api` y
el servicio lo traduce 1:1 al `ResultadoBusqueda` del mismo nombre.

## Estados de la interfaz

```text
inicial ──buscar(vacío)──▶ validacion ──input──▶ inicial
   │                          │
   └──buscar(texto)──▶ cargando ◀──buscar(texto) desde cualquier estado──┐
                          │                                             │
        ┌─────────────────┼────────────────────┬───────────────┐        │
        ▼                 ▼                    ▼               ▼        │
    encontrado      no-encontrado      error (3 tipos) ──Reintentar─────┘
     │    ▲
     └────┘ buscar(vacío): conserva la ficha y muestra la validación
```

- Al entrar en `cargando` se borran la ficha, los mensajes y las secciones anteriores (FR-009).
- Un resultado cuyo `idBusqueda` no es el actual se ignora (FR-010).
- Desde `encontrado`, la imagen que no carga cambia solo la bandera a «Bandera no disponible».
- Desde `encontrado`, buscar(vacío) no sale del estado: la ficha y sus secciones se conservan,
  se muestra «Escribe el nombre de un país», no se aborta la `signal` de las secciones y no cambia
  `idBusqueda` (FR-004, aclaración 6).
