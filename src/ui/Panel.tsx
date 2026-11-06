import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { CardsView } from './CardsView';
import { EnvView } from './EnvView';
import { FlowView } from './FlowView';
import { VarsView } from './VarsView';

export type TabId = 'flow' | 'vars' | 'env' | 'cards';

export const panelOpen = signal(false);
export const activeTab = signal<TabId>('flow');

const TABS: { id: TabId; label: string }[] = [
  { id: 'flow', label: '信息流' },
  { id: 'vars', label: '变量' },
  { id: 'env', label: '换卡体检' },
  { id: 'cards', label: '角色档案' },
];

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
      <div class="rbt-header">
        <span class="rbt-title">🐦 RedBird 工具箱</span>
        <div class="rbt-tabs">
          {TABS.map((t) => (
            <button key={t.id} class={activeTab.value === t.id ? 'active' : ''} onClick={() => { activeTab.value = t.id; }}>{t.label}</button>
          ))}
        </div>
        <button class="rbt-close" title="关闭" onClick={() => { panelOpen.value = false; }}>✕</button>
      </div>
      <div class="rbt-body">
        {activeTab.value === 'flow' && <FlowView />}
        {activeTab.value === 'vars' && <VarsView />}
        {activeTab.value === 'env' && <EnvView />}
        {activeTab.value === 'cards' && <CardsView />}
      </div>
    </aside>
  );
}
