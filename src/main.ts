import "./styles.css";
import { montarFicha } from "./features/ficha/ficha.component";
import { inicializarMonedaUbicacion } from './features/moneda-ubicacion/index';

// Punto de composición principal
montarFicha(document.getElementById("app")!);

// Inicializar tu módulo de Moneda y Ubicación
inicializarMonedaUbicacion();

