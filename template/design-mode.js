/* ============================================================================
   apple-ui-kit · design-mode.js
   ----------------------------------------------------------------------------
   自 soft-factory/tools/design-mode.js 引入的共享设备：给页面注入可交互的
   设计模式。使用者通过拖动 / 改文字 / 隐藏 / 写备注来快速调整，而不是用
   语言描述；最后导出 change-manifest.json，由 AI 按 data-eid 精确应用到源码。
   手动操作（拖/改/藏）与文字备注共同决定输出。

   生成契约（页面代码必须遵守）：
   1. 每个允许调整的元素都要有稳定的 data-eid="语义化唯一 ID"
   2. 支持拖动排序的容器：容器挂 data-eid，其直接子元素各自挂 data-eid
   3. 支持自由移动的元素：加 data-edrag="free"（记录 offsetLeft / offsetTop）
   4. 支持双击改文字的元素：加 data-etext

   行为：
   - 修改实时存入 sessionStorage，刷新页面不丢；「重置」清空并刷新
   - 备注过的元素常驻橙色角标（退出设计模式也可见）
   - 未进入设计模式时拖动会收到一次性提示

   依赖：宿主页面已引入 tokens.css 与 kit.css（产线保证）。
   ============================================================================ */
(() => {
  'use strict';
  if (window.__sfDesignMode) return;
  window.__sfDesignMode = true;

  /* ---------- 注入样式（全部走令牌，不写死色值） ---------- */
  const style = document.createElement('style');
  style.textContent = [
    '.dm-active { user-select: none; }',
    '.dm-active [data-eid] { cursor: grab; }',
    '.dm-active [data-eid]:hover { outline: 1.5px dashed var(--tint); outline-offset: 2px; }',
    '.dm-selected { outline: 2px solid var(--tint) !important; outline-offset: 2px; }',
    '.dm-dragging { opacity: .85; box-shadow: var(--shadow-3); position: relative; z-index: 30; }',
    '.dm-bar { position: fixed; right: var(--space-8); bottom: var(--space-8); z-index: 90;',
    '  display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); }',
    '.dm-count { font-size: var(--text-xs); color: var(--label-2); font-variant-numeric: tabular-nums; }',
    '.dm-pop { position: fixed; z-index: 95; display: flex; gap: var(--space-2); padding: var(--space-2); }',
    '.dm-pop[hidden] { display: none; }',
    '.dm-note { position: fixed; z-index: 96; display: flex; flex-direction: column;',
    '  gap: var(--space-2); padding: var(--space-3); width: 272px; }',
    '.dm-note[hidden] { display: none; }',
    '.dm-note-area { height: auto; min-height: 84px; padding: var(--space-2) var(--space-3);',
    '  line-height: var(--leading-base); resize: vertical; font-size: var(--text-sm); }',
    '.dm-noted { position: relative; }',
    '.dm-noted::after { content: ""; position: absolute; top: -4px; right: -4px; width: 8px; height: 8px;',
    '  border-radius: var(--radius-full); background: var(--system-orange);',
    '  box-shadow: 0 0 0 2px var(--bg-content); z-index: 5; }',
    '[contenteditable="true"] { outline: 2px solid var(--tint) !important; cursor: text;',
    '  user-select: text !important; }',
    '.dm-toasts { position: fixed; right: var(--space-8); bottom: 84px; z-index: 99;',
    '  display: flex; flex-direction: column; gap: var(--space-4); pointer-events: none; }',
    '.toast { transition: opacity var(--dur-normal) var(--ease-out),',
    '  transform var(--dur-normal) var(--ease-out); }',
    '.toast.is-out { opacity: 0; transform: translateY(8px); }',
    '.dm-dot { width: 8px; height: 8px; flex: none; margin-top: 4px;',
    '  border-radius: var(--radius-full); background: var(--system-green); }',
    '.toast--warn .dm-dot { background: var(--system-orange); }',
    '.toast--danger .dm-dot { background: var(--system-red); }'
  ].join('');
  document.head.appendChild(style);

  /* ---------- 工具条 ---------- */
  const bar = document.createElement('div');
  bar.className = 'glass dm-bar';
  const count = document.createElement('span');
  count.className = 'dm-count';
  count.textContent = '修改 0 条';
  const btnToggle = document.createElement('button');
  btnToggle.type = 'button';
  btnToggle.className = 'btn btn--primary btn--sm';
  btnToggle.textContent = '进入设计模式';
  const btnExport = document.createElement('button');
  btnExport.type = 'button';
  btnExport.className = 'btn btn--secondary btn--sm';
  btnExport.textContent = '导出清单';
  btnExport.disabled = true;
  const btnReset = document.createElement('button');
  btnReset.type = 'button';
  btnReset.className = 'btn btn--plain btn--sm';
  btnReset.textContent = '重置';
  bar.append(count, btnToggle, btnExport, btnReset);

  /* ---------- 选中弹窗 ---------- */
  const pop = document.createElement('div');
  pop.className = 'glass dm-pop';
  pop.hidden = true;
  const btnText = document.createElement('button');
  btnText.type = 'button';
  btnText.className = 'btn btn--secondary btn--sm';
  btnText.textContent = '改文字';
  const btnNote = document.createElement('button');
  btnNote.type = 'button';
  btnNote.className = 'btn btn--secondary btn--sm';
  btnNote.textContent = '备注';
  const btnHide = document.createElement('button');
  btnHide.type = 'button';
  btnHide.className = 'btn btn--destructive btn--sm';
  btnHide.textContent = '隐藏';
  pop.append(btnText, btnNote, btnHide);

  /* ---------- 备注编辑器 ---------- */
  const note = document.createElement('div');
  note.className = 'glass dm-note';
  note.hidden = true;
  const noteTitle = document.createElement('span');
  noteTitle.className = 'label';
  const noteArea = document.createElement('textarea');
  noteArea.className = 'input dm-note-area';
  noteArea.rows = 4;
  noteArea.placeholder = '写给 AI 的调整说明：这里想怎么改、为什么改。';
  const noteRow = document.createElement('div');
  noteRow.className = 'row';
  const noteSave = document.createElement('button');
  noteSave.type = 'button';
  noteSave.className = 'btn btn--primary btn--sm';
  noteSave.textContent = '保存备注';
  const noteClear = document.createElement('button');
  noteClear.type = 'button';
  noteClear.className = 'btn btn--plain btn--sm';
  noteClear.textContent = '清除';
  note.append(noteTitle, noteArea, noteRow);
  noteRow.append(noteSave, noteClear);

  const toastHost = document.createElement('div');
  toastHost.className = 'dm-toasts';

  const mount = () => document.body.append(bar, pop, note, toastHost);
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);

  /* ---------- 状态与持久化 ---------- */
  let active = false;
  let selected = null;
  let editing = null;
  let noteTarget = null;
  let hinted = false;
  const changes = new Map(); // key: op:target → 最新一条

  const storeKey = 'sf.design-mode.' + (location.pathname || 'page');
  const byEid = (id) => document.querySelector('[data-eid="' + id + '"]');

  function refresh() {
    count.textContent = '修改 ' + changes.size + ' 条';
    btnExport.disabled = changes.size === 0;
  }
  function persist() {
    try { sessionStorage.setItem(storeKey, JSON.stringify([...changes.values()])); } catch (e) { /* 忽略 */ }
  }
  function record(change) {
    changes.set(change.op + ':' + change.target, change);
    refresh();
    persist();
  }
  function dropChange(key) {
    changes.delete(key);
    refresh();
    persist();
  }

  function toast(kind, title, msg) {
    const t = document.createElement('div');
    t.className = 'toast' + (kind === 'warn' ? ' toast--warn' : kind === 'danger' ? ' toast--danger' : '');
    const dot = document.createElement('span');
    dot.className = 'dm-dot';
    const box = document.createElement('div');
    const ti = document.createElement('div');
    ti.className = 'toast__title';
    ti.textContent = title;
    const ms = document.createElement('div');
    ms.className = 'toast__msg';
    ms.textContent = msg;
    box.append(ti, ms);
    t.append(dot, box);
    toastHost.appendChild(t);
    setTimeout(() => t.classList.add('is-out'), 2200);
    setTimeout(() => t.remove(), 2600);
  }

  /* ---------- 恢复上次会话的修改 ---------- */
  function applyAll() {
    const list = [...changes.values()];
    list.filter((c) => c.op === 'order').forEach((c) => {
      const container = byEid(c.target);
      if (!container) return;
      c.value.forEach((id) => {
        const el = [...container.children].find((x) => x.getAttribute('data-eid') === id);
        if (el) container.appendChild(el);
      });
    });
    list.filter((c) => c.op === 'move').forEach((c) => {
      const el = byEid(c.target);
      if (el) { el.style.left = c.value.x + 'px'; el.style.top = c.value.y + 'px'; }
    });
    list.filter((c) => c.op === 'text').forEach((c) => {
      const el = byEid(c.target);
      if (el) el.textContent = c.value;
    });
    list.filter((c) => c.op === 'hide').forEach((c) => {
      const el = byEid(c.target);
      if (el) el.style.display = 'none';
    });
    list.filter((c) => c.op === 'note').forEach((c) => {
      const el = byEid(c.target);
      if (el) el.classList.add('dm-noted');
    });
  }
  function restore() {
    try {
      const raw = sessionStorage.getItem(storeKey);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      list.forEach((c) => changes.set(c.op + ':' + c.target, c));
      applyAll();
      refresh();
    } catch (e) { /* 忽略 */ }
  }

  /* ---------- 选中 ---------- */
  function placePop(el) {
    const r = el.getBoundingClientRect();
    pop.style.left = Math.min(window.innerWidth - 240, Math.max(8, r.left)) + 'px';
    pop.style.top = Math.min(window.innerHeight - 56, r.bottom + 8) + 'px';
  }
  function selectEl(el) {
    selected = el;
    el.classList.add('dm-selected');
    btnText.style.display = el.hasAttribute('data-etext') ? '' : 'none';
    pop.hidden = false;
    placePop(el);
  }
  function clearSelection() {
    if (selected) selected.classList.remove('dm-selected');
    selected = null;
    pop.hidden = true;
  }

  /* ---------- 备注编辑 ---------- */
  function openNote(el) {
    clearSelection();
    noteTarget = el;
    const eid = el.getAttribute('data-eid');
    const existing = changes.get('note:' + eid);
    noteTitle.textContent = '备注 · ' + eid + (existing ? '（已有）' : '');
    noteArea.value = existing ? existing.value : '';
    note.hidden = false;
    const r = el.getBoundingClientRect();
    note.style.left = Math.min(window.innerWidth - 292, Math.max(8, r.left)) + 'px';
    note.style.top = Math.min(window.innerHeight - 220, r.bottom + 8) + 'px';
    noteArea.focus();
  }
  function closeNote() {
    note.hidden = true;
    noteTarget = null;
  }
  noteSave.addEventListener('click', () => {
    if (!noteTarget) { closeNote(); return; }
    const eid = noteTarget.getAttribute('data-eid');
    const value = noteArea.value.trim();
    if (value) {
      record({ op: 'note', target: eid, value });
      noteTarget.classList.add('dm-noted');
    } else {
      dropChange('note:' + eid);
      noteTarget.classList.remove('dm-noted');
    }
    toast('ok', '备注已记录：' + eid, '会随修改清单一起导出给 AI。');
    closeNote();
  });
  noteClear.addEventListener('click', () => {
    if (!noteTarget) { closeNote(); return; }
    dropChange('note:' + noteTarget.getAttribute('data-eid'));
    noteTarget.classList.remove('dm-noted');
    closeNote();
  });

  /* ---------- 拖动：自由移动 / 容器内排序 ---------- */
  function containerEid(container) {
    const c = container.closest('[data-eid]');
    return c ? c.getAttribute('data-eid') : '';
  }
  function recordOrder(container) {
    const cid = containerEid(container);
    const ids = [...container.children]
      .filter((c) => c.hasAttribute('data-eid'))
      .map((c) => c.getAttribute('data-eid'));
    if (!cid || !ids.length) {
      toast('warn', '容器缺少 data-eid', '这次排序无法记录，请给容器补 data-eid。');
      return;
    }
    record({ op: 'order', target: cid, value: ids });
  }
  function reorderLive(el, ev) {
    const parent = el.parentElement;
    const sibs = [...parent.children].filter((c) => c !== el && c.hasAttribute('data-eid'));
    if (!sibs.length) return;
    let best = null;
    let bestD = Infinity;
    for (const s of sibs) {
      const r = s.getBoundingClientRect();
      const d = Math.hypot(ev.clientX - (r.left + r.width / 2), ev.clientY - (r.top + r.height / 2));
      if (d < bestD) { bestD = d; best = s; }
    }
    const r = best.getBoundingClientRect();
    const cs = getComputedStyle(parent);
    const horiz = cs.display.includes('flex') ? cs.flexDirection.startsWith('row') : r.width >= r.height;
    const before = horiz ? ev.clientX < r.left + r.width / 2 : ev.clientY < r.top + r.height / 2;
    parent.insertBefore(el, before ? best : best.nextSibling);
  }
  function startDrag(el, e) {
    const free = el.dataset.edrag === 'free';
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = el.offsetLeft;
    const oy = el.offsetTop;
    let moved = false;
    const move = (ev) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      if (!moved) { moved = true; el.classList.add('dm-dragging'); }
      if (free) {
        el.style.left = (ox + dx) + 'px';
        el.style.top = (oy + dy) + 'px';
      } else {
        reorderLive(el, ev);
      }
    };
    const up = () => {
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('pointercancel', up, true);
      el.classList.remove('dm-dragging');
      if (!moved) return;
      if (free) {
        record({ op: 'move', target: el.getAttribute('data-eid'), value: { x: el.offsetLeft, y: el.offsetTop } });
      } else {
        recordOrder(el.parentElement);
      }
      if (selected === el) placePop(el);
    };
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', up, true);
  }

  /* ---------- 设计模式开关 ---------- */
  function enter() {
    active = true;
    document.body.classList.add('dm-active');
    btnToggle.textContent = '退出设计模式';
    btnToggle.className = 'btn btn--secondary btn--sm';
    toast('ok', '设计模式已开启', '点选元素 · 拖动排序或移动 · 双击改文字 · 点「备注」写给 AI。');
  }
  function exit() {
    active = false;
    if (editing) { editing.contentEditable = 'false'; editing = null; }
    clearSelection();
    closeNote();
    document.body.classList.remove('dm-active');
    btnToggle.textContent = '进入设计模式';
    btnToggle.className = 'btn btn--primary btn--sm';
  }
  btnToggle.addEventListener('click', () => { active ? exit() : enter(); });
  btnReset.addEventListener('click', () => {
    try { sessionStorage.removeItem(storeKey); } catch (e) { /* 忽略 */ }
    location.reload();
  });

  /* ---------- 设计模式下的全局交互 ---------- */
  // 拦截应用自身的 click，避免设计模式里误触业务逻辑
  document.addEventListener('click', (e) => {
    if (!active) return;
    if (bar.contains(e.target) || pop.contains(e.target) || note.contains(e.target)) return;
    e.stopPropagation();
    e.preventDefault();
  }, true);

  document.addEventListener('pointerdown', (e) => {
    // 未开模式：点在可调元素上时提示一次
    if (!active) {
      if (!hinted && e.target.closest && e.target.closest('[data-eid]')) {
        hinted = true;
        toast('warn', '这一页可以拖改', '先点右下角「进入设计模式」，再拖动 / 双击 / 加备注。');
      }
      return;
    }
    if (bar.contains(e.target) || pop.contains(e.target) || note.contains(e.target)) return;
    // 点在备注编辑器外面 → 关掉备注（不保存，保存走按钮）
    if (!note.hidden) { closeNote(); }
    const t = e.target.closest('[data-eid]');
    if (!t) { clearSelection(); return; }
    if (editing) return;
    if (t !== selected) selectEl(t);
    startDrag(t, e);
  }, true);

  // 双击进入文字编辑
  document.addEventListener('dblclick', (e) => {
    if (!active) return;
    const t = e.target.closest('[data-etext][data-eid]');
    if (!t || editing) return;
    e.preventDefault();
    editing = t;
    t.contentEditable = 'true';
    t.focus();
    document.execCommand && document.execCommand('selectAll', false, null);
  });

  document.addEventListener('focusout', (e) => {
    if (!active || !editing || e.target !== editing) return;
    const t = editing;
    editing = null;
    t.contentEditable = 'false';
    record({ op: 'text', target: t.getAttribute('data-eid'), value: t.textContent.trim() });
  });

  document.addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.key === 'Enter' && editing) { e.preventDefault(); editing.blur(); return; }
    if (e.key === 'Escape') {
      if (!note.hidden) { closeNote(); return; }
      if (editing) editing.blur();
      else exit();
    }
  });

  // 选中弹窗动作
  btnText.addEventListener('click', () => {
    if (!selected) return;
    const el = selected;
    clearSelection();
    editing = el;
    el.contentEditable = 'true';
    el.focus();
    document.execCommand && document.execCommand('selectAll', false, null);
  });
  btnNote.addEventListener('click', () => {
    if (selected) openNote(selected);
  });
  btnHide.addEventListener('click', () => {
    if (!selected) return;
    const el = selected;
    record({ op: 'hide', target: el.getAttribute('data-eid') });
    clearSelection();
    el.style.display = 'none';
    toast('warn', '已隐藏：' + el.getAttribute('data-eid'), '导出清单后由 AI 在源码中处理。');
  });

  window.addEventListener('resize', () => {
    if (selected) placePop(selected);
  });

  /* ---------- 导出修改清单 ---------- */
  function download(name, text, mime) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  btnExport.addEventListener('click', () => {
    if (!changes.size) { toast('warn', '没有修改', '先进入设计模式做些调整。'); return; }
    const data = {
      tool: 'soft-factory/design-mode',
      version: 1,
      exportedAt: new Date().toISOString(),
      page: location.pathname.split('/').pop() || 'index.html',
      note: 'changes 中 op=note 的条目是使用者写给 AI 的调整说明，与操作类修改共同生效。',
      changes: [...changes.values()]
    };
    download('change-manifest.json', JSON.stringify(data, null, 2), 'application/json');
    toast('ok', '已导出 change-manifest.json', changes.size + ' 条修改（含备注），交给 AI 应用到源码。');
  });

  /* ---------- 启动 ---------- */
  const boot = () => { restore(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
