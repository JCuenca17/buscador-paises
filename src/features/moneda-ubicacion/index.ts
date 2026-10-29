import { registrarSeccion } from "../ficha/secciones";
// Asumiendo que PaisFicha está exportado en ../ficha/tipos
import type { PaisFicha } from "../ficha/tipos";

interface MonedaResponse {
  error: boolean;
  msg: string;
  data: { name: string; currency: string; iso2: string; iso3: string }[];
}

interface PosicionResponse {
  error: boolean;
  msg: string;
  data: { name: string; iso2: string; lat: number; long: number }[];
}

export function inicializarMonedaUbicacion() {
  registrarSeccion({
    id: 'moneda-ubicacion',
    titulo: '📍 Moneda y Ubicación',
    renderizar: async (pais: PaisFicha, contenedor: HTMLElement, signal: AbortSignal) => {
      try {
        const [resMoneda, resPosicion] = await Promise.all([
          fetch('https://countriesnow.space/api/v0.1/countries/currency', { signal }),
          fetch('https://countriesnow.space/api/v0.1/countries/positions', { signal })
        ]);

        const dataMoneda: MonedaResponse = await resMoneda.json();
        const dataPosicion: PosicionResponse = await resPosicion.json();

        // Se usa pais.nombre asumiendo que PaisFicha tiene esa propiedad
        const infoMoneda = dataMoneda.data?.find(c => c.name.toLowerCase() === pais.nombre.toLowerCase());
        const infoPosicion = dataPosicion.data?.find(c => c.name.toLowerCase() === pais.nombre.toLowerCase());

        const codigoMoneda = infoMoneda ? infoMoneda.currency : 'No disponible';
        
        let latitudStr = 'No disponible';
        let longitudStr = 'No disponible';
        let enlaceMapaHtml = '';

        if (infoPosicion) {
          const lat = Number(infoPosicion.lat);
          const lon = Number(infoPosicion.long);

          if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            latitudStr = lat.toString();
            longitudStr = lon.toString();

            enlaceMapaHtml = `<p><strong>Mapa:</strong> <a href="https://openstreetmap.org/?mlat=${lat}&mlon=${lon}" target="_blank" style="color: #0066cc; text-decoration: underline;">Ver en OpenStreetMap</a></p>`;
          }
        }

        // Poblar el contenedor en lugar de retornar un string
        contenedor.innerHTML += `
          <div style="border: 1px solid #e0e0e0; padding: 15px; margin-top: 15px; border-radius: 8px; background-color: #f9f9f9; text-align: left;">
            <p><strong>Moneda (Código):</strong> ${codigoMoneda}</p>
            <p><strong>Latitud:</strong> ${latitudStr}</p>
            <p><strong>Longitud:</strong> ${longitudStr}</p>
            ${enlaceMapaHtml}
          </div>
        `;
      } catch (error) {
        if (signal.aborted) return; // Ignorar si se abortó
        contenedor.innerHTML += `
          <div style="border: 1px solid #ffcccc; padding: 15px; margin-top: 15px; border-radius: 8px; background-color: #fff5f5; color: #cc0000; text-align: left;">
            <p><strong>Error:</strong> No se pudo cargar la información de ubicación y moneda en este momento.</p>
          </div>
        `;
      }
    }
  });
}