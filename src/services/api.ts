import type {
  Disclosure,
  DocumentCategory,
  Loan,
  LoanDocument,
  ScannedPage,
} from '@/types';

/**
 * In-memory mock of the loan servicing backend. Every call is async with
 * simulated latency so the UI exercises real pending states. Replace the
 * bodies with fetch calls when a backend exists; signatures are the contract.
 */

const config = { latencyMs: 700, failureRate: 0 };

/** Test/dev hook: make the mock instant or flaky. */
export function configureMockApi(next: Partial<typeof config>) {
  Object.assign(config, next);
}

export class ApiError extends Error {}

async function simulate<T>(produce: () => T): Promise<T> {
  if (config.latencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, config.latencyMs));
  }
  if (Math.random() < config.failureRate) {
    throw new ApiError('Network request failed. Check your connection and try again.');
  }
  return produce();
}

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

let nextId = 100;
const newId = () => `doc-${nextId++}`;

type Db = { loan: Loan; disclosures: Disclosure[]; documents: LoanDocument[] };

const seed = (): Db => ({
  loan: {
    id: 'LN-204918',
    propertyAddress: '1847 Willow Creek Dr, Austin, TX 78704',
    loanAmount: 412_000,
    rate: 6.375,
    termYears: 30,
    loanOfficer: 'Jordan Reyes',
    currentMilestone: 'underwriting',
    milestones: [
      { id: 'application', label: 'Application', completedAt: daysAgo(18) },
      { id: 'processing', label: 'Processing', completedAt: daysAgo(9) },
      { id: 'underwriting', label: 'Underwriting', completedAt: null },
      { id: 'conditional-approval', label: 'Conditional Approval', completedAt: null },
      { id: 'clear-to-close', label: 'Clear to Close', completedAt: null },
      { id: 'closed', label: 'Closed', completedAt: null },
    ],
    outstandingConditions: [
      'Most recent 2 months of bank statements',
      'Signed letter of explanation for credit inquiry',
    ],
  },
  disclosures: [
    {
      id: 'loan-estimate',
      title: 'Loan Estimate',
      summary: 'Estimated rate, monthly payment, and closing costs for your loan.',
      body:
        'This Loan Estimate summarizes the key terms of the loan you applied for: ' +
        'a 30-year fixed-rate loan of $412,000 at 6.375%. Estimated monthly principal ' +
        'and interest is $2,570.36. Estimated closing costs are $9,842, and estimated ' +
        'cash to close is $112,842. Your rate is locked until the date shown on page 1. ' +
        'You are not obligated to accept this loan by acknowledging receipt.',
      deliveredAt: daysAgo(17),
      dueBy: daysAgo(14),
      acknowledgedAt: daysAgo(16),
    },
    {
      id: 'intent-to-proceed',
      title: 'Intent to Proceed',
      summary: 'Confirms you want to continue with this loan application.',
      body:
        'By acknowledging, you indicate your intent to proceed with the loan described ' +
        'in your Loan Estimate. This allows your lender to collect fees for the appraisal ' +
        'and continue processing your application.',
      deliveredAt: daysAgo(3),
      dueBy: daysFromNow(4),
      acknowledgedAt: null,
    },
    {
      id: 'appraisal-notice',
      title: 'Right to Receive Appraisal',
      summary: 'You will receive a copy of any appraisal promptly upon completion.',
      body:
        'We may order an appraisal to determine the property’s value and charge you for ' +
        'it. We will promptly give you a copy of any appraisal, even if your loan does not ' +
        'close. You can pay for an additional appraisal for your own use at your own cost.',
      deliveredAt: daysAgo(1),
      dueBy: daysFromNow(6),
      acknowledgedAt: null,
    },
  ],
  documents: [
    doc('doc-1', 'W-2 2025 — Acme Corp', 'income', 'my-uploads', 'accepted', 2, 12),
    doc('doc-2', 'Pay stubs (Sep–Oct)', 'income', 'my-uploads', 'under-review', 3, 2),
    doc('doc-3', 'Driver’s license', 'identity', 'my-uploads', 'submitted', 1, 1),
    doc('doc-4', 'Loan Estimate', 'disclosure', 'sent-to-me', 'accepted', 3, 17),
    doc('doc-5', 'Appraisal report', 'property', 'sent-to-me', 'submitted', 14, 2),
    doc('doc-6', 'Conditions list', 'other', 'sent-to-me', 'submitted', 1, 0),
    doc('doc-7', 'Bank statement — Aug', 'assets', 'not-sent', 'draft', 4, 0),
    {
      ...doc('doc-8', 'Gift letter', 'assets', 'my-uploads', 'rejected', 1, 5),
      note: 'Missing donor signature. Please re-upload a signed copy.',
    },
  ],
});

