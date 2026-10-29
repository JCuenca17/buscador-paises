# Investigación (Fase 0): Ficha base

**Funcionalidad**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Fecha**: 2026-10-29

Cada decisión sigue el formato Decisión / Justificación / Alternativas consideradas. Los datos de
la API se verificaron el 2026-10-29 con una consulta manual a los dos endpoints (fuera de las
pruebas, que nunca llaman a la red).

## R1. Versiones de las herramientas

**Decisión**: fijar estas versiones, consultadas en npm el 2026-10-29:

| Paquete | Versión | Node que acepta | Uso |
|---------|---------|-----------------|-----|
| `vite` | 8.3.5 | `^20.19.0 \|\| >=22.12.0` | servidor de desarrollo y empaquetado |
| `typescript` | 7.0.2 | — | verificación de tipos (`tsc --noEmit`) |
| `vitest` | 5.0.5 | `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` | pruebas (acepta `vite` ^6.4, ^7 u ^8) |
| `jsdom` | 29.1.1 | `^20.19.0 \|\| ^22.13.0 \|\| >=24.0.0` | entorno DOM para las pruebas |
| `fast-check` | 4.10.2 | — | pruebas basadas en propiedades |

Requisito de entorno: el rango común de los tres, **`^22.13.0 || ^24.0.0 || >=26.0.0`**, se
declara en `engines.node` de `package.json`. `.nvmrc` contiene `24`.

**Justificación**: jsdom 29.1.1 funciona con el Node que ya tiene el equipo (por ejemplo,
24.14.1), así que nadie necesita actualizar. TypeScript solo verifica tipos; Vite transpila por
su cuenta, así que el cambio de compilador de TypeScript 7 no afecta al empaquetado.

**Alternativas consideradas**:
- `jsdom` 30.1.3 (la más reciente): exige Node `^22.22.2 || ^24.15.0 || >=26.0.0` y obligaría a
  actualizar Node a parte del equipo, sin ninguna ventaja necesaria para esta funcionalidad.
- `happy-dom`: más rápido, pero la constitución nombra jsdom.

## R2. Forma real de las respuestas de CountriesNow

**Decisión**: tratar ambos endpoints como `{ error: boolean, msg: string, data: Elemento[] }`:

- `GET /countries/capital` → 250 elementos `{ name, capital, iso2, iso3 }`.
- `GET /countries/flag/images` → 222 elementos `{ name, flag, iso2, iso3 }`; todas las banderas
  están en `upload.wikimedia.org`.

Anomalías observadas que el diseño debe soportar:

| Anomalía | Ejemplo | Tratamiento |
|----------|---------|-------------|
| Capital vacía (6 países) | `Antarctica` → `capital: ""` | capital `null` → «Capital: no disponible» |
| País sin bandera por `iso2` (26) | `Bolivia`, `Ivory Coast`, `Kosovo` | bandera `null` → «Bandera no disponible» |
| Espacio al final del nombre | `"Bonaire, Saint Eustatius and Saba "` | se normaliza también el nombre de la API |
| `iso2` repetido en capitales | `Cocos Islands` / `Cocos (Keeling) Islands` (`CC`), `Vatican` / `Vatican City State (Holy See)` (`VA`) | el índice de búsqueda es por nombre, no por `iso2` |
| Nombre con tilde | `Réunion` | se busca tal cual; quitar tildes es de `005-busqueda-inteligente` |

**Justificación**: la búsqueda por nombre en la lista de capitales resuelve FR-006 sin depender
de los mensajes de error del servicio, como pidió el responsable. La falta de bandera es un dato
inexistente (FR-015), no una falla.

**Alternativas consideradas**: consultar un país puntual (`POST /countries/capital/q`): se
descartó porque el servicio responde con `error: true` tanto para un país inexistente como para
otros errores, lo que confunde «No se encontró el país» con «respuesta inválida».

## R3. Límite de 10 segundos y clasificación de errores

**Decisión**: `src/api/http.ts` expone `obtenerJson(url, opciones)`:

