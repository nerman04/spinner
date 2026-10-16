'use strict';
const $ = id => document.getElementById(id);
const STORAGE_KEY = 'coffeeCrew.v1';
const TAU = Math.PI * 2;
const palette = ['#28594b', '#ead6ac', '#8ca883', '#f2ebd9', '#bdc9ab', '#cb956a'];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let items = [], history = [], settings = { count: 2, exclude: false, sound: false };
let spinning = false, angle = 0, displayPool = [], lastResult = null, storageWarning = '';
const canvas = $('wheel'), ctx = canvas.getContext('2d'), audio = $('spin-audio');
function notice(message) { $('notice').textContent = message; }
function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      items = Array.isArray(data.items) && data.items.length === 0 ? [] : DrawCore.validate(data.items);
      settings = { count: Number.isInteger(data.settings?.count) ? Math.max(1, Math.min(100, data.settings.count)) : 2, exclude: data.settings?.exclude === true, sound: data.settings?.sound === true };
      history = Array.isArray(data.history) ? data.history.filter(h => h && Array.isArray(h.names) && h.names.length && h.names.length <= 100 && h.names.every(n => typeof n === 'string' && n.length <= 30) && Number.isFinite(new Date(h.date).getTime())).slice(0, 10) : [];
    } else {
      const legacy = localStorage.getItem('wheelItems');
      items = legacy ? DrawCore.validate(JSON.parse(legacy)) : [];
    }
  } catch (error) {
    storageWarning = '저장된 명단을 불러오지 못했어요. 기존 저장 데이터는 그대로 두었습니다. 명단을 다시 입력해주세요.';
    items = [];
  }
  $('draw-count').value = settings.count;
  $('exclude-last').checked = settings.exclude;
  $('sound').checked = settings.sound;
  lastResult = history[0] || null;
}
function save() {
  // Invalid drafts remain visible but never replace a valid saved roster.
  try { if (items.length) DrawCore.validate(items); } catch { return; }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, settings, history }));
  } catch { notice('브라우저 저장 공간을 사용할 수 없어 변경 사항은 이 화면에서만 유지돼요.'); }
}
function excludedNames() { return new Set(settings.exclude ? history[0]?.names || [] : []); }
function eligible() { const excluded = excludedNames(); return items.filter(item => !excluded.has(item.name.trim())); }
function getProblem() {
  try {
    DrawCore.validate(items);
    if (!Number.isInteger(settings.count) || settings.count < 1 || settings.count > eligible().length) {
      return `현재 참여 가능한 팀원은 ${eligible().length}명이에요. 추첨 인원을 줄이거나 제외 옵션을 꺼주세요.`;
    }
    return '';
  } catch (error) { return error.message; }
}
function update() {
  const problem = getProblem();
  $('roster-count').textContent = `${items.length}명`;
  $('pool-count').textContent = `참여 ${eligible().length}명`;
  $('spin').disabled = spinning || !!problem;
  $('spin').textContent = spinning ? '원정대를 뽑고 있어요…' : `커피 원정대 ${Number.isInteger(settings.count) && settings.count > 0 ? settings.count : '?'}명 뽑기 ↗`;
  $('minus').disabled = spinning || settings.count <= 1;
  $('plus').disabled = spinning || settings.count >= 100;
  if (!spinning) {
    $('wheel-status').textContent = problem || '준비됐나요? 오늘의 원정대를 뽑아보세요.';
    try { displayPool = DrawCore.validate(eligible()); } catch { displayPool = []; }
    drawWheel();
  }
  const excluded = excludedNames();
  [...$('roster').children].forEach((row, i) => {
    row.classList.toggle('excluded', excluded.has(items[i].name.trim()));
    row.title = excluded.has(items[i].name.trim()) ? '직전 당첨자로 이번 추첨에서 제외됩니다.' : '';
  });
}
function renderRoster() {
  $('roster').replaceChildren();
  items.forEach((item, index) => {
    const row = document.createElement('div'); row.className = 'roster-row';
    const name = document.createElement('input'); name.type = 'text'; name.maxLength = 30; name.value = item.name; name.placeholder = '팀원 이름'; name.setAttribute('aria-label', `${index + 1}번 팀원 이름`);
    const weight = document.createElement('input'); weight.type = 'number'; weight.min = '0.01'; weight.max = '1000'; weight.step = 'any'; weight.value = item.weight; weight.setAttribute('aria-label', `${index + 1}번 팀원 가중치`);
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', `${item.name || index + 1} 삭제`);
    name.addEventListener('input', () => { item.name = name.value; save(); update(); });
    weight.addEventListener('input', () => { item.weight = weight.value === '' ? NaN : Number(weight.value); save(); update(); });
    remove.addEventListener('click', () => { if (spinning) return; items.splice(index, 1); renderRoster(); save(); update(); });
    row.append(name, weight, remove); $('roster').append(row);
  });
}
function drawWheel() {
  const size = Math.min(window.devicePixelRatio || 1, 3) * Math.max(1, canvas.clientWidth);
  if (canvas.width !== Math.round(size)) { canvas.width = canvas.height = Math.round(size); }
  const c = canvas.width / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(c, c); ctx.rotate(angle);
  const total = displayPool.reduce((sum, item) => sum + item.weight, 0);
  if (!total) { ctx.fillStyle = '#d4dfc9'; ctx.beginPath(); ctx.arc(0, 0, c, 0, TAU); ctx.fill(); }
  let start = 0;
  displayPool.forEach((item, i) => {
    const slice = item.weight / total * TAU;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, c, start, start + slice); ctx.closePath();
    ctx.fillStyle = palette[i % palette.length]; ctx.fill(); ctx.strokeStyle = '#fffdf755'; ctx.lineWidth = 2; ctx.stroke();
    if (slice > .09) {
      ctx.save(); ctx.rotate(start + slice / 2); ctx.fillStyle = i % palette.length === 0 ? '#fffdf7' : '#263f33';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = `650 ${Math.max(10, c * .072)}px system-ui, sans-serif`;
      const label = [...item.name]; let text = label.join('');
      while (label.length && ctx.measureText(text).width > c * .55) { label.pop(); text = label.join('') + '…'; }
      ctx.fillText(text, c * .88, 0); ctx.restore();
    }
    start += slice;
  });
  ctx.restore();
}
function random() {
  if (globalThis.crypto?.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
  return Math.random();
}
function animateTo(winner) {
  const total = displayPool.reduce((s, item) => s + item.weight, 0);
  const index = displayPool.findIndex(item => item.name === winner.name);
  const before = displayPool.slice(0, index).reduce((s, item) => s + item.weight, 0);
  const target = -Math.PI / 2 - ((before + winner.weight / 2) / total) * TAU;
  const from = angle;
  const delta = ((target - from) % TAU + TAU) % TAU + TAU * 4;
  const duration = reducedMotion.matches ? 0 : (settings.count > 5 ? 850 : 2200);
  return new Promise(resolve => {
    let start;
    function frame(now) {
      if (start === undefined) start = now;
      const progress = duration ? Math.min((now - start) / duration, 1) : 1;
      angle = from + delta * (1 - (1 - progress) ** 3); drawWheel();
      if (progress < 1) requestAnimationFrame(frame);
      else { angle = ((angle % TAU) + TAU) % TAU; resolve(); }
    }
    requestAnimationFrame(frame);
  });
}
function lock(value) {
  spinning = value; document.body.classList.toggle('is-spinning', value);
  document.querySelectorAll('.side-panel input,.side-panel button,.side-panel textarea,#clear-history').forEach(el => { el.disabled = value; });
  $('spin').disabled = value;
}
async function startSpin() {
  if (spinning) return;
  const problem = getProblem(); if (problem) { notice(problem); return; }
  const pool = DrawCore.validate(eligible());
  const winners = DrawCore.sample(pool, settings.count, random);
  lock(true); update(); notice('');
  displayPool = pool;
  if (settings.sound) { audio.currentTime = 0; audio.loop = true; audio.play().catch(() => {}); }
  try {
    for (let i = 0; i < winners.length; i++) {
      $('wheel-status').textContent = `${i + 1} / ${winners.length}번째 원정대원을 뽑는 중…`;
      await animateTo(winners[i]);
      $('wheel-status').textContent = `${i + 1}번째 원정대원 · ${winners[i].name}`;
      if (!reducedMotion.matches) await new Promise(resolve => setTimeout(resolve, 600));
      if (i < winners.length - 1) displayPool = displayPool.filter(item => item.name !== winners[i].name);
    }
    lastResult = { names: winners.map(item => item.name), date: new Date().toISOString() };
    history.unshift(lastResult); history = history.slice(0, 10); save(); renderHistory(); renderLatest(); openResult(true);
  } catch (error) { notice('추첨을 완료하지 못했어요. 다시 시도해주세요.'); console.error(error); }
  finally { audio.pause(); audio.loop = false; lock(false); update(); }
}
function renderLatest() {
  $('latest-result').hidden = !lastResult;
  $('latest-names').textContent = lastResult?.names.join(' · ') || '';
}
function renderHistory() {
  $('history').replaceChildren(); $('history-empty').hidden = history.length > 0;
  history.forEach(entry => {
    const li = document.createElement('li'), names = document.createElement('span'), time = document.createElement('time');
    names.textContent = entry.names.join(' · '); time.dateTime = entry.date;
    time.textContent = new Intl.DateTimeFormat('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(entry.date));
    li.append(names, time); $('history').append(li);
  });
}
function openResult(celebrate = false) {
  if (!lastResult) return;
  $('winner-names').replaceChildren(); $('copy-status').textContent = '';
  lastResult.names.forEach(name => { const chip = document.createElement('span'); chip.textContent = name; $('winner-names').append(chip); });
  if (!$('result-dialog').open) $('result-dialog').showModal();
  if (celebrate && !reducedMotion.matches && typeof confetti === 'function') {
    const layer = document.createElement('canvas'); layer.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:10';
    $('result-dialog').append(layer);
    const fire = confetti.create(layer, { resize: true });
    fire({ particleCount: 90, spread: 85, origin: { y: .45 }, colors: ['#28594b','#e8b868','#8ca883'] });
    setTimeout(() => { fire.reset(); layer.remove(); }, 3000);
  }
}
$('spin').addEventListener('click', startSpin);
$('add').addEventListener('click', () => {
  if (items.length >= 100) { notice('팀원은 최대 100명까지 등록할 수 있어요.'); return; }
  items.push({ name: '', weight: 1 }); renderRoster(); update(); $('roster').lastElementChild.firstElementChild.focus();
});
$('bulk-add').addEventListener('click', () => {
  const names = $('bulk').value.split(/[,\n\r]+/).map(n => n.trim()).filter(Boolean);
  if (!names.length) { notice('추가할 이름을 입력해주세요.'); return; }
  const candidate = [...items.filter(item => item.name.trim() !== ''), ...names.map(name => ({ name, weight: 1 }))];
  try { items = DrawCore.validate(candidate); } catch (error) { notice(error.message); return; }
  $('bulk').value = ''; renderRoster(); save(); update(); notice(`${names.length}명을 추가했어요.`);
});
$('equal').addEventListener('click', () => { items.forEach(item => { item.weight = 1; }); renderRoster(); save(); update(); notice('모든 팀원의 가중치를 1로 맞췄어요.'); });
function setCount(value) { settings.count = Number(value); $('draw-count').value = value; save(); update(); }
$('draw-count').addEventListener('input', e => setCount(e.target.value));
$('minus').addEventListener('click', () => setCount(Math.max(1, (settings.count || 2) - 1)));
$('plus').addEventListener('click', () => setCount(Math.min(100, (settings.count || 0) + 1)));
$('exclude-last').addEventListener('change', e => { settings.exclude = e.target.checked; save(); update(); });
$('sound').addEventListener('change', e => { settings.sound = e.target.checked; save(); });
$('clear-history').addEventListener('click', () => {
  if (history.length && confirm('최근 추첨 기록을 모두 지울까요? 직전 당첨자 제외도 초기화됩니다.')) {
    history = []; lastResult = null; save(); renderHistory(); renderLatest(); update();
  }
});
$('show-result').addEventListener('click', () => openResult());
$('close-result').addEventListener('click', () => $('result-dialog').close());
$('copy').addEventListener('click', async () => {
  if (!lastResult) return;
  const text = `☕ 오늘의 커피 원정대: ${lastResult.names.join(', ')} (${lastResult.names.length}명)`;
  try {
    await navigator.clipboard.writeText(text); $('copy-status').textContent = '결과를 복사했어요. 팀 채팅에 붙여넣어보세요!';
  } catch { $('copy-status').textContent = `자동 복사가 지원되지 않아요. 아래 내용을 선택해서 복사해주세요: ${text}`; }
});
window.addEventListener('resize', drawWheel);
load(); renderRoster(); renderHistory(); renderLatest(); update(); if (storageWarning) notice(storageWarning);
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('service-worker.js').catch(() => { /* Offline installation is optional. */ });
}
