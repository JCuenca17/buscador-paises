# Implementation Plan: Ciudades del país

**Branch**: `004-ciudades` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)
**Input**: spec.md y guía del equipo, sección Paulo.

## Summary

Añadir `seccionCiudades` mediante registrarSeccion en src/main.ts antes de montarFicha. Servicio separado sin DOM, componente sin red, filtro local y páginas de 20. No se modifica ficha ni API.

## Technical Context

- **Language/Version**: TypeScript 7.0.2, ES2022 y DOM; Node disponible 24.18.0, compatible con engines.
- **Primary Dependencies**: Vite 8.3.5. Ninguna dependencia nueva.
- **Storage**: Promesa de catálogo en memoria hasta recargar la página.
- **Testing**: Vitest 5.0.5, jsdom 29.1.1 y fast-check 4.10.2 ya fijados.
- **Target Platform / Project Type**: Navegadores modernos, SPA estática HTML/CSS/TypeScript.
- **Performance Goals**: Una descarga exitosa por sesión; máximo 20 elementos en lista DOM; filtro y páginas sin red.
- **Constraints**: CountriesNow exclusivamente, timeout 10 s del cliente compartido, español, textContent.
- **Scale/Scope**: Una sección por país; sin mapas ni cambios al buscador.

## Constitution Check

| Principio | Antes / después del diseño |
| --- | --- |
| I. Simplicidad | Conforme: plataforma web, sin nuevos paquetes. |
| II. Fuente única | Conforme: GET /countries con obtenerJson, tres errores y reintento. |
| III. Capas | Conforme: solo ciudades y registro en main.ts; no editar ficha ni src/api. |
| IV. Pruebas | Planificadas: servicio, componente, integración y propiedades, red simulada. |
| V. Español y accesibilidad | Label, controles nativos, estado anunciado, foco y textContent. |
| VI. Revisión humana | Pendiente: Paulo debe revisar los artefactos; PR para Klismann y José con dos aprobaciones comentadas. No se fusionará aquí. |

La preparación integral fue solicitada por Paulo; no constituye evidencia de revisión humana fase por fase. No se marca esa obligación cumplida por el agente ni se cambia la constitución. Registrar esta limitación en revision.md y en el PR.

## Project Structure

Documentación en specs/004-ciudades: spec.md, plan.md, research.md, data-model.md, contracts/ciudades.md, quickstart.md, tasks.md, analysis.md, revision.md y checklists/requirements.md.

```text
src/features/ciudades/
  ciudades.service.ts
  ciudades.component.ts
  ciudades.css
  ciudades.service.test.ts
  ciudades.prop.test.ts
  ciudades.component.test.ts
  ciudades.integracion.test.ts
src/main.ts  # importar y registrar sección
```

## Design Decisions

1. `obtenerCiudades(iso3, signal?)` devuelve ResultadoCiudades sin rechazar por errores. Única red: obtenerJson('/countries'). Índice por ISO3 válido; si hay duplicados se conserva la primera fila.
2. Validar la fila consultada: iso2 de dos letras, iso3 de tres letras, country textual no vacío y cities arreglo de cadenas no vacías tras trim. Se preservan duplicados y se ordena copia con Intl.Collator('es', {sensitivity:'base'}). Fila ausente o cities:[] es vacío; catálogo global vacío/sin claves válidas es error. Filas ajenas defectuosas no bloquean.
3. Guardar una promesa antes de esperar, compartida entre consultas simultáneas. No pasar la signal del consumidor a obtenerJson. Cancelar solo su espera, retirando listener. Fallo libera la promesa solo si sigue siendo la misma; fila consultada inválida también permite nueva descarga al reintentar.
4. `normalizarFiltro` reutiliza normalizarNombre de ficha y añade NFD y eliminación de marcas Unicode localmente. No cambia la búsqueda de países. Coincidencias por subcadena antes de paginar.
5. Componente conserva h3 recibido y añade cuerpo propio. Filtro y botones persisten durante paginado; edición vuelve a página 1. Label con id único, ul/li, contador role=status aria-live=polite aria-atomic=true. Botones nativos disabled en extremos; si el botón enfocado queda deshabilitado, pasar foco al control disponible.
6. Error local con role=alert y Reintentar; mantener ficha. Comprobar signal antes de escrituras asíncronas y manejar errores inesperados como respuesta inválida. Al reintentar llevar foco a carga y luego al filtro.
7. CSS local importado por componente, selectores limitados a .ciudades.
8. Ajustes del comentario de revisión compartido por Paulo: mensajes de error con punto final y filtro oculto cuando no existen ciudades para el país. Si el filtro no encuentra coincidencias, permanece visible para poder editarlo. Tras reintentar con lista vacía, llevar foco al estado, no al campo oculto.

## Delivery and Dependency

Se parte de origin/001-ficha-base (453da94), porque main aún no tiene la app. Publicar PR en borrador hacia main con esa dependencia explícita; mientras esté pendiente, el diff incluye commits de José. Si la ficha se integra durante el trabajo, actualizar con main. No fusionar ni aprobar PR ajenos.

## Complexity Tracking

Sin excepciones técnicas ni dependencias nuevas. Revisión humana y ficha base integrada son condiciones pendientes para llegar a main.
