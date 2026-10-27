import { Calculators } from '@/features/calculators/Calculators';
import { Screen } from '@/ui/components';

export default function CalculatorsScreen() {
  return (
    <Screen title="Calculators" subtitle="Estimates only — not a loan offer">
      <Calculators />
    </Screen>
  );
}
