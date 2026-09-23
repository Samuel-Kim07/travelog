-- Based on production catalog supplied in Supabase Snippet Untitled query.csv, 2026-09-23.
-- Apply as postgres BEFORE deploying the corresponding supabaseClient.js.
-- No existing rows, constraints, or Storage objects are deleted by this migration.
begin;

-- Upload before creating a guide: only the authenticated user's own namespace.
-- Keep guides/<uuid>/... so existing reader/deletion policies remain compatible.
drop policy if exists travelog_publish_upload_insert_v1 on storage.objects;
create policy travelog_publish_upload_insert_v1 on storage.objects for insert to authenticated
with check (bucket_id in ('guide-public', 'guide-media')
  and split_part(name, '/', 1) = 'guides'
  and split_part(name, '/', 3) = 'uploads'
  and split_part(name, '/', 4) = (select auth.uid())::text);
drop policy if exists travelog_publish_upload_select_v1 on storage.objects;
create policy travelog_publish_upload_select_v1 on storage.objects for select to authenticated
using (bucket_id in ('guide-public', 'guide-media')
  and split_part(name, '/', 1) = 'guides'
  and split_part(name, '/', 3) = 'uploads'
  and split_part(name, '/', 4) = (select auth.uid())::text);

create or replace function public.publish_guide_atomic_v1(p_guide jsonb, p_pins jsonb, p_media jsonb)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog
as $$
declare
  caller uuid := auth.uid();
  gid uuid := (p_guide->>'id')::uuid;
  existing_author uuid;
  pin_total integer;
  park_base bigint;
  park_count bigint;
  saved_guide public.guides%rowtype;
