import { describe, expect, it } from "vitest";
import { validateStravaReturnOrigin } from "./strava-return-origin";

describe("Strava return origins", () => {
  it("retains same-origin HTTPS callbacks on published hosts", () => {
    expect(validateStravaReturnOrigin("https://macrochef.example", new Request("https://macrochef.example/_serverFn/start"))).toBe("https://macrochef.example");
  });
  it("retains localhost development callbacks", () => {
    expect(validateStravaReturnOrigin("http://localhost:8080", new Request("http://localhost:8080/_serverFn/start"))).toBe("http://localhost:8080");
  });
  it.each([
    "http://id-preview--6f660207-75ae-47ef-a0bf-fcf248999604.lovable.app",
    "https://id-preview--6f660207-75ae-47ef-a0bf-fcf248999604.lovable.app.evil.example",
    "https://user:password@id-preview--6f660207-75ae-47ef-a0bf-fcf248999604.lovable.app",
    "https://id-preview--6f660207-75ae-47ef-a0bf-fcf248999604.lovable.app/elsewhere",
  ])("rejects unsafe or lookalike return address %s", (origin) => {
    expect(() => validateStravaReturnOrigin(origin, new Request("http://localhost:8080/start"))).toThrow("Invalid Strava return address");
  });
});