import "./styles.css";
import { montarFicha } from "./features/ficha/ficha.component";

// Punto de composición. Las otras funcionalidades registran aquí su sección de la ficha, antes
// de montarla, con registrarSeccion(...) de "./features/ficha/secciones"
// (specs/001-ficha-base/contracts/secciones-ficha.md). Por ejemplo:
//   registrarSeccion(seccionPoblacion);

montarFicha(document.getElementById("app")!);
