import { describe, expect, it } from 'vitest';
import { SIDE_EFFECT_MACRO } from './macros';

describe('SIDE_EFFECT_MACRO', () => {
  it('catches macros that change variables or give a different result each time', () => {
    for (const t of ['{{setvar::a::1}}', '{{incvar::turn}}', '{{decvar::x}}', '{{addvar::x::2}}', '{{setglobalvar::a::1}}', '{{ random::a,b }}', '{{roll:d6}}', '{{pick::a,b}}', '回合 {{incvar::turn}} 开始']) {
      expect(SIDE_EFFECT_MACRO.test(t)).toBe(true);
    }
  });
  it('leaves read-only macros alone', () => {
    for (const t of ['{{user}}', '{{char}}', '{{getvar::x}}', '{{getglobalvar::x}}', '{{randomize}}', '没有宏']) {
      expect(SIDE_EFFECT_MACRO.test(t)).toBe(false);
    }
  });
});
