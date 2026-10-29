# Plan de Diseño: Moneda y Ubicación

## Arquitectura y Componentes
- **Ubicación del módulo:** Se creará la funcionalidad dentro del directorio estructurado `src/features/moneda-ubicacion`.
- **Integración con la UI:** Se utilizará la función global `registrarSeccion` de la aplicación para añadir la tarjeta de información sin alterar el código de la ficha base.
- **Registro global:** Se conectará el módulo en el archivo principal de arranque `src/main.ts`.

## Consumo de Servicios (APIs)
- **API de Monedas:** `GET https://countriesnow.space` (Campos a procesar: name, currency, iso2, iso3).
- **API de Coordenadas:** `GET https://countriesnow.space` (Campos a procesar: name, iso2, long, lat).

## Lógica y Validaciones
- **Tipado seguro:** Validar y convertir los valores de latitud y longitud recibidos (en algunas entradas de la API vienen mapeados incorrectamente como texto `"0"` o vacíos).
- **Enlace dinámico:** Construir una URL estructurada hacia OpenStreetMap utilizando las coordenadas validadas en formato decimal estándar: `https://openstreetmap.org[lat]&mlon=[lon]`.
