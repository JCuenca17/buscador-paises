<!--
Informe de impacto de sincronización
- Cambio de versión: plantilla sin versión → 1.0.0 (adopción inicial, ratificada el 2026-10-29)
- Correcciones de la revisión humana (antes de ratificar, se mantiene 1.0.0):
  - II. Fuente de datos única: se aclara que solo las llamadas de datos (fetch) van a
    CountriesNow; se permiten imágenes y enlaces cuyas URLs vienen en la respuesta de la API
    (p. ej., banderas en upload.wikimedia.org) y enlaces externos a mapas (OpenStreetMap).
  - Restricciones técnicas: el punto «Red» recoge la misma aclaración.
  - Flujo de desarrollo y revisión: se agregan /speckit-analyze (después de /speckit-tasks) y
    /speckit-converge (después de /speckit-implement, se repite hasta que reporte Converged).
  - VI. Revisión humana, Flujo de desarrollo y revisión, y Gobernanza: todo pull request hacia
    main, incluidas las enmiendas de la constitución, requiere la aprobación de al menos dos
    integrantes distintos del autor; cada aprobación incluye un comentario de revisión que
    indica qué se revisó, cómo se probó y las observaciones encontradas (antes: un integrante
    para cualquier pull request y para las enmiendas, sin comentario obligatorio).
  - Fecha de ratificación: 2026-10-29, el día en que el equipo aprueba el pull request.
- Principios definidos:
  - [PRINCIPLE_1_NAME] → I. Simplicidad
  - [PRINCIPLE_2_NAME] → II. Fuente de datos única
  - [PRINCIPLE_3_NAME] → III. Arquitectura por capas y por funcionalidad
  - [PRINCIPLE_4_NAME] → IV. Pruebas obligatorias (NO NEGOCIABLE)
  - [PRINCIPLE_5_NAME] → V. Interfaz en español y accesible
  - (nuevo) VI. Revisión humana (NO NEGOCIABLE)
- Secciones añadidas: Restricciones técnicas, Flujo de desarrollo y revisión
- Secciones eliminadas: ninguna
- Plantillas dependientes: no se modifican (leen la constitución en tiempo de ejecución)
- TODO diferidos: ninguno
-->

# Constitución del Buscador de Países

Aplicación web donde el usuario escribe el nombre de un país y ve una ficha con su información.
La desarrolla un equipo de 5 estudiantes; cada integrante es responsable de una funcionalidad y
puede usar el agente de IA que prefiera junto con GitHub Spec Kit.

## Principios fundamentales

### I. Simplicidad

- La aplicación DEBE ser una página web estática de una sola página (SPA) construida con HTML,
  CSS y TypeScript, sin frameworks de interfaz, y empaquetada con Vite.
- NO DEBE existir backend, servidor propio ni base de datos.
- Toda dependencia nueva (de ejecución o de desarrollo) DEBE justificarse explícitamente en el
  `plan.md` de la funcionalidad que la introduce, indicando por qué no basta con la plataforma web
  o con las dependencias ya aprobadas.

**Justificación**: un proyecto pequeño, mantenido por cinco personas con distintos agentes de IA,
se mantiene coherente y comprensible solo si la base tecnológica es mínima y estable.

### II. Fuente de datos única

- Todos los datos de países DEBEN obtenerse de la API pública CountriesNow
  (`https://countriesnow.space/api/v0.1`), que no requiere clave. NO DEBEN usarse otras fuentes
  de datos ni datos incrustados como sustituto de la API.
- Las llamadas de datos (`fetch`) DEBEN dirigirse únicamente a CountriesNow. Se permite mostrar
  imágenes y enlaces cuyas URLs vienen en las respuestas de la API (por ejemplo, las banderas
  alojadas en `upload.wikimedia.org`), así como enlaces externos a mapas como OpenStreetMap;
  estos recursos se cargan o abren desde el navegador y NUNCA se consultan con `fetch`.
