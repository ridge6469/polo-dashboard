'use strict';
(() => {
  const API = 'https://notes.fuckingclaude.top:8446/polo';
  const TOKEN_KEY = 'polo_dashboard_token';
  const AUTO_REFRESH_MS = 5 * 60 * 1000;
  const QUOTA_COLUMNS = ['5h', '7d', 'Fable 5', 'Sonnet'];
  const $ = (id) => document.getElementById(id);
  let timer = null;
  let accounts = [];
  let sort = { key: '7d', asc: false };

  // ---------- 工具 ----------
  const el = (tag, attrs = {}, ...children) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v);
    }
    for (const c of children) if (c != null) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return n;
  };
  const dash = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));
  const fmtTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  const level = (p) => (p >= 80 ? 'lv-bad' : p >= 50 ? 'lv-warn' : 'lv-ok');
  const num = (s) => {
    if (s === null || s === undefined) return null;
    const m = String(s).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : null;
  };

  // ---------- 登录状态 ----------
  const getToken = () => {
    try {
      const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null');
      return t && t.exp > Date.now() ? t.token : null;
    } catch { return null; }
  };
  const setToken = (token, ttl) => sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, exp: Date.now() + (ttl - 60) * 1000 }));
  const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

  class AuthError extends Error {}
  async function api(path) {
    const token = getToken();
    if (!token) throw new AuthError();
    const r = await fetch(API + path, { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store', referrerPolicy: 'no-referrer' });
    if (r.status === 401) throw new AuthError();
    const body = await r.json().catch(() => ({}));
    return { status: r.status, body };
  }

  function showLogin(message = '') {
    clearInterval(timer); timer = null;
    $('app').hidden = true;
    $('login').hidden = false;
    $('login-error').textContent = message;
    $('password').value = '';
    $('password').focus();
  }

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('login-btn');
    btn.disabled = true; $('login-error').textContent = '';
    try {
      const r = await fetch(API + '/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: $('password').value }), referrerPolicy: 'no-referrer',
      });
      const body = await r.json().catch(() => ({}));
      if (r.ok && body.token) { setToken(body.token, body.expires_in || 3600); start(); return; }
      $('login-error').textContent = r.status === 401 ? '密码错误。'
        : r.status === 429 ? '尝试次数过多，请 15 分钟后再试。' : '登录失败（HTTP ' + r.status + '）。';
    } catch {
      $('login-error').textContent = '无法连接服务器，请检查网络后重试。';
    } finally { btn.disabled = false; }
  });

  $('logout-btn').addEventListener('click', async () => {
    const token = getToken();
    clearToken();
    if (token) fetch(API + '/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + token } }).catch(() => {});
    showLogin('已退出。');
  });
  $('refresh-btn').addEventListener('click', () => load());

  // ---------- 渲染 ----------
  function renderSummary(res) {
    const box = $('summary'); box.replaceChildren();
    const m = res?.body?.data?.metrics || {};
    const items = [
      ['今日自身额度', m['今日自身额度']], ['近 7 日自身额度', m['最近7日自身额度']], ['近 30 日自身额度', m['最近30日自身额度']],
      ['缓存命中率', m['缓存命中率']], ['自身可用账号', m['自身可用账号']], ['自身冷却中', m['自身冷却中']],
      ['自身 RPM', m['自身 RPM']], ['总池 RPM', m['总池 RPM']],
    ];
    for (const [label, v] of items) box.append(el('div', { class: 'metric' }, el('div', { class: 'label', text: label }), el('div', { class: 'value', text: dash(v) })));
  }

  function quotaCell(q) {
    if (!q) return el('span', { class: 'muted', text: '—' });
    if (typeof q.used_pct === 'number') {
      const p = Math.max(0, Math.min(100, q.used_pct));
      const fill = el('div', { class: 'fill ' + level(p) }); fill.style.width = p + '%';
      return el('div', { class: 'bar' }, el('div', { class: 'track' }, fill), el('span', { class: 'num', text: q.used_pct + '%' }));
    }
    if (q.status) return el('span', { class: 'tag warn', text: q.status });
    return el('span', { class: 'muted', text: '—' });
  }

  const sortValue = (row, key) => {
    if (QUOTA_COLUMNS.includes(key)) { const q = row.quota?.[key]; return typeof q?.used_pct === 'number' ? q.used_pct : -1; }
    if (key === 'name') return row.display_name || '';
    if (key === 'state') return row.state || '';
    if (key === 'requests') return num(row.health?.requests_24h) ?? -1;
    if (key === 'limits') return num(row.health?.rate_limits_24h) ?? -1;
    if (key === 'success') return num(row.health?.success_24h) ?? -1;
    return '';
  };

  function renderAccounts() {
    const cols = [
      ['name', '账号'], ['state', '状态'], ['groups', '分组 / 套餐'],
      ...QUOTA_COLUMNS.map((k) => [k, k + ' 已用']),
      ['requests', '24h 请求'], ['success', '24h 成功率'], ['limits', '24h 限流'], ['last', '最近使用'],
    ];
    const sortable = new Set(['name', 'state', ...QUOTA_COLUMNS, 'requests', 'success', 'limits']);
    const thead = el('tr');
    for (const [key, label] of cols) {
      const th = el('th', { text: label });
      if (sort.key === key) th.className = 'sorted' + (sort.asc ? ' asc' : '');
      if (sortable.has(key)) th.addEventListener('click', () => {
        sort = sort.key === key ? { key, asc: !sort.asc } : { key, asc: key === 'name' || key === 'state' };
        renderAccounts();
      });
      thead.append(th);
    }
    const rows = [...accounts].sort((a, b) => {
      const x = sortValue(a, sort.key), y = sortValue(b, sort.key);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'zh-CN', { numeric: true });
      return sort.asc ? c : -c;
    });
    const tbody = el('tbody');
    for (const r of rows) {
      const h = r.health || {};
      const tags = el('td');
      for (const g of r.groups || []) tags.append(el('span', { class: 'tag gray', text: g }));
      for (const p of r.plan || []) tags.append(el('span', { class: 'tag', text: p }));
      tbody.append(el('tr', {},
        el('td', { text: dash(r.display_name) }), el('td', { text: dash(r.state) }), tags,
        ...QUOTA_COLUMNS.map((k) => el('td', {}, quotaCell(r.quota?.[k]))),
        el('td', { text: dash(h.requests_24h) }), el('td', { text: dash(h.success_24h) }),
        el('td', { text: dash(h.rate_limits_24h) }), el('td', { text: dash(h.last_used_display) }),
      ));
    }
    $('accounts').replaceChildren(el('thead', {}, thead), tbody);
  }

  function accountStats(data) {
    const cov = data?.coverage;
    const high = accounts.filter((r) => (r.quota?.['7d']?.used_pct ?? -1) >= 80).length;
    const pending = accounts.filter((r) => Object.values(r.quota || {}).some((q) => q?.status)).length;
    const parts = [`共 ${accounts.length} 个账号`];
    if (cov && !data.complete) parts.push(`⚠ 仅读取到第 ${cov.first}-${cov.last} 个（全部 ${cov.total} 个）`);
    parts.push(`7d 已用 ≥80%：${high} 个`);
    if (pending) parts.push(`有权限待确认：${pending} 个`);
    return parts.join(' · ');
  }

  function dl(pairs) {
    const d = el('dl');
    for (const [k, v] of pairs) d.append(el('dt', { text: k }), el('dd', { text: dash(v) }));
    return d;
  }
  const unavailable = (res) => el('p', { class: 'muted', text: res?.status === 503 ? '暂无数据（服务器还没采集成功）。' : '读取失败。' });

  function renderPanels(r) {
    const usage = r.usage?.body?.data;
    $('usage').replaceChildren(usage ? dl([
      ['区间消费', usage.range_cost_display],
      ['已加载请求', usage.row_count != null ? usage.row_count + ' 条' + (usage.more_available ? '（还有更多，未全部加载）' : '') : null],
      ['状态分布', Object.entries(usage.visible_status_counts || {}).map(([k, v]) => `${k}: ${v}`).join('，')],
    ]) : unavailable(r.usage));

    const px = r.proxies?.body?.data;
    $('proxies').replaceChildren(px ? dl([
      ['数量', px.coverage || (px.row_count != null ? px.row_count + ' 个' : null)],
      ...Object.entries(px.health_counts || {}).map(([k, v]) => [k, v + ' 个']),
    ]) : unavailable(r.proxies));

    const ar = r.archived?.body?.data;
    $('archived').replaceChildren(ar ? dl([
      ['当前页', ar.row_count != null ? ar.row_count + ' 个' + (ar.has_next ? '（还有下一页）' : '') : null],
      ['最早归档', ar.archived_time_range?.first], ['最近归档', ar.archived_time_range?.last],
    ]) : unavailable(r.archived));

    const vu = r.vendor?.body?.data;
    const stateText = { rows_visible: '有结果', query_running: '原站查询进行中', no_visible_results: '默认视图无可见结果' };
    $('vendor').replaceChildren(vu ? dl([
      ['状态', stateText[vu.query_state] || vu.query_state],
      ['请求数', vu.metrics?.['请求数']], ['Tokens', vu.metrics?.Tokens], ['成本', vu.metrics?.['成本']],
    ]) : unavailable(r.vendor));
  }

  async function load() {
    const btn = $('refresh-btn'); btn.disabled = true;
    try {
      const names = { accounts: '/v1/accounts', summary: '/v1/summary', usage: '/v1/usage', proxies: '/v1/proxies', archived: '/v1/archived-accounts', vendor: '/v1/vendor-usage' };
      const keys = Object.keys(names);
      const settled = await Promise.allSettled(keys.map((k) => api(names[k])));
      if (settled.some((s) => s.status === 'rejected' && s.reason instanceof AuthError)) { clearToken(); showLogin('登录已过期，请重新登录。'); return; }
      if (settled.every((s) => s.status === 'rejected')) {
        $('notice').hidden = false;
        $('notice').textContent = '无法连接服务器' + (accounts.length ? '，下面是上次读取的结果。' : '，请稍后点“刷新”重试。');
        return;
      }
      const r = Object.fromEntries(keys.map((k, i) => [k, settled[i].status === 'fulfilled' ? settled[i].value : null]));

      const acc = r.accounts?.body;
      accounts = acc?.data?.rows || [];
      renderSummary(r.summary);
      renderAccounts();
      $('account-stats').textContent = acc?.data ? accountStats(acc.data) : '账号数据读取失败。';
      renderPanels(r);

      $('updated').textContent = acc?.sampled_at ? `数据采集于 ${fmtTime(acc.sampled_at)}（北京时间）· 页面读取于 ${fmtTime(new Date().toISOString())}` : '';
      const notes = [];
      if (acc?.stale) notes.push('账号数据已超过 20 分钟未成功更新，可能不是最新。');
      const cacheNotice = r.summary?.body?.data?.source_cache_notice;
      if (cacheNotice) notes.push('后台提示：' + cacheNotice);
      $('notice').hidden = !notes.length;
      $('notice').textContent = notes.join(' ');
    } finally { btn.disabled = false; }
  }

  function start() {
    $('login').hidden = true;
    $('app').hidden = false;
    load();
    clearInterval(timer);
    timer = setInterval(() => { if (!document.hidden) load(); }, AUTO_REFRESH_MS);
  }

  if (getToken()) start(); else showLogin();
})();
