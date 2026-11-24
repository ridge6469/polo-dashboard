'use strict';
(() => {
  // ============================================================
  // 配置与状态
  // ============================================================
  const API = 'https://notes.fuckingclaude.top:8446/polo';
  const SESSION_KEY = 'polo_session';
  const S = { token: null, user: null, timers: [], dash: null, pending: null, pendingAt: 0, accountsCache: null, accountsAt: 0, charts: [], onTheme: null, jobs: 0 };
  // 本页加载的版本（index.html 里 app.js?v=NN）：发布新版后已打开的页面靠它发现并自动换新版
  const APP_V = (((document.currentScript && document.currentScript.src) || '').match(/[?&]v=(\d+)/) || [])[1] || null;
  const ADMIN_RESOURCES = { accounts: '/v1/accounts', summary: '/v1/summary', usage: '/v1/usage', proxies: '/v1/proxies', archived: '/v1/archived-accounts', vendor: '/v1/vendor-usage', realtime: '/v1/realtime' };

  // ============================================================
  // DOM 工具
  // ============================================================
  const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'htmlFor', 'required', 'readOnly']);
  function h(tag, props, ...kids) {
    const n = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'style') Object.assign(n.style, v);
        else if (k === 'dataset') Object.assign(n.dataset, v);
        else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else if (PROPS.has(k)) n[k] = v;
        else n.setAttribute(k, v === true ? '' : v);
      }
    }
    append(n, kids);
    return n;
  }
  function append(n, ...kids) {
    for (const k of kids.flat(Infinity)) {
      if (k === null || k === undefined || k === false) continue;
      n.append(k instanceof Node ? k : document.createTextNode(String(k)));
    }
    return n;
  }
  const clear = (n, ...kids) => { n.replaceChildren(); return append(n, kids); };

  const ICONS = {
    chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
    users: 'M17 20h5v-2a4 4 0 00-5-3.87M9 20H2v-2a4 4 0 015-3.87m6-4.13a4 4 0 11-8 0 4 4 0 018 0zm6 2a3 3 0 11-6 0 3 3 0 016 0z',
    ticket: 'M15 5v2m0 4v2m0 4v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z',
    log: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6-4h6',
    cog: 'M10.3 4.3c.4-1.8 3-1.8 3.4 0a1.7 1.7 0 002.6 1.1c1.6-1 3.4.8 2.4 2.4a1.7 1.7 0 001 2.6c1.8.4 1.8 3 0 3.4a1.7 1.7 0 00-1 2.6c1 1.6-.8 3.4-2.4 2.4a1.7 1.7 0 00-2.6 1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 00-2.6-1c-1.6 1-3.4-.8-2.4-2.4a1.7 1.7 0 00-1-2.6c-1.8-.4-1.8-3 0-3.4a1.7 1.7 0 001-2.6c-1-1.6.8-3.4 2.4-2.4a1.7 1.7 0 002.6-1.1zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
    logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
    sun: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36l-.7-.7M6.34 6.34l-.7-.7m12.72 0l-.7.7M6.34 17.66l-.7.7M16 12a4 4 0 11-8 0 4 4 0 018 0z',
    moon: 'M20.35 15.35A9 9 0 018.65 3.65a9 9 0 1011.7 11.7z',
    monitor: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    refresh: 'M4 4v5h.58m15.36 2A8 8 0 004.58 9m0 0H9m11 11v-5h-.58m0 0a8 8 0 01-15.36-2m15.36 2H15',
    search: 'M21 21l-5.2-5.2M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z',
    menu: 'M4 6h16M4 12h16M4 18h16',
    down: 'M19 9l-7 7-7-7',
    eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.46 12C3.73 7.94 7.52 5 12 5s8.27 2.94 9.54 7c-1.27 4.06-5.06 7-9.54 7s-8.27-2.94-9.54-7z',
    eyeOff: 'M13.88 18.83A10 10 0 0112 19c-4.48 0-8.27-2.94-9.54-7a10 10 0 013.03-4.47M9.88 9.88a3 3 0 104.24 4.24M3 3l18 18M17.94 17.94A10 10 0 0021.54 12C20.27 7.94 16.48 5 12 5c-1.47 0-2.86.32-4.12.88',
    copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
    check: 'M5 13l4 4L19 7',
    x: 'M6 18L18 6M6 6l12 12',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    shield: 'M9 12l2 2 4-4m5.6-4.98A12 12 0 0112 2.94a12 12 0 01-8.6 3.04A12 12 0 003 9c0 5.6 3.82 10.3 9 11.62 5.18-1.33 9-6.03 9-11.62 0-1.04-.13-2.05-.38-3.02z',
    bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    dollar: 'M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-8c1.11 0 2.08.4 2.6 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.4-2.6-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    trend: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    server: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
    activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
    cube: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    key: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.74 5.74L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.59a1 1 0 01.29-.7l5.97-5.97A6 6 0 1121 9z',
    plus: 'M12 4v16m8-8H4',
    warning: 'M12 9v2m0 4h.01m-6.94 4h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    archive: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
    globe: 'M3.05 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.95M8 3.94V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.06M15 20.49V18a2 2 0 012-2h3.06M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    link: 'M13.83 10.17a4 4 0 00-5.66 0l-4 4a4 4 0 105.66 5.66l1.1-1.1m-.76-4.9a4 4 0 005.66 0l4-4a4 4 0 00-5.66-5.66l-1.1 1.1',
    inbox: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.59a1 1 0 00-.7.29l-2.42 2.42a1 1 0 01-.7.29h-3.18a1 1 0 01-.7-.29l-2.42-2.42a1 1 0 00-.7-.29H4',
  };
  function icon(name, cls = 'icon') {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', name === 'more' ? '3' : '1.8');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('class', cls);
    s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', ICONS[name] || ICONS.info);
    s.append(p);
    return s;
  }

  // ============================================================
  // 格式化
  // ============================================================
  const dash = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));
  const toNum = (s) => {
    if (s === null || s === undefined) return null;
    if (typeof s === 'number') return s;
    const m = String(s).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : null;
  };
  // 带 k / M / B 后缀的数字（Polo 卡片上的 TPM 如 “1367.5k”）
  const numK = (s) => {
    const m = String(s === null || s === undefined ? '' : s).replace(/,/g, '').match(/(-?\d+(?:\.\d+)?)\s*([kKmMbB])?/);
    return m ? Number(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[(m[2] || '').toLowerCase()] || 1) : null;
  };
  function compact(s) {
    const n = toNum(s);
    if (n === null) return '—';
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString('zh-CN');
  }
  const money = (n) => (n === null ? '—' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const pct = (p) => (Number.isInteger(p) ? p : Number(p).toFixed(1)) + '%';
  // 账号识别键：邮箱（小写）；没有邮箱的账号为 name:显示名
  const keyText = (k) => (typeof k === 'string' && k.startsWith('name:') ? k.slice(5) + '（无邮箱）' : String(k));
  const toDate = (v) => (typeof v === 'number' ? new Date(v * 1000) : new Date(v));
  function ago(v) {
    if (v === null || v === undefined || v === '') return null;
    const s = (Date.now() - toDate(v).getTime()) / 1000;
    if (isNaN(s)) return null;
    if (s < 60) return '刚刚';
    if (s < 3600) return Math.floor(s / 60) + ' 分钟前';
    if (s < 86400) return Math.floor(s / 3600) + ' 小时前';
    return Math.floor(s / 86400) + ' 天前';
  }
  function until(v) {
    const ms = toDate(v).getTime() - Date.now();
    if (isNaN(ms) || ms <= 0) return null;
    const m = Math.floor(ms / 60000);
    const d = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60), mm = m % 60;
    if (d) return `${d}天${hh}小时`;
    if (hh) return `${hh}小时${mm}分`;
    return `${Math.max(mm, 1)}分钟`;
  }
  function fmtTime(v, withDate = true) {
    if (v === null || v === undefined) return '—';
    const d = toDate(v);
    if (isNaN(d)) return '—';
    const o = { timeZone: 'Asia/Shanghai', hour12: false, hour: '2-digit', minute: '2-digit' };
    if (withDate) Object.assign(o, { year: 'numeric', month: '2-digit', day: '2-digit' });
    return d.toLocaleString('zh-CN', o);
  }

  // ============================================================
  // 提示、弹窗、菜单
  // ============================================================
  function toast(text, kind = 'info', ms = 3800) {
    let box = document.querySelector('.toasts');
    if (!box) { box = h('div', { class: 'toasts' }); document.body.append(box); }
    const ic = { ok: 'check', bad: 'x', warn: 'warning', info: 'info' }[kind] || 'info';
    const t = h('div', { class: 'toast t-' + kind, role: 'status' }, icon(ic), h('span', { text }));
    box.append(t);
    setTimeout(() => t.remove(), ms);
  }

  function modal({ title, body, actions = [], wide = false, onClose }) {
    const overlay = h('div', { class: 'modal-overlay' });
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); onClose && onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const foot = h('div', { class: 'modal-foot' });
    for (const a of actions) {
      foot.append(h('button', {
        class: 'btn ' + (a.kind || 'btn-secondary'), type: 'button',
        onclick: async (e) => {
          if (!a.onClick) return close();
          const b = e.currentTarget; b.disabled = true;
          try { const r = await a.onClick(close); if (r !== false) close(); } finally { b.disabled = false; }
        },
      }, a.label));
    }
    const box = h('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'modal-head' }, h('h3', { text: title }), h('button', { class: 'btn btn-ghost btn-icon', type: 'button', 'aria-label': '关闭', onclick: close }, icon('x'))),
      h('div', { class: 'modal-body' }, body),
      actions.length ? foot : null);
    overlay.append(box);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    document.body.append(overlay);
    return { close };
  }
  function confirmBox(title, message, { danger = false, okText = '确定' } = {}) {
    return new Promise((resolve) => {
      let done = false;
      modal({
        title, body: h('p', { style: { margin: 0, color: 'var(--text-2)' }, text: message }),
        onClose: () => { if (!done) resolve(false); },
        actions: [
          { label: '取消' },
          { label: okText, kind: danger ? 'btn-danger' : 'btn-primary', onClick: () => { done = true; resolve(true); } },
        ],
      });
    });
  }

  let openMenu = null, openAnchor = null;
  function menu(anchor, items, head) {
    if (openMenu) { const same = openAnchor === anchor; openMenu(); if (same) return; }
    const m = h('div', { class: 'menu', role: 'menu' });
    if (head) m.append(h('div', { class: 'menu-head' }, head));
    for (const it of items) {
      if (it === '-') { m.append(h('div', { class: 'menu-sep' })); continue; }
      m.append(h('button', {
        class: 'menu-item' + (it.danger ? ' danger' : ''), type: 'button', disabled: !!it.disabled, title: it.title || null,
        onclick: () => { close(); it.onClick && it.onClick(); },
      }, it.icon ? icon(it.icon, 'icon icon-sm') : null, h('span', { text: it.label }), it.checked ? icon('check', 'icon icon-sm tick') : null));
    }
    document.body.append(m);
    const r = anchor.getBoundingClientRect();
    const w = m.offsetWidth, hgt = m.offsetHeight;
    let left = Math.min(r.right - w, window.innerWidth - w - 8);
    left = Math.max(8, left);
    let top = r.bottom + 6;
    if (top + hgt > window.innerHeight - 8) top = Math.max(8, r.top - hgt - 6);
    m.style.left = left + 'px'; m.style.top = top + 'px';
    const outside = (e) => { if (!m.contains(e.target) && !anchor.contains(e.target)) close(); };
    const key = (e) => { if (e.key === 'Escape') close(); };
    function close() {
      m.remove(); document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close);
      if (openMenu === close) { openMenu = null; openAnchor = null; }
    }
    setTimeout(() => { document.addEventListener('mousedown', outside); document.addEventListener('keydown', key); window.addEventListener('scroll', close, true); window.addEventListener('resize', close); });
    openMenu = close; openAnchor = anchor;
  }

  async function copy(text, what = '内容') {
    try { await navigator.clipboard.writeText(text); toast(`已复制${what}`, 'ok'); }
    catch { toast('复制失败，请手动选择复制', 'warn'); }
  }

  // ============================================================
  // 主题
  // ============================================================
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const getTheme = () => localStorage.getItem('polo_theme') || 'system';
  function applyTheme() {
    const t = getTheme();
    document.documentElement.classList.toggle('dark', t === 'dark' || (t === 'system' && media.matches));
  }
  media.addEventListener('change', applyTheme);
  function setTheme(t) { localStorage.setItem('polo_theme', t); applyTheme(); }
  function themeButton() {
    const btn = h('button', { class: 'btn btn-ghost btn-icon', type: 'button', title: '切换主题', 'aria-label': '切换主题' });
    const paint = () => clear(btn, icon(document.documentElement.classList.contains('dark') ? 'moon' : 'sun'));
    paint();
    btn.addEventListener('click', () => menu(btn, [
      { label: '浅色', icon: 'sun', checked: getTheme() === 'light', onClick: () => { setTheme('light'); paint(); } },
      { label: '深色', icon: 'moon', checked: getTheme() === 'dark', onClick: () => { setTheme('dark'); paint(); } },
      { label: '跟随系统', icon: 'monitor', checked: getTheme() === 'system', onClick: () => { setTheme('system'); paint(); } },
    ]));
    return btn;
  }

  // ============================================================
  // 会话与接口
  // ============================================================
  function loadSession() {
    for (const store of [sessionStorage, localStorage]) {
      try {
        const s = JSON.parse(store.getItem(SESSION_KEY) || 'null');
        if (s && s.token && s.exp > Date.now()) { S.token = s.token; S.user = s.user; S.store = store; return; }
        store.removeItem(SESSION_KEY);
      } catch { store.removeItem(SESSION_KEY); }
    }
  }
  function saveSession(token, user, ttl, remember) {
    clearSession();
    S.token = token; S.user = user; S.store = remember ? localStorage : sessionStorage;
    S.store.setItem(SESSION_KEY, JSON.stringify({ token, user, exp: Date.now() + (ttl - 60) * 1000 }));
  }
  function persistUser() {
    if (!S.store) return;
    try { const s = JSON.parse(S.store.getItem(SESSION_KEY)); s.user = S.user; S.store.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }
  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY);
    S.token = null; S.user = null; S.dash = null; S.pending = null; S.accountsCache = null;
  }

  class ApiError extends Error { constructor(status, code, body) { super(code); this.status = status; this.code = code; this.body = body; } }
  const ERR = {
    network: '无法连接服务器，请检查网络后重试',
    wrong_credentials: '用户名或密码错误',
    too_many_attempts: '尝试次数过多，请 15 分钟后再试',
    account_pending: '账号正在等待管理员审批',
    account_disabled: '账号已被停用，请联系管理员',
    invalid_invite: '邀请码无效、已用完或已过期',
    username_taken: '用户名已被使用',
    invalid_username: '用户名需为 3-32 位字母、数字、下划线、点或短横线',
    weak_password: '密码需为 10-128 位，且不能与当前密码相同',
    wrong_old_password: '当前密码不正确',
    last_admin: '不能停用、删除或降级最后一个管理员',
    cannot_modify_self: '不能对自己执行这个操作',
    not_pending: '该用户不在待审批状态',
    not_disabled: '该用户没有被停用',
    admin_required: '需要管理员权限',
    backend_unavailable: '数据服务暂时不可用',
    snapshot_unavailable: '服务器还没有采集到数据，请稍后再试',
    login_required: '请先登录',
    http_429: '请求太频繁，请稍后再试',
  };
  const errText = (e) => ERR[e && e.code] || (e && e.status ? `请求失败（HTTP ${e.status}）` : '请求失败');

  async function api(method, path, body) {
    const headers = {};
    if (S.token) headers.Authorization = 'Bearer ' + S.token;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let r;
    try {
      r = await fetch(API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', referrerPolicy: 'no-referrer' });
    } catch { throw new ApiError(0, 'network'); }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = new ApiError(r.status, data.error || 'http_' + r.status, data);
      if (r.status === 401 && S.token && !path.startsWith('/auth/')) {
        clearSession(); toast('登录已过期，请重新登录', 'warn'); go('#/login');
      } else if (r.status === 403 && data.error === 'password_change_required' && S.user) {
        S.user.must_change_password = true; persistUser(); go('#/settings');
      }
      throw err;
    }
    return data;
  }

  async function logout() {
    const t = S.token;
    clearSession();
    if (t) fetch(API + '/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + t } }).catch(() => {});
    go('#/login');
  }

  // ============================================================
  // 路由
  // ============================================================
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function stopTimers() {
    S.timers.forEach(clearInterval); S.timers = []; if (openMenu) openMenu();
    S.onTheme = null; (S.charts || []).forEach((c) => { try { c.dispose(); } catch { /* ignore */ } }); S.charts = [];
  }
  const isAdmin = () => S.user && S.user.role === 'admin';

  function render() {
    stopTimers();
    document.querySelectorAll('.modal-overlay').forEach((m) => m.remove());
    const raw = location.hash.slice(1) || '/';
    const [path, q = ''] = raw.split('?');
    const params = new URLSearchParams(q);
    if (!S.token) return path === '/register' ? pageRegister(params) : pageLogin();
    if (path === '/' || path === '/login' || path === '/register') return go('#/dashboard');
    if (S.user.must_change_password && path !== '/settings') return go('#/settings');
    if (path.startsWith('/admin') && !isAdmin()) return go('#/dashboard');
    switch (path) {
      case '/dashboard': return pageDashboard();
      case '/archived': return pageArchived();
      case '/pool-trend': return pagePoolTrend();
      case '/windows': return pageWindows(params);
      case '/earnings': return pageEarnings();
      case '/admin/settle': return pageSettle(params);
      case '/admin/stats': return pageStats();
      case '/admin/users': return pageUsers();
      case '/admin/invites': return pageInvites();
      case '/admin/logs': return pageLogs();
      case '/settings': return pageSettings();
      default: return go('#/dashboard');
    }
  }

  // ============================================================
  // 通用表单组件
  // ============================================================
  function field(label, control, hint) {
    return h('div', { class: 'field' }, h('label', { class: 'label', text: label }), control, hint ? h('div', { class: 'hint', text: hint }) : null);
  }
  function leadInput(iconName, props) {
    const input = h('input', Object.assign({ class: 'input has-lead' }, props));
    return { input, wrap: h('div', { class: 'input-wrap' }, h('span', { class: 'lead' }, icon(iconName, 'icon icon-sm')), input) };
  }
  function passwordInput(props) {
    const input = h('input', Object.assign({ class: 'input', type: 'password' }, props));
    const eye = h('button', { class: 'btn btn-ghost btn-icon btn-sm trail', type: 'button', 'aria-label': '显示密码', tabindex: '-1' }, icon('eye', 'icon icon-sm'));
    eye.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      clear(eye, icon(show ? 'eyeOff' : 'eye', 'icon icon-sm'));
    });
    return { input, wrap: h('div', { class: 'input-wrap' }, input, eye) };
  }
  function strengthMeter(input) {
    const el = h('div', { class: 'strength' }, h('i'), h('i'), h('i'), h('i'));
    input.addEventListener('input', () => {
      const v = input.value;
      let s = 0;
      if (v.length >= 10) s++;
      if (v.length >= 14) s++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
      if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) s++;
      el.className = 'strength' + (v ? ' s' + Math.max(1, s) : '');
    });
    return el;
  }
  const USER_RE = /^[A-Za-z0-9_.-]{3,32}$/;

  // ============================================================
  // 认证页
  // ============================================================
  function mountAuth(card, foot) {
    const root = h('div', { class: 'auth' },
      h('div', { class: 'bg' }, h('div', { class: 'orb orb-1' }), h('div', { class: 'orb orb-2' }), h('div', { class: 'orb orb-3' })),
      h('div', { class: 'auth-top' }, themeButton()),
      h('div', { class: 'auth-box' },
        h('div', { class: 'brand-hero' },
          h('div', { class: 'logo-tile' }, icon('bolt')),
          h('h1', { class: 'gradient-text', text: 'Polo 用量看板' }),
          h('p', { text: 'Claude 账号池额度、用量与重置时间一览' })),
        card, foot,
        h('div', { class: 'auth-copy', text: `© ${new Date().getFullYear()} Polo Dashboard · 只读数据，不会修改后台` })));
    clear(document.getElementById('root'), root);
  }

  function pageLogin(message) {
    const u = leadInput('user', { autocomplete: 'username', placeholder: '用户名', required: true, value: S.prefillUser || '' });
    const p = passwordInput({ autocomplete: 'current-password', placeholder: '密码', required: true });
    const remember = h('input', { type: 'checkbox' });
    const err = h('div', { class: 'form-error', role: 'alert', text: message || '' });
    const btn = h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, '登录');
    const form = h('form', { novalidate: true },
      field('用户名', u.wrap), field('密码', p.wrap),
      h('label', { class: 'check', style: { marginBottom: '6px' } }, remember, '保持登录（关闭浏览器后仍有效）'),
      err, btn);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      if (!u.input.value.trim() || !p.input.value) { err.textContent = '请输入用户名和密码'; return; }
      btn.disabled = true; clear(btn, icon('refresh', 'icon icon-sm spin'), '登录中…');
      try {
        const r = await api('POST', '/auth/login', { username: u.input.value.trim(), password: p.input.value });
        saveSession(r.token, r.user, r.expires_in, remember.checked);
        S.prefillUser = '';
        toast(`欢迎回来，${r.user.username}`, 'ok');
        go(r.user.must_change_password ? '#/settings' : '#/dashboard');
      } catch (ex) {
        err.textContent = errText(ex);
        btn.disabled = false; clear(btn, '登录');
      }
    });
    mountAuth(
      h('div', { class: 'card auth-card' }, h('h2', { text: '欢迎回来' }), h('p', { class: 'sub', text: '登录后查看你可以访问的账号额度与用量' }), form),
      h('div', { class: 'auth-foot' }, '有邀请码？', h('a', { href: '#/register' }, '立即注册')));
    (u.input.value ? p.input : u.input).focus();
  }

  function pageRegister(params) {
    const code = leadInput('ticket', { placeholder: 'XXXX-XXXX-XXXX', autocomplete: 'off', value: params.get('code') || '', class: 'input has-lead mono' });
    const u = leadInput('user', { autocomplete: 'username', placeholder: '3-32 位字母、数字、_ . -' });
    const p = passwordInput({ autocomplete: 'new-password', placeholder: '至少 10 位' });
    const p2 = passwordInput({ autocomplete: 'new-password', placeholder: '再输入一次' });
    const err = h('div', { class: 'form-error', role: 'alert' });
    const btn = h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, '注册');
    const card = h('div', { class: 'card auth-card' });
    const form = h('form', { novalidate: true },
      field('邀请码', code.wrap, '向管理员索取；邀请码决定你能看到哪些账号'),
      field('用户名', u.wrap),
      field('密码', h('div', {}, p.wrap, strengthMeter(p.input))),
      field('确认密码', p2.wrap),
      err, btn);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      const name = u.input.value.trim();
      if (!code.input.value.trim()) return void (err.textContent = '请输入邀请码');
      if (!USER_RE.test(name)) return void (err.textContent = ERR.invalid_username);
      if (p.input.value.length < 10 || p.input.value.length > 128) return void (err.textContent = '密码需为 10-128 位');
      if (p.input.value !== p2.input.value) return void (err.textContent = '两次输入的密码不一致');
      btn.disabled = true; clear(btn, icon('refresh', 'icon icon-sm spin'), '提交中…');
      try {
        const r = await api('POST', '/auth/register', { username: name, password: p.input.value, invite: code.input.value.trim() });
        S.prefillUser = name;
        const ok = r.status === 'active';
        clear(card, h('div', { class: 'success-state' },
          h('div', { class: 'ring', style: { background: ok ? 'var(--ok-bg)' : 'var(--warn-bg)', color: ok ? 'var(--ok)' : 'var(--warn)' } }, icon(ok ? 'check' : 'clock')),
          h('h2', { text: ok ? '注册成功' : '注册已提交' }),
          h('p', { class: 'sub', text: ok ? `账号 ${name} 已开通，现在就可以登录。` : `账号 ${name} 需要管理员审批，通过后即可登录。` }),
          h('a', { class: 'btn btn-primary btn-block', href: '#/login', style: { textDecoration: 'none' } }, '去登录')));
      } catch (ex) {
        err.textContent = errText(ex);
        btn.disabled = false; clear(btn, '注册');
      }
    });
    append(card, h('h2', { text: '创建账号' }), h('p', { class: 'sub', text: '凭管理员发放的邀请码注册' }), form);
    mountAuth(card, h('div', { class: 'auth-foot' }, '已有账号？', h('a', { href: '#/login' }, '去登录')));
    (code.input.value ? u.input : code.input).focus();
  }

  // ============================================================
  // 应用布局
  // ============================================================
  function appLayout({ active, title, desc }) {
    const locked = !!(S.user && S.user.must_change_password);
    const nav = h('nav', { class: 'side-nav' });
    const link = (hash, iconName, label, extra) => h('a', {
      class: 'side-link' + (active === hash ? ' active' : '') + (locked && hash !== '#/settings' ? ' disabled' : ''),
      href: hash, onclick: () => sidebar.classList.remove('open'),
    }, icon(iconName), h('span', { text: label }), extra || null);
    const pendingBadge = h('span', { class: 'count', hidden: true });
    append(nav,
      h('div', { class: 'side-section', text: '概览' }),
      link('#/dashboard', 'chart', '用量看板'),
      link('#/archived', 'archive', '已归档'),
      link('#/pool-trend', 'activity', '总池并发走势'),
      link('#/windows', 'clock', '额度窗口'),
      isAdmin() ? link('#/admin/stats', 'trend', '统计看板') : null,
      !isAdmin() ? link('#/earnings', 'dollar', '我的收益') : null,
      isAdmin() ? [
        h('div', { class: 'side-section', text: '管理' }),
        link('#/admin/settle', 'dollar', '结算'),
        link('#/admin/users', 'users', '用户管理', pendingBadge),
        link('#/admin/invites', 'ticket', '邀请码'),
        link('#/admin/logs', 'log', '登录记录'),
      ] : null,
      h('div', { class: 'side-section', text: '账户' }),
      link('#/settings', 'cog', '个人设置'));
    const sidebar = h('aside', { class: 'sidebar' },
      h('div', { class: 'side-brand' }, h('div', { class: 'logo' }, icon('bolt')), h('div', {}, h('b', { class: 'gradient-text', text: 'Polo 看板' }), h('small', { text: '账号额度与用量' }))),
      nav,
      h('div', { class: 'side-foot', text: '完整数据约每 3 分钟采集一次，实时数字每 15 秒' }));
    const backdrop = h('div', { class: 'backdrop', hidden: true, onclick: () => toggleSide(false) });
    function toggleSide(open) { sidebar.classList.toggle('open', open); backdrop.hidden = !open; }

    const userChip = h('button', { class: 'user-chip', type: 'button' },
      h('span', { class: 'avatar', text: (S.user.username || '?').slice(0, 1) }),
      h('span', { class: 'uname', text: S.user.username }), icon('down', 'icon icon-sm'));
    userChip.addEventListener('click', () => menu(userChip, [
      { label: '个人设置', icon: 'cog', onClick: () => go('#/settings') },
      '-',
      { label: '退出登录', icon: 'logout', danger: true, onClick: logout },
    ], h('div', {}, h('b', { text: S.user.username }), ' · ', isAdmin() ? '管理员' : '普通用户')));

    const main = h('main', { class: 'content' });
    // 手机底部导航（宽度 ≤ 760px 时显示）：常用页面一键切换，其余放在“更多”里（打开侧边栏）
    const bnBadge = h('span', { class: 'count', hidden: true });
    const BN = isAdmin()
      ? [['#/dashboard', 'chart', '看板'], ['#/admin/stats', 'trend', '统计'], ['#/admin/settle', 'dollar', '结算'], ['#/admin/users', 'users', '用户', bnBadge]]
      : [['#/dashboard', 'chart', '看板'], ['#/archived', 'archive', '已归档'], ['#/earnings', 'dollar', '收益'], ['#/settings', 'cog', '设置']];
    const inBn = BN.some(([hs]) => hs === active);
    const bottomNav = locked ? null : h('nav', { class: 'bottom-nav', 'aria-label': '快速导航' },
      BN.map(([hs, ic, label, badge]) => h('a', { class: 'bn-item' + (active === hs ? ' active' : ''), href: hs }, h('span', { class: 'bn-ic' }, icon(ic), badge || null), h('span', { text: label }))),
      isAdmin() ? h('button', { class: 'bn-item' + (inBn ? '' : ' active'), type: 'button', onclick: () => toggleSide(true) }, h('span', { class: 'bn-ic' }, icon('menu')), h('span', { text: '更多' })) : null);
    const shell = h('div', { class: 'shell' },
      h('header', { class: 'topbar' },
        h('div', { class: 'row', style: { minWidth: 0 } },
          h('button', { class: 'btn btn-ghost btn-icon menu-btn', type: 'button', 'aria-label': '菜单', onclick: () => toggleSide(true) }, icon('menu')),
          h('div', { style: { minWidth: 0 } }, h('h1', { text: title }), desc ? h('p', { text: desc }) : null)),
        h('div', { class: 'row' }, themeButton(), userChip)),
      main);
    clear(document.getElementById('root'), h('div', { class: 'app' + (bottomNav ? ' has-bn' : '') }, h('div', { class: 'bg' }), sidebar, backdrop, shell, bottomNav));

    if (isAdmin() && !locked) refreshPending([pendingBadge, bnBadge]);
    return { main };
  }
  async function refreshPending(badges) {
    const paint = () => { for (const badge of badges) { badge.hidden = !S.pending; badge.textContent = S.pending || ''; } };
    paint();
    if (Date.now() - S.pendingAt < 60000) return;
    S.pendingAt = Date.now();
    try {
      const r = await api('GET', '/admin/users');
      S.pending = r.users.filter((u) => u.status === 'pending').length;
      paint();
    } catch { /* ignore */ }
  }

  // 说明文字：电脑上默认展开，手机上默认收起（点标题展开）
  const isPhone = () => window.matchMedia('(max-width: 760px)').matches;
  // 用户正在滑动 / 触摸时，推迟自动刷新和整块重绘，避免滑到一半页面重排、卡一下
  S.lastTouch = 0;
  for (const ev of ['scroll', 'touchstart', 'touchmove', 'wheel']) window.addEventListener(ev, () => { S.lastTouch = Date.now(); }, { passive: true, capture: true });
  const busyScrolling = () => Date.now() - S.lastTouch < 1500;
  function whenIdle(fn, tries = 0) { if (!busyScrolling() || tries > 20) return fn(); setTimeout(() => whenIdle(fn, tries + 1), 500); }
  // 用户正在操作（滑动、开着弹窗或菜单、在输入框里、结算任务在跑）：自动刷新和换新版都先等一等。
  // strict=false（换新版用）：输入框只是自动获得了焦点、里面是空的、一分钟内没打字，不算在操作
  for (const ev of ['input', 'keydown']) window.addEventListener(ev, () => { S.lastType = Date.now(); }, { passive: true, capture: true });
  const editing = (strict) => {
    const a = document.activeElement;
    if (!a || !/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return false;
    return strict || !!a.value || Date.now() - (S.lastType || 0) < 60000;
  };
  const userBusy = (strict = true) => busyScrolling() || !!document.querySelector('.modal-overlay, .menu') || (S.jobs || 0) > 0 || editing(strict);
  // 页面自动取新数据：在前台、没在操作时，每隔 ms 调一次 fn（切回这个标签页时如果已经超过 ms，几秒内补一次）。离开页面自动停。
  function autoRefresh(fn, ms) {
    let last = Date.now(), running = false;
    S.timers.push(setInterval(async () => {
      if (running || document.hidden || Date.now() - last < ms || userBusy()) return;
      running = true; last = Date.now();
      try { await fn(); } catch { /* 下一次再试 */ } finally { running = false; }
    }, Math.min(ms, 5000)));
  }
  function howTo(title, ...content) {
    return h('details', { class: 'howto', open: !isPhone() }, h('summary', {}, h('b', { text: title }), h('span', { class: 'howto-tip', text: '点开看说明' })), ...content);
  }
  function statCard(label, value, iconName, tone = 'blue', sub) {
    return h('div', { class: 'card stat' },
      h('div', { class: 'stat-icon si-' + tone }, icon(iconName)),
      h('div', { style: { minWidth: 0 } }, h('div', { class: 'stat-label', text: label }), h('div', { class: 'stat-value', text: dash(value), title: dash(value) }), sub ? h('div', { class: 'stat-sub', text: sub }) : null));
  }
  const skeletonStats = (n) => Array.from({ length: n }, () => h('div', { class: 'card stat' }, h('div', { class: 'stat-icon skeleton' }), h('div', { class: 'grow' }, h('div', { class: 'skeleton sk-line', style: { width: '50%' } }), h('div', { class: 'skeleton sk-line', style: { width: '70%', height: '20px' } }))));
  const emptyState = (text, iconName = 'inbox') => h('div', { class: 'empty' }, icon(iconName), h('div', { text }));

  // ============================================================
  // 看板
  // ============================================================
  const WIN = {
    '5h': { cls: 'ul-5h', label: '5h' },
    '7d': { cls: 'ul-7d', label: '7d' },
    'Fable 5': { cls: 'ul-fable', label: 'Fable' },
    'Sonnet': { cls: 'ul-sonnet', label: 'Sonnet' },
  };
  const WIN_ORDER = ['5h', '7d', 'Fable 5', 'Sonnet'];
  // 标记为 TEAM 标准（普通）席位的账号没有 Fable，不显示 Fable 窗口；标记为高级或未标记时照常显示。Sonnet 窗口一律不显示。
  const isFable = (k) => /^fable/i.test(k);
  const HIDDEN_WINDOWS = /^sonnet$/i;
  function quotaKeys(r) {
    const all = [...WIN_ORDER.filter((k) => r.quota && r.quota[k]), ...Object.keys(r.quota || {}).filter((k) => !WIN_ORDER.includes(k))].filter((k) => !HIDDEN_WINDOWS.test(k));
    return r.seat === 'standard' ? all.filter((k) => !isFable(k)) : all;
  }
  // 标准席位却出现了 Fable 用量：可能已经升级，提示管理员改标记
  function fableHint(r) {
    if (r.seat !== 'standard') return null;
    const f = Object.entries(r.quota || {}).find(([k, q]) => isFable(k) && typeof q.used_pct === 'number' && q.used_pct > 0);
    return f ? h('span', { class: 'chip chip-warn', title: `标记为标准席位，但后台显示 Fable 已用 ${pct(f[1].used_pct)}，可能已升级为高级席位`, text: 'Fable 有用量' }) : null;
  }

  // Polo 暂时清空了用量数据，这里显示的是上次的真实值：标一下（手机上点一下看说明）
  function staleTag(q) {
    if (!q || !q.stale) return null;
    const tip = `Polo 暂时清空了这个号的用量数据（打满冷却期间常见，卡片上会显示 0%）。这里显示的是 ${fmtTime(q.stale.at)} Polo 最后一次给出的真实值；冷却期间号用不了，这个值不会变，冷却结束后会自动刷新。`;
    return h('span', { class: 'q-stale', title: tip, onclick: (e) => { e.stopPropagation(); if (isPhone()) toast(tip, 'info', 9000); } }, 'Polo 未更新');
  }
  function resetEl(q, resetText) {
    if (q.reset_at) {
      const left = until(q.reset_at);
      if (left) return h('span', { class: 'u-reset' + (q.by_cool ? ' text-bad' : ''), title: (q.by_cool ? '预计恢复于 ' : '重置于 ') + fmtTime(q.reset_at) }, icon('clock', 'icon icon-sm'), left + (q.by_cool ? '后恢复' : '后重置'));
      return (q.used_pct || 0) > 0 ? h('span', { class: 'u-reset pending', title: '已过重置时间，等待后台刷新用量' }, '待刷新') : h('span', { class: 'u-reset' }, '已重置');
    }
    if (resetText === '重置时间未知' && (q.used_pct || 0) > 0) return h('span', { class: 'u-reset' }, '重置时间未知');
    return null;
  }
  function usageBlock(r, withStats = true) {
    const d = r.detail || {};
    const box = h('div', { class: 'usage' });
    const keys = quotaKeys(r);
    if (!keys.length) return h('span', { class: 'faint', text: '—' });
    for (const k of keys) {
      const q = r.quota[k];
      const hist = k === '5h' ? d.history && d.history['5h'] : k === '7d' ? d.history && d.history['7d'] : null;
      if (withStats && hist && (toNum(hist.requests) || 0) > 0) {
        box.append(h('div', { class: 'u-stats' },
          h('span', { text: (k === '5h' ? '近5h' : '近7天') + ' · ' + compact(hist.requests) + ' 次' }),
          h('span', { text: compact(hist.tokens) + ' tok' }),
          h('span', { title: `官方价 ${dash(hist.official_cost)} · 计费价 ${dash(hist.billed_cost)}`, text: dash(hist.official_cost) })));
      }
      const meta = WIN[k] || { cls: 'ul-other', label: k };
      const row = h('div', { class: 'u-row' }, h('span', { class: 'u-label ' + meta.cls, text: meta.label }));
      if (typeof q.used_pct === 'number') {
        const p = q.used_pct, lv = p >= 90 ? 'bad' : p >= 75 ? 'warn' : 'ok';
        const fill = h('div', { class: 'u-fill uf-' + lv }); fill.style.width = Math.min(100, Math.max(0, p)) + '%';
        append(row, h('div', { class: 'u-track' }, fill), h('span', { class: 'u-pct ' + (lv === 'ok' ? '' : lv), text: pct(p) }));
        // 第二行：本窗口已跑 · 用满预测 · 重置时间（放不下就换行，不会压在一起）
        const subs = [QW_KINDS.includes(k) ? qwCell(r, k, 'u-usd') : null, QW_KINDS.includes(k) ? fullCell(r, k, 'u-usd') : null,
          resetEl(q, d.windows && d.windows[k] && d.windows[k].reset_text), staleTag(q)].filter(Boolean);
        box.append(h('div', { class: 'u-q' }, row, subs.length ? h('div', { class: 'u-sub' }, subs) : null));
        continue;
      } else if (q.status) {
        row.append(h('span', { class: 'badge b-warn plain', text: q.status }));
      } else row.append(h('span', { class: 'faint small', text: '未读取到' }));
      box.append(row);
    }
    return box;
  }
  function statusBadge(r) {
    const d = r.detail || {};
    if (r.state && r.state !== '启用') return h('span', { class: 'badge b-gray', text: r.state });
    if (d.status) {
      const s = d.status;
      const tone = s === '正常' ? 'b-ok' : /冷却|限流|过载/.test(s) ? 'b-warn' : 'b-bad';
      return h('span', { class: 'badge ' + tone, text: s });
    }
    return h('span', { class: 'badge b-gray', text: r.state || '未知' });
  }
  function statusCell(r) {
    const d = r.detail || {};
    const badge = statusBadge(r);
    let sub = null;
    if (d.cooldown_text) sub = h('div', { class: 'cell-sub text-warn', text: d.cooldown_text });
    else if (d.usage_updated_at) {
      const old = Date.now() - toDate(d.usage_updated_at).getTime() > 30 * 60000;
      sub = h('div', { class: 'cell-sub' + (old ? ' text-warn' : ''), title: '后台最近一次刷新该账号用量的时间：' + fmtTime(d.usage_updated_at) }, '用量 ' + ago(d.usage_updated_at) + '更新');
    }
    return h('div', {}, badge, sub);
  }
  function kv(pairs) {
    const dl = h('dl', { class: 'kv' });
    for (const [k, v, cls] of pairs) append(dl, h('dt', { text: k }), h('dd', { class: cls || null, text: dash(v) }));
    return dl;
  }
  function ipOf(r) { const px = r.detail && r.detail.proxy; return px && px.mode === 'proxy' ? (px.ip || px.host || null) : null; }
  function sharedIps(rows) {
    const m = {};
    for (const r of rows) { const ip = ipOf(r); if (ip) (m[ip] = m[ip] || []).push(r.display_name || r.email); }
    return m;
  }
  function ipCell(r, shared) {
    const px = r.detail && r.detail.proxy;
    if (!px) return h('span', { class: 'faint', text: '—' });
    if (px.mode === 'direct') return h('span', { class: 'badge b-gray plain', text: '直连（不走代理）' });
    if (px.mode !== 'proxy') return h('span', { class: 'faint', text: '未识别' });
    const ip = px.ip || px.host;
    const lat = px.latency_ms;
    const tone = px.health === '可用' ? (lat !== null && lat !== undefined && lat >= 500 ? 'b-warn' : 'b-ok') : 'b-bad';
    const others = (shared[ip] || []).filter((n) => n !== (r.display_name || r.email));
    return h('div', {},
      h('span', { class: 'mono ip', title: '点击复制' + (px.host && px.host !== ip ? `\n主机名：${px.host}` : ''), onclick: () => copy(ip, ' IP') }, ip),
      h('div', { class: 'cell-sub mono', text: `${px.protocol || '代理'} · 端口 ${dash(px.port)}` }),
      h('div', { class: 'chips', style: { marginTop: '5px' } },
        px.health ? h('span', { class: 'badge ' + tone, text: px.health + (lat !== null && lat !== undefined ? ` ${lat}ms` : '') }) : null,
        px.host && px.host !== ip ? h('span', { class: 'chip', title: px.host, text: '域名解析' }) : null,
        others.length ? h('span', { class: 'chip chip-warn', title: '这些账号使用同一个出口 IP', text: '与 ' + others.join('、') + ' 共用' }) : null));
  }
  // 列表里“并发 / 会话 / 已绑定会话”的说明（电脑悬停、手机点击都能看）
  const rtHelp = (conc, sessions, slots) => `并发 ${conc} = 此刻正在发的请求数（每 15 秒更新）；会话 ${dash(sessions)} = 此刻活跃的会话；已绑定会话 ${dash(slots)} = Polo 固定分给这个号、还没释放的对话数（同一段对话一直走同一个号），不是正在用的数量，跟额度和结算无关。`;
  // 醒目的“并发 N”标签：手机列表（cls='mob'）和卡片视图用；大于 0 时用渐变蓝
  function concPill(r, cls = '') {
    const ln = liveNums(r), n = ln.conc || 0, rt = (r.detail && r.detail.realtime) || {};
    const tip = rtHelp(n, rt.sessions, ln.slots);
    return h('span', { class: 'conc-pill' + (n > 0 ? ' live' : '') + (cls ? ' ' + cls : ''), title: tip, onclick: (e) => { e.stopPropagation(); toast(tip, 'info', 8000); } },
      h('small', { text: '并发' }), h('b', { text: String(n) }));
  }
  // 每 15 秒的实时数字（并发 / RPM / TPM / 已绑定会话 / 5h、7d %）；超过 5 分钟没更新就不用，退回采集快照
  function liveOf(r) {
    const rt = S.dash && S.dash.realtime;
    if (!rt || rt.stale || !rt.data || !rt.data.accounts) return null;
    return rt.data.accounts[r.account_key] || null;
  }
  // Polo 卡片上的冷却原因（如 “Anthropic 7d subscription limit rejected (util=1.0) · 10时20分”）：
  // 优先用每分钟的实时数据，没有就用 10 分钟快照；已过恢复时间的不再算
  function coolOf(r) {
    const live = liveOf(r);
    const c = live && Object.prototype.hasOwnProperty.call(live, 'cooldown') ? live.cooldown : r.cooldown;
    if (!c) return null;
    if (c.until && toDate(c.until).getTime() <= Date.now()) return null;
    return c;
  }
  // 用满保持：服务器记下的“某个窗口已满、到某时恢复”。到点前一直按用满算（Polo 的冷却提示消失、用量没数据也不变）
  function holdsOf(r) {
    const live = liveOf(r), hs = (live && live.hold) || {}, out = [];
    for (const k of QW_KINDS) if (hs[k] && hs[k].until && toDate(hs[k].until).getTime() > Date.now()) out.push(Object.assign({ window: k }, hs[k]));
    return out;
  }
  // 把冷却原因里“满了的窗口”合并进额度：Polo 被拒后这个窗口常显示 0%，这里按 util 显示（util=1.0 → 100%），恢复时间当重置时间
  function liveReset(api, k, now) {
    const field = k === '5h' ? '5' : '7';
    const end = Date.parse(api?.['r' + field]), at = Date.parse(api?.uat);
    if (!Number.isFinite(api?.['u' + field]) || !Number.isFinite(at) || now-at > 1200000 || at-now > 2000 ||
        !Number.isFinite(end) || end <= now || end-now > (k === '5h' ? 18000 : 604800)*1000+120000) return null;
    return api['r'+field];
  }
  function applyCooldown(rows) {
    for (const r of rows) {
      if (!r.quota_raw) r.quota_raw = r.quota || {};
      const c = coolOf(r);
      r.cool = c;
      r.quota = r.quota_raw;
      // 每 15 秒的实时读数里有卡片上的 5h / 7d %：比快照新，就用它。
      // Polo 清空了用量数据（卡片显示 0%）：服务器给的是同一窗口里上次的真实值（pct_old 注明时刻）；连上次的也没有就显示“暂无数据”，不显示 0%
      const live = liveOf(r) || {}, lp = live.pct || {}, old = live.pct_old || {};
      for (const k of QW_KINDS) {
        if (!r.quota[k]) continue;
        const cleared = live.api && live.api[k === '5h' ? 'u5' : 'u7'] == null && typeof lp[k] !== 'number';
        const differs = typeof lp[k] === 'number' && typeof r.quota[k].used_pct === 'number' && lp[k] !== r.quota[k].used_pct;
        const reset = liveReset(live.api, k, Date.now());
        const priorEnd = Date.parse(r.quota[k].reset_at);
        const resetDiffers = reset && reset !== r.quota[k].reset_at && (!Number.isFinite(priorEnd) || priorEnd <= Date.now() ||
          Math.abs(Date.parse(reset) - priorEnd) <= (k === '5h' ? 180000 : 3720000));
        if (!differs && !old[k] && !cleared && !resetDiffers) continue;
        if (r.quota === r.quota_raw) r.quota = Object.assign({}, r.quota_raw);
        r.quota[k] = Object.assign({}, r.quota[k], cleared ? { used_pct: null, status: 'Polo 暂无数据' } : { used_pct: typeof lp[k] === 'number' ? lp[k] : r.quota[k].used_pct },
          resetDiffers ? { reset_at: reset } : {}, old[k] && !cleared ? { stale: old[k] } : {});
      }
      if (c && c.window) {
        const key = /^fable/i.test(c.window) ? (Object.keys(r.quota_raw).find((k) => /^fable/i.test(k)) || c.window) : c.window;
        const base = r.quota[key] || {};
        const p = c.util === null || c.util === undefined ? 100 : Math.round(c.util * 1000) / 10;
        r.quota = Object.assign({}, r.quota, { [key]: Object.assign({}, base, {
          used_pct: Math.max(typeof base.used_pct === 'number' ? base.used_pct : 0, p), status: null, reset_at: c.until || base.reset_at || null, by_cool: true }) });
      }
      for (const hd of holdsOf(r)) {
        const base = r.quota[hd.window] || {};
        r.quota = Object.assign({}, r.quota, { [hd.window]: Object.assign({}, base, { used_pct: 100, status: null, reset_at: hd.until, by_cool: true, held: hd }) });
        // 文字提示：没有冷却行、或者同一个窗口、或者周额度（比 5h 更久）时，用记下的恢复时间
        if (!r.cool || !r.cool.window || r.cool.window === hd.window || hd.window === '7d') {
          r.cool = Object.assign({}, r.cool && r.cool.window === hd.window ? r.cool : {}, { window: hd.window, util: 1, until: hd.until, held: hd,
            reason: (r.cool && r.cool.window === hd.window && r.cool.reason) || hd.why || `${hd.window} 额度已满` });
        }
      }
    }
  }
  const coolWin = (c) => (c && c.window ? (WIN[c.window] ? WIN[c.window].label : c.window) : null);
  function coolText(c) {
    if (!c) return null;
    const w = coolWin(c), left = c.until ? until(c.until) : null;
    const head = w ? (c.util === null || c.util === undefined || c.util >= 1 ? `${w} 额度已满` : `${w} 额度快满（${Math.round(c.util * 100)}%）`) : '冷却中';
    return head + (left ? ` · ${left}后恢复` : '');
  }
  const HOLD_SRC = { util: 'Polo 的用量到了 100%', cooldown: 'Polo 的冷却原因', card: 'Polo 卡片上的冷却提示' };
  const coolTitle = (c) => (c ? `Polo 冷却原因：${c.reason}${c.until ? `\n预计恢复：${fmtTime(c.until)}` + (c.held ? '' : '（按 Polo 显示的剩余时间算，精确到分钟）') : ''}`
    + (c.held ? `\n已记下（${fmtTime(c.held.since)} 起，来自${HOLD_SRC[c.held.src] || c.held.src}）：到恢复时间前一直按用满算，Polo 的提示消失也不变；这期间不让 Polo 页面去刷新这个号的用量。` : '') : '');
  // ---------- 额度窗口：每个号当前 5h / 7d 窗口里跑了多少额度（所有模型合计，和结算同一个数） ----------
  const QW_KINDS = ['5h', '7d'];
  const qwKey = (r) => String(r.account_key || r.email || '').toLowerCase();
  function qwOf(r, k) {
    const a = S.qw && S.qw.accounts && S.qw.accounts[qwKey(r)];
    const w = a && a[k];
    if (!w || w.end * 1000 <= Date.now()) return null;
    // 两份快照可能不同时更新；已经显示新重置点时不能借用上一窗的金额。
    const reset = r.quota?.[k]?.reset_at;
    if (reset && Math.abs(toDate(reset).getTime()/1000 - w.end) > (k === '5h' ? 180 : 3600)) return null;
    return w;
  }
  const usdS = (v) => (v === null || v === undefined || isNaN(v) ? '—' : '$' + (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(Math.abs(v) >= 10 ? 1 : 2)));
  const QW_STATE = { final: '已结束 · 精确值', ended: '已结束 · 长请求跑完、结束 40 分钟后出精确值', live: '进行中 · 每 15 秒更新', pending: '刚发现，正在统计起点以来的额度' };
  // 用满预测：服务器在 Polo 刷新用量 % 的那一刻算“已跑 ÷ %”；本窗口用量太低时用以往窗口的中位数。老数据没有时按结束时的 % 算
  const FULL_SRC = { now: '按本窗口推算', cur: '按当前已跑和最近一次百分比粗估', actual: '本窗实跑', waiting: '待核实', hist: '按这个号以往的窗口', pool: '按同席位全部号以往的窗口' };
  const reached = w => !!(w && (w.rejected_at || w.last_pct >= 100 || ['actual', 'waiting', 'rejected'].includes(w.full?.src)));
  const qwFull = w => reached(w) ? (w.full?.src === 'actual' ? w.full.usd : null) : (w?.full?.est > 0 ? w.full.est : null);
  const resultText = w => qwFull(w) == null ? (reached(w) ? '待核实' : '—') : (reached(w) ? '' : '≈ ') + usd(qwFull(w));
  function fullTitle(w, kind) {
    const f = w && w.full;
    if (reached(w)) {
      if (f?.src !== 'actual') return kind + ' 已满，现有读数还不能确认本窗实际金额；不以预测代替。';
      const basis = f.basis === 'counter' ? 'Polo 卡片累计读数之差，按请求完成记账，无边界插值。' : 'Polo 用量统计已匹配的金额，按请求开始时间筛选。';
      return [kind + ' 已满 · 本窗实跑 ' + usd(f.usd), basis, '统计到 ' + fmtTime(f.at) + (f.complete ? '，已覆盖窗口结束。' : '；后续入账会继续计入。')].join('\n');
    }
    if (!f || !(f.est > 0)) return kind + ' 用满预测：还没有足够数据。';
    const lines = [`用满 ${kind} 预测 ≈ ${usd(f.est)}（${FULL_SRC[f.src] || f.src}）`];
    if (f.src === 'now') lines.push(`Polo 在 ${fmtTime(f.at, false)} 把用量刷新到 ${pct(f.pct)}，按同期金额 ${usd(f.usd)} ÷ ${pct(f.pct)} 推算。不是固定美元上限，也不含尚未记账的请求。`);
    else if (f.src === 'cur') lines.push(`现在已跑 ${usd(f.usd)} ÷ Polo 显示的 ${pct(f.pct)}（% 可能是几分钟前刷新的，会略偏高）；等两种读数能对齐后再更新估算`);
    else lines.push(`缺少可用于本窗口预测的同步读数，参考${f.src === 'hist' ? '这个号' : '可见同席位账号'}的 ${f.n} 个窗口的中位数（${usd(f.lo)} – ${usd(f.hi)}）`);
    if (w.state === 'live' && typeof w.usd === 'number' && f.src !== 'rejected') lines.push(`还能跑 ≈ ${usd(Math.max(0, f.est - w.usd))}`);
    return lines.join('\n');
  }
  function qwTitle(w, kind) {
    if (!w) return `这个号现在没有进行中的 ${kind} 窗口`;
    if (reached(w)) return fullTitle(w, kind);
    return [w.capacity_change ? '同一窗口内由标准升为高级：升级前曾满，已跑金额不清零。' : null,
      `${kind} 窗口 ${fmtShort(w.start)} – ${fmtShort(w.end)}（按重置时间推算）`,
      typeof w.usd === 'number' ? `已跑 ${usd4(w.usd)}（按邮箱汇总本窗所有模型，可含同邮箱已归档记录；与当前记录的滚动消耗不是同一统计范围）· ${compact(w.requests)} 次请求` + (w.tokens ? ` · ${compact(w.tokens)} tokens` : '') : '正在统计起点以来跑了多少额度…',
      w.state === 'live' && w.usd_at ? `算到 ${fmtTime(w.usd_at, false)}（每 15 秒更新，窗口结束后再精确统计）` : QW_STATE[w.state] || '',
      w.missing ? `有 ${w.missing} 段 10 分钟没查到，数字偏小；窗口结束后会精确统计` : '',
      '点击看每个窗口的历史'].filter(Boolean).join('\n');
  }
  const qwLink = (key, kind) => '#/windows?key=' + encodeURIComponent(key) + '&kind=' + kind;
  function qwCell(r, kind, cls) {
    const w = qwOf(r, kind);
    if (!w || reached(w) || r.quota?.[kind]?.used_pct >= 100) return null;  // 已满只显示一笔实际金额，不再并排一笔估算
    return h('a', { class: cls + (w.missing ? ' partial' : '') + (typeof w.usd === 'number' ? '' : ' wait'), href: qwLink(qwKey(r), kind), title: qwTitle(w, kind),
      onclick: (e) => e.stopPropagation() }, h('b', { text: typeof w.usd === 'number' ? usdS(w.usd) : '…' }), h('span', { class: 'qb-unit', text: '本窗已跑' }));
  }
  // 未满估算；已满只展示该窗口累计入账，不再展示首次满额时刻的估值。
  function fullCell(r, kind, cls) {
    const w = qwOf(r, kind), f = w && w.full;
    const p = r.quota?.[kind]?.used_pct;
    if (!w && !(p >= 100)) return null;
    const done = reached(w) || p >= 100;
    if (!done && (!f || !(f.est > 0))) return null;
    const title = done && !reached(w) ? kind + ' 已满，等待本窗实跑数据。' : fullTitle(w, kind);
    return h('a', { class: cls + ' qb-full' + (['hist', 'pool'].includes(f?.src) ? ' guess' : '') + (done ? ' done' : ''), href: qwLink(qwKey(r), kind), title,
      onclick: e => { e.stopPropagation(); if (isPhone()) { e.preventDefault(); toast(title, 'info', 9000); } } },
      h('span', { class: 'qb-unit', text: done ? '已满 · 实跑' : '满' }),
      h('b', { text: done ? (f?.src === 'actual' ? usd(f.usd) : '待核实') : '≈' + usdS(f.est) }));
  }
  async function loadQw() {
    try { S.qw = await api('GET', '/me/windows/current'); S.qwAt = Date.now(); } catch { /* 拿不到就不显示 */ }
  }
  function liveNums(r) {
    const d = r.detail || {}, hl = r.health || {}, rt = d.realtime || {}, live = liveOf(r);
    const has = (x) => x !== null && x !== undefined && x !== '';
    return {
      live: !!live,
      conc: toNum(live && has(live.concurrency) ? live.concurrency : has(rt.concurrency) ? rt.concurrency : hl.concurrency),
      rpm: live && has(live.rpm) ? live.rpm : rt.rpm,
      tpm: live && has(live.tpm) ? numK(live.tpm) : toNum(rt.tpm),
      slots: live && has(live.slots) ? live.slots : hl.session_slots,
    };
  }
  // Polo 抽屉里的“近 5 小时 / 7 天 / 30 天”比卡片的“今日”计数更新得慢（长请求跑完才算进去），会出现“近 7 天”比“今日”还少。
  // 近 7 天 / 30 天一定包含今天：少于今日就按今日算（请求、token、金额各自取大的）
  function histFix(d) {
    const hs = d.history || {}, t = d.today || {}, out = Object.assign({}, hs);
    const big = (a, b) => { const x = toNum(a), y = toNum(b); return x === null ? b : y === null ? a : y > x ? b : a; };
    let floor = t;
    for (const k of ['7d', '30d']) {
      const h0 = hs[k];
      if (!h0) continue;
      const fixed = { requests: big(h0.requests, floor.requests), tokens: big(h0.tokens, floor.tokens), official_cost: big(h0.official_cost, floor.cost !== undefined ? floor.cost : floor.official_cost) };
      out[k] = Object.assign({}, h0, fixed, { lifted: fixed.requests !== h0.requests || fixed.tokens !== h0.tokens || fixed.official_cost !== h0.official_cost });
      floor = out[k];
    }
    return out;
  }
  function accountRow(r, shared) {
    const d = r.detail || {}, hl = r.health || {}, t = d.today || {}, rt = d.realtime || {}, hs = histFix(d);
    const admin = isAdmin();
    const lastUsed = ago(d.last_used_at) || hl.last_used_display;
    const on = !r.state || r.state === '启用';
    const ln = liveNums(r), conc = ln.conc || 0, slots = ln.slots;
    const old = d.usage_updated_at && Date.now() - toDate(d.usage_updated_at).getTime() > 30 * 60000;
    const meta = [...planText(r), hl.added_at ? `添加 ${fmtShort(hl.added_at)}` : null].filter(Boolean).join(' · ');
    return h('tr', { class: 'lrow' + (on ? '' : ' off') },
      // 账号
      h('td', { 'data-label': '' },
        h('div', { class: 'l-line l-first' },
          h('span', { class: 'tag-claude', text: 'Claude' }),
          r.email ? h('span', { class: 'l-email', title: r.email + '（点击复制）', onclick: () => copy(r.email, '邮箱') }, r.email) : h('span', { class: 'l-email', text: dash(r.display_name) }),
          h('span', { class: 'switch' + (on ? ' on' : ''), title: `后台状态：${r.state || '未知'}（只读）` }, h('i'))),
        h('div', { class: 'l-line', style: { marginTop: '6px' } },
          seatBadge(r, admin), fableHint(r), ownerChip(r, admin),
          h('span', { class: 'l-name mono', title: '后台显示名', text: dash(r.display_name) }), concPill(r, 'mob')),
        h('div', { class: 'l-sub' }, meta || '—'),
        h('div', { class: 'l-sub' }, lastUsed ? h('span', { title: d.last_used_at ? '最近使用：' + fmtTime(d.last_used_at) : null, text: `${lastUsed}使用` }) : '未使用',
          d.usage_updated_at ? h('span', { class: old ? 'text-warn' : '', title: '后台最近一次刷新该账号用量：' + fmtTime(d.usage_updated_at) }, ` · 用量 ${ago(d.usage_updated_at)}更新`) : null),
        r.cool ? h('div', { class: 'l-cool', title: coolTitle(r.cool) }, icon('clock', 'icon icon-sm'), h('span', { text: coolText(r.cool) })) : null),
      // 状态 + 实时
      h('td', { 'data-label': '状态 / 实时' },
        h('div', { class: 'l-line' }, statusBadge(r),
          h('span', { class: 'rt-box', style: { cursor: 'pointer' }, title: rtHelp(conc, rt.sessions, slots) + '（点击也能看）', onclick: () => toast(rtHelp(conc, rt.sessions, slots), 'info', 8000) },
            h('b', { class: 'rt-num' + (conc > 0 ? ' live' : ''), text: String(conc) }),
            h('span', { text: `会话 ${dash(rt.sessions)}` }),
            slots !== undefined && slots !== null ? h('span', { class: 'faint', text: `· 已绑定会话 ${slots}` }) : null)),
        healthBar(r),
        h('div', { class: 'l-line', style: { marginTop: '6px' } }, ipMini(r, shared || {}))),
      // 请求
      h('td', { 'data-label': '请求' },
        h('div', { class: 'req' },
          h('span', { class: 'req-k', text: '今日' }), h('span', {}, h('b', { class: 'mono', text: compact(t.requests) }), h('span', { class: 'faint xs', text: ' req' })),
          h('span', { class: 'req-k', text: '近7天' }), h('span', {}, h('span', { class: 'pill p-ok', title: '最近 7 天请求数', text: compact(hs['7d'] && hs['7d'].requests) })),
          h('span', { class: 'req-k', text: '24H' }), h('span', {},
            h('span', { class: 'pill p-ok', title: '24 小时请求数', text: dash(hl.requests_24h) }),
            h('span', { class: 'pill ' + ((toNum(hl.rate_limits_24h) || 0) > 0 ? 'p-bad' : 'p-mute'), title: '24 小时限流次数', text: dash(hl.rate_limits_24h) })),
          h('span', { class: 'req-k', text: 'RPM' }), h('span', { class: 'mono small', title: `TPM ${dash(ln.tpm)}${ln.live ? '（每 15 秒更新）' : ''}`, text: `${dash(ln.rpm)} · TPM ${compact(ln.tpm)}` }))),
      // 额度
      h('td', { 'data-label': '额度窗口' }, quotaRows(r)),
      // 消耗
      h('td', { 'data-label': '消耗' },
        h('div', { class: 'cost' },
          costRow('今日', t.cost, t.tokens), costRow('近5h', hs['5h'] && hs['5h'].official_cost, hs['5h'] && hs['5h'].tokens),
          costRow('近7天', hs['7d'] && hs['7d'].official_cost, hs['7d'] && hs['7d'].tokens), costRow('近30天', hs['30d'] && hs['30d'].official_cost, hs['30d'] && hs['30d'].tokens, true))),
      h('td', { 'data-label': '', class: 'l-act' }, h('button', { class: 'icon-btn', type: 'button', title: '更多', onclick: (e) => rowMenu(e.currentTarget, r) }, '⋯')));
  }
  function fmtShort(v) {
    const x = toDate(v); if (isNaN(x)) return '—';
    return x.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace('/', '-');
  }
  function leftShort(v) {
    const ms = toDate(v).getTime() - Date.now();
    if (isNaN(ms)) return null;
    if (ms <= 0) return '待刷新';
    const m = Math.floor(ms / 60000), dd = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60), mm = m % 60;
    return (dd ? dd + 'd' : '') + (dd || hh ? hh + 'h' : '') + mm + 'm';
  }
  function quotaRows(r) {
    const keys = quotaKeys(r);
    if (!keys.length) return h('span', { class: 'faint', text: '—' });
    const box = h('div', { class: 'qrows' });
    for (const k of keys) {
      const q = r.quota[k], meta = WIN[k] || { label: k };
      const label = h('span', { class: 'q-k', text: meta.label.replace(/^5h$/, '5H').replace(/^7d$/, '7D') });
      if (typeof q.used_pct === 'number') {
        const p = q.used_pct, lv = p >= 90 ? 'bad' : p >= 75 ? 'warn' : 'ok';
        const fill = h('div', { class: 'u-fill uf-' + lv }); fill.style.width = Math.min(100, Math.max(0, p)) + '%';
        const left = q.reset_at ? leftShort(q.reset_at) : null;
        const pend = left === '待刷新' && p > 0;
        const top = h('div', { class: 'qr-top' }, label, h('div', { class: 'q-track' }, fill), h('span', { class: 'q-pct ' + (lv === 'ok' ? '' : lv), title: q.by_cool ? coolTitle(r.cool) : null, text: pct(p) }),
          h('span', { class: 'q-left mono' + (pend ? ' text-warn' : '') + (q.by_cool ? ' text-bad' : ''), title: q.by_cool ? coolTitle(r.cool) : q.reset_at ? '重置于 ' + fmtTime(q.reset_at) : '重置时间未知', text: left && (left !== '待刷新' || pend) ? left : (left === '待刷新' ? '已重置' : '—') }));
        // 第二行：本窗口已跑 · 用满预测（放不下就换行）
        const subs = QW_KINDS.includes(k) ? [qwCell(r, k, 'q-usd'), fullCell(r, k, 'q-usd'), staleTag(q)].filter(Boolean) : [];
        box.append(h('div', { class: 'qr' }, top, subs.length ? h('div', { class: 'qr-sub' }, subs) : null));
      } else {
        box.append(h('div', { class: 'qr' }, h('div', { class: 'qr-top' }, label, h('span', { class: 'q-note', text: q.status || '未返回独立额度' }))));
      }
    }
    const rc = Object.entries(r.reset_counts || {}).filter(([, v]) => v !== null && v !== undefined && v !== '');
    if (rc.length) box.append(h('div', { class: 'q-foot' }, icon('refresh', 'icon icon-sm'), '重置次数 ' + rc.map(([k, v]) => `${k} ${v}`).join(' · ')));
    return box;
  }
  function costRow(k, cost, tok, strong) {
    return h('div', { class: 'cost-row' + (strong ? ' strong' : ''), title: '当前 Polo 账号记录的消耗，不合并同邮箱的归档记录' }, h('span', { class: 'q-k', text: k }), h('span', { class: 'mono', text: dash(cost) }), h('span', { class: 'mono faint', text: tok ? compact(tok) + ' tok' : '—' }));
  }
  function healthBar(r) {
    const d = r.detail || {}, hl = r.health || {};
    const off = r.state && r.state !== '启用';
    const c = r.cool !== undefined ? r.cool : coolOf(r);
    const st = off ? (r.state || '停用') : (c && c.window ? `${coolWin(c)} 已满` : d.cooldown_text || c ? '冷却中' : d.status === '正常' || !d.status ? '可用' : d.status);
    const tone = off ? 'gray' : st === '可用' ? 'ok' : /冷却|限流|过载|已满/.test(st) ? 'warn' : 'bad';
    const rate = toNum(hl.success_24h);
    const N = 24, good = rate === null || rate === undefined || isNaN(rate) ? N : Math.round((rate / 100) * N);
    const bar = h('div', { class: 'hbar', title: rate === null || rate === undefined || isNaN(rate) ? '近 24 小时没有成功率数据（无请求）' : `近 24 小时成功率 ${hl.success_24h}` });
    for (let i = 0; i < N; i++) bar.append(h('i', { class: i < good ? 'h-' + tone : 'h-bad' }));
    return h('div', { class: 'hbar-wrap' }, bar, h('span', { class: 'h-label t-' + tone, text: st }));
  }
  function ipMini(r, shared) {
    const px = r.detail && r.detail.proxy;
    if (!px) return h('span', { class: 'faint small', text: '出口未读取' });
    if (px.mode === 'direct') return h('span', { class: 'pill p-mute', text: '直连' });
    if (px.mode !== 'proxy') return h('span', { class: 'faint small', text: '出口未识别' });
    const ip = px.ip || px.host, lat = px.latency_ms;
    const tone = px.health === '可用' ? (lat !== null && lat !== undefined && lat >= 500 ? 'p-warn' : 'p-ok') : 'p-bad';
    const others = (shared[ip] || []).filter((n) => n !== (r.display_name || r.email));
    return [h('span', { class: 'pill ' + tone + ' ip-pill', title: `${px.protocol || '代理'}:${dash(px.port)} · ${dash(px.health)}${lat !== null && lat !== undefined ? ' ' + lat + 'ms' : ''}${px.host && px.host !== ip ? '\n主机名：' + px.host : ''}\n点击复制`, onclick: () => copy(ip, ' IP') }, icon('globe', 'icon icon-sm'), h('span', { class: 'mono', text: ip }), lat !== null && lat !== undefined ? h('span', { class: 'xs', style: { opacity: '.75' }, text: lat + 'ms' }) : null),
      others.length ? h('span', { class: 'chip chip-warn', title: '与 ' + others.join('、') + ' 使用同一个出口 IP', text: '共用 ' + others.join('、') }) : null];
  }
  // ---------- Team 席位（管理员手动标记） ----------
  const isTeam = (r) => (r.plan || []).some((p) => /team/i.test(p));
  // 归属标签（只有管理员能看到）：没有归属给成员 = 我的号；归属给成员显示成员备注名。
  // （以前这里显示的是 Polo 的“分组”，全是 default，和归属无关）
  function ownerChip(r, admin) {
    if (!admin) return null;
    if (r.owner) return h('span', { class: 'chip chip-blue', title: `归属：成员 ${r.owner.name}（在“结算 → 归属与设置”里改）`, text: r.owner.name });
    return h('span', { class: 'chip chip-orange', title: '归属：我的号（没有归属给成员）', text: '我' });
  }
  const ownerText = (r) => (r.owner ? r.owner.name : '我');
  function seatBadge(r, admin) {
    if (!isTeam(r) && !r.seat) return null;
    const polo = (r.plan || []).find((p) => /team/i.test(p)) || '';
    const auto = !r.seat && polo && !/待识别/.test(polo) ? polo : null;
    const txt = r.seat === 'premium' ? 'TEAM 高级' : r.seat === 'standard' ? 'TEAM 标准' : auto ? auto.toUpperCase() : 'TEAM · 待标记';
    const cls = 'seat ' + (r.seat === 'premium' ? 'seat-premium' : r.seat === 'standard' ? 'seat-standard' : auto ? 'seat-standard' : 'seat-unset');
    const tip = r.seat ? `管理员 ${r.seat_by || ''} 手动标记${r.seat_at ? '（' + fmtTime(r.seat_at) + '）' : ''}` : auto ? '后台识别的席位' : '后台未识别席位类型';
    if (!admin) return h('span', { class: cls, title: tip, text: txt });
    const b = h('button', { class: cls, type: 'button', title: tip + '\n点击修改标记' }, txt, h('span', { class: 'seat-caret', text: '▾' }));
    b.addEventListener('click', (e) => { e.stopPropagation(); seatMenu(b, r); });
    return b;
  }
  function planChips(r) {
    return (r.plan || []).filter((p) => !/team/i.test(p)).map((p) => h('span', { class: 'chip', text: p }));
  }
  const planText = (r) => (r.plan || []).filter((p) => !/team/i.test(p));
  function seatMenu(anchor, r) {
    menu(anchor, [
      { label: 'TEAM 高级席位', checked: r.seat === 'premium', onClick: () => setSeat(r, 'premium') },
      { label: 'TEAM 标准（普通）席位', checked: r.seat === 'standard', onClick: () => setSeat(r, 'standard') },
      '-',
      { label: '清除标记', icon: 'x', disabled: !r.seat, onClick: () => setSeat(r, null) },
    ], `标记席位 · ${r.display_name || r.email}`);
  }
  function rowMenu(anchor, r) {
    const ip = ipOf(r);
    const items = [];
    if (isAdmin() && (isTeam(r) || r.seat)) {
      items.push({ label: '标记为 TEAM 高级', checked: r.seat === 'premium', onClick: () => setSeat(r, 'premium') },
        { label: '标记为 TEAM 标准（普通）', checked: r.seat === 'standard', onClick: () => setSeat(r, 'standard') },
        { label: '清除席位标记', disabled: !r.seat, onClick: () => setSeat(r, null) }, '-');
    }
    items.push({ label: '复制邮箱', icon: 'copy', disabled: !r.email, onClick: () => copy(r.email, '邮箱') },
      { label: '复制出口 IP', icon: 'globe', disabled: !ip, onClick: () => copy(ip, ' IP') });
    menu(anchor, items, r.display_name || r.email);
  }
  async function setSeat(r, seat) {
    const key = r.account_key || (r.email ? r.email.toLowerCase() : null);
    if (!key) return toast('这个账号没有邮箱，无法标记', 'bad');
    try {
      await api('POST', '/admin/accounts/seat', { account_key: key, seat });
      const rows = (S.dash && S.dash.accounts && S.dash.accounts.data && S.dash.accounts.data.rows) || [];
      for (const x of rows) if ((x.account_key || (x.email || '').toLowerCase()) === key) { x.seat = seat; x.seat_by = S.user && S.user.username; x.seat_at = Math.floor(Date.now() / 1000); }
      if (!rows.includes(r)) { r.seat = seat; }
      toast(seat ? `已把 ${r.display_name || r.email} 标记为 TEAM ${seat === 'premium' ? '高级' : '标准'}` : `已清除 ${r.display_name || r.email} 的席位标记`, 'ok');
      if (S.redrawAccounts) S.redrawAccounts();
    } catch (e) { toast(errText(e), 'bad'); }
  }
  const maxPct = (r) => Math.max(-1, ...quotaKeys(r).map((k) => r.quota[k]).map((q) => (typeof q.used_pct === 'number' ? q.used_pct : -1)));
  function ipLine(r, shared) {
    const px = r.detail && r.detail.proxy;
    const lead = h('span', { class: 'ac-ico', title: '出口 IP' }, icon('globe', 'icon icon-sm'));
    if (!px) return h('div', { class: 'ac-ip' }, lead, h('span', { class: 'faint small', text: '出口未读取' }));
    if (px.mode === 'direct') return h('div', { class: 'ac-ip' }, lead, h('span', { class: 'badge b-gray plain', text: '直连（不走代理）' }));
    if (px.mode !== 'proxy') return h('div', { class: 'ac-ip' }, lead, h('span', { class: 'faint small', text: '出口未识别' }));
    const ip = px.ip || px.host, lat = px.latency_ms;
    const tone = px.health === '可用' ? (lat !== null && lat !== undefined && lat >= 500 ? 'b-warn' : 'b-ok') : 'b-bad';
    const others = (shared[ip] || []).filter((n) => n !== (r.display_name || r.email));
    return h('div', { class: 'ac-ip' }, lead,
      h('span', { class: 'mono ip', title: '点击复制' + (px.host && px.host !== ip ? `\n主机名：${px.host}` : ''), onclick: () => copy(ip, ' IP') }, ip),
      h('span', { class: 'mono faint xs', text: `${px.protocol || '代理'}:${dash(px.port)}` }),
      px.health ? h('span', { class: 'badge ' + tone, text: px.health + (lat !== null && lat !== undefined ? ` ${lat}ms` : '') }) : null,
      px.host && px.host !== ip ? h('span', { class: 'chip', title: px.host, text: '域名解析' }) : null,
      others.length ? h('span', { class: 'chip chip-warn', title: '这些账号使用同一个出口 IP', text: '与 ' + others.join('、') + ' 共用' }) : null);
  }
  function accountCard(r, shared) {
    const d = r.detail || {}, hl = r.health || {}, rt = d.realtime || {}, hs = histFix(d);
    const mp = maxPct(r), off = r.state && r.state !== '启用';
    const lastUsed = ago(d.last_used_at) || hl.last_used_display;
    const old = d.usage_updated_at && Date.now() - toDate(d.usage_updated_at).getTime() > 30 * 60000;
    const statRow = (label, x, costKey) => h('tr', {}, h('td', { text: label }), h('td', { text: compact(x && x.requests) }),
      h('td', { text: compact(x && x.tokens) }), h('td', { class: 'text-ok', title: x && x.billed_cost ? `计费价 ${x.billed_cost}` : null, text: dash(x && x[costKey]) }));
    const tags = [seatBadge(r, isAdmin()), fableHint(r), ...planChips(r), ownerChip(r, isAdmin())].filter(Boolean);
    return h('div', { class: 'acard' + (off ? ' off' : mp >= 90 ? ' hot' : mp >= 75 ? ' warm' : '') },
      h('div', { class: 'ac-head' },
        h('div', { class: 'ac-id' },
          h('div', { class: 'row', style: { gap: '8px', flexWrap: 'wrap' } }, h('span', { class: 'ac-name', text: dash(r.display_name) }), statusBadge(r), concPill(r)),
          r.email ? h('div', { class: 'email mono', title: r.email + '（点击复制）', onclick: () => copy(r.email, '邮箱') }, r.email) : null),
        h('div', { class: 'ac-meta' },
          h('div', { title: d.last_used_at ? '最近使用：' + fmtTime(d.last_used_at) : '' }, lastUsed ? `${lastUsed}使用` : '—'),
          d.usage_updated_at ? h('div', { class: old ? 'text-warn' : '', title: '后台最近一次刷新该账号用量：' + fmtTime(d.usage_updated_at) }, `用量 ${ago(d.usage_updated_at)}更新`) : null)),
      tags.length ? h('div', { class: 'chips' }, tags) : null,
      (r.cool || d.cooldown_text) ? h('div', { class: 'notice n-warn', style: { margin: 0, padding: '6px 10px' }, title: r.cool ? coolTitle(r.cool) : null }, icon('clock', 'icon icon-sm'), h('span', { text: r.cool ? coolText(r.cool) : d.cooldown_text })) : null,
      h('div', { class: 'ac-sec' }, usageBlock(r, false)),
      h('div', { class: 'ac-sec' }, h('table', { class: 'mini' },
        h('thead', {}, h('tr', {}, ['', '请求', 'Token', '费用'].map((x) => h('th', { text: x })))),
        h('tbody', {}, statRow('今日', d.today, 'cost'), statRow('近 5 小时', hs['5h'], 'official_cost'), statRow('近 7 天', hs['7d'], 'official_cost')))),
      h('div', { class: 'ac-sec ac-foot' }, ipLine(r, shared || {}),
        h('div', { class: 'ac-rt' }, ((ln) => [
          h('span', { text: `RPM ${dash(ln.rpm)}` }), h('span', { text: `TPM ${compact(ln.tpm)}` }), h('span', { text: `会话 ${dash(rt.sessions)}` }),
          ln.slots !== undefined && ln.slots !== null ? h('span', { text: `已绑定 ${ln.slots}` }) : null])(liveNums(r)),
          h('i'), h('span', { title: '最近 24 小时', text: `24h 请求 ${dash(hl.requests_24h)}` }), h('span', { text: `限流 ${dash(hl.rate_limits_24h)}` }), h('span', { text: `成功率 ${dash(hl.success_24h)}` }))));
  }
  const isAbnormal = (r) => (r.state && r.state !== '启用') || (r.detail && ((r.detail.status && r.detail.status !== '正常') || r.detail.cooldown_text || (r.detail.proxy && r.detail.proxy.mode === 'proxy' && r.detail.proxy.health && r.detail.proxy.health !== '可用')));
  // 排序：下拉选按什么排，旁边的按钮切换方向。fn 返回 null = 没有数据，不管正序倒序都排在最后。
  const pctOf = (k) => (r) => (r.quota && r.quota[k] && typeof r.quota[k].used_pct === 'number' ? r.quota[k].used_pct : null);
  const resetOf = (k) => (r) => { const q = r.quota && r.quota[k]; return q && q.reset_at ? toDate(q.reset_at).getTime() : null; };
  const SORTS = {
    '5h': { label: '5h 用量', type: 'num', fn: pctOf('5h'), desc: false },
    '7d': { label: '7d 用量', type: 'num', fn: pctOf('7d'), desc: true },
    reset: { label: '5h 重置时间', type: 'time', fn: resetOf('5h'), desc: false },
    reset7: { label: '7d 重置时间', type: 'time', fn: resetOf('7d'), desc: false },
    cost: { label: '今日费用', type: 'num', fn: (r) => toNum(r.detail && r.detail.today && r.detail.today.cost) || 0, desc: true },
    recent: { label: '最近使用', type: 'time', fn: (r) => (r.detail && r.detail.last_used_at ? toDate(r.detail.last_used_at).getTime() : null), desc: true },
    name: { label: '名称', type: 'text', fn: (r) => r.display_name || null, desc: false },
    ip: { label: '出口 IP', type: 'text', fn: (r) => { const ip = ipOf(r); return ip ? ip.split('.').map((x) => x.padStart(3, '0')).join('.') : null; }, desc: false },
  };
  const DIR_TXT = { num: ['从小到大', '从大到小'], time: ['从早到晚', '从晚到早'], text: ['正序 A→Z', '倒序 Z→A'] };
  // 周额度（7d 窗口）已经用完
  const weekOut = (r) => { const p = pctOf('7d')(r); return p !== null && p >= 100; };

  // 自动刷新：'sync' = 同步（服务器一采集到新数据就刷新；靠每 5 秒取实时数字时带回来的 snapshot_at 判断，见调用处），或每 1 / 5 / 10 分钟，或关闭
  function autoRefreshControl(onRefresh) {
    const OPTS = ['sync', 0, 60, 300, 600];
    const raw = localStorage.getItem('polo_refresh2');
    let sec = raw === null || raw === 'sync' ? 'sync' : Number(raw);
    if (!OPTS.includes(sec)) sec = 'sync';
    let left = typeof sec === 'number' ? sec : 0;
    const slot = h('span', { style: { display: 'inline-flex', alignItems: 'center' } }), label = h('span');
    const btn = h('button', { class: 'btn btn-secondary btn-sm', type: 'button' }, slot, label);
    const fmt = (s) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`);
    const paint = () => { label.textContent = sec === 'sync' ? '自动同步' : sec ? `自动刷新 · ${fmt(left)}` : '自动刷新：关'; };
    const paintMode = () => {
      clear(slot, sec === 'sync' ? h('span', { class: 'live-dot' }) : icon('clock', 'icon icon-sm'));
      btn.title = sec === 'sync' ? '实时数字每 15 秒更新；其余数据在服务器每次采集完（约 3 分钟一次）立刻刷新' : '自动刷新';
      paint();
    };
    btn.addEventListener('click', () => menu(btn, [
      { label: '同步：有新数据就刷新', checked: sec === 'sync', onClick: () => set('sync') },
      '-',
      ...[60, 300, 600].map((s) => ({ label: `每 ${s / 60} 分钟`, checked: sec === s, onClick: () => set(s) })),
      '-',
      { label: '关闭自动刷新', checked: sec === 0, onClick: () => set(0) },
    ]));
    function set(s) { sec = s; left = typeof s === 'number' ? s : 0; localStorage.setItem('polo_refresh2', String(s)); paintMode(); }
    S.timers.push(setInterval(() => {
      if (typeof sec !== 'number' || !sec || document.hidden) return;
      left -= 1;
      if (left <= 0) { if (busyScrolling()) left = 1; else { left = sec; onRefresh(); } }
      paint();
    }, 1000));
    paintMode();
    return { el: btn, reset: () => { left = typeof sec === 'number' ? sec : 0; paint(); }, sync: () => sec === 'sync' };
  }

  function pagePoolTrend() {
    const { main } = appLayout({ active: '#/pool-trend', title: '总池并发走势', desc: '整个号池同时在处理多少个请求 · 北京时间' });
    let choice = 'today', seq = 0, data = null, chart = null;
    const dateInput = h('input', { class: 'input input-sm', type: 'date', 'aria-label': '查看日期（北京时间）', style: { width: 'auto' } });
    const today = h('button', { class: 'btn btn-secondary btn-sm', type: 'button', onclick: () => select('today') }, '今天');
    const note = h('p', { class: 'hint', role: 'status' });
    const stats = h('div', { class: 'stats' }), plot = h('div', { style: { height: '280px', width: '100%' }, 'aria-label': '全天每五分钟的平均在飞和峰值' });
    const days = h('tbody');
    append(main, h('div', { class: 'card' }, h('div', { class: 'card-head' },
      h('h2', { class: 'card-title' }, icon('activity'), '每日并发'), h('div', { class: 'toolbar' }, today, dateInput)),
      h('div', { class: 'card-body' }, stats, note, plot,
        h('p', { class: 'hint', text: '来自 Polo 的「总池实时并发」，约每 15 秒采样一次。每 5 分钟显示样本平均和最高在飞数；没有读数的时段留空，不算作 0。' }))),
      h('div', { class: 'card', style: { marginTop: '16px' } }, h('div', { class: 'card-head' }, h('h2', { class: 'card-title' }, icon('log'), '近七天对照')),
        h('div', { class: 'table-wrap' }, h('table', { class: 'mini-table' }, h('thead', {}, h('tr', {}, ['日期', '平均并发', '采样峰值', '样本数'].map((s) => h('th', { text: s })))), days))));
    const num = (v) => v == null ? '—' : v.toLocaleString('zh-CN');
    const hhmm = (s) => new Date((s + 8 * 3600) * 1000).toISOString().slice(11, 16);
    function draw() {
      if (!data || !chart || !data.count) return;
      const theme = chartTheme(), b = baseOpt(theme), d = data;
      const length = d.day === d.today ? Math.min(288, Math.max(1, Math.floor((d.as_of - d.start) / d.step) + 1)) : 288;
      const bins = Array(length).fill(null);
      for (const row of d.buckets) if (row.i < length) bins[row.i] = row;
      chart.setOption({ ...b, animation: false, color: [PALETTE[0], PALETTE[1]],
        tooltip: { ...b.tooltip, formatter: (ps) => { const i = ps[0]?.dataIndex, row = bins[i];
          return i == null ? '' : `${hhmm(d.start + i * d.step)} – ${hhmm(d.start + (i + 1) * d.step)}<br>` +
            (row ? `平均 ${num(row.avg)} · 峰值 ${num(row.peak)}<br>${row.count} 次采样` : '没有采样'); } },
        xAxis: axisX(theme, bins.map((_, i) => hhmm(d.start + i * d.step)), { boundaryGap: false }), yAxis: axisY(theme, (v) => num(v), { min: 0, minInterval: 1 }),
        series: [['avg', '平均并发'], ['peak', '采样峰值']].map(([k, name]) => ({ name, type: 'line', showSymbol: true, symbolSize: 3, connectNulls: false,
          data: bins.map((r) => r ? r[k] : null) })) }, true);
    }
    function select(day) {
      choice = day; data = null; plot.hidden = true; clear(stats); clear(days); load();
    }
    async function load() {
      const id = ++seq, valid = () => id === seq && main.isConnected;
      if (!data) note.textContent = '正在读取并发记录…';
      try {
        const d = await api('GET', '/me/pool-trend/' + choice);
        if (!valid()) return;
        data = d; dateInput.value = d.day; dateInput.max = d.today;
        const stale = d.day === d.today && d.as_of - d.last_at > 150;
        clear(stats, statCard(d.day === d.today && !stale ? '最新并发' : '末次并发', num(d.last), 'bolt', 'purple', d.last_at ? hhmm(d.last_at) + ' 采样' : '暂无采样'),
          statCard('当天平均', num(d.avg), 'activity', 'blue', `${num(d.count)} 次采样`),
          statCard('当天峰值', num(d.peak), 'trend', 'ok', d.peak_at ? hhmm(d.peak_at) + ' 首次达到' : '暂无采样'));
        note.textContent = !d.count ? `${d.day} 还没有采样记录。` : stale ? '采样暂未更新，显示最后一次真实读数。' : `${d.day} · 最新样本 ${hhmm(d.last_at)}${choice === 'today' ? ' · 每 15 秒自动更新' : ''}`;
        clear(days, d.days.length ? d.days.map((r) => h('tr', {}, h('td', {}, h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => select(r.day === d.today ? 'today' : r.day) }, r.day)),
          ...[r.avg, r.peak, r.count].map((v) => h('td', { text: num(v) })))) : h('tr', {}, h('td', { colspan: '4', text: '这七天没有采样记录' })));
        plot.hidden = !d.count;
        if (d.count) { await loadECharts(); if (!valid()) return; chart = chart || mkChart(plot); chart.resize(); draw(); }
      } catch (e) { if (valid()) note.textContent = '读取失败：' + errText(e) + '。可重新选择日期重试。'; }
    }
    dateInput.addEventListener('change', () => { if (dateInput.value && dateInput.validity.valid) select(dateInput.value === dateInput.max ? 'today' : dateInput.value); });
    S.onTheme = draw;
    S.timers.push(setInterval(() => { if (choice === 'today' && !document.hidden) load(); }, 15000));
    load();
  }

  async function pageDashboard() {
    const admin = isAdmin();
    const { main } = appLayout({ active: '#/dashboard', title: '用量看板', desc: admin ? '全部账号的额度、用量与重置时间' : '你可以查看的账号额度、用量与重置时间' });
    const notices = h('div');
    const stats = h('div', { class: 'stats' + (admin ? '' : ' s3') }, skeletonStats(admin ? 8 : 6));
    // 管理员：实时数字（每 15 秒从 Polo 读一次，页面每 5 秒取一次，没变就不重画）
    const rtHead = h('div', { class: 'rt-head' });
    const rtStats = h('div', { class: 'stats rt-stats' }, admin ? skeletonStats(4) : null);
    const rtBlock = admin ? h('div', { class: 'rt-block' }, rtHead, rtStats) : null;
    let rtDrawn = false;
    const search = leadInput('search', { class: 'input input-sm has-lead', placeholder: admin ? '搜索账号、邮箱、IP、归属' : '搜索账号、邮箱、IP', type: 'search' });
    search.wrap.style.width = '240px';
    search.wrap.classList.add('dash-search');
    let filter = 'all';
    // 默认按 5h 用量从小到大（剩余额度多的在前）；改过默认后，以前存的排序重置一次
    if (localStorage.getItem('polo_sort_v') !== '2') { localStorage.setItem('polo_sort', '5h'); localStorage.setItem('polo_sort_dir', 'asc'); localStorage.setItem('polo_sort_v', '2'); }
    let sortKey = localStorage.getItem('polo_sort') || '5h';
    if (!SORTS[sortKey]) sortKey = '5h';
    let desc = localStorage.getItem('polo_sort_dir') ? localStorage.getItem('polo_sort_dir') === 'desc' : SORTS[sortKey].desc;
    let showOut = localStorage.getItem('polo_show_weekout') !== '0';
    const seg = h('div', { class: 'seg' });
    const segs = [['all', '全部'], ['high', '高用量'], ['abnormal', '异常']];
    const paintSeg = () => clear(seg, segs.map(([k, l]) => h('button', { type: 'button', class: filter === k ? 'on' : '', onclick: () => { filter = k; paintSeg(); drawTable(); } }, l)));
    paintSeg();
    const sortSel = h('select', { class: 'select select-sm', style: { width: 'auto' }, title: '排序依据' }, Object.entries(SORTS).map(([k, v]) => h('option', { value: k, selected: k === sortKey, text: '按' + v.label })));
    const dirBtn = h('button', { class: 'btn btn-secondary btn-sm sort-dir', type: 'button', title: '切换排序方向' });
    const paintDir = () => clear(dirBtn, h('span', { class: 'sd-arrow', text: desc ? '↓' : '↑' }), DIR_TXT[SORTS[sortKey].type][desc ? 1 : 0]);
    paintDir();
    dirBtn.addEventListener('click', () => { desc = !desc; localStorage.setItem('polo_sort_dir', desc ? 'desc' : 'asc'); paintDir(); drawTable(); });
    const outBox = h('input', { type: 'checkbox', checked: showOut });
    const outCount = h('span', { class: 'faint' });
    const outToggle = h('label', { class: 'check out-toggle', title: '7d 窗口已用到 100% 的号' }, outBox, h('span', {}, '显示周额度用完的', outCount));
    outBox.addEventListener('change', () => { showOut = outBox.checked; localStorage.setItem('polo_show_weekout', showOut ? '1' : '0'); drawTable(); });
    let view = localStorage.getItem('polo_view') === 'card' ? 'card' : 'list';
    const viewSeg = h('div', { class: 'seg view-seg', title: '显示方式' });
    const paintView = () => clear(viewSeg, [['list', '列表'], ['card', '卡片']].map(([k, l]) => h('button', { type: 'button', class: view === k ? 'on' : '', onclick: () => { view = k; localStorage.setItem('polo_view', k); paintView(); drawTable(); } }, l)));
    paintView();
    sortSel.addEventListener('change', () => { sortKey = sortSel.value; desc = SORTS[sortKey].desc; localStorage.setItem('polo_sort', sortKey); localStorage.setItem('polo_sort_dir', desc ? 'desc' : 'asc'); paintDir(); drawTable(); });
    search.input.addEventListener('input', () => drawTable());
    // 管理员：按归属筛选（全选 / 我 / 各成员，可多选），记住选择。全选时点某一项 = 只看它；之后再点别的是加选 / 取消
    let ownSel = null; // null = 全选；否则是选中的 'me' / 'u<成员 id>'
    try { const v = JSON.parse(localStorage.getItem('polo_owner_sel') || 'null'); if (Array.isArray(v) && v.length) ownSel = v.map(String); } catch { /* 旧值不对就当全选 */ }
    const ownKeyOf = (r) => (r.owner ? 'u' + r.owner.id : 'me');
    const ownerBar = admin ? h('div', { class: 'own-bar', role: 'group', 'aria-label': '按归属筛选（可多选）' }) : null;
    function paintOwners(rows) {
      if (!ownerBar) return null;
      const cnt = {}, names = {};
      for (const r of rows) { const k = ownKeyOf(r); cnt[k] = (cnt[k] || 0) + 1; if (r.owner) names[k] = r.owner.name; }
      const opts = [['me', '我'], ...Object.keys(names).sort((a, b) => String(names[a]).localeCompare(String(names[b]), 'zh-CN')).map((k) => [k, names[k]])];
      const live = opts.filter(([k]) => cnt[k]).map(([k]) => k);
      const sel = ownSel ? ownSel.filter((k) => cnt[k]) : [];
      const all = !sel.length || live.every((k) => sel.includes(k));
      const save = () => { if (ownSel) localStorage.setItem('polo_owner_sel', JSON.stringify(ownSel)); else localStorage.removeItem('polo_owner_sel'); };
      const pick = (k) => {
        if (all) ownSel = [k];
        else { const s = new Set(sel); if (s.has(k)) s.delete(k); else s.add(k); ownSel = [...s]; }
        if (!ownSel.length || live.every((x) => ownSel.includes(x))) ownSel = null;
        save(); drawTable();
      };
      const on = (k) => !all && sel.includes(k);
      clear(ownerBar, h('span', { class: 'own-lab', text: '归属' }),
        h('button', { type: 'button', class: 'own-chip' + (all ? ' on' : ''), 'aria-pressed': String(all), title: '显示全部账号', onclick: () => { ownSel = null; save(); drawTable(); } }, '全选', h('i', { text: String(rows.length) })),
        opts.map(([k, l]) => h('button', { type: 'button', class: 'own-chip' + (k === 'me' ? ' own-me' : '') + (on(k) ? ' on' : ''), 'aria-pressed': String(on(k)), disabled: !cnt[k],
          title: all ? `只看${k === 'me' ? '我的号' : ' ' + l + ' 的号'}` : on(k) ? '再点一下取消' : '加选', onclick: () => pick(k) }, l, h('i', { text: String(cnt[k] || 0) }))));
      return all ? null : new Set(sel);
    }
    const updated = h('span', { class: 'updated' });
    const refreshBtn = h('button', { class: 'btn btn-primary btn-sm', type: 'button' }, icon('refresh', 'icon icon-sm'), '刷新');
    const auto = autoRefreshControl(() => load());
    refreshBtn.addEventListener('click', () => { auto.reset(); load(); });
    const countText = h('span', { class: 'muted small' });
    const tbody = h('tbody', {}, Array.from({ length: 4 }, () => h('tr', {}, Array.from({ length: 6 }, () => h('td', {}, h('div', { class: 'skeleton sk-line' }))))));
    const table = h('table', { class: 'table responsive accounts' },
      h('thead', {}, h('tr', {}, ['账号', '状态 / 实时并发', '请求', '额度窗口', '消耗（官方价）', ''].map((t) => h('th', { text: t })))), tbody);
    const ops = h('div', { class: 'ops' });
    const grid = h('div', { class: 'agrid' }, Array.from({ length: 6 }, () => h('div', { class: 'acard' },
      h('div', { class: 'skeleton sk-line', style: { width: '45%', height: '16px' } }), h('div', { class: 'skeleton sk-line', style: { width: '70%' } }),
      h('div', { class: 'skeleton sk-line' }), h('div', { class: 'skeleton sk-line' }), h('div', { class: 'skeleton sk-line', style: { width: '80%' } }))));
    const tableWrap = h('div', { class: 'table-wrap' }, table);
    const listBox = h('div', {}, view === 'card' ? grid : tableWrap);
    append(main, notices, h('div', { class: 'row wrap', style: { marginBottom: '10px' } },
      h('a', { class: 'btn btn-secondary btn-sm', href: '#/pool-trend' }, icon('activity', 'icon icon-sm'), '查看总池并发走势')), rtBlock, stats,
      h('div', { class: 'card' },
        h('div', { class: 'card-head' },
          h('div', { class: 'row wrap' }, h('h2', { class: 'card-title' }, icon('server'), '账号额度'), countText),
          h('div', { class: 'toolbar dash-tools' }, search.wrap, seg, h('div', { class: 'sort-group' }, sortSel, dirBtn), outToggle, viewSeg)),
        ownerBar ? h('div', { class: 'card-head own-head' }, ownerBar) : null,
        h('div', { class: 'card-head', style: { borderBottom: '1px solid var(--border)', paddingTop: '10px', paddingBottom: '10px' } },
          updated, h('div', { class: 'toolbar' }, auto.el, refreshBtn)),
        listBox),
      admin ? ops : null);

    function drawTable() {
      S.redrawAccounts = drawTable;
      const d = S.dash;
      if (!d) return;
      const rows = (d.accounts && d.accounts.data && d.accounts.data.rows) || [];
      applyCooldown(rows);
      const q = search.input.value.trim().toLowerCase();
      let list = rows.filter((r) => !q || [r.display_name, r.email, ipOf(r), r.seat === 'premium' ? 'team 高级' : r.seat === 'standard' ? 'team 标准 普通' : '待标记', admin ? ownerText(r) : '', ...(r.plan || [])].join(' ').toLowerCase().includes(q));
      const ownF = paintOwners(rows);
      if (ownF) list = list.filter((r) => ownF.has(ownKeyOf(r)));
      if (filter === 'high') list = list.filter((r) => maxPct(r) >= 75);
      if (filter === 'abnormal') list = list.filter(isAbnormal);
      const nOut = list.filter(weekOut).length;
      outCount.textContent = `（${nOut}）`;
      if (!showOut) list = list.filter((r) => !weekOut(r));
      const s = SORTS[sortKey];
      // 一样大时：5h / 7d 互为第二排序（同一方向），再按名称
      const second = sortKey === '5h' ? pctOf('7d') : sortKey === '7d' ? pctOf('5h') : null;
      const byName = (a, b) => String(a.display_name || a.email || '').localeCompare(String(b.display_name || b.email || ''), 'zh-CN', { numeric: true });
      list.sort((a, b) => {
        const x = s.fn(a), y = s.fn(b);
        if (x === null || y === null) return x === y ? byName(a, b) : x === null ? 1 : -1; // 没有数据的始终排最后
        const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'zh-CN', { numeric: true });
        if (c) return desc ? -c : c;
        if (second) { const x2 = second(a), y2 = second(b); if (x2 !== y2) return x2 === null ? 1 : y2 === null ? -1 : desc ? y2 - x2 : x2 - y2; }
        return byName(a, b);
      });
      const ownTxt = ownF ? ` · 归属筛选中` : '';
      countText.textContent = `显示 ${list.length} / ${rows.length} 个${!showOut && nOut ? ` · 已隐藏 ${nOut} 个周额度用完的` : ''}${ownTxt}`;
      const shared = sharedIps(rows);
      const empty = () => emptyState(rows.length ? '没有符合条件的账号' : (admin ? '暂无账号数据' : '管理员还没有给你分配账号'));
      if (view === 'card') {
        if (listBox.firstChild !== grid) clear(listBox, grid);
        if (!list.length) clear(grid, h('div', { style: { gridColumn: '1 / -1' } }, empty()));
        else clear(grid, list.map((r) => accountCard(r, shared)));
      } else {
        if (listBox.firstChild !== tableWrap) clear(listBox, tableWrap);
        if (!list.length) clear(tbody, h('tr', {}, h('td', { colspan: '6' }, empty())));
        else clear(tbody, list.map((r) => accountRow(r, shared)));
      }
      paintUpdated();
    }
    function paintUpdated() {
      const a = S.dash && S.dash.accounts;
      if (!a || !a.sampled_at) { clear(updated); return; }
      clear(updated, icon('clock', 'icon icon-sm'), `数据采集于 ${fmtTime(a.sampled_at, false)}（${ago(a.sampled_at)}）`,
        a.stale ? h('span', { class: 'badge b-warn', style: { marginLeft: '6px' }, text: '可能已过期' }) : null);
    }
    function drawRt() {
      if (!admin || !S.dash) return;
      const live = S.dash.realtime;
      const ok = !!(live && live.data && live.data.summary && !live.stale);
      const m = ok ? live.data.summary : ((S.dash.summary && S.dash.summary.data && S.dash.summary.data.metrics) || {});
      const at = ok ? live.sampled_at : S.dash.accounts && S.dash.accounts.sampled_at;
      const cards = [
        statCard('自身实时并发', m['自身实时并发'], 'activity', 'ok', '我的号 · 当前在飞'),
        statCard('总池实时并发', m['总池实时并发'], 'bolt', 'purple', '整个号池 · 当前在飞'),
        statCard('号池可用账号', m['号池可用账号'], 'server', 'cyan', `当前可调度 · 自身 ${dash(m['自身可用账号'])}`),
        statCard('自身 RPM', m['自身 RPM'], 'trend', 'blue', `总池 ${dash(m['总池 RPM'])} · 最近 60 秒`),
      ];
      if (rtDrawn) for (const c of cards) c.style.animation = 'none'; // 定时刷新时不要闪
      rtDrawn = true;
      clear(rtStats, cards);
      clear(rtHead, h('span', { class: 'live-dot' + (ok ? '' : ' off') }), h('b', { text: '实时' }),
        h('span', { class: 'faint', text: ok ? `每 15 秒从 Polo 读一次 · ${ago(at) === '刚刚' ? '刚刚' : ago(at)}更新`
          : live && live.stale ? `Polo 那边暂停读取（浏览器正忙，比如结算查询），先显示 ${ago(at) || ''}的快照`
          : `这次没取到实时数字，15 秒内自动再试；先显示 ${ago(at) || ''}的快照` }));
    }
    function drawStats() {
      const d = S.dash;
      const rows = (d.accounts && d.accounts.data && d.accounts.data.rows) || [];
      applyCooldown(rows);
      const sum = (f) => { let n = 0, any = false; for (const r of rows) { const v = toNum(f(r)); if (v !== null) { n += v; any = true; } } return any ? n : null; };
      const todayReq = sum((r) => r.detail && r.detail.today && r.detail.today.requests);
      const todayTok = sum((r) => r.detail && r.detail.today && r.detail.today.tokens);
      const todayCost = sum((r) => r.detail && r.detail.today && r.detail.today.cost);
      const high = rows.filter((r) => maxPct(r) >= 75).length;
      if (admin) {
        const m = (d.summary && d.summary.data && d.summary.data.metrics) || {};
        clear(stats,
          statCard('今日自身额度', m['今日自身额度'], 'dollar', 'blue', '计费价累计'),
          statCard('近 7 日自身额度', m['最近7日自身额度'], 'trend', 'purple', '计费价累计'),
          statCard('近 30 日自身额度', m['最近30日自身额度'], 'chart', 'cyan', '计费价累计'),
          statCard('缓存命中率', m['缓存命中率'], 'bolt', 'ok', '今日 · 上游'),
          statCard('可用账号', m['自身可用账号'], 'server', 'blue', `共 ${rows.length} 个账号`),
          statCard('冷却中', m['自身冷却中'], 'clock', 'warn', `高用量（≥75%）${high} 个`),
          statCard('今日请求', compact(todayReq), 'activity', 'purple', '各账号今日合计'),
          statCard('今日 Token', compact(todayTok), 'cube', 'cyan', '各账号今日合计'));
      } else {
        let next = null;
        for (const r of rows) for (const k of quotaKeys(r)) {
          const q = r.quota[k];
          if (q.reset_at && toDate(q.reset_at) > Date.now() && (!next || toDate(q.reset_at) < toDate(next.at))) next = { at: q.reset_at, name: r.display_name, k };
        }
        clear(stats,
          statCard('我的账号', rows.length, 'server', 'blue', d.accounts && d.accounts.data && d.accounts.data.missing && d.accounts.data.missing.length ? `${d.accounts.data.missing.length} 个暂无数据` : '管理员分配'),
          statCard('今日请求', compact(todayReq), 'activity', 'purple'),
          statCard('今日 Token', compact(todayTok), 'cube', 'cyan'),
          statCard('今日费用', money(todayCost), 'dollar', 'ok', '官方价合计'),
          statCard('高用量账号', high, 'warning', high ? 'warn' : 'ok', '任一窗口 ≥75%'),
          statCard('最近一次重置', next ? until(next.at) + '后' : '—', 'clock', 'blue', next ? `${next.name} · ${(WIN[next.k] || { label: next.k }).label}` : '暂无重置时间'));
      }
    }
    function drawNotices() {
      const d = S.dash;
      const list = [];
      const a = d.accounts;
      if (!a) list.push(['n-bad', 'warning', '账号数据读取失败。']);
      else {
        if (a.stale) list.push(['n-warn', 'warning', '账号数据已超过 20 分钟没有成功更新，显示的可能不是最新结果。']);
        if (admin && a.data && a.data.complete === false) list.push(['n-warn', 'warning', '后台账号列表没有读全，显示的不是全部账号。']);
        if (!admin && a.data && a.data.missing && a.data.missing.length) {
          const arch = new Set((((d.archived || {}).data || {}).records || []).map((x) => x.account_key));
          const gone = a.data.missing.filter((k) => arch.has(k)), lost = a.data.missing.filter((k) => !arch.has(k));
          if (gone.length) list.push(['n-warn', 'archive', `分配给你的账号已归档：${gone.map(keyText).join('、')}。可在“已归档”里查看归档原因。`]);
          if (lost.length) list.push(['n-info', 'info', `以下分配给你的账号在当前数据中没有找到：${lost.map(keyText).join('、')}。`]);
        }
        if (admin && a.data && a.data.rows) {
          const dup = Object.entries(sharedIps(a.data.rows)).filter(([, v]) => v.length > 1);
          if (dup.length) list.push(['n-warn', 'warning', '以下账号共用同一个出口 IP：' + dup.map(([ip, v]) => `${v.join('、')}（${ip}）`).join('；') + '。']);
        }
      }
      const cn = d.summary && d.summary.data && d.summary.data.source_cache_notice;
      if (admin && cn) list.push(['n-info', 'info', '后台提示：' + cn]);
      clear(notices, list.map(([c, i, t]) => h('div', { class: 'notice ' + c }, icon(i), h('span', { text: t }))));
    }
    function opsCard(title, iconName, res, pairs) {
      const data = res && res.data;
      return h('div', { class: 'card' },
        h('div', { class: 'card-head' }, h('h3', { class: 'card-title' }, icon(iconName), title), res && res.sampled_at ? h('span', { class: 'faint xs', text: ago(res.sampled_at) }) : null),
        h('div', { class: 'card-body' }, data ? (() => { const dl = h('dl'); for (const [k, v] of pairs(data)) append(dl, h('dt', { text: k }), h('dd', {}, v instanceof Node ? v : dash(v))); return dl; })() : h('p', { class: 'muted', style: { margin: 0 }, text: '暂无数据' })));
    }
    function drawOps() {
      if (!admin) return;
      const d = S.dash;
      const stateText = { rows_visible: '有结果', query_running: '原站查询进行中', no_visible_results: '默认视图无可见结果' };
      clear(ops, h('div', { class: 'ops-row' },
        opsCard('用量（当前窗口）', 'activity', d.usage, (u) => [
          ['区间消费', u.range_cost_display],
          ['已加载请求', u.row_count !== null && u.row_count !== undefined ? `${u.row_count} 条${u.more_available ? '（未全部加载）' : ''}` : null],
          ['状态分布', h('div', { class: 'chips' }, Object.entries(u.visible_status_counts || {}).map(([k, v]) => h('span', { class: 'chip ' + (k === '200' ? 'chip-blue' : ''), text: `${k} × ${v}` })))],
        ]),
        opsCard('已归档账号', 'archive', d.archived, (x) => {
          const recs = [...(x.records || [])].sort((p, q) => String(q.archived_at).localeCompare(String(p.archived_at)));
          const last = recs[0];
          const counts = {};
          for (const r of recs) { const k = reasonOf(r.error, r.health_status)[1]; counts[k] = (counts[k] || 0) + 1; }
          return [
            ['归档总数', `${recs.length} 个${x.complete === false ? '（未读全）' : ''}`],
            ['最近归档', last ? `${last.display_name || last.email}（${ago(last.archived_at) || fmtTime(last.archived_at)}）` : null],
            ['归档原因', h('div', { class: 'chips' }, Object.entries(counts).map(([k, v]) => h('span', { class: 'chip', text: `${k} × ${v}` })))],
            ['', h('a', { class: 'btn btn-secondary btn-xs', href: '#/archived', style: { textDecoration: 'none' } }, '查看全部归档 →')],
          ];
        }),
        opsCard('用量统计', 'chart', d.vendor, (v) => [
          ['状态', stateText[v.query_state] || v.query_state],
          ['请求数', v.metrics && v.metrics['请求数']], ['Tokens', v.metrics && v.metrics.Tokens], ['成本', v.metrics && v.metrics['成本']],
        ])),
        proxyCard(d.proxies, d.accounts));
    }
    function proxyCard(res, accRes) {
      const data = res && res.data;
      const names = {};
      for (const r of (accRes && accRes.data && accRes.data.rows) || []) if (r.account_key) names[r.account_key] = r.display_name || r.email;
      const list = (data && data.proxies) || [];
      const body = !data ? h('p', { class: 'muted', style: { margin: 0 }, text: '暂无数据' })
        : !list.length ? h('div', { class: 'chips' }, Object.entries(data.health_counts || {}).map(([k, v]) => h('span', { class: 'badge ' + (k === '可用' ? 'b-ok' : 'b-warn'), text: `${k} ${v}` })))
          : h('div', { class: 'table-wrap' }, h('table', { class: 'table responsive' },
            h('thead', {}, h('tr', {}, ['出口 IP', '协议 / 端口', '健康', '成功 / 失败', '使用的账号', '最近使用'].map((t) => h('th', { text: t })))),
            h('tbody', {}, [...list].sort((a, b) => (b.accounts || []).length - (a.accounts || []).length).map((p) => {
              const ip = p.ip || p.host;
              const tone = p.health === '可用' ? (p.latency_ms >= 500 ? 'b-warn' : 'b-ok') : 'b-bad';
              const acc = p.accounts || [];
              return h('tr', {},
                h('td', { 'data-label': '出口 IP' }, h('span', { class: 'mono ip', title: (p.host && p.host !== ip ? `主机名：${p.host}\n` : '') + '点击复制', onclick: () => copy(ip, ' IP') }, dash(ip))),
                h('td', { 'data-label': '协议 / 端口', class: 'mono small' }, `${dash(p.protocol)} · ${dash(p.port)}`),
                h('td', { 'data-label': '健康' }, h('span', { class: 'badge ' + tone, text: dash(p.health) + (p.latency_ms !== null && p.latency_ms !== undefined ? ` ${p.latency_ms}ms` : '') })),
                h('td', { 'data-label': '成功 / 失败', class: 'num small' }, `${dash(p.success)} / ${dash(p.fail)}`),
                h('td', { 'data-label': '使用的账号' }, acc.length ? h('div', { class: 'chips' }, acc.map((k) => h('span', { class: 'chip' + (acc.length > 1 ? ' chip-warn' : ' chip-blue'), title: keyText(k), text: names[k] || keyText(k) }))) : h('span', { class: 'faint small', text: '未绑定' })),
                h('td', { 'data-label': '最近使用', class: 'small nowrap' }, dash(p.last_used)));
            }))));
      return h('div', { class: 'card', style: { gridColumn: '1 / -1' } },
        h('div', { class: 'card-head' }, h('h3', { class: 'card-title' }, icon('globe'), '出站代理', data && data.coverage ? h('span', { class: 'faint xs', style: { fontWeight: 400 }, text: data.coverage }) : null), res && res.sampled_at ? h('span', { class: 'faint xs', text: ago(res.sampled_at) }) : null),
        h('div', { class: 'card-body', style: { padding: list.length ? '0' : null } }, body));
    }

    let loading = false, snapAt = null;  // snapAt：页面上完整数据对应的那次采集（同步刷新用）
    async function load() {
      if (loading) return;
      loading = true;
      refreshBtn.disabled = true; clear(refreshBtn, icon('refresh', 'icon icon-sm spin'), '刷新中');
      try {
        const keys = admin ? Object.keys(ADMIN_RESOURCES) : ['accounts', 'archived', 'realtime'];
        const qwP = loadQw();
        const settled = await Promise.allSettled(keys.map((k) => api('GET', ADMIN_RESOURCES[k])));
        await qwP;
        if (!S.token) return;
        if (settled.every((x) => x.status === 'rejected')) {
          const e = settled[0].reason;
          if (e && (e.status === 401 || e.code === 'password_change_required')) return;
          toast(errText(e), 'bad');
          if (!S.dash) { const err = emptyState(errText(e), 'warning'); clear(tbody, h('tr', {}, h('td', { colspan: '6' }, err.cloneNode(true)))); clear(grid, h('div', { style: { gridColumn: '1 / -1' } }, err)); }
          return;
        }
        S.dash = Object.fromEntries(keys.map((k, i) => [k, settled[i].status === 'fulfilled' ? settled[i].value : null]));
        if (S.dash.realtime && S.dash.realtime.snapshot_at) snapAt = S.dash.realtime.snapshot_at;
        whenIdle(() => { if (!listBox.isConnected) return; drawNotices(); drawRt(); drawStats(); drawTable(); drawOps(); });
      } finally {
        loading = false;
        refreshBtn.disabled = false; clear(refreshBtn, icon('refresh', 'icon icon-sm'), '刷新');
      }
    }
    // 实时数字每 15 秒从 Polo 读一次：这里每 5 秒取一次，有新读数才重画；已跑额度每 15 秒取一次
    S.timers.push(setInterval(async () => {
      if (document.hidden || !S.dash) return;
      let changed = false;
      try {
        const r = await api('GET', ADMIN_RESOURCES.realtime);
        changed = !S.dash.realtime || r.sampled_at !== S.dash.realtime.sampled_at || r.stale !== S.dash.realtime.stale;
        if (changed) S.dash.realtime = r;
        // 同步刷新：服务器刚做完一轮完整采集（snapshot_at 变了），马上重新取全部数据
        if (auto.sync() && !loading && r.snapshot_at && snapAt && r.snapshot_at !== snapAt) { load(); return; }
      } catch { /* 保留上一次的 */ }
      if (Date.now() - (S.qwAt || 0) > 14000) { await loadQw(); changed = true; }
      if (!changed) return;
      whenIdle(() => { if (!listBox.isConnected) return; drawRt(); drawTable(); if (!admin) drawStats(); });
    }, 5000));
    if (S.dash) { drawNotices(); drawRt(); drawStats(); drawTable(); drawOps(); }
    load();
  }

  // ============================================================
  // 已归档
  // ============================================================
  function reasonOf(err, health) {
    const s = `${err || ''} ${health || ''}`;
    if (/account_on_hold/i.test(s)) return ['b-bad', '账号被暂停（on hold）', 'hold'];
    if (/invalid_grant|refresh token|token_error|unauthorized|401/i.test(s)) return ['b-warn', 'OAuth 授权失效', 'auth'];
    if (/suspend|banned|terminated|organization.{0,20}disabled/i.test(s)) return ['b-bad', '账号被封禁', 'ban'];
    if (/rate.?limit|429/i.test(s)) return ['b-warn', '限流', 'other'];
    if (/403|forbidden|permission/i.test(s)) return ['b-bad', '无权限', 'other'];
    if (!err) return ['b-gray', '未记录原因', 'other'];
    return ['b-gray', '其他异常', 'other'];
  }
  function spanText(a, b) {
    const ms = toDate(b).getTime() - toDate(a).getTime();
    if (isNaN(ms) || ms < 0) return '—';
    const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60);
    if (d) return `${d} 天 ${hh} 小时`;
    if (hh) return `${hh} 小时 ${m % 60} 分`;
    return `${m} 分钟`;
  }
  async function pageArchived() {
    const admin = isAdmin();
    const { main } = appLayout({ active: '#/archived', title: '已归档', desc: admin ? '后台已归档的全部账号与归档原因' : '分配给你的账号中已归档的' });
    let recs = [], filter = 'all', res = null;
    const stats = h('div', { class: 'stats' }, skeletonStats(4));
    const notice = h('div');
    const search = leadInput('search', { class: 'input input-sm has-lead', placeholder: '搜索账号、邮箱、原因', type: 'search' });
    search.wrap.style.width = '240px';
    search.input.addEventListener('input', () => draw());
    const seg = h('div', { class: 'seg' });
    const segs = [['all', '全部'], ['auth', '授权失效'], ['hold', '被暂停'], ['ban', '被封禁'], ['other', '其他']];
    const paintSeg = () => clear(seg, segs.map(([k, l]) => h('button', { type: 'button', class: filter === k ? 'on' : '', onclick: () => { filter = k; paintSeg(); draw(); } }, l)));
    paintSeg();
    const count = h('span', { class: 'muted small' });
    const updated = h('span', { class: 'updated' });
    const refresh = h('button', { class: 'btn btn-secondary btn-sm', type: 'button', onclick: () => load() }, icon('refresh', 'icon icon-sm'), '刷新');
    const tbody = h('tbody', {}, h('tr', {}, h('td', { colspan: '7' }, h('div', { class: 'skeleton sk-line' }))));
    append(main, notice, stats, h('div', { class: 'card' },
      h('div', { class: 'card-head' }, h('div', { class: 'row wrap' }, h('h2', { class: 'card-title' }, icon('archive'), '归档账号'), count),
        h('div', { class: 'toolbar' }, search.wrap, seg)),
      h('div', { class: 'card-head', style: { paddingTop: '10px', paddingBottom: '10px' } }, updated, refresh),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table responsive wide archived' },
        h('thead', {}, h('tr', {}, ['账号 / 邮箱', '归档原因', '归档时间', '添加时间', '在池时长', '最后使用', '类型 / 健康'].map((t) => h('th', { text: t })))), tbody))));

    function drawStats() {
      const week = recs.filter((r) => r.archived_at && Date.now() - toDate(r.archived_at).getTime() < 7 * 86400000).length;
      const auth = recs.filter((r) => reasonOf(r.error, r.health_status)[2] === 'auth').length;
      const hold = recs.filter((r) => ['hold', 'ban'].includes(reasonOf(r.error, r.health_status)[2])).length;
      const back = recs.filter((r) => r.in_pool).length;
      clear(stats,
        statCard('归档总数', recs.length, 'archive', 'blue', res && res.data && res.data.complete === false ? '后台列表未读全' : '全部归档记录'),
        statCard('近 7 天归档', week, 'clock', 'purple'),
        statCard('授权失效', auth, 'key', auth ? 'warn' : 'ok', 'OAuth refresh token 失效'),
        statCard('被暂停 / 封禁', hold, 'warning', hold ? 'bad' : 'ok', back ? `另有 ${back} 个已重新添加` : '上游返回的账号状态'));
    }
    function draw() {
      const q = search.input.value.trim().toLowerCase();
      const list = recs.filter((r) => (filter === 'all' || reasonOf(r.error, r.health_status)[2] === filter)
        && (!q || [r.display_name, r.email, r.error].join(' ').toLowerCase().includes(q)))
        .sort((a, b) => String(b.archived_at).localeCompare(String(a.archived_at)));
      count.textContent = `显示 ${list.length} / ${recs.length} 个`;
      if (!list.length) { clear(tbody, h('tr', {}, h('td', { colspan: '7' }, emptyState(recs.length ? '没有符合条件的归档账号' : (admin ? '没有已归档的账号' : '分配给你的账号都没有被归档'), 'archive')))); return; }
      clear(tbody, list.map((r) => {
        const [bc, bt] = reasonOf(r.error, r.health_status);
        return h('tr', {},
          h('td', { 'data-label': '' },
            h('div', { class: 'cell-title', text: dash(r.display_name) }),
            r.email ? h('div', { class: 'email mono', title: r.email + '（点击复制）', onclick: () => copy(r.email, '邮箱') }, r.email) : null,
            r.in_pool ? h('div', { class: 'chips', style: { marginTop: '5px' } }, h('span', { class: 'chip chip-blue', title: '同一邮箱当前又在账号池中，这条是之前的归档记录', text: '已重新添加（在账号池中）' })) : null),
          h('td', { 'data-label': '归档原因' }, h('span', { class: 'badge ' + bc, text: bt }),
            r.error ? h('div', { class: 'err-text', title: r.error, text: r.error }) : null),
          h('td', { 'data-label': '归档时间', class: 'nowrap' }, h('div', { text: fmtTime(r.archived_at) }), h('div', { class: 'cell-sub', text: ago(r.archived_at) || '' })),
          h('td', { 'data-label': '添加时间', class: 'nowrap' }, fmtTime(r.added_at)),
          h('td', { 'data-label': '在池时长', class: 'nowrap' }, r.added_at && r.archived_at ? spanText(r.added_at, r.archived_at) : '—'),
          h('td', { 'data-label': '最后使用', class: 'nowrap' }, r.last_used_at ? h('div', {}, h('div', { text: fmtTime(r.last_used_at) }), h('div', { class: 'cell-sub', text: r.archived_at ? `归档前 ${spanText(r.last_used_at, r.archived_at)}` : '' })) : h('span', { class: 'faint', text: '—' })),
          h('td', { 'data-label': '类型 / 健康' }, h('div', { class: 'mono small', text: dash(r.provider_type) }),
            r.health_status ? h('div', { style: { marginTop: '4px' } }, h('span', { class: 'chip', text: r.health_status })) : null));
      }));
    }
    async function load(quiet) {
      refresh.disabled = true;
      try {
        res = await api('GET', '/v1/archived-accounts');
        recs = (res.data && res.data.records) || [];
        clear(updated, icon('clock', 'icon icon-sm'), `数据采集于 ${fmtTime(res.sampled_at, false)}（${ago(res.sampled_at)}）`,
          res.stale ? h('span', { class: 'badge b-warn', style: { marginLeft: '6px' }, text: '可能已过期' }) : null);
        clear(notice, res.data && res.data.complete === false ? h('div', { class: 'notice n-warn' }, icon('warning'), h('span', { text: '后台归档列表没有读全，显示的不是全部归档账号。' })) : null);
        drawStats(); draw();
      } catch (e) {
        if (quiet) return;  // 自动刷新失败：留着上一次的
        clear(stats); clear(tbody, h('tr', {}, h('td', { colspan: '7' }, emptyState(errText(e), 'warning'))));
      } finally { refresh.disabled = false; }
    }
    autoRefresh(() => load(true), 60000);
    load();
  }

  // ============================================================
  // 额度窗口：每个号每个 5h / 7d 窗口里跑了多少额度（所有模型合计）
  // ============================================================
  async function pageWindows(params) {
    const { main } = appLayout({ active: '#/windows', title: '额度窗口', desc: '每个号每个 5h / 7d 额度窗口里跑了多少额度（所有模型合计）' });
    const pk = params.get('kind');
    let kind = pk === '5h' || pk === '7d' ? pk : (localStorage.getItem('polo_qw_kind') === '7d' ? '7d' : '5h');
    let key = (params.get('key') || localStorage.getItem('polo_qw_key') || '').toLowerCase();
    let ov = null, hist = null, names = {}, order = [], shown = 30, seq = 0, chart = null;
    const since = h('span'), err = h('div');
    const help = h('div', { class: 'card', style: { marginBottom: '16px' } }, h('div', { class: 'card-body' }, howTo('怎么算的',
      h('div', { class: 'hint', text: '窗口：每次采集（约 3 分钟）读每个号 5h / 7d 的“X 后重置”，重置时间往前推 5 小时 / 7 天就是窗口起点（多算 10 分钟以防取整，但不早于上一个窗口的结束；两个窗口之间没有用量，多算不会算进别的窗口）。' }),
      h('div', { class: 'hint', text: '未满显示预测；已满只显示本窗口实际记入的总额，包括满额后仍在处理的请求在窗口内完成的费用。优先取能核对起止的卡片累计；对不上就用已有的完整用量查询，显示查询截止时间。两种来源都没有就显示待核实，不插值。' }),
      h('div', { class: 'hint', text: '满 ≈（用满预测）：每次 Polo 把用量 % 刷新到新的数，就用那一刻的“已跑 ÷ %”算出这个窗口跑满 100% 大约是多少钱（% 是整数，% 越高越准）。本窗口用量不到 5% 时用这个号以往窗口的中位数（灰色）。' }),
      h('div', { class: 'hint', text: '缓存：Polo 卡片上的 token 含缓存读写，「用量统计」的 Token 只有输入 + 输出，两者之差就是缓存；缓存占比 = 缓存 token ÷ 全部 token。下面「缓存和额度」看它对每 1% 额度能跑多少钱的影响。' }),
      h('div', { class: 'faint xs', style: { marginTop: '4px' } }, since))));
    const ovBody = h('tbody');
    const ovCard = h('div', { class: 'card', style: { marginBottom: '16px' } },
      h('div', { class: 'card-head' }, h('h3', { class: 'card-title' }, icon('server'), '全部账号', h('span', { class: 'faint xs', style: { fontWeight: 400 }, text: '点一行看这个号每个窗口的明细' }))),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table responsive qw-ov' },
        h('thead', {}, h('tr', {}, ['账号', '当前 5h 窗口', '当前 7d 窗口', '最近的 5h 窗口', '上一个 7d 窗口'].map((x) => h('th', { text: x })))), ovBody)));
    const sel = h('select', { class: 'select select-sm qw-sel', 'aria-label': '选择账号' });
    const seg = h('div', { class: 'seg' });
    const kpis = h('div', { class: 'qw-kpis' });
    const chartEl = h('div', { class: 'chart' });
    const tbody = h('tbody');
    const moreBtn = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', hidden: true, onclick: () => { shown += 50; drawTable(); } }, '显示更多');
    const detail = h('div', { class: 'card qw-detail' },
      h('div', { class: 'card-head' }, h('h3', { class: 'card-title' }, icon('trend'), '每个窗口'), h('div', { class: 'row wrap qw-pick' }, sel, seg)),
      h('div', { class: 'card-body' }, kpis, chartEl),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table responsive qw-table' },
        h('thead', {}, h('tr', {}, ['窗口', '已跑额度', '请求', 'Token', '其中 Opus / Fable', '用量 %', '实跑 / 预测', '缓存占比', '状态'].map((x) => h('th', { text: x })))), tbody)),
      h('div', { style: { textAlign: 'center', padding: '8px' } }, moreBtn));
    // 缓存和额度：缓存占比高低对“每 1% 额度能跑多少钱”的影响
    let cdata = null, cchart = null, ckind = localStorage.getItem('polo_qc_kind') === '7d' ? '7d' : '5h';
    const cSeg = h('div', { class: 'seg' }), cSum = h('div', { class: 'qc-sum' }), cChartEl = h('div', { class: 'chart' }), cBins = h('tbody');
    const cConc = h('div', { class: 'qc-sec' }), cForm = h('div', { class: 'qc-sec' });
    const cacheCard = h('div', { class: 'card qc-card' },
      h('div', { class: 'card-head' }, h('h3', { class: 'card-title' }, icon('chart'), '缓存和额度'), cSeg),
      h('div', { class: 'card-body' }, cSum, cChartEl),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table responsive qc-table' },
        h('thead', {}, h('tr', {}, ['缓存占比', '段数', '额度涨了', '花了', '每 1% 额度'].map((x) => h('th', { text: x })))), cBins)),
      cConc, cForm);
    append(main, help, err, ovCard, detail, cacheCard);
    const cpct = (x) => (x === null || x === undefined ? '—' : (Math.round(x * 1000) / 10).toFixed(1).replace(/\.0$/, '') + '%');
    function drawCache() {
      clear(cSeg, QW_KINDS.map((kd) => h('button', { type: 'button', class: kd === ckind ? 'on' : '', onclick: () => { ckind = kd; localStorage.setItem('polo_qc_kind', kd); drawCache(); }, text: kd + ' 额度' })));
      if (!cdata) { clear(cSum, h('div', { class: 'skeleton sk-line', style: { width: '70%' } })); return; }
      const F = (cdata.fit && cdata.fit[ckind]) || {}, sf = F.segments, wf = F.windows, dp = (cdata.min_dp || {})[ckind] || 3;
      const lines = [];
      const per = (x, f) => f.intercept + f.slope * x;
      if (!sf || sf.n < 8) {
        const nseg = ((cdata.segments || []).filter((s) => s.kind === ckind && s.all > 0 && s.io !== null && s.p1 > s.p0)).length;
        lines.push(h('p', { text: `数据还不够：现在有 ${nseg} 段（${ckind} 用量每涨 ${dp} 个点记一段），至少要 8 段、而且缓存占比有高有低，才看得出影响。号跑起来以后会自己变多。` }));
        if (sf && sf.n) lines.push(h('p', { class: 'faint', text: `目前平均：缓存占比 ${cpct(sf.mean_x)}，每 1% 额度 ≈ ${usd(sf.mean_y)}（跑满 100% ≈ ${usd(sf.mean_y * 100)}）` }));
      } else if (sf.slope === null) {
        lines.push(h('p', { text: `这段时间缓存占比都在 ${cpct(sf.x_min)} – ${cpct(sf.x_max)} 之间，变化太小，看不出影响。平均每 1% 额度 ≈ ${usd(sf.mean_y)}（${sf.n} 段）。` }));
      } else {
        const d10 = sf.slope * 0.1, r = Math.abs(sf.r || 0);
        const strength = r >= 0.6 ? '关系明显' : r >= 0.3 ? '有一定关系' : '关系很弱，可能只是波动';
        lines.push(h('p', {}, h('b', { text: `缓存占比每高 10 个百分点，每 1% ${ckind} 额度${d10 >= 0 ? '多' : '少'}跑 ${usd(Math.abs(d10))}` }),
          h('span', { class: 'faint', text: `（${sf.n} 段，相关系数 ${(sf.r || 0).toFixed(2)}，${strength}）` })));
        lines.push(h('p', { text: `按拟合：缓存 ${cpct(sf.x_min)} 时每 1% ≈ ${usd(per(sf.x_min, sf))}（跑满 ≈ ${usd(per(sf.x_min, sf) * 100)}）；缓存 ${cpct(sf.x_max)} 时每 1% ≈ ${usd(per(sf.x_max, sf))}（跑满 ≈ ${usd(per(sf.x_max, sf) * 100)}）。` }));
      }
      if (wf && wf.n >= 3) lines.push(h('p', { class: 'faint', text: `按整个窗口看（${wf.n} 个）：平均缓存 ${cpct(wf.mean_x)}，跑满 ≈ ${usd(wf.mean_y * 100)}` + (wf.slope !== null ? `；缓存每高 10 个百分点，跑满${wf.slope >= 0 ? '多' : '少'} ${usd(Math.abs(wf.slope * 10))}` : '') }));
      const sr = F.segments_rel;
      if (sr && sr.n >= 8 && sr.slope !== null && (F.accounts || 0) >= 1) {
        const d = sr.slope * 0.1;
        lines.push(h('p', {}, h('b', { text: `同一个号自己比：缓存占比每高 10 个百分点，每 1% 额度跑的钱${d >= 0 ? '多' : '少'} ${Math.abs(d * 100).toFixed(0)}%` }),
          h('span', { class: 'faint', text: `（相对这个号自己的平均；${F.accounts} 个号、${sr.n} 段，相关系数 ${(sr.r || 0).toFixed(2)}。各号额度大小不同，混在一起比会把“号不一样”当成缓存的影响，这一行更可信）` })));
      }
      lines.push(h('p', { class: 'faint xs', text: `图：横轴是缓存占比，纵轴是每 1% 额度跑了多少美元。蓝点是每一段（用量从 a% 涨到 b%，至少 ${dp} 个点，点越大涨得越多），橙色菱形是整个窗口，红色虚线是拟合的趋势。% 是整数，单段误差大，看很多段的趋势。` + (cdata.ticks_since ? `从 ${fmtTime(cdata.ticks_since)} 开始记录。` : '') }));
      clear(cSum, lines);
      const bins = F.bins || [];
      cBins.closest('.table-wrap').hidden = !bins.length;
      clear(cBins, bins.map((b) => h('tr', {},
        h('td', { 'data-label': '缓存占比', text: `${cpct(b.lo)} – ${cpct(b.hi)}` }),
        h('td', { 'data-label': '段数', class: 'num', text: String(b.n) }),
        h('td', { 'data-label': '额度涨了', class: 'num', text: `${Math.round(b.pct)} 个点` }),
        h('td', { 'data-label': '花了', class: 'num', text: usd(b.usd) }),
        h('td', { 'data-label': '每 1% 额度', class: 'num' }, h('b', { text: usd(b.per_pct) })))));
      drawCacheChart();
      drawConc();
      drawFormula();
    }
    const rStrength = (r) => (r === null || r === undefined ? '算不出' : Math.abs(r) >= 0.5 ? '关系明显' : Math.abs(r) >= 0.3 ? '有一定关系' : '关系很弱');
    const rLine = (r, a, up, down) => (r === null || r === undefined ? null
      : h('li', {}, `${a}，${r >= 0 ? up : down}`, h('span', { class: 'faint', text: `（相关系数 ${r.toFixed(2)}，${rStrength(r)}）` })));
    const ktok = (v) => (v === null || v === undefined ? '—' : Math.round(v / 1000).toLocaleString('en-US') + 'k');
    const binTable = (rows, first, label) => h('div', { class: 'table-wrap' }, h('table', { class: 'table responsive qc-table' },
      h('thead', {}, h('tr', {}, [first, '步数', '额度涨了', '平均并发', '缓存占比', '每请求 token', '每 1% 额度'].map((x) => h('th', { text: x })))),
      h('tbody', {}, rows.map((g) => h('tr', {},
        h('td', { 'data-label': first, text: label(g) }),
        h('td', { 'data-label': '步数', class: 'num', text: `${g.n}（${g.accounts} 个号）` }),
        h('td', { 'data-label': '额度涨了', class: 'num', text: `${Math.round(g.dp)} 个点` }),
        h('td', { 'data-label': '平均并发', class: 'num', text: g.conc.toFixed(1) }),
        h('td', { 'data-label': '缓存占比', class: 'num', text: cpct(g.cache) }),
        h('td', { 'data-label': '每请求 token', class: 'num', text: ktok(g.ctx) }),
        h('td', { 'data-label': '每 1% 额度', class: 'num' }, h('b', { text: g.rel ? `平均的 ${g.rel.toFixed(2)} 倍` : '—' }), h('span', { class: 'faint', text: ` ${usd(g.per)}` })))))));
    // 并发、每个请求带的 token 和缓存、额度的关系（按 % 每变一次的“步”统计）
    function drawConc() {
      const C = cdata.conc && cdata.conc[ckind], out = [h('h4', { text: '并发、上下文和缓存' })];
      out.push(h('p', { class: 'faint xs', text: '每一步 = Polo 刷新一次用量 %（约 10 分钟一次）且 % 变了。平均并发 = 这一步里这个号同时在跑的请求数（每 15 秒读一次）；每请求 token = 全部 token ÷ 请求数，就是每次请求带的上下文大小（含缓存）。各号额度大小不同，“每 1% 额度跑的钱”都换成“是这个号自己平均的几倍”再比（表里灰色是美元原值）。' + (cdata.conc_since ? `从 ${fmtTime(cdata.conc_since)} 开始记录并发。` : '') }));
      if (!C || C.n < 10) {
        out.push(h('p', { text: `数据还不够：现在有 ${C ? C.n : 0} 步带并发数据，至少要 10 步。号跑起来以后每小时会多几步。` }));
        return clear(cConc, out);
      }
      const r = C.corr || {};
      out.push(h('ul', { class: 'qc-list' }, [
        rLine(r.conc_cache, '并发越高', '缓存占比越高', '缓存占比越低'),
        rLine(r.ctx_cache, '每个请求带的 token 越多', '缓存占比越高', '缓存占比越低'),
        rLine(r.cache_per, '缓存占比越高', '每 1% 额度跑的钱越多', '每 1% 额度跑的钱越少'),
        rLine(r.conc_per, '并发越高', '每 1% 额度跑的钱越多', '每 1% 额度跑的钱越少'),
        rLine(r.ctx_per, '每个请求带的 token 越多', '每 1% 额度跑的钱越多', '每 1% 额度跑的钱越少'),
      ].filter(Boolean)));
      const M = C.multi && C.multi.coef;
      if (M) {
        const term = (k, scale, what) => {
          const b = M[k].b * scale, se = (M[k].se || 0) * scale, sig = Math.abs(b) > 2 * se;
          return `${what}，每 1% 额度跑的钱${b >= 0 ? '多' : '少'} ${Math.abs(b * 100).toFixed(0)}%` + (sig ? '' : '（在误差范围内，算不上）');
        };
        out.push(h('p', {}, h('b', { text: '三个一起看（排除彼此干扰）：' }),
          [term('cache', 0.1, '缓存占比高 10 个百分点'), term('conc', 1, '并发多 1'), term('ctx', 1, '每请求多 10 万 token')].join('；') + `。（${C.n} 步）`));
      }
      out.push(binTable(C.by_conc || [], '并发区间', (g) => (g.hi ? `${g.lo} – ${g.hi}` : `${g.lo} 以上`)));
      out.push(binTable(C.by_ctx || [], '每请求 token 区间', (g) => (g.hi ? `${ktok(g.lo)} – ${ktok(g.hi)}` : `${ktok(g.lo)} 以上`)));
      clear(cConc, out);
    }
    // 额度公式反推：涨的点数 = a×输入输出的钱 + b×缓存写的钱 + c×缓存读的钱（钱按 Polo 官方价）
    function drawFormula() {
      const F = cdata.formula && cdata.formula[ckind], out = [h('h4', { text: '官方额度怎么算（反推）' })];
      const pr = cdata.prices || {}, po = pr.opus || [4, 20, 5, 8, 0.2], pf = pr.fable || [8, 40, 10, 16, 0.2];
      const ps = (x) => `${x[0]} / ${x[1]} / ${x[2]}（1 小时 ${x[3]}）/ ${x[4]}`;
      out.push(h('p', { class: 'faint xs', text: `做法：每一步花的钱（Polo 官方价）拆开，拟合“用量涨的点数 = 这个号的额度系数 × Σ 各部分的钱 × 各部分的权重”。权重所有号共用、按花费加权平均是 1：如果官方额度就是按 API 价算的，各部分都是 1；大于 1 说明这部分在额度里比它的价格“贵”，小于 1 是“便宜”。每个号额度大小不同，单独算一个系数（下面“各号每 1% 额度”）。Polo 不分号给缓存读 / 写，只有自己号池的合计，所以只用这个号占自己号池花费 ≥ ${Math.round((cdata.dom_min || 0.8) * 100)}% 的步。缓存写分 5 分钟和 1 小时两种价，Polo 也不按号给各占多少：拆缓存写、拆输入输出时按“全是 5 分钟”和“全是 1 小时”各算一遍，真实值在两者之间；“缓存读 vs 其余”不受影响。单价（每百万 token，输入 / 输出 / 缓存写 / 缓存读）：Opus ${ps(po)}，Fable ${ps(pf)}。` }));
      const need = 15;
      if (!F || !F.two || F.n < need) {
        out.push(h('p', { text: `数据还不够：现在有 ${F ? F.n : 0} 步可用（共 ${F ? F.n_all : 0} 步），至少要 ${need} 步，而且用法要有变化（缓存读时多时少）才分得开。要看准大概需要几百步（几天）。` }));
        return clear(cForm, out);
      }
      const sp = F.spend || {}, f2 = (x) => x.toFixed(2);
      const rng = (a, b, f) => (Math.abs(a - b) < 0.005 * Math.max(Math.abs(a), Math.abs(b), 1e-9) ? f(a) : `${f(Math.min(a, b))} – ${f(Math.max(a, b))}`);
      // 主要结论：缓存读 vs 其余（不受缓存写 5 分钟 / 1 小时、输入 / 输出怎么分的影响）
      const C2 = F.two.coef, rr = C2.cr.b / C2.rest.b, rse = Math.abs(rr) * Math.hypot((C2.cr.se || 0) / C2.cr.b, (C2.rest.se || 0) / C2.rest.b);
      const lo = rr - 2 * rse, hi = rr + 2 * rse;
      const verdict = hi < 1 ? `缓存读在官方额度里比它的 API 价“便宜”：同样 1 美元，缓存读只耗其余部分 ${f2(Math.max(0, lo))}–${f2(hi)} 倍的额度。所以缓存读占的钱越多，每 1% 额度能跑的钱越多。`
        : lo > 1 ? `缓存读在官方额度里比它的 API 价“贵”：同样 1 美元，缓存读要耗其余部分 ${f2(lo)}–${f2(hi)} 倍的额度。所以缓存读占的钱越多，每 1% 额度能跑的钱越少。`
        : `目前看不出缓存读和其余部分的区别（${f2(Math.max(0, lo))}–${f2(hi)} 倍，包含 1）：可能就是按 API 价算，也可能数据还不够。`;
      out.push(h('p', {}, h('b', { text: verdict }), h('span', { class: 'faint', text: `（${F.n} 步、共涨 ${Math.round(F.dp)} 个点，Opus 占 ${cpct(F.opus_share)}；缓存读占花费 ${cpct(sp.usd ? sp.c_cr / sp.usd : null)}；范围是大约 95% 的把握；R² ${F.two.r2 !== null ? F.two.r2.toFixed(2) : '—'}）` })));
      // 各号的额度大小
      const accts = Object.entries(F.accounts || {}).sort((a, b) => b[1].n - a[1].n);
      if (accts.length) {
        out.push(h('p', {}, h('b', { text: '各号每 1% 额度 ≈ ' }), accts.map(([k, v], i) => `${i ? '；' : ''}${nm(k)} ${usd(v.per_pct)}（${v.n} 步）`).join(''),
          h('span', { class: 'faint', text: '（按这些步的用法、平均价算）' })));
      }
      // 再拆出缓存写：按“全 5 分钟”“全 1 小时”各算一遍
      const T5 = F.three && F.three['5m'], T1 = F.three && F.three['1h'];
      if (T5 && T1) {
        const rows = [['io', '输入 + 输出'], ['cw', '缓存写'], ['cr', '缓存读']];
        const share = (key, t) => (key === 'cr' ? sp.c_cr : sp[(key === 'io' ? 'c_io_' : 'c_cw_') + t]) / (sp.usd || 1);
        out.push(h('div', { class: 'table-wrap' }, h('table', { class: 'table responsive qc-table' },
          h('thead', {}, h('tr', {}, ['哪类', '占花费', '1 美元耗的额度（平均 = 1）'].map((x) => h('th', { text: x })))),
          h('tbody', {}, rows.map(([key, name]) => {
            const a = T5.coef[key].b, b = T1.coef[key].b, se = Math.max(T5.coef[key].se || 0, T1.coef[key].se || 0);
            const weak = Math.min(a, b) <= 0 || se > 0.5 * Math.max(Math.abs(a), Math.abs(b));
            return h('tr', {},
              h('td', { 'data-label': '哪类', text: name }),
              h('td', { 'data-label': '占花费', class: 'num', text: rng(share(key, '5m'), share(key, '1h'), cpct) }),
              h('td', { 'data-label': '1 美元耗的额度（平均 = 1）', class: 'num' }, weak ? h('span', { class: 'faint', text: `还看不准（${rng(a, b, f2)} ±${f2(2 * se)}）` })
                : [h('b', { text: rng(a, b, f2) + ' 倍' }), h('span', { class: 'faint', text: ` ±${f2(2 * se)}` })]));
          })))));
        out.push(h('p', { class: 'faint xs', text: '有两个数的格子：前后分别是按“缓存写全是 5 分钟”和“全是 1 小时”算的（按大小排），真实值在中间。' }));
      }
      // 输入 / 输出也分开：换算成“几个输入 token”
      const Q5 = F.four && F.four['5m'], Q1 = F.four && F.four['1h'], ns = F.n_split || {};
      if (Q5 && Q1 && (ns['5m'] || 0) >= 20 && (ns['1h'] || 0) >= 20) {
        const opus = F.opus_share === null || F.opus_share >= 0.5, P = opus ? po : pf;
        const eq = (Q, key, pi) => (Q.coef[key].b * pi) / (Q.coef.in.b * P[0]);
        // 估计是负数，或误差超过一半：不给数字
        const shaky = (key) => [Q5, Q1].some((Q) => Q.coef[key].b <= 0 || Q.coef.in.b <= 0 || (Q.coef[key].se || 0) > 0.5 * Math.abs(Q.coef[key].b) || (Q.coef.in.se || 0) > 0.5 * Math.abs(Q.coef.in.b));
        const show = (key, txt) => (shaky(key) ? '还看不准' : txt);
        out.push(h('p', {}, h('b', { text: '按 token 换算（输入、输出分开）：' }),
          `1 个输出 token ≈ ${show('out', rng(eq(Q5, 'out', P[1]), eq(Q1, 'out', P[1]), (x) => x.toFixed(1)) + ' 个输入 token')}；1 个缓存写 ≈ ${show('cw', rng(eq(Q5, 'cw', P[2]), eq(Q1, 'cw', P[3]), f2) + ' 个（5 分钟 / 1 小时）')}；1 个缓存读 ≈ ${show('cr', rng(eq(Q5, 'cr', P[4]), eq(Q1, 'cr', P[4]), (x) => x.toFixed(3)) + ' 个')}`,
          h('span', { class: 'faint', text: `（${opus ? 'Opus' : 'Fable'} 的 API 价里是 ${(P[1] / P[0]).toFixed(1)} / ${f2(P[2] / P[0])}（1 小时 ${f2(P[3] / P[0])}）/ ${(P[4] / P[0]).toFixed(3)}；${Math.min(ns['5m'], ns['1h'])} 步以上）` })));
      } else {
        out.push(h('p', { class: 'faint', text: `输入和输出分开算还要更多数据：现在 ${Math.min(ns['5m'] || 0, ns['1h'] || 0)} 步，至少 20 步。` }));
      }
      clear(cForm, out);
    }
    async function drawCacheChart() {
      const segs = ((cdata && cdata.segments) || []).filter((s) => s.kind === ckind && s.all > 0 && s.io !== null && s.p1 > s.p0);
      const wins = ((cdata && cdata.windows) || []).filter((w) => w.kind === ckind && w.full && (w.full.src === 'now' || w.full.src === 'actual'));
      if (!segs.length && !wins.length) {
        if (cchart) { cchart.dispose(); S.charts = S.charts.filter((x) => x !== cchart); cchart = null; }
        clear(cChartEl, emptyState('等号跑起来：用量每涨几个点就会多一个点', 'clock'));
        return;
      }
      try { await loadECharts(); } catch (e) { clear(cChartEl, emptyState(errText(e), 'warning')); return; }
      if (!cChartEl.isConnected) return;
      if (!cchart || cchart.isDisposed()) { clear(cChartEl); cchart = mkChart(cChartEl); }
      const t = chartTheme(), b = baseOpt(t), sf = cdata.fit && cdata.fit[ckind] && cdata.fit[ckind].segments;
      const sp = segs.map((s) => ({ value: [Math.round((1 - s.io / s.all) * 1000) / 10, s.usd / (s.p1 - s.p0)], s }));
      const xs = sp.map((p) => p.value[0]).concat(wins.map((w) => w.cache_share * 100));
      const xmin = Math.max(0, Math.floor(Math.min(...xs) / 5) * 5 - 5);
      const fit = sf && sf.slope !== null ? [[sf.x_min * 100, sf.intercept + sf.slope * sf.x_min], [sf.x_max * 100, sf.intercept + sf.slope * sf.x_max]] : [];
      const tip = (p) => {
        if (p.seriesName === '拟合') return '';
        if (p.data.s) { const s = p.data.s; return `<div class="ct-title">${escHtml(nm(s.key))} · ${escHtml(fmtShort(s.t0))} → ${escHtml(fmtShort(s.t1).slice(6))}</div>` + tipRow('用量', `${pct(s.p0)} → ${pct(s.p1)}`) + tipRow('花了', usd4(s.usd)) + tipRow('每 1% 额度', usd(p.value[1])) + tipRow('缓存占比', p.value[0] + '%') + tipRow('全部 token', compact(s.all)); }
        const w = p.data.w; return `<div class="ct-title">${escHtml(nm(w.key))} · 整个窗口 ${escHtml(fmtShort(w.start))}</div>` + tipRow(reached(w) ? '本窗实跑' : '跑满预测 ≈', usd(qwFull(w))) + tipRow('每 1% 额度', usd(qwFull(w) / 100)) + tipRow('缓存占比', cpct(w.cache_share));
      };
      cchart.setOption(Object.assign(b, {
        grid: { left: 8, right: 14, top: 40, bottom: 26, containLabel: true },
        legend: Object.assign(b.legend, { data: ['每一段', '整个窗口', '拟合'] }),
        tooltip: Object.assign(b.tooltip, { trigger: 'item', formatter: tip }),
        xAxis: axisY(t, (v) => v + '%', { min: xmin, max: 100, name: '缓存占比', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: t.muted, fontSize: 11 } }),
        yAxis: axisY(t, (v) => '$' + (v >= 10 ? Math.round(v) : v.toFixed(1))),
        series: [
          { name: '每一段', type: 'scatter', data: sp, symbolSize: (v, p) => Math.min(16, 5 + (p.data.s.p1 - p.data.s.p0) * 1.2), itemStyle: { color: 'rgba(59,130,246,.55)', borderColor: '#3b82f6' } },
          { name: '整个窗口', type: 'scatter', symbol: 'diamond', symbolSize: 13, data: wins.map((w) => ({ value: [Math.round(w.cache_share * 1000) / 10, qwFull(w) / 100], w })), itemStyle: { color: '#f59e0b' } },
          { name: '拟合', type: 'line', data: fit, symbol: 'none', silent: true, lineStyle: { color: '#ef4444', width: 2, type: 'dashed' } },
        ],
      }), true);
    }

    const nm = (k) => (names[k] && names[k].name) || keyText(k);
    const sub = (k) => (names[k] && names[k].email) || '';
    const keysOf = () => { const a = (ov && ov.accounts) || {}; return [...order.filter((k) => a[k]), ...Object.keys(a).filter((k) => !order.includes(k)).sort()]; };
    const stateText = (w) => (w.state === 'final' ? '已结束 · 精确' : w.state === 'ended' ? '已结束 · 精确统计中' : w.state === 'live' ? '进行中' + (w.missing ? ` · 缺 ${w.missing} 段` : '') : '统计中');
    const span = (w) => { const s = fmtShort(w.start), e = fmtShort(w.end); return s.slice(0, 5) === e.slice(0, 5) ? `${s} → ${e.slice(6)}` : `${s} → ${e}`; };
    const has = (w) => typeof w.usd === 'number';
    function cur(w, kd) {
      if (!w) return h('span', { class: 'faint', text: '—' });
      const left = until(w.end), f = w.full;
      return h('div', { class: 'qw-cur', title: qwTitle(w, kd) + '\n\n' + fullTitle(w, kd) },
        h('b', { class: 'qw-usd' + (w.missing ? ' partial' : ''), text: reached(w) ? resultText(w) : has(w) ? usd(w.usd) : '统计中' }),
        f ? h('span', { class: 'qw-full' + (f.src === 'hist' || f.src === 'pool' ? ' guess' : ''), text: reached(w) ? '已满 · 实跑' : `满 ≈${usdS(f.est)}` + (has(w) ? ` · 剩 ≈${usdS(Math.max(0, f.est - w.usd))}` : '') }) : null,
        h('span', { class: 'faint xs', text: [typeof w.last_pct === 'number' ? '已用 ' + pct(w.last_pct) : null, left ? left + '后重置' : null].filter(Boolean).join(' · ') }));
    }
    function drawOv() {
      const accts = (ov && ov.accounts) || {}, keys = keysOf();
      if (!keys.length) { clear(ovBody, h('tr', {}, h('td', { colspan: '5' }, emptyState('还没有窗口数据：服务器正在记录，第一批数字几分钟后出现', 'clock')))); return; }
      clear(ovBody, keys.map((k) => {
        const a = accts[k], r5 = (a.recent['5h'] || []).filter(has), r7 = (a.recent['7d'] || []).filter(has);
        const avg = r5.length ? r5.reduce((s, w) => s + w.usd, 0) / r5.length : null, last7 = r7.length ? r7[r7.length - 1] : null;
        return h('tr', { class: 'qw-row' + (k === key ? ' on' : ''), onclick: () => pick(k, null, true) },
          h('td', { 'data-label': '' }, h('div', { class: 'qw-name' }, h('b', { text: nm(k) }), sub(k) && sub(k) !== nm(k) ? h('span', { class: 'faint xs mono', text: sub(k) }) : null)),
          h('td', { 'data-label': '当前 5h 窗口' }, cur(a.current['5h'], '5h')),
          h('td', { 'data-label': '当前 7d 窗口' }, cur(a.current['7d'], '7d')),
          h('td', { 'data-label': '最近的 5h 窗口' }, r5.length ? h('div', { class: 'qw-spark', title: r5.map((w) => `${fmtShort(w.start)}  ${usd(w.usd)}`).join('\n') }, r5.length > 1 ? sparkline(r5.map((w) => w.usd)) : null,
            h('span', { class: 'faint xs', text: `${r5.length} 个 · 平均 ${usd(avg)}` })) : h('span', { class: 'faint xs', text: '还没有结束的' })),
          h('td', { 'data-label': '上一个 7d 窗口' }, last7 ? h('div', { class: 'qw-cur' }, h('b', { class: 'qw-usd', text: usd(last7.usd) }),
            h('span', { class: 'faint xs', text: [typeof last7.last_pct === 'number' ? '已用 ' + pct(last7.last_pct) : null, last7.rejected_at ? '打满' : null].filter(Boolean).join(' · ') })) : h('span', { class: 'faint xs', text: '还没有结束的' })));
      }));
    }
    function paintPick() {
      clear(sel, keysOf().map((k) => h('option', { value: k, selected: k === key, text: nm(k) + (sub(k) && sub(k) !== nm(k) ? ' · ' + sub(k) : '') })));
      clear(seg, QW_KINDS.map((kd) => h('button', { type: 'button', class: kd === kind ? 'on' : '', onclick: () => pick(null, kd), text: kd + ' 窗口' })));
    }
    sel.addEventListener('change', () => pick(sel.value));
    function pick(k, kd, scroll) {
      const keyChanged = k && k !== key;
      if (k) key = k;
      if (kd) kind = kd;
      localStorage.setItem('polo_qw_key', key); localStorage.setItem('polo_qw_kind', kind);
      history.replaceState(null, '', qwLink(key, kind));
      drawOv(); paintPick();
      if (keyChanged) { shown = 30; loadHist(); } else { shown = 30; drawDetail(); }
      if (scroll) detail.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    }
    const list = () => (hist && hist.key === key && hist.windows && hist.windows[kind]) || [];
    const kpi = (label, value, note) => h('div', { class: 'qw-kpi' }, h('span', { class: 'faint xs', text: label }), h('b', { text: value }), note ? h('span', { class: 'faint xs', text: note }) : null);
    function drawDetail() {
      const ws = list(), done = ws.filter((w) => (w.state === 'final' || w.state === 'ended') && has(w));
      const fulls = done.filter(w => w.full?.src === 'actual' && w.full.complete).map(qwFull).filter((x) => x !== null).sort((a, b) => a - b);
      const med = fulls.length ? (fulls.length % 2 ? fulls[(fulls.length - 1) / 2] : (fulls[fulls.length / 2 - 1] + fulls[fulls.length / 2]) / 2) : null;
      const maxW = done.reduce((m, w) => (!m || w.usd > m.usd ? w : m), null), avg = done.length ? done.reduce((s, w) => s + w.usd, 0) / done.length : null;
      const now = ws.find((w) => w.state === 'live'), nf = now?.full;
      clear(kpis, kpi('已结束的窗口', `${done.length} 个`, ws.length > done.length ? `另有 ${ws.length - done.length} 个进行中` : ''),
        kpi('平均每个窗口', avg !== null ? usd(avg) : '—'),
        kpi('最多的一个', maxW ? usd(maxW.usd) : '—', maxW ? fmtShort(maxW.start) + ' 开始' : ''),
        kpi('已跑满窗口', `${done.filter(reached).length} 次`),
        kpi(reached(now) ? '当前窗口实跑' : '当前窗口用满预测', resultText(now), nf ? (FULL_SRC[nf.src] || '') + (has(now) && !reached(now) ? ` · 还能跑 ≈${usdS(Math.max(0, nf.est - now.usd))}` : '') : '用量不到 5% 且没有以往窗口'),
        kpi('以往跑满实绩中位数', med !== null ? usd(med) : '—', fulls.length ? `${fulls.length} 个结束的窗口的中位数` : '有窗口结束后才有'));
      drawChart(); drawTable();
    }
    const tipRow = (k, v) => `<div class="ct-row"><span>${escHtml(k)}</span><b>${escHtml(v)}</b></div>`;
    const tipHtml = (w) => `<div class="ct-title">${escHtml(span(w))}</div>` + tipRow('已跑额度', has(w) ? usd4(w.usd) : '统计中') +
      tipRow('请求', compact(w.requests)) + tipRow('Token', compact(w.tokens)) + tipRow('用量 %', typeof w.last_pct === 'number' ? pct(w.last_pct) : '—') +
      (qwFull(w) != null ? tipRow(reached(w) ? '本窗实跑' : '用满预测 ≈', usd(qwFull(w))) : '') + (typeof w.cache_share === 'number' ? tipRow('缓存占比', pct(Math.round(w.cache_share * 1000) / 10)) : '') + (w.rejected_at ? tipRow('打满', '被拒') : '') + `<div class="ct-more">${escHtml(stateText(w))}</div>`;
    async function drawChart() {
      const ws = list().slice().reverse();
      if (!ws.length) {
        if (chart) { chart.dispose(); S.charts = S.charts.filter((x) => x !== chart); chart = null; }
        clear(chartEl, emptyState(key ? `这个号还没有 ${kind} 窗口的记录` : '先选一个账号', 'clock'));
        return;
      }
      try { await loadECharts(); } catch (e) { clear(chartEl, emptyState(errText(e), 'warning')); return; }
      if (!chartEl.isConnected) return;
      if (!chart || chart.isDisposed()) { clear(chartEl); chart = mkChart(chartEl); }
      const E = window.echarts, t = chartTheme(), b = baseOpt(t), n = ws.length, zoom = n > 30;
      chart.setOption(Object.assign(b, {
        grid: { left: 8, right: 8, top: 40, bottom: zoom ? 42 : 6, containLabel: true },
        legend: Object.assign(b.legend, { data: ['已跑额度', '用量 %'] }),
        tooltip: Object.assign(b.tooltip, { formatter: (ps) => tipHtml(ws[(Array.isArray(ps) ? ps[0] : ps).dataIndex]) }),
        xAxis: axisX(t, ws.map((w) => fmtShort(w.start)), { axisLabel: { color: t.muted, fontSize: 11, hideOverlap: true } }),
        yAxis: [axisY(t, shortUsd), axisY(t, (v) => v + '%', { min: 0, max: 100, splitLine: { show: false } })],
        dataZoom: zoom ? [{ type: 'inside', startValue: n - 30, endValue: n - 1 }, { type: 'slider', height: 18, bottom: 8, startValue: n - 30, endValue: n - 1, borderColor: t.border, textStyle: { color: t.muted } }] : [],
        series: [
          { name: '已跑额度', type: 'bar', barMaxWidth: 34, data: ws.map((w) => ({ value: has(w) ? w.usd : null,
            itemStyle: { borderRadius: [5, 5, 0, 0], color: w.rejected_at ? grad(E, '#f87171', '#dc2626') : w.state === 'final' ? grad(E, '#60a5fa', '#6366f1') : grad(E, 'rgba(96,165,250,.5)', 'rgba(99,102,241,.4)') } })) },
          { name: '用量 %', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 6, connectNulls: true, data: ws.map((w) => (typeof w.last_pct === 'number' ? w.last_pct : null)),
            lineStyle: { width: 2, color: '#f59e0b' }, itemStyle: { color: '#f59e0b' } },
        ],
      }), true);
    }
    function drawTable() {
      const ws = list();
      if (!ws.length) { clear(tbody, h('tr', {}, h('td', { colspan: '9' }, emptyState(key ? '还没有记录' : '先选一个账号', 'clock')))); moreBtn.hidden = true; return; }
      clear(tbody, ws.slice(0, shown).map((w) => {
        return h('tr', { class: w.state === 'final' ? '' : 'qw-live' },
          h('td', { 'data-label': '窗口' }, h('div', { class: 'mono small', text: span(w) }),
            w.end_src === 'early' ? h('div', { class: 'faint xs', text: 'Polo 提前重置' }) : w.end_src === 'cooldown' ? h('div', { class: 'faint xs', text: '结束时间按冷却原因' }) : null),
          h('td', { 'data-label': '已跑额度' }, h('b', { class: 'qw-usd' + (w.missing ? ' partial' : ''), title: w.missing ? `有 ${w.missing} 段 10 分钟没查到，数字偏小；窗口结束后会精确统计` : '', text: has(w) ? usd(w.usd) : '统计中' })),
          h('td', { 'data-label': '请求', class: 'num', text: compact(w.requests) }),
          h('td', { 'data-label': 'Token', class: 'num', text: compact(w.tokens) }),
          h('td', { 'data-label': '其中 Opus / Fable', class: 'num faint', text: has(w) ? `${usd(w.opus)} / ${usd(w.fable)}` : '—' }),
          h('td', { 'data-label': '用量 %' }, h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap' } },
            typeof w.last_pct === 'number' ? h('span', { class: w.last_pct >= 90 ? 'text-bad' : w.last_pct >= 75 ? 'text-warn' : '', text: pct(w.last_pct) + (w.peak_pct && w.peak_pct !== w.last_pct ? `（最高 ${pct(w.peak_pct)}）` : '') }) : h('span', { class: 'faint', text: '—' }),
            w.capacity_change ? h('span',{class:'chip',title:'原窗口的金额继续累计，升级前的满额不代表当前状态。',text:'升级前曾满'}) : null,
            w.rejected_at ? h('span', { class: 'chip chip-warn', title: '当前席位在本窗用满', text: w.capacity_change?'升级后打满':'打满' }) : null)),
          h('td', { 'data-label': '实跑 / 预测', class: 'num' + (w.full && (w.full.src === 'hist' || w.full.src === 'pool') ? ' faint' : ''), title: fullTitle(w, kind), text: reached(w) ? '实跑 ' + resultText(w) : resultText(w) }),
          h('td', { 'data-label': '缓存占比', class: 'num', title: typeof w.cache_share === 'number' ? `全部 ${compact(w.all_tokens)} token（含缓存），其中输入 + 输出 ${compact(w.io_at_all)}；算到 ${fmtTime(w.all_at, false)}` : '这个窗口开始时还没有记录卡片 token，算不了', text: typeof w.cache_share === 'number' ? pct(Math.round(w.cache_share * 1000) / 10) : '—' }),
          h('td', { 'data-label': '状态' }, h('span', { class: 'badge ' + (w.state === 'final' ? 'b-ok' : w.state === 'live' ? 'b-blue' : 'b-gray'), title: w.state === 'live' && w.usd_at ? `算到 ${fmtTime(w.usd_at, false)}` : '', text: stateText(w) })));
      }));
      moreBtn.hidden = ws.length <= shown;
    }
    async function loadHist() {
      if (!key) { hist = null; drawDetail(); return; }
      const my = ++seq;
      try {
        const r = await api('GET', '/me/windows/history/' + encodeURIComponent(key));
        if (my !== seq || !detail.isConnected) return;
        hist = r;
      } catch (e) {
        if (my !== seq) return;
        hist = null; clear(kpis, emptyState(errText(e), 'warning'));
      }
      drawDetail();
    }
    async function load(again) {
      try {
        const [acc, o, ch] = await Promise.all([again ? null : api('GET', '/v1/accounts').catch(() => null), api('GET', '/me/windows/overview'), api('GET', '/me/windows/cache').catch(() => null)]);
        if (!detail.isConnected) return;
        if (acc) {
          const rows = (acc.data && acc.data.rows) || [];
          order = rows.map(qwKey).filter(Boolean);
          names = Object.fromEntries(rows.map((r) => [qwKey(r), { name: r.display_name || r.email, email: r.email }]));
        }
        ov = o;
        if (ch) cdata = ch;
        clear(err);
        since.textContent = `从 ${fmtTime(ov.since)} 开始记录（之前的窗口没有数据）` + (ov.last_slice_end ? `；精确切片到 ${fmtTime(ov.last_slice_end, false)}，之后按每 15 秒的读数补上` : '') + (ov.error ? '；最近一次查询没成功，会自动重试' : '');
        const ks = keysOf();
        if (!ks.includes(key)) key = ks[0] || '';
        drawOv(); paintPick(); drawCache();
        await loadHist();
      } catch (e) {
        clear(err, h('div', { class: 'notice n-warn' }, icon('warning'), h('span', { text: errText(e) })));
        if (!ov) { clear(ovBody, h('tr', {}, h('td', { colspan: '5' }, emptyState(errText(e), 'warning')))); }
      }
    }
    clear(ovBody, h('tr', {}, h('td', { colspan: '5' }, h('div', { class: 'skeleton sk-line', style: { width: '60%', margin: '18px auto' } }))));
    S.onTheme = () => { drawChart(); drawCacheChart(); };
    S.timers.push(setInterval(() => { if (!document.hidden) load(true); }, 60000));
    drawCache();
    load(false);
  }

  // ============================================================
  // 结算（公共）
  // ============================================================
  const moneyFmt = (n, sym) => (n === null || n === undefined || isNaN(n) ? '—' : (n < 0 ? '-' : '') + sym + Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const usd = (n) => moneyFmt(n, '$');
  const cny = (n) => moneyFmt(n, '¥');
  // 精确到 4 位小数的美元（至少 2 位，去掉多余的 0，带千分位）：5087.11 → $5,087.11，5087.1966 → $5,087.1966
  const usd4 = (n) => (n === null || n === undefined || isNaN(n) ? '—' : (n < 0 ? '-' : '') + '$' + Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }));
  const r2 = (x) => Math.sign(x) * Math.round((Math.abs(x) + Number.EPSILON) * 100) / 100;
  const usdtFmt = (n) => (n === null || n === undefined || isNaN(n) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USDT');
  Object.assign(ERR, {
    query_failed: 'Polo 查询失败（可能登录已失效，系统会自动重新登录），请稍后再试',
    query_timeout: 'Polo 查询超时，请稍后再试',
    preview_expired: '结算预览已过期，请重新点“结算”',
    stale_preview: '这期间这位成员已经结算过或归属变了，请重新点“结算”',
    preview_changed: '结算规则、成本或调整项有变动，请重新点“结算”',
    not_latest: '只能撤销这位成员最近一张结算单',
    already_paid: '这张结算单已标记付款，先取消“已付款”再撤销',
    span_changed: '这个号的归属在结算之后变过，不能直接撤销',
    team_cost_pending:'Team 成本未定，请先在「归属与设置」补充母号日期、席位或手动成本，再重新预览。',
    bad_mother_day:'母号日期不能晚于该账号首次上号或成本起算日期。',
    bad_team_prices:'高级席位价格低于标准席位，请先核对设置。',
    team_start_locked:'已有 Team 成本计划，不能改写席位起算日；可单独设置母号日期。',
    day_closing: '正在等待昨天最后两分钟的用量入账，请在北京时间 00:02 后重试。',
    nothing_to_settle: '这位成员上次结算之后还没有可以结算的部分',
    bad_start: '起算时间不对：不能早于上一段归属或已结算到的时间，也不能是将来',
    no_added_at: '没查到这个号加入 Polo 的时间，请选“从现在开始”或自定义时间',
    rate_required: '选了 USDT 付款要填汇率',
    rate_unavailable: '汇率暂时取不到，请手动填写',
    range_too_long: '日期范围太长（最多 400 天）',
    not_reached: '额度还没达到这个数',
    below_settled: '累计额度不能小于已经记账的累计额度',
    already_reached: '这个额度在上一个结算点就已经达到了（上次结转的部分就够了）',
    empty_period: '这段时间没有需要结算的额度',
    bad_time: '时间不对：要在上一个结算点之后、现在前 1 小时之前（「用量统计」里长请求会晚到，1 小时前的数才完整）',
    up_start_locked: '已经有结算点了，起点不能再改',
    too_many_jobs: '后台任务太多，请稍后再试',
    job_not_found: '任务已过期，请重试',
    bad_request: '输入不正确',
  });
  // 用户显示名：管理员给的备注昵称优先
  const USERS = new Map();
  function rememberUsers(list) { for (const u of list || []) USERS.set(u.id, Object.assign(USERS.get(u.id) || {}, u)); }
  const nameOf = (u) => (u ? u.nickname || u.username : '—');
  const uname = (id, fb) => (USERS.has(id) ? nameOf(USERS.get(id)) : fb || '已删除用户');
  function userName2(id, fb) {
    const u = USERS.get(id);
    if (!u) return h('b', { text: fb || '已删除用户' });
    return h('span', { class: 'uname2' }, h('b', { text: nameOf(u) }), u.nickname ? h('small', { text: u.username }) : null);
  }
  const unameByLogin = (login) => { for (const u of USERS.values()) if (u.username === login) return nameOf(u); return login; };
  // 北京时间
  const bjToday = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const addDays = (day, n) => new Date(Date.parse(day + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  const toBjInput = (ts) => new Date((ts + 8 * 3600) * 1000).toISOString().slice(0, 19);
  const fromBjInput = (s) => { if (!s) return null; const t = Date.parse((s.length === 16 ? s + ':00' : s) + '+08:00'); return isNaN(t) ? null : Math.floor(t / 1000); };
  const dayOfTs = (ts) => new Date((ts + 8 * 3600) * 1000).toISOString().slice(0, 10);

  const acctMap = (list) => Object.fromEntries((list || []).map((a) => [a.key, a]));
  function acctLabel(key, info, name) {
    const a = info[key];
    const nm = (a && a.name) || name || (key.startsWith('id:') ? '未识别账号' : key);
    const em = a && a.email;
    return h('div', {}, h('b', { text: nm }), em ? h('div', { class: 'email mono', text: em }) : null,
      a && a.status === 'archived' ? h('span', { class: 'chip', style: { marginTop: '3px' }, text: '已归档' }) : null,
      a && a.status === 'unknown' ? h('span', { class: 'chip chip-warn', style: { marginTop: '3px' }, text: '待确认邮箱' }) : null);
  }
  function rangeText(s, e) { return `${fmtSec(s)} → ${fmtSec(e)}`; }
  function fmtSec(v) { if (v === null || v === undefined) return '—'; const d = toDate(v); return isNaN(d) ? '—' : d.toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai', hour12: false }); }
  async function pollJob(jid, onTick) {
    const t0 = Date.now();
    S.jobs = (S.jobs || 0) + 1;  // 任务在跑：自动刷新 / 换新版先等一等
    try {
      for (;;) {
        const j = await api('GET', '/admin/settle/job/' + jid);
        if (j.status === 'done') return j.result;
        if (j.status === 'error') throw new ApiError(502, j.error || 'query_failed', j.error_info || {});
        if (onTick) onTick(j.status, Math.round((Date.now() - t0) / 1000));
        if (Date.now() - t0 > 330000) throw new ApiError(504, 'query_timeout');
        await new Promise((r) => setTimeout(r, 1200));
      }
    } finally { S.jobs = Math.max(0, S.jobs - 1); }
  }
  function barChart(points, { fmt = usd, sub } = {}) {
    const max = Math.max(0.0001, ...points.map((p) => p.value || 0));
    return h('div', { class: 'bars' }, points.map((p) => {
      const bar = h('i', { class: p.live ? 'live' : '' }); bar.style.height = Math.max(2, ((p.value || 0) / max) * 100) + '%';
      return h('div', { class: 'bar', title: `${p.label}\n${fmt(p.value)}${sub ? '\n' + sub(p) : ''}` },
        h('span', { class: 'bar-v', text: p.value ? fmt(p.value).replace(/\.\d+$/, '') : '' }), h('div', { class: 'bar-t' }, bar), h('span', { class: 'bar-l', text: p.label.slice(5) }));
    }));
  }
  function downloadCsv(name, rows) {
    const esc = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const blob = new Blob(['\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const shareTip = (s) => `我抽 ${s}% · 成员 ${r2(100 - s)}%`;
  const dayStatus = (d) => (d.day === bjToday() ? ['b-info', '今日实时'] : d.final ? ['b-ok', '已定稿'] : ['b-warn', '待定稿']);

  // ---------- USDT 汇率与付款方式 ----------
  const RATE_LABEL = { okx_c2c_buy: '欧易 C2C 买U价', okx_c2c_sell: '欧易 C2C 卖U价', binance_p2p_buy: '币安 P2P 买U价', coingecko: 'CoinGecko 市场价', forex: '美元外汇汇率', manual: '手动输入' };
  const rateOf = (rates, src) => (rates && rates.sources && rates.sources[src || rates.default]) || null;
  // init: { currency, rate, source, rate_at }：已有结算单的付款方式（改付款时用）
  function payPicker(rates, getCny, init = {}) {
    let cur = init.currency || localStorage.getItem('polo_pay_currency') || 'CNY';
    let rs = rates || { sources: {} };
    const seg = h('div', { class: 'seg' });
    const srcSel = h('select', { class: 'select select-sm', style: { width: 'auto', maxWidth: '100%' } });
    const rateIn = h('input', { class: 'input input-sm mono', type: 'number', step: '0.0001', min: '1', max: '20', style: { width: '110px' } });
    const out = h('div', { class: 'pay-out' });
    const refresh = h('button', { class: 'btn btn-ghost btn-xs', type: 'button' }, icon('refresh', 'icon icon-sm'), '刷新汇率');
    const usdtBox = h('div', { class: 'pay-usdt' }, h('div', { class: 'row wrap', style: { gap: '8px' } }, srcSel, rateIn, h('span', { class: 'faint small', text: '¥ / USDT' }), refresh), out);
    function fillSources(keep) {
      const list = Object.entries(rs.sources || {});
      const want = keep || (init.rate ? 'keep' : rs.default);
      clear(srcSel,
        init.rate ? h('option', { value: 'keep', text: `结算时的汇率 ${init.rate}（${RATE_LABEL[init.source] || '手动'}）`, selected: want === 'keep' }) : null,
        list.map(([k, v]) => h('option', { value: k, text: `${RATE_LABEL[k] || k} ${v.rate}（${ago(v.at) || '刚刚'}）`, selected: k === want })),
        h('option', { value: 'manual', text: '手动输入', selected: want === 'manual' || (!list.length && !init.rate) }));
      syncRate();
    }
    function syncRate() {
      if (srcSel.value === 'keep') rateIn.value = init.rate;
      else { const x = rs.sources && rs.sources[srcSel.value]; if (x) rateIn.value = x.rate; }
      paint();
    }
    function paint() {
      clear(seg, [['CNY', '人民币'], ['USDT', 'USDT']].map(([k, l]) => h('button', { type: 'button', class: cur === k ? 'on' : '', onclick: () => { cur = k; localStorage.setItem('polo_pay_currency', k); paint(); } }, l)));
      usdtBox.hidden = cur !== 'USDT';
      const rate = Number(rateIn.value), c = getCny();
      clear(out, rate >= 1 && rate <= 20 ? [h('span', { class: 'muted small', text: `${cny(c)} ÷ ${rate} = ` }), h('b', { class: 'money-strong', text: usdtFmt(r2(c / rate)) })]
        : h('span', { class: 'text-warn small', text: '请填写汇率（1–20）' }));
    }
    srcSel.addEventListener('change', syncRate);
    rateIn.addEventListener('input', () => {
      const x = srcSel.value === 'keep' ? { rate: init.rate } : rs.sources && rs.sources[srcSel.value];
      if (srcSel.value !== 'manual' && (!x || Number(rateIn.value) !== x.rate)) srcSel.value = 'manual';
      paint();
    });
    refresh.addEventListener('click', async () => {
      refresh.disabled = true;
      try { await api('POST', '/admin/settle/rates-refresh'); await new Promise((r) => setTimeout(r, 4500)); rs = await api('GET', '/admin/settle/rates'); fillSources(srcSel.value === 'keep' ? 'keep' : srcSel.value); toast('汇率已刷新', 'ok'); }
      catch (e) { toast(errText(e), 'bad'); }
      refresh.disabled = false;
    });
    fillSources();
    return {
      el: h('div', { class: 'pay-box' }, h('div', { class: 'row wrap', style: { gap: '10px' } }, h('span', { class: 'label', text: '付款方式' }), seg), usdtBox),
      get() {
        if (cur !== 'USDT') return { pay_currency: 'CNY' };
        const rate = Number(rateIn.value);
        if (!(rate >= 1 && rate <= 20)) return null;
        const src = srcSel.value;
        if (src === 'keep') return { pay_currency: 'USDT', usdt_rate: init.rate, rate_source: init.source || 'manual', rate_at: init.rate_at || null };
        const x = rs.sources && rs.sources[src];
        return { pay_currency: 'USDT', usdt_rate: rate, rate_source: src, rate_at: src !== 'manual' && x ? x.at : Math.floor(Date.now() / 1000) };
      },
    };
  }
  const payText = (s) => (s.pay_currency === 'USDT' && s.usdt_amount !== null && s.usdt_amount !== undefined ? `${usdtFmt(s.usdt_amount)} · 汇率 ${s.usdt_rate}` : '');

  // ============================================================
  // 结算（管理员）
  // ============================================================
  async function pageSettle(params) {
    if (params.get('tab') === 'daily') return go('#/admin/stats');
    const tab = ['pending', 'upstream', 'history', 'settings'].includes(params.get('tab')) ? params.get('tab') : 'pending';
    const { main } = appLayout({ active: '#/admin/settle', title: '结算', desc: '上家给我结算、我给成员结算' });
    const tabs = h('div', { class: 'tabs' }, [['pending', '成员待结算', 'dollar'], ['upstream', '上家结算', 'trend'], ['history', '成员结算记录', 'log'], ['settings', '归属与设置', 'cog']]
      .map(([k, l, ic]) => h('a', { class: 'btn btn-sm ' + (k === tab ? 'btn-primary' : 'btn-secondary'), href: '#/admin/settle?tab=' + k, style: { textDecoration: 'none' } }, icon(ic, 'icon icon-sm'), l)),
      h('a', { class: 'btn btn-sm btn-ghost', href: '#/admin/stats', style: { textDecoration: 'none' } }, icon('chart', 'icon icon-sm'), '统计看板'));
    const body = h('div', {}, h('div', { class: 'stats' }, skeletonStats(4)));
    append(main, tabs, body);
    if (isPhone()) { const on = tabs.querySelector('.btn-primary'); if (on) tabs.scrollLeft = Math.max(0, on.offsetLeft - 14); }
    try {
      if (tab === 'pending') await settlePending(body);
      else if (tab === 'upstream') await settleUpstream(body);
      else if (tab === 'history') await settleHistory(body);
      else await settleSettings(body);
    } catch (e) { clear(body, emptyState(errText(e), 'warning')); }
    // 待结算 / 结算记录：每分钟在后台重新取一遍，内容变了才换上（展开的明细和滚动位置保持）。
    // 开着弹窗、在输入、结算任务在跑时不换；上家结算（有图表）和设置（表单）不自动刷新
    if (tab === 'pending' || tab === 'history') autoRefresh(async () => {
      const fresh = h('div');
      await (tab === 'pending' ? settlePending(fresh) : settleHistory(fresh));
      if (!body.isConnected || userBusy() || fresh.textContent === body.textContent) return;
      const opened = new Set([...body.querySelectorAll('details[open] > summary')].map((s) => s.textContent));
      const y = window.scrollY;
      body.replaceChildren(...fresh.childNodes);
      for (const s of body.querySelectorAll('details > summary')) if (opened.has(s.textContent)) s.parentElement.open = true;
      window.scrollTo(0, y);
    }, 60000);
  }

  // ---------- 回本（公共） ----------
  const KIND = { open: '首期', renew: '续费', upgrade: '升级补差' };
  const SEAT_CN = { premium: '高级', standard: '标准' };
  // 回本按可结算收入算：已结算的回本 + 还没结算（可结算）的回本都算已回，不等结算单确认
  function recoveryBar(total, done) {
    const a = total > 0 ? Math.min(100, Math.max(0, (done / total) * 100)) : 0;
    const i1 = h('i', { class: 'done' });
    i1.style.width = a + '%';
    return h('div', { class: 'rbar', title: `已回本 ${cny(done)} / 成本 ${cny(total)}` }, i1);
  }
  function lineRecovery(L) {
    if (!L || !L.cost_total_cny) return null;
    const got = r2((L.recovered_before_cny || 0) + (L.recover_cny || 0));
    const txt = L.remaining_cny > 0
      ? `回本中：成本 ${cny(L.cost_total_cny)} · 已回 ${cny(got)}${L.recover_cny ? `（含本次 ${cny(L.recover_cny)}）` : ''} · 还差 ${cny(L.remaining_cny)}`
      : `已回本（成本 ${cny(L.cost_total_cny)}${L.recover_cny ? `，本次回 ${cny(L.recover_cny)}` : ''}）`;
    return h('div', { class: 'rec-mini' }, recoveryBar(L.cost_total_cny, got), h('span', { text: txt }));
  }
  function chargesTable(charges, { admin = false, reload } = {}) {
    if (!charges.length) return h('div', { class: 'muted small', text: '还没有成本记录' });
    return h('div', { class: 'charges-wrap' }, h('table', { class: 'mini-table charges' },
      h('thead', {}, h('tr', {}, h('th', { text: '日期' }), h('th', { text: '账号' }), h('th', { text: '类型' }), h('th', { text: '席位' }), h('th', { class: 'num', text: '金额' }), h('th', { text: admin ? '' : '状态' }))),
      h('tbody', {}, charges.map((x) => {
        const amount = x.amount_cny === null ? h('span', { class: 'text-warn', text: '待定（未标席位）' }) : h('span', { class: x.waived ? 'strike' : '', text: cny(x.amount_cny) });
        const state = x.waived ? h('span', { class: 'badge b-gray', title: x.note || '', text: '已免除' + (x.note ? '：' + x.note : '') }) : x.manual ? h('span', { class: 'badge b-info', text: '手动金额' }) : null;
        const ops = admin ? h('div', { class: 'row', style: { gap: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' } }, state,
          h('button', { class: 'btn btn-ghost btn-xs', type: 'button', onclick: () => editCharge(x, reload) }, '改金额'),
          h('button', { class: 'btn btn-ghost btn-xs', type: 'button', onclick: () => waiveCharge(x, reload) }, x.waived ? '恢复' : '免除')) : state;
        return h('tr', { class: x.waived ? 'faint' : '' }, h('td', { class: 'nowrap', text: x.due_day }),
          h('td', {}, h('b', { text: x.name || x.account_key }), x.email ? h('div', { class: 'email mono', text: x.email }) : null,
            admin ? h('div', { class: 'faint xs', text: '记在 ' + uname(x.user_id, x.username) + ' 名下' }) : null),
          h('td', { text: KIND[x.kind] || x.kind }), h('td', { text: SEAT_CN[x.seat] || '—' }), h('td', { class: 'num' }, amount,x.calc_note ? h('small',{class:'faint',style:{display:'block'},text:x.calc_note}) : null), h('td', {}, ops));
      }))));
  }
  function editCharge(x, reload) {
    const inp = h('input', { class: 'input', type: 'number', min: '0', step: '0.01', value: x.amount_cny === null ? '' : x.amount_cny, placeholder: '留空 = 按席位价格' });
    modal({ title: `改金额 · ${x.name || x.account_key} · ${x.due_day} ${KIND[x.kind] || ''}`,
      body: h('div', {}, field('金额（人民币）', inp, '留空则恢复为按席位价格。已经结算过的回本不会追回或补发，只影响之后的回本进度。')),
      actions: [{ label: '取消' }, { label: '保存', kind: 'btn-primary', onClick: async () => {
        try { await api('POST', '/admin/settle/charge/' + x.id, { amount_cny: inp.value === '' ? null : Number(inp.value) }); toast('已保存', 'ok'); reload(); }
        catch (e) { toast(errText(e), 'bad'); return false; }
      } }] });
  }
  function waiveCharge(x, reload) {
    if (x.waived) {
      api('POST', '/admin/settle/charge-waive/' + x.id, { waived: false }).then(() => { toast('已恢复', 'ok'); reload(); }, (e) => toast(errText(e), 'bad'));
      return;
    }
    const note = h('input', { class: 'input', maxlength: '100', placeholder: '例如：这个月没续费 / 号是送的' });
    modal({ title: `免除这笔成本 · ${x.name || x.account_key}`,
      body: h('div', {}, h('p', {}, `${x.due_day} ${KIND[x.kind] || ''} `, h('b', { text: x.amount_cny === null ? '待定' : cny(x.amount_cny) }), '，免除后不再计入回本。'), field('原因', note)),
      actions: [{ label: '取消' }, { label: '免除', kind: 'btn-danger', onClick: async () => {
        try { await api('POST', '/admin/settle/charge-waive/' + x.id, { waived: true, note: note.value }); toast('已免除', 'ok'); reload(); }
        catch (e) { toast(errText(e), 'bad'); return false; }
      } }] });
  }
  function recoveryCard(costs, reload) {
    const ms = costs.members.filter((m) => m.cost_total_cny > 0 || m.pending_seat);
    if (!ms.length) return null;
    const tbody = h('tbody');
    // 每个号的回本：成员的回本合在一起算，每张单（含还没结算的这一期）里的回本按各号的额度占比分到各号（服务器算好）
    const acctTiles = (m) => {
      const list = (m.accounts || []).filter((a) => a.cost > 0 || a.wait || a.done + a.pend > 0.004);
      if (!list.length) return null;
      return h('div', { class: 'rec-accts' }, list.map((a) => {
        const got = r2(a.done + a.pend), pct = a.cost > 0 ? Math.floor((got / a.cost) * 100 + 1e-9) : null;
        const seat = a.seat === 'premium' ? '高级' : a.seat === 'standard' ? '标准' : null;
        return h('div', { class: 'rec-acct', title: `${a.name || a.key}\n已回本 ${cny(got)}${a.cost ? ` / 成本 ${cny(a.cost)}` : ''}${a.pend > 0.004 ? `（其中还没结算 ${cny(a.pend)}）` : ''}\n贡献额度 ${usd(a.usd)} · 成员收入 ${cny(r2(a.inc_done + a.inc_pend))}` },
          h('div', { class: 'ra-head' }, h('b', { class: 'ra-name', text: a.name || keyText(a.key) }),
            seat ? h('span', { class: 'seat ' + (a.seat === 'premium' ? 'seat-premium' : 'seat-standard'), text: seat }) : null,
            a.status === 'archived' ? h('span', { class: 'chip', text: '已归档' }) : null,
            h('span', { class: 'ra-pct ' + (pct === null ? 'faint' : pct >= 100 ? 'text-ok' : ''), text: pct === null ? '无成本' : pct + '%' })),
          a.cost > 0 ? recoveryBar(a.cost, got) : null,
          h('div', { class: 'ra-sub' }, a.cost > 0
            ? `${cny(got)} / ${cny(a.cost)}${a.wait ? ' + 待定' : ''}${got < a.cost ? ` · 还差 ${cny(r2(a.cost - got))}` : ' · 已回本'}`
            : a.wait ? '成本待定（未标席位）' : `帮其他号回本 ${cny(got)}`));
      }));
    };
    for (const m of ms) {
      const got = r2(m.recovered_cny + (m.pending_recover_cny || 0));
      const exp = h('tr', { class: 'exp-row', hidden: true }, h('td', { colspan: '6' }, chargesTable(costs.charges.filter((x) => x.user_id === m.user_id), { admin: true, reload })));
      const tiles = acctTiles(m);
      const tr = h('tr', { class: 'click' + (tiles ? ' has-accts' : ''), onclick: () => { exp.hidden = !exp.hidden; tr.classList.toggle('open', !exp.hidden); } },
        h('td', { 'data-label': '' }, userName2(m.user_id, m.username), m.pending_seat ? h('div', { class: 'text-warn xs', text: `${m.pending_seat} 笔成本待定（未标席位）` }) : h('div', { class: 'faint xs', text: '点击看成本记录' })),
        h('td', { 'data-label': '进度', style: { minWidth: '150px' } }, recoveryBar(m.cost_total_cny, got)),
        h('td', { 'data-label': '成本合计', class: 'num' }, cny(m.cost_total_cny)),
        h('td', { 'data-label': '已回本', class: 'num', title: m.pending_recover_cny ? `已结算 ${cny(m.recovered_cny)} + 还没结算 ${cny(m.pending_recover_cny)}` : null }, cny(got)),
        h('td', { 'data-label': '还差', class: 'num ' + (m.remaining_cny > 0 ? 'text-warn' : 'text-ok') }, m.remaining_cny > 0 ? cny(m.remaining_cny) : '已回本'),
        h('td', { class: 'faint' }, icon('down', 'icon icon-sm chev')));
      append(tbody, tr, tiles ? h('tr', { class: 'rec-acc-row' }, h('td', { colspan: '6' }, tiles)) : null, exp);
    }
    return h('div', { class: 'card', style: { marginTop: '16px' } },
      h('div', { class: 'card-head' }, h('h3', { class: 'card-title' }, icon('trend'), '回本进度'), h('span', { class: 'faint xs', text: '回本前收入全归成员、不分成。已回本按可结算收入算（已结算 + 还没结算的）；各号按每张单的额度占比分摊' })),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table responsive' }, h('thead', {}, h('tr', {}, ['成员', '进度', '成本合计', '已回本', '还差', ''].map((t) => h('th', { text: t })))), tbody)));
  }
  // 账号 + 各自的结算区间。额度来源：counter = 卡片“今日”读数相减（请求跑完的时刻记，和网页一致）；slices = 「用量统计」查询（读数覆盖不到的时段）
  const ITEM_SRC = { counter: '按卡片读数（请求跑完的时刻记，和网页上的“今日”一致；跨过结算点的长请求不漏不重）', slices: '按「用量统计」（这段时间没有卡片读数；按请求开始的时刻记，截止时还在跑的请求不在里面）' };
  function windowsTable(items, info) {
    if (!items.length) return h('div', { class: 'muted small', text: '没有账号额度（只有调整项）' });
    return h('div', { class: 'charges-wrap' }, h('table', { class: 'mini-table win-table' },
      h('thead', {}, h('tr', {}, [['账号'], ['结算区间（北京时间）', 'c-range'], ['额度'], ['请求'], ['Token', 'c-tok']].map(([t, k]) => h('th', { class: k || null, text: t })))),
      h('tbody', {}, items.map((i) => {
        const s = i.start !== undefined ? i.start : i.start_at, e = i.end !== undefined ? i.end : i.end_at;
        const range = s ? [h('div', { text: fmtSec(s) }), h('div', { class: 'faint', text: '→ ' + fmtSec(e) })] : '—';
        return h('tr', {}, h('td', {}, acctLabel(i.account_key || i.key, info, i.name), s ? h('div', { class: 'm-only faint xs', text: `${fmtSec(s).slice(5)} → ${fmtSec(e).slice(5)}` }) : null),
          h('td', { class: 'small nowrap c-range' }, range),
          h('td', { class: 'num', title: usd4(i.usd) + (ITEM_SRC[i.src] ? '\n' + ITEM_SRC[i.src] : '') }, usd(i.usd), i.src === 'slices' ? h('div', { class: 'faint xs', text: '用量统计' }) : null), h('td', { class: 'num' }, compact(i.requests)), h('td', { class: 'num c-tok' }, compact(i.tokens)));
      }))));
  }

  // ---------- 待结算：每位成员一张卡片 ----------
  async function settlePending(body) {
    const [st, list] = await Promise.all([api('GET', '/admin/settle/state'), api('GET', '/admin/settle/list')]);
    rememberUsers(st.users);
    const info = acctMap(st.accounts);
    const reload = () => settlePending(body);
    const sts = list.settlements.filter((s) => s.status === 'active');
    const unpaidBy = {};
    for (const s of sts) for (const L of s.lines) if (!L.paid_at) unpaidBy[L.user_id] = r2((unpaidBy[L.user_id] || 0) + L.member_cny);
    const notes = [];
    if (st.query.last_error) notes.push(['n-warn', 'warning', `最近一次 Polo 查询失败（${st.query.last_error}，${ago(st.query.last_error_at) || ''}），预估可能不是最新的。`]);
    if (!st.spans.length) notes.push(['n-info', 'info', '还没有设置账号归属：现在所有账号都算你自己的。请到“归属与设置”里把成员的号归给他们。']);
    const um = (st.pending && st.pending.unmatched) || [];
    const unknown = st.accounts.filter((a) => a.status === 'unknown');
    if (um.length) notes.push(['n-warn', 'warning', `有 ${um.length} 个 Polo 账号没能对应到邮箱（${um.map((x) => `${x.name} ${usd(x.usd)}`).join('、')}），它们的额度不会算给任何成员。请到“归属与设置”里指定邮箱。`]);
    else if (unknown.length) notes.push(['n-warn', 'warning', `有 ${unknown.length} 个账号没能自动对应到邮箱：${unknown.map((a) => a.name).join('、')}。请到“归属与设置”里手动指定。`]);
    const seatWait = st.costs.members.filter((m) => m.pending_seat);
    if (seatWait.length) notes.push(['n-warn', 'warning', `${seatWait.map((m) => `${uname(m.user_id, m.username)}（${m.pending_seat} 笔）`).join('、')} 的成本因为账号没标席位还没定金额，暂按 ¥0 算。请到“用量看板”给这些号标上高级 / 标准。`]);
    const ms = st.members.filter((m) => m.open_accounts.length || m.closed_unsettled || m.line.adjust_usd || m.line.usd > 0 || unpaidBy[m.user_id]);
    const valid = ms.filter((m) => m.valid);
    const tot = (f) => r2(valid.reduce((a, m) => a + m.line[f], 0));
    const rate = rateOf(st.rates);
    const unpaidAll = r2(Object.values(unpaidBy).reduce((a, x) => a + x, 0));
    const todaySts = sts.filter((s) => dayOfTs(s.created_at) === bjToday());
    const stats = h('div', { class: 'stats' },
      statCard('待结算合计（预估）', cny(tot('member_cny')), 'users', 'purple', `${ms.length} 位成员${tot('recover_cny') ? ` · 其中回本 ${cny(tot('recover_cny'))}` : ''}${rate && tot('member_cny') ? ` · ≈ ${usdtFmt(r2(tot('member_cny') / rate.rate))}` : ''}`),
      statCard('我的收入（预估）', cny(tot('admin_cny')), 'trend', 'ok', `成员号额度 ${usd(valid.reduce((a, m) => a + m.line.usd, 0))}`),
      statCard('未付款', cny(unpaidAll), 'clock', unpaidAll > 0 ? 'warn' : 'ok', `今天已结算 ${todaySts.length} 次 · ${cny(r2(todaySts.reduce((a, s) => a + s.member_cny, 0)))}`),
      statCard('USDT 汇率', rate ? `¥${rate.rate}` : '—', 'globe', 'cyan', rate ? `${RATE_LABEL[st.rates.default] || ''} · ${ago(rate.at) || '刚刚'}` : '暂时取不到，结算时可手动填'));
    const refreshBtn = h('button', { class: 'btn btn-secondary btn-sm', type: 'button' }, icon('refresh', 'icon icon-sm'), '刷新预估');
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true; clear(refreshBtn, icon('refresh', 'icon icon-sm spin'), '正在向 Polo 查询…');
      try { const { job_id } = await api('POST', '/admin/settle/refresh'); await pollJob(job_id); toast('已刷新', 'ok'); await reload(); }
      catch (e) { toast(errText(e), 'bad'); refreshBtn.disabled = false; clear(refreshBtn, icon('refresh', 'icon icon-sm'), '刷新预估'); }
    });
    const head = h('div', { class: 'card', style: { marginBottom: '16px' } }, h('div', { class: 'card-body period' },
      h('div', {}, howTo('怎么结算',
        h('div', { class: 'hint', text: `点某位成员的“结算”，系统会算出他名下每个号从上次结算点到该成员约定截止时间的额度（实时，或北京时间昨天 23:59:59）：用 Polo 卡片上“今日”的读数相减（每 15 秒记一次，按请求跑完的时刻记，和网页上的数一致），没有读数的时段再向 Polo「用量统计」查。算出应付多少人民币（可换成 USDT）；确认后自动写入结算点，下次从下一秒接着算。一天可以结算多次，不会重复、不会漏（结算时还在跑的长请求，跑完后算在下一次）。` })),
        h('div', { class: 'faint xs', style: { marginTop: '4px' }, text: st.pending ? `卡片上的金额是预估（${ago(st.pending.at)}查询，每 15 分钟自动更新）${st.refreshing ? '，正在更新…' : ''}` : '预估生成中…' })),
      h('div', { class: 'toolbar' }, refreshBtn)));
    const grid = ms.length ? h('div', { class: 'mgrid' }, ms.map((m, i) => { const c = memberCard(m, st, info, unpaidBy[m.user_id], rate, reload); c.style.animationDelay = i * 40 + 'ms'; return c; }))
      : h('div', { class: 'card' }, h('div', { class: 'card-body' }, emptyState('还没有成员名下有账号。到“归属与设置”里设置账号归属后，这里会出现每位成员的结算卡片。', 'users')));
    clear(body, notes.map(([k, i, t]) => h('div', { class: 'notice ' + k }, icon(i), h('span', { text: t }))), stats, head, grid, recoveryCard(st.costs, reload), adjustmentsCard(st, reload));
  }

  function memberCard(m, st, info, unpaid, rate, reload) {
    const L = m.line;
    const btn = h('button', { class: 'btn btn-primary btn-sm', type: 'button' }, icon('check', 'icon icon-sm'), '结算');
    btn.addEventListener('click', () => settlePreview(m, st, reload));
    const last = m.last ? `上次结算 ${ago(m.last.created_at)}（截至 ${fmtSec(m.last.end_at).slice(5)}）` : '还没结算过';
    const amt = (label, v, cls) => h('div', { class: 'mc-amt' }, h('small', { text: label }), h('b', { class: cls || '', text: v }));
    // 未结算（到现在）/ 昨日收益：实时结算的成员应付就是未结算；隔日结算的应付是截至昨天的，另列未结算到现在
    const ex = m.valid ? m.extra : null;
    const xItem = (label, v, sub, tip) => h('div', { class: 'mc-x', title: tip || null }, h('small', { text: label }), h('b', { text: v }), sub ? h('span', { text: sub }) : null);
    const yState = (y) => Math.abs(y.usd) < 0.00005 ? '昨天没有额度' : Math.abs(y.pending_cny) < 0.005 ? '已全部结算' : Math.abs(y.settled_cny) < 0.005 ? '还没结算' : `已结 ${cny(y.settled_cny)} · 待结 ${cny(y.pending_cny)}`;
    const extra = ex ? h('div', { class: 'mc-extra' },
      m.prior_day ? xItem('未结算（到现在）', cny(ex.now.member_cny), `额度 ${usd(ex.now.usd)} · 截至 ${fmtSec(ex.now.cutoff).slice(11, 16)}`, `到现在前 2 分钟还没结算的全部（含今天）；我的抽成 ${cny(ex.now.admin_cny)}`) : null,
      xItem(`昨日 ${ex.yday.day.slice(5)}`, cny(ex.yday.member_cny), `额度 ${usd(ex.yday.usd)} · ${yState(ex.yday)}`,
        `北京时间 ${ex.yday.day} 一整天给成员的钱（不含调整项）；我的抽成 ${cny(ex.yday.admin_cny)}${ex.yday.approx ? '\n部分按「用量统计」估算' : ''}`)) : null;
    const parts = m.valid ? [
      h('div', { class: 'mc-range', text: m.start ? `待结算 ${fmtSec(m.start)} → ${fmtSec(m.cutoff)}` : '暂时没有待结算的时间段' }),
      h('div', { class: 'mc-amts' }, amt('额度', usd(r2(L.usd + L.adjust_usd))), amt('毛收入', cny(L.gross_cny)),
        amt('回本·不分成', L.recover_cny ? cny(L.recover_cny) : '—', L.recover_cny ? 'text-warn' : 'faint'), amt(L.income_label || '我的抽成', cny(L.admin_cny))),
      h('div', { class: 'mc-pay' }, h('div', {}, h('small', { text: m.prior_day ? '今天结算 · 应付（截至昨天）' : '未结算收益 · 应付（预估）' }), h('div', { class: 'mc-big', text: cny(L.member_cny) })),
        rate && L.member_cny ? h('div', { class: 'mc-usdt', text: `≈ ${usdtFmt(r2(L.member_cny / rate.rate))}` }) : null),
      extra,
      lineRecovery(L),
    ] : [h('div', { class: 'loading-box small' }, icon('refresh', 'icon icon-sm spin'), h('span', { text: '预估更新中；点“结算”会直接精确查询' }))];
    const up = (st.up_points || [])[0];
    const chips = [m.prior_day ? h('span',{class:'chip chip-blue',text:'结到昨天'}) : null, unpaid ? h('span', { class: 'chip chip-warn', text: `还有 ${cny(unpaid)} 没付` }) : null,
      up && m.start !== null && up.end_at >= m.start ? h('span', { class: 'chip chip-blue', title: '点“结算”时可以选只结算到这个上家结算点', text: `上家已结到 ${fmtSec(up.end_at).slice(5, 16)}` }) : null,
      L.status !== 'active' ? h('span', { class: 'chip', text: '已停用' }) : null,
      L.adjust_usd ? h('span', { class: 'chip', text: `调整 ${usd(L.adjust_usd)}` }) : null,
      m.closed_unsettled ? h('span', { class: 'chip', text: `${m.closed_unsettled} 个转走的号还有没结的部分` }) : null].filter(Boolean);
    let details = null;
    if (m.valid && m.items.length) {
      const box = h('div', { class: 'mc-items', hidden: true }, windowsTable(m.items, info));
      const lbl = h('span', { text: `${m.items.length} 个号的明细` });
      const t = h('button', { class: 'btn btn-ghost btn-xs', type: 'button', onclick: () => { box.hidden = !box.hidden; lbl.textContent = box.hidden ? `${m.items.length} 个号的明细` : '收起'; } }, icon('down', 'icon icon-sm'), lbl);
      details = h('div', {}, t, box);
    }
    return h('div', { class: 'card mcard' },
      h('div', { class: 'mc-head' }, h('span', { class: 'avatar', text: uname(m.user_id).slice(0, 1) }),
        h('div', { class: 'grow', style: { minWidth: 0 } }, userName2(m.user_id, L.username), h('div', { class: 'faint xs', text: `${m.open_accounts.length} 个号 · ${L.caption || shareTip(L.admin_share)} · ${last}` })), btn),
      parts, chips.length ? h('div', { class: 'chips' }, chips) : null, details);
  }

  function settlePreview(m, st, done) {
    const who = uname(m.user_id, m.line.username);
    const box = h('div');
    let jobId = null, res = null, pay = null, seq = 0, until = null;
    const note = h('input', { class: 'input', maxlength: '200', placeholder: '结算备注（可选，只有管理员能看到）' });
    const markPaid = h('input', { type: 'checkbox' });
    const paidNote = h('input', { class: 'input input-sm', maxlength: '200', placeholder: '付款备注：例如 微信 / 支付宝 / 交易哈希（可选）', hidden: true });
    markPaid.addEventListener('change', () => { paidNote.hidden = !markPaid.checked; });
    // 结算到：现在，或某个上家结算点（上家结完账再给成员结到同一秒）
    const ups = (st.up_points || []).filter((p) => m.start !== null && p.end_at >= m.start && (!m.prior_day || p.end_at <= m.cutoff)).slice(0, 4);
    const untilSeg = h('div', { class: 'seg seg-wrap' });
    const paintUntil = () => clear(untilSeg, [[null, m.prior_day ? '昨天 23:59:59（北京）' : '现在（前 2 分钟）'], ...ups.map((p) => [p.end_at, `上家结算点 #${p.id}（${fmtSec(p.end_at).slice(5)}）`])]
      .map(([v, l]) => h('button', { type: 'button', class: until === v ? 'on' : '', onclick: () => { if (until !== v) { until = v; paintUntil(); run(); } } }, l)));
    paintUntil();
    const head = ups.length || m.prior_day ? h('div', { class: 'row wrap until-row' }, h('span', { class: 'label', text: '结算到' }), untilSeg) : null;
    modal({ title: `结算 · ${who}`, body: h('div', {}, head, box), wide: true, actions: [{ label: '取消' }, { label: '确认结算', kind: 'btn-primary', onClick: async () => {
      if (!res) return false;
      const p = pay.get();
      if (!p) { toast('请填写 USDT 汇率', 'bad'); return false; }
      try {
        const r = await api('POST', '/admin/settle/commit', Object.assign({ job_id: jobId, expect_member_cny: res.line.member_cny, note: note.value }, p));
        if (markPaid.checked) {
          try { await api('POST', '/admin/settle/paid/' + r.line_id, Object.assign({ paid: true, note: paidNote.value }, p)); }
          catch (e) { toast('结算单已生成，但标记付款失败：' + errText(e), 'bad'); }
        }
        toast(`已生成结算单 #${r.id}：应付 ${who} ${cny(r.member_cny)}${r.usdt_amount ? `（${usdtFmt(r.usdt_amount)}）` : ''}`, 'ok');
        done();
      } catch (e) {
        toast(errText(e), 'bad');
        if (['stale_preview', 'preview_changed', 'preview_expired'].includes(e.code)) { done(); return; }
        return false;
      }
    } }] });
    async function run() {
      const my = ++seq;
      res = null;
      const status = h('div', { class: 'loading-box' }, icon('refresh', 'icon spin'), h('span', { text: `正在算 ${who} 的额度…` }));
      clear(box, status);
      try {
        const r = await api('POST', '/admin/settle/preview', until ? { user_id: m.user_id, until } : { user_id: m.user_id });
        const out = await pollJob(r.job_id, (s, sec) => { status.lastChild.textContent = (s === 'queued' ? '排队中' : `正在算 ${who} 的额度（没有卡片读数的时段要查 Polo）`) + `… ${sec} 秒`; });
        if (my !== seq) return;
        jobId = r.job_id; res = out;
        const L = res.line;
        pay = payPicker(res.rates, () => L.member_cny);
        const step = (label, val, cls, sub) => h('div', { class: 'calc-row' + (cls ? ' ' + cls : '') }, h('div', {}, h('span', { text: label }), sub ? h('small', { text: sub }) : null), h('b', { text: val }));
        clear(box,
          h('div', { class: 'notice n-info' }, icon('clock'), h('span', {}, '结算截止 ', h('b', { text: fmtSec(res.cutoff) }),
            res.prior_day && !until ? '（北京时间昨天结束）。包含此前未结的部分，今天的额度和调整不计入本单。' : until ? `（上家结算点，北京时间）。确认后 ${who} 名下每个号的结算点都写到这一秒，之后的额度留到下次。` : `（点击时间前 2 分钟，北京时间）。确认后 ${who} 名下每个号的结算点都写到这一秒，下次从下一秒开始。`)),
          windowsTable(res.items, acctMap(st.accounts)),
          res.unmatched && res.unmatched.length ? h('div', { class: 'notice n-warn', style: { marginTop: '10px' } }, icon('warning'), h('span', { text: `注意：有 ${res.unmatched.length} 个 Polo 账号没对应到邮箱，不计入任何成员。` })) : null,
          L.breakdown ? h('div',{class:'calc'},L.breakdown.map(([label,value],i)=>step(label,value,i===L.breakdown.length-1?'total':''))) : h('div', { class: 'calc' },
            step('额度', usd4(L.usd + L.adjust_usd), '', L.adjust_usd ? `账号 ${usd4(L.usd)} + 调整 ${usd(L.adjust_usd)}` : null),
            step(`× 汇率 ¥${L.rate}/$ = 毛收入`, cny(L.gross_cny)),
            L.cost_total_cny ? step('其中回本（全归成员、不分成）', cny(L.recover_cny), 'warn', `成本 ${cny(L.cost_total_cny)} · 之前已回 ${cny(L.recovered_before_cny)} · 这次回完还差 ${cny(L.remaining_cny)}`) : null,
            step(`参与分成 ${cny(L.shared_cny)} × 我抽 ${L.admin_share}% = 我的抽成`, cny(L.admin_cny)),
            step('应付成员 = 毛收入 − 我的抽成', cny(L.member_cny), 'total')),
          pay.el,
          h('label', { class: 'check', style: { margin: '12px 0 6px' } }, markPaid, h('span', { text: '已经付过款了，直接标记为“已付款”' })),
          paidNote, h('div', { style: { marginTop: '8px' } }, note),
          h('p', { class: 'hint', text: '预览 30 分钟内有效。点错了可以在“成员结算记录”里撤销这位成员最近一张（未付款时），结算点会退回原处。' }));
      } catch (e) { if (my === seq) clear(box, h('div', { class: 'notice n-bad' }, icon('warning'), h('span', { text: errText(e) }))); }
    }
    run();
  }


  function adjustmentsCard(st, reload) {
    const members = st.users.filter((u) => u.role === 'user');
    const add = h('button', { class: 'btn btn-secondary btn-sm', type: 'button' }, icon('plus', 'icon icon-sm'), '添加调整');
    add.addEventListener('click', () => {
      const who = h('select', { class: 'select' }, members.map((u) => h('option', { value: u.id, text: nameOf(u) + (u.nickname ? `（${u.username}）` : '') })));
      const amt = h('input', { class: 'input', type: 'number', step: '0.01', placeholder: '例如 5 或 -3.5' });
      const note = h('input', { class: 'input', maxlength: '100', placeholder: '例如：补偿 11-21 停机损失' });
      modal({ title: '添加调整项', body: h('div', {}, field('成员', who), field('金额（美元）', amt, '正数补给成员，负数扣除；并入这位成员下一次结算的额度，按他自己的规则计价。'), field('原因', note)),
        actions: [{ label: '取消' }, { label: '添加', kind: 'btn-primary', onClick: async () => {
          try { await api('POST', '/admin/settle/adjust', { user_id: Number(who.value), usd: Number(amt.value), note: note.value }); toast('已添加', 'ok'); reload(); }
          catch (e) { toast(errText(e), 'bad'); return false; }
        } }] });
    });
    if (!members.length) add.disabled = true;
    const rows = st.adjustments;
    return h('div', { class: 'card', style: { marginTop: '16px' } },
      h('div', { class: 'card-head' }, h('h3', { class: 'card-title' }, icon('plus'), '调整项', h('span', { class: 'faint xs', style: { fontWeight: 400 }, text: '计入这位成员的下一次结算' })), add),
      rows.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
        h('thead', {}, h('tr', {}, ['成员', '金额', '原因', '添加', ''].map((t) => h('th', { text: t })))),
        h('tbody', {}, rows.map((a) => h('tr', {}, h('td', {}, userName2(a.user_id, a.username)), h('td', { class: 'num ' + (a.usd > 0 ? 'text-ok' : 'text-bad'), text: usd(a.usd) }), h('td', { text: a.note }),
          h('td', { class: 'small faint', text: `${a.created_by || ''} · ${ago(a.created_at)}` }),
          h('td', {}, h('button', { class: 'btn btn-ghost btn-xs', type: 'button', onclick: async () => {
            if (!(await confirmBox('删除调整项', `删除给 ${uname(a.user_id, a.username)} 的 ${usd(a.usd)}（${a.note}）？`, { danger: true, okText: '删除' }))) return;
            try { await api('POST', '/admin/settle/adjust-delete/' + a.id); reload(); } catch (e) { toast(errText(e), 'bad'); }
          } }, '删除'))))))) : h('div', { class: 'card-body muted small', text: '没有待结算的调整项。停机补偿、纠错等可以在这里添加。' }));
  }

  // ---------- 上家结算 ----------
  const curFmt = (v, cur) => (cur === 'USDT' ? usdtFmt(v) : cny(v));
  const MODE_CN = { amount: '按本次额度', cumulative: '按累计额度', time: '按时间' };
  function covChip(c) {
    if (!c) return null;
    if (c.covered) return h('span', { class: 'chip chip-ok', text: '已给成员结清' });
    return h('span', { class: 'chip chip-warn', text: c.never ? '还没给成员结算' : `给成员结到 ${fmtSec(c.settled_until).slice(5, 16)}` });
  }
  // 一段时间的额度拆分：我的号 / 各成员的号，每组列出账号
  function splitTable(bd, info, cov) {
    const groups = [{ owner: null, usd: bd.mine_usd }].concat(Object.entries(bd.members || {}).sort((a, b) => b[1].usd - a[1].usd).map(([u, m]) => ({ owner: Number(u), usd: m.usd })));
    const tbody = h('tbody');
    for (const g of groups) {
      const rows = (bd.accounts || []).filter((x) => (x.owner === undefined ? null : x.owner) === g.owner);
      if (!rows.length && !g.usd) continue;
      tbody.append(h('tr', { class: 'grp-row' }, h('td', {}, h('div', { class: 'row wrap', style: { gap: '8px' } },
        g.owner === null ? h('b', { text: '我的号' }) : userName2(g.owner), g.owner !== null && cov ? covChip(cov[String(g.owner)]) : null)), h('td', { class: 'c-range' }), h('td'),
        h('td', { class: 'num money-strong', text: usd(g.usd) }), h('td', { class: 'num faint c-pct', text: bd.usd ? ((g.usd / bd.usd) * 100).toFixed(1) + '%' : '' })));
      for (const x of rows) {
        const part = x.start !== bd.start || x.end !== bd.end;
        tbody.append(h('tr', {}, h('td', {}, acctLabel(x.key, info, x.name), x.unmatched ? h('span', { class: 'chip chip-warn', text: '没对应到邮箱' }) : null),
          h('td', { class: 'small nowrap faint c-range' }, part ? [h('div', { text: fmtSec(x.start).slice(5) }), h('div', { text: '→ ' + fmtSec(x.end).slice(5) })] : '整段'),
          h('td', { class: 'num' }, compact(x.requests)), h('td', { class: 'num', title: usd4(x.usd) }, usd(x.usd)), h('td', { class: 'c-pct' })));
      }
    }
    if (!tbody.children.length) return h('div', { class: 'muted small', text: '这段时间没有额度' });
    return h('div', { class: 'charges-wrap' }, h('table', { class: 'mini-table split-table' },
      h('thead', {}, h('tr', {}, [['账号'], ['归属区间', 'c-range'], ['请求'], ['额度'], ['占比', 'c-pct']].map(([t, k]) => h('th', { class: k || null, text: t })))), tbody));
  }

  async function settleUpstream(body) {
    const [st] = await Promise.all([api('GET', '/admin/settle/up/state'), loadECharts().catch(() => null)]);
    rememberUsers(st.users);
    const info = acctMap(st.accounts);
    const reload = () => settleUpstream(body);
    const set = st.settings, sd = st.settled, p = st.pending, carry = st.carry || 0;
    const pTot = p ? p.usd + carry : null;
    const act = st.points.filter((x) => x.status === 'active');
    const last = act[0] || null;
    // 估算收入：填了上家单价就用它，没填就按最近一次收款的单价
    const pe = st.price_est || {};
    const estM = (u) => (pe.price ? `≈ ${curFmt(r2(u * pe.price), pe.currency)}${pe.src === 'last' ? '（按上次收款单价）' : ''}` : null);
    const y = st.yday;
    const carryTxt = Math.abs(carry) >= 0.00005 ? ` · 含上次结转 ${usd4(carry)}` : '';
    const notes = [];
    if (!p) notes.push(['n-info', 'refresh', '待结算数据正在更新（约半分钟），稍后点“刷新”。']);
    if (p && p.unmatched && p.unmatched.length) notes.push(['n-warn', 'warning', `有 ${p.unmatched.length} 个 Polo 账号没对应到邮箱（${p.unmatched.map((x) => `${x.name} ${usd(x.usd)}`).join('、')}），算在“我的号”里。`]);
    const recvTxt = Object.entries(sd.received).map(([k, v]) => curFmt(v, k)).join(' + ');
    const stats = h('div', { class: 'stats' },
      statCard('未结算收益（上家）', p ? usd(pTot) : '—', 'clock', 'warn', p ? `截至 ${fmtSec(p.end).slice(5, 16)} · 我的号 ${usd(p.mine_usd)} · 成员号 ${usd(p.members_usd)}${carryTxt}${estM(pTot) ? ` · ${estM(pTot)}` : ''}` : '更新中'),
      statCard(y ? `昨日收益（${y.day.slice(5)}）` : '昨日收益', y ? usd(y.usd) : '—', 'chart', 'blue', y ? `全天 · 我的号 ${usd(y.mine_usd)} · 成员号 ${usd(y.members_usd)}${estM(y.usd) ? ` · ${estM(y.usd)}` : ''} · ${y.status === 'settled' ? '已结算' : y.status === 'partial' ? '部分已结算' : '未结算'}` : '正在计算'),
      statCard('已结算（上家）', usd(sd.usd), 'check', 'ok', `${sd.count} 次${Math.abs(sd.polo_usd - sd.usd) >= 0.00005 ? ` · Polo 实际 ${usd4(sd.polo_usd)}` : ''} · 我的号 ${usd(sd.mine_usd)} · 成员号 ${usd(sd.members_usd)} · 累计总额度 ${usd(sd.polo_usd + (p ? p.usd : 0))}`),
      statCard('已收款', recvTxt || '—', 'dollar', 'purple', last ? `上次结算点 ${fmtSec(last.end_at).slice(5, 16)}` : '还没有结算点'));
    // 昨日收益：上家每天结算前一天（「用量统计」按天 00:00:00 – 23:59:59）；点按钮 = 按时间结算到昨天 23:59:59
    const ydBtn = h('button', { class: 'btn btn-primary', type: 'button', disabled: !(y && y.can_settle && y.status !== 'settled'),
      onclick: () => upstreamAddModal(st, info, reload, { time: y.settle_to, title: `结算昨日收益（${y.day}）` }) }, icon('check', 'icon icon-sm'), '结算昨日收益');
    const ydNote = !y ? '昨天的数正在向 Polo 查询…'
      : y.status === 'settled' ? `✓ 昨天（${y.day}）已经结算${y.rest ? `（结到 ${fmtSec(y.settle_from - 1).slice(11)}，之后 Polo 额度 ${usd4(y.rest.usd)}）` : ''}。`
        : !y.final ? '「用量统计」里昨天的长请求还会晚到，凌晨 1 点以后才能结算（现在的数还可能涨一点）。'
          : y.status === 'partial' ? `昨天已经结到 ${fmtSec(y.settle_from - 1).slice(11)}，剩下 ${y.rest ? usd4(y.rest.usd) : '—'} 没结。点“结算昨日收益”结到昨天 23:59:59。`
            : `昨天还没结算。点“结算昨日收益”就把到昨天 23:59:59 的记成一次上家结算${y.before && y.before.usd >= 0.005 ? `；另外 ${fmtSec(y.before.start).slice(5, 16)} 起还有 ${usd4(y.before.usd)} 没结，会一起结算` : ''}。`;
    const ydCard = h('div', { class: 'card yd-card', style: { marginBottom: '16px' } }, h('div', { class: 'card-body yd-row' },
      h('div', { class: 'yd-main' },
        h('div', { class: 'yd-title' }, icon('chart', 'icon icon-sm'), y ? `昨日收益 · ${y.day}` : '昨日收益', h('span', { class: 'faint xs', text: '北京时间 00:00:00 – 23:59:59，按「用量统计」按天，和上家网页的数一致' })),
        h('div', { class: 'yd-amt' }, h('b', { text: y ? usd4(y.usd) : '—' }), y && estM(y.usd) ? h('span', { text: estM(y.usd) }) : null,
          y ? h('span', { class: 'chip ' + (y.status === 'settled' ? 'chip-ok' : 'chip-warn'), text: y.status === 'settled' ? '已结算' : y.status === 'partial' ? '部分已结算' : '未结算' }) : null),
        h('div', { class: 'faint xs', text: ydNote })),
      h('div', { class: 'toolbar' }, ydBtn)));
    const addBtn = h('button', { class: 'btn btn-secondary btn-sm', type: 'button', onclick: () => upstreamAddModal(st, info, reload) }, icon('plus', 'icon icon-sm'), '添加结算点');
    const refBtn = h('button', { class: 'btn btn-secondary btn-sm', type: 'button' }, icon('refresh', 'icon icon-sm'), '刷新');
    refBtn.addEventListener('click', async () => {
      refBtn.disabled = true; clear(refBtn, icon('refresh', 'icon icon-sm spin'), '正在向 Polo 查询…');
      try { const r = await api('POST', '/admin/settle/up/refresh'); await pollJob(r.job_id); toast('已刷新', 'ok'); await reload(); }
      catch (e) { toast(errText(e), 'bad'); refBtn.disabled = false; clear(refBtn, icon('refresh', 'icon icon-sm'), '刷新'); }
    });
    const head = h('div', { class: 'card', style: { marginBottom: '16px' } }, h('div', { class: 'card-body period' },
      h('div', {}, howTo('怎么用',
        h('div', { class: 'hint', text: '上家按整个号池（所有成员的号 + 你自己的号）的总额度给你结算。上家每天结算前一天的：凌晨 1 点以后点上面的“结算昨日收益”，系统按时间结算到昨天 23:59:59（金额和上家网页按天查的一致）。也可以点“添加结算点”，输入这次结算了多少额度（或累计额度、或时间），系统会向 Polo 查出这个额度是在哪一秒达到的，结算点就记在那一秒，下一段从下一秒开始。之后再到“成员待结算”给成员结算，可以选“结算到上家结算点”。' })),
        h('div', { class: 'faint xs', style: { marginTop: '4px' }, text: p ? `待结算数字 ${ago(p.at)}查询，每 15 分钟自动更新${st.refreshing ? '，正在更新…' : ''}` : '' })),
      h('div', { class: 'toolbar' }, refBtn, addBtn)));
    // 图表
    const el1 = h('div', { class: 'chart chart-lg' }), el2 = h('div', { class: 'chart' });
    const charts = h('div', { class: 'chart-grid' },
      h('div', { class: 'span-2' }, h('div', { class: 'card chart-card' }, h('div', { class: 'card-head' }, h('div', {}, h('h3', { class: 'card-title' }, icon('trend'), '累计额度与结算点'),
        h('div', { class: 'faint xs', text: '曲线：整个号池的累计额度（按小时）；绿点：上家结算点（达成的那一秒）；橙色：待结算' }))), h('div', { class: 'card-body chart-body' }, el1))),
      h('div', { class: 'span-2' }, h('div', { class: 'card chart-card' }, h('div', { class: 'card-head' }, h('div', {}, h('h3', { class: 'card-title' }, icon('cube'), '每段的构成'),
        h('div', { class: 'faint xs', text: '每次上家结算里：我的号 / 各成员的号各占多少（最后一根是待结算）' }))), h('div', { class: 'card-body chart-body' }, el2))));
    // 待结算
    const pend = h('div', { class: 'card', style: { marginBottom: '16px' } },
      h('div', { class: 'card-head' }, h('div', {}, h('h3', { class: 'card-title' }, icon('clock'), '未结算（上家）'),
        p ? h('div', { class: 'faint xs', text: `${fmtSec(p.start)} → ${fmtSec(p.end)} · Polo 新增 ${usd(p.usd)}（我的号 ${usd(p.mine_usd)} · 成员号 ${usd(p.members_usd)}）${Math.abs(carry) >= 0.00005 ? ` ${carry > 0 ? '+' : '−'} 上次结转 ${usd4(Math.abs(carry))} = ${usd(pTot)}` : ''}` }) : null)),
      h('div', { class: 'card-body' }, p ? splitTable(p, info, p.coverage) : emptyState('更新中…', 'clock')));
    // 结算点记录
    const COLS = ['次', '区间（达成时间）', '额度（记账）', '我的号（Polo）', '成员号（Polo）', '收款', '给成员结算', ''];
    const tbody = h('tbody');
    st.points.forEach((x) => {
      const voided = x.status !== 'active';
      const idx = act.length - act.indexOf(x);
      const polo = x.polo_usd === null || x.polo_usd === undefined ? x.usd : x.polo_usd;
      const bd = { usd: polo, mine_usd: x.mine_usd, members: x.detail.members, accounts: x.detail.accounts, start: x.start_at, end: x.end_at };
      const d = x.detail;
      const gap = polo - x.usd;
      const gapTxt = Math.abs(gap) >= 0.00005 ? (gap > 0 ? `，比记账多 ${usd4(gap)}（结转到下一段）` : `，比记账少 ${usd4(-gap)}（抵掉上次结转）`) : '';
      const how = (x.mode === 'time' ? `${MODE_CN.time}：${fmtSec(x.target)}` : `${MODE_CN[x.mode]} ${usd4(x.target)}`) + ` · 记账 ${usd4(x.usd)} · Polo 实际 ${usd4(polo)}${gapTxt}`;
      const exp = h('tr', { class: 'exp-row', hidden: true }, h('td', { colspan: String(COLS.length) }, splitTable(bd, info, x.coverage),
        h('div', { class: 'faint xs', style: { marginTop: '6px' }, text: `${how} · ${x.created_by || ''} 录入于 ${fmtTime(x.created_at)}${x.note ? ' · 备注：' + x.note : ''}${voided ? ` · ${x.voided_by || ''} 于 ${fmtTime(x.voided_at)} 撤销` : ''}` })));
      const covs = Object.entries(x.coverage || {}).map(([u, c]) => h('span', { class: 'chip ' + (c.covered ? 'chip-ok' : 'chip-warn'), title: c.covered ? '已给成员结清这一段' : c.never ? '还没给成员结算' : `给成员结到 ${fmtSec(c.settled_until)}` }, (c.covered ? '✓ ' : '') + uname(Number(u))));
      const ops = h('div', { class: 'row', style: { gap: '4px' } },
        !voided ? h('button', { class: 'btn btn-ghost btn-xs', type: 'button', onclick: (e) => { e.stopPropagation(); upstreamEditModal(x, reload); } }, '改收款') : null,
        !voided && last && x.id === last.id ? h('button', { class: 'btn btn-ghost btn-xs text-bad', type: 'button', onclick: async (e) => {
          e.stopPropagation();
          if (!(await confirmBox('撤销结算点', `撤销第 ${idx} 次上家结算（${usd(x.usd)}，达成于 ${fmtSec(x.end_at)}）？撤销后这段额度回到待结算。`, { danger: true, okText: '撤销' }))) return;
          try { await api('POST', '/admin/settle/up/void/' + x.id); toast('已撤销', 'ok'); reload(); } catch (err) { toast(errText(err), 'bad'); }
        } }, '撤销') : null);
      const tr = h('tr', { class: 'click' + (voided ? ' voided-row' : ''), onclick: () => { exp.hidden = !exp.hidden; tr.classList.toggle('open', !exp.hidden); } },
        h('td', { 'data-label': '' }, h('b', { text: voided ? '—' : `第 ${idx} 次` }), voided ? h('span', { class: 'badge b-gray', style: { marginLeft: '6px' }, text: '已撤销' }) : null, h('div', { class: 'faint xs', text: `#${x.id}` })),
        h('td', { 'data-label': '区间', class: 'small nowrap' }, h('div', { class: 'faint', text: fmtSec(x.start_at) }), h('div', {}, '→ ', h('b', { text: fmtSec(x.end_at) }))),
        h('td', { 'data-label': '额度', class: 'num' }, h('div', { class: 'money-strong', title: '记账额度（上家给的数）' }, usd4(x.usd)),
          Math.abs(gap) >= 0.00005 ? h('div', { class: 'faint xs', title: '这一段 Polo 实际额度' }, 'Polo ' + usd4(polo)) : null),
        h('td', { 'data-label': '我的号', class: 'num' }, usd(x.mine_usd)),
        h('td', { 'data-label': '成员号', class: 'num' }, usd(x.members_usd)),
        h('td', { 'data-label': '收款', class: 'num' }, x.received !== null ? [h('div', { text: curFmt(x.received, x.currency) }), h('div', { class: 'faint xs', text: `每 $1 = ${x.currency === 'USDT' ? '' : '¥'}${(x.received / x.usd).toFixed(3)}${x.currency === 'USDT' ? ' USDT' : ''}` })] : h('span', { class: 'faint', text: '—' })),
        h('td', { 'data-label': '给成员结算' }, covs.length ? h('div', { class: 'chips' }, covs) : h('span', { class: 'faint small', text: voided ? '' : '都是我的号' })),
        h('td', { 'data-label': '' }, ops));
      append(tbody, tr, exp);
    });
    if (!st.points.length) tbody.append(h('tr', {}, h('td', { colspan: String(COLS.length) }, emptyState('还没有上家结算点。上家给你结算后点“添加结算点”。', 'trend'))));
    const hist = h('div', { class: 'card', style: { marginBottom: '16px' } },
      h('div', { class: 'card-head' }, h('div', {}, h('h3', { class: 'card-title' }, icon('log'), '已结算（上家结算点）'), h('div', { class: 'faint xs', text: '时间是额度达成的那一秒；点开看每个号的额度和录入信息' }))),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table responsive' }, h('thead', {}, h('tr', {}, COLS.map((t) => h('th', { text: t })))), tbody)));
    // 设置
    const startIn = h('input', { class: 'input mono', type: 'datetime-local', step: '1', value: toBjInput(set.up_start), disabled: set.locked });
    const priceIn = h('input', { class: 'input', type: 'number', step: '0.0001', min: '0', value: set.up_price === null ? '' : set.up_price, placeholder: '可不填' });
    const curSel = h('select', { class: 'select' }, ['CNY', 'USDT'].map((k) => h('option', { value: k, selected: set.up_currency === k, text: k === 'CNY' ? '人民币' : 'USDT' })));
    const saveBtn = h('button', { class: 'btn btn-secondary btn-sm', type: 'button' }, '保存');
    saveBtn.addEventListener('click', async () => {
      const d = { up_price: priceIn.value === '' ? null : Number(priceIn.value), up_currency: curSel.value };
      if (!set.locked) { d.up_start = fromBjInput(startIn.value); if (!d.up_start) return toast('请填写起点', 'bad'); }
      try { await api('POST', '/admin/settle/up/settings', d); toast('已保存', 'ok'); reload(); } catch (e) { toast(errText(e), 'bad'); }
    });
    const sets = h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('h3', { class: 'card-title' }, icon('cog'), '上家结算设置'), saveBtn),
      h('div', { class: 'card-body grid-4' },
        field('第一段从（北京时间）', startIn, set.locked ? '已经有结算点，不能再改' : '上家从什么时候开始算；Polo 在 11-20 之前没有数据'),
        field('上家单价（每 $1 额度）', priceIn, '填了会估算待收款，并自动填收款金额'),
        field('单价币种', curSel)));
    clear(body, notes.map(([k, i, t]) => h('div', { class: 'notice ' + k }, icon(i), h('span', { text: t }))), stats, ydCard, head, charts, pend, hist, sets);
    const draw = () => { disposeCharts(); upstreamCharts(st, el1, el2); };
    S.onTheme = draw;
    draw();
  }

  function upstreamCharts(st, el1, el2) {
    const E = window.echarts;
    if (!E) { clear(el1, emptyState(ERR.chart_load_failed, 'warning')); return; }
    const t = chartTheme(), p = st.pending;
    const act = st.points.filter((x) => x.status === 'active').slice().reverse();
    const nowS = Math.floor(Date.now() / 1000);
    const endX = p ? p.end : nowS;
    let cum = 0;
    const line = [[st.settings.up_start * 1000, 0]];
    for (const [hs, u] of st.hourly) { cum += u; const x = Math.min(hs + 3599, nowS); if (x < endX) line.push([x * 1000, r2(cum)]); }
    if (p) line.push([p.end * 1000, r2(st.settled.polo_usd + p.usd)]);
    let c2 = 0;
    const pts = act.map((x, i) => { c2 += x.polo_usd === null || x.polo_usd === undefined ? x.usd : x.polo_usd; return { value: [x.end_at * 1000, r2(c2)], id: x.id, n: i + 1, usd: x.usd }; });
    const lastEnd = act.length ? act[act.length - 1].end_at + 1 : st.settings.up_start;
    const base = baseOpt(t);
    const c1 = mkChart(el1);
    c1.setOption(Object.assign(base, {
      legend: { show: false }, grid: { left: 8, right: 18, top: 30, bottom: 8, containLabel: true },
      tooltip: Object.assign(base.tooltip, { axisPointer: { type: 'line', lineStyle: { color: t.border } }, formatter: (ps) => {
        ps = Array.isArray(ps) ? ps : [ps];
        let html = `<div class="ct-title">${escHtml(fmtSec(ps[0].value[0] / 1000).slice(0, 16))}</div>`;
        for (const q of ps) {
          if (q.seriesType === 'scatter') html += `<div class="ct-row"><i class="ct-dot cd3"></i><span>第 ${q.data.n} 次结算点（记账 ${escHtml(usd4(q.data.usd))}）</span><b>${escHtml(usd(q.value[1]))}</b></div>`;
          else html += `<div class="ct-row"><i class="ct-dot cd7"></i><span>累计额度</span><b>${escHtml(usd(q.value[1]))}</b></div>`;
        }
        return html;
      } }),
      xAxis: { type: 'time', axisLine: { lineStyle: { color: t.border } }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { color: t.muted, fontSize: 11, hideOverlap: true } },
      yAxis: axisY(t, shortUsd),
      series: [
        { name: '累计额度', type: 'line', data: line, showSymbol: false, smooth: 0.15, lineStyle: { width: 2.5, color: '#6366f1' }, itemStyle: { color: '#6366f1' },
          areaStyle: { color: grad(E, 'rgba(99,102,241,.28)', 'rgba(99,102,241,0)') },
          markArea: p && p.usd + (st.carry || 0) > 0 ? { silent: true, itemStyle: { color: 'rgba(245,158,11,.12)' }, label: { show: !isPhone(), position: 'insideTop', color: '#d97706', fontWeight: 700, formatter: '待结算 ' + usd(p.usd + (st.carry || 0)) },
            data: [[{ xAxis: lastEnd * 1000 }, { xAxis: p.end * 1000 }]] } : undefined,
          markLine: pts.length ? { silent: true, symbol: 'none', lineStyle: { color: '#10b981', type: 'dashed', width: 1.2 }, label: { show: false }, data: pts.map((x) => ({ xAxis: x.value[0] })) } : undefined },
        { name: '结算点', type: 'scatter', data: pts, symbolSize: 13, z: 10, itemStyle: { color: '#10b981', borderColor: t.card, borderWidth: 2 },
          label: { show: true, position: 'top', color: t.text, fontWeight: 700, fontSize: 11, formatter: (q) => `第${q.data.n}次 ${shortUsd(q.data.usd)}` }, animationDelay: (i) => 600 + i * 120 },
      ],
    }));
    // 每段的构成
    const periods = act.map((x) => ({ label: `第${act.indexOf(x) + 1}次 ${fmtSec(x.end_at).slice(5, 10)}`, mine: x.mine_usd, members: x.detail.members, pend: false }));
    if (p && p.usd > 0) periods.push({ label: '待结算', mine: p.mine_usd, members: p.members, pend: true });
    if (!periods.length) { clear(el2, emptyState('还没有数据', 'cube')); return; }
    const uids = [...new Set(periods.flatMap((q) => Object.keys(q.members || {})))];
    const ser = (name, vals, i) => ({ name, type: 'bar', stack: 's', barMaxWidth: 46, emphasis: { focus: 'series' },
      data: vals.map((v, k) => ({ value: r2(v), itemStyle: periods[k].pend ? { opacity: 0.55 } : undefined })),
      itemStyle: { color: PALETTE[i % PALETTE.length], borderRadius: 0 }, animationDelay: (k) => k * 60 + i * 40 });
    const c2c = mkChart(el2);
    c2c.setOption(Object.assign(baseOpt(t), {
      tooltip: Object.assign(baseOpt(t).tooltip, { formatter: axisTip({ _: usd }, { total: '合计' }) }),
      xAxis: axisX(t, periods.map((q) => q.label)), yAxis: axisY(t, shortUsd),
      series: [ser('我的号', periods.map((q) => q.mine), 0), ...uids.map((u, i) => ser(uname(Number(u)), periods.map((q) => ((q.members || {})[u] || {}).usd || 0), i + 1))],
    }));
  }

  function upstreamAddModal(st, info, reload, preset) {
    const p = st.pending, sd = st.settled, set = st.settings, carry = st.carry || 0;
    const pTot = p ? p.usd + carry : null;
    const pe = st.price_est || {};
    let mode = preset ? 'time' : 'amount', jobId = null, res = null, seq = 0;
    const seg = h('div', { class: 'seg' });
    const amt = h('input', { class: 'input mono', type: 'number', step: '0.0001', min: '0', placeholder: p ? '例如 ' + Math.floor(pTot) : '例如 3000' });
    const cum = h('input', { class: 'input mono', type: 'number', step: '0.0001', min: '0', placeholder: '例如 ' + Math.floor(sd.polo_usd + (p ? p.usd : 0)) });
    const tIn = h('input', { class: 'input mono', type: 'datetime-local', step: '1', value: toBjInput(preset ? preset.time : Math.floor(Date.now() / 1000) - 300) });
    const findBtn = h('button', { class: 'btn btn-primary btn-sm', type: 'button' }, icon('search', 'icon icon-sm'), '查找达成时间');
    const inputBox = h('div'), resBox = h('div');
    const recv = h('input', { class: 'input', type: 'number', step: '0.01', min: '0', placeholder: '可不填' });
    const recvCur = h('select', { class: 'select', style: { width: 'auto' } }, ['CNY', 'USDT'].map((k) => h('option', { value: k, selected: set.up_currency === k, text: k === 'CNY' ? '人民币' : 'USDT' })));
    const note = h('input', { class: 'input', maxlength: '200', placeholder: '备注（可选）' });
    const reset = () => { seq++; res = null; jobId = null; clear(resBox); };
    [amt, cum, tIn].forEach((x) => x.addEventListener('input', reset));
    function paint() {
      clear(seg, [['amount', '按本次额度'], ['cumulative', '按累计额度'], ['time', '按时间']].map(([k, l]) => h('button', { type: 'button', class: mode === k ? 'on' : '', onclick: () => { mode = k; reset(); paint(); } }, l)));
      const cTxt = Math.abs(carry) >= 0.00005 ? (carry > 0 ? `；上次多出的 ${usd4(carry)} 会先抵掉` : `；上次少的 ${usd4(-carry)} 会先补上`) : '';
      const hint = mode === 'amount' ? `从 ${fmtSec(st.next_start)} 开始累计${cTxt}。目前待结算 ${p ? usd(pTot) : '—'}（截至 ${p ? fmtSec(p.end) : '—'}）。记账就写你填的数。`
        : mode === 'cumulative' ? `从 ${fmtSec(set.up_start)} 起的累计额度。已记账 ${usd4(sd.usd)}，目前累计约 ${usd(sd.polo_usd + (p ? p.usd : 0))}。记账 = 你填的数 − 已记账。`
          : `在 ${fmtSec(st.next_start)} 之后、现在前 1 小时之前（北京时间，精确到秒；「用量统计」里长请求会晚到，1 小时前的数才完整）。记账 = 这段 Polo 实际额度${Math.abs(carry) >= 0.00005 ? ' + 上次结转' : ''}。`;
      const label = mode === 'amount' ? '上家这次结算了多少额度（美元）' : mode === 'cumulative' ? '上家累计结算到多少额度（美元）' : '结算到哪个时间';
      clear(inputBox, field(label, h('div', { class: 'row', style: { gap: '8px' } }, mode === 'amount' ? amt : mode === 'cumulative' ? cum : tIn, findBtn), hint));
    }
    paint();
    findBtn.addEventListener('click', async () => {
      let value;
      if (mode === 'time') { value = fromBjInput(tIn.value); if (!value) { toast('请填写时间', 'bad'); return; } }
      else { value = Number((mode === 'amount' ? amt : cum).value); if (!(value > 0)) { toast('请填写额度', 'bad'); return; } }
      const my = ++seq; res = null; findBtn.disabled = true;
      const status = h('div', { class: 'loading-box' }, icon('refresh', 'icon spin'), h('span', { text: '正在向 Polo 查找达成的那一秒…' }));
      clear(resBox, status);
      try {
        const r = await api('POST', '/admin/settle/up/find', { mode, value });
        const out = await pollJob(r.job_id, (s, sec) => { status.lastChild.textContent = (s === 'queued' ? '排队中' : '正在向 Polo 查找达成的那一秒（按天 → 小时 → 分钟 → 秒）') + `… ${sec} 秒`; });
        if (my !== seq) return;
        jobId = r.job_id; res = out;
        if (set.up_price && recv.value === '') { recv.value = r2(res.book_usd * set.up_price); recvCur.value = set.up_currency; }
        else if (!set.up_price && pe.price) { recv.placeholder = `约 ${r2(res.book_usd * pe.price)} ${pe.currency === 'USDT' ? 'USDT' : '元'}（按上次收款单价估算，可不填）`; if (recv.value === '') recvCur.value = pe.currency || 'CNY'; }
        const diff = res.need !== null && res.need !== undefined ? `；Polo 要跑到 ${usd4(res.need)}，跨过它的那一条请求多出 ${usd4(res.diff)}` : '';
        const ca = res.carry_after;
        const caTxt = Math.abs(ca) < 0.00005 ? '记账和 Polo 实际一致，没有结转。'
          : ca > 0 ? `记账写 ${usd4(res.book_usd)}（上家的数），Polo 到这一秒比记账多 ${usd4(ca)}：这部分算进下一段待结算，下次结算时抵掉，不会丢也不会重复。`
            : `记账写 ${usd4(res.book_usd)}（上家的数），比 Polo 到这一秒的实际多 ${usd4(-ca)}：下一段待结算会先扣掉这部分。`;
        const box = h('div', { hidden: true }, splitTable(res, info, null));
        const lbl = h('span', { text: '看每个号的额度' });
        clear(resBox,
          h('div', { class: 'reach' }, h('small', { text: mode === 'time' ? '结算到（北京时间）' : '达成时间（北京时间，精确到秒）' }),
            h('div', { class: 'reach-t', text: fmtSec(res.end) }),
            h('div', { class: 'muted small', text: `这一段：${fmtSec(res.start)} → ${fmtSec(res.end)}，Polo 实际 ${usd4(res.usd)}${diff}` })),
          h('div', { class: 'sum-chips' },
            h('div', {}, h('small', { text: '记账额度（上家）' }), h('b', { class: 'money-strong', text: usd4(res.book_usd) })),
            h('div', {}, h('small', { text: 'Polo 实际' }), h('b', { text: usd4(res.usd) })),
            h('div', {}, h('small', { text: '结转到下一段' }), h('b', { class: Math.abs(ca) >= 0.00005 ? 'text-warn' : '', text: usd4(ca) })),
            h('div', {}, h('small', { text: '其中我的号' }), h('b', { text: usd(res.mine_usd) })),
            h('div', {}, h('small', { text: '其中成员号' }), h('b', { text: usd(res.members_usd) })),
            h('div', {}, h('small', { text: '记账累计到这里' }), h('b', { text: usd4(res.settled_before + res.book_usd) }))),
          h('p', { class: 'hint', style: { marginTop: '8px' }, text: caTxt }),
          h('div', { style: { marginTop: '4px' } }, h('button', { class: 'btn btn-ghost btn-xs', type: 'button', onclick: () => { box.hidden = !box.hidden; lbl.textContent = box.hidden ? '看每个号的额度' : '收起'; } }, icon('down', 'icon icon-sm'), lbl), box));
      } catch (e) {
        if (my !== seq) return;
        let msg = errText(e);
        const b = e.body || {};
        if (e.code === 'not_reached' && b.total !== undefined) {
          const c0 = b.carry || 0;
          msg = mode === 'cumulative' ? `还没达到：到 ${fmtSec(b.cutoff)} 为止累计只有 ${usd4((b.polo_before || 0) + b.total)}。`
            : `还没达到：从 ${fmtSec(st.next_start)} 到 ${fmtSec(b.cutoff)} 一共只有 ${usd4(b.total + c0)}${Math.abs(c0) >= 0.00005 ? `（Polo 新增 ${usd4(b.total)} ${c0 > 0 ? '+' : '−'} 上次结转 ${usd4(Math.abs(c0))}）` : ''}。`;
        }
        if (e.code === 'below_settled' && b.settled !== undefined) msg += `（已记账累计 ${usd4(b.settled)}）`;
        clear(resBox, h('div', { class: 'notice n-bad' }, icon('warning'), h('span', { text: msg })));
      } finally { findBtn.disabled = false; }
    });
    modal({ title: preset ? preset.title : '添加上家结算点', wide: true,
      body: h('div', {}, h('div', { class: 'row wrap until-row' }, h('span', { class: 'label', text: '怎么算' }), seg), inputBox, resBox,
        h('div', { class: 'grid-half', style: { marginTop: '14px' } }, field('上家付了多少（可不填）', h('div', { class: 'row', style: { gap: '8px' } }, recv, recvCur)), field('备注', note)),
        h('p', { class: 'hint', text: '先点“查找达成时间”，确认无误再添加。结算点记在额度达成的那一秒；点错了可以撤销最近一个。' })),
      actions: [{ label: '取消' }, { label: '确认添加', kind: 'btn-primary', onClick: async () => {
        if (!res) { toast('先点“查找达成时间”', 'bad'); return false; }
        try {
          const r = await api('POST', '/admin/settle/up/commit', { job_id: jobId, received: recv.value === '' ? null : Number(recv.value), currency: recvCur.value, note: note.value });
          toast(`已添加结算点：记账 ${usd4(r.usd)}，${mode === 'time' ? '结算到' : '达成于'} ${fmtSec(r.end_at)}`, 'ok'); reload();
        } catch (e) { toast(errText(e), 'bad'); if (['stale_preview', 'preview_expired'].includes(e.code)) { reload(); return; } return false; }
      } }] });
    if (preset) findBtn.click();  // 结算昨日收益：打开就查好，确认即可
  }

  function upstreamEditModal(x, reload) {
    const recv = h('input', { class: 'input', type: 'number', step: '0.01', min: '0', value: x.received === null ? '' : x.received, placeholder: '可不填' });
    const cur = h('select', { class: 'select', style: { width: 'auto' } }, ['CNY', 'USDT'].map((k) => h('option', { value: k, selected: (x.currency || 'CNY') === k, text: k === 'CNY' ? '人民币' : 'USDT' })));
    const note = h('input', { class: 'input', maxlength: '200', value: x.note || '' });
    modal({ title: `改收款 · ${usd(x.usd)}（达成于 ${fmtSec(x.end_at)}）`,
      body: h('div', {}, field('上家付了多少', h('div', { class: 'row', style: { gap: '8px' } }, recv, cur)), field('备注', note), h('p', { class: 'hint', text: '时间和额度来自 Polo，不能手改；要改就撤销后重新添加。' })),
      actions: [{ label: '取消' }, { label: '保存', kind: 'btn-primary', onClick: async () => {
        try { await api('POST', '/admin/settle/up/edit/' + x.id, { received: recv.value === '' ? null : Number(recv.value), currency: cur.value, note: note.value }); toast('已保存', 'ok'); reload(); }
        catch (e) { toast(errText(e), 'bad'); return false; }
      } }] });
  }

  // ---------- 结算记录 ----------
  async function settleHistory(body) {
    const [{ settlements }, st] = await Promise.all([api('GET', '/admin/settle/list'), api('GET', '/admin/settle/state')]);
    rememberUsers(st.users);
    const info = acctMap(st.accounts);
    const reload = () => settleHistory(body);
    const active = settlements.filter((s) => s.status === 'active');
    const latest = {};
    for (const s of active) if (!(s.user_id in latest) || s.id > latest[s.user_id]) latest[s.user_id] = s.id;
    const lineOf = (s) => s.lines[0] || null;
    const allLines = active.flatMap((s) => s.lines);
    const paid = r2(allLines.filter((l) => l.paid_at).reduce((a, l) => a + l.member_cny, 0));
    const owe = r2(allLines.reduce((a, l) => a + l.member_cny, 0));
    const recAll = r2(allLines.reduce((a, l) => a + (l.recover_cny || 0), 0));
    const usdtUnpaid = r2(active.filter((s) => s.pay_currency === 'USDT' && s.lines.some((l) => !l.paid_at)).reduce((a, s) => a + (s.usdt_amount || 0), 0));
    const stats = h('div', { class: 'stats' },
      statCard('结算次数', active.length, 'log', 'blue', settlements.length > active.length ? `另有 ${settlements.length - active.length} 次已撤销` : null),
      statCard('累计应付成员', cny(owe), 'users', 'purple', recAll ? `其中回本 ${cny(recAll)}（不分成）` : null),
      statCard('未付款', cny(r2(owe - paid)), 'clock', owe - paid > 0 ? 'warn' : 'ok', `已付 ${cny(paid)}${usdtUnpaid ? ` · USDT 未付 ${usdtFmt(usdtUnpaid)}` : ''}`),
      statCard('我的累计抽成', cny(r2(active.reduce((a, s) => a + s.admin_cny, 0))), 'trend', 'ok', `成员号额度 ${usd(active.reduce((a, s) => a + s.total_usd, 0))}`));
    // 按天汇总
    const byDay = {};
    for (const s of active) {
      const d = dayOfTs(s.created_at);
      const x = byDay[d] = byDay[d] || { n: 0, usd: 0, member: 0, rec: 0, admin: 0, unpaid: 0 };
      x.n++; x.usd += s.total_usd + s.adjust_usd; x.member += s.member_cny; x.rec += s.recover_cny || 0; x.admin += s.admin_cny;
      x.unpaid += s.lines.filter((l) => !l.paid_at).reduce((a, l) => a + l.member_cny, 0);
    }
    const dayCard = h('div', { class: 'card', style: { marginBottom: '16px' } },
      h('div', { class: 'card-head' }, h('h3', { class: 'card-title' }, icon('chart'), '每天的结算'), h('span', { class: 'faint xs', text: '按结算单生成的日期' })),
      Object.keys(byDay).length ? h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
        h('thead', {}, h('tr', {}, ['日期', '次数', '额度', '应付成员', '其中回本·不分成', '我的收入', '未付款'].map((t) => h('th', { text: t })))),
        h('tbody', {}, Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0])).map(([d, x]) => h('tr', {}, h('td', { text: d }), h('td', { class: 'num', text: x.n }), h('td', { class: 'num', text: usd(x.usd) }),
          h('td', { class: 'num', text: cny(x.member) }), h('td', { class: 'num ' + (x.rec ? 'text-warn' : 'faint'), text: x.rec ? cny(x.rec) : '—' }), h('td', { class: 'num text-ok', text: cny(x.admin) }),
          h('td', { class: 'num ' + (x.unpaid > 0.004 ? 'text-warn' : 'faint'), text: x.unpaid > 0.004 ? cny(x.unpaid) : '已付清' })))))) : h('div', { class: 'card-body muted small', text: '还没有结算记录' }));
    // 列表 + 筛选
    let who = 'all', state = 'all';
    const whoIds = [...new Set(settlements.map((s) => s.user_id).filter((x) => x !== null && x !== undefined))];
    const whoSel = h('select', { class: 'select select-sm', style: { width: 'auto' } }, h('option', { value: 'all', text: '全部成员' }), whoIds.map((id) => h('option', { value: id, text: uname(id, (settlements.find((s) => s.user_id === id).lines[0] || {}).username) })));
    whoSel.addEventListener('change', () => { who = whoSel.value; draw(); });
    const seg = h('div', { class: 'seg' });
    const SEGS = [['all', '全部'], ['unpaid', '未付款'], ['paid', '已付款'], ['voided', '已撤销']];
    const paintSeg = () => clear(seg, SEGS.map(([k, l]) => h('button', { type: 'button', class: state === k ? 'on' : '', onclick: () => { state = k; paintSeg(); draw(); } }, l)));
    paintSeg();
    const COLS = ['单号', '成员', '结算区间', '额度', '毛收入', '回本·不分成', '我的收入', '应付成员', '付款', ''];
    const tbody = h('tbody');
    function draw() {
      const listS = settlements.filter((s) => {
        const L = lineOf(s);
        if (who !== 'all' && String(s.user_id) !== who) return false;
        if (state === 'voided') return s.status !== 'active';
        if (s.status !== 'active') return state === 'all';
        if (state === 'unpaid') return L && !L.paid_at;
        if (state === 'paid') return L && L.paid_at;
        return true;
      });
      clear(tbody, listS.length ? listS.flatMap((s) => historyRow(s, lineOf(s), latest[s.user_id] === s.id, st, info, reload, COLS.length))
        : h('tr', {}, h('td', { colspan: String(COLS.length) }, emptyState('没有符合条件的结算单', 'log'))));
    }
    draw();
    const listCard = h('div', { class: 'card' },
      h('div', { class: 'card-head' }, h('h3', { class: 'card-title' }, icon('log'), '结算单'),
        h('div', { class: 'toolbar' }, whoSel, seg, h('button', { class: 'btn btn-secondary btn-sm', type: 'button', onclick: () => exportAll(settlements, info) }, icon('copy', 'icon icon-sm'), '导出 CSV'))),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table responsive' }, h('thead', {}, h('tr', {}, COLS.map((t) => h('th', { text: t })))), tbody)));
    clear(body, stats, dayCard, listCard);
  }

  function historyRow(s, L, isLatest, st, info, reload, ncol) {
    const voided = s.status !== 'active';
    if (!L) return [h('tr', {}, h('td', { colspan: String(ncol), class: 'faint', text: `#${s.id} 没有成员明细` }))];
    const meta = `${s.created_by || ''} 于 ${fmtTime(s.created_at)} 生成${s.note ? ' · 备注：' + s.note : ''}${voided ? ` · ${s.voided_by || ''} 于 ${fmtTime(s.voided_at)} 撤销` : ''}${L.paid_at ? ` · ${L.paid_by || ''} 于 ${fmtTime(L.paid_at)} 标记付款${L.paid_note ? '（' + L.paid_note + '）' : ''}` : ''}`;
    const exp = h('tr', { class: 'exp-row', hidden: true }, h('td', { colspan: String(ncol) }, windowsTable(s.items, info), lineRecovery(L),
      h('div', { class: 'faint xs', style: { marginTop: '6px' }, text: L.description || `毛收入 ${cny(L.gross_cny)} = 回本 ${cny(L.recover_cny)}（不分成） + 参与分成 ${cny(L.shared_cny)}（我抽 ${L.admin_share}%）` }),
      h('div', { class: 'faint xs', style: { marginTop: '3px' }, text: meta })));
    const payBtn = h('button', { class: 'btn btn-xs ' + (L.paid_at ? 'btn-paid' : 'btn-secondary'), type: 'button', disabled: voided, title: L.paid_at ? `${L.paid_by || ''} 于 ${fmtTime(L.paid_at)} 标记${L.paid_note ? '\n备注：' + L.paid_note : ''}` : '标记为已付款' },
      icon(L.paid_at ? 'check' : 'clock', 'icon icon-sm'), L.paid_at ? '已付款' : '未付款');
    payBtn.addEventListener('click', (e) => { e.stopPropagation(); payModal(s, L, st, reload); });
    const ops = h('div', { class: 'row', style: { gap: '4px' } },
      h('button', { class: 'btn btn-ghost btn-xs', type: 'button', title: '导出这张结算单', onclick: (e) => { e.stopPropagation(); downloadCsv(`polo-结算单-${s.id}.csv`, [CSV_HEAD, ...settlementCsvRows(s, info)]); } }, 'CSV'),
      isLatest && !voided && !L.paid_at ? h('button', { class: 'btn btn-ghost btn-xs text-bad', type: 'button', onclick: async (e) => {
        e.stopPropagation();
        if (!(await confirmBox('撤销结算单', `撤销 #${s.id}（${uname(s.user_id, L.username)} ${cny(L.member_cny)}）？撤销后他的结算点退回到这张单之前，这段时间会并入他的下一次结算，回本进度也一起退回。`, { danger: true, okText: '撤销' }))) return;
        try { await api('POST', '/admin/settle/void/' + s.id); toast('已撤销', 'ok'); reload(); } catch (err) { toast(errText(err), 'bad'); }
      } }, '撤销') : null);
    const tr = h('tr', { class: 'click' + (voided ? ' voided-row' : ''), onclick: () => { exp.hidden = !exp.hidden; tr.classList.toggle('open', !exp.hidden); } },
      h('td', { 'data-label': '' }, h('b', { text: `#${s.id}` }), voided ? h('span', { class: 'badge b-gray', style: { marginLeft: '6px' }, text: '已撤销' }) : null, h('div', { class: 'faint xs', text: ago(s.created_at) })),
      h('td', { 'data-label': '成员' }, userName2(s.user_id, L.username), h('div', { class: 'faint xs', text: `${L.accounts} 个号` })),
      h('td', { 'data-label': '区间', class: 'small nowrap' }, h('div', { text: fmtSec(s.start_at) }), h('div', { class: 'faint', text: '→ ' + fmtSec(s.end_at) })),
      h('td', { 'data-label': '额度', class: 'num', title: usd4(L.usd) }, usd(r2(L.usd + L.adjust_usd))),
      h('td', { 'data-label': '毛收入', class: 'num' }, cny(L.gross_cny)),
      h('td', { 'data-label': '回本·不分成', class: 'num ' + (L.recover_cny ? 'text-warn' : 'faint') }, L.recover_cny ? cny(L.recover_cny) : '—'),
      h('td', { 'data-label': '我的抽成', class: 'num' }, cny(L.admin_cny)),
      h('td', { 'data-label': '应付成员', class: 'num' }, h('div', { class: 'money-strong', text: cny(L.member_cny) }), payText(s) ? h('div', { class: 'xs text-info', text: payText(s) }) : null),
      h('td', { 'data-label': '付款' }, payBtn),
      h('td', { 'data-label': '' }, ops));
    return [tr, exp];
  }

  function payModal(s, L, st, reload) {
    const who = uname(s.user_id, L.username);
    if (L.paid_at) {
      confirmBox('取消付款标记', `把 #${s.id}（${who} ${cny(L.member_cny)}）改回“未付款”？`).then(async (ok) => {
        if (!ok) return;
        try { await api('POST', '/admin/settle/paid/' + L.id, { paid: false }); reload(); } catch (err) { toast(errText(err), 'bad'); }
      });
      return;
    }
    const pay = payPicker(st.rates, () => L.member_cny, s.pay_currency === 'USDT' ? { currency: 'USDT', rate: s.usdt_rate, source: s.rate_source, rate_at: s.rate_at } : {});
    const note = h('input', { class: 'input', maxlength: '200', placeholder: '例如：微信转账 / 支付宝单号 / 交易哈希（可选）' });
    modal({ title: `标记已付款 · ${who}`, body: h('div', {}, h('p', {}, `#${s.id} 应付 `, h('b', { class: 'money-strong', text: cny(L.member_cny) })), pay.el, h('div', { style: { marginTop: '10px' } }, field('付款备注', note))),
      actions: [{ label: '取消' }, { label: '标记已付款', kind: 'btn-primary', onClick: async () => {
        const p = pay.get();
        if (!p) { toast('请填写 USDT 汇率', 'bad'); return false; }
        try { await api('POST', '/admin/settle/paid/' + L.id, Object.assign({ paid: true, note: note.value }, p)); toast('已标记', 'ok'); reload(); }
        catch (err) { toast(errText(err), 'bad'); return false; }
      } }] });
  }

  const CSV_HEAD = ['结算单', '成员', '用户名', '生成时间', '开始', '截止', '账号', '邮箱', '账号区间开始', '账号区间截止', '额度(美元)', '调整(美元)', '汇率', '毛收入(人民币)', '成本合计',
    '之前已回本', '本次回本(不分成)', '参与分成', '我的抽成%', '我的抽成(人民币)', '应付成员(人民币)', '还差回本', '付款币种', 'USDT汇率', 'USDT金额', '付款', '状态', '本单说明'];
  function settlementCsvRows(s, info) {
    const L = s.lines[0];
    if (!L) return [];
    const base = [s.id, uname(s.user_id, L.username), L.username, fmtSec(s.created_at), fmtSec(s.start_at), fmtSec(s.end_at)];
    const rows = s.items.map((i) => { const a = info[i.account_key] || {}; return [...base, i.name || a.name || '', a.email || i.account_key || '', i.start_at ? fmtSec(i.start_at) : '', i.end_at ? fmtSec(i.end_at) : '', i.usd, ...Array(17).fill('')]; });
    rows.push([...base, '【合计】', '', '', '', L.usd, L.adjust_usd, s.rate, L.gross_cny, L.cost_total_cny, L.recovered_before_cny, L.recover_cny, L.shared_cny, L.admin_share, L.admin_cny,
      L.member_cny, L.remaining_cny, s.pay_currency || 'CNY', s.usdt_rate || '', s.usdt_amount || '', L.paid_at ? '已付 ' + fmtSec(L.paid_at) + (L.paid_note ? ' ' + L.paid_note : '') : '未付', s.status === 'active' ? '有效' : '已撤销', L.description || '']);
    return rows;
  }
  function exportAll(settlements, info) {
    downloadCsv(`polo-结算-全部-${bjToday()}.csv`, [CSV_HEAD, ...settlements.flatMap((s) => settlementCsvRows(s, info))]);
  }

  // ---------- 归属与设置 ----------
  function teamDateModal(a,reload){
    const tc=a.team_cycle, day=h('input',{class:'input',type:'date',max:tc.first||bjToday(),value:tc.day||''});
    modal({title:'母号日期 · '+(a.name||a.key),body:h('div',{},field('母号首次开号日（北京）',day,'当前：'+tc.source+'。留空恢复自动；公共邮箱需要手动填。'),h('p',{class:'hint',text:'每 30 天一周期，首期与升级差价按剩余天数折算。只影响本号；已确认期间、手改和免除的费用不重算。'})),actions:[{label:'取消'},{label:'保存',kind:'btn-primary',onClick:async()=>{if(!day.reportValidity())return false;try{await api('POST','/admin/settle/team-date',{account_key:a.key,day:day.value||null});toast('母号日期已保存','ok');await reload();}catch(e){toast(errText(e),'bad');return false;}}}]});
  }
  function costPlanModal(a, st, reload) {
    const plan = st.costs.plans.find((p) => p.account_key === a.key);
    const today = bjToday();
    const addDay = a.added_at ? dayOfTs(Math.floor(Date.parse(a.added_at) / 1000)) : today;
    const start = h('input', { class: 'input', type: 'date', max: today, value: plan ? plan.start_day : addDay });
    if (plan && a.team_cycle) start.disabled=true;
    const monthly = h('input', { type: 'checkbox', checked: plan ? !!plan.monthly : st.settings.cost_cycle === 'monthly' });
    const price = SEAT_CN[a.seat] ? `${SEAT_CN[a.seat]}席位 ${cny(st.settings['price_' + a.seat])}` : '还没标席位：金额待定，标上后自动补';
    modal({ title: `${plan ? '修改成本' : '记成本'} · ${a.name || a.key}`,
      body: h('div', {}, h('p', { class: 'muted small', text: (a.team_cycle?'完整 30 天的席位价格：':'每次的金额：')+price }),
        field(a.team_cycle?'席位起算日':'开号日', start, a.team_cycle?'首期按母号剩余天数，后续每 30 天续费。':'从这天起算；每月在对应日期续费'),
        h('label', { class: 'row', style: { gap: '8px', marginBottom: '12px' } }, monthly, h('span', { text: a.team_cycle?'每 30 天续费（归档后停止）':'每月续费（号归档后自动停止）' })),
        plan && !a.team_cycle ? h('div', { class: 'notice n-warn' }, icon('warning'), h('span', { text: '修改开号日或续费方式后，这个号的成本记录会按新设置重新生成（之前的“免除”和手动金额会清掉）。' })) : null),
      actions: [{ label: '取消' }, { label: '保存', kind: 'btn-primary', onClick: async () => {
        try { await api('POST', '/admin/settle/cost-plan', { account_key: a.key, start_day: start.value, monthly: monthly.checked }); toast('已保存', 'ok'); reload(); }
        catch (e) { toast(errText(e), 'bad'); return false; }
      } }] });
  }
  function costPlanStop(a, reload) {
    const go2 = async (purge) => {
      try { await api('POST', '/admin/settle/cost-plan-delete', { account_key: a.key, purge }); toast(purge ? '已删除，这个号不算成本' : '已停止计费', 'ok'); reload(); }
      catch (e) { toast(errText(e), 'bad'); return false; }
    };
    modal({ title: `不再给 ${a.name || a.key} 计成本`, body: h('div', {}, h('p', { text: '“停止以后的续费”：已经记下的成本保留，继续回本。' }), h('p', { text: '“全部删除”：这个号的成本记录全部删掉，等于这个号不算成本。已经结算过的回本不会追回。' })),
      actions: [{ label: '取消' }, { label: '停止以后的续费', kind: 'btn-secondary', onClick: () => go2(false) }, { label: '全部删除', kind: 'btn-danger', onClick: () => go2(true) }] });
  }
  // 换归属：选新成员从什么时候开始算
  function ownerModal(a, uid, st, reload) {
    const spans = st.spans.filter((x) => x.account_key === a.key);
    const open = spans.find((x) => x.to_ts === null);
    let lo = 0;
    for (const x of spans) if (x.to_ts !== null) lo = Math.max(lo, x.to_ts + 1);
    if (open && open.settled_until !== null) lo = Math.max(lo, open.settled_until + 1);
    const now = Math.floor(Date.now() / 1000);
    const added = a.added_at ? Math.floor(Date.parse(a.added_at) / 1000) : null;
    const canAdded = !spans.length && added !== null && !isNaN(added);
    const isNew = canAdded && added >= st.settings.cost_since;
    let mode = isNew ? 'added' : 'now', ok = false;
    const custom = h('input', { class: 'input input-sm mono', type: 'datetime-local', step: '1', value: toBjInput(Math.max(lo, now - 3600)) });
    const radios = [];
    const opt = (k, label, sub, extra) => {
      const r = h('input', { type: 'radio', name: 'own-start', value: k, checked: mode === k, onchange: () => { mode = k; } });
      radios.push(r);
      return h('label', { class: 'radio-row' }, r, h('div', { class: 'grow' }, h('b', { text: label }), sub ? h('div', { class: 'faint xs', text: sub }) : null, extra || null));
    };
    const customRow = opt('custom', '自定义时间（北京时间，精确到秒）', lo ? `最早可选 ${fmtSec(lo)}（不能早于之前的归属或已经结算到的时间），不能晚于现在` : '不能晚于现在', h('div', { style: { marginTop: '6px' } }, custom));
    custom.addEventListener('focus', () => { mode = 'custom'; radios.forEach((r) => { r.checked = r.value === 'custom'; }); });
    const prev = open ? uname(open.user_id) : null;
    modal({ title: `${a.name || a.key} 归给 ${uname(uid)}`, onClose: () => { if (!ok) reload(); },
      body: h('div', {},
        open ? h('div', { class: 'notice n-info' }, icon('info'), h('span', { text: `现在归 ${prev}（自 ${fmtSec(open.from_ts)}${open.settled_until ? `，已结算到 ${fmtSec(open.settled_until)}` : '，还没结算过'}）。${prev} 的归属在新起点的前一秒结束，之前没结算的部分仍然可以给 ${prev} 结算——同一秒只算给一个人，不会重复也不会漏。` })) : null,
        h('div', { class: 'label', style: { margin: '6px 0 8px' }, text: `从什么时候开始算 ${uname(uid)} 的？` }),
        opt('now', '从现在开始', open ? `现在之前的额度仍然算 ${prev} 的` : '现在之前的额度算你自己的'),
        canAdded ? opt('added', `从这个号加入 Polo 时开始（${fmtSec(added)}）`, isNew ? '新开的号默认这样：开号到现在的额度都算给成员' : '这个号加入 Polo 早于成本起算时间，一般是你自己的旧号') : null,
        customRow),
      actions: [{ label: '取消' }, { label: '确定', kind: 'btn-primary', onClick: async () => {
        const d = { account_key: a.key, user_id: uid, start: mode };
        if (mode === 'custom') { d.start_at = fromBjInput(custom.value); if (!d.start_at) { toast('请填写时间', 'bad'); return false; } }
        try { const r = await api('POST', '/admin/settle/owner', d); ok = true; toast(`${a.name || a.key} → ${uname(uid)}，从 ${fmtSec(r.from_ts)} 开始算`, 'ok'); reload(); }
        catch (e) { toast(errText(e) + (e.body && e.body.earliest ? `（最早 ${fmtSec(e.body.earliest)}）` : ''), 'bad'); return false; }
      } }] });
  }

  // 只渲染当前管理员收到的表单。所有标签按纯文本处理，保存仍由受鉴权接口验证。
  function editMemberForm(u,reload) {
    const f=u.form, sel=h('select',{class:'select','aria-label':'结算规则'},f.options.map(x=>h('option',{value:x.key,text:x.name}))), area=h('div');
    const cadence=h('select',{class:'select','aria-label':'结算截止'},h('option',{value:'now',text:'实时（前 2 分钟）'}),h('option',{value:'day',text:'今天结到昨天（北京时间）'}));cadence.value=u.prior_day?'day':'now';
    const detail=h('input',{type:'checkbox',checked:!!u.show_calc});
    sel.value=f.selected;let input;const option=()=>f.options.find(x=>x.key===sel.value);
    const draw=()=>{const x=option();input=h('input',{class:'input',type:'number',min:x.min,max:x.max,step:x.step,required:!x.optional,value:x.value??''});clear(area,field(x.label,input,x.hint));};
    sel.addEventListener('change',draw);draw();
    modal({title:f.title,body:h('div',{},field('结算规则',sel),area,h('label',{class:'row'},detail,'向此成员显示自己的结算计算过程（默认关闭）'),field('结算截止',cadence,'结到昨天 23:59:59，保留今天的用量和调整；只影响这位成员，不会自动付款。'),h('p',{class:'hint',text:f.note})),actions:[{label:'取消'},{label:'保存规则',kind:'btn-primary',onClick:async()=>{
      if(!input.reportValidity())return false; const x=option();try{await api('POST','/admin/settle/'+encodeURIComponent(f.action),{user_id:u.id,mode:x.key,show_calc:detail.checked,prior_day:cadence.value==='day',[x.field]:input.value===''?null:Number(input.value)});toast('已保存','ok');await reload();}catch(e){toast(errText(e),'bad');return false;}
    }}]});
  }
  async function settleSettings(body) {
    const st = await api('GET', '/admin/settle/state');
    rememberUsers(st.users);
    const s = st.settings;
    const reload = () => settleSettings(body);
    const users = st.users.filter((u) => u.status !== 'pending');
    // 结算参数
    const rate = h('input', { class: 'input', type: 'number', step: '0.01', min: '0', value: s.rate });
    const share = h('input', { class: 'input', type: 'number', step: '1', min: '0', max: '100', value: s.default_share });
    const from = h('input', { class: 'input', type: 'date', value: s.stats_from });
    const pp = h('input', { class: 'input', type: 'number', step: '1', min: '0', value: s.price_premium });
    const ps = h('input', { class: 'input', type: 'number', step: '1', min: '0', value: s.price_standard });
    const cyc = h('select', { class: 'select' }, h('option', { value: 'monthly', text: '每月续费都算', selected: s.cost_cycle === 'monthly' }), h('option', { value: 'once', text: '只算一次', selected: s.cost_cycle === 'once' }));
    const src = h('select', { class: 'select' }, Object.keys(RATE_LABEL).filter((k) => k !== 'manual').map((k) => {
      const x = st.rates.sources[k];
      return h('option', { value: k, selected: s.usdt_source === k, text: `${RATE_LABEL[k]}${x ? ' ' + x.rate : ''}` });
    }));
    const saveBtn = h('button', { class: 'btn btn-primary btn-sm', type: 'button' }, '保存参数');
    saveBtn.addEventListener('click', async () => {
      const d = { rate: Number(rate.value), default_share: Number(share.value), stats_from: from.value, price_premium: Number(pp.value), price_standard: Number(ps.value), cost_cycle: cyc.value, usdt_source: src.value };
      try { await api('POST', '/admin/settle/settings', d); toast('已保存', 'ok'); reload(); } catch (e) { toast(errText(e), 'bad'); }
    });
    const params = h('div', { class: 'card', style: { marginBottom: '16px' } },
      h('div', { class: 'card-head' }, h('h3', { class: 'card-title' }, icon('cog'), '结算参数'), saveBtn),
      h('div', { class: 'card-body grid-4' },
        field('汇率（人民币 / 美元）', rate, '每 1 美元额度换算多少人民币；改动从下一次结算起生效'),
        field('默认抽成（%）', share, '回本以后你拿的比例；成员拿剩下的。每个成员可单独设置'),
        field('USDT 默认汇率来源', src, '结算时默认用哪个价格把人民币换成 USDT；每次结算时还可以改'),
        field('统计从', from, '从这天起补算每天每个号的额度（统计看板用）'),
        field('高级号成本（人民币）', pp, '每次开号 / 续费记多少；只影响之后新记的成本'),
        field('标准号成本（人民币）', ps, '同上'),
        field('新号成本方式', cyc, `${fmtSec(s.cost_since)} 之后加入 Polo 的号，归给成员时自动记成本`)));
    // 成员分成
    const owned = {};
    for (const a of st.accounts) if (a.owner) owned[a.owner] = (owned[a.owner] || 0) + 1;
    const shareRows = users.map((u) => {
      if (u.form) {
        const f=u.form, choice=f.options.find(x=>x.key===f.selected);
        const btn=h('button',{class:'btn btn-secondary btn-xs',type:'button',text:'设置',onclick:()=>editMemberForm(u,reload)});
        return h('tr',{},h('td',{'data-label':'成员'},userName2(u.id)),h('td',{'data-label':'归属账号',text:owned[u.id]||0}),
          h('td',{'data-label':'当前规则'},choice?.name || '—',h('div',{class:'faint xs',text:u.prior_day?'结到昨天':'实时结算'})),h('td',{'data-label':'参数'},choice?.value == null ? '默认' : choice.label+'：'+choice.value),h('td',{},btn));
      }
      const inp = h('input', { class: 'input input-sm', type: 'number', min: '0', max: '100', step: '1', style: { width: '90px' }, value: u.admin_share === null ? '' : u.admin_share, placeholder: String(s.default_share) });
      const out = h('span', { class: 'muted small' });
      const paint = () => { const v = inp.value === '' ? s.default_share : Number(inp.value); out.textContent = `回本后成员得 ${r2(100 - v)}%（每 $1 得 ${cny(s.rate * (100 - v) / 100)}）`; };
      inp.addEventListener('input', paint); paint();
      const save = h('button', { class: 'btn btn-secondary btn-xs', type: 'button', onclick: async () => {
        try { await api('POST', '/admin/settle/share', { user_id: u.id, admin_share: inp.value === '' ? null : Number(inp.value) }); toast(`已保存 ${nameOf(u)} 的分成`, 'ok'); } catch (e) { toast(errText(e), 'bad'); }
      } }, '保存');
      return h('tr', {}, h('td', { 'data-label': '' }, userName2(u.id), u.role === 'admin' ? h('span', { class: 'chip', style: { marginLeft: '6px' }, text: '管理员' }) : null, u.status === 'disabled' ? h('span', { class: 'chip', style: { marginLeft: '6px' }, text: '已停用' }) : null),
        h('td', { 'data-label': '归属账号', class: 'num', text: owned[u.id] || 0 }), h('td', { 'data-label': '我的抽成' }, h('div', { class: 'row' }, inp, h('span', { class: 'faint small', text: '%' }), h('span', { class: 'm-only' }, save))),
        h('td', { 'data-label': '', class: 'wide' }, out), h('td', { 'data-label': '', class: 'd-only' }, save.cloneNode(true)));
    });
    // 电脑上用最后一列的“保存”，手机上用输入框旁边的“保存”（cloneNode 不带事件，补上）
    for (const tr of shareRows) { const [a, b] = tr.querySelectorAll('button'); if (a && b) b.addEventListener('click', () => a.click()); }
    const shares = h('div', { class: 'card', style: { marginBottom: '16px' } },
      h('div', { class: 'card-head' }, h('h3', { class: 'card-title' }, icon('users'), '成员结算规则'), h('span', { class: 'faint xs', text: '修改对该成员的整期待结额度生效，已确认单据不变。' })),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table responsive' }, h('thead', {}, h('tr', {}, ['成员', '归属账号', '当前规则', '参数', ''].map((t) => h('th', { text: t })))), h('tbody', {}, shareRows))));
    // 账号归属与成本
    const fill = h('button', { class: 'btn btn-secondary btn-sm', type: 'button', onclick: async () => {
      if (!(await confirmBox('按可见账号一键填充', '只有一位成员能看到、且还没设置归属的号，会归给这位成员。旧号从现在开始算，新号从加入 Polo 时开始算。', { okText: '填充' }))) return;
      try { const r = await api('POST', '/admin/settle/owner-fill'); toast(r.filled ? `已按可见账号填充 ${r.filled} 个` : '没有可以自动填充的（只填“只有一位成员能看到”且未设置归属的号）', r.filled ? 'ok' : 'info'); reload(); } catch (e) { toast(errText(e), 'bad'); }
    } }, icon('users', 'icon icon-sm'), '按可见账号一键填充');
    const STATUS = { active: ['b-ok', '在池'], archived: ['b-gray', '已归档'], gone: ['b-gray', '已移除'], unknown: ['b-warn', '待确认'] };
    const known = st.accounts.filter((a) => a.status === 'active' || a.status === 'archived');
    const plans = Object.fromEntries(st.costs.plans.map((p) => [p.account_key, p]));
    const spansOf = {};
    for (const x of st.spans) (spansOf[x.account_key] = spansOf[x.account_key] || []).push(x);
    const ownRows = st.accounts.map((a) => {
      const sel = h('select', { class: 'select select-sm', style: { width: 'auto', minWidth: '140px' } }, h('option', { value: '', text: '未归属（我自己的）', selected: !a.owner }),
        users.map((u) => h('option', { value: u.id, text: nameOf(u), selected: a.owner === u.id })));
      sel.addEventListener('change', async () => {
        if (sel.value === '') {
          const ok = await confirmBox('改回未归属', `${a.name || a.key} 从现在起算你自己的。${a.owner ? uname(a.owner) + ' 在这之前没结算的部分，仍然可以给他结算。' : ''}`, { okText: '改回未归属' });
          if (!ok) return reload();
          try { await api('POST', '/admin/settle/owner', { account_key: a.key, user_id: null }); toast(`${a.name || a.key} → 未归属`, 'ok'); } catch (e) { toast(errText(e), 'bad'); }
          return reload();
        }
        ownerModal(a, Number(sel.value), st, reload);
      });
      const sp = (spansOf[a.key] || []).slice().sort((x, y) => y.from_ts - x.from_ts);
      const open = sp.find((x) => x.to_ts === null);
      const hist = h('div', { class: 'span-hist' },
        open ? h('div', { class: 'xs faint', text: `自 ${fmtSec(open.from_ts).slice(0, 16)} 起${open.settled_until ? ` · 已结算到 ${fmtSec(open.settled_until).slice(5, 16)}` : ' · 还没结算过'}` }) : null,
        sp.filter((x) => x.to_ts !== null).slice(0, 3).map((x) => h('div', { class: 'xs faint', text: `之前：${uname(x.user_id)} ${fmtSec(x.from_ts).slice(5, 16)} → ${fmtSec(x.to_ts).slice(5, 16)}${x.settled_until !== null && x.settled_until >= x.to_ts ? ' · 已结清' : ' · 有未结部分'}` })));
      let mapCtl = null;
      if (a.status === 'unknown' && a.uuids.length) {
        const mapSel = h('select', { class: 'select select-sm', style: { width: 'auto' } }, h('option', { value: '', text: '选择对应的邮箱…' }), known.map((k) => h('option', { value: k.key, text: `${k.name} · ${k.email || k.key}` })));
        mapSel.addEventListener('change', async () => { if (!mapSel.value) return; try { await api('POST', '/admin/settle/map', { uuid: a.uuids[0], account_key: mapSel.value }); toast('已对应', 'ok'); reload(); } catch (e) { toast(errText(e), 'bad'); } });
        mapCtl = h('div', { style: { marginTop: '6px' } }, mapSel);
      }
      const p = plans[a.key];
      let cost;
      if (p) {
        const each = a.seat ? cny(s['price_' + a.seat]) : '待定';
        cost = h('div', {}, h('div', { class: 'small', text: `${p.monthly ? (a.team_cycle?'每30天':'每月') : '一次性'} ${each} · ${p.start_day} 起` }),
          p.user_id !== a.owner ? h('div', { class: 'text-warn xs', text: `记在 ${uname(p.user_id)} 名下` }) : null,
          h('div', { class: 'row', style: { gap: '4px', marginTop: '3px' } },
            h('button', { class: 'btn btn-ghost btn-xs', type: 'button', onclick: () => costPlanModal(a, st, reload) }, '修改'),
            h('button', { class: 'btn btn-ghost btn-xs', type: 'button', onclick: () => costPlanStop(a, reload) }, '不计成本')));
      } else if (a.owner) {
        cost = h('div', {}, h('span', { class: 'faint small', text: '不计成本' }), h('button', { class: 'btn btn-ghost btn-xs', type: 'button', style: { marginLeft: '6px' }, onclick: () => costPlanModal(a, st, reload) }, '记成本'));
      } else cost = h('span', { class: 'faint', text: '—' });
      if(a.team_cycle) cost=h('div',{},cost,h('div',{class:'faint xs',text:'母号：'+(a.team_cycle.day||'日期待定')+' · '+a.team_cycle.source}),h('button',{class:'btn btn-ghost btn-xs',type:'button',onclick:()=>teamDateModal(a,reload)},'设置母号日期'));
      const [bc, bt] = STATUS[a.status] || ['b-gray', a.status];
      return h('tr', {}, h('td', { 'data-label': '' }, acctLabel(a.key, { [a.key]: Object.assign({}, a, { status: '' }) }, a.name), mapCtl),
        h('td', { 'data-label': '状态' }, h('span', { class: 'badge ' + bc, text: bt }), a.seat ? h('div', { class: 'faint xs', style: { marginTop: '3px' }, text: SEAT_CN[a.seat] + '席位' }) : null),
        h('td', { 'data-label': '能看到的成员', class: 'small' }, a.visible.length ? a.visible.map(unameByLogin).join('、') : h('span', { class: 'faint', text: '—' })),
        h('td', { 'data-label': '结算归属', class: 'wide' }, sel, hist), h('td', { 'data-label': '成本', class: 'wide' }, cost));
    });
    const owners = h('div', { class: 'card', style: { marginBottom: '16px' } },
      h('div', { class: 'card-head' }, h('div', {}, h('h3', { class: 'card-title' }, icon('server'), '账号归属与成本'),
        h('div', { class: 'faint xs', text: '每个号按时间段归属：换成员时选新成员从哪一秒开始算，旧成员到前一秒为止，各自结算，不重复不遗漏。归属和“可见账号”是分开设置的。新号归给成员时自动记成本，已有的号默认不计（可点“记成本”）。' })), fill),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table responsive' }, h('thead', {}, h('tr', {}, ['账号', '状态', '能看到的成员', '结算归属', '成本'].map((t) => h('th', { text: t })))), h('tbody', {}, ownRows))));
    const ledger = h('div', { class: 'card' },
      h('div', { class: 'card-head' }, h('h3', { class: 'card-title' }, icon('dollar'), '成本记录'), h('span', { class: 'faint xs', text: '首期、续费及升级补差分别记录；Team 按母号的 30 天周期计费。' })),
      h('div', { class: 'card-body' }, chargesTable(st.costs.charges, { admin: true, reload })));
    clear(body, params, shares, owners, ledger);
  }

  // ============================================================
  // 我的收益（成员）
  // ============================================================
  // 服务器给出每一块显示什么（kpis 概览卡片 / tiles 账号卡片 / chart 图表 / steps 计算步骤 / progress 进度条 / 表格），金额都是写好的文字；
  // 这里只按类型画，不做任何结算计算。half: true 的相邻两块在宽屏上并排。
  const RP_ICON = { clock: 'clock', check: 'check', chart: 'chart', trend: 'trend', dollar: 'dollar' };
  const RP_TONE = { ok: ['#34d399', '#10b981'], warn: ['#fbbf24', '#f59e0b'], bad: ['#f87171', '#ef4444'], blue: ['#60a5fa', '#3b82f6'], purple: ['#a78bfa', '#8b5cf6'] };
  function rpHead(s, ic) {
    return h('div', { class: 'card-head' }, h('div', {}, h('h3', { class: 'card-title' }, ic ? icon(ic) : null, s.title), s.note ? h('div', { class: 'faint xs rp-note', text: s.note }) : null));
  }
  function rpTable(s) {
    return h('section', { class: 'card rp-card' }, h('div', { class: 'card-head' }, h('h3', { class: 'card-title', text: s.title })),
      s.note ? h('div', { class: 'card-body muted small', text: s.note }) : null, (s.rows || []).length ? h('div', { class: 'table-wrap' }, h('table', { class: 'table responsive' },
        h('thead', {}, h('tr', {}, s.columns.map((t) => h('th', { text: t })))), h('tbody', {}, s.rows.map((row) => h('tr', {}, row.map((v, i) => h('td', { 'data-label': s.columns[i], text: v ?? '—' }))))))) : h('div', { class: 'card-body muted small', text: '暂无记录' }));
  }
  function rpChart(s, later) {
    const el = h('div', { class: 'chart' + (s.kind === 'stack' && !s.half ? ' rp-chart-wide' : '') });
    later.push(() => {
      const t = chartTheme(), E = window.echarts, ch = mkChart(el);
      const f = s.unit === '¥' ? cny : s.unit === '$' ? usd : (v) => String(v), sh = s.unit === '¥' ? shortCny : s.unit === '$' ? shortUsd : (v) => String(v);
      const col = (x, i) => RP_TONE[x.tone] || [PALETTE[i % PALETTE.length], PALETTE[i % PALETTE.length]];
      if (s.kind === 'pie') {
        const data = s.x.map((n, i) => ({ name: n, value: s.series[0].data[i], itemStyle: { color: PALETTE[i % PALETTE.length] } })).filter((d) => d.value > 0);
        ch.setOption(Object.assign(baseOpt(t), {
          legend: Object.assign(baseOpt(t).legend, { top: 'auto', bottom: 0 }),
          tooltip: Object.assign(baseOpt(t).tooltip, { trigger: 'item', formatter: (p) => `<div class="ct-title">${escHtml(p.name)}</div><div class="ct-row"><i class="ct-dot ${dotCls(p.color)}"></i><span>${escHtml(s.series[0].name)}</span><b>${escHtml(f(p.value))}</b></div><div class="ct-row"><span>占比</span><b>${p.percent}%</b></div>` }),
          title: s.center ? { text: s.center, subtext: s.center_sub || '', left: 'center', top: '36%', textStyle: { color: t.strong, fontSize: 18, fontWeight: 750 }, subtextStyle: { color: t.muted, fontSize: 11 } } : undefined,
          series: [{ type: 'pie', radius: ['50%', '74%'], center: ['50%', '45%'], avoidLabelOverlap: true, padAngle: 2, itemStyle: { borderRadius: 8, borderColor: t.card, borderWidth: 2 },
            label: { show: false }, emphasis: { scale: true, scaleSize: 6, label: { show: false } }, data, animationType: 'expansion' }],
        }));
        return;
      }
      const stack = s.kind === 'stack', many = s.x.length > 4;
      ch.setOption(Object.assign(baseOpt(t), {
        tooltip: Object.assign(baseOpt(t).tooltip, { formatter: axisTip({ _: f }, { total: stack && s.series.length > 1 ? (s.total || '合计') : null }) }),
        xAxis: axisX(t, s.x, { axisLabel: { color: t.muted, fontSize: 11, hideOverlap: true, interval: stack ? 'auto' : 0, rotate: !stack && many && isPhone() ? 30 : 0 } }),
        yAxis: axisY(t, sh),
        series: s.series.map((x, i) => ({ name: x.name, type: 'bar', stack: stack ? 'a' : undefined, data: x.data, barMaxWidth: stack ? 28 : 26, barGap: '18%',
          itemStyle: { color: grad(E, col(x, i)[0], col(x, i)[1]), borderRadius: stack ? 0 : [6, 6, 0, 0] }, emphasis: { focus: 'series' }, animationDelay: (k) => k * 40 })),
      }));
    });
    return h('div', { class: 'card chart-card rp-card' }, rpHead(s, s.kind === 'pie' ? 'cube' : s.unit === '¥' ? 'dollar' : 'chart'), h('div', { class: 'card-body chart-body' }, el));
  }
  function rpTiles(s) {
    const bar = (b) => {
      if (!b) return null;
      // 有 pend：回本进度条（和管理员页一致；现在按可结算收入算，服务器把还没结算的也并进 pct，pend 为 0）
      const track = b.pct === null || b.pct === undefined ? null : b.pend !== undefined
        ? (() => { const i1 = h('i', { class: 'done' }), i2 = h('i', { class: 'pend' }); i1.style.width = Math.max(0, Math.min(100, b.pct)) + '%'; i2.style.width = Math.max(0, Math.min(100 - b.pct, b.pend)) + '%'; return h('div', { class: 'rbar' }, i1, i2); })()
        : (() => { const i = h('i', { class: 'rp-fill rp-f-' + (b.tone || 'blue') }); i.style.width = Math.max(0, Math.min(100, b.pct)) + '%'; return h('div', { class: 'rp-track' }, i); })();
      return h('div', { class: 'rp-t-bar' }, track, h('span', { text: b.text || '' }));
    };
    return h('section', { class: 'card rp-card' }, rpHead(s, 'server'), h('div', { class: 'card-body' }, (s.tiles || []).length ? h('div', { class: 'rp-tiles' }, s.tiles.map((x) => h('div', { class: 'rp-tile' },
      h('div', { class: 'rp-t-head' }, h('b', { class: 'rp-t-name', text: x.title, title: x.title }),
        x.badge ? h('span', { class: 'seat ' + (x.badge === '高级' ? 'seat-premium' : 'seat-standard'), text: x.badge }) : null,
        x.tag ? h('span', { class: 'chip' + (x.tag === '在用' ? ' chip-ok' : ''), text: x.tag }) : null),
      x.sub ? h('div', { class: 'rp-t-sub', text: x.sub }) : null,
      h('div', { class: 'rp-t-stats' }, (x.stats || []).map(([l, v, tone]) => h('div', {}, h('small', { text: l }), h('b', { class: tone ? 'text-' + tone : '', text: v })))),
      bar(x.bar)))) : h('div', { class: 'muted small', text: '还没有分给你的号' })));
  }
  function rpSteps(s) {
    return h('section', { class: 'card rp-card' }, rpHead(s, 'log'), h('div', { class: 'card-body' }, h('div', { class: 'calc', style: { margin: 0 } },
      (s.rows || []).map(([l, v, sub, tone]) => h('div', { class: 'calc-row' + (tone ? ' ' + tone : '') }, h('div', {}, h('span', { text: l }), sub ? h('small', { text: sub }) : null), h('b', { text: v }))))));
  }
  function rpProgress(s) {
    const total = s.total || 0, track = h('div', { class: 'rbar rp-big' });
    let used = 0;
    for (const p of s.parts || []) {
      const w = total > 0 ? Math.max(0, Math.min(100 - used, (p.value / total) * 100)) : 0;
      const i = h('i', { class: p.tone === 'pend' ? 'pend' : 'done', title: p.label });
      i.style.width = w + '%'; used += w; track.append(i);
    }
    return h('section', { class: 'card rp-card' }, rpHead(Object.assign({}, s, { note: '' }), 'trend'), h('div', { class: 'card-body' }, track,
      h('div', { class: 'rp-legend' }, (s.rows || []).map(([l, v, dot], i) => h('div', {}, h('small', {}, h('i', { class: 'rp-dot rp-' + (/^d\d$/.test(dot || '') ? dot : 'd' + i) }), l), h('b', { text: v })))),
      s.note ? h('p', { class: 'hint', style: { marginTop: '12px' }, text: s.note }) : null));
  }
  function reportSections(sections, later = []) {
    const one = (s) => {
      if (s.type === 'kpis') return h('div', { class: 'stats rp-kpis' }, (s.items || []).map((x) => statCard(x.label, x.value, RP_ICON[x.icon] || 'chart', x.tone || 'blue', x.sub)));
      if (s.type === 'tiles') return rpTiles(s);
      if (s.type === 'chart') return rpChart(s, later);
      if (s.type === 'steps') return rpSteps(s);
      if (s.type === 'progress') return rpProgress(s);
      return rpTable(s);
    };
    const out = [];
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i], n = sections[i + 1];
      if (s.half && n && n.half) { out.push(h('div', { class: 'chart-grid rp-pair' }, one(s), one(n))); i++; } else out.push(one(s));
    }
    return out;
  }
  async function pageEarnings() {
    const { main } = appLayout({ active: '#/earnings', title: '我的收益', desc: '你名下账号贡献的额度与结算收入' });
    const body = h('div', { class: 'rp-page' }, h('div', { class: 'stats' }, skeletonStats(4)));
    main.append(body);
    let r;
    try { r = await api('GET', '/me/earnings'); } catch (e) { clear(body, emptyState(errText(e), 'warning')); return; }
    if (!Array.isArray(r.presentation)) { clear(body, emptyState('收益数据暂不可用，请稍后刷新', 'clock')); return; }
    let later = [], sig = '';
    const draw = () => { disposeCharts(); later.forEach((fn) => fn()); };
    const show = async (p) => {
      sig = JSON.stringify(p); later = [];
      clear(body, reportSections(p, later));
      if (!later.length) return;
      try { await loadECharts(); } catch { return; }
      if (!body.isConnected) return;
      S.onTheme = draw;
      draw();
    };
    await show(r.presentation);
    // 每分钟自动取一次（本期预估服务器每 15 分钟更新），内容变了才重画，滚动位置不动
    autoRefresh(async () => {
      const n = await api('GET', '/me/earnings');
      if (!body.isConnected || !Array.isArray(n.presentation) || JSON.stringify(n.presentation) === sig) return;
      const y = window.scrollY;
      await show(n.presentation);
      window.scrollTo(0, y);
    }, 60000);
  }

  // ============================================================
  // 统计看板（管理员）
  // ============================================================
  let echartsP = null;
  function loadECharts() {
    if (window.echarts) return Promise.resolve(window.echarts);
    if (!echartsP) {
      echartsP = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'vendor/echarts-6.1.0.min.js';
        s.onload = () => (window.echarts ? resolve(window.echarts) : reject(new Error('echarts')));
        s.onerror = () => { echartsP = null; s.remove(); reject(new ApiError(0, 'chart_load_failed')); };
        document.head.append(s);
      });
    }
    return echartsP;
  }
  ERR.chart_load_failed = '图表组件加载失败，请刷新页面';
  const PALETTE = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#84cc16', '#f97316', '#a855f7', '#0ea5e9', '#94a3b8'];
  const escHtml = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function chartTheme() {
    const cs = getComputedStyle(document.documentElement);
    const dark = document.documentElement.classList.contains('dark');
    const v = (k, d) => cs.getPropertyValue(k).trim() || d;
    return { dark, text: v('--text-2', '#334155'), strong: v('--text', '#0f172a'), muted: v('--muted', '#64748b'), border: dark ? 'rgba(148,163,184,.14)' : 'rgba(148,163,184,.28)', tipBg: dark ? 'rgba(15,23,42,.94)' : 'rgba(255,255,255,.97)', card: dark ? '#0f172a' : '#ffffff' };
  }
  const dotCls = (c) => { const x = typeof c === 'string' ? c : c && c.colorStops ? c.colorStops[0].color : ''; const i = PALETTE.indexOf(x); return i >= 0 ? 'cd' + i : 'cdx'; };
  function axisTip(fmt, { max = 12, total = null } = {}) {
    return (ps) => {
      ps = Array.isArray(ps) ? ps : [ps];
      if (!ps.length) return '';
      const items = ps.filter((p) => typeof p.value === 'number' && Math.abs(p.value) > 1e-9);
      items.sort((a, b) => (b.seriesType === 'line') - (a.seriesType === 'line') || b.value - a.value);
      let html = `<div class="ct-title">${escHtml(ps[0].axisValueLabel || ps[0].name || '')}</div>`;
      for (const p of items.slice(0, max)) html += `<div class="ct-row"><i class="ct-dot ${dotCls(p.color)}"></i><span>${escHtml(p.seriesName)}</span><b>${escHtml((fmt[p.seriesName] || fmt._)(p.value))}</b></div>`;
      if (items.length > max) html += `<div class="ct-more">还有 ${items.length - max} 项</div>`;
      if (total) { const sum = items.filter((p) => p.seriesType === 'bar').reduce((a, p) => a + p.value, 0); html += `<div class="ct-row ct-total"><span>${escHtml(total)}</span><b>${escHtml(fmt._(sum))}</b></div>`; }
      if (!items.length) html += '<div class="ct-more">没有数据</div>';
      return html;
    };
  }
  function baseOpt(t) {
    const anim = !reduceMotion();
    return {
      animation: anim, animationDuration: 1000, animationEasing: 'cubicOut', animationDurationUpdate: 500,
      textStyle: { fontFamily: getComputedStyle(document.body).fontFamily, color: t.text },
      grid: { left: 8, right: 14, top: 40, bottom: 6, containLabel: true },
      tooltip: { trigger: 'axis', confine: true, backgroundColor: t.tipBg, borderColor: t.border, borderWidth: 1, padding: [10, 12], textStyle: { color: t.text, fontSize: 12 },
        extraCssText: 'border-radius:12px;box-shadow:0 10px 30px rgba(15,23,42,.18);', axisPointer: { type: 'shadow', shadowStyle: { color: t.dark ? 'rgba(148,163,184,.08)' : 'rgba(59,130,246,.06)' } } },
      legend: { type: 'scroll', top: 0, left: 0, right: 0, textStyle: { color: t.muted, fontSize: 11 }, icon: 'roundRect', itemWidth: 10, itemHeight: 10, itemGap: 12, pageIconColor: t.muted, pageIconInactiveColor: t.border, pageTextStyle: { color: t.muted } },
    };
  }
  const axisX = (t, data, extra) => Object.assign({ type: 'category', data, axisLine: { lineStyle: { color: t.border } }, axisTick: { show: false }, axisLabel: { color: t.muted, fontSize: 11 } }, extra || {});
  const axisY = (t, fmt, extra) => Object.assign({ type: 'value', splitLine: { lineStyle: { color: t.border, type: 'dashed' } }, axisLabel: { color: t.muted, fontSize: 11, formatter: fmt } }, extra || {});
  const shortUsd = (v) => (Math.abs(v) >= 1000 ? '$' + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : '$' + Math.round(v));
  const shortCny = (v) => (Math.abs(v) >= 10000 ? '¥' + (v / 10000).toFixed(1) + '万' : '¥' + Math.round(v));
  function grad(e, c1, c2, horizontal) { return new e.graphic.LinearGradient(0, 0, horizontal ? 1 : 0, horizontal ? 0 : 1, [{ offset: 0, color: c1 }, { offset: 1, color: c2 }]); }
  function countUp(el, to, fmt, ms = 900) {
    if (reduceMotion() || !isFinite(to)) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = (t) => { if (!el.isConnected && t - t0 > 50) return; const k = Math.min(1, (t - t0) / ms); el.textContent = fmt(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function deltaChip(cur, prev) {
    if (!prev || !isFinite(prev) || prev <= 0) return null;
    const p = ((cur - prev) / prev) * 100;
    return h('span', { class: 'delta ' + (p >= 0 ? 'up' : 'down'), title: '和上一个同样长度的时间段比' }, (p >= 0 ? '↑ ' : '↓ ') + Math.abs(p).toFixed(1) + '%');
  }
  function kpiCard(label, value, fmt, iconName, tone, { delta, sub, tip } = {}) {
    const v = h('div', { class: 'stat-value' });
    const card = h('div', { class: 'card stat kpi', title: tip || '' }, h('div', { class: 'stat-icon si-' + tone }, icon(iconName)),
      h('div', { style: { minWidth: 0 } }, h('div', { class: 'stat-label', text: label }), v, h('div', { class: 'stat-sub' }, delta || null, sub ? h('span', { text: sub }) : null)));
    countUp(v, value, fmt);
    return card;
  }
  function sparkline(vals) {
    const ns = 'http://www.w3.org/2000/svg', W = 96, H = 26;
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'spark');
    const max = Math.max(...vals, 0.0001), n = vals.length;
    if (n < 2) return svg;
    const pts = vals.map((v, i) => `${((i / (n - 1)) * W).toFixed(1)},${(H - 2 - (v / max) * (H - 4)).toFixed(1)}`);
    const area = document.createElementNS(ns, 'path'); area.setAttribute('d', `M0,${H} L${pts.join(' L')} L${W},${H} Z`); area.setAttribute('class', 'spark-area');
    const line = document.createElementNS(ns, 'polyline'); line.setAttribute('points', pts.join(' ')); line.setAttribute('class', 'spark-line');
    svg.append(area, line);
    return svg;
  }
  function presetRange(k, min) {
    const t = bjToday();
    const dow = (new Date(t + 'T00:00:00Z').getUTCDay() + 6) % 7;
    const first = t.slice(0, 8) + '01';
    switch (k) {
      case 'today': return [t, t];
      case 'yesterday': return [addDays(t, -1), addDays(t, -1)];
      case 'week': return [addDays(t, -dow), t];
      case 'lastweek': return [addDays(t, -dow - 7), addDays(t, -dow - 1)];
      case 'lastmonth': { const e = addDays(first, -1); return [e.slice(0, 8) + '01', e]; }
      case '7d': return [addDays(t, -6), t];
      case '30d': return [addDays(t, -29), t];
      case 'all': return [min && min > addDays(t, -399) ? min : addDays(t, -399), t];
      default: return [first, t];
    }
  }

  async function pageStats() {
    const { main } = appLayout({ active: '#/admin/stats', title: '统计看板', desc: '每个账号每天跑了多少额度、带来多少收入和利润' });
    let preset = localStorage.getItem('polo_stats_preset') || 'month';
    let range = preset === 'custom' ? (JSON.parse(localStorage.getItem('polo_stats_custom') || 'null') || presetRange('month')) : presetRange(preset, localStorage.getItem('polo_stats_min'));
    let ownerF = ['all', 'own', 'members'].includes(localStorage.getItem('polo_stats_scope')) ? localStorage.getItem('polo_stats_scope') : 'all', trendMode = localStorage.getItem('polo_stats_trend') || 'account', pieMode = 'account', sortKey = 'usd', sortDir = -1, data = null, seq = 0;
    const PRESETS = [['today', '今天'], ['yesterday', '昨天'], ['week', '本周'], ['lastweek', '上周'], ['month', '本月'], ['lastmonth', '上月'], ['7d', '近 7 天'], ['30d', '近 30 天'], ['all', '全部']];
    const seg = h('div', { class: 'seg seg-wrap' });
    const fIn = h('input', { class: 'input input-sm', type: 'date', max: bjToday() });
    const tIn = h('input', { class: 'input input-sm', type: 'date', max: bjToday() });
    const ownerSel = h('select', { class: 'select select-sm', style: { width: 'auto' } }, h('option', { value: '', text: '按成员…' }));
    const scopeSeg = h('div', { class: 'seg seg-scope' });
    const SCOPES = [['all', '全部（号池）'], ['own', '仅我的号'], ['members', '仅成员号']];
    const paintScope = () => {
      clear(scopeSeg, SCOPES.map(([k, l]) => h('button', { type: 'button', class: ownerF === k ? 'on' : '', onclick: () => { ownerF = k; localStorage.setItem('polo_stats_scope', k); ownerSel.value = ''; paintScope(); if (data) draw(); } }, l)));
      ownerSel.classList.toggle('on', !SCOPES.some(([k]) => k === ownerF));
    };
    paintScope();
    const reloadBtn = h('button', { class: 'btn btn-secondary btn-sm btn-icon', type: 'button', title: '重新加载', 'aria-label': '重新加载' }, icon('refresh', 'icon icon-sm'));
    const info2 = h('div', { class: 'faint xs' });
    const bar = h('div', { class: 'card stats-bar' }, h('div', { class: 'stats-bar-in' }, seg,
      h('div', { class: 'row wrap', style: { gap: '6px' } }, fIn, h('span', { class: 'faint', text: '→' }), tIn, reloadBtn)),
      h('div', { class: 'row wrap stats-scope' }, h('span', { class: 'label', text: '统计范围' }), scopeSeg, ownerSel), info2);
    const body = h('div', { class: 'stats-body' }, h('div', { class: 'stats' }, skeletonStats(4)));
    append(main, bar, body);
    const paintSeg = () => clear(seg, PRESETS.map(([k, l]) => h('button', { type: 'button', class: preset === k ? 'on' : '', onclick: () => { preset = k; localStorage.setItem('polo_stats_preset', k); range = presetRange(k, localStorage.getItem('polo_stats_min')); load(); } }, l)));
    const onDate = () => {
      if (!fIn.value || !tIn.value) return;
      range = fIn.value <= tIn.value ? [fIn.value, tIn.value] : [tIn.value, fIn.value];
      preset = 'custom'; localStorage.setItem('polo_stats_preset', 'custom'); localStorage.setItem('polo_stats_custom', JSON.stringify(range)); load();
    };
    fIn.addEventListener('change', onDate); tIn.addEventListener('change', onDate);
    ownerSel.addEventListener('change', () => { if (!ownerSel.value) return; ownerF = ownerSel.value; paintScope(); draw(); });
    reloadBtn.addEventListener('click', () => load());
    S.onTheme = () => { if (data) draw(); };

    async function load(quiet) {
      const my = ++seq;
      if (!quiet) { paintSeg(); fIn.value = range[0]; tIn.value = range[1]; reloadBtn.disabled = true; }
      try {
        const [d] = await Promise.all([api('GET', `/admin/settle/stats/${range[0]}/${range[1]}`), loadECharts()]);
        if (my !== seq) return;
        if (quiet && data && JSON.stringify(d) === JSON.stringify(data)) return;  // 自动刷新：数据没变就不重画
        data = d;
        rememberUsers(d.users);
        localStorage.setItem('polo_stats_min', d.stats_from || '');
        const owners = new Set();
        for (const day of d.days) for (const r of day.rows) if (r.owner !== null && r.owner !== undefined) owners.add(r.owner);
        for (const a of d.accounts) if (a.owner) owners.add(a.owner);
        const keep = ownerF;
        clear(ownerSel, h('option', { value: '', text: '按成员…' }), [...owners].map((id) => h('option', { value: String(id), text: '归 ' + uname(id) })));
        if (!SCOPES.some(([k]) => k === keep)) {
          ownerSel.value = [...ownerSel.options].some((o) => o.value === keep) ? keep : '';
          ownerF = ownerSel.value || 'all';
        }
        paintScope();
        draw();
      } catch (e) { if (my === seq && !quiet) clear(body, h('div', { class: 'card' }, h('div', { class: 'card-body' }, emptyState(errText(e), 'warning')))); }
      finally { if (my === seq && !quiet) reloadBtn.disabled = false; }
    }
    // 统计范围包含今天：每 2 分钟自动取一次（服务器每 15 分钟更新今天的数）
    autoRefresh(() => (range[1] >= bjToday() ? load(true) : null), 120000);

    function draw() {
      disposeCharts();
      const E = window.echarts, t = chartTheme(), rate = data.rate;
      const info = acctMap(data.accounts);
      const lo = data.from > (data.stats_from || data.from) ? data.from : (data.stats_from || data.from);
      const hi = data.to < data.today ? data.to : data.today;
      const dayList = [];
      for (let d = lo; d <= hi; d = addDays(d, 1)) dayList.push(d);
      const byDay = Object.fromEntries(data.days.map((d) => [d.day, d]));
      const isOwn = (r) => r.owner === null || r.owner === undefined;
      const pass = (r) => ownerF === 'all' || (ownerF === 'own' ? isOwn(r) : ownerF === 'members' ? !isOwn(r) : r.owner === Number(ownerF));
      let poolUsd = 0;
      for (const day of dayList) for (const r of (byDay[day] || { rows: [] }).rows) poolUsd += r.usd;
      const acc = {};
      const daily = dayList.map((day) => ({ day, usd: 0, req: 0, tok: 0, opus: 0, fable: 0, my: 0, member: 0, live: day === data.today, fetched: !!byDay[day] }));
      const ownerUsd = {};
      daily.forEach((D, i) => {
        for (const r of (byDay[D.day] || { rows: [] }).rows) {
          if (!pass(r)) continue;
          const out = r.usd * rate, own = r.owner === null || r.owner === undefined;
          const my = own ? out : (r.income_est_cny ?? ((out * r.share) / 100));
          D.usd += r.usd; D.req += r.requests || 0; D.tok += r.tokens || 0; D.opus += r.opus || 0; D.fable += r.fable || 0; D.my += my; D.member += out - my;
          const a = acc[r.key] = acc[r.key] || { key: r.key, name: (info[r.key] && info[r.key].name) || r.name || r.key, usd: 0, req: 0, tok: 0, opus: 0, fable: 0, my: 0, member: 0, by: new Array(dayList.length).fill(0), owners: new Set(), active: 0 };
          a.usd += r.usd; a.req += r.requests || 0; a.tok += r.tokens || 0; a.opus += r.opus || 0; a.fable += r.fable || 0; a.my += my; a.member += out - my;
          if (!a.by[i] && r.usd > 0) a.active++;
          a.by[i] += r.usd; a.owners.add(own ? 'own' : r.owner);
          const ok = own ? 'own' : r.owner;
          ownerUsd[ok] = (ownerUsd[ok] || 0) + r.usd;
        }
      });
      const accs = Object.values(acc).sort((a, b) => b.usd - a.usd);
      const sum = (f) => daily.reduce((s, d) => s + d[f], 0);
      const T = { usd: sum('usd'), req: sum('req'), tok: sum('tok'), my: sum('my'), member: sum('member'), opus: sum('opus'), fable: sum('fable') };
      const nDays = Math.max(1, daily.filter((d) => d.fetched).length);
      const best = daily.reduce((b, d) => (d.usd > (b ? b.usd : -1) ? d : b), null);
      const bo = (data.prev && data.prev.by_owner) || {};
      const prev = ownerF === 'all' ? data.prev : !data.prev.days ? null
        : Object.entries(bo).filter(([k]) => (ownerF === 'own' ? k === 'own' : ownerF === 'members' ? k !== 'own' : k === ownerF))
          .reduce((a, [, v]) => ({ usd: a.usd + v.usd, requests: a.requests + v.requests }), { usd: 0, requests: 0 });
      const scopeName = ownerF === 'all' ? '全部（号池）' : ownerF === 'own' ? '仅我的号' : ownerF === 'members' ? '仅成员号' : '归 ' + uname(Number(ownerF));
      const poolPct = poolUsd ? (T.usd / poolUsd) * 100 : 0;
      const ownName = (k) => (k === 'own' ? '我的号' : uname(Number(k)));
      info2.textContent = `${lo} → ${hi} · ${nDays} 天有数据${data.days.some((d) => d.day === data.today) ? ' · 今天的数据每 15 分钟更新' : ''} · 汇率 ¥${rate}/$ · 利润按当天归属和当前结算规则估算（不含回本），实际以结算单为准${ownerF === 'all' ? '' : ` · 现在只统计「${scopeName}」，一天内归属不到半天的算我的号`}`;
      if (!accs.length && !T.usd) {
        clear(body, h('div', { class: 'card' }, h('div', { class: 'card-body' }, emptyState(dayList.length ? '这段时间没有额度数据' : `统计从 ${data.stats_from} 开始，这段时间还没有数据`, 'chart'))));
        return;
      }
      // KPI
      const kpis = h('div', { class: 'stats kpis' },
        kpiCard(ownerF === 'all' ? '总额度' : ownerF === 'own' ? '我的号额度' : ownerF === 'members' ? '成员号额度' : '额度', T.usd, usd, 'dollar', 'blue', { delta: prev && deltaChip(T.usd, prev.usd), sub: `日均 ${usd(T.usd / nDays)}${ownerF === 'all' ? '' : ` · 占号池 ${poolPct.toFixed(1)}%`}` }),
        kpiCard('产出（按汇率）', T.usd * rate, cny, 'activity', 'purple', { delta: prev && deltaChip(T.usd, prev.usd), sub: `每 $1 = ¥${rate}` }),
        kpiCard('我的利润（估）', T.my, cny, 'trend', 'ok', { sub: ownerF === 'own' ? '我的号按汇率全算我的' : `我的号 ${cny(accs.filter((a) => a.owners.has('own')).reduce((s, a) => s + a.my, 0))}`, tip: '我的号按汇率全算你的；成员号按当前结算规则估算（回本期间实际不抽成），实际以结算单为准' }),
        ownerF === 'own'
          ? kpiCard('占号池', poolPct, (v) => v.toFixed(1) + '%', 'users', 'cyan', { sub: `号池合计 ${usd(poolUsd)} · 成员号 ${usd(poolUsd - T.usd)}` })
          : kpiCard('成员应得（估）', T.member, cny, 'users', 'cyan', { sub: data.settle.count ? `期间已结算 ${cny(data.settle.member_cny)}` : '期间还没有结算' }),
        kpiCard('请求', T.req, (v) => compact(Math.round(v)), 'server', 'blue', { delta: prev && deltaChip(T.req, prev.requests), sub: `Token ${compact(T.tok)}` }),
        kpiCard('活跃账号', accs.filter((a) => a.usd > 0).length, (v) => String(Math.round(v)), 'cube', 'purple', { sub: best && best.usd ? `最高一天 ${best.day.slice(5)} ${usd(best.usd)}` : '' }));
      // 图表卡片
      const card = (title, ic, chartCls, tools, sub) => {
        const el = h('div', { class: 'chart ' + (chartCls || '') });
        const c = h('div', { class: 'card chart-card' }, h('div', { class: 'card-head' }, h('div', {}, h('h3', { class: 'card-title' }, icon(ic), title), sub ? h('div', { class: 'faint xs', text: sub }) : null), tools || null), h('div', { class: 'card-body chart-body' }, el));
        return { c, el };
      };
      const segOf = (opts, cur, on) => h('div', { class: 'seg seg-sm' }, opts.map(([k, l]) => h('button', { type: 'button', class: cur === k ? 'on' : '', onclick: () => on(k) }, l)));
      const single = dayList.length === 1;
      const trend = card(single ? `${dayList[0]} 每小时额度` : '每日额度', 'chart', 'chart-lg',
        single ? null : segOf([['account', '按账号'], ['owner', '按归属']], trendMode, (k) => { trendMode = k; localStorage.setItem('polo_stats_trend', k); draw(); }),
        single ? (ownerF === 'all' ? '全池（不区分归属）' : '每小时数据只有号池合计，这张图不随“统计范围”变化') : '柱子：每个账号 / 每位成员当天的额度；折线：我的利润（估）');
      const rank = card('账号贡献排行', 'trend', '', null, '额度从高到低；标签是 额度 · 我的利润（估）');
      const pie = card('额度占比', 'cube', '', segOf([['account', '按账号'], ['owner', '按归属'], ['model', '按模型']], pieMode, (k) => { pieMode = k; draw(); }));
      const heat = card('24 小时分布', 'clock', '', null, ownerF === 'all' ? '全池每小时的额度（北京时间），颜色越深越多' : '号池合计（每小时数据不分账号，不随“统计范围”变化）');
      const model = card('模型额度', 'activity', '', null, 'Opus / Fable / 其他模型每天用了多少额度');
      const reqc = card('请求与 Token', 'server', '', null, '柱子：请求数；折线：Token');
      // 结算与成本
      const stl = data.settle;
      const settleRows = Object.entries(stl.by_user).sort((a, b) => b[1].member_cny - a[1].member_cny);
      const maxS = Math.max(1, ...settleRows.map(([, x]) => x.member_cny + x.admin_cny));
      const settleCard = h('div', { class: 'card chart-card' }, h('div', { class: 'card-head' }, h('div', {}, h('h3', { class: 'card-title' }, icon('log'), '期间结算与成本'), h('div', { class: 'faint xs', text: '按结算单生成时间；这是实际金额' }))),
        h('div', { class: 'card-body' },
          h('div', { class: 'sum-chips' },
            h('div', {}, h('small', { text: '结算单' }), h('b', { text: `${stl.count} 张` })),
            h('div', {}, h('small', { text: '应付成员' }), h('b', { class: 'money-strong', text: cny(stl.member_cny) })),
            h('div', {}, h('small', { text: '我的抽成' }), h('b', { class: 'text-ok', text: cny(stl.admin_cny) })),
            h('div', {}, h('small', { text: '其中回本' }), h('b', { class: 'text-warn', text: cny(stl.recover_cny) })),
            h('div', {}, h('small', { text: '期间新增成本' }), h('b', { text: `${cny(data.costs.cny)}（${data.costs.count} 笔）` }))),
          (data.upstream || []).length ? (() => {
            const ups = data.upstream, uu = ups.reduce((s, x) => s + x.usd, 0), recv = {};
            for (const x of ups) if (x.received !== null) recv[x.currency || 'CNY'] = (recv[x.currency || 'CNY'] || 0) + x.received;
            return h('div', { class: 'up-sum' }, h('b', { text: `上家结算 ${ups.length} 次` }),
              h('span', { text: `额度 ${usd(uu)}（我的号 ${usd(ups.reduce((s, x) => s + x.mine_usd, 0))} · 成员号 ${usd(ups.reduce((s, x) => s + x.members_usd, 0))}）` }),
              Object.keys(recv).length ? h('span', { text: '收款 ' + Object.entries(recv).map(([k, v]) => (k === 'USDT' ? usdtFmt(v) : cny(v))).join(' + ') }) : null,
              h('a', { href: '#/admin/settle?tab=upstream', text: '查看 →' }));
          })() : null,
          settleRows.length ? h('div', { class: 'srows' }, settleRows.map(([uid, x], i) => {
            const a = h('i', { class: 'sb-m' }), b = h('i', { class: 'sb-a' });
            a.style.width = (x.member_cny / maxS) * 100 + '%'; b.style.width = (x.admin_cny / maxS) * 100 + '%';
            a.style.animationDelay = b.style.animationDelay = i * 60 + 'ms';
            return h('div', { class: 'srow' }, h('div', { class: 'srow-h' }, h('b', { text: uname(Number(uid)) }), h('span', { class: 'faint xs', text: `${x.count} 张 · 成员 ${cny(x.member_cny)} · 我 ${cny(x.admin_cny)}${x.recover_cny ? ` · 回本 ${cny(x.recover_cny)}` : ''}` })), h('div', { class: 'sbar' }, a, b));
          })) : h('div', { class: 'muted small', style: { marginTop: '10px' }, text: '这段时间没有生成结算单' })));
      // 账号明细表
      const tableWrap = h('div', { class: 'table-wrap' });
      const COLS = [['name', '账号'], ['owner', '归属'], ['usd', '额度'], ['pct', '占比'], ['out', '产出'], ['my', '我的利润（估）'], ['member', '成员应得（估）'], ['avg', '日均'], ['active', '活跃天'], ['req', '请求'], ['tok', 'Token'], ['spark', '走势']];
      const val = (a, k) => ({ name: a.name, owner: [...a.owners].map(ownName).join('、'), usd: a.usd, pct: a.usd, out: a.usd, my: a.my, member: a.member, avg: a.usd, active: a.active, req: a.req, tok: a.tok }[k]);
      function drawTable() {
        const rows = accs.slice().sort((a, b) => { const x = val(a, sortKey), y = val(b, sortKey); return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sortDir; });
        clear(tableWrap, h('table', { class: 'table responsive acct-table' },
          h('thead', {}, h('tr', {}, COLS.map(([k, l]) => h('th', { class: k === 'spark' ? '' : 'sortable' + (sortKey === k ? ' sorted' : ''), onclick: k === 'spark' ? null : () => { if (sortKey === k) sortDir = -sortDir; else { sortKey = k; sortDir = typeof val(accs[0], k) === 'string' ? 1 : -1; } drawTable(); } }, l, sortKey === k ? (sortDir > 0 ? ' ↑' : ' ↓') : '')))),
          h('tbody', {}, rows.map((a) => { const inf = info[a.key] || {}; return h('tr', {},
            h('td', { 'data-label': '' }, acctLabel(a.key, info, a.name), inf.seat ? h('span', { class: 'chip', style: { marginTop: '3px' }, text: SEAT_CN[inf.seat] + '席位' }) : null),
            h('td', { 'data-label': '归属', class: 'small nowrap' }, [...a.owners].map(ownName).join('、')),
            h('td', { 'data-label': '额度', class: 'num money-strong', title: usd4(a.usd) }, usd(a.usd)),
            h('td', { 'data-label': '占比', class: 'num' }, h('div', { class: 'pct-cell' }, h('span', { text: T.usd ? ((a.usd / T.usd) * 100).toFixed(1) + '%' : '—' }), (() => { const i = h('i'); i.style.width = (T.usd ? (a.usd / T.usd) * 100 : 0) + '%'; return h('div', { class: 'pct-bar' }, i); })())),
            h('td', { 'data-label': '产出', class: 'num' }, cny(a.usd * rate)),
            h('td', { 'data-label': '我的利润（估）', class: 'num text-ok' }, cny(a.my)),
            h('td', { 'data-label': '成员应得（估）', class: 'num ' + (a.member ? '' : 'faint') }, a.member ? cny(a.member) : '—'),
            h('td', { 'data-label': '日均', class: 'num' }, usd(a.usd / nDays)),
            h('td', { 'data-label': '活跃天', class: 'num' }, `${a.active}/${nDays}`),
            h('td', { 'data-label': '请求', class: 'num' }, compact(a.req)),
            h('td', { 'data-label': 'Token', class: 'num' }, compact(a.tok)),
            h('td', { 'data-label': '走势' }, sparkline(a.by)));
          })),
          h('tfoot', {}, h('tr', {}, h('td', { 'data-label': '', text: `合计 ${accs.length} 个号` }), h('td'), h('td', { 'data-label': '额度', class: 'num', text: usd(T.usd) }), h('td', { 'data-label': '占比', class: 'num', text: '100%' }), h('td', { 'data-label': '产出', class: 'num', text: cny(T.usd * rate) }),
            h('td', { 'data-label': '我的利润（估）', class: 'num text-ok', text: cny(T.my) }), h('td', { 'data-label': '成员应得（估）', class: 'num', text: cny(T.member) }), h('td', { 'data-label': '日均', class: 'num', text: usd(T.usd / nDays) }), h('td'), h('td', { 'data-label': '请求', class: 'num', text: compact(T.req) }), h('td', { 'data-label': 'Token', class: 'num', text: compact(T.tok) }), h('td')))));
      }
      drawTable();
      const exportBtn = h('button', { class: 'btn btn-secondary btn-sm', type: 'button', onclick: () => {
        const head = ['账号', '邮箱', '归属', '额度(美元)', '产出(人民币)', '我的利润估(人民币)', '成员应得估(人民币)', '请求', 'Token', ...dayList];
        downloadCsv(`polo-统计-${lo}-${hi}.csv`, [head, ...accs.map((a) => [a.name, (info[a.key] || {}).email || a.key, [...a.owners].map(ownName).join('、'), r2(a.usd), r2(a.usd * rate), r2(a.my), r2(a.member), a.req, a.tok, ...a.by.map((x) => Math.round(x * 10000) / 10000)])]);
      } }, icon('copy', 'icon icon-sm'), '导出 CSV');
      const acctCard = h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('div', {}, h('h3', { class: 'card-title' }, icon('server'), '账号明细'), h('div', { class: 'faint xs', text: '点表头排序' })), exportBtn), tableWrap);
      // 每天每个号（热力表）
      const mx = Math.max(0.0001, ...accs.flatMap((a) => a.by));
      const matrix = h('details', { class: 'card matrix-card' }, h('summary', { class: 'card-head' }, h('h3', { class: 'card-title' }, icon('log'), '每天每个号的额度'), h('span', { class: 'faint xs', text: '点开查看' })),
        h('div', { class: 'table-wrap' }, h('table', { class: 'table matrix' },
          h('thead', {}, h('tr', {}, h('th', { class: 'sticky-col', text: '账号' }), h('th', { class: 'num', text: '合计' }), dayList.slice().reverse().map((d) => h('th', { class: 'num', text: d.slice(5) })))),
          h('tbody', {}, accs.map((a) => h('tr', {}, h('td', { class: 'sticky-col' }, acctLabel(a.key, info, a.name)), h('td', { class: 'num money-strong' }, usd(a.usd)),
            dayList.map((d, i) => i).reverse().map((i) => { const v = a.by[i]; const td = h('td', { class: 'num heat' + (v ? '' : ' faint') }, v ? usd(v) : '—'); if (v) td.style.background = `rgba(${t.dark ? '96,165,250' : '59,130,246'},${(0.06 + 0.5 * (v / mx)).toFixed(3)})`; return td; })))))));
      const grid = h('div', { class: 'chart-grid' }, h('div', { class: 'span-2' }, trend.c), rank.c, pie.c, heat.c, model.c, reqc.c, settleCard);
      clear(body, kpis, grid, acctCard, matrix);
      [...kpis.children, ...grid.children, acctCard, matrix].forEach((el, i) => { el.classList.add('rise'); el.style.animationDelay = Math.min(i, 10) * 45 + 'ms'; });

      // ---- 图表：每日额度
      const ch1 = mkChart(trend.el);
      if (single) {
        const hrs = Array.from({ length: 24 }, (_, i) => i);
        const hv = hrs.map((hh) => { const x = data.hourly.find((r) => r.day === dayList[0] && r.hour === hh); return x ? x.usd : 0; });
        ch1.setOption(Object.assign(baseOpt(t), { legend: { show: false }, tooltip: Object.assign(baseOpt(t).tooltip, { formatter: axisTip({ _: usd }) }),
          xAxis: axisX(t, hrs.map((x) => String(x).padStart(2, '0') + ':00')), yAxis: axisY(t, shortUsd),
          series: [{ name: '额度', type: 'bar', data: hv, barMaxWidth: 26, itemStyle: { color: grad(E, '#60a5fa', '#7c3aed'), borderRadius: [6, 6, 0, 0] }, animationDelay: (i) => i * 30 }] }));
      } else {
        let groups;
        if (trendMode === 'owner') {
          const keys = Object.keys(ownerUsd).sort((a, b) => ownerUsd[b] - ownerUsd[a]);
          groups = keys.map((k) => ({ name: ownName(k), vals: daily.map((D) => (byDay[D.day] || { rows: [] }).rows.filter((r) => pass(r) && ((r.owner === null || r.owner === undefined) ? 'own' : String(r.owner)) === String(k)).reduce((s, r) => s + r.usd, 0)) }));
        } else {
          const top = accs.slice(0, 9), rest = accs.slice(9);
          groups = top.map((a) => ({ name: a.name, vals: a.by }));
          if (rest.length) groups.push({ name: `其他 ${rest.length} 个`, vals: daily.map((_, i) => rest.reduce((s, a) => s + a.by[i], 0)) });
        }
        const fmt = { _: usd, '我的利润（估）': cny };
        ch1.setOption(Object.assign(baseOpt(t), {
          tooltip: Object.assign(baseOpt(t).tooltip, { formatter: axisTip(fmt, { total: '额度合计' }) }),
          grid: { left: 8, right: 8, top: 44, bottom: dayList.length > 20 ? 40 : 6, containLabel: true },
          dataZoom: dayList.length > 20 ? [{ type: 'slider', height: 18, bottom: 6, start: Math.max(0, 100 - (20 / dayList.length) * 100), end: 100, borderColor: t.border, textStyle: { color: t.muted }, fillerColor: 'rgba(99,102,241,.12)', handleStyle: { color: '#6366f1' } }, { type: 'inside' }] : [],
          xAxis: axisX(t, dayList.map((d) => d.slice(5))),
          yAxis: [axisY(t, shortUsd), axisY(t, shortCny, { splitLine: { show: false } })],
          series: [...groups.map((g, i) => ({ name: g.name, type: 'bar', stack: 'u', data: g.vals.map((v) => Math.round(v * 10000) / 10000), barMaxWidth: 34, emphasis: { focus: 'series' },
            itemStyle: { color: PALETTE[i % PALETTE.length], borderRadius: i === groups.length - 1 ? [5, 5, 0, 0] : 0 }, animationDelay: (idx) => idx * 28 + i * 40 })),
          { name: '我的利润（估）', type: 'line', yAxisIndex: 1, smooth: dayList.length > 5 ? 0.35 : false, symbol: 'circle', symbolSize: 6, showSymbol: dayList.length <= 31, data: daily.map((D) => r2(D.my)),
            lineStyle: { width: 2.5, color: '#10b981' }, itemStyle: { color: '#10b981' }, areaStyle: { color: grad(E, 'rgba(16,185,129,.22)', 'rgba(16,185,129,0)') }, z: 5, animationDelay: 300 }],
        }));
      }
      // ---- 排行
      const topN = accs.slice(0, 12);
      rank.el.style.height = Math.max(240, topN.length * 30 + 40) + 'px';
      const ch2 = mkChart(rank.el);
      ch2.setOption(Object.assign(baseOpt(t), { legend: { show: false }, grid: { left: 8, right: 110, top: 6, bottom: 6, containLabel: true },
        tooltip: Object.assign(baseOpt(t).tooltip, { trigger: 'item', formatter: (p) => { const a = topN[p.dataIndex]; return `<div class="ct-title">${escHtml(a.name)}</div><div class="ct-row"><span>额度</span><b>${usd(a.usd)}</b></div><div class="ct-row"><span>产出</span><b>${cny(a.usd * rate)}</b></div><div class="ct-row"><span>我的利润（估）</span><b>${cny(a.my)}</b></div><div class="ct-row"><span>占比</span><b>${T.usd ? ((a.usd / T.usd) * 100).toFixed(1) : 0}%</b></div>`; } }),
        xAxis: axisY(t, shortUsd), yAxis: axisX(t, topN.map((a) => a.name), { inverse: true, axisLabel: { color: t.text, fontSize: 12, fontWeight: 600 } }),
        series: [{ type: 'bar', data: topN.map((a, i) => ({ value: Math.round(a.usd * 100) / 100, itemStyle: { color: grad(E, PALETTE[i % 8], PALETTE[(i + 1) % 8], true), borderRadius: [0, 6, 6, 0] } })), barMaxWidth: 18,
          label: { show: true, position: 'right', color: t.muted, fontSize: 11, formatter: (p) => `${shortUsd(p.value)} · ${shortCny(topN[p.dataIndex].my)}` }, animationDelay: (i) => i * 60, showBackground: true, backgroundStyle: { color: t.dark ? 'rgba(148,163,184,.06)' : 'rgba(148,163,184,.08)', borderRadius: [0, 6, 6, 0] } }] }));
      // ---- 占比
      let slices;
      if (pieMode === 'owner') slices = Object.entries(ownerUsd).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: ownName(k), value: v }));
      else if (pieMode === 'model') slices = [{ name: 'Opus', value: T.opus }, { name: 'Fable', value: T.fable }, { name: '其他模型', value: Math.max(0, T.usd - T.opus - T.fable) }].filter((x) => x.value > 0);
      else { slices = accs.slice(0, 9).map((a) => ({ name: a.name, value: a.usd })); const rest = accs.slice(9).reduce((s, a) => s + a.usd, 0); if (rest > 0) slices.push({ name: '其他', value: rest }); }
      slices = slices.map((x, i) => ({ name: x.name, value: Math.round(x.value * 100) / 100, itemStyle: { color: PALETTE[i % PALETTE.length] } }));
      const ch3 = mkChart(pie.el);
      ch3.setOption(Object.assign(baseOpt(t), {
        legend: Object.assign(baseOpt(t).legend, { top: 'auto', bottom: 0 }),
        tooltip: Object.assign(baseOpt(t).tooltip, { trigger: 'item', formatter: (p) => `<div class="ct-title">${escHtml(p.name)}</div><div class="ct-row"><i class="ct-dot ${dotCls(p.color)}"></i><span>额度</span><b>${usd(p.value)}</b></div><div class="ct-row"><span>占比</span><b>${p.percent}%</b></div><div class="ct-row"><span>产出</span><b>${cny(p.value * rate)}</b></div>` }),
        title: { text: shortUsd(T.usd), subtext: '总额度', left: 'center', top: '36%', textStyle: { color: t.strong, fontSize: 20, fontWeight: 750 }, subtextStyle: { color: t.muted, fontSize: 11 } },
        series: [{ type: 'pie', radius: ['50%', '74%'], center: ['50%', '45%'], avoidLabelOverlap: true, padAngle: 2, itemStyle: { borderRadius: 8, borderColor: t.card, borderWidth: 2 },
          label: { show: false }, emphasis: { scale: true, scaleSize: 8, label: { show: false } }, data: slices, animationType: 'expansion', animationEasing: 'cubicOut', animationDuration: 1100 }],
      }));
      // ---- 24 小时热力图
      const hdays = dayList.filter((d) => data.hourly.some((r) => r.day === d));
      const ch4 = mkChart(heat.el);
      if (hdays.length) {
        const vals = data.hourly.filter((r) => hdays.includes(r.day)).map((r) => [r.hour, hdays.indexOf(r.day), Math.round(r.usd * 100) / 100]);
        const vmax = Math.max(1, ...vals.map((v) => v[2]));
        heat.el.style.height = Math.max(240, Math.min(hdays.length, 31) * 18 + 80) + 'px';
        ch4.setOption(Object.assign(baseOpt(t), { legend: { show: false }, grid: { left: 8, right: 10, top: 10, bottom: 46, containLabel: true },
          tooltip: Object.assign(baseOpt(t).tooltip, { trigger: 'item', formatter: (p) => `<div class="ct-title">${escHtml(hdays[p.value[1]])} ${String(p.value[0]).padStart(2, '0')}:00</div><div class="ct-row"><span>额度</span><b>${usd(p.value[2])}</b></div>` }),
          xAxis: axisX(t, Array.from({ length: 24 }, (_, i) => String(i)), { splitArea: { show: false } }), yAxis: axisX(t, hdays.map((d) => d.slice(5)), { inverse: true }),
          visualMap: { min: 0, max: vmax, calculable: false, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 140, itemWidth: 10, textStyle: { color: t.muted, fontSize: 10 }, formatter: (v) => shortUsd(v),
            inRange: { color: t.dark ? ['#1e293b', '#1e40af', '#6366f1', '#a855f7'] : ['#eff6ff', '#93c5fd', '#3b82f6', '#6d28d9'] } },
          series: [{ type: 'heatmap', data: vals, itemStyle: { borderRadius: 3, borderColor: t.card, borderWidth: 1 }, emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,.25)' } }, animationDuration: 800 }] }));
      } else ch4.setOption({ title: { text: '这段时间还没有按小时的数据（后台正在补算）', left: 'center', top: 'middle', textStyle: { color: t.muted, fontSize: 12, fontWeight: 400 } } });
      // ---- 模型额度
      const ch5 = mkChart(model.el);
      const mk = (name, vals, c) => ({ name, type: 'line', stack: 'm', smooth: dayList.length > 5 ? 0.35 : false, symbol: 'none', data: vals.map((v) => Math.round(v * 100) / 100), lineStyle: { width: 1.5, color: c }, itemStyle: { color: c }, areaStyle: { color: grad(E, c + 'cc', c + '22') }, emphasis: { focus: 'series' } });
      ch5.setOption(Object.assign(baseOpt(t), { tooltip: Object.assign(baseOpt(t).tooltip, { axisPointer: { type: 'line', lineStyle: { color: t.border } }, formatter: axisTip({ _: usd }) }),
        xAxis: axisX(t, single ? [dayList[0].slice(5)] : dayList.map((d) => d.slice(5)), { boundaryGap: false }), yAxis: axisY(t, shortUsd),
        series: [mk('Opus', daily.map((D) => D.opus), PALETTE[1]), mk('Fable', daily.map((D) => D.fable), PALETTE[2]), mk('其他模型', daily.map((D) => Math.max(0, D.usd - D.opus - D.fable)), PALETTE[13])] }));
      // ---- 请求与 Token
      const ch6 = mkChart(reqc.el);
      ch6.setOption(Object.assign(baseOpt(t), { tooltip: Object.assign(baseOpt(t).tooltip, { formatter: axisTip({ _: (v) => compact(Math.round(v)) }) }),
        xAxis: axisX(t, dayList.map((d) => d.slice(5))), yAxis: [axisY(t, (v) => compact(v)), axisY(t, (v) => compact(v), { splitLine: { show: false } })],
        series: [{ name: '请求', type: 'bar', data: daily.map((D) => D.req), barMaxWidth: 22, itemStyle: { color: grad(E, '#38bdf8', '#3b82f6'), borderRadius: [5, 5, 0, 0] }, animationDelay: (i) => i * 25 },
          { name: 'Token', type: 'line', yAxisIndex: 1, smooth: dayList.length > 5 ? 0.35 : false, symbol: 'none', data: daily.map((D) => D.tok), lineStyle: { width: 2.5, color: PALETTE[6] }, itemStyle: { color: PALETTE[6] } }] }));
    }
    load();
  }
  // 手机上图表最多按 2 倍像素画：3.5 倍屏下画布太大，占显存、拖慢滚动
  function mkChart(el) { const c = window.echarts.init(el, null, { renderer: 'canvas', devicePixelRatio: Math.min(window.devicePixelRatio || 1, isPhone() ? 2 : 3) }); S.charts.push(c); return c; }
  function disposeCharts() { (S.charts || []).forEach((c) => { try { c.dispose(); } catch { /* ignore */ } }); S.charts = []; }
  window.addEventListener('resize', () => { clearTimeout(S.resizeT); S.resizeT = setTimeout(() => (S.charts || []).forEach((c) => c.resize()), 120); });
  new MutationObserver(() => { if (S.onTheme) setTimeout(() => S.onTheme && S.onTheme(), 30); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  // ============================================================
  // 管理：账号选择器
  // ============================================================
  async function accountOptions() {
    if (S.accountsCache && Date.now() - S.accountsAt < 60000) return S.accountsCache;
    const r = await api('GET', '/v1/accounts');
    S.accountsCache = ((r.data && r.data.rows) || []).map((x) => ({
      key: x.account_key || (x.email ? x.email.toLowerCase() : (x.display_name ? 'name:' + x.display_name : null)),
      name: x.display_name, email: x.email || null, ip: ipOf(x),
      p7: x.quota && x.quota['7d'] ? x.quota['7d'].used_pct : null,
    })).filter((x) => x.key);
    S.accountsAt = Date.now();
    return S.accountsCache;
  }
  function accountChip(k) {
    const o = (S.accountsCache || []).find((a) => a.key === k);
    if (!o) return h('span', { class: 'chip', title: '不在当前数据中', text: keyText(k) });
    return h('span', { class: 'chip', title: o.email || keyText(k) }, h('b', { text: o.name || '' }), o.email ? h('span', { class: 'mono', style: { marginLeft: '4px' }, text: o.email }) : null);
  }
  function accountPicker(all, selected) {
    const sel = new Set(selected || []);
    const keys = [...all.map((a) => a.key), ...[...sel].filter((k) => !all.some((a) => a.key === k))];
    const info = Object.fromEntries(all.map((a) => [a.key, a]));
    const q = leadInput('search', { class: 'input input-sm has-lead', placeholder: '按名称、邮箱或 IP 筛选', type: 'search' });
    const grid = h('div', { class: 'pick-grid' });
    const count = h('span', { class: 'muted small' });
    function draw() {
      const f = q.input.value.trim().toLowerCase();
      clear(grid, keys.filter((k) => !f || [k, info[k] && info[k].name, info[k] && info[k].ip].join(' ').toLowerCase().includes(f)).map((k) => {
        const o = info[k];
        const cb = h('input', { type: 'checkbox', checked: sel.has(k) });
        const lab = h('label', { class: 'pick' + (sel.has(k) ? ' on' : '') }, cb,
          h('span', { class: 'pick-main' }, h('b', { text: o ? (o.name || '—') : keyText(k) }), h('span', { class: 'pick-email mono', text: o ? (o.email || '无邮箱') : '不在当前数据' })),
          h('small', { text: o && typeof o.p7 === 'number' ? '7d ' + pct(o.p7) : '' }));
        cb.addEventListener('change', () => { if (cb.checked) sel.add(k); else sel.delete(k); lab.classList.toggle('on', cb.checked); paintCount(); });
        return lab;
      }));
      if (!grid.children.length) grid.append(h('div', { class: 'muted small', text: '没有匹配的账号' }));
      paintCount();
    }
    const paintCount = () => { count.textContent = `已选 ${sel.size} 个`; };
    q.input.addEventListener('input', draw);
    draw();
    const el = h('div', {},
      h('div', { class: 'row wrap', style: { marginBottom: '10px' } }, h('div', { class: 'grow', style: { minWidth: '160px' } }, q.wrap),
        h('button', { class: 'btn btn-secondary btn-sm', type: 'button', onclick: () => { keys.forEach((k) => sel.add(k)); draw(); } }, '全选'),
        h('button', { class: 'btn btn-secondary btn-sm', type: 'button', onclick: () => { sel.clear(); draw(); } }, '清空'), count),
      grid,
      h('p', { class: 'hint', style: { marginBottom: 0 }, text: '按邮箱识别账号：后台改名不影响已分配的账号；邮箱变了才需要重新勾选。' }));
    return { el, get: () => keys.filter((k) => sel.has(k)) };
  }

  // ============================================================
  // 管理：用户
  // ============================================================
  const STATUS = { active: ['b-ok', '正常'], pending: ['b-warn', '待审批'], disabled: ['b-gray', '已停用'] };
  async function pageUsers() {
    const { main } = appLayout({ active: '#/admin/users', title: '用户管理', desc: '审批注册、分配可见账号、停用或重置密码' });
    let users = [], filter = 'all';
    const search = leadInput('search', { class: 'input input-sm has-lead', placeholder: '搜索用户名或备注', type: 'search' });
    search.wrap.style.width = '220px';
    const seg = h('div', { class: 'seg' });
    const segs = [['all', '全部'], ['pending', '待审批'], ['active', '正常'], ['disabled', '已停用']];
    const paintSeg = () => clear(seg, segs.map(([k, l]) => h('button', { type: 'button', class: filter === k ? 'on' : '', onclick: () => { filter = k; paintSeg(); draw(); } }, l)));
    paintSeg();
    const notice = h('div');
    const count = h('span', { class: 'muted small' });
    const tbody = h('tbody', {}, h('tr', {}, h('td', { colspan: '6' }, h('div', { class: 'skeleton sk-line' }))));
    search.input.addEventListener('input', () => draw());
    append(main, notice, h('div', { class: 'card' },
      h('div', { class: 'card-head' }, h('div', { class: 'row wrap' }, h('h2', { class: 'card-title' }, icon('users'), '用户'), count),
        h('div', { class: 'toolbar' }, search.wrap, seg,
          h('a', { class: 'btn btn-primary btn-sm', href: '#/admin/invites', style: { textDecoration: 'none' } }, icon('plus', 'icon icon-sm'), '邀请新用户'))),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table responsive' },
        h('thead', {}, h('tr', {}, ['用户', '状态', '可见账号', '注册时间', '最近登录', '操作'].map((t) => h('th', { text: t })))), tbody))));

    async function act(u, action, body, okMsg) {
      try {
        const r = await api('POST', `/admin/users/${u.id}/${action}`, body || {});
        if (okMsg) toast(okMsg, 'ok');
        await load();
        return r;
      } catch (e) { toast(errText(e), 'bad'); return null; }
    }
    function editAccounts(u) {
      accountOptions().then((all) => {
        const picker = accountPicker(all, u.accounts);
        modal({
          title: `${nameOf(u)} 可以查看的账号`, wide: true, body: picker.el,
          actions: [{ label: '取消' }, { label: '保存', kind: 'btn-primary', onClick: async () => !!(await act(u, 'accounts', { accounts: picker.get() }, '可见账号已更新')) }],
        });
      }).catch((e) => toast(errText(e), 'bad'));
    }
    function editNickname(u) {
      const inp = h('input', { class: 'input', maxlength: '32', value: u.nickname || '', placeholder: '例如：小王 / 老张的号' });
      modal({ title: `备注昵称 · ${u.username}`, body: h('div', {}, field('备注昵称', inp, '只有管理员能看到；管理页面里优先显示备注。留空则清除。')),
        actions: [{ label: '取消' }, { label: '保存', kind: 'btn-primary', onClick: async () => !!(await act(u, 'nickname', { nickname: inp.value.trim() }, inp.value.trim() ? '备注已保存' : '备注已清除')) }] });
      setTimeout(() => inp.focus(), 50);
    }
    async function resetPassword(u) {
      if (!(await confirmBox('重置密码', `将为 ${u.username} 生成一个临时密码，并让 TA 当前的登录全部失效。用户用临时密码登录后需要立即修改。`, { okText: '重置' }))) return;
      const r = await act(u, 'reset-password');
      if (!r) return;
      modal({
        title: '临时密码',
        body: h('div', {},
          h('p', { class: 'muted', style: { marginTop: 0 }, text: `请把下面的临时密码交给 ${u.username}。关闭后将无法再次查看。` }),
          h('div', { class: 'secret-box' }, h('code', { class: 'mono', text: r.temporary_password }),
            h('button', { class: 'btn btn-secondary btn-sm', type: 'button', onclick: () => copy(r.temporary_password, '临时密码') }, icon('copy', 'icon icon-sm'), '复制'))),
        actions: [{ label: '我已记下', kind: 'btn-primary' }],
      });
    }
    function moreMenu(btn, u, self) {
      const admin = u.role === 'admin';
      menu(btn, [
        { label: u.nickname ? '修改备注' : '添加备注', icon: 'user', onClick: () => editNickname(u) },
        { label: '重置密码', icon: 'key', disabled: self, onClick: () => resetPassword(u) },
        u.status === 'disabled'
          ? { label: '启用账号', icon: 'check', onClick: () => act(u, 'enable', null, `已启用 ${u.username}`) }
          : { label: '停用账号', icon: 'lock', disabled: self, onClick: async () => { if (await confirmBox('停用账号', `停用后 ${u.username} 将立即退出，且无法再登录，可以随时重新启用。`, { danger: true, okText: '停用' })) act(u, 'disable', null, `已停用 ${u.username}`); } },
        admin
          ? { label: '取消管理员', icon: 'user', disabled: self, onClick: async () => { if (await confirmBox('取消管理员', `${u.username} 将变为普通用户，只能看到分配给 TA 的账号。`, { okText: '确定' })) act(u, 'role', { role: 'user' }, '已取消管理员'); } }
          : { label: '设为管理员', icon: 'shield', onClick: async () => { if (await confirmBox('设为管理员', `${u.username} 将可以查看全部数据，并管理用户和邀请码。`, { okText: '设为管理员' })) act(u, 'role', { role: 'admin' }, `${u.username} 已成为管理员`); } },
        '-',
        { label: '删除用户', icon: 'x', danger: true, disabled: self, onClick: async () => { if (await confirmBox('删除用户', `确定删除 ${u.username}？删除后无法恢复，TA 需要新的邀请码才能重新注册。`, { danger: true, okText: '删除' })) act(u, 'delete', null, `已删除 ${u.username}`); } },
      ]);
    }
    function draw() {
      const q = search.input.value.trim().toLowerCase();
      const list = users.filter((u) => (filter === 'all' || u.status === filter) && (!q || u.username.toLowerCase().includes(q) || (u.nickname || '').toLowerCase().includes(q)));
      count.textContent = `共 ${users.length} 个用户`;
      const pend = users.filter((u) => u.status === 'pending').length;
      clear(notice, pend ? h('div', { class: 'notice n-warn' }, icon('clock'), h('span', { text: `有 ${pend} 个注册等待审批。` })) : null);
      if (!list.length) { clear(tbody, h('tr', {}, h('td', { colspan: '6' }, emptyState('没有符合条件的用户')))); return; }
      clear(tbody, list.map((u) => {
        const self = u.username === S.user.username;
        const [bc, bt] = STATUS[u.status] || ['b-gray', u.status];
        const acc = u.role === 'admin' ? h('span', { class: 'chip chip-blue', text: '全部账号' })
          : u.accounts.length ? h('div', { class: 'chips' }, u.accounts.slice(0, 3).map(accountChip), u.accounts.length > 3 ? h('span', { class: 'chip', text: `+${u.accounts.length - 3}` }) : null)
            : h('span', { class: 'faint small', text: '未分配' });
        const more = h('button', { class: 'btn btn-ghost btn-icon btn-sm', type: 'button', 'aria-label': '更多操作' }, icon('more', 'icon icon-sm'));
        more.addEventListener('click', () => moreMenu(more, u, self));
        const ops = u.status === 'pending'
          ? h('div', { class: 'row' },
            h('button', { class: 'btn btn-success btn-xs', type: 'button', onclick: () => act(u, 'approve', null, `已通过 ${u.username}`) }, icon('check', 'icon icon-sm'), '通过'),
            h('button', { class: 'btn btn-secondary btn-xs', type: 'button', onclick: async () => { if (await confirmBox('拒绝注册', `拒绝后 ${u.username} 的注册记录会被删除。`, { danger: true, okText: '拒绝' })) act(u, 'reject', null, '已拒绝'); } }, '拒绝'),
            h('button', { class: 'btn btn-ghost btn-xs', type: 'button', onclick: () => editAccounts(u) }, '可见账号'))
          : h('div', { class: 'row' },
            h('button', { class: 'btn btn-secondary btn-xs', type: 'button', disabled: u.role === 'admin', title: u.role === 'admin' ? '管理员可以查看全部账号' : null, onclick: () => editAccounts(u) }, '可见账号'),
            more);
        return h('tr', {},
          h('td', { 'data-label': '' }, h('div', { class: 'row' }, h('span', { class: 'avatar', text: nameOf(u).slice(0, 1) }),
            h('div', {}, h('div', { class: 'row', style: { gap: '6px' } }, h('div', { class: 'cell-title', text: nameOf(u) }),
              h('button', { class: 'btn btn-ghost btn-xs nick-btn', type: 'button', title: '修改备注昵称', onclick: () => editNickname(u) }, u.nickname ? '改备注' : '+ 备注')),
              u.nickname ? h('div', { class: 'cell-sub mono', text: u.username }) : null,
              h('div', { class: 'row', style: { gap: '4px', marginTop: '2px' } },
                u.role === 'admin' ? h('span', { class: 'badge b-purple plain', text: '管理员' }) : h('span', { class: 'badge b-gray plain', text: '普通用户' }),
                self ? h('span', { class: 'badge b-blue plain', text: '当前登录' }) : null)))),
          h('td', { 'data-label': '状态' }, h('span', { class: 'badge ' + bc, text: bt }), u.must_change_password ? h('div', { class: 'cell-sub', text: '待修改临时密码' }) : null),
          h('td', { 'data-label': '可见账号' }, acc),
          h('td', { 'data-label': '注册时间', class: 'nowrap' }, fmtTime(u.created_at)),
          h('td', { 'data-label': '最近登录', class: 'nowrap' }, h('span', { title: u.last_login_at ? fmtTime(u.last_login_at) : '', text: ago(u.last_login_at) || '从未登录' })),
          h('td', { 'data-label': '操作' }, ops));
      }));
    }
    async function load() {
      try {
        const r = await api('GET', '/admin/users');
        await accountOptions().catch(() => null);
        users = r.users;
        rememberUsers(users);
        S.pending = users.filter((u) => u.status === 'pending').length; S.pendingAt = Date.now();
        const badge = document.querySelector('.side-link .count');
        if (badge) { badge.hidden = !S.pending; badge.textContent = S.pending || ''; }
        draw();
      } catch (e) { clear(tbody, h('tr', {}, h('td', { colspan: '6' }, emptyState(errText(e), 'warning')))); }
    }
    load();
  }

  // ============================================================
  // 管理：邀请码
  // ============================================================
  const INVITE_STATE = { active: ['b-ok', '有效'], used_up: ['b-gray', '已用完'], expired: ['b-gray', '已过期'], revoked: ['b-bad', '已作废'] };
  async function pageInvites() {
    const { main } = appLayout({ active: '#/admin/invites', title: '邀请码', desc: '生成邀请码，决定新用户能否直接使用以及默认能看哪些账号' });
    let invites = [];
    const tbody = h('tbody', {}, h('tr', {}, h('td', { colspan: '8' }, h('div', { class: 'skeleton sk-line' }))));
    const createBtn = h('button', { class: 'btn btn-primary btn-sm', type: 'button' }, icon('plus', 'icon icon-sm'), '生成邀请码');
    const count = h('span', { class: 'muted small' });
    append(main, h('div', { class: 'card' },
      h('div', { class: 'card-head' }, h('div', { class: 'row wrap' }, h('h2', { class: 'card-title' }, icon('ticket'), '邀请码'), count), createBtn),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table responsive wide' },
        h('thead', {}, h('tr', {}, ['邀请码', '备注', '使用次数', '注册后', '默认可见账号', '有效期', '创建', '状态 / 操作'].map((t) => h('th', { text: t })))), tbody))));

    function showCode(code) {
      const link = `${location.origin}${location.pathname}#/register?code=${encodeURIComponent(code)}`;
      modal({
        title: '邀请码已生成',
        body: h('div', {},
          h('p', { class: 'muted', style: { marginTop: 0 }, text: '邀请码只显示这一次，请现在复制并发给对方。' }),
          h('div', { class: 'secret-box' }, h('code', { class: 'mono', text: code }),
            h('button', { class: 'btn btn-secondary btn-sm', type: 'button', onclick: () => copy(code, '邀请码') }, icon('copy', 'icon icon-sm'), '复制')),
          h('div', { class: 'field', style: { marginTop: '14px', marginBottom: 0 } }, h('label', { class: 'label', text: '注册链接（自动填好邀请码）' }),
            h('div', { class: 'row' }, h('input', { class: 'input input-sm mono', readOnly: true, value: link }),
              h('button', { class: 'btn btn-secondary btn-sm', type: 'button', onclick: () => copy(link, '注册链接') }, icon('link', 'icon icon-sm'), '复制')))),
        actions: [{ label: '完成', kind: 'btn-primary' }],
      });
    }
    createBtn.addEventListener('click', async () => {
      let all = [];
      try { all = await accountOptions(); } catch (e) { toast(errText(e), 'bad'); return; }
      const note = h('input', { class: 'input', placeholder: '例如：给张三', maxlength: '60' });
      const uses = h('input', { class: 'input', type: 'number', min: '1', max: '100', value: '1' });
      const exp = h('select', { class: 'select' }, [['1', '1 天'], ['7', '7 天'], ['30', '30 天'], ['', '永久有效']].map(([v, t]) => h('option', { value: v, selected: v === '7', text: t })));
      const approve = h('input', { type: 'checkbox' });
      const picker = accountPicker(all, []);
      const err = h('div', { class: 'form-error' });
      modal({
        title: '生成邀请码', wide: true,
        body: h('div', {},
          h('div', { class: 'grid-half' }, field('备注', note), field('可用次数', uses, '每注册一个账号用掉一次（1-100）')),
          h('div', { class: 'grid-half' }, field('有效期', exp),
            h('div', { class: 'field' }, h('span', { class: 'label', text: '注册后' }),
              h('label', { class: 'check', style: { padding: '8px 0' } }, h('span', { class: 'switch' }, approve, h('span')), '需要管理员审批才能使用'))),
          h('div', { class: 'field' }, h('span', { class: 'label', text: '默认可见账号（注册后可再调整）' }), picker.el),
          err),
        actions: [{ label: '取消' }, {
          label: '生成', kind: 'btn-primary', onClick: async () => {
            const n = Number(uses.value);
            if (!Number.isInteger(n) || n < 1 || n > 100) { err.textContent = '可用次数需为 1-100 的整数'; return false; }
            try {
              const r = await api('POST', '/admin/invites', { note: note.value.trim(), max_uses: n, expires_days: exp.value ? Number(exp.value) : null, requires_approval: approve.checked, accounts: picker.get() });
              await load();
              setTimeout(() => showCode(r.code));
              return true;
            } catch (e) { err.textContent = errText(e); return false; }
          },
        }],
      });
    });
    function draw() {
      count.textContent = `共 ${invites.length} 个，有效 ${invites.filter((i) => i.state === 'active').length} 个`;
      if (!invites.length) { clear(tbody, h('tr', {}, h('td', { colspan: '8' }, emptyState('还没有邀请码，点击右上角生成', 'ticket')))); return; }
      clear(tbody, invites.map((i) => {
        const [bc, bt] = INVITE_STATE[i.state] || ['b-gray', i.state];
        const bar = h('span', { class: 'mini-bar' }, h('i')); bar.firstChild.style.width = Math.min(100, (i.uses / i.max_uses) * 100) + '%';
        return h('tr', {},
          h('td', { 'data-label': '' }, h('span', { class: 'mono cell-title', text: '••••-••••-' + i.hint })),
          h('td', { 'data-label': '备注' }, i.note || h('span', { class: 'faint', text: '—' })),
          h('td', { 'data-label': '使用次数', class: 'nowrap' }, `${i.uses} / ${i.max_uses}`, bar),
          h('td', { 'data-label': '注册后' }, i.requires_approval ? h('span', { class: 'badge b-warn plain', text: '需审批' }) : h('span', { class: 'badge b-ok plain', text: '直接可用' })),
          h('td', { 'data-label': '默认账号' }, i.accounts.length ? h('div', { class: 'chips' }, i.accounts.slice(0, 3).map(accountChip), i.accounts.length > 3 ? h('span', { class: 'chip', text: `+${i.accounts.length - 3}` }) : null) : h('span', { class: 'faint small', text: '无' })),
          h('td', { 'data-label': '有效期', class: 'nowrap' }, i.expires_at ? h('span', { title: fmtTime(i.expires_at), text: until(i.expires_at) ? until(i.expires_at) + '后过期' : '已过期' }) : '永久'),
          h('td', { 'data-label': '创建', class: 'nowrap' }, h('div', {}, dash(i.created_by)), h('div', { class: 'cell-sub', text: fmtTime(i.created_at) })),
          h('td', { 'data-label': '状态' }, h('div', { class: 'row' }, h('span', { class: 'badge ' + bc, text: bt }),
            i.state === 'active' ? h('button', {
              class: 'btn btn-ghost btn-xs', type: 'button',
              onclick: async () => {
                if (!(await confirmBox('作废邀请码', `作废后尾号 ${i.hint} 的邀请码不能再用于注册，已注册的用户不受影响。`, { danger: true, okText: '作废' }))) return;
                try { await api('POST', `/admin/invites/${i.id}/revoke`, {}); toast('已作废', 'ok'); load(); } catch (e) { toast(errText(e), 'bad'); }
              },
            }, '作废') : null)));
      }));
    }
    async function load() {
      try { invites = (await api('GET', '/admin/invites')).invites; await accountOptions().catch(() => null); draw(); }
      catch (e) { clear(tbody, h('tr', {}, h('td', { colspan: '8' }, emptyState(errText(e), 'warning')))); }
    }
    load();
  }

  // ============================================================
  // 管理：登录记录
  // ============================================================
  const ADMIN_ACTIONS = { approve: '通过审批', reject: '拒绝注册', disable: '停用账号', enable: '启用账号', delete: '删除用户', reset_password: '重置密码', role: '修改角色', accounts: '修改可见账号' };
  function eventInfo(result) {
    const m = /^admin_(.+)_by_(.+)$/.exec(result);
    if (m) return ['b-purple', `${m[2]} ${ADMIN_ACTIONS[m[1]] || m[1]}`, 'admin'];
    return ({
      ok: ['b-ok', '登录成功', 'ok'],
      wrong_password: ['b-bad', '密码错误', 'fail'],
      pending: ['b-warn', '待审批账号尝试登录', 'fail'],
      disabled: ['b-gray', '已停用账号尝试登录', 'fail'],
      invalid_invite: ['b-bad', '邀请码无效', 'fail'],
      register_active: ['b-blue', '注册（直接开通）', 'register'],
      register_pending: ['b-warn', '注册（待审批）', 'register'],
      password_changed: ['b-blue', '修改密码', 'ok'],
    })[result] || ['b-gray', result, 'other'];
  }
  async function pageLogs() {
    const { main } = appLayout({ active: '#/admin/logs', title: '登录记录', desc: '最近 500 条登录、注册和管理操作记录' });
    let logs = [], filter = 'all';
    const seg = h('div', { class: 'seg' });
    const segs = [['all', '全部'], ['ok', '成功'], ['fail', '失败'], ['register', '注册'], ['admin', '管理操作']];
    const paintSeg = () => clear(seg, segs.map(([k, l]) => h('button', { type: 'button', class: filter === k ? 'on' : '', onclick: () => { filter = k; paintSeg(); draw(); } }, l)));
    paintSeg();
    const search = leadInput('search', { class: 'input input-sm has-lead', placeholder: '搜索用户名或 IP', type: 'search' });
    search.wrap.style.width = '200px';
    search.input.addEventListener('input', () => draw());
    const refresh = h('button', { class: 'btn btn-secondary btn-sm', type: 'button', onclick: () => load() }, icon('refresh', 'icon icon-sm'), '刷新');
    const count = h('span', { class: 'muted small' });
    const tbody = h('tbody', {}, h('tr', {}, h('td', { colspan: '4' }, h('div', { class: 'skeleton sk-line' }))));
    append(main, h('div', { class: 'card' },
      h('div', { class: 'card-head' }, h('div', { class: 'row wrap' }, h('h2', { class: 'card-title' }, icon('log'), '记录'), count), h('div', { class: 'toolbar' }, search.wrap, seg, refresh)),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table responsive' },
        h('thead', {}, h('tr', {}, ['时间', '用户', 'IP', '事件'].map((t) => h('th', { text: t })))), tbody))));
    function draw() {
      const q = search.input.value.trim().toLowerCase();
      const list = logs.filter((l) => (filter === 'all' || eventInfo(l.result)[2] === filter) && (!q || `${l.username || ''} ${l.ip || ''}`.toLowerCase().includes(q)));
      count.textContent = `显示 ${list.length} / ${logs.length} 条`;
      if (!list.length) { clear(tbody, h('tr', {}, h('td', { colspan: '4' }, emptyState('没有记录')))); return; }
      clear(tbody, list.map((l) => {
        const [bc, bt] = eventInfo(l.result);
        return h('tr', {},
          h('td', { 'data-label': '时间', class: 'nowrap' }, h('div', { text: fmtTime(l.at) }), h('div', { class: 'cell-sub', text: ago(l.at) })),
          h('td', { 'data-label': '用户' }, l.username ? h('span', { class: 'cell-title', style: { fontSize: '13px' }, text: l.username }) : h('span', { class: 'faint', text: '（无效用户名）' })),
          h('td', { 'data-label': 'IP', class: 'mono small' }, dash(l.ip)),
          h('td', { 'data-label': '事件' }, h('span', { class: 'badge ' + bc, text: bt })));
      }));
    }
    async function load() {
      refresh.disabled = true;
      try { logs = (await api('GET', '/admin/logins')).logins; draw(); }
      catch (e) { clear(tbody, h('tr', {}, h('td', { colspan: '4' }, emptyState(errText(e), 'warning')))); }
      finally { refresh.disabled = false; }
    }
    load();
  }

  // ============================================================
  // 个人设置
  // ============================================================
  function pageSettings() {
    const forced = !!S.user.must_change_password;
    const { main } = appLayout({ active: '#/settings', title: '个人设置', desc: forced ? '请先修改初始密码' : '账号信息与密码' });
    const old = passwordInput({ autocomplete: 'current-password', placeholder: forced ? '管理员给你的临时密码' : '当前密码' });
    const p1 = passwordInput({ autocomplete: 'new-password', placeholder: '至少 10 位' });
    const p2 = passwordInput({ autocomplete: 'new-password', placeholder: '再输入一次' });
    const err = h('div', { class: 'form-error', role: 'alert' });
    const btn = h('button', { class: 'btn btn-primary', type: 'submit' }, icon('check', 'icon icon-sm'), '保存新密码');
    const form = h('form', { novalidate: true },
      h('input', { type: 'text', autocomplete: 'username', value: S.user.username, hidden: true, readOnly: true }),
      field(forced ? '临时密码' : '当前密码', old.wrap), field('新密码', h('div', {}, p1.wrap, strengthMeter(p1.input))), field('确认新密码', p2.wrap), err, btn);
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); err.textContent = '';
      if (!old.input.value) return void (err.textContent = '请输入当前密码');
      if (p1.input.value.length < 10 || p1.input.value.length > 128) return void (err.textContent = '新密码需为 10-128 位');
      if (p1.input.value !== p2.input.value) return void (err.textContent = '两次输入的新密码不一致');
      btn.disabled = true;
      try {
        await api('POST', '/me/password', { old_password: old.input.value, new_password: p1.input.value });
        S.user.must_change_password = false; persistUser();
        toast('密码已修改，其他设备上的登录已退出', 'ok');
        if (forced) go('#/dashboard'); else { form.reset(); btn.disabled = false; }
      } catch (ex) { err.textContent = errText(ex); btn.disabled = false; }
    });
    const info = h('div', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', { class: 'card-title' }, icon('user'), '账号信息')),
      h('div', { class: 'card-body' },
        h('div', { class: 'row', style: { gap: '14px', marginBottom: '16px' } }, h('span', { class: 'avatar lg', text: S.user.username.slice(0, 1) }),
          h('div', {}, h('div', { class: 'cell-title', style: { fontSize: '18px' }, text: S.user.username }),
            isAdmin() ? h('span', { class: 'badge b-purple', text: '管理员' }) : h('span', { class: 'badge b-gray', text: '普通用户' }))),
        h('dl', { class: 'kv', style: { fontSize: '13px', gap: '8px 16px' } },
          h('dt', { text: '可见范围' }), h('dd', { text: isAdmin() ? '全部账号与运维数据' : '管理员分配的账号' }),
          h('dt', { text: '登录有效期' }), h('dd', { text: '12 小时' })),
        h('button', { class: 'btn btn-secondary btn-sm', type: 'button', style: { marginTop: '18px' }, onclick: logout }, icon('logout', 'icon icon-sm'), '退出登录')));
    append(main,
      forced ? h('div', { class: 'notice n-warn' }, icon('lock'), h('span', { text: '为了账号安全，请先把初始密码或临时密码改成你自己的密码，然后才能使用其他功能。' })) : null,
      h('div', { class: 'grid-2' }, info,
        h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', { class: 'card-title' }, icon('key'), forced ? '设置新密码' : '修改密码')), h('div', { class: 'card-body' }, form))));
    old.input.focus();
  }

  // ============================================================
  // 启动
  // ============================================================
  applyTheme();
  loadSession();
  window.addEventListener('hashchange', render);
  render();
  // 发布了新版：每 5 分钟看一眼 index.html 里的版本号，变了就在用户没在操作时自动刷新整个页面（10 分钟内最多一次）
  if (APP_V) {
    let want = null;
    const reloadWhenIdle = () => {
      if (userBusy(false) && !document.hidden) return setTimeout(reloadWhenIdle, 10000);
      const last = Number(sessionStorage.getItem('polo_vreload') || 0);
      if (Date.now() - last < 600000) return;
      sessionStorage.setItem('polo_vreload', String(Date.now()));
      location.reload();
    };
    setInterval(async () => {
      if (want) return;
      try {
        const html = await (await fetch(location.pathname + '?vc=' + Date.now(), { cache: 'no-store' })).text();
        const v = (html.match(/app\.js\?v=(\d+)/) || [])[1];
        if (v && Number(v) > Number(APP_V)) { want = v; reloadWhenIdle(); }
      } catch { /* 下次再看 */ }
    }, 300000);
  }
  if (S.token) {
    api('GET', '/me').then((me) => {
      if (!S.user) return;
      const changed = me.role !== S.user.role || me.must_change_password !== S.user.must_change_password;
      Object.assign(S.user, { username: me.username, role: me.role, must_change_password: me.must_change_password });
      persistUser();
      if (changed) render();
    }).catch(() => {});
  }
})();
