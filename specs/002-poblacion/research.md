# Research: Población del país

**Feature**: `002-poblacion` · **Fecha**: 2026-10-29

## R1. Endpoint de la fuente

- **Decisión**: usar `GET /countries/population` (catálogo completo, sin parámetros).
- **Motivo**: la inspección de la respuesta confirmó `{error, msg, data}` con unos 263 elementos, cada uno con `country`, `iso3` y `populationCounts: [{year, value}]`. Es el mismo patrón que `/countries` en ciudades: una descarga por sesión y búsqueda local por `iso3`.
- **Alternativas descartadas**: endpoint por país (no verificado como disponible en la fuente; si existe, sería una mejora futura); POST con nombre de país (depende del nombre, no del código ISO3).
- **Pendiente**: confirmar en implementación que el endpoint responde con el mismo formato en el momento de uso.

## R2. Antigüedad del dato

- **Decisión**: mostrar la cifra del año más reciente, con su año visible.
- **Hallazgo**: el `msg` de la fuente dice «1961 - 2018», pero el primer año real es 1960 y el último es 2018. La sección no debe asumir un año actual.

## R3. Formato de la cifra

- **Decisión**: `Intl.NumberFormat("es")` para separadores (p. ej. `33.715.000`) y la unidad «hab.» en el texto.
- **Motivo**: uso nativo del navegador, sin dependencias nuevas.

## R4. Cancelación y consultas simultáneas

- **Decisión**: mismo patrón que ciudades. La descarga pertenece a la sesión y no se cancela con la consulta; cada consulta solo cancela su propia espera, y su respuesta tardía se descarta.
- **Motivo**: evita que cambiar de país cancele una descarga que otra consulta necesita.

## R5. Errores y reintento

- **Decisión**: reutilizar `ErrorApi` de `src/api/http.ts` (tipos `sin-conexion`, `tiempo-agotado`, `respuesta-invalida`). El botón Reintentar reinicia solo la consulta de población.
- **Motivo**: el cliente HTTP compartido ya cubre el timeout de 10 s y los tres errores requeridos.

## R6. Diferencia entre «Sin datos» y error

- **Decisión**: «Sin datos» solo cuando el país no aparece o su lista de población está vacía. Un registro con cifra o año no válido es `respuesta-invalida`.
- **Motivo**: lo exige FR-010 y evita ocultar fallos de la fuente como ausencia de datos.
