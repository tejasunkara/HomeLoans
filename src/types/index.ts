export type FolderId = 'my-uploads' | 'sent-to-me' | 'not-sent';

export type DocumentStatus =
  | 'draft'
  | 'uploading'
  | 'submitted'
  | 'under-review'
  | 'accepted'
  | 'rejected';

export type DocumentCategory =
  | 'income'
  | 'assets'
  | 'identity'
  | 'property'
  | 'disclosure'
  | 'other';

export interface LoanDocument {
  id: string;
  name: string;
  category: DocumentCategory;
  folder: FolderId;
  status: DocumentStatus;
  mimeType: string;
  sizeBytes: number;
  pageCount: number;
  updatedAt: string; // ISO
  /** Who the document was shared with, beyond the loan team. */
  sharedWith: string[];
  note?: string;
}

export interface ScannedPage {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export type MilestoneId =
  | 'application'
  | 'processing'
  | 'underwriting'
  | 'conditional-approval'
  | 'clear-to-close'
  | 'closed';

export interface Milestone {
  id: MilestoneId;
  label: string;
  completedAt: string | null;
}

export interface Disclosure {
  id: string;
  title: string;
  summary: string;
  body: string;
  deliveredAt: string;
  dueBy: string;
  acknowledgedAt: string | null;
}

export interface Loan {
  id: string;
  propertyAddress: string;
  loanAmount: number;
  rate: number;
  termYears: number;
  loanOfficer: string;
  currentMilestone: MilestoneId;
  milestones: Milestone[];
  outstandingConditions: string[];
}

export interface RecentFile {
  id: string;
  name: string;
  openedAt: string;
}
