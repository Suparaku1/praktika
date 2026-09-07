
alter table public.contracts
  add column if not exists student_signature_image text,
  add column if not exists business_signature_image text;

-- Contract-documents storage policies
create policy "Contract parties view contract docs"
on storage.objects for select to authenticated
using (
  bucket_id = 'contract-documents' and
  exists (
    select 1 from public.contracts c
    where c.id::text = (storage.foldername(name))[1]
      and (c.business_id = auth.uid() or c.student_id = auth.uid())
  )
);

create policy "Contract parties upload contract docs"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'contract-documents' and
  exists (
    select 1 from public.contracts c
    where c.id::text = (storage.foldername(name))[1]
      and (c.business_id = auth.uid() or c.student_id = auth.uid())
  )
);

create policy "Contract parties delete contract docs"
on storage.objects for delete to authenticated
using (
  bucket_id = 'contract-documents' and
  exists (
    select 1 from public.contracts c
    where c.id::text = (storage.foldername(name))[1]
      and (c.business_id = auth.uid() or c.student_id = auth.uid())
  )
);

-- Avatars & logos: owner-scoped (path prefix = user id)
create policy "Avatars owner select"
on storage.objects for select to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Avatars owner insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Avatars owner update"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Avatars owner delete"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Logos owner select"
on storage.objects for select to authenticated
using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Logos owner insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Logos owner update"
on storage.objects for update to authenticated
using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Logos owner delete"
on storage.objects for delete to authenticated
using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- CRM tables
create type public.crm_lead_status as enum ('new','contacted','qualified','proposal','won','lost');

create table public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  company text,
  source text,
  status public.crm_lead_status not null default 'new',
  value numeric,
  next_action_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.crm_leads to authenticated;
grant all on public.crm_leads to service_role;
alter table public.crm_leads enable row level security;

create policy "Owners view their leads" on public.crm_leads
  for select to authenticated using (owner_id = auth.uid());
create policy "Owners insert their leads" on public.crm_leads
  for insert to authenticated with check (owner_id = auth.uid());
create policy "Owners update their leads" on public.crm_leads
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners delete their leads" on public.crm_leads
  for delete to authenticated using (owner_id = auth.uid());

create trigger crm_leads_updated_at before update on public.crm_leads
  for each row execute function public.update_updated_at();

create table public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.crm_notes to authenticated;
grant all on public.crm_notes to service_role;
alter table public.crm_notes enable row level security;

create policy "Lead owner reads notes" on public.crm_notes
  for select to authenticated using (
    exists (select 1 from public.crm_leads l where l.id = lead_id and l.owner_id = auth.uid())
  );
create policy "Lead owner writes notes" on public.crm_notes
  for insert to authenticated with check (
    author_id = auth.uid() and
    exists (select 1 from public.crm_leads l where l.id = lead_id and l.owner_id = auth.uid())
  );
create policy "Author deletes own notes" on public.crm_notes
  for delete to authenticated using (author_id = auth.uid());

create table public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.crm_tasks to authenticated;
grant all on public.crm_tasks to service_role;
alter table public.crm_tasks enable row level security;

create policy "Lead owner reads tasks" on public.crm_tasks
  for select to authenticated using (
    exists (select 1 from public.crm_leads l where l.id = lead_id and l.owner_id = auth.uid())
  );
create policy "Lead owner writes tasks" on public.crm_tasks
  for insert to authenticated with check (
    exists (select 1 from public.crm_leads l where l.id = lead_id and l.owner_id = auth.uid())
  );
create policy "Lead owner updates tasks" on public.crm_tasks
  for update to authenticated using (
    exists (select 1 from public.crm_leads l where l.id = lead_id and l.owner_id = auth.uid())
  );
create policy "Lead owner deletes tasks" on public.crm_tasks
  for delete to authenticated using (
    exists (select 1 from public.crm_leads l where l.id = lead_id and l.owner_id = auth.uid())
  );
