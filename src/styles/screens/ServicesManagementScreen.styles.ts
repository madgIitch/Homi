import { StyleSheet } from 'react-native';
import { borderRadius, colors, semanticRadii, spacing } from '../../theme';
import { commonStyles } from '../common';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  content: {
    flex: 1,
    padding: spacing.s20,
  },
  categoryBlock: {
    marginBottom: spacing.md,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s10,
  },
  categoryChip: {
    ...commonStyles.chip,
  },
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  categoryChipTextActive: {
    color: colors.primary,
  },
  customRow: {
    marginTop: spacing.s12,
    gap: spacing.s10,
  },
  customColumn: {
    flex: 1,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  serviceList: {
    marginBottom: spacing.md,
    gap: spacing.s10,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.s12,
    borderRadius: semanticRadii.soft,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
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
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    fontSize: 12,
    color: colors.text,
  },
  priceUnit: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  removeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
});
