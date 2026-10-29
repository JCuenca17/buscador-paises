# Revisión y evidencia: 004-ciudades

**Responsable**: Paulo Hidalgo. **Fecha**: 2026-10-29.
Este registro describe trabajo del agente y resultados observados. Paulo debe revisar y redactar su informe con sus palabras; no se atribuyen al estudiante revisiones ni decisiones que no constan en el chat.

## Especificación y aclaración

Se redactaron tres historias, 13 requisitos funcionales y cinco criterios de éxito a partir de la guía. El checklist técnico de especificación cumple 16/16. Se formularon cero preguntas de clarify: se documentaron como supuestos del agente sesión hasta recarga, filtro por subcadena, reinicio de página y ausencia de país como lista vacía. No hay respuestas humanas inventadas.

## Plan

Se inspeccionaron src/api/http.ts, ficha/secciones.ts, ficha/tipos.ts, normalizar.ts y el componente de ficha. Se utiliza el registro existente y se conserva h3. main.ts solo añade importaciones y registrarSeccion. Cero paquetes nuevos y ningún cambio en ficha ni API. Se investigó con un agente auxiliar de solo lectura conforme al skill de planificación.

## Tareas y análisis

17 tareas iniciales cubren 13/13 FR y 5/5 SC. Análisis técnico: cero inconsistencias críticas, altas o medias entre artefactos. Hallazgo G1 de proceso CRITICAL: la revisión humana de fases está pendiente y no puede ser certificada por el agente. Dependencia D1: main carece de ficha base; se parte de 453da94 de 001-ficha-base. Ver analysis.md. No se presenta el análisis global como limpio.

## Código generado

- Servicio: índice ISO3, validación por país, orden alfabético español, normalización local, una promesa de sesión y cancelación independiente de consumidores.
- Componente: filtro al escribir, contador global y rango, páginas de 20, vacíos distintos, carga y tres errores con reintento; controles nativos, labels y manejo del foco.
- Estilos limitados a ciudades; nombres externos por textContent.
- Integración con ficha en main.ts, sin modificar el trabajo de los otros integrantes.

## Validación ejecutada

| Comprobación | Resultado observado |
| --- | --- |
| npm ci --no-audit --no-fund | 77 paquetes instalados desde lockfile, sin cambiar dependencias. |
| npm test antes de ciudades | 109 pruebas en 6 archivos pasan. |
| Servicio/propiedades iniciales | 27 pruebas pasan. |
| Componente | 16 pruebas pasan. |
| npm test final | 156 pruebas en 10 archivos pasan: 109 base + 47 de ciudades. |
| npx tsc --noEmit | Código de salida 0, sin diagnósticos. |
| npm run build | Código de salida 0; 13 módulos; JS 10.47 kB, gzip 4.01 kB. |
| git diff --check | Sin errores de whitespace. |
| npm run dev -- --host 127.0.0.1 | Vite inicia correctamente en http://127.0.0.1:5173/. |
| API exploratoria fuera de pruebas | /countries respondió error:false, 227 países y 82 ciudades para PER en ese momento. |

Las pruebas usan fetch simulado; ninguna prueba consulta CountriesNow. Cubren 0/1/20/21/40/41 ciudades, filtro Unicode/mayúsculas/subcadena, contador global, límites, recuperación, datos mal formados, HTML literal, caché, consumidores simultáneos, abort, timeout real del cliente con reloj simulado y preservación de capital/bandera en integración.

### Validación visual pendiente

Se intentó abrir la app local con Browser Use: ERR_CONNECTION_TIMED_OUT. Al seleccionar Edge de Windows, la herramienta detuvo Computer Use porque no pudo determinar la URL del navegador con suficiente confianza para aplicar su política. No se continuó la automatización visual ni se sustituyó por otra vía de control del navegador. No se comprobaron visualmente móvil/escritorio ni activación nativa con Tab/Enter/Espacio. jsdom prueba estructura, eventos y foco, pero no demuestra esos comportamientos de navegador real. T016 queda pendiente y se añade T018 para el cierre de convergencia.

## Tabla de hallazgos del agente

| ID | Fase | Qué se detectó | Corrección / motivo | Estado |
| --- | --- | --- | --- | --- |
| H1 | Inspección inicial | main solo contiene esqueleto y el PR visible es la constitución. | Basear ciudades en desarrollo 001-ficha-base y declarar dependencia; evita inventar la base o mezclar a main antes de tiempo. | Dependencia externa pendiente. |
| H2 | Plan | La signal de una ficha cancelaría una descarga compartida si se pasara a obtenerJson. | Cancelación de la espera por consumidor y pruebas concurrentes; no pasar signal de ficha a descarga. | Implementado y probado. |
| H3 | Plan | normalizarNombre de ficha conserva tildes por su contrato. | Complementar localmente en ciudades; no modificar la funcionalidad de José. | Implementado y probado. |
| H4 | Revisión del código | Quitar marcas después de colapsar espacios puede dejar dobles espacios si hay una marca combinada entre ellos. | Quitar marcas antes de normalizarNombre y añadir propiedad generativa con espacios, tabulaciones y marcas. | Corregido; 156 pruebas pasan. |
| H5 | Validación | No fue posible verificar URL de Edge con la herramienta. | Detener control visual, registrar límite y dejar ensayos manuales pendientes. | Pendiente T016/T018. |
| G1 | Gobernanza | No hay evidencia de revisión humana fase por fase. | Entregar propuesta para revisión, sin inventar aprobaciones ni fusionar main. | Pendiente de Paulo. |

H2/H3 son decisiones preventivas del diseño, no fallos de código observados en una ejecución. H4 es una corrección real durante revisión del agente; no se atribuye a revisión humana. No hay capturas ni resultados manuales inventados.

## Convergencia

Inspección contra 13 FR, 5 SC, las decisiones del plan, tareas y seis principios. No se detectaron brechas de código en listado, filtro, caché, validación, errores ni registro. SC-005/T016 están parcialmente verificados por jsdom y requieren navegador real. Resultado: **tasks_appended**, no «Converged». Se añade T018 al final de tasks.md sin reescribir tareas anteriores. G1 y D1 siguen siendo condiciones humanas/de entrega.

## Pull request

Se entrega en borrador hacia main, por la dependencia y la validación manual pendiente. Revisores previstos: klismannSis (Klismann) y JCuenca17 (José). Mientras main no integre la base, el diff incluye también los commits de José; comparar 001-ficha-base...004-ciudades permite aislar ciudades. No se ejecuta merge ni se aprueba trabajo ajeno.

Paulo debe revisar spec/plan/tareas/código y completar los casos de quickstart.md. Después de integrar la base y cerrar T016/T018, actualizar con main, repetir comprobaciones y marcar listo para revisión. Las dos aprobaciones del equipo deben incluir el comentario exigido por la guía. No se han recibido ni inventado esas aprobaciones.
