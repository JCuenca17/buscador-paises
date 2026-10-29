# Modelo de datos (Fase 1): Búsqueda inteligente

**Funcionalidad**: [spec.md](./spec.md) · **Investigación**: [research.md](./research.md)

No hay almacenamiento persistente. El catálogo y sus índices viven en memoria durante la sesión.

## Datos de entrada

### ElementoCapital sugerible — `GET /countries/capital`

| Campo | Tipo | Regla | Tratamiento |
|-------|------|-------|-------------|
| `name` | texto no vacío | nombre canónico entregado por CountriesNow | se conserva como valor que recibirá `buscarFicha`; se ignora el elemento si falta |
| `iso2` | texto no vacío | código ISO alfa-2 | se pasa en mayúsculas a `Intl.DisplayNames`; se ignora el elemento si falta |
| `capital` | desconocido | no se usa en sugerencias | no se valida ni se muestra |

La respuesta se solicita solo con `obtenerJson`. La envoltura, `error`, JSON, HTTP, conexión y
timeout siguen las reglas de `src/api/http.ts`.

## Entidades de la funcionalidad

### PaisSugerible

| Campo | Tipo | Regla |
|-------|------|-------|
| `id` | texto | identidad estable dentro del catálogo; distingue registros aunque compartan `iso2` |
| `nombreApi` | texto | `name.trim()` de CountriesNow; valor canónico usado para la búsqueda de la ficha |
| `iso2` | texto | código alfa-2 no vacío normalizado a mayúsculas |
| `nombreEspanol` | texto | resultado de `Intl.DisplayNames` en locale `es` y tipo `region`; si no se obtiene nombre utilizable, el elemento no se ofrece como sugerencia |
| `clavesBusqueda` | conjunto de texto | claves de `nombreApi` y `nombreEspanol` tras reutilizar `normalizarNombre` y quitar marcas diacríticas |

La identidad no depende únicamente de `iso2`, que puede repetirse en la respuesta. Los duplicados
idénticos se eliminan; nombres distintos con ISO2 compartido permanecen seleccionables.

### CatalogoPaises

- Conserva en memoria la lista filtrada de `PaisSugerible` y sus índices por alias.
- Se carga de forma diferida al necesitar sugerencias o resolver una búsqueda.
- Se reutiliza como una promesa compartida; si falla, se descarta para que la próxima acción pueda
  reintentar.
- Una descarga no se repite por cada evento `input`.

### ConsultaBusqueda

| Campo | Tipo | Regla |
|-------|------|-------|
| `textoOriginal` | texto | texto escrito o nombre español escogido; límite de 100 caracteres heredado del campo base |
| `claveNormalizada` | texto | `normalizarNombre(textoOriginal)` seguida de eliminación de marcas Unicode |
| `nombreApi` | texto | valor canónico resuelto que se entrega a `buscarFicha`; si no hay alias, se conserva el texto original para que el flujo base responda no encontrado |

### Sugerencia

- Referencia un `PaisSugerible` completo, no solo su texto, para preservar la identidad del país.
- Su etiqueta visible es `nombreEspanol`.
- La lista conserva como máximo cinco coincidencias en el orden estable del catálogo.
- `id` identifica la opción activa de teclado y se usa en `aria-activedescendant`.

## Reglas de normalización y resolución

1. `normalizarNombre` se reutiliza sin cambios: elimina espacios extremos, colapsa espacios
   internos y pasa a minúsculas.
2. El helper local aplica Unicode NFD y elimina marcas `\p{M}` para comparar con y sin tilde.
3. La búsqueda de sugerencias compara prefijos contra las claves inglesas y españolas.
4. La resolución manual favorece nombre canónico inglés exacto; luego traduce un alias español exacto
   solo si resuelve inequívocamente a un país.
5. Si no se encuentra alias, el texto original sigue el flujo base y produce el estado habitual de
   no encontrado.
6. La selección conserva el nombre español en el input y entrega el país asociado al resolvedor;
   el formulario base mantiene su submit y sus estados.

## Errores

- Datos mal formados se filtran de la lista como en el servicio base; si no queda ningún elemento
  utilizable, la respuesta es inválida.
- `sin-conexion`, `tiempo-agotado` y `respuesta-invalida` mantienen el tipo `ErrorApi` del cliente.
  Se muestran mediante el estado de error del buscador base, nunca como excepción sin manejar.
- Una falta de coincidencia no es error de red y no bloquea la búsqueda base.