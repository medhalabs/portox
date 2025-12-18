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

-- Persistent broker connections (encrypted tokens stored server-side).
-- NOTE: This is an additional table beyond the MVP "exact tables" to enable sellable broker sync.
CREATE TABLE IF NOT EXISTS broker_connections (
  id UUID,
  user_id UUID,
  broker VARCHAR,
  encrypted_blob TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);


