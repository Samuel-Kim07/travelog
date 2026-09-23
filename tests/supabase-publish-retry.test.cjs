const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync('supabaseClient.js','utf8');
const guideId='11111111-1111-4111-8111-111111111111';
function packageData(){return {guideId,tourName:'Test',creator:'Test',pins:[{id:'local-pin',order:1,name:'Pin',lat:37,lng:127}],audioFiles:[],photoFiles:[],videoFiles:Array.from({length:5},(_,i)=>({fileName:`video_memo_${i+1}.mp4`,blob:new Blob([`video-${i}`],{type:'video/mp4'}),pinId:'local-pin',stopIndex:0})),guideCard:{stops:[]}};}
function harness(){
 const db={guides:[{id:guideId,status:'published',cover_path:'old-cover'}],guide_pins:[{id:'old-pin',guide_id:guideId}],guide_media:[{id:'old-media',guide_id:guideId,pin_id:'old-pin',file_size:1}]};
 const objects=new Map(), events=[], logs=[], progress=[];
 const control={uploadNumber:0,failAt:0,acceptThenFail:false,httpStatus:0,failFinalize:false,failMedia:false,failCleanup:false,missingSession:false,timeout:false};
 const session={user:{id:'test-user'},access_token:'test-token'};
 function from(table){let operation='select',row,filter=()=>true,single=false;
  const q={select(){return q;},eq(k,v){filter=r=>r[k]===v;return q;},in(k,vs){filter=r=>vs.includes(r[k]);return q;},insert(r){operation='insert';row=r;return q;},update(r){operation='update';row=r;return q;},delete(){operation='delete';return q;},single(){single=true;return q;},maybeSingle(){single=true;return q;},then(resolve,reject){return Promise.resolve().then(()=>{
   events.push(`${operation}:${table}`);
   if(operation==='select'){const rows=db[table].filter(filter);return {data:single?rows[0]||null:rows.map(r=>({...r})),error:null};}
   if(operation==='insert'){
    if(table==='guide_media'&&control.failMedia){control.failMedia=false;return {error:{message:'Failed to fetch'}};}
    if(db[table].some(r=>r.id===row.id))return {error:{code:'23505',message:'duplicate'}};
    db[table].push({...row});return {data:{...row},error:null};
   }
   if(operation==='update'){
    if(control.failFinalize)return {error:{message:'Failed to fetch'}};
    const target=db[table].find(filter);Object.assign(target,row);return {data:{...target},error:null};
   }
   if(control.failCleanup)return {error:{message:'cleanup offline'}};
   db[table]=db[table].filter(r=>!filter(r));return {data:null,error:null};
  }).then(resolve,reject);}};return q;
 }
 const sdk={from,auth:{getSession:async()=>({data:{session:control.missingSession?null:session},error:null})},storage:{from:bucket=>({info:async path=>objects.has(bucket+'/'+path)?{data:{size:objects.get(bucket+'/'+path).size}}:{error:{statusCode:'404',code:'NoSuchKey',message:'Object not found'}},getPublicUrl:path=>({data:{publicUrl:'https://test/'+path}})})}};
 const fetch=async(url,options)=>{
  control.uploadNumber++;events.push('upload');
  const key=url.split('/storage/v1/object/')[1];
  if(control.timeout)return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('timed out','AbortError'))));
  if(control.httpStatus)return {ok:false,status:control.httpStatus,json:async()=>({message:'forced HTTP error'})};
  if(control.uploadNumber===control.failAt){if(control.acceptThenFail)objects.set(key,options.body);throw new TypeError('Failed to fetch');}
  assert.equal(options.headers['x-upsert'],'false');objects.set(key,options.body);return {ok:true,status:200};
 };
 const window={crypto:webcrypto,navigator:{onLine:true},supabase:{createClient:()=>sdk}};
 const context=vm.createContext({window,document:{visibilityState:'visible'},console:{warn:(...args)=>logs.push(args)},Blob,URL,TextEncoder,Uint8Array,AbortController,DOMException,setTimeout,clearTimeout,fetch,atob,localStorage:{getItem:()=>null}});
 const hook=`\n buildGuideCardFromSupabase=()=>({stops:[]});window.testApi={uploadBlob,makeStoragePath,describePublishError};\n`;
 const idx=source.lastIndexOf('\n  return {\n    init,');
 // Allow repository CRLF as well.
 const normalized=source.replace(/\r\n/g,'\n');const pos=normalized.lastIndexOf('\n  return {\n    init,');assert.ok(pos>0);
 vm.runInContext(normalized.slice(0,pos)+hook+normalized.slice(pos),context);
 return {api:window.TravelogSupabase,internal:window.testApi,control,db,objects,events,logs,progress,options:{onProgress:p=>progress.push(p)}};
}
test('five-file publish: failure after 3 successes retains old data and retry reuses files/rows',async()=>{
 const h=harness();const p=packageData();h.control.failAt=4;
 await assert.rejects(h.api.publishGuidePackage(p,h.options),e=>e.publishDiagnostic.kind==='network'&&e.publishDiagnostic.stage==='storage-upload'&&e.publishDiagnostic.fileName==='video_memo_4.mp4');
 assert.equal(h.objects.size,3);assert.ok(h.db.guide_pins.some(p=>p.id==='old-pin'));assert.ok(h.db.guide_media.some(p=>p.id==='old-media'));assert.equal(h.db.guides[0].cover_path,'old-cover');assert.ok(!h.events.some(e=>e.startsWith('delete:')));
 assert.match(h.progress.at(-1).detail,/video_memo_4.mp4.*4\/5/);
 const rowsBefore=h.db.guide_pins.length;const result=await h.api.publishGuidePackage(p,h.options);
 assert.equal(result.guideId,guideId);assert.equal(h.objects.size,5);assert.equal(h.control.uploadNumber,6);assert.equal(rowsBefore,2);assert.equal(h.db.guide_pins.length,1);assert.equal(h.db.guide_media.length,5);
 await h.api.publishGuidePackage(p,h.options);assert.equal(h.control.uploadNumber,6);assert.equal(h.db.guide_media.length,5);
});
test('server stored object but response lost: retry performs no duplicate POST',async()=>{
 const h=harness();h.control.failAt=1;h.control.acceptThenFail=true;const p=packageData();
 await assert.rejects(h.api.publishGuidePackage(p));assert.equal(h.objects.size,1);await h.api.publishGuidePackage(p);assert.equal(h.control.uploadNumber,5);
});
test('Storage success followed by media-row failure reuses uploaded object',async()=>{
 const h=harness();h.control.failMedia=true;const p=packageData();await assert.rejects(h.api.publishGuidePackage(p),e=>e.publishDiagnostic.stage==='guide-media-write');await h.api.publishGuidePackage(p);assert.equal(h.control.uploadNumber,5);
});
for(const status of [401,403,413,500])test(`HTTP ${status} remains distinct from browser network error`,async()=>{
 const h=harness();h.control.httpStatus=status;await assert.rejects(h.api.publishGuidePackage(packageData()),e=>e.publishDiagnostic.kind==='http'&&e.publishDiagnostic.status===status);assert.ok(!h.events.some(e=>e.startsWith('delete:')));
});
test('timeout abort is classified and preserves data',async()=>{
 const h=harness();h.control.timeout=true;await assert.rejects(h.internal.uploadBlob('guide-media','test',new Blob(['x'],{type:'video/mp4'}),{timeoutMs:5}),e=>e.publishDiagnostic.kind==='timeout');assert.equal(h.objects.size,0);
});
test('missing/empty original is rejected before any network or DB writes',async()=>{
 const h=harness();const p=packageData();p.videoFiles[0].blob=new Blob([],{type:'video/mp4'});await assert.rejects(h.api.publishGuidePackage(p));assert.equal(h.events.length,0);
});
test('final guide update failure performs no deletions; retry skips all completed uploads',async()=>{
 const h=harness();h.control.failFinalize=true;const p=packageData();await assert.rejects(h.api.publishGuidePackage(p),e=>e.publishDiagnostic.stage==='guide-finalize');assert.ok(!h.events.some(e=>e.startsWith('delete:')));assert.equal(h.db.guides[0].cover_path,'old-cover');h.control.failFinalize=false;await h.api.publishGuidePackage(p);assert.equal(h.control.uploadNumber,5);
});
test('cleanup failure is reported separately after successful publication, retains Storage objects',async()=>{
 const h=harness();h.control.failCleanup=true;const result=await h.api.publishGuidePackage(packageData());assert.equal(result.cleanupPending,true);assert.equal(h.objects.size,5);assert.equal(h.db.guides[0].status,'published');
});
test('same bytes after reload get same path; changed bytes and same filename get new path',async()=>{
 const args={guideId,folder:'video',role:'pin_video',originalName:'same.mp4'};const a=harness(),b=harness();const first=await a.internal.makeStoragePath({...args,blob:new Blob(['a'],{type:'video/mp4'})});assert.equal(first,await b.internal.makeStoragePath({...args,blob:new Blob(['a'],{type:'video/mp4'})}));assert.notEqual(first,await b.internal.makeStoragePath({...args,blob:new Blob(['b'],{type:'video/mp4'})}));
});
test('concurrent final publish is rejected before duplicate upload',async()=>{
 const h=harness();const p=packageData();const first=h.api.publishGuidePackage(p);await assert.rejects(h.api.publishGuidePackage(p),/PUBLISH_ALREADY_IN_PROGRESS/);await first;assert.equal(h.control.uploadNumber,5);
});
test('production publisher has no Apps Script/Drive fallback',()=>{
 const creator=fs.readFileSync('creator.js','utf8');assert.doesNotMatch(creator,/Google\s*Drive|publishPreparedGuideToDrive|script\.google\.com|driveFolderId|APPS_SCRIPT/);
});
test('expired/missing auth is diagnosed without uploading a file',async()=>{
 const h=harness();h.control.missingSession=true;
 await assert.rejects(h.internal.uploadBlob('guide-media','test',new Blob(['x'],{type:'video/mp4'})),e=>e.publishDiagnostic.kind==='auth');assert.equal(h.control.uploadNumber,0);
});
test('unreadable File/Blob is distinguished from fetch failure',async()=>{
 const h=harness();const blob=new Blob(['x'],{type:'video/mp4'});blob.slice=()=>({arrayBuffer:async()=>{throw new DOMException('source is unavailable','NotReadableError');}});
 await assert.rejects(h.internal.makeStoragePath({guideId,folder:'video',role:'pin_video',blob,originalName:'lost.mp4'}),e=>e.publishDiagnostic.kind==='file-read'&&e.publishDiagnostic.stage==='file-fingerprint');assert.equal(h.control.uploadNumber,0);
});
test('duplicate media attachments reuse bytes but retain both media records',async()=>{
 const h=harness();const p=packageData();p.videoFiles=[p.videoFiles[0],{...p.videoFiles[0]}];await h.api.publishGuidePackage(p);assert.equal(h.control.uploadNumber,1);assert.equal(h.db.guide_media.length,2);
});
test('diagnostics never contain authentication header or session token',async()=>{
 const h=harness();h.control.failAt=1;await assert.rejects(h.api.publishGuidePackage(packageData()));assert.doesNotMatch(JSON.stringify(h.logs),/test-token|Bearer|sb_publishable/);
});
