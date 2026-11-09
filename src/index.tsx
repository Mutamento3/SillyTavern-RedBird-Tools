/**
 * RedBird 工具箱 — SillyTavern extension entry.
 *
 * Views (see ui/views.ts): 信息流 / 变量 live in the right-side dock; 这张卡 / 全局 / 维护 open as
 * large overlays when the three-column shell is active, and as dock tabs otherwise.
 */
import { render } from 'preact';
import './style.css';
import './shell/shell.css';
import './look/look.css';
import { applyLook, lookOn, retireOldTheme, setLook, useBuiltInLook, watchStThemeSwitch } from './look/look';
import { ctx, preloadModules, saveSettings, settings } from './st/st';
import { installStore } from './st/store';
import { checkForUpdate, newerVersion, updateNow, installedVersion, installUpdateCheck } from './tools/update';
import { installModelGuard } from './tools/model';
import { installCharactersWatch } from './shell/characters';
import { closeDrawer, installDrawers, openDrawers } from './shell/drawers';
import { installWorldNote } from './shell/worldNote';
import { installWorldEntries } from './shell/worldEntries';
import { installMesActions } from './shell/mesActions';
import { installChatSaves } from './shell/chatSaves';
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
  const row = (id: string, title: string, desc: string) =>
    `<label class="rbt-check-row rbt-set-row"><input type="checkbox" class="rbt-cb" id="${id}" /><span class="rbt-check-text"><span>${title}</span><small>${desc}</small></span></label>`;
  wrap.innerHTML = `
    <div class="inline-drawer">
      <div class="inline-drawer-toggle inline-drawer-header">
        <b>RedBird 工具箱</b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
      </div>
      <div class="inline-drawer-content rbt-set">
        <!-- 有新版本时才显示，放在最上面 -->
        <div class="rbt-set-group" id="rbt_update_row" hidden>
          <div class="rbt-set-item">
            <span class="rbt-set-ico accent"><i class="fa-solid fa-circle-arrow-up"></i></span>
            <span class="rbt-set-text"><span id="rbt_update_title">有新版本</span><small>更新后刷新页面生效</small></span>
            <div class="menu_button rbt-set-primary" id="rbt_update_now">更新</div>
          </div>
        </div>
        <div class="rbt-set-group">
          <div class="rbt-set-title">工具箱</div>
          <div class="rbt-set-item rbt-set-nav" id="rbt_open_chat" role="button" tabindex="0">
            <span class="rbt-set-ico"><i class="fa-solid fa-toolbox"></i></span>
            <span class="rbt-set-text"><span>聊天工具箱</span><small>当前这张卡</small></span>
            <i class="fa-solid fa-chevron-right rbt-set-chev"></i>
          </div>
          <div class="rbt-set-item rbt-set-nav" id="rbt_open_global" role="button" tabindex="0">
            <span class="rbt-set-ico"><i class="fa-solid fa-globe"></i></span>
            <span class="rbt-set-text"><span>全局工具箱</span><small>所有卡共用的预设、世界书、正则…</small></span>
            <i class="fa-solid fa-chevron-right rbt-set-chev"></i>
          </div>
        </div>
        <div class="rbt-set-group">
          <div class="rbt-set-title">界面</div>
          ${row('rbt_shell_switch', '三栏界面', '左栏入口、中间聊天、右边工具箱；左栏底部可以切回原版')}
          <small class="rbt-set-tip" id="rbt_thumb_tip" hidden>手机或远程打开时，首页用的是缩略图。觉得模糊，见<a href="https://github.com/RebBirdTD/SillyTavern-RedBird-Tools#调整缩略图清晰度" target="_blank" rel="noopener">怎么调清楚 ↗</a></small>
          ${row('rbt_look_switch', '自带美化', '深色、浅色、护眼，在全局工具箱 › 美化里选')}
        </div>
        <div class="rbt-set-group">
          <div class="rbt-set-title">换卡时</div>
          ${row('rbt_auto_switch', '自动换成这张卡的预设、世界书和正则', '随时可以撤销')}
          ${row('rbt_auto_world', '自动导入卡里自带的世界书', '导入后绑到这张卡上')}
        </div>
        <div class="rbt-set-foot">
          <span>版本 <span id="rbt_version"></span></span>
          <button type="button" class="rbt-set-link" id="rbt_check_update">检查更新</button>
          <a class="rbt-set-link" href="https://github.com/RebBirdTD/SillyTavern-RedBird-Tools#readme" target="_blank" rel="noopener">使用说明 ↗</a>
        </div>
      </div>
    </div>`;
  host.appendChild(wrap);
  // 不是在本机电脑上打开时，说明首页卡片为什么用缩略图、怎么变清楚
  if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname)) wrap.querySelector<HTMLElement>('#rbt_thumb_tip')?.removeAttribute('hidden');
  // 「工具箱」两行：整行都能点，也能用键盘（Enter / 空格）
  const navRow = (id: string, go: () => void) => {
    const el = wrap.querySelector<HTMLElement>(`#${id}`);
    el?.addEventListener('click', go);
    el?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  };
  navRow('rbt_open_global', () => openGlobal());
  navRow('rbt_open_chat', () => openPanel());
  const bind = (id: string, get: () => boolean, set: (v: boolean) => void) => {
    const cb = wrap.querySelector<HTMLInputElement>(`#${id}`)!;
    cb.checked = get();
    cb.addEventListener('change', () => set(cb.checked));
    return cb;
  };
  const lookCb = bind('rbt_look_switch', () => lookOn.value, (v) => { if (v) void useBuiltInLook(); else setLook(false); });
  lookOn.subscribe((v) => { lookCb.checked = v; });
  const shellCb = bind('rbt_shell_switch', () => shellOn.value, (v) => setShellEnabled(v));
  shellOn.subscribe((v) => { shellCb.checked = v; });
  bind('rbt_auto_switch', () => settings().autoApplyEnv, (v) => { settings().autoApplyEnv = v; saveSettings(); });
  bind('rbt_auto_world', () => settings().autoImportWorld, (v) => { settings().autoImportWorld = v; saveSettings(); });
  const ver = wrap.querySelector<HTMLElement>('#rbt_version');
  if (ver) ver.textContent = installedVersion() || '?';
  wrap.querySelector('#rbt_check_update')?.addEventListener('click', () => { void checkForUpdate(true); });
  // 有新版本时，在设置里直接给一个「更新到 vX」按钮（打开设置时查一次 GitHub 上的版本号）
  wrap.querySelector('#rbt_update_now')?.addEventListener('click', () => { void updateNow(); });
  void newerVersion().then((v) => {
    if (!v) return;
    const row = wrap.querySelector<HTMLElement>('#rbt_update_row');
    const title = wrap.querySelector<HTMLElement>('#rbt_update_title');
    if (title) title.textContent = `有新版本 ${v}`;
    row?.removeAttribute('hidden');
  });
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
  applyLook();
  void retireOldTheme();
  watchStThemeSwitch();
  await preloadModules();
  // 工具箱自己的存档：先把 settings.json 里旧了的部分补回来（见 st/store.ts）
  await installStore();
  installModelGuard();

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
  installWorldEntries();
  // 手机上每条消息的「‹ 2/5 › ✎ ⋯」挪到消息最下面一行
  installMesActions();
  // 存档页每一条：存档名 + ⋯、两行预览、时间和大小
  installChatSaves();
  // 所有通知（包括酒馆和别的插件发的）右上角都有 ✕，可以直接关掉
  if (window.toastr?.options) window.toastr.options.closeButton = true;

  initShellState();
  const shellRoot = document.createElement('div');
  shellRoot.id = 'rbt-shell-root';
  document.body.appendChild(shellRoot);
  render(<><Shell /><SheetHost /><ImportDialog /></>, shellRoot);

  addMenuButton();
  addSettingsDrawer();
  addSlashCommand();
  // 有新版本时提醒（每天最多一次）
  installUpdateCheck();
  // Debug handle for the browser console.
  (window as unknown as { RedBirdTools: unknown }).RedBirdTools = { captures, openPanel, openView, openGlobal, setShellEnabled };
  console.log('[RedBird] 工具箱已加载');
}

const start = () => { init().catch((e) => console.error('[RedBird] init failed', e)); };
if (window.jQuery) window.jQuery(start);
else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
