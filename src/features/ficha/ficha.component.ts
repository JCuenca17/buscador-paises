/**
 * Componente de la ficha: formulario, estados y secciones. Sin red (usa ficha.service).
 * Contrato: specs/001-ficha-base/contracts/ui.md
 */
import { buscarFicha } from "./ficha.service";
import { normalizarNombre } from "./normalizar";
import { obtenerSecciones } from "./secciones";
import type { PaisFicha } from "./tipos";

const MENSAJES_ERROR = {
  "sin-conexion": "No hay conexión. Revisa tu conexión a internet e inténtalo de nuevo.",
  "tiempo-agotado": "El servicio tardó demasiado en responder. Inténtalo de nuevo.",
  "respuesta-invalida": "No se pudo obtener la información del país. Inténtalo de nuevo.",
} as const;

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
  /** Texto de la última búsqueda enviada (ConsultaBusqueda), que repite «Reintentar». */
  let ultimaConsulta = "";

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    // Campo vacío: no es una búsqueda nueva; se conserva lo que haya en pantalla (FR-004).
    if (normalizarNombre(campo.value) === "") {
      validacion.textContent = "Escribe el nombre de un país";
      campo.setAttribute("aria-invalid", "true");
      return;
    }
    limpiarValidacion();
    void buscar(campo.value);
  });

  campo.addEventListener("input", limpiarValidacion);

  function limpiarValidacion(): void {
    validacion.textContent = "";
    campo.removeAttribute("aria-invalid");
  }

  async function buscar(texto: string): Promise<void> {
    ultimaConsulta = texto;
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
    switch (resultado.tipo) {
      case "encontrado":
        pintarFicha(resultado.pais, signal);
        break;
      case "no-encontrado":
        estado.textContent = "No se encontró el país";
        break;
      case "sin-conexion":
      case "tiempo-agotado":
      case "respuesta-invalida":
        pintarError(MENSAJES_ERROR[resultado.tipo]);
        break;
      case "cancelada":
        break;
    }
  }

  /** Mensaje de falla con «Reintentar», que repite la última búsqueda enviada (FR-013). */
  function pintarError(mensaje: string): void {
    const reintentar = crear("button", "Reintentar");
    reintentar.type = "button";
    reintentar.addEventListener("click", () => {
      // El botón desaparece al empezar la búsqueda: el foco vuelve al campo.
      campo.focus();
      void buscar(ultimaConsulta);
    });
    error.replaceChildren(crear("p", mensaje), reintentar);
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
