/**
 * 信息流 › 额度：这一轮之前有哪些楼层没发出去，分成「隐藏的」和「没隐藏的」。
 * 隐藏的楼层（楼层上有幽灵图标）酒馆本来就不发；没隐藏却没发的，才需要找原因。
 */

/**
 * sent：这一轮发出去的楼层；hidden：发的时候隐藏着的楼层；
 * before：只看这一楼之前的（一楼都没发时，用正在生成的那一楼或聊天的长度）。
 * 第 0 楼是开场白，有的预设本来就不发：没隐藏的第 0 楼不算。
 */
export function unsentFloors(sent: number[], hidden: number[], before: number): { hidden: number[]; other: number[] } {
  // 放不下的是最早的那几楼；隐藏的哪一楼都可能是
  const end = sent.length ? Math.min(...sent) : before;
  const s = new Set(sent), h = new Set(hidden);
  const out = { hidden: hidden.filter((i) => i < before && !s.has(i)), other: [] as number[] };
  for (let i = 1; i < end; i++) if (!h.has(i)) out.other.push(i);
  return out;
}

/** [1,2,3,5,8,9] → 「第 1–3、5、8–9 楼」；段太多时只写前三段。 */
export function floorsText(floors: number[]): string {
  const parts: string[] = [];
  for (let i = 0; i < floors.length; ) {
    let j = i;
    while (j + 1 < floors.length && floors[j + 1] === floors[j] + 1) j++;
    parts.push(i === j ? `${floors[i]}` : `${floors[i]}–${floors[j]}`);
    i = j + 1;
  }
  return `第 ${parts.slice(0, 3).join('、')} 楼${parts.length > 3 ? '等' : ''}`;
}
