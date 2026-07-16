import { describe, expect, it } from "vitest";
import { getStaticDemoData, scoreStaticTender, settleStaticTender } from "./staticDemo.js";

describe("static vnext demo", () => {
  it("provides the same mock procurement data without an API server", () => {
    const data = getStaticDemoData();

    expect(data.status.mode).toBe("mock");
    expect(data.procurement.budget).toBe(10);
    expect(data.suppliers).toHaveLength(3);
  });

  it("scores bids and returns a clearly simulated settlement receipt", () => {
    const score = scoreStaticTender(10);
    const settlement = settleStaticTender(10);

    expect(score.ranked[0].id).toBe("atlas");
    expect(settlement.winner.id).toBe("atlas");
    expect(settlement.receipt.simulated).toBe(true);
    expect(settlement.receipt.receiptId).toContain("demo:RFP-2026-0714");
  });
});
