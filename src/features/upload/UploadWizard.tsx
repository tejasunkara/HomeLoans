import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { startTransition, useActionState, useMemo, useOptimistic, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useDocuments } from '@/features/documents/DocumentsProvider';
import { formatFileSize } from '@/lib/format';
import { api } from '@/services/api';
import type { DocumentCategory, ScannedPage } from '@/types';
import { Banner, Button, Card } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';

import { pickPages } from './pickers';
import {
  MAX_PAGES,
  STEPS,
  createUploadAction,
  initialUploadState,
  type UploadIntent,
  type UploadState,
} from './uploadAction';

const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'income', label: 'Income' },
  { value: 'assets', label: 'Assets' },
  { value: 'identity', label: 'ID' },
  { value: 'property', label: 'Property' },
  { value: 'other', label: 'Other' },
];

const PENDING_LABEL: Partial<Record<UploadIntent['type'], string>> = {
  'add-pages': 'Adding pages…',
  submit: 'Uploading…',
};

export function UploadWizard() {
  const { addDocument } = useDocuments();
  const action = useMemo(
    () => createUploadAction({ pickPages, upload: api.uploadDocument, onUploaded: addDocument }),
    [addDocument],
  );
  const [state, dispatchAction, isPending] = useActionState(action, initialUploadState);

  // Which intent is in flight. Reverts to null on its own when the Action settles.
  const [pendingIntent, setPendingIntent] = useOptimistic<UploadIntent['type'] | null>(null);

  const dispatch = (intent: UploadIntent) =>
    startTransition(() => {
      setPendingIntent(intent.type);
      dispatchAction(intent);
    });

  const pendingLabel = isPending && pendingIntent ? PENDING_LABEL[pendingIntent] : undefined;

  if (state.step === 'done') {
    return <UploadComplete state={state} onReset={() => dispatch({ type: 'reset' })} />;
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <StepIndicator current={state.step} />
      {state.error ? <Banner tone="error" message={state.error} /> : null}
      {state.step === 'capture' ? (
        <CaptureStep
          pages={state.pages}
          pendingLabel={pendingLabel}
          isPending={isPending}
          dispatch={dispatch}
        />
      ) : state.step === 'details' ? (
        // Keyed so the form re-seeds when returning from review.
        <DetailsStep key={`${state.name}|${state.category}`} state={state} isPending={isPending} dispatch={dispatch} />
      ) : (
        <ReviewStep state={state} pendingLabel={pendingLabel} isPending={isPending} dispatch={dispatch} />
      )}
    </View>
  );
}

type Dispatch = (intent: UploadIntent) => void;

function StepIndicator({ current }: { current: (typeof STEPS)[number] }) {
  const labels = { capture: 'Scan', details: 'Details', review: 'Review' } as const;
  const index = STEPS.indexOf(current);
  return (
    <View
      style={styles.steps}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${index + 1} of ${STEPS.length}: ${labels[current]}`}
    >
      {STEPS.map((step, i) => (
        <View key={step} style={styles.step}>
          <View style={[styles.stepDot, i <= index && styles.stepDotActive]}>
            {i < index ? (
              <Ionicons name="checkmark" size={14} color={colors.primaryText} />
            ) : (
              <Text style={[styles.stepNumber, i <= index && { color: colors.primaryText }]}>{i + 1}</Text>
            )}
          </View>
          <Text style={[type.caption, i === index && { color: colors.text, fontWeight: '600' }]}>
            {labels[step]}
          </Text>
        </View>
      ))}
    </View>
  );
}

function CaptureStep({
  pages,
  pendingLabel,
  isPending,
  dispatch,
}: {
  pages: ScannedPage[];
  pendingLabel?: string;
  isPending: boolean;
  dispatch: Dispatch;
}) {
  return (
    <>
      <Card>
        <Text style={type.heading}>Add pages</Text>
        <Text style={type.caption}>
          Lay the document flat in good light. Multi-page documents are combined into one PDF (up to {MAX_PAGES} pages).
        </Text>
        <Button
          label={pendingLabel ?? 'Scan with camera'}
          icon="camera"
          pending={isPending}
          onPress={() => dispatch({ type: 'add-pages', source: 'camera' })}
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Button
              label="Photos"
              icon="images-outline"
              variant="secondary"
              disabled={isPending}
              onPress={() => dispatch({ type: 'add-pages', source: 'library' })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Files"
              icon="folder-outline"
              variant="secondary"
              disabled={isPending}
              onPress={() => dispatch({ type: 'add-pages', source: 'files' })}
            />
          </View>
        </View>
      </Card>

      {pages.length > 0 ? (
        <Card>
          <Text style={type.heading}>
            {pages.length} {pages.length === 1 ? 'page' : 'pages'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
            {pages.map((page, i) => (
              <View key={`${page.uri}-${i}`} style={styles.thumb}>
                {page.mimeType.startsWith('image/') ? (
                  <Image source={{ uri: page.uri }} style={styles.thumbImage} accessibilityIgnoresInvertColors />
                ) : (
                  <View style={[styles.thumbImage, styles.thumbFile]}>
                    <Ionicons name="document-outline" size={28} color={colors.primary} />
                  </View>
                )}
                <Text style={type.caption} numberOfLines={1}>
                  {i + 1}. {formatFileSize(page.sizeBytes)}
                </Text>
                <Pressable
                  style={styles.thumbRemove}
                  onPress={() => dispatch({ type: 'remove-page', index: i })}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove page ${i + 1}`}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={22} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </Card>
      ) : null}

      <Button
        label="Continue"
        icon="arrow-forward"
        disabled={isPending || pages.length === 0}
        onPress={() => dispatch({ type: 'continue' })}
      />
    </>
  );
}

