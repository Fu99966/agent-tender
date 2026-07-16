import { procurement, suppliers } from "../server/demoData.js";
import { DEFAULT_WEIGHTS, scoreBids } from "../server/scoring.js";

const status = {
  mode: "mock",
  connected: true,
  network: "Kite Testnet",
  agent: {
    name: "Treasury Alpha Agent",
    did: "did:kite:agt_A1F4...8C22",
    verified: true,
  },
  wallet: { address: "0x71e4...C91A", balance: 24.8, asset: "USDC" },
};

export function getStaticDemoData() {
  return { status, procurement, suppliers, weights: DEFAULT_WEIGHTS };
}

export function scoreStaticTender(budget, weights = DEFAULT_WEIGHTS) {
  return { ranked: scoreBids(suppliers, budget, weights) };
}

export function settleStaticTender(budget, weights = DEFAULT_WEIGHTS) {
  const ranked = scoreBids(suppliers, budget, weights);
  const winner = ranked[0];
  if (!winner) throw new Error("bidScoringFailed");

  const sessionId = `ses_demo_${procurement.id.toLowerCase()}_${winner.id}`;
  const reference = `demo:${procurement.id}:${winner.id}:${winner.price}`;

  return {
    winner,
    ranked,
    session: {
      id: sessionId,
      status: "active",
      approvedBy: "passkey",
      maxTotalAmount: budget,
      maxAmountPerTx: winner.price,
      spent: winner.price,
      ttl: "2h",
      asset: "USDC",
    },
    receipt: {
      status: "settled",
      simulated: true,
      protocol: "x402",
      network: "kite-testnet",
      asset: "USDC",
      amount: winner.price,
      sessionId,
      txHash: null,
      receiptId: reference,
      paidTo: winner.did,
      deliverable: {
        format: "application/json",
        checksum: `sha256:${procurement.id.toLowerCase()}-${winner.id}-verified`,
        summary: "Risk-adjusted L2 intelligence pack delivered and verified.",
      },
    },
  };
}
