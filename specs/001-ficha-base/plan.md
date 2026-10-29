# Plan de implementación: Ficha base

**Rama**: `001-ficha-base` | **Fecha**: 2026-10-29 | **Especificación**: [spec.md](./spec.md)

**Entrada**: especificación de la funcionalidad en `specs/001-ficha-base/spec.md`

## Resumen

El usuario escribe el nombre de un país (en inglés, como lo entrega la fuente) y ve una ficha con
nombre, capital y bandera, con estados de carga, validación, «No se encontró el país» y tres
fallas con «Reintentar».

Enfoque técnico:
- **Fuente de datos:** se descargan una vez por sesión dos listas de CountriesNow, la de capitales
  y la de banderas. Se combinan por `iso2` y se busca por nombre normalizado. Un país no existe si
  su nombre no está en la lista de capitales.
- **Cliente HTTP:** vive en `src/api`, impone el límite de 10 s con `AbortController` y clasifica
  los errores.
- **Organización:** la funcionalidad vive en `src/features/ficha`, con el servicio (sin DOM)
  separado del componente.
- **Búsquedas superpuestas:** se resuelven cancelando la anterior y comparando un identificador
  de búsqueda.
- **Extensión:** la ficha expone un registro de secciones para que las otras funcionalidades se
  agreguen sin tocar este código.

## Contexto técnico

