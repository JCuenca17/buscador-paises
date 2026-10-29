# Implementation Plan: Búsqueda inteligente

**Branch**: `005-busqueda-inteligente` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Responsable**: Klismann | **Revisores del pull request**: Jose y Gabriel

**Input**: Feature specification from `specs/005-busqueda-inteligente/spec.md`

## Summary

Agregar búsqueda por nombres en español y sugerencias accesibles, conservando el formulario, el flujo de consulta y los estados de la ficha base. Un servicio propio obtiene y mantiene en memoria los nombres de CountriesNow por medio de `src/api/http.ts`, crea nombres españoles con `Intl.DisplayNames` en locale `es` y tipo `region` a partir de `iso2`, y resuelve variantes inglesas/españolas con comparación insensible a tildes. `normalizarNombre` se reutiliza sin cambios para espacios y minúsculas; el servicio agrega localmente la eliminación de marcas diacríticas.

La composición registra las sugerencias y entrega un resolvedor de consulta a la ficha base. El resolvedor produce el nombre canónico en inglés que espera `buscarFicha`; la ficha base conserva validación, búsqueda, cancelación, errores y renderizado. La integración se limita a ese adaptador y al registro en `src/main.ts`; no se reescribe el formulario ni el servicio base.

## Technical Context

**Language/Version**: TypeScript, target ES2022; HTML y CSS nativos.

**Primary Dependencies**: Ninguna nueva. `obtenerJson` del cliente compartido; `Intl.DisplayNames` del navegador; Vitest, jsdom y fast-check ya están instalados.

**Storage**: Caché en memoria de sesión; sin almacenamiento persistente.

**Testing**: Vitest en jsdom; pruebas unitarias, de componente e integración con respuestas de red simuladas; pruebas basadas en propiedades con fast-check.

**Target Platform**: Navegadores compatibles con ES2022 e `Intl.DisplayNames`; archivos estáticos empaquetados con Vite.

**Project Type**: SPA web de una sola página, sin framework de interfaz.

**Performance Goals**: Una descarga de la lista por sesión de página; filtrar localmente el catálogo de aproximadamente 250 países, sin una solicitud por tecla; mostrar como máximo 5 sugerencias.

**Constraints**: Datos de países solo de CountriesNow mediante `obtenerJson`; timeout compartido de 10 segundos; textos en español; DOM seguro mediante `textContent`; interacción solo con teclado; no modificar `normalizar.ts` sin una necesidad demostrada, justificación en el plan y aprobación.

**Scale/Scope**: Un catálogo de países devuelto por `/countries/capital`, un campo existente y una lista de hasta cinco sugerencias.

## Constitution Check

### Antes de investigación y diseño

- **I. Simplicidad**: PASS. No se añade dependencia; se usan capacidades nativas del navegador.
- **II. Fuente de datos única**: PASS. CountriesNow es el único origen y `obtenerJson` aplica validación, clasificación de errores y timeout.
- **III. Arquitectura por capas y por funcionalidad**: PASS CONDICIONAL. Servicio y componente nuevos vivirán en `src/features/busqueda-inteligente`. La composición necesita un adaptador pequeño en `src/features/ficha/ficha.component.ts` y su registro en `src/main.ts`; no se cambia `src/api` ni se reemplaza el flujo base. Jose, responsable de la ficha, debe aprobar ese cambio antes de implementarlo o integrarlo.
- **IV. Pruebas obligatorias**: PASS. Se planifican pruebas Vitest/jsdom del servicio, interfaz, integración y errores; fast-check para normalización/matching; todas las llamadas de red se simulan.
- **V. Español y accesibilidad**: PASS. Etiquetas y estados en español, navegación de teclado y lector de pantalla, datos externos insertados como texto.
- **VI. Revisión humana**: PASS CONDICIONAL. Klismann revisará cada artefacto. El PR requiere las aprobaciones comentadas de Jose y Gabriel.

**Gate**: no hay dependencias nuevas ni cambios en el cliente HTTP. La única modificación fuera de la feature es el adaptador mínimo de integración exigido por FR-007; queda pendiente de aprobación explícita de Jose. Si Jose no la aprueba, detener la implementación y acordar otro punto de integración antes de modificar su funcionalidad.

## Phase 0: Research

Las decisiones y alternativas constan en [research.md](./research.md): fuente de países, caché, normalización, filtrado de sugerencias, aliases ambiguos, integración y estrategia de pruebas. No quedan preguntas técnicas bloqueantes para descomponer tareas.

## Phase 1: Design and Contracts

- [Modelo de datos](./data-model.md): catálogo, país sugerible, alias, consulta y sugerencia activa.
- [Contrato de UI e integración](./contracts/ui.md): combobox accesible y adaptador con la ficha.
- [Guía de validación](./quickstart.md): comprobaciones automatizadas y manuales.

### Revisión de constitución después del diseño

- No se añade backend, framework, almacenamiento persistente ni dependencia.
- El servicio obtiene datos solo con el cliente de `src/api`; las pruebas simulan la red.
- `normalizarNombre` se importa y reutiliza sin modificar `src/features/ficha/normalizar.ts`.
- La eliminación de diacríticos es una extensión local y tendrá propiedades fast-check.
- El componente controla solo la lista; la ficha base mantiene validación, búsqueda, estados, errores y resultado.
- Las ediciones en `ficha.component.ts` y `main.ts` están delimitadas y justificadas aquí, pero requieren aprobación de Jose antes de implementación.
- Se usa `textContent`, todo texto de interfaz es español y la selección está disponible con teclado.

**Gate posterior**: PASS CONDICIONAL a la revisión humana de este plan y a la aprobación de Jose para el adaptador antes de implementar. Los revisores del PR son Jose y Gabriel; cada uno deja el comentario de revisión exigido por la constitución.

## Project Structure

### Documentation (this feature)

```text
specs/005-busqueda-inteligente/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ui.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/
├── main.ts                                      # registra la integración
└── features/
    ├── ficha/
    │   └── ficha.component.ts                   # adaptador, sujeto a aprobación
    └── busqueda-inteligente/
        ├── busqueda.service.ts                   # catálogo, aliases y normalización extendida
        ├── busqueda.service.test.ts
        ├── busqueda.normalizar.prop.test.ts      # propiedades fast-check
        ├── busqueda.component.ts                 # sugerencias e interacción accesible
        ├── busqueda.component.test.ts
        └── busqueda.css
```

**Structure Decision**: un solo proyecto web Vite, organizado por feature y por capa. El servicio nuevo no accede al DOM; el componente no llama a la red; `main.ts` es el punto de composición ya previsto por el repositorio.

## Complexity Tracking

| Excepción / cambio de propiedad | Motivo | Alternativa más simple descartada |
|---------------------------------|--------|-----------------------------------|
| Adaptador opcional en `ficha.component.ts` y registro en `main.ts` | El submit base pasa el valor del campo directamente a `buscarFicha`; para reconocer aliases españoles sin reemplazar el flujo, necesita resolver la consulta antes de esa llamada. Requiere aprobación de Jose. | Interceptar el submit fuera y modificar/restaurar el input crea carreras entre Enter y el botón; duplicar el formulario o el servicio base duplicaría estados y rompería la separación. |
| `normalizarNombre` no se modifica | Su contrato probado es trim, colapso de espacios y minúsculas; quitar tildes globalmente cambia el comportamiento de la ficha base. | Alterar una utilidad compartida para un único feature arriesga regresiones; una clave local reutiliza la función y agrega eliminación de diacríticos solo donde hace falta. |
