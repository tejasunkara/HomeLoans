import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { DocumentsProvider } from '@/features/documents/DocumentsProvider';
import { LoanProvider } from '@/features/loan/LoanProvider';
import { resources } from '@/services/api';
import { Button } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Suspense fallback={<Loading />}>
        <LoanProvider>
          <DocumentsProvider>
            <Stack
              screenOptions={{
                headerTintColor: colors.primary,
                headerTitleStyle: { color: colors.text },
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="document/[id]" options={{ title: 'Document' }} />
              <Stack.Screen name="disclosures/[id]" options={{ title: 'Disclosure' }} />
            </Stack>
          </DocumentsProvider>
        </LoanProvider>
      </Suspense>
    </>
  );
}

function Loading() {
  return (
    <View style={styles.center} accessibilityLabel="Loading your loan">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={type.caption}>Loading your loan…</Text>
    </View>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.center}>
      <Text style={type.heading}>We couldn’t load your loan</Text>
      <Text style={[type.caption, { textAlign: 'center' }]}>{error.message}</Text>
      <Button
        label="Try again"
        icon="refresh"
        onPress={() => {
          resources.invalidate();
          retry();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
});
