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
  rulesCard: {
    borderRadius: semanticRadii.card,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
    padding: spacing.md,
    gap: spacing.s12,
  },
  compactLabel: {
    marginBottom: spacing.s10,
  },
  compactChipContainer: {
    gap: spacing.s6,
  },
  compactChip: {
    paddingHorizontal: spacing.s10,
    paddingVertical: spacing.s6,
  },
  compactChipText: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.s12,
  },
  ruleOptions: {
    marginTop: spacing.s6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s6,
  },
  ruleBlock: {
    marginTop: spacing.s10,
  },
  ruleBlockLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ruleBlockSubtitle: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textTertiary,
  },
  ruleOptionChip: {
    ...commonStyles.chip,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
    paddingHorizontal: spacing.s10,
    paddingVertical: spacing.s6,
  },
  ruleOptionChipActive: {
    borderColor: colors.chipSelectedBorder,
    backgroundColor: colors.chipSelectedBackground,
  },
  ruleOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  ruleOptionTextActive: {
    color: colors.chipSelectedText,
  },
  textAreaInput: {
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: borderRadius.s14,
  },
  textAreaLabel: {
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 12,
  },
  });
};
