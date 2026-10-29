# Especificación de funcionalidad: Búsqueda inteligente

**Rama de la funcionalidad**: `005-busqueda-inteligente`

**Responsable**: Klismann

**Revisores del pull request**: Jose y Gabriel

**Creada**: 2026-10-29

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Mejorar la búsqueda para que encuentre el país aunque el usuario escriba con o sin tildes, en mayúsculas o minúsculas, o con el nombre en español (por ejemplo 'Perú', 'españa', 'Alemania'). Mientras el usuario escribe, mostrar hasta 5 sugerencias de países con su nombre en español. Al elegir una sugerencia con el mouse o el teclado, se busca ese país. Respetar la constitución, crear la funcionalidad en src/features/busqueda-inteligente e integrarla con el campo de búsqueda base sin reescribirlo. Reutilizar normalizarNombre de src/features/ficha/normalizar.ts y justificar en el plan cualquier cambio a esa función. Usar Intl.DisplayNames con idioma 'es' y el iso2 de la API para los nombres en español. Probar la normalización con fast-check."

## Clarifications

### Session 2026-10-29

- Q: Si escribes un nombre de país en español y presionas «Buscar» sin elegir una sugerencia, ¿también debe encontrarlo? → A: La búsqueda manual y la selección de sugerencias reconocen nombres en español; la búsqueda manual funciona con el botón «Buscar» o con Enter.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Encontrar países con distintas escrituras (Prioridad: P1)

El usuario puede buscar un país escribiendo su nombre con mayúsculas o minúsculas, con o sin tildes, y usando el nombre habitual en español. La búsqueda devuelve el mismo país aunque la escritura varíe.

**Por qué esta prioridad**: permite que la búsqueda principal funcione con las formas de escritura naturales de los usuarios hispanohablantes.

**Prueba independiente**: buscar países de prueba mediante variantes con y sin tilde, en mayúsculas y minúsculas, y por su nombre en español; comprobar que cada variante identifica el país correcto.

**Escenarios de aceptación**:

1. **Dado** que el usuario escribe «Perú», **cuando** presiona «Buscar» o Enter sin elegir una sugerencia, **entonces** se muestra la ficha de Peru.
2. **Dado** que el usuario escribe «ESPAÑA» o «españa», **cuando** presiona «Buscar» o Enter sin elegir una sugerencia, **entonces** se muestra la ficha del mismo país.
3. **Dado** que un país tiene tilde en su nombre, **cuando** el usuario busca ese nombre con o sin tilde, **entonces** ambas formas identifican el mismo país.
4. **Dado** que el usuario escribe un país con espacios externos o repetidos, **cuando** se procesa la búsqueda, **entonces** esos espacios no impiden identificarlo.

---

### Historia de usuario 2 - Elegir una sugerencia (Prioridad: P1)

Mientras el usuario escribe un nombre de país, ve una lista breve de coincidencias con nombres en español y puede escoger una sin completar el nombre exacto.

**Por qué esta prioridad**: las sugerencias ayudan a reconocer el país correcto y ofrecen una vía clara para buscarlo.

**Prueba independiente**: escribir parte de un nombre de país y comprobar que aparecen sugerencias en español; elegir una con ratón y luego repetir usando solo el teclado; en ambos casos comprobar que se muestra la ficha del país elegido.

**Escenarios de aceptación**:

1. **Dado** que el campo contiene un texto que coincide con países, **cuando** el usuario escribe, **entonces** se muestran hasta cinco sugerencias de países con sus nombres en español.
2. **Dado** que hay más de cinco coincidencias, **cuando** se muestran sugerencias, **entonces** la lista contiene como máximo cinco.
3. **Dado** que aparece una sugerencia, **cuando** el usuario la elige con el ratón, **entonces** se busca ese país mediante el flujo de búsqueda existente.
4. **Dado** que aparecen sugerencias, **cuando** el usuario recorre la lista y confirma una con el teclado, **entonces** se busca el país activo mediante el flujo de búsqueda existente.
5. **Dado** que se ha elegido una sugerencia, **cuando** comienza la búsqueda, **entonces** la lista de sugerencias deja de mostrarse y el campo refleja el país elegido en español.

### Casos límite

