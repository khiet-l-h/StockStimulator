/** All Decimal fields from the backend are serialised as strings in JSON. */

export interface TradeHistoryItem {
  id: string;
  ticker: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: string;
  total_value: string;
  executed_at: string;
  realized_pnl: string | null;
}

export interface TradeResponse extends TradeHistoryItem {
  cash_balance: string; // updated balance after this trade
}

export interface TradesPage {
  items: TradeHistoryItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PositionDetail {
  ticker: string;
  quantity: number;
  average_cost: string;
}

export interface PositionSnapshot {
  ticker: string;
  quantity: number;
  average_cost: string;
  current_price: string;
  market_value: string;
  unrealized_pnl: string;
  unrealized_pnl_pct: string;
}

export interface PortfolioSnapshot {
  cash_balance: string;
  positions: PositionSnapshot[];
  total_positions_value: string;
  total_portfolio_value: string;
  total_return: string;
  total_return_pct: string;
}

export interface TradeRequest {
  ticker: string;
  side: "BUY" | "SELL";
  quantity: number;
}
