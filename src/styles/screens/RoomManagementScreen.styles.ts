import { StyleSheet } from 'react-native';
import type { Theme } from '../../theme';
import { createCommonStyles } from '../common';

export const styles = (theme: Theme) => {
  const commonStyles = createCommonStyles(theme);
  const { colors, spacing, sizes, borderRadius, semanticRadii } = theme;
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s6,
  },
  headerIconButton: {
    width: sizes.s36,
    height: sizes.s36,
    borderRadius: borderRadius.s18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
  },
  headerActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  headerSpacer: {
    width: spacing.s40,
  },
  pressed: {
    opacity: 0.75,
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
  flatSelector: {
    marginBottom: spacing.sm,
  },
  flatSelectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  flatChips: {
    flexDirection: 'row',
    gap: spacing.s10,
  },
  flatChip: {
    ...commonStyles.chip,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
  },
  flatChipActive: {
    borderColor: colors.chipSelectedBorder,
    backgroundColor: colors.chipSelectedBackground,
  },
  flatChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  flatChipTextActive: {
    color: colors.chipSelectedText,
  },
  flatChipAdd: {
    borderStyle: 'dashed',
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primaryTint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s6,
  },
  flatChipAddText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  createFlatCard: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.s40,
    borderRadius: semanticRadii.sheet,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
    overflow: 'hidden',
    shadowOpacity: 0,
    elevation: 0,
  },
  createFlatButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.s10,
    borderRadius: semanticRadii.pill,
    backgroundColor: colors.primary,
  },
  createFlatButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.background,
  },
  emptyStateInline: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.s12,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  detailText: {
    fontSize: 14,
    color: colors.text,
  },
  detailMeta: {
    marginTop: spacing.s6,
    fontSize: 12,
    color: colors.textSecondary,
  },
  detailEmpty: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  rulesList: {
    gap: spacing.s6,
  },
  servicesList: {
    gap: spacing.sm,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inlineAction: {
    marginTop: spacing.s12,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s6,
    borderRadius: semanticRadii.pill,
    backgroundColor: colors.primarySoftAlt,
  },
  inlineActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
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
  inviteOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  inviteCard: {
    borderRadius: semanticRadii.sheet,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    padding: spacing.lg,
    backgroundColor: colors.glassSurface,
    overflow: 'hidden',
    shadowOpacity: 0,
    elevation: 0,
  },
  inviteCardFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glassUltraLightAlt,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s10,
    marginBottom: spacing.s12,
  },
  inviteTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  inviteCodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s10,
    justifyContent: 'space-between',
  },
  inviteCodeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1.2,
    flex: 1,
  },
  inviteCopyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.xs,
    borderRadius: semanticRadii.pill,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primaryTint,
  },
  inviteCopyText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  inviteExpiresText: {
    marginTop: spacing.s10,
    fontSize: 12,
    color: colors.textSecondary,
  },
  inviteCloseButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s8,
    borderRadius: semanticRadii.pill,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inviteCloseText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  roomCard: {
    marginTop: spacing.s12,
    borderRadius: semanticRadii.sheet,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
    paddingHorizontal: spacing.s18,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    shadowOpacity: 0,
    elevation: 0,
    overflow: 'hidden',
  },
  roomCardHeader: {
    flexDirection: 'row',
    gap: spacing.s12,
    alignItems: 'center',
  },
  roomPhoto: {
    width: sizes.s72,
    height: sizes.s72,
    borderRadius: borderRadius.s14,
    backgroundColor: colors.surfaceLight,
  },
  roomPhotoPlaceholder: {
    width: sizes.s72,
    height: sizes.s72,
    borderRadius: borderRadius.s14,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomInfo: {
    flex: 1,
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textStrong,
  },
  roomMeta: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textSecondary,
  },
  content: {
    padding: spacing.s20,
    gap: spacing.md,
  },
  card: {
    borderRadius: semanticRadii.sheet,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
    paddingHorizontal: spacing.s18,
    paddingVertical: spacing.s16,
    overflow: 'hidden',
    shadowOpacity: 0,
    elevation: 0,
  },
  cardHeader: {
    marginBottom: spacing.s12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.s12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  cardMeta: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.textSecondary,
  },
  statusBadge: {
    borderRadius: semanticRadii.pill,
    height: sizes.s24,
    paddingHorizontal: spacing.s12,
    minWidth: 86,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textStrong,
  },
  statusAvailable: {
    backgroundColor: colors.successSoft,
  },
  statusPaused: {
    backgroundColor: colors.errorSoft,
  },
  statusAvailableText: {
    color: colors.successDark,
  },
  statusPausedText: {
    color: colors.errorDark,
  },
  statusReserved: {
    backgroundColor: colors.infoLight,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.s12,
    flexWrap: 'wrap',
    marginTop: spacing.s12,
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: '48%',
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    borderRadius: semanticRadii.soft,
    paddingVertical: spacing.s10,
    paddingHorizontal: spacing.s10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.s6,
    backgroundColor: colors.glassUltraLightAlt,
  },
  actionButtonPrimary: {
    borderColor: colors.primaryMuted,
    backgroundColor: colors.glassUltraLightAlt,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textStrong,
  },
  actionTextPrimary: {
    color: colors.primary,
  },
  deleteButton: {
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorSoft,
  },
  deleteButtonText: {
    color: colors.error,
  },
  });
};
