/**
 * Thin bridge to SillyTavern. Everything that touches ST internals lives here so
 * the rest of the code can stay testable and survive ST updates more easily.
 *
 * Two access paths:
 * - `SillyTavern.getContext()`: the stable public API.
 * - Dynamic imports of ST's own modules (/scripts/*.js). The browser module cache
 *   gives us the same live module instances ST uses (e.g. promptManager, selected_world_info).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Any = any;

declare global {
  interface Window {
    SillyTavern?: { getContext: () => Any };
    toastr?: Any;
    jQuery?: Any;
  }
}

export function ctx(): Any {
  const st = window.SillyTavern;
  if (!st) throw new Error('SillyTavern context not available');
  return st.getContext();
}

const moduleCache = new Map<string, Promise<Any>>();

/** Import one of ST's modules by its public URL, e.g. '/scripts/openai.js'. Returns null if it fails. */
export async function stModule(url: string): Promise<Any | null> {
  if (!moduleCache.has(url)) {
    moduleCache.set(url, import(/* @vite-ignore */ url).catch((e) => {
      console.warn('[RedBird] failed to import', url, e);
      return null;
    }));
  }
  return moduleCache.get(url)!;
}

export const ST_MODULES = {
  openai: '/scripts/openai.js',
  worldInfo: '/scripts/world-info.js',
  extensions: '/scripts/extensions.js',
  regexEngine: '/scripts/extensions/regex/engine.js',
  powerUser: '/scripts/power-user.js',
} as const;

/** Preload modules once so later synchronous reads have them. */
export const loaded: { openai?: Any; worldInfo?: Any; extensions?: Any; regexEngine?: Any } = {};

export async function preloadModules(): Promise<void> {
  const [openai, worldInfo, extensions, regexEngine] = await Promise.all([
    stModule(ST_MODULES.openai),
    stModule(ST_MODULES.worldInfo),
    stModule(ST_MODULES.extensions),
    stModule(ST_MODULES.regexEngine),
  ]);
  Object.assign(loaded, { openai, worldInfo, extensions, regexEngine });
}

export function currentCharacter(): Any | null {
  const c = ctx();
  if (c.groupId) return null;
  const id = c.characterId;
  if (id === undefined || id === null || id === '') return null;
  return c.characters?.[Number(id)] ?? null;
}

/** ST uses the avatar file name without extension as a key for per-character lore (charLore). */
export function charaFileName(avatar: string | undefined): string {
  return (avatar ?? '').replace(/\.[^/.]+$/, '');
}

export function substitute(text: string): string {
  try {
    return ctx().substituteParams(text);
  } catch {
    return text;
  }
}

export async function runSlash(command: string): Promise<void> {
  const c = ctx();
  if (typeof c.executeSlashCommandsWithOptions === 'function') {
    await c.executeSlashCommandsWithOptions(command, { handleParserErrors: true, handleExecutionErrors: true });
  } else {
    await c.executeSlashCommands(command);
  }
}

/** Quote a value for STscript unnamed/named arguments. */
export function slashQuote(v: string): string {
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function toast(kind: 'info' | 'success' | 'warning' | 'error', msg: string, title = 'RedBird 工具箱', opts: Any = {}): void {
  window.toastr?.[kind]?.(msg, title, opts);
}

const SETTINGS_KEY = 'redbird_tools';

export interface RbtSettings {
  toastOnCardSwitch: boolean;
  profiles: Record<string, EnvProfile>;
}

export interface EnvProfile {
  savedAt: string;
  cardName: string;
  globalWorlds: string[];
  globalRegexEnabled: string[];
  preset?: { api: string; name: string };
}

export function settings(): RbtSettings {
  const es = ctx().extensionSettings;
  if (!es[SETTINGS_KEY]) es[SETTINGS_KEY] = {};
  const s = es[SETTINGS_KEY];
  s.toastOnCardSwitch ??= true;
  s.profiles ??= {};
  return s as RbtSettings;
}

export function saveSettings(): void {
  ctx().saveSettingsDebounced();
}
