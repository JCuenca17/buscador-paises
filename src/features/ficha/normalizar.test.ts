import { describe, expect, it } from "vitest";
import { normalizarNombre } from "./normalizar";

describe("normalizarNombre", () => {
  it.each([
    ["  pERU ", "peru"],
    ["United\t\tStates", "united states"],
    ["  ", ""],
    ["Réunion", "réunion"],
    ["Bonaire, Saint Eustatius and Saba ", "bonaire, saint eustatius and saba"],
    ["Cocos   (Keeling)\nIslands", "cocos (keeling) islands"],
  ])("normaliza %j como %j", (entrada, esperado) => {
    expect(normalizarNombre(entrada)).toBe(esperado);
  });
});
