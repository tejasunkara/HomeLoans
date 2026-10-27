import { useDeferredValue, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatCurrency, formatPercent, parseNumber } from '@/lib/format';
import {
  amortizationByYear,
  calculateAffordability,
  calculatePayment,
  calculateRefinance,
} from '@/lib/mortgage';
import { Card, Field, SegmentedControl } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';

type CalculatorId = 'payment' | 'affordability' | 'refinance';

const CALCULATORS = [
  { value: 'payment', label: 'Payment' },
  { value: 'affordability', label: 'Afford' },
  { value: 'refinance', label: 'Refinance' },
] as const;

export function Calculators() {
  const [active, setActive] = useState<CalculatorId>('payment');
  return (
    <View style={{ gap: spacing.lg }}>
      <SegmentedControl
        accessibilityLabel="Calculator type"
        options={CALCULATORS}
        value={active}
        onChange={setActive}
      />
      {active === 'payment' ? (
        <PaymentCalculator />
      ) : active === 'affordability' ? (
        <AffordabilityCalculator />
      ) : (
        <RefinanceCalculator />
      )}
    </View>
  );
}

/** Keeps raw text per field so partial input like "6." isn't clobbered by parsing. */
function useNumericFields<K extends string>(initial: Record<K, string>) {
  const [text, setText] = useState(initial);
  const values = Object.fromEntries(
    Object.entries(text).map(([k, v]) => [k, parseNumber(v as string)]),
  ) as Record<K, number>;
  const bind = (key: K) => ({
    value: text[key],
    onChangeText: (next: string) => setText((prev) => ({ ...prev, [key]: next })),
  });
  return { values, bind };
}

function PaymentCalculator() {
  const { values, bind } = useNumericFields({
    homePrice: '515000',
    downPayment: '103000',
    rate: '6.375',
    term: '30',
    tax: '9800',
    insurance: '2100',
    hoa: '0',
  });

  const result = calculatePayment({
    homePrice: values.homePrice,
    downPayment: values.downPayment,
    annualRate: values.rate,
    termYears: values.term,
    annualPropertyTax: values.tax,
    annualInsurance: values.insurance,
    monthlyHoa: values.hoa,
  });

  // The schedule is the expensive part; let it lag behind typing.
  const deferredPrincipal = useDeferredValue(result.loanAmount);
  const deferredRate = useDeferredValue(values.rate);
  const deferredTerm = useDeferredValue(Math.min(values.term, 50));
  const schedule = amortizationByYear(deferredPrincipal, deferredRate, deferredTerm);
  const milestones = schedule.filter((y) => y.year === 1 || y.year % 5 === 0);

  const downPct = values.homePrice > 0 ? (values.downPayment / values.homePrice) * 100 : 0;

  return (
    <>
      <Card>
        <View style={styles.fieldRow}>
          <Field label="Home price" prefix="$" {...bind('homePrice')} />
        </View>
        <View style={styles.fieldRow}>
          <Field label={`Down payment (${downPct.toFixed(1)}%)`} prefix="$" {...bind('downPayment')} />
        </View>
        <View style={styles.fieldRow}>
          <Field label="Interest rate" suffix="%" {...bind('rate')} />
          <Field label="Term" suffix="yrs" keyboardType="number-pad" {...bind('term')} />
        </View>
        <View style={styles.fieldRow}>
          <Field label="Property tax / yr" prefix="$" {...bind('tax')} />
          <Field label="Insurance / yr" prefix="$" {...bind('insurance')} />
        </View>
        <View style={styles.fieldRow}>
          <Field label="HOA / mo" prefix="$" {...bind('hoa')} />
        </View>
      </Card>

      <Card>
        <Text style={type.caption}>Estimated monthly payment</Text>
        <Text style={type.figure} accessibilityLiveRegion="polite">
          {formatCurrency(result.total)}
        </Text>
        <BreakdownBar
          parts={[
            { label: 'Principal & interest', value: result.principalAndInterest, color: colors.primary },
            { label: 'Property tax', value: result.propertyTax, color: '#5B8CFF' },
            { label: 'Insurance', value: result.insurance, color: '#9DB9FF' },
            { label: 'PMI', value: result.pmi, color: colors.warning },
            { label: 'HOA', value: result.hoa, color: colors.textMuted },
          ]}
        />
        <Line label="Loan amount" value={formatCurrency(result.loanAmount)} />
        <Line label="Loan-to-value" value={formatPercent(result.loanToValue * 100, 1)} />
        <Line label="Total interest over term" value={formatCurrency(result.totalInterest)} />
        {result.pmi > 0 ? (
          <Text style={type.caption}>
            PMI applies because your down payment is under 20%. It’s typically removed once you reach 20% equity.
          </Text>
        ) : null}
      </Card>

      {milestones.length > 0 ? (
        <Card>
          <Text style={type.heading} accessibilityRole="header">
            Amortization
          </Text>
          <View style={styles.tableRow}>
            <Text style={[styles.th, { flex: 0.6 }]}>Year</Text>
            <Text style={styles.th}>Principal</Text>
            <Text style={styles.th}>Interest</Text>
            <Text style={styles.th}>Balance</Text>
          </View>
          {milestones.map((y) => (
            <View key={y.year} style={styles.tableRow}>
              <Text style={[styles.td, { flex: 0.6 }]}>{y.year}</Text>
              <Text style={styles.td}>{formatCurrency(y.principalPaid)}</Text>
              <Text style={styles.td}>{formatCurrency(y.interestPaid)}</Text>
              <Text style={styles.td}>{formatCurrency(y.endingBalance)}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </>
  );
}

function AffordabilityCalculator() {
  const { values, bind } = useNumericFields({
    income: '145000',
    debts: '650',
    down: '90000',
    rate: '6.375',
    term: '30',
    escrow: '950',
  });

  const result = calculateAffordability({
    annualIncome: values.income,
    monthlyDebts: values.debts,
    downPayment: values.down,
    annualRate: values.rate,
    termYears: values.term,
    monthlyEscrow: values.escrow,
  });

  return (
    <>
      <Card>
        <View style={styles.fieldRow}>
          <Field label="Annual household income" prefix="$" {...bind('income')} />
        </View>
        <View style={styles.fieldRow}>
          <Field label="Monthly debts" prefix="$" {...bind('debts')} />
          <Field label="Down payment" prefix="$" {...bind('down')} />
        </View>
        <View style={styles.fieldRow}>
          <Field label="Interest rate" suffix="%" {...bind('rate')} />
          <Field label="Term" suffix="yrs" keyboardType="number-pad" {...bind('term')} />
        </View>
        <View style={styles.fieldRow}>
          <Field label="Taxes, insurance & HOA / mo" prefix="$" {...bind('escrow')} />
        </View>
      </Card>
      <Card>
        <Text style={type.caption}>You could afford a home up to</Text>
        <Text style={type.figure} accessibilityLiveRegion="polite">
          {formatCurrency(result.maxHomePrice)}
        </Text>
        <Line label="Max loan amount" value={formatCurrency(result.maxLoanAmount)} />
        <Line label="Max monthly housing payment" value={formatCurrency(result.maxMonthlyHousing)} />
        <Line label="Of which principal & interest" value={formatCurrency(result.maxPrincipalAndInterest)} />
        <Text style={type.caption}>
          Based on a 36% debt-to-income ratio. Your actual approval depends on credit, reserves, and loan program.
        </Text>
      </Card>
    </>
  );
}

function RefinanceCalculator() {
  const { values, bind } = useNumericFields({
    balance: '380000',
    currentRate: '7.25',
    remaining: '28',
    newRate: '6.125',
    newTerm: '30',
    costs: '6500',
  });

  const result = calculateRefinance({
    currentBalance: values.balance,
    currentRate: values.currentRate,
    currentRemainingYears: values.remaining,
    newRate: values.newRate,
    newTermYears: values.newTerm,
    closingCosts: values.costs,
  });

  const saves = result.monthlySavings > 0;

  return (
    <>
      <Card>
        <View style={styles.fieldRow}>
          <Field label="Current balance" prefix="$" {...bind('balance')} />
        </View>
        <View style={styles.fieldRow}>
          <Field label="Current rate" suffix="%" {...bind('currentRate')} />
          <Field label="Years remaining" keyboardType="number-pad" {...bind('remaining')} />
        </View>
        <View style={styles.fieldRow}>
          <Field label="New rate" suffix="%" {...bind('newRate')} />
          <Field label="New term" suffix="yrs" keyboardType="number-pad" {...bind('newTerm')} />
        </View>
        <View style={styles.fieldRow}>
          <Field label="Closing costs" prefix="$" {...bind('costs')} />
        </View>
      </Card>
      <Card>
        <Text style={type.caption}>{saves ? 'Monthly savings' : 'Monthly increase'}</Text>
        <Text style={[type.figure, { color: saves ? colors.success : colors.danger }]} accessibilityLiveRegion="polite">
          {saves ? '' : '+'}
          {formatCurrency(Math.abs(result.monthlySavings))}
        </Text>
        <Line label="Current P&I" value={formatCurrency(result.currentPayment)} />
        <Line label="New P&I" value={formatCurrency(result.newPayment)} />
        <Line
          label="Break-even"
          value={
            result.breakEvenMonths === null
              ? 'Never'
              : `${result.breakEvenMonths} months (${(result.breakEvenMonths / 12).toFixed(1)} yrs)`
          }
        />
        <Line
          label={result.lifetimeInterestDelta <= 0 ? 'Lifetime cost savings' : 'Added lifetime cost'}
          value={formatCurrency(Math.abs(result.lifetimeInterestDelta))}
        />
        {saves && result.lifetimeInterestDelta > 0 ? (
          <Text style={type.caption}>
            Your payment drops, but extending the term means you pay more interest overall.
          </Text>
        ) : null}
      </Card>
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={type.caption}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

function BreakdownBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const visible = parts.filter((p) => p.value > 0);
  const total = visible.reduce((sum, p) => sum + p.value, 0);
  if (total <= 0) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.bar} accessible={false}>
        {visible.map((p) => (
          <View key={p.label} style={{ flex: p.value / total, backgroundColor: p.color }} />
        ))}
      </View>
      {visible.map((p) => (
        <View key={p.label} style={styles.line}>
          <View style={styles.legendLabel}>
            <View style={[styles.swatch, { backgroundColor: p.color }]} />
            <Text style={type.caption}>{p.label}</Text>
          </View>
          <Text style={styles.lineValue}>{formatCurrency(p.value)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldRow: { flexDirection: 'row', gap: spacing.md },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  lineValue: { ...type.body, fontWeight: '600', fontVariant: ['tabular-nums'] },
  bar: { flexDirection: 'row', height: 12, borderRadius: radius.pill, overflow: 'hidden', gap: 2 },
  legendLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  tableRow: { flexDirection: 'row', gap: spacing.sm },
  th: { ...type.caption, flex: 1, fontWeight: '600', textAlign: 'right' },
  td: { ...type.caption, flex: 1, color: colors.text, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
