/**
 * 首页：角色画廊。图片是视觉中心——竖版大卡片，立绘铺满，底部用图片自己的颜色渐变 + 模糊托住名字。
 * 左栏只放最近的聊天；挑角色、新建 / 导入都在这里。
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { openGlobal } from '../ui/views';
import { openImport } from '../ui/ImportDialog';
import { Menu } from '../ui/Menu';
import { ctx } from '../st/st';
import {
  allTags,
  charsTick,
  createCharacter,
  createGroup,
  deleteCharacters,
  duplicateCharacter,
  editCharacter,
  exportCharacter,
  setFavorite,
  listCharacters,
  openCharacter,
  openSaves,
  sortCharacters,
  toggleFavorite,
  type CharItem,
  type CharSort,
} from './characters';

const SORT_KEY = 'rbt-shell-char-sort';

// ------------------------------------------------------------ colour ---

// 卡片底色（从图片底部取的颜色）记在浏览器里：下次打开首页不用再把每张图画到画布上取色
const TINT_KEY = 'rbt-card-tints';
const tints: Map<string, string> = (() => {
  try { return new Map(Object.entries(JSON.parse(localStorage.getItem(TINT_KEY) ?? '{}') as Record<string, string>)); } catch { return new Map(); }
})();
let tintSave: ReturnType<typeof setTimeout> | undefined;
function rememberTint(key: string, t: string): void {
  tints.set(key, t);
  clearTimeout(tintSave);
  tintSave = setTimeout(() => {
    try { localStorage.setItem(TINT_KEY, JSON.stringify(Object.fromEntries([...tints].slice(-500)))); } catch { /* 存不下就算了 */ }
  }, 1000);
}

/** Average colour of the lower part of each picture, toned down so white text stays readable. */
function toneDown(r: number, g: number, b: number): string {
  // RGB → HSL, then cap saturation / lightness.
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return `hsl(${Math.round(h * 360)} ${Math.round(Math.min(s, 0.45) * 100)}% ${Math.round(Math.min(Math.max(l, 0.14), 0.26) * 100)}%)`;
}

function sampleTint(img: HTMLImageElement): string | null {
  try {
    const c = document.createElement('canvas');
    c.width = 12;
    c.height = 12;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g || !img.naturalWidth) return null;
    const sy = img.naturalHeight * 0.55;
    g.drawImage(img, 0, sy, img.naturalWidth, img.naturalHeight - sy, 0, 0, 12, 12);
    const d = g.getImageData(0, 0, 12, 12).data;
    let r = 0; let gg = 0; let b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4;
    return toneDown(r / n, gg / n, b / n);
  } catch {
    return null;
  }
}

// -------------------------------------------------------------- bits ---

/**
 * 卡片用哪张图。角色卡 PNG 里嵌着整张卡的数据，一张常有 1–9MB；手机或远程打开时，首屏几张就要下载几十 MB，
 * 点卡片进聊天的请求还得排在后面。所以只有在本机电脑上打开（localhost）才用原图，其余都用酒馆的缩略图（jpg，十几 KB）。
 * 缩略图默认只有 96×144，放大会糊，可以在酒馆的 config.yaml 里把 thumbnails.dimensions.avatar 调大（README 有写）。
 */
const LOCAL = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname);
function cardImage(it: CharItem): string {
  if (it.kind !== 'character' || !LOCAL || window.matchMedia?.('(max-width: 1000px)').matches) return it.thumb;
  return `/characters/${encodeURIComponent(it.key.slice(2))}`;
}

function lastChatText(t: number, now = Date.now()): string {
  if (!t) return '还没聊过';
  const day = 86400000;
  const start = new Date(now).setHours(0, 0, 0, 0);
  if (t >= start) return '今天聊过';
  if (t >= start - day) return '昨天聊过';
  const days = Math.floor((start - t) / day) + 1;
  if (days < 7) return `${days} 天前聊过`;
  const d = new Date(t);
  return d.getFullYear() === new Date(now).getFullYear() ? `${d.getMonth() + 1} 月 ${d.getDate()} 日聊过` : `${d.getFullYear()} 年 ${d.getMonth() + 1} 月聊过`;
}

