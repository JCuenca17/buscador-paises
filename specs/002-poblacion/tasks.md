# Tasks: Población del país

**Input**: `specs/002-poblacion/` · **Branch**: `002-poblacion`

## Format: `[ID] [P?] [US?] Description`

- **[P]**: se puede ejecutar en paralelo.
- **[USn]**: historia de usuario de la spec.

## Phase 1: Setup

- [ ] T001 Crear `src/features/poblacion/` con archivos vacíos según plan.md.

## Phase 2: Servicio (bloquea las historias)

- [ ] T002 Escribir pruebas de `obtenerPoblacion` en `src/features/poblacion/poblacion.service.test.ts` (disponible, sin datos, errores, cache, cancelación).
- [ ] T003 Implementar `poblacion.service.ts`: índice por `iso3`, validación de filas, año máximo, mapeo de `ErrorApi`.
- [ ] T004 [P] Pruebas de propiedades en `poblacion.prop.test.ts`: el año devuelto es el máximo; la cifra se formatea sin perder dígitos.

## Phase 3: US1 - Consultar la población (P1)

- [ ] T005 [US1] Pruebas de componente: cifra con separadores, año visible, capital y bandera intactas.
- [ ] T006 [US1] Implementar `poblacion.component.ts` con estado disponible y estado cargando.

## Phase 4: US2 - Sin datos (P2)

- [ ] T007 [US2] Pruebas: país ausente y `populationCounts` vacía muestran «Sin datos».
- [ ] T008 [US2] Implementar el estado «Sin datos» en el componente.

## Phase 5: US3 - Errores y reintento (P3)

- [ ] T009 [US3] Pruebas: cada error muestra su mensaje y botón Reintentar; Reintentar recupera la cifra.
- [ ] T010 [US3] Implementar los tres mensajes de error y el botón Reintentar.
- [ ] T011 [US3] Pruebas de integración: cambiar de país descarta respuesta tardía; una descarga por sesión.

## Phase 6: Integración y verificación

- [ ] T012 Descomentar `registrarSeccion(seccionPoblacion)` en `src/main.ts`.
- [ ] T013 Ejecutar `npm test`, `npm run typecheck` y `npm run build`.
- [ ] T014 Validación manual con un país presente y otro ausente, y navegación solo con teclado.

## Dependencies

- T002 → T003 → T004.
- Historias US1, US2 y US3 dependen de Phase 2.
- T012 depende de US1 a US3.
