/**
 * RedBird 工具箱 — SillyTavern extension entry.
 *
 * Views (see ui/views.ts): 信息流 / 变量 live in the right-side dock; 这张卡 / 全局 / 维护 open as
 * large overlays when the three-column shell is active, and as dock tabs otherwise.
 */
import { render } from 'preact';
import './style.css';
import './shell/shell.css';
import { ctx, preloadModules, saveSettings, settings } from './st/st';
import { installStore } from './st/store';
import { installCharactersWatch } from './shell/characters';
import { closeDrawer, installDrawers, openDrawers } from './shell/drawers';
import { installWorldNote } from './shell/worldNote';
import { installRecentWatch } from './shell/recent';
import { SheetHost } from './shell/Sheet';
import { ImportDialog } from './ui/ImportDialog';
import { Shell, initShellState, setShellEnabled, shellOn } from './shell/Shell';
import { installCardsWatch } from './tools/cards/cards';
import { autoApplyOnSwitch } from './tools/env/autoapply';
import { installEnvWatch, refreshEnv } from './tools/env/env';
import { refreshStatus } from './shell/EnvStatus';
import { captures, installFlowCapture } from './tools/flow/capture';
import { installVarsWatch } from './tools/vars/vars';
import { Panel, openPanel, panelOpen } from './ui/Panel';
import { closeSheet, configureViews, GLOBAL_TAB_LABELS, GLOBAL_TABS, openGlobal, openView, resolveView, sheetOpen, shellActive, VIEW_LABELS, type GlobalTab, type ViewId } from './ui/views';

const VIEW_IDS = Object.keys(VIEW_LABELS) as ViewId[];

function addMenuButton(): void {
  const menu = document.getElementById('extensionsMenu');
  if (!menu || document.getElementById('rbt_menu_button')) return;
  const item = document.createElement('div');
  item.id = 'rbt_menu_button';
  item.className = 'list-group-item flex-container flexGap5 interactable';
  item.tabIndex = 0;
  item.innerHTML = '<div class="fa-solid fa-feather-pointed extensionsMenuExtensionButton"></div><span>RedBird 工具箱</span>';
  item.addEventListener('click', () => { panelOpen.value = !panelOpen.value; });
  menu.appendChild(item);
}

/** The one place for the toolbox's switches. */
function addSettingsDrawer(): void {
  const host = document.getElementById('extensions_settings2') ?? document.getElementById('extensions_settings');
  if (!host || document.getElementById('rbt_settings')) return;
  const wrap = document.createElement('div');
  wrap.id = 'rbt_settings';
  wrap.innerHTML = `
    <div class="inline-drawer">
      <div class="inline-drawer-toggle inline-drawer-header">
        <b>RedBird 工具箱</b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
      </div>
      <div class="inline-drawer-content">
        <div class="flex-container flexGap5">
          ${VIEW_IDS.filter((v) => v !== 'global').map((v) => `<div class="menu_button" data-view="${v}">${VIEW_LABELS[v]}</div>`).join('')}
          ${GLOBAL_TABS.map((t) => `<div class="menu_button" data-gtab="${t}">全局 · ${GLOBAL_TAB_LABELS[t]}</div>`).join('')}
        </div>
        <label class="checkbox_label"><input type="checkbox" id="rbt_shell_switch" /> 三栏界面（电脑上用左栏和导航条代替酒馆原来的顶栏）</label>
        <label class="checkbox_label"><input type="checkbox" id="rbt_auto_switch" /> 换卡时自动切换世界书、正则和预设（关掉后只提醒）</label>
        <label class="checkbox_label"><input type="checkbox" id="rbt_auto_world" /> 卡里自带的世界书还没导入时，自动导入并绑定</label>
        <small>也可以从输入框左边的魔法棒菜单打开，或发送 <code>/rbt</code>。发送 <code>/rbt shell</code> 开关三栏界面。</small>
      </div>
    </div>`;
  host.appendChild(wrap);
  wrap.querySelectorAll<HTMLElement>('[data-view]').forEach((b) => b.addEventListener('click', () => openView(b.dataset.view as ViewId)));
  wrap.querySelectorAll<HTMLElement>('[data-gtab]').forEach((b) => b.addEventListener('click', () => openGlobal(b.dataset.gtab as GlobalTab)));
  const bind = (id: string, get: () => boolean, set: (v: boolean) => void) => {
    const cb = wrap.querySelector<HTMLInputElement>(`#${id}`)!;
    cb.checked = get();
    cb.addEventListener('change', () => set(cb.checked));
    return cb;
  };
  const shellCb = bind('rbt_shell_switch', () => shellOn.value, (v) => setShellEnabled(v));
  shellOn.subscribe((v) => { shellCb.checked = v; });
  bind('rbt_auto_switch', () => settings().autoApplyEnv, (v) => { settings().autoApplyEnv = v; saveSettings(); });
  bind('rbt_auto_world', () => settings().autoImportWorld, (v) => { settings().autoImportWorld = v; saveSettings(); });
}

