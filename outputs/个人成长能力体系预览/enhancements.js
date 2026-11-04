(() => {
  'use strict';
  const G=window.GrowthCore;
  const BACKUP_KEY='personal-growth-v1-preview-backup-before-v2-2026-11-04';
  const raw=localStorage.getItem(KEY);
  let backupReady=true;
  try { if(raw!==null&&localStorage.getItem(BACKUP_KEY)===null)localStorage.setItem(BACKUP_KEY,raw); }
  catch(e){ backupReady=false; console.error('旧数据备份失败',e); }
  if(!backupReady){
    const alert=document.createElement('div');alert.className='soft-alert shell';alert.textContent='浏览器旧数据备份失败。新版功能已暂停写入，请先释放浏览器存储空间并重新打开。';document.querySelector('main').prepend(alert);return;
  }

  const presets={
    1:[['完整认知分析',3],['形成一份可用方法',1]],
    2:[['有反证与修正的判断报告',2]],
    3:[['有初稿、修改稿和可理解性反馈的作品',2]]
  };
  const today=()=>G.dateToday();
  const abilityName=id=>A.find(a=>a.id===+id)?.name||`能力 ${id}`;
  const h=s=>esc(s);
  const labelDate=s=>`${s.slice(0,4)}.${s.slice(5,7)}.${s.slice(8,10)}`;
  const ids=r=>Array.isArray(r.abilities)?r.abilities.map(Number):[Number(r.ability)].filter(Number.isFinite);
  const reviewRecords=()=>state.logs.filter(r=>r.reviewed===true&&r.subject!=='other');
  let selectedDate=today(),shownMonth=today().slice(0,7);

  function goalsFor(cycle,abilityId){
    return (presets[abilityId]||[]).map(([label,target],index)=>({id:`${cycle.id}-${abilityId}-${index+1}`,label,target}));
  }
  function newCycle(index,previous){
    const base=G.cycleAt(index);
    const focus=previous?.focus?.slice(0,3)||[1,2,3];
    return {...base,focus,goals:Object.fromEntries(focus.map(id=>[id,goalsFor(base,id)])),archived:false,createdAt:new Date().toISOString()};
  }
  function ensureCycles(){
    if(!Array.isArray(state.cycles))state.cycles=[];
    const n=G.cycleIndex(today());let changed=false;
    for(let i=0;i<=n;i++){
      if(!state.cycles[i]){state.cycles[i]=newCycle(i,state.cycles[i-1]);changed=true}
      if(state.cycles[i].end<today()&&!state.cycles[i].archived){state.cycles[i].archived=true;state.cycles[i].archivedAt=new Date().toISOString();changed=true}
    }
    if(changed)save();return state.cycles[n];
  }
  function cycleForDate(date){
    if(date<G.START)return null;
    const index=G.cycleIndex(date);
    while(state.cycles.length<=index)state.cycles.push(newCycle(state.cycles.length,state.cycles.at(-1)));
    return state.cycles[index];
  }
  function normalizeLogs(){
    let changed=false;
    if(!Array.isArray(state.logs)){state.logs=[];changed=true}
    for(const r of state.logs){
      if(!r.id){r.id=crypto.randomUUID();changed=true}
      if(!Array.isArray(r.abilities)){r.abilities=[Number(r.ability)].filter(Number.isFinite);changed=true}
      if(typeof r.reviewed!=='boolean'){r.reviewed=false;changed=true}
      if(typeof r.independent!=='boolean'){r.independent=false;changed=true}
      if(!Array.isArray(r.criteriaIds)){r.criteriaIds=[];changed=true}
      if(!r.event&&r.context){r.event=r.context;changed=true}
      if(!r.fact&&r.context){r.fact=r.context;changed=true}
    }
    if(changed)save();
  }
  normalizeLogs();
  ensureCycles();

  pages.splice(3,0,['checkin','▦','每日打卡']);
  const checkin=document.createElement('section');checkin.className='section';checkin.id='checkin';
  checkin.innerHTML='<div class="section-head"><div><div class="kicker">DAILY CHECK-IN · 每日打卡</div><h2>每天，都可以留下证据</h2><p class="desc">按事件发生日期查看、补录和整理记录。空白日期只表示没有输入，不代表没有成长。</p></div><button class="primary" id="newDailyRecord">＋ 新增记录</button></div><div class="calendar-shell"><div class="calendar-head"><button id="prevMonth" aria-label="上个月">←</button><h3 id="monthTitle"></h3><button id="nextMonth" aria-label="下个月">→</button></div><div class="weekday"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div><div class="calendar-grid" id="calendarGrid"></div><p class="month-help">有圆点表示这一天有记录；补录会标在事件日期。一天可以保存多条。</p></div><div class="day-detail"><div class="section-head"><div><div class="kicker">SELECTED DAY</div><h2 id="selectedDayTitle"></h2></div><button class="secondary" id="addSelectedDay">＋ 为这天记录</button></div><div id="dayRecords"></div></div>';
  document.querySelector('#audit').before(checkin);
  document.querySelector('#overview .summary').insertAdjacentHTML('afterend','<div class="cycle-grid" id="overviewMetrics"></div>');
  document.querySelector('#audit .cycle').insertAdjacentHTML('afterend','<div class="cycle-grid" id="auditMetrics"></div><div id="focusProgress"></div><div class="block"><div class="block-title"><h3>18 项能力 · 长期证据状态</h3></div><div id="longTermList" class="history-list"></div></div><div class="block"><div class="block-title"><h3>历史训练周期</h3></div><div id="cycleHistory" class="history-list"></div></div>');
  document.querySelector('#records .section-head').insertAdjacentHTML('afterend','<div class="whitecard backup-row"><p>旧记录已在当前浏览器保留原始快照。建议下载一份文件备份。</p><button class="muted-btn" id="downloadBackup">下载数据备份</button></div>');
  document.querySelector('#newLog').onclick=()=>openRecordForm(selectedDate);
  document.querySelector('#newDailyRecord').onclick=()=>openRecordForm(today());
  document.querySelector('#addSelectedDay').onclick=()=>openRecordForm(selectedDate);
  document.querySelector('#prevMonth').onclick=()=>moveMonth(-1);
  document.querySelector('#nextMonth').onclick=()=>moveMonth(1);
  document.querySelector('#downloadBackup').onclick=downloadBackup;

  function saveAndRender(){save();renderLogs();renderCycle();renderCalendar();renderDay()}
  function moveMonth(delta){
    const [y,m]=shownMonth.split('-').map(Number),d=new Date(Date.UTC(y,m-1+delta,1));
    shownMonth=d.toISOString().slice(0,7);renderCalendar();
  }
  function renderCalendar(){
    const [y,m]=shownMonth.split('-').map(Number);
    const first=new Date(Date.UTC(y,m-1,1));
    const start=G.ordinal(first.toISOString().slice(0,10))-((first.getUTCDay()+6)%7);
    const counts={};for(const r of state.logs)counts[r.date]=(counts[r.date]||0)+1;
    $('#monthTitle').textContent=`${y} 年 ${m} 月`;
    $('#calendarGrid').innerHTML=Array.from({length:42},(_,i)=>{
      const date=G.iso(start+i),n=Number(date.slice(8)),outside=date.slice(0,7)!==shownMonth;
      return `<button class="day ${outside?'outside':''} ${date===selectedDate?'selected':''} ${date===today()?'today':''}" data-day="${date}" aria-label="${date}${counts[date]?`，${counts[date]} 条记录`:''}"><span class="day-num">${n}</span><span>${counts[date]?`<i class="day-dot"></i><span class="day-count">${counts[date]} 条</span>`:''}</span></button>`;
    }).join('');
  }
  function recordHtml(r){
    const parts=[['情境',r.context&&r.context!==r.event?r.context:''],['事实',r.fact||r.context],['感受',r.feeling],['认知变化',r.insight],['实际行动',r.action],['行动结果',r.result],['未来计划',r.plan],['相关证据',r.evidence]].filter(([,v])=>v);
    return `<article class="record-card"><div class="row"><h3>${h(r.event||r.context||'成长记录')}</h3><span class="record-meta">${h(r.date)}</span></div><div class="record-badges">${ids(r).map(id=>`<span>${h(abilityName(id))}</span>`).join('')}<span class="${r.reviewed?'':'unreviewed'}">${r.reviewed?'事实已人工核对':'待核验'}</span></div>${parts.map(([k,v])=>`<p><b>${k}：</b>${h(v)}</p>`).join('')}<div class="record-meta">来源：${h(r.source||'个人记录')}</div><div class="actions"><button data-edit-record="${h(r.id)}">编辑</button><button class="danger" data-delete-record="${h(r.id)}">删除</button></div></article>`;
  }
  function renderDay(){
    $('#selectedDayTitle').textContent=selectedDate;
    const records=state.logs.filter(r=>r.date===selectedDate).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
    $('#dayRecords').innerHTML=records.length?records.map(recordHtml).join(''):'<div class="empty">这天还没有记录。没有输入不代表没有成长。</div>';
  }
  renderLogs=()=>{
    const records=[...state.logs].sort((a,b)=>b.date.localeCompare(a.date));
    $('#logList').innerHTML=records.length?records.map(recordHtml).join(''):'<div class="empty">还没有证据记录。可以从每日打卡开始。</div>';
  };

  function assessment(abilityId){
    const records=reviewRecords().filter(r=>r.independent===true&&ids(r).includes(abilityId));
    const dates=records.map(r=>r.date).sort();
    const span=dates.length?G.ordinal(dates.at(-1))-G.ordinal(dates[0]):0;
    const contexts=new Set(records.map(r=>(r.context||r.event||'').trim()).filter(Boolean)).size;
    const hasResult=records.some(r=>Boolean((r.result||'').trim()||(r.evidence||'').trim()));
    const suggested=records.length===0?'未知':records.length>=3&&span>=30&&contexts>=2&&hasResult?'已验证':'待验证';
    return {records:records.length,span,contexts,hasResult,suggested};
  }
  function progress(cycle,abilityId){
    const criteria=cycle.goals?.[abilityId]||[];
    const rows=criteria.map(item=>({ ...item,count:G.criterionCount(state.logs,cycle,item.id,abilityId) }));
    const total=rows.reduce((n,r)=>n+r.target,0),done=rows.reduce((n,r)=>n+Math.min(r.target,r.count),0);
    return {rows,total,done,percent:total?Math.round(done/total*100):null};
  }
  function metricsHtml(cycle){
    const days=G.checkedDays(state.logs,cycle),focus=cycle.focus||[];
    const all=focus.map(id=>progress(cycle,id)),total=all.reduce((n,p)=>n+p.total,0),done=all.reduce((n,p)=>n+p.done,0);
    const pct=total?Math.round(done/total*100):null;
    const observed=A.filter(a=>assessment(a.id).suggested==='已验证').length;
    return `<div class="metric-card"><small>本期打卡完成率</small><b class="tabular">${Math.round(days/15*100)}%</b><small>${days} / 15 天有记录 · 不代表能力提升</small><div class="mini"><span style="width:${days/15*100}%"></span></div></div><div class="metric-card"><small>本期训练目标完成度</small><b class="tabular">${pct===null?'待设定':pct+'%'}</b><small>${total?`${done} / ${total} 项行为标准已核对`:'先设定可观察标准'}</small><div class="mini"><span style="width:${pct||0}%"></span></div></div><div class="metric-card"><small>长期能力证据</small><b class="tabular">${observed} / 18</b><small>达到已验证参考条件，仍需人工确认等级</small><div class="mini"><span style="width:${observed/18*100}%"></span></div></div>`;
  }
  renderCycle=()=>{
    const c=ensureCycles(),day=G.cycleDay(c,today()),remaining=day?16-day:15;
    document.querySelector('.topright b').textContent='V1.1';
    const lead=A.find(a=>a.id===c.focus[0]);
    document.querySelector('#overview .feature .tiny').textContent=`本期核心突破 · ${String(lead.id).padStart(2,'0')}`;
    document.querySelector('#overview .feature h3').textContent=lead.name;
    document.querySelector('#overview .feature p').textContent=lead.practice;
    document.querySelectorAll('#overview .train').forEach((node,i)=>{const id=c.focus[i];node.querySelector('b').textContent=`${String(id).padStart(2,'0')} ${abilityName(id)}`;node.querySelector('small').textContent=['主训练','辅助训练','成果训练'][i]});
    const hero=document.querySelector('.hero-note');
    hero.querySelector('.small').textContent=`当前训练周期 · 第 ${c.number} 期`;
    hero.querySelector('strong').textContent=`${labelDate(c.start)} — ${labelDate(c.end)}`;
    hero.querySelector('span').innerHTML=`${c.focus.map((id,i)=>`${['主训练','辅助训练','成果训练'][i]||'重点训练'}：${h(abilityName(id))}`).join('<br>')}<br>${day?`第 ${day} / 15 天 · 剩余 ${remaining} 天（含今天）`:`将于 ${c.start} 开始 · 共 15 天`}`;
    const box=document.querySelector('#audit .cycle');
    box.querySelector('small').textContent=`第 ${c.number} 期 · ${c.start} 至 ${c.end}`;
    box.querySelector('h3').textContent=day?`第 ${day} 天 · 还剩 ${remaining} 天`:`即将开始 · ${c.start}`;
    box.querySelector('p').textContent=`本期重点：${c.focus.map(abilityName).join('、')}。其他能力继续收集日常证据。结束后自动归档，长期能力记录不会重置。`;
    $('#cycleMeter').style.width=`${day/15*100}%`;
    $('#cycleText').textContent=`本期第 ${day} / 15 天 · 截止 ${c.end}`;
    $('#overviewMetrics').innerHTML=metricsHtml(c);
    $('#auditMetrics').innerHTML=metricsHtml(c);
    renderFocus(c);renderLongTerm();renderHistory();
  };
  function renderFocus(c){
    $('#focusProgress').innerHTML=`<div class="block-title"><h3>本期重点训练能力</h3><button class="linkbtn" id="editFocus">调整本期重点 →</button></div>`+c.focus.map(id=>{
      const p=progress(c,id),a=A.find(x=>x.id===id),s=assessment(id);
      return `<div class="cycle-detail"><div class="row"><h3>${String(id).padStart(2,'0')} ${h(a.name)}</h3><b>${p.percent===null?'待设定':p.percent+'%'}</b></div><p>当前状态：${h(labels[status(a)])} · 证据建议：${s.suggested}。本期目标：${p.rows.length?p.rows.map(x=>`${h(x.label)} × ${x.target}`).join('；'):'尚未设置可观察标准'}</p>${p.rows.map(x=>`<div class="criteria-row"><div>${h(x.label)}<div class="criterion-meta">已核验 ${x.count} / ${x.target} · 还差 ${Math.max(0,x.target-x.count)} 次</div></div><b>${Math.min(x.count,x.target)>=x.target?'已完成':'未完成'}</b></div>`).join('')}<button class="muted-btn" data-goal-editor="${id}">设置行为标准</button></div>`;
    }).join('');
    $('#editFocus').onclick=openFocusEditor;
  }
  function renderLongTerm(){
    $('#longTermList').innerHTML=A.map(a=>{
      const s=assessment(a.id);return `<div class="history-card"><div class="row"><h3>${String(a.id).padStart(2,'0')} ${h(a.name)}</h3><span class="badge ${status(a)}">${s.suggested==='已验证'&&status(a)!=='verified'?'建议已验证 · 待人工确认':s.suggested}</span></div><p>已核验 ${s.records} 次独立行为 · 时间跨度 ${s.span} 天 · ${s.contexts} 种情境 · ${s.hasResult?'有结果或反馈':'结果待补充'}。人工状态：${labels[status(a)]}；等级：${state.level[a.id]?`L${state.level[a.id]}`:'待评定'}。</p></div>`;
    }).join('');
  }
  function renderHistory(){
    $('#cycleHistory').innerHTML=state.cycles.map(c=>`<div class="history-card"><div class="row"><h3>第 ${c.number} 期 · ${c.start} — ${c.end}</h3><span class="badge">${c.archived?'已归档':today()<c.start?'未开始':'进行中'}</span></div><p>重点训练：${c.focus.map(abilityName).join('、')} · ${G.checkedDays(state.logs,c)} / 15 天有记录。历史目标与证据持续保留。</p></div>`).join('');
  }

  const baseOpenModal=openModal;
  openModal=(id,logOnly=false)=>{
    if(logOnly){openRecordForm(today(),null,[Number(id)]);return}
    baseOpenModal(id,false);
    $('#logForm')?.remove();
    const button=document.createElement('button');button.className='primary';button.textContent='＋ 添加成长记录';button.onclick=()=>openRecordForm(today(),null,[Number(id)]);$('#modal').append(button);
    const s=assessment(Number(id));
    $('#modal').insertAdjacentHTML('beforeend',`<div class="soft-alert" style="margin-top:15px">长期证据：已核验 ${s.records} 次，跨 ${s.span} 天、${s.contexts} 种情境。证据建议：${s.suggested}。等级仍由你核定。</div>`);
    const c=ensureCycles();
    if(c.focus.includes(Number(id))){const p=progress(c,Number(id));$('#modal').insertAdjacentHTML('beforeend',`<div class="soft-alert" style="margin-top:10px">本期训练：${p.percent===null?'标准待设定':`${p.percent}% · 已完成 ${p.done}/${p.total} 项行为标准`}。仅计算已核验的独立行为。</div>`)}
    const related=state.logs.filter(r=>ids(r).includes(Number(id))).sort((x,y)=>y.date.localeCompare(x.date));
    $('#modal').insertAdjacentHTML('beforeend',`<h4>关联成长记录 · ${related.length} 条</h4>${related.length?related.slice(0,3).map(recordHtml).join(''):'<p class="hint">还没有关联记录。</p>'}`);
  };

  function openRecordForm(date,existing=null,presetAbilities=[]){
    const chosen=existing?ids(existing):presetAbilities;
    const r=existing||{};
    $('#modal').innerHTML=`<div class="modalhead"><span class="kicker">DAILY RECORD · ${existing?'编辑记录':'新增记录'}</span><button class="close" id="closeRecordForm" aria-label="关闭">×</button></div><h2>${existing?'编辑成长记录':'记录真实发生的事'}</h2><p>事实、感受、认知和行动分开填写。只有你勾选“事实已核对”后，记录才会用于训练目标和长期能力判断。</p><form id="dailyForm" class="check-grid"><label class="field">事件日期<input type="date" name="date" required value="${h(r.date||date)}" max="${today()}"></label><label class="field">记录主体<select name="subject"><option value="self" ${r.subject!=='other'?'selected':''}>我自己的经历</option><option value="other" ${r.subject==='other'?'selected':''}>他人案例（不计入我的能力）</option></select></label><label class="field full">当天发生的事件<input name="event" required maxlength="200" value="${h(r.event||r.context||'')}" placeholder="用一句话说明真实发生了什么"></label><label class="field full">情境／场景<input name="context" maxlength="200" value="${h(r.context||'')}" placeholder="例如工作会议、独自写作；用于跨情境核验"></label><label class="field full">可核对的事实<textarea name="fact" required maxlength="2000" placeholder="发生时间、地点、可观察行为；避免混入猜测">${h(r.fact||r.context||'')}</textarea></label><label class="field full">当时的感受<textarea name="feeling" maxlength="1000" placeholder="这是主观感受，可留空">${h(r.feeling||'')}</textarea></label><label class="field full">认知变化<textarea name="insight" maxlength="1500" placeholder="我如何理解这件事？与原先有什么不同？">${h(r.insight||'')}</textarea></label><label class="field full">实际采取的行动<textarea name="action" maxlength="1500" placeholder="只写已经做的行动；尚未做的写在未来计划">${h(r.action||'')}</textarea></label><label class="field full">行动结果<textarea name="result" maxlength="1500" placeholder="可观察到什么结果或反馈？尚无结果可留空">${h(r.result||'')}</textarea></label><label class="field full">未来计划<textarea name="plan" maxlength="1000" placeholder="尚未发生，不会算作已完成">${h(r.plan||'')}</textarea></label><label class="field full">相关证据<textarea name="evidence" maxlength="1500" placeholder="作品、记录、反馈或证据位置；不要粘贴敏感凭据">${h(r.evidence||'')}</textarea></label><label class="field full">证据来源<input name="source" maxlength="200" value="${h(r.source||'')}" placeholder="日记、作品、他人反馈等"></label><div class="field full"><span>关联能力（可多选）</span><div class="choice-list" id="abilityChoices">${A.map(a=>`<label><input type="checkbox" name="abilities" value="${a.id}" ${chosen.includes(a.id)?'checked':''}>${String(a.id).padStart(2,'0')} ${h(a.name)}</label>`).join('')}</div></div><div class="field full"><span>对应的本期行为标准（可选）</span><div class="choice-list" id="criterionChoices"></div></div><label class="field full"><span><input type="checkbox" name="reviewed" ${r.reviewed?'checked':''}> 我已核对事实和来源，确认这条记录可用于能力评估</span></label><div class="full row"><button type="submit" class="primary">保存记录</button><button type="button" class="secondary" id="cancelDailyForm">取消</button></div></form>`;
    $('#overlay').classList.add('open');
    $('#closeRecordForm').onclick=closeModal;$('#cancelDailyForm').onclick=closeModal;
    const form=$('#dailyForm');
    form.querySelector('.full.row').insertAdjacentHTML('beforebegin',`<label class="field full"><span><input type="checkbox" name="independent" ${r.independent?'checked':''}> 这是一次独立发生的行为（用于重复表现判断）</span></label>`);
    function updateCriteria(){
      const at=form.elements.date.value;
      const cycle=at>=G.START?cycleForDate(at):null;
      const abilities=[...form.querySelectorAll('input[name="abilities"]:checked')].map(x=>Number(x.value));
      const selected=new Set([...form.querySelectorAll('input[name="criteriaIds"]:checked')].map(x=>x.value).concat(r.criteriaIds||[]));
      const options=cycle?abilities.flatMap(id=>(cycle.goals?.[id]||[]).map(item=>`<label><input type="checkbox" name="criteriaIds" value="${h(item.id)}" ${selected.has(item.id)?'checked':''}>${h(item.label)} · ${h(abilityName(id))}</label>`)):[];
      $('#criterionChoices').innerHTML=options.length?options.join(''):'<span class="hint">当前日期和能力没有已设定的训练标准；仍可保存日常证据。</span>';
    }
    form.elements.date.onchange=updateCriteria;
    form.querySelector('#abilityChoices').onchange=updateCriteria;
    updateCriteria();
    form.onsubmit=e=>{
      e.preventDefault();
      const f=new FormData(form),abilities=f.getAll('abilities').map(Number),recordDate=String(f.get('date'));
      if(!abilities.length){toast('请至少选择一项能力');return}
      if(recordDate>today()){toast('实际事件不能记录在未来日期');return}
      const record={id:r.id||crypto.randomUUID(),date:recordDate,event:String(f.get('event')).trim(),fact:String(f.get('fact')).trim(),feeling:String(f.get('feeling')).trim(),insight:String(f.get('insight')).trim(),action:String(f.get('action')).trim(),result:String(f.get('result')).trim(),plan:String(f.get('plan')).trim(),evidence:String(f.get('evidence')).trim(),source:String(f.get('source')).trim(),subject:String(f.get('subject')),abilities,ability:abilities[0],criteriaIds:f.getAll('criteriaIds'),reviewed:f.has('reviewed'),context:String(f.get('context')).trim()||String(f.get('event')).trim(),createdAt:r.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
      record.independent=f.has('independent');
      if(!record.event||!record.fact){toast('事件和事实不能为空');return}
      if(record.subject==='other'){record.reviewed=false;record.independent=false;record.criteriaIds=[]}
      const index=state.logs.findIndex(x=>x.id===record.id);
      if(index>=0)state.logs[index]=record;else state.logs.push(record);
      selectedDate=recordDate;shownMonth=recordDate.slice(0,7);
      saveAndRender();closeModal();toast(existing?'记录已更新':'记录已保存');
    };
  }

  function openFocusEditor(){
    const c=ensureCycles();
    if(c.archived){toast('历史周期已归档');return}
    $('#modal').innerHTML=`<div class="modalhead"><span class="kicker">CYCLE FOCUS</span><button class="close" id="closeFocus" aria-label="关闭">×</button></div><h2>选择本期重点能力</h2><p>建议每期选择三项。其余 18 项能力仍持续收集日常证据。</p><form id="focusForm" class="formgrid">${[0,1,2].map((_,i)=>`<label class="field full">${['主训练','辅助训练','成果训练'][i]}<select name="focus${i}">${A.map(a=>`<option value="${a.id}" ${c.focus[i]===a.id?'selected':''}>${String(a.id).padStart(2,'0')} ${h(a.name)}</option>`).join('')}</select></label>`).join('')}<div class="full"><button class="primary" type="submit">保存本期重点</button></div></form><p class="hint">新选能力若没有默认标准，请在能力卡片中设置行为标准。</p>`;
    $('#overlay').classList.add('open');$('#closeFocus').onclick=closeModal;
    $('#focusForm').onsubmit=e=>{
      e.preventDefault();const f=new FormData(e.target),focus=[0,1,2].map(i=>Number(f.get(`focus${i}`)));
      if(new Set(focus).size!==3){toast('请选择三项不同的能力');return}
      c.focus=focus;c.goals=c.goals||{};
      for(const id of focus)if(!c.goals[id])c.goals[id]=goalsFor(c,id);
      saveAndRender();closeModal();toast('本期重点已更新');
    };
  }
  function openGoalEditor(abilityId){
    const c=ensureCycles();if(c.archived)return;
    const current=c.goals?.[abilityId]||[];
    $('#modal').innerHTML=`<div class="modalhead"><span class="kicker">OBSERVABLE GOALS</span><button class="close" id="closeGoals" aria-label="关闭">×</button></div><h2>${h(abilityName(abilityId))}</h2><p>设定可观察、可计数的行为标准。只有关联了标准且经人工核对的真实记录才计入完成度。</p><form id="goalsForm"><div id="goalRows">${(current.length?current:[{id:'',label:'',target:1}]).map((x,i)=>goalRow(x,i)).join('')}</div><div class="row"><button class="secondary" type="button" id="addGoalRow">＋ 添加标准</button><button class="primary" type="submit">保存标准</button></div></form>`;
    $('#overlay').classList.add('open');$('#closeGoals').onclick=closeModal;
    $('#addGoalRow').onclick=()=>$('#goalRows').insertAdjacentHTML('beforeend',goalRow({id:'',label:'',target:1},$('#goalRows').children.length));
    $('#goalsForm').onsubmit=e=>{
      e.preventDefault();const rows=[...$('#goalRows').children].map(row=>({id:row.dataset.id||`${c.id}-${abilityId}-${crypto.randomUUID().slice(0,8)}`,label:row.querySelector('[name="goalLabel"]').value.trim(),target:Number(row.querySelector('[name="goalTarget"]').value)})).filter(x=>x.label);
      if(!rows.length||rows.some(x=>!Number.isInteger(x.target)||x.target<1||x.target>30)){toast('至少填写一项标准，目标次数为 1–30');return}
      c.goals[abilityId]=rows;saveAndRender();closeModal();toast('行为标准已保存');
    };
  }
  function goalRow(item){return `<div class="goal-form-row" data-id="${h(item.id)}"><input name="goalLabel" maxlength="100" value="${h(item.label)}" placeholder="例如完成有结果反馈的实践"><input name="goalTarget" type="number" min="1" max="30" value="${item.target}" aria-label="目标次数"></div>`}
  function downloadBackup(){
    const data={format:'personal-growth-backup-v2',exportedAt:new Date().toISOString(),originalLocalStorage:localStorage.getItem(BACKUP_KEY),currentState:state};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`个人成长能力体系备份_${today()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('已开始下载数据备份');
  }

  document.addEventListener('click',e=>{
    const day=e.target.closest('[data-day]');
    if(day){selectedDate=day.dataset.day;shownMonth=selectedDate.slice(0,7);renderCalendar();renderDay();return}
    const edit=e.target.closest('[data-edit-record]');
    if(edit){const r=state.logs.find(x=>x.id===edit.dataset.editRecord);if(r)openRecordForm(r.date,r);return}
    const remove=e.target.closest('[data-delete-record]');
    if(remove){const r=state.logs.find(x=>x.id===remove.dataset.deleteRecord);if(!r)return;if(!confirm(`删除 ${r.date} 的这条记录？它会移入本浏览器的回收数据。`))return;state.trash=state.trash||[];state.trash.push({...r,deletedAt:new Date().toISOString()});state.logs=state.logs.filter(x=>x.id!==r.id);saveAndRender();toast('记录已删除');return}
    const goal=e.target.closest('[data-goal-editor]');if(goal)openGoalEditor(Number(goal.dataset.goalEditor));
  });
  renderNav();renderLogs();renderCycle();renderCalendar();renderDay();
  let lastDay=today();
  setInterval(()=>{if(today()!==lastDay){lastDay=today();renderCycle();renderCalendar();renderDay()}},60000);
})();

