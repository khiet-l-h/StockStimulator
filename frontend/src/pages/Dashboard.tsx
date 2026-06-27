import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type { PortfolioSnapshot } from "../types/trades";

const currFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function MetricCard({ label, value, sub, positive, accent }: {
  label: string; value: string; sub?: string; positive?: boolean; accent?: "mint" | "violet" | "cyan";
}) {
  const accentBorder = { mint: "border-t-mint", violet: "border-t-violet-400", cyan: "border-t-cyan-400" }[accent ?? "mint"];
  const subColor = positive === true ? "text-mint" : positive === false ? "text-pink-500 dark:text-pink-400" : "text-slate-500";
  return (
    <div className={`glass-card border-t-2 ${accentBorder} p-6 shadow-dark-sm`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      {sub !== undefined && <p className={`text-sm font-medium mt-2 ${subColor}`}>{sub}</p>}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="px-6 py-4 animate-pulse flex gap-4 border-b border-slate-100 dark:border-navy-700">
      {[16, 10, 24, 24, 24, 28].map((w, i) => (
        <div key={i} className={`h-4 bg-slate-200 dark:bg-navy-700 rounded w-${w} ${i === 4 ? "ml-auto" : ""}`} />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPortfolio()
      .then(setSnapshot)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load portfolio"))
      .finally(() => setLoading(false));
  }, []);

  const totalReturn = snapshot ? parseFloat(snapshot.total_return) : 0;
  const totalReturnPct = snapshot ? parseFloat(snapshot.total_return_pct) : 0;
  const isPositive = totalReturn >= 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        <div className="mb-8">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Portfolio</p>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Welcome back,{" "}
            <span className="text-mint">
              {user?.email?.split("@")[0]}
            </span>
          </h2>
          <p className="text-slate-500 mt-1 text-sm">Your paper trading portfolio · no real money involved</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-pink-400/10 border border-pink-400/20 text-pink-500 dark:text-pink-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-pulse">
            {[0, 1, 2].map((i) => <div key={i} className="h-32 bg-slate-100 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-2xl" />)}
          </div>
        ) : snapshot ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <MetricCard label="Total Portfolio Value"
              value={currFmt.format(parseFloat(snapshot.total_portfolio_value))}
              sub={`${isPositive ? "+" : ""}${currFmt.format(totalReturn)} (${isPositive ? "+" : ""}${totalReturnPct.toFixed(2)}%) vs start`}
              positive={isPositive || undefined} accent="mint" />
            <MetricCard label="Cash Available"
              value={currFmt.format(parseFloat(snapshot.cash_balance))}
              sub="Simulated funds" accent="cyan" />
            <MetricCard label="Invested"
              value={currFmt.format(parseFloat(snapshot.total_positions_value))}
              sub={`${snapshot.positions.length} position${snapshot.positions.length !== 1 ? "s" : ""}`}
              accent="violet" />
          </div>
        ) : null}

        <div className="glass-card shadow-dark overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-navy-700">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Holdings</h3>
            <Link to="/history" className="text-sm text-mint hover:text-mint-400 font-medium transition-colors flex items-center gap-1">
              Trade history
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-navy-700">
              {[0, 1, 2].map((i) => <SkeletonRow key={i} />)}
            </div>
          ) : !snapshot || snapshot.positions.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-navy-750 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">No positions yet</p>
              <p className="text-slate-500 text-sm mt-1">Search for a stock above and place your first paper trade.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-navy-700">
                    <th className="text-left px-6 py-3">Ticker</th>
                    <th className="text-right px-4 py-3">Qty</th>
                    <th className="text-right px-4 py-3">Avg Cost</th>
                    <th className="text-right px-4 py-3">Current</th>
                    <th className="text-right px-4 py-3">Mkt Value</th>
                    <th className="text-right px-6 py-3">Unrealized P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.positions.map((pos) => {
                    const pnl = parseFloat(pos.unrealized_pnl);
                    const pnlPct = parseFloat(pos.unrealized_pnl_pct);
                    const posIsUp = pnl >= 0;
                    return (
                      <tr key={pos.ticker} className="border-b border-slate-100 dark:border-navy-750 hover:bg-slate-50 dark:hover:bg-navy-750 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <Link to={`/stocks/${pos.ticker}`} className="font-bold text-mint hover:text-mint-400 transition-colors">
                            {pos.ticker}
                          </Link>
                        </td>
                        <td className="text-right px-4 py-4 text-slate-700 dark:text-slate-300 tabular-nums">{pos.quantity}</td>
                        <td className="text-right px-4 py-4 text-slate-500 dark:text-slate-400 tabular-nums">{currFmt.format(parseFloat(pos.average_cost))}</td>
                        <td className="text-right px-4 py-4 text-slate-700 dark:text-slate-300 tabular-nums">{currFmt.format(parseFloat(pos.current_price))}</td>
                        <td className="text-right px-4 py-4 font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{currFmt.format(parseFloat(pos.market_value))}</td>
                        <td className="text-right px-6 py-4 tabular-nums">
                          <span className={`font-semibold ${posIsUp ? "text-mint" : "text-pink-500 dark:text-pink-400"}`}>
                            {posIsUp ? "+" : ""}{currFmt.format(pnl)}
                          </span>
                          <span className={`ml-1.5 text-xs ${posIsUp ? "text-mint/70" : "text-pink-400/70"}`}>
                            ({posIsUp ? "+" : ""}{pnlPct.toFixed(2)}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
