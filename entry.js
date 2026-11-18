let mealDraft;
let healthDraft;
const presets = {water:[150,250,350,500],exercise:[15,30,45,60]};
function dateTimeFields(date, time) {
  return `<div class="field-pair"><label>日期<input type="date" name="recordDate" value="${esc(date)}" max="${localKey()}" required></label><label>时间<input type="time" name="recordTime" value="${esc(time)}" required></label></div>`;
}
function draftItem(item) {
  const found=foodMap.get(item.id);
  return {...item,unit:'g',amount:item.grams,portion:found?.portion || 0,unitName:found?.unit || ''};
}
function mealEditor(record = null) {
  const time=record?.time || nowTime();
  const slot=record?.slot || (state.page==='meals' && state.mealFilter!=='全部' ? state.mealFilter : mealSlot(time));
  mealDraft={id:record?.id || newId(),items:record?record.items.map(draftItem):[]};
  const customPanel=`<div class="custom-food" id="custom-food" hidden><div class="field-pair"><label>食物名称<input type="text" id="custom-name" maxlength="60" placeholder="例如：芝麻馒头"></label><label>每 100 克能量<span class="unit-input"><input type="number" id="custom-energy" min="0" step="any" inputmode="decimal" placeholder="看营养标签"><select id="custom-unit" aria-label="标签能量单位"><option value="kcal">千卡</option><option value="kj">千焦</option></select></span></label></div>
    <div class="field-pair custom-nutrition"><label>食物类别<select id="custom-group">${Object.entries(FOOD_GROUPS).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label>
    <label>膳食纤维 <small>选填</small><span class="unit-input"><input type="number" id="custom-fiber" min="0" max="100" step="any" inputmode="decimal" placeholder="每 100 克"><span>克</span></span></label></div>
    <button type="button" class="mini-button" data-action="add-custom">${icon('plus',14)}添加到本餐</button></div>`;
  const html=`<form id="meal-form"><div class="dialog-body form-body">
    <fieldset><legend>餐次</legend><div class="segmented">${MEALS.map(v=>`<label><input type="radio" name="slot" value="${v}" ${v===slot?'checked':''}><span>${v}</span></label>`).join('')}</div></fieldset>
    ${dateTimeFields(record?.date || state.date,time)}
    <div class="food-picker"><div class="label-bar"><label for="food-search">添加食物</label><button type="button" class="text-link" data-action="toggle-custom" aria-expanded="false">${icon('plus',14)}自定义食物</button></div>
    <div class="search-box">${icon('search',17)}<input type="search" id="food-search" placeholder="搜索食物，如米饭、鸡蛋、酸奶" autocomplete="off" maxlength="80" aria-controls="food-matches"></div>
    <div id="food-matches"></div>${customPanel}</div>
    <div class="draft-section"><div class="label-bar"><span>本餐食物</span><small id="food-count"></small></div><div id="draft-items"></div></div>
    <label class="title-field">餐食名称 <small>选填</small><input name="mealTitle" type="text" maxlength="70" value="${esc(record?.title || '')}" placeholder="默认使用食物名称"></label>
    ${state.demo?'<p class="field-hint">保存后会进入你的个人手记。</p>':''}
    <p class="form-error" id="entry-error" role="alert" hidden></p>
    </div><div class="dialog-actions meal-save"><div class="live-energy">${icon('flame',19)}<span>本餐估算</span><strong id="meal-total" aria-live="polite">0</strong><small>千卡</small></div><button type="submit" class="button primary" id="save-meal">保存记录</button></div></form>`;
  openDialog(dialogShell(record?'编辑饮食':'记录饮食',html));
  updateMatches(); drawIngredients();
}
function matchedFoods(term) {
  const query=term.trim().toLowerCase();
  return query?FOODS.filter(f=>(f.name+' '+f.aliases).toLowerCase().includes(query)).slice(0,10):[];
}
function updateMatches() {
  const search=$('#food-search'), container=$('#food-matches');
  if(!container)return;
  const term=search.value.trim();
  if(!term) {
    container.innerHTML=`<div class="suggested"><small>常用</small>${['rice','f507','f634','f448','f344'].map(id=>`<button type="button" data-food="${id}">${esc(foodMap.get(id).name.replace(/（熟）/g,''))}</button>`).join('')}</div>`;
    return;
  }
  const list=matchedFoods(term);
  container.innerHTML=list.length?`<div class="matches">${list.map(f=>`<button type="button" data-food="${esc(f.id)}"><span>${esc(f.name)}</span><small>${number(f.kcal)} 千卡 / 100 克</small>${icon('plus',14)}</button>`).join('')}</div>`:`<div class="no-match">没有匹配的食物。<button class="text-link" type="button" data-action="open-custom">按标签添加「${esc(term)}」</button></div>`;
}
function addFood(food) {
  mealDraft.items.push({id:food.id,name:food.name,kcal:food.kcal,group:food.group,fiber:food.fiber,grams:food.portion || 100,amount:food.portion?1:100,portion:food.portion || 0,unitName:food.unit || '',unit:food.portion?'portion':'g'});
  $('#food-search').value=''; $('#entry-error').hidden=true; updateMatches(); drawIngredients();
}
function drawIngredients() {
  $('#draft-items').innerHTML=mealDraft.items.length?mealDraft.items.map((item,i)=>`<div class="draft-item">
    <div class="ingredient-name"><b>${esc(item.name)}</b><small data-equivalent="${i}"></small></div>
    <div class="portion-field"><input type="number" inputmode="decimal" min="0.001" step="any" required aria-label="${esc(item.name)}分量" data-amount="${i}" value="${esc(item.amount)}"><select data-unit="${i}" aria-label="${esc(item.name)}分量单位"><option value="g" ${item.unit==='g'?'selected':''}>克</option>${item.portion?`<option value="portion" ${item.unit==='portion'?'selected':''}>${esc(item.unitName)}</option>`:''}</select></div>
    <button type="button" class="icon-btn remove-item" data-remove-item="${i}" aria-label="移除${esc(item.name)}">${icon('close',15)}</button></div>`).join(''):'<div class="draft-empty">选择食物后，可在这里调整分量。</div>';
  $('#food-count').textContent=mealDraft.items.length?mealDraft.items.length+' 项':'';
  updateEnergy();
}
function updateEnergy() {
  let total=0,valid=mealDraft.items.length>0;
  mealDraft.items.forEach((item,i)=>{
    const line=$(`[data-equivalent="${i}"]`), usable=Number.isFinite(item.grams)&&item.grams>0;
    valid=valid&&usable;
    if(usable) total+=calories(item);
    if(line)line.textContent=usable?(item.unit==='portion'?`约 ${number(item.grams,2)} 克 · `:'')+`${number(calories(item))} 千卡`:'请输入分量';
  });
  $('#meal-total').textContent=number(total);
  $('#save-meal').disabled=!valid;
}
function showCustom(visible) {
  const panel=$('#custom-food');
  panel.hidden=!visible;
  $('[data-action="toggle-custom"]').setAttribute('aria-expanded',String(visible));
  if(visible) {
    if($('#food-search').value.trim()) $('#custom-name').value=$('#food-search').value.trim();
    $('#custom-name').focus();
  } else {$('#custom-name').value='';$('#custom-energy').value='';$('#custom-group').value='mixed';$('#custom-fiber').value='';}
}
function entryError(message, field) {
  const error=$('#entry-error');
  if(error){error.textContent=message;error.hidden=false;}
  field?.focus();
}
function appendCustom() {
  const name=$('#custom-name').value.trim(), el=$('#custom-energy');
  let kcal=el.valueAsNumber;
  if(!name)return entryError('请填写食物名称。',$('#custom-name'));
  if($('#custom-unit').value==='kj')kcal/=4.184;
  if(!Number.isFinite(kcal)||kcal<0||kcal>1000)return entryError('请核对每 100 克的能量和标签单位。',el);
  const fiberField=$('#custom-fiber');
  if(!fiberField.validity.valid) return entryError('请填写每 100 克含有的纤维克数（0 至 100），或留空。',fiberField);
  const fiber=fiberField.value===''?undefined:fiberField.valueAsNumber;
  addFood({id:'custom',name,kcal,group:$('#custom-group').value,fiber});
  showCustom(false);
}
function submitMeal(form) {
  if($('#food-search').value.trim()) return entryError('请先选中搜索结果，或清空搜索框。',$('#food-search'));
  if(!$('#custom-food').hidden && ($('#custom-name').value.trim() || $('#custom-energy').value))return entryError('请先将自定义食物添加到本餐。',$('#custom-name'));
  const items=mealDraft.items.map(({id,name,kcal,grams,group,fiber})=>{
    const item={id,name,kcal,grams};
    if(id==='custom') {item.group=group;item.fiber=fiber;}
    return item;
  });
  if(!items.length || !items.every(validItem))return entryError('请添加食物并填写有效的分量。',$('#food-search'));
  const fields=new FormData(form);
  saveRecord({id:mealDraft.id,type:'meal',date:fields.get('recordDate'),time:fields.get('recordTime'),slot:fields.get('slot'),title:String(fields.get('mealTitle')||'').trim(),items});
}
const HEALTH_NAMES={water:'饮水',exercise:'运动',weight:'体重'};
function healthEditor(type='water', record=null) {
  healthDraft={id:record?.id || newId(), date:record?.date || state.date, time:record?.time || nowTime(),type,editing:!!record,values:{water:250,exercise:30,weight:''},activity:'散步'};
  if(record){healthDraft.values[type]=record.value;healthDraft.activity=record.activity || '散步';}
  renderHealthForm();
}
function renderHealthForm() {
  const type=healthDraft.type, m=METRICS[type], value=healthDraft.values[type];
  const options=presets[type];
  const picker=healthDraft.editing?'':`<fieldset><legend>记录项目</legend><div class="health-tabs">${Object.keys(HEALTH_NAMES).map(key=>`<button type="button" data-health-type="${key}" aria-pressed="${type===key}">${icon(METRICS[key].symbol,17)}${HEALTH_NAMES[key]}</button>`).join('')}</div></fieldset>`;
  const activity=type==='exercise'?`<label>运动项目<input name="activity" type="text" list="activity-options" maxlength="40" value="${esc(healthDraft.activity)}" required></label><datalist id="activity-options">${['散步','快走','慢跑','骑行','游泳','瑜伽','力量训练'].map(v=>`<option value="${v}"></option>`).join('')}</datalist>`:'';
  const html=`<form id="health-form"><div class="dialog-body form-body">${picker}${dateTimeFields(healthDraft.date,healthDraft.time)}
    ${activity}<label>${m.label}<span class="unit-input"><input type="number" inputmode="decimal" name="healthValue" min="${type==='weight'?'.01':'.1'}" step="any" required value="${esc(value)}" placeholder="填写测量值"><span>${m.unit}</span></span></label>
    ${options?`<div class="quick-amounts">${options.map(amount=>`<button type="button" data-preset="${amount}" aria-pressed="${Number(value)===amount}">${amount} ${m.unit}</button>`).join('')}</div>`:''}
    ${state.demo?'<p class="field-hint">保存后会进入你的个人手记。</p>':''}<p class="form-error" id="entry-error" role="alert" hidden></p>
    </div><div class="dialog-actions"><button class="button secondary" type="button" data-action="close">取消</button><button class="button primary" type="submit">保存记录</button></div></form>`;
  openDialog(dialogShell(healthDraft.editing?'编辑'+HEALTH_NAMES[type]+'记录':'记录身体数据',html),true);
}
function readHealthDraft(form) {
  const fields=new FormData(form);
  healthDraft.date=String(fields.get('recordDate'));
  healthDraft.time=String(fields.get('recordTime'));
  healthDraft.values[healthDraft.type]=fields.get('healthValue');
  if(healthDraft.type==='exercise') healthDraft.activity=String(fields.get('activity')||'').trim();
}
document.addEventListener('input',event=>{
  const input=event.target;
  if(input.id==='food-search') updateMatches();
  if(input.hasAttribute('data-amount')) {
    const item=mealDraft.items[Number(input.dataset.amount)];
    item.amount=input.value;
    item.grams=input.valueAsNumber*(item.unit==='g'?1:item.portion);
    updateEnergy();
  }
  if(input.name==='healthValue') document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.preset)===input.valueAsNumber)));
});
document.addEventListener('change',event=>{
  const input=event.target;
  if(!input.hasAttribute('data-unit'))return;
  const i=Number(input.dataset.unit),item=mealDraft.items[i];
  item.unit=input.value;
  item.amount=Number.isFinite(item.grams)?Number((item.grams/(item.unit==='g'?1:item.portion)).toFixed(4)):'';
  $(`[data-amount="${i}"]`).value=item.amount;updateEnergy();
});
document.addEventListener('click',event=>{
  const button=event.target.closest('button'); if(!button)return;
  const d=button.dataset;
  if(d.food && foodMap.has(d.food))addFood(foodMap.get(d.food));
  if(d.removeItem!==undefined){mealDraft.items.splice(Number(d.removeItem),1);drawIngredients();}
  if(d.action==='open-custom'||d.action==='toggle-custom') showCustom(d.action==='open-custom'||$('#custom-food').hidden);
  if(d.action==='add-custom')appendCustom();
  if(d.healthType){readHealthDraft($('#health-form'));healthDraft.type=d.healthType;renderHealthForm();}
  if(d.preset){const el=$('[name="healthValue"]');el.value=d.preset;el.dispatchEvent(new Event('input',{bubbles:true}));}
});
document.addEventListener('keydown',event=>{
  if(event.target.id==='food-search' && event.key==='Enter' && !event.isComposing) {
    event.preventDefault();const search=event.target.value.trim();
    if(!search)return;
    const match=matchedFoods(search)[0];
    if(match)addFood(match);else showCustom(true);
  }
});
document.addEventListener('submit',event=>{
  const form=event.target;
  if(form.id==='meal-form'){event.preventDefault();submitMeal(form);}
  if(form.id==='health-form') {
    event.preventDefault();readHealthDraft(form);
    if(healthDraft.type==='exercise'&&!healthDraft.activity)return entryError('请填写运动项目。',$('[name="activity"]'));
    const record={id:healthDraft.id,type:healthDraft.type,date:healthDraft.date,time:healthDraft.time,value:Number(healthDraft.values[healthDraft.type])};
    if(record.type==='exercise')record.activity=healthDraft.activity;
    saveRecord(record);
  }
});
