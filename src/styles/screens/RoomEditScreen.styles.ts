import { StyleSheet } from 'react-native';
import type { Theme } from '../../theme';
import { createCommonStyles } from '../common';

export const styles = (theme: Theme) => {
  const commonStyles = createCommonStyles(theme);
  const { colors, spacing, sizes, borderRadius, semanticRadii, semanticSizes } = theme;
  return StyleSheet.create({
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
    width: semanticSizes.control,
    height: semanticSizes.control,
    borderRadius: borderRadius.s18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassSurface,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s6,
  },
  headerActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  headerSpacer: {
    width: spacing.s40,
  },
  content: {
    flex: 1,
    padding: spacing.s20,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s10,
  },
  photoTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: spacing.s6,
    right: spacing.s6,
    width: sizes.s22,
    height: sizes.s22,
    borderRadius: 11,
    backgroundColor: colors.overlayDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: '700',
  },
  addPhotoTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  addPhotoText: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary,
  },
  addPhotoLabel: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  photoHint: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textSecondary,
  },
  choiceContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  choiceTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  choiceSubtitle: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.textSecondary,
  },
  choiceGrid: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  choiceCard: {
    borderRadius: semanticRadii.card,
    borderWidth: 1,
    borderColor: colors.lavenderBorder,
    backgroundColor: colors.glassUltraLightAlt,
    padding: spacing.md,
    gap: spacing.s10,
  },
  choiceCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  choiceCardText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  commonAreaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s10,
  },
  commonAreaChip: {
    ...commonStyles.chip,
  },
  commonAreaChipActive: {
    borderColor: colors.chipSelectedBorder,
    backgroundColor: colors.chipSelectedBackground,
  },
  commonAreaChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  commonAreaChipTextActive: {
    color: colors.chipSelectedText,
  },
  flatList: {
    gap: spacing.s12,
  },
  flatOption: {
    borderRadius: semanticRadii.soft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.s12,
    backgroundColor: colors.background,
  },
  flatOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  flatOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  flatOptionTitleActive: {
    color: colors.primary,
  },
  flatOptionSubtitle: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textSecondary,
  },
  flatEmptyText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  switchRow: {
    flexDirection: 'row',
    gap: spacing.s10,
    marginBottom: spacing.sm,
  },
  switchButton: {
    flex: 1,
    paddingVertical: spacing.s10,
    borderRadius: semanticRadii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
  },
  switchButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  switchButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  switchButtonTextActive: {
    color: colors.background,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statusToggle: {
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s6,
    borderRadius: semanticRadii.pill,
    backgroundColor: colors.primarySoftAlt,
  },
  statusToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.s10,
    fontSize: 14,
    color: colors.textSecondary,
  },
  });
};
