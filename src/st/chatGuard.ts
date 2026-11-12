/**
 * 防止酒馆把存档覆盖成只剩开场白（规则见 core/chatGuard.ts）。
 * 留意「读聊天」「读角色卡」这几个请求成没成功；正在打开的存档没读出来时，在重新读成功之前拦下它的保存，告诉玩家刷新。
 * 只看这几个地址，其他请求原样放行；检查本身出错也原样放行，不挡正常使用。
 */
import { messagesIn, readOk, shouldBlockGroupSave, shouldBlockSave, worthChecking, describeSave } from '../core/chatGuard';
import { ctx, toast } from './st';

let installed = false;
/** 正在打开、但没读出来的存档（文件名）、角色卡（头像文件名）、群聊（id）。重新读成功后去掉。 */
const failedChats = new Set<string>();
const failedCards = new Set<string>();
const failedGroups = new Set<string>();
/** 上次提示的时间：同一个存档 15 秒内只提示一次 */
const lastWarned = new Map<string, number>();

const CHAT_GET = /\/api\/chats\/get(?:[?#]|$)/;
const CHAR_GET = /\/api\/characters\/get(?:[?#]|$)/;
const GROUP_GET = /\/api\/chats\/group\/get(?:[?#]|$)/;
const CHAT_SAVE = /\/api\/chats\/save(?:[?#]|$)/;
const GROUP_SAVE = /\/api\/chats\/group\/save(?:[?#]|$)/;

type Kind = 'chat' | 'card' | 'group';

/** 这个请求读的是不是正在打开的那个存档 / 那张卡 / 那个群聊（读别的存档的请求，比如存档搜索，不算）。 */
function isCurrent(kind: Kind, key: string): boolean {
  const c = ctx();
  // 群聊读、存都用聊天的 id（不是群的 id）；酒馆的 getCurrentChatId 在群聊里返回的就是它
  if (kind === 'group') return !!c.groupId && String(c.getCurrentChatId?.() ?? '') === key;
  const ch = c.characters?.[Number(c.characterId)];
  if (!ch) return false;
  return kind === 'chat' ? String(ch.chat ?? '') === key : String(ch.avatar ?? '') === key;
}

function urlOf(input: RequestInfo | URL): string {
  try { return typeof input === 'string' ? input : input instanceof URL ? input.href : input.url; } catch { return ''; }
}

export function installChatGuard(): void {
  if (installed) return;
  installed = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = urlOf(input);
    const kind: Kind | null = CHAT_GET.test(url) ? 'chat' : CHAR_GET.test(url) ? 'card' : GROUP_GET.test(url) ? 'group' : null;
    if (kind) return watchRead(orig, kind, input, init);
    try {
      if (CHAT_SAVE.test(url)) { const r = await checkChatSave(orig, init); if (r) return r; }
      else if (GROUP_SAVE.test(url)) { const r = await checkGroupSave(orig, init); if (r) return r; }
    } catch (e) {
      console.warn('[RedBird] 检查保存请求时出错，照常保存', e);
    }
    return orig(input, init);
  };
}

/** 读聊天 / 角色卡 / 群聊：记下正在打开的那个成没成功（返回 200 但内容读不懂也算失败）。 */
async function watchRead(orig: typeof fetch, kind: Kind, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let key = '';
  try {
    const b = JSON.parse(typeof init?.body === 'string' ? init.body : '{}');
    key = String((kind === 'chat' ? b.file_name : kind === 'card' ? b.avatar_url : b.id) ?? '');
  } catch { /* 读不到就不记 */ }
  const track = !!key && isCurrent(kind, key);
  const set = kind === 'chat' ? failedChats : kind === 'card' ? failedCards : failedGroups;
  let res: Response;
  try {
    res = await orig(input, init);
  } catch (e) {
    if (track) set.add(key);
    throw e;
  }
  if (!track) return res;
  if (!res.ok) { set.add(key); return res; }
  if (kind === 'card') { set.delete(key); return res; }
  // 聊天、群聊：内容要能读懂才算读成功（大存档下载到一半断线、代理返回网页时，酒馆也会当成空聊天）
  try {
    const parsed = await res.clone().json();
    // 群聊回空数组可能是文件读坏了：记成可疑，保存时再去磁盘核对（真正的新群聊磁盘上没有，会放行）
    if (!readOk(parsed) || (kind === 'group' && Array.isArray(parsed) && !parsed.length)) set.add(key);
    else set.delete(key);
  } catch {
    set.add(key);
  }
  return res;
}

async function checkChatSave(orig: typeof fetch, init?: RequestInit): Promise<Response | null> {
  const text = await bodyText(init);
  if (!text) return null;
  const body = JSON.parse(text);
  const name = String(body?.file_name ?? '');
  const check = { chat: body?.chat, loadFailed: failedChats.has(name) || failedCards.has(String(body?.avatar_url ?? '')) };
  if (!worthChecking(check)) return null;
  const onDisk = await countOnDisk(orig, '/api/chats/get', { ch_name: body.ch_name, file_name: body.file_name, avatar_url: body.avatar_url });
  if (!shouldBlockSave(check, onDisk)) return null;
  return blocked(name, onDisk, describeSave(body.chat).messages);
}

async function checkGroupSave(orig: typeof fetch, init?: RequestInit): Promise<Response | null> {
  const text = await bodyText(init);
  if (!text) return null;
  const body = JSON.parse(text);
  const id = String(body?.id ?? '');
  if (!failedGroups.has(id)) return null;
  const onDisk = await countOnDisk(orig, '/api/chats/group/get', { id });
  if (!shouldBlockGroupSave(true, onDisk)) { failedGroups.delete(id); return null; }
  return blocked(id, onDisk, describeSave(body.chat).messages);
}

/**
 * 拦下这次保存：磁盘上的存档保持原样，告诉酒馆「存好了」（免得它反复报错），
 * 并提示玩家刷新（同一个存档 15 秒内只提示一次；之后每次被拦都会再提示，直到刷新）。
 */
function blocked(name: string, onDisk: number | null, saving: number): Response {
  console.warn(`[RedBird] 拦下了一次会覆盖存档的保存：「${name}」磁盘上有 ${onDisk ?? '?'} 条，要存的有 ${saving} 条（这个存档没有正常读出来）`);
  const now = Date.now();
  if (now - (lastWarned.get(name) ?? 0) > 15000) {
    lastWarned.set(name, now);
    toast('error', '这个聊天没有读出来，现在的内容不会保存，以免覆盖原来的存档。请刷新页面，再打开这个聊天。', 'RedBird 工具箱', { timeOut: 0, extendedTimeOut: 0 });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

/** 保存请求的正文：一般是字符串；酒馆开了请求压缩时是 gzip，要先解开。 */
async function bodyText(init?: RequestInit): Promise<string | null> {
  const b = init?.body;
  if (typeof b === 'string') return b;
  if (!b || new Headers(init?.headers ?? {}).get('Content-Encoding') !== 'gzip') return null;
  if (!(b instanceof Uint8Array || b instanceof ArrayBuffer || b instanceof Blob)) return null;
  const stream = new Blob([b as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

/** 磁盘上那份有几条消息（读不到返回 null）。 */
async function countOnDisk(orig: typeof fetch, url: string, payload: Record<string, unknown>): Promise<number | null> {
  try {
    const res = await orig(url, { method: 'POST', headers: ctx().getRequestHeaders(), cache: 'no-cache', body: JSON.stringify(payload) });
    if (!res.ok) return null;
    return messagesIn(await res.json());
  } catch {
    return null;
  }
}
