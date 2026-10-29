# Especificación de funcionalidad: Buscar país

**Rama de la funcionalidad**: `001-ficha-base`

**Creada**: 2026-10-29

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Quiero una aplicación web para consultar información de
países. El usuario escribe el nombre de un país en un campo de búsqueda y presiona Buscar o la
tecla Enter. La aplicación muestra una ficha con el nombre del país, su capital y su bandera. Si
el campo está vacío o solo tiene espacios, se muestra un mensaje de validación y no se hace
ninguna consulta. Si el país no existe, se muestra "No se encontró el país". Si el servicio no
responde en 10 segundos o falla la conexión, se muestra un mensaje claro y el usuario puede volver
a intentar. Mientras se consulta, se muestra un indicador de carga, y al iniciar una nueva
búsqueda se limpia el resultado anterior."

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Consultar la ficha de un país (Prioridad: P1)

El usuario escribe el nombre de un país en el campo de búsqueda y presiona el botón «Buscar» o la
tecla Enter. Mientras se obtiene la información ve un indicador de carga, y luego aparece una
ficha con el nombre del país, su capital y su bandera.

**Por qué esta prioridad**: es el propósito principal de la aplicación; sin ella no hay producto.

**Prueba independiente**: buscar un país existente (por ejemplo, «Peru») con el botón y con
Enter, y comprobar que se muestra la ficha con nombre, capital y bandera.

**Escenarios de aceptación**:

1. **Dado** que la página está cargada, **cuando** el usuario escribe el nombre de un país
   existente y presiona «Buscar», **entonces** se muestra un indicador de carga y después una
   ficha con el nombre del país tal como lo entrega la fuente de datos, su capital y su
   bandera.
2. **Dado** que el foco está en el campo de búsqueda con un nombre de país escrito, **cuando** el
   usuario presiona Enter, **entonces** ocurre lo mismo que al presionar «Buscar».
3. **Dado** que el usuario escribió el nombre con mayúsculas/minúsculas distintas o con espacios
   al inicio o al final (por ejemplo, «  pERU »), **cuando** busca, **entonces** se encuentra el
   mismo país.
4. **Dado** que ya hay una ficha en pantalla, **cuando** el usuario inicia una nueva búsqueda,
   **entonces** la ficha anterior desaparece de inmediato y se muestra el indicador de carga.

---

### Historia de usuario 2 - Validar la entrada y avisar si el país no existe (Prioridad: P2)

Si el usuario intenta buscar con el campo vacío o con solo espacios, la aplicación le avisa sin
consultar nada. Si escribe un nombre que no corresponde a ningún país, se le informa con el
mensaje «No se encontró el país».

**Por qué esta prioridad**: evita consultas inútiles y le da al usuario una respuesta clara cuando
se equivoca; es la segunda situación más frecuente después de una búsqueda exitosa.

**Prueba independiente**: buscar con el campo vacío, con solo espacios y con un nombre
inexistente («Atlantida»), y comprobar los mensajes y que en los dos primeros casos no se hace
ninguna consulta.

**Escenarios de aceptación**:

1. **Dado** que el campo está vacío, **cuando** el usuario presiona «Buscar» o Enter,
   **entonces** se muestra el mensaje de validación «Escribe el nombre de un país» junto al campo
   y no se realiza ninguna consulta.
2. **Dado** que el campo contiene solo espacios, **cuando** el usuario busca, **entonces** ocurre
   lo mismo que con el campo vacío.
3. **Dado** que el usuario escribe un nombre que no corresponde a ningún país, **cuando** busca,
   **entonces** se muestra el mensaje «No se encontró el país» y no se muestra ninguna ficha.
4. **Dado** que se mostró un mensaje de validación, **cuando** el usuario escribe un nombre válido
   y busca, **entonces** el mensaje de validación desaparece.

---

### Historia de usuario 3 - Recuperarse de fallas del servicio (Prioridad: P3)

Si no hay conexión, si el servicio tarda más de 10 segundos o si responde con datos inválidos, el
usuario ve un mensaje claro que explica qué pasó y un botón «Reintentar» que repite la última
búsqueda.

**Por qué esta prioridad**: no es el camino habitual, pero sin ella un fallo externo dejaría la
página sin respuesta, lo que la constitución prohíbe.

**Prueba independiente**: simular cada falla (sin conexión, demora mayor a 10 segundos, respuesta
inválida) y comprobar el mensaje correspondiente y que «Reintentar» repite la búsqueda.

**Escenarios de aceptación**:

1. **Dado** que no hay conexión, **cuando** el usuario busca, **entonces** se muestra «No hay
   conexión. Revisa tu conexión a internet e inténtalo de nuevo.» y el botón «Reintentar».
2. **Dado** que el servicio no responde en 10 segundos, **cuando** se cumple ese plazo,
   **entonces** la consulta se cancela, se oculta el indicador de carga y se muestra «El servicio
   tardó demasiado en responder. Inténtalo de nuevo.» con el botón «Reintentar».
3. **Dado** que el servicio responde con datos inválidos o incompletos, **cuando** termina la
   consulta, **entonces** se muestra «No se pudo obtener la información del país. Inténtalo de
   nuevo.» con el botón «Reintentar».
4. **Dado** que se muestra un mensaje de error con «Reintentar», **cuando** el usuario lo
   presiona (con el ratón o con el teclado), **entonces** se repite la última búsqueda con el
   mismo texto, mostrando de nuevo el indicador de carga.

---

### Casos límite

- **Búsquedas encadenadas**: si el usuario inicia una búsqueda nueva antes de que termine la
  anterior, solo se muestra el resultado de la última; el resultado tardío de la anterior se
  descarta.
- **Capital no disponible**: si el país existe pero no tiene capital registrada, la ficha muestra
  «Capital: no disponible» en lugar de dejar el dato vacío.
- **Bandera no disponible o que no carga**: si no hay bandera o la imagen no se puede cargar, la
  ficha muestra el texto «Bandera no disponible» en su lugar; el resto de la ficha se sigue
  mostrando.
- **Nombre con caracteres especiales**: textos con símbolos, números o etiquetas HTML se tratan
  como texto común: se buscan tal cual (normalizados) y nunca se interpretan como contenido de la
  página.
- **Nombre muy largo**: el campo acepta como máximo 100 caracteres.
- **Varias pulsaciones seguidas**: presionar «Buscar» varias veces mientras hay una consulta en
  curso no genera fichas duplicadas.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001**: La aplicación DEBE ofrecer un campo de búsqueda con la etiqueta visible «Nombre del
  país» y un botón «Buscar».
- **FR-002**: La aplicación DEBE iniciar la búsqueda al presionar «Buscar» o al presionar Enter
  dentro del campo.
- **FR-003**: Antes de consultar, la aplicación DEBE normalizar el texto ingresado: quitar
  espacios al inicio y al final, reducir espacios internos repetidos a uno solo y comparar sin
  distinguir mayúsculas de minúsculas.
- **FR-004**: Si el texto normalizado está vacío, la aplicación DEBE mostrar el mensaje de
  validación «Escribe el nombre de un país», asociado al campo, y NO DEBE realizar ninguna
  consulta.
- **FR-005**: La aplicación DEBE reconocer únicamente los nombres de país en inglés, tal como los
  entrega la fuente de datos (por ejemplo, «Spain», «Germany»), aplicando la normalización de
  FR-003. Un nombre en español u otra variante (por ejemplo, «España») DEBE tratarse como país no
  encontrado (FR-006).
- **FR-006**: Si el nombre no corresponde a ningún país, la aplicación DEBE mostrar el mensaje «No
  se encontró el país» sin ficha.
- **FR-007**: Si el país existe, la aplicación DEBE mostrar una ficha con el nombre del país, su
  capital y su bandera; la bandera DEBE tener un texto alternativo con el nombre del país (por
  ejemplo, «Bandera de Peru»).
- **FR-008**: Mientras una consulta está en curso, la aplicación DEBE mostrar un indicador de
  carga con el texto «Buscando…», anunciado a lectores de pantalla.
- **FR-009**: Al iniciar una nueva búsqueda, la aplicación DEBE retirar de inmediato la ficha y
  cualquier mensaje de la búsqueda anterior.
- **FR-010**: Si hay búsquedas superpuestas, la aplicación DEBE mostrar únicamente el resultado
  de la búsqueda más reciente.
- **FR-011**: Toda consulta DEBE cancelarse si no termina en 10 segundos.
- **FR-012**: La aplicación DEBE distinguir tres fallas y mostrar para cada una su mensaje: sin
  conexión, tiempo agotado y respuesta inválida o incompleta (textos en la Historia 3).
- **FR-013**: Ante cualquiera de esas tres fallas, la aplicación DEBE ofrecer un botón
  «Reintentar» que repita la última búsqueda con el mismo texto.
- **FR-014**: Ningún error DEBE dejar la página en blanco: siempre se ve el campo de búsqueda y un
  estado comprensible (inicial, cargando, ficha, no encontrado, validación o error).
- **FR-015**: Si faltan la capital o la bandera, la ficha DEBE mostrar «no disponible» para ese
  dato en lugar de fallar.
- **FR-016**: Todo el flujo (escribir, buscar, reintentar) DEBE poder hacerse solo con teclado,
  con foco visible.
- **FR-017**: Todos los textos visibles DEBEN estar en español, y los datos recibidos DEBEN
  mostrarse siempre como texto, nunca interpretarse como contenido de la página.

### Entidades clave

- **Consulta de búsqueda**: el texto que escribió el usuario y su versión normalizada; es lo que
  se repite al reintentar.
- **Ficha de país**: nombre del país, capital (puede faltar) y dirección de la imagen de su
  bandera (puede faltar).
- **Resultado de búsqueda**: uno de estos estados: cargando, ficha encontrada, país no encontrado,
  validación, sin conexión, tiempo agotado o respuesta inválida.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: En las pruebas automatizadas con respuestas simuladas, la ficha aparece en el 100 %
  de las búsquedas de países existentes.
- **SC-002**: En el 100 % de los intentos con el campo vacío o solo con espacios, se muestra el
  mensaje de validación y no se realiza ninguna consulta.
- **SC-003**: Ante cualquier falla del servicio, el usuario ve un mensaje de error a más tardar 10
  segundos después de iniciar la búsqueda, y la página nunca queda en blanco.
- **SC-004**: Un usuario que usa solo teclado puede buscar un país y reintentar tras un error sin
  usar el ratón.

## Supuestos

- La información de países (nombre, capital y bandera) proviene del servicio público de datos de
  países definido en la constitución del proyecto, que no requiere registro.
- Las banderas se muestran como imágenes cuyas direcciones vienen en la respuesta del servicio.
- La búsqueda requiere coincidencia con el nombre completo del país una vez normalizado; no hay
  búsqueda parcial ni lista de sugerencias en esta versión.
- Se muestra una sola ficha por búsqueda; no se guarda historial de búsquedas.
- Al cargar la página, el foco se coloca en el campo de búsqueda.
- Los usuarios usan navegadores de escritorio o móviles actuales.
- Fuera del alcance: otros datos del país (población, moneda, mapa), que corresponden a otras
  funcionalidades del equipo.
- Fuera del alcance: aceptar nombres en español o sin tildes; corresponde a la funcionalidad
  `005-busqueda-inteligente`.
