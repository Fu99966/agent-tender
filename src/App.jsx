import {
  Activity,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FileText,
  Fingerprint,
  Gauge,
  LayoutDashboard,
  Languages,
  LoaderCircle,
  Play,
  ReceiptText,
  RefreshCw,
  Scale,
  ScrollText,
  ShieldCheck,
  Trophy,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createTranslator } from "./i18n.js";

const phaseOrder = ["ready", "publishing", "bidding", "scoring", "awarding", "settled"];
const phaseLabelKeys = ["phaseBrief", "phasePublished", "phaseBidsReceived", "phaseScored", "phaseAwarded", "phaseSettled"];
const phaseStatusKeys = {
  ready: "statusReady",
  publishing: "statusPublishing",
  bidding: "statusBidding",
  scoring: "statusScoring",
  awarding: "statusAwarding",
  settled: "statusSettled",
  error: "statusError",
};

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const money = (value) => `${Number(value || 0).toFixed(2)} USDC`;

function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem("agent-tender-language") || "zh");
  const [data, setData] = useState(null);
  const [ranked, setRanked] = useState([]);
  const [phase, setPhase] = useState("ready");
  const [result, setResult] = useState(null);
  const [approval, setApproval] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState("command");
  const [weights, setWeights] = useState({ price: 40, reputation: 35, speed: 25 });
  const [logs, setLogs] = useState([
    { time: "00:00", key: "logPolicyLoaded", tone: "muted" },
    { time: "00:01", key: "logWaiting", tone: "muted" },
  ]);
  const runId = useRef(0);
  const t = useMemo(() => createTranslator(language), [language]);

  useEffect(() => {
    localStorage.setItem("agent-tender-language", language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  useEffect(() => {
    fetch("/api/demo")
      .then((response) => {
        if (!response.ok) throw new Error("connectionError");
        return response.json();
      })
      .then(setData)
      .catch((reason) => setError({ key: reason.message }));
  }, []);

  const normalizedWeights = useMemo(() => {
    const total = weights.price + weights.reputation + weights.speed || 1;
    return {
      price: weights.price / total,
      reputation: weights.reputation / total,
      speed: weights.speed / total,
    };
  }, [weights]);

  const isRunning = !["ready", "settled", "error"].includes(phase);
  const currentPhase = phaseOrder.indexOf(phase);

  function addLog(key, variables = {}, tone = "active") {
    setLogs((current) => [
      ...current,
      { time: `00:${String(current.length * 2 + 1).padStart(2, "0")}`, key, variables, tone },
    ]);
  }

  async function runTender() {
    const activeRunId = runId.current + 1;
    runId.current = activeRunId;
    setError(null);
    setResult(null);
    setApproval(null);
    setRanked([]);
    setLogs([{ time: "00:00", key: "logPolicyVerified", tone: "success" }]);

    try {
      setPhase("publishing");
      addLog("logRfpPublished");
      await pause(750);

      setPhase("bidding");
      addLog("logBidsReceived");
      await pause(850);

      setPhase("scoring");
      addLog("logScoring");
      const scoreResponse = await fetch("/api/tenders/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: data.procurement.budget, weights: normalizedWeights }),
      });
      if (!scoreResponse.ok) throw new Error("bidScoringFailed");
      const scoreData = await scoreResponse.json();
      setRanked(scoreData.ranked);
      await pause(900);

      setPhase("awarding");
      addLog("logWinnerSelected", { name: scoreData.ranked[0].name }, "success");
      const settleResponse = await fetch("/api/tenders/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: data.procurement.budget, weights: normalizedWeights }),
      });
      let settleData = await settleResponse.json();
      if (!settleResponse.ok && settleResponse.status !== 202) {
        throw new Error(settleData.error || "settlementFailed");
      }

      if (settleResponse.status === 202 && settleData.status === "approval_required") {
        setApproval(settleData.session);
        addLog("logSessionRequested", {}, "active");
        settleData = await waitForApproval(settleData.session.requestId, activeRunId);
        if (!settleData) return;
      }

      addLog(data.status.mode === "mock" ? "logDemoSessionActivated" : "logSessionApproved", {}, "success");
      await pause(1000);

      setApproval(null);
      setResult(settleData);
      setRanked(settleData.ranked);
      setPhase("settled");
      addLog(data.status.mode === "mock" ? "logDemoSettled" : "logSettled", { amount: money(settleData.receipt.amount) }, "success");
      addLog(data.status.mode === "mock" ? "logDemoDeliverableVerified" : "logDeliverableVerified", {}, "success");
    } catch (reason) {
      const knownKey = ["bidScoringFailed", "settlementFailed", "sessionApprovalTimeout"].includes(reason.message)
        ? reason.message
        : "settlementFailed";
      setApproval(null);
      setError({ key: knownKey });
      setPhase("error");
      addLog(knownKey, {}, "error");
    }
  }

  async function waitForApproval(requestId, activeRunId) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      await pause(3000);
      if (runId.current !== activeRunId) return null;

      const response = await fetch("/api/tenders/settle/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const payload = await response.json();
      if (response.status === 202) continue;
      if (!response.ok) throw new Error(payload.error || "settlementFailed");
      return payload;
    }

    throw new Error("sessionApprovalTimeout");
  }

  function resetDemo() {
    runId.current += 1;
    setPhase("ready");
    setResult(null);
    setApproval(null);
    setRanked([]);
    setError(null);
    setLogs([
      { time: "00:00", key: "logPolicyLoaded", tone: "muted" },
      { time: "00:01", key: "logWaiting", tone: "muted" },
    ]);
  }

  if (!data && !error) {
    return (
      <div className="loading-screen">
        <LoaderCircle className="spin" size={22} />
        <span>{t("connecting")}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="loading-screen error-screen">
        <X size={22} />
        <span>{error?.message || t(error?.key || "connectionError")}</span>
      </div>
    );
  }

  const nav = [
    { id: "command", labelKey: "navCommand", icon: LayoutDashboard },
    { id: "tenders", labelKey: "navTenders", icon: FileText },
    { id: "agents", labelKey: "navAgents", icon: Bot },
    { id: "audit", labelKey: "navAudit", icon: ScrollText },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand" title="Agent Tender">
          <span className="brand-mark">AT</span>
          <span className="brand-name">AGENT<br />TENDER</span>
        </div>

        <nav className="main-nav" aria-label={t("primaryNavigation")}>
          {nav.map((item) => (
            <button
              className={view === item.id ? "nav-item active" : "nav-item"}
              key={item.id}
              onClick={() => setView(item.id)}
              title={t(item.labelKey)}
            >
              <item.icon size={19} strokeWidth={1.8} />
              <span>{t(item.labelKey)}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="network-pulse"><span /> Kite Testnet</div>
          <div className="passport-mini">
            <Fingerprint size={18} />
            <div><strong>Passport</strong><span>{t("verified")}</span></div>
            <CheckCircle2 size={16} />
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">{t("procurementOS")} / {t(`nav${view[0].toUpperCase()}${view.slice(1)}`).toUpperCase()}</span>
            <h1>{t(`view${view[0].toUpperCase()}${view.slice(1)}`)}</h1>
          </div>
          <div className="topbar-actions">
            <div className={`mode-badge ${data.status.mode === "mock" ? "mock" : "live"}`}>
              <span /> {data.status.mode === "mock" ? t("demoMode") : t("liveKite")}
            </div>
            <div className="language-switch" aria-label={language === "zh" ? "语言" : "Language"}>
              <Languages size={15} />
              <button className={language === "zh" ? "active" : ""} onClick={() => setLanguage("zh")} aria-label="简体中文">中文</button>
              <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")} aria-label="English">EN</button>
            </div>
            <button className="icon-button" onClick={resetDemo} title={t("resetDemo")} aria-label={t("resetDemo")}>
              <RefreshCw size={18} />
            </button>
            <div className="wallet-chip">
              <WalletCards size={17} />
              <span>{Number(data.status.wallet.balance).toFixed(2)}</span>
              <b>{data.status.wallet.asset}</b>
            </div>
          </div>
        </header>

        {view === "command" && (
          <CommandView
            data={data}
            ranked={ranked}
            phase={phase}
            currentPhase={currentPhase}
            isRunning={isRunning}
            result={result}
            approval={approval}
            error={error}
            logs={logs}
            weights={weights}
            setWeights={setWeights}
            runTender={runTender}
            resetDemo={resetDemo}
            t={t}
          />
        )}
        {view === "tenders" && <TendersView procurement={data.procurement} phase={phase} t={t} />}
        {view === "agents" && <AgentsView suppliers={data.suppliers} status={data.status} t={t} />}
        {view === "audit" && <AuditView result={result} logs={logs} t={t} />}
      </main>
    </div>
  );
}

function CommandView({
  data,
  ranked,
  phase,
  currentPhase,
  isRunning,
  result,
  approval,
  error,
  logs,
  weights,
  setWeights,
  runTender,
  resetDemo,
  t,
}) {
  const bids = ranked.length ? ranked : data.suppliers;

  return (
    <div className="command-view">
      <section className="metrics-band" aria-label={t("procurementMetrics")}>
        <Metric icon={CircleDollarSign} label={t("approvedBudget")} value={money(data.procurement.budget)} accent="yellow" />
        <Metric icon={Users} label={t("verifiedBidders")} value={t("agentsCount", { count: data.suppliers.length })} accent="teal" />
        <Metric icon={Gauge} label={t("sessionTTL")} value="02:00:00" accent="coral" />
        <Metric icon={ShieldCheck} label={t("policyStatus")} value={t("enforced")} accent="green" />
      </section>

      <section className="progress-rail" aria-label={t("tenderProgress")}>
        {phaseLabelKeys.map((labelKey, index) => (
          <div className={`progress-step ${index <= currentPhase ? "done" : ""}`} key={labelKey}>
            <span>{index < currentPhase || phase === "settled" ? <Check size={13} /> : index + 1}</span>
            <b>{t(labelKey)}</b>
          </div>
        ))}
      </section>

      <div className="content-grid">
        <div className="primary-column">
          <section className="rfp-section">
            <div className="section-heading">
              <div>
                <span className="mono-label">{data.procurement.id}</span>
                <h2>{t("procurementTitle")}</h2>
              </div>
              <div className={`status-pill phase-${phase}`}>
                {isRunning && <LoaderCircle className="spin" size={13} />}
                {t(phaseStatusKeys[phase] || "statusError")}
              </div>
            </div>
            <p className="brief">{t("procurementBrief")}</p>
            <div className="rfp-facts">
              <span><Clock3 size={15} /> {t("dueIn", { deadline: t("deadline") })}</span>
              <span><WalletCards size={15} /> {t("maxBudget", { amount: money(data.procurement.budget) })}</span>
              <span><ShieldCheck size={15} /> {t("verifiedOnly")}</span>
            </div>
          </section>

          <section className="bids-section">
            <div className="section-heading compact">
              <div>
                <span className="mono-label">{t("sealedBidRoom")}</span>
                <h3>{t("supplierOffers")}</h3>
              </div>
              <span className="bid-count">{t("bidsReceived", { count: data.suppliers.length })}</span>
            </div>
            <div className="bid-table-head">
              <span>{t("agent")}</span><span>{t("offer")}</span><span>{t("delivery")}</span><span>{t("trust")}</span><span>{t("score")}</span>
            </div>
            <div className="bid-list">
              {bids.map((bid, index) => (
                <article
                  className={`bid-row ${index === 0 && ranked.length ? "winner" : ""}`}
                  data-winner-label={t("winner")}
                  key={bid.id}
                >
                  <div className="agent-cell">
                    <div className={`agent-avatar avatar-${index + 1}`}>{bid.name.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <strong>{bid.name}</strong>
                      <span><ShieldCheck size={12} /> {bid.did}</span>
                    </div>
                  </div>
                  <strong className="price-cell">{money(bid.price)}</strong>
                  <span>{t("minutes", { count: bid.deliveryMinutes })}</span>
                  <span>{bid.reputation}/100</span>
                  <div className="score-cell">
                    {bid.score ? <b>{bid.score}</b> : <span>--</span>}
                    {index === 0 && ranked.length > 0 && <Trophy size={15} />}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="control-column">
          <section className="policy-panel">
            <div className="section-heading compact">
              <div>
                <span className="mono-label">{t("autonomyPolicy")}</span>
                <h3>{t("selectionWeights")}</h3>
              </div>
              <Scale size={19} />
            </div>
            <WeightControl label={t("priceEfficiency")} value={weights.price} color="yellow" onChange={(value) => setWeights({ ...weights, price: value })} />
            <WeightControl label={t("agentReputation")} value={weights.reputation} color="teal" onChange={(value) => setWeights({ ...weights, reputation: value })} />
            <WeightControl label={t("deliverySpeed")} value={weights.speed} color="coral" onChange={(value) => setWeights({ ...weights, speed: value })} />
            <div className="guardrails">
              <div><ShieldCheck size={16} /><span>{t("maxPerTransaction")}</span><b>{money(data.procurement.budget)}</b></div>
              <div><Fingerprint size={16} /><span>{t("ownerAuthorization")}</span><b>Passkey</b></div>
              <div><Zap size={16} /><span>{t("paymentRail")}</span><b>x402</b></div>
            </div>
            <button className="run-button" onClick={phase === "settled" ? resetDemo : runTender} disabled={isRunning}>
              {isRunning ? <LoaderCircle className="spin" size={18} /> : phase === "settled" ? <RefreshCw size={18} /> : <Play size={18} fill="currentColor" />}
              {isRunning ? t("agentProcuring") : phase === "settled" ? t("runAnotherTender") : t("runAutonomousTender")}
            </button>
            <p className="policy-note">{t("policyNote")}</p>
          </section>

          <section className="agent-console">
            <div className="console-head">
              <span><Activity size={15} /> {t("liveAgentLog")}</span>
              <i />
            </div>
            <div className="console-lines">
              {logs.slice(-6).map((log, index) => (
                <div className={`console-line ${log.tone}`} key={`${log.time}-${index}`}>
                  <time>{log.time}</time><span>{log.message || t(log.key, log.variables)}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {error && <div className="error-banner"><X size={17} /> {error.message || t(error.key)}</div>}
      {approval && (
        <section className="approval-banner" aria-live="polite">
          <div className="approval-icon"><Fingerprint size={24} /></div>
          <div>
            <span className="mono-label">KITE PASSPORT</span>
            <h3>{t("approvalRequired")}</h3>
            <p>{t("approvalHint")}</p>
          </div>
          <div className="approval-waiting"><LoaderCircle className="spin" size={16} /> {t("checkingApproval")}</div>
          <a href={approval.approvalUrl} target="_blank" rel="noreferrer">
            {t("approveWithPasskey")} <ArrowUpRight size={17} />
          </a>
        </section>
      )}
      {result && <SettlementStrip result={result} t={t} />}
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent }) {
  return (
    <div className={`metric metric-${accent}`}>
      <Icon size={19} />
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}

function WeightControl({ label, value, color, onChange }) {
  return (
    <label className={`weight-control weight-${color}`}>
      <div><span>{label}</span><b>{value}%</b></div>
      <input type="range" min="5" max="70" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function SettlementStrip({ result, t }) {
  const reference = result.receipt.txHash || result.receipt.receiptId;
  const canOpenExplorer = !result.receipt.simulated && result.receipt.txHash?.startsWith("0x");
  return (
    <section className="settlement-strip">
      <div className="settlement-icon"><CheckCircle2 size={25} /></div>
      <div className="settlement-title">
        <span className="mono-label">{t(result.receipt.simulated ? "demoPaymentSettled" : "paymentSettled")}</span>
        <h3>{t("wonTender", { name: result.winner.name })}</h3>
      </div>
      <div className="settlement-fact"><span>{t(result.receipt.simulated ? "demoAmount" : "paid")}</span><strong>{money(result.receipt.amount)}</strong></div>
      <div className="settlement-fact"><span>{t("protocol")}</span><strong>{result.receipt.protocol.toUpperCase()}</strong></div>
      <div className="settlement-fact hash"><span>{t(result.receipt.simulated ? "demoReference" : "transaction")}</span><strong>{reference.length > 24 ? `${reference.slice(0, 12)}...${reference.slice(-6)}` : reference}</strong></div>
      {canOpenExplorer && (
        <a href={`https://testnet.kitescan.ai/tx/${result.receipt.txHash}`} target="_blank" rel="noreferrer" title={t("openKiteScan")}>
          <ArrowUpRight size={19} />
        </a>
      )}
    </section>
  );
}

function TendersView({ procurement, phase, t }) {
  return (
    <div className="secondary-view">
      <div className="view-intro"><span className="mono-label">{t("procurementPipeline")}</span><h2>{t("tenderTagline")}</h2></div>
      <div className="large-table">
        <div className="large-table-head"><span>ID</span><span>{t("mandate")}</span><span>{t("budget")}</span><span>{t("owner")}</span><span>{t("status")}</span></div>
        <div className="large-table-row">
          <code>{procurement.id}</code><strong>{t("procurementTitle")}</strong><span>{money(procurement.budget)}</span><span>{t("ownerName")}</span><span className="table-status">{t(phaseStatusKeys[phase] || "statusError")}</span>
        </div>
      </div>
    </div>
  );
}

function AgentsView({ suppliers, status, t }) {
  const agents = [status.agent, ...suppliers];
  return (
    <div className="secondary-view">
      <div className="view-intro"><span className="mono-label">{t("verifiedNetwork")}</span><h2>{t("agentTagline")}</h2></div>
      <div className="agent-grid">
        {agents.map((agent, index) => (
          <article className="agent-card" key={agent.did}>
            <div className={`agent-avatar large avatar-${(index % 3) + 1}`}>{agent.name.slice(0, 2).toUpperCase()}</div>
            <div><span className="verified-line"><ShieldCheck size={14} /> {t("passportVerified")}</span><h3>{agent.name}</h3><code>{agent.did}</code></div>
            <div className="agent-card-stat"><span>{agent.reputation ? t("reputation") : t("role")}</span><strong>{agent.reputation ? `${agent.reputation}/100` : t("buyer")}</strong></div>
          </article>
        ))}
      </div>
    </div>
  );
}

function AuditView({ result, logs, t }) {
  return (
    <div className="secondary-view">
      <div className="view-intro"><span className="mono-label">{t("immutableEvidence")}</span><h2>{t("auditTagline")}</h2></div>
      {!result ? (
        <div className="empty-state"><ReceiptText size={35} /><h3>{t("noReceipt")}</h3><p>{t("noReceiptHint")}</p></div>
      ) : (
        <div className="audit-layout">
          <section className="receipt-sheet">
            <div className="receipt-heading"><FileCheck2 size={24} /><div><span>{t(result.receipt.simulated ? "demoPaymentReceipt" : "kitePaymentReceipt")}</span><strong>{result.receipt.receiptId}</strong></div></div>
            <ReceiptRow label={t("status")} value={t("settled")} />
            <ReceiptRow label={t("session")} value={result.receipt.sessionId} />
            <ReceiptRow label={t("protocol")} value={`${result.receipt.protocol} / ${result.receipt.network}`} />
            <ReceiptRow label={t("supplier")} value={result.winner.did} />
            <ReceiptRow label={t("amount")} value={money(result.receipt.amount)} />
            <ReceiptRow label={t(result.receipt.simulated ? "demoReference" : "transaction")} value={result.receipt.txHash || result.receipt.receiptId} mono />
            <ReceiptRow label={t("deliverableChecksum")} value={result.receipt.deliverable.checksum} mono />
          </section>
          <section className="audit-timeline">
            {logs.map((log, index) => <div key={index}><span>{index + 1}</span><time>{log.time}</time><p>{log.message || t(log.key, log.variables)}</p></div>)}
          </section>
        </div>
      )}
    </div>
  );
}

function ReceiptRow({ label, value, mono }) {
  return <div className="receipt-row"><span>{label}</span><strong className={mono ? "mono-value" : ""}>{value}</strong></div>;
}

export default App;
