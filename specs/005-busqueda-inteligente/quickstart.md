# Validación rápida: Búsqueda inteligente

**Plan**: [plan.md](./plan.md) · **Contrato**: [contracts/ui.md](./contracts/ui.md)

## Prerrequisitos

- Node.js dentro del rango de `package.json` y dependencias del proyecto instaladas.
- Trabajar en la rama `005-busqueda-inteligente`.
- Ninguna prueba debe acceder a CountriesNow en vivo; todas las respuestas se simulan.

## Validación automatizada

Desde la raíz del repositorio:

```powershell
npm run typecheck
npm test -- src/features/busqueda-inteligente
npm run build
```

Resultados esperados:

- TypeScript termina sin errores.
- Vitest pasa las pruebas del servicio, el componente, la integración y las propiedades de
  normalización con fast-check.
- Las pruebas verifican las variantes `Perú`/`Peru`, mayúsculas/minúsculas, espacios repetidos,
  nombres de API y coincidencias de prefijo en español; la salida nunca supera cinco opciones.
- Las pruebas verifican que los errores `sin-conexion`, `tiempo-agotado` y `respuesta-invalida`
   muestran cada mensaje español correspondiente y que «Reintentar sugerencias» vuelve a intentar
   el catálogo para el texto actual sin enviar el formulario.
- Las pruebas verifican que aliases españoles duplicados producen etiquetas diferentes con
   `nombreApi` e `iso2` y que cada etiqueta resuelve al registro correcto.
- Una prueba verifica que ficha y sugerencias reutilizan la misma promesa de capitales, por lo que
   la página no descarga dos veces `/countries/capital`.
- Las pruebas de interacción cubren clic, ArrowDown/ArrowUp, Enter, Escape y envío manual con el
  botón/Enter cuando no se ha seleccionado una opción.
- Se simulan respuesta inválida, sin conexión y tiempo agotado; no hay `fetch` real.
- El build de Vite finaliza correctamente.

## Revisión manual en navegador

1. Ejecutar `npm run dev` y abrir la URL local que informa Vite.
2. Escribir `espa` y comprobar que aparece «España» sin más de cinco opciones.
3. Elegir «España» con el ratón y comprobar que aparece su ficha, con el nombre español todavía
   visible en el campo al iniciar la consulta.
4. Repetir escribiendo `ALEMANIA` y enviar con Enter sin elegir sugerencia; debe aparecer la ficha
   del mismo país.
5. Escribir `Peru` y `Perú` por separado; ambos deben resolver a la misma ficha.
6. Navegar solo con teclado: escribir parte de un nombre, usar ArrowDown/ArrowUp, confirmar con
   Enter y cerrar una lista sin selección con Escape. Verificar foco visible y anuncios accesibles.
7. Probar un nombre español duplicado y comprobar que cada sugerencia añade el nombre canónico y
   el ISO2, y que cada opción presenta el país correcto.
8. Desconectar o simular timeout/respuesta inválida al cargar sugerencias; verificar mensaje
   específico en español, botón «Reintentar sugerencias» y recuperación al volver a cargar.
9. Probar texto sin coincidencias y campo vacío; se conservan los estados de la ficha base.
10. Repetir un submit manual tras simular error y comprobar que la ficha muestra su mensaje y que
    «Reintentar» vuelve a resolver la consulta original.

## Comprobación de propiedad

El conjunto fast-check debe probar, al menos, que la clave de búsqueda es idempotente, que es
invariante a mayúsculas/espacios y que agregar o quitar marcas diacríticas en nombres generados no
cambia la coincidencia del mismo país. La función `normalizarNombre` original mantiene sus pruebas
y su contrato sin modificación.