// Real PostgreSQL (PGlite), production columns/constraints/RLS from the supplied catalog.
// Storage transport and browser lifecycle are adapters; no live Supabase data is touched.
const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {randomUUID} = require('node:crypto');
const {PGlite} = require(process.env.TRAVELOG_PGLITE_MODULE || '@electric-sql/pglite');
const {harness: mockHarness, packageData, guideId} = require('./publish-harness.cjs');
const {harness: creatorHarness} = require('./creator-recovery-harness.cjs');
const catalog = JSON.parse(fs.readFileSync('tests/fixtures/publish-schema-20260923.json','utf8').replace(/^\uFEFF/,''));
const migration = fs.readFileSync('supabase/migrations/202610120001_publish_finalize_rpc_only.sql','utf8');
const userId = '22222222-2222-4222-8222-222222222222';
let db;
before(async () => {
  db = await PGlite.create();
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create schema storage;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table public.profiles(id uuid primary key);
    create table public.guide_purchases(guide_id uuid, buyer_id uuid);
    create table storage.objects(bucket_id text, name text, primary key(bucket_id,name));
    create function public.travelog_storage_guide_id(path text) returns uuid language sql immutable as $$select split_part(path,'/',2)::uuid$$;
    create function storage.foldername(path text) returns text[] language sql immutable as $$select string_to_array(path,'/')$$;
    alter table storage.objects enable row level security;
    grant usage on schema public,auth,storage to authenticated,anon;
    grant all on all tables in schema public,storage to authenticated,anon;
    insert into profiles values ('${userId}');`);
  for (const name of ['public.guides','public.guide_pins','public.guide_media']) {
    const table = catalog.tables.find(t=>t.table===name);
    const columns = table.columns.map(c=>`"${c.name}" ${c.type}${c.not_null?' not null':''}${c.default?' default '+c.default:''}`);
    const constraints = table.constraints.map(c=>`constraint "${c.name}" ${c.definition}`);
    await db.exec(`create table ${name} (${[...columns,...constraints].join(',')});
      alter table ${name} enable row level security;
      grant all on ${name} to authenticated,anon;`);
    for (const p of table.policies) await db.exec(`create policy "${p.policyname}" on ${name}
      for ${p.cmd} to ${p.roles.join(',')}${p.qual?' using ('+p.qual+')':''}${p.with_check?' with check ('+p.with_check+')':''};`);
  }
  for (const policy of catalog.storage_policies.filter(p => /'guide-public'|'guide-media'/.test((p.qual || '') + (p.with_check || '')))) {
    await db.exec(`create policy "${policy.policyname}" on storage.objects for ${policy.cmd} to ${policy.roles.join(',')}
      ${policy.qual ? 'using (' + policy.qual + ')' : ''} ${policy.with_check ? 'with check (' + policy.with_check + ')' : ''};`);
  }
  const absent = await inspectRpc();
  assert.equal(absent.exact_signature_exists, false);
  assert.equal(absent.public_same_name_count, 0);
  await db.exec(migration);
  await assert.rejects(db.exec(migration), /RPC_ALREADY_EXISTS_REVIEW_REQUIRED/);
  await db.exec('rollback'); // Failed installation must never replace an existing routine.
  await db.query("select set_config('request.jwt.claim.sub', $1, false)",[userId]);
});
after(async()=>{await db?.close();});
async function inspectRpc(connection = db) {
  const results = await connection.exec(fs.readFileSync('supabase/diagnostics/inspect_publish_rpc.sql','utf8'));
  const row = results.flatMap(result => result.rows || []).find(row => row.travelog_rpc_review);
  return JSON.parse(row.travelog_rpc_review);
}
// Draft INSERT/SELECT and Storage INSERT now run as the authenticated role too.
function harness(rpcHandler) {
  return mockHarness(rpcHandler, {
    async query({table, operation, row, filters, single}) {
      assert.ok(['guides', 'guide_pins', 'guide_media'].includes(table));
      try {
        await db.exec('set role authenticated');
        let result;
        if (operation === 'select') {
          const [field, value] = filters[0]; assert.ok(['id', 'guide_id'].includes(field));
          result = await db.query(`select * from ${table} where ${field}=$1`, [value]);
        } else {
          assert.equal(table, 'guides'); assert.equal(operation, 'insert');
          result = await db.query('insert into guides(id,author_id,title,status) values($1,$2,$3,$4) returning *', [row.id,row.author_id,row.title,row.status]);
        }
        return {data: single ? result.rows[0] || null : result.rows};
      } catch (error) { return {status: 400, error: {message: error.message, code: error.code}}; }
      finally { await db.exec('reset role'); }
    },
    async upload({key}) {
      const slash = key.indexOf('/');
      try {
        await db.exec('set role authenticated');
        await db.query('insert into storage.objects values($1,$2)', [key.slice(0,slash),key.slice(slash+1)]);
      } catch (error) { return {ok:false,status:error.code === '23505' ? 409 : 400,json:async()=>({message:error.message,code:error.code})}; }
      finally { await db.exec('reset role'); }
    }
  });
}
async function rpc(name,args,objects) {
  assert.equal(name,'publish_guide_atomic_v1');
  for(const key of objects.keys()) {
    const slash=key.indexOf('/');
    await db.query('insert into storage.objects values($1,$2) on conflict do nothing',[key.slice(0,slash),key.slice(slash+1)]);
  }
  try {
    await db.exec('set role authenticated');
    const result=await db.query('select public.publish_guide_atomic_v1($1::jsonb,$2::jsonb,$3::jsonb) as result',
      [JSON.stringify(args.p_guide),JSON.stringify(args.p_pins),JSON.stringify(args.p_media)]);
    return {data:result.rows[0].result};
  } catch(e) {return {status:e.code==='23505'?409:400,error:{message:e.message,code:e.code}};}
  finally {await db.exec('reset role');}
}
async function snapshot(id=guideId) {
  const result={};
  for(const table of ['guides','guide_pins','guide_media']) result[table]=(await db.query(
    `select * from ${table} where ${table==='guides'?'id':'guide_id'}=$1 order by id`,[id])).rows;
  return result;
}
function fourPins() {
  return {...packageData(),videoFiles:[],pins:Array.from({length:4},(_,i)=>({id:randomUUID(),order:i+1,name:'Pin '+(i+1),lat:37,lng:127}))};
}
let p,h,originalIds;
test('A: first four-pin publication commits; production unique constraint is unchanged',async()=>{
  p=fourPins();originalIds=p.pins.map(p=>p.id);h=harness(rpc);await h.api.publishGuidePackage(p);
  const s=await snapshot();assert.equal(s.guides.length,1);assert.equal(s.guide_pins.length,4);
  const c=(await db.query("select condeferrable, pg_get_constraintdef(oid) as definition from pg_constraint where conname='guide_pins_guide_id_pin_order_key'")).rows[0];
  assert.equal(c.condeferrable,false);assert.equal(c.definition,'UNIQUE (guide_id, pin_order)');
  assert.deepEqual(h.events.filter(e=>/^(insert|update|delete):/.test(e)), ['insert:guides']);
});
test('B: two unchanged republishes keep exactly four rows and stable UUIDs',async()=>{
  await h.api.publishGuidePackage(p);await h.api.publishGuidePackage(p);
  const s=await snapshot();assert.equal(s.guides.length,1);assert.deepEqual(s.guide_pins.map(p=>p.id).sort(),originalIds.slice().sort());
});
test('C: add one pin; exactly five rows',async()=>{
  p.pins.push({id:randomUUID(),order:5,name:'New pin',lat:37,lng:127});await h.api.publishGuidePackage(p);assert.equal((await snapshot()).guide_pins.length,5);
});
test('D: reverse order and edit title; unchanged identities and unique contiguous orders',async()=>{
  p.pins.reverse().forEach((pin,i)=>{pin.order=i+1;pin.name+=' edited';});await h.api.publishGuidePackage(p);
  const pins=(await snapshot()).guide_pins.sort((a,b)=>a.pin_order-b.pin_order);
  assert.deepEqual(pins.map(p=>p.id),p.pins.map(p=>p.id));assert.deepEqual(pins.map(p=>p.pin_order),[1,2,3,4,5]);assert.match(pins[0].title,/edited/);
});
test('E: remove one pin; only that row removed and retained created_at unchanged',async()=>{
  const before=await snapshot();const removed=p.pins.splice(2,1)[0];p.pins.forEach((p,i)=>p.order=i+1);
  await h.api.publishGuidePackage(p);const s=await snapshot();assert.equal(s.guide_pins.length,4);assert.ok(!s.guide_pins.some(p=>p.id===removed.id));
  for(const pin of s.guide_pins) assert.deepEqual(pin.created_at,before.guide_pins.find(p=>p.id===pin.id).created_at);
});
test('F: forced failure AFTER deletes rolls back guide, pins, media; retry reuses uploads',async()=>{
  p.videoFiles=[{fileName:'video_memo_test.mp4',blob:new Blob(['video'],{type:'video/mp4'}),pinId:p.pins[0].id,stopIndex:0}];await h.api.publishGuidePackage(p);
  const before=await snapshot();const oldTitle=p.tourName;p.tourName='Updated';p.pins.pop();p.videoFiles=[];
  await db.exec(`create function public.test_fail_delete() returns trigger language plpgsql as $$ begin raise exception 'FORCED_AFTER_DELETE'; end; $$;
    create trigger fail_delete after delete on guide_pins for each row execute function test_fail_delete();`);
  await assert.rejects(h.api.publishGuidePackage(p),/FORCED_AFTER_DELETE/);assert.deepEqual(await snapshot(),before);
  await db.exec('drop trigger fail_delete on guide_pins');await h.api.publishGuidePackage(p);await h.api.publishGuidePackage(p);
  const s=await snapshot();assert.equal(s.guide_pins.length,3);assert.equal(s.guide_media.length,0);assert.equal(s.guides[0].title,'Updated');assert.equal(h.objects.size,1);p.tourName=oldTitle;
});
test('G: actual Creator draft save/reconstruction retains UUID and repeat publication stays unique',async()=>{
  const c=creatorHarness();c.state.customCreatedPins=p.pins.map((pin,i)=>({...pin,sortOrder:i}));c.api.persistWorkingDraft();
  const restored=creatorHarness(c.storage);restored.api.restoreWorkingDraft();
  assert.equal(restored.state.customCreatedPins.map(p=>p.id).join(),p.pins.map(p=>p.id).join());
  const again=harness(rpc);await again.api.publishGuidePackage({...p,pins:restored.state.customCreatedPins});assert.equal((await snapshot()).guide_pins.length,3);
});
test('H: Creator portrait/landscape lifecycle preserves pins; publish remains idempotent',async()=>{
  const c=creatorHarness();c.state.customCreatedPins=p.pins.map((pin,i)=>({...pin,sortOrder:i}));c.api.persistWorkingDraft();
  for(const event of ['orientationchange','resize','pagehide','pageshow','orientationchange','resize'])c.fire(event);
  assert.deepEqual(c.state.customCreatedPins.map(p=>p.id),p.pins.map(p=>p.id));
  await h.api.publishGuidePackage({...p,pins:c.state.customCreatedPins});assert.equal((await snapshot()).guide_pins.length,3);
});
test('new guide upload failure retains only its draft; retry uses stored files',async()=>{
  const input={...packageData(),guideId:randomUUID()};const client=harness(rpc);client.control.failAt=4;
  await assert.rejects(client.api.publishGuidePackage(input));const failed=await snapshot(input.guideId);assert.equal(failed.guides[0].status,'draft');assert.equal(failed.guide_pins.length,0);assert.equal(failed.guide_media.length,0);
  await client.api.publishGuidePackage(input);await client.api.publishGuidePackage(input);
  const s=await snapshot(input.guideId);assert.equal(s.guides.length,1);assert.equal(s.guide_pins.length,1);assert.equal(s.guide_media.length,5);assert.equal(client.control.uploadNumber,8);
});
test('RPC response lost after COMMIT: retry has one guide/pin/media set and no repeat upload',async()=>{
  const input={...packageData(),guideId:randomUUID()};let lost=false;
  const client=harness(async(...args)=>{const result=await rpc(...args);if(!lost){lost=true;return {error:{message:'Failed to fetch'}};}return result;});
  await assert.rejects(client.api.publishGuidePackage(input));await client.api.publishGuidePackage(input);
  const s=await snapshot(input.guideId);assert.equal(s.guide_pins.length,1);assert.equal(s.guide_media.length,5);assert.equal(client.control.uploadNumber,5);
});
test('legacy partial rows occupying desired orders reconcile atomically without manual deletion',async()=>{
  const input=fourPins();input.guideId=randomUUID();
  await db.query("insert into guides(id,author_id,title) values($1,$2,'partial')",[input.guideId,userId]);
  await db.query("insert into guide_pins(guide_id,pin_order,title,lat,lng) values($1,1,'old',37,127)",[input.guideId]);
  await harness(rpc).api.publishGuidePackage(input);const s=await snapshot(input.guideId);assert.equal(s.guide_pins.length,4);assert.deepEqual(s.guide_pins.map(p=>p.id).sort(),input.pins.map(p=>p.id).sort());
});
test('direct invalid orders, missing object, foreign pin id and foreign owner all fail without changes',async()=>{
  const before=await snapshot();const base={p_guide:before.guides[0],p_pins:before.guide_pins,p_media:before.guide_media};
  const call=async args=>(await rpc('publish_guide_atomic_v1',args,new Map())).error;
  const bad=structuredClone(base);bad.p_pins[1].pin_order=bad.p_pins[0].pin_order;assert.match((await call(bad)).message,/INVALID_PIN/);
  const missing=structuredClone(base);missing.p_media=[{id:randomUUID(),guide_id:guideId,pin_id:base.p_pins[0].id,media_role:'pin_video',bucket_name:'guide-media',storage_path:`guides/${guideId}/uploads/${userId}/video/missing.mp4`,mime_type:'video/mp4',file_size:5}];assert.match((await call(missing)).message,/MISSING_UPLOADED_MEDIA/);
  const foreign=structuredClone(base);foreign.p_guide.id=randomUUID();foreign.p_pins.forEach(p=>p.guide_id=foreign.p_guide.id);assert.match((await call(foreign)).message,/ROW_ID_BELONGS/);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[randomUUID()]);assert.match((await call(base)).message,/GUIDE_NOT_OWNED/);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[userId]);assert.deepEqual(await snapshot(),before);
});
test('existing upload policy requires owned guide; RPC is not public',async()=>{
  const gid=randomUUID();await db.exec('set role authenticated');
  try {
    await assert.rejects(db.query('insert into storage.objects values($1,$2)',['guide-media',`guides/${gid}/uploads/${userId}/video/a.mp4`]),/row-level security/);
    await db.query('insert into guides(id,author_id,title,status) values($1,$2,$3,$4)',[gid,userId,'Draft','draft']);
    await db.query('insert into storage.objects values($1,$2)',['guide-media',`guides/${gid}/uploads/${userId}/video/a.mp4`]);
    assert.equal((await db.query('select * from storage.objects where name=$1',[`guides/${gid}/uploads/${userId}/video/a.mp4`])).rows.length,1);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[randomUUID()]);
    await assert.rejects(db.query('insert into storage.objects values($1,$2)',['guide-media',`guides/${gid}/uploads/${userId}/video/b.mp4`]),/row-level security/);
  }finally{await db.exec('reset role');}
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[userId]);
  const perms=(await db.query("select has_function_privilege('anon','public.publish_guide_atomic_v1(jsonb,jsonb,jsonb)','EXECUTE') as anon")).rows[0];assert.equal(perms.anon,false);
});
test('failed finalization after pin insert preserves only the reusable draft',async()=>{
  const input=fourPins();input.guideId=randomUUID();
  await db.exec(`create function public.test_fail_insert() returns trigger language plpgsql as $$ begin raise exception 'FORCED_PIN_INSERT'; end; $$;
    create trigger fail_insert after insert on guide_pins for each row execute function test_fail_insert();`);
  try{await assert.rejects(harness(rpc).api.publishGuidePackage(input),/FORCED_PIN_INSERT/);}
  finally{await db.exec('drop trigger fail_insert on guide_pins');}
  const failed=await snapshot(input.guideId);assert.equal(failed.guides[0].status,'draft');assert.equal(failed.guide_pins.length,0);assert.equal(failed.guide_media.length,0);
  await harness(rpc).api.publishGuidePackage(input);assert.equal((await snapshot(input.guideId)).guide_pins.length,4);
});
test('an existing object in another namespace cannot be attached to a new guide',async()=>{
  const input=fourPins();input.guideId=randomUUID();let args;
  await harness(async(name,payload)=>{args=payload;return {error:{message:'capture only'}};}).api.publishGuidePackage(input).catch(()=>{});
  const foreignPath=`guides/${randomUUID()}/video/not-owned.mp4`;
  await db.query('insert into storage.objects values($1,$2)',['guide-media',foreignPath]);
  args.p_media=[{id:randomUUID(),guide_id:input.guideId,pin_id:input.pins[0].id,media_role:'pin_video',bucket_name:'guide-media',storage_path:foreignPath,mime_type:'video/mp4',file_size:5}];
  assert.match((await rpc('publish_guide_atomic_v1',args,new Map())).error.message,/INVALID_OR_MISSING/);
  const failed=await snapshot(input.guideId);assert.equal(failed.guides[0].status,'draft');assert.equal(failed.guide_pins.length,0);assert.equal(failed.guide_media.length,0);
});
test('legacy successful file from a partial publish is reused without upload or manual cleanup',async()=>{
  const input={...packageData(),videoFiles:[packageData().videoFiles[0]]};const client=harness(rpc);
  const file=input.videoFiles[0];const modern=await client.internal.makeStoragePath({guideId,userId,folder:'video',role:'pin_video',originalName:file.fileName,blob:file.blob});
  const legacy=modern.replace(`/uploads/${userId}`,'');client.objects.set('guide-media/'+legacy,file.blob);
  await client.api.publishGuidePackage(input);assert.equal(client.control.uploadNumber,0);assert.equal((await snapshot()).guide_media[0].storage_path,legacy);
});

test('another user cannot see the failed draft but can read the successfully published free guide', async () => {
  const client = harness(rpc), input = {...packageData(), guideId: randomUUID()};
  client.control.httpStatus = 400;
  await assert.rejects(client.api.publishGuidePackage(input));
  const reader = randomUUID();
  async function readAsOther() {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [reader]);
    await db.exec('set role authenticated');
    try {
      return {
        guides: (await db.query('select * from guides where id=$1',[input.guideId])).rows,
        pins: (await db.query('select * from guide_pins where guide_id=$1',[input.guideId])).rows,
        media: (await db.query('select * from guide_media where guide_id=$1',[input.guideId])).rows
      };
    } finally {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [userId]);
    }
  }
  assert.deepEqual(await readAsOther(), {guides:[],pins:[],media:[]});
  client.control.httpStatus = 0; await client.api.publishGuidePackage(input);
  const visible = await readAsOther();
  assert.equal(visible.guides[0].status,'published'); assert.equal(visible.pins.length,1); assert.equal(visible.media.length,5);
});

test('purchase records survive failed and successful edits of the published guide', async () => {
  const buyer = randomUUID(); await db.query('insert into guide_purchases values($1,$2)', [guideId,buyer]);
  const before = (await db.query('select * from guide_purchases')).rows;
  const input = {...packageData(),tourName:'Republished'};
  const client = harness(rpc); client.control.httpStatus = 400;
  await assert.rejects(client.api.publishGuidePackage(input));
  assert.deepEqual((await db.query('select * from guide_purchases')).rows, before);
  client.control.httpStatus = 0; await client.api.publishGuidePackage(input);
  assert.deepEqual((await db.query('select * from guide_purchases')).rows, before);
});

test('finalizer-only SQL changes no Storage or table RLS policies', () => {
  assert.doesNotMatch(migration, /(?:create|alter|drop)\s+policy|disable\s+row\s+level\s+security/i);
  const original = fs.readFileSync('supabase/migrations/202609230001_atomic_guide_publish.sql','utf8');
  const start = 'returns jsonb';
  assert.equal(migration.slice(migration.indexOf(start)), original.slice(original.indexOf(start)));
});

test('read-only diagnostic SQL returns policies, bucket settings and RPC definition', async () => {
  await db.exec("create table storage.buckets(id text primary key, public boolean); insert into storage.buckets values ('guide-public',true),('guide-media',false);");
  const before = await snapshot();
  const results = await db.exec(fs.readFileSync('supabase/diagnostics/inspect_guide_publish.sql', 'utf8'));
  const row = results.flatMap(result => result.rows || []).find(row => row.travelog_publish_inspection);
  const report = JSON.parse(row.travelog_publish_inspection);
  assert.equal(report.buckets.length, 2);
  assert.match(report.publish_rpc_definition, /publish_guide_atomic_v1/);
  assert.deepEqual(await snapshot(), before);
});

for (const kind of ['cover', 'none', 'photo', 'audio', 'video', 'mixed']) {
  test(`PostgreSQL ${kind} publication and edited republication commit complete rows`, async () => {
    const input = {...packageData(), guideId: randomUUID(), videoFiles: []};
    if (['cover', 'mixed'].includes(kind)) input.representativeImage = 'data:image/jpeg;base64,Y292ZXI=';
    for (const [type, mime] of [['photo', 'image/png'], ['audio', 'audio/webm'], ['video', 'video/mp4']]) {
      if ([type, 'mixed'].includes(kind)) input[type + 'Files'] = [{fileName: type, blob: new Blob([type], {type: mime}), pinId: 'local-pin', stopIndex: 0}];
    }
    const client = harness(rpc);
    await client.api.publishGuidePackage(input);
    const first = await snapshot(input.guideId);
    assert.equal(first.guides[0].status, 'published');
    assert.equal(first.guide_pins.length, 1);
    assert.equal(first.guide_media.length, kind === 'none' ? 0 : kind === 'mixed' ? 4 : 1);
    const uploads = client.control.uploadNumber;
    input.tourName = 'Edited'; input.pins[0].description = 'Updated memo';
    await client.api.publishGuidePackage(input);
    const edited = await snapshot(input.guideId);
    assert.equal(edited.guides[0].title, 'Edited');
    assert.equal(edited.guide_pins[0].description, 'Updated memo');
    assert.equal(edited.guide_media.length, first.guide_media.length);
    assert.equal(client.control.uploadNumber, uploads);
  });
}

test('RPC inspection reports exact client signature, body, settings and effective ACL', async () => {
  const before = await snapshot();
  const report = await inspectRpc();
  assert.equal(report.exact_signature_exists, true); assert.equal(report.public_same_name_count, 1);
  const fn = report.routines.find(r => r.schema === 'public');
  assert.equal(fn.client_signature_matches, true); assert.equal(fn.reviewed_body_matches, true);
  assert.equal(fn.reviewed_settings_match, true); assert.equal(fn.security, 'DEFINER');
  assert.equal(fn.effective_execute.find(r => r.role === 'anon').allowed, false);
  assert.equal(fn.effective_execute.find(r => r.role === 'authenticated').allowed, true);
  assert.ok(!fn.direct_acl.some(r => r.grantee === 'PUBLIC' || r.grantee === 'anon'));
  const verification = await db.exec(fs.readFileSync('supabase/diagnostics/verify_publish_rpc_install.sql','utf8'));
  const summary = verification.flatMap(result => result.rows || []).find(row => 'installed' in row);
  assert.equal(summary.installed,true); assert.equal(summary.signature_matches,true);
  assert.equal(summary.reviewed_body_matches,true); assert.equal(summary.security_mode,'SECURITY DEFINER');
  assert.equal(summary.authenticated_can_execute,true); assert.equal(summary.anon_can_execute,false);
  assert.equal(summary.public_can_execute,false);
  assert.deepEqual(await snapshot(), before);
});

test('new-install guard refuses existing RPC and preserves definition, ACL and data', async () => {
  const before = await inspectRpc(), data = await snapshot();
  await assert.rejects(db.exec(migration), /RPC_ALREADY_EXISTS_REVIEW_REQUIRED/); await db.exec('rollback');
  assert.deepEqual(await inspectRpc(), before); assert.deepEqual(await snapshot(), data);
});

test('inspection and installer detect incompatible same-name overload without overwriting it', async () => {
  const isolated = await PGlite.create();
  try {
    await isolated.exec("create function public.publish_guide_atomic_v1(payload text) returns text language sql as 'select payload';");
    const before = await inspectRpc(isolated);
    assert.equal(before.exact_signature_exists,false); assert.equal(before.public_same_name_count,1);
    assert.equal(before.routines[0].client_signature_matches,false); assert.equal(before.routines[0].reviewed_body_matches,false);
    await assert.rejects(isolated.exec(migration),/RPC_ALREADY_EXISTS_REVIEW_REQUIRED/); await isolated.exec('rollback');
    assert.deepEqual(await inspectRpc(isolated),before);
  } finally { await isolated.close(); }
});

test('SECURITY INVOKER fails republishing with recorded guide_media UPDATE policy absent', async () => {
  const before = await snapshot(); assert.ok(before.guide_media.length > 0);
  await db.exec('alter function public.publish_guide_atomic_v1(jsonb,jsonb,jsonb) security invoker');
  try {
    const inspected = await inspectRpc(); assert.equal(inspected.routines[0].reviewed_settings_match, false);
    const result = await rpc('publish_guide_atomic_v1', {p_guide:before.guides[0],p_pins:before.guide_pins,p_media:before.guide_media},new Map());
    assert.equal(result.error?.code, '42501'); assert.match(result.error.message, /row-level security/);
    assert.deepEqual(await snapshot(), before);
  } finally { await db.exec('alter function public.publish_guide_atomic_v1(jsonb,jsonb,jsonb) security definer'); }
});

test('SQL-looking title is data, forged author is ignored, anonymous execution is denied', async () => {
  const before = await snapshot();
  const args = {p_guide:{...before.guides[0], author_id:randomUUID(), title:"x'); delete from public.profiles; --"},p_pins:before.guide_pins,p_media:before.guide_media};
  const profiles = (await db.query('select * from profiles')).rows;
  const published = await rpc('publish_guide_atomic_v1',args,new Map());
  assert.equal(published.data.guide.author_id,userId); assert.equal(published.data.guide.title,args.p_guide.title);
  assert.deepEqual((await db.query('select * from profiles')).rows,profiles);
  await db.exec('set role anon');
  try { await assert.rejects(db.query('select public.publish_guide_atomic_v1($1,$2,$3)',[args.p_guide,args.p_pins,args.p_media]), /permission denied/); }
  finally { await db.exec('reset role'); }
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  try { assert.match((await rpc('publish_guide_atomic_v1',args,new Map())).error.message,/AUTH_REQUIRED/); }
  finally { await db.query("select set_config('request.jwt.claim.sub',$1,false)",[userId]); }
});
