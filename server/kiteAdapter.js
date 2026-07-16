import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const mode = process.env.KITE_MODE === "live" ? "live" : "mock";

export function resolveKpassExecutable() {
  if (process.env.KPASS_BIN) return process.env.KPASS_BIN;
  if (process.platform !== "win32") return "kpass";

  const installedBinary = path.join(process.env.USERPROFILE || os.homedir(), ".kpass", "bin", "kpass.exe");
  return existsSync(installedBinary) ? installedBinary : "kpass.exe";
}

function readJson(stdout, stderr, code) {
  const payload = stdout.trim() || stderr.trim();
  let parsed;

  try {
    parsed = JSON.parse(payload);
  } catch {
    parsed = null;
  }

  if (code !== 0 || parsed?.status === "error") {
    throw new Error(parsed?.error || parsed?.hint || payload || `kpass exited with code ${code}`);
  }

  return parsed ?? { raw: payload };
}

function runKpass(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(resolveKpassExecutable(), [...args, "--no-interactive", "--output", "json"], {
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      try {
        resolve(readJson(stdout, stderr, code));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function mockHash(seed) {
  return `0x${crypto.createHash("sha256").update(seed).digest("hex")}`;
}

export function normalizeLiveStatus(status, wallet, addresses) {
  const agent = status.agent ?? {};
  const usdc = wallet.assets?.find((asset) => String(asset.asset).toUpperCase() === "USDC");
  const primaryWallet = addresses.wallets?.find((item) => item.chain === "base") ?? addresses.wallets?.[0];

  return {
    mode: "live",
    connected: status.backend?.reachable !== false,
    network: "Base / Tempo / Solana",
    agent: {
      name: agent.type ? `${agent.type} agent` : "Agent Tender Buyer",
      did: agent.agent_id ?? "Kite Passport connected",
      verified: Boolean(agent.registered),
    },
    wallet: {
      address: primaryWallet?.address ?? "Kite Passport wallet",
      balance: Number(usdc?.total ?? 0),
      asset: "USDC",
    },
    raw: { status, wallet, addresses },
  };
}

export function getMode() {
  return mode;
}

export async function getStatus() {
  if (mode === "live") {
    const [status, wallet, addresses] = await Promise.all([
      runKpass(["status"]),
      runKpass(["wallet", "balance"]),
      runKpass(["wallet", "address"]),
    ]);
    return normalizeLiveStatus(status, wallet, addresses);
  }

  return {
    mode,
    connected: true,
    network: "Kite Testnet",
    agent: {
      name: "Treasury Alpha Agent",
      did: "did:kite:agt_A1F4...8C22",
      verified: true,
    },
    wallet: { address: "0x71e4...C91A", balance: 24.8, asset: "USDC" },
  };
}

export async function createSession({ taskSummary, budget, maxPerTx, ttl = "2h" }) {
  if (mode === "live") {
    const request = await runKpass([
      "agent:session",
      "create",
      "--task-summary",
      taskSummary,
      "--max-amount-per-tx",
      String(maxPerTx),
      "--max-total-amount",
      String(budget),
      "--ttl",
      ttl,
      "--assets",
      "USDC",
    ]);
    const requestId = request.request_id ?? request.requestId ?? request.id;
    if (!requestId) throw new Error("Kite Passport did not return a session request ID");

    return {
      ...request,
      id: null,
      requestId,
      approvalUrl: request.approval_url ?? request.approvalUrl,
      status: "approval_required",
    };
  }

  return {
    id: `ses_${crypto.randomBytes(4).toString("hex")}`,
    requestId: null,
    status: "active",
    approvedBy: "passkey",
    maxTotalAmount: budget,
    maxAmountPerTx: maxPerTx,
    spent: 0,
    ttl,
    asset: "USDC",
  };
}

export async function getSessionStatus(requestId) {
  if (mode !== "live") return { id: requestId, status: "active" };

  const response = await runKpass([
    "agent:session",
    "status",
    "--request-id",
    String(requestId),
  ]);
  const sessionId = response.session_id ?? response.session?.id ?? response.current_session_id;

  if (!sessionId || response.status === "pending") {
    return { ...response, requestId, id: null, status: "pending" };
  }

  return { ...response, requestId, id: sessionId, status: "active" };
}

export function normalizeLiveReceipt(response, { supplier, amount, sessionId }) {
  const payment = response.payment ?? {};
  const paymentReceipt = response.payment_receipt ?? payment.payment_receipt ?? {};
  const reference =
    paymentReceipt.transaction_hash ??
    payment.payment_response?.reference ??
    paymentReceipt.reference ??
    response.x402?.transaction_hash ??
    null;
  const delivered = response.x402?.parsed_response_body ?? payment.parsed_response_body;

  return {
    status: "settled",
    simulated: false,
    protocol: response.x402 ? "x402" : "mpp",
    network: response.x402?.chain_id ? `chain:${response.x402.chain_id}` : payment.network ?? "Kite",
    asset: response.payment_requirement?.asset ?? "USDC",
    amount: Number(response.payment_requirement?.amount ?? amount),
    sessionId: response.session_id ?? sessionId,
    txHash: reference,
    receiptId: paymentReceipt.id ?? reference ?? `kpass:${response.session_id ?? sessionId}`,
    paidTo: supplier.did,
    deliverable: {
      format: delivered ? "application/json" : "text/plain",
      checksum: delivered?.deliverable?.checksum ?? delivered?.checksum ?? "Not provided by supplier",
      summary:
        delivered?.deliverable?.summary ??
        delivered?.summary ??
        response.hint ??
        "Paid supplier response received.",
      payload: delivered ?? response.x402?.response_body ?? null,
    },
    raw: response,
  };
}

export async function executeAward({ supplier, procurementId, amount, sessionId }) {
  const endpoint = process.env.KITE_SUPPLIER_URL;
  if (mode === "live") {
    if (!endpoint) throw new Error("KITE_SUPPLIER_URL is required in live mode");
    const method = String(process.env.KITE_SUPPLIER_METHOD || "POST").toUpperCase();
    const body = process.env.KITE_SUPPLIER_BODY || JSON.stringify({
      query: "Compare Base, Arbitrum and Optimism across TVL momentum, fee revenue and protocol risk",
      procurementId,
      supplierId: supplier.id,
    });
    const args = [
      "agent:session",
      "execute",
      "--url",
      endpoint,
      "--method",
      method,
      "--headers",
      '{"Content-Type":"application/json"}',
    ];
    if (method !== "GET" && method !== "HEAD") args.push("--body", body);
    const response = await runKpass(args);
    return normalizeLiveReceipt(response, { supplier, amount, sessionId });
  }

  const resource = `http://127.0.0.1:${process.env.PORT || 8787}/api/suppliers/${supplier.id}/deliver`;
  const requestBody = JSON.stringify({ procurementId, supplierId: supplier.id });
  const challengeResponse = await fetch(resource, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: requestBody,
  });
  if (challengeResponse.status !== 402) throw new Error("Mock supplier did not return an x402 payment challenge");

  const challenge = await challengeResponse.json();
  const txHash = mockHash(`${procurementId}:${supplier.id}:${amount}`);
  const paymentToken = Buffer.from(
    JSON.stringify({
      authorization: { sessionId, amount, asset: "USDC" },
      signature: mockHash(`payment:${txHash}`),
    }),
  ).toString("base64");
  const deliveryResponse = await fetch(resource, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Payment": paymentToken },
    body: requestBody,
  });
  if (!deliveryResponse.ok) throw new Error("Mock supplier delivery failed after payment");
  const delivery = await deliveryResponse.json();

  return {
    status: "settled",
    simulated: true,
    protocol: "x402",
    network: "kite-testnet",
    asset: "USDC",
    amount,
    sessionId,
    txHash,
    receiptId: `rcpt_${txHash.slice(2, 12)}`,
    paidTo: supplier.did,
    challenge: challenge.accepts?.[0],
    deliverable: delivery.deliverable,
  };
}