function DetailsStep({
  state,
  isPending,
  dispatch,
}: {
  state: Extract<UploadState, { step: 'details' }>;
  isPending: boolean;
  dispatch: Dispatch;
}) {
  const [name, setName] = useState(state.name);
  const [category, setCategory] = useState(state.category);

  return (
    <>
      <Card>
        <Text style={styles.label}>Document name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Bank statement — September"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Document name"
          style={styles.textInput}
          autoFocus
        />
        <Text style={styles.label}>Category</Text>
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Category">
          {CATEGORIES.map((c) => {
            const selected = c.value === category;
            return (
              <Pressable
                key={c.value}
                onPress={() => setCategory(c.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                {selected ? <Ionicons name="checkmark" size={14} color={colors.primary} /> : null}
                <Text style={[styles.chipLabel, selected && { color: colors.primary }]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button label="Back" variant="ghost" icon="arrow-back" onPress={() => dispatch({ type: 'back' })} />
        </View>
        <View style={{ flex: 2 }}>
          <Button
            label="Review"
            icon="arrow-forward"
            pending={isPending}
            onPress={() => dispatch({ type: 'set-details', name, category })}
          />
        </View>
      </View>
    </>
  );
}

function ReviewStep({
  state,
  pendingLabel,
  isPending,
  dispatch,
}: {
  state: Extract<UploadState, { step: 'review' }>;
  pendingLabel?: string;
  isPending: boolean;
  dispatch: Dispatch;
}) {
  const totalBytes = state.pages.reduce((sum, p) => sum + p.sizeBytes, 0);
  const categoryLabel = CATEGORIES.find((c) => c.value === state.category)?.label ?? 'Other';

  return (
    <>
      <Card>
        <ReviewLine label="Name" value={state.name} />
        <ReviewLine label="Category" value={categoryLabel} />
        <ReviewLine label="Pages" value={String(state.pages.length)} />
        <ReviewLine label="Size" value={formatFileSize(totalBytes)} />
      </Card>
      <Text style={type.caption}>
        Sending shares this document with your loan team right away. Saving keeps it in “Not Sent” so you can send it later.
      </Text>
      <Button
        label={pendingLabel ?? 'Send to loan team'}
        icon="paper-plane"
        pending={isPending}
        onPress={() => dispatch({ type: 'submit', send: true })}
      />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button
            label="Back"
            variant="ghost"
            icon="arrow-back"
            disabled={isPending}
            onPress={() => dispatch({ type: 'back' })}
          />
        </View>
        <View style={{ flex: 2 }}>
          <Button
            label="Save as draft"
            variant="secondary"
            icon="save-outline"
            disabled={isPending}
            onPress={() => dispatch({ type: 'submit', send: false })}
          />
        </View>
      </View>
    </>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewLine}>
      <Text style={type.caption}>{label}</Text>
      <Text style={[type.body, { fontWeight: '600', flexShrink: 1, textAlign: 'right' }]}>{value}</Text>
    </View>
  );
}

function UploadComplete({
  state,
  onReset,
}: {
  state: Extract<UploadState, { step: 'done' }>;
  onReset: () => void;
}) {
  const sent = state.document.folder === 'my-uploads';
  return (
    <Card style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
      <Ionicons name={sent ? 'checkmark-circle' : 'save'} size={56} color={sent ? colors.success : colors.primary} />
      <Text style={type.heading} accessibilityRole="header">
        {sent ? 'Sent to your loan team' : 'Saved to Not Sent'}
      </Text>
      <Text style={[type.caption, { textAlign: 'center' }]}>
        “{state.document.name}” {sent ? 'is now in My Uploads. We’ll notify you when it’s reviewed.' : 'is waiting in Not Sent until you’re ready.'}
      </Text>
      <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
        <Button
          label="View document"
          variant="secondary"
          icon="document-text-outline"
          onPress={() => router.push({ pathname: '/document/[id]', params: { id: state.document.id } })}
        />
        <Button label="Upload another" icon="add" onPress={onReset} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', justifyContent: 'space-between' },
  step: { flex: 1, alignItems: 'center', gap: spacing.xs },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepNumber: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  row: { flexDirection: 'row', gap: spacing.sm },
  thumbs: { gap: spacing.md },
  thumb: { width: 92, gap: spacing.xs },
  thumbImage: { width: 92, height: 120, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
  thumbFile: { alignItems: 'center', justifyContent: 'center' },
  thumbRemove: { position: 'absolute', top: -8, right: -8, backgroundColor: colors.surface, borderRadius: 12 },
  label: { ...type.caption, fontWeight: '500' },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 46,
    fontSize: 16,
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  chipLabel: { fontSize: 14, color: colors.text },
  reviewLine: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
});
