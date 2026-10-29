# Lista de Tareas: Moneda y Ubicación

## Fase 1: Configuración e Infraestructura
- [ ] Crear el directorio del módulo en `src/features/moneda-ubicacion`.
- [ ] Implementar los modelos e interfaces de TypeScript para las respuestas de las APIs de países (moneda y posiciones).

## Fase 2: Servicios de Datos y APIs
- [ ] Crear el cliente o servicio en `src/api` para realizar la petición HTTP GET a la API de monedas.
- [ ] Crear el servicio para realizar la petición HTTP GET a la API de posiciones (coordenadas).
- [ ] Implementar la lógica de mapeo, conversión de texto a número y validación de rangos para latitud (-90 a 90) y longitud (-180 a 180).

## Fase 3: Componente de Interfaz de Usuario y Registro
- [ ] Desarrollar la plantilla HTML/TypeScript para mostrar la sección con la Moneda, Latitud, Longitud y el enlace a OpenStreetMap.
- [ ] Controlar el caso extremo de datos faltantes inyectando el texto "No disponible".
- [ ] Conectar el módulo llamando a `registrarSeccion` e importarlo formalmente dentro de `src/main.ts`.

## Fase 4: Pruebas y Validación
- [ ] Crear y ejecutar las pruebas unitarias básicas para asegurar que la validación de coordenadas funcione correctamente.
- [ ] Realizar pruebas manuales de comportamiento en el navegador simulando estados offline y países inexistentes.
