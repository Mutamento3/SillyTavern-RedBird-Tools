import { describe, expect, it } from 'vitest';
import { alignIdentifiers } from './align';
import { attribute, type AttributionInput } from './attribute';
import { diffVars, flattenVars } from './vars';

function baseInput(over: Partial<AttributionInput> = {}): AttributionInput {
  return {
    chat: [],
    identifiers: null,
    presetPrompts: [],
    overridden: [],
    wiEntries: [],
    extensionPrompts: [],
    chatMessages: [],
    card: { name: '艾琳' },
    persona: '',
    ...over,
  };
}

describe('attribute', () => {
  it('labels top-level prompts by identifier and maps chat floors', () => {
    const chat = [
      { role: 'system', content: '你是故事讲述者。' },
      { role: 'system', content: '王都设定：王都是一座古城。\n骑士团：守护王都。' },
      { role: 'system', content: '艾琳是骑士团长。' },
      { role: 'assistant', content: '欢迎来到王都，旅行者。' },
      { role: 'system', content: '[当前好感度：10]' },
      { role: 'user', content: '我想加入骑士团。' },
    ];
    const r = attribute(baseInput({
      chat,
      identifiers: ['main', 'worldInfoBefore', 'charDescription', 'chatHistory-3', 'chatHistory-2', 'chatHistory-1'],
      presetPrompts: [{ identifier: 'main', name: '主提示词', content: '你是故事讲述者。', marker: false, absolute: false, depth: 4 }],
      wiEntries: [
        { key: 'b:1', book: '王都', title: '王都', content: '王都设定：王都是一座古城。', category: 'wi_character' },
        { key: 'g:1', book: '全局书', title: '骑士团', content: '骑士团：守护王都。', category: 'wi_global' },
      ],
      extensionPrompts: [{ key: 'MVU_status', value: '[当前好感度：10]', inChat: true, depth: 1 }],
      chatMessages: [
        { index: 0, isUser: false, name: '艾琳', text: '欢迎来到王都，旅行者。' },
        { index: 1, isUser: true, name: '我', text: '我想加入骑士团。' },
      ],
    }));
    const m = r.messages;
    expect(m[0]).toMatchObject({ category: 'preset', label: '主提示词', kind: 'prompt' });
    expect(m[1].kind).toBe('marker');
    expect(m[1].segments.map((s) => s.category)).toEqual(['wi_character', 'wi_global']);
    expect(m[2].category).toBe('character');
    expect(m[3]).toMatchObject({ kind: 'chat', chatIndex: 0, category: 'chat_char' });
    expect(m[4]).toMatchObject({ kind: 'injection', depth: 1, category: 'extension' });
    expect(m[5]).toMatchObject({ kind: 'chat', chatIndex: 1, category: 'chat_user' });
    expect(r.totals.wi_global).toBeGreaterThan(0);
  });

  it('treats system-role and unmatched history slots as injections, not floors', () => {
    const r = attribute(baseInput({
      chat: [
        { role: 'system', content: '<回响灵魂系统> 系统概述' },
        { role: 'assistant', content: '一段以AI身份插入的世界书开场' },
        { role: 'assistant', content: '那个门把手，在静谧的夜晚显得格外刺耳。' },
      ],
      identifiers: ['chatHistory-3', 'chatHistory-2', 'chatHistory-1'],
      chatMessages: [{ index: 0, isUser: false, name: '回响之城', text: '那个门把手，在静谧的夜晚显得格外刺耳。' }],
    }));
    expect(r.messages.map((m) => m.kind)).toEqual(['injection', 'injection', 'chat']);
    expect(r.messages[2].chatIndex).toBe(0);
  });

  it('marks main prompt overridden by the card', () => {
    const r = attribute(baseInput({
      chat: [{ role: 'system', content: '卡片自带的系统提示' }],
      identifiers: ['main'],
      overridden: ['main'],
    }));
    expect(r.messages[0].category).toBe('character');
  });

  it('falls back to text matching without identifiers', () => {
    const r = attribute(baseInput({
      chat: [
        { role: 'system', content: '这是一条很长的预设破限条目内容' },
        { role: 'user', content: '你好' },
      ],
      presetPrompts: [{ identifier: 'jb', name: '破限', content: '这是一条很长的预设破限条目内容', marker: false, absolute: false, depth: 4 }],
      chatMessages: [{ index: 0, isUser: true, name: '我', text: '你好' }],
    }));
    expect(r.aligned).toBe(false);
    expect(r.messages[0].segments[0]).toMatchObject({ category: 'preset', label: '破限' });
    expect(r.messages[1]).toMatchObject({ kind: 'chat', chatIndex: 0 });
  });
});

describe('alignIdentifiers', () => {
  it('handles an extra message inserted by another extension', () => {
    const ids = alignIdentifiers(
      [{ content: 'A message' }, { content: 'inserted by extension' }, { content: 'B message' }],
      [{ identifier: 'a', content: 'A message' }, { identifier: 'b', content: 'B message' }],
    );
    expect(ids).toEqual(['a', undefined, 'b']);
  });
});

describe('vars', () => {
  it('unwraps MVU [value, desc] pairs and diffs floors', () => {
    const before = { 角色: { 好感度: [10, '对你的好感'], 位置: ['王都', '当前位置'] } };
    const after = { 角色: { 好感度: [15, '对你的好感'], 位置: ['王都', '当前位置'], 状态: [['受伤'], '状态列表'] } };
    expect(flattenVars(before).get('角色.好感度')).toMatchObject({ value: 10, desc: '对你的好感' });
    const d = diffVars(before, after);
    expect(d).toContainEqual(expect.objectContaining({ path: '角色.好感度', kind: 'changed', before: 10, after: 15 }));
    expect(d).toContainEqual(expect.objectContaining({ path: '角色.状态', kind: 'added' }));
    expect(d.find((c) => c.path === '角色.位置')).toBeUndefined();
  });
});
