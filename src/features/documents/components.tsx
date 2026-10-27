import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { startTransition, useActionState, useState, useTransition } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/lib/errors';
import { formatFileSize, formatRelative } from '@/lib/format';
import type { DocumentStatus, FolderId, LoanDocument } from '@/types';
import { Banner, Button, Card, EmptyState, SegmentedControl, type IconName } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';

import { useDocuments } from './DocumentsProvider';
import { FOLDERS, documentsInFolder, folderCounts } from './reducer';

const STATUS: Record<DocumentStatus, { label: string; icon: IconName; fg: string; bg: string }> = {
  draft: { label: 'Draft', icon: 'create-outline', fg: colors.textMuted, bg: colors.surfaceMuted },
  uploading: { label: 'Sending…', icon: 'cloud-upload-outline', fg: colors.primary, bg: colors.primaryMuted },
  submitted: { label: 'Submitted', icon: 'paper-plane-outline', fg: colors.primary, bg: colors.primaryMuted },
  'under-review': { label: 'In review', icon: 'time-outline', fg: colors.warning, bg: colors.warningMuted },
  accepted: { label: 'Accepted', icon: 'checkmark-circle-outline', fg: colors.success, bg: colors.successMuted },
  rejected: { label: 'Needs attention', icon: 'alert-circle-outline', fg: colors.danger, bg: colors.dangerMuted },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const s = STATUS[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]} accessibilityLabel={`Status: ${s.label}`}>
      <Ionicons name={s.icon} size={13} color={s.fg} />
      <Text style={[styles.badgeLabel, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

export function DocumentRow({ document, onSend }: { document: LoanDocument; onSend?: () => void }) {
  return (
    <View style={styles.row}>
      <Link href={{ pathname: '/document/[id]', params: { id: document.id } }} asChild>
        <Pressable
          style={styles.rowMain}
          accessibilityRole="button"
          accessibilityLabel={`${document.name}, ${STATUS[document.status].label}`}
          accessibilityHint="Opens document details"
        >
          <View style={styles.fileIcon}>
            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={type.body} numberOfLines={1}>
              {document.name}
            </Text>
            <Text style={type.caption}>
              {document.pageCount} {document.pageCount === 1 ? 'page' : 'pages'} ·{' '}
              {formatFileSize(document.sizeBytes)} · {formatRelative(document.updatedAt)}
            </Text>
          </View>
          <StatusBadge status={document.status} />
        </Pressable>
      </Link>
      {onSend ? (
        <Button label="Send to loan team" icon="paper-plane" variant="secondary" onPress={onSend} />
      ) : null}
    </View>
  );
}

export function FolderBrowser() {
  const { documents, refresh, sendDocument } = useDocuments();
  const [folder, setFolder] = useState<FolderId>('my-uploads');
  const [isRefreshing, startRefresh] = useTransition();
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Owned here rather than by the row: the optimistic move unmounts the row,
  // and a failure message must outlive it. Sends queue in order.
  const [sendError, send] = useActionState<string | null, LoanDocument>(async (_prev, document) => {
    try {
      await sendDocument(document.id);
      return null;
    } catch (e) {
      return `Couldn’t send “${document.name}”. ${errorMessage(e)}`;
    }
  }, null);

  const counts = folderCounts(documents);
  const visible = documentsInFolder(documents, folder);
  const current = FOLDERS.find((f) => f.value === folder)!;

  return (
    <View style={{ gap: spacing.md }}>
      <SegmentedControl
        accessibilityLabel="Document folders"
        value={folder}
        onChange={setFolder}
        options={FOLDERS.map((f) => ({ value: f.value, label: f.label, badge: counts[f.value] }))}
      />
      {sendError ? <Banner tone="error" message={sendError} /> : null}
      <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
        {visible.length === 0 ? (
          <EmptyState icon="folder-open-outline" title={`${current.label} is empty`} message={current.empty} />
        ) : (
          visible.map((d, i) => (
            <View key={d.id} style={i > 0 && styles.divider}>
              <DocumentRow
                document={d}
                onSend={d.folder === 'not-sent' ? () => startTransition(() => send(d)) : undefined}
              />
            </View>
          ))
        )}
      </Card>
      {refreshError ? <Banner tone="error" message={refreshError} /> : null}
      <Button
        label={isRefreshing ? 'Checking for updates…' : 'Check for updates'}
        icon="refresh"
        variant="ghost"
        pending={isRefreshing}
        onPress={() =>
          startRefresh(async () => {
            try {
              setRefreshError(null);
              await refresh();
            } catch (e) {
              startRefresh(() => setRefreshError(errorMessage(e)));
            }
          })
        }
      />
    </View>
  );
}

export function RecentFiles() {
  const { recentFiles, documents } = useDocuments();
  const available = recentFiles.filter((r) => documents.some((d) => d.id === r.id));

  if (available.length === 0) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={type.heading} accessibilityRole="header">
        Recent
      </Text>
      <View style={styles.recentList}>
        {available.slice(0, 6).map((r) => (
          <Link key={r.id} href={{ pathname: '/document/[id]', params: { id: r.id } }} asChild>
            <Pressable
              style={styles.recentChip}
              accessibilityRole="button"
              accessibilityLabel={`Recent file ${r.name}, opened ${formatRelative(r.openedAt)}`}
            >
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
              <Text style={styles.recentLabel} numberOfLines={1}>
                {r.name}
              </Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  );
}

export function InlineSpinner({ label }: { label: string }) {
  return (
    <View style={styles.inlineSpinner} accessibilityLabel={label}>
      <ActivityIndicator color={colors.primary} />
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeLabel: { fontSize: 12, fontWeight: '600' },
  row: { paddingVertical: spacing.md, gap: spacing.sm },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: 2 },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  recentList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  recentLabel: { ...type.caption, color: colors.text, flexShrink: 1 },
  inlineSpinner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
});