**Lenguaje/versión**: TypeScript 7.0.2 (modo `strict`), HTML y CSS sin preprocesadores.
**Dependencias principales**: ninguna de ejecución. De desarrollo: Vite 8.3.5, Vitest 5.0.5,
jsdom 29.1.1, fast-check 4.10.2, TypeScript 7.0.2 ([research.md §R1](./research.md#r1-versiones-de-las-herramientas)).
**Almacenamiento**: no aplica. Caché en memoria de dos listas durante la sesión.
**Pruebas**: Vitest con entorno jsdom, y fast-check para la normalización y la búsqueda. `fetch`
siempre simulado.
**Plataforma objetivo**: navegadores actuales de escritorio y móviles. Desarrollo con Node.js
`^22.13.0 || ^24.0.0 || >=26.0.0`, el rango común de Vite 8, Vitest 5 y jsdom 29.
**Tipo de proyecto**: aplicación web estática de una sola página (SPA).
**Objetivos de rendimiento**: con las listas ya en caché, la búsqueda es inmediata (sin red). La
primera búsqueda depende del servicio, con un tope de 10 s.
**Restricciones**:
- límite de 10 s por consulta;
- `fetch` solo en `src/api` y solo hacia CountriesNow;
- datos insertados con `textContent`;
- interfaz en español, usable con teclado;
- la entrada acepta 100 caracteres como máximo.
**Escala/alcance**: una pantalla; 250 países en la lista de capitales y 222 en la de banderas.

## Verificación de la constitución

*Compuerta: debe pasar antes de la Fase 0 y se revisa de nuevo tras la Fase 1.*

| Principio | Cómo lo cumple el plan | Estado |
|-----------|------------------------|--------|
| I. Simplicidad | HTML, CSS y TS sin frameworks, con Vite; sin backend ni base de datos; cero dependencias de ejecución. Las de desarrollo son las del Principio IV, más TypeScript, que el Principio I ya nombra. | ✅ |
| II. Fuente de datos única | Solo `countriesnow.space/api/v0.1` vía `fetch`. Las banderas de `upload.wikimedia.org` se cargan con `<img>`, sin `fetch` (permitido). Límite de 10 s y tres fallas clasificadas en `src/api`. Ningún error deja la página en blanco (el formulario siempre visible, estados en [data-model.md](./data-model.md#estados-de-la-interfaz)). | ✅ |
| III. Capas y funcionalidad | `src/api` es el único usuario de `fetch`. `src/features/ficha` separa el servicio (sin DOM) del componente (sin red). Las otras funcionalidades se agregan con `registrarSeccion` sin modificar `ficha`. | ✅ (ver nota 1) |
| IV. Pruebas obligatorias | Vitest y jsdom en todos los módulos; fast-check para las reglas generales de normalización y búsqueda (`normalizar.prop.test.ts`) y de validación de datos (`ficha.validacion.prop.test.ts`); no hay formateo de números en esta funcionalidad; `fetch` simulado; quickstart con la tabla de requisitos por archivo de pruebas. | ✅ |
| V. Español y accesible | Textos en español ([contracts/ui.md](./contracts/ui.md)), `<label>`, `textContent`, `role="status"`/`alert`, foco visible y uso completo con teclado. | ✅ |
| VI. Revisión humana | El responsable revisa este plan antes de `/speckit-tasks`; el PR necesita dos aprobaciones con comentario. | ✅ (proceso) |

**Nota 1**: como primera funcionalidad, `001-ficha-base` crea la base compartida del proyecto:
`package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `src/main.ts`, `src/styles.css` y
`src/api`. Las demás funcionalidades solo deberían añadir en `src/main.ts` su línea
`registrarSeccion(...)` ([contracts/secciones-ficha.md](./contracts/secciones-ficha.md)), y
justificarla en su propio plan.

**Resultado de la compuerta (antes y después del diseño)**: aprobada, sin violaciones.

## Estructura del proyecto

### Documentación (esta funcionalidad)

```text
specs/001-ficha-base/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── http-client.md
│   ├── ficha-service.md
│   ├── secciones-ficha.md
│   └── ui.md
├── checklists/requirements.md
└── tasks.md             # lo genera /speckit-tasks
```

### Código fuente (raíz del repositorio)

```text
index.html                     # <div id="app">; carga src/main.ts (el marcado de
                               # contracts/ui.md lo crea montarFicha)
package.json                   # scripts dev, build, test, typecheck;
                               # engines.node "^22.13.0 || ^24.0.0 || >=26.0.0"
.nvmrc                         # 24
tsconfig.json                  # strict, DOM, ESNext
vite.config.ts                 # incluye test: { environment: "jsdom" }
src/
├── main.ts                    # punto de composición: registra secciones y monta la ficha
├── styles.css                 # estilos, :focus-visible
├── vite-env.d.ts              # tipos de Vite para importar styles.css desde main.ts
├── api/
│   ├── http.ts                # obtenerJson, ErrorApi, URL_BASE
│   └── http.test.ts
└── features/
    └── ficha/
        ├── tipos.ts           # ElementoCapital, ElementoBandera, PaisFicha (con iso2 e iso3),
        │                      # ResultadoBusqueda
        ├── normalizar.ts      # normalizarNombre
        ├── normalizar.test.ts
        ├── normalizar.prop.test.ts
        ├── ficha.service.ts   # validadores, crearIndice, buscarEnIndice, buscarFicha, caché
        ├── ficha.service.test.ts
        ├── ficha.validacion.prop.test.ts # propiedades de la validación de datos (§R5)
        ├── datos-prueba.ts    # apoyo para las pruebas: listas simuladas y simularFetch
        ├── secciones.ts       # registrarSeccion, SeccionFicha
        ├── ficha.component.ts # montarFicha(raiz): formulario, estados, idBusqueda, secciones
        └── ficha.component.test.ts
```

**Decisión de estructura**: proyecto único, con las pruebas junto al código de cada módulo
(`*.test.ts`, y `*.prop.test.ts` para las basadas en propiedades), así cada carpeta
`src/features/<funcionalidad>` contiene todo lo suyo.

## Decisiones clave

Resumen; el detalle está en [research.md](./research.md).

1. **Detección de país inexistente** (FR-006): se busca en la lista de capitales por nombre
   normalizado. Nunca se interpretan los mensajes de error del servicio (§R2).
2. **Caché** (§R4): se guarda la promesa de cada lista. Si una falla, se borra solo esa, y
   «Reintentar» la vuelve a pedir.
3. **Validación en dos niveles** (§R5):
   - Al construir el índice se ignoran los elementos sin `name` o `iso2` válidos.
   - Si el país buscado tiene datos mal formados (`capital`, `iso3` o `flag`), esa búsqueda da
     `respuesta-invalida`.
   - Toda la respuesta es `respuesta-invalida` solo si no es JSON, si `error` es `true`, si
     `data` no es un arreglo o si la lista queda vacía tras filtrar.
   - Una bandera que no use `https:` se trata como inexistente.
4. **Cancelación** (§R3, §R4, §R7): la señal de la búsqueda solo hace que `buscarFicha` deje de
   esperar y devuelva `cancelada`, que nunca se muestra. No se pasa a las descargas en caché, que
   así sirven a la búsqueda siguiente. El `idBusqueda` descarta los resultados tardíos.
5. **Secciones** (§R8): los errores de una sección quedan aislados dentro de ella, y la ficha base
   no cambia.
6. **`PaisFicha` incluye `iso2` e `iso3`** ([data-model.md](./data-model.md#paisficha)): las
   otras funcionalidades los usan para relacionar sus listas; por ejemplo, la de población se une
   por `iso3`.

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Integrantes con un Node fuera del rango común | `engines.node` y `.nvmrc`; el quickstart lo comprueba primero. Node 24 (el que ya usa el equipo) está dentro del rango. |
| La API cambia nombres o deja de responder | Validación en dos niveles y mensajes de falla; las pruebas usan datos simulados con las anomalías reales de §R2. |
| Un país pierde su `name` o `iso2` en la fuente | Se ignora y su búsqueda da «No se encontró el país»; riesgo aceptado en §R5 para no bloquear a los demás países. |
| 26 países sin bandera en la fuente | Comportamiento especificado: «Bandera no disponible» (FR-015). |

## Seguimiento de complejidad

Sin violaciones de la constitución que justificar.
