#!/usr/bin/env node
/* 把整个游戏打成单文件。
 *
 * 产出两份：
 *   dist/standalone.html — 完整 HTML 文档，双击就能开，也能扔到任何静态托管上
 *   dist/artifact.html   — 去掉 doctype/html/head/body 的版本，给 Claude Artifact 用
 *
 * 用法：node build.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// 顺序必须和 index.html 里的 <script> 一致
const SCRIPTS = ['save', 'audio', 'monetize', 'input', 'upgrades', 'entities', 'ui', 'game'];

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const css = read('css/style.css');
const html = read('index.html');

// 抓取 <div id="app"> ... </div>（页面里唯一的顶层容器）
const appMatch = html.match(/<div id="app">[\s\S]*?\n<\/div>/);
if (!appMatch) {
  console.error('构建失败：在 index.html 里找不到 <div id="app"> 容器');
  process.exit(1);
}
const appHtml = appMatch[0];

const js = SCRIPTS.map(name => {
  const src = read(`js/${name}.js`);
  return `/* ===== js/${name}.js ===== */\n${src}`;
}).join('\n');

// 内嵌环境里 <meta> 写在 body 中不可靠，改成运行时注入 head
const VIEWPORT_SHIM = `
/* 视口与主题色：内嵌页面拿不到我们自己的 <head>，运行时补上。
   没有这段的话手机上会按 980px 桌面宽度渲染，整个游戏缩成邮票大小。 */
(function () {
  function meta(name, content) {
    if (document.querySelector('meta[name="' + name + '"]')) return;
    var m = document.createElement('meta');
    m.setAttribute('name', name);
    m.setAttribute('content', content);
    document.head.appendChild(m);
  }
  meta('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  meta('theme-color', '#0a0e14');
  meta('apple-mobile-web-app-capable', 'yes');
  meta('mobile-web-app-capable', 'yes');
})();
`.trim();

const TITLE = '枪火幸存者 ZOUL SURVIVORS';

const head = `<title>${TITLE}</title>
<style>
${css}
</style>`;

const bodyContent = `${appHtml}

<script>
${VIEWPORT_SHIM}
</script>
<script>
${js}
</script>`;

fs.mkdirSync(DIST, { recursive: true });

// Artifact：外层会补 doctype/html/head/body，这里直接给页面内容
fs.writeFileSync(path.join(DIST, 'artifact.html'), head + '\n\n' + bodyContent + '\n');

// 独立文件：完整文档，head 和 body 各归各位
fs.writeFileSync(path.join(DIST, 'standalone.html'),
  '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n' +
  '<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n' +
  '<meta name="theme-color" content="#0a0e14">\n' +
  '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
  '<meta name="mobile-web-app-capable" content="yes">\n' +
  head + '\n</head>\n<body>\n' + bodyContent + '\n</body>\n</html>\n');

const kb = n => (n / 1024).toFixed(1) + ' KB';
console.log('已生成：');
for (const f of ['artifact.html', 'standalone.html']) {
  console.log('  dist/' + f.padEnd(18), kb(fs.statSync(path.join(DIST, f)).size));
}
