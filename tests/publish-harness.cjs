const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync('supabaseClient.js','utf8');
const guideId='11111111-1111-4111-8111-111111111111';
function packageData(){return {guideId,tourName:'Test',creator:'Test',pins:[{id:'local-pin',order:1,name:'Pin',lat:37,lng:127}],audioFiles:[],photoFiles:[],videoFiles:Array.from({length:5},(_,i)=>({fileName:`video_memo_${i+1}.mp4`,blob:new Blob([`video-${i}`],{type:'video/mp4'}),pinId:'local-pin',stopIndex:0})),guideCard:{stops:[]}};}
function harness(rpcHandler){
 const db={guides:[{id:guideId,status:'published',author_id:'22222222-2222-4222-8222-222222222222',cover_path:'old-cover'}],guide_pins:[{id:'old-pin',guide_id:guideId,pin_order:99}],guide_media:[{id:'old-media',guide_id:guideId,pin_id:'old-pin',file_size:1}]};
 const objects=new Map(), events=[], logs=[], progress=[];
 const control={uploadNumber:0,failAt:0,acceptThenFail:false,httpStatus:0,failFinalize:false,failMedia:false,failCleanup:false,missingSession:false,timeout:false};
 const session={user:{id:'22222222-2222-4222-8222-222222222222'},access_token:'test-token'};
 function from(table){let operation='select',row,filter=()=>true,single=false;
  const q={select(){return q;},eq(k,v){filter=r=>r[k]===v;return q;},in(k,vs){filter=r=>vs.includes(r[k]);return q;},insert(r){operation='insert';row=r;return q;},update(r){operation='update';row=r;return q;},delete(){operation='delete';return q;},single(){single=true;return q;},maybeSingle(){single=true;return q;},then(resolve,reject){return Promise.resolve().then(()=>{
   events.push(`${operation}:${table}`);
   if(operation==='select'){const rows=db[table].filter(filter);return {data:single?rows[0]||null:rows.map(r=>({...r})),error:null};}
   if(operation==='insert'){
    if(table==='guide_media'&&control.failMedia){control.failMedia=false;return {error:{message:'Failed to fetch'}};}
    if(table==='guide_pins' && db[table].some(r=>r.guide_id===row.guide_id && r.pin_order===row.pin_order))return {status:409,error:{code:'23505',message:'duplicate key value violates unique constraint "guide_pins_guide_id_pin_order_key"'}};
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
 const rpc = async (name, args) => {
  events.push('rpc:'+name);
  if(rpcHandler) return rpcHandler(name,args,objects);
  if(control.failFinalize || control.failMedia) {control.failMedia=false;return {error:{message:'Failed to fetch'}};}
  db.guides=[{...args.p_guide}];db.guide_pins=args.p_pins.map(p=>({...p}));db.guide_media=args.p_media.map(m=>({...m}));
  return {data:{guide:db.guides[0],pins:db.guide_pins,media:db.guide_media}};
 };
 const sdk={from,rpc,auth:{getSession:async()=>({data:{session:control.missingSession?null:session},error:null})},storage:{from:bucket=>({info:async path=>objects.has(bucket+'/'+path)?{data:{size:objects.get(bucket+'/'+path).size}}:{error:{statusCode:'404',code:'NoSuchKey',message:'Object not found'}},getPublicUrl:path=>({data:{publicUrl:'https://test/'+path}})})}};
 const fetch=async(url,options)=>{
  control.uploadNumber++;events.push('upload');
  const key=url.split('/storage/v1/object/')[1];
  if(control.timeout)return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('timed out','AbortError'))));
  if(control.httpStatus)return {ok:false,status:control.httpStatus,json:async()=>({message:'forced HTTP error'})};
  if(control.uploadNumber===control.failAt){if(control.acceptThenFail)objects.set(key,options.body);throw new TypeError('Failed to fetch');}
  assert.equal(options.headers['x-upsert'],'false');objects.set(key,options.body);return {ok:true,status:200};
 };
 const window={crypto:webcrypto,navigator:{onLine:true},supabase:{createClient:()=>sdk}};
 const context=vm.createContext({window,document:{visibilityState:'visible'},console:{warn:(...args)=>logs.push(args),info:(...args)=>logs.push(args),table:rows=>logs.push(rows)},Blob,URL,TextEncoder,Uint8Array,AbortController,DOMException,setTimeout,clearTimeout,fetch,atob,localStorage:{getItem:()=>null}});
 const hook=`\n buildGuideCardFromSupabase=()=>({stops:[]});window.testApi={uploadBlob,makeStoragePath,describePublishError,normalizePublishPins,stablePublishRowId,stablePinRowId};\n`;
 const idx=source.lastIndexOf('\n  return {\n    init,');
 // Allow repository CRLF as well.
 const normalized=source.replace(/\r\n/g,'\n');const pos=normalized.lastIndexOf('\n  return {\n    init,');assert.ok(pos>0);
 vm.runInContext(normalized.slice(0,pos)+hook+normalized.slice(pos),context);
 return {api:window.TravelogSupabase,internal:window.testApi,control,db,objects,events,logs,progress,options:{onProgress:p=>progress.push(p)}};
}

module.exports={harness,packageData,guideId};
