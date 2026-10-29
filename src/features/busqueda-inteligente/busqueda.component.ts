import { ErrorApi } from "../../api/http";
import { buscarSugerencias, obtenerCatalogoPaises, type PaisSugerible } from "./busqueda.service";

export interface OpcionesSugerencias {
  obtenerCatalogo?: () => Promise<readonly PaisSugerible[]>;
  alSeleccionar: (pais: PaisSugerible) => void;
}

const MENSAJES_ERROR = {
  "sin-conexion": "No hay conexión. Revisa tu conexión a internet e inténtalo de nuevo.",
  "tiempo-agotado": "El servicio tardó demasiado en responder. Inténtalo de nuevo.",
  "respuesta-invalida": "No se pudo obtener la información del país. Inténtalo de nuevo.",
} as const;

let siguienteId = 0;

function crear<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  texto?: string,
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(etiqueta);
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function tipoError(error: unknown): keyof typeof MENSAJES_ERROR {
  if (error instanceof ErrorApi && error.tipo in MENSAJES_ERROR) {
    return error.tipo as keyof typeof MENSAJES_ERROR;
  }
  return "respuesta-invalida";
}

export function montarSugerencias(
  input: HTMLInputElement,
  opciones: OpcionesSugerencias,
): () => void {
  const obtenerCatalogo = opciones.obtenerCatalogo ?? obtenerCatalogoPaises;
  const padre = input.parentElement;
  if (!padre) throw new Error("El campo de búsqueda debe estar conectado al DOM");

  const contenedor = crear("div");
  contenedor.className = "busqueda-inteligente";
  const siguiente = input.nextSibling;
  padre.insertBefore(contenedor, input);
  contenedor.append(input);

  const id = ++siguienteId;
  const lista = crear("ul");
  lista.id = `sugerencias-pais-${id}`;
  lista.className = "sugerencias-pais";
  lista.setAttribute("role", "listbox");
  lista.hidden = true;

  const alerta = crear("div");
  alerta.id = `error-sugerencias-pais-${id}`;
  alerta.className = "error-sugerencias-pais";
  alerta.setAttribute("role", "alert");
  alerta.hidden = true;
  const mensaje = crear("p");
  const botonReintentar = crear("button", "Reintentar sugerencias");
  botonReintentar.type = "button";
  botonReintentar.dataset.reintentarSugerencias = "";
  alerta.append(mensaje, botonReintentar);
  contenedor.append(lista, alerta);

  const atributosOriginales = new Map<string, string | null>();
  for (const atributo of ["role", "aria-autocomplete", "aria-expanded", "aria-controls", "aria-activedescendant"]) {
    atributosOriginales.set(atributo, input.getAttribute(atributo));
  }
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", lista.id);

  let resultados: readonly PaisSugerible[] = [];
  let indiceActivo = -1;
  let numeroConsulta = 0;
  let omitirSiguienteInput = false;
  const descripcionOriginal = input.getAttribute("aria-describedby");

  const enlazarAlerta = (visible: boolean) => {
    const ids = new Set((descripcionOriginal ?? "").split(/\s+/).filter(Boolean));
    if (visible) ids.add(alerta.id);
    input.setAttribute("aria-describedby", [...ids].join(" "));
    if (ids.size === 0) input.removeAttribute("aria-describedby");
  };

  const cerrarLista = () => {
    lista.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    indiceActivo = -1;
  };

  const limpiarAlerta = () => {
    alerta.hidden = true;
    mensaje.textContent = "";
    enlazarAlerta(false);
  };

  const pintarOpciones = (coincidencias: readonly PaisSugerible[]) => {
    resultados = coincidencias;
    lista.replaceChildren();
    indiceActivo = -1;
    input.removeAttribute("aria-activedescendant");

    for (const pais of coincidencias) {
      const opcion = crear("li", pais.etiquetaSugerencia);
      opcion.id = `${lista.id}-opcion-${pais.id}`;
      opcion.setAttribute("role", "option");
      opcion.setAttribute("aria-selected", "false");
      opcion.addEventListener("mousedown", (evento) => evento.preventDefault());
      opcion.addEventListener("click", () => seleccionar(pais));
      lista.append(opcion);
    }

    lista.hidden = coincidencias.length === 0;
    input.setAttribute("aria-expanded", String(coincidencias.length > 0));
  };

  const actualizar = async (texto: string): Promise<void> => {
    const idConsulta = ++numeroConsulta;
    cerrarLista();
    limpiarAlerta();
    lista.replaceChildren();
    resultados = [];
    if (texto.trim() === "") return;

    try {
      const catalogo = await obtenerCatalogo();
      if (idConsulta !== numeroConsulta) return;
      pintarOpciones(buscarSugerencias(catalogo, texto));
    } catch (error) {
      if (idConsulta !== numeroConsulta) return;
      resultados = [];
      const tipo = tipoError(error);
      mensaje.textContent = MENSAJES_ERROR[tipo];
      alerta.hidden = false;
      enlazarAlerta(true);
    }
  };

  const seleccionar = (pais: PaisSugerible) => {
    cerrarLista();
    limpiarAlerta();
    omitirSiguienteInput = true;
    input.value = pais.etiquetaSugerencia;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    opciones.alSeleccionar(pais);
  };

  const alEscribir = () => {
    if (omitirSiguienteInput) {
      omitirSiguienteInput = false;
      return;
    }
    void actualizar(input.value);
  };

  const alPresionarTecla = (evento: KeyboardEvent) => {
    if (evento.key === "Escape") {
      if (!lista.hidden || !alerta.hidden) {
        evento.preventDefault();
        cerrarLista();
        limpiarAlerta();
      }
      return;
    }

    if (lista.hidden || resultados.length === 0) return;

    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      indiceActivo = (indiceActivo + 1) % resultados.length;
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      indiceActivo = (indiceActivo - 1 + resultados.length) % resultados.length;
    } else if (evento.key === "Enter" && indiceActivo >= 0) {
      evento.preventDefault();
      seleccionar(resultados[indiceActivo]!);
      return;
    } else {
      return;
    }

    for (const [indice, opcion] of [...lista.children].entries()) {
      opcion.setAttribute("aria-selected", String(indice === indiceActivo));
    }
    const opcionActiva = lista.children.item(indiceActivo);
    if (opcionActiva) input.setAttribute("aria-activedescendant", opcionActiva.id);
  };

  const reintentar = () => {
    void actualizar(input.value);
  };

  input.addEventListener("input", alEscribir);
  input.addEventListener("keydown", alPresionarTecla);
  botonReintentar.addEventListener("click", reintentar);

  return () => {
    input.removeEventListener("input", alEscribir);
    input.removeEventListener("keydown", alPresionarTecla);
    botonReintentar.removeEventListener("click", reintentar);
    contenedor.replaceWith(input);
    if (siguiente && siguiente.parentNode === padre) padre.insertBefore(input, siguiente);
    for (const [atributo, valor] of atributosOriginales) {
      if (valor === null) input.removeAttribute(atributo);
      else input.setAttribute(atributo, valor);
    }
  };
}
