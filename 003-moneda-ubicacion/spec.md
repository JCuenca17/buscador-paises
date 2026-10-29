# Especificación: Moneda y Ubicación

## Requisitos de la funcionalidad
- Agregar a la ficha la moneda del país utilizando su código estándar (por ejemplo, PEN).
- Incorporar la ubicación aproximada mostrando tanto la latitud como la longitud.
- Incluir un enlace dinámico hacia OpenStreetMap basado en las coordenadas obtenidas.

## Validaciones y Casos Extremos
- Si falta alguno de los datos en la respuesta de la API, se debe mostrar el texto "No disponible" en ese campo en específico, garantizando que el resto de la ficha se renderice sin problemas.
- Las coordenadas geográficas solo se mostrarán en la ficha si son valores válidos: la latitud debe estar comprendida estrictamente entre -90 y 90, y la longitud entre -180 y 180.
