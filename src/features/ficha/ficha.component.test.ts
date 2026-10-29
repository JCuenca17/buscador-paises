import { beforeEach, describe, expect, it, vi } from "vitest";
import { montarFicha } from "./ficha.component";
import { buscarFicha } from "./ficha.service";
import { registrarSeccion, reiniciarSecciones, type SeccionFicha } from "./secciones";
import type { PaisFicha, ResultadoBusqueda } from "./tipos";

vi.mock("./ficha.service");

const PERU: PaisFicha = {
  nombre: "Peru",
  capital: "Lima",
  bandera: "https://upload.wikimedia.org/wikipedia/commons/c/cf/Flag_of_Peru.svg",
  iso2: "PE",
  iso3: "PER",
};
const CHILE: PaisFicha = {
  nombre: "Chile",
  capital: "Santiago",
  bandera: "https://upload.wikimedia.org/wikipedia/commons/7/78/Flag_of_Chile.svg",
  iso2: "CL",
  iso3: "CHL",
};

const encontrado = (pais: PaisFicha): ResultadoBusqueda => ({ tipo: "encontrado", pais });

/** Promesa que se resuelve desde la prueba. */
function diferida<T>() {
  let resolver!: (valor: T) => void;
  let rechazar!: (motivo: unknown) => void;
  const promesa = new Promise<T>((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
}

/** Deja correr las promesas y tareas pendientes. */
const esperar = () => new Promise((resolver) => setTimeout(resolver, 0));

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T & Element>(selector)!;

const campo = () => $<HTMLInputElement>("#nombre-pais");
const botonBuscar = () => $<HTMLButtonElement>('form button[type="submit"]');
const estado = () => $("[data-estado]");
const ficha = () => $("[data-ficha]");

function escribir(texto: string) {
  campo().value = texto;
  campo().dispatchEvent(new Event("input", { bubbles: true }));
}

/** Busca con un clic en «Buscar». */
function buscarConBoton(texto: string) {
  escribir(texto);
  botonBuscar().click();
}

/**
 * Busca con Enter. jsdom no implementa el envío implícito del formulario al presionar Enter en
 * un campo de texto; el navegador lo hace porque el formulario tiene un botón type="submit"
 * (comprobado en la prueba de marcado), y equivale a requestSubmit().
 */
function buscarConEnter(texto: string) {
  escribir(texto);
  campo().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  campo().form!.requestSubmit();
}

describe("montarFicha: historia 1", () => {
  beforeEach(() => {
    vi.mocked(buscarFicha).mockReset();
    reiniciarSecciones();
    document.body.replaceChildren();
    montarFicha(document.body);
  });

  it("crea el marcado de contracts/ui.md", () => {
    expect($("h1").textContent).toBe("Buscador de países");
    const form = $<HTMLFormElement>("form");
    expect(form.getAttribute("role")).toBe("search");
    expect(form.noValidate).toBe(true);

    const label = $('label[for="nombre-pais"]');
    expect(label.textContent).toBe("Nombre del país");
    expect(campo().getAttribute("maxlength")).toBe("100");
    expect(campo().type).toBe("text");
    expect(campo().form).toBe(form);
    expect(botonBuscar().textContent).toBe("Buscar");
    expect(botonBuscar().form).toBe(form);

    expect(estado().getAttribute("role")).toBe("status");
    expect(estado().getAttribute("aria-live")).toBe("polite");
    expect($("[data-error]").getAttribute("role")).toBe("alert");
    expect(ficha().tagName).toBe("ARTICLE");
    expect(ficha().hidden).toBe(true);
    expect(ficha().querySelector("[data-ficha-secciones]")).not.toBeNull();
  });

  it("pone el foco inicial en el campo", () => {
    expect(document.activeElement).toBe(campo());
  });

  it("busca con el botón «Buscar» usando el texto escrito", async () => {
    vi.mocked(buscarFicha).mockResolvedValue(encontrado(PERU));

    buscarConBoton("  pERU ");
    await esperar();

    expect(buscarFicha).toHaveBeenCalledTimes(1);
    expect(vi.mocked(buscarFicha).mock.calls[0]![0]).toBe("  pERU ");
  });

  it("busca con la tecla Enter", async () => {
    vi.mocked(buscarFicha).mockResolvedValue(encontrado(PERU));

    buscarConEnter("Peru");
    await esperar();

    expect(buscarFicha).toHaveBeenCalledTimes(1);
    expect(vi.mocked(buscarFicha).mock.calls[0]![0]).toBe("Peru");
  });

  it("resuelve el nombre en español al enviar manualmente con botón o Enter", async () => {
    const resolver = vi.fn(async (texto: string) => (texto === "España" ? "Spain" : texto));
    document.body.replaceChildren();
    montarFicha(document.body, resolver);
    vi.mocked(buscarFicha).mockResolvedValue(encontrado(PERU));

    buscarConBoton("España");
    await esperar();
    expect(resolver).toHaveBeenLastCalledWith("España");
    expect(buscarFicha).toHaveBeenLastCalledWith("Spain", expect.any(Object));

    buscarConEnter("Perú");
    await esperar();
    expect(resolver).toHaveBeenLastCalledWith("Perú");
    expect(buscarFicha).toHaveBeenLastCalledWith("Perú", expect.any(Object));
  });

  it("muestra «Buscando…» mientras espera y luego la ficha", async () => {
    const respuesta = diferida<ResultadoBusqueda>();
    vi.mocked(buscarFicha).mockReturnValue(respuesta.promesa);

    buscarConBoton("Peru");
    expect(estado().textContent).toBe("Buscando…");
    expect(ficha().hidden).toBe(true);

    respuesta.resolver(encontrado(PERU));
    await esperar();

    expect(estado().textContent).toBe("");
    expect(ficha().hidden).toBe(false);
    expect(ficha().querySelector("h2")!.textContent).toBe("Peru");
    expect($("[data-capital]").textContent).toBe("Lima");
    const img = $<HTMLImageElement>("[data-bandera] img");
    expect(img.getAttribute("src")).toBe(PERU.bandera);
    expect(img.alt).toBe("Bandera de Peru");
  });

  it("muestra «no disponible» si la capital es null", async () => {
    vi.mocked(buscarFicha).mockResolvedValue(encontrado({ ...PERU, capital: null }));

    buscarConBoton("Peru");
    await esperar();

    expect($("[data-capital]").textContent).toBe("no disponible");
  });

  it("muestra «Bandera no disponible» si la bandera es null", async () => {
    vi.mocked(buscarFicha).mockResolvedValue(encontrado({ ...PERU, bandera: null }));

    buscarConBoton("Peru");
    await esperar();

    expect($("[data-bandera]").textContent).toBe("Bandera no disponible");
    expect($("[data-bandera] img")).toBeNull();
    expect(ficha().hidden).toBe(false);
    expect(ficha().querySelector("h2")!.textContent).toBe("Peru");
    expect($("[data-capital]").textContent).toBe("Lima");
  });

  it("reemplaza la imagen por «Bandera no disponible» si no carga", async () => {
    vi.mocked(buscarFicha).mockResolvedValue(encontrado(PERU));

    buscarConBoton("Peru");
    await esperar();
    $("[data-bandera] img").dispatchEvent(new Event("error"));

    expect($("[data-bandera]").textContent).toBe("Bandera no disponible");
    expect($("[data-bandera] img")).toBeNull();
    expect(ficha().hidden).toBe(false);
    expect(ficha().querySelector("h2")!.textContent).toBe("Peru");
  });

  it("inserta los datos como texto literal, sin crear elementos", async () => {
    vi.mocked(buscarFicha).mockResolvedValue(
      encontrado({ ...PERU, nombre: "<b>x</b>", capital: "<i>y</i>" }),
    );

    buscarConBoton("x");
    await esperar();

    expect(ficha().querySelector("h2")!.textContent).toBe("<b>x</b>");
    expect($("[data-capital]").textContent).toBe("<i>y</i>");
    expect(ficha().querySelector("b, i")).toBeNull();
    expect($<HTMLImageElement>("[data-bandera] img").alt).toBe("Bandera de <b>x</b>");
  });

  it("oculta la ficha y las secciones anteriores al iniciar otra búsqueda", async () => {
    registrarSeccion({ id: "prueba", titulo: "Prueba", renderizar: () => {} });
    vi.mocked(buscarFicha).mockResolvedValueOnce(encontrado(PERU));
    buscarConBoton("Peru");
    await esperar();
    expect(ficha().hidden).toBe(false);
    expect(document.querySelectorAll("[data-seccion]")).toHaveLength(1);

    vi.mocked(buscarFicha).mockReturnValueOnce(diferida<ResultadoBusqueda>().promesa);
    buscarConBoton("Chile");

    expect(ficha().hidden).toBe(true);
    expect(document.querySelectorAll("[data-seccion]")).toHaveLength(0);
    expect(estado().textContent).toBe("Buscando…");
  });

  it("con búsquedas superpuestas solo muestra la última, aborta la anterior y no desactiva «Buscar»", async () => {
    const primera = diferida<ResultadoBusqueda>();
    const segunda = diferida<ResultadoBusqueda>();
    vi.mocked(buscarFicha)
      .mockReturnValueOnce(primera.promesa)
      .mockReturnValueOnce(segunda.promesa);

    buscarConBoton("Peru");
    expect(botonBuscar().disabled).toBe(false);
    buscarConBoton("Chile");
    expect(botonBuscar().disabled).toBe(false);

    const signalPrimera = vi.mocked(buscarFicha).mock.calls[0]![1]!.signal!;
    const signalSegunda = vi.mocked(buscarFicha).mock.calls[1]![1]!.signal!;
    expect(signalPrimera.aborted).toBe(true);
    expect(signalSegunda.aborted).toBe(false);

    segunda.resolver(encontrado(CHILE));
    await esperar();
    primera.resolver(encontrado(PERU));
    await esperar();

    expect(ficha().querySelector("h2")!.textContent).toBe("Chile");
    expect($("[data-capital]").textContent).toBe("Santiago");
    expect(botonBuscar().disabled).toBe(false);
  });

  describe("secciones (FR-018)", () => {
    it("pinta cada sección registrada con su <section> y <h3>, en orden de registro", async () => {
      const recibidos: Array<{ pais: PaisFicha; contenedor: HTMLElement; signal: AbortSignal }> =
        [];
      const seccion = (id: string, titulo: string): SeccionFicha => ({
        id,
        titulo,
        renderizar(pais, contenedor, signal) {
          recibidos.push({ pais, contenedor, signal });
          const p = document.createElement("p");
          p.textContent = `contenido ${id}`;
          contenedor.append(p);
        },
      });
      registrarSeccion(seccion("poblacion", "Población"));
      registrarSeccion(seccion("moneda", "Moneda"));
      vi.mocked(buscarFicha).mockResolvedValue(encontrado(PERU));

      buscarConBoton("Peru");
      await esperar();

      const secciones = [...document.querySelectorAll<HTMLElement>("[data-ficha-secciones] > section[data-seccion]")];
      expect(secciones.map((s) => s.dataset.seccion)).toEqual(["poblacion", "moneda"]);
      expect(secciones.map((s) => s.querySelector("h3")!.textContent)).toEqual([
        "Población",
        "Moneda",
      ]);
      for (const s of secciones) {
        const h3 = s.querySelector("h3")!;
        expect(s.getAttribute("aria-labelledby")).toBe(h3.id);
        expect(h3.id).not.toBe("");
      }
      expect(recibidos.map((r) => r.contenedor)).toEqual(secciones);
      expect(recibidos[0]!.pais).toEqual(PERU);
      expect(recibidos[0]!.pais.iso2).toBe("PE");
      expect(recibidos[0]!.pais.iso3).toBe("PER");
      expect(secciones[0]!.textContent).toContain("contenido poblacion");
    });

    it.each([
      [
        "lanza",
        () => {
          throw new Error("falla");
        },
      ],
      ["rechaza", () => Promise.reject(new Error("falla"))],
    ])("si una sección %s, muestra el error solo en ella", async (_caso, renderizarConFalla) => {
      registrarSeccion({
        id: "rota",
        titulo: "Rota",
        renderizar(_pais, contenedor) {
          const p = document.createElement("p");
          p.textContent = "a medias";
          contenedor.append(p);
          return renderizarConFalla();
        },
      });
      registrarSeccion({
        id: "sana",
        titulo: "Sana",
        renderizar(_pais, contenedor) {
          const p = document.createElement("p");
          p.textContent = "contenido sano";
          contenedor.append(p);
        },
      });
      vi.mocked(buscarFicha).mockResolvedValue(encontrado(PERU));

      buscarConBoton("Peru");
      await esperar();

      const rota = $('[data-seccion="rota"]');
      expect(rota.textContent).toContain("No se pudo cargar esta sección");
      expect(rota.textContent).not.toContain("a medias");
      expect($('[data-seccion="sana"]').textContent).toContain("contenido sano");
      expect(ficha().hidden).toBe(false);
      expect(ficha().querySelector("h2")!.textContent).toBe("Peru");
      expect($("[data-capital]").textContent).toBe("Lima");
      expect($<HTMLImageElement>("[data-bandera] img").alt).toBe("Bandera de Peru");
    });

    it("aborta la signal de las secciones al iniciar otra búsqueda", async () => {
      let signalSeccion: AbortSignal | undefined;
      registrarSeccion({
        id: "lenta",
        titulo: "Lenta",
        renderizar(_pais, _contenedor, signal) {
          signalSeccion = signal;
          return new Promise(() => {});
        },
      });
      vi.mocked(buscarFicha)
        .mockResolvedValueOnce(encontrado(PERU))
        .mockReturnValueOnce(diferida<ResultadoBusqueda>().promesa);

      buscarConBoton("Peru");
      await esperar();
      expect(signalSeccion!.aborted).toBe(false);

      buscarConBoton("Chile");
      expect(signalSeccion!.aborted).toBe(true);
    });

    it("no muestra el error de una sección que falla después de abortarse", async () => {
      const fallo = diferida<void>();
      registrarSeccion({ id: "tarde", titulo: "Tarde", renderizar: () => fallo.promesa });
      vi.mocked(buscarFicha)
        .mockResolvedValueOnce(encontrado(PERU))
        .mockResolvedValueOnce(encontrado(CHILE));

      buscarConBoton("Peru");
      await esperar();
      const primeraSeccion = $('[data-seccion="tarde"]');
      buscarConBoton("Chile");
      await esperar();
      fallo.rechazar(new DOMException("Abortado", "AbortError"));
      await esperar();

      expect(primeraSeccion.textContent).not.toContain("No se pudo cargar esta sección");
    });

    it("registrar un id repetido lanza un error", () => {
      registrarSeccion({ id: "poblacion", titulo: "Población", renderizar: () => {} });
      expect(() =>
        registrarSeccion({ id: "poblacion", titulo: "Otra", renderizar: () => {} }),
      ).toThrow();
    });
  });
});

describe("montarFicha: historia 2", () => {
  const validacion = () => $("#validacion-pais");

  beforeEach(() => {
    vi.mocked(buscarFicha).mockReset();
    reiniciarSecciones();
    document.body.replaceChildren();
    montarFicha(document.body);
  });

  it.each([
    ["vacío", ""],
    ["con solo espacios", "   "],
  ])("con el campo %s muestra la validación y no busca (FR-004)", async (_caso, texto) => {
    buscarConBoton(texto);
    await esperar();

    expect(validacion().textContent).toBe("Escribe el nombre de un país");
    expect(campo().getAttribute("aria-invalid")).toBe("true");
    expect(campo().getAttribute("aria-describedby")).toBe("validacion-pais");
    expect(buscarFicha).not.toHaveBeenCalled();
    expect(estado().textContent).toBe("");
    expect(ficha().hidden).toBe(true);
  });

  it("con Enter y el campo vacío también muestra la validación", async () => {
    buscarConEnter("  ");
    await esperar();

    expect(validacion().textContent).toBe("Escribe el nombre de un país");
    expect(buscarFicha).not.toHaveBeenCalled();
  });

  it("al escribir se borran el mensaje de validación y aria-invalid", () => {
    buscarConBoton("");
    expect(validacion().textContent).toBe("Escribe el nombre de un país");

    escribir("P");

    expect(validacion().textContent).toBe("");
    expect(campo().hasAttribute("aria-invalid")).toBe(false);
  });

  it("muestra «No se encontró el país» sin ficha ni «Reintentar» (FR-006)", async () => {
    vi.mocked(buscarFicha).mockResolvedValue({ tipo: "no-encontrado" });

    buscarConBoton("Atlantida");
    await esperar();

    expect(estado().textContent).toBe("No se encontró el país");
    expect(ficha().hidden).toBe(true);
    const botones = [...document.querySelectorAll("button")].map((b) => b.textContent);
    expect(botones).not.toContain("Reintentar");
    expect(botones).toEqual(["Buscar"]);
  });

  it("una búsqueda válida después de una validación quita el mensaje", async () => {
    vi.mocked(buscarFicha).mockResolvedValue(encontrado(PERU));
    buscarConBoton("");
    expect(validacion().textContent).toBe("Escribe el nombre de un país");

    // Sin evento input: el envío válido debe limpiar el mensaje por sí mismo.
    campo().value = "Peru";
    botonBuscar().click();
    await esperar();

    expect(validacion().textContent).toBe("");
    expect(campo().hasAttribute("aria-invalid")).toBe(false);
    expect(buscarFicha).toHaveBeenCalledTimes(1);
    expect(ficha().hidden).toBe(false);
  });

  it("con una ficha en pantalla, enviar el campo vacío la conserva junto con sus secciones", async () => {
    let signalSeccion: AbortSignal | undefined;
    registrarSeccion({
      id: "poblacion",
      titulo: "Población",
      renderizar(_pais, contenedor, signal) {
        signalSeccion = signal;
        const p = document.createElement("p");
        p.textContent = "contenido población";
        contenedor.append(p);
      },
    });
    vi.mocked(buscarFicha).mockResolvedValue(encontrado(PERU));
    buscarConBoton("Peru");
    await esperar();

    buscarConBoton("  ");
    await esperar();

    expect(validacion().textContent).toBe("Escribe el nombre de un país");
    expect(buscarFicha).toHaveBeenCalledTimes(1);
    expect(ficha().hidden).toBe(false);
    expect(ficha().querySelector("h2")!.textContent).toBe("Peru");
    expect($('[data-seccion="poblacion"]').textContent).toContain("contenido población");
    expect(signalSeccion!.aborted).toBe(false);
    expect(estado().textContent).toBe("");
  });

  it("enviar el campo vacío no descarta una búsqueda en curso", async () => {
    const respuesta = diferida<ResultadoBusqueda>();
    vi.mocked(buscarFicha).mockReturnValue(respuesta.promesa);
    buscarConBoton("Peru");

    buscarConBoton("");
    const signalBusqueda = vi.mocked(buscarFicha).mock.calls[0]![1]!.signal!;
    expect(signalBusqueda.aborted).toBe(false);

    respuesta.resolver(encontrado(PERU));
    await esperar();
    expect(ficha().querySelector("h2")!.textContent).toBe("Peru");
  });
});

describe("montarFicha: historia 3", () => {
  const error = () => $("[data-error]");
  const botonReintentar = () =>
    [...error().querySelectorAll("button")].find((b) => b.textContent === "Reintentar");

  beforeEach(() => {
    vi.mocked(buscarFicha).mockReset();
    reiniciarSecciones();
    document.body.replaceChildren();
    montarFicha(document.body);
  });

  it.each<[ResultadoBusqueda["tipo"], string]>([
    ["sin-conexion", "No hay conexión. Revisa tu conexión a internet e inténtalo de nuevo."],
    ["tiempo-agotado", "El servicio tardó demasiado en responder. Inténtalo de nuevo."],
    ["respuesta-invalida", "No se pudo obtener la información del país. Inténtalo de nuevo."],
  ])("para %s muestra el mensaje exacto y «Reintentar» (FR-014)", async (tipo, mensaje) => {
    vi.mocked(buscarFicha).mockResolvedValue({ tipo } as ResultadoBusqueda);

    buscarConBoton("Peru");
    await esperar();

    expect(error().querySelector("p")!.textContent).toBe(mensaje);
    const reintentar = botonReintentar()!;
    expect(reintentar).toBeDefined();
    expect(reintentar.type).toBe("button");
    expect(ficha().hidden).toBe(true);
    expect(estado().textContent).not.toContain("Buscando…");
    expect($("form").isConnected).toBe(true);
    expect($("form").hidden).toBe(false);
    expect(campo().isConnected).toBe(true);
  });

  it("si falla el resolvedor, muestra el error existente y Reintentar vuelve a resolver la consulta original", async () => {
    const resolver = vi.fn().mockRejectedValueOnce(new Error("sin conexión"));
    document.body.replaceChildren();
    montarFicha(document.body, resolver);
    vi.mocked(buscarFicha).mockResolvedValue(encontrado(PERU));

    buscarConBoton("Perú");
    await esperar();

    expect(error().querySelector("p")!.textContent).toBe(
      "No se pudo obtener la información del país. Inténtalo de nuevo.",
    );
    expect(botonReintentar()).toBeDefined();
    expect(buscarFicha).not.toHaveBeenCalled();

    resolver.mockResolvedValue("Peru");
    botonReintentar()!.click();
    await esperar();

    expect(resolver).toHaveBeenLastCalledWith("Perú");
    expect(buscarFicha).toHaveBeenCalledWith("Peru", expect.any(Object));
    expect(ficha().hidden).toBe(false);
  });

  it("al iniciar otra búsqueda se borra el error anterior", async () => {
    vi.mocked(buscarFicha)
      .mockResolvedValueOnce({ tipo: "sin-conexion" })
      .mockReturnValueOnce(diferida<ResultadoBusqueda>().promesa);

    buscarConBoton("Peru");
    await esperar();
    buscarConBoton("Chile");

    expect(error().textContent).toBe("");
    expect(botonReintentar()).toBeUndefined();
    expect(estado().textContent).toBe("Buscando…");
  });

  it("«Reintentar» con clic repite la última búsqueda aunque el campo haya cambiado", async () => {
    const reintento = diferida<ResultadoBusqueda>();
    vi.mocked(buscarFicha)
      .mockResolvedValueOnce({ tipo: "sin-conexion" })
      .mockReturnValueOnce(reintento.promesa);

    buscarConBoton("  pERU ");
    await esperar();
    escribir("otro texto");
    botonReintentar()!.click();

    expect(buscarFicha).toHaveBeenCalledTimes(2);
    expect(vi.mocked(buscarFicha).mock.calls[1]![0]).toBe("  pERU ");
    expect(estado().textContent).toBe("Buscando…");
    expect(error().textContent).toBe("");

    reintento.resolver(encontrado(PERU));
    await esperar();
    expect(ficha().hidden).toBe(false);
    expect(ficha().querySelector("h2")!.textContent).toBe("Peru");
  });

  it("«Reintentar» se alcanza y se activa con el teclado", async () => {
    vi.mocked(buscarFicha)
      .mockResolvedValueOnce({ tipo: "tiempo-agotado" })
      .mockResolvedValueOnce(encontrado(PERU));

    buscarConBoton("Peru");
    await esperar();

    const reintentar = botonReintentar()!;
    reintentar.focus();
    expect(document.activeElement).toBe(reintentar);
    expect(reintentar.tabIndex).toBe(0);
    // jsdom no activa botones con Enter o Espacio; el navegador lo hace en todo <button> nativo
    // y equivale a un clic.
    reintentar.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    reintentar.click();
    await esperar();

    expect(buscarFicha).toHaveBeenCalledTimes(2);
    expect(vi.mocked(buscarFicha).mock.calls[1]![0]).toBe("Peru");
    expect(ficha().querySelector("h2")!.textContent).toBe("Peru");
  });

  it("el resultado cancelada no muestra nada", async () => {
    vi.mocked(buscarFicha).mockResolvedValue({ tipo: "cancelada" });

    buscarConBoton("Peru");
    await esperar();

    expect(estado().textContent).toBe("");
    expect(error().textContent).toBe("");
    expect(ficha().hidden).toBe(true);
    expect(botonReintentar()).toBeUndefined();
  });
});

describe("montarFicha: foco tras «Reintentar»", () => {
  beforeEach(() => {
    vi.mocked(buscarFicha).mockReset();
    reiniciarSecciones();
    document.body.replaceChildren();
    montarFicha(document.body);
  });

  it("al pulsar «Reintentar» el foco vuelve al campo de búsqueda", async () => {
    vi.mocked(buscarFicha)
      .mockResolvedValueOnce({ tipo: "sin-conexion" })
      .mockReturnValueOnce(diferida<ResultadoBusqueda>().promesa);

    buscarConBoton("Peru");
    await esperar();
    const reintentar = [...document.querySelectorAll("[data-error] button")].find(
      (b) => b.textContent === "Reintentar",
    ) as HTMLButtonElement;
    reintentar.focus();
    reintentar.click();

    expect(reintentar.isConnected).toBe(false);
    expect(document.activeElement).toBe(campo());
    expect(estado().textContent).toBe("Buscando…");
  });
});

describe("montarFicha: «Reintentar» después de una validación", () => {
  beforeEach(() => {
    vi.mocked(buscarFicha).mockReset();
    reiniciarSecciones();
    document.body.replaceChildren();
    montarFicha(document.body);
  });

  it("al pulsar «Reintentar» se borran el mensaje de validación y aria-invalid (FR-009)", async () => {
    vi.mocked(buscarFicha)
      .mockResolvedValueOnce({ tipo: "sin-conexion" })
      .mockResolvedValueOnce(encontrado(PERU));

    buscarConBoton("Peru");
    await esperar();
    // Enviar el campo vacío no es una búsqueda nueva: el error y «Reintentar» se conservan.
    buscarConBoton("");
    expect($("#validacion-pais").textContent).toBe("Escribe el nombre de un país");
    expect(campo().getAttribute("aria-invalid")).toBe("true");

    const reintentar = [...document.querySelectorAll("[data-error] button")].find(
      (b) => b.textContent === "Reintentar",
    ) as HTMLButtonElement;
    reintentar.click();

    expect(estado().textContent).toBe("Buscando…");
    expect($("#validacion-pais").textContent).toBe("");
    expect(campo().hasAttribute("aria-invalid")).toBe(false);

    await esperar();
    expect(vi.mocked(buscarFicha).mock.calls[1]![0]).toBe("Peru");
    expect(ficha().hidden).toBe(false);
    expect($("#validacion-pais").textContent).toBe("");
  });
});
