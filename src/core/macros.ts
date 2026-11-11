/**
 * 会改东西或每次结果不同的宏：{{setvar}}、{{incvar}}、{{random}}…
 * 酒馆发请求时已经执行过一次；工具箱为了「信息流」再替换一遍，就会执行第二次（变量被改两次、写进聊天文件）。
 * 带这些宏的文字不替换，原样用。
 */
export const SIDE_EFFECT_MACRO = /\{\{\s*(?:set|inc|dec|add)(?:global)?var\b|\{\{\s*(?:random|roll|pick)\b/i;
