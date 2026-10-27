import { FolderBrowser, RecentFiles } from '@/features/documents/components';
import { Screen } from '@/ui/components';

export default function DocumentsScreen() {
  return (
    <Screen title="Documents" subtitle="Everything shared between you and your loan team">
      <RecentFiles />
      <FolderBrowser />
    </Screen>
  );
}
