import type { FolderId, LoanDocument, RecentFile } from '@/types';

export type DocumentsEvent =
  | { type: 'replaced'; documents: LoanDocument[] }
  | { type: 'added'; document: LoanDocument }
  | { type: 'updated'; document: LoanDocument }
  | { type: 'removed'; id: string };

/**
 * Shared by `useReducer` (committed server state) and `useOptimistic`
 * (in-flight patches), so optimistic and confirmed updates can't drift.
 */
export function documentsReducer(state: LoanDocument[], event: DocumentsEvent): LoanDocument[] {
  switch (event.type) {
    case 'replaced':
      return event.documents;
    case 'added':
      return [event.document, ...state.filter((d) => d.id !== event.document.id)];
    case 'updated':
      return state.map((d) => (d.id === event.document.id ? event.document : d));
    case 'removed':
      return state.filter((d) => d.id !== event.id);
  }
}

export const FOLDERS: readonly { value: FolderId; label: string; empty: string }[] = [
  { value: 'my-uploads', label: 'My Uploads', empty: 'Documents you send to your loan team show up here.' },
  { value: 'sent-to-me', label: 'Sent to Me', empty: 'Your loan team hasn’t shared any documents yet.' },
  { value: 'not-sent', label: 'Not Sent', empty: 'Scans you save as drafts wait here until you send them.' },
];

export function documentsInFolder(documents: LoanDocument[], folder: FolderId): LoanDocument[] {
  return documents
    .filter((d) => d.folder === folder)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function folderCounts(documents: LoanDocument[]): Record<FolderId, number> {
  const counts: Record<FolderId, number> = { 'my-uploads': 0, 'sent-to-me': 0, 'not-sent': 0 };
  for (const d of documents) counts[d.folder]++;
  return counts;
}

export const MAX_RECENT_FILES = 10;

/** Moves (or inserts) a file to the front, de-duplicated by id and capped. */
export function pushRecent(
  recents: RecentFile[],
  file: Pick<LoanDocument, 'id' | 'name'>,
  now: Date = new Date(),
): RecentFile[] {
  const entry: RecentFile = { id: file.id, name: file.name, openedAt: now.toISOString() };
  return [entry, ...recents.filter((r) => r.id !== file.id)].slice(0, MAX_RECENT_FILES);
}
