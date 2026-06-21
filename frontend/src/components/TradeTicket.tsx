import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { PositionDetail, TradeResponse } from "../types/trades";

interface Props {
  ticker: string;
  currentPrice: string | null;
}

type Side = "BUY" | "SELL";
type Stage = "idle" | "reviewing" | "submitting" | "success" | "error";

const currFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function Row({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: "red";
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <span
        className={`tabular-nums ${bold ? "font-semibold text-slate-100" : "text-slate-300"} ${
          highlight === "red" ? "text-pink-400" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function TradeTicket({ ticker, currentPrice }: Props) {
  const { user, setCashBalance } = useAuth();
  const [side, setSide] = useState<Side>("BUY");
  const [quantityStr, setQuantityStr] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [position, setPosition] = useState<PositionDetail | null>(null);
  const [result, setResult] = useState<TradeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    api.getPosition(ticker).then(setPosition).catch(() => setPosition(null));
  }, [ticker]);

  function reset() {
    setStage("idle");
    setQuantityStr("");
    setErrorMsg("");
    setResult(null);
    api.getPosition(ticker).then(setPosition).catch(() => setPosition(null));
  }

  const quantity = parseInt(quantityStr, 10);
  const price = currentPrice ? parseFloat(currentPrice) : 0;
  const isValidQty = Number.isInteger(quantity) && quantity > 0;
  const estimatedValue = isValidQty ? quantity * price : 0;
  const cash = user?.cash_balance ? parseFloat(user.cash_balance) : 0;
  const heldQty = position?.quantity ?? 0;

  const wouldExceedFunds = side === "BUY" && isValidQty && estimatedValue > cash;
  const wouldOversell = side === "SELL" && isValidQty && quantity > heldQty;
  const canReview = isValidQty && !wouldExceedFunds && !wouldOversell && price > 0;
  const resultingCash = side === "BUY" ? cash - estimatedValue : cash + estimatedValue;

  async function submitTrade() {
    setStage("submitting");
    try {
      const res = await api.executeTrade({ ticker, side, quantity });
      setResult(res);
      setCashBalance(res.cash_balance);
      setStage("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Trade failed");
      setStage("error");
    }
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (stage === "success" && result) {
    const verb = result.side === "BUY" ? "Bought" : "Sold";
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-mint flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-navy-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <p className="text-sm font-semibold text-slate-100">Paper trade confirmed</p>
        </div>
        <div className="bg-navy-750 border border-navy-600 rounded-xl p-4 text-sm space-y-2">
          <p className="text-slate-400">
            {verb}{" "}
            <span className="text-slate-200 font-medium">{result.quantity} share{result.quantity !== 1 ? "s" : ""}</span>{" "}
            of{" "}
            <span className="text-mint font-semibold">{result.ticker}</span>{" "}
            at{" "}
            <span className="text-slate-200 font-medium">{currFmt.format(parseFloat(result.price))}</span>
          </p>
          {result.realized_pnl !== null && (
            <p className={`font-semibold text-sm ${parseFloat(result.realized_pnl) >= 0 ? "text-mint" : "text-pink-400"}`}>
              Realized P&L: {parseFloat(result.realized_pnl) >= 0 ? "+" : ""}
              {currFmt.format(parseFloat(result.realized_pnl))}
            </p>
          )}
          <p className="text-xs text-slate-500 tabular-nums">
            New balance: {currFmt.format(parseFloat(result.cash_balance))}
          </p>
        </div>
        <button
          onClick={reset}
          className="w-full py-2 text-sm font-medium text-mint border border-mint/30 rounded-xl hover:bg-mint/5 transition-all duration-200"
        >
          Place another trade
        </button>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (stage === "error") {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="p-4 rounded-xl bg-pink-400/10 border border-pink-400/20">
          <p className="text-sm font-semibold text-pink-400">Trade rejected</p>
          <p className="text-sm text-pink-300/80 mt-1">{errorMsg}</p>
        </div>
        <button
          onClick={reset}
          className="w-full py-2 text-sm font-medium text-slate-400 border border-navy-600 rounded-xl hover:border-navy-500 hover:text-slate-200 transition-all duration-200"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Review ───────────────────────────────────────────────────────────────
  if (stage === "reviewing") {
    const isSubmitting = stage === ("submitting" as Stage);
    return (
      <div className="space-y-4 animate-fade-in">
        <h3 className="text-sm font-semibold text-slate-200">Review order</h3>
        <div className="bg-navy-750 border border-navy-600 rounded-xl p-4 space-y-2.5 text-sm">
          <Row label="Action" value={side === "BUY" ? "Buy" : "Sell"} />
          <Row label="Ticker" value={ticker} />
          <Row label="Quantity" value={`${quantity} share${quantity !== 1 ? "s" : ""}`} />
          <Row label="Est. price" value={`~${currFmt.format(price)}/share`} />
          <div className="border-t border-navy-700 pt-2.5">
            <Row
              label={side === "BUY" ? "Est. cost" : "Est. proceeds"}
              value={`~${currFmt.format(estimatedValue)}`}
              bold
            />
          </div>
        </div>
        <p className="text-xs text-slate-600 text-center">
          Actual execution price is fetched server-side and may differ slightly.
        </p>
        <p className="text-xs text-amber-500/80 text-center font-medium">
          Paper trade only · no real money involved
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setStage("idle")}
            className="flex-1 py-2 text-sm font-medium text-slate-400 border border-navy-600 rounded-xl hover:border-navy-500 hover:text-slate-200 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={() => void submitTrade()}
            disabled={isSubmitting}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
              side === "BUY"
                ? "bg-mint text-navy-900 hover:bg-mint-400 shadow-glow-mint-sm hover:shadow-glow-mint"
                : "bg-pink-400 text-white hover:bg-pink-300"
            } disabled:opacity-50`}
          >
            Confirm {side === "BUY" ? "Buy" : "Sell"}
          </button>
        </div>
      </div>
    );
  }

  // ── Idle ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Side toggle */}
      <div className="flex rounded-xl border border-navy-600 overflow-hidden p-0.5 gap-0.5 bg-navy-850">
        <button
          onClick={() => setSide("BUY")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            side === "BUY"
              ? "bg-mint text-navy-900 shadow-glow-mint-sm"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide("SELL")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            side === "SELL"
              ? "bg-pink-400 text-white"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Sell
        </button>
      </div>

      {/* Position info */}
      {side === "SELL" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-navy-750 rounded-lg border border-navy-600">
          <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-slate-500">
            {heldQty > 0
              ? <><span className="text-slate-300 font-medium">{heldQty}</span> share{heldQty !== 1 ? "s" : ""} of <span className="text-mint font-semibold">{ticker}</span> held</>
              : <span>No position in <span className="text-mint font-semibold">{ticker}</span></span>}
          </p>
        </div>
      )}

      {/* Quantity input */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
          Shares (whole numbers)
        </label>
        <input
          type="number"
          min={1}
          step={1}
          value={quantityStr}
          onChange={(e) => setQuantityStr(e.target.value)}
          placeholder="0"
          className="input-dark"
        />
      </div>

      {/* Estimate panel */}
      {isValidQty && price > 0 && (
        <div className="bg-navy-750 border border-navy-600 rounded-xl p-3 space-y-2 text-sm animate-fade-in">
          <Row
            label={side === "BUY" ? "Est. cost" : "Est. proceeds"}
            value={`~${currFmt.format(estimatedValue)}`}
          />
          <Row
            label="Cash after trade"
            value={currFmt.format(Math.max(resultingCash, 0))}
            highlight={wouldExceedFunds ? "red" : undefined}
          />
        </div>
      )}

      {/* Warnings */}
      {wouldExceedFunds && (
        <p className="text-xs text-pink-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Insufficient funds. Available: {currFmt.format(cash)}
        </p>
      )}
      {wouldOversell && (
        <p className="text-xs text-pink-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Cannot sell {quantity} — only {heldQty} held.
        </p>
      )}

      <button
        onClick={() => setStage("reviewing")}
        disabled={!canReview}
        className={`w-full py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
          canReview
            ? side === "BUY"
              ? "bg-mint text-navy-900 hover:bg-mint-400 shadow-glow-mint-sm hover:shadow-glow-mint"
              : "bg-pink-400 text-white hover:bg-pink-300"
            : "bg-navy-750 text-slate-600 cursor-not-allowed border border-navy-700"
        }`}
      >
        Review order
      </button>

      <p className="text-xs text-slate-600 text-center">Paper trade · no real money</p>
    </div>
  );
}
