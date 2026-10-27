import { errorMessage } from '@/lib/errors';
import type { DocumentCategory, LoanDocument, ScannedPage } from '@/types';

export type PageSource = 'camera' | 'library' | 'files';

export type UploadState =
  | { step: 'capture'; pages: ScannedPage[]; error?: string }
  | { step: 'details'; pages: ScannedPage[]; name: string; category: DocumentCategory; error?: string }
  | { step: 'review'; pages: ScannedPage[]; name: string; category: DocumentCategory; error?: string }
  | { step: 'done'; document: LoanDocument };

export type UploadIntent =
  | { type: 'add-pages'; source: PageSource }
  | { type: 'remove-page'; index: number }
  | { type: 'continue' }
  | { type: 'set-details'; name: string; category: DocumentCategory }
  | { type: 'back' }
  | { type: 'submit'; send: boolean }
  | { type: 'reset' };

export interface UploadDeps {
  /** Resolves to [] when the user cancels the picker. */
  pickPages: (source: PageSource) => Promise<ScannedPage[]>;
  upload: (input: {
    name: string;
    category: DocumentCategory;
    pages: ScannedPage[];
    submit: boolean;
  }) => Promise<LoanDocument>;
  onUploaded: (document: LoanDocument) => void;
}

export const MAX_PAGES = 20;

export const initialUploadState: UploadState = { step: 'capture', pages: [] };

export const STEPS = ['capture', 'details', 'review'] as const;

/**
 * The whole wizard as a single `useActionState` action: each intent maps the
 * previous step to the next one. Async work (pickers, upload) happens here,
 * so the component never tracks loading or error state itself — failures are
 * returned as `error` on the step the user is still on.
 */
export function createUploadAction(deps: UploadDeps) {
  return async function uploadAction(prev: UploadState, intent: UploadIntent): Promise<UploadState> {
    if (intent.type === 'reset') return initialUploadState;
    if (prev.step === 'done') return prev;

    switch (intent.type) {
      case 'add-pages': {
        if (prev.step !== 'capture') return prev;
        try {
          const added = await deps.pickPages(intent.source);
          const pages = [...prev.pages, ...added];
          if (pages.length > MAX_PAGES) {
            return { ...prev, error: `A document can have at most ${MAX_PAGES} pages.` };
          }
          return { step: 'capture', pages };
        } catch (e) {
          return { ...prev, error: errorMessage(e) };
        }
      }

      case 'remove-page':
        if (prev.step !== 'capture') return prev;
        return { step: 'capture', pages: prev.pages.filter((_, i) => i !== intent.index) };

      case 'continue':
        if (prev.step !== 'capture') return prev;
        if (prev.pages.length === 0) {
          return { ...prev, error: 'Scan or attach at least one page to continue.' };
        }
        return { step: 'details', pages: prev.pages, name: suggestName(prev.pages), category: 'other' };

      case 'set-details': {
        if (prev.step !== 'details') return prev;
        const name = intent.name.trim();
        if (name.length < 3) {
          return { ...prev, name: intent.name, category: intent.category, error: 'Give the document a name (at least 3 characters).' };
        }
        return { step: 'review', pages: prev.pages, name, category: intent.category };
      }

      case 'back':
        if (prev.step === 'details') return { step: 'capture', pages: prev.pages };
        if (prev.step === 'review') {
          return { step: 'details', pages: prev.pages, name: prev.name, category: prev.category };
        }
        return prev;

      case 'submit': {
        if (prev.step !== 'review') return prev;
        try {
          const document = await deps.upload({
            name: prev.name,
            category: prev.category,
            pages: prev.pages,
            submit: intent.send,
          });
          deps.onUploaded(document);
          return { step: 'done', document };
        } catch (e) {
          return { ...prev, error: errorMessage(e) };
        }
      }
    }
  };
}

function suggestName(pages: ScannedPage[]): string {
  const first = pages[0]?.name ?? '';
  const stem = first.replace(/\.[a-z0-9]+$/i, '');
  // Camera captures get opaque UUID names; don't suggest those.
  return /^[0-9a-f-]{20,}$/i.test(stem) || stem.length === 0 ? '' : stem;
}
