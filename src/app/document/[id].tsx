import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { startTransition, useActionState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/features/documents/components';
import { useDocument, useDocuments } from '@/features/documents/DocumentsProvider';
import { FOLDERS } from '@/features/documents/reducer';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatFileSize } from '@/lib/format';
import type { LoanDocument } from '@/types';
import { Banner, Button, Card, EmptyState, Screen } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';

const SHARE_TARGETS = [
  { id: 'Sam Patel (co-borrower)', icon: 'people-outline' },
  { id: 'Morgan Lee (real estate agent)', icon: 'home-outline' },
  { id: 'Title & escrow', icon: 'business-outline' },
] as const;

type ActionResult = { error: string | null; message: string | null };
const idle: ActionResult = { error: null, message: null };

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const document = useDocument(id);
  const { markOpened, sendDocument, deleteDocument } = useDocuments();

  // Draft actions live at the screen level: the optimistic update hides
  // <DraftActions> (or the whole document) mid-flight, and a failure must
  // still be shown once React rolls it back.
  const [sendState, send, isSending] = useActionState<ActionResult>(async () => {
    try {
      await sendDocument(id);
      return { error: null, message: 'Sent to your loan team.' };
    } catch (e) {
      return { error: errorMessage(e), message: null };
    }
  }, idle);

  const [deleteState, remove, isDeleting] = useActionState<ActionResult>(async () => {
    try {
      await deleteDocument(id);
      router.back();
      return idle;
    } catch (e) {
      return { error: errorMessage(e), message: null };
    }
  }, idle);

  const name = document?.name;
  useEffect(() => {
    if (name) markOpened({ id, name });
    // Record once per document visit, not on every status change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!document) {
    return (
      <Screen>
        <EmptyState
          icon="document-outline"
          title={isDeleting ? 'Deleting draft…' : 'Document not found'}
          message={isDeleting ? 'One moment.' : 'It may have been deleted.'}
        />
      </Screen>
    );
  }

  const error = sendState.error ?? deleteState.error;

  return (
    <Screen>
      <DocumentHeader document={document} />
      {error ? <Banner tone="error" message={error} /> : null}
      {sendState.message && document.folder !== 'not-sent' ? (
        <Banner tone="success" message={sendState.message} />
      ) : null}
      {document.folder === 'not-sent' ? (
        <DraftActions
          busy={isSending || isDeleting}
          isDeleting={isDeleting}
          onSend={() => startTransition(send)}
          onDelete={() => startTransition(remove)}
        />
      ) : null}
      <ShareSection document={document} />
    </Screen>
  );
}

function DocumentHeader({ document }: { document: LoanDocument }) {
  const folder = FOLDERS.find((f) => f.value === document.folder)?.label;
  return (
    <Card>
      <View style={styles.headerRow}>
        <Ionicons name="document-text" size={32} color={colors.primary} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={type.heading} accessibilityRole="header">
            {document.name}
          </Text>
          <Text style={type.caption}>
            {folder} · {document.pageCount} {document.pageCount === 1 ? 'page' : 'pages'} ·{' '}
            {formatFileSize(document.sizeBytes)}
          </Text>
        </View>
      </View>
      <View style={styles.headerRow}>
        <StatusBadge status={document.status} />
        <Text style={type.caption}>Updated {formatDate(document.updatedAt)}</Text>
      </View>
      {document.note ? <Banner tone="error" message={document.note} /> : null}
    </Card>
  );
}

function DraftActions({
  busy,
  isDeleting,
  onSend,
  onDelete,
}: {
  busy: boolean;
  isDeleting: boolean;
  onSend: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <Text style={type.heading}>Not sent yet</Text>
      <Text style={type.caption}>Your loan team can’t see this document until you send it.</Text>
      <Button label="Send to loan team" icon="paper-plane" disabled={busy} onPress={onSend} />
      <Button
        label="Delete draft"
        icon="trash-outline"
        variant="ghost"
        pending={isDeleting}
        disabled={busy}
        onPress={onDelete}
      />
    </Card>
  );
}

function ShareSection({ document }: { document: LoanDocument }) {
  const { shareDocument } = useDocuments();

  const [state, share, isSharing] = useActionState<ActionResult, string>(async (_prev, recipient) => {
    try {
      await shareDocument(document.id, recipient);
      return { error: null, message: `Shared with ${recipient}.` };
    } catch (e) {
      return { error: errorMessage(e), message: null };
    }
  }, idle);

  return (
    <Card>
      <Text style={type.heading} accessibilityRole="header">
        Share
      </Text>
      <Text style={type.caption}>
        Your loan team always has access. Share a copy with others involved in your purchase.
      </Text>
      {state.error ? <Banner tone="error" message={state.error} /> : null}
      {state.message ? <Banner tone="success" message={state.message} /> : null}
      {SHARE_TARGETS.map((target) => {
        // `document` comes from the optimistic list, so this flips immediately.
        const shared = document.sharedWith.includes(target.id);
        return (
          <Button
            key={target.id}
            label={shared ? `Shared · ${target.id}` : target.id}
            icon={shared ? 'checkmark-circle' : target.icon}
            variant="secondary"
            disabled={shared || isSharing}
            onPress={() => startTransition(() => share(target.id))}
          />
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
