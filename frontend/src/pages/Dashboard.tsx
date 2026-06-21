import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type { PortfolioSnapshot } from "../types/trades";

const currFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function MetricCard({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      {sub !== undefined && (
        <p
          className={`text-sm font-medium mt-1 ${
            positive === true
              ? "text-green-600"
              : positive === false
                ? "text-red-600"
                : "text-gray-500"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getPortfolio()
      .then(setSnapshot)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load portfolio");
      })
      .finally(() => setLoading(false));
  }, []);

  const totalReturn = snapshot ? parseFloat(snapshot.total_return) : 0;
  const totalReturnPct = snapshot ? parseFloat(snapshot.total_return_pct) : 0;
  const isPositive = totalReturn >= 0;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* ── Welcome ──────────────────────────────────────────── */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">
            Welcome back, {user?.email?.split("@")[0]}
          </h2>
          <p className="text-gray-500 mt-1 text-sm">Your paper trading portfolio</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* ── Summary Cards ────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-pulse mb-10">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
            ))}
          </div>
        ) : snapshot ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <MetricCard
              label="Total Portfolio Value"
              value={currFmt.format(parseFloat(snapshot.total_portfolio_value))}
              sub={`${isPositive ? "+" : ""}${currFmt.format(totalReturn)} (${isPositive ? "+" : ""}${totalReturnPct.toFixed(2)}%) vs start`}
              positive={isPositive || undefined}
            />
            <MetricCard
              label="Cash Available"
              value={currFmt.format(parseFloat(snapshot.cash_balance))}
              sub="Simulated funds"
            />
            <MetricCard
              label="Invested"
              value={currFmt.format(parseFloat(snapshot.total_positions_value))}
              sub={`${snapshot.positions.length} position${snapshot.positions.length !== 1 ? "s" : ""}`}
            />
          </div>
        ) : null}

        {/* ── Holdings Table ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-800">Holdings</h3>
            <Link
              to="/history"
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Trade history →
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-gray-50">
              {[0, 1, 2].map((i) => (
                <div key={i} className="px-6 py-4 animate-pulse flex gap-4">
                  <div className="h-5 bg-gray-200 rounded w-16" />
                  <div className="h-5 bg-gray-200 rounded w-24 ml-auto" />
                  <div className="h-5 bg-gray-200 rounded w-24" />
                </div>
              ))}
            </div>
          ) : !snapshot || snapshot.positions.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-500 font-medium">No positions yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Search for a stock above and place your first paper trade.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-50">
                    <th className="text-left px-6 py-3">Ticker</th>
                    <th className="text-right px-4 py-3">Qty</th>
                    <th className="text-right px-4 py-3">Avg Cost</th>
                    <th className="text-right px-4 py-3">Current</th>
                    <th className="text-right px-4 py-3">Mkt Value</th>
                    <th className="text-right px-6 py-3">Unrealized P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {snapshot.positions.map((pos) => {
                    const pnl = parseFloat(pos.unrealized_pnl);
                    const pnlPct = parseFloat(pos.unrealized_pnl_pct);
                    const posIsUp = pnl >= 0;
                    return (
                      <tr key={pos.ticker} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <Link
                            to={`/stocks/${pos.ticker}`}
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            {pos.ticker}
                          </Link>
                        </td>
                        <td className="text-right px-4 py-4 text-gray-700">{pos.quantity}</td>
                        <td className="text-right px-4 py-4 text-gray-700">
                          {currFmt.format(parseFloat(pos.average_cost))}
                        </td>
                        <td className="text-right px-4 py-4 text-gray-700">
                          {currFmt.format(parseFloat(pos.current_price))}
                        </td>
                        <td className="text-right px-4 py-4 font-medium text-gray-900">
                          {currFmt.format(parseFloat(pos.market_value))}
                        </td>
                        <td className="text-right px-6 py-4">
                          <span
                            className={`font-medium ${posIsUp ? "text-green-600" : "text-red-600"}`}
                          >
                            {posIsUp ? "+" : ""}
                            {currFmt.format(pnl)}
                          </span>
                          <span
                            className={`ml-1.5 text-xs ${posIsUp ? "text-green-500" : "text-red-500"}`}
                          >
                            ({posIsUp ? "+" : ""}
                            {pnlPct.toFixed(2)}%)
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