- Toda consulta DEBE cancelarse si supera los 10 segundos.
- Toda consulta DEBE distinguir y manejar tres casos de error, cada uno con un mensaje propio en
  español para el usuario:
  1. **Sin conexión**: la red no está disponible o la solicitud no llega al servidor.
  2. **Tiempo agotado**: la respuesta no llega dentro de los 10 segundos.
  3. **Respuesta inválida o incompleta**: estado HTTP de error, JSON mal formado, campo `error`
     verdadero o faltan datos requeridos.
- Ningún error, esperado o inesperado, DEBE dejar la página en blanco: la interfaz siempre muestra
  un estado comprensible (carga, resultado, vacío o error) y permite intentar de nuevo.

**Justificación**: una única fuente simplifica la validación y las pruebas; un manejo de errores
uniforme garantiza que la experiencia no se rompa ante una API externa que no controlamos.

### III. Arquitectura por capas y por funcionalidad

- El cliente HTTP compartido (límite de tiempo, clasificación de errores, decodificación de
  JSON) DEBE vivir en `src/api` y ser el único punto desde el que se llama a la red.
- Cada funcionalidad DEBE vivir en su propia carpeta `src/features/<funcionalidad>` y separar:
  - su **servicio**: lógica, transformación y validación de los datos, sin acceso al DOM;
  - su **componente visual**: renderizado e interacción con el DOM, sin llamadas directas a la red.
- Una funcionalidad NO DEBE modificar el código de otra funcionalidad ni el de `src/api`, salvo
  que su `plan.md` lo justifique explícitamente y el responsable afectado lo apruebe en el pull
  request.

**Justificación**: la separación permite que cinco personas trabajen en paralelo con pocos
conflictos y que la lógica se pruebe sin depender del DOM ni de la red.

### IV. Pruebas obligatorias (NO NEGOCIABLE)

- Cada funcionalidad DEBE incluir pruebas automatizadas con Vitest en entorno jsdom, que cubran
  su servicio, su componente visual y sus casos de error.
- Las reglas generales —normalización de nombres, validación de datos y formateo de números—
  DEBEN probarse además con pruebas basadas en propiedades usando fast-check.
- Las pruebas NUNCA DEBEN llamar a la API real; las respuestas de red DEBEN simularse (incluidos
  los casos sin conexión, tiempo agotado y respuesta inválida).
- Una tarea NO se considera terminada si sus pruebas no existen o no pasan.

**Justificación**: las pruebas son la evidencia objetiva de que el código generado por IA cumple
la especificación, y simular la red las hace rápidas, deterministas y reproducibles.

### V. Interfaz en español y accesible

- Todo texto visible para el usuario (etiquetas, mensajes, errores, títulos) DEBE estar en
  español.
- Todo campo de formulario DEBE tener una etiqueta asociada (`<label>` o equivalente accesible).
- Los datos provenientes de la API DEBEN insertarse en el DOM con `textContent`; NO DEBE usarse
  `innerHTML` ni equivalentes con datos externos.
- Toda la funcionalidad DEBE poder usarse solo con teclado (foco visible, orden lógico de
  tabulación, envío con Enter).

**Justificación**: el público objetivo es hispanohablante, la accesibilidad es un requisito
básico de calidad y `textContent` evita la inyección de HTML desde datos externos.

### VI. Revisión humana (NO NEGOCIABLE)

- Ninguna fase de Spec Kit (especificación, plan, tareas, implementación) DEBE avanzar sin que su
  responsable haya revisado y corregido lo generado por la IA.
- Ningún cambio DEBE llegar a la rama `main` sin un pull request aprobado por al menos dos
  integrantes del equipo distintos de su autor. Esto incluye las enmiendas de esta constitución.
- Cada aprobación DEBE incluir un comentario de revisión que indique:
  1. **Qué se revisó**: archivos, artefactos o partes del cambio.
  2. **Cómo se probó**: pruebas ejecutadas, verificación manual en el navegador o con teclado.
  3. **Observaciones encontradas**: problemas, sugerencias, o «ninguna» si no hubo.
  Una aprobación sin este comentario NO cuenta para el mínimo de dos.

