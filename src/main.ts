import "./styles.css";
import { montarFicha } from "./features/ficha/ficha.component";
import { obtenerCatalogoPaises, resolverPais } from "./features/busqueda-inteligente/busqueda.service";
import { montarSugerencias } from "./features/busqueda-inteligente/busqueda.component";
import "./features/busqueda-inteligente/busqueda.css";

// Punto de composición. Las otras funcionalidades registran aquí su sección de la ficha, antes
// de montarla, con registrarSeccion(...) de "./features/ficha/secciones"
// (specs/001-ficha-base/contracts/secciones-ficha.md). Por ejemplo:
//   registrarSeccion(seccionPoblacion);

const raiz = document.getElementById("app")!;
montarFicha(raiz, async (texto) => resolverPais(await obtenerCatalogoPaises(), texto) ?? texto);

const campoBusqueda = raiz.querySelector<HTMLInputElement>("#nombre-pais")!;
montarSugerencias(campoBusqueda, {
	obtenerCatalogo: obtenerCatalogoPaises,
	alSeleccionar: () => campoBusqueda.form?.requestSubmit(),
});
