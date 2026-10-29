# Contrato: búsqueda inteligente

Contrato interno entre el servicio de búsqueda inteligente, su componente y la ficha base.
El campo sigue siendo propiedad del componente de la ficha.

## Integración con la ficha base

El punto de composición se registra desde `src/main.ts`. La ficha expone un adaptador opcional de
resolución de consulta y acceso de solo lectura al catálogo de capitales que ya mantiene en caché,
con firmas conceptuales:

```ts
type ResolverConsulta = (texto: string) => Promise<string>;
function obtenerCapitalesCompartidas(): Promise<readonly unknown[]>;
```

- Si se omite, la ficha conserva exactamente la búsqueda base actual.
- Si está configurado, el submit entrega el texto al resolvedor antes de llamar a `buscarFicha`.
- El resolvedor retorna el nombre canónico de CountriesNow cuando reconoce el alias. Si no lo
  reconoce, retorna el texto original para conservar el estado base «No se encontró el país».
- Un `ErrorApi` del resolvedor se traduce al mismo mensaje de error español que usa la ficha; el
  botón «Reintentar» repite la consulta original a través del resolvedor.
- `obtenerCapitalesCompartidas` devuelve la misma promesa/lista que usa `buscarFicha`; no efectúa una segunda
  solicitud. El catálogo de sugerencias se deriva en memoria de esa lista y no la modifica.
- El adaptador no pinta la ficha ni sustituye la validación, la cancelación, el indicador de carga
  o los estados existentes.
- Añadir el adaptador a `src/features/ficha/ficha.component.ts` y exportar el acceso de solo lectura
  desde `src/features/ficha/ficha.service.ts` requiere aprobación explícita de Jose antes de
  implementación. Su aprobación de PR debe explicar qué revisó, cómo lo probó y sus observaciones
  conforme a la constitución.

## Contrato del campo y sugerencias

- Se usa el campo existente `#nombre-pais`; no se crea un segundo formulario ni un segundo submit.
- La etiqueta visible continúa siendo «Nombre del país» y el límite de 100 caracteres sigue siendo
  el definido por la ficha.
- El componente añade los atributos combobox necesarios sin quitar `aria-describedby` ni la
  etiqueta existente.
- La lista usa `role="listbox"`; cada opción usa `role="option"`, texto en español y un id único.
- Si un alias español normalizado corresponde a más de un registro, la etiqueta visible de cada
  opción es `nombreEspanol — nombreApi (iso2)`. En los casos no ambiguos se muestra `nombreEspanol`.
  Las opciones distintas conservan identificadores únicos aunque compartan ISO2.
- El input expone `aria-expanded`, `aria-controls` y `aria-activedescendant` cuando corresponda.
- Las teclas ArrowDown/ArrowUp mueven la opción activa; Enter confirma la activa; Escape cierra la
  lista sin buscar. Con lista cerrada o sin opción activa, Enter conserva el submit manual base.
- Al elegir con clic o teclado, se refleja en el campo la etiqueta visible de la opción y se envía
  el formulario base; el resolvedor reconoce la etiqueta diferenciada y entrega el nombre canónico
  de API correspondiente.
- Cada evento `input` invalida la opción activa anterior y presenta coincidencias del valor nuevo.
- Cero coincidencias cierra/limpia la lista sin reemplazar el estado base.

## Errores de carga y recuperación

Los errores al obtener el catálogo durante la escritura se muestran en una región `role="alert"`
asociada al combobox. Cada caso usa el mensaje español correspondiente al cliente HTTP:

| Error | Mensaje visible |
|---|---|
| `sin-conexion` | «No hay conexión. Revisa tu conexión a internet e inténtalo de nuevo.» |
| `tiempo-agotado` | «El servicio tardó demasiado en responder. Inténtalo de nuevo.» |
| `respuesta-invalida` | «No se pudo obtener la información del país. Inténtalo de nuevo.» |

- Junto al mensaje se muestra el botón «Reintentar sugerencias».
- El botón vuelve a solicitar el catálogo compartido y actualiza las sugerencias del texto actual;
  no envía el formulario ni modifica el valor escrito.
- El botón es accesible por Tab, Enter y Espacio y mantiene/restaura un foco visible y lógico al
  cerrar o reemplazar el estado.
- Si el fallo ocurre durante un submit manual, el error se entrega a la ficha base, que muestra su
  mensaje y «Reintentar» habituales; ese reintento vuelve a resolver la consulta original.
- Un error nunca deja la página en blanco ni oculta el campo de búsqueda.

## Seguridad y contenido

- Nombres de la API y de `Intl.DisplayNames` se asignan con `textContent`.
- No se usa `innerHTML` para renderizar datos externos.
- No se llama a `fetch` desde el componente; el servicio usa `obtenerJson`.

## Textos visibles

La opción muestra el nombre del país en español y, si el alias es ambiguo, el diferenciador indicado
arriba. Los mensajes de carga, error, validación y ficha son los existentes en la ficha base; el
error de carga de sugerencias tiene los mismos tres textos en español y su propio botón de reintento.