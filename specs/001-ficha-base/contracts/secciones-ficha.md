# Contrato: secciones de la ficha (para otras funcionalidades)

Permite que población, moneda, ciudades u otras funcionalidades agreguen su parte a la ficha sin
modificar `src/features/ficha` (FR-018, Principio III).

## Firma (`src/features/ficha/secciones.ts`)

```ts
/** Datos del país que recibe cada sección (tipos.ts). */
interface PaisFicha {
  nombre: string;          // tal como lo entrega la fuente, sin espacios extremos
  capital: string | null;
  bandera: string | null;  // URL https: o null
  iso2: string;            // p. ej. "PE"
  iso3: string;            // p. ej. "PER"; la lista de población de CountriesNow se une por iso3
}

interface SeccionFicha {
  /** Único; se usa como data-seccion y para ordenar errores en pruebas. */
  id: string;
  /** Título visible en español, como encabezado de la sección. */
  titulo: string;
  /**
   * Pinta la sección dentro de `contenedor` (un <section> vacío creado por la ficha).
   * Debe usar textContent para datos externos y llamar a la red solo con obtenerJson.
   * `signal` se aborta cuando empieza otra búsqueda.
   */
  renderizar(pais: PaisFicha, contenedor: HTMLElement, signal: AbortSignal): void | Promise<void>;
}

function registrarSeccion(seccion: SeccionFicha): void;
```

## Garantías de la ficha base

- `pais.iso2` y `pais.iso3` siempre son texto no vacío: un país con esos datos mal formados nunca
  llega a mostrarse (da `respuesta-invalida`). Las secciones pueden usarlos para relacionar otras
  listas sin volver a validarlos.
- Las secciones se pintan en el orden de registro, después de la ficha base, dentro de
  `<div data-ficha-secciones>`.
- Cada sección recibe su propio `<section data-seccion="{id}" aria-labelledby>` con un `<h3>` con
  `titulo`.
- Si `renderizar` lanza o su promesa se rechaza (salvo por `signal` abortada), la ficha quita el
  contenido de ese `<section>` (conserva su `<h3>`, al que apunta `aria-labelledby`) y muestra en
  él «No se pudo cargar esta sección». La ficha base y las demás
  secciones no cambian.
- Al iniciar otra búsqueda se aborta `signal` y se eliminan todas las secciones.
- Registrar dos secciones con el mismo `id` lanza un error en tiempo de desarrollo.

## Cómo se integra otra funcionalidad

En `src/main.ts`, el punto de composición, se añade una línea antes de montar la página:

```ts
registrarSeccion(seccionPoblacion);
```

Esa es la única línea fuera de su carpeta que otra funcionalidad necesita tocar.
