import { describe, expect, it } from 'vitest';
import { mergeStores, type StoreSnapshot } from './store';

const snap = (data: StoreSnapshot['data'], deleted: StoreSnapshot['deleted'] = {}): StoreSnapshot => ({ data, deleted });
const T1 = '2026-11-06T10:00:00.000Z';
const T2 = '2026-11-06T11:00:00.000Z';
const T3 = '2026-11-06T12:00:00.000Z';

describe('mergeStores', () => {
  it('keeps the newer copy of each record', () => {
    const stale = snap({ presetInfo: { A: { author: '', links: [], updatedAt: T1 } } });
    const fresh = snap({ presetInfo: { A: { author: '小狗', links: [{ label: '帖', url: 'https://x' }], updatedAt: T2 } } });
    expect(mergeStores(stale, fresh).data.presetInfo?.A.author).toBe('小狗');
    expect(mergeStores(fresh, stale).data.presetInfo?.A.author).toBe('小狗');
  });

  it('keeps records that only one side has', () => {
    const m = mergeStores(snap({ cards: { a: { updatedAt: T1 } } }), snap({ cards: { b: { updatedAt: T1 } } }));
    expect(Object.keys(m.data.cards ?? {}).sort()).toEqual(['a', 'b']);
  });

  it('does not bring back a record deleted after its last change', () => {
    const stillHasIt = snap({ worldSources: { W: { updatedAt: T1 } } });
    const deletedIt = snap({}, { worldSources: { W: T2 } });
    expect(mergeStores(stillHasIt, deletedIt).data.worldSources?.W).toBeUndefined();
  });

  it('keeps a record edited again after it was deleted', () => {
    const editedLater = snap({ worldSources: { W: { updatedAt: T3 } } });
    const deletedBefore = snap({}, { worldSources: { W: T2 } });
    expect(mergeStores(deletedBefore, editedLater).data.worldSources?.W).toBeDefined();
  });

  it('uses savedAt for profiles and at for regex owners', () => {
    const m = mergeStores(
      snap({ profiles: { c: { savedAt: T1, cardName: 'old' } }, regexOwners: { r: { kind: 'card', key: 'a', label: 'A' } } }),
      snap({ profiles: { c: { savedAt: T2, cardName: 'new' } }, regexOwners: { r: { kind: 'card', key: 'b', label: 'B', at: T1 } } }),
    );
    expect(m.data.profiles?.c.cardName).toBe('new');
    expect(m.data.regexOwners?.r.key).toBe('b');
  });
});
