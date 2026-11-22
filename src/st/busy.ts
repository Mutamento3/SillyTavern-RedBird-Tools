/**
 * 正在进行、要等一会儿的事（换模型、换预设…）。在做事的函数里登记，不在各个按钮里各记一份：
 * 这样不管是谁发起的（角色档案、换卡时自动换、提示里的「换回」），状态栏和对应的那一行都能转圈。
 */
import { signal } from '@preact/signals';

export const working = signal<ReadonlySet<string>>(new Set());

export async function track<T>(key: string, fn: () => Promise<T>): Promise<T> {
  working.value = new Set([...working.value, key]);
  try {
    return await fn();
  } finally {
    const next = new Set(working.value);
    next.delete(key);
    working.value = next;
  }
}
