import { StyleSheet } from 'react-native';
import type { Theme } from '../../theme';
import { createCommonStyles } from '../common';

export const styles = (theme: Theme) => {
  const commonStyles = createCommonStyles(theme);
  const { colors, spacing, borderRadius, semanticRadii, semanticSizes } = theme;
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
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
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
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
  },
  content: {
    flex: 1,
    padding: spacing.s20,
  },
  categoryCard: {
    borderRadius: semanticRadii.card,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
    padding: spacing.md,
    gap: spacing.s10,
    marginBottom: spacing.s12,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.s6,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s6,
  },
  categoryChip: {
    ...commonStyles.chip,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
  },
  categoryChipActive: {
    borderColor: colors.chipSelectedBorder,
    backgroundColor: colors.chipSelectedBackground,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  categoryChipTextActive: {
    color: colors.chipSelectedText,
  },
  customRow: {
    marginTop: spacing.s10,
    gap: spacing.s10,
  },
  addPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.s14,
    paddingVertical: spacing.s8,
    borderRadius: semanticRadii.pill,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primaryTint,
  },
  addPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  customColumn: {
    flex: 1,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  servicesCard: {
    borderRadius: semanticRadii.card,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
    padding: spacing.md,
    gap: spacing.s10,
    marginBottom: spacing.md,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.s12,
    borderRadius: semanticRadii.soft,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  priceRow: {
    marginTop: spacing.s6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s6,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priceInput: {
    minWidth: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    borderRadius: borderRadius.s14,
    fontSize: 12,
    color: colors.text,
    backgroundColor: colors.background,
  },
  priceUnit: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.s14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorSoft,
  },
  });
};
