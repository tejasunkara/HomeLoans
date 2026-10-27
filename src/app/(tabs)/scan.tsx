import { UploadWizard } from '@/features/upload/UploadWizard';
import { Screen } from '@/ui/components';

export default function ScanScreen() {
  return (
    <Screen title="Scan & Upload" subtitle="Capture paperwork and send it securely">
      <UploadWizard />
    </Screen>
  );
}
