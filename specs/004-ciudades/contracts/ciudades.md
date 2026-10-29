# Contracts: Ciudades

## Servicio

- obtenerCiudades(iso3: string, signal?: AbortSignal): Promise<ResultadoCiudades>.
- crearIndiceCiudades(data: unknown[]): ReadonlyMap<string, Record<string, unknown>>; puro, rechaza catálogo sin identidades.
- validarCiudades(fila: Record<string, unknown>): type guard de la fila descrita en data-model.md.
- normalizarFiltro(texto: string): string; trim/espacios/minúsculas + NFD sin marcas.
- reiniciarCacheCiudades(): void, solo para aislamiento de pruebas.

Única ruta: /countries, mediante obtenerJson. HTTP, JSON, sobre y timeout pertenecen a src/api/http.ts. Ninguna prueba utiliza la API real.

## Sección e interfaz

seccionCiudades implementa SeccionFicha: id ciudades, titulo Ciudades, renderizar async. Se registra desde src/main.ts antes de montarFicha. Conserva h3 y comprueba signal antes de resultados.

- Campo type=search con label «Filtrar ciudades» e id único. Se oculta cuando el país no tiene ciudades; sigue disponible cuando solo el filtro no encuentra coincidencias.
- Contador role=status, aria-live=polite, aria-atomic=true: «N resultados. Mostrando A-B. Página P de Q» o «0 resultados».
- Con una sola coincidencia, usar «1 resultado» en singular.
- ul/li con nombres por textContent.
- Anterior/Siguiente, type=button, disabled en límites; navegación oculta con una sola página.
- Sin ciudades: «No hay ciudades registradas para este país».
- Sin coincidencias: «No hay ciudades que coincidan con el filtro».
- Carga: «Cargando ciudades…».
- Sin conexión: «No hay conexión para cargar las ciudades. Revisa tu conexión e inténtalo de nuevo.»
- Timeout: «El servicio tardó demasiado en cargar las ciudades. Inténtalo de nuevo.»
- Inválida: «No se pudieron obtener las ciudades. La respuesta del servicio no es válida.»
- Error con role=alert y Reintentar; conservar ficha base.
