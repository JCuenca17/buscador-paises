# Feature Specification: Ciudades del país

**Feature Branch**: `004-ciudades`
**Created**: 2026-10-29
**Status**: Propuesta para revisión humana
**Responsable**: Paulo Hidalgo
**Input**: Agregar a la ficha las ciudades del país, orden alfabético, filtro inmediato sin distinguir mayúsculas ni tildes, contador y páginas de 20 ciudades. Mostrar mensajes cuando no haya ciudades o coincidencias.

## User Scenarios & Testing

### User Story 1 - Consultar ciudades (Priority: P1)

Como visitante quiero consultar las ciudades del país encontrado sin perder su capital y bandera.

**Why this priority**: Es el valor principal de la funcionalidad.
**Independent Test**: Abrir la ficha de un país con 21 ciudades y recorrer ambas páginas.

**Acceptance Scenarios**:

1. **Given** un país con 21 ciudades, **When** aparece su ficha, **Then** la sección Ciudades muestra las primeras 20 en orden alfabético y un total de 21 resultados.
2. **Given** la primera página, **When** se pulsa Siguiente, **Then** aparece la ciudad restante; Anterior regresa a las primeras 20 y los extremos no permiten avanzar fuera de rango.
3. **Given** un país sin ciudades registradas o ausente del catálogo, **When** se consulta, **Then** se muestra «No hay ciudades registradas para este país» y se conserva la ficha base.

### User Story 2 - Filtrar ciudades (Priority: P2)

Como visitante quiero encontrar ciudades escribiendo parte de su nombre.

**Why this priority**: Evita recorrer listas extensas.
**Independent Test**: Escribir «HUANUCO» y encontrar «Huánuco» sin enviar un formulario.

**Acceptance Scenarios**:

1. **Given** ciudades distribuidas en varias páginas, **When** se escribe un filtro, **Then** se buscan coincidencias por subcadena en toda la lista sin distinguir mayúsculas ni tildes y se actualiza el total.
2. **Given** una página posterior a la primera, **When** cambia el filtro, **Then** se vuelve a la primera página de coincidencias.
3. **Given** un filtro sin coincidencias, **When** termina la edición, **Then** aparecen cero resultados y «No hay ciudades que coincidan con el filtro»; al borrarlo se recupera la lista completa.
4. **Given** filtro o página activos, **When** cambia el país, **Then** se reinician ambos sin mostrar resultados tardíos del país anterior.

### User Story 3 - Recuperarse de errores (Priority: P3)

Como visitante quiero entender los fallos y volver a intentar sin perder la ficha.

**Why this priority**: La fuente externa puede fallar.
**Independent Test**: Simular cada tipo de error, reintentar y comprobar que la sección se recupera.

**Acceptance Scenarios**:

1. **Given** una consulta en curso, **When** se espera la respuesta, **Then** se muestra «Cargando ciudades…».
2. **Given** un fallo de conexión, tiempo agotado o respuesta inválida, **When** termina la consulta, **Then** se muestra un mensaje diferente en español para cada caso y un botón Reintentar; capital y bandera permanecen visibles.
3. **Given** una descarga válida previa en la misma sesión de página, **When** se consulta otro país, se filtra o se pagina, **Then** se reutilizan los datos sin otra descarga de ciudades, incluso sin conexión.
4. **Given** dos consultas que esperan la misma descarga, **When** se reemplaza una de ellas, **Then** la otra continúa y solo ella actualiza su sección.

### Edge Cases

- Listas con 0, 1, 20, 21 y 40 ciudades; no debe existir una página final vacía.
- Un filtro vacío o de espacios equivale a no filtrar; se ignoran espacios extremos.
- Una ciudad con apariencia de HTML se presenta literalmente como texto.
- Datos mal formados del país consultado producen error, nunca se presentan como ausencia de ciudades.
- Filas mal formadas de otros países no impiden consultar un país válido.
- Tras fallar una descarga se permite otra al reintentar; «una descarga por sesión» se refiere a una descarga exitosa reutilizable.

