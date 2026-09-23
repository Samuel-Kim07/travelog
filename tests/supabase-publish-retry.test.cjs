const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {harness,packageData,guideId}=require('./publish-harness.cjs');
test('five-file publish: failure after 3 successes retains old data and retry reuses files/rows',async()=>{
 const h=harness();const p=packageData();h.control.failAt=4;
 await assert.rejects(h.api.publishGuidePackage(p,h.options),e=>e.publishDiagnostic.kind==='network'&&e.publishDiagnostic.stage==='storage-upload'&&e.publishDiagnostic.fileName==='video_memo_4.mp4');
 assert.equal(h.objects.size,3);assert.ok(h.db.guide_pins.some(p=>p.id==='old-pin'));assert.ok(h.db.guide_media.some(p=>p.id==='old-media'));assert.equal(h.db.guides[0].cover_path,'old-cover');assert.ok(!h.events.some(e=>e.startsWith('delete:')));
 assert.match(h.progress.at(-1).detail,/video_memo_4.mp4.*4\/5/);
 const rowsBefore=h.db.guide_pins.length;const result=await h.api.publishGuidePackage(p,h.options);
 assert.equal(result.guideId,guideId);assert.equal(h.objects.size,5);assert.equal(h.control.uploadNumber,6);assert.equal(rowsBefore,1);assert.equal(h.db.guide_pins.length,1);assert.equal(h.db.guide_media.length,5);
 await h.api.publishGuidePackage(p,h.options);assert.equal(h.control.uploadNumber,6);assert.equal(h.db.guide_media.length,5);
});
test('server stored object but response lost: retry performs no duplicate POST',async()=>{
 const h=harness();h.control.failAt=1;h.control.acceptThenFail=true;const p=packageData();
 await assert.rejects(h.api.publishGuidePackage(p));assert.equal(h.objects.size,1);await h.api.publishGuidePackage(p);assert.equal(h.control.uploadNumber,5);
});
test('Storage success followed by media-row failure reuses uploaded object',async()=>{
 const h=harness();h.control.failMedia=true;const p=packageData();await assert.rejects(h.api.publishGuidePackage(p),e=>e.publishDiagnostic.stage==='publish-transaction');await h.api.publishGuidePackage(p);assert.equal(h.control.uploadNumber,5);
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
 const h=harness();h.control.failFinalize=true;const p=packageData();await assert.rejects(h.api.publishGuidePackage(p),e=>e.publishDiagnostic.stage==='publish-transaction');assert.ok(!h.events.some(e=>e.startsWith('delete:')));assert.equal(h.db.guides[0].cover_path,'old-cover');h.control.failFinalize=false;await h.api.publishGuidePackage(p);assert.equal(h.control.uploadNumber,5);
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
test('legacy occupied order and pin edits now use a single atomic RPC',async()=>{
 const h=harness();h.db.guide_pins[0].pin_order=1;const p=packageData();await h.api.publishGuidePackage(p);
 const id=h.db.guide_pins[0].id;p.pins[0].description='edited';await h.api.publishGuidePackage(p);
 assert.equal(h.db.guide_pins[0].id,id);assert.equal(h.db.guide_pins[0].description,'edited');
 assert.ok(!h.events.some(e=>/^(insert|update|delete):/.test(e)));
});

test('local duplicate/gapped orders normalize to 1..N without mutating UI pins or IDs',()=>{
 const h=harness();const pins=[{id:'a',order:1},{id:'b',order:2},{id:'c',order:2},{id:'d',order:8}];const before=JSON.stringify(pins);
 const normalized=h.internal.normalizePublishPins(guideId,pins);assert.equal(normalized.map(p=>p.order).join(','),'1,2,3,4');assert.equal(normalized.map(p=>p.id).join(','),'a,b,c,d');assert.equal(JSON.stringify(pins),before);
});
test('duplicate pin identity is rejected before any request',async()=>{
 const h=harness();const p=packageData();p.pins.push({...p.pins[0],order:2});await assert.rejects(h.api.publishGuidePackage(p),/PUBLISH_PIN_ID_MISSING_OR_DUPLICATE/);assert.equal(h.events.length,0);
});
test('transport failure leaves no partial database writes',async()=>{
 const h=harness();h.control.failAt=1;const before=JSON.stringify(h.db);await assert.rejects(h.api.publishGuidePackage(packageData()));assert.equal(JSON.stringify(h.db),before);assert.ok(!h.events.some(e=>e.startsWith('rpc:')));
});
test('raw UUID, prefixed UUID and legacy identities are stable through edits',async()=>{
 const h=harness();const uuid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';assert.equal(await h.internal.stablePinRowId(guideId,uuid),uuid);assert.equal(await h.internal.stablePinRowId(guideId,'custom-pin-'+uuid),uuid);assert.equal(await h.internal.stablePinRowId(guideId,'old'),await harness().internal.stablePinRowId(guideId,'old'));
});
