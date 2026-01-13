import { StyleSheet } from 'react-native';
import type { Theme } from '../../theme';
import { createCommonStyles } from '../common';

export const styles = (theme: Theme) => {
  const commonStyles = createCommonStyles(theme);
  const { colors, spacing, semanticRadii } = theme;
  return StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.s20,
    paddingTop: spacing.s20,
    paddingBottom: spacing.s40,
    justifyContent: 'flex-start',
  },
  card: {
    ...commonStyles.card,
    backgroundColor: colors.glassSurface,
    borderColor: colors.glassBorderSoft,
    borderRadius: semanticRadii.sheet,
    padding: spacing.s18,
    gap: spacing.s12,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  stepper: {
    height: 6,
    borderRadius: semanticRadii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassSurface,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  progressFill: {
    height: '100%',
    borderRadius: semanticRadii.pill,
  },
  divider: {
    height: 1,
    backgroundColor: colors.glassBorderSoft,
  },
  input: {
    ...commonStyles.input,
    marginBottom: spacing.md,
    fontSize: 16,
    borderColor: colors.glassBorderSoft,
    backgroundColor: colors.glassUltraLightAlt,
    paddingVertical: spacing.s12,
    borderRadius: semanticRadii.soft,
    shadowOpacity: 0,
    elevation: 0,
  },
  errorText: {
    fontSize: 14,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  authButtons: {
    marginBottom: spacing.sm,
  },
  });
};
