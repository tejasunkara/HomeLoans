import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  startTransition,
  use,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useReducer,
  useState,
  type ReactNode,
} from 'react';

import { api, resources } from '@/services/api';
import type { LoanDocument, RecentFile } from '@/types';

import { documentsReducer, pushRecent, type DocumentsEvent } from './reducer';

const RECENTS_KEY = 'homeloans.recentFiles.v1';

interface DocumentsContextValue {
  /** Server state with any in-flight optimistic patches applied. */
  documents: LoanDocument[];
  recentFiles: RecentFile[];
  /**
   * The mutations below are meant to be called from inside an Action
   * (`useActionState` / `startTransition`). They apply an optimistic patch
   * synchronously, then commit the server result. If they throw, React
   * discards the optimistic patch when the Action settles.
   */
  sendDocument: (id: string) => Promise<LoanDocument>;
  shareDocument: (id: string, recipient: string) => Promise<LoanDocument>;
  deleteDocument: (id: string) => Promise<void>;
  addDocument: (document: LoanDocument) => void;
  refresh: () => Promise<void>;
  markOpened: (document: Pick<LoanDocument, 'id' | 'name'>) => void;
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

export function useDocuments(): DocumentsContextValue {
  const value = use(DocumentsContext);
  if (!value) throw new Error('useDocuments must be used inside <DocumentsProvider>');
  return value;
}

export function useDocument(id: string): LoanDocument | undefined {
  return useDocuments().documents.find((d) => d.id === id);
}

/** Must render under <Suspense>: suspends on the initial documents load via `use()`. */
export function DocumentsProvider({ children }: { children: ReactNode }) {
  const initial = use(resources.documents());
  const [documents, dispatch] = useReducer(documentsReducer, initial);
  const [optimisticDocuments, applyOptimistic] = useOptimistic(documents, documentsReducer);
  const recentFiles = useRecentFiles();

  const findOrThrow = useCallback(
    (id: string) => {
      const found = documents.find((d) => d.id === id);
      if (!found) throw new Error('This document is no longer available.');
      return found;
    },
    [documents],
  );

  const value = useMemo<DocumentsContextValue>(() => {
    // Updates after an `await` lose the Action's transition context, so each
    // commit is wrapped in its own startTransition.
    const commit = (event: DocumentsEvent) => startTransition(() => dispatch(event));

    return {
      documents: optimisticDocuments,
      recentFiles: recentFiles.items,
      async sendDocument(id) {
        applyOptimistic({
          type: 'updated',
          document: { ...findOrThrow(id), folder: 'my-uploads', status: 'uploading' },
        });
        const updated = await api.sendDocument(id);
        commit({ type: 'updated', document: updated });
        return updated;
      },
      async shareDocument(id, recipient) {
        const current = findOrThrow(id);
        applyOptimistic({
          type: 'updated',
          document: { ...current, sharedWith: [...current.sharedWith, recipient] },
        });
        const updated = await api.shareDocument(id, recipient);
        commit({ type: 'updated', document: updated });
        return updated;
      },
      async deleteDocument(id) {
        applyOptimistic({ type: 'removed', id });
        await api.deleteDocument(id);
        commit({ type: 'removed', id });
        recentFiles.remove(id);
      },
      addDocument(document) {
        commit({ type: 'added', document });
        recentFiles.push(document);
      },
      async refresh() {
        const fresh = await api.getDocuments();
        commit({ type: 'replaced', documents: fresh });
      },
      markOpened: recentFiles.push,
    };
  }, [optimisticDocuments, recentFiles, applyOptimistic, findOrThrow]);

  return <DocumentsContext value={value}>{children}</DocumentsContext>;
}

function useRecentFiles() {
  const [items, setItems] = useState<RecentFile[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(RECENTS_KEY)
      .then((raw) => {
        if (raw) setItems(JSON.parse(raw) as RecentFile[]);
      })
      .catch(() => {
        // A corrupt or unreadable history isn't worth surfacing; start fresh.
      });
  }, []);

  const persist = useCallback((update: (prev: RecentFile[]) => RecentFile[]) => {
    setItems((prev) => {
      const next = update(prev);
      AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      items,
      push: (file: Pick<LoanDocument, 'id' | 'name'>) => persist((prev) => pushRecent(prev, file)),
      remove: (id: string) => persist((prev) => prev.filter((r) => r.id !== id)),
    }),
    [items, persist],
  );
}
