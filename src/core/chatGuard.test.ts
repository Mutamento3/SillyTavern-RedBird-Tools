import { describe, expect, it } from 'vitest';
import { describeSave, messagesIn, readOk, sameChat, shouldBlockGroupSave, shouldBlockSave, worthChecking } from './chatGuard';

const header = (integrity?: string) => ({ user_name: 'u', character_name: 'c', chat_metadata: integrity ? { integrity } : {} });
const msg = (t: string) => ({ name: 'c', mes: t });
/** 刚放上、刚发的消息：发送时间是现在（酒馆真读失败时，开场白和之后新聊的都是这样） */
const fresh = (t: string) => ({ name: 'c', mes: t, send_date: `2026-11-13T12:00:00.${t.length}00Z` });
/** 磁盘上那份：开场白 + 之后 n - 1 条，每条有自己的发送时间 */
const disk = (n: number) => (n ? [header('abc'), msg('greeting'), ...Array.from({ length: n - 1 }, (_, i) => ({ name: 'c', mes: `old ${i}`, send_date: `2026-11-0${(i % 9) + 1} 0${i}` }))] : []);

describe('chat save guard', () => {
  it('after a failed load, blocks every save while the chat on disk has more than one message', () => {
    expect(shouldBlockSave({ chat: [header('abc'), msg('greeting')], loadFailed: true }, disk(120))).toBe(true);
    // 玩家没刷新、接着聊了几句：照样拦（Fable 复现的第二次保存覆盖）
    expect(shouldBlockSave({ chat: [header('abc'), msg('greeting'), msg('hi')], loadFailed: true }, disk(7))).toBe(true);
    expect(shouldBlockSave({ chat: [header('abc'), ...Array.from({ length: 9 }, (_, i) => msg(String(i)))], loadFailed: true }, disk(7))).toBe(true);
  });
  it('after a failed load, lets a real new chat through (nothing longer on disk)', () => {
    expect(shouldBlockSave({ chat: [header(), msg('greeting')], loadFailed: true }, disk(0))).toBe(false);
    expect(shouldBlockSave({ chat: [header(), msg('greeting')], loadFailed: true }, disk(1))).toBe(false);
  });
  it('blocks a greeting-only save without integrity over a longer chat (failed load while switching cards)', () => {
    expect(shouldBlockSave({ chat: [header(), msg('greeting')], loadFailed: false }, disk(120))).toBe(true);
  });
  it('blocks when the chat on disk cannot be read', () => {
    expect(shouldBlockSave({ chat: [header('abc'), msg('greeting')], loadFailed: true }, null)).toBe(true);
    expect(shouldBlockSave({ chat: [header(), msg('greeting')], loadFailed: false }, null)).toBe(true);
  });
  it('lets normal saves through', () => {
    expect(shouldBlockSave({ chat: [header('abc'), msg('a'), msg('b')], loadFailed: false }, disk(2))).toBe(false);
    // 自己把消息删到只剩开场白：读取没失败过，有校验码
    expect(shouldBlockSave({ chat: [header('abc'), msg('greeting')], loadFailed: false }, disk(50))).toBe(false);
    expect(worthChecking({ chat: [header('abc'), msg('a')], loadFailed: false })).toBe(false);
  });
  it('after a failed read elsewhere (search, another extension), lets the loaded chat save', () => {
    const loaded = [...disk(120), msg('new')];
    expect(shouldBlockSave({ chat: loaded, loadFailed: true }, disk(120))).toBe(false);
    // 删了几条也一样，包括开场白后面的第一条
    expect(shouldBlockSave({ chat: disk(100), loadFailed: true }, disk(120))).toBe(false);
    const [h, g, , ...rest] = disk(120);
    expect(shouldBlockSave({ chat: [h, g, ...rest], loadFailed: true }, disk(120))).toBe(false);
    // 第一条回复重新生成了（发送时间变了）：后面的还对得上
    expect(shouldBlockSave({ chat: [h, g, fresh('swiped'), ...rest], loadFailed: true }, disk(120))).toBe(false);
  });
  it('after a real failed load, blocks even with new messages that have send dates', () => {
    expect(shouldBlockSave({ chat: [header('abc'), fresh('greeting'), fresh('hi'), fresh('reply')], loadFailed: true }, disk(120))).toBe(true);
  });
  it('knows a chat continued from the file on disk', () => {
    expect(sameChat([...disk(5), msg('x')], disk(5))).toBe(true);
    expect(sameChat([header('abc'), msg('greeting'), msg('hi')], disk(5))).toBe(false);
    expect(sameChat([header('abc'), fresh('greeting'), fresh('hi')], disk(5))).toBe(false);
    expect(sameChat([header('abc'), msg('greeting')], disk(5))).toBe(false);
    expect(sameChat(disk(5), null)).toBe(false);
  });
  it('describes saves', () => {
    expect(describeSave([header(), msg('a'), msg('b')])).toEqual({ messages: 2, hasIntegrity: false });
    expect(describeSave('nope')).toEqual({ messages: 0, hasIntegrity: false });
  });
});

describe('group chat save guard', () => {
  // 读失败时酒馆放上每个成员的开场白，发送时间都是新的
  const greetings = [header(), fresh('a'), fresh('bb')];
  it('blocks after a failed group load while the disk has more than one message', () => {
    expect(shouldBlockGroupSave(true, greetings, disk(80))).toBe(true);
    expect(shouldBlockGroupSave(true, greetings, null)).toBe(true);
  });
  it('lets saves through otherwise', () => {
    expect(shouldBlockGroupSave(false, greetings, disk(80))).toBe(false);
    expect(shouldBlockGroupSave(true, greetings, disk(1))).toBe(false);
    // 别处读失败，群聊其实好好的
    expect(shouldBlockGroupSave(true, [...disk(80), fresh('new')], disk(80))).toBe(false);
  });
});

describe('reading a chat reply', () => {
  it('counts arrays and the empty object as a successful read', () => {
    expect(readOk([{ chat_metadata: {} }, msg('a')])).toBe(true);
    expect(readOk([])).toBe(true);
    expect(readOk({})).toBe(true);
    expect(readOk({ error: 'x' })).toBe(false);
    expect(readOk(null)).toBe(false);
    expect(readOk('<html>')).toBe(false);
  });
  it('counts messages without the header', () => {
    expect(messagesIn([{ chat_metadata: {} }, msg('a'), msg('b')])).toBe(2);
    expect(messagesIn([msg('a'), msg('b')])).toBe(2);
    expect(messagesIn({})).toBe(0);
    expect(messagesIn({ error: 'x' })).toBe(null);
  });
});
