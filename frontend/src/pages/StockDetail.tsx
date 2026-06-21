import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EventCorrelation from "../components/EventCorrelation";
import Layout from "../components/Layout";
import NewsSection from "../components/NewsSection";
import PriceChart from "../components/PriceChart";
import RecommendationPanel from "../components/RecommendationPanel";
import TradeTicket from "../components/TradeTicket";
import { api } from "../lib/api";
import type { EventsResponse, NewsArticle } from "../types/news";
import type { RecommendationResponse } from "../types/recommendation";
import type { CompanyOverview, PriceBar, Quote } from "../types/stocks";

const RANGES = ["1M", "6M", "1Y", "5Y"] as const;
type Range = (typeof RANGES)[number];
type Tab = "overview" | "news" | "events" | "ai";

const currFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const mcapFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});
const volFmt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export default function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const symbol = ticker?.toUpperCase() ?? "";

  // ── Stock data ────────────────────────────────────────────────────────────
  const [quote, setQuote] = useState<Quote | null>(null);
  const [overview, setOverview] = useState<CompanyOverview | null>(null);
  const [bars, setBars] = useState<PriceBar[]>([]);
  const [range, setRange] = useState<Range>("1Y");
  const [loadingHeader, setLoadingHeader] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // ── News state ────────────────────────────────────────────────────────────
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  // ── Events state ──────────────────────────────────────────────────────────
  const [eventsData, setEventsData] = useState<EventsResponse | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  // ── AI Recommendation state ───────────────────────────────────────────────
  const [recData, setRecData] = useState<RecommendationResponse | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  // Reset tab-specific data when ticker changes
  useEffect(() => {
    setActiveTab("overview");
    setNewsArticles([]);
    setNewsError(null);
    setEventsData(null);
    setEventsError(null);
    setRecData(null);
    setRecError(null);
  }, [symbol]);

  // Fetch quote + overview on mount / ticker change
  useEffect(() => {
    if (!symbol) return;
    setLoadingHeader(true);
    setError(null);
    setQuote(null);
    setOverview(null);

    Promise.all([api.getQuote(symbol), api.getOverview(symbol)])
      .then(([q, ov]) => {
        setQuote(q);
        setOverview(ov);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load stock data.");
      })
      .finally(() => setLoadingHeader(false));
  }, [symbol]);

  // Fetch price history (re-runs on range change)
  const fetchHistory = useCallback(
    async (r: Range) => {
      if (!symbol) return;
      setLoadingChart(true);
      try {
        setBars(await api.getHistory(symbol, r));
      } catch {
        setBars([]);
      } finally {
        setLoadingChart(false);
      }
    },
    [symbol],
  );

  useEffect(() => {
    void fetchHistory(range);
  }, [fetchHistory, range]);

  // Fetch news lazily when the News tab is first activated
  useEffect(() => {
    if (activeTab !== "news" || !symbol) return;
    let cancelled = false;
    setNewsLoading(true);
    setNewsError(null);
    api
      .getNews(symbol)
      .then((articles) => { if (!cancelled) setNewsArticles(articles); })
      .catch((err: unknown) => {
        if (!cancelled) setNewsError(err instanceof Error ? err.message : "Failed to load news");
      })
      .finally(() => { if (!cancelled) setNewsLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, symbol]);

  // Fetch events when Events tab is active; re-fetches if range changes while on the tab
  useEffect(() => {
    if (activeTab !== "events" || !symbol) return;
    let cancelled = false;
    setEventsLoading(true);
    setEventsError(null);
    api
      .getEvents(symbol, range)
      .then((data) => { if (!cancelled) setEventsData(data); })
      .catch((err: unknown) => {
        if (!cancelled) {
          setEventsError(err instanceof Error ? err.message : "Failed to load events");
          setEventsData(null);
        }
      })
      .finally(() => { if (!cancelled) setEventsLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, symbol, range]);

  // Fetch AI recommendation lazily when the AI Analysis tab is first activated
  useEffect(() => {
    if (activeTab !== "ai" || !symbol) return;
    let cancelled = false;
    setRecLoading(true);
    setRecError(null);
    api
      .getRecommendation(symbol)
      .then((data) => { if (!cancelled) setRecData(data); })
      .catch((err: unknown) => {
        if (!cancelled) {
          setRecError(err instanceof Error ? err.message : "Failed to generate recommendation");
          setRecData(null);
        }
      })
      .finally(() => { if (!cancelled) setRecLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, symbol]);

  // Force-refresh the recommendation (bypasses cache)
  function handleRecRefresh() {
    if (!symbol) return;
    setRecData(null);
    setRecError(null);
    setRecLoading(true);
    api
      .getRecommendation(symbol, true)
      .then(setRecData)
      .catch((err: unknown) => {
        setRecError(err instanceof Error ? err.message : "Failed to generate recommendation");
      })
      .finally(() => setRecLoading(false));
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <p className="text-red-600 font-medium text-lg">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            ← Back to dashboard
          </button>
        </div>
      </Layout>
    );
  }

  const price = quote ? parseFloat(quote.price) : 0;
  const change = quote ? parseFloat(quote.change) : 0;
  const changePct = quote ? parseFloat(quote.change_pct) : 0;
  const isPositive = changePct >= 0;

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "news", label: "News" },
    { id: "events", label: "Significant Moves" },
    { id: "ai", label: "AI Analysis" },
  ];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* ── Header ──────────────────────────────────────────────── */}
        {loadingHeader ? (
          <div className="animate-pulse space-y-3">
            <div className="h-9 bg-gray-200 rounded w-36" />
            <div className="h-5 bg-gray-200 rounded w-56" />
            <div className="h-10 bg-gray-200 rounded w-44" />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{symbol}</h1>
              {overview && (
                <>
                  <p className="text-gray-600 mt-0.5">{overview.name}</p>
                  {overview.sector && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {overview.sector}
                      {overview.industry ? ` · ${overview.industry}` : ""}
                    </p>
                  )}
                </>
              )}
            </div>

            {quote && (
              <div className="sm:text-right shrink-0">
                <p className="text-3xl font-bold text-gray-900">{currFmt.format(price)}</p>
                <span
                  className={`inline-flex items-center gap-1 mt-1 px-2.5 py-1 rounded-full text-sm font-medium ${
                    isPositive ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {change.toFixed(2)} ({isPositive ? "+" : ""}
                  {changePct.toFixed(2)}%)
                </span>
                <p className="text-xs text-gray-400 mt-1.5">{quote.latest_trading_day}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Chart + Trade Ticket ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-700">Price History</h2>
              <div className="flex gap-1">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      range === r ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {loadingChart ? (
              <div className="h-[300px] flex items-center justify-center">
                <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin block" />
              </div>
            ) : (
              <PriceChart bars={bars} range={range} />
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Place Order</h2>
            {loadingHeader ? (
              <div className="animate-pulse space-y-3">
                <div className="h-10 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            ) : (
              <TradeTicket ticker={symbol} currentPrice={quote?.price ?? null} />
            )}
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────── */}
        <div>
          <div className="flex border-b border-gray-200 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {!loadingHeader && (quote || overview) && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">Key Statistics</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Volume" value={quote ? volFmt.format(quote.volume) : "—"} />
                    <StatCard
                      label="52W High"
                      value={
                        overview?.week_52_high
                          ? currFmt.format(parseFloat(overview.week_52_high))
                          : "—"
                      }
                    />
                    <StatCard
                      label="52W Low"
                      value={
                        overview?.week_52_low
                          ? currFmt.format(parseFloat(overview.week_52_low))
                          : "—"
                      }
                    />
                    <StatCard
                      label="Market Cap"
                      value={overview?.market_cap ? mcapFmt.format(overview.market_cap) : "—"}
                    />
                  </div>
                </div>
              )}
              {overview?.description && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">About</h2>
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                    {overview.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* News */}
          {activeTab === "news" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent News</h2>
              <NewsSection articles={newsArticles} loading={newsLoading} error={newsError} />
            </div>
          )}

          {/* Events */}
          {activeTab === "events" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Significant Price Moves
              </h2>
              <EventCorrelation
                events={eventsData?.events ?? []}
                loading={eventsLoading}
                error={eventsError}
                thresholdPct={eventsData?.threshold_pct ?? 5}
                timeRange={range}
              />
            </div>
          )}

          {/* AI Analysis */}
          {activeTab === "ai" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">AI Analysis</h2>
              <RecommendationPanel
                data={recData}
                loading={recLoading}
                error={recError}
                onRefresh={handleRecRefresh}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