1. Si `navigator.onLine === false` antes de llamar → `sin-conexion` (sin llamar a `fetch`).
2. Crea un `AbortController` propio y un `setTimeout(10_000)` que lo aborta con motivo
   «tiempo». Si se recibe una `signal` externa (búsqueda reemplazada), se escucha su `abort` y se
   aborta el controlador propio con motivo «cancelada». El temporizador se limpia en `finally`.
3. Clasificación:
   - abortado por tiempo → `tiempo-agotado`;
   - abortado por la señal externa → `cancelada` (nunca se muestra; el resultado se descarta);
   - `fetch` rechaza por otro motivo (`TypeError`) → `sin-conexion`;
   - `response.ok === false`, JSON mal formado, objeto sin `data`, `error === true` o validador
     que rechaza `data` → `respuesta-invalida`. Para las listas de esta funcionalidad el validador
     solo exige que `data` sea un arreglo; el resto se filtra en el servicio (§R5).
4. Errores como instancias de `ErrorApi` con `tipo` (unión discriminada), nunca cadenas sueltas.

**Justificación**: cumple el Principio II y deja a `src/api` como único usuario de `fetch`
(Principio III). Separar `cancelada` evita mostrar un error cuando el propio usuario reemplazó la
búsqueda (FR-010).

**Alternativas consideradas**: `AbortSignal.timeout()` + `AbortSignal.any()`: más corto, pero
`AbortSignal.timeout` no se controla con los temporizadores simulados de Vitest y complica probar
el caso de 10 segundos de forma determinista.

## R4. Memoria de las listas durante la sesión

**Decisión**: el servicio guarda en memoria la **promesa** de cada lista. Si una descarga falla,
se borra solo esa entrada, para que «Reintentar» la vuelva a pedir; la lista que sí llegó se
conserva. Las dos listas se piden en paralelo.

Las descargas en caché **no** reciben la `signal` de la búsqueda; solo las limita el tope de 10 s
de `src/api`. La `signal` de la búsqueda solo hace que `buscarFicha` deje de esperar y devuelva
`cancelada`: no aborta ni borra la descarga compartida. Así, si la búsqueda A se cancela mientras
B espera la misma descarga, B recibe igualmente la ficha.

**Justificación**: evita descargar 250 países en cada búsqueda y cumple «si una descarga falla,
Reintentar debe volver a pedirla».

**Alternativas consideradas**: `localStorage`: persistiría entre sesiones, pero agrega
invalidación y no lo pide la especificación.

## R5. Validación de los datos

**Decisión**: la validación se hace en dos niveles.

1. **Respuesta completa** (en `src/api` y al construir el índice). Es `respuesta-invalida` solo
   si:
   - no es JSON;
   - `error === true`;
   - `data` no es un arreglo;
   - la lista queda vacía después de filtrar.
2. **Elementos al construir el índice**: se ignoran los que no son objetos o no tienen `name` e
   `iso2` de texto no vacío. Los demás campos no se revisan en este paso.
3. **Elemento del país encontrado** (en cada búsqueda): la búsqueda da `respuesta-invalida` si su
   elemento de capitales tiene `capital` que no es texto o `iso3` que no es texto no vacío. Lo
   mismo pasa si existe un elemento de banderas con su `iso2` y su `flag` no es texto.
4. **Bandera inexistente**: una bandera de texto que no empieza por `https:`, o la ausencia de un
   elemento de banderas para ese `iso2`, se trata como bandera inexistente («Bandera no
   disponible»).

**Justificación**:
- Un elemento dañado de otro país no impide buscar los demás, así que es más tolerante con la
  fuente externa.
- Los datos dañados del país buscado se informan como falla, no como «no disponible», según la
  aclaración 2 de la especificación.
- Exigir `https:` evita insertar en `src` URLs con otros esquemas.

**Riesgo aceptado**: si el elemento de un país pierde su `name` o su `iso2`, ese país se ignora y
su búsqueda da «No se encontró el país». Es preferible a bloquear las búsquedas de los demás.