begin
  if caller is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if gid is null or jsonb_typeof(p_guide) is distinct from 'object'
    or jsonb_typeof(p_pins) is distinct from 'array'
    or jsonb_typeof(p_media) is distinct from 'array' then
    raise exception 'INVALID_PUBLISH_PACKAGE' using errcode = '22023';
  end if;
  -- Serialize retries/concurrent tabs even when the guide does not exist yet.
  perform pg_advisory_xact_lock(hashtextextended(gid::text, 0));
  select author_id into existing_author from public.guides where id = gid for update;
  if existing_author is not null and existing_author <> caller then
    raise exception 'GUIDE_NOT_OWNED' using errcode = '42501';
  end if;
  if nullif(btrim(p_guide->>'title'), '') is null
    or coalesce((p_guide->>'price_coins')::integer, 0) < 0 then
    raise exception 'INVALID_GUIDE' using errcode = '22023';
  end if;
  pin_total := jsonb_array_length(p_pins);
  if exists (select 1 from jsonb_populate_recordset(null::public.guide_pins, p_pins) p
      where p.id is null or p.guide_id is distinct from gid or p.pin_order is null
        or p.pin_order < 1 or p.pin_order > pin_total or p.title is null
        or p.lat is null or p.lng is null or not (p.lat between -90 and 90)
        or not (p.lng between -180 and 180)
        or p.memo_type is null or p.memo_type not in ('text','audio','video','photo')
        or p.trigger_radius_m is null or p.trigger_radius_m < 0)
    or (select count(distinct p.id) from jsonb_populate_recordset(null::public.guide_pins, p_pins) p) <> pin_total
    or (select count(distinct p.pin_order) from jsonb_populate_recordset(null::public.guide_pins, p_pins) p) <> pin_total then
    raise exception 'INVALID_PIN_IDENTITIES_OR_ORDERS' using errcode = '22023';
  end if;
  if exists (select 1 from public.guide_pins old
      join jsonb_populate_recordset(null::public.guide_pins, p_pins) p on p.id = old.id
      where old.guide_id <> gid)
    or exists (select 1 from public.guide_media old
      join jsonb_populate_recordset(null::public.guide_media, p_media) m on m.id = old.id
      where old.guide_id <> gid) then
    raise exception 'ROW_ID_BELONGS_TO_ANOTHER_GUIDE' using errcode = '42501';
  end if;
  if (select count(distinct m.id) from jsonb_populate_recordset(null::public.guide_media, p_media) m)
       <> jsonb_array_length(p_media)
    or exists (select 1 from jsonb_populate_recordset(null::public.guide_media, p_media) m
      where m.id is null or m.guide_id is distinct from gid or m.file_size is null or m.file_size <= 0
        or m.media_role is null or m.media_role not in ('cover','intro_audio','intro_video','pin_audio','pin_video','pin_photo')
        or m.bucket_name is distinct from case when m.media_role in ('cover','intro_audio','intro_video') then 'guide-public' else 'guide-media' end
        or m.mime_type is null or not (m.mime_type like case
          when m.media_role in ('cover','pin_photo') then 'image/%'
          when m.media_role in ('intro_video','pin_video') then 'video/%' else 'audio/%' end)
        or (m.duration_seconds is not null and m.duration_seconds < 0)
        or (m.media_role like 'pin_%' and (m.pin_id is null or not exists
          (select 1 from jsonb_populate_recordset(null::public.guide_pins, p_pins) p where p.id = m.pin_id)))
        or (m.media_role not like 'pin_%' and m.pin_id is not null)
        or m.storage_path is null or not (
          starts_with(m.storage_path, 'guides/' || gid::text || '/uploads/' || caller::text || '/')
          or (existing_author is not distinct from caller and starts_with(m.storage_path, 'guides/' || gid::text || '/')
            and split_part(m.storage_path, '/', 3) in ('cover', 'intro', 'audio', 'video', 'photo'))
          or exists (select 1 from public.guide_media old where old.guide_id = gid
            and old.bucket_name = m.bucket_name and old.storage_path = m.storage_path))
        or not exists (select 1 from storage.objects o where o.bucket_id = m.bucket_name and o.name = m.storage_path)) then
    raise exception 'INVALID_OR_MISSING_UPLOADED_MEDIA' using errcode = '22023';
  end if;
  if nullif(p_guide->>'cover_path', '') is not null and not exists
    (select 1 from jsonb_populate_recordset(null::public.guide_media, p_media) m
     where m.media_role = 'cover' and m.storage_path = p_guide->>'cover_path') then
    raise exception 'INVALID_COVER_PATH' using errcode = '22023';
  end if;

  insert into public.guides (id, author_id, title, description, intro_text, cover_path, status,
      price_coins, total_bytes, pin_count, memo_count, coupon_count, published_at, updated_at)
  values (gid, caller, p_guide->>'title', p_guide->>'description', p_guide->>'intro_text',
      nullif(p_guide->>'cover_path', ''), 'published', coalesce((p_guide->>'price_coins')::integer, 0),
      coalesce((select sum(m.file_size) from jsonb_populate_recordset(null::public.guide_media, p_media) m), 0),
      pin_total, coalesce((p_guide->>'memo_count')::integer, 0),
      coalesce((p_guide->>'coupon_count')::integer, 0), now(), now())
  on conflict (id) do update set title = excluded.title, description = excluded.description,
      intro_text = excluded.intro_text, cover_path = excluded.cover_path, status = excluded.status,
      price_coins = excluded.price_coins, total_bytes = excluded.total_bytes, pin_count = excluded.pin_count,
      memo_count = excluded.memo_count, coupon_count = excluded.coupon_count,
      published_at = coalesce(public.guides.published_at, excluded.published_at), updated_at = excluded.updated_at
  where public.guides.author_id = caller
  returning * into saved_guide;
  if saved_guide.id is null then raise exception 'GUIDE_NOT_OWNED' using errcode = '42501'; end if;

  -- The production UNIQUE is NOT DEFERRABLE. Park rows in a disjoint range
  -- above both existing and requested orders, then upsert. Never disable it.
  select greatest(coalesce(max(pin_order), 0), pin_total)::bigint, count(*)
    into park_base, park_count from public.guide_pins where guide_id = gid;
  if park_base + park_count > 2147483647 then
    raise exception 'PIN_ORDER_PARKING_OVERFLOW' using errcode = '22003';
  end if;
  with parked as (select id, park_base + row_number() over (order by id) as temp_order
    from public.guide_pins where guide_id = gid)
  update public.guide_pins p set pin_order = parked.temp_order::integer from parked where p.id = parked.id;

  insert into public.guide_pins (id, guide_id, pin_order, title, description, lat, lng,
      memo_type, memo_title, memo_text, trigger_radius_m)
  select id, gid, pin_order, title, description, lat, lng, memo_type, memo_title, memo_text, trigger_radius_m
    from jsonb_populate_recordset(null::public.guide_pins, p_pins)
  on conflict (id) do update set pin_order = excluded.pin_order, title = excluded.title,
    description = excluded.description, lat = excluded.lat, lng = excluded.lng, memo_type = excluded.memo_type,
    memo_title = excluded.memo_title, memo_text = excluded.memo_text, trigger_radius_m = excluded.trigger_radius_m
  where public.guide_pins.guide_id = gid;

  insert into public.guide_media (id, guide_id, pin_id, media_role, bucket_name, storage_path,
      mime_type, file_size, duration_seconds)
  select id, gid, pin_id, media_role, bucket_name, storage_path, mime_type, file_size, duration_seconds
    from jsonb_populate_recordset(null::public.guide_media, p_media)
  on conflict (id) do update set pin_id = excluded.pin_id, media_role = excluded.media_role,
    bucket_name = excluded.bucket_name, storage_path = excluded.storage_path, mime_type = excluded.mime_type,
    file_size = excluded.file_size, duration_seconds = excluded.duration_seconds
  where public.guide_media.guide_id = gid;

  -- A cross-guide ID inserted concurrently after validation must fail, not be silently skipped.
  if (select count(*) from public.guide_pins p join
      jsonb_populate_recordset(null::public.guide_pins, p_pins) wanted on wanted.id = p.id
      where p.guide_id = gid) <> pin_total
    or (select count(*) from public.guide_media m join
      jsonb_populate_recordset(null::public.guide_media, p_media) wanted on wanted.id = m.id
      where m.guide_id = gid) <> jsonb_array_length(p_media) then
    raise exception 'CONCURRENT_FOREIGN_ROW_ID' using errcode = '42501';
  end if;

  delete from public.guide_media m where guide_id = gid and not exists
    (select 1 from jsonb_populate_recordset(null::public.guide_media, p_media) wanted where wanted.id = m.id);
  delete from public.guide_pins p where guide_id = gid and not exists
    (select 1 from jsonb_populate_recordset(null::public.guide_pins, p_pins) wanted where wanted.id = p.id);

  return jsonb_build_object('guide', to_jsonb(saved_guide),
    'pins', coalesce((select jsonb_agg(to_jsonb(p) order by pin_order) from public.guide_pins p where guide_id = gid), '[]'::jsonb),
    'media', coalesce((select jsonb_agg(to_jsonb(m) order by id) from public.guide_media m where guide_id = gid), '[]'::jsonb));
end;
$$;
-- guide_media has no UPDATE RLS policy in production. The definer function
-- enforces ownership itself; do not open general UPDATE access to the table.
revoke all on function public.publish_guide_atomic_v1(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.publish_guide_atomic_v1(jsonb, jsonb, jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
