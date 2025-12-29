import { StyleSheet } from 'react-native';
import {
  borderRadius,
  colors,
  semanticRadii,
  shadows,
  spacing,
} from '../../theme';
import { commonStyles } from '../common';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.s20,
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
    marginBottom: spacing.s6,
  },
  helper: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.s18,
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
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s10,
    justifyContent: 'center',
  },
  segmentButton: {
    paddingVertical: spacing.s12,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.s14,
    borderWidth: 1,
    backgroundColor: colors.glassSurface,
    borderColor: colors.glassBorderSoft,
    overflow: 'hidden',
    shadowOpacity: 0,
    elevation: 0,
  },
  segmentButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.s20,
  },
});
