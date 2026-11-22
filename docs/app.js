'use strict';
(() => {
  // ============================================================
  // 配置与状态
  // ============================================================
  const API = 'https://notes.fuckingclaude.top:8446/polo';
  const SESSION_KEY = 'polo_session';
  const S = { token: null, user: null, timers: [], dash: null, pending: null, pendingAt: 0, accountsCache: null, accountsAt: 0 };
  const ADMIN_RESOURCES = { accounts: '/v1/accounts', summary: '/v1/summary', usage: '/v1/usage', proxies: '/v1/proxies', archived: '/v1/archived-accounts', vendor: '/v1/vendor-usage' };

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
  function toast(text, kind = 'info') {
    let box = document.querySelector('.toasts');
    if (!box) { box = h('div', { class: 'toasts' }); document.body.append(box); }
    const ic = { ok: 'check', bad: 'x', warn: 'warning', info: 'info' }[kind] || 'info';
    const t = h('div', { class: 'toast t-' + kind, role: 'status' }, icon(ic), h('span', { text }));
    box.append(t);
    setTimeout(() => t.remove(), 3800);
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
  function stopTimers() { S.timers.forEach(clearInterval); S.timers = []; if (openMenu) openMenu(); }
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
      isAdmin() ? [
        h('div', { class: 'side-section', text: '管理' }),
        link('#/admin/users', 'users', '用户管理', pendingBadge),
        link('#/admin/invites', 'ticket', '邀请码'),
        link('#/admin/logs', 'log', '登录记录'),
      ] : null,
      h('div', { class: 'side-section', text: '账户' }),
      link('#/settings', 'cog', '个人设置'));
    const sidebar = h('aside', { class: 'sidebar' },
      h('div', { class: 'side-brand' }, h('div', { class: 'logo' }, icon('bolt')), h('div', {}, h('b', { class: 'gradient-text', text: 'Polo 看板' }), h('small', { text: '账号额度与用量' }))),
      nav,
      h('div', { class: 'side-foot', text: '数据约每 10 分钟采集一次' }));
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
    const shell = h('div', { class: 'shell' },
      h('header', { class: 'topbar' },
        h('div', { class: 'row', style: { minWidth: 0 } },
          h('button', { class: 'btn btn-ghost btn-icon menu-btn', type: 'button', 'aria-label': '菜单', onclick: () => toggleSide(true) }, icon('menu')),
          h('div', { style: { minWidth: 0 } }, h('h1', { text: title }), desc ? h('p', { text: desc }) : null)),
        h('div', { class: 'row' }, themeButton(), userChip)),
      main);
    clear(document.getElementById('root'), h('div', { class: 'app' }, h('div', { class: 'bg' }), sidebar, backdrop, shell));

    if (isAdmin() && !locked) refreshPending(pendingBadge);
    return { main };
  }
  async function refreshPending(badge) {
    const paint = () => { badge.hidden = !S.pending; badge.textContent = S.pending || ''; };
    paint();
    if (Date.now() - S.pendingAt < 60000) return;
    S.pendingAt = Date.now();
    try {
      const r = await api('GET', '/admin/users');
      S.pending = r.users.filter((u) => u.status === 'pending').length;
      paint();
    } catch { /* ignore */ }
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

  function resetEl(q, resetText) {
    if (q.reset_at) {
      const left = until(q.reset_at);
      if (left) return h('span', { class: 'u-reset', title: '重置于 ' + fmtTime(q.reset_at) }, icon('clock', 'icon icon-sm'), left + '后重置');
      return (q.used_pct || 0) > 0 ? h('span', { class: 'u-reset pending', title: '已过重置时间，等待后台刷新用量' }, '待刷新') : h('span', { class: 'u-reset' }, '已重置');
    }
    if (resetText === '重置时间未知' && (q.used_pct || 0) > 0) return h('span', { class: 'u-reset' }, '重置时间未知');
    return null;
  }
  function usageBlock(r, withStats = true) {
    const d = r.detail || {};
    const box = h('div', { class: 'usage' });
    const keys = [...WIN_ORDER.filter((k) => r.quota && r.quota[k]), ...Object.keys(r.quota || {}).filter((k) => !WIN_ORDER.includes(k))];
    if (!keys.length) return h('span', { class: 'faint', text: '—' });
    for (const k of keys) {
      const q = r.quota[k];
      const hist = k === '5h' ? d.history && d.history['5h'] : k === '7d' ? d.history && d.history['7d'] : null;
      if (withStats && hist && (toNum(hist.requests) || 0) > 0) {
        box.append(h('div', { class: 'u-stats' },
          h('span', { text: compact(hist.requests) + ' 次' }),
          h('span', { text: compact(hist.tokens) + ' tok' }),
          h('span', { title: `官方价 ${dash(hist.official_cost)} · 计费价 ${dash(hist.billed_cost)}`, text: dash(hist.official_cost) })));
      }
      const meta = WIN[k] || { cls: 'ul-other', label: k };
      const row = h('div', { class: 'u-row' }, h('span', { class: 'u-label ' + meta.cls, text: meta.label }));
      if (typeof q.used_pct === 'number') {
        const p = q.used_pct, lv = p >= 90 ? 'bad' : p >= 75 ? 'warn' : 'ok';
        const fill = h('div', { class: 'u-fill uf-' + lv }); fill.style.width = Math.min(100, Math.max(0, p)) + '%';
        append(row, h('div', { class: 'u-track' }, fill), h('span', { class: 'u-pct ' + (lv === 'ok' ? '' : lv), text: pct(p) }), resetEl(q, d.windows && d.windows[k] && d.windows[k].reset_text) || h('span', { class: 'u-reset' }));
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
  function accountRow(r, shared) {
    const d = r.detail || {}, hl = r.health || {}, t = d.today || {}, rt = d.realtime || {}, hs = d.history || {};
    const admin = isAdmin();
    const lastUsed = ago(d.last_used_at) || hl.last_used_display;
    const on = !r.state || r.state === '启用';
    const conc = toNum(rt.concurrency !== undefined && rt.concurrency !== null ? rt.concurrency : hl.concurrency) || 0;
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
          seatBadge(r, admin),
          (r.groups || []).map((g) => h('span', { class: 'chip chip-orange', text: g })),
          h('span', { class: 'l-name mono', title: '后台显示名', text: dash(r.display_name) })),
        h('div', { class: 'l-sub' }, meta || '—'),
        h('div', { class: 'l-sub' }, lastUsed ? h('span', { title: d.last_used_at ? '最近使用：' + fmtTime(d.last_used_at) : null, text: `${lastUsed}使用` }) : '未使用',
          d.usage_updated_at ? h('span', { class: old ? 'text-warn' : '', title: '后台最近一次刷新该账号用量：' + fmtTime(d.usage_updated_at) }, ` · 用量 ${ago(d.usage_updated_at)}更新`) : null)),
      // 状态 + 实时
      h('td', { 'data-label': '状态 / 实时' },
        h('div', { class: 'l-line' }, statusBadge(r),
          h('span', { class: 'rt-box', title: `实时并发 ${conc} · 会话 ${dash(rt.sessions)} · Session Slots 使用中 ${dash(hl.session_slots)}` },
            h('b', { class: 'rt-num' + (conc > 0 ? ' live' : ''), text: String(conc) }),
            h('span', { text: `会话 ${dash(rt.sessions)}` }),
            hl.session_slots !== undefined && hl.session_slots !== null ? h('span', { class: 'faint', text: `· 槽位 ${hl.session_slots}` }) : null)),
        healthBar(r),
        h('div', { class: 'l-line', style: { marginTop: '6px' } }, ipMini(r, shared || {}))),
      // 请求
      h('td', { 'data-label': '请求' },
        h('div', { class: 'req' },
          h('span', { class: 'req-k', text: '今日' }), h('span', {}, h('b', { class: 'mono', text: compact(t.requests) }), h('span', { class: 'faint xs', text: ' req' })),
          h('span', { class: 'req-k', text: '7D' }), h('span', {}, h('span', { class: 'pill p-ok', title: '最近 7 天请求数', text: compact(hs['7d'] && hs['7d'].requests) })),
          h('span', { class: 'req-k', text: '24H' }), h('span', {},
            h('span', { class: 'pill p-ok', title: '24 小时请求数', text: dash(hl.requests_24h) }),
            h('span', { class: 'pill ' + ((toNum(hl.rate_limits_24h) || 0) > 0 ? 'p-bad' : 'p-mute'), title: '24 小时限流次数', text: dash(hl.rate_limits_24h) })),
          h('span', { class: 'req-k', text: 'RPM' }), h('span', { class: 'mono small', title: `TPM ${dash(rt.tpm)}`, text: `${dash(rt.rpm)} · TPM ${compact(rt.tpm)}` }))),
      // 额度
      h('td', { 'data-label': '额度窗口' }, quotaRows(r)),
      // 消耗
      h('td', { 'data-label': '消耗' },
        h('div', { class: 'cost' },
          costRow('今日', t.cost, t.tokens), costRow('5H', hs['5h'] && hs['5h'].official_cost, hs['5h'] && hs['5h'].tokens),
          costRow('7D', hs['7d'] && hs['7d'].official_cost, hs['7d'] && hs['7d'].tokens), costRow('30D', hs['30d'] && hs['30d'].official_cost, hs['30d'] && hs['30d'].tokens, true))),
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
    const keys = [...WIN_ORDER.filter((k) => r.quota && r.quota[k]), ...Object.keys(r.quota || {}).filter((k) => !WIN_ORDER.includes(k))];
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
        append(box, label, h('div', { class: 'q-track' }, fill), h('span', { class: 'q-pct ' + (lv === 'ok' ? '' : lv), text: pct(p) }),
          h('span', { class: 'q-left mono' + (pend ? ' text-warn' : ''), title: q.reset_at ? '重置于 ' + fmtTime(q.reset_at) : '重置时间未知', text: left && (left !== '待刷新' || pend) ? left : (left === '待刷新' ? '已重置' : '—') }));
      } else {
        append(box, label, h('span', { class: 'q-note', text: q.status || '未返回独立额度' }));
      }
    }
    const rc = Object.entries(r.reset_counts || {}).filter(([, v]) => v !== null && v !== undefined && v !== '');
    if (rc.length) box.append(h('div', { class: 'q-foot' }, icon('refresh', 'icon icon-sm'), '重置次数 ' + rc.map(([k, v]) => `${k} ${v}`).join(' · ')));
    return box;
  }
  function costRow(k, cost, tok, strong) {
    return h('div', { class: 'cost-row' + (strong ? ' strong' : '') }, h('span', { class: 'q-k', text: k }), h('span', { class: 'mono', text: dash(cost) }), h('span', { class: 'mono faint', text: tok ? compact(tok) + ' tok' : '—' }));
  }
  function healthBar(r) {
    const d = r.detail || {}, hl = r.health || {};
    const off = r.state && r.state !== '启用';
    const st = off ? (r.state || '停用') : (d.cooldown_text ? '冷却中' : d.status === '正常' || !d.status ? '可用' : d.status);
    const tone = off ? 'gray' : st === '可用' ? 'ok' : /冷却|限流|过载/.test(st) ? 'warn' : 'bad';
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
  const maxPct = (r) => Math.max(-1, ...Object.values(r.quota || {}).map((q) => (typeof q.used_pct === 'number' ? q.used_pct : -1)));
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
    const d = r.detail || {}, hl = r.health || {}, rt = d.realtime || {}, hs = d.history || {};
    const mp = maxPct(r), off = r.state && r.state !== '启用';
    const lastUsed = ago(d.last_used_at) || hl.last_used_display;
    const old = d.usage_updated_at && Date.now() - toDate(d.usage_updated_at).getTime() > 30 * 60000;
    const statRow = (label, x, costKey) => h('tr', {}, h('td', { text: label }), h('td', { text: compact(x && x.requests) }),
      h('td', { text: compact(x && x.tokens) }), h('td', { class: 'text-ok', title: x && x.billed_cost ? `计费价 ${x.billed_cost}` : null, text: dash(x && x[costKey]) }));
    const tags = [seatBadge(r, isAdmin()), ...planChips(r), ...(r.groups || []).map((g) => h('span', { class: 'chip chip-orange', text: g }))].filter(Boolean);
    return h('div', { class: 'acard' + (off ? ' off' : mp >= 90 ? ' hot' : mp >= 75 ? ' warm' : '') },
      h('div', { class: 'ac-head' },
        h('div', { class: 'ac-id' },
          h('div', { class: 'row', style: { gap: '8px', flexWrap: 'wrap' } }, h('span', { class: 'ac-name', text: dash(r.display_name) }), statusBadge(r)),
          r.email ? h('div', { class: 'email mono', title: r.email + '（点击复制）', onclick: () => copy(r.email, '邮箱') }, r.email) : null),
        h('div', { class: 'ac-meta' },
          h('div', { title: d.last_used_at ? '最近使用：' + fmtTime(d.last_used_at) : '' }, lastUsed ? `${lastUsed}使用` : '—'),
          d.usage_updated_at ? h('div', { class: old ? 'text-warn' : '', title: '后台最近一次刷新该账号用量：' + fmtTime(d.usage_updated_at) }, `用量 ${ago(d.usage_updated_at)}更新`) : null)),
      tags.length ? h('div', { class: 'chips' }, tags) : null,
      d.cooldown_text ? h('div', { class: 'notice n-warn', style: { margin: 0, padding: '6px 10px' } }, icon('clock', 'icon icon-sm'), h('span', { text: d.cooldown_text })) : null,
      h('div', { class: 'ac-sec' }, usageBlock(r, false)),
      h('div', { class: 'ac-sec' }, h('table', { class: 'mini' },
        h('thead', {}, h('tr', {}, ['', '请求', 'Token', '费用'].map((x) => h('th', { text: x })))),
        h('tbody', {}, statRow('今日', d.today, 'cost'), statRow('近 5 小时', hs['5h'], 'official_cost'), statRow('近 7 天', hs['7d'], 'official_cost')))),
      h('div', { class: 'ac-sec ac-foot' }, ipLine(r, shared || {}),
        h('div', { class: 'ac-rt' },
          h('span', { text: `并发 ${dash(rt.concurrency)}` }), h('span', { text: `RPM ${dash(rt.rpm)}` }), h('span', { text: `TPM ${dash(rt.tpm)}` }), h('span', { text: `会话 ${dash(rt.sessions)}` }),
          h('i'), h('span', { title: '最近 24 小时', text: `24h 请求 ${dash(hl.requests_24h)}` }), h('span', { text: `限流 ${dash(hl.rate_limits_24h)}` }), h('span', { text: `成功率 ${dash(hl.success_24h)}` }))));
  }
  const isAbnormal = (r) => (r.state && r.state !== '启用') || (r.detail && ((r.detail.status && r.detail.status !== '正常') || r.detail.cooldown_text || (r.detail.proxy && r.detail.proxy.mode === 'proxy' && r.detail.proxy.health && r.detail.proxy.health !== '可用')));
  const SORTS = {
    '7d': { label: '7d 用量从高到低', fn: (r) => (r.quota && r.quota['7d'] && typeof r.quota['7d'].used_pct === 'number' ? r.quota['7d'].used_pct : -1), desc: true },
    '5h': { label: '5h 用量从高到低', fn: (r) => (r.quota && r.quota['5h'] && typeof r.quota['5h'].used_pct === 'number' ? r.quota['5h'].used_pct : -1), desc: true },
    reset: { label: '5h 最先重置', fn: (r) => { const q = r.quota && r.quota['5h']; const t = q && q.reset_at ? toDate(q.reset_at).getTime() : Infinity; return t; }, desc: false },
    cost: { label: '今日费用从高到低', fn: (r) => toNum(r.detail && r.detail.today && r.detail.today.cost) || 0, desc: true },
    recent: { label: '最近使用', fn: (r) => (r.detail && r.detail.last_used_at ? toDate(r.detail.last_used_at).getTime() : 0), desc: true },
    name: { label: '名称', fn: (r) => r.display_name || '', desc: false },
    ip: { label: '出口 IP', fn: (r) => (ipOf(r) || '~').split('.').map((x) => x.padStart(3, '0')).join('.'), desc: false },
  };

  function autoRefreshControl(onRefresh) {
    const OPTS = [0, 60, 300, 600];
    const rawSec = localStorage.getItem('polo_refresh');
    let sec = rawSec === null ? 300 : Number(rawSec);
    if (!OPTS.includes(sec)) sec = 300;
    let left = sec;
    const label = h('span');
    const btn = h('button', { class: 'btn btn-secondary btn-sm', type: 'button', title: '自动刷新' }, icon('clock', 'icon icon-sm'), label);
    const fmt = (s) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`);
    const paint = () => { label.textContent = sec ? `自动刷新 · ${fmt(left)}` : '自动刷新：关'; };
    btn.addEventListener('click', () => menu(btn, [
      { label: '关闭自动刷新', checked: sec === 0, onClick: () => set(0) },
      '-',
      ...[60, 300, 600].map((s) => ({ label: `每 ${s / 60} 分钟`, checked: sec === s, onClick: () => set(s) })),
    ]));
    function set(s) { sec = s; left = s; localStorage.setItem('polo_refresh', String(s)); paint(); }
    S.timers.push(setInterval(() => {
      if (!sec || document.hidden) return;
      left -= 1;
      if (left <= 0) { left = sec; onRefresh(); }
      paint();
    }, 1000));
    paint();
    return { el: btn, reset: () => { left = sec; paint(); } };
  }

  async function pageDashboard() {
    const admin = isAdmin();
    const { main } = appLayout({ active: '#/dashboard', title: '用量看板', desc: admin ? '全部账号的额度、用量与重置时间' : '你可以查看的账号额度、用量与重置时间' });
    const notices = h('div');
    const stats = h('div', { class: 'stats' + (admin ? '' : ' s3') }, skeletonStats(admin ? 8 : 6));
    const search = leadInput('search', { class: 'input input-sm has-lead', placeholder: '搜索账号、邮箱、IP、分组', type: 'search' });
    search.wrap.style.width = '240px';
    let filter = 'all';
    let sortKey = localStorage.getItem('polo_sort') || '7d';
    if (!SORTS[sortKey]) sortKey = '7d';
    const seg = h('div', { class: 'seg' });
    const segs = [['all', '全部'], ['high', '高用量'], ['abnormal', '异常']];
    const paintSeg = () => clear(seg, segs.map(([k, l]) => h('button', { type: 'button', class: filter === k ? 'on' : '', onclick: () => { filter = k; paintSeg(); drawTable(); } }, l)));
    paintSeg();
    const sortSel = h('select', { class: 'select select-sm', style: { width: 'auto' } }, Object.entries(SORTS).map(([k, v]) => h('option', { value: k, selected: k === sortKey, text: v.label })));
    let view = localStorage.getItem('polo_view') === 'card' ? 'card' : 'list';
    const viewSeg = h('div', { class: 'seg', title: '显示方式' });
    const paintView = () => clear(viewSeg, [['list', '列表'], ['card', '卡片']].map(([k, l]) => h('button', { type: 'button', class: view === k ? 'on' : '', onclick: () => { view = k; localStorage.setItem('polo_view', k); paintView(); drawTable(); } }, l)));
    paintView();
    sortSel.addEventListener('change', () => { sortKey = sortSel.value; localStorage.setItem('polo_sort', sortKey); drawTable(); });
    search.input.addEventListener('input', () => drawTable());
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
    append(main, notices, stats,
      h('div', { class: 'card' },
        h('div', { class: 'card-head' },
          h('div', { class: 'row wrap' }, h('h2', { class: 'card-title' }, icon('server'), '账号额度'), countText),
          h('div', { class: 'toolbar' }, search.wrap, seg, sortSel, viewSeg)),
        h('div', { class: 'card-head', style: { borderBottom: '1px solid var(--border)', paddingTop: '10px', paddingBottom: '10px' } },
          updated, h('div', { class: 'toolbar' }, auto.el, refreshBtn)),
        listBox),
      admin ? ops : null);

    function drawTable() {
      S.redrawAccounts = drawTable;
      const d = S.dash;
      if (!d) return;
      const rows = (d.accounts && d.accounts.data && d.accounts.data.rows) || [];
      const q = search.input.value.trim().toLowerCase();
      let list = rows.filter((r) => !q || [r.display_name, r.email, ipOf(r), r.seat === 'premium' ? 'team 高级' : r.seat === 'standard' ? 'team 标准 普通' : '待标记', ...(r.groups || []), ...(r.plan || [])].join(' ').toLowerCase().includes(q));
      if (filter === 'high') list = list.filter((r) => maxPct(r) >= 75);
      if (filter === 'abnormal') list = list.filter(isAbnormal);
      const s = SORTS[sortKey];
      list.sort((a, b) => {
        const x = s.fn(a), y = s.fn(b);
        const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'zh-CN', { numeric: true });
        return s.desc ? -c : c;
      });
      countText.textContent = `显示 ${list.length} / ${rows.length} 个`;
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
    function drawStats() {
      const d = S.dash;
      const rows = (d.accounts && d.accounts.data && d.accounts.data.rows) || [];
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
          statCard('今日请求', compact(todayReq), 'activity', 'purple', `RPM ${dash(m['自身 RPM'])} · 总池 ${dash(m['总池 RPM'])}`),
          statCard('今日 Token', compact(todayTok), 'cube', 'cyan', '各账号今日合计'));
      } else {
        let next = null;
        for (const r of rows) for (const [k, q] of Object.entries(r.quota || {})) {
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
          : h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
            h('thead', {}, h('tr', {}, ['出口 IP', '协议 / 端口', '健康', '成功 / 失败', '使用的账号', '最近使用'].map((t) => h('th', { text: t })))),
            h('tbody', {}, [...list].sort((a, b) => (b.accounts || []).length - (a.accounts || []).length).map((p) => {
              const ip = p.ip || p.host;
              const tone = p.health === '可用' ? (p.latency_ms >= 500 ? 'b-warn' : 'b-ok') : 'b-bad';
              const acc = p.accounts || [];
              return h('tr', {},
                h('td', {}, h('span', { class: 'mono ip', title: (p.host && p.host !== ip ? `主机名：${p.host}\n` : '') + '点击复制', onclick: () => copy(ip, ' IP') }, dash(ip))),
                h('td', { class: 'mono small' }, `${dash(p.protocol)} · ${dash(p.port)}`),
                h('td', {}, h('span', { class: 'badge ' + tone, text: dash(p.health) + (p.latency_ms !== null && p.latency_ms !== undefined ? ` ${p.latency_ms}ms` : '') })),
                h('td', { class: 'num small' }, `${dash(p.success)} / ${dash(p.fail)}`),
                h('td', {}, acc.length ? h('div', { class: 'chips' }, acc.map((k) => h('span', { class: 'chip' + (acc.length > 1 ? ' chip-warn' : ' chip-blue'), title: keyText(k), text: names[k] || keyText(k) }))) : h('span', { class: 'faint small', text: '未绑定' })),
                h('td', { class: 'small nowrap' }, dash(p.last_used)));
            }))));
      return h('div', { class: 'card', style: { gridColumn: '1 / -1' } },
        h('div', { class: 'card-head' }, h('h3', { class: 'card-title' }, icon('globe'), '出站代理', data && data.coverage ? h('span', { class: 'faint xs', style: { fontWeight: 400 }, text: data.coverage }) : null), res && res.sampled_at ? h('span', { class: 'faint xs', text: ago(res.sampled_at) }) : null),
        h('div', { class: 'card-body', style: { padding: list.length ? '0' : null } }, body));
    }

    let loading = false;
    async function load() {
      if (loading) return;
      loading = true;
      refreshBtn.disabled = true; clear(refreshBtn, icon('refresh', 'icon icon-sm spin'), '刷新中');
      try {
        const keys = admin ? Object.keys(ADMIN_RESOURCES) : ['accounts', 'archived'];
        const settled = await Promise.allSettled(keys.map((k) => api('GET', ADMIN_RESOURCES[k])));
        if (!S.token) return;
        if (settled.every((x) => x.status === 'rejected')) {
          const e = settled[0].reason;
          if (e && (e.status === 401 || e.code === 'password_change_required')) return;
          toast(errText(e), 'bad');
          if (!S.dash) { const err = emptyState(errText(e), 'warning'); clear(tbody, h('tr', {}, h('td', { colspan: '6' }, err.cloneNode(true)))); clear(grid, h('div', { style: { gridColumn: '1 / -1' } }, err)); }
          return;
        }
        S.dash = Object.fromEntries(keys.map((k, i) => [k, settled[i].status === 'fulfilled' ? settled[i].value : null]));
        drawNotices(); drawStats(); drawTable(); drawOps();
      } finally {
        loading = false;
        refreshBtn.disabled = false; clear(refreshBtn, icon('refresh', 'icon icon-sm'), '刷新');
      }
    }
    S.timers.push(setInterval(() => { if (!document.hidden && S.dash) { drawTable(); if (!admin) drawStats(); } }, 30000));
    if (S.dash) { drawNotices(); drawStats(); drawTable(); drawOps(); }
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
    async function load() {
      refresh.disabled = true;
      try {
        res = await api('GET', '/v1/archived-accounts');
        recs = (res.data && res.data.records) || [];
        clear(updated, icon('clock', 'icon icon-sm'), `数据采集于 ${fmtTime(res.sampled_at, false)}（${ago(res.sampled_at)}）`,
          res.stale ? h('span', { class: 'badge b-warn', style: { marginLeft: '6px' }, text: '可能已过期' }) : null);
        clear(notice, res.data && res.data.complete === false ? h('div', { class: 'notice n-warn' }, icon('warning'), h('span', { text: '后台归档列表没有读全，显示的不是全部归档账号。' })) : null);
        drawStats(); draw();
      } catch (e) {
        clear(stats); clear(tbody, h('tr', {}, h('td', { colspan: '7' }, emptyState(errText(e), 'warning'))));
      } finally { refresh.disabled = false; }
    }
    load();
  }

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
    const search = leadInput('search', { class: 'input input-sm has-lead', placeholder: '搜索用户名', type: 'search' });
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
          title: `${u.username} 可以查看的账号`, wide: true, body: picker.el,
          actions: [{ label: '取消' }, { label: '保存', kind: 'btn-primary', onClick: async () => !!(await act(u, 'accounts', { accounts: picker.get() }, '可见账号已更新')) }],
        });
      }).catch((e) => toast(errText(e), 'bad'));
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
      const list = users.filter((u) => (filter === 'all' || u.status === filter) && (!q || u.username.toLowerCase().includes(q)));
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
          h('td', { 'data-label': '' }, h('div', { class: 'row' }, h('span', { class: 'avatar', text: u.username.slice(0, 1) }),
            h('div', {}, h('div', { class: 'cell-title', text: u.username }),
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
