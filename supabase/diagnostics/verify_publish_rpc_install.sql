-- 설치 후 확인용 조회 SQL. 함수 자체를 호출하거나 데이터를 변경하지 않는다.
begin read only;

with target as (
  select p.* from pg_catalog.pg_proc p
  where p.oid = to_regprocedure('public.publish_guide_atomic_v1(jsonb,jsonb,jsonb)')
    and p.prokind = 'f'
)
select
  exists(select 1 from target) as installed,
  (select pg_get_function_arguments(p.oid) from target p) as arguments,
  (select pg_get_function_result(p.oid) from target p) as return_type,
  (select case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end
    from target p) as security_mode,
  (select pg_get_userbyid(p.proowner) from target p) as owner,
  (select p.proconfig from target p) as settings,
  coalesce((select p.proargnames = array['p_guide','p_pins','p_media']::text[]
    and p.proargmodes is null and p.pronargdefaults = 0
    and p.prorettype = 'jsonb'::regtype and not p.proretset from target p),false) as signature_matches,
  coalesce((select md5(replace(p.prosrc,chr(13),'')) = 'eace5d084c83f632831f4a8cfc9fe445'
    from target p),false) as reviewed_body_matches,
  (select has_function_privilege(r.oid,p.oid,'EXECUTE') from target p
    cross join pg_catalog.pg_roles r where r.rolname = 'authenticated') as authenticated_can_execute,
  (select has_function_privilege(r.oid,p.oid,'EXECUTE') from target p
    cross join pg_catalog.pg_roles r where r.rolname = 'anon') as anon_can_execute,
  (select exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    where a.grantee = 0 and a.privilege_type = 'EXECUTE') from target p) as public_can_execute;

rollback;
