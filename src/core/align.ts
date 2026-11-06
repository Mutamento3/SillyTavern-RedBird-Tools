import { contentToText, looseNormalize } from './text';

export interface StructuredMessage {
  identifier?: string;
  content: unknown;
}

/**
 * Align the final chat array with ST's structured message list (which carries identifiers).
 * Same length → positional. Otherwise (another extension added/removed messages) → greedy
 * sequential matching on content, leaving unmatched slots undefined.
 */
export function alignIdentifiers(
  chat: { content: unknown }[],
  structured: StructuredMessage[],
): (string | undefined)[] {
  if (structured.length === chat.length) return structured.map((s) => s.identifier);
  const norm = structured.map((s) => looseNormalize(contentToText(s.content)).slice(0, 200));
  const out: (string | undefined)[] = [];
  let j = 0;
  for (const m of chat) {
    const target = looseNormalize(contentToText(m.content)).slice(0, 200);
    let found = -1;
    for (let k = j; k < Math.min(structured.length, j + 4); k++) {
      if (norm[k] === target || (target.length > 20 && (norm[k].startsWith(target.slice(0, 40)) || target.startsWith(norm[k].slice(0, 40))))) {
        found = k;
        break;
      }
    }
    if (found >= 0) {
      out.push(structured[found].identifier);
      j = found + 1;
    } else out.push(undefined);
  }
  return out;
}
