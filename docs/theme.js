// 在页面渲染前套上主题（浅色 / 深色）和强调色，避免先闪一下默认的样子。
(function () {
  try {
    var root = document.documentElement;
    var t = localStorage.getItem('polo_theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) root.classList.add('dark');
    var a = localStorage.getItem('polo_accent');
    root.setAttribute('data-accent', a === 'amber' || a === 'teal' ? a : 'cobalt');
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', dark ? '#141415' : '#fafafa');
  } catch (e) { /* ignore */ }
})();
