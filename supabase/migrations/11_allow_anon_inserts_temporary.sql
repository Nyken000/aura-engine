-- Migration: 11_allow_anon_inserts_temporary
-- Description: Temporarily allows the anon key to insert into the knowlege vector table so the ingestion script can run.

-- Allow anon to insert (ONLY FOR SEEDING DATA)
create policy "Enable insert access for all users temporarily" on public.dnd_knowledge 
  for insert with check ( true ); 
