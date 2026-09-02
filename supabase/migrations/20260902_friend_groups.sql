begin;

create table if not exists public.friend_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_groups_name_check check (
    char_length(btrim(name)) between 1 and 40
  ),
  constraint friend_groups_id_owner_key unique (id, owner_id)
);

create unique index if not exists friend_groups_owner_name_unique
  on public.friend_groups (owner_id, lower(btrim(name)));

create index if not exists friend_groups_owner_created_idx
  on public.friend_groups (owner_id, created_at);

create table if not exists public.friend_group_members (
  group_id uuid not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friend_group_members_pkey primary key (group_id, friend_id),
  constraint friend_group_members_group_owner_fkey
    foreign key (group_id, owner_id)
    references public.friend_groups(id, owner_id)
    on delete cascade,
  constraint friend_group_members_owner_friend_key unique (owner_id, friend_id),
  constraint friend_group_members_not_self_check check (owner_id <> friend_id)
);

create index if not exists friend_group_members_owner_group_idx
  on public.friend_group_members (owner_id, group_id);

alter table public.friend_groups enable row level security;
alter table public.friend_group_members enable row level security;

drop policy if exists friend_groups_select_own on public.friend_groups;
create policy friend_groups_select_own
  on public.friend_groups
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists friend_groups_insert_own on public.friend_groups;
create policy friend_groups_insert_own
  on public.friend_groups
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists friend_groups_update_own on public.friend_groups;
create policy friend_groups_update_own
  on public.friend_groups
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists friend_groups_delete_own on public.friend_groups;
create policy friend_groups_delete_own
  on public.friend_groups
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists friend_group_members_select_own on public.friend_group_members;
create policy friend_group_members_select_own
  on public.friend_group_members
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists friend_group_members_insert_own on public.friend_group_members;
create policy friend_group_members_insert_own
  on public.friend_group_members
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.user_id = (select auth.uid()) and f.friend_id = friend_group_members.friend_id)
          or (f.friend_id = (select auth.uid()) and f.user_id = friend_group_members.friend_id)
        )
    )
  );

drop policy if exists friend_group_members_update_own on public.friend_group_members;
create policy friend_group_members_update_own
  on public.friend_group_members
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.user_id = (select auth.uid()) and f.friend_id = friend_group_members.friend_id)
          or (f.friend_id = (select auth.uid()) and f.user_id = friend_group_members.friend_id)
        )
    )
  );

drop policy if exists friend_group_members_delete_own on public.friend_group_members;
create policy friend_group_members_delete_own
  on public.friend_group_members
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

revoke all on table public.friend_groups from anon;
revoke all on table public.friend_group_members from anon;
revoke all on table public.friend_groups from authenticated;
revoke all on table public.friend_group_members from authenticated;
grant select, insert, update, delete on table public.friend_groups to authenticated;
grant select, insert, update, delete on table public.friend_group_members to authenticated;

commit;
