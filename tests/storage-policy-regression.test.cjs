// Local PostgreSQL reproduction using the recorded 2026-09-23 policies.
// Helper implementations below are models; their live definitions are still required.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {PGlite} = require(process.env.TRAVELOG_PGLITE_MODULE || '@electric-sql/pglite');
const catalog = JSON.parse(fs.readFileSync('tests/fixtures/publish-schema-20260923.json', 'utf8').replace(/^\uFEFF/, ''));
const userId = '22222222-2222-4222-8222-222222222222';
const guideId = '11111111-1111-4111-8111-111111111111';

test('recorded policies reject upload before guide exists; existing migration resolves that dependency', async () => {
  const db = await PGlite.create();
  try {
    await db.exec(`create role authenticated; create role anon; create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as $$select current_setting('request.jwt.claim.sub')::uuid$$;
      create function public.travelog_storage_guide_id(path text) returns uuid language sql immutable as $$select split_part(path,'/',2)::uuid$$;
      create function storage.foldername(path text) returns text[] language sql immutable as $$select string_to_array(path,'/')$$;
      create table public.guides(id uuid primary key, author_id uuid);
      create table storage.objects(bucket_id text, name text, primary key(bucket_id,name));
      alter table storage.objects enable row level security;
      grant usage on schema public,auth,storage to authenticated,anon;
      grant all on all tables in schema public,storage to authenticated,anon;`);
    for (const p of catalog.storage_policies.filter(p => p.policyname.startsWith('guide_public_') || p.policyname === 'travelog_guide_public_owner_delete_v1')) {
      await db.exec(`create policy "${p.policyname}" on storage.objects for ${p.cmd} to ${p.roles.join(',')}
        ${p.qual ? 'using (' + p.qual + ')' : ''} ${p.with_check ? 'with check (' + p.with_check + ')' : ''};`);
    }
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [userId]);
    const path = `guides/${guideId}/uploads/${userId}/cover/cover.jpg`;
    await db.exec('set role authenticated');
    await assert.rejects(db.query('insert into storage.objects values($1,$2)', ['guide-public', path]), /row-level security/);
    // The previous DB-first flow meets the recorded policy dependency.
    await db.query('insert into guides values($1,$2)', [guideId, userId]);
    await db.query('insert into storage.objects values($1,$2)', ['guide-public', path]);
    await db.exec('reset role');
    const migration = fs.readFileSync('supabase/migrations/202609230001_atomic_guide_publish.sql', 'utf8');
    const policySql = migration.slice(migration.indexOf('drop policy'), migration.indexOf('create or replace function'));
    await db.exec(policySql);
    const newGuide = '33333333-3333-4333-8333-333333333333';
    await db.exec('set role authenticated');
    await db.query('insert into storage.objects values($1,$2)', ['guide-public', `guides/${newGuide}/uploads/${userId}/cover/new.jpg`]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", ['44444444-4444-4444-8444-444444444444']);
    await assert.rejects(db.query('insert into storage.objects values($1,$2)', ['guide-public', `guides/${newGuide}/uploads/${userId}/cover/foreign.jpg`]), /row-level security/);
    assert.equal((await db.query('update storage.objects set name=$1 where name=$2 returning *', ['changed', path])).rows.length, 0);
    assert.equal((await db.query('delete from storage.objects where name=$1 returning *', [path])).rows.length, 0);
  } finally { await db.close(); }
});
