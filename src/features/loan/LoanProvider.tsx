import { createContext, startTransition, use, useMemo, useState, type ReactNode } from 'react';

import { api, resources } from '@/services/api';
import type { Disclosure, Loan } from '@/types';

interface LoanContextValue {
  loan: Loan;
  disclosures: Disclosure[];
  /** Call from inside an Action; throws on failure. */
  acknowledgeDisclosure: (id: string) => Promise<Disclosure>;
}

const LoanContext = createContext<LoanContextValue | null>(null);

export function useLoan(): LoanContextValue {
  const value = use(LoanContext);
  if (!value) throw new Error('useLoan must be used inside <LoanProvider>');
  return value;
}

/** Must render under <Suspense>: suspends on the loan + disclosures load. */
export function LoanProvider({ children }: { children: ReactNode }) {
  const loan = use(resources.loan());
  const [disclosures, setDisclosures] = useState(use(resources.disclosures()));

  const value = useMemo<LoanContextValue>(
    () => ({
      loan,
      disclosures,
      async acknowledgeDisclosure(id) {
        const updated = await api.acknowledgeDisclosure(id);
        startTransition(() =>
          setDisclosures((prev) => prev.map((d) => (d.id === id ? updated : d))),
        );
        return updated;
      },
    }),
    [loan, disclosures],
  );

  return <LoanContext value={value}>{children}</LoanContext>;
}
