// Theme switcher: ?theme=<name> (remembered in localStorage) swaps the reveal.js theme.
(function () {
  var THEMES = {
    black: 0, night: 0, moon: 0, league: 0, blood: 0, dracula: 0,
    white: 1, simple: 1, beige: 1, sky: 1, solarized: 1, serif: 1   // 1 = light
  };
  var KEY = 'arivia-theme', name = null;
  try { name = new URLSearchParams(location.search).get('theme'); } catch (e) {}
  if (name && !(name in THEMES)) name = null;
  try {
    if (name) localStorage.setItem(KEY, name);
    else name = localStorage.getItem(KEY);
  } catch (e) {}
  if (!(name in THEMES)) name = 'night';
  var link = document.getElementById('theme');
  if (link) link.href = link.href.replace(/theme\/[a-z]+\.min\.css/, 'theme/' + name + '.min.css');
  if (THEMES[name]) document.documentElement.classList.add('light');
  document.documentElement.setAttribute('data-theme', name);
  window.ARIVIA_THEMES = THEMES;
})();
