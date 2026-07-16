import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { procurement, suppliers } from "./demoData.js";
import { createSession, executeAward, getMode, getSessionStatus, getStatus } from "./kiteAdapter.js";
import { DEFAULT_WEIGHTS, scoreBids } from "./scoring.js";

const app = express();
const port = Number(process.env.PORT || 8787);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pendingAwards = new Map();

app.use(cors());
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mode: getMode(), service: "agent-tender" });
});

app.get("/api/demo", async (_req, res, next) => {
  try {
    const status = await getStatus();
    res.json({ status, procurement, suppliers, weights: DEFAULT_WEIGHTS });
  } catch (error) {
    next(error);
  }
});

app.post("/api/tenders/score", (req, res) => {
  const budget = Number(req.body?.budget ?? procurement.budget);
  const weights = req.body?.weights ?? DEFAULT_WEIGHTS;
  res.json({ ranked: scoreBids(suppliers, budget, weights) });
});

app.post("/api/suppliers/:supplierId/deliver", (req, res) => {
  const supplier = suppliers.find((item) => item.id === req.params.supplierId);
  if (!supplier) {
    res.status(404).json({ error: "Unknown supplier agent" });
    return;
  }

  if (!req.get("X-Payment")) {
    res.status(402).json({
      error: "X-PAYMENT header is required",
      accepts: [
        {
          scheme: "gokite-aa",
          network: "kite-testnet",
          maxAmountRequired: String(Math.round(supplier.price * 1_000_000)),
          resource: `/api/suppliers/${supplier.id}/deliver`,
          description: `${supplier.name} research deliverable`,
          mimeType: "application/json",
          payTo: supplier.did,
          asset: "USDC",
          merchantName: supplier.name,
        },
      ],
      x402Version: 1,
    });
    return;
  }

  res.json({
    paid: true,
    supplierId: supplier.id,
    deliverable: {
      format: "application/json",
      checksum: `sha256:${procurement.id.toLowerCase()}-${supplier.id}-verified`,
      summary: "Risk-adjusted L2 intelligence pack delivered and verified.",
    },
  });
});

app.post("/api/tenders/settle", async (req, res, next) => {
  try {
    const budget = Number(req.body?.budget ?? procurement.budget);
    const ranked = scoreBids(suppliers, budget, req.body?.weights ?? DEFAULT_WEIGHTS);
    const winner = ranked[0];
    if (!winner) {
      res.status(422).json({ error: "No verified bid fits the approved budget." });
      return;
    }

    const session = await createSession({
      taskSummary: `Settle ${procurement.id}: ${procurement.title}`,
      budget,
      maxPerTx: winner.price,
      ttl: "2h",
    });

    if (session.status === "approval_required") {
      pendingAwards.set(session.requestId, { winner, ranked, createdAt: Date.now() });
      res.status(202).json({
        status: "approval_required",
        winner,
        ranked,
        session,
      });
      return;
    }

    const receipt = await executeAward({
      supplier: winner,
      procurementId: procurement.id,
      amount: winner.price,
      sessionId: session.id ?? session.sessionId,
    });

    res.json({ winner, session, receipt, ranked });
  } catch (error) {
    next(error);
  }
});

app.post("/api/tenders/settle/complete", async (req, res, next) => {
  try {
    const requestId = String(req.body?.requestId ?? "");
    const pending = pendingAwards.get(requestId);
    if (!requestId || !pending) {
      res.status(404).json({ error: "Unknown or completed session request." });
      return;
    }

    const session = await getSessionStatus(requestId);
    if (session.status === "pending") {
      res.status(202).json({ status: "pending", session });
      return;
    }

    const receipt = await executeAward({
      supplier: pending.winner,
      procurementId: procurement.id,
      amount: pending.winner.price,
      sessionId: session.id,
    });
    pendingAwards.delete(requestId);
    res.json({ winner: pending.winner, session, receipt, ranked: pending.ranked });
  } catch (error) {
    next(error);
  }
});

const distPath = path.resolve(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*splat", (_req, res) => res.sendFile(path.join(distPath, "index.html")));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || "Unexpected server error" });
});

app.listen(port, () => {
  console.log(`Agent Tender API listening on http://localhost:${port} (${getMode()} mode)`);
});
