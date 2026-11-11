import { toast } from '../st/st';

/** 解绑之后弹一条能撤销的通知（8 秒）。角色表和角色档案用同一个，玩家在哪解绑都能撤销。 */
export function undoable(what: string, undo: () => void, verb = '已解绑'): void {
  toast('success', `${verb}「${what}」。点这里撤销。`, 'RedBird 工具箱', { onclick: undo, timeOut: 8000 });
}
