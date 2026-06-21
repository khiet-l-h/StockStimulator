import type { MeResponse, TokenResponse } from "../types";
import type { EventsResponse, NewsArticle } from "../types/news";
import type { RecommendationResponse } from "../types/recommendation";
import type { CompanyOverview, PriceBar, Quote, SearchResult } from "../types/stocks";
import type {
  PortfolioSnapshot,
  PositionDetail,
  TradeRequest,
  TradeResponse,
  TradesPage,
} from "../types/trades";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000";

function getToken(): string | null {
  return localStorage.getItem("access_token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Request failed" })) as { detail?: string };
    throw new Error(body.detail ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  signup(email: string, password: string): Promise<TokenResponse> {
    return request<TokenResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  login(email: string, password: string): Promise<TokenResponse> {
    return request<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  me(): Promise<MeResponse> {
    return request<MeResponse>("/api/auth/me");
  },

  logout(): Promise<void> {
    return request<void>("/api/auth/logout", { method: "POST" });
  },

  // ── Stocks ──────────────────────────────────────────────────────────────

  searchStocks(query: string): Promise<SearchResult[]> {
    return request<SearchResult[]>(`/api/stocks/search?q=${encodeURIComponent(query)}`);
  },

  getQuote(ticker: string): Promise<Quote> {
    return request<Quote>(`/api/stocks/${encodeURIComponent(ticker)}/quote`);
  },

  getHistory(ticker: string, range = "1Y"): Promise<PriceBar[]> {
    return request<PriceBar[]>(`/api/stocks/${encodeURIComponent(ticker)}/history?range=${range}`);
  },

  getOverview(ticker: string): Promise<CompanyOverview> {
    return request<CompanyOverview>(`/api/stocks/${encodeURIComponent(ticker)}/overview`);
  },

  getNews(ticker: string, limit = 20): Promise<NewsArticle[]> {
    return request<NewsArticle[]>(
      `/api/stocks/${encodeURIComponent(ticker)}/news?limit=${limit}`,
    );
  },

  getEvents(ticker: string, range = "1Y", threshold = 5): Promise<EventsResponse> {
    return request<EventsResponse>(
      `/api/stocks/${encodeURIComponent(ticker)}/events?range=${range}&threshold=${threshold}`,
    );
  },

  getRecommendation(ticker: string, refresh = false): Promise<RecommendationResponse> {
    const qs = refresh ? "?refresh=true" : "";
    return request<RecommendationResponse>(
      `/api/stocks/${encodeURIComponent(ticker)}/recommendation${qs}`,
    );
  },

  // ── Trades ──────────────────────────────────────────────────────────────

  executeTrade(body: TradeRequest): Promise<TradeResponse> {
    return request<TradeResponse>("/api/trades", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  getTrades(page = 1, limit = 20): Promise<TradesPage> {
    return request<TradesPage>(`/api/trades?page=${page}&limit=${limit}`);
  },

  // ── Portfolio ────────────────────────────────────────────────────────────

  getPortfolio(): Promise<PortfolioSnapshot> {
    return request<PortfolioSnapshot>("/api/portfolio");
  },

  getPosition(ticker: string): Promise<PositionDetail | null> {
    return request<PositionDetail | null>(
      `/api/portfolio/positions/${encodeURIComponent(ticker)}`,
    );
  },
};
