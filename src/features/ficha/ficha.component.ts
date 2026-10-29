/**
 * Componente de la ficha: formulario, estados y secciones. Sin red (usa ficha.service).
 * Contrato: specs/001-ficha-base/contracts/ui.md
 */
import { buscarFicha } from "./ficha.service";
import { obtenerSecciones } from "./secciones";
import type { PaisFicha } from "./tipos";

function crear<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  texto?: string,
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(etiqueta);
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

export function montarFicha(raiz: HTMLElement): void {
  const main = crear("main");
  const titulo = crear("h1", "Buscador de países");

  const formulario = crear("form");
  formulario.setAttribute("role", "search");
  formulario.noValidate = true;

  const etiqueta = crear("label", "Nombre del país");
  etiqueta.htmlFor = "nombre-pais";

  const campo = crear("input");
  campo.id = "nombre-pais";
  campo.name = "nombre";
  campo.type = "text";
  campo.maxLength = 100;
  campo.autocomplete = "off";
  campo.setAttribute("aria-describedby", "validacion-pais");

  const validacion = crear("p");
  validacion.id = "validacion-pais";
  validacion.className = "validacion";

  const botonBuscar = crear("button", "Buscar");
  botonBuscar.type = "submit";

  formulario.append(etiqueta, campo, validacion, botonBuscar);

  const estado = crear("div");
  estado.dataset.estado = "";
  estado.setAttribute("role", "status");
  estado.setAttribute("aria-live", "polite");

  const error = crear("div");
  error.dataset.error = "";
  error.setAttribute("role", "alert");

  const ficha = crear("article");
  ficha.dataset.ficha = "";
  ficha.hidden = true;
  const nombre = crear("h2");
  const parrafoCapital = crear("p", "Capital: ");
  const capital = crear("span");
  capital.dataset.capital = "";
  parrafoCapital.append(capital);
  const bandera = crear("figure");
  bandera.dataset.bandera = "";
  const secciones = crear("div");
  secciones.dataset.fichaSecciones = "";
  ficha.append(nombre, parrafoCapital, bandera, secciones);

  main.append(titulo, formulario, estado, error, ficha);
  raiz.append(main);
  campo.focus();

  let idBusqueda = 0;
  let controlador: AbortController | null = null;

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    void buscar(campo.value);
  });

  async function buscar(texto: string): Promise<void> {
    controlador?.abort();
    controlador = new AbortController();
    const { signal } = controlador;
    const id = ++idBusqueda;

    ficha.hidden = true;
    secciones.replaceChildren();
    error.replaceChildren();
    estado.textContent = "Buscando…";

    const resultado = await buscarFicha(texto, { signal });
    if (id !== idBusqueda) return;

    estado.textContent = "";
    if (resultado.tipo === "encontrado") pintarFicha(resultado.pais, signal);
  }

  function pintarFicha(pais: PaisFicha, signal: AbortSignal): void {
    nombre.textContent = pais.nombre;
    capital.textContent = pais.capital ?? "no disponible";
    pintarBandera(pais);
    ficha.hidden = false;
    pintarSecciones(pais, signal);
  }

  function pintarBandera(pais: PaisFicha): void {
    if (pais.bandera === null) {
      bandera.textContent = "Bandera no disponible";
      return;
    }
    const imagen = crear("img");
    imagen.alt = `Bandera de ${pais.nombre}`;
    imagen.addEventListener("error", () => {
      // Solo si sigue siendo la imagen de la ficha actual.
      if (imagen.parentNode === bandera) bandera.textContent = "Bandera no disponible";
    });
    imagen.src = pais.bandera;
    bandera.replaceChildren(imagen);
  }

  function pintarSecciones(pais: PaisFicha, signal: AbortSignal): void {
    for (const seccion of obtenerSecciones()) {
      const contenedor = crear("section");
      contenedor.dataset.seccion = seccion.id;
      const encabezado = crear("h3", seccion.titulo);
      encabezado.id = `seccion-${seccion.id}-titulo`;
      contenedor.setAttribute("aria-labelledby", encabezado.id);
      contenedor.append(encabezado);
      secciones.append(contenedor);

      const fallar = () => {
        if (signal.aborted) return;
        contenedor.replaceChildren(encabezado, crear("p", "No se pudo cargar esta sección"));
      };
      try {
        Promise.resolve(seccion.renderizar(pais, contenedor, signal)).catch(fallar);
      } catch {
        fallar();
      }
    }
  }
}
