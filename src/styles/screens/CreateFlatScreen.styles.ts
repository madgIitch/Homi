import { StyleSheet } from 'react-native';
import { borderRadius, colors, semanticRadii, spacing } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceMutedAlt,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  headerFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glassUltraLightAlt,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.s18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    flex: 1,
    padding: spacing.s20,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.s10,
  },
  sectionHint: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textSecondary,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.s10,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.s10,
    borderRadius: semanticRadii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  segmentButtonActive: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryMuted,
  },
  segmentButtonDisabled: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
  },
  segmentButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentButtonTextActive: {
    color: colors.primary,
  },
  segmentButtonTextDisabled: {
    color: colors.textTertiary,
  },
});
