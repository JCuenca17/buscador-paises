---

description: "Lista de tareas de la funcionalidad 001-ficha-base"
---

# Tareas: Ficha base

**Entrada**: documentos de diseño en `specs/001-ficha-base/`

**Prerrequisitos**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Pruebas**: obligatorias por la constitución (Principio IV). Vitest + jsdom en todos los
módulos; fast-check para la normalización y la búsqueda; `fetch` **siempre** simulado. En cada
historia, las pruebas se escriben primero y deben fallar antes de implementar. Una tarea no está
terminada si sus pruebas no pasan.

**Organización**: las tareas se agrupan por historia de usuario para implementarlas y probarlas
por separado.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: puede hacerse en paralelo (archivos distintos, sin dependencias pendientes)
- **[US1], [US2], [US3]**: historia de usuario de [spec.md](./spec.md) a la que pertenece
- Todas las rutas son relativas a la raíz del repositorio

## Convenciones de rutas

Proyecto único (ver [plan.md](./plan.md#código-fuente-raíz-del-repositorio)): código en `src/`,
pruebas junto a cada módulo como `*.test.ts` (y `*.prop.test.ts` para las de propiedades).

---

## Fase 1: Configuración (infraestructura compartida)

**Propósito**: crear el proyecto Vite + TypeScript con las versiones fijadas en
[research.md §R1](./research.md#r1-versiones-de-las-herramientas).

- [X] T001 Crear `package.json` con `"name": "buscador-paises"`, `"private": true`, `"type": "module"`, `"engines": { "node": "^22.13.0 || ^24.0.0 || >=26.0.0" }`, scripts `"dev": "vite"`, `"build": "tsc --noEmit && vite build"`, `"preview": "vite preview"`, `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`, `"test:watch": "vitest"`, y `devDependencies` con versiones exactas: `vite` `8.3.5`, `typescript` `7.0.2`, `vitest` `5.0.5`, `jsdom` `29.1.1`, `fast-check` `4.10.2`. Sin `dependencies` de ejecución
- [X] T002 [P] Crear `.nvmrc` con el contenido `24`
- [X] T003 [P] Crear `tsconfig.json` con `strict: true`, `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`, `lib: ["ES2022", "DOM", "DOM.Iterable"]`, `noEmit: true`, `isolatedModules: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `skipLibCheck: true`, `include: ["src", "vite.config.ts"]` (ver research.md §R1)
- [X] T004 [P] Crear `vite.config.ts` usando `defineConfig` de `vitest/config` con `test: { environment: "jsdom", include: ["src/**/*.test.ts"], restoreMocks: true, unstubGlobals: true }`
- [X] T005 [P] Crear `index.html` con `<html lang="es">`, `<title>Buscador de países</title>`, `<meta name="viewport">`, un `<div id="app"></div>` vacío y `<script type="module" src="/src/main.ts"></script>` (el marcado de la ficha lo crea `montarFicha` en T020, así las pruebas del componente usan el mismo marcado)
- [X] T006 [P] Crear `src/styles.css` con estilos base legibles en móvil y escritorio, regla `[hidden] { display: none !important; }`, un indicador de foco visible con `:focus-visible` (contorno de al menos 2 px) para el campo y los botones, y estilo para `.validacion` (texto de error junto al campo)
- [X] T007 Ejecutar `npm install` para generar `package-lock.json` y comprobar que `npx vitest run --passWithNoTests` y `npx tsc --noEmit` terminan sin errores

**Punto de control**: el proyecto se instala y `npm run dev` sirve una página vacía.

---

## Fase 2: Base (prerrequisitos que bloquean todas las historias)

**Propósito**: tipos compartidos y cliente HTTP de `src/api`, que usan las tres historias.

**⚠️ CRÍTICO**: ninguna historia puede empezar hasta terminar esta fase.

- [X] T008 Crear `src/features/ficha/tipos.ts` con los tipos de [data-model.md](./data-model.md):
  - `PaisFicha`, con los campos `nombre: string`, `capital: string | null`, `bandera: string | null`, `iso2: string` e `iso3: string`;
  - `ResultadoBusqueda`, unión discriminada por `tipo` con los valores `"encontrado"` (con `pais: PaisFicha`), `"no-encontrado"`, `"sin-conexion"`, `"tiempo-agotado"`, `"respuesta-invalida"` y `"cancelada"`;
  - `IndicePaises`, con `porNombre: Map<string, Record<string, unknown>>` y `banderaPorIso2: Map<string, Record<string, unknown>>`;
  - `ResultadoIndice`, con `"encontrado"`, `"no-encontrado"` y `"respuesta-invalida"`.
- [X] T009 [P] Escribir `src/api/http.test.ts` según [contracts/http-client.md](./contracts/http-client.md), con `fetch` simulado vía `vi.stubGlobal("fetch", ...)` que respete `init.signal` (rechaza con `DOMException` `AbortError` al abortar), `navigator.onLine` simulado con `vi.spyOn(navigator, "onLine", "get")` y temporizadores con `vi.useFakeTimers()`. Un caso por fila de la tabla:
  - `navigator.onLine === false` → `ErrorApi` `sin-conexion` sin llamar a `fetch`;
  - `fetch` rechaza con `TypeError` → `sin-conexion`;
  - sin respuesta en 10 000 ms (avanzar con `vi.advanceTimersByTimeAsync(10_000)`) → `tiempo-agotado` y la solicitud quedó abortada;
  - `signal` externa abortada durante la espera → `cancelada`;
  - `signal` ya abortada → `cancelada` sin llamar a `fetch`;
  - `response.ok === false` (por ejemplo, 500) → `respuesta-invalida`;
  - cuerpo no JSON → `respuesta-invalida`;
  - JSON que no es objeto, sin `data` o con `error: true` → `respuesta-invalida`;
  - `validar` devuelve `false` → `respuesta-invalida`;
  - respuesta correcta → resuelve con `data` y llama a `fetch` con `URL_BASE + ruta`.

  Comprobar además que, tras una respuesta correcta, `vi.getTimerCount()` es 0, y que todo rechazo es `instanceof ErrorApi`.
- [X] T010 Implementar `src/api/http.ts` hasta que pase T009 ([research.md §R3](./research.md#r3-límite-de-10-segundos-y-clasificación-de-errores)):
  - exporta `URL_BASE = "https://countriesnow.space/api/v0.1"`, `type TipoErrorApi`, la clase `ErrorApi extends Error` con `readonly tipo` y `obtenerJson<T>(ruta, { validar, signal?, limiteMs = 10_000 })`;
  - usa un `AbortController` propio con `setTimeout(limiteMs)` que aborta con motivo de tiempo;
  - escucha el `abort` de la `signal` externa y aborta con motivo de cancelación;
  - limpia el temporizador y el escuchador en `finally`;
  - es el **único** archivo del proyecto que llama a `fetch`.

**Punto de control**: `npx vitest run src/api` pasa.

---

## Fase 3: Historia de usuario 1 - Consultar la ficha de un país (Prioridad: P1) 🎯 MVP

**Objetivo**: escribir un nombre en inglés, buscar con «Buscar» o Enter, ver «Buscando…» y luego
la ficha con nombre, capital y bandera; otras funcionalidades pueden agregar secciones.

**Prueba independiente**: con `fetch` simulado que devuelve las listas de prueba, buscar
`  pERU ` con el botón y con Enter muestra la ficha de «Peru», capital «Lima» y bandera con
`alt="Bandera de Peru"`.

### Pruebas de la historia 1 (escribirlas primero; deben fallar) ⚠️

- [X] T011 [P] [US1] Crear `src/features/ficha/datos-prueba.ts` (solo lo importan las pruebas) con sobres simulados `{ error: false, msg, data }` de capitales y banderas que reproduzcan las anomalías reales de [research.md §R2](./research.md#r2-forma-real-de-las-respuestas-de-countriesnow):
  - Peru (`PE`/`PER`, capital `Lima`, bandera `https://upload.wikimedia.org/...`) y Chile (`CL`/`CHL`, `Santiago`);
  - Antarctica (`capital: ""`);
  - Bolivia (sin elemento en banderas);
  - `"Bonaire, Saint Eustatius and Saba "` (espacio final);
  - `Cocos Islands` y `Cocos (Keeling) Islands` (ambos `CC`);
  - Réunion (`RE`).

  Agregar una función `simularFetch(respuestas)` que devuelva un `fetch` falso por ruta.
- [X] T012 [P] [US1] Escribir `src/features/ficha/normalizar.test.ts` con ejemplos de FR-003:
  - `"  pERU "` → `"peru"`;
  - `"United\t\tStates"` → `"united states"`;
  - `"  "` → `""`;
  - `"Réunion"` → `"réunion"` (conserva la tilde, FR-005);
  - `"Bonaire, Saint Eustatius and Saba "` → `"bonaire, saint eustatius and saba"`.
- [X] T013 [P] [US1] Escribir `src/features/ficha/normalizar.prop.test.ts` con fast-check ([research.md §R6](./research.md#r6-normalización-y-comparación)), con las propiedades:
  - idempotencia, `normalizarNombre(normalizarNombre(s)) === normalizarNombre(s)`;
  - el resultado no empieza ni termina con espacio y no contiene `/\s{2,}/`;
  - es invariante a `toUpperCase()` y a espacios añadidos al inicio, al final o entre palabras;
  - para cualquier nombre de `datos-prueba.ts`, toda variante aleatoria de mayúsculas o espacios hace que `buscarEnIndice` devuelva el mismo país.
- [X] T014 [P] [US1] Escribir en `src/features/ficha/ficha.service.test.ts` los casos normales de [contracts/ficha-service.md](./contracts/ficha-service.md), con `simularFetch` de T011 y `reiniciarCache()` en `beforeEach`:
  - `buscarFicha("Peru")` → `encontrado` con `{ nombre: "Peru", capital: "Lima", bandera: <url https>, iso2: "PE", iso3: "PER" }`;
  - Antarctica → `capital: null`;
  - Bolivia → `bandera: null`;
  - bandera con URL `http://...` o `javascript:...` → `bandera: null`;
  - `"bonaire, saint eustatius and saba"` encuentra el país y `nombre` llega sin el espacio final;
  - `Cocos Islands` y `Cocos (Keeling) Islands` se encuentran por separado;
  - las dos listas se piden en paralelo, y una segunda búsqueda no vuelve a llamar a `fetch` (caché de sesión).
- [X] T015 [P] [US1] Escribir en `src/features/ficha/ficha.component.test.ts` los casos de la historia 1, montando `montarFicha(document.body)` con `buscarFicha` simulado vía `vi.mock("./ficha.service")`. Comprobar:
  - el marcado de [contracts/ui.md](./contracts/ui.md): `label[for="nombre-pais"]` con el texto «Nombre del país», un `input` con `maxlength="100"` y un botón «Buscar» `type="submit"`;
  - el foco inicial está en `#nombre-pais`;
  - el `submit` por botón y la tecla Enter llaman a `buscarFicha` con el texto escrito;
  - mientras la promesa está pendiente, `[data-estado]` muestra «Buscando…», y luego `[data-ficha]` es visible con `h2` = nombre, `[data-capital]` = capital, e `img` con `src` y `alt="Bandera de Peru"`;
  - capital `null` → `[data-capital]` muestra «no disponible»;
  - bandera `null` o evento `error` en la `img` → `[data-bandera]` muestra «Bandera no disponible» y el resto de la ficha sigue visible;
  - un nombre con `<b>x</b>` aparece como texto literal y no crea elementos (`textContent`);
  - al iniciar una nueva búsqueda se ocultan la ficha y las secciones anteriores (FR-009);
  - búsquedas superpuestas: si la primera resuelve después de la segunda, solo se ve el resultado de la segunda; la `signal` de la primera queda abortada; «Buscar» nunca tiene `disabled` (FR-010);
  - secciones (FR-018, [contracts/secciones-ficha.md](./contracts/secciones-ficha.md)): una sección registrada recibe `pais` con `iso2`/`iso3` y un `<section data-seccion>` con su `<h3>`, en orden de registro; si una sección lanza o rechaza, muestra «No se pudo cargar esta sección» y la ficha base y las demás secciones no cambian; su `signal` se aborta al iniciar otra búsqueda; registrar un `id` repetido lanza un error.

### Implementación de la historia 1

- [X] T016 [P] [US1] Implementar `normalizarNombre(texto)` en `src/features/ficha/normalizar.ts` como `texto.trim().replace(/\s+/g, " ").toLowerCase()` (sin quitar tildes ni usar `toLocaleLowerCase`), hasta que pasen T012 y T013
- [X] T017 [US1] Implementar en `src/features/ficha/ficha.service.ts` el camino exitoso, hasta que pase T014:
  - `esArreglo(data)`, que solo exige `Array.isArray`;
  - `crearIndice(capitales, banderas)`, que ignora los elementos sin `name` o `iso2` de texto no vacío, indexa `porNombre` por `normalizarNombre(name)` y `banderaPorIso2` por `iso2`, y devuelve `null` si alguna lista queda vacía tras filtrar;
  - `buscarEnIndice(indice, texto)`, que construye el `PaisFicha` con `nombre = name.trim()`, `capital: ""` → `null`, la bandera solo si `flag` empieza por `"https:"` (si no, `null`), e `iso2`/`iso3` del elemento de capitales;
  - `buscarFicha(texto, { signal })`, que pide `"/countries/capital"` y `"/countries/flag/images"` en paralelo con `obtenerJson(..., { validar: esArreglo })` y guarda en caché de módulo la **promesa** de cada lista ([research.md §R4](./research.md#r4-memoria-de-las-listas-durante-la-sesión)). Las descargas en caché **no** reciben la `signal` de la búsqueda; solo las limita el tope de 10 s de `src/api`. La `signal` solo hace que `buscarFicha` deje de esperar (por ejemplo, con `Promise.race` contra una promesa que se resuelve al abortarse) y devuelva `{ tipo: "cancelada" }`, sin abortar ni borrar la descarga compartida;
  - `reiniciarCache()`.

  Sin acceso al DOM.
- [X] T018 [P] [US1] Implementar en `src/features/ficha/secciones.ts`:
  - `interface SeccionFicha { id; titulo; renderizar(pais, contenedor, signal) }`;
  - `registrarSeccion(seccion)`, que lanza un `Error` si el `id` ya está registrado;
  - `obtenerSecciones()`, que devuelve las secciones en orden de registro;
  - `reiniciarSecciones()`, solo para pruebas.

  Todo según [contracts/secciones-ficha.md](./contracts/secciones-ficha.md).
- [X] T019 [US1] Implementar `montarFicha(raiz: HTMLElement)` en `src/features/ficha/ficha.component.ts`, hasta que pase T015:
  - crea con `document.createElement` el marcado de [contracts/ui.md](./contracts/ui.md) (`form role="search" novalidate`, `input maxlength="100"`, `[data-estado] role="status" aria-live="polite"`, `[data-error] role="alert"`, `article[data-ficha] hidden` con `[data-ficha-secciones]`) y pone el foco en el campo;
  - en `submit`: `preventDefault`, aborta el `AbortController` anterior, incrementa `idBusqueda`, oculta la ficha, el error, el estado y las secciones, y muestra «Buscando…»;
  - llama a `buscarFicha` y aplica el resultado solo si su id sigue siendo el actual;
  - pinta la ficha **solo con `textContent`**, `img.src` e `img.alt`, y en el evento `error` de la imagen la reemplaza por «Bandera no disponible»;
  - después de la ficha, crea un `<section data-seccion aria-labelledby>` con su `<h3>` por cada `obtenerSecciones()` y llama a `renderizar` dentro de `try/catch` y `.catch`; si falla (y la `signal` no está abortada), vacía la sección y muestra «No se pudo cargar esta sección»;
  - nunca usa `innerHTML` y nunca desactiva «Buscar».
- [X] T020 [US1] Crear `src/main.ts`: importa `./styles.css`, deja un comentario que indique que las otras funcionalidades registran aquí su sección con `registrarSeccion(...)` ([contracts/secciones-ficha.md](./contracts/secciones-ficha.md)), y llama a `montarFicha(document.getElementById("app")!)`. Requiere `src/vite-env.d.ts` con `/// <reference types="vite/client" />` para que `tsc` acepte el import del CSS

**Punto de control**: `npx vitest run src/features/ficha` pasa los casos de la historia 1, y
`npm run dev` permite buscar «Peru» y ver su ficha (MVP).

---

## Fase 4: Historia de usuario 2 - Validar la entrada y avisar si el país no existe (Prioridad: P2)

**Objetivo**: el campo vacío o con solo espacios muestra un mensaje de validación sin consultar;
un nombre inexistente muestra «No se encontró el país», sin «Reintentar».

**Prueba independiente**: buscar con `""`, con `"   "`, con `"Atlantida"` y con `"España"`, y
comprobar los mensajes y que en los dos primeros casos `buscarFicha` no se llama.

### Pruebas de la historia 2 (escribirlas primero; deben fallar) ⚠️

- [X] T021 [P] [US2] Agregar a `src/features/ficha/ficha.service.test.ts`:
  - `buscarFicha("Atlantida")` → `{ tipo: "no-encontrado" }`;
  - `buscarFicha("España")` → `no-encontrado` (solo nombres en inglés, FR-005);
  - `buscarFicha("Reunion")` (sin tilde) → `no-encontrado`.
- [X] T022 [P] [US2] Agregar a `src/features/ficha/ficha.component.test.ts`:
  - con el campo vacío y con `"   "`, al enviar: `#validacion-pais` muestra «Escribe el nombre de un país», el campo tiene `aria-invalid="true"` y `aria-describedby="validacion-pais"`, y `buscarFicha` **no** se llama (FR-004);
  - un evento `input` en el campo borra el mensaje y `aria-invalid` (aclaración 5);
  - si `buscarFicha` devuelve `no-encontrado`, `[data-estado]` muestra «No se encontró el país», `[data-ficha]` está oculta y no hay ningún botón «Reintentar» en la página (FR-006);
  - al enviar una búsqueda válida después de una validación, el mensaje de validación ya no está;
  - con una ficha en pantalla, al vaciar el campo y enviarlo: la ficha (y sus secciones) se conservan visibles, se muestra «Escribe el nombre de un país», `buscarFicha` no se llama y la `signal` de las secciones no se aborta (aclaración 6).

### Implementación de la historia 2

- [X] T023 [US2] Completar `src/features/ficha/ficha.component.ts`, hasta que pasen T021 y T022:
  - antes de llamar a `buscarFicha`, si `normalizarNombre(input.value) === ""`, muestra «Escribe el nombre de un país» en `#validacion-pais` y pone `aria-invalid="true"`, sin consultar ni cambiar el resto de la pantalla (no es una búsqueda nueva: no aborta la búsqueda anterior, no incrementa `idBusqueda` y conserva la ficha que haya);
  - en el evento `input`, borra el mensaje y quita `aria-invalid`;
  - para `no-encontrado`, muestra «No se encontró el país» en `[data-estado]`, sin ficha ni «Reintentar».

  `buscarEnIndice` (T017) ya devuelve `no-encontrado`; corregirlo en `src/features/ficha/ficha.service.ts` si T021 falla.

**Punto de control**: las historias 1 y 2 funcionan y sus pruebas pasan.

---

## Fase 5: Historia de usuario 3 - Recuperarse de fallas del servicio (Prioridad: P3)

**Objetivo**: sin conexión, tiempo agotado o respuesta inválida muestran su mensaje y
«Reintentar», que repite la última búsqueda y vuelve a pedir solo la lista que falló.

**Prueba independiente**: simular cada falla y comprobar el mensaje exacto y que «Reintentar»
(con ratón o teclado) repite la búsqueda y muestra la ficha cuando el servicio se recupera.

### Pruebas de la historia 3 (escribirlas primero; deben fallar) ⚠️

- [X] T024 [P] [US3] Agregar a `src/features/ficha/ficha.service.test.ts` los casos de error y validación ([research.md §R5](./research.md#r5-validación-de-los-datos)):
  - **Traducción de errores:**
    - cada `ErrorApi` de `src/api` (`sin-conexion`, `tiempo-agotado`, `respuesta-invalida`, `cancelada`) se traduce al `ResultadoBusqueda` del mismo `tipo`, y `buscarFicha` nunca rechaza;
    - si fallan ambas listas, se devuelve el error de la lista de capitales.
  - **Caché tras una falla:**
    - si falla la lista de banderas, la siguiente búsqueda vuelve a pedir **solo** banderas (capitales queda en caché);
    - una búsqueda cancelada no borra de la caché una descarga compartida en curso;
    - búsquedas A y B en curso que comparten la misma descarga pendiente: se aborta la `signal` de A → A devuelve `cancelada`, la descarga no se aborta (`fetch` no recibe la `signal` de A) y, al resolverse, B devuelve `encontrado` con la ficha; `fetch` se llamó una sola vez por lista.
  - **Respuesta inválida completa:**
    - cuerpo no JSON, `error: true` o `data` que no es arreglo → `respuesta-invalida`;
    - lista de capitales o de banderas vacía tras filtrar → `respuesta-invalida`, y ambas se borran de la caché.
  - **Elementos ignorados:** los elementos sin `name` o `iso2` de texto no vacío se ignoran, y Peru se sigue encontrando.
  - **Datos mal formados del país buscado:** `capital` no textual (por ejemplo, `42`), `iso3` ausente o `""`, o `flag` no textual en su elemento de banderas → `respuesta-invalida`, mientras Chile, de la misma lista, da `encontrado`.
- [X] T025 [P] [US3] Escribir `src/features/ficha/ficha.validacion.prop.test.ts` con fast-check, que cubre la regla general de validación de datos exigida por el Principio IV ([research.md §R5](./research.md#r5-validación-de-los-datos)). Usa generadores de elementos arbitrarios (`fc.anything()`) mezclados con elementos válidos (`fc.record` con `name`, `iso2`, `iso3`, `capital` y `flag`), y prueba estas propiedades:
  1. para cualesquiera arreglos `capitales` y `banderas` de `fc.array(fc.anything())`, `crearIndice` nunca lanza un error (devuelve un `IndicePaises` o `null`);
  2. toda clave de `indice.porNombre` proviene de un elemento que es objeto con `name` e `iso2` de texto no vacío, y es igual a `normalizarNombre(name)`;
  3. para cualquier índice y cualquier texto, `buscarEnIndice` nunca lanza, y si devuelve `encontrado`, `pais.capital` es `string` o `null`, y `pais.iso2` y `pais.iso3` son texto no vacío;
  4. para cualquier `flag` de texto que no empiece por `"https:"` (`fc.string().filter(s => !s.startsWith("https:"))`), el país encontrado tiene `bandera: null`.
- [X] T026 [P] [US3] Agregar a `src/features/ficha/ficha.component.test.ts`:
  - **Mensajes:** para `sin-conexion`, `tiempo-agotado` y `respuesta-invalida`, `[data-error]` muestra exactamente, en cada caso:
    - «No hay conexión. Revisa tu conexión a internet e inténtalo de nuevo.»;
    - «El servicio tardó demasiado en responder. Inténtalo de nuevo.»;
    - «No se pudo obtener la información del país. Inténtalo de nuevo.».

    En los tres casos hay un botón «Reintentar», la ficha está oculta, «Buscando…» ya no se ve y el formulario sigue visible (FR-014).
  - **Reintentar:** activarlo con clic y con teclado (foco + Enter) llama de nuevo a `buscarFicha` con el mismo texto de la última búsqueda, aunque el campo se haya editado después; muestra «Buscando…» y luego la ficha.
  - **Cancelada:** el resultado `cancelada` no muestra nada.

### Implementación de la historia 3

- [X] T027 [US3] Completar `src/features/ficha/ficha.service.ts`, hasta que pasen T024 y T025:
  - **Errores:** `buscarFicha` captura toda excepción; un `ErrorApi` se traduce por su `tipo` y cualquier otra excepción a `respuesta-invalida`.
  - **Caché:** si una lista falla con un error distinto de `cancelada`, se borra **solo esa** entrada de la caché; la cancelación de una búsqueda solo deja de esperar la promesa compartida, sin abortarla ni borrarla. Si `crearIndice` devuelve `null`, se borran ambas listas.
  - **Validación en `buscarEnIndice`:** devuelve `respuesta-invalida` si el elemento encontrado tiene `capital` que no es `string`, `iso3` que no es texto no vacío, o si existe un elemento de banderas con su `iso2` cuyo `flag` no es `string`.
- [X] T028 [US3] Completar `src/features/ficha/ficha.component.ts`, hasta que pase T026:
  - guarda el texto de la última búsqueda enviada (`ConsultaBusqueda`);
  - para `sin-conexion`, `tiempo-agotado` y `respuesta-invalida`, pinta en `[data-error]` el mensaje exacto de [contracts/ui.md](./contracts/ui.md) y un `<button type="button">Reintentar</button>`, que inicia una búsqueda nueva con ese texto por el mismo camino que `submit` (abortar la anterior, nuevo `idBusqueda`, «Buscando…»);
  - al pulsar «Reintentar», devuelve el foco a `#nombre-pais`, porque el botón desaparece al iniciar la búsqueda (corrección de la revisión de la Fase 5);
  - ignora `cancelada`.

**Punto de control**: las tres historias funcionan y todas las pruebas pasan.

---

## Fase 6: Acabado y verificación transversal

**Propósito**: comprobar la constitución y el [quickstart](./quickstart.md) completo.

- [X] T029 Ejecutar `npm run typecheck`, `npm test` y `npm run build`: los tres terminan sin errores y `dist/` contiene solo archivos estáticos
- [X] T030 [P] Verificar con una búsqueda en `src/` que `fetch(` solo aparece en `src/api/http.ts`, que no hay `innerHTML`, `outerHTML`, `insertAdjacentHTML` ni `document.write`, y que todos los textos visibles de `src/features/ficha/ficha.component.ts` están en español; corregir lo que no cumpla
- [X] T031 [P] Verificar que ninguna prueba usa la red: ejecutar `npm test` con la red desactivada y confirmar que todo pasa
- [X] T032 Ejecutar los 11 pasos de validación manual de `specs/001-ficha-base/quickstart.md` con `npm run dev` (incluidos Offline, red lenta y uso solo con teclado) y corregir en el archivo correspondiente cualquier diferencia con [spec.md](./spec.md)

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Configuración (Fase 1)**: sin dependencias.
- **Base (Fase 2)**: depende de la Fase 1; bloquea todas las historias.
- **Historia 1 (Fase 3)**: depende de la Fase 2.
- **Historias 2 y 3 (Fases 4 y 5)**: dependen de la Fase 3, porque completan los mismos
  archivos `ficha.service.ts` y `ficha.component.ts` que crea la historia 1. Entre sí son
  independientes y pueden hacerse en cualquier orden, pero editan los mismos archivos, así que
  conviene hacerlas en secuencia.
- **Acabado (Fase 6)**: depende de todas las historias.

### Dentro de cada historia

- Las pruebas se escriben primero y deben fallar (T011–T015 antes de T016–T020; T021–T022 antes
  de T023; T024–T026 antes de T027–T028).
- `normalizar.ts` (T016) antes que `ficha.service.ts` (T017); servicio y secciones (T017, T018)
  antes que el componente (T019); componente antes que `main.ts` (T020).

### Oportunidades de paralelismo

- Fase 1: T002–T006 en paralelo tras T001.
- Fase 2: T009 en paralelo con T008.
- Historia 1: T011–T015 en paralelo; luego T016 y T018 en paralelo.
- Historia 2: T021 y T022 en paralelo.
- Historia 3: T024, T025 y T026 en paralelo.
- Acabado: T030 y T031 en paralelo.

---

## Ejemplo de paralelismo: historia 1

```text
# Pruebas de la historia 1, a la vez:
T011 datos de prueba en src/features/ficha/datos-prueba.ts
T012 ejemplos en src/features/ficha/normalizar.test.ts
T013 propiedades en src/features/ficha/normalizar.prop.test.ts
T014 casos normales en src/features/ficha/ficha.service.test.ts
T015 casos de la historia 1 en src/features/ficha/ficha.component.test.ts

# Después, a la vez:
T016 src/features/ficha/normalizar.ts
T018 src/features/ficha/secciones.ts
```

---

## Estrategia de implementación

### Primero el MVP (solo la historia 1)

1. Fase 1 → Fase 2 → Fase 3.
2. **Detenerse y validar**: buscar «Peru», «  pERU », «Bolivia» y «Antarctica» con `npm run dev`.
3. El responsable revisa lo generado antes de seguir (Principio VI).

### Entrega incremental

1. Configuración + Base → cliente HTTP probado.
2. + Historia 1 → MVP: buscar y ver la ficha; secciones listas para el resto del equipo.
3. + Historia 2 → validación y «No se encontró el país».
4. + Historia 3 → fallas con «Reintentar».
5. Acabado → `/speckit-converge` hasta que reporte `Converged`, y luego el PR con dos
   aprobaciones con comentario de revisión.

---

## Notas

- [P] = archivos distintos y sin dependencias pendientes.
- Las otras funcionalidades del equipo no deben empezar a registrar secciones hasta que T018 y
  T019 estén integrados en `main`.
- Hacer un commit al terminar cada tarea o grupo lógico; detenerse en cada punto de control para
  validar la historia por separado.
