import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { EnvView } from './EnvView';
import { FlowView } from './FlowView';
import { VarsView } from './VarsView';

export type TabId = 'flow' | 'vars' | 'env';

export const panelOpen = signal(false);
export const activeTab = signal<TabId>('flow');

const TABS: { id: TabId; label: string }[] = [
  { id: 'flow', label: '信息流' },
  { id: 'vars', label: '变量' },
  { id: 'env', label: '换卡体检' },
];

const POS_KEY = 'rbt-panel-rect';

interface Rect { x: number; y: number; w: number; h: number }

const MIN_W = 320;
const MIN_H = 240;

/** Viewport size; background tabs can report 0, so fall back to the screen size. */
function viewport(): { vw: number; vh: number } {
  const vw = window.innerWidth || document.documentElement.clientWidth || window.screen.width || 1024;
  const vh = window.innerHeight || document.documentElement.clientHeight || window.screen.height || 768;
  return { vw: Math.max(vw, MIN_W), vh: Math.max(vh, MIN_H) };
}

function defaultRect(): Rect {
  const { vw, vh } = viewport();
  const w = Math.min(560, vw - 20);
  return { x: vw - w - 10, y: 50, w, h: Math.min(760, vh - 70) };
}

function loadRect(): Rect {
  try {
    const r = JSON.parse(localStorage.getItem(POS_KEY) ?? '');
    if (typeof r?.x === 'number' && r.w >= MIN_W && r.h >= MIN_H) return r;
  } catch { /* ignore */ }
  return defaultRect();
}

function clampRect(r: Rect): Rect {
  const { vw, vh } = viewport();
  const w = Math.min(Math.max(MIN_W, r.w), vw);
  const h = Math.min(Math.max(MIN_H, r.h), vh);
  return {
    w,
    h,
    x: Math.max(0, Math.min(r.x, vw - Math.min(w, 120))),
    y: Math.max(0, Math.min(r.y, vh - 40)),
  };
}

function saveRect(el: HTMLElement): void {
  if (el.offsetWidth < MIN_W || el.offsetHeight < MIN_H) return; // hidden / not laid out yet
  localStorage.setItem(POS_KEY, JSON.stringify({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }));
}

function applyRect(el: HTMLElement, r: Rect): void {
  Object.assign(el.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
}

export function openPanel(tab?: TabId): void {
  if (tab) activeTab.value = tab;
  panelOpen.value = true;
}

export function Panel() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !panelOpen.value) return;
    applyRect(el, clampRect(loadRect()));
    const ro = new ResizeObserver(() => saveRect(el));
    ro.observe(el);
    // Keep the panel on screen when the window changes size (or a background tab becomes visible).
    const onResize = () => applyRect(el, clampRect({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }));
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onResize);
    };
  }, [panelOpen.value]);

  if (!panelOpen.value) return null;

  const onDragStart = (e: PointerEvent) => {
    const el = ref.current;
    if (!el || (e.target as HTMLElement).closest('button')) return;
    const startX = e.clientX - el.offsetLeft;
    const startY = e.clientY - el.offsetTop;
    const move = (ev: PointerEvent) => {
      const r = clampRect({ x: ev.clientX - startX, y: ev.clientY - startY, w: el.offsetWidth, h: el.offsetHeight });
      el.style.left = `${r.x}px`;
      el.style.top = `${r.y}px`;
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      saveRect(el);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div class="rbt-panel" ref={ref}>
      <div class="rbt-header" onPointerDown={onDragStart}>
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
      </div>
    </div>
  );
}
