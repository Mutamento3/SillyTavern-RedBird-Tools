/**
 * 猜一个酒馆助手脚本会不会在屏幕上画东西（悬浮窗、面板、悬浮按钮）——列表里标「可能有前端」，
 * 玩家想找屏幕上多出来的东西时，先看这几个。
 *
 * 只是读代码猜：代码里有「固定在屏幕上」的样式，或者直接往酒馆页面里加东西，就算可能有。
 * 脚本只写一句 import 网上的文件时，把那个文件下载下来一起看（结果记在本机，7 天后重新看）。
 * 只弹酒馆自带弹窗、只弹提示的（比如 MVU）不算。
 */
import { thTick } from './th';

const SIGNS = [
  /position\s*:\s*['"]?fixed/i,
  /\$\(\s*['"`]body['"`]\s*\)|appendTo\(\s*['"`]body|document\.body\.(append|appendChild|insertAdjacent)/,
  /(window\.)?parent\.document|top\.document/,
];
const URL_RE = /https?:\/\/[^'"`\s)]+?\.m?js\b/g;
const KEY = 'rbt_script_ui_v1';
const TTL = 7 * 24 * 3600 * 1000;

const looks = (code: string) => SIGNS.some((re) => re.test(code));

let remote: Record<string, [boolean, number]> | null = null;
function store(): Record<string, [boolean, number]> {
  if (!remote) {
    try { remote = JSON.parse(localStorage.getItem(KEY) || '{}') ?? {}; } catch { remote = {}; }
  }
  return remote!;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(store())); } catch { /* 存不了就下次再下载 */ }
}

const queue: string[] = [];
const loading = new Set<string>();
let running = 0;
function pump() {
  while (running < 2 && queue.length) {
    const url = queue.shift()!;
    running++;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((code) => { store()[url] = [looks(code), Date.now()]; save(); thTick.value++; })
      .catch(() => { /* 下载不了就不标 */ })
      .finally(() => { running--; loading.delete(url); pump(); });
  }
}

const inline = new Map<string, boolean>();

/** true = 可能有前端；false = 看不出；null = 还在下载它引用的文件。 */
export function guessFrontend(id: string, content: string): boolean | null {
  const k = `${id}:${content.length}`;
  let own = inline.get(k);
  if (own === undefined) { own = looks(content); inline.set(k, own); }
  if (own) return true;
  const urls = [...new Set(content.match(URL_RE) ?? [])].slice(0, 3);
  let pending = false;
  for (const url of urls) {
    const hit = store()[url];
    if (hit && Date.now() - hit[1] < TTL) { if (hit[0]) return true; continue; }
    pending = true;
    if (!loading.has(url)) { loading.add(url); queue.push(url); }
  }
  if (pending) pump();
  return pending ? null : false;
}
