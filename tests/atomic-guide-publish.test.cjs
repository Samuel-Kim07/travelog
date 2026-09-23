// Real PostgreSQL (PGlite), production columns/constraints/RLS from the supplied catalog.
// Storage transport and browser lifecycle are adapters; no live Supabase data is touched.
const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {randomUUID} = require('node:crypto');
const {PGlite} = require(process.env.TRAVELOG_PGLITE_MODULE || '@electric-sql/pglite');
const {harness, packageData, guideId} = require('./publish-harness.cjs');
const {harness: creatorHarness} = require('./creator-recovery-harness.cjs');
const catalog = JSON.parse(fs.readFileSync('tests/fixtures/publish-schema-20260923.json','utf8').replace(/^\uFEFF/,''));
const migration = fs.readFileSync('supabase/migrations/202609230001_atomic_guide_publish.sql','utf8');
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
  await db.exec(migration);
  await db.exec(migration); // Reapplying migration changes no data or existing constraints.
  await db.query("select set_config('request.jwt.claim.sub', $1, false)",[userId]);
});
after(async()=>{await db?.close();});
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
  assert.ok(!h.events.some(e=>/^(insert|update|delete):/.test(e)));
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
test('new guide upload fails before commit: no partial guide/pin/media; retry uses stored files',async()=>{
  const input={...packageData(),guideId:randomUUID()};const client=harness(rpc);client.control.failAt=4;
  await assert.rejects(client.api.publishGuidePackage(input));assert.deepEqual(await snapshot(input.guideId),{guides:[],guide_pins:[],guide_media:[]});
  await client.api.publishGuidePackage(input);await client.api.publishGuidePackage(input);
  const s=await snapshot(input.guideId);assert.equal(s.guides.length,1);assert.equal(s.guide_pins.length,1);assert.equal(s.guide_media.length,5);assert.equal(client.control.uploadNumber,6);
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
test('upload policy permits own namespace without guide row, denies foreign namespace; RPC is not public',async()=>{
  const gid=randomUUID();await db.exec('set role authenticated');
  try {
    await db.query('insert into storage.objects values($1,$2)',['guide-media',`guides/${gid}/uploads/${userId}/video/a.mp4`]);
    assert.equal((await db.query('select * from storage.objects where name=$1',[`guides/${gid}/uploads/${userId}/video/a.mp4`])).rows.length,1);
    await assert.rejects(db.query('insert into storage.objects values($1,$2)',['guide-media',`guides/${gid}/uploads/${randomUUID()}/video/b.mp4`]),/row-level security/);
  }finally{await db.exec('reset role');}
  const perms=(await db.query("select has_function_privilege('anon','public.publish_guide_atomic_v1(jsonb,jsonb,jsonb)','EXECUTE') as anon")).rows[0];assert.equal(perms.anon,false);
});
test('new guide failure after pin insert rolls back the new guide too',async()=>{
  const input=fourPins();input.guideId=randomUUID();
  await db.exec(`create function public.test_fail_insert() returns trigger language plpgsql as $$ begin raise exception 'FORCED_PIN_INSERT'; end; $$;
    create trigger fail_insert after insert on guide_pins for each row execute function test_fail_insert();`);
  try{await assert.rejects(harness(rpc).api.publishGuidePackage(input),/FORCED_PIN_INSERT/);}
  finally{await db.exec('drop trigger fail_insert on guide_pins');}
  assert.deepEqual(await snapshot(input.guideId),{guides:[],guide_pins:[],guide_media:[]});
  await harness(rpc).api.publishGuidePackage(input);assert.equal((await snapshot(input.guideId)).guide_pins.length,4);
});
test('an existing object in another namespace cannot be attached to a new guide',async()=>{
  const input=fourPins();input.guideId=randomUUID();let args;
  await harness(async(name,payload)=>{args=payload;return {error:{message:'capture only'}};}).api.publishGuidePackage(input).catch(()=>{});
  const foreignPath=`guides/${input.guideId}/video/not-owned.mp4`;
  await db.query('insert into storage.objects values($1,$2)',['guide-media',foreignPath]);
  args.p_media=[{id:randomUUID(),guide_id:input.guideId,pin_id:input.pins[0].id,media_role:'pin_video',bucket_name:'guide-media',storage_path:foreignPath,mime_type:'video/mp4',file_size:5}];
  assert.match((await rpc('publish_guide_atomic_v1',args,new Map())).error.message,/INVALID_OR_MISSING/);
  assert.deepEqual(await snapshot(input.guideId),{guides:[],guide_pins:[],guide_media:[]});
});
test('legacy successful file from a partial publish is reused without upload or manual cleanup',async()=>{
  const input={...packageData(),videoFiles:[packageData().videoFiles[0]]};const client=harness(rpc);
  const file=input.videoFiles[0];const modern=await client.internal.makeStoragePath({guideId,userId,folder:'video',role:'pin_video',originalName:file.fileName,blob:file.blob});
  const legacy=modern.replace(`/uploads/${userId}`,'');client.objects.set('guide-media/'+legacy,file.blob);
  await client.api.publishGuidePackage(input);assert.equal(client.control.uploadNumber,0);assert.equal((await snapshot()).guide_media[0].storage_path,legacy);
});
