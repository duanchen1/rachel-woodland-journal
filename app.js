const $ = (selector, root = document) => root.querySelector(selector);
const PAGES = {overview:['每日概览','grid'], meals:['饮食日记','meal'], body:['身体记录','activity'], trends:['健康趋势','trend']};
const state = {
  page:'overview', date:localKey(), demo:true, personal:[], samples:sampleJournal(localKey()),
  mealFilter:'全部', bodyFilter:'all', metric:'energy', days:7, storageOK:true
};
function allRecords() { return state.demo ? state.samples : state.personal; }
function currentPage() { const key = location.hash.slice(1); return Object.hasOwn(PAGES,key) ? key : 'overview'; }
function initProfile() {
  try {
    state.personal = readRecords();
    const preference = localStorage.getItem(PREF_KEY);
    state.demo = preference === 'sample' || (!preference && !state.personal.length);
  } catch { state.storageOK = false; state.demo = true; }
}
let toastTimer;
function notify(message) {
  const toast = $('#toast');
  toast.textContent = message; toast.classList.add('shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('shown'), 3600);
}
function profileHTML() {
  return `<span class="avatar">R</span><span class="profile-name">Rachel</span>${icon('down',14)}`;
}
function profileMenu() {
  return `<div class="menu-heading">Rachel 的手记</div>
    <button type="button" data-action="personal">${icon('book')}我的手记${!state.demo ? icon('check',16) : ''}</button>
    <button type="button" data-action="sample">${icon('layers')}示例手记${state.demo ? icon('check',16) : ''}</button>`;
}
function switchMode(demo) {
  state.demo = demo;
  try { localStorage.setItem(PREF_KEY, demo ? 'sample' : 'personal'); }
  catch { state.storageOK = false; }
  closePopovers(); render();
}
function closePopovers() {
  $('#profile-menu').hidden = true;
  $('#profile-button').setAttribute('aria-expanded','false');
  const calendar = $('#calendar-pop');
  if (calendar) { calendar.hidden = true; $('#date-button')?.setAttribute('aria-expanded','false'); }
}
function dateControl() {
  const label = state.date === localKey() ? '今天' : dateLabel(state.date);
  return `<div class="date-wrap">
    <div class="date-nav">
      <button type="button" class="date-step" data-action="day-prev" aria-label="前一天">${icon('prev',15)}</button>
      <button type="button" id="date-button" data-action="calendar" aria-expanded="false" aria-controls="calendar-pop" aria-label="选择日期，当前为${esc(dateLabel(state.date,true))}">${icon('calendar',16)}${label}${icon('down',12)}</button>
      <button type="button" class="date-step" data-action="day-next" aria-label="后一天" ${state.date >= localKey() ? 'disabled' : ''}>${icon('next',15)}</button>
    </div><div id="calendar-pop" class="popover calendar-pop" hidden></div></div>`;
}
let visibleMonth;
function fillCalendar() {
  const day = dateObject(visibleMonth), year = day.getFullYear(), month = day.getMonth();
  const monthStart = new Date(year, month, 1, 12);
  const startOffset = (monthStart.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  let cells = '<span></span>'.repeat(startOffset);
  for (let i = 1; i <= days; i++) {
    const key = localKey(new Date(year, month, i, 12));
    const selected = key === state.date, today = key === localKey();
    cells += `<button type="button" data-pick="${key}" class="${selected ? 'selected' : today ? 'is-today' : ''}" aria-label="${esc(dateLabel(key,true))}" aria-pressed="${selected}" ${key > localKey() ? 'disabled' : ''}>${i}</button>`;
  }
  $('#calendar-pop').innerHTML = `<div class="cal-head"><button class="icon-btn" type="button" data-action="month-prev" aria-label="上个月">${icon('prev',16)}</button><b>${year}年${month + 1}月</b><button class="icon-btn" type="button" data-action="month-next" aria-label="下个月" ${visibleMonth.slice(0,7) >= localKey().slice(0,7) ? 'disabled' : ''}>${icon('next',16)}</button></div><div class="cal-grid">${['一','二','三','四','五','六','日'].map(v=>`<small>${v}</small>`).join('')}${cells}</div><button type="button" class="cal-today" data-pick="${localKey()}">回到今天</button>`;
}
function changeDay(key) {
  if (!validDate(key) || key > localKey()) return;
  state.date = key; closePopovers(); render();
}
function modeTag() {
  return state.demo ? `<button class="sample-tag" type="button" data-action="mode-info" aria-label="示例数据，查看或切换到我的手记"><span></span>示例手记</button>` : '';
}
function statCard(metric, day) {
  const m = METRICS[metric], val = day[metric], counts = day.counts[metric];
  const foot = !counts ? '尚未记录' : metric === 'energy' ? `已记录 ${counts} 笔饮食` : metric === 'water' ? `已记录 ${counts} 次饮水` : metric === 'exercise' ? `已记录 ${counts} 次运动` : `测量于 ${day.records.filter(r=>r.type==='weight').at(-1).time}`;
  return `<button class="stat-card" type="button" data-stat="${metric}" aria-label="${m.label}，${val === null ? '尚未记录' : number(val) + m.unit}，添加记录" style="--accent:${m.color};--tint:${m.tint}">
    <span class="stat-label"><span class="icon-well">${icon(m.symbol,18)}</span>${m.label}<span class="stat-plus">${icon('plus',13)}</span></span>
    <span class="stat-center"><strong>${val === null ? '—' : number(val)}</strong><span>${m.unit}</span></span>
    <span class="stat-foot">${foot}</span><canvas class="spark" data-metric="${metric}" data-days="7" aria-hidden="true"></canvas>
  </button>`;
}
function emptyState(symbol, heading, buttonText, action) {
  return `<div class="empty-state"><span class="empty-icon">${icon(symbol,24)}</span><strong>${heading}</strong>${buttonText ? `<button class="text-link" type="button" data-action="${action}">${icon('plus',14)}${buttonText}</button>` : ''}</div>`;
}
function mealBadge(slot) { return `<span class="meal-badge meal-${MEALS.indexOf(slot)}">${esc(slot)}</span>`; }
function mealRow(record) {
  const picture = state.demo && MEAL_PICTURES[record.picture];
  const thumb = picture ? `<img src="${picture}" alt="" width="76" height="58">` : `<span class="thumb-placeholder color-${MEALS.indexOf(record.slot)}">${icon('bowl',27)}</span>`;
  return `<button class="meal-row" type="button" data-record="${esc(record.id)}">
    <span class="meal-thumb">${thumb}</span><span class="meal-copy"><span class="row-meta">${mealBadge(record.slot)}<span class="time">${esc(record.time)}</span></span><strong>${esc(recordTitle(record))}</strong></span>
    <span class="meal-kcal"><b>${number(mealCalories(record.items))}</b><small>千卡</small></span>${icon('next',14)}
  </button>`;
}
function rangeSelect() {
  return `<label class="range-select"><span class="sr">趋势时间范围</span><select data-range>${[7,14,30].map(n=>`<option value="${n}" ${state.days===n?'selected':''}>近 ${n} 天</option>`).join('')}</select>${icon('down',13)}</label>`;
}
function chartPanel(records, metric, detailed = false) {
  const m=METRICS[metric], pts=pointsFor(records, state.date, state.days,metric), valid=pts.filter(p=>p.value!==null);
  const mean = valid.length ? valid.reduce((sum,p)=>sum+p.value,0)/valid.length : null;
  const heading = metric === 'energy' ? '热量趋势' : m.label + '趋势';
  return `<section class="panel graph-panel${detailed ? ' full-chart' : ''}">
    <div class="panel-head"><h${detailed?2:3}>${heading}</h${detailed?2:3}>${rangeSelect()}</div>
    <div class="graph-key"><span><i class="legend-dot" style="background:${metric==='energy'?'#57764c':m.color}"></i>${metric==='energy'?'每日摄入':m.label}（${m.unit}）</span>${mean===null?'':`<span>有记录日均值 <b>${number(metric==='weight'?mean:Math.round(mean))}</b></span>`}</div>
    ${valid.length ? `<div class="graph-wrap"><canvas tabindex="0" role="img" data-metric="${metric}" data-days="${state.days}"></canvas><div class="graph-tooltip" hidden></div></div>` : emptyState('trend','所选时段还没有记录',null,null)}
  </section>`;
}
function overview(records, day) {
  return `<div class="section-head"><div class="heading-group"><h2>每日概览</h2>${modeTag()}</div>${dateControl()}</div>
    <div class="stats-grid">${Object.keys(METRICS).map(k=>statCard(k,day)).join('')}</div>
    <div class="dashboard-grid"><section class="panel meal-panel">
      <div class="panel-head"><h3>饮食日记</h3><a class="text-link" href="#meals">查看全部${icon('arrow',15)}</a></div>
      ${day.meals.length ? `<div class="meal-list">${day.meals.slice(0,3).map(mealRow).join('')}</div>` : emptyState('bowl','这一天还没有饮食记录','记录第一餐','new-meal')}
    </section>${chartPanel(records,'energy')}</div>${intakePanel(day)}`;
}
function viewHeading(page, action, label) {
  return `<div class="subpage-head"><div><div class="sub-date">${icon('calendar',15)}${dateLabel(state.date,true)} · ${weekday(state.date)}</div><div class="heading-group"><h1>${PAGES[page][0]}</h1>${modeTag()}</div></div>
    <div class="view-tools">${dateControl()}${action?`<button type="button" class="button primary" data-action="${action}">${icon('plus',16)}${label}</button>`:''}</div></div>`;
}
function mealPage(day) {
  const filtered = day.meals.filter(r=>state.mealFilter==='全部' || r.slot===state.mealFilter);
  const colors=['#b49066','#71885c','#697b84','#a77c85'];
  const groups=MEALS.map(slot=>day.meals.filter(r=>r.slot===slot).reduce((sum,r)=>sum+mealCalories(r.items),0));
  return `${viewHeading('meals','new-meal','记录饮食')}<div class="dashboard-grid secondary-grid">
    <section class="panel"><div class="panel-head"><h2>当日饮食</h2><small>${day.meals.length} 笔记录</small></div>
    <div class="filters">${['全部',...MEALS].map(name=>`<button type="button" data-meal-filter="${name}" aria-pressed="${state.mealFilter===name}">${name}</button>`).join('')}</div>
    ${filtered.length?filtered.map(mealRow).join(''):emptyState('bowl','这一天暂无'+(state.mealFilter==='全部'?'饮食':state.mealFilter)+'记录','记录饮食','new-meal')}</section>
    <section class="panel distribution"><div class="panel-head"><h2>各餐热量</h2>${icon('meal',19)}</div><div class="big-value">${number(day.energy||0)} <small>千卡</small></div>
    <div class="stack-bar">${groups.map((value,i)=>`<span style="width:${day.energy?value/day.energy*100:0}%;background:${colors[i]}"></span>`).join('')}</div>
    ${MEALS.map((slot,i)=>`<div class="dist-row"><span><i class="legend-dot" style="background:${colors[i]}"></i>${slot}</span><b>${number(groups[i])} <small>千卡</small></b></div>`).join('')}
    </section></div>${intakePanel(day)}`;
}
function healthRow(record) {
  const m=METRICS[record.type];
  return `<button type="button" class="health-row" data-record="${esc(record.id)}"><span class="health-icon" style="color:${m.color};background:${m.tint}">${icon(m.symbol,22)}</span><span class="health-copy"><strong>${esc(recordTitle(record))}</strong><span class="time">${esc(record.time)}</span></span><span class="meal-kcal"><b>${number(record.value)}</b><small>${m.unit}</small></span>${icon('next',14)}</button>`;
}
function bodyPage(day) {
  const items=day.records.filter(r=>r.type!=='meal' && (state.bodyFilter==='all'||r.type===state.bodyFilter)).reverse();
  return `${viewHeading('body','new-health','记录身体数据')}<div class="stats-grid three">${['water','exercise','weight'].map(k=>statCard(k,day)).join('')}</div>
    <section class="panel body-panel"><div class="panel-head"><h2>身体记录明细</h2><small>${items.length} 笔记录</small></div>
    <div class="filters">${Object.entries({all:'全部',water:'饮水',exercise:'运动',weight:'体重'}).map(([key,name])=>`<button type="button" data-body-filter="${key}" aria-pressed="${key===state.bodyFilter}">${name}</button>`).join('')}</div>
    ${items.length?items.map(healthRow).join(''):emptyState('activity','这一天还没有此类记录','添加记录','new-health')}</section>`;
}
function trendsPage(records) {
  const days=Array.from({length:state.days},(_,i)=>dayOffset(state.date,-i));
  const rows = days.map(date=>({date,day:summarizeDay(records,date)})).filter(r=>r.day.records.length);
  return `${viewHeading('trends')}<div class="metric-tabs">${Object.entries(METRICS).map(([key,m])=>`<button type="button" data-trend="${key}" aria-pressed="${key===state.metric}">${icon(m.symbol,17)}${m.label}</button>`).join('')}</div>
    ${chartPanel(records,state.metric,true)}<section class="panel history"><div class="panel-head"><h2>每日明细</h2><small>共 ${rows.length} 天有记录</small></div>
    ${rows.length?`<div class="table-scroll"><table><thead><tr><th scope="col">日期</th>${Object.values(METRICS).map(m=>`<th scope="col">${m.label}<small>（${m.unit}）</small></th>`).join('')}</tr></thead><tbody>
    ${rows.map(({date,day})=>`<tr><th scope="row"><button type="button" data-open-day="${date}">${dateLabel(date)}${icon('rightUp',13)}</button></th>${Object.keys(METRICS).map(k=>`<td>${day[k]===null?'—':number(day[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:emptyState('calendar','所选时段还没有健康记录',null,null)}</section>`;
}
function render() {
  state.page=currentPage();
  const records=allRecords(), day=summarizeDay(records,state.date);
  $('#primary-nav').innerHTML=Object.entries(PAGES).map(([key,[name,symbol]])=>`<a href="#${key}" ${state.page===key?'aria-current="page"':''}>${icon(symbol,16)}<span>${name}</span></a>`).join('');
  $('#profile-button').innerHTML=profileHTML();
  $('#profile-menu').innerHTML=profileMenu();
  $('#hero').hidden=state.page!=='overview';
  $('#hero-date').innerHTML=icon('sun',18)+`<span>${dateLabel(state.date,true)}</span><i></i><span>${weekday(state.date)}</span>`;
  const view={overview:()=>overview(records,day),meals:()=>mealPage(day),body:()=>bodyPage(day),trends:()=>trendsPage(records)};
  $('#main').innerHTML=view[state.page]();
  paintGraphs(records,state.date);
}
const dialog = $('#dialog');
function dialogShell(title, body, options = {}) {
  return `<div class="dialog-head"><div>${options.kicker?`<div class="dialog-kicker">${options.kicker}</div>`:''}<h2 id="dialog-title">${esc(title)}</h2></div><button type="button" class="icon-btn" data-action="close" aria-label="关闭">${icon('close',19)}</button></div>${body}`;
}
function openDialog(html, compact = false) {
  closePopovers();
  dialog.classList.toggle('compact',compact);
  $('#dialog-content').innerHTML=html;
  if(!dialog.open) dialog.showModal();
  dialog.scrollTop=0;
  document.body.classList.add('modal-open');
}
function closeDialog() { if(dialog.open) dialog.close(); }
dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open');});
dialog.addEventListener('click', event=>{
  if(event.target!==dialog)return;
  const box=dialog.getBoundingClientRect();
  if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom) closeDialog();
});
function sources() {
  openDialog(dialogShell('热量如何估算',`<div class="dialog-body help-text"><p>每种食物的克数乘以每 100 克的热量，再除以 100。每项四舍五入到整数千卡，逐项加总为本餐热量。</p><div class="formula">150 克白米饭 × 116 ÷ 100 = <b>174 千卡</b></div>
    <p>碗、片、个按参考重量换算，实际大小和烹饪用油会影响结果。称重后可直接填克数，包装食品也可以按标签自定义。</p>
    <p class="source-links">食物参考值来自<a href="https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/nutrient-data/nutrient-value-some-common-foods-2008.html" target="_blank" rel="noopener noreferrer">加拿大卫生部常见食物营养表</a>和<a href="https://wjw.beijing.gov.cn/bmfw_20143/jkzs/jksh/202411/t20241121_3947159.html" target="_blank" rel="noopener noreferrer">北京市卫生健康委员会米饭及米粥数据</a>。</p></div>`),true);
}
function showRecord(id) {
  const record=allRecords().find(r=>r.id===id);
  if(!record) return;
  const meal=record.type==='meal', metric=meal?METRICS.energy:METRICS[record.type];
  const picture=state.demo && MEAL_PICTURES[record.picture];
  const items=meal?`<div class="detail-items">${record.items.map(item=>`<div><span>${esc(item.name)}<small>${number(item.grams,2)} 克</small></span><b>${number(calories(item))} <small>千卡</small></b></div>`).join('')}</div>`:'';
  openDialog(dialogShell(recordTitle(record),`<div class="dialog-body"><div class="detail-meta">${meal?mealBadge(record.slot):''}${dateLabel(record.date,true)} · ${esc(record.time)}${state.demo?' · 示例记录':''}</div>
    ${picture?`<img class="detail-photo" src="${picture}" alt="${esc(recordTitle(record))}示意图">`:''}
    <div class="detail-total" style="--tint:${metric.tint};--accent:${metric.color}"><span>${icon(metric.symbol,18)}${meal?'本餐估算热量':metric.label}</span><strong>${number(meal?mealCalories(record.items):record.value)} <small>${metric.unit}</small></strong></div>${items}</div>
    <div class="dialog-actions">${state.demo?`<button class="button primary" type="button" data-action="${meal?'new-meal':'new-health'}">${icon('plus',16)}记录我的${meal?'饮食':'身体数据'}</button>`:`<button type="button" class="danger-text" data-delete="${esc(id)}">${icon('bin',16)}删除</button><button type="button" class="button primary" data-edit="${esc(id)}">${icon('edit',16)}编辑记录</button>`}</div>`),true);
}
function askDelete(id) {
  const record=state.personal.find(r=>r.id===id);
  if(!record||state.demo) return;
  openDialog(dialogShell('删除这条记录？',`<div class="dialog-body"><p>${esc(recordTitle(record))} · ${dateLabel(record.date)} ${esc(record.time)}</p></div><div class="dialog-actions"><button type="button" class="button secondary" data-record="${esc(id)}">保留记录</button><button class="button danger" type="button" data-confirm-delete="${esc(id)}">确认删除</button></div>`),true);
}
function saveRecord(record) {
  if(!validRecord(record)) { entryError('请检查填写的日期和数值。'); return; }
  try {
    localStorage.setItem(ENTRY_PREFIX+record.id,JSON.stringify({...record,updatedAt:Date.now()}));
    state.personal=readRecords();
  } catch { entryError('浏览器未能保存记录，请检查存储权限或可用空间。'); return; }
  state.date=record.date; state.demo=false;
  try { localStorage.setItem(PREF_KEY,'personal'); } catch { /* The record itself is already saved. */ }
  if(record.type==='meal') state.mealFilter='全部';
  else state.bodyFilter='all';
  closeDialog(); render(); notify('已保存到我的手记');
}
function deleteRecord(id) {
  if(state.demo || !state.personal.some(r=>r.id===id)) return;
  try { localStorage.removeItem(ENTRY_PREFIX+id); state.personal=readRecords(); }
  catch { notify('删除未成功，请检查浏览器存储权限。'); return; }
  closeDialog(); render(); notify('记录已删除');
}
document.addEventListener('click', event=>{
  const button=event.target.closest('button,a');
  if(!event.target.closest('.date-wrap') && !event.target.closest('.profile-wrap')) closePopovers();
  if(!button) return;
  const d=button.dataset;
  if(button.id==='profile-button') {
    const was=$('#profile-menu').hidden; closePopovers(); $('#profile-menu').hidden=!was; button.setAttribute('aria-expanded',String(was)); return;
  }
  if(d.record) return showRecord(d.record);
  if(d.edit) {
    const r=state.personal.find(v=>v.id===d.edit);
    if(r && !state.demo){if(r.type==='meal')mealEditor(r);else healthEditor(r.type,r);} return;
  }
  if(d.delete) return askDelete(d.delete);
  if(d.confirmDelete)return deleteRecord(d.confirmDelete);
  if(d.stat) return d.stat==='energy'?mealEditor():healthEditor(d.stat);
  if(d.pick){changeDay(d.pick);$('#date-button')?.focus();return;}
  if(d.openDay){changeDay(d.openDay);location.hash='overview';return;}
  if(d.mealFilter){state.mealFilter=d.mealFilter;render();return;}
  if(d.bodyFilter){state.bodyFilter=d.bodyFilter;render();return;}
  if(d.trend){state.metric=d.trend;render();return;}
  switch(d.action) {
    case 'calendar': {
      const was=$('#calendar-pop').hidden; closePopovers();
      if(was){visibleMonth=state.date.slice(0,7)+'-01';fillCalendar();$('#calendar-pop').hidden=false;button.setAttribute('aria-expanded','true');}
      break;
    }
    case 'month-prev': case 'month-next': {
      const date=dateObject(visibleMonth); date.setMonth(date.getMonth() + (d.action==='month-prev'?-1:1));visibleMonth=localKey(date);fillCalendar();break;
    }
    case 'day-prev': changeDay(dayOffset(state.date,-1));break;
    case 'day-next': changeDay(dayOffset(state.date,1));break;
    case 'personal': closeDialog();switchMode(false);break;
    case 'sample': closeDialog();switchMode(true);break;
    case 'mode-info':
      openDialog(dialogShell('正在浏览示例手记',`<div class="dialog-body"><p>这些餐食和身体数据供预览。你可以从一份空白手记开始，或直接添加第一条个人记录。</p></div><div class="dialog-actions"><button type="button" class="button secondary" data-action="close">继续浏览</button><button type="button" class="button primary" data-action="personal">进入我的手记</button></div>`),true);break;
    case 'new-meal': mealEditor();break;
    case 'new-health': healthEditor(state.page==='body' && state.bodyFilter!=='all'?state.bodyFilter:'water');break;
    case 'show-intake': {
      const panel=$('#intake');
      panel?.focus({preventScroll:true});
      panel?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
      break;
    }
    case 'intake-sources': intakeSources();break;
    case 'energy-reference': referenceDialog();break;
    case 'sources': sources();break;
    case 'close': closeDialog();break;
  }
});
document.addEventListener('change',event=>{
  if(event.target.matches('[data-range]')) { state.days=Number(event.target.value);render(); }
});
document.addEventListener('keydown',event=>{if(event.key==='Escape') closePopovers();});
window.addEventListener('hashchange',()=>{closeDialog();closePopovers();render();window.scrollTo(0,0);});
window.addEventListener('storage',event=>{
  if(event.key===null || event.key.startsWith(ENTRY_PREFIX) || event.key===PREF_KEY) {initProfile();render();}
  else if(event.key===ENERGY_REFERENCE_KEY) render();
});
document.querySelectorAll('[data-icon]').forEach(el=>{el.outerHTML=icon(el.dataset.icon,16);});
initProfile();render();
if(!state.storageOK) notify('浏览器存储不可用，请启用本地存储后保存记录。');