- Si el campo está vacío o solo contiene espacios, no se muestran sugerencias y se conserva la validación del buscador base.
- Si el texto no coincide con ningún país, no se muestran sugerencias; la búsqueda manual conserva el mensaje «No se encontró el país» del buscador base.
- Si hay entre una y cinco coincidencias, se muestran todas; nunca se muestran más de cinco.
- Si los nombres en español de dos países coinciden o son indistinguibles tras normalizar, las sugerencias deben seguir permitiendo elegir cada país sin ambigüedad.
- Al editar el texto después de abrir la lista, las sugerencias anteriores no deben seguir siendo seleccionables.
- Escape cierra la lista sin iniciar una búsqueda; las flechas arriba y abajo cambian la sugerencia activa sin sacar el foco del campo.
- La interacción con sugerencias no debe impedir enviar una búsqueda manual, usar Enter ni conservar el foco visible.
- La lista de sugerencias vacía, un fallo al preparar los datos o una entrada con símbolos no debe dejar la página en blanco ni bloquear la búsqueda base.
- Los datos de países proceden de la fuente aprobada por el proyecto; no se sustituyen por una lista local fija.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001**: La búsqueda DEBE identificar el mismo país sin distinguir mayúsculas y minúsculas.
- **FR-002**: La búsqueda DEBE identificar el mismo país tanto si el usuario incluye como si omite las tildes.
- **FR-003**: La búsqueda DEBE reconocer los nombres de países en español, además de las formas ya aceptadas por el buscador base, tanto al enviar el formulario con «Buscar» o Enter como al elegir una sugerencia.
- **FR-004**: Mientras el usuario escribe una consulta no vacía, la interfaz DEBE mostrar las coincidencias disponibles con el nombre de cada país en español y DEBE mostrar como máximo cinco.
- **FR-005**: Los nombres visibles en español DEBEN derivarse del código ISO 3166-1 alfa-2 (`iso2`) del país usando `Intl.DisplayNames` con el idioma `es`.
- **FR-006**: El usuario DEBE poder recorrer, activar y elegir sugerencias usando solo el teclado; también DEBE poder elegirlas con el ratón. La selección DEBE iniciar la búsqueda del país elegido.
- **FR-007**: La funcionalidad DEBE vivir en `src/features/busqueda-inteligente` e integrarse con el campo y el flujo de búsqueda base sin reescribir esa funcionalidad.
- **FR-008**: La funcionalidad DEBE reutilizar `normalizarNombre` de `src/features/ficha/normalizar.ts` para el comportamiento de normalización que ya cubre. Cualquier cambio propuesto a esa función DEBE justificarse en el `plan.md` antes de implementarse.
- **FR-009**: La normalización y la correspondencia de variantes DEBEN tener pruebas basadas en propiedades con `fast-check`, además de pruebas automatizadas para el servicio y la interacción visual.
- **FR-010**: La lista y sus opciones DEBEN ser accesibles mediante teclado y lectores de pantalla, con estado activo perceptible y texto visible en español.
- **FR-011**: La funcionalidad NO DEBE realizar llamadas de red directamente ni obtener datos de fuentes distintas de la fuente aprobada por el proyecto.
- **FR-012**: Los nombres de país recibidos como datos DEBEN insertarse en el DOM como texto, nunca interpretarse como marcado.
- **FR-013**: Al cambiar el texto de búsqueda, las sugerencias DEBEN corresponder al texto actual y una selección DEBE delegar en el flujo base el manejo de carga, resultados y errores. La búsqueda manual con «Buscar» o Enter DEBE reconocer los mismos nombres en español que las sugerencias.

### Entidades clave

- **País sugerible**: país disponible en los datos aprobados, identificado de forma estable por su código ISO alfa-2 y con los nombres que permiten encontrarlo y mostrarlo en español.
- **Sugerencia activa**: país actualmente señalado mientras el usuario recorre la lista con el teclado.
- **Consulta normalizada**: texto de búsqueda comparado sin diferencias de espacios, mayúsculas ni tildes.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: En todos los casos automatizados de referencia, las variantes con y sin tildes, con mayúsculas o minúsculas y con nombre en español identifican el país esperado.
- **SC-002**: Cada consulta muestra cero sugerencias si no hay coincidencias y nunca más de cinco si las hay.
- **SC-003**: En pruebas de interacción, el usuario puede seleccionar una sugerencia tanto con ratón como solo con teclado y obtiene la ficha del país seleccionado.
- **SC-004**: La funcionalidad puede probarse sin llamadas a la API real y sin modificar el flujo de búsqueda base para reproducir su carga, resultado y errores.

## Supuestos

- Las sugerencias se actualizan a medida que se escribe, no se exige un número mínimo de caracteres y una consulta vacía no presenta opciones.
- Si hay más de cinco coincidencias, se muestran las primeras cinco según el orden estable de los datos disponibles.
- Las búsquedas manuales con «Buscar» o Enter y la selección de sugerencias reconocen los mismos nombres en español; la lista complementa el formulario base y no reemplaza su botón ni su envío con Enter.
- La ficha base conserva la responsabilidad de validar el campo, consultar, presentar la ficha y gestionar los estados y errores existentes.
- El cambio se limita a la nueva funcionalidad y a su punto de integración estrictamente necesario; cualquier modificación a otra funcionalidad debe justificarse en el plan y acordarse con su responsable.