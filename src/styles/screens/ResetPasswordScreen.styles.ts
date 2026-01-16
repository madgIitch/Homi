import { StyleSheet } from 'react-native';
import type { Theme } from '../../theme';
import { createCommonStyles } from '../common';

export const styles = (theme: Theme) => {
  const commonStyles = createCommonStyles(theme);
  const { colors, spacing, semanticRadii } = theme;
  return StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.surfaceMutedAlt,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    flexGrow: 1,
  },
  transparentBackground: {
    backgroundColor: 'transparent',
  },
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  statusText: {
    marginLeft: spacing.s10,
    fontSize: 14,
  },
  notice: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
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
  });
};
