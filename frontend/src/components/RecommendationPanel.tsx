import { useState } from "react";
import type { RecommendationResponse, Signal } from "../types/recommendation";

interface Props {
  data: RecommendationResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const REC_STYLES: Record<string, { badge: string; glow: string; label: string }> = {
  BUY: {
    badge: "bg-mint/10 border-mint/30 text-mint",
    glow: "shadow-glow-mint-sm",
    label: "text-mint",
  },
  SELL: {
    badge: "bg-pink-400/10 border-pink-400/30 text-pink-400",
    glow: "",
    label: "text-pink-400",
  },
  HOLD: {
    badge: "bg-violet-400/10 border-violet-400/30 text-violet-400",
    glow: "",
    label: "text-violet-400",
  },
};

const CONFIDENCE_STYLES: Record<string, string> = {
  LOW: "text-slate-500",
  MEDIUM: "text-cyan-400",
  HIGH: "text-violet-400",
};

const SIGNAL_ICON: Record<Signal, string> = {
  bullish: "↑",
  bearish: "↓",
  neutral: "→",
};

const SIGNAL_COLOR: Record<Signal, string> = {
  bullish: "text-mint",
  bearish: "text-pink-400",
  neutral: "text-slate-500",
};

const currFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function pctStr(v: number | null): string {
  if (v === null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function EvidRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-slate-300 tabular-nums">{value}</span>
    </div>
  );
}

export default function RecommendationPanel({ data, loading, error, onRefresh }: Props) {
  const [showEvidence, setShowEvidence] = useState(false);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 border-2 border-mint/60 border-t-transparent rounded-full animate-spin shrink-0" />
          <p className="text-sm text-slate-400 font-medium">Analyzing market data…</p>
        </div>
        <div className="space-y-3 animate-pulse">
          <div className="h-20 bg-navy-750 border border-navy-700 rounded-xl" />
          <div className="h-4 bg-navy-750 rounded w-full" />
          <div className="h-4 bg-navy-750 rounded w-5/6" />
          <div className="h-4 bg-navy-750 rounded w-4/5" />
        </div>
        <p className="text-xs text-slate-600 text-center">This usually takes 3–8 seconds.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="px-4 py-3 rounded-xl bg-pink-400/10 border border-pink-400/20">
          <p className="text-sm font-semibold text-pink-400 mb-1">Recommendation unavailable</p>
          <p className="text-xs text-pink-300/70 leading-relaxed">{error}</p>
        </div>
        <button
          onClick={onRefresh}
          className="text-xs text-mint hover:text-mint-400 font-medium transition-colors"
        >
          Try again →
        </button>
      </div>
    );
  }

  if (!data) return null;

  const rec = REC_STYLES[data.recommendation] ?? REC_STYLES["HOLD"];
  const es = data.evidence_summary;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 px-3.5 py-3 bg-amber-400/5 border border-amber-400/20 rounded-xl">
        <span className="text-amber-400 shrink-0 mt-0.5 text-base">⚠</span>
        <p className="text-xs text-amber-300/80 leading-relaxed">
          <span className="font-semibold text-amber-400">Educational simulation only.</span>{" "}
          This is NOT financial advice. Do not make real investment decisions based on this output.
        </p>
      </div>

      {/* Recommendation badge */}
      <div
        className={`flex items-start justify-between px-5 py-4 rounded-xl border-2 ${rec.badge} ${rec.glow}`}
      >
        <div>
          <p className="text-4xl font-extrabold tracking-widest">{data.recommendation}</p>
          <p className={`text-xs font-semibold mt-1 ${CONFIDENCE_STYLES[data.confidence] ?? "text-slate-500"}`}>
            {data.confidence} confidence
          </p>
        </div>
        <div className="text-right text-xs text-slate-600 mt-0.5 shrink-0">
          <p className="tabular-nums">
            {new Date(data.generated_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
          {data.cached && <p className="text-slate-700 mt-0.5">cached</p>}
        </div>
      </div>

      {/* Rationale */}
      <div>
        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-2">
          Analysis
        </h4>
        <p className="text-sm text-slate-300 leading-relaxed">{data.rationale}</p>
      </div>

      {/* Key factors */}
      {data.key_factors.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">
            Key factors
          </h4>
          <ul className="space-y-2">
            {data.key_factors.map((kf, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm bg-navy-750 border border-navy-700 rounded-lg px-3 py-2.5">
                <span
                  className={`font-bold shrink-0 mt-0.5 text-base leading-none ${
                    SIGNAL_COLOR[kf.signal as Signal] ?? "text-slate-500"
                  }`}
                >
                  {SIGNAL_ICON[kf.signal as Signal] ?? "·"}
                </span>
                <span>
                  <span className="font-medium text-slate-200">{kf.factor}:</span>{" "}
                  <span className="text-slate-400">{kf.value}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expandable evidence */}
      <div>
        <button
          onClick={() => setShowEvidence((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors duration-200"
        >
          <span className={`transition-transform duration-200 ${showEvidence ? "rotate-90" : ""}`}>▶</span>
          What this is based on
        </button>

        {showEvidence && (
          <div className="mt-3 bg-navy-750 border border-navy-700 rounded-xl p-4 space-y-2 text-xs animate-slide-up">
            <EvidRow label="Price" value={currFmt.format(es.current_price)} />
            {es.rsi_14 !== null && <EvidRow label="RSI(14)" value={es.rsi_14.toFixed(1)} />}
            {es.sma50 !== null && <EvidRow label="SMA50" value={currFmt.format(es.sma50)} />}
            {es.sma200 !== null && <EvidRow label="SMA200" value={currFmt.format(es.sma200)} />}
            {es.trend_1m_pct !== null && <EvidRow label="1-month return" value={pctStr(es.trend_1m_pct)} />}
            {es.trend_3m_pct !== null && <EvidRow label="3-month return" value={pctStr(es.trend_3m_pct)} />}
            {es.trend_6m_pct !== null && <EvidRow label="6-month return" value={pctStr(es.trend_6m_pct)} />}
            {es.volatility_30d !== null && (
              <EvidRow label="30d volatility (ann.)" value={`${es.volatility_30d.toFixed(1)}%`} />
            )}
            <div className="border-t border-navy-700 pt-2 mt-1 space-y-2">
              <EvidRow label="Price events analyzed" value={String(es.events_analyzed)} />
              <EvidRow label="Headlines analyzed" value={String(es.headlines_analyzed)} />
              <EvidRow label="Trading days of history" value={String(es.bars_available)} />
              <EvidRow label="Position included" value={es.position_included ? "Yes" : "No"} />
            </div>
          </div>
        )}
      </div>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        className="w-full py-2 text-xs font-medium text-slate-500 border border-navy-700 rounded-xl hover:border-navy-600 hover:text-slate-300 transition-all duration-200 flex items-center justify-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh recommendation
      </button>
    </div>
  );
}
