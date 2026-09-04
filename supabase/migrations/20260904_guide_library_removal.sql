begin;

drop policy if exists guide_purchases_delete_own on public.guide_purchases;
create policy guide_purchases_delete_own
on public.guide_purchases
for delete
to authenticated
using (buyer_id = (select auth.uid()));

drop policy if exists offline_downloads_delete_own on public.offline_downloads;
create policy offline_downloads_delete_own
on public.offline_downloads
for delete
to authenticated
using (user_id = (select auth.uid()));

create or replace function public.remove_guide_from_library_v1(p_guide_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_download_count integer := 0;
  v_purchase_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  delete from public.offline_downloads
  where guide_id = p_guide_id
    and user_id = auth.uid();
  get diagnostics v_download_count = row_count;

  delete from public.guide_purchases
  where guide_id = p_guide_id
    and buyer_id = auth.uid();
  get diagnostics v_purchase_count = row_count;

  return jsonb_build_object(
    'guide_id', p_guide_id,
    'offline_downloads_deleted', v_download_count,
    'guide_purchases_deleted', v_purchase_count
  );
end;
$$;

revoke all on function public.remove_guide_from_library_v1(uuid) from public, anon;
grant execute on function public.remove_guide_from_library_v1(uuid) to authenticated;

commit;
