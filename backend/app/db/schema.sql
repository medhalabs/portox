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

-- Notification preferences for users
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID,
  user_id UUID,
  daily_summary_enabled BOOLEAN DEFAULT false,
  daily_summary_time TIME DEFAULT '20:00:00',
  journal_reminder_enabled BOOLEAN DEFAULT false,
  journal_reminder_hours INTEGER DEFAULT 24,  -- Remind if trade not journaled within N hours
  milestone_alerts_enabled BOOLEAN DEFAULT false,
  milestone_thresholds JSON,  -- e.g., {"total_pnl": [1000, 5000, 10000], "win_streak": [5, 10]}
  position_alerts_enabled BOOLEAN DEFAULT false,
  unrealized_pnl_threshold DOUBLE DEFAULT 0,  -- Alert if unrealized P&L exceeds this (absolute value)
  email_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID,
  user_id UUID,
  type VARCHAR,  -- 'milestone', 'position_alert', 'journal_reminder', 'info'
  title VARCHAR,
  message TEXT,
  read BOOLEAN DEFAULT false,
  metadata JSON,  -- Additional data like symbol, threshold, etc.
  created_at TIMESTAMP
);


