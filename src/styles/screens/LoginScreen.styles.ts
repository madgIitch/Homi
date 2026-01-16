import { StyleSheet } from 'react-native';
import type { Theme } from '../../theme';
import { createCommonStyles } from '../common';

export const styles = (theme: Theme) => {
  const commonStyles = createCommonStyles(theme);
  const { colors, spacing, sizes } = theme;
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
    alignItems: 'center',
    marginTop: spacing.s40,
    marginBottom: spacing.xl,
  },
  logoImage: {
    width: sizes.s72,
    height: sizes.s72,
    marginBottom: spacing.s10,
  },
  logoImageMuted: {
    opacity: 0.85,
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 12,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    ...commonStyles.input,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  });
};
