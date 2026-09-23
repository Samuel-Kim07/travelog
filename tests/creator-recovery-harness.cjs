// Node regression harness: real Creator code with UI rendering and device I/O adapters.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {randomUUID} = require('node:crypto');
const source = fs.readFileSync('creator.js', 'utf8').replace(/\r\n/g,'\n');
const mapSource = fs.readFileSync('map.js', 'utf8');
const key = 'travelog_creator_working_draft_v1';
function harness(storage = new Map(), fail = false) {
 const state = {customCreatedPins: []};
 const listeners = {};
 const elements = new Map();
 const element = id => {
  if (!elements.has(id)) elements.set(id, {value: '', classList: {remove(){}, contains(){return true;}}, toDataURL(){return 'data:image/png;base64,eA==';}});
  return elements.get(id);
 };
 const win = {crypto: {randomUUID}, addEventListener(type,fn){listeners[type]=fn;},
  TravelogApp: {getState:()=>state, showToast(){}},
  TravelogDeviceStorage: {async saveGeneratedFile(){if(fail) throw Error('forced'); return {fileName:'photo.png', kind:'Photo'};}, async loadGeneratedFile(){return new Blob(['x'], {type:'image/png'});}},
  TravelogMapModule: {invalidateSize(){}, addNewCreatorPin(lat,lng,name,description){state.customCreatedPins.push({id:randomUUID(),lat,lng,name,description,sortOrder:state.customCreatedPins.length});}}
 };
 const ctx = vm.createContext({window:win, console:{log(){},warn(){}}, Blob, URL, setTimeout, clearTimeout,
  document:{getElementById:element,addEventListener(type,fn){listeners[type]=fn;},visibilityState:'visible'},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
 const hook = `
 renderCoordinatesList = persistWorkingDraft;
 renderAudioList = renderVideoList = updatePublishPanelCounts = updateStudioModeUi = updateFinalPublishButtonState = () => {};
 canvasToBlob = async () => new Blob(['photo'], {type:'image/png'});
 isStandaloneMemoPinMode = () => false;
 getMemoTitleInputValue = () => 'Photo title';
 restoreMediaItemFromDeviceStorage = async () => true;
 window.testApi = {persistWorkingDraft, restoreWorkingDraft, bindCreatorLifecycle, completePhotoMemoRecording,
 prepare(){draftReady=true;photoMemoCanvasReady=true;tempPinLat=37;tempPinLng=127;},
 switchGuide(){editorGeneration++;}, getGuideId:()=>workingGuideId};
 `;
 const idx=source.indexOf('  return {' + String.fromCharCode(10) + '    persistWorkingDraft,');
 vm.runInContext(source.slice(0,idx)+hook+source.slice(idx),ctx);
 const api=win.testApi; api.prepare(); api.bindCreatorLifecycle();
 return {state,api,storage,win,ctx,fire:type=>listeners[type]?.({type})};
}

module.exports={harness,key,mapSource,vm};
