CREATE TABLE IF NOT EXISTS users (
  id UUID,
  email VARCHAR,
  password_hash VARCHAR,
  created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trades (
  id UUID,
  user_id UUID,
  symbol VARCHAR,
  side VARCHAR,       -- BUY / SELL
  quantity INTEGER,
  price DOUBLE,
  trade_time TIMESTAMP,
  fees DOUBLE
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID,
  trade_id UUID,
  strategy VARCHAR,
  emotion VARCHAR,
  notes TEXT,
  created_at TIMESTAMP
);


