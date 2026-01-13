import type { Theme } from '../theme';
import { theme } from '../theme';

export const createCommonStyles = (theme: Theme) => ({
  card: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.s20,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    ...theme.shadows.input,
  },
  chip: {
    paddingHorizontal: theme.spacing.s12,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  badge: {
    paddingHorizontal: theme.spacing.s12,
    paddingVertical: theme.spacing.s6,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const commonStyles = createCommonStyles(theme);
