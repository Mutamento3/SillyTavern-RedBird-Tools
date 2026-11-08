import { signal } from '@preact/signals';
import { TitleBar } from './TitleBar';
import { useEffect } from 'preact/hooks';
import { exportDiagnostics } from '../tools/diag';
import { FlowView } from './FlowView';
import { CardPage } from './pages/CardPage';
import { DropHint, GlobalTabs, GlobalToolbox, ImportButton, useDropImport } from './pages/GlobalToolbox';
import { VarsView } from './VarsView';
import { shellActive, VIEW_LABELS, type ViewId } from './views';

export type TabId = ViewId;

export const panelOpen = signal(false);
export const activeTab = signal<TabId>('flow');

/** In shell mode the management views open as overlays, so the dock keeps only the watch-while-playing tabs. */
function tabsNow(): TabId[] {
  return shellActive.value ? ['card', 'flow', 'vars'] : ['card', 'flow', 'vars', 'global'];
}

/**
 * The toolbox is a side dock on the right. On wide screens the chat column makes room for it
 * (see .rbt-docked rules in style.css); on narrow screens it covers the chat full-screen.
 */
const WIDTH_KEY = 'rbt-dock-width';
const MIN_W = 320;
const DEFAULT_W = 440;

function maxWidth(): number {
  const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
  return Math.max(MIN_W, Math.floor(vw * 0.5));
}

function clampWidth(w: number): number {
  return Math.round(Math.min(Math.max(MIN_W, w), maxWidth()));
}

function loadWidth(): number {
  const saved = Number(localStorage.getItem(WIDTH_KEY));
  return clampWidth(Number.isFinite(saved) && saved > 0 ? saved : DEFAULT_W);
}

function setDockWidth(w: number): void {
  document.body.style.setProperty('--rbt-dock-w', `${w}px`);
}

/** RedBird Dark (and themes built like it) lay out the chat with --rbd-left/--rbd-right. */
function detectThemeLayout(): void {
  const themed = getComputedStyle(document.documentElement).getPropertyValue('--rbd-panel-w').trim() !== '';
  document.body.classList.toggle('rbt-theme-layout', themed);
}

export function openPanel(tab?: TabId): void {
  if (tab) activeTab.value = tab;
  panelOpen.value = true;
}

export function Panel() {
  const open = panelOpen.value;
  if (!tabsNow().includes(activeTab.value)) activeTab.value = 'flow';

  useEffect(() => {
    document.body.classList.toggle('rbt-docked', open);
    if (!open) return;
    detectThemeLayout();
    setDockWidth(loadWidth());
    const onResize = () => {
      detectThemeLayout();
      setDockWidth(loadWidth());
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  if (!open) return null;

  const onResizeStart = (e: PointerEvent) => {
    e.preventDefault();
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);
    document.body.classList.add('rbt-resizing');
    const move = (ev: PointerEvent) => setDockWidth(clampWidth(window.innerWidth - ev.clientX));
    const up = (ev: PointerEvent) => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      document.body.classList.remove('rbt-resizing');
      const w = clampWidth(window.innerWidth - ev.clientX);
      localStorage.setItem(WIDTH_KEY, String(w));
      setDockWidth(w);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
  };

  return (
    <aside class="rbt-panel rbt-dock">
      <div class="rbt-resize-handle" title="拖动调整宽度" onPointerDown={onResizeStart} />
      {/* 第一行：这是哪里（标题）和怎么离开（✕）；第二行：标签 */}
      <TitleBar class="rbt-dock-titlebar" icon={shellActive.value ? 'fa-toolbox' : 'fa-feather-pointed'} title={shellActive.value ? '聊天工具箱' : 'RedBird 工具箱'} onClose={() => { panelOpen.value = false; }}>
        <button type="button" class="rbt-titlebar-btn" title="导出诊断文件，用来排查问题" aria-label="导出诊断文件" onClick={() => { void exportDiagnostics(); }}><i class="fa-solid fa-file-arrow-down" /></button>
      </TitleBar>
      <div class="rbt-header-tabs">
        <div class="rbt-tabs" role="tablist">
          {tabsNow().map((id) => (
            <button key={id} role="tab" aria-selected={activeTab.value === id} class={activeTab.value === id ? 'active' : ''} onClick={() => { activeTab.value = id; }}>{id === 'global' ? '全局' : VIEW_LABELS[id]}</button>
          ))}
        </div>
      </div>
      <div class="rbt-body">
        {activeTab.value === 'flow' && <FlowView />}
        {activeTab.value === 'vars' && <VarsView />}
        {activeTab.value === 'card' && <CardPage />}
        {activeTab.value === 'global' && <DockGlobal />}
      </div>
    </aside>
  );
}

/** 全局工具箱 inside the dock (phones / no shell): sub-tabs + 导入, and drop-to-import. */
function DockGlobal() {
  const drop = useDropImport();
  return (
    <div class="rbt-dock-global" {...drop.handlers}>
      <div class="rbt-dock-subtabs"><GlobalTabs /><ImportButton /></div>
      <GlobalToolbox />
      {drop.dragging !== null && <DropHint count={drop.dragging} />}
    </div>
  );
}
