/* NextStep cloud merge utilities. No user data leaves the browser unless signed in. */
(function(root){
'use strict';
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const arr=v=>Array.isArray(v)?v:[];
const when=v=>{
  if(v==='before-tracker')return 1;
  if(typeof v==='string'&&/^\d{4}-\d\d-\d\d$/.test(v)){const n=Date.parse(v+'T12:00:00Z');return Number.isFinite(n)?n:1}
  return 1;
};
const stamp=x=>Math.max(0,Number(x)||0);
const keyOrder=o=>Object.keys(obj(o)).sort();
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const json=v=>JSON.stringify(canonical(v));
function normalize(state){
 const s=obj(state),m=obj(s.syncMeta),done=obj(s.completed),skip=obj(s.skipped);
 const marks={};
 for(const id of new Set([...keyOrder(done),...keyOrder(skip),...keyOrder(m.marks)])){
   let z=obj(obj(m.marks)[id]);
   marks[id]= z.state&&['done','skip','todo'].includes(z.state)
     ? {state:z.state,at:stamp(z.at)}
     : done[id]?{state:'done',at:when(done[id]?.date)}
       :skip[id]?{state:'skip',at:1}:{state:'todo',at:0};
 }
 return {
  marks,completed:done,skipped:skip,overrides:obj(s.overrides),
  overrideTimes:obj(m.overrideTimes), notes:obj(s.notes),
  logs:arr(s.logs).filter(l=>l&&l.id), logDeletes:obj(m.logDeletes),
  custom:arr(s.custom).filter(x=>x&&x.id), settings:obj(s.settings),
  settingsAt:stamp(m.settingsAt)
 };
}
function chooseMark(a,b){
 if(!a)return b;if(!b)return a;
 if(stamp(a.at)!==stamp(b.at))return stamp(a.at)>stamp(b.at)?a:b;
 const priority={todo:0,skip:1,done:2};
 return (priority[a.state]||0)>=(priority[b.state]||0)?a:b;
}
function merge(one,two){
 const a=normalize(one),b=normalize(two),marks={},completed={},skipped={};
 for(const id of new Set([...Object.keys(a.marks),...Object.keys(b.marks)])){
   const k=chooseMark(a.marks[id],b.marks[id]);marks[id]=k;
   if(k.state==='done'){
      const old=obj(a.completed[id]),neu=obj(b.completed[id]);
      const chosen=b.marks[id]===k?neu:old;
      completed[id]=Object.keys(chosen).length?chosen:{date:new Date(k.at||Date.now()).toISOString().slice(0,10)};
   } else if(k.state==='skip')skipped[id]=true;
 }
 const overrides={},overrideTimes={};
 for(const id of new Set([...Object.keys(a.overrides),...Object.keys(b.overrides)])){
   const ta=stamp(a.overrideTimes[id]),tb=stamp(b.overrideTimes[id]);
   const takeB=!(id in a.overrides)||(id in b.overrides&&tb>=ta);
   overrides[id]=takeB?b.overrides[id]:a.overrides[id];
   overrideTimes[id]=Math.max(ta,tb);
 }
 const logDeletes={};
 for(const id of new Set([...Object.keys(a.logDeletes),...Object.keys(b.logDeletes)]))
    logDeletes[id]=Math.max(stamp(a.logDeletes[id]),stamp(b.logDeletes[id]));
 const logsById=new Map();
 for(const log of [...a.logs,...b.logs]){
   if(stamp(logDeletes[log.id])>0)continue;
   if(!logsById.has(String(log.id)))logsById.set(String(log.id),log);
 }
 const customById=new Map();
 for(const task of [...a.custom,...b.custom])customById.set(String(task.id),task);
 const latestSettings=(b.settingsAt>a.settingsAt||!Object.keys(a.settings).length)?b.settings:a.settings;
 return {
  version:1,pathV2:2,completed,skipped,overrides,
  notes:{...a.notes,...b.notes},
  logs:[...logsById.values()].sort((x,y)=>(x.date||'').localeCompare(y.date||'')||String(x.id).localeCompare(String(y.id))),
  custom:[...customById.values()].sort((x,y)=>String(x.id).localeCompare(String(y.id))),
  settings:latestSettings,
  syncMeta:{marks,overrideTimes,settingsAt:Math.max(a.settingsAt,b.settingsAt),logDeletes}
 };
}
function project(s){
  const x=obj(s);
  return {version:1,pathV2:2,completed:obj(x.completed),skipped:obj(x.skipped),
    overrides:obj(x.overrides),notes:obj(x.notes),logs:arr(x.logs),
    custom:arr(x.custom),settings:obj(x.settings),syncMeta:obj(x.syncMeta)};
}
function equal(a,b){return json(project(a))===json(project(b))}
root.NextStepMerge=Object.freeze({merge,project,normalize,equal});
})(window);
