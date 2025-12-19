export type JournalEntry = {
  id: string;
  trade_id: string;
  strategy: string | null;
  emotion: string | null;
  notes: string | null;
  entry_rationale: string | null;
  exit_rationale: string | null;
  created_at: string;
  updated_at: string | null;
};


