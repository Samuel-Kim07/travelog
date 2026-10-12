-- 조회 전용: 함수 호출·설치·교체·권한 변경·사용자 데이터 조회를 하지 않는다.
-- Supabase SQL Editor에서 파일 전체 실행 후 travelog_rpc_review 결과를 확인한다.
-- SQL Editor 관리자의 auth.uid()는 모바일 로그인 사용자의 UID 검증 수단이 아니다.
begin read only;

with routines as (
  select p.*, n.nspname, l.lanname, r.rolname as owner_name,
         r.rolsuper as owner_superuser, r.rolbypassrls as owner_bypassrls
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  join pg_catalog.pg_language l on l.oid = p.prolang
  join pg_catalog.pg_roles r on r.oid = p.proowner
  where p.proname = 'publish_guide_atomic_v1'
), target_tables as (
  select c.*, n.nspname from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where (n.nspname = 'public' and c.relname in ('guides','guide_pins','guide_media'))
     or (n.nspname = 'storage' and c.relname = 'objects')
)
select jsonb_pretty(jsonb_build_object(
  'expected', jsonb_build_object(
    'schema', 'public', 'name', 'publish_guide_atomic_v1',
    'arguments', 'p_guide jsonb, p_pins jsonb, p_media jsonb',
    'result', 'jsonb', 'result_keys', jsonb_build_array('guide','pins','media'),
    'security', 'DEFINER', 'language', 'plpgsql', 'search_path', 'pg_catalog',
    'reviewed_body_md5', 'eace5d084c83f632831f4a8cfc9fe445'),
  'exact_signature_exists', exists (
    select 1 from routines p where p.nspname = 'public' and p.prokind = 'f'
      and p.oid = to_regprocedure('public.publish_guide_atomic_v1(jsonb,jsonb,jsonb)')),
  'public_same_name_count', (select count(*) from routines where nspname = 'public'),
  'routines', coalesce((select jsonb_agg(jsonb_build_object(
    'schema', p.nspname, 'name', p.proname, 'kind', p.prokind,
    'identity_arguments', pg_get_function_identity_arguments(p.oid),
    'arguments_with_defaults', pg_get_function_arguments(p.oid),
    'argument_names', p.proargnames, 'argument_modes', p.proargmodes,
    'result', pg_get_function_result(p.oid), 'returns_set', p.proretset,
    'language', p.lanname,
    'security', case when p.prosecdef then 'DEFINER' else 'INVOKER' end,
    'reviewed_settings_match', coalesce(p.prosecdef and p.lanname = 'plpgsql'
      and p.proconfig = array['search_path=pg_catalog']::text[]
      and p.provolatile = 'v' and not p.proisstrict, false),
    'owner', p.owner_name, 'owner_superuser', p.owner_superuser,
    'owner_bypassrls', p.owner_bypassrls, 'settings', p.proconfig,
    'volatility', p.provolatile, 'strict', p.proisstrict,
    'client_signature_matches', coalesce(p.nspname = 'public' and p.prokind = 'f'
      and p.oid = to_regprocedure('public.publish_guide_atomic_v1(jsonb,jsonb,jsonb)')
      and p.proargnames = array['p_guide','p_pins','p_media']::text[]
      and p.proargmodes is null and p.pronargdefaults = 0
      and p.prorettype = 'jsonb'::regtype and not p.proretset, false),
    'body_md5', md5(replace(p.prosrc, chr(13), '')),
    'reviewed_body_matches', md5(replace(p.prosrc, chr(13), '')) = 'eace5d084c83f632831f4a8cfc9fe445',
    'definition', case when p.prokind in ('f','p') then pg_get_functiondef(p.oid) else null end,
    'direct_acl', (select jsonb_agg(jsonb_build_object(
      'grantee', case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee)::text end,
      'privilege', a.privilege_type, 'grantable', a.is_grantable))
      from aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a),
    'effective_execute', (select jsonb_agg(jsonb_build_object(
      'role', r.rolname, 'allowed', has_function_privilege(r.oid,p.oid,'EXECUTE')))
      from pg_roles r where r.rolname in ('anon','authenticated','service_role','postgres'))
  ) order by p.nspname, p.oid) from routines p), '[]'::jsonb),
  'table_security', (select jsonb_agg(jsonb_build_object(
    'table', t.nspname || '.' || t.relname, 'owner', pg_get_userbyid(t.relowner),
    'rls', t.relrowsecurity, 'force_rls', t.relforcerowsecurity,
    'policies', (select jsonb_agg(to_jsonb(p)) from pg_policies p
      where p.schemaname = t.nspname and p.tablename = t.relname),
    'authenticated_privileges', (select jsonb_build_object(
      'select', has_table_privilege(r.oid,t.oid,'SELECT'),
      'insert', has_table_privilege(r.oid,t.oid,'INSERT'),
      'update', has_table_privilege(r.oid,t.oid,'UPDATE'),
      'delete', has_table_privilege(r.oid,t.oid,'DELETE'))
      from pg_roles r where r.rolname = 'authenticated'),
    'triggers', (select jsonb_agg(pg_get_triggerdef(g.oid)) from pg_trigger g
      where g.tgrelid = t.oid and not g.tgisinternal),
    'incoming_foreign_keys', (select jsonb_agg(jsonb_build_object(
      'from_table', c.conrelid::regclass::text, 'definition', pg_get_constraintdef(c.oid)))
      from pg_constraint c where c.confrelid = t.oid and c.contype = 'f')
  ) order by t.nspname,t.relname) from target_tables t),
  'ddl_event_triggers', (select jsonb_agg(jsonb_build_object(
    'name', e.evtname, 'event', e.evtevent, 'enabled', e.evtenabled,
    'tags', e.evttags, 'function', e.evtfoid::regprocedure::text)) from pg_event_trigger e)
)) as travelog_rpc_review;

rollback;
