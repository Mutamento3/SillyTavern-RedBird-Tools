import { describe, expect, it } from 'vitest';
import { floorsText, unsentFloors } from './budget';

describe('unsentFloors', () => {
  it('splits floors before the earliest sent one into hidden and not hidden', () => {
    expect(unsentFloors([6, 7, 8], [0, 1, 2, 5], 9)).toEqual({ hidden: [0, 1, 2, 5], other: [3, 4] });
  });
  it('all earlier floors hidden: nothing else missing', () => {
    expect(unsentFloors([69, 70], Array.from({ length: 69 }, (_, i) => i), 71).other).toEqual([]);
  });
  it('the greeting alone is not counted when it is not hidden', () => {
    expect(unsentFloors([1, 2], [], 3)).toEqual({ hidden: [], other: [] });
  });
  it('nothing sent: looks at every floor before the given one', () => {
    expect(unsentFloors([], [2], 4)).toEqual({ hidden: [2], other: [1, 3] });
  });
});

describe('floorsText', () => {
  it('joins runs', () => {
    expect(floorsText([0, 1, 2, 68])).toBe('第 0–2、68 楼');
    expect(floorsText([5])).toBe('第 5 楼');
    expect(floorsText([1, 3, 5, 7])).toBe('第 1、3、5 楼等');
  });
});
