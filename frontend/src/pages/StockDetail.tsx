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
const volFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-navy-750 border border-navy-700 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-sm font-semibold text-slate-200 tabular-nums">{value}</p>
    </div>
  );
}

export default function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const symbol = ticker?.toUpperCase() ?? "";

  const [quote, setQuote] = useState<Quote | null>(null);
  const [overview, setOverview] = useState<CompanyOverview | null>(null);
  const [bars, setBars] = useState<PriceBar[]>([]);
  const [range, setRange] = useState<Range>("1Y");
  const [loadingHeader, setLoadingHeader] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  const [eventsData, setEventsData] = useState<EventsResponse | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [recData, setRecData] = useState<RecommendationResponse | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab("overview");
    setNewsArticles([]);
    setNewsError(null);
    setEventsData(null);
    setEventsError(null);
    setRecData(null);
    setRecError(null);
  }, [symbol]);

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

  useEffect(() => { void fetchHistory(range); }, [fetchHistory, range]);

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
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-pink-400 font-medium text-lg mb-4">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-mint hover:text-mint-400 transition-colors"
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────── */}
        {loadingHeader ? (
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-navy-750 rounded w-32" />
            <div className="h-5 bg-navy-750 rounded w-48" />
            <div className="h-10 bg-navy-750 rounded w-40" />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 animate-fade-in">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-100">{symbol}</h1>
              {overview && (
                <>
                  <p className="text-slate-400 mt-0.5 font-medium">{overview.name}</p>
                  {overview.sector && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="tag-violet text-xs">{overview.sector}</span>
                      {overview.industry && (
                        <span className="text-xs text-slate-600">{overview.industry}</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {quote && (
              <div className="sm:text-right shrink-0">
                <p className="text-3xl font-bold text-slate-100 tabular-nums">
                  {currFmt.format(price)}
                </p>
                <span
                  className={`inline-flex items-center gap-1 mt-1.5 px-3 py-1 rounded-full text-sm font-semibold tabular-nums ${
                    isPositive
                      ? "text-mint bg-mint/10 border border-mint/20"
                      : "text-pink-400 bg-pink-400/10 border border-pink-400/20"
                  }`}
                >
                  {isPositive ? "▲" : "▼"} {isPositive ? "+" : ""}
                  {change.toFixed(2)} ({isPositive ? "+" : ""}
                  {changePct.toFixed(2)}%)
                </span>
                <p className="text-xs text-slate-600 mt-2 tabular-nums">{quote.latest_trading_day}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Chart + Trade Ticket ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart */}
          <div className="lg:col-span-2 glass-card shadow-dark p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Price History
              </h2>
              <div className="flex gap-1 p-0.5 bg-navy-850 rounded-lg border border-navy-700">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                      range === r
                        ? "bg-mint text-navy-900 shadow-glow-mint-sm"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {loadingChart ? (
              <div className="h-[300px] flex items-center justify-center">
                <span className="w-6 h-6 border-2 border-mint/40 border-t-mint rounded-full animate-spin block" />
              </div>
            ) : (
              <PriceChart bars={bars} range={range} />
            )}
          </div>

          {/* Trade Ticket */}
          <div className="glass-card shadow-dark p-6">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-5">
              Place Order
            </h2>
            {loadingHeader ? (
              <div className="animate-pulse space-y-3">
                <div className="h-10 bg-navy-750 rounded-xl" />
                <div className="h-10 bg-navy-750 rounded-xl" />
                <div className="h-10 bg-navy-750 rounded-xl" />
              </div>
            ) : (
              <TradeTicket ticker={symbol} currentPrice={quote?.price ?? null} />
            )}
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────── */}
        <div>
          <div className="flex border-b border-navy-700 mb-6 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-mint text-mint"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab.label}
                {tab.id === "ai" && (
                  <span className="ml-1.5 text-xs bg-violet-400/20 text-violet-400 px-1.5 py-0.5 rounded-full">
                    AI
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {activeTab === "overview" && (
            <div className="space-y-5 animate-fade-in">
              {!loadingHeader && (quote || overview) && (
                <div>
                  <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">
                    Key Statistics
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Volume" value={quote ? volFmt.format(quote.volume) : "—"} />
                    <StatCard
                      label="52W High"
                      value={overview?.week_52_high ? currFmt.format(parseFloat(overview.week_52_high)) : "—"}
                    />
                    <StatCard
                      label="52W Low"
                      value={overview?.week_52_low ? currFmt.format(parseFloat(overview.week_52_low)) : "—"}
                    />
                    <StatCard
                      label="Market Cap"
                      value={overview?.market_cap ? mcapFmt.format(overview.market_cap) : "—"}
                    />
                  </div>
                </div>
              )}
              {overview?.description && (
                <div className="glass-card p-6">
                  <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">About</h2>
                  <p className="text-sm text-slate-400 leading-relaxed line-clamp-4">
                    {overview.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* News tab */}
          {activeTab === "news" && (
            <div className="glass-card p-6 animate-fade-in">
              <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-4">
                Recent News
              </h2>
              <NewsSection articles={newsArticles} loading={newsLoading} error={newsError} />
            </div>
          )}

          {/* Events tab */}
          {activeTab === "events" && (
            <div className="glass-card p-6 animate-fade-in">
              <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-4">
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

          {/* AI Analysis tab */}
          {activeTab === "ai" && (
            <div className="glass-card p-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-5">
                <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  AI Analysis
                </h2>
                <span className="tag-violet">Gemini</span>
              </div>
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
