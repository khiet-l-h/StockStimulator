import type { SignificantMoveEvent } from "../types/news";

const currFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function dateFmt(dateStr: string): string {
  // Parse as local noon to avoid timezone-shift issues with Date(dateStr)
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

interface Props {
  events: SignificantMoveEvent[];
  loading: boolean;
  error: string | null;
  thresholdPct: number;
  timeRange: string;
}

export default function EventCorrelation({
  events,
  loading,
  error,
  thresholdPct,
  timeRange,
}: Props) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 flex gap-3">
              <div className="h-6 w-16 bg-gray-200 rounded-full" />
              <div className="h-6 w-32 bg-gray-200 rounded" />
            </div>
            <div className="px-4 py-3 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-4/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600 py-6 text-center">{error}</p>;
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-10 text-center">
        No single-day moves exceeding {thresholdPct}% found in the {timeRange} range.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">
        Top {events.length} move{events.length !== 1 ? "s" : ""} with |daily change| ≥{" "}
        {thresholdPct}% over the {timeRange} range, ranked by magnitude. News headlines are
        from ±1–2 days around each event date.
      </p>

      {events.map((ev, i) => {
        const isUp = ev.direction === "up";
        return (
          <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
            {/* ── Move header ─────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tabular-nums ${
                  isUp
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isUp ? "+" : ""}
                {ev.percent_change.toFixed(2)}%
              </span>
              <span className="text-sm font-medium text-gray-800">{dateFmt(ev.date)}</span>
              <span className="text-xs text-gray-400 ml-auto">
                Close: {currFmt.format(ev.close_price)}
              </span>
            </div>

            {/* ── Headlines or unavailable notice ─────────── */}
            <div className="px-4 py-3">
              {!ev.news_available ? (
                <p className="text-xs text-amber-600 italic leading-relaxed">
                  {ev.news_unavailable_reason ??
                    "Historical news is not available for this period on the current data plan."}
                </p>
              ) : ev.headlines.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  No headlines found around this date.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {ev.headlines.map((h, j) => (
                    <li key={j} className="flex flex-col gap-0.5">
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-gray-800 hover:text-blue-600 leading-snug"
                      >
                        {h.title}
                      </a>
                      <span className="text-xs text-gray-400">
                        {h.source} · {relativeTime(h.published_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
