import { describe, expect, it } from 'vitest';
import { matchSearch } from './text';

describe('matchSearch', () => {
  it('ignores case, full-width letters and the separators a pinyin keyboard leaves while composing', () => {
    for (const q of ['nbt', "n'b't", 'n b t', 'n’b’t', 'ｎｂｔ']) expect(matchSearch(q, 'NBT世界书')).toBe(true);
    expect(matchSearch('星落山庄线索', '星落山庄·线索')).toBe(true);
    expect(matchSearch('nbx', 'NBT')).toBe(false);
  });
  it('empty query matches everything; missing texts are skipped', () => {
    expect(matchSearch('  ', 'x')).toBe(true);
    expect(matchSearch('a', undefined, 'A')).toBe(true);
  });
});
