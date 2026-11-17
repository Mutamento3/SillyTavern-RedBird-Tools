import { describe, expect, it } from 'vitest';
import { CANVAS, contrast, ON_IMAGE_TEXT, QUOTE_COLORS, quoteColor, SHADE_MAX, SHADE_MIN, shadeFor, type LookKind } from './quote';

describe('quote colors', () => {
  for (const q of QUOTE_COLORS) {
    for (const look of Object.keys(CANVAS) as LookKind[]) {
      it(`${q.label} is readable on ${look} (>= 4.5:1)`, () => {
        expect(contrast(q[look], CANVAS[look])).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
  it('no choice means no color', () => {
    expect(quoteColor(null, 'dark')).toBeNull();
    expect(quoteColor('gone', 'light')).toBeNull();
    expect(quoteColor('teal', 'warm')).toBe('#22685c');
  });
});

describe('background shade', () => {
  it('dark pictures get the lightest shade', () => {
    expect(shadeFor([40, 12, 14])).toBe(SHADE_MIN);
  });
  it('a white picture gets enough shade for 4.5:1, within the limit', () => {
    const a = shadeFor([255, 255, 255]);
    expect(a).toBeGreaterThan(0.5);
    expect(a).toBeLessThanOrEqual(0.6);
  });
  it('any picture: 4.5:1 for the body text', () => {
    for (const avg of [[120, 130, 110], [200, 190, 170], [90, 140, 220]]) {
      const a = shadeFor(avg);
      expect(contrast(ON_IMAGE_TEXT, avg.map((v) => v * (1 - a)))).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('a colored dialogue on a white picture: more shade, still capped and readable', () => {
    for (const q of QUOTE_COLORS) {
      const a = shadeFor([255, 255, 255], [ON_IMAGE_TEXT, q.dark]);
      expect(a).toBeLessThanOrEqual(SHADE_MAX);
      expect(contrast(q.dark, [255, 255, 255].map((v) => v * (1 - a)))).toBeGreaterThanOrEqual(3.5);
    }
  });
});