let db = seed();

/** Test hook: restore the seeded data. */
export function resetMockApi() {
  db = seed();
  nextId = 100;
}

function doc(
  id: string,
  name: string,
  category: DocumentCategory,
  folder: LoanDocument['folder'],
  status: LoanDocument['status'],
  pageCount: number,
  age: number,
): LoanDocument {
  return {
    id,
    name,
    category,
    folder,
    status,
    pageCount,
    mimeType: 'application/pdf',
    sizeBytes: pageCount * 180_000,
    updatedAt: daysAgo(age),
    sharedWith: [],
  };
}

function findDocument(id: string): LoanDocument {
  const found = db.documents.find((d) => d.id === id);
  if (!found) throw new ApiError(`Document ${id} not found`);
  return found;
}

function replaceDocument(next: LoanDocument): LoanDocument {
  db.documents = db.documents.map((d) => (d.id === next.id ? next : d));
  return { ...next };
}

export const api = {
  getLoan: () => simulate(() => structuredClone(db.loan)),

  getDisclosures: () => simulate(() => structuredClone(db.disclosures)),

  acknowledgeDisclosure: (id: string) =>
    simulate(() => {
      const target = db.disclosures.find((d) => d.id === id);
      if (!target) throw new ApiError(`Disclosure ${id} not found`);
      target.acknowledgedAt = new Date().toISOString();
      return { ...target };
    }),

  getDocuments: () => simulate(() => structuredClone(db.documents)),

  uploadDocument: (input: {
    name: string;
    category: DocumentCategory;
    pages: ScannedPage[];
    /** false saves to "Not Sent" as a draft. */
    submit: boolean;
  }) =>
    simulate(() => {
      const created: LoanDocument = {
        id: newId(),
        name: input.name,
        category: input.category,
        folder: input.submit ? 'my-uploads' : 'not-sent',
        status: input.submit ? 'submitted' : 'draft',
        mimeType: input.pages.length > 1 ? 'application/pdf' : (input.pages[0]?.mimeType ?? 'application/pdf'),
        sizeBytes: input.pages.reduce((sum, p) => sum + p.sizeBytes, 0),
        pageCount: input.pages.length,
        updatedAt: new Date().toISOString(),
        sharedWith: [],
      };
      db.documents = [created, ...db.documents];
      return { ...created };
    }),

  /** Submits a "Not Sent" draft to the lender. */
  sendDocument: (id: string) =>
    simulate(() =>
      replaceDocument({
        ...findDocument(id),
        folder: 'my-uploads',
        status: 'submitted',
        updatedAt: new Date().toISOString(),
      }),
    ),

  shareDocument: (id: string, recipient: string) =>
    simulate(() => {
      const current = findDocument(id);
      if (current.sharedWith.includes(recipient)) {
        throw new ApiError(`Already shared with ${recipient}.`);
      }
      return replaceDocument({ ...current, sharedWith: [...current.sharedWith, recipient] });
    }),

  deleteDocument: (id: string) =>
    simulate(() => {
      const current = findDocument(id);
      if (current.folder !== 'not-sent') {
        throw new ApiError('Only unsent drafts can be deleted.');
      }
      db.documents = db.documents.filter((d) => d.id !== id);
      return id;
    }),
};

/**
 * Promises read with React 19's `use()` must be stable across renders, so the
 * initial loads are memoized here instead of created during render.
 */
const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let promise = cache.get(key) as Promise<T> | undefined;
  if (!promise) {
    promise = load();
    promise.catch(() => cache.delete(key));
    cache.set(key, promise);
  }
  return promise;
}

export const resources = {
  loan: () => cached('loan', api.getLoan),
  disclosures: () => cached('disclosures', api.getDisclosures),
  documents: () => cached('documents', api.getDocuments),
  invalidate: (key?: 'loan' | 'disclosures' | 'documents') =>
    key ? cache.delete(key) : cache.clear(),
};
