import type { LoanDocument } from '@/types';

import {
  MAX_RECENT_FILES,
  documentsInFolder,
  documentsReducer,
  folderCounts,
  pushRecent,
} from '../reducer';

const make = (id: string, overrides: Partial<LoanDocument> = {}): LoanDocument => ({
  id,
  name: `Doc ${id}`,
  category: 'other',
  folder: 'my-uploads',
  status: 'submitted',
  mimeType: 'application/pdf',
  sizeBytes: 1000,
  pageCount: 1,
  updatedAt: '2026-10-01T00:00:00.000Z',
  sharedWith: [],
  ...overrides,
});

describe('documentsReducer', () => {
  it('adds new documents to the front without duplicating', () => {
    const state = [make('a'), make('b')];
    const next = documentsReducer(state, { type: 'added', document: make('b', { name: 'B2' }) });
    expect(next.map((d) => d.id)).toEqual(['b', 'a']);
    expect(next[0]!.name).toBe('B2');
  });

  it('moves a document between folders on update', () => {
    const state = [make('a', { folder: 'not-sent', status: 'draft' })];
    const next = documentsReducer(state, {
      type: 'updated',
      document: make('a', { folder: 'my-uploads', status: 'submitted' }),
    });
    expect(documentsInFolder(next, 'not-sent')).toHaveLength(0);
    expect(documentsInFolder(next, 'my-uploads')).toHaveLength(1);
  });

  it('removes documents', () => {
    expect(documentsReducer([make('a'), make('b')], { type: 'removed', id: 'a' })).toEqual([make('b')]);
  });
});

describe('folder selectors', () => {
  it('counts every folder, including empty ones', () => {
    expect(folderCounts([make('a'), make('b', { folder: 'sent-to-me' })])).toEqual({
      'my-uploads': 1,
      'sent-to-me': 1,
      'not-sent': 0,
    });
  });

  it('sorts folder contents newest first', () => {
    const docs = [
      make('old', { updatedAt: '2026-01-01T00:00:00.000Z' }),
      make('new', { updatedAt: '2026-09-01T00:00:00.000Z' }),
    ];
    expect(documentsInFolder(docs, 'my-uploads').map((d) => d.id)).toEqual(['new', 'old']);
  });
});

describe('pushRecent', () => {
  it('moves a reopened file to the front instead of duplicating it', () => {
    let recents = pushRecent([], make('a'));
    recents = pushRecent(recents, make('b'));
    recents = pushRecent(recents, make('a'));
    expect(recents.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it(`keeps at most ${MAX_RECENT_FILES} entries`, () => {
    let recents = pushRecent([], make('0'));
    for (let i = 1; i < 15; i++) recents = pushRecent(recents, make(String(i)));
    expect(recents).toHaveLength(MAX_RECENT_FILES);
    expect(recents[0]!.id).toBe('14');
  });
});
