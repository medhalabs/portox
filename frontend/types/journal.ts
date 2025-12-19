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

export type JournalAttachment = {
  id: string;
  journal_entry_id: string;
  file_type: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
};


