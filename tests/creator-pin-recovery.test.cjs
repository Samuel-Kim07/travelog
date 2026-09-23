const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness,key,mapSource,vm}=require('./creator-recovery-harness.cjs');
function seed(h){h.state.customCreatedPins=[1,2,3].map(n=>({id:`old-${n}`,name:`pin ${n}`,sortOrder:n-1,lat:37,lng:127})); h.api.persistWorkingDraft(); return JSON.stringify(h.state.customCreatedPins);}
for(const [name,events] of [['A',[]],['B',['orientationchange','resize']],['C',['orientationchange','resize','orientationchange','resize']],['D',['visibilitychange','pagehide','pageshow','visibilitychange']]]) {
 test(`${name}: photo save preserves existing pins across lifecycle events`,async()=>{
  const h=harness(); const before=seed(h); for(const e of events)h.fire(e);
  await h.api.completePhotoMemoRecording();
  assert.equal(h.state.customCreatedPins.length,4);
  assert.equal(JSON.stringify(h.state.customCreatedPins.slice(0,3)),before);
  assert.equal(JSON.parse(h.storage.get(key)).pins.length,4);
 });
}
test('E: device storage failure preserves all existing pins',async()=>{
 const h=harness(new Map(),true);const before=seed(h);await h.api.completePhotoMemoRecording();assert.equal(JSON.stringify(h.state.customCreatedPins),before);
});
test('F: repeated events and full page reconstruction preserve IDs, order, title and guide ID',()=>{
 const h=harness();const before=seed(h);const id=h.api.getGuideId();
 for(let i=0;i<10;i++){h.fire('resize');h.fire('orientationchange');h.fire('pagehide');h.fire('pageshow');}
 const restarted=harness(h.storage);restarted.api.restoreWorkingDraft();
 assert.equal(JSON.stringify(restarted.state.customCreatedPins),before);assert.equal(restarted.api.getGuideId(),id);
});
test('empty/stale recovery cannot replace live pins',()=>{
 const h=harness();const before=seed(h);h.storage.set(key,JSON.stringify({version:1,guideId:'stale',pins:[]}));h.api.restoreWorkingDraft();assert.equal(JSON.stringify(h.state.customCreatedPins),before);
});
test('double save commits once; switching guide during save cannot append into it',async()=>{
 const h=harness();seed(h);await Promise.all([h.api.completePhotoMemoRecording(),h.api.completePhotoMemoRecording()]);assert.equal(h.state.customCreatedPins.length,4);
 const next=harness();const before=seed(next);const pending=next.api.completePhotoMemoRecording();next.api.switchGuide();await pending;assert.equal(JSON.stringify(next.state.customCreatedPins),before);
});
test('map marker clearing does not delete pin data; explicit deletion does',()=>{
 const h=harness();const before=seed(h);
 const start=mapSource.indexOf('  function clearPinMarkersFromMap()');
 const end=mapSource.indexOf('  function updateCreatorPinColor',start);
 vm.runInContext(`let customCreatedMarkers={one:{}};let creatorRouteConnected=true;const markersLayer={removeLayer(){}};function stopCreatorGuidePreview(){}function renderTour(){}\n${mapSource.slice(start,end)}\nclearPinMarkersFromMap();`,h.ctx);
 assert.equal(JSON.stringify(h.state.customCreatedPins),before);
 vm.runInContext('deleteAllGuidePins()',h.ctx);assert.equal(h.state.customCreatedPins.length,0);
 const restarted=harness(h.storage);restarted.api.restoreWorkingDraft();assert.equal(restarted.state.customCreatedPins.length,0);
});

test('G local portion: saved guide identity survives restart and repeated open cannot replace edits',async()=>{
 const h=harness();const before=seed(h);const draft=JSON.parse(h.storage.get(key));draft.editId=draft.guideId;draft.status='unpublished';h.storage.set(key,JSON.stringify(draft));
 const restarted=harness(h.storage);restarted.api.restoreWorkingDraft();
 await restarted.win.TravelogCreatorModule.openSavedGuideEditor(draft.guideId);
 assert.equal(JSON.stringify(restarted.state.customCreatedPins),before);
});
test('pin reorder and rename persist through page reconstruction',()=>{
 const h=harness();seed(h);
 h.win.TravelogCreatorModule.moveCoordinate('old-3',-1);
 h.win.TravelogCreatorModule.updateCreatorPinName('old-1','Renamed');
 const restarted=harness(h.storage);restarted.api.restoreWorkingDraft();
 assert.equal(restarted.state.customCreatedPins.map(p=>p.id).join(','),'old-1,old-3,old-2');
 assert.equal(restarted.state.customCreatedPins[0].name,'Renamed');
});
test('new pin IDs remain unique with identical timestamps',()=>{
 const h=harness();
 const start=mapSource.indexOf('  function addNewCreatorPin('),end=mapSource.indexOf('  function clearPinMarkersFromMap',start);
 vm.runInContext(`const customCreatedMarkers={};const L={marker(){return {bindPopup(){return this;}}}};const markersLayer={addLayer(){}};function createHtmlIcon(){}function applyColorFilterToMarker(){}function escapeHtml(s){return s;}function renderTour(){}function t(s){return s;}Date.now=()=>123;\n${mapSource.slice(start,end)}\nfor(let i=0;i<30;i++)addNewCreatorPin(37,127);`,h.ctx);
 assert.equal(new Set(h.state.customCreatedPins.map(p=>p.id)).size,30);
});
test('new creator pin IDs are database-compatible UUIDs, not custom-pin-prefixed UUIDs',()=>{
 const h=harness();const start=mapSource.indexOf('  function addNewCreatorPin('),end=mapSource.indexOf('  function clearPinMarkersFromMap',start);
 vm.runInContext(`const customCreatedMarkers={};const L={marker(){return {bindPopup(){return this;}}}};const markersLayer={addLayer(){}};function createHtmlIcon(){}function applyColorFilterToMarker(){}function escapeHtml(s){return s;}function renderTour(){}function t(s){return s;}\n${mapSource.slice(start,end)}\naddNewCreatorPin(37,127);`,h.ctx);
 assert.match(h.state.customCreatedPins[0].id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});
