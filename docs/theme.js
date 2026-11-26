// 在页面渲染前应用主题，避免深色模式下闪白。
(function () {
  try {
    var t = localStorage.getItem('polo_theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) { /* ignore */ }
})();
