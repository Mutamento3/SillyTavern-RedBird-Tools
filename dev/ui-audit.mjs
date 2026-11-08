/**
 * 界面自检：把三栏界面里的每个主要界面在手机（390 宽）和电脑（1280 宽）上各打开一次，
 * 截图，并用 dev/ui-lint.js 检查对齐、间距、横向溢出和点击区域大小。规范见 DESIGN.md「改完之后」。
 *
 *   node dev/ui-audit.mjs --url http://localhost:8021/ --out <截图目录> [--char 霁蓝] [--only phone|desk] [--screens wi,saves]
 *
 * 需要：一个开着三栏界面的酒馆（建议用演示数据，别用自己的存档），本机装了 Chrome。
 * 结果：每个界面一张 PNG，外加 report.json；问题会打印出来。有问题时退出码为 1。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const URL = arg('url', 'http://localhost:8000/');
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'rbt-ui-audit')));
const CHAR = arg('char', '');
const ONLY = arg('only', '');
const PICK = (arg('screens', '') || '').split(',').filter(Boolean);
const CHROME = arg('chrome', process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : 'google-chrome');
const LINT = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'ui-lint.js'), 'utf8');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- CDP ---
async function openBrowser() {
  const port = 9400 + Math.floor(Math.random() * 400);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'rbt-audit-chrome-'));
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--lang=zh-CN', 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 80 && !target; i++) {
    await sleep(250);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* not up */ }
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { (m.error ? pending.get(m.id).rej : pending.get(m.id).res)(m.error ?? m.result); pending.delete(m.id); } });
  const send = (method, params = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise((res, rej) => pending.set(i, { res, rej })); };
  await send('Page.enable'); await send('Runtime.enable');
  const run = async (body) => {
    const r = await send('Runtime.evaluate', { expression: `(async () => { const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${LINT}; ${body} })()`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails).slice(0, 300));
    return r.result.value;
  };
  return { send, run, close: () => { try { ws.close(); } catch { /* */ } proc.kill(); } };
}

// ------------------------------------------------------------ screens ---
// open: 打开这个界面的步骤（页面里执行）；root: 要检查的那块界面的选择器。
const H = `
  const c = SillyTavern.getContext();
  const q = (s) => document.querySelector(s);
  const btnText = (t, root = document) => [...root.querySelectorAll('button, .rbt-gbtn')].find((x) => x.textContent.trim() === t) || [...root.querySelectorAll('button')].find((x) => x.textContent.includes(t));
  const phone = innerWidth < 1000;
  const menu = async () => { if (phone && !document.body.classList.contains('rbt-nav-open')) { q('.rbt-nav-menu')?.click(); await wait(600); } };
`;
const SCREENS = [
  { key: 'home', root: '.rbt-home-gallery', open: `q('.rbt-nav-menu')?.click(); await wait(400); q('.rbt-brand')?.click(); await wait(1500); if (phone) { q('.rbt-left-scrim')?.click(); await wait(400); }` },
  { key: 'left', root: '.rbt-left', open: `await menu();` },
  { key: 'chat', root: '.rbt-nav', open: `` },
  // 换卡时换预设的进度条：真实切换在本机太快看不到，直接把进度条放上去看样子
  { key: 'switching', root: '.rbt-nav', open: `const d = document.createElement('div'); d.className = 'rbt-nav-progress'; q('.rbt-nav').appendChild(d); await wait(1300);` },
  { key: 'toolbox-card', root: '.rbt-panel', open: `q('.rbt-toolbox-btn').click(); await wait(1000); btnText('角色档案', q('.rbt-panel')).click(); await wait(1500);` },
  { key: 'toolbox-flow', root: '.rbt-panel', open: `q('.rbt-toolbox-btn').click(); await wait(1000); btnText('信息流', q('.rbt-panel')).click(); await wait(1200);` },
  { key: 'toolbox-vars', root: '.rbt-panel', open: `q('.rbt-toolbox-btn').click(); await wait(1000); btnText('变量', q('.rbt-panel')).click(); await wait(1200);` },
  { key: 'saves', root: '#select_chat_popup', open: `(q('.rbt-nav-who') || q('.rbt-nav-save')).click(); await wait(1500);` },
  { key: 'editcard', root: '#right-nav-panel', open: `[...document.querySelectorAll('.rbt-nav .rbt-gbtn')].find((b) => (b.title || '').includes('编辑')).click(); await wait(1500);` },
  { key: 'worldinfo', root: '#WorldInfo', open: `await menu(); btnText('世界书', q('.rbt-left')).click(); await wait(2500);` },
  { key: 'worldinfo-entry', root: '#WorldInfo .world_entry', toggle: { hit: '#WorldInfo .world_entry .inline-drawer-header .inline-drawer-toggle', state: '#WorldInfo .world_entry > form > .inline-drawer > .inline-drawer-content' }, open: `await menu(); btnText('世界书', q('.rbt-left')).click(); await wait(2500); q('#WorldInfo .world_entry .inline-drawer-toggle')?.click(); await wait(1200); q('#WorldInfo .world_entry')?.scrollIntoView();` },
  { key: 'global', root: '.rbt-sheet', open: `await menu(); btnText('全局工具箱', q('.rbt-left')).click(); await wait(1500);` },
  { key: 'import', root: '.rbt-imp', open: `await menu(); q('.rbt-gtool-import').click(); await wait(800);` },
  { key: 'settings', root: '#rbt_settings', open: `await menu(); btnText('扩展·正则', q('.rbt-left')).click(); await wait(1500); const c2 = q('#rbt_settings .inline-drawer-content'); if (c2 && getComputedStyle(c2).display === 'none') { q('#rbt_settings .inline-drawer-toggle').click(); await wait(800); } for (const id of ['#rbt_update_row', '#rbt_thumb_tip']) q(id)?.removeAttribute('hidden'); /* 平时按条件才显示的，也一起检查 */ q('#rbt_settings').scrollIntoView();` },
];

