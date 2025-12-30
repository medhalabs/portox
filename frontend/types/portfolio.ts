export type OpenPosition = {
  symbol: string;
  side?: "LONG" | "SHORT";  // Optional for mutual funds
  name?: string;  // For mutual funds
  quantity: number;
  qty?: number;  // Alternative field name
  avg_cost?: number;  // For trades
  avg_price?: number;  // For mutual funds
  mark_price?: number;  // For trades
  current_price?: number;  // For mutual funds
  unrealized_pnl: number;
  type?: "trade" | "mutual_fund";  // To distinguish
};

export type PortfolioSummary = {
  realized_pnl: number;
  unrealized_pnl: number;
  total_pnl: number;
  open_positions: OpenPosition[];
  notes?: Record<string, unknown>;
};

export type AdvancedMetrics = {
  sharpe_ratio: number | null;
  sortino_ratio: number | null;
  calmar_ratio: number | null;
  profit_factor: number | null;
  expectancy: number | null;
  avg_holding_period_days: number | null;
};

export type AnalyticsOverview = {
  realized_pnl: number;
  unrealized_pnl: number;
  total_pnl?: number;
  win_rate: number;
  avg_win: number;
  avg_loss: number;
  drawdown: number;
  risk_reward_ratio: number | null;
  advanced_metrics?: AdvancedMetrics;
  time_buckets: {
    pnl_by_hour: Record<string, number>;
    pnl_by_weekday: Record<string, number>;
  };
  open_positions: OpenPosition[];
  notes?: Record<string, unknown>;
};


