const iconPaths = {
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  meal: '<path d="M5 3v6c0 2 1 3 3 3s3-1 3-3V3M8 3v18M18.5 3c-2.7 2.2-3.8 5.5-3.8 9h3.8m0-9v18"/>',
  trend: '<path d="M3.5 4v16h17M6.5 14.5l4.2-4.3 3.4 2.5 5.2-6"/>',
  activity: '<path d="M2 12h5l3-8 4 16 3.4-8H22"/>',
  sun: '<path d="M3 16h18M5 20h14M7 15a5 5 0 0 1 10 0M12 2v3M3.9 6.4 6 8.5m14.1-2.1L18 8.5M1.8 12.2l2.3.6m18-1-2.3.7"/>',
  flame: '<path d="M13.5 2c1.1 4.8-1.1 6.2-1.3 8.5 1.6-.7 3-2.3 3.5-4.1 3.2 3.2 4.7 6.6 4 9.7a7.8 7.8 0 0 1-15.3-1.8c0-2.8 1.3-5 3.3-7.5-.2 2.7.3 3.8 1.3 4.6.2-3.4 2.6-5.2 4.5-9.4Z"/>',
  drop: '<path d="M12 2.5c-1.3 2.4-7.2 8.2-7.2 12.1a7.2 7.2 0 0 0 14.4 0c0-3.9-5.9-9.7-7.2-12.1Z"/><path d="M8.3 14.6a3.7 3.7 0 0 0 3 3.5"/>',
  shoe: '<path d="m3 15 2.3-8.3c2.1 1.5 4 .9 5-.8l2.3 5.3 4.6 2.3c3.8.8 4.4 2.1 3.6 4.4H6.2c-2.3 0-3.6-.9-3.2-2.9ZM3.3 15.4c2.6 1 7.6 1 9.7 1M11.7 9.7l-2.2 1.8m3.6.2-1.6 1.5"/>',
  scale: '<rect x="3" y="3.5" width="18" height="17" rx="4"/><path d="M7 8.1A8.5 8.5 0 0 1 17 8l-2.4 3.2a4.7 4.7 0 0 0-5.1 0L7 8.1Zm5.2 1.4 1.3-2.6"/>',
  leaf: '<path d="M3 21c3-5 6.5-9 13.5-14.4M7 16.8C4.4 8.2 11 3.2 21 3c0 10-5.2 16-14 13.8Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3.5 10h17"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  down: '<path d="m7 10 5 5 5-5"/>',
  prev: '<path d="m14 6-6 6 6 6"/>',
  next: '<path d="m10 6 6 6-6 6"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  rightUp: '<path d="M6.5 17.5 17 7m-8.5 0H17v8.5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5V12l3.5 2"/>',
  book: '<path d="M5 4.5a2 2 0 0 1 2-2h12v18H7a2 2 0 0 1-2-2v-14Zm0 13.3c.3-1.2 1-1.8 2.5-1.8H19M9 6.5h6"/>',
  check: '<path d="m4.5 12.5 5 4.5 10-11"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/>',
  bin: '<path d="M4 6.5h16m-12-3h8M6.5 7l1 13h9l1-13M10 10v7m4-7v7"/>',
  edit: '<path d="m14.5 5.5 4 4M3.8 20.2l4.8-1 11-11a2.9 2.9 0 0 0-4.1-4.1l-11 11-0.7 5.1Z"/>',
  bowl: '<path d="M2.5 11.5h19c-.7 4.9-4.3 8-9.5 8s-8.8-3.1-9.5-8Zm6.5 9.7h6M9 8c1-1 .9-1.9 0-3m5 3c1.1-1.3 1.1-2.6 0-4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9v.1"/>',
  layers: '<path d="M3 8.5 12 4l9 4.5-9 4.5L3 8.5Zm0 4.1 9 4.5 9-4.5M3 16.7l9 4.5 9-4.5"/>'
};
function icon(name, size = 18) {
  return '<svg class="ico" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (iconPaths[name] || '') + '</svg>';
}
