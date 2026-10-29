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
3. En página posterior filtrar parte de una ciudad, en mayúsculas y con/sin tilde; mismos resultados, total global y reinicio de página. Ver ejemplos deterministas en pruebas si la fuente no ofrece el nombre elegido.
4. Filtrar zzzzzz y borrar: sin coincidencias y recuperación del total.
5. Buscar Chile y Peru otra vez: una sola descarga exitosa a /countries en Network; las rutas capital/bandera de la base son independientes.
6. País sin ciudades según catálogo actual: mensaje adecuado. Caso vacío también simulado en pruebas, sin fijar un país real que puede cambiar.
7. Nombre del país vacío y asdfgh: conservar comportamiento de la base.
8. Offline con caché fría puede fallar en ficha antes de montar ciudades. Para error solo de ciudades bloquear /countries después de cargar ficha, o ejecutar integración simulada. Con caché caliente, Offline debe reutilizar ciudades.
9. Timeout, JSON inválido y reintento se verifican determinísticamente mediante fetch simulado.
10. Navegar con Tab, Shift+Tab, Enter y Espacio; foco visible, label y controles. Revisar ancho móvil.

## Evidencia y dependencia

Resultados reales y límites en revision.md. Pruebas automatizadas sin red real. Esta rama incorpora desarrollo de 001-ficha-base (453da94); no fusionar antes de integrar esa base. La revisión del agente no equivale a aprobación humana de Paulo, Klismann o José.
