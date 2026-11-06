/**
 * 推荐模型：平时一行（API · 模型），「用现在的模型」一键填上，也可以手动填。
 */
import { useState } from 'preact/hooks';
import { currentModel, modelLabel, modelsApply, sameModel, setModel, SOURCE_LABEL, type ModelChoice } from '../tools/model';

export function ModelPicker({ value, onChange, fallback, offerSwitch }: {
  value?: ModelChoice;
  onChange: (m: ModelChoice | null) => void;
  /** Shown when nothing is set, e.g. 「不填就用推荐预设的：…」. */
  fallback?: { text: string; model: ModelChoice };
  /** Show 「换上」 when the current model differs (only for the card / preset being played). */
  offerSwitch?: boolean;
}) {
  const cur = currentModel();
  const [editing, setEditing] = useState(false);
  const [source, setSource] = useState(value?.source ?? cur?.source ?? 'openrouter');
  const [model, setModelText] = useState(value?.model ?? '');
  const [busy, setBusy] = useState(false);
  if (!modelsApply()) return <small class="rbt-muted">推荐模型只用于 Chat Completion。</small>;

  const effective = value ?? fallback?.model;
  const sw = async () => { if (!effective) return; setBusy(true); try { await setModel(effective); } finally { setBusy(false); } };
  const startEdit = () => { setSource(value?.source ?? cur?.source ?? 'openrouter'); setModelText(value?.model ?? ''); setEditing(true); };

  if (editing) {
    const sources = Object.keys(SOURCE_LABEL);
    return (
      <div class="rbt-source-edit">
        <div class="rbt-form-row">
          <select class="text_pole rbt-select rbt-model-src" value={source} onChange={(e) => setSource((e.currentTarget as HTMLSelectElement).value)}>
            {!sources.includes(source) && <option value={source}>{source}</option>}
            {sources.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
          </select>
          <input class="text_pole rbt-input" placeholder="模型名，比如 anthropic/claude-opus-4.6" value={model} onInput={(e) => setModelText((e.currentTarget as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === 'Enter' && model.trim()) { onChange({ source, model: model.trim() }); setEditing(false); } }} />
        </div>
        <div class="rbt-row-between">
          <small class="rbt-muted">模型名要和酒馆 API 面板里的一样。</small>
          <span class="rbt-row">
            <button type="button" class="rbt-btn rbt-btn-small" onClick={() => setEditing(false)}>取消</button>
            <button type="button" class="rbt-btn rbt-btn-small rbt-btn-primary" disabled={!model.trim()} onClick={() => { onChange({ source, model: model.trim() }); setEditing(false); }}>完成</button>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div class="rbt-model-line">
      {value
        ? <span class="rbt-model-value">{modelLabel(value)}</span>
        : <span class="rbt-muted">{fallback ? `不指定，用${fallback.text}：${modelLabel(fallback.model)}` : '不指定'}</span>}
      <span class="rbt-row rbt-push">
        {offerSwitch && effective && cur && !sameModel(effective, cur) && (
          <button type="button" class="rbt-btn rbt-btn-small rbt-btn-primary" disabled={busy} onClick={sw}>{busy ? '正在切换…' : '换上'}</button>
        )}
        {cur && !sameModel(value, cur) && <button type="button" class="rbt-btn rbt-btn-small" title={`现在用的是 ${modelLabel(cur)}`} onClick={() => onChange(cur)}>用现在的模型</button>}
        <button type="button" class="rbt-btn rbt-btn-small" onClick={startEdit}>{value ? '改' : '手动填'}</button>
        {value && <button type="button" class="rbt-btn rbt-btn-small" title="不再推荐" onClick={() => onChange(null)}>✕</button>}
      </span>
    </div>
  );
}
