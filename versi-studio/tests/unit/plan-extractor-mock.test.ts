/**
 * Tests unit — plan-extractor-mock (s25 Round D)
 *
 * Valide que le mock retourne des données cohérentes pour chaque floor
 * (P00 → P03), compatibles avec le pipeline downstream (lots, rooms,
 * power diagram, envelope polygon, label snap).
 */
import { describe, it, expect } from "vitest";
import { extractPlanDataMock } from "@/lib/vs/plan-extractor-mock";

const dummyBase64 = "AAAAAAAAAAAA"; // base64 arbitraire, ignoré par le mock
const mime = "image/png";
const typeBien = "immeuble" as const;

describe("extractPlanDataMock", () => {
  it("retourne données valides pour P00 (floor=0) — 1 lot T2 avec 5 rooms", async () => {
    const result = await extractPlanDataMock(
      dummyBase64,
      mime,
      typeBien,
      "[MOCK_FLOOR=0]",
    );
    expect(result.rooms.length).toBe(5);
    // 1 seul unit_id attendu au RDC
    const unitIds = new Set(result.rooms.map((r) => r.unit_id));
    expect(unitIds.size).toBe(1);
    expect(result.rooms.every((r) => r.floor === 0)).toBe(true);
  });

  it("retourne données valides pour P03 (floor=3) — 2 lots distincts", async () => {
    const result = await extractPlanDataMock(
      dummyBase64,
      mime,
      typeBien,
      "[MOCK_FLOOR=3]",
    );
    expect(result.rooms.length).toBe(8);
    const unitIds = new Set(result.rooms.map((r) => r.unit_id));
    expect(unitIds.size).toBe(2);
    expect(result.rooms.every((r) => r.floor === 3)).toBe(true);
  });

  it("building_outline est un rectangle valide avec surface > 0", async () => {
    const result = await extractPlanDataMock(
      dummyBase64,
      mime,
      typeBien,
      "[MOCK_FLOOR=1]",
    );
    expect(result.building_outline).not.toBeNull();
    const bo = result.building_outline!;
    expect(bo.width_percent).toBeGreaterThan(0);
    expect(bo.height_percent).toBeGreaterThan(0);
    expect(bo.x_percent + bo.width_percent).toBeLessThanOrEqual(100);
    expect(bo.y_percent + bo.height_percent).toBeLessThanOrEqual(100);
  });

  it("chaque lot (unit_id) contient au moins 2 rooms", async () => {
    for (const floor of [0, 1, 2, 3]) {
      const result = await extractPlanDataMock(
        dummyBase64,
        mime,
        typeBien,
        `[MOCK_FLOOR=${floor}]`,
      );
      const byUnit = new Map<string, number>();
      for (const r of result.rooms) {
        if (!r.unit_id) continue;
        byUnit.set(r.unit_id, (byUnit.get(r.unit_id) ?? 0) + 1);
      }
      for (const [unit, count] of byUnit) {
        expect(
          count,
          `floor=${floor} unit=${unit} doit avoir ≥2 rooms`,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("tous les bounding_polygon sont en range [0,100]", async () => {
    for (const floor of [0, 1, 2, 3]) {
      const result = await extractPlanDataMock(
        dummyBase64,
        mime,
        typeBien,
        `[MOCK_FLOOR=${floor}]`,
      );
      for (const r of result.rooms) {
        expect(r.bounding_polygon).toBeDefined();
        expect(r.bounding_polygon!.length).toBeGreaterThanOrEqual(4);
        for (const p of r.bounding_polygon!) {
          expect(p.x_percent).toBeGreaterThanOrEqual(0);
          expect(p.x_percent).toBeLessThanOrEqual(100);
          expect(p.y_percent).toBeGreaterThanOrEqual(0);
          expect(p.y_percent).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("total rooms sur 4 plans ≥ 23 (matière suffisante pour power diagram)", async () => {
    let total = 0;
    for (const floor of [0, 1, 2, 3]) {
      const r = await extractPlanDataMock(
        dummyBase64,
        mime,
        typeBien,
        `[MOCK_FLOOR=${floor}]`,
      );
      total += r.rooms.length;
    }
    expect(total).toBeGreaterThanOrEqual(23);
  });
});
