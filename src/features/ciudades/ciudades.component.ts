import type { SeccionFicha } from "../ficha/secciones";
import { normalizarFiltro, obtenerCiudades, type ResultadoCiudades } from "./ciudades.service";
import "./ciudades.css";

const TAMANO_PAGINA = 20;
let siguienteId = 0;
const ERRORES = {
  "sin-conexion": "No hay conexión para cargar las ciudades. Revisa tu conexión e inténtalo de nuevo.",
  "tiempo-agotado": "El servicio tardó demasiado en cargar las ciudades. Inténtalo de nuevo.",
  "respuesta-invalida": "No se pudieron obtener las ciudades. La respuesta del servicio no es válida.",
} as const;

function crear<K extends keyof HTMLElementTagNameMap>(etiqueta: K, texto?: string): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(etiqueta);
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

export const seccionCiudades: SeccionFicha = {
  id: "ciudades",
  titulo: "Ciudades",
  async renderizar(pais, contenedor, signal) {
    if (signal.aborted) return;
    const cuerpo = crear("div");
    cuerpo.className = "ciudades";
    const estado = crear("p");
    estado.tabIndex = -1;
    estado.setAttribute("role", "status");
    estado.setAttribute("aria-live", "polite");
    estado.setAttribute("aria-atomic", "true");
    const error = crear("p");
    error.setAttribute("role", "alert");
    error.hidden = true;

    const controles = crear("div");
    controles.className = "ciudades__filtro";
    const etiqueta = crear("label", "Filtrar ciudades");
    const filtro = crear("input");
    filtro.type = "search";
    filtro.id = `ciudades-filtro-${++siguienteId}`;
    filtro.autocomplete = "off";
    etiqueta.htmlFor = filtro.id;
    controles.append(etiqueta, filtro);
    controles.hidden = true;

    const lista = crear("ul");
    lista.className = "ciudades__lista";
    const vacio = crear("p");
    const navegacion = crear("nav");
    navegacion.className = "ciudades__paginas";
    navegacion.setAttribute("aria-label", "Páginas de ciudades");
    const anterior = crear("button", "Anterior");
    const siguiente = crear("button", "Siguiente");
    anterior.type = siguiente.type = "button";
    navegacion.append(anterior, siguiente);
    navegacion.hidden = true;
    const reintentar = crear("button", "Reintentar");
    reintentar.type = "button";
    reintentar.hidden = true;
    cuerpo.append(controles, estado, error, lista, vacio, navegacion, reintentar);
    // El encabezado pertenece a ficha; solo añadimos el cuerpo de esta sección.
    contenedor.append(cuerpo);

    let ciudades: readonly string[] = [];
    let pagina = 1;

    function actualizar(): void {
      if (signal.aborted) return;
      const consulta = normalizarFiltro(filtro.value);
      const coincidencias = ciudades.filter((c) => normalizarFiltro(c).includes(consulta));
      const total = coincidencias.length;
      const paginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));
      pagina = Math.min(Math.max(1, pagina), paginas);
      const inicio = (pagina - 1) * TAMANO_PAGINA;
      const visibles = coincidencias.slice(inicio, inicio + TAMANO_PAGINA);
      lista.replaceChildren(...visibles.map((nombre) => crear("li", nombre)));
      estado.textContent = total === 0 ? "0 resultados"
        : `${total} resultados. Mostrando ${inicio + 1}-${inicio + visibles.length}. Página ${pagina} de ${paginas}`;
      vacio.textContent = ciudades.length === 0 ? "No hay ciudades registradas para este país"
        : total === 0 ? "No hay ciudades que coincidan con el filtro" : "";
      vacio.hidden = total !== 0;
      anterior.disabled = pagina === 1;
      siguiente.disabled = pagina === paginas;
      navegacion.hidden = paginas <= 1;

      // El botón que llegó al extremo deja de ser enfocable; conservar un destino útil.
      if (document.activeElement === siguiente && siguiente.disabled) {
        (anterior.disabled ? filtro : anterior).focus();
      } else if (document.activeElement === anterior && anterior.disabled) {
        (siguiente.disabled ? filtro : siguiente).focus();
      }
    }

    filtro.addEventListener("input", () => { pagina = 1; actualizar(); });
    anterior.addEventListener("click", () => { pagina -= 1; actualizar(); });
    siguiente.addEventListener("click", () => { pagina += 1; actualizar(); });
    reintentar.addEventListener("click", () => {
      if (signal.aborted || reintentar.hidden) return;
      estado.focus();
      void cargar(true);
    });

    async function cargar(enfocarFiltro = false): Promise<void> {
      if (signal.aborted) return;
      estado.textContent = "Cargando ciudades…";
      cuerpo.setAttribute("aria-busy", "true");
      controles.hidden = true;
      reintentar.hidden = true;
      error.hidden = true;
      error.textContent = "";
      lista.replaceChildren();
      vacio.hidden = true;
      navegacion.hidden = true;
      let resultado: ResultadoCiudades;
      try {
        resultado = await obtenerCiudades(pais.iso3, signal);
      } catch {
        resultado = { tipo: "respuesta-invalida" };
      }
      if (signal.aborted) return;
      cuerpo.removeAttribute("aria-busy");
      if (resultado.tipo === "cancelada") { estado.textContent = ""; return; }
      if (resultado.tipo !== "disponibles") {
        estado.textContent = "";
        error.textContent = ERRORES[resultado.tipo];
        error.hidden = false;
        reintentar.hidden = false;
        if (enfocarFiltro) reintentar.focus();
        return;
      }
      ciudades = resultado.ciudades;
      pagina = 1;
      filtro.value = "";
      controles.hidden = ciudades.length === 0;
      actualizar();
      if (enfocarFiltro) (controles.hidden ? estado : filtro).focus();
    }

    await cargar();
  },
};
