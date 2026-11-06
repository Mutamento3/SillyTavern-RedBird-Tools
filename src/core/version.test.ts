import { describe, expect, it } from 'vitest';
import { compareVersion } from './version';

describe('compareVersion', () => {
  it('orders versions numerically', () => {
    expect(compareVersion('0.3.0', '0.2.9')).toBeGreaterThan(0);
    expect(compareVersion('0.10.0', '0.9.3')).toBeGreaterThan(0);
    expect(compareVersion('0.2.1', '0.2.1')).toBe(0);
    expect(compareVersion('0.2', '0.2.0')).toBe(0);
    expect(compareVersion('0.2.0', '0.2.1')).toBeLessThan(0);
  });
});
