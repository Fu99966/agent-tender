import { describe, expect, it } from "vitest";
import { suppliers } from "./demoData.js";
import { scoreBids } from "./scoring.js";

describe("scoreBids", () => {
  it("ranks only verified bids that fit the approved budget", () => {
    const ranked = scoreBids(
      [
        ...suppliers,
        { ...suppliers[0], id: "unverified", price: 1, verified: false },
        { ...suppliers[0], id: "over-budget", price: 99 },
      ],
      10,
    );

    expect(ranked).toHaveLength(3);
    expect(ranked.map((bid) => bid.id)).not.toContain("unverified");
    expect(ranked.map((bid) => bid.id)).not.toContain("over-budget");
    expect(ranked[0].id).toBe("atlas");
  });

  it("changes the winner when the owner changes policy weights", () => {
    const reputationFirst = scoreBids(suppliers, 10, {
      price: 0.05,
      reputation: 0.9,
      speed: 0.05,
    });

    expect(reputationFirst[0].id).toBe("chainscope");
  });

  it("returns no award when every bid violates the budget", () => {
    expect(scoreBids(suppliers, 1)).toEqual([]);
  });
});
