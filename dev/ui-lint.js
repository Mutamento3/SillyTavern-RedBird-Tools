/**
 * 界面自检：在浏览器里对一块界面跑一遍，找出“低级错误”。规范见 DESIGN.md「改完之后」。
 *
 *   uiLint(root, { phone })  →  [{ rule, where, detail }]
 *
 * 检查四件事：
 * 1. overflow   手机上有没有东西超出屏幕右边（会出现左右滑动）。
 * 2. align      同一行里的东西（按钮、图标、文字）垂直方向没对齐：中线差超过 3px。
 * 3. spacing    同一组上下排列的东西，间距忽大忽小：最大和最小的间距差超过 4px。
 * 4. tap        手机上能点的东西太小：宽或高不到 32px。
 *
 * 这个文件不进 dist，只给开发自检用（dev/ui-audit.mjs 会把它注入页面）。
 */
// eslint-disable-next-line no-unused-vars
function uiLint(root, { phone = false, maxReports = 40 } = {}) {
  const out = [];
  const vw = window.innerWidth;
  const visible = (el) => {
    if (!(el instanceof HTMLElement)) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const name = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    const text = (el.innerText || el.getAttribute('aria-label') || el.title || '').trim().replace(/\s+/g, ' ').slice(0, 16);
    return `${el.tagName.toLowerCase()}${id}${cls}${text ? ` 「${text}」` : ''}`;
  };
  const push = (rule, el, detail) => { if (out.length < maxReports) out.push({ rule, where: name(el), detail }); };
  const all = [root, ...root.querySelectorAll('*')].filter(visible);

  // 0. unhidden：酒馆用内联 display:none 或 .displayNone 藏起来的东西，被我们的 CSS 显示出来了
  //    （比如对酒馆元素写了 display: … !important）。这类问题只看几何位置是看不出来的。
  for (const el of root.querySelectorAll('[style*="display"], .displayNone')) {
    const hiddenByST = el.style.display === 'none' || el.classList.contains('displayNone');
    if (hiddenByST && getComputedStyle(el).display !== 'none') push('unhidden', el, '酒馆藏起来的东西被显示出来了（检查有没有 display … !important）');
  }

  // 1. overflow
  if (phone) {
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.left < vw) { push('overflow', el, `右边超出屏幕 ${Math.round(r.right - vw)}px`); }
    }
  }

  for (const el of all) {
    const cs = getComputedStyle(el);
    const kids = [...el.children].filter((k) => visible(k) && getComputedStyle(k).position !== 'absolute' && getComputedStyle(k).position !== 'fixed');
    if (kids.length < 2) continue;
    const rects = kids.map((k) => k.getBoundingClientRect());
    const isRow = (cs.display.includes('flex') && !cs.flexDirection.startsWith('column'))
      || (cs.display.includes('grid') && rects.every((r) => Math.abs(r.top - rects[0].top) < r.height));

    // 2. align：一行里的东西（都在同一行上，彼此高度重叠）中线要对齐
    // 故意顶对齐的行（勾选框配两行说明）不算
    if (isRow && !['baseline', 'flex-start', 'start'].includes(cs.alignItems)) {
      const sameLine = rects.every((r) => r.top < rects[0].bottom && r.bottom > rects[0].top);
      const short = rects.every((r) => r.height <= 60); // 多行文本块不算
      if (sameLine && short) {
        const mids = rects.map((r) => (r.top + r.bottom) / 2);
        const diff = Math.max(...mids) - Math.min(...mids);
        if (diff > 3) push('align', el, `同一行的 ${kids.length} 个东西中线差 ${Math.round(diff)}px`);
      }
    }

    // 3. spacing：上下排列的一组，间距要一致
    const isColumn = (cs.display.includes('flex') && cs.flexDirection.startsWith('column')) || cs.display === 'block' || cs.display.includes('grid');
    // 容器上写了 data-lint-spacing="ok"：这里的间距是故意不一样的（比如标题区和内容区之间留得更大）
    if (isColumn && kids.length >= 3 && el.dataset.lintSpacing !== 'ok') {
      const stacked = rects.every((r, i) => i === 0 || r.top >= rects[i - 1].bottom - 1);
      // 第一个是标题（标题栏、h1–h6、分组标题）时，标题下面的间距本来就和其他不同，从第二个开始比
      const head = kids[0].matches('.rbt-titlebar, h1, h2, h3, h4, h5, h6, .rbt-page-group-title');
      if (head) { kids.shift(); rects.shift(); }
      if (stacked && kids.length >= 3) {
        const gaps = rects.slice(1).map((r, i) => Math.round(r.top - rects[i].bottom));
        const min = Math.min(...gaps); const max = Math.max(...gaps);
        if (max - min > 4) push('spacing', el, `子元素间距 ${gaps.join(' / ')}px`);
      }
    }
  }

  // 4. tap
  if (phone) {
    for (const el of root.querySelectorAll('button, a[href], select, input:not([type=hidden]), textarea, [role=button], [role=tab], .menu_button, .rbt-gbtn')) {
      if (!visible(el)) continue;
      // 不算：酒馆用 select2 时藏起来的原生下拉框；label 里的勾选框（整行都能点）；select2 自带的搜索框
      if (el.classList.contains('select2-hidden-accessible') || el.classList.contains('select2-search__field')) continue;
      if (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 32 || r.height < 32) push('tap', el, `${Math.round(r.width)}×${Math.round(r.height)}px，手机上太小`);
    }
  }
  return out;
}
