# Investigación (Fase 0): Búsqueda inteligente

**Funcionalidad**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Fecha**: 2026-10-29

Las decisiones se basan en la constitución, en el servicio y componente actuales de la ficha base y
en el contrato de `src/api/http.ts`. Las pruebas no consultan CountriesNow en vivo.

## R1. Dependencias y plataforma

**Decisión**: no añadir dependencias. Usar `Intl.DisplayNames`, normalización Unicode del lenguaje,
Vitest/jsdom y fast-check ya presentes en el proyecto.

**Justificación**: `package.json` ya declara TypeScript ES2022 y `fast-check`; el navegador provee
`Intl.DisplayNames` y `String.prototype.normalize`. Se mantiene el tamaño y el mantenimiento del
proyecto sin incorporar una librería de internacionalización o autocomplete.

**Alternativas consideradas**:
- Añadir una librería de países o traducciones: descartada porque la constitución fija CountriesNow
  como única fuente de datos.
- Instalar una librería de autocomplete: descartada porque el comportamiento requerido es acotado y
  debe ajustarse al formulario HTML existente y a su navegación accesible.

## R2. Datos para aliases y nombres españoles

**Decisión**: obtener `/countries/capital` mediante `obtenerJson` desde `src/api/http.ts`; validar
que `data` sea un arreglo y filtrar elementos que no tengan `name` o `iso2` no vacíos. Crear el
nombre español con `new Intl.DisplayNames(["es"], { type: "region" }).of(iso2.toUpperCase())`.
Mantener la promesa/lista válida en memoria durante la sesión y borrar la caché fallida para
permitir reintento.

**Justificación**: el endpoint ya entrega nombre canónico e ISO2, suficientes para resolver la
búsqueda base y generar el nombre en español. No se necesita una fuente local fija, una consulta
por cada letra ni una nueva ruta de red. `obtenerJson` centraliza timeout de 10 segundos y errores.

**Alternativas consideradas**:
- Una lista codificada en la interfaz: descartada por la fuente única de la constitución y porque
  no representa los datos actuales del servicio.
- Consultar un endpoint por cada sugerencia o tecla: descartado; la lista puede cargarse una vez y
  filtrarse localmente.
- Exportar internamente la caché privada de `ficha.service.ts`: descartado en este plan porque
  exigiría modificar más la funcionalidad de Jose y crear una dependencia entre servicios de
  features. La lista pequeña se cachea una vez en la sesión de la nueva feature; la solicitud
  adicional es una concesión explícita para mantener la propiedad local.

## R3. Normalización y tildes

**Decisión**: importar y llamar primero a `normalizarNombre` para conservar exactamente el
comportamiento probado de trim, colapso de espacios y minúsculas. En `busqueda.service.ts`, crear
una clave de comparación local aplicando `normalize("NFD")` y eliminando marcas Unicode (`\p{M}`).
Indexar tanto el nombre canónico del API como su nombre en español con esa clave.

**Justificación**: la función base documenta expresamente que no elimina tildes ni traduce, y sus
pruebas garantizan su contrato. Cambiar su semántica afectaría la ficha de Jose y toda búsqueda que
la usa; la composición local permite encontrar `Perú`/`Peru` y `España`/`espana` sin regresión.

**Alternativas consideradas**:
- Cambiar `normalizarNombre` para quitar tildes: descartada porque altera una utilidad compartida,
  contradice su contrato y requiere revisar pruebas y código de otra persona sin necesidad.
- Usar `toLocaleLowerCase("es")`: descartada; se conserva el comportamiento determinista de la
  función base y la eliminación de marcas se usa solo para claves de esta feature.

## R4. Coincidencias, sugerencias y conflictos de nombres

**Decisión**: considerar coincidencia cuando la clave normalizada del texto sea prefijo del nombre
canónico inglés o del nombre español. Una coincidencia exacta del nombre canónico tiene prioridad
en la resolución del envío manual; después se acepta un alias español exacto si resuelve a un solo
país. Mantener el orden de la respuesta del API, limitar a cinco sugerencias y conservar la
identidad por país, no solo por ISO2, porque la fuente puede repetir ISO2 (por ejemplo, entradas
distintas de Cocos). Si un alias exacto español corresponde a más de un registro, no seleccionar un
país arbitrariamente; las opciones coincidentes se mantienen separadas en la lista.

**Justificación**: el prefijo permite sugerir incrementalmente sin resultados poco relacionados;
el orden estable hace reproducible el límite de cinco. El nombre canónico exacto evita que una
colisión de alias cambie la búsqueda existente.

**Alternativas consideradas**:
- Coincidencia de subcadena en cualquier posición: descartada inicialmente porque eleva el ruido
  para consultas cortas y no está exigida por la especificación.
- Usar `iso2` como clave única: descartada porque la propia fuente contiene más de un nombre para
  algunos ISO2.

## R5. Integración y estados de error

**Decisión**: agregar un adaptador opcional y acotado a la ficha para que el submit pase por el
resolvedor antes de llamar a `buscarFicha`; el módulo nuevo monta las sugerencias sobre el campo
existente desde `main.ts`. Al elegir una sugerencia, mantener el nombre español visible y enviar el
formulario existente. La ficha conserva carga, validación, cancelación, ficha y manejo de errores.
Los errores del resolvedor usan los mismos tipos/mensajes base y «Reintentar» vuelve a resolver la
última consulta. La integración en `ficha.component.ts` necesita aprobación de Jose antes de
implementarse.

**Justificación**: la ficha construye el campo dentro de `montarFicha` y su submit pasa el valor
capturado a `buscarFicha`; el módulo externo no tiene un punto de extensión público para resolver
un alias manual. Un adaptador evita duplicar la interfaz y la máquina de estados.

**Alternativas consideradas**:
- Reescribir la ficha o crear otro formulario: descartado porque contradice FR-007 y la
  constitución.
- Cambiar `src/api`: descartado; el cliente ya satisface las necesidades.
- Interceptar y reescribir/restaurar el valor del input en un listener externo: descartado por las
  carreras con submit/Enter y porque acopla el feature a detalles internos del evento base.

## R6. Accesibilidad y pruebas

**Decisión**: implementar la lista como combobox/listbox con `aria-expanded`, `aria-controls`,
`aria-activedescendant`, opciones con identificadores estables y controles ArrowDown, ArrowUp,
Enter y Escape. Usar nodos DOM y `textContent` para nombres externos. Cubrir lógica, UI, integración
y errores con Vitest/jsdom; generar propiedades de variantes de mayúsculas, espacios y diacríticos
con fast-check; simular la respuesta `obtenerJson`/`fetch` en todas las pruebas.

**Justificación**: cumple la constitución de teclado/lector de pantalla y la prohibición de red real
en pruebas. fast-check ya está aprobado y no se necesita instalación.

**Alternativas consideradas**:
- Solo seleccionar con clic: descartado porque no es accesible por teclado.
- Snapshot/ejemplos fijos como única cobertura de normalización: descartados porque la constitución
  exige pruebas basadas en propiedades para reglas generales.