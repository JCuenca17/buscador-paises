# Tasks: Ciudades del país

Basado en spec.md, plan.md, data-model.md y contracts/ciudades.md. Pruebas obligatorias según constitución. Responsable: Paulo Hidalgo. La revisión humana de fases es pendiente y se registra aparte; las casillas indican ejecución técnica, no aprobación.

## Phase 1: Setup

- [x] T001 Comprobar dependencias existentes y las 109 pruebas base de package.json; no agregar paquetes.
- [x] T002 Registrar contrato de integración y dependencia de 001-ficha-base en specs/004-ciudades/plan.md.

## Phase 2: Foundational

- [x] T003 Probar normalización idempotente, equivalencia Unicode y validación arbitraria en src/features/ciudades/ciudades.prop.test.ts.
- [x] T004 Implementar normalizarFiltro, índice ISO3 y validación en src/features/ciudades/ciudades.service.ts: «iso2: cadena de dos letras; iso3: cadena de tres letras», «country: cadena no vacía tras trim», «cities: arreglo de cadenas no vacías tras trim» (FR-002, FR-004, FR-013).

## Phase 3: US1 - Consultar ciudades

Meta: lista ordenada con navegación y vacíos; ensayo independiente con 21 nombres.

- [x] T005 [US1] Probar ruta, identidad ISO3, orden, vacíos y fila mal formada en src/features/ciudades/ciudades.service.test.ts (FR-001, FR-002, FR-006, FR-013).
- [x] T006 [US1] Implementar obtenerCiudades y catálogo en src/features/ciudades/ciudades.service.ts (FR-009).
- [x] T007 [US1] Probar 0/1/20/21/40/41 ciudades, límites, contador y texto seguro en src/features/ciudades/ciudades.component.test.ts (FR-003, FR-005, FR-006, FR-012, SC-001).
- [x] T008 [US1] Implementar sección, lista, contador y navegación accesible en src/features/ciudades/ciudades.component.ts y ciudades.css (FR-001 a FR-003, FR-005, FR-011).

## Phase 4: US2 - Filtrar ciudades

Meta: filtro sobre toda la lista; ensayo independiente con nombres acentuados fuera de primera página.

- [x] T009 [US2] Probar mayúsculas, tildes, subcadena, cero coincidencias, vaciado y reinicio de página en src/features/ciudades/ciudades.component.test.ts (FR-004 a FR-007, SC-002).
- [x] T010 [US2] Conectar filtro local y actualización persistente de controles en src/features/ciudades/ciudades.component.ts (FR-004, FR-007, FR-011).

## Phase 5: US3 - Recuperación y concurrencia

Meta: errores distintos y reintento sin perder ficha; una descarga concurrente.

- [x] T011 [US3] Probar caché, concurrencia, cancelación independiente, offline, timeout 10 s, HTTP/JSON inválido y reintento en src/features/ciudades/ciudades.service.test.ts (FR-008 a FR-010, FR-013, SC-003, SC-004).
- [x] T012 [US3] Completar caché por promesa, liberación por identidad y retirada de listeners en src/features/ciudades/ciudades.service.ts (FR-009, FR-010).
- [x] T013 [US3] Probar carga, mensajes, reintento, foco y abort tardío en src/features/ciudades/ciudades.component.test.ts; implementar estados en ciudades.component.ts (FR-008, FR-010, FR-011).

## Phase 6: Integration and Polish

- [x] T014 Registrar sección desde src/main.ts y probar ficha real, nueva búsqueda y errores locales en src/features/ciudades/ciudades.integracion.test.ts (FR-001, FR-007, FR-010).
- [x] T015 Ejecutar npm test, npx tsc --noEmit y npm run build; documentar resultados en specs/004-ciudades/revision.md.
- [ ] T016 Validar en navegador lista, teclado, filtro, navegación, vacío/no encontrado y anchos móvil/escritorio; registrar evidencia y límites en specs/004-ciudades/revision.md (SC-005).
- [x] T017 Contrastar código con FR-001 a FR-013, SC-001 a SC-005, plan y tareas; registrar convergencia y hallazgos reales en specs/004-ciudades/revision.md.

## Dependencies and Strategy

Setup -> Foundational -> US1 -> US2 -> US3 -> Integration. MVP: US1. Los ensayos puros de propiedades y servicio pueden prepararse en paralelo en archivos distintos; el componente se modifica secuencialmente. Ejecutar pruebas específicas por fase, y batería completa al integrar. Commits separados por especificación, plan, tareas, servicio, componente y validación.

## Human Gates

Pendientes fuera de las tareas de construcción: revisión de Paulo de los artefactos y cambios, integración aprobada de la ficha base, y dos aprobaciones con comentario de Klismann y José. No se interpreta una casilla técnica como sustituto de esas condiciones.

## Phase 7: Convergence

- [ ] T018 Completar la validación de navegador de T016 con URL verificada, anchos móvil/escritorio y teclado nativo; registrar resultados observados en specs/004-ciudades/revision.md per SC-005 y plan: accesibilidad (partial).
