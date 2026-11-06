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

function loadRect(): Rect {
  try {
    const r = JSON.parse(localStorage.getItem(POS_KEY) ?? '');
    if (typeof r?.x === 'number') return r;
  } catch { /* ignore */ }
  const w = Math.min(560, window.innerWidth - 20);
  return { x: window.innerWidth - w - 10, y: 50, w, h: Math.min(760, window.innerHeight - 70) };
}

function clampRect(r: Rect): Rect {
  const w = Math.min(Math.max(320, r.w), window.innerWidth);
  const h = Math.min(Math.max(240, r.h), window.innerHeight);
  return { w, h, x: Math.min(Math.max(0, r.x), window.innerWidth - 80), y: Math.min(Math.max(0, r.y), window.innerHeight - 40) };
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
    const r = clampRect(loadRect());
    Object.assign(el.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    const ro = new ResizeObserver(() => {
      localStorage.setItem(POS_KEY, JSON.stringify({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }));
    });
    ro.observe(el);
    return () => ro.disconnect();
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
      localStorage.setItem(POS_KEY, JSON.stringify({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }));
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
