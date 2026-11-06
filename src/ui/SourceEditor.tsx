/**
 * 预设 / 插件的「作者和链接」：平时是一行（作者 + 可点的链接），点「编辑」就地改。
 */
import { useState } from 'preact/hooks';
import { isHttpUrl, type CardLink } from '../core/cards';
import { hasSource, sourceFor, updateSource, type SourceKind } from '../tools/sources';

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
  if (!hasSource(v)) return null;
  return (
    <div class="rbt-source-line">
      {v.author && <span class="rbt-source-author">作者 <b>{v.author}</b></span>}
      {[...v.autoLinks, ...v.links].map((l, i) => <LinkChip key={i} l={l} />)}
    </div>
  );
}

export function SourceEditor({ kind, id }: { kind: SourceKind; id: string }) {
  const v = sourceFor(kind, id);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const urlOk = isHttpUrl(url);
  const add = () => {
    if (!urlOk) return;
    updateSource(kind, id, { links: [...v.links, { label: label.trim() || '链接', url: url.trim() }] });
    setLabel('');
    setUrl('');
  };
  const manualAuthor = v.author !== v.autoAuthor ? v.author : '';

  if (!editing) {
    return (
      <div class="rbt-source-line">
        {v.author && <span class="rbt-source-author">作者 <b>{v.author}</b></span>}
        {[...v.autoLinks, ...v.links].map((l, i) => <LinkChip key={i} l={l} />)}
        <button type="button" class="rbt-btn rbt-btn-small" onClick={() => setEditing(true)}>
          {hasSource(v) ? '编辑' : '添加作者和链接'}
        </button>
      </div>
    );
  }

  return (
    <div class="rbt-source-edit">
      <div class="rbt-form-row">
        <small class="rbt-muted rbt-source-k">作者</small>
        <input
          class="text_pole rbt-input"
          placeholder={v.autoAuthor ? `${v.autoAuthor}（插件自带，可改）` : '作者名字'}
          value={manualAuthor}
          onChange={(e) => updateSource(kind, id, { author: (e.currentTarget as HTMLInputElement).value.trim() })}
        />
      </div>
      {v.autoLinks.map((l, i) => (
        <div key={`a${i}`} class="rbt-link-row">
          <LinkChip l={l} />
          <small class="rbt-muted rbt-ellipsis">{l.url}</small>
          <small class="rbt-muted rbt-push">插件自带</small>
        </div>
      ))}
      {v.links.map((l, i) => (
        <div key={i} class="rbt-link-row">
          <LinkChip l={l} />
          <small class="rbt-muted rbt-ellipsis">{l.url}</small>
          <button type="button" class="rbt-btn rbt-btn-small rbt-push" title="删除这条链接" onClick={() => updateSource(kind, id, { links: v.links.filter((_, j) => j !== i) })}>✕</button>
        </div>
      ))}
      <div class="rbt-form-row">
        <input class="text_pole rbt-input rbt-w-label" placeholder="名称，如：教程" value={label} onInput={(e) => setLabel((e.currentTarget as HTMLInputElement).value)} />
        <input class="text_pole rbt-input" placeholder="https://…" value={url} onInput={(e) => setUrl((e.currentTarget as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
        <button type="button" class="rbt-btn" disabled={!urlOk} onClick={add}>添加</button>
      </div>
      <div class="rbt-row"><button type="button" class="rbt-btn rbt-btn-primary rbt-btn-small" onClick={() => setEditing(false)}>完成</button></div>
    </div>
  );
}
