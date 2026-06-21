import type { SignificantMoveEvent } from "../types/news";

const currFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function dateFmt(dateStr: string): string {
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

export default function EventCorrelation({ events, loading, error, thresholdPct, timeRange }: Props) {
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-navy-700 bg-navy-750 overflow-hidden">
            <div className="px-4 py-3 bg-navy-700 flex gap-3">
              <div className="h-6 w-16 bg-navy-600 rounded-full" />
              <div className="h-6 w-32 bg-navy-600 rounded" />
            </div>
            <div className="px-4 py-3 space-y-2">
              <div className="h-3 bg-navy-700 rounded w-full" />
              <div className="h-3 bg-navy-700 rounded w-4/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-pink-400 py-6 text-center">{error}</p>;
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-10 text-center">
        No single-day moves exceeding {thresholdPct}% found in the {timeRange} range.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600">
        Top {events.length} move{events.length !== 1 ? "s" : ""} with |daily change| ≥{" "}
        {thresholdPct}% over the {timeRange} range, ranked by magnitude. Headlines from ±1–2 days around each event.
      </p>

      {events.map((ev, i) => {
        const isUp = ev.direction === "up";
        return (
          <div key={i} className="rounded-xl border border-navy-700 bg-navy-750 overflow-hidden">
            {/* Move header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-navy-800 border-b border-navy-700">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tabular-nums ${
                  isUp
                    ? "bg-mint/10 text-mint border border-mint/20"
                    : "bg-pink-400/10 text-pink-400 border border-pink-400/20"
                }`}
              >
                {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{ev.percent_change.toFixed(2)}%
              </span>
              <span className="text-sm font-medium text-slate-300">{dateFmt(ev.date)}</span>
              <span className="text-xs text-slate-600 ml-auto tabular-nums">
                Close: {currFmt.format(ev.close_price)}
              </span>
            </div>

            {/* Headlines */}
            <div className="px-4 py-3">
              {!ev.news_available ? (
                <p className="text-xs text-amber-500/70 italic leading-relaxed">
                  {ev.news_unavailable_reason ??
                    "Historical news is not available for this period on the current data plan."}
                </p>
              ) : ev.headlines.length === 0 ? (
                <p className="text-xs text-slate-600 italic">
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
                        className="text-xs font-medium text-slate-400 hover:text-mint leading-snug transition-colors duration-150"
                      >
                        {h.title}
                      </a>
                      <span className="text-xs text-slate-600">
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
