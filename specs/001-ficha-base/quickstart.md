# Guía rápida de validación: Ficha base

Cómo comprobar que la funcionalidad cumple la [especificación](./spec.md).

## Requisitos previos

- Node.js dentro de `^22.13.0 || ^24.0.0 || >=26.0.0` (`node -v`); `.nvmrc` indica 24. Ver
  [research.md §R1](./research.md#r1-versiones-de-las-herramientas).
- Dependencias instaladas: `npm install`.

## Validación automática

| Comando | Resultado esperado |
|---------|--------------------|
| `npm run typecheck` | sin errores de tipos |
| `npm test` | todas las pruebas pasan; ninguna llama a la red |
| `npm run build` | genera `dist/` con archivos estáticos |

Comprobar que las pruebas no usan la red: con la red desactivada, `npm test` sigue pasando.

Cobertura mínima de requisitos por archivo de pruebas:

| Archivo | Requisitos |
|---------|------------|
| `src/api/http.test.ts` | FR-011, FR-012 ([contrato](./contracts/http-client.md)) |
| `src/features/ficha/normalizar.test.ts`, `normalizar.prop.test.ts` | FR-003, FR-005 |
| `src/features/ficha/ficha.service.test.ts` | FR-005, FR-006, FR-010 (descarga compartida), FR-012 (datos mal formados), FR-015 ([contrato](./contracts/ficha-service.md)) |
| `src/features/ficha/ficha.validacion.prop.test.ts` | FR-012, FR-015 (validación de datos, Principio IV) |
| `src/features/ficha/ficha.component.test.ts` | FR-001, FR-002, FR-004, FR-007 a FR-010, FR-013, FR-014, FR-016 a FR-018 ([contrato](./contracts/ui.md)) |

## Validación manual (`npm run dev`)

1. Al abrir la página, el foco está en «Nombre del país».
2. Escribir `  pERU ` y presionar Enter → «Buscando…» y luego la ficha de Peru con capital Lima y
   bandera.
3. Buscar `Bolivia` → ficha con «Bandera no disponible» (la fuente no tiene su bandera).
4. Buscar `Antarctica` → «Capital: no disponible».
5. Buscar `España` → «No se encontró el país», sin «Reintentar».
6. Presionar «Buscar» con el campo vacío → «Escribe el nombre de un país»; al escribir, desaparece.
7. Pegar más de 100 caracteres → el campo se queda con 100.

Para los pasos 8 a 10, en la pestaña «Red» de las herramientas del navegador, marcar «Inhabilitar
caché» y recargar la página antes de cada paso. Si no, las listas salen de la caché de la app o
de la caché HTTP del navegador, la limitación de red no se aplica y el paso parece fallar.

8. En las herramientas del navegador, activar «Offline» y buscar → mensaje de sin conexión y
   «Reintentar»; desactivar «Offline», presionar «Reintentar» → aparece la ficha.
9. Limitar la red a una velocidad muy baja y buscar → a los 10 s, mensaje de tiempo agotado.
10. Buscar `Peru` e inmediatamente `Chile` → solo se ve la ficha de Chile.
11. Repetir los pasos 2, 6 y 8 usando solo el teclado (Tab, Enter, Espacio).
