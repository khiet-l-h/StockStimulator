import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../lib/api";
import type { TradesPage } from "../types/trades";

const currFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function dateFmt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
    api
      .getTrades(page, LIMIT)
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load trade history");
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Trade History</h2>
            <p className="text-gray-500 mt-1 text-sm">All paper trades, newest first</p>
          </div>
          <Link
            to="/dashboard"
            className="ml-auto text-sm text-blue-600 hover:underline font-medium"
          >
            ← Portfolio
          </Link>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-50 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex gap-6">
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-4 bg-gray-200 rounded w-16 ml-8" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                  <div className="h-4 bg-gray-200 rounded w-20 ml-auto" />
                </div>
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-500 font-medium">No trades yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Search for a stock and place your first paper trade.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-50">
                      <th className="text-left px-6 py-3">Date</th>
                      <th className="text-left px-4 py-3">Ticker</th>
                      <th className="text-left px-4 py-3">Side</th>
                      <th className="text-right px-4 py-3">Qty</th>
                      <th className="text-right px-4 py-3">Price</th>
                      <th className="text-right px-4 py-3">Total</th>
                      <th className="text-right px-6 py-3">Realized P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.items.map((t) => {
                      const isBuy = t.side === "BUY";
                      const pnl = t.realized_pnl ? parseFloat(t.realized_pnl) : null;
                      return (
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                            {dateFmt(t.executed_at)}
                          </td>
                          <td className="px-4 py-4">
                            <Link
                              to={`/stocks/${t.ticker}`}
                              className="font-semibold text-blue-600 hover:underline"
                            >
                              {t.ticker}
                            </Link>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                isBuy
                                  ? "bg-green-50 text-green-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {t.side}
                            </span>
                          </td>
                          <td className="text-right px-4 py-4 text-gray-700">{t.quantity}</td>
                          <td className="text-right px-4 py-4 text-gray-700">
                            {currFmt.format(parseFloat(t.price))}
                          </td>
                          <td className="text-right px-4 py-4 font-medium text-gray-900">
                            {currFmt.format(parseFloat(t.total_value))}
                          </td>
                          <td className="text-right px-6 py-4">
                            {pnl !== null ? (
                              <span
                                className={`font-medium ${pnl >= 0 ? "text-green-600" : "text-red-600"}`}
                              >
                                {pnl >= 0 ? "+" : ""}
                                {currFmt.format(pnl)}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
                  <p className="text-xs text-gray-500">
                    {data.total} trade{data.total !== 1 ? "s" : ""} · page {page} of {data.pages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:text-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                      disabled={page === data.pages}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:text-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Next
                    </button>
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
