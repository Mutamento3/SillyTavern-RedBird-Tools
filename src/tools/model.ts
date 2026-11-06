/**
 * 推荐模型：角色卡和预设可以各记一个「API + 模型」，换卡时自动切过去（能撤销）。
 *
 * 优先级：这张卡的推荐模型 > 它的推荐预设的推荐模型。
 * 另外提醒一个酒馆的暗坑：「预设绑定连接」（默认开着）时，换预设会顺带换成预设文件里存的 API 和模型。
 * 作者导出的预设大多不带连接；带了的（比如 Default 带着 OpenAI）一换过去 API 就跟着变了。
 */
import type { ModelChoice } from '../core/cards';
import { ctx, loaded, runSlash, slashQuote, toast, type Any } from '../st/st';

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

// --------------------------------------------------- 换预设时模型被换掉 ---
// 酒馆的「将预设与 API 配置绑定」默认开着：换预设时会把预设文件里存的 API 和模型也换上，
// 预设里没存模型的话，模型就被清空了，而且什么都不说。这里在换完后对比一下，变了就提示，点一下能换回去。

let quiet = 0;

/** Run a switch the toolbox meant to make (e.g. a card's recommended preset + model): no warning for it. */
export async function withoutModelGuard<T>(fn: () => Promise<T>): Promise<T> {
  quiet++;
  try { return await fn(); } finally { setTimeout(() => { quiet--; }, 1500); }
}

export function installModelGuard(): void {
  const c = ctx();
  const et = c.eventTypes;
  if (!et?.OAI_PRESET_CHANGED_BEFORE || !et?.OAI_PRESET_CHANGED_AFTER) return;
  let before: ModelChoice | null = null;
  c.eventSource.on(et.OAI_PRESET_CHANGED_BEFORE, () => { before = currentModel(); });
  c.eventSource.on(et.OAI_PRESET_CHANGED_AFTER, () => {
    const prev = before;
    before = null;
    if (!prev?.model || quiet > 0) return;
    setTimeout(() => {
      if (quiet > 0) return;
      const now = currentModel();
      if (sameModel(prev, now)) return;
      // 预设里没存模型 → 模型被清空，没法聊天，没人想要这个结果：直接换回原来的，说一声
      if (!now?.model) {
        void withoutModelGuard(() => setModel(prev)).then((ok) => {
          if (ok) toast('info', `这个预设里没存模型，换预设时模型被清空了，已经帮你换回 ${modelLabel(prev)}。`, '模型');
          else toast('warning', `换预设时模型被清空了，没能自动换回 ${modelLabel(prev)}，请在 API 面板里选一下模型。`, '模型变了', { timeOut: 15000 });
        });
        return;
      }
      const what = !now?.model ? `模型被清空了（原来是 ${modelLabel(prev)}）` : `模型从 ${modelLabel(prev)} 换成了 ${modelLabel(now)}`;
      toast('warning', `换预设时${what}。这个预设里存着自己的 API 和模型，酒馆的「将预设与 API 配置绑定」开着时会跟着换。
点这里换回 ${modelLabel(prev)}。`, '模型变了', {
        timeOut: 15000,
        extendedTimeOut: 8000,
        onclick: () => {
          void withoutModelGuard(() => setModel(prev)).then((ok) => {
            toast(ok ? 'success' : 'error', ok ? `已换回 ${modelLabel(prev)}` : '没能换回去，请在 API 面板里手动选一下模型。', '模型');
          });
        },
      });
    }, 400);
  });
}
