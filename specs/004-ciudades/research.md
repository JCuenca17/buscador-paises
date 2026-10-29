# Research: Ciudades

## Registro e identidad

- **Decision**: SeccionFicha existente, preservar h3 y relacionar catálogo por iso3.
- **Rationale**: La base entrega PaisFicha y signal; evita colisiones por idioma del nombre.
- **Alternatives considered**: Reescribir ficha o cruzar por nombres aumenta conflictos.

## Fuente real

- **Decision**: GET https://countriesnow.space/api/v0.1/countries por obtenerJson.
- **Rationale**: Consulta exploratoria real del 2026-10-29: error:false, 227 países y fila PER con country Peru y 82 ciudades; campos iso2/iso3/country/cities confirmados. Consulta fuera de las pruebas; no fijar cantidades reales en pruebas.
- **Alternatives considered**: Una descarga por país incumple el requisito; otras fuentes no están permitidas.

## Concurrencia y fallos

- **Decision**: Promesa compartida y cancelación solo del consumidor; quitar listeners; fallo invalida por identidad.
- **Rationale**: Cambiar de país no cancela la descarga que necesita la siguiente ficha. Los reintentos tras fallos son excepción a una descarga exitosa por sesión.
- **Alternatives considered**: Guardar solo el resultado duplica solicitudes concurrentes; usar signal de ficha aborta a todos; persistir en disco es innecesario.

## Normalización y accesibilidad

- **Decision**: normalizarNombre más NFD sin marcas, Intl.Collator español, conservar nombres tras trim; controles nativos persistentes.
- **Rationale**: La normalización base conserva tildes por contrato y no debe cambiarse. Preservar controles mantiene foco.
- **Alternatives considered**: Cambiar ficha afectaría a José; paquetes externos no son necesarios.

Un agente auxiliar de solo lectura, solicitado por el flujo speckit-plan, revisó interfaces y pruebas existentes y confirmó estos riesgos y decisiones. No es una aprobación humana. Sin incógnitas técnicas críticas ni paquetes nuevos.
