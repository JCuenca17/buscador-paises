import "./styles.css";
import { montarFicha } from "./features/ficha/ficha.component";
import { registrarSeccion } from "./features/ficha/secciones";
import { seccionCiudades } from "./features/ciudades/ciudades.component";
import { seccionPoblacion } from "./features/poblacion/poblacion.component";

// Punto de composición. Las otras funcionalidades registran aquí su sección de la ficha, antes
// de montarla, con registrarSeccion(...) de "./features/ficha/secciones"
// (specs/001-ficha-base/contracts/secciones-ficha.md).

registrarSeccion(seccionPoblacion);
registrarSeccion(seccionCiudades);

montarFicha(document.getElementById("app")!);
