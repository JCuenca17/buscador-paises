# Quickstart: Ciudades

Seleccionar 004-ciudades y usar Node compatible con package.json.

```powershell
npm ci
npm test
npx tsc --noEmit
npm run build
npm run dev
```

## Casos manuales

1. Buscar Peru: conservar capital y bandera; sección Ciudades con lista ordenada y hasta 20 elementos.
2. Recorrer páginas con Anterior/Siguiente y comprobar extremos sin página extra vacía.
3. En página posterior filtrar una ciudad que sí figure en la fuente. En la consulta del 29/10, Perú incluye Huancayo y no Huánuco: probar HUANCAYO, huancayo y huáncayo (tilde introducida en el filtro), con los mismos resultados, total global y reinicio de página. Huánuco es un dato controlado de las pruebas automatizadas; no se espera que aparezca en la API real.
4. Filtrar zzzzzz y borrar: sin coincidencias y recuperación del total.
5. Buscar Chile y Peru otra vez: una sola descarga exitosa a /countries en Network; las rutas capital/bandera de la base son independientes.
6. País sin ciudades según catálogo actual: mensaje adecuado. Caso vacío también simulado en pruebas, sin fijar un país real que puede cambiar.
7. Nombre del país vacío y asdfgh: conservar comportamiento de la base.
8. Para comprobar sin conexión dentro de la app: con conexión normal y Disable cache activo, recargar y esperar a que cargue la interfaz; buscar asdfgh y esperar «No se encontró el país». Así se cargan capitales/banderas, sin solicitar aún ciudades. Seleccionar Offline SIN recargar y buscar Peru: la ficha usa sus listas y ciudades debe mostrar su mensaje de conexión con Reintentar. Volver a conexión normal y pulsar Reintentar. Si se recarga ya en Offline, Edge puede bloquear el documento local y mostrar su propia página ERR_INTERNET_DISCONNECTED; eso no comprueba el mensaje de la aplicación.
9. Para red lenta: seleccionar 3G o 3G lento, marcar Disable cache y recargar ANTES de buscar Peru. Registrar perfil exacto, estado HTTP y tiempo de /countries, además del estado visible en la app. Si excede 10 segundos debe aparecer tiempo agotado y permitir reintento. Un 200 en 9,76 s prueba ese intento exitoso, sin demostrar el caso timeout. JSON inválido y timeout se cubren determinísticamente con fetch simulado. La caché de sesión y la caché HTTP del navegador son distintas: Disable cache no vacía por sí solo la memoria de una página ya abierta.
10. Navegar con Tab, Shift+Tab, Enter y Espacio; foco visible, label y controles. Revisar ancho móvil.

## Evidencia y dependencia

Resultados reales y límites en revision.md. Pruebas automatizadas sin red real. Esta rama incorpora desarrollo de 001-ficha-base (453da94); no fusionar antes de integrar esa base. La revisión del agente no equivale a aprobación humana de Paulo, Klismann o José.
