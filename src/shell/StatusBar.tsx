/**
 * 聊天里的状态栏（像 Mac 菜单栏右上角）：现在用的预设、模型、世界书、人设，一眼看到。
 * 每一项只露一点点字——够看出「不是空的」「是不是那个」就行，完整的在鼠标悬停的提示里。
 * 和这张卡推荐的不一样时，前面亮一个琥珀色小点；点一下打开酒馆对应的面板。
 */
import { ctx, currentCharacter, loaded, settings } from '../st/st';
import { currentPresetName, cardInfo } from '../tools/cards/cards';
import { currentBookScopes } from '../tools/flow/capture';
import { activeConnection, currentModel, modelLabel, modelsApply, sameModel } from '../tools/model';
import { sourcesTick } from '../tools/sources';
import { openDrawer, openDrawers, type DrawerKey } from './drawers';
import { planForView, statusTick } from './EnvStatus';
import { apiOnline, chatTick, personaTick } from './Shell';

interface ItemProps {
  kind: string;
  icon?: string;
  img?: string;
  text: string;
  title: string;
  warn?: string;
  badge?: string;
  drawer: DrawerKey;
}

function Item({ kind, icon, img, text, title, warn, badge, drawer }: ItemProps) {
  const active = openDrawers.value.includes(drawer);
  return (
    <button
      type="button"
      class={`rbt-stat rbt-stat-${kind} ${warn ? 'warn' : ''} ${active ? 'active' : ''}`}
      title={warn ? `${title}\n${warn}` : title}
      onClick={() => openDrawer(drawer)}
    >
      {img ? <img class="rbt-stat-img" src={img} alt="" /> : <i class={`fa-solid ${icon} fa-fw`} />}
      <span class="rbt-stat-text">{text}</span>
      {badge && <i class={`fa-solid ${badge} rbt-stat-badge`} />}
      {warn && <span class="rbt-stat-dot" />}
    </button>
  );
}

const PERSONA_SOURCE: Record<string, { icon: string; label: string }> = {
  chat: { icon: 'fa-lock', label: '锁定在这个聊天' },
  character: { icon: 'fa-link', label: '绑定了这张卡' },
  group: { icon: 'fa-link', label: '绑定了这个群聊' },
  default: { icon: 'fa-star', label: '默认人设' },
};

/** The persona in use and why it was picked (same order ST uses: chat lock > card/group > default). */
export function personaStatus(): { name: string; avatar: string; source: string } {
  const c = ctx();
  const avatar = String(loaded.personas?.user_avatar ?? '');
  const pu = c.powerUserSettings ?? {};
  const name = String(c.name1 ?? pu.personas?.[avatar] ?? '');
  let source = '';
  if (avatar && c.chatMetadata?.persona === avatar) source = 'chat';
  else {
    const char = currentCharacter();
    const target = c.groupId ? { type: 'group', id: c.groupId } : char ? { type: 'character', id: char.avatar } : null;
    const conns: { type: string; id: string }[] = pu.persona_descriptions?.[avatar]?.connections ?? [];
    if (target && conns.some((x) => x.type === target.type && x.id === target.id)) source = target.type;
    else if (avatar && pu.default_persona === avatar) source = 'default';
  }
  return { name, avatar, source };
}

export function StatusBar() {
  void chatTick.value;
  void personaTick.value;
  void statusTick.value;
  void sourcesTick.value;
  void openDrawers.value; // a change made in ST's panel shows up when the panel closes
  const c = ctx();
  const char = currentCharacter();
  if (!char && !c.groupId) return null;
  const info = char ? cardInfo(char) : null;
  const s = settings();

  // 预设
  const preset = currentPresetName();
  const recPreset = info?.preset?.name;
  const presetWarn = recPreset && recPreset !== preset ? `这张卡推荐「${recPreset}」` : undefined;

  // 模型
  const model = modelsApply() ? currentModel() : null;
  const wantModel = char ? s.profiles[char.avatar]?.model ?? (recPreset ? s.presetInfo[recPreset]?.model : undefined) : undefined;
  const conn = activeConnection();
  const modelWarn = !apiOnline.value ? 'API 没连上' : wantModel && !sameModel(wantModel, model) ? `这张卡推荐 ${modelLabel(wantModel)}` : undefined;
  const shortModel = conn.model ? conn.model.split('/').pop()! : '没选模型';

  // 世界书
  const w = worldStatus();

  // 人设
  const p = personaStatus();
  const src = PERSONA_SOURCE[p.source];

  return (
    <div class="rbt-statusbar" aria-label="现在用的预设、模型、世界书和人设">
      <Item kind="preset" drawer="preset" icon="fa-sliders" text={preset || '无'} title={`预设：${preset || '（没有）'}`} warn={presetWarn} />
      <Item kind="model" drawer="api" icon="fa-plug" text={shortModel} title={`API：${conn.api}\n模型：${conn.model || '（没选）'}`} warn={modelWarn} />
      <Item kind="world" drawer="worldinfo" icon="fa-book-atlas" text={w.count ? String(w.count) : '无'} title={w.title} warn={w.warn} />
      {p.avatar && (
        <Item
          kind="persona" drawer="persona"
          img={c.getThumbnailUrl?.('persona', p.avatar)}
          text={p.name || '人设'}
          badge={src?.icon}
          title={`人设：${p.name}\n${src ? src.label : '手动选的，没有绑定'}`}
        />
      )}
    </div>
  );
}

/** How many books are loaded, which, and whether a stray one is on. */
export function worldStatus(): { count: number; title: string; warn?: string } {
  void chatTick.value;
  void statusTick.value;
  const char = currentCharacter();
  const scopes = currentBookScopes();
  const books = [...new Set([...scopes.character, ...scopes.chat, ...scopes.persona, ...scopes.global])];
  const stray = char ? planForView(char).worldsOff : [];
  const worldWarn = stray.length ? `全局开着别的卡的世界书：${stray.join('、')}` : undefined;
  const worldTitle = books.length
    ? ['这张卡', '这个聊天', 'user 人设', '全局'].map((label, i) => {
      const list = [...[scopes.character, scopes.chat, scopes.persona, scopes.global][i]];
      return list.length ? `${label}：${list.join('、')}` : '';
    }).filter(Boolean).join('\n')
    : '现在没有加载世界书';

  return { count: books.length, title: `世界书（${books.length} 本）\n${worldTitle}`, warn: worldWarn };
}
