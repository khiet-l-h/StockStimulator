import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../lib/api";
import type { TradesPage } from "../types/trades";

const currFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function dateFmt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function History() {
  const [data, setData] = useState<TradesPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const LIMIT = 20;

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getTrades(page, LIMIT)
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load trade history"))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8 flex items-center gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">History</p>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Trade History</h2>
            <p className="text-slate-500 mt-1 text-sm">All paper trades, newest first</p>
          </div>
          <Link to="/dashboard" className="ml-auto text-sm font-medium text-mint hover:text-mint-400 transition-colors flex items-center gap-1.5 border border-slate-300 dark:border-navy-600 hover:border-slate-400 dark:hover:border-navy-500 px-3 py-2 rounded-lg">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Portfolio
          </Link>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-pink-400/10 border border-pink-400/20 text-pink-500 dark:text-pink-400 text-sm">{error}</div>
        )}

        <div className="glass-card shadow-dark overflow-hidden">
          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-navy-750 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex gap-6">
                  {[36, 12, 10, 8, 20, 24].map((w, j) => (
                    <div key={j} className={`h-4 bg-slate-200 dark:bg-navy-700 rounded w-${w} ${j === 4 ? "ml-auto" : ""}`} />
                  ))}
                </div>
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-navy-750 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">No trades yet</p>
              <p className="text-slate-500 text-sm mt-1">Search for a stock and place your first paper trade.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-navy-700">
                      <th className="text-left px-6 py-3">Date</th>
                      <th className="text-left px-4 py-3">Ticker</th>
                      <th className="text-left px-4 py-3">Side</th>
                      <th className="text-right px-4 py-3">Qty</th>
                      <th className="text-right px-4 py-3">Price</th>
                      <th className="text-right px-4 py-3">Total</th>
                      <th className="text-right px-6 py-3">Realized P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((t) => {
                      const isBuy = t.side === "BUY";
                      const pnl = t.realized_pnl ? parseFloat(t.realized_pnl) : null;
                      return (
                        <tr key={t.id} className="border-b border-slate-100 dark:border-navy-750 hover:bg-slate-50 dark:hover:bg-navy-750 transition-colors duration-150">
                          <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap tabular-nums">{dateFmt(t.executed_at)}</td>
                          <td className="px-4 py-4">
                            <Link to={`/stocks/${t.ticker}`} className="font-bold text-mint hover:text-mint-400 transition-colors">{t.ticker}</Link>
                          </td>
                          <td className="px-4 py-4">
                            <span className={isBuy ? "tag-mint" : "tag-pink"}>{t.side}</span>
                          </td>
                          <td className="text-right px-4 py-4 text-slate-700 dark:text-slate-300 tabular-nums">{t.quantity}</td>
                          <td className="text-right px-4 py-4 text-slate-500 dark:text-slate-400 tabular-nums">{currFmt.format(parseFloat(t.price))}</td>
                          <td className="text-right px-4 py-4 font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{currFmt.format(parseFloat(t.total_value))}</td>
                          <td className="text-right px-6 py-4 tabular-nums">
                            {pnl !== null ? (
                              <span className={`font-semibold ${pnl >= 0 ? "text-mint" : "text-pink-500 dark:text-pink-400"}`}>
                                {pnl >= 0 ? "+" : ""}{currFmt.format(pnl)}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {data.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-navy-700">
                  <p className="text-sm text-slate-500 tabular-nums">
                    {data.total} trade{data.total !== 1 ? "s" : ""} · page {page} of {data.pages}
                  </p>
                  <div className="flex gap-2">
                    {[
                      { label: "Previous", action: () => setPage(p => Math.max(1, p - 1)), disabled: page === 1 },
                      { label: "Next", action: () => setPage(p => Math.min(data.pages, p + 1)), disabled: page === data.pages },
                    ].map(({ label, action, disabled }) => (
                      <button key={label} onClick={action} disabled={disabled}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-navy-600 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-navy-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200">
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
