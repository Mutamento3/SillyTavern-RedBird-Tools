/**
 * 工具箱自己的大 overlay（这张卡 / 全局 / 维护）。和酒馆面板同样的尺寸、压暗背景、标题栏和 ×，
 * 并且和酒馆面板互斥：一个时刻只开一个。
 */
import { useEffect } from 'preact/hooks';
import { GlobalPage } from '../ui/pages/GlobalPage';
import { MaintainPage } from '../ui/pages/MaintainPage';
import { archiveTarget } from '../tools/cards/cards';
import { closeSheet as hideSheet, sheetView, VIEW_LABELS, type SheetId } from '../ui/views';

const TABS: SheetId[] = ['global', 'maintain'];

/** Close and go back to showing the current card next time. */
function closeSheet(): void {
  hideSheet();
  archiveTarget.value = null;
}


export function SheetHost() {
  const v = sheetView.value;
  useEffect(() => {
    if (!v) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('dialog[open]')) return; // ST confirm dialogs handle their own Esc
      closeSheet();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [v]);
  if (!v) return null;

  const title = '全局工具箱';
  return (
    <>
      <div class="rbt-sheet-backdrop" onMouseDown={() => closeSheet()} />
      <section class="rbt-sheet rbt-scope" role="dialog" aria-label={title}>
        <header class="rbt-sheet-bar">
          <span class="rbt-sheet-title"><i class="fa-solid fa-globe fa-fw" />{title}</span>
          <div class="rbt-sheet-tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t} type="button" role="tab" class={v === t ? 'active' : ''} onClick={() => { sheetView.value = t; }}>{VIEW_LABELS[t]}</button>
            ))}
          </div>
          <button type="button" class="rbt-sheet-close" title="关闭（Esc）" aria-label="关闭" onClick={() => closeSheet()}>✕</button>
        </header>
        <div class="rbt-sheet-body">
          {v === 'global' && <GlobalPage />}
          {v === 'maintain' && <MaintainPage />}
        </div>
      </section>
    </>
  );
}
