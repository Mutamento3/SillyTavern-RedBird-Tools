/**
 * 小菜单（「＋ 新建」、卡片的 ⋯、左栏底部的 ⋯）。规范见 DESIGN.md「弹窗、底部菜单和整页」。
 * 电脑上贴着按钮弹出；手机上从底部弹出：顶上写这是谁的菜单，最下面一个「取消」。
 * 点菜单外面、按 Esc 关掉，由调用方处理（menuRef 指向菜单本身）。
 */
import type { ComponentChildren, Ref } from 'preact';
import { createPortal } from 'preact/compat';

/** 手机（窄于 1000px，和三栏界面切换手机布局的宽度一致）上，菜单从底部弹出，不在原地弹小框。 */
export const isPhone = (): boolean => !!window.matchMedia?.('(max-width: 1000px)').matches;

/**
 * 小菜单。电脑上贴着按钮弹出；手机上是底部弹出的面板：顶上写这是什么的菜单，最下面一个「取消」。
 * 点菜单外面、按 Esc 都会关掉（由调用方处理）。
 */
export function Menu({ title, cls, menuRef, onClose, children }: { title: string; cls: string; menuRef: Ref<HTMLDivElement>; onClose: () => void; children: ComponentChildren }) {
  if (!isPhone()) return <div class={cls} ref={menuRef} role="menu">{children}</div>;
  return createPortal(
    <div class="rbt-asheet-wrap">
      <div class="rbt-asheet" ref={menuRef} role="menu" aria-label={title}>
        <div class="rbt-asheet-title">{title}</div>
        <div class="rbt-asheet-items">{children}</div>
        <button type="button" class="rbt-asheet-cancel" onClick={onClose}>取消</button>
      </div>
    </div>,
    document.body,
  );
}

