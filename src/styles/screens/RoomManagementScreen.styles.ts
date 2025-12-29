import { StyleSheet } from 'react-native';
import { borderRadius, colors, semanticRadii, sizes, spacing } from '../../theme';
import { commonStyles } from '../common';

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
  headerActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  headerSpacer: {
    width: spacing.s40,
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
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primaryTint,
  },
  flatChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  flatChipTextActive: {
    color: colors.primary,
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
    borderRadius: semanticRadii.card,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassUltraLightAlt,
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
  roomCard: {
    marginTop: spacing.s12,
    borderRadius: borderRadius.s18,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassMid,
    padding: spacing.s12,
    shadowOpacity: 0,
    elevation: 0,
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
    color: colors.text,
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
    borderRadius: semanticRadii.card,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassUltraLight,
    paddingHorizontal: spacing.s18,
    paddingVertical: spacing.s16,
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
    color: colors.textSecondary,
  },
  statusAvailable: {
    backgroundColor: colors.successLight,
  },
  statusPaused: {
    backgroundColor: colors.errorSoft,
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
    backgroundColor: colors.glassSurface,
  },
  actionButtonPrimary: {
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primaryTint,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
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
