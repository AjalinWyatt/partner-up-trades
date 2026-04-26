ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS hidden_from_journal boolean NOT NULL DEFAULT false;