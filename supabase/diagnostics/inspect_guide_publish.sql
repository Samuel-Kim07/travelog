-- READ ONLY. Run in Supabase SQL Editor; this does not change schema or data.
-- Optional: put the failing guide UUID between the quotes to inspect only that guide.
begin read only;
set local travelog.inspect_guide_id = '';

with target_tables as (
  select c.oid, n.nspname as schema_name, c.relname as table_name,
         c.relrowsecurity, c.relforcerowsecurity
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in ('guides', 'guide_pins', 'guide_media')
), snapshot as (
  select jsonb_build_object(
    'table', t.schema_name || '.' || t.table_name,
    'rls', t.relrowsecurity, 'force_rls', t.relforcerowsecurity,
    'columns', (select jsonb_agg(jsonb_build_object(
      'name', a.attname, 'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
      'not_null', a.attnotnull, 'identity', a.attidentity, 'generated', a.attgenerated,
      'default', pg_catalog.pg_get_expr(d.adbin, d.adrelid)) order by a.attnum)
      from pg_catalog.pg_attribute a
      left join pg_catalog.pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped),
    'constraints', (select jsonb_agg(jsonb_build_object(
      'name', c.conname, 'definition', pg_catalog.pg_get_constraintdef(c.oid),
      'deferrable', c.condeferrable, 'initially_deferred', c.condeferred))
      from pg_catalog.pg_constraint c where c.conrelid = t.oid),
    'incoming_foreign_keys', (select jsonb_agg(jsonb_build_object(
      'from_table', c.conrelid::regclass::text, 'name', c.conname,
      'definition', pg_catalog.pg_get_constraintdef(c.oid)))
      from pg_catalog.pg_constraint c where c.confrelid = t.oid),
    'indexes', (select jsonb_agg(pg_catalog.pg_get_indexdef(i.indexrelid))
      from pg_catalog.pg_index i where i.indrelid = t.oid),
    'policies', (select jsonb_agg(to_jsonb(p)) from pg_catalog.pg_policies p
      where p.schemaname = t.schema_name and p.tablename = t.table_name),
    'triggers', (select jsonb_agg(pg_catalog.pg_get_triggerdef(g.oid))
      from pg_catalog.pg_trigger g where g.tgrelid = t.oid and not g.tgisinternal),
    'grants', (select jsonb_agg(jsonb_build_object('role', p.grantee, 'privilege', p.privilege_type))
      from information_schema.role_table_grants p
      where p.table_schema = t.schema_name and p.table_name = t.table_name)
  ) as definition from target_tables t
)
select jsonb_pretty(jsonb_build_object(
  'tables', (select jsonb_agg(definition) from snapshot),
  'storage_policies', (select jsonb_agg(to_jsonb(p)) from pg_catalog.pg_policies p
    where p.schemaname = 'storage' and p.tablename in ('objects', 'buckets')),
  'existing_publish_rpcs', (select jsonb_agg(jsonb_build_object(
    'name', p.proname, 'arguments', pg_catalog.pg_get_function_arguments(p.oid),
    'result', pg_catalog.pg_get_function_result(p.oid), 'security_definer', p.prosecdef))
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and (p.proname ilike '%publish%' or p.proname ilike '%guide%')),
  'guide', (select to_jsonb(g) from public.guides g
    where g.id::text = current_setting('travelog.inspect_guide_id')),
  'pins', (select jsonb_agg(to_jsonb(p) order by p.pin_order) from public.guide_pins p
    where p.guide_id::text = current_setting('travelog.inspect_guide_id')),
  'media', (select jsonb_agg(to_jsonb(m)) from public.guide_media m
    where m.guide_id::text = current_setting('travelog.inspect_guide_id'))
)) as travelog_publish_inspection;
rollback;
