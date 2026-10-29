# Contrato: búsqueda inteligente

Contrato interno entre el servicio de búsqueda inteligente, su componente y la ficha base.
El campo sigue siendo propiedad del componente de la ficha.

## Integración con la ficha base

El punto de composición se registra desde `src/main.ts`. La ficha expone un adaptador opcional de
resolución de consulta, con firma conceptual:

```ts
type ResolverConsulta = (texto: string) => Promise<string>;
```

- Si se omite, la ficha conserva exactamente la búsqueda base actual.
- Si está configurado, el submit entrega el texto al resolvedor antes de llamar a `buscarFicha`.
- El resolvedor retorna el nombre canónico de CountriesNow cuando reconoce el alias. Si no lo
  reconoce, retorna el texto original para conservar el estado base «No se encontró el país».
- Un `ErrorApi` del resolvedor se traduce al mismo mensaje de error español que usa la ficha; el
  botón «Reintentar» repite la consulta original a través del resolvedor.
- El adaptador no pinta la ficha ni sustituye la validación, la cancelación, el indicador de carga
  o los estados existentes.
- Añadir el adaptador a `src/features/ficha/ficha.component.ts` requiere aprobación explícita de
  Jose antes de implementación. Su aprobación de PR debe explicar qué revisó, cómo lo probó y sus
  observaciones conforme a la constitución.

## Contrato del campo y sugerencias

- Se usa el campo existente `#nombre-pais`; no se crea un segundo formulario ni un segundo submit.
- La etiqueta visible continúa siendo «Nombre del país» y el límite de 100 caracteres sigue siendo
  el definido por la ficha.
- El componente añade los atributos combobox necesarios sin quitar `aria-describedby` ni la
  etiqueta existente.
- La lista usa `role="listbox"`; cada opción usa `role="option"`, texto en español y un id único.
- El input expone `aria-expanded`, `aria-controls` y `aria-activedescendant` cuando corresponda.
- Las teclas ArrowDown/ArrowUp mueven la opción activa; Enter confirma la activa; Escape cierra la
  lista sin buscar. Con lista cerrada o sin opción activa, Enter conserva el submit manual base.
- Al elegir con clic o teclado, se refleja el nombre español en el campo y se envía el formulario
  base; el resolvedor entrega el nombre canónico de API.
- Cada evento `input` invalida la opción activa anterior y presenta coincidencias del valor nuevo.
- Cero coincidencias o un fallo de carga cierran/limpian la lista; no sustituyen el formulario ni
  dejan la página en blanco.

## Seguridad y contenido

- Nombres de la API y de `Intl.DisplayNames` se asignan con `textContent`.
- No se usa `innerHTML` para renderizar datos externos.
- No se llama a `fetch` desde el componente; el servicio usa `obtenerJson`.

## Textos visibles

La opción muestra el nombre del país en español. Los mensajes de carga, error, validación y ficha
son los existentes en la ficha base; no se duplican ni traducen de otra manera.