export type DailyPnlPoint = { date: string; pnl: number };
export type WeeklyPnlPoint = { week: string; pnl: number };
export type EquityPoint = { date: string; equity: number };

export type BreakdownRow = {
  key: string;
  pnl: number;
  matches: number;
  win_rate: number;
};

export type PerformanceResponse = {
  series: {
    daily_realized_pnl: DailyPnlPoint[];
    weekly_realized_pnl: WeeklyPnlPoint[];
    equity_curve: EquityPoint[];
  };
  stats: {
    best_day: { date: string; pnl: number } | null;
    worst_day: { date: string; pnl: number } | null;
    max_win_streak: number;
    max_loss_streak: number;
  };
  breakdowns: {
    by_symbol: BreakdownRow[];
    by_strategy: BreakdownRow[];
    by_emotion: BreakdownRow[];
  };
  notes?: Record<string, unknown>;
};


