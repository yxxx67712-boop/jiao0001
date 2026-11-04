(function(root){
  'use strict';
  const START='2026-11-05', DAYS=15;
  function ordinal(iso){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw Error('日期格式错误');
    const [y,m,d]=iso.split('-').map(Number);
    const time=Date.UTC(y,m-1,d);
    if(new Date(time).toISOString().slice(0,10)!==iso) throw Error('日期无效');
    return Math.floor(time/86400000);
  }
  function iso(day){return new Date(day*86400000).toISOString().slice(0,10)}
  function addDays(date,n){return iso(ordinal(date)+n)}
  function cycleIndex(date){return Math.max(0,Math.floor((ordinal(date)-ordinal(START))/DAYS))}
  function cycleAt(index){
    const start=addDays(START,index*DAYS),end=addDays(start,DAYS-1);
    return {id:`cycle-${index+1}`,number:index+1,start,end};
  }
  function cycleDay(cycle,date){return Math.max(0,Math.min(DAYS,ordinal(date)-ordinal(cycle.start)+1))}
  function dateToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function checkedDays(records,cycle){return new Set(records.filter(r=>r.subject!=='other'&&r.date>=cycle.start&&r.date<=cycle.end).map(r=>r.date)).size}
  function criterionCount(records,cycle,criterionId,abilityId){return new Set(records.filter(r=>r.reviewed===true&&r.independent===true&&r.subject!=='other'&&r.date>=cycle.start&&r.date<=cycle.end&&(r.abilities||[r.ability]).map(Number).includes(Number(abilityId))&&(r.criteriaIds||[]).includes(criterionId)).map(r=>r.id)).size}
  const api={START,DAYS,ordinal,iso,addDays,cycleIndex,cycleAt,cycleDay,dateToday,checkedDays,criterionCount};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.GrowthCore=api;
})(typeof window!=='undefined'?window:globalThis);

