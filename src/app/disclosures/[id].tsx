import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { startTransition, useActionState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useLoan } from '@/features/loan/LoanProvider';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { Banner, Button, Card, EmptyState, Screen } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';

export default function DisclosureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { disclosures, acknowledgeDisclosure } = useLoan();
  const disclosure = disclosures.find((d) => d.id === id);

  const [error, acknowledge, isPending] = useActionState<string | null>(async () => {
    try {
      await acknowledgeDisclosure(id);
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  }, null);

  if (!disclosure) {
    return (
      <Screen>
        <EmptyState icon="document-outline" title="Disclosure not found" message="Return to My Loan and try again." />
      </Screen>
    );
  }

  const acknowledged = disclosure.acknowledgedAt !== null;

  return (
    <Screen title={disclosure.title} subtitle={`Delivered ${formatDate(disclosure.deliveredAt)}`}>
      <Card>
        <Text style={[type.body, { fontWeight: '600' }]}>{disclosure.summary}</Text>
        <Text style={[type.body, styles.body]}>{disclosure.body}</Text>
      </Card>

      {error ? <Banner tone="error" message={error} /> : null}

      {acknowledged && disclosure.acknowledgedAt ? (
        <View style={styles.ack} accessibilityRole="text">
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          <Text style={[type.body, { color: colors.success }]}>
            Acknowledged on {formatDate(disclosure.acknowledgedAt)}
          </Text>
        </View>
      ) : (
        <>
          <Text style={type.caption}>
            Please review by {formatDate(disclosure.dueBy)}. Acknowledging confirms you received this disclosure; it
            doesn’t commit you to the loan.
          </Text>
          <Button
            label={isPending ? 'Recording acknowledgement…' : 'I’ve reviewed this disclosure'}
            icon="checkmark-done"
            pending={isPending}
            onPress={() => startTransition(acknowledge)}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { lineHeight: 22 },
  ack: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
