import { describe, expect, it } from 'vitest';
import { describeSave, messagesIn, readOk, shouldBlockGroupSave, shouldBlockSave, worthChecking } from './chatGuard';

const header = (integrity?: string) => ({ user_name: 'u', character_name: 'c', chat_metadata: integrity ? { integrity } : {} });
const msg = (t: string) => ({ name: 'c', mes: t });

describe('chat save guard', () => {
  it('after a failed load, blocks every save while the chat on disk has more than one message', () => {
    expect(shouldBlockSave({ chat: [header('abc'), msg('greeting')], loadFailed: true }, 120)).toBe(true);
    // 玩家没刷新、接着聊了几句：照样拦（Fable 复现的第二次保存覆盖）
    expect(shouldBlockSave({ chat: [header('abc'), msg('greeting'), msg('hi')], loadFailed: true }, 7)).toBe(true);
    expect(shouldBlockSave({ chat: [header('abc'), ...Array.from({ length: 9 }, (_, i) => msg(String(i)))], loadFailed: true }, 7)).toBe(true);
  });
  it('after a failed load, lets a real new chat through (nothing longer on disk)', () => {
    expect(shouldBlockSave({ chat: [header(), msg('greeting')], loadFailed: true }, 0)).toBe(false);
    expect(shouldBlockSave({ chat: [header(), msg('greeting')], loadFailed: true }, 1)).toBe(false);
  });
  it('blocks a greeting-only save without integrity over a longer chat (failed load while switching cards)', () => {
    expect(shouldBlockSave({ chat: [header(), msg('greeting')], loadFailed: false }, 120)).toBe(true);
  });
  it('blocks when the chat on disk cannot be read', () => {
    expect(shouldBlockSave({ chat: [header('abc'), msg('greeting')], loadFailed: true }, null)).toBe(true);
    expect(shouldBlockSave({ chat: [header(), msg('greeting')], loadFailed: false }, null)).toBe(true);
  });
  it('lets normal saves through', () => {
    expect(shouldBlockSave({ chat: [header('abc'), msg('a'), msg('b')], loadFailed: false }, 2)).toBe(false);
    // 自己把消息删到只剩开场白：读取没失败过，有校验码
    expect(shouldBlockSave({ chat: [header('abc'), msg('greeting')], loadFailed: false }, 50)).toBe(false);
    expect(worthChecking({ chat: [header('abc'), msg('a')], loadFailed: false })).toBe(false);
  });
  it('describes saves', () => {
    expect(describeSave([header(), msg('a'), msg('b')])).toEqual({ messages: 2, hasIntegrity: false });
    expect(describeSave('nope')).toEqual({ messages: 0, hasIntegrity: false });
  });
});

describe('group chat save guard', () => {
  it('blocks after a failed group load while the disk has more than one message', () => {
    expect(shouldBlockGroupSave(true, 80)).toBe(true);
    expect(shouldBlockGroupSave(true, null)).toBe(true);
  });
  it('lets saves through otherwise', () => {
    expect(shouldBlockGroupSave(false, 80)).toBe(false);
    expect(shouldBlockGroupSave(true, 1)).toBe(false);
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