const browser = await openBrowser();
const report = [];
let problems = 0;
try {
  for (const [label, w, h, dsf, mobile] of [['phone', 390, 844, 2, true], ['desk', 1280, 800, 1.5, false]]) {
    if (ONLY && ONLY !== label) continue;
    await browser.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dsf, mobile });
    await browser.send('Emulation.setTouchEmulationEnabled', mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
    for (const s of SCREENS) {
      if (PICK.length && !PICK.includes(s.key)) continue;
      await browser.send('Page.navigate', { url: URL }); await sleep(9000);
      let issues;
      try {
        issues = await browser.run(`${H}
          window.toastr?.clear();
          const dlg = q('dialog.popup[open]'); if (dlg) { dlg.querySelector('.popup-button-ok')?.click(); await wait(800); }
          ${CHAR ? `const i = c.characters.findIndex((x) => x.name === ${JSON.stringify(CHAR)}); if (i >= 0 && String(c.characterId) !== String(i)) { await c.selectCharacterById(i); await wait(3000); }` : ''}
          window.toastr?.clear();
          ${s.open}
          const root = q(${JSON.stringify(s.root)});
          const extra = [];
          ${s.toggle ? `{
            // 交互检查：点两次展开 / 收起，要回到原来的状态（不能「展开了收不回去」）
            const hit = () => q(${JSON.stringify(s.toggle.hit)});
            const state = () => getComputedStyle(q(${JSON.stringify(s.toggle.state)})).display;
            const before = state(); hit()?.click(); await wait(1200); const mid = state(); hit()?.click(); await wait(1200); const after = state();
            if (mid === before || after !== before) extra.push({ rule: 'toggle', where: ${JSON.stringify(s.toggle.hit)}, detail: \`展开收起不对：\${before} → \${mid} → \${after}\` });
            hit()?.click(); await wait(1200);
          }` : ''}
          if (!root) return [{ rule: 'missing', where: ${JSON.stringify(s.root)}, detail: '界面没打开' }];
          return [...extra, ...uiLint(root, { phone })];`);
      } catch (e) { issues = [{ rule: 'error', where: s.key, detail: String(e.message).slice(0, 200) }]; }
      const shot = await browser.send('Page.captureScreenshot', { format: 'png' });
      const file = path.join(OUT, `${label}-${s.key}.png`);
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      report.push({ screen: `${label}/${s.key}`, file, issues });
      problems += issues.length;
      console.log(`${issues.length ? '✗' : '✓'} ${label}/${s.key}${issues.length ? `  ${issues.length} 处` : ''}`);
      for (const i of issues) console.log(`    [${i.rule}] ${i.where} — ${i.detail}`);
    }
  }
} finally {
  browser.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
}
console.log(`\n截图和 report.json 在 ${OUT}`);
process.exit(problems ? 1 : 0);
