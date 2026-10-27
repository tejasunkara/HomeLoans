import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useDocuments } from '@/features/documents/DocumentsProvider';
import { useLoan } from '@/features/loan/LoanProvider';
import type { IconName } from '@/ui/components';
import { colors } from '@/ui/theme';

const icon = (name: IconName) => {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  }
  return TabIcon;
};

export default function TabsLayout() {
  const { disclosures } = useLoan();
  const { documents } = useDocuments();
  const pendingDisclosures = disclosures.filter((d) => !d.acknowledgedAt).length;
  const notSent = documents.filter((d) => d.folder === 'not-sent').length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Loan',
          tabBarIcon: icon('home-outline'),
          tabBarBadge: pendingDisclosures || undefined,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarIcon: icon('folder-outline'),
          tabBarBadge: notSent || undefined,
        }}
      />
      <Tabs.Screen name="scan" options={{ title: 'Scan', tabBarIcon: icon('scan-outline') }} />
      <Tabs.Screen name="calculators" options={{ title: 'Calculators', tabBarIcon: icon('calculator-outline') }} />
    </Tabs>
  );
}
