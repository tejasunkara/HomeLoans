import {
  ConditionsCard,
  DisclosuresCard,
  LoanSummaryCard,
  MilestoneTimeline,
} from '@/features/loan/components';
import { useLoan } from '@/features/loan/LoanProvider';
import { Screen } from '@/ui/components';

export default function DashboardScreen() {
  const { loan } = useLoan();
  return (
    <Screen title="My Loan" subtitle="Track your application from submission to closing">
      <LoanSummaryCard loan={loan} />
      <ConditionsCard loan={loan} />
      <DisclosuresCard />
      <MilestoneTimeline loan={loan} />
    </Screen>
  );
}
