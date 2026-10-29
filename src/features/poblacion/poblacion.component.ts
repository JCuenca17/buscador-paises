import type { SeccionFicha } from "../ficha/secciones";
import { obtenerPoblacion, type ResultadoPoblacion } from "./poblacion.service";

const ERRORES = {
  "sin-conexion": "No hay conexión para cargar la población. Revisa tu conexión e inténtalo de nuevo.",
  "tiempo-agotado": "El servicio tardó demasiado en cargar la población. Inténtalo de nuevo.",
  "respuesta-invalida": "No se pudo obtener la población. La respuesta del servicio no es válida.",
} as const;

const formatoCifra = new Intl.NumberFormat("es");

export function formatearCifra(cifra: number): string {
  return `${formatoCifra.format(cifra)} hab.`;
}

function crear<K extends keyof HTMLElementTagNameMap>(etiqueta: K, texto?: string): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(etiqueta);
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

export const seccionPoblacion: SeccionFicha = {
  id: "poblacion",
  titulo: "Población",
  async renderizar(pais, contenedor, signal) {
    if (signal.aborted) return;
    const cuerpo = crear("div");
    cuerpo.className = "poblacion";
    const estado = crear("p");
    estado.tabIndex = -1;
    estado.setAttribute("role", "status");
    estado.setAttribute("aria-live", "polite");
    const anio = crear("p");
    anio.hidden = true;
    const error = crear("p");
    error.setAttribute("role", "alert");
    error.hidden = true;
    const reintentar = crear("button", "Reintentar");
    reintentar.type = "button";
    reintentar.hidden = true;
    cuerpo.append(estado, anio, error, reintentar);
    // El encabezado pertenece a ficha; solo añadimos el cuerpo de esta sección.
    contenedor.append(cuerpo);

    function pintar(resultado: ResultadoPoblacion): void {
      if (resultado.tipo === "cancelada") return;
      if (resultado.tipo === "disponible") {
        estado.textContent = formatearCifra(resultado.cifra);
        anio.textContent = `Dato de ${resultado.anio}`;
        anio.hidden = false;
        return;
      }
      if (resultado.tipo === "sin-datos") {
        estado.textContent = "Sin datos";
        return;
      }
      estado.textContent = "";
      error.textContent = ERRORES[resultado.tipo];
      error.hidden = false;
      reintentar.hidden = false;
    }

    async function cargar(): Promise<void> {
      if (signal.aborted) return;
      estado.textContent = "Cargando población…";
      anio.hidden = true;
      error.hidden = true;
      error.textContent = "";
      reintentar.hidden = true;
      let resultado: ResultadoPoblacion;
      try {
        resultado = await obtenerPoblacion(pais.iso3, signal);
      } catch {
        resultado = { tipo: "respuesta-invalida" };
      }
      if (signal.aborted) return;
      pintar(resultado);
    }

    reintentar.addEventListener("click", () => {
      if (signal.aborted || reintentar.hidden) return;
      // El botón desaparece al reintentar: el foco vuelve al estado.
      estado.focus();
      void cargar();
    });

    await cargar();
  },
};
