# Data Model: Ciudades

## Fila externa

- iso2: cadena de dos letras; iso3: cadena de tres letras; códigos comparados en mayúsculas.
- country: cadena no vacía tras trim.
- cities: arreglo de cadenas no vacías tras trim. Se conservan duplicados.

Catálogo global: arreglo no vacío con al menos un ISO3 identificable; filas sin ISO3 válido se ignoran. Primera fila por ISO3. Validar campos de la fila consultada; inválida produce respuesta-invalida; país ausente o cities:[] produce lista vacía válida.

## ResultadoCiudades

- `{tipo:'disponibles', ciudades:readonly string[]}`: nombres tras trim, ordenados.
- `{tipo:'sin-conexion'|'tiempo-agotado'|'respuesta-invalida'|'cancelada'}`.

## Catálogo de sesión

Sin promesa -> descarga compartida -> éxito retenido o fallo liberado por identidad. Cancelación del consumidor no altera el catálogo. Fila consultada inválida libera su catálogo para permitir reintento.

## Vista

Filtro inicial vacío; página inicial 1. Coincidencias sobre toda la lista, total antes de slice. Tamaño fijo 20; páginas=max(1,ceil(total/20)). Con total 0: «0 resultados» y navegación oculta. Cambio de filtro reinicia página. Cada país nuevo recibe estado independiente.

Transiciones: carga -> resultado/vacío/error; error -> carga al reintentar; filtro/página actualiza resultado/vacío; abort impide escrituras tardías.
