export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  published_at: string; // ISO datetime string
  description: string | null;
}

export interface SignificantMoveEvent {
  date: string;               // YYYY-MM-DD
  percent_change: number;
  direction: "up" | "down";
  close_price: number;
  news_available: boolean;
  news_unavailable_reason: string | null;
  headlines: NewsArticle[];
}

export interface EventsResponse {
  ticker: string;
  time_range: string;
  threshold_pct: number;
  events: SignificantMoveEvent[];
}
