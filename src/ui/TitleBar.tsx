/**
 * 标题栏：每个整页 / 面板 / 窗口的第一行，全工具箱只用这一种（规范见 DESIGN.md「标题栏」）。
 *
 *   [‹ 返回]  [图标] 标题                       [其他按钮…] [✕]
 *
 * - 标题写「这是哪里」，和打开它的按钮同名（「编辑角色 · 霁蓝」，不是酒馆内部的「角色」）。
 * - ✕ 永远在最右边、同样大小；嵌套页面在最左边多一个「‹ 返回」。
 * - 标签（tabs）不放在这一行里，放在标题栏下面一行（电脑上宽的窗口除外，见 CSS）。
 *
 * 酒馆自己的面板不是 Preact 渲染的，用 `titleBarElement()` 生成同样结构的 DOM。
 */
import type { ComponentChildren } from 'preact';

export interface TitleBarProps {
  icon?: string;
  title: ComponentChildren;
  /** 关闭这个页面；不传就不显示 ✕。 */
  onClose?: () => void;
  closeLabel?: string;
  /** 嵌套页面：最左边的「‹ 返回」。 */
  onBack?: () => void;
  /** 标题和 ✕ 之间的按钮（比如导出）。 */
  children?: ComponentChildren;
  class?: string;
  disabled?: boolean;
}

export function TitleBar({ icon, title, onClose, closeLabel = '关闭', onBack, children, class: cls = '', disabled }: TitleBarProps) {
  return (
    <header class={`rbt-titlebar ${cls}`}>
      {onBack && (
        <button type="button" class="rbt-titlebar-back" onClick={onBack} aria-label="返回">
          <i class="fa-solid fa-chevron-left" /> 返回
        </button>
      )}
      <h2 class="rbt-titlebar-title">
        {icon && <i class={`fa-solid ${icon} fa-fw`} />}
        <span class="rbt-titlebar-text">{title}</span>
      </h2>
      {children}
      {onClose && (
        <button type="button" class="rbt-titlebar-x" title={`${closeLabel}（Esc）`} aria-label={closeLabel} disabled={disabled} onClick={onClose}>
          <i class="fa-solid fa-xmark" />
        </button>
      )}
    </header>
  );
}

/** 同样结构的 DOM 版，给酒馆自己的面板用。返回标题栏和标题文字节点（之后可以改文字）。 */
export function titleBarElement(icon: string, title: string, onClose: () => void, extraClass = ''): { bar: HTMLElement; text: HTMLElement } {
  const bar = document.createElement('header');
  bar.className = `rbt-titlebar ${extraClass}`.trim();
  bar.innerHTML = `<h2 class="rbt-titlebar-title"><i class="fa-solid ${icon} fa-fw"></i><span class="rbt-titlebar-text"></span></h2>`
    + '<button type="button" class="rbt-titlebar-x" title="关闭（Esc）" aria-label="关闭"><i class="fa-solid fa-xmark"></i></button>';
  const text = bar.querySelector<HTMLElement>('.rbt-titlebar-text')!;
  text.textContent = title;
  bar.querySelector('button')!.addEventListener('click', onClose);
  return { bar, text };
}
