const ENTRY_PREFIX = 'rachel.woodland.record.v1.';
const PREF_KEY = 'rachel.woodland.mode.v1';
const MEALS = ['早餐', '午餐', '晚餐', '加餐'];
const METRICS = {
  energy: { label: '热量摄入', unit: '千卡', symbol: 'flame', color: '#b8764e', tint: '#f6eade' },
  water: { label: '饮水量', unit: '毫升', symbol: 'drop', color: '#578796', tint: '#e3eef0' },
  exercise: { label: '运动时长', unit: '分钟', symbol: 'shoe', color: '#748458', tint: '#eaf0df' },
  weight: { label: '体重', unit: '公斤', symbol: 'scale', color: '#90758d', tint: '#efe7ee' }
};
const MEAL_PICTURES = {
  toast: 'assets/avocado-toast.jpg',
  salad: 'assets/harvest-bowl.jpg',
  yogurt: 'assets/berry-yogurt.jpg'
};
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function localKey(value = new Date()) {
  return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
}
function dateObject(key) {
  const parts = key.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], 12);
}
function dayOffset(key, amount) {
  const date = dateObject(key);
  date.setDate(date.getDate() + amount);
  return localKey(date);
}
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && localKey(dateObject(value)) === value;
}
function dateLabel(key, includeYear = false) {
  return dateObject(key).toLocaleDateString('zh-CN', {year: includeYear ? 'numeric' : undefined, month: 'long', day: 'numeric'});
}
function weekday(key) { return dateObject(key).toLocaleDateString('zh-CN', {weekday:'long'}); }
function shortDate(key) { const date = dateObject(key); return (date.getMonth() + 1) + '/' + date.getDate(); }
function nowTime() { const n = new Date(); return String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); }
function number(value, digits = 1) {
  return Number(value).toLocaleString('zh-CN', {maximumFractionDigits:digits});
}
function mealSlot(time) {
  const hour = Number(time.slice(0, 2));
  if (hour < 10) return '早餐';
  if (hour < 14) return '午餐';
  if (hour >= 17 && hour < 22) return '晚餐';
  return '加餐';
}
function calories(item) { return Math.round(item.grams * item.kcal / 100); }
function mealCalories(items) { return items.reduce((sum, item) => sum + calories(item), 0); }
function recordTitle(record) {
  if (record.type === 'meal') return record.title || record.items.map(item => item.name).join('、');
  if (record.type === 'exercise') return record.activity || '运动';
  return record.type === 'water' ? '饮水' : '体重测量';
}
function validItem(item) {
  return item && typeof item.name === 'string' && item.name.trim().length > 0 &&
    Number.isFinite(item.kcal) && item.kcal >= 0 && item.kcal <= 1000 &&
    Number.isFinite(item.grams) && item.grams > 0;
}
function validRecord(record) {
  if (!record || typeof record.id !== 'string' || !validDate(record.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(record.time)) return false;
  if (record.type === 'meal') return MEALS.includes(record.slot) && Array.isArray(record.items) && record.items.length && record.items.every(validItem);
  return ['water','exercise','weight'].includes(record.type) && Number.isFinite(record.value) && record.value > 0;
}
function readRecords() {
  const records = [];
  for (let n = 0; n < localStorage.length; n++) {
    const key = localStorage.key(n);
    if (!key || !key.startsWith(ENTRY_PREFIX)) continue;
    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (validRecord(data) && key === ENTRY_PREFIX + data.id) records.push(data);
    } catch { /* An unreadable entry does not hide the other days. */ }
  }
  return records;
}
function recordOrder(a, b) {
  return a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || (a.updatedAt || 0) - (b.updatedAt || 0) || a.id.localeCompare(b.id);
}
function summarizeDay(records, key) {
  const day = records.filter(record => record.date === key).sort(recordOrder);
  const result = {records:day, meals:[], energy:null, water:null, exercise:null, weight:null, counts:{energy:0,water:0,exercise:0,weight:0}};
  for (const record of day) {
    if (record.type === 'meal') {
      result.meals.push(record);
      result.counts.energy++;
      result.energy = (result.energy || 0) + mealCalories(record.items);
    } else {
      result.counts[record.type]++;
      if (record.type === 'weight') result.weight = record.value;
      else result[record.type] = (result[record.type] || 0) + record.value;
    }
  }
  return result;
}
function pointsFor(records, end, days, metric) {
  return Array.from({length:days}, (_, index) => {
    const date = dayOffset(end, index - days + 1);
    return {date, value:summarizeDay(records, date)[metric]};
  });
}
function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}
function sampleJournal(today) {
  const result = [];
  const recipes = [
    {slot:'早餐',time:'08:15',title:'牛油果鸡蛋吐司',picture:'toast',ingredients:[['f29',70],['f343',80],['f506',46]]},
    {slot:'午餐',time:'12:30',title:'田园藜麦沙拉碗',picture:'salad',ingredients:[['f60',190],['f735',120],['f343',70],['f250',50],['f268',40],['f896',12]]},
    {slot:'加餐',time:'15:40',title:'草莓坚果酸奶杯',picture:'yogurt',ingredients:[['f448',180],['f389',72],['f748',22],['f925',7]]},
    {slot:'晚餐',time:'18:45',title:'三文鱼糙米饭',ingredients:[['f533',120],['f68',145],['f240',95],['f896',5]]}
  ];
  const portions = [1.04,.83,1.12,.92,1.03,.89,1.06];
  const water = [1450,1600,1100,1750,1350,1800,1250];
  const activity = [25,40,20,32,50,22,35];
  const weights = [58.1,58,58.2,57.9,57.8,58.0,57.8];
  for (let offset = -29; offset <= 0; offset++) {
    const date = dayOffset(today, offset);
    const index = ((offset + 6) % 7 + 7) % 7;
    const add = (key, fields) => result.push({id:'sample-' + date + '-' + key, date, ...fields});
    recipes.slice(0, offset === 0 ? 3 : 4).forEach((recipe, i) => {
      const items = recipe.ingredients.map(([id, grams]) => {
        const food = foodMap.get(id);
        return {id, name:food.name, kcal:food.kcal, grams:Math.round(grams * (offset === 0 ? 1 : portions[index]))};
      });
      add('m' + i, {type:'meal',slot:recipe.slot,time:recipe.time,title:recipe.title,picture:recipe.picture,items});
    });
    const drinks = ['08:00','10:20','12:15','14:20','15:55'];
    drinks.forEach((time, i) => add('w' + i, {type:'water',time,value:water[index] / drinks.length}));
    add('a', {type:'exercise',time:'07:30',value:activity[index],activity:['散步','骑行','慢跑','瑜伽'][index % 4]});
    add('kg', {type:'weight',time:'07:00',value:weights[index]});
  }
  return result;
}
