/**
 * 全局工具箱的大 overlay（三栏外壳里）。和酒馆面板同样的尺寸、压暗背景、标题栏和 ×，
 * 并且和酒馆面板互斥：一个时刻只开一个。
 */
import { useEffect } from 'preact/hooks';
import { GlobalTabs, GlobalToolbox } from '../ui/pages/GlobalToolbox';
import { closeSheet, sheetOpen } from '../ui/views';
import { TitleBar } from '../ui/TitleBar';

export function SheetHost() {
  const open = sheetOpen.value;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('dialog[open]') || document.querySelector('.rbt-imp')) return; // ST dialogs / the import window handle their own Esc
      closeSheet();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  if (!open) return null;

  const title = '全局工具箱';
  return (
    <>
      <div class="rbt-sheet-backdrop" onMouseDown={() => closeSheet()} />
      <section class="rbt-sheet rbt-scope" role="dialog" aria-label={title}>
        <TitleBar class="rbt-sheet-bar" icon="fa-globe" title={title} onClose={() => closeSheet()}>
          <GlobalTabs />
        </TitleBar>
        <div class="rbt-sheet-body">
          <GlobalToolbox />
        </div>
      </section>
    </>
  );
}
