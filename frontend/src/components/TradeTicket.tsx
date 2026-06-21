import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { PositionDetail, TradeResponse } from "../types/trades";

interface Props {
  ticker: string;
  currentPrice: string | null; // from already-loaded quote; may be slightly stale
}

type Side = "BUY" | "SELL";
type Stage = "idle" | "reviewing" | "submitting" | "success" | "error";

const currFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function TradeTicket({ ticker, currentPrice }: Props) {
  const { user, setCashBalance } = useAuth();
  const [side, setSide] = useState<Side>("BUY");
  const [quantityStr, setQuantityStr] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [position, setPosition] = useState<PositionDetail | null>(null);
  const [result, setResult] = useState<TradeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Load current position for this ticker
  useEffect(() => {
    api.getPosition(ticker).then(setPosition).catch(() => setPosition(null));
  }, [ticker]);

  function reset() {
    setStage("idle");
    setQuantityStr("");
    setErrorMsg("");
    setResult(null);
    // Refresh position count after a trade
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

  const resultingCash =
    side === "BUY" ? cash - estimatedValue : cash + estimatedValue;

  async function submitTrade() {
    setStage("submitting");
    try {
      const res = await api.executeTrade({ ticker, side, quantity });
      setResult(res);
      setCashBalance(res.cash_balance); // sync header cash without a /me roundtrip
      setStage("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Trade failed");
      setStage("error");
    }
  }

  // ── Success state ──────────────────────────────────────────────────────
  if (stage === "success" && result) {
    const verb = result.side === "BUY" ? "Bought" : "Sold";
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <p className="text-sm font-semibold text-gray-800">Paper trade confirmed</p>
        </div>
        <p className="text-sm text-gray-600">
          {verb} <span className="font-medium">{result.quantity} share{result.quantity !== 1 ? "s" : ""}</span>{" "}
          of <span className="font-medium">{result.ticker}</span>{" "}
          at <span className="font-medium">{currFmt.format(parseFloat(result.price))}</span>
        </p>
        {result.realized_pnl !== null && (
          <p className={`text-sm font-medium ${parseFloat(result.realized_pnl) >= 0 ? "text-green-600" : "text-red-600"}`}>
            Realized P&L: {parseFloat(result.realized_pnl) >= 0 ? "+" : ""}
            {currFmt.format(parseFloat(result.realized_pnl))}
          </p>
        )}
        <p className="text-xs text-gray-500">
          New cash balance: {currFmt.format(parseFloat(result.cash_balance))}
        </p>
        <button
          onClick={reset}
          className="w-full py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Place another trade
        </button>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (stage === "error") {
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700 font-medium">Trade rejected</p>
          <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
        </div>
        <button
          onClick={reset}
          className="w-full py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Review state ───────────────────────────────────────────────────────
  if (stage === "reviewing") {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Review order</h3>
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2 text-sm">
          <Row label="Action" value={side === "BUY" ? "Buy" : "Sell"} />
          <Row label="Ticker" value={ticker} />
          <Row label="Quantity" value={`${quantity} share${quantity !== 1 ? "s" : ""}`} />
          <Row label="Est. price" value={`~${currFmt.format(price)}/share`} />
          <Row
            label={side === "BUY" ? "Est. cost" : "Est. proceeds"}
            value={`~${currFmt.format(estimatedValue)}`}
            bold
          />
        </div>
        <p className="text-xs text-gray-400 text-center">
          Actual execution price is fetched server-side and may differ slightly.
        </p>
        <p className="text-xs text-orange-500 text-center font-medium">
          This is a simulated paper trade — no real money involved.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setStage("idle")}
            className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void submitTrade()}
            disabled={stage === "submitting"}
            className={`flex-1 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              side === "BUY"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            Confirm {side === "BUY" ? "Buy" : "Sell"}
          </button>
        </div>
      </div>
    );
  }

  // ── Idle state (default) ───────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Side toggle */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setSide("BUY")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            side === "BUY"
              ? "bg-green-600 text-white"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide("SELL")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            side === "SELL"
              ? "bg-red-600 text-white"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          Sell
        </button>
      </div>

      {/* Position info for sells */}
      {side === "SELL" && (
        <p className="text-xs text-gray-500">
          {heldQty > 0
            ? `You hold ${heldQty} share${heldQty !== 1 ? "s" : ""} of ${ticker}`
            : `You have no position in ${ticker}`}
        </p>
      )}

      {/* Quantity */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Shares (whole numbers only)
        </label>
        <input
          type="number"
          min={1}
          step={1}
          value={quantityStr}
          onChange={(e) => setQuantityStr(e.target.value)}
          placeholder="0"
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Estimate */}
      {isValidQty && price > 0 && (
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-1.5 text-sm">
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
        <p className="text-xs text-red-600">
          Insufficient funds. Available: {currFmt.format(cash)}
        </p>
      )}
      {wouldOversell && (
        <p className="text-xs text-red-600">
          Cannot sell {quantity} share{quantity !== 1 ? "s" : ""} — only {heldQty} held.
        </p>
      )}

      <button
        onClick={() => setStage("reviewing")}
        disabled={!canReview}
        className={`w-full py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${
          canReview
            ? side === "BUY"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        Review order
      </button>

      <p className="text-xs text-gray-400 text-center">
        Simulated paper trade — no real money involved
      </p>
    </div>
  );
}

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
      <span className="text-gray-500">{label}</span>
      <span
        className={`${bold ? "font-semibold" : ""} ${
          highlight === "red" ? "text-red-600" : "text-gray-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
