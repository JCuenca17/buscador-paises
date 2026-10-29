# Implementation Plan: Población del país

**Branch**: `002-poblacion` · **Date**: 2026-10-29 · **Spec**: [spec.md](./spec.md)

## Summary

Añadir a la ficha una sección Población con la cifra más reciente del país y su año, usando la descarga única de `GET /countries/population` (CountriesNow) cacheada por sesión. Estados: cargando, disponible, sin datos y tres errores con Reintentar.

## Technical Context

- **Lenguaje**: TypeScript 7.0.2, DOM nativo.
- **Build/test**: Vite 8.3.5, Vitest 5.0.5, jsdom, fast-check.
- **Dependencias nuevas**: ninguna.
- **Fuente**: CountriesNow, solo vía `src/api/http.ts`.
- **Plataforma**: navegador moderno.

## Constitution Check

Según `.specify/memory/constitution.md`:

- Simplicidad: sin dependencias nuevas; patrón ya usado por ciudades.
- Fuente de datos única: solo CountriesNow, por `obtenerJson`.
- Arquitectura por capas: `features/poblacion/` con servicio y componente separados.
- Pruebas obligatorias: unitarias del servicio, de componente, de propiedades (formato y año máximo) e integración.
- Interfaz en español: todos los textos.
- Revisión humana: pendiente.

## Project Structure

```text
src/features/poblacion/
├── poblacion.service.ts          # obtenerPoblacion, índice por iso3, cache de sesión
├── poblacion.service.test.ts
├── poblacion.component.ts        # sección con estados y Reintentar
├── poblacion.component.test.ts
├── poblacion.prop.test.ts        # año máximo, formato de cifra
├── poblacion.integracion.test.ts
└── poblacion.css                 # si hace falta estilo propio
src/main.ts                       # descomentar registrarSeccion(seccionPoblacion)
```

## Phases

1. **Servicio**: índice por `iso3`, validación de filas, selección del año máximo, errores mapeados desde `ErrorApi`.
2. **Componente**: sección registrada con `registrarSeccion`, estados, Reintentar, anuncios accesibles.
3. **Integración**: registrar en `main.ts` y probar con datos simulados (sin llamar a la API real en pruebas).
4. **Verificación**: `npm test`, `npm run typecheck`, `npm run build`; validación manual con un país presente y otro ausente.

## Complexity Tracking

Sin desviaciones de la constitución.
