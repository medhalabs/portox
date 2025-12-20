CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR NOT NULL,
  side VARCHAR NOT NULL,       -- BUY / SELL
  quantity INTEGER NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  trade_time TIMESTAMP NOT NULL,
  fees DOUBLE PRECISION DEFAULT 0
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY,
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  strategy VARCHAR,
  emotion VARCHAR,
  notes TEXT,
  entry_rationale TEXT,
  exit_rationale TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journal attachments (images, voice notes, etc.)
CREATE TABLE IF NOT EXISTS journal_attachments (
  id UUID PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  file_type VARCHAR NOT NULL,  -- 'image', 'audio', 'document'
  file_path VARCHAR NOT NULL,
  file_name VARCHAR NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Persistent broker connections (encrypted tokens stored server-side).
-- NOTE: This is an additional table beyond the MVP "exact tables" to enable sellable broker sync.
CREATE TABLE IF NOT EXISTS broker_connections (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker VARCHAR NOT NULL,
  encrypted_blob TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, broker)
);

-- Notification preferences for users
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  daily_summary_enabled BOOLEAN DEFAULT false,
  daily_summary_time TIME DEFAULT '20:00:00',
  journal_reminder_enabled BOOLEAN DEFAULT false,
  journal_reminder_hours INTEGER DEFAULT 24,  -- Remind if trade not journaled within N hours
  milestone_alerts_enabled BOOLEAN DEFAULT false,
  milestone_thresholds JSONB,  -- e.g., {"total_pnl": [1000, 5000, 10000], "win_streak": [5, 10]}
  position_alerts_enabled BOOLEAN DEFAULT false,
  unrealized_pnl_threshold DOUBLE PRECISION DEFAULT 0,  -- Alert if unrealized P&L exceeds this (absolute value)
  email_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,  -- 'milestone', 'position_alert', 'journal_reminder', 'info'
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  metadata JSONB,  -- Additional data like symbol, threshold, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_trade_time ON trades(trade_time);
CREATE INDEX IF NOT EXISTS idx_journal_entries_trade_id ON journal_entries(trade_id);
CREATE INDEX IF NOT EXISTS idx_journal_attachments_journal_entry_id ON journal_attachments(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_broker_connections_user_id ON broker_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);


