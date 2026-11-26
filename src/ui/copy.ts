/**
 * 同一件事在好几个地方说的文字，只写在这里一份：扩展设置、全局工具箱 › 美化、提示和确认框都从这里取，
 * 改一处，各处一起变。
 *
 * 说法的顺序：先说红鸟适配美化的好处、推荐用它，再说别人的美化可能有什么问题。不劝人去关掉。
 */

/** 工具箱自己那三套美化（深色 / 浅色 / 护眼）在界面上的名字。各处都用这一个名字。 */
export const LOOK_NAME = '红鸟适配美化';

export const LOOK_COPY = {
  /** 扩展设置「界面」里的美化开关 */
  lookLabel: LOOK_NAME,
  // 「更流畅」有依据：这套美化关掉了背景模糊，实测每打一个字到画面刷新从 38–69ms 降到约 25ms（见 look.css）
  lookDesc: '专为三栏界面和手机做，不会错位。去掉了耗性能的背景模糊，打字和滚动更流畅。在全局工具箱 › 美化里可以换成深色、浅色或护眼，也能改强调色。',
  /** 扩展设置和全局工具箱 › 美化 里的手机消息排版开关 */
  mesLayoutLabel: '手机沉浸阅读',
  mesLayoutDesc: `头像放到名字旁边，正文铺满整个屏幕宽。推荐开着，搭配${LOOK_NAME}效果最好。`,
  /** 全局工具箱 › 美化：「红鸟适配美化」下面的灰字 */
  builtInHint: '专为三栏界面和手机做，推荐使用',
  /** 全局工具箱 › 美化 › 美化库：红鸟适配美化那一块的说明 */
  libPitch: '专为三栏界面和手机做，不会错位，打字和滚动更流畅。点一套就换上。',
  /** 美化库：别人做的美化那一块的说明 */
  libOthers: '装在酒馆里的美化。点开可以换上、记作者和链接。',
  /** 别人做的美化可能有什么问题（美化页的说明、换美化的确认框都用） */
  othersRisk: '别人的美化是按酒馆原版界面做的，在三栏界面里有的地方可能错位，手机上更明显。',
  recommend: `推荐用${LOOK_NAME}，它专为三栏界面和手机做，打字和滚动也更流畅。`,
  noAdapt: '工具箱不会为单个美化做适配，有问题请找美化作者。',
  /** 在酒馆「用户设置 › 界面主题」里换了主题（红鸟适配美化随之关掉）时的提示；点提示换回来 */
  switched: (name: string, hasCss: boolean) =>
    `已换成「${name}」，${LOOK_NAME}已关掉。${hasCss ? '别人的美化在三栏界面里有的地方可能错位，手机上更明显。' : ''}点这里换回${LOOK_NAME}。`,
  /** 用着别人带样式的美化时，提醒一次（手机、电脑各一句）；点提示换成红鸟适配美化 */
  phoneTip: `手机上推荐用${LOOK_NAME}：专为手机做，正文铺满屏幕，读起来更沉浸。你现在用的美化改了消息排版，头像或名字可能错位。点这里换成${LOOK_NAME}。`,
  deskTip: `推荐用${LOOK_NAME}：专为三栏界面做，不会错位，打字和滚动也更流畅。你现在用的美化改了界面样式，有的地方可能错位。点这里换成${LOOK_NAME}。`,
  /** 换成别人美化时的附注 */
  willTurnOff: `现在用的是${LOOK_NAME}。换成这个会把它关掉。`,
  importTurnsOff: `会关掉${LOOK_NAME}`,
} as const;

/** 信息流 › 用量、花费、用时（生成中的小红鸟、聊天里那一行、信息流里的开关和花费）。按 DESIGN.md「文案」写。 */
export const USAGE_COPY = {
  liveWait: '等待回复',
  liveThink: '正在思考',
  liveWrite: '正在写正文',
  liveDone: '写完了',
  liveStopped: '已停止',
  liveTokens: (n: number) => `${n.toLocaleString('zh-CN')} tokens`,
  liveAbout: (m: string) => `约 ${m}`,
  liveStalled: (d: string) => `已经 ${d}没收到新内容`,
  /** 生成时写了多少字（字数是准的；tokens 要写完接口才给，生成时不估） */
  liveChars: (n: number) => `${n.toLocaleString('zh-CN')} 字`,
  /** 聊天里那一行：总花费后面括号里，其他插件在后台找 AI 花的那部分 */
  sideCost: (m: string) => `（含插件 ${m}）`,
  showTitle: '在聊天里显示',
  showTimer: '用时',
  showTokens: 'tokens',
  showCost: '花费',
  showBird: '小红鸟',
  /** 两组开关的小标题：手机上那一行在名字下面，电脑上在头像下面 */
  showUnderAvatar: (phone: boolean) => (phone ? '每一楼名字下面' : '每一楼头像下面'),
  showBottom: '最新一楼底下',
  /** 收起时右边：开着的那几项；都没开 */
  showNone: '都关了',
  chatTotalSub: (n: number) => `${n} 次回复，重新生成和插件花的都算上了`,
  chatTokensSub: (n: number) => `${n} 次回复 · 接口没给金额，只能看 tokens`,
  noMoney: '接口没给金额，只能看 tokens。',
  balanceFail: '查不到 OpenRouter 余额。',
  bill: '打开 OpenRouter 账单 ↗',
  since: (d: string) => `从 ${d}开始记花费。`,
} as const;
