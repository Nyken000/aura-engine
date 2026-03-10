-- Migration: 12_revoke_anon_inserts
-- Description: Revokes the temporary anon insert access after ingestion is complete to secure the DB again.

drop policy if exists "Enable insert access for all users temporarily" on public.dnd_knowledge;
