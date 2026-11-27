import { APP_NAME, toast } from '../st/st';

/** 取消专用之后弹一条能撤销的通知（8 秒）。角色表和角色档案用同一个，玩家在哪取消都能撤销。 */
export function undoable(what: string, undo: () => void, verb = '已取消专用'): void {
  toast('success', `${verb}「${what}」。点这里撤销。`, APP_NAME, { onclick: undo, timeOut: 8000 });
}
