/** Decimal fields from the backend serialise as strings in JSON. */
export interface Quote {
  ticker: string;
  price: string;
  change: string;
  change_pct: string;
  volume: number;
  latest_trading_day: string;
}

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CompanyOverview {
  ticker: string;
  name: string;
  market_cap: number | null;
  week_52_high: string | null;
  week_52_low: string | null;
  description: string | null;
  sector: string | null;
  industry: string | null;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
}
