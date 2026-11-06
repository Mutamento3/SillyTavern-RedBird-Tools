/**
 * RedBird 工具箱 — SillyTavern extension entry.
 * Each tool registers its own event listeners; the floating panel shows them as tabs.
 */
import { render } from 'preact';
import './style.css';
import { ctx, preloadModules, saveSettings, settings } from './st/st';
import { installCardsWatch } from './tools/cards/cards';
import { installEnvWatch } from './tools/env/env';
import { captures, installFlowCapture } from './tools/flow/capture';
import { installVarsWatch } from './tools/vars/vars';
import { Panel, openPanel, panelOpen, type TabId } from './ui/Panel';

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
          <div class="menu_button" data-tab="flow">信息流</div>
          <div class="menu_button" data-tab="vars">变量</div>
          <div class="menu_button" data-tab="env">换卡体检</div>
          <div class="menu_button" data-tab="cards">角色档案</div>
        </div>
        <label class="checkbox_label"><input type="checkbox" id="rbt_toast_switch" /> 换卡时弹出体检提示</label>
        <small>也可以从输入框左边的魔法棒菜单打开，或输入 <code>/rbt</code>。</small>
      </div>
    </div>`;
  host.appendChild(wrap);
  wrap.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => b.addEventListener('click', () => openPanel(b.dataset.tab as TabId)));
  const cb = wrap.querySelector<HTMLInputElement>('#rbt_toast_switch')!;
  cb.checked = settings().toastOnCardSwitch;
  cb.addEventListener('change', () => { settings().toastOnCardSwitch = cb.checked; saveSettings(); });
}

function addSlashCommand(): void {
  const c = ctx();
  try {
    c.SlashCommandParser.addCommandObject(c.SlashCommand.fromProps({
      name: 'rbt',
      callback: (_args: unknown, tab: string) => {
        const t = (['flow', 'vars', 'env', 'cards'] as const).find((x) => x === String(tab ?? '').trim());
        if (t) openPanel(t);
        else panelOpen.value = !panelOpen.value;
        return '';
      },
      helpString: '打开/关闭 RedBird 工具箱。可加参数 flow / vars / env / cards 直接打开对应页。',
    }));
  } catch (e) {
    console.warn('[RedBird] slash command registration failed', e);
  }
}

async function init(): Promise<void> {
  await preloadModules();
  installFlowCapture();
  installVarsWatch();
  installEnvWatch((tab) => openPanel(tab as TabId));
  installCardsWatch((tab) => openPanel(tab as TabId));

  const root = document.createElement('div');
  root.id = 'rbt-root';
  document.body.appendChild(root);
  render(<Panel />, root);

  addMenuButton();
  addSettingsDrawer();
  addSlashCommand();
  // Debug handle for the browser console.
  (window as unknown as { RedBirdTools: unknown }).RedBirdTools = { captures, openPanel };
  console.log('[RedBird] 工具箱已加载');
}

const start = () => { init().catch((e) => console.error('[RedBird] init failed', e)); };
if (window.jQuery) window.jQuery(start);
else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
