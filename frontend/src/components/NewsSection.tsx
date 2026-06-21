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
          <div key={i} className="p-4 rounded-xl border border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-4/5 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-full mb-1" />
            <div className="h-3 bg-gray-200 rounded w-3/5 mb-3" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 py-6 text-center">{error}</p>
    );
  }

  if (articles.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-10 text-center">
        No recent news available for this ticker.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {articles.map((article, i) => (
        <a
          key={i}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition-colors group"
        >
          <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 leading-snug mb-1">
            {article.title}
          </p>
          {article.description && (
            <p className="text-xs text-gray-500 leading-relaxed mb-2 line-clamp-2">
              {article.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="font-medium text-gray-500">{article.source}</span>
            <span>·</span>
            <span>{relativeTime(article.published_at)}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
