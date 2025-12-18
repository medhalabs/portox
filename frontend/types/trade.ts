export type TradeSide = "BUY" | "SELL";

export type Trade = {
  id: string;
  user_id: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  price: number;
  trade_time: string;
  fees: number;
};