/** 「＋ 新建」：新建角色、新建群组收在一个次要按钮里。 */
function NewMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { const t = e.target as Node; if (!ref.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away, true);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', esc); };
  }, [open]);
  const run = (fn: () => void) => () => { setOpen(false); fn(); };
  return (
    <div class="rbt-home-new" ref={ref}>
      <button type="button" class={'rbt-home-btn' + (open ? ' active' : '')} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <i class="fa-solid fa-plus" /> 新建 <i class="fa-solid fa-chevron-down rbt-home-new-chev" />
      </button>
      {open && (
        <Menu title="新建" cls="rbt-home-newmenu" menuRef={menuRef} onClose={() => setOpen(false)}>
          <button type="button" role="menuitem" onClick={run(createCharacter)}><i class="fa-solid fa-user-plus fa-fw" /> 新建角色</button>
          <button type="button" role="menuitem" onClick={run(createGroup)}><i class="fa-solid fa-users fa-fw" /> 新建群组</button>
        </Menu>
      )}
    </div>
  );
}

/** 「⋯」菜单：卡片上唯一的按钮，电脑和手机一样（置顶、编辑、所有存档、导出、复制、删除）。 */
function CardMenu({ it, onClose }: { it: CharItem; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', away, true);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', esc); };
  }, []);
  const run = (fn: () => unknown) => () => { onClose(); void fn(); };
  return (
    <Menu title={it.name} cls="rbt-hcard-menu" menuRef={ref} onClose={onClose}>
      <button type="button" role="menuitem" onClick={run(() => toggleFavorite(it))}><i class="fa-solid fa-thumbtack fa-fw" /> {it.fav ? '取消置顶' : '置顶'}</button>
      <button type="button" role="menuitem" onClick={run(() => editCharacter(it))}><i class="fa-solid fa-pen fa-fw" /> 编辑角色</button>
      <button type="button" role="menuitem" onClick={run(() => openSaves(it))}><i class="fa-solid fa-clock-rotate-left fa-fw" /> 所有存档</button>
      <button type="button" role="menuitem" onClick={run(() => exportCharacter(it, 'png'))}><i class="fa-solid fa-file-image fa-fw" /> 导出 PNG</button>
      <button type="button" role="menuitem" onClick={run(() => exportCharacter(it, 'json'))}><i class="fa-solid fa-file-code fa-fw" /> 导出 JSON</button>
      <button type="button" role="menuitem" onClick={run(() => duplicateCharacter(it))}><i class="fa-solid fa-clone fa-fw" /> 复制一份</button>
      <button type="button" role="menuitem" class="danger" onClick={run(() => deleteCharacters([it]))}><i class="fa-solid fa-trash-can fa-fw" /> 删除…</button>
    </Menu>
  );
}

function Card({ it, managing, selected, onSelect }: { it: CharItem; managing?: boolean; selected?: boolean; onSelect?: (it: CharItem) => void }) {
  const src = cardImage(it);
  const [tint, setTint] = useState(tints.get(it.key) ?? '');
  const [broken, setBroken] = useState(false);
  const [menu, setMenu] = useState(false);
  const onLoad = (e: Event) => {
    if (tints.has(it.key)) return;
    const t = sampleTint(e.currentTarget as HTMLImageElement);
    if (t) { rememberTint(it.key, t); setTint(t); }
  };
  const selectable = it.kind === 'character';
  const cls = 'rbt-hcard' + (managing ? ' managing' : '') + (selected ? ' selected' : '') + (managing && !selectable ? ' disabled' : '') + (menu ? ' menu-open' : '');
  return (
    <article class={cls} style={tint ? { '--tint': tint } : undefined}>
      <button
        type="button" class="rbt-hcard-hit"
        title={managing ? (selectable ? (selected ? '取消选择' : '选择') : '群组不能在这里管理') : `和「${it.name}」聊天`}
        aria-pressed={managing ? !!selected : undefined}
        onClick={() => { if (managing) { if (selectable) onSelect?.(it); } else void openCharacter(it); }}
      >
        {!broken
          ? <img class="rbt-hcard-img" src={src} alt="" loading="lazy" decoding="async" onLoad={onLoad} onError={() => setBroken(true)} />
          : <img class="rbt-hcard-img" src={it.thumb} alt="" />}
        <span class="rbt-hcard-shade" />
        {it.problems.length > 0
          ? <span class="rbt-hcard-pill warn" title={it.problems.join('、')}><i /><span class="rbt-hcard-pill-text">{it.problems.length > 1 ? `${it.problems.length} 项待处理` : it.problems[0]}</span></span>
          : it.kind === 'group' && <span class="rbt-hcard-pill"><i class="fa-solid fa-users" /> 群组</span>}
        <span class="rbt-hcard-text">
          <span class="rbt-hcard-name">{it.fav && <i class="fa-solid fa-thumbtack rbt-hcard-namefav" aria-label="已置顶" />}{it.name}</span>
          <span class="rbt-hcard-meta">{it.kind === 'group' ? it.note : lastChatText(it.lastChat)}</span>
          {it.tags.length > 0 && <span class="rbt-hcard-meta">{it.tags.slice(0, 3).map((t) => t.name).join(' · ')}</span>}
        </span>
      </button>
      {managing ? (
        selectable && <span class="rbt-hcard-check" aria-hidden="true">{selected && <i class="fa-solid fa-check" />}</span>
      ) : (
        <span class="rbt-hcard-acts">
          {/* 群组没有「⋯」菜单，直接放「编辑」 */}
          {it.kind === 'group' && <button type="button" class="rbt-hcard-act rbt-hcard-act-edit" title="编辑群组" onClick={() => { void editCharacter(it); }}>
            <i class="fa-solid fa-pen" />
          </button>}
          {it.kind === 'character' && (
            <button type="button" class="rbt-hcard-act rbt-hcard-act-more" title="置顶、编辑、所有存档、导出、复制、删除" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <i class="fa-solid fa-ellipsis" />
            </button>
          )}
        </span>
      )}
      {menu && !managing && <CardMenu it={it} onClose={() => setMenu(false)} />}
      
    </article>
  );
}

