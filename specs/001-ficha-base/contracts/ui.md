# Contrato: interfaz visible

Estructura y textos que fijan las pruebas del componente. Textos exactos de la especificación.

## Firma del Componente

### `montarFicha`

Inicializa la interfaz de la ficha base en el elemento contenedor proporcionado y permite registrar un resolvedor opcional de búsqueda inteligente.

```typescript
export function montarFicha(
  elemento: HTMLElement,
  resolverConsulta?: (texto: string) => Promise<string>
): void;
```

`resolverConsulta` es opcional. Si se omite, la ficha conserva su comportamiento base. Si se
proporciona, se invoca con el texto original antes de `buscarFicha`; debe devolver el nombre
canónico que acepta el servicio de la ficha. Si rechaza, la ficha muestra el error español de
respuesta inválida y «Reintentar» vuelve a resolver el último texto original.

La composición puede conectar un componente de búsqueda inteligente al mismo input existente.
Este adaptador no sustituye el formulario, su validación, los estados de carga/error ni el
renderizado de la ficha.
## Estructura

```html
<main>
  <h1>Buscador de países</h1>
  <form role="search" novalidate>
    <label for="nombre-pais">Nombre del país</label>
    <input id="nombre-pais" name="nombre" type="text" maxlength="100" autocomplete="off"
           aria-describedby="validacion-pais">
    <p id="validacion-pais" class="validacion"><!-- mensaje de validación --></p>
    <button type="submit">Buscar</button>
  </form>
  <div data-estado role="status" aria-live="polite"><!-- carga, no encontrado --></div>
  <div data-error role="alert"><!-- mensaje de falla + botón Reintentar --></div>
  <article data-ficha hidden>
    <h2><!-- nombre --></h2>
    <p>Capital: <span data-capital></span></p>
    <figure data-bandera><img alt="Bandera de {nombre}"></figure>
    <div data-ficha-secciones></div>
  </article>
</main>
```

Los atributos `data-*` son los selectores de las pruebas; no se seleccionan por clase CSS.

## Textos

| Situación | Texto | Dónde |
|-----------|-------|-------|
| Campo vacío o solo espacios | «Escribe el nombre de un país» | `#validacion-pais`, con `aria-invalid="true"` en el campo |
| Consultando | «Buscando…» | `[data-estado]` |
| País inexistente | «No se encontró el país» | `[data-estado]` |
| Sin conexión | «No hay conexión. Revisa tu conexión a internet e inténtalo de nuevo.» | `[data-error]` |
| Tiempo agotado | «El servicio tardó demasiado en responder. Inténtalo de nuevo.» | `[data-error]` |
| Respuesta inválida | «No se pudo obtener la información del país. Inténtalo de nuevo.» | `[data-error]` |
| Botón tras una falla | «Reintentar» | `[data-error]` |
| Capital inexistente | «no disponible» | `[data-capital]` |
| Bandera inexistente o que no carga | «Bandera no disponible» | `[data-bandera]` |
| Error de una sección agregada | «No se pudo cargar esta sección» | dentro de su `<section>` |

## Interacción

- Foco en `#nombre-pais` al cargar.
- Enviar el formulario (botón o Enter) inicia la búsqueda; nunca se desactiva.
- Evento `input` en el campo: borra el mensaje de validación y `aria-invalid`.
- «Reintentar» repite la última `ConsultaBusqueda` y es alcanzable con Tab y activable con Enter
  o Espacio. Al pulsarlo, el foco vuelve a `#nombre-pais`, porque el botón desaparece al iniciar
  la búsqueda y el foco no debe quedar en `<body>`.
- Al iniciar una búsqueda: se ocultan ficha, error, estado y secciones, y se muestra «Buscando…».
