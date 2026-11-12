/**
 * 酒馆的一个漏洞：读聊天失败时（网络断了一下、请求超时、读角色卡失败、下载到一半断了），它会把这个存档当成新聊天，
 * 放上开场白，马上存回原来的文件名，整个存档就只剩开场白了。玩家没刷新、接着聊，后面的每次保存也都会写在这个空壳上。
 *
 * 规则：
 * - 正在打开的存档（或这张卡）读取失败后，到重新读成功之前，这个存档的保存一律不存——
 *   除非磁盘上本来最多只有一条（真正的新聊天）。
 * - 没记到读失败，但要存的只有开场白、又没有防覆盖校验码（换卡时读失败就是这样），磁盘上那份更长：也不存。
 * - 读不到磁盘上的条数时，按「更长」处理：宁可这次不存，也不覆盖。
 */

/** 要存几条消息、有没有防覆盖校验码（chat_metadata.integrity）。`chat`：酒馆发去保存的数组，第一项是文件头。 */
export function describeSave(chat: unknown): { messages: number; hasIntegrity: boolean } {
  if (!Array.isArray(chat) || !chat.length) return { messages: 0, hasIntegrity: false };
  const header = chat[0] as { chat_metadata?: { integrity?: unknown } } | null;
  return { messages: chat.length - 1, hasIntegrity: !!header?.chat_metadata?.integrity };
}

export interface SaveCheck {
  chat: unknown;
  /** 这个存档（或这张卡）刚才读取失败，还没重新读成功 */
  loadFailed: boolean;
}

/** 值得去磁盘上核对一下吗（不值得的话不发额外请求）。 */
export function worthChecking({ chat, loadFailed }: SaveCheck): boolean {
  if (loadFailed) return true;
  const { messages, hasIntegrity } = describeSave(chat);
  return messages <= 1 && !hasIntegrity;
}

/** 拦不拦。`onDisk`：磁盘上那份有几条消息（读不到是 null）。 */
export function shouldBlockSave(check: SaveCheck, onDisk: number | null): boolean {
  if (!worthChecking(check)) return false;
  if (onDisk === null) return true;
  if (check.loadFailed) return onDisk > 1;
  return onDisk > describeSave(check.chat).messages;
}

/** 群聊：读取失败时酒馆会放上每个成员的开场白（可能好几条）再存回去，所以只看「刚才读取失败过」。 */
export function shouldBlockGroupSave(loadFailed: boolean, onDisk: number | null): boolean {
  if (!loadFailed) return false;
  if (onDisk === null) return true;
  return onDisk > 1;
}

/**
 * 读聊天的回复算不算「读成功」：能解析成数组就算（空数组 = 还没有这个文件，是新聊天）；
 * 服务器对没有聊天文件夹的卡回 `{}`，也算（0 条）。其他（网页、半截 JSON、别的对象）都算读失败。
 */
export function readOk(parsed: unknown): boolean {
  if (Array.isArray(parsed)) return true;
  return !!parsed && typeof parsed === 'object' && Object.keys(parsed as object).length === 0;
}

/** 读聊天的回复里有几条消息（去掉文件头）。`{}` 是 0 条；读不懂返回 null。 */
export function messagesIn(parsed: unknown): number | null {
  if (Array.isArray(parsed)) {
    const head = parsed[0] as Record<string, unknown> | undefined;
    return Math.max(0, parsed.length - (head && typeof head === 'object' && 'chat_metadata' in head ? 1 : 0));
  }
  return readOk(parsed) ? 0 : null;
}
