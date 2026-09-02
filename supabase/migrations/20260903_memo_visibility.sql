begin;

alter table public.memo_pins
  add column if not exists visibility text not null default 'public';

alter table public.memo_pins
  drop constraint if exists memo_pins_visibility_check;

alter table public.memo_pins
  add constraint memo_pins_visibility_check
  check (visibility in ('public', 'friends', 'private'));

create table if not exists public.memo_pin_viewers (
  memo_pin_id uuid not null references public.memo_pins(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint memo_pin_viewers_pkey primary key (memo_pin_id, viewer_id)
);

create index if not exists memo_pins_visibility_expiry_idx
  on public.memo_pins (visibility, expires_at desc);

create index if not exists memo_pin_viewers_viewer_idx
  on public.memo_pin_viewers (viewer_id, memo_pin_id);

alter table public.memo_pin_viewers enable row level security;

create or replace function public.can_view_memo_pin(p_memo_pin_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memo_pins mp
    where mp.id = p_memo_pin_id
      and mp.expires_at > now()
      and auth.uid() is not null
      and (
        mp.owner_id = auth.uid()
        or mp.visibility = 'public'
        or (
          mp.visibility = 'friends'
          and exists (
            select 1
            from public.memo_pin_viewers mv
            where mv.memo_pin_id = mp.id
              and mv.viewer_id = auth.uid()
          )
          and exists (
            select 1
            from public.friendships f
            where f.status = 'accepted'
              and (
                (f.user_id = mp.owner_id and f.friend_id = auth.uid())
                or (f.friend_id = mp.owner_id and f.user_id = auth.uid())
              )
          )
        )
      )
  );
$$;

revoke all on function public.can_view_memo_pin(uuid) from public;
revoke all on function public.can_view_memo_pin(uuid) from anon;
grant execute on function public.can_view_memo_pin(uuid) to authenticated;
grant execute on function public.can_view_memo_pin(uuid) to service_role;

create or replace function public.set_memo_pin_visibility(
  p_memo_pin_id uuid,
  p_visibility text,
  p_viewer_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_visibility text := lower(btrim(coalesce(p_visibility, '')));
  v_viewer_ids uuid[];
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  if v_visibility not in ('public', 'friends', 'private') then
    raise exception using errcode = 'P0001', message = 'INVALID_MEMO_VISIBILITY';
  end if;

  perform 1
  from public.memo_pins mp
  where mp.id = p_memo_pin_id
    and mp.owner_id = v_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'MEMO_PIN_NOT_FOUND_OR_NOT_OWNER';
  end if;

  select coalesce(array_agg(distinct selected.viewer_id), '{}'::uuid[])
  into v_viewer_ids
  from unnest(coalesce(p_viewer_ids, '{}'::uuid[])) as selected(viewer_id)
  where selected.viewer_id <> v_user_id;

  if v_visibility = 'friends' and cardinality(v_viewer_ids) < 1 then
    raise exception using errcode = 'P0001', message = 'MEMO_VIEWER_REQUIRED';
  end if;

  if v_visibility = 'friends' and exists (
    select 1
    from unnest(v_viewer_ids) as selected(selected_viewer_id)
    where not exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.user_id = v_user_id and f.friend_id = selected.selected_viewer_id)
          or (f.friend_id = v_user_id and f.user_id = selected.selected_viewer_id)
        )
    )
  ) then
    raise exception using errcode = 'P0001', message = 'MEMO_VIEWER_NOT_ACCEPTED_FRIEND';
  end if;

  update public.memo_pins
  set visibility = v_visibility,
      updated_at = now()
  where id = p_memo_pin_id
    and owner_id = v_user_id;

  delete from public.memo_pin_viewers
  where memo_pin_id = p_memo_pin_id;

  if v_visibility = 'friends' then
    insert into public.memo_pin_viewers (memo_pin_id, viewer_id)
    select p_memo_pin_id, selected.viewer_id
    from unnest(v_viewer_ids) as selected(viewer_id);
  end if;

  return jsonb_build_object(
    'memo_pin_id', p_memo_pin_id,
    'visibility', v_visibility,
    'viewer_ids', case when v_visibility = 'friends' then to_jsonb(v_viewer_ids) else '[]'::jsonb end
  );
end;
$$;

revoke all on function public.set_memo_pin_visibility(uuid, text, uuid[]) from public;
revoke all on function public.set_memo_pin_visibility(uuid, text, uuid[]) from anon;
grant execute on function public.set_memo_pin_visibility(uuid, text, uuid[]) to authenticated;
grant execute on function public.set_memo_pin_visibility(uuid, text, uuid[]) to service_role;

drop policy if exists travelog_memo_pins_active_select on public.memo_pins;
drop policy if exists memo_pins_visibility_select on public.memo_pins;
create policy memo_pins_visibility_select
  on public.memo_pins
  for select
  to authenticated
  using (public.can_view_memo_pin(id));

drop policy if exists memo_pin_viewers_select_participant on public.memo_pin_viewers;
create policy memo_pin_viewers_select_participant
  on public.memo_pin_viewers
  for select
  to authenticated
  using (
    viewer_id = auth.uid()
    or exists (
      select 1
      from public.memo_pins mp
      where mp.id = memo_pin_viewers.memo_pin_id
        and mp.owner_id = auth.uid()
    )
  );

drop policy if exists memo_pin_viewers_insert_owner on public.memo_pin_viewers;
create policy memo_pin_viewers_insert_owner
  on public.memo_pin_viewers
  for insert
  to authenticated
  with check (
    viewer_id <> auth.uid()
    and exists (
      select 1
      from public.memo_pins mp
      where mp.id = memo_pin_viewers.memo_pin_id
        and mp.owner_id = auth.uid()
        and mp.visibility = 'friends'
    )
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.user_id = auth.uid() and f.friend_id = memo_pin_viewers.viewer_id)
          or (f.friend_id = auth.uid() and f.user_id = memo_pin_viewers.viewer_id)
        )
    )
  );

drop policy if exists memo_pin_viewers_delete_owner on public.memo_pin_viewers;
create policy memo_pin_viewers_delete_owner
  on public.memo_pin_viewers
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.memo_pins mp
      where mp.id = memo_pin_viewers.memo_pin_id
        and mp.owner_id = auth.uid()
    )
  );

revoke all on table public.memo_pin_viewers from anon;
revoke all on table public.memo_pin_viewers from authenticated;
grant select, insert, delete on table public.memo_pin_viewers to authenticated;

drop policy if exists travelog_memo_media_owner_select_v2 on storage.objects;
drop policy if exists travelog_memo_media_select on storage.objects;
create policy travelog_memo_media_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'memo-pin-media'
    and exists (
      select 1
      from public.memo_pins mp
      where mp.media_bucket = objects.bucket_id
        and mp.media_path = objects.name
        and public.can_view_memo_pin(mp.id)
    )
  );

commit;