**Justificación**: el responsable humano responde por el resultado; la IA acelera el trabajo,
pero no sustituye el criterio ni la revisión entre pares.

## Restricciones técnicas

- **Lenguaje**: TypeScript para toda la lógica; HTML y CSS sin preprocesadores salvo justificación
  en el plan.
- **Herramientas aprobadas**: Vite (desarrollo y empaquetado), Vitest, jsdom y fast-check
  (pruebas). Cualquier otra dependencia requiere la justificación del Principio I.
- **Red**: las llamadas de datos (`fetch`) van únicamente a `https://countriesnow.space/api/v0.1`,
  siempre a través de `src/api`. Se permiten imágenes y enlaces cuyas URLs vienen en las
  respuestas de la API (p. ej., banderas en `upload.wikimedia.org`) y enlaces externos a mapas
  como OpenStreetMap, sin consultarlos con `fetch`.
- **Estructura base**:
  - `src/api/` — cliente HTTP compartido.
  - `src/features/<funcionalidad>/` — servicio, componente visual y pruebas de cada funcionalidad.
- **Despliegue**: el resultado de `vite build` DEBE poder servirse como archivos estáticos.

## Flujo de desarrollo y revisión

1. Cada funcionalidad tiene un único responsable, que la lleva por las fases de Spec Kit:
   `/speckit-specify` → `/speckit-clarify` (si aplica) → `/speckit-plan` → `/speckit-tasks` →
   `/speckit-analyze` → `/speckit-implement` → `/speckit-converge`. Si `/speckit-converge`
   agrega tareas, se vuelve a ejecutar `/speckit-implement` y luego `/speckit-converge`, y se
   repite hasta que reporte `Converged`.
2. Al cerrar cada fase, el responsable revisa y corrige el artefacto generado antes de pasar a la
   siguiente (Principio VI).
3. El `plan.md` DEBE incluir una verificación explícita de cumplimiento de esta constitución y
   registrar cualquier excepción justificada (dependencias nuevas, cambios en código ajeno).
4. Cada funcionalidad se desarrolla en su propia rama y se integra a `main` solo mediante pull
   request aprobado por al menos dos integrantes distintos del autor (Principio VI).
5. Antes de aprobar un pull request, el revisor DEBE comprobar que:
   - todas las pruebas pasan;
   - no hay llamadas a la API real en las pruebas;
   - los textos visibles están en español y los datos se insertan con `textContent`;
   - no se modificó código de otras funcionalidades sin justificación en el plan.
6. Cada revisor deja su aprobación con un comentario de revisión que indica qué se revisó, cómo
   se probó y las observaciones encontradas. El pull request se integra solo cuando reúne dos
   aprobaciones con su comentario y no quedan observaciones bloqueantes sin resolver.

## Gobernanza

- Esta constitución prevalece sobre cualquier otra práctica, convención o instrucción dada a un
  agente de IA. En caso de conflicto, rige la constitución.
- **Enmiendas**: cualquier integrante puede proponer una enmienda mediante un pull request que
  modifique este archivo, explique el motivo y el impacto en el trabajo existente. Como todo pull
  request hacia `main`, la enmienda requiere la aprobación de al menos dos integrantes distintos
  del autor, cada una con su comentario de revisión (Principio VI).
- **Versionado** (versionado semántico):
  - MAYOR: se elimina o redefine un principio de forma incompatible.
  - MENOR: se agrega un principio o sección, o se amplía materialmente una regla.
  - PARCHE: aclaraciones, redacción o correcciones sin cambio de significado.
- **Cumplimiento**: cada `plan.md` y cada revisión de pull request DEBEN verificar el cumplimiento
  de los principios. Toda complejidad adicional DEBE estar justificada por escrito en el plan.

**Versión**: 1.0.0 | **Ratificada**: 2026-10-29 | **Última enmienda**: 2026-10-29