function addSlashCommand(): void {
  const c = ctx();
  try {
    c.SlashCommandParser.addCommandObject(c.SlashCommand.fromProps({
      name: 'rbt',
      callback: (_args: unknown, tab: string) => {
        const arg = String(tab ?? '').trim();
        if (arg === 'shell') { setShellEnabled(!shellOn.value); return ''; }
        const r = arg ? resolveView(arg) : null;
        if (r?.view === 'global') openGlobal(r.tab);
        else if (r) openView(r.view);
        else panelOpen.value = !panelOpen.value;
        return '';
      },
      helpString: '打开/关闭 RedBird 工具箱。参数：card（角色档案）/ flow（信息流）/ vars（变量）/ presets、worlds、regex、plugins、backup（全局工具箱的各标签）；/rbt shell 开关三栏界面。',
    }));
  } catch (e) {
    console.warn('[RedBird] slash command registration failed', e);
  }
}

async function init(): Promise<void> {
  await preloadModules();
  // 工具箱自己的存档：先把 settings.json 里旧了的部分补回来（见 st/store.ts）
  await installStore();

  configureViews({
    openInDock: (v) => openPanel(v),
    beforeSheet: () => { for (const k of openDrawers.value) closeDrawer(k); },
  });
  // Older call sites still name the former pages.
  const legacy = (tab: string) => { const r = resolveView(tab); if (r?.view === 'global') openGlobal(r.tab); else if (r) openView(r.view); };

  installFlowCapture();
  installVarsWatch();
  installEnvWatch(legacy);
  installCardsWatch(legacy);

  const root = document.createElement('div');
  root.id = 'rbt-root';
  document.body.appendChild(root);
  render(<Panel />, root);

  installDrawers();
  installRecentWatch();
  installCharactersWatch();

  // One focus at a time: an ST panel opening closes our overlay.
  openDrawers.subscribe((open) => { if (open.length && sheetOpen.value) closeSheet(); });
  // 窄屏 / 关掉三栏时没有 overlay，全局工具箱改在侧边栏的标签里
  shellActive.subscribe((on) => { if (!on && sheetOpen.value) closeSheet(); });

  // 换卡自动套用配套环境。必须排在所有监听者最前面并等它做完：酒馆按顺序 await 每个监听者，
  // 这样酒馆助手 / MVU 在初始化变量时看到的已经是切换好的世界书和预设。
  const onSwitch = async () => {
    try { await autoApplyOnSwitch(() => openView('card')); } catch (e) { console.error('[RedBird] auto apply failed', e); }
  };
  const es = ctx().eventSource;
  if (typeof es.makeFirst === 'function') es.makeFirst(ctx().eventTypes.CHAT_CHANGED, onSwitch);
  else es.on(ctx().eventTypes.CHAT_CHANGED, onSwitch);

  // 模型 / API / 预设在酒馆里改了：刷新「需要注意」和工具箱按钮上的小点
  for (const ev of ['CHATCOMPLETION_MODEL_CHANGED', 'CHATCOMPLETION_SOURCE_CHANGED', 'OAI_PRESET_CHANGED_AFTER', 'WORLDINFO_SETTINGS_UPDATED']) {
    const name = ctx().eventTypes[ev];
    if (name) es.on(name, () => { refreshStatus(); refreshEnv(); });
  }

  // 世界书面板：标题栏列出实际加载的书（可点），换卡后第一次打开时自动打开这张卡的书
  installWorldNote();

  initShellState();
  const shellRoot = document.createElement('div');
  shellRoot.id = 'rbt-shell-root';
  document.body.appendChild(shellRoot);
  render(<><Shell /><SheetHost /><ImportDialog /></>, shellRoot);

  addMenuButton();
  addSettingsDrawer();
  addSlashCommand();
  // Debug handle for the browser console.
  (window as unknown as { RedBirdTools: unknown }).RedBirdTools = { captures, openPanel, openView, openGlobal, setShellEnabled };
  console.log('[RedBird] 工具箱已加载');
}

const start = () => { init().catch((e) => console.error('[RedBird] init failed', e)); };
if (window.jQuery) window.jQuery(start);
else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