/** 管理模式底部的操作条 */
function ManageBar({ picked, total, onAll, onDone }: { picked: CharItem[]; total: number; onAll: () => void; onDone: () => void }) {
  const n = picked.length;
  const allFav = n > 0 && picked.every((x) => x.fav);
  const exportAll = async () => { for (const it of picked) await exportCharacter(it, 'png'); };
  return (
    <div class="rbt-manage-bar" role="toolbar" aria-label="批量管理">
      <span class="rbt-manage-count">{n ? `已选 ${n} 张` : '点卡片来选择'}</span>
      <button type="button" class="rbt-home-btn" onClick={onAll}>{n === total && total > 0 ? '全不选' : '全选'}</button>
      <span class="rbt-manage-gap" />
      <button type="button" class="rbt-home-btn" disabled={!n} onClick={() => { void setFavorite(picked, !allFav); }}>
        <i class="fa-solid fa-thumbtack" /> {allFav ? '取消置顶' : '置顶'}
      </button>
      <button type="button" class="rbt-home-btn" disabled={!n} onClick={() => { void exportAll(); }}><i class="fa-solid fa-download" /> 导出</button>
      <button type="button" class="rbt-home-btn danger" disabled={!n} onClick={() => { void deleteCharacters(picked).then((ok) => { if (ok) onDone(); }); }}><i class="fa-solid fa-trash-can" /> 删除…</button>
      <button type="button" class="rbt-home-btn primary" onClick={onDone}>完成</button>
    </div>
  );
}

type Filter = 'all' | 'fav' | 'problem' | 'group' | `tag:${string}`;

