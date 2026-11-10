import { describe, expect, it } from "vitest";
import {
  flooredUpdateDay,
  latestUpdateDay,
  offerUpdatedLabel,
  UPDATED_FLOOR,
  HOME_CONTENT_UPDATED,
  homeModifiedDay,
} from "./dates";

describe("update dates floor", () => {
  it("floors dates before 2026-11-07 and keeps later ones", () => {
    expect(flooredUpdateDay("2026-10-15T00:00:00.000Z")).toBe(UPDATED_FLOOR);
    expect(flooredUpdateDay("2026-11-07T08:00:00.000Z")).toBe(UPDATED_FLOOR);
    expect(flooredUpdateDay("2026-11-20T10:00:00.000Z")).toBe("2026-11-20");
  });

  it("reads the day in Europe/Rome", () => {
    expect(flooredUpdateDay("2026-11-20T23:30:00.000Z")).toBe("2026-11-21");
  });

  it("falls back to the floor for missing or invalid values", () => {
    expect(flooredUpdateDay(null)).toBe(UPDATED_FLOOR);
    expect(flooredUpdateDay(undefined)).toBe(UPDATED_FLOOR);
    expect(flooredUpdateDay("not a date")).toBe(UPDATED_FLOOR);
  });

  it("latestUpdateDay picks the newest, never below the floor", () => {
    expect(latestUpdateDay([])).toBe(UPDATED_FLOOR);
    expect(latestUpdateDay(["2026-10-01T00:00:00Z", "2026-10-15T00:00:00Z"])).toBe(UPDATED_FLOOR);
    expect(latestUpdateDay(["2026-12-03T09:00:00Z", "2026-11-10T09:00:00Z", null])).toBe("2026-12-03");
  });

  it("formats the offer card label in Italian", () => {
    expect(offerUpdatedLabel("2026-10-15T00:00:00.000Z")).toBe("Aggiornata il 7 novembre 2026");
    expect(offerUpdatedLabel("2026-12-03T09:00:00Z")).toBe("Aggiornata il 3 dicembre 2026");
  });


  it("homeModifiedDay is the later of the home content date and the latest offer update", () => {
    expect(homeModifiedDay([])).toBe(HOME_CONTENT_UPDATED);
    expect(homeModifiedDay(["2026-11-08T09:00:00Z"])).toBe(HOME_CONTENT_UPDATED);
    expect(homeModifiedDay(["2026-12-03T09:00:00Z"])).toBe("2026-12-03");
    expect(offerUpdatedLabel(null)).toBe("Aggiornata il 7 novembre 2026");
  });
});
