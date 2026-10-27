import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatCurrency, formatDate, formatPercent } from '@/lib/format';
import { monthlyPrincipalAndInterest } from '@/lib/mortgage';
import type { Disclosure, Loan } from '@/types';
import { Card } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';

import { useLoan } from './LoanProvider';

export function LoanSummaryCard({ loan }: { loan: Loan }) {
  const payment = monthlyPrincipalAndInterest(loan.loanAmount, loan.rate, loan.termYears);
  return (
    <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
      <Text style={[type.caption, styles.onPrimaryMuted]}>Loan {loan.id}</Text>
      <Text style={[type.heading, styles.onPrimary]} numberOfLines={2}>
        {loan.propertyAddress}
      </Text>
      <View style={styles.statsRow}>
        <Stat label="Loan amount" value={formatCurrency(loan.loanAmount)} />
        <Stat label="Rate" value={formatPercent(loan.rate)} />
        <Stat label="Est. P&I" value={formatCurrency(payment)} />
      </View>
      <Text style={[type.caption, styles.onPrimaryMuted]}>Loan officer: {loan.loanOfficer}</Text>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[type.caption, styles.onPrimaryMuted]}>{label}</Text>
      <Text style={[styles.statValue, styles.onPrimary]}>{value}</Text>
    </View>
  );
}

export function MilestoneTimeline({ loan }: { loan: Loan }) {
  const currentIndex = loan.milestones.findIndex((m) => m.id === loan.currentMilestone);

  return (
    <Card>
      <Text style={type.heading} accessibilityRole="header">
        Loan progress
      </Text>
      {loan.milestones.map((m, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming';
        const isLast = i === loan.milestones.length - 1;
        return (
          <View
            key={m.id}
            style={styles.milestone}
            accessibilityLabel={`${m.label}: ${
              state === 'done' ? `completed ${m.completedAt ? formatDate(m.completedAt) : ''}` : state === 'current' ? 'in progress' : 'upcoming'
            }`}
          >
            <View style={styles.milestoneRail}>
              <View
                style={[
                  styles.milestoneDot,
                  state === 'done' && styles.dotDone,
                  state === 'current' && styles.dotCurrent,
                ]}
              >
                {state === 'done' ? (
                  <Ionicons name="checkmark" size={12} color={colors.primaryText} />
                ) : state === 'current' ? (
                  <Ionicons name="ellipsis-horizontal" size={12} color={colors.primaryText} />
                ) : null}
              </View>
              {!isLast ? <View style={[styles.railLine, state === 'done' && styles.railDone]} /> : null}
            </View>
            <View style={styles.milestoneText}>
              <Text style={[type.body, state === 'current' && { fontWeight: '700' }, state === 'upcoming' && { color: colors.textMuted }]}>
                {m.label}
              </Text>
              <Text style={type.caption}>
                {state === 'done' && m.completedAt
                  ? `Completed ${formatDate(m.completedAt)}`
                  : state === 'current'
                    ? 'In progress'
                    : 'Upcoming'}
              </Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

export function ConditionsCard({ loan }: { loan: Loan }) {
  if (loan.outstandingConditions.length === 0) return null;
  return (
    <Card style={{ backgroundColor: colors.warningMuted, borderColor: colors.warningMuted }}>
      <View style={styles.inlineRow}>
        <Ionicons name="alert-circle" size={20} color={colors.warning} />
        <Text style={[type.heading, { color: colors.warning }]}>
          {loan.outstandingConditions.length} items needed from you
        </Text>
      </View>
      {loan.outstandingConditions.map((c) => (
        <Text key={c} style={type.body}>
          • {c}
        </Text>
      ))}
      <Link href="/scan" style={styles.link} accessibilityRole="link">
        Scan and upload now →
      </Link>
    </Card>
  );
}

export function DisclosuresCard() {
  const { disclosures } = useLoan();
  const pending = disclosures.filter((d) => !d.acknowledgedAt).length;

  return (
    <Card style={{ gap: 0 }}>
      <View style={[styles.inlineRow, { paddingBottom: spacing.sm }]}>
        <Text style={[type.heading, { flex: 1 }]} accessibilityRole="header">
          Disclosures
        </Text>
        {pending > 0 ? <Text style={styles.countPill}>{pending} to review</Text> : null}
      </View>
      {disclosures.map((d) => (
        <DisclosureRow key={d.id} disclosure={d} />
      ))}
    </Card>
  );
}

function DisclosureRow({ disclosure }: { disclosure: Disclosure }) {
  const acknowledged = disclosure.acknowledgedAt !== null;
  return (
    <Link href={{ pathname: '/disclosures/[id]', params: { id: disclosure.id } }} asChild>
      <Pressable
        style={styles.disclosureRow}
        accessibilityRole="button"
        accessibilityLabel={`${disclosure.title}, ${acknowledged ? 'acknowledged' : `review by ${formatDate(disclosure.dueBy)}`}`}
      >
        <Ionicons
          name={acknowledged ? 'checkmark-circle' : 'document-text-outline'}
          size={22}
          color={acknowledged ? colors.success : colors.primary}
        />
        <View style={{ flex: 1 }}>
          <Text style={type.body}>{disclosure.title}</Text>
          <Text style={type.caption}>
            {acknowledged && disclosure.acknowledgedAt
              ? `Acknowledged ${formatDate(disclosure.acknowledgedAt)}`
              : `Review by ${formatDate(disclosure.dueBy)}`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  onPrimary: { color: colors.primaryText },
  onPrimaryMuted: { color: '#C9DAFF' },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statValue: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  milestone: { flexDirection: 'row', gap: spacing.md },
  milestoneRail: { alignItems: 'center', width: 22 },
  milestoneDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.success, borderColor: colors.success },
  dotCurrent: { backgroundColor: colors.primary, borderColor: colors.primary },
  railLine: { width: 2, flex: 1, minHeight: 18, backgroundColor: colors.border },
  railDone: { backgroundColor: colors.success },
  milestoneText: { flex: 1, paddingBottom: spacing.md },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  link: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  countPill: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
    backgroundColor: colors.warningMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  disclosureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
