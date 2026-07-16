import { afterEach, describe, expect, it } from "vitest";
import {
  normalizeLiveReceipt,
  normalizeLiveStatus,
  resolveKpassExecutable,
} from "./kiteAdapter.js";

afterEach(() => {
  delete process.env.KPASS_BIN;
});

describe("Kite live adapter", () => {
  it("honors an explicit kpass binary path", () => {
    process.env.KPASS_BIN = "C:/tools/kpass.exe";
    expect(resolveKpassExecutable()).toBe("C:/tools/kpass.exe");
  });

  it("normalizes the current multichain wallet response", () => {
    const result = normalizeLiveStatus(
      { backend: { reachable: true }, agent: { registered: true, type: "codex", agent_id: "agent_123" } },
      { assets: [{ asset: "USDC", total: "12.500000" }] },
      { wallets: [{ chain: "base", address: "0xabc" }] },
    );

    expect(result.agent.did).toBe("agent_123");
    expect(result.wallet).toMatchObject({ address: "0xabc", balance: 12.5, asset: "USDC" });
  });

  it("preserves a real settlement reference without inventing a transaction hash", () => {
    const receipt = normalizeLiveReceipt(
      {
        session_id: "session_123",
        payment_requirement: { asset: "USDC", amount: "1.25" },
        payment_receipt: { id: "receipt_123" },
        x402: { status_code: 200, parsed_response_body: { deliverable: { checksum: "sha256:abc" } } },
      },
      { supplier: { did: "did:kite:supplier" }, amount: 1.25, sessionId: "session_123" },
    );

    expect(receipt.txHash).toBeNull();
    expect(receipt.receiptId).toBe("receipt_123");
    expect(receipt.deliverable.checksum).toBe("sha256:abc");
  });
});
