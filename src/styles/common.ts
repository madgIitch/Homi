import { borderRadius, colors, shadows, spacing } from '../theme';

export const commonStyles = {
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.s20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    ...shadows.input,
  },
  chip: {
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  badge: {
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s6,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
};
