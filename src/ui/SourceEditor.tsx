/**
 * 插件的作者和主页，只读的一行（角色档案 › 插件里用）。备注在「我的备注」里改（pages/parts.tsx 的 NotesSection）。
 */
import { splitLinks, type CardLink } from '../core/cards';
import { hasSource, sourceFor, type SourceKind } from '../tools/sources';

function LinkChip({ l }: { l: CardLink }) {
  return (
    <a class="rbt-source-link" href={l.url} target="_blank" rel="noopener noreferrer" title={l.url}>
      {l.label} <i class="fa-solid fa-arrow-up-right-from-square" />
    </a>
  );
}

/** Read-only line, for places that only show it (e.g. 角色档案 › 推荐预设). */
export function SourceLine({ kind, id }: { kind: SourceKind; id: string }) {
  const v = sourceFor(kind, id);
  // 「我的备注」把链接存成文字了：从备注里认出链接，一样列出来
  const noteLinks: CardLink[] = splitLinks(v.notes).flatMap((p) => ('url' in p ? [{ label: '链接', url: p.url }] : []));
  if (!hasSource(v) && !noteLinks.length) return null;
  return (
    <div class="rbt-source-line">
      {v.author && <span class="rbt-source-author">作者 <b>{v.author}</b></span>}
      {[...v.autoLinks, ...v.links, ...noteLinks].map((l, i) => <LinkChip key={i} l={l} />)}
    </div>
  );
}
