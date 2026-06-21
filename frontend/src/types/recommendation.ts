export type RecommendationEnum = "BUY" | "SELL" | "HOLD";
export type Confidence = "LOW" | "MEDIUM" | "HIGH";
export type Signal = "bullish" | "bearish" | "neutral";

export interface KeyFactor {
  factor: string;
  value: string;
  signal: Signal;
}

export interface EvidenceSummary {
  current_price: number;
  rsi_14: number | null;
  sma50: number | null;
  sma200: number | null;
  trend_1m_pct: number | null;
  trend_3m_pct: number | null;
  trend_6m_pct: number | null;
  volatility_30d: number | null;
  events_analyzed: number;
  headlines_analyzed: number;
  position_included: boolean;
  bars_available: number;
}

export interface RecommendationResponse {
  ticker: string;
  recommendation: RecommendationEnum;
  confidence: Confidence;
  rationale: string;
  key_factors: KeyFactor[];
  evidence_summary: EvidenceSummary;
  generated_at: string;  // ISO datetime
  cached: boolean;
}
