/**
 * 全局工具箱的大 overlay（三栏外壳里）。和酒馆面板同样的尺寸、压暗背景、标题栏和 ×，
 * 并且和酒馆面板互斥：一个时刻只开一个。
 */
import { useEffect } from 'preact/hooks';
import { GlobalTabs, GlobalToolbox } from '../ui/pages/GlobalToolbox';
import { closeSheet, sheetOpen } from '../ui/views';
import { TitleBar } from '../ui/TitleBar';
import { compact } from './Shell';

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
  const phone = compact.value;
  return (
    <>
      <div class="rbt-sheet-backdrop" onMouseDown={() => closeSheet()} />
      <section class="rbt-sheet rbt-scope" role="dialog" aria-label={title}>
        <TitleBar class="rbt-sheet-bar" icon="fa-globe" title={title} onClose={() => closeSheet()}>
          {phone && <GlobalTabs />}
        </TitleBar>
        {/* 电脑上标签竖排在左边（八个标签横排太挤）；手机上屏幕窄，还是在标题下面横排 */}
        <div class="rbt-sheet-main">
          {!phone && <GlobalTabs vertical />}
          <div class="rbt-sheet-body">
            <GlobalToolbox />
          </div>
        </div>
      </section>
    </>
  );
}