export function HomeGallery() {
  void charsTick.value;
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSortState] = useState<CharSort>(() => {
    try { return (localStorage.getItem(SORT_KEY) as CharSort) || 'recent'; } catch { return 'recent'; }
  });
  const setSort = (v: CharSort) => { setSortState(v); try { localStorage.setItem(SORT_KEY, v); } catch { /* ignore */ } };
  const [managing, setManaging] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // 整理角色列表要把每张卡看一遍；搜索框每打一个字都会重画，所以只在角色数据变了时重算
  const chars = ctx().characters;
  const all = useMemo(() => listCharacters(), [charsTick.value, chars, chars?.length, ctx().groups?.length]);
  const tags = useMemo(() => allTags(all), [all]);
  const query = q.trim().toLowerCase();
  const shown = sortCharacters(all.filter((it) => {
    if (filter === 'fav' && !it.fav) return false;
    if (filter === 'group' && it.kind !== 'group') return false;
    if (filter === 'problem' && !it.problems.length) return false;
    if (filter.startsWith('tag:') && !it.tags.some((t) => t.id === filter.slice(4))) return false;
    if (query && !(it.name.toLowerCase().includes(query) || it.note.toLowerCase().includes(query) || it.tags.some((t) => t.name.toLowerCase().includes(query)))) return false;
    return true;
  }), sort);
  const nFav = all.filter((x) => x.fav).length;
  const nProblem = all.filter((x) => x.problems.length).length;
  const nGroup = all.filter((x) => x.kind === 'group').length;
  const tagValue = filter.startsWith('tag:') ? filter : '';
  // 管理模式：只能选角色（群组不在这里管）；选中的里面被删掉 / 筛掉的不算
  const selectable = shown.filter((x) => x.kind === 'character');
  const pickedItems = selectable.filter((x) => picked.has(x.key));
  const toggle = (it: CharItem) => {
    const next = new Set(picked);
    if (next.has(it.key)) next.delete(it.key); else next.add(it.key);
    setPicked(next);
  };
  const toggleAll = () => setPicked(pickedItems.length === selectable.length ? new Set() : new Set(selectable.map((x) => x.key)));
  const stopManaging = () => { setManaging(false); setPicked(new Set()); };

  const Pill = ({ v, label, dot }: { v: Filter; label: string; dot?: boolean }) => (
    <button type="button" class={filter === v ? 'active' : ''} onClick={() => setFilter(v)}>{dot && <span class="rbt-home-pill-dot" />}{label}</button>
  );

  return (
    <main class="rbt-home-gallery" aria-label="角色" data-lint-spacing="ok">
      <header class="rbt-home-head">
        <h1>角色 <small>{all.length}</small></h1>
        <label class="rbt-search rbt-home-search">
          <i class="fa-solid fa-magnifying-glass" />
          <input type="search" placeholder="搜索角色、备注、标签" value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />
        </label>
        <div class="rbt-home-actions">
          {/* 手机上左栏收在 ☰ 里，导入放到这里（电脑上隐藏，用左栏那个） */}
          <button type="button" class="rbt-home-btn accent rbt-home-import" onClick={() => { void openImport(); }}><i class="fa-solid fa-file-import" /> 导入文件</button>
          <NewMenu />
        </div>
      </header>
      <div class="rbt-home-filters">
        <div class="rbt-home-pills" role="tablist">
          <Pill v="all" label="全部" />
          {nFav > 0 && <Pill v="fav" label={`置顶 ${nFav}`} />}
          {nProblem > 0 && <Pill v="problem" label={`待处理 ${nProblem}`} dot />}
          {nGroup > 0 && <Pill v="group" label={`群组 ${nGroup}`} />}
          {tags.length > 0 && (
            <select class={'rbt-home-select' + (tagValue ? ' active' : '')} value={tagValue} onChange={(e) => { const v = (e.currentTarget as HTMLSelectElement).value; setFilter((v || 'all') as Filter); }}>
              <option value="">按标签…</option>
              {tags.map(({ tag, count }) => <option key={tag.id} value={'tag:' + tag.id}>{tag.name}（{count}）</option>)}
            </select>
          )}
        </div>
        <div class="rbt-home-tools">
          <select class="rbt-home-select" value={sort} title="排序" onChange={(e) => setSort((e.currentTarget as HTMLSelectElement).value as CharSort)}>
            <option value="recent">最近聊过</option>
            <option value="name">按名称</option>
            <option value="added">最近添加</option>
          </select>
          <button type="button" class={'rbt-home-select rbt-home-manage' + (managing ? ' active' : '')} title="多选：批量置顶、导出、删除" onClick={() => (managing ? stopManaging() : setManaging(true))}>
            <i class="fa-solid fa-list-check" /> {managing ? '完成' : '管理'}
          </button>
        </div>
      </div>
      {filter === 'problem' && (
        <div class="rbt-home-note">
          这些卡缺世界书、插件，或者正则 / 脚本没开。点进去后，在「聊天工具箱 › 角色档案」里一键处理；缺的世界书也可以在
          <button type="button" class="rbt-linkbtn" onClick={() => openGlobal('worlds')}>全局工具箱 › 世界书</button>
          里一次全部导入。
        </div>
      )}
      <div class="rbt-home-grid">
        {shown.map((it) => <Card key={it.key} it={it} managing={managing} selected={picked.has(it.key)} onSelect={toggle} />)}
      </div>
      {!shown.length && <div class="rbt-home-empty">{query || filter !== 'all' ? '没有符合条件的角色。' : '还没有角色。点左上角「导入文件」，或者右上角「新建」。'}</div>}
      {managing && <ManageBar picked={pickedItems} total={selectable.length} onAll={toggleAll} onDone={stopManaging} />}
    </main>
  );
}
