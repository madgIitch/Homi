import { StyleSheet } from 'react-native';
import type { Theme } from '../../theme';

export const styles = (theme: Theme) => {
  const { borderRadius, colors, semanticRadii, semanticSizes, sizes, spacing } = theme;
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
    gap: spacing.s12,
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
  headerTitleWrap: {
    flex: 1,
  },
  headerSubtitle: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textSecondary,
  },
  headerSpacer: {
    width: semanticSizes.control,
  },
  headerBackButton: {
    width: semanticSizes.control,
    height: semanticSizes.control,
    borderRadius: borderRadius.s18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    padding: spacing.s20,
    gap: spacing.md,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  body: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.s10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  summaryCard: {
    padding: spacing.md,
    borderRadius: semanticRadii.card,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassUltraLightAlt,
    alignItems: 'center',
    gap: spacing.s6,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  summaryMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.s12,
  },
  sectionCard: {
    borderRadius: semanticRadii.card,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassUltraLightAlt,
    paddingHorizontal: spacing.s18,
    paddingVertical: spacing.s18,
    gap: spacing.s12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.s14,
    borderRadius: borderRadius.s14,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  memberMeta: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textSecondary,
  },
  memberBalanceChip: {
    paddingHorizontal: spacing.s10,
    paddingVertical: spacing.xs,
    borderRadius: semanticRadii.pill,
    borderWidth: 1,
  },
  memberBalanceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  memberBalancePositive: {
    borderColor: colors.successBorder,
    backgroundColor: colors.successSoft,
  },
  memberBalanceNegative: {
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorSoft,
  },
  memberBalancePositiveText: {
    color: colors.successDark,
  },
  memberBalanceNegativeText: {
    color: colors.errorDark,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.s12,
    borderRadius: semanticRadii.soft,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
  },
  transferText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
  },
  transferAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s6,
    paddingHorizontal: spacing.s10,
    paddingVertical: spacing.s6,
    borderRadius: semanticRadii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
  },
  transferActionDone: {
    borderColor: colors.successBorder,
    backgroundColor: colors.successSoft,
  },
  transferActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textStrong,
  },
  transferActionTextDone: {
    color: colors.successDark,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.s12,
    borderRadius: semanticRadii.soft,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
  },
  paymentText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
  },
  paymentAmountChip: {
    paddingHorizontal: spacing.s10,
    paddingVertical: spacing.xs,
    borderRadius: semanticRadii.pill,
    borderWidth: 1,
    borderColor: colors.successBorder,
    backgroundColor: colors.successSoft,
  },
  paymentAmountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.successDark,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  });
};
