/**
 * 工具箱的所有视图和"在哪里打开"的唯一规则：
 * - 右侧工具箱 = 当前这个聊天和这张卡：角色档案、信息流、变量（边玩边看）；
 * - 左栏入口 = 全局：全局、维护，三栏外壳开着时用居中的大 overlay；
 *   没有外壳（手机、或关掉了外壳）时也放进工具箱的标签页里。
 */
import { signal } from '@preact/signals';

export type ViewId = 'flow' | 'vars' | 'card' | 'global' | 'maintain';
export type SheetId = 'global' | 'maintain';

export const VIEW_LABELS: Record<ViewId, string> = {
  flow: '信息流',
  vars: '变量',
  card: '角色档案',
  global: '全局',
  maintain: '维护',
};

export const SHEET_IDS: SheetId[] = ['global', 'maintain'];

/** The overlay currently shown (shell mode only). */
export const sheetView = signal<SheetId | null>(null);
/** True when the three-column shell is active (desktop and switched on). Kept in sync by Shell. */
export const shellActive = signal(false);

type Opener = (view: ViewId) => void;
let openInDock: Opener = () => {};
let beforeSheet: () => void = () => {};

/** Wiring from index.tsx, so this module has no imports and no cycles. */
export function configureViews(opts: { openInDock: Opener; beforeSheet: () => void }): void {
  openInDock = opts.openInDock;
  beforeSheet = opts.beforeSheet;
}

export function isSheet(v: ViewId): v is SheetId {
  return (SHEET_IDS as string[]).includes(v);
}

export function openView(view: ViewId): void {
  if (isSheet(view) && shellActive.value) {
    beforeSheet(); // one focus at a time: close any open ST panel first
    sheetView.value = view;
    return;
  }
  // 一个时刻只看一样：要在右侧面板里看的东西，先把全局工具箱收起来，不然会被挡住
  if (sheetView.value) sheetView.value = null;
  openInDock(view);
}

export function closeSheet(): void {
  sheetView.value = null;
}