**Alternativas consideradas**: invalidar toda la respuesta por un solo elemento mal formado, lo
que resultó demasiado frágil frente a una API externa.

**Pruebas basadas en propiedades** (fast-check, `ficha.validacion.prop.test.ts`, Principio IV):
1. `crearIndice` nunca lanza con arreglos arbitrarios.
2. Toda clave del índice viene de un elemento con `name` e `iso2` de texto no vacío.
3. `buscarEnIndice` nunca devuelve `encontrado` con `capital`, `iso2` o `iso3` de tipo
   incorrecto.
4. Todo `flag` de texto que no empieza por `https:` da bandera `null`.

**Pruebas con ejemplos exigidas**:
- respuesta no JSON;
- `error: true`;
- `data` que no es un arreglo;
- lista vacía tras filtrar;
- elementos sin `name` o `iso2` ignorados, mientras los demás países se encuentran;
- país encontrado con `capital` no textual, con `iso3` ausente y con `flag` no textual, cada uno
  → `respuesta-invalida`;
- `flag` sin `https:` → bandera `null`.

## R6. Normalización y comparación

**Decisión**: `normalizarNombre(texto) = texto.trim().replace(/\s+/g, " ").toLowerCase()`. Se
aplica igual al texto del usuario y a los nombres de la API. No quita tildes ni traduce.

**Justificación**: cumple FR-003 y FR-005. `toLowerCase()` (no `toLocaleLowerCase()`) da el mismo
resultado en cualquier configuración regional, lo que hace deterministas las pruebas.

**Propiedades que se prueban con fast-check**: idempotencia; el resultado no empieza ni termina
con espacio ni contiene dos espacios seguidos; es invariante a mayúsculas y a espacios
añadidos; buscar cualquier variante de mayúsculas o espacios de un nombre de la lista encuentra el
mismo país.

## R7. Búsquedas superpuestas

**Decisión**: el componente lleva un contador `idBusqueda` y un `AbortController` por búsqueda.
Al iniciar una nueva, aborta la anterior e incrementa el contador; al llegar un resultado, solo
se aplica si su id es el actual. Las dos medidas se usan juntas: la cancelación libera la espera
(sin abortar las descargas compartidas, §R4), y el id garantiza que un resultado tardío nunca se
pinte. Enviar el campo vacío no es una búsqueda nueva: no aborta ni incrementa el contador.

**Justificación**: cumple FR-010 y la aclaración 3 («Buscar» nunca se desactiva).

## R8. Contenedor de secciones para otras funcionalidades

**Decisión**: `src/features/ficha/secciones.ts` expone `registrarSeccion(seccion)`. Tras pintar
la ficha, el componente crea, por cada sección registrada, un `<section>` dentro del contenedor
`[data-ficha-secciones]` y llama a `seccion.renderizar(pais, contenedor, signal)`. Toda excepción
o promesa rechazada de una sección se captura y se muestra dentro de esa sección («No se pudo
cargar esta sección»); la ficha base no cambia (FR-018). La `signal` se aborta cuando empieza otra
búsqueda.

**Justificación**: las otras funcionalidades se agregan sin tocar el código de `ficha`; solo
añaden una línea de registro en `src/main.ts`, el punto de composición de la aplicación.

**Alternativas consideradas**: un `CustomEvent` en `document`: desacopla igual, pero no permite
aislar errores ni probar el orden de las secciones con la misma facilidad.

## R9. Accesibilidad

**Decisión**: formulario con `<label for>`, `<input maxlength="100">` (también corta lo pegado) y
botón `type="submit"` (Enter funciona sin código extra); `novalidate` para usar el mensaje propio.
Validación: `aria-invalid="true"` y `aria-describedby` hacia el mensaje, que se borra en el evento
`input`. Carga y resultados en una región `role="status"` (`aria-live="polite"`); errores con
`role="alert"`. Foco inicial en el campo al cargar. Foco visible con `:focus-visible`. Todo dato
se inserta con `textContent`; la imagen usa `img.src` y `img.alt`, y su evento `error` la
reemplaza por el texto «Bandera no disponible».
