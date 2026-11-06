/**
 * 首页：角色画廊。图片是视觉中心——竖版大卡片，立绘铺满，底部用图片自己的颜色渐变 + 模糊托住名字。
 * 左栏只放最近的聊天；挑角色、新建 / 导入都在这里。
 */
import { useMemo, useState } from 'preact/hooks';
import { openView } from '../ui/views';
import {
  allTags,
  charsTick,
  createCharacter,
  createGroup,
  editCharacter,
  importCharacterFile,
  importCharacterUrl,
  listCharacters,
  openCharacter,
  sortCharacters,
  toggleFavorite,
  type CharItem,
  type CharSort,
} from './characters';

const SORT_KEY = 'rbt-shell-char-sort';

// ------------------------------------------------------------ colour ---

/** Average colour of the lower part of each picture, toned down so white text stays readable. */
const tints = new Map<string, string>();

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

function fullImage(it: CharItem): string {
  return it.kind === 'character' ? `/characters/${encodeURIComponent(it.key.slice(2))}` : it.thumb;
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

function Card({ it }: { it: CharItem }) {
  const src = fullImage(it);
  const [tint, setTint] = useState(tints.get(src) ?? '');
  const [broken, setBroken] = useState(false);
  const onLoad = (e: Event) => {
    if (tints.has(src)) return;
    const t = sampleTint(e.currentTarget as HTMLImageElement);
    if (t) { tints.set(src, t); setTint(t); }
  };
  return (
    <article class="rbt-hcard" style={tint ? { '--tint': tint } : undefined}>
      <button type="button" class="rbt-hcard-hit" title={`和「${it.name}」聊天`} onClick={() => { void openCharacter(it); }}>
        {!broken
          ? <img class="rbt-hcard-img" src={src} alt="" loading="lazy" decoding="async" onLoad={onLoad} onError={() => setBroken(true)} />
          : <img class="rbt-hcard-img" src={it.thumb} alt="" />}
        <span class="rbt-hcard-shade" />
        {it.problems.length > 0
          ? <span class="rbt-hcard-pill warn" title={it.problems.join('、')}><i /> {it.problems.length > 1 ? `${it.problems.length} 项待处理` : it.problems[0]}</span>
          : it.kind === 'group' && <span class="rbt-hcard-pill"><i class="fa-solid fa-users" /> 群组</span>}
        <span class="rbt-hcard-text">
          <span class="rbt-hcard-name">{it.name}</span>
          <span class="rbt-hcard-meta">{it.kind === 'group' ? it.note : lastChatText(it.lastChat)}</span>
          {it.tags.length > 0 && <span class="rbt-hcard-meta">{it.tags.slice(0, 3).map((t) => t.name).join(' · ')}</span>}
        </span>
      </button>
      <span class="rbt-hcard-acts">
        {it.kind === 'character' && (
          <button type="button" class={'rbt-hcard-act' + (it.fav ? ' on' : '')} title={it.fav ? '取消收藏' : '收藏'} onClick={() => { void toggleFavorite(it); }}>
            <i class={(it.fav ? 'fa-solid' : 'fa-regular') + ' fa-star'} />
          </button>
        )}
        <button type="button" class="rbt-hcard-act" title="编辑角色卡" onClick={() => { void editCharacter(it); }}>
          <i class="fa-solid fa-pen" />
        </button>
      </span>
      {it.fav && <span class="rbt-hcard-favmark" title="已收藏"><i class="fa-solid fa-star" /></span>}
    </article>
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
  const all = listCharacters();
  const tags = useMemo(() => allTags(all), [all.length, charsTick.value]);
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

  const Pill = ({ v, label }: { v: Filter; label: string }) => (
    <button type="button" class={filter === v ? 'active' : ''} onClick={() => setFilter(v)}>{label}</button>
  );

  return (
    <main class="rbt-home-gallery" aria-label="角色">
      <header class="rbt-home-head">
        <h1>角色 <small>{all.length}</small></h1>
        <label class="rbt-search rbt-home-search">
          <i class="fa-solid fa-magnifying-glass" />
          <input type="search" placeholder="搜索角色、备注、标签" value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />
        </label>
        <div class="rbt-home-actions">
          <button type="button" class="rbt-home-btn primary" onClick={createCharacter}><i class="fa-solid fa-user-plus" /> 新建角色</button>
          <button type="button" class="rbt-home-btn" onClick={importCharacterFile}><i class="fa-solid fa-file-import" /> 导入</button>
          <button type="button" class="rbt-home-btn" onClick={importCharacterUrl}><i class="fa-solid fa-link" /> 从链接导入</button>
          <button type="button" class="rbt-home-btn" onClick={createGroup}><i class="fa-solid fa-users" /> 新建群组</button>
        </div>
      </header>
      <div class="rbt-home-filters">
        <div class="rbt-home-pills" role="tablist">
          <Pill v="all" label="全部" />
          {nFav > 0 && <Pill v="fav" label={`收藏 ${nFav}`} />}
          {nProblem > 0 && <Pill v="problem" label={`待处理 ${nProblem}`} />}
          {nGroup > 0 && <Pill v="group" label={`群组 ${nGroup}`} />}
          {tags.length > 0 && (
            <select class={'rbt-home-select' + (tagValue ? ' active' : '')} value={tagValue} onChange={(e) => { const v = (e.currentTarget as HTMLSelectElement).value; setFilter((v || 'all') as Filter); }}>
              <option value="">按标签…</option>
              {tags.map(({ tag, count }) => <option key={tag.id} value={'tag:' + tag.id}>{tag.name}（{count}）</option>)}
            </select>
          )}
        </div>
        <select class="rbt-home-select" value={sort} title="排序" onChange={(e) => setSort((e.currentTarget as HTMLSelectElement).value as CharSort)}>
          <option value="recent">最近聊过</option>
          <option value="name">按名称</option>
          <option value="added">最近添加</option>
        </select>
      </div>
      {filter === 'problem' && (
        <div class="rbt-home-note">
          这些卡缺世界书、插件，或者正则 / 脚本没开。点进去后，在「聊天工具箱 › 角色档案」里一键处理；要批量处理，去
          <button type="button" class="rbt-linkbtn" onClick={() => openView('maintain')}>全局工具箱 › 维护</button>。
        </div>
      )}
      <div class="rbt-home-grid">
        {shown.map((it) => <Card key={it.key} it={it} />)}
      </div>
      {!shown.length && <div class="rbt-home-empty">{query || filter !== 'all' ? '没有符合条件的角色。' : '还没有角色。点「新建角色」或「导入」开始。'}</div>}
    </main>
  );
}
