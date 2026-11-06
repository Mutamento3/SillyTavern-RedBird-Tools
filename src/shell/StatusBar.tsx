/**
 * 聊天里的状态栏（像 Mac 菜单栏右上角）：现在用的预设、模型、加载的世界书，一眼看到。
 * 和这张卡推荐的不一样时，前面亮一个琥珀色小点；点一下打开酒馆对应的面板。
 */
import { currentCharacter, settings } from '../st/st';
import { currentPresetName, cardInfo } from '../tools/cards/cards';
import { currentBookScopes } from '../tools/flow/capture';
import { planFor } from '../tools/env/autoapply';
import { activeConnection, currentModel, modelLabel, modelsApply, sameModel } from '../tools/model';
import { sourcesTick } from '../tools/sources';
import { openDrawer } from './drawers';
import { statusTick } from './EnvStatus';
import { apiOnline, chatTick } from './Shell';

function Item({ icon, text, title, warn, onClick }: { icon: string; text: string; title: string; warn?: string; onClick: () => void }) {
  return (
    <button type="button" class={`rbt-stat ${warn ? 'warn' : ''}`} title={warn ? `${title}\n${warn}` : title} onClick={onClick}>
      {warn && <span class="rbt-stat-dot" />}
      <i class={`fa-solid ${icon}`} />
      <span class="rbt-stat-text">{text}</span>
    </button>
  );
}

export function StatusBar() {
  void chatTick.value;
  void statusTick.value;
  void sourcesTick.value;
  const char = currentCharacter();
  if (!char) return null;
  const info = cardInfo(char);
  const s = settings();

  // 预设
  const preset = currentPresetName();
  const recPreset = info.preset?.name;
  const presetWarn = recPreset && recPreset !== preset ? `这张卡推荐「${recPreset}」` : undefined;

  // 模型
  const model = modelsApply() ? currentModel() : null;
  const wantModel = s.profiles[char.avatar]?.model ?? (recPreset ? s.presetInfo[recPreset]?.model : undefined);
  const modelWarn = !apiOnline.value ? 'API 没连上' : wantModel && !sameModel(wantModel, model) ? `这张卡推荐 ${modelLabel(wantModel)}` : undefined;

  const conn = activeConnection();

  return (
    <div class="rbt-statusbar" aria-label="现在用的预设和模型">
      <Item icon="fa-sliders" text={preset || '没有预设'} title={`预设：${preset || '（没有）'}`} warn={presetWarn} onClick={() => openDrawer('preset')} />
      <Item icon="fa-plug" text={conn.model ? `${conn.api} · ${conn.model.split('/').pop()}` : `${conn.api} · 没选模型`} title={`API：${conn.api}
模型：${conn.model || '（没选）'}`} warn={modelWarn} onClick={() => openDrawer('api')} />
    </div>
  );
}

/** For the nav bar 「世界书」 button: how many books are loaded, which, and whether a stray one is on. */
export function worldStatus(): { count: number; title: string; warn?: string } {
  void chatTick.value;
  void statusTick.value;
  const char = currentCharacter();
  const scopes = currentBookScopes();
  const books = [...new Set([...scopes.character, ...scopes.chat, ...scopes.persona, ...scopes.global])];
  const stray = char ? planFor(char).worldsOff : [];
  const worldWarn = stray.length ? `全局开着别的卡的世界书：${stray.join('、')}` : undefined;
  const worldTitle = books.length
    ? ['这张卡', '这个聊天', '用户设定', '全局'].map((label, i) => {
      const list = [...[scopes.character, scopes.chat, scopes.persona, scopes.global][i]];
      return list.length ? `${label}：${list.join('、')}` : '';
    }).filter(Boolean).join('\n')
    : '现在没有加载世界书';

  return { count: books.length, title: `世界书
${worldTitle}`, warn: worldWarn };
}
