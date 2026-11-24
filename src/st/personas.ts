/**
 * 人设：建、改、复制、删、换头像。数据全在酒馆自己的地方，建出来的人设和在酒馆人设面板里建的一样：
 * - 名字：power_user.personas[头像文件名]
 * - 描述等：power_user.persona_descriptions[头像文件名]（正在用的那个人设，酒馆另外把描述抄在 power_user.persona_description）
 * - 头像：User Avatars/ 下的图片，文件名就是人设的 id
 */
import { APP_NAME, confirmText, ctx, currentCharacter, loaded, stModule, toast, type Any } from './st';

const pu = (): Any => ctx().powerUserSettings ?? {};
export const currentPersona = (): string => String(loaded.personas?.user_avatar ?? '');
export const personaName = (id: string): string => pu().personas?.[id] || id;
export const personaIds = (): string[] => Object.keys(pu().personas ?? {}).sort((a, b) => personaName(a).localeCompare(personaName(b), 'zh'));
export function personaDesc(id: string): string {
  const d = pu().persona_descriptions?.[id];
  if (d) return String(d.description ?? '');
  return id === currentPersona() ? String(pu().persona_description ?? '') : '';
}

/** 换过头像的人设：图片地址后面加上时间，不然浏览器还显示缓存里的旧图。 */
const stamp: Record<string, number> = {};
const stamped = (id: string, url: string): string => (stamp[id] ? `${url}${url.includes('?') ? '&' : '?'}t=${stamp[id]}` : url);
export const personaThumb = (id: string): string => stamped(id, ctx().getThumbnailUrl?.('persona', id) ?? `User Avatars/${id}`);
/** 原图：详情页的大图用，缩略图放大了会糊。 */
export const personaImage = (id: string): string => stamped(id, `User Avatars/${id}`);

/** 专用这个人设的卡（酒馆的「连接」里绑了的角色卡）。 */
export function personaCards(id: string): { avatar: string; name: string }[] {
  const conns = (pu().persona_descriptions?.[id]?.connections ?? []) as { type: string; id: string }[];
  const chars = (ctx().characters ?? []) as Any[];
  return conns.filter((x) => x.type === 'character').map((x) => chars.find((c) => c.avatar === x.id)).filter(Boolean).map((c) => ({ avatar: c.avatar, name: c.name }));
}

/** 人设还没有 persona_descriptions 这一条（只填过名字和头像）时建一条：正在用的抄酒馆现在的描述，别的留空。 */
export function ensureDescriptor(id: string): Any | null {
  const p = pu();
  if (id === currentPersona()) loaded.personas?.getOrCreatePersonaDescriptor?.();
  const all = p.persona_descriptions ?? (p.persona_descriptions = {});
  if (!all[id] && p.personas?.[id] !== undefined) {
    all[id] = { description: '', position: p.persona_description_position ?? 0, depth: p.persona_description_depth ?? 2, role: p.persona_description_role ?? 0, lorebook: '', connections: [], title: '' };
  }
  return all[id] ?? null;
}

const emit = (key: string, data: unknown) => { const ev = ctx().eventTypes?.[key]; if (ev) void ctx().eventSource?.emit(ev, data); };
/** 酒馆人设面板里的列表重新画一遍（面板开着时能马上看到）。 */
const refreshPanel = (id?: string) => loaded.personas?.getUserAvatars?.(true, id ?? '');

// ------------------------------------------------------------ 头像 ---

export interface PickedAvatar { file: File; crop?: unknown; url: string }

/** 选一张图，和酒馆一样让人框一下要显示的部分（酒馆设了「不缩放头像」就不框）。取消返回 null。 */
export async function pickAvatar(): Promise<PickedAvatar | null> {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
  const file = await new Promise<File | null>((resolve) => {
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
  if (!file) return null;
  const utils = await stModule('/scripts/utils.js');
  const ok: File = (await utils?.ensureImageFormatSupported?.(file)) ?? file;
  const url = URL.createObjectURL(ok);
  if (pu().never_resize_avatars) return { file: ok, url };
  const popup = await stModule('/scripts/popup.js');
  const Popup = ctx().Popup;
  const type = popup?.POPUP_TYPE?.CROP;
  if (!Popup || type === undefined) return { file: ok, url };
  const dataUrl = await new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.readAsDataURL(ok); });
  const dlg = new Popup('框出头像要显示的部分', type, '', { cropImage: dataUrl });
  if (!(await dlg.show())) { URL.revokeObjectURL(url); return null; }
  return { file: ok, crop: dlg.cropData, url };
}

async function upload(id: string, file: Blob, crop?: unknown): Promise<void> {
  const form = new FormData();
  form.append('avatar', file instanceof File ? file : new File([file], 'avatar.png', { type: file.type || 'image/png' }));
  form.append('overwrite_name', id);
  const url = `/api/avatars/upload${crop ? `?crop=${encodeURIComponent(JSON.stringify(crop))}` : ''}`;
  const r = await fetch(url, { method: 'POST', headers: ctx().getRequestHeaders({ omitContentType: true }), cache: 'no-cache', body: form });
  if (!r.ok) throw new Error(`错误 ${r.status}`);
  stamp[id] = Date.now();
  // 和酒馆一样把浏览器缓存里的旧图换掉：酒馆自己的地方（聊天、人设面板）用的是不带时间的地址
  await Promise.all([`User Avatars/${encodeURIComponent(id)}`, ctx().getThumbnailUrl?.('persona', id)].filter(Boolean).map((u) => fetch(u, { cache: 'reload' }).catch(() => null)));
}

const imageOf = async (url: string): Promise<Blob> => {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`错误 ${r.status}`);
  return r.blob();
};

/** 换头像。正在用的人设：聊天里自己那几条消息的头像也跟着换。 */
export async function setPersonaAvatar(id: string, picked: PickedAvatar): Promise<void> {
  await upload(id, picked.file, picked.crop);
  URL.revokeObjectURL(picked.url);
  if (id === currentPersona()) {
    for (const img of document.querySelectorAll<HTMLImageElement>('#chat .mes[is_user="true"][force_avatar="false"] .avatar img')) img.src = personaThumb(id);  }
  emit('PERSONA_UPDATED', id);
  await refreshPanel(id);
}

// ------------------------------------------------------------ 建 / 改 ---

/** 建一个人设。`from`：从这个人设复制（头像、插入位置、世界书都抄过来，不抄绑定的卡）。返回新人设的 id。 */
export async function createPersona({ name, description, avatar, from }: { name: string; description: string; avatar?: PickedAvatar | null; from?: string }): Promise<string> {
  const id = `${Date.now()}-${name.replace(/[^a-zA-Z0-9]/g, '')}.png`;
  // 先传头像：传不上就什么都不建
  // 复制时原来的头像图片找不到（被删了），就用酒馆的默认头像
  const fallback = async () => imageOf((await stModule('/script.js'))?.default_user_avatar ?? 'img/user-default.png');
  if (avatar) await upload(id, avatar.file, avatar.crop);
  else await upload(id, from ? await imageOf(`User Avatars/${encodeURIComponent(from)}`).catch(fallback) : await fallback());
  if (avatar) URL.revokeObjectURL(avatar.url);
  const p = pu();
  const src = from ? ensureDescriptor(from) : null;
  if (loaded.personas?.initPersona) await loaded.personas.initPersona(id, name, description, src?.title ?? '');
  else p.personas[id] = name;
  const d = ensureDescriptor(id);
  if (d) {
    d.description = description;
    if (src) Object.assign(d, { position: src.position, depth: src.depth, role: src.role, lorebook: src.lorebook ?? '' });
  }
  ctx().saveSettingsDebounced();
  await refreshPanel(id);
  return id;
}

export async function renamePersona(id: string, name: string): Promise<void> {
  const p = pu();
  const oldName = p.personas?.[id];
  if (!name || oldName === undefined || oldName === name) return;
  p.personas[id] = name;
  if (id === currentPersona()) (await stModule('/script.js'))?.setUserName?.(name, { toastPersonaNameChange: false });
  ctx().saveSettingsDebounced();
  emit('PERSONA_RENAMED', { avatarId: id, oldName, newName: name });
  await refreshPanel(id);
}

/** 改描述。正在用的人设：酒馆发给 AI 的那份和人设面板里的输入框也一起改。 */
export function setPersonaDesc(id: string, description: string): void {
  const d = ensureDescriptor(id);
  if (!d) return;
  d.description = description;
  if (id === currentPersona()) {
    pu().persona_description = description;
    loaded.personas?.setPersonaDescription?.();
  }
  ctx().saveSettingsDebounced();
}

/**
 * 这段聊天锁定的人设（酒馆的「锁定到这个聊天」，记在存档里，比本卡专用、全局都优先）。
 * id = null 是解开，换回 follow（本卡的人设）。
 */
export async function lockChatPersona(id: string | null, follow = ''): Promise<void> {
  const c = ctx();
  const meta = c.chatMetadata;
  if (!meta) return;
  if (id) meta.persona = id; else delete meta.persona;
  const to = id ?? follow;
  // 解开时不要酒馆的提示：开了「自动锁定」它会说「已自动锁定到当前聊天」，可下面马上就解开了
  if (to && to !== currentPersona()) await loaded.personas?.setUserAvatar?.(to, id ? undefined : { toastPersonaNameChange: false });
  // 酒馆开了「自动锁定」时，上面换人设会顺手再锁上：玩家选的是「跟着本卡」，去掉
  if (!id) delete meta.persona;
  await c.saveMetadata?.();
  // 人设没换时酒馆不会发事件：让顶栏和酒馆人设面板里的锁也跟着变
  loaded.personas?.setPersonaDescription?.();
  emit('PERSONA_UPDATED', currentPersona());
}

/** 正在聊的卡自己的人设（酒馆「连接到角色」绑的第一个），没有是 ''。 */
function cardPersona(): string {
  const avatar = currentCharacter()?.avatar;
  const all = pu().persona_descriptions ?? {};
  if (!avatar) return '';
  return Object.keys(all).find((k) => pu().personas?.[k] !== undefined && ((all[k].connections ?? []) as { type: string; id: string }[]).some((x) => x.type === 'character' && x.id === avatar)) ?? '';
}

// ------------------------------------------------------------ 删 ---

/** 问一下再删。删完可以在通知里撤销（头像图片先留在内存里）。返回删了没有。 */
export async function deletePersona(id: string, onUndo: () => void): Promise<boolean> {
  const p = pu();
  const name = personaName(id);
  const n = personaCards(id).length;
  const note = n ? `有 ${n} 张卡专用这个人设，删除后这些卡改用全局人设。` : '';
  if (!(await confirmText(`删除人设「${name}」？`, `头像、名字和描述都会删掉。${note}`, '删除'))) return false;
  const image = await imageOf(`User Avatars/${encodeURIComponent(id)}`).catch(() => null);
  const desc = p.persona_descriptions?.[id] ? structuredClone(p.persona_descriptions[id]) : null;
  const wasDefault = p.default_persona === id;
  const c = ctx();
  const chatAt = String(c.getCurrentChatId?.() ?? '');
  const wasCurrent = id === currentPersona();
  const wasLocked = c.chatMetadata?.persona === id;
  const r = await fetch('/api/avatars/delete', { method: 'POST', headers: ctx().getRequestHeaders(), body: JSON.stringify({ avatar: id }) });
  if (!r.ok) { toast('error', `没能删除人设「${name}」。请再试一次。（错误 ${r.status}）`); return false; }
  delete p.personas[id];
  delete p.persona_descriptions?.[id];
  if (wasDefault) p.default_persona = null;
  if (wasLocked) { delete c.chatMetadata.persona; await c.saveMetadata?.(); }
  c.saveSettingsDebounced();
  emit('PERSONA_DELETED', { avatarId: id, name });
  // 删的是正在用的：和酒馆打开聊天时一样，先用这张卡自己的人设，再用全局人设，都没有就用剩下的第一个
  if (wasCurrent) {
    const next = cardPersona() || p.default_persona || personaIds()[0];
    if (next) await loaded.personas?.setUserAvatar?.(next);
  }
  await refreshPanel();
  toast('success', `已删除人设「${name}」。点这里撤销。`, APP_NAME, {
    timeOut: 8000,
    onclick: async () => {
      try {
        if (image) await upload(id, image);
        p.personas[id] = name;
        if (desc) p.persona_descriptions[id] = desc;
        if (wasDefault) p.default_persona = id;
        ctx().saveSettingsDebounced();
        emit('PERSONA_CREATED', { avatarId: id, name });
        // 还在原来那段聊天里：锁定和正在用的人设也换回来
        if (String(ctx().getCurrentChatId?.() ?? '') === chatAt) {
          if (wasLocked) { ctx().chatMetadata.persona = id; await ctx().saveMetadata?.(); }
          if (wasCurrent && currentPersona() !== id) await loaded.personas?.setUserAvatar?.(id);
        }
        await refreshPanel(id);
        onUndo();
      } catch (e) { toast('error', `没能恢复人设「${name}」。（${(e as Error).message}）`); }
    },
  });
  return true;
}
