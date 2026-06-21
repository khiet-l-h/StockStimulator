import type { NewsArticle } from "../types/news";

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return new Date(isoStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface Props {
  articles: NewsArticle[];
  loading: boolean;
  error: string | null;
}

export default function NewsSection({ articles, loading, error }: Props) {
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-xl border border-navy-700 bg-navy-750">
            <div className="h-4 bg-navy-600 rounded w-4/5 mb-2.5" />
            <div className="h-3 bg-navy-600 rounded w-full mb-1.5" />
            <div className="h-3 bg-navy-600 rounded w-3/5 mb-3" />
            <div className="h-3 bg-navy-700 rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-pink-400 py-6 text-center">{error}</p>;
  }

  if (articles.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-10 text-center">
        No recent news available for this ticker.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {articles.map((article, i) => (
        <a
          key={i}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-4 rounded-xl border border-navy-700 bg-navy-750 hover:border-mint/30 hover:bg-navy-700 transition-all duration-200 group"
        >
          <p className="text-sm font-medium text-slate-200 group-hover:text-mint leading-snug mb-1.5 transition-colors duration-200">
            {article.title}
          </p>
          {article.description && (
            <p className="text-xs text-slate-500 leading-relaxed mb-2.5 line-clamp-2">
              {article.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-medium text-slate-500">{article.source}</span>
            <span>·</span>
            <span>{relativeTime(article.published_at)}</span>
            <svg className="w-3 h-3 ml-auto text-slate-700 group-hover:text-mint/60 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        </a>
      ))}
    </div>
  );
}
