import { useState } from "react";
import type { RecommendationResponse, Signal } from "../types/recommendation";

interface Props {
  data: RecommendationResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const REC_BADGE: Record<string, string> = {
  BUY: "bg-green-50 border-green-300 text-green-800",
  SELL: "bg-red-50 border-red-300 text-red-800",
  HOLD: "bg-amber-50 border-amber-300 text-amber-800",
};

const CONFIDENCE_COLOR: Record<string, string> = {
  LOW: "text-gray-500",
  MEDIUM: "text-blue-600",
  HIGH: "text-purple-600",
};

const SIGNAL_ICON: Record<Signal, string> = {
  bullish: "↑",
  bearish: "↓",
  neutral: "→",
};

const SIGNAL_COLOR: Record<Signal, string> = {
  bullish: "text-green-600",
  bearish: "text-red-600",
  neutral: "text-gray-500",
};

const currFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function pctStr(v: number | null): string {
  if (v === null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export default function RecommendationPanel({ data, loading, error, onRefresh }: Props) {
  const [showEvidence, setShowEvidence] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
          <p className="text-sm text-gray-600 font-medium">Analyzing market data…</p>
        </div>
        <div className="space-y-3 animate-pulse">
          <div className="h-16 bg-gray-200 rounded-xl" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
          <div className="h-4 bg-gray-200 rounded w-4/5" />
        </div>
        <p className="text-xs text-gray-400 text-center">This usually takes 3–8 seconds.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100">
          <p className="text-sm font-medium text-red-700 mb-1">Recommendation unavailable</p>
          <p className="text-xs text-red-600 leading-relaxed">{error}</p>
        </div>
        <button
          onClick={onRefresh}
          className="text-xs text-blue-600 hover:underline font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const es = data.evidence_summary;

  return (
    <div className="space-y-5">
      {/* Disclaimer — always visible */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
        <span className="text-amber-500 shrink-0 mt-0.5">⚠</span>
        <p className="text-xs text-amber-700 leading-relaxed">
          <span className="font-semibold">Educational simulation only.</span>{" "}
          This is NOT financial advice. Do not make real investment decisions based on this output.
        </p>
      </div>

      {/* Recommendation badge */}
      <div className={`flex items-start justify-between px-5 py-4 rounded-xl border-2 ${REC_BADGE[data.recommendation] ?? "bg-gray-50 border-gray-200 text-gray-800"}`}>
        <div>
          <p className="text-3xl font-extrabold tracking-widest">{data.recommendation}</p>
          <p className={`text-xs font-semibold mt-1 ${CONFIDENCE_COLOR[data.confidence] ?? "text-gray-500"}`}>
            {data.confidence} confidence
          </p>
        </div>
        <div className="text-right text-xs text-gray-500 mt-0.5">
          <p>
            {new Date(data.generated_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
          {data.cached && <p className="text-gray-400 mt-0.5">cached</p>}
        </div>
      </div>

      {/* Rationale */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Analysis
        </h4>
        <p className="text-sm text-gray-700 leading-relaxed">{data.rationale}</p>
      </div>

      {/* Key factors */}
      {data.key_factors.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Key factors
          </h4>
          <ul className="space-y-2">
            {data.key_factors.map((kf, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className={`font-bold shrink-0 mt-0.5 ${SIGNAL_COLOR[kf.signal as Signal] ?? "text-gray-500"}`}>
                  {SIGNAL_ICON[kf.signal as Signal] ?? "·"}
                </span>
                <span className="text-gray-700">
                  <span className="font-medium">{kf.factor}:</span>{" "}
                  <span className="text-gray-600">{kf.value}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expandable evidence section */}
      <div>
        <button
          onClick={() => setShowEvidence((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <span className="text-gray-400">{showEvidence ? "▾" : "▸"}</span>
          What this is based on
        </button>

        {showEvidence && (
          <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-1.5 text-xs">
            <EvidRow label="Price" value={currFmt.format(es.current_price)} />
            {es.rsi_14 !== null && (
              <EvidRow label="RSI(14)" value={es.rsi_14.toFixed(1)} />
            )}
            {es.sma50 !== null && (
              <EvidRow label="SMA50" value={currFmt.format(es.sma50)} />
            )}
            {es.sma200 !== null && (
              <EvidRow label="SMA200" value={currFmt.format(es.sma200)} />
            )}
            {es.trend_1m_pct !== null && (
              <EvidRow label="1-month return" value={pctStr(es.trend_1m_pct)} />
            )}
            {es.trend_3m_pct !== null && (
              <EvidRow label="3-month return" value={pctStr(es.trend_3m_pct)} />
            )}
            {es.trend_6m_pct !== null && (
              <EvidRow label="6-month return" value={pctStr(es.trend_6m_pct)} />
            )}
            {es.volatility_30d !== null && (
              <EvidRow label="30d volatility (ann.)" value={`${es.volatility_30d.toFixed(1)}%`} />
            )}
            <div className="border-t border-gray-200 pt-1.5 mt-1.5 space-y-1.5">
              <EvidRow label="Price events analyzed" value={String(es.events_analyzed)} />
              <EvidRow label="Headlines analyzed" value={String(es.headlines_analyzed)} />
              <EvidRow label="Trading days of history" value={String(es.bars_available)} />
              <EvidRow
                label="Your position included"
                value={es.position_included ? "Yes" : "No"}
              />
            </div>
          </div>
        )}
      </div>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        className="w-full py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Refresh recommendation
      </button>
    </div>
  );
}

function EvidRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-700 tabular-nums">{value}</span>
    </div>
  );
}
