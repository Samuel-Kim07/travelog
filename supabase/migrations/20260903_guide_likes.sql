begin;

create table if not exists public.guide_likes (
  guide_id uuid not null references public.guides(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint guide_likes_pkey primary key (guide_id, user_id)
);

create index if not exists guide_likes_guide_created_idx
  on public.guide_likes (guide_id, created_at desc);

alter table public.guide_likes enable row level security;

drop policy if exists guide_likes_select_published on public.guide_likes;
create policy guide_likes_select_published
  on public.guide_likes
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.guides g
      where g.id = guide_likes.guide_id
        and g.status = 'published'
    )
  );

drop policy if exists guide_likes_insert_own_published on public.guide_likes;
create policy guide_likes_insert_own_published
  on public.guide_likes
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.guides g
      where g.id = guide_likes.guide_id
        and g.status = 'published'
    )
  );

drop policy if exists guide_likes_delete_own on public.guide_likes;
create policy guide_likes_delete_own
  on public.guide_likes
  for delete
  to authenticated
  using (user_id = auth.uid());

revoke all on table public.guide_likes from anon;
revoke all on table public.guide_likes from authenticated;

create or replace function public.get_published_guide_like_summaries()
returns table (guide_id uuid, like_count bigint, liked_by_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    g.id,
    count(gl.user_id)::bigint,
    coalesce(bool_or(gl.user_id = auth.uid()), false)
  from public.guides g
  left join public.guide_likes gl on gl.guide_id = g.id
  where g.status = 'published'
  group by g.id;
$$;

revoke all on function public.get_published_guide_like_summaries() from public;
grant execute on function public.get_published_guide_like_summaries() to anon, authenticated, service_role;

create or replace function public.toggle_published_guide_like(p_guide_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted integer := 0;
  v_liked boolean;
  v_like_count bigint;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  perform 1
  from public.guides g
  where g.id = p_guide_id
    and g.status = 'published';

  if not found then
    raise exception using errcode = 'P0001', message = 'PUBLISHED_GUIDE_NOT_FOUND';
  end if;

  delete from public.guide_likes
  where guide_id = p_guide_id
    and user_id = v_user_id;
  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    v_liked := false;
  else
    insert into public.guide_likes (guide_id, user_id)
    values (p_guide_id, v_user_id)
    on conflict (guide_id, user_id) do nothing;
    v_liked := true;
  end if;

  select count(*)::bigint
  into v_like_count
  from public.guide_likes gl
  where gl.guide_id = p_guide_id;

  return jsonb_build_object(
    'guide_id', p_guide_id,
    'liked', v_liked,
    'like_count', v_like_count
  );
end;
$$;

revoke all on function public.toggle_published_guide_like(uuid) from public;
revoke all on function public.toggle_published_guide_like(uuid) from anon;
grant execute on function public.toggle_published_guide_like(uuid) to authenticated, service_role;

commit;