## Requirements

### Functional Requirements

- **FR-001**: La ficha DEBE añadir una sección Ciudades del país seleccionado, sin alterar la capital ni la bandera.
- **FR-002**: Las ciudades DEBEN conservar sus nombres y mostrarse en orden alfabético español.
- **FR-003**: La lista DEBE mostrar como máximo 20 ciudades por página y permitir ir a la anterior y siguiente con límites correctos.
- **FR-004**: Un campo etiquetado «Filtrar ciudades» DEBE filtrar por subcadena al escribir sobre toda la lista, sin distinguir mayúsculas ni tildes.
- **FR-005**: El contador DEBE indicar el total filtrado, el rango visible y la página; no confundir el total con la cantidad de la página.
- **FR-006**: La sección DEBE distinguir ausencia de ciudades de ausencia de coincidencias con los mensajes de los escenarios.
- **FR-007**: Cambiar el filtro o el país DEBE reiniciar la página; cambiar el país también DEBE vaciar el filtro.
- **FR-008**: La sección DEBE indicar carga y distinguir sin conexión, tiempo agotado a los 10 segundos y respuesta inválida, con posibilidad de reintento.
- **FR-009**: Los datos DEBEN descargarse una sola vez por sesión de página y reutilizarse también en consultas simultáneas; los fallos permiten reintentar.
- **FR-010**: Reemplazar una consulta DEBE impedir sus actualizaciones tardías sin cancelar la descarga que necesita otra consulta.
- **FR-011**: Campo, navegación y reintento DEBEN funcionar con teclado, foco visible y anuncios accesibles del contador; todos los textos de interfaz DEBEN estar en español.
- **FR-012**: Los nombres externos DEBEN mostrarse como texto, sin interpretarse como contenido ejecutable.
- **FR-013**: Una respuesta mal formada del país solicitado DEBE distinguirse de una lista válida vacía; datos defectuosos de otro país no DEBEN bloquearlo.

### Key Entities

- **País**: Identidad del país ya seleccionado y su relación con las ciudades registradas.
- **Catálogo de ciudades**: Nombres de ciudades por país, reutilizables en la sesión.
- **Vista de ciudades**: Filtro actual, coincidencias ordenadas, página y total de resultados.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Con 41 ciudades se recorren 3 páginas de 20, 20 y 1, sin omisiones ni duplicados añadidos por la navegación.
- **SC-002**: «HUANUCO», «huánuco» y su forma Unicode descompuesta encuentran los mismos resultados.
- **SC-003**: Filtrar y recorrer dos países en la misma sesión requiere una sola descarga exitosa del catálogo.
- **SC-004**: Los tres fallos previstos muestran mensajes diferenciados y permiten reintentar conservando la ficha.
- **SC-005**: Se puede completar filtro, navegación y reintento solo con teclado; ningún nombre de ciudad se interpreta como HTML.

## Assumptions

- Depende de la ficha base de José. Al comenzar, `main` solo tenía el esqueleto; se usa `001-ficha-base` (453da94) y no se integra ciudades a main hasta aprobar e integrar esa base.
- La sesión dura hasta recargar/cerrar la página; no se requiere persistencia en el disco.
- Se conservan nombres y entradas repetidas de la fuente; no se fusionan ciudades por tildes ni se traducen nombres.
- País ausente del catálogo equivale a sin ciudades registradas. Un catálogo global vacío o sin países identificables es respuesta inválida.
- El alcance no incluye mapas, datos de población ni mejoras al buscador de países.

## Clarifications

### Session 2026-10-29

No se formularon preguntas: la guía y la revisión de la ficha resolvieron el alcance. Los valores por defecto anteriores son decisiones propuestas por el agente, pendientes de revisión de Paulo; no son respuestas ni aprobaciones humanas.
