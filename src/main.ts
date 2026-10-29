import "./styles.css";
import { montarFicha } from "./features/ficha/ficha.component";
import { registrarSeccion } from "./features/ficha/secciones";
import { seccionCiudades } from "./features/ciudades/ciudades.component";
import { obtenerCatalogoPaises, resolverPais } from "./features/busqueda-inteligente/busqueda.service";
import { montarSugerencias } from "./features/busqueda-inteligente/busqueda.component";
import "./features/busqueda-inteligente/busqueda.css";

// Punto de composición: Registrar la sección de ciudades de Paulo
registrarSeccion(seccionCiudades);

// Montar la ficha base con el resolver de búsqueda inteligente
const raiz = document.getElementById("app")!;
montarFicha(raiz, async (texto) => resolverPais(await obtenerCatalogoPaises(), texto) ?? texto);

// Montar el componente de sugerencias inteligentes
const campoBusqueda = raiz.querySelector<HTMLInputElement>("#nombre-pais")!;
if (campoBusqueda) {
  montarSugerencias(campoBusqueda, {
    obtenerCatalogo: obtenerCatalogoPaises,
    alSeleccionar: () => campoBusqueda.form?.requestSubmit(),
  });
}