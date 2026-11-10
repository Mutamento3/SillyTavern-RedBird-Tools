/**
 * 工具箱的所有视图和"在哪里打开"的唯一规则：
 * - 聊天工具箱（右侧）= 当前这个聊天和这张卡：角色档案、信息流、变量（边玩边看）；
 * - 全局工具箱 = 按酒馆自己的东西分：预设、世界书、正则、插件、美化，加一个备份。
 *   三栏外壳开着时是居中的大 overlay；没有外壳（手机、或关掉了外壳）时是聊天工具箱里的一个标签。
 * - 在全局工具箱里点一张卡 / 一个预设 / 一本世界书：就地打开详情，带「‹ 返回」，不跳到别处。
 */
import { signal } from '@preact/signals';

export type ViewId = 'flow' | 'vars' | 'card' | 'global';
export type GlobalTab = 'cards' | 'presets' | 'worlds' | 'regex' | 'scripts' | 'plugins' | 'looks' | 'backup';

export const VIEW_LABELS: Record<ViewId, string> = {
  card: '角色档案',
  flow: '信息流',
  vars: '变量',
  global: '全局工具箱',
};

export const GLOBAL_TABS: GlobalTab[] = ['cards', 'presets', 'worlds', 'regex', 'scripts', 'plugins', 'looks', 'backup'];
export const GLOBAL_TAB_LABELS: Record<GlobalTab, string> = {
  cards: '角色',
  presets: '预设',
  worlds: '世界书',
  regex: '正则',
  scripts: '脚本',
  plugins: '插件',
  looks: '美化',
  backup: '备份',
};

/** Whether the 全局工具箱 overlay is shown (shell mode only). */
export const sheetOpen = signal(false);
export const globalTab = signal<GlobalTab>('cards');
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

/** Older names still used by /rbt and call sites. */
const LEGACY: Record<string, { view: ViewId; tab?: GlobalTab }> = {
  env: { view: 'card' }, cards: { view: 'card' },
  maintain: { view: 'global', tab: 'backup' },
  bindings: { view: 'global', tab: 'cards' }, table: { view: 'global', tab: 'cards' },
  presets: { view: 'global', tab: 'presets' }, worlds: { view: 'global', tab: 'worlds' },
  regex: { view: 'global', tab: 'regex' }, scripts: { view: 'global', tab: 'scripts' }, plugins: { view: 'global', tab: 'plugins' }, backup: { view: 'global', tab: 'backup' },
  looks: { view: 'global', tab: 'looks' }, themes: { view: 'global', tab: 'looks' },
};

export function resolveView(name: string): { view: ViewId; tab?: GlobalTab } | null {
  if ((Object.keys(VIEW_LABELS) as string[]).includes(name)) return { view: name as ViewId };
  return LEGACY[name] ?? null;
}

export function openGlobal(tab?: GlobalTab): void {
  if (tab) globalTab.value = tab;
  detailStack.value = [];
  if (shellActive.value) {
    beforeSheet(); // one focus at a time: close any open ST panel first
    sheetOpen.value = true;
    return;
  }
  openInDock('global');
}

export function openView(view: ViewId): void {
  if (view === 'global') { openGlobal(); return; }
  // 一个时刻只看一样：要在右侧面板里看的东西，先把全局工具箱收起来，不然会被挡住
  sheetOpen.value = false;
  detailStack.value = [];
  openInDock(view);
}

export function closeSheet(): void {
  sheetOpen.value = false;
  detailStack.value = [];
}

export function setGlobalTab(tab: GlobalTab): void {
  globalTab.value = tab;
  detailStack.value = [];
}

// ------------------------------------------------------------ detail ---

export type Detail = { kind: 'card'; avatar: string } | { kind: 'preset'; name: string } | { kind: 'world'; name: string } | { kind: 'theme'; name: string } | { kind: 'bindings'; avatar: string };
interface DetailEntry { d: Detail; back: string }

/** A stack, so card → preset → card can go back step by step. Cleared when switching tabs. */
export const detailStack = signal<DetailEntry[]>([]);
export function currentDetail(): DetailEntry | null {
  const st = detailStack.value;
  return st[st.length - 1] ?? null;
}

/** `back` names where 「‹」 returns to, e.g. the tab name or the previous detail title. */
export function openDetail(d: Detail, back: string): void {
  detailStack.value = [...detailStack.value, { d, back }];
}

export function goBack(): void {
  detailStack.value = detailStack.value.slice(0, -1);
}
