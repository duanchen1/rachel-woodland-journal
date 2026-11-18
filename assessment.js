const ENERGY_REFERENCE_KEY = 'rachel.woodland.energy-reference.v1';
const ADULT_PRODUCE_GRAMS = 400;
const ADULT_FIBER_GRAMS = 25;
const FOOD_GROUPS = {
  mixed:'混合菜或未分类', vegetable:'非淀粉类蔬菜', fruit:'完整水果', wholegrain:'全谷物',
  staple:'其他谷薯主食', protein:'蛋白质食物', other:'其他单一食材'
};
let demoEnergyReference = 1800;

function energyReference() {
  if (state.demo) return demoEnergyReference;
  try {
    const value = Number(localStorage.getItem(ENERGY_REFERENCE_KEY));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  } catch { return null; }
}
function analyzeIntake(day) {
  const result = {
    totalItems:0, classified:0, vegetable:0, fruit:0, fiber:0, fiberItems:0,
    wholegrain:'', staple:'', protein:'', slots:[...new Set(day.meals.map(record=>record.slot))]
  };
  for (const meal of day.meals) {
    for (const item of meal.items) {
      const catalog = foodMap.get(item.id);
      const group = catalog?.group ?? item.group;
      const fiber = catalog?.fiber ?? item.fiber;
      result.totalItems++;
      if (Object.hasOwn(FOOD_GROUPS, group) && group !== 'mixed') {
        result.classified++;
        if (group === 'vegetable' || group === 'fruit') result[group] += item.grams;
        if (['wholegrain','staple','protein'].includes(group) && !result[group]) result[group] = item.name;
      }
      if (Number.isFinite(fiber) && fiber >= 0) {
        result.fiberItems++;
        result.fiber += fiber * item.grams / 100;
      }
    }
  }
  return result;
}
function foodSuggestions(data) {
  if (!data.classified) {
    return [
      '把混合菜拆成食材记录，例如分别填写米饭、鸡肉和西兰花的克数，蔬果分量会更清楚。',
      data.fiberItems ? '选择主食时可尝试燕麦或糙米，搭配豆类，让膳食纤维来自不同食物。' : '包装食品可以按营养标签补充每 100 克的膳食纤维，手记会按实际分量换算。'
    ];
  }
  let produceTip;
  if (data.fruit + data.vegetable >= ADULT_PRODUCE_GRAMS) {
    produceTip = '已记蔬果达到成人每日 400 克的参考量。下一餐可以换一种颜色的蔬菜，丰富食物种类。';
  } else if (!data.vegetable) {
    produceTip = '已分类的食材中还没有蔬菜。下一餐可搭配一碟西兰花或番茄，并把实际吃下的分量记下来。';
  } else if (!data.fruit) {
    produceTip = '记录里已经有蔬菜。想吃加餐时，可选一个苹果或一份其他完整水果，补充不同种类的蔬果。';
  } else {
    produceTip = `已记蔬菜 ${number(data.vegetable)} 克、水果 ${number(data.fruit)} 克。下一餐可加一份深色蔬菜，继续积累当天的蔬果摄入。`;
  }
  let mixTip;
  if (!data.wholegrain && data.staple) {
    mixTip = `已记录${data.staple}。下一次选主食时，可以把其中一部分换成糙米或燕麦，增加全谷物。`;
  } else if (!data.protein) {
    mixTip = '已分类的食材中还没有明显的蛋白质来源。下一餐可以搭配豆腐、鸡蛋或鱼，按自己的饮食偏好选择。';
  } else if (data.fiber >= ADULT_FIBER_GRAMS) {
    mixTip = '有数据的食材已达到成人每日 25 克膳食纤维的参考量。可以轮换全谷物、豆类和水果，让纤维来源更多样。';
  } else if (data.wholegrain) {
    mixTip = `记录里已有${data.wholegrain}。下一餐可以试试把扁豆或鹰嘴豆加入汤或沙拉，增加纤维来源。`;
  } else {
    mixTip = '下次选主食时可试试糙米饭或燕麦粥，再搭配豆类，与当天已记录的食物形成不同组合。';
  }
  return [produceTip, mixTip];
}
function metricTrack(value, reference, label) {
  if (value === null || !reference) return '<div class="intake-track no-reference" aria-hidden="true"></div>';
  const percent = Math.min(100, Math.max(0, value / reference * 100));
  return `<div class="intake-track" role="meter" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percent)}" aria-valuetext="${number(value)}，参考值 ${number(reference)}"><i style="width:${percent.toFixed(2)}%"></i></div>`;
}
function intakePanel(day) {
  const today = state.date === localKey(), data = analyzeIntake(day), goal = energyReference();
  const heading = today ? '今日摄入评估' : '当日摄入评估';
  const header = `<div class="panel-head"><h2 id="intake-title">${heading}</h2><button type="button" data-action="intake-sources" class="text-link">${icon('info',15)}评估依据</button></div>`;
  if (!data.totalItems) {
    return `<section id="intake" class="panel intake-panel" tabindex="-1" aria-labelledby="intake-title">${header}
      <p class="intake-empty">这一天还没有饮食记录。记下第一餐，即可查看热量、蔬果、膳食纤维和搭配建议。</p>
      <div class="intake-empty-actions"><button type="button" class="button secondary" data-action="new-meal">${icon('plus',14)}记录饮食</button><button type="button" class="text-link" data-action="energy-reference">${goal?'调整':'设置'}每日能量参考值</button></div></section>`;
  }
  const produce = data.classified ? data.vegetable + data.fruit : null;
  const fiber = data.fiberItems ? data.fiber : null;
  const goalText = goal ? `${state.demo?'示例':'个人'}参考 ${number(goal)} 千卡 · 已记 ${number(day.energy / goal * 100,0)}%` : '可填写自己的每日能量参考值';
  const unknownGroups = data.totalItems - data.classified;
  const tips = foodSuggestions(data);
  return `<section id="intake" class="panel intake-panel" tabindex="-1" aria-labelledby="intake-title">${header}
    <p class="intake-scope">依据${dateLabel(state.date)}已记的 ${day.meals.length} 笔饮食估算<span> · ${data.slots.map(esc).join('、')}</span></p>
    <div class="intake-metrics">
      <div class="intake-metric energy-metric"><div class="intake-label">${icon('flame',16)}已记热量<button type="button" class="text-link" data-action="energy-reference">${goal?'调整参考值':'设置参考值'}</button></div>
        <p class="intake-value"><strong>${number(day.energy)}</strong> 千卡</p>${metricTrack(day.energy,goal,'热量与每日参考值')}<small>${goalText}</small></div>
      <div class="intake-metric"><div class="intake-label">${icon('leaf',16)}已识别蔬果</div><p class="intake-value"><strong>${produce===null?'—':number(produce)}</strong> 克</p>
        ${metricTrack(produce,ADULT_PRODUCE_GRAMS,'已识别蔬果与成人每日参考量')}<small>成人每日参考 ≥ 400 克${unknownGroups?` · ${unknownGroups} 项未分类或为混合食物`:''}</small></div>
      <div class="intake-metric fiber-metric"><div class="intake-label">${icon('bowl',16)}膳食纤维估算</div><p class="intake-value"><strong>${fiber===null?'—':number(fiber)}</strong> 克</p>
        ${metricTrack(fiber,ADULT_FIBER_GRAMS,'已估纤维与成人每日参考量')}<small>成人每日参考 ≥ 25 克 · ${data.fiberItems}/${data.totalItems} 项有数据</small></div>
    </div><div class="science-advice"><h3>${icon('leaf',17)}科学建议</h3><ul>${tips.map(tip=>`<li>${esc(tip)}</li>`).join('')}</ul></div></section>`;
}
function intakeSources() {
  openDialog(dialogShell('摄入评估依据',`<div class="dialog-body help-text">
    <p>评估只汇总所选日期已保存的餐食。食材分量、烹调方式和漏记餐次都会影响估算。每日能量参考值由你填写，示例手记的数值仅供演示。</p>
    <p>世界卫生组织建议成人每天摄入至少 400 克蔬果、25 克食物来源的膳食纤维，并从全谷物、蔬果和豆类中选择多样的食物。<a href="https://www.who.int/zh/news-room/fact-sheets/detail/healthy-diet" target="_blank" rel="noopener noreferrer">阅读世卫组织《健康饮食》</a></p>
    <p>蔬果按完整水果与非淀粉类蔬菜的可食重量相加。土豆、红薯和玉米在本手记中归入主食。混合菜可以拆分食材填写。</p>
    <p>纤维按食物成分表或你填写的标签值乘以分量换算。纤维卡标明有数值的食材项数。所有已记食材都参与热量合计。<a href="https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/nutrient-data/nutrient-value-some-common-foods-2008.html" target="_blank" rel="noopener noreferrer">查看加拿大卫生部食物营养表</a></p>
    </div>`),true);
}
function referenceDialog() {
  const current = energyReference(), demo = state.demo;
  openDialog(dialogShell(demo?'示例能量参考值':'个人能量参考值',`<form id="reference-form" data-demo="${demo}"><div class="dialog-body form-body">
    <label>每日能量参考值<span class="unit-input"><input type="number" inputmode="numeric" name="reference" min="1" step="1" value="${current??''}" placeholder="填写已确定的参考值"><span>千卡／天</span></span></label>
    <p class="field-hint">${demo?'这项调整仅用于当前示例预览。':'用你已确定的个人数值，与所选日期的已记热量对照。'}留空保存即可取消对照。</p>
    <p class="form-error" role="alert" id="reference-error" hidden></p></div><div class="dialog-actions"><button type="button" class="button secondary" data-action="close">取消</button><button class="button primary" type="submit">保存</button></div></form>`),true);
}
document.addEventListener('submit',event=>{
  if (event.target.id !== 'reference-form') return;
  event.preventDefault();
  const form = event.target, input = form.elements.reference;
  const value = input.value.trim() ? input.valueAsNumber : null;
  const error = $('#reference-error');
  if (value !== null && (!Number.isSafeInteger(value) || value <= 0)) {
    error.textContent = '请输入大于零的整数千卡，或留空。'; error.hidden = false; input.focus(); return;
  }
  if (form.dataset.demo === 'true') demoEnergyReference = value;
  else {
    try {
      if (value === null) localStorage.removeItem(ENERGY_REFERENCE_KEY);
      else localStorage.setItem(ENERGY_REFERENCE_KEY,String(value));
    } catch {
      error.textContent='当前浏览器无法保存参考值，请检查存储权限。'; error.hidden=false; return;
    }
  }
  closeDialog(); render();
  notify(value===null?'已取消能量参考值':'已保存能量参考值');
});
