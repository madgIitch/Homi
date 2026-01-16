import { StyleSheet } from 'react-native';
import { colors, sizes, spacing } from '../../theme';

export const styles = StyleSheet.create({
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
  content: {
    flex: 1,
  },
  footer: {
    paddingBottom: spacing.s20,
  },
});
