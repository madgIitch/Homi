import { StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
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
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.s12,
  },
  ruleOptions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s10,
  },
  ruleBlock: {
    marginTop: spacing.s12,
  },
  ruleBlockLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ruleOptionChip: {
    ...commonStyles.chip,
  },
  ruleOptionChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  ruleOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  ruleOptionTextActive: {
    color: colors.primary,
  },
});
