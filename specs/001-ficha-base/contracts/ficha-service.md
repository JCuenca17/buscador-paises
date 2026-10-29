# Contrato: servicio de la ficha (`src/features/ficha`)

Lógica sin DOM. Tipos en [data-model.md](../data-model.md).

## Funciones puras

```ts
/** trim + colapsar espacios internos + toLowerCase. No quita tildes. */
function normalizarNombre(texto: string): string;

/** Validador para obtenerJson: solo exige que data sea un arreglo (research.md §R5). */
function esArreglo(data: unknown): data is unknown[];

/**
 * Ignora los elementos sin name o iso2 de texto no vacío, une las dos listas por iso2 e indexa
 * por nombre normalizado. Devuelve null si la lista de capitales o la de banderas queda vacía
 * tras filtrar (→ respuesta-invalida).
 */
function crearIndice(capitales: unknown[], banderas: unknown[]): IndicePaises | null;

type ResultadoIndice =
  | { tipo: "encontrado"; pais: PaisFicha }
  | { tipo: "no-encontrado" }
  | { tipo: "respuesta-invalida" }; // el país existe pero su elemento está mal formado

/** Busca el texto (se normaliza dentro) y valida el elemento del país encontrado. */
function buscarEnIndice(indice: IndicePaises, texto: string): ResultadoIndice;
```

## Función con red

```ts
/** Nunca rechaza: toda falla se devuelve como ResultadoBusqueda. */
function buscarFicha(texto: string, opciones?: { signal?: AbortSignal }): Promise<ResultadoBusqueda>;

/** Solo para pruebas: vacía la caché de listas. */
function reiniciarCache(): void;
```

`buscarFicha`:

1. Obtiene ambas listas en paralelo con `obtenerJson` (de la caché si ya llegaron).
2. Si alguna falla, borra de la caché solo la que falló y devuelve el tipo de error. Si ambas
   fallan, devuelve el error de la lista de capitales.
3. Con las dos listas, construye el índice (una vez por par de listas). Si `crearIndice`
   devuelve `null`, borra ambas listas de la caché y devuelve `respuesta-invalida`.
4. Devuelve el resultado de `buscarEnIndice`: `encontrado`, `no-encontrado` o
   `respuesta-invalida`.

Precondición: `normalizarNombre(texto) !== ""` (la validación la hace el componente).

## Pruebas exigidas

- `normalizar.test.ts`: ejemplos («  pERU » → «peru», tabuladores, espacios internos, «Réunion»
  conserva la tilde).
- `normalizar.prop.test.ts` (fast-check): idempotencia; sin espacios extremos ni dobles;
  invariante a mayúsculas y espacios añadidos; toda variante de mayúsculas/espacios de un nombre
  del índice encuentra el mismo país.
- `ficha.service.test.ts` (`obtenerJson` o `fetch` simulado):
  - **Casos normales:**
    - encontrado, con `iso2` e `iso3` en el `PaisFicha`;
    - no encontrado;
    - capital vacía → `null`;
    - país sin bandera → `null`;
    - bandera sin `https:` → `null`;
    - nombre de la API con espacio final;
    - `iso2` repetido.
  - **Errores y caché:**
    - cada error de `src/api` se traduce a su resultado;
    - tras una falla, la siguiente búsqueda vuelve a pedir solo la lista que falló.
  - **Validación (research.md §R5):**
    - respuesta no JSON, `error: true` o `data` que no es arreglo → `respuesta-invalida`;
    - lista vacía tras filtrar → `respuesta-invalida`;
    - elementos sin `name` o `iso2` válidos se ignoran y los demás países se siguen encontrando;
    - el país buscado con `capital` no textual, `iso3` ausente o vacío, o `flag` no textual →
      `respuesta-invalida`, mientras otro país de la misma lista se encuentra bien.
