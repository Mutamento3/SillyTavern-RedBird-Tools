/**
 * 推荐模型：角色卡和预设可以各记一个「API + 模型」，换卡时自动切过去（能撤销）。
 *
 * 优先级：这张卡的推荐模型 > 它的推荐预设的推荐模型。
 * 另外提醒一个酒馆的暗坑：「预设绑定连接」（默认开着）时，换预设会顺带换成预设文件里存的 API 和模型。
 * 作者导出的预设大多不带连接；带了的（比如 Default 带着 OpenAI）一换过去 API 就跟着变了。
 */
import type { ModelChoice } from '../core/cards';
import { ctx, loaded, runSlash, slashQuote, type Any } from '../st/st';

export type { ModelChoice };

export const SOURCE_LABEL: Record<string, string> = {
  openrouter: 'OpenRouter', openai: 'OpenAI', claude: 'Claude', makersuite: 'Google AI Studio', vertexai: 'Vertex AI',
  deepseek: 'DeepSeek', custom: '自定义（OpenAI 兼容）', mistralai: 'Mistral', xai: 'xAI', groq: 'Groq', cohere: 'Cohere',
  perplexity: 'Perplexity', ai21: 'AI21', electronhub: 'Electron Hub', chutes: 'Chutes', nanogpt: 'NanoGPT', aimlapi: 'AI/ML API',
  pollinations: 'Pollinations', moonshot: 'Moonshot', fireworks: 'Fireworks', cometapi: 'CometAPI', azure_openai: 'Azure OpenAI',
  zai: 'Z.AI', siliconflow: 'SiliconFlow', workers_ai: 'Workers AI', minimax: 'MiniMax',
};

function oai(): Any | null {
  return loaded.openai?.oai_settings ?? null;
}

/** Chat Completion is the only API where this applies. */
export function modelsApply(): boolean {
  return ctx().mainApi === 'openai' && !!oai();
}

export function currentModel(): ModelChoice | null {
  const s = oai();
  if (!s) return null;
  const model = loaded.openai?.getChatCompletionModel?.(s) ?? ctx().getChatCompletionModel?.();
  return model ? { source: String(s.chat_completion_source), model: String(model) } : null;
}

export function sameModel(a: ModelChoice | null | undefined, b: ModelChoice | null | undefined): boolean {
  return !!a && !!b && a.source === b.source && a.model === b.model;
}

export function modelLabel(m: ModelChoice): string {
  return `${SOURCE_LABEL[m.source] ?? m.source} · ${m.model}`;
}

/** The API + model saved inside a preset file (applied when switching to it if bound). */
export function presetConnection(name: string): ModelChoice | null {
  try {
    const p = ctx().getPresetManager()?.getCompletionPresetByName?.(name);
    if (!p?.chat_completion_source) return null;
    const model = loaded.openai?.getChatCompletionModel?.(p);
    return model ? { source: String(p.chat_completion_source), model: String(model) } : { source: String(p.chat_completion_source), model: '' };
  } catch {
    return null;
  }
}

/** ST's 「预设绑定连接」: switching presets also switches API + model when on. */
export function presetBindsConnection(): boolean {
  return !!oai()?.bind_preset_to_connection;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Switch to an API + model with ST's own controls. Changing the API first needs that API's
 * key to be set already (ST keeps keys per API). Returns whether it ended up on that model.
 */
export async function setModel(m: ModelChoice): Promise<boolean> {
  if (!modelsApply()) return false;
  const $ = window.jQuery;
  const cur = currentModel();
  if (cur?.source !== m.source && $) {
    $('#chat_completion_source').val(m.source).trigger('change');
    await wait(600);
  }
  // Model lists load asynchronously after an API change, so try a few times.
  for (let i = 0; i < 8; i++) {
    await runSlash(`/model quiet=true ${slashQuote(m.model)}`);
    if (sameModel(currentModel(), m)) return true;
    await wait(500);
  }
  return sameModel(currentModel(), m);
}

const MAIN_API_LABEL: Record<string, string> = { textgenerationwebui: 'Text Completion', novel: 'NovelAI', koboldhorde: 'AI Horde', kobold: 'KoboldAI' };
const TEXTGEN_LABEL: Record<string, string> = {
  ooba: 'Text Gen WebUI', mancer: 'Mancer', vllm: 'vLLM', aphrodite: 'Aphrodite', tabby: 'TabbyAPI', koboldcpp: 'KoboldCpp',
  togetherai: 'TogetherAI', llamacpp: 'llama.cpp', ollama: 'Ollama', infermaticai: 'InfermaticAI', dreamgen: 'DreamGen',
  openrouter: 'OpenRouter', featherless: 'Featherless', huggingface: 'HuggingFace', generic: '通用',
};

/** The API and model in use right now, for any of ST's API types (for the status bar). */
export function activeConnection(): { api: string; model: string } {
  const c = ctx();
  const main = String(c.mainApi ?? '');
  if (main === 'openai') {
    const src = String(oai()?.chat_completion_source ?? '');
    return { api: SOURCE_LABEL[src] ?? (src || 'Chat Completion'), model: currentModel()?.model ?? '' };
  }
  const online = String(c.onlineStatus ?? '');
  const model = online && online !== 'no_connection' ? online : '';
  if (main === 'textgenerationwebui') {
    const type = String(c.textCompletionSettings?.type ?? '');
    return { api: type ? (TEXTGEN_LABEL[type] ?? type) : 'Text Completion', model };
  }
  return { api: MAIN_API_LABEL[main] ?? (main || 'API'), model };
}
