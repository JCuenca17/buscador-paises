# Feature Specification: Población del país

**Feature Branch**: `002-poblacion`
**Created**: 2026-10-29
**Status**: Borrador; pendiente de revisión humana
**Input**: Agregar a la ficha del país la población total más reciente disponible en la fuente, con su año de referencia, cifra en formato español, estado de carga, mensajes de error diferenciados con reintento y mensaje «Sin datos» cuando el país no aparece en la fuente.

## User Scenarios & Testing

### User Story 1 - Consultar la población (Priority: P1)

Como visitante quiero ver la población del país buscado, junto con el año al que corresponde el dato, sin perder la capital ni la bandera.

**Why this priority**: Es el valor principal de la funcionalidad.
**Independent Test**: Buscar un país presente en la fuente y comprobar que la sección muestra la última cifra y su año.

**Acceptance Scenarios**:

1. **Given** un país con registros de población, **When** aparece su ficha, **Then** la sección Población muestra la cifra del año más reciente con formato «33.715.000 hab.» y el año de referencia (p. ej. «Dato de 2018»).
2. **Given** un país con una cifra de población, **When** se muestra la ficha, **Then** capital y bandera siguen visibles sin cambios.
3. **Given** una consulta de población en curso, **When** se espera la respuesta, **Then** se muestra «Cargando población…».

### User Story 2 - Sin datos (Priority: P2)

Como visitante quiero saber cuándo la fuente no tiene población para el país, sin que parezca un error.

**Why this priority**: Distingue ausencia de datos de fallo técnico.
**Independent Test**: Buscar un país ausente de la fuente y comprobar el mensaje «Sin datos».

**Acceptance Scenarios**:

1. **Given** un país ausente de la fuente, **When** termina la consulta, **Then** se muestra «Sin datos» en la sección y se conserva la ficha base.
2. **Given** un país presente en la fuente sin registros de población, **When** termina la consulta, **Then** se muestra «Sin datos».

### User Story 3 - Recuperarse de errores (Priority: P3)

Como visitante quiero entender por qué falló la consulta y volver a intentarlo sin recargar la ficha.

**Why this priority**: La fuente externa puede fallar.
**Independent Test**: Simular cada tipo de error, pulsar Reintentar y comprobar que la sección se recupera.

**Acceptance Scenarios**:

1. **Given** un fallo de conexión, **When** termina la consulta, **Then** se muestra un mensaje de «sin conexión» en español y un botón Reintentar; capital y bandera permanecen visibles.
2. **Given** una consulta que supera 10 segundos, **When** termina, **Then** se muestra un mensaje de «tiempo agotado» distinto y un botón Reintentar.
3. **Given** una respuesta inválida de la fuente, **When** termina, **Then** se muestra un mensaje de «respuesta inválida» distinto y un botón Reintentar.
4. **Given** un error mostrado, **When** se pulsa Reintentar, **Then** se vuelve a consultar y, si tiene éxito, se muestra la cifra.
5. **Given** una descarga exitosa previa en la misma sesión de página, **When** se consulta otro país, **Then** se reutilizan los datos sin nueva descarga, incluso sin conexión.

### Edge Cases

- Respuesta de la fuente con una cifra no numérica o registro sin año: el país se trata como respuesta inválida, nunca como «Sin datos».
- Varios registros para el mismo país: se muestra el año más reciente.
- Registros defectuosos de otros países no impiden mostrar un país válido.
- Tras fallar una descarga se permite otra al reintentar.
- Cambiar de país mientras una consulta está en curso: no se muestran resultados tardíos del país anterior.
- Cifra 0: se muestra «0 hab.», no «Sin datos».

## Requirements

### Functional Requirements

- **FR-001**: La ficha DEBE añadir una sección Población para el país seleccionado, sin alterar la capital ni la bandera.
- **FR-002**: La sección DEBE mostrar la cifra del año más reciente disponible, con separadores de miles en formato español y la unidad «hab.».
- **FR-003**: La sección DEBE mostrar el año de referencia del dato junto a la cifra.
- **FR-004**: La sección DEBE indicar carga con el texto «Cargando población…».
- **FR-005**: Si el país no aparece en la fuente o no tiene registros de población, la sección DEBE mostrar «Sin datos».
- **FR-006**: La sección DEBE distinguir tres errores con mensajes diferentes en español: sin conexión, tiempo agotado (10 segundos) y respuesta inválida.
- **FR-007**: Cada error DEBE mostrar un botón Reintentar que repita la consulta sin recargar la página.
- **FR-008**: Los datos de población DEBEN descargarse una sola vez por sesión de página y reutilizarse al cambiar de país; los fallos no se guardan y permiten reintentar.
- **FR-009**: Cambiar de país mientras hay una consulta en curso DEBE impedir que llegue a la sección una respuesta tardía del país anterior.
- **FR-010**: Una respuesta mal formada para el país solicitado DEBE mostrar error de respuesta inválida, nunca «Sin datos».
- **FR-011**: Datos defectuosos de otros países NO DEBEN impedir mostrar la población de un país válido.
- **FR-012**: El botón Reintentar y la sección DEBEN ser operables con teclado, con foco visible y los cambios de estado anunciados a lectores de pantalla.
- **FR-013**: Todos los textos de interfaz DEBEN estar en español.
- **FR-014**: Los nombres y textos externos DEBEN mostrarse como texto, sin interpretarse como HTML.

### Key Entities

- **País**: Identidad del país seleccionado (código ISO3) y su relación con sus registros de población.
- **Registro de población**: Año y cifra de población de un país, tal como lo entrega la fuente.
- **Catálogo de población**: Registros de todos los países disponibles en la fuente, reutilizables durante la sesión.
- **Vista de población**: Estado de la sección (cargando, cifra con año, sin datos o error).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Un país con registros muestra su cifra más reciente y su año en la primera consulta exitosa.
- **SC-002**: Un país ausente de la fuente muestra «Sin datos» y no un error.
- **SC-003**: Consultar dos países en la misma sesión requiere una sola descarga exitosa de la fuente.
- **SC-004**: Los tres errores muestran mensajes distintos y el botón Reintentar recupera la sección sin recargar la página.
- **SC-005**: La sección se puede consultar y reintentar solo con teclado.

## Assumptions

- Depende de la ficha base (`001-ficha-base`), ya integrada en `main`.
- La fuente es CountriesNow, endpoint `GET /countries/population`, que devuelve el listado completo de países con `iso3` y `populationCounts` (`year`, `value`). Se une por `iso3` con la ficha.
- La fuente solo contiene datos hasta 2018. La sección muestra ese año para que el dato no se confunda con uno actual.
- La sesión dura hasta recargar o cerrar la página; no hay persistencia en disco.
- Los valores por defecto son propuestas del agente, pendientes de revisión humana.
- Fuera de alcance: histórico de años, gráficos, población de ciudades, densidad o cualquier otra fuente de datos.
- Una cifra de población se presenta tal como la entrega la fuente; no se redondea ni se convierte a otras unidades.

## Clarifications

### Session 2026-10-29

- ¿Qué mostrar? Población total del país (cifra más reciente).
- ¿Fuente? CountriesNow, unida por `iso3`.
- ¿Formato? Cifra simple con separadores en español y año de referencia.
- ¿Datos antiguos? La fuente llega a 2018; se muestra el año.
- ¿Errores? Mensajes diferenciados (sin conexión, tiempo agotado, respuesta inválida) con botón Reintentar.
- ¿Sin datos? Mensaje «Sin datos» cuando el país no aparece o no tiene registros.
