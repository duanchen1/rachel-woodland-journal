function axisLimits(values, metric) {
  const max = Math.max(...values, 1), min = Math.min(...values);
  const base = metric === 'weight' ? Math.max(0, min - .35) : 0;
  const rough = Math.max((max - base) / 3, metric === 'weight' ? .1 : 1);
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = ([1, 2, 2.5, 5, 10].find(value => value * power >= rough) || 10) * power;
  const bottom = Math.floor(base / step) * step;
  return {bottom, top:Math.max(bottom + step * 2, Math.ceil(max / step) * step), step};
}
function smoothLine(ctx, segment) {
  ctx.moveTo(segment[0].x, segment[0].y);
  for (let i = 1; i < segment.length; i++) {
    const a = segment[i - 1], b = segment[i], half = (a.x + b.x) / 2;
    ctx.bezierCurveTo(half, a.y, half, b.y, b.x, b.y);
  }
}
function renderGraph(canvas, points, metric, small = false) {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (width < 1 || height < 1) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(ratio, ratio);
  const values = points.filter(point => point.value !== null).map(point => point.value);
  if (!values.length) return;
  const ink = small || metric !== 'energy' ? METRICS[metric].color : '#57764c';
  let {bottom, top, step} = axisLimits(values, metric);
  const left = small ? 3 : 38, right = width - (small ? 4 : 13);
  const upper = small ? 4 : 12, lower = height - (small ? 3 : 26);
  if (small) {
    const min = Math.min(...values), max = Math.max(...values);
    const pad = Math.max((max - min) * .15, max * .003, .05);
    bottom = Math.max(0, min - pad); top = max + pad;
  }
  const x = i => left + (right - left) * i / Math.max(1, points.length - 1);
  const y = value => lower - (lower - upper) * (value - bottom) / (top - bottom);
  if (!small) {
    ctx.font = '10.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.lineWidth = 1;
    for (let level = bottom; level < top + step / 2; level += step) {
      const pos = y(level);
      ctx.fillStyle = '#72796e';
      ctx.fillText(number(level), left - 8, pos);
      ctx.strokeStyle = '#dee3d8'; ctx.setLineDash([3,4]);
      ctx.beginPath(); ctx.moveTo(left, pos); ctx.lineTo(right, pos); ctx.stroke();
    }
    ctx.setLineDash([]);
    const ticks = Math.min(points.length, width < 340 ? 4 : 7);
    const indices = Array.from({length:ticks}, (_, i) => Math.round(i * (points.length-1) / (ticks-1)));
    for (const i of indices) {
      ctx.fillStyle = '#72796e';
      ctx.textAlign = i === points.length - 1 ? 'right' : i === 0 ? 'left' : 'center';
      ctx.fillText(shortDate(points[i].date), x(i), height - 7);
    }
  }
  const segments = []; let segment = [];
  points.forEach((point, i) => {
    if (point.value === null) { if (segment.length) segments.push(segment); segment = []; }
    else segment.push({x:x(i), y:y(point.value), i});
  });
  if (segment.length) segments.push(segment);
  for (const seg of segments) {
    const last = seg[seg.length - 1];
    if (seg.length > 1) {
      const gradient = ctx.createLinearGradient(0, upper, 0, lower + 2);
      gradient.addColorStop(0, ink + (small ? '36' : '32'));
      gradient.addColorStop(1, ink + '02');
      ctx.beginPath(); smoothLine(ctx, seg); ctx.lineTo(last.x, lower); ctx.lineTo(seg[0].x, lower);
      ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
      ctx.beginPath(); smoothLine(ctx, seg); ctx.lineWidth = small ? 1.8 : 2.4;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = ink; ctx.stroke();
    }
    const markers = small ? [last] : seg.filter((point, i) => points.length <= 14 || i === 0 || i === seg.length-1);
    for (const point of markers) {
      ctx.beginPath(); ctx.arc(point.x, point.y, small ? 2.2 : 3.4, 0, 2*Math.PI);
      ctx.fillStyle = small || point.i === points.length - 1 ? ink : '#fffef9'; ctx.fill();
      if (!small) { ctx.lineWidth=1.5; ctx.strokeStyle=ink; ctx.stroke(); }
    }
  }
  if (small) return;
  const tooltip = canvas.parentElement.querySelector('.graph-tooltip');
  let active = points.length - 1;
  const show = i => {
    active = Math.max(0, Math.min(i, points.length-1));
    const p = points[active];
    tooltip.textContent = shortDate(p.date) + ' · ' + (p.value === null ? '未记录' : number(p.value) + ' ' + METRICS[metric].unit);
    tooltip.hidden = false;
    const half = tooltip.offsetWidth / 2 + 3;
    tooltip.style.left = Math.max(half, Math.min(width - half, x(active))) + 'px';
    tooltip.style.top = Math.max(0, (p.value === null ? upper : y(p.value)) - 33) + 'px';
  };
  canvas.onpointermove = event => show(Math.round(((event.clientX - canvas.getBoundingClientRect().left) - left) / (right - left) * (points.length - 1)));
  canvas.onpointerleave = canvas.onblur = () => { tooltip.hidden = true; };
  canvas.onfocus = () => show(active);
  canvas.onkeydown = event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); show(active + (event.key === 'ArrowRight' ? 1 : -1)); }
  };
}
let graphObserver;
function paintGraphs(records, date) {
  graphObserver?.disconnect();
  const jobs = new Map();
  document.querySelectorAll('canvas[data-metric]').forEach(canvas => {
    const metric = canvas.dataset.metric;
    const points = pointsFor(records, date, Number(canvas.dataset.days), metric);
    const small = canvas.classList.contains('spark');
    if (!small) {
      canvas.setAttribute('aria-label', METRICS[metric].label + '。' + points.map(p => shortDate(p.date) + ' ' + (p.value === null ? '未记录' : number(p.value) + METRICS[metric].unit)).join('，'));
    }
    const draw = () => renderGraph(canvas, points, metric, small);
    jobs.set(canvas, draw);
    draw();
  });
  if ('ResizeObserver' in window) {
    graphObserver = new ResizeObserver(entries => entries.forEach(entry => jobs.get(entry.target)?.()));
    jobs.forEach((draw, canvas) => graphObserver.observe(canvas));
  }
}
