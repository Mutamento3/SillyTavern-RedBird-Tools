/**
 * 小菜单（「＋ 新建」、卡片的 ⋯、左栏底部的 ⋯）。规范见 DESIGN.md「弹窗、底部菜单和整页」。
 * 电脑上贴着按钮弹出；手机上从底部弹出：顶上写这是谁的菜单，最下面一个「取消」。
 * 点菜单外面、按 Esc 关掉，由调用方处理（menuRef 指向菜单本身）。
 */
import type { ComponentChildren, Ref } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

/** 手机（窄于 1000px，和三栏界面切换手机布局的宽度一致）上，菜单从底部弹出，不在原地弹小框。 */
export const isPhone = (): boolean => !!window.matchMedia?.('(max-width: 1000px)').matches;

/**
 * 小菜单。电脑上贴着按钮弹出；手机上是底部弹出的面板：顶上写这是什么的菜单，最下面一个「取消」。
 * 点菜单外面、按 Esc 都会关掉（由调用方处理）。
 */
export function Menu({ title, cls, menuRef, onClose, children, closeLabel = '取消', style }: { title: string; cls: string; menuRef: Ref<HTMLDivElement>; onClose: () => void; children: ComponentChildren; /** 改了马上生效的菜单写「完成」 */ closeLabel?: string; /** 电脑上：按钮在会滚动、会裁切的容器里时，用 fixed 坐标贴着按钮弹出 */ style?: Record<string, string | number> }) {
  if (!isPhone()) return <div class={cls} ref={menuRef} role="menu" style={style}>{children}</div>;
  return createPortal(
    <div class="rbt-asheet-wrap">
      <div class="rbt-asheet" ref={menuRef} role="menu" aria-label={title} data-lint-spacing="ok">
        <div class="rbt-asheet-title">{title}</div>
        <div class="rbt-asheet-items">{children}</div>
        <button type="button" class="rbt-asheet-cancel" onClick={onClose}>{closeLabel}</button>
      </div>
    </div>,
    document.body,
  );
}

export interface MoreItem { icon: string; text: string; danger?: boolean; onClick: () => void }

/**
 * 一行末尾的 ⋯：点开是这一行的其他操作（重命名、删除…）。电脑上贴着按钮弹出，手机上从底部弹出。
 * 按钮常在会横向滚动、会裁切的容器里（表格、列表），所以电脑上用 fixed 坐标贴着按钮，下面放不下就往上弹。
 */
export function MoreMenu({ title, items }: { title: string; items: MoreItem[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Record<string, string | number> | undefined>();
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggle = () => {
    const b = ref.current?.getBoundingClientRect();
    if (b) {
      const up = window.innerHeight - b.bottom < 40 + items.length * 36;
      setPos({ position: 'fixed', right: `${window.innerWidth - b.right}px`, ...(up ? { top: 'auto', bottom: `${window.innerHeight - b.top + 4}px` } : { top: `${b.bottom + 4}px` }) });
    }
    setOpen(!open);
  };
  // 全局工具箱的窗口带 transform，fixed 是相对窗口算的：量一下实际位置，差多少挪多少
  useLayoutEffect(() => {
    const m = menuRef.current; const b = ref.current?.getBoundingClientRect();
    if (!open || !m || !b || isPhone()) return;
    const r = m.getBoundingClientRect();
    const up = m.style.bottom && m.style.bottom !== 'auto';
    const dy = up ? (b.top - 4) - r.bottom : (b.bottom + 4) - r.top;
    const dx = b.right - r.right;
    if (Math.abs(dy) > 1) { if (up) m.style.bottom = `${parseFloat(m.style.bottom) - dy}px`; else m.style.top = `${parseFloat(m.style.top) + dy}px`; }
    if (Math.abs(dx) > 1) m.style.right = `${parseFloat(m.style.right) - dx}px`;
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const scroll = (e: Event) => { if (!menuRef.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('scroll', scroll, true);
    const away = (e: PointerEvent) => { const t = e.target as Node; if (!ref.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('pointerdown', away, true);
    document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', esc, true); window.removeEventListener('scroll', scroll, true); };
  }, [open]);
  return (
    <div class="rbt-more" ref={ref}>
      <button type="button" class="rbt-iconbtn rbt-more-btn" aria-haspopup="menu" aria-expanded={open} title={`「${title}」的更多操作`} aria-label={`「${title}」的更多操作`} onClick={(e) => { e.stopPropagation(); toggle(); }}>
        <i class="fa-solid fa-ellipsis" />
      </button>
      {open && (
        <Menu title={title} cls="rbt-more-menu" menuRef={menuRef} style={pos} onClose={() => setOpen(false)}>
          {items.map((it) => (
            <button key={it.text} type="button" role="menuitem" class={it.danger ? 'danger' : ''} onClick={() => { setOpen(false); it.onClick(); }}><i class={`fa-solid ${it.icon} fa-fw`} /> {it.text}</button>
          ))}
        </Menu>
      )}
    </div>
  );
}
