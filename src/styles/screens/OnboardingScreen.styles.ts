import { StyleSheet } from 'react-native';
import { borderRadius, colors, spacing } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceMutedAlt,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  stepContent: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    fontSize: 12,
    fontWeight: '600',
  },
  skipTextButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  skipTextButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepProgress: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  stepHeader: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.s10,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  glassCard: {
    borderRadius: borderRadius.s28,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.s10,
    overflow: 'hidden',
    shadowColor: colors.shadowDark,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glassUltraLightAlt,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  inlineLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchHint: {
    fontSize: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.s10,
    paddingVertical: spacing.s6,
  },
  toggleCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: spacing.s12,
  },
  roleCenter: {
    flexGrow: 1,
    gap: spacing.s12,
  },
  inviteNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.s12,
    borderRadius: borderRadius.s18,
    backgroundColor: colors.glassSurface,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
  },
  inviteNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  roleCard: {
    flex: 1,
    borderRadius: borderRadius.s28,
    borderWidth: 1,
    minHeight: 92,
    paddingVertical: spacing.s12,
    paddingHorizontal: spacing.s12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
    shadowColor: colors.shadowDark,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  roleCardActive: {
    borderWidth: 1.5,
    borderColor: colors.textBorderSoft,
  },
  roleCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  roleCardDisabled: {
    opacity: 0.6,
  },
  roleCardTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glassSurface,
  },
  roleCardTintActive: {
    backgroundColor: colors.glassOverlay,
  },
  roleCardText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  policyRow: {
    flexDirection: 'row',
    gap: spacing.s10,
  },
  policyButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.s18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyButtonActive: {
    borderColor: colors.textBorderSoft,
  },
  policyButtonPressed: {
    transform: [{ scale: 0.99 }],
  },
  policyButtonDisabled: {
    opacity: 0.5,
  },
  policyText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  budgetValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  sliderContainer: {
    marginTop: spacing.s10,
    height: 44,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.glassBorderSoft,
  },
  sliderTrackActive: {
    position: 'absolute',
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.text,
  },
  sliderThumb: {
    position: 'absolute',
    top: -7,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.textBorderSoft,
    backgroundColor: colors.glassOverlay,
  },
  footer: {
    marginTop: 'auto',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  photoPreview: {
    width: '100%',
    aspectRatio: 1.2,
    borderRadius: borderRadius.s24,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    overflow: 'hidden',
    backgroundColor: colors.glassSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  photoPlaceholderText: {
    fontSize: 12,
    fontWeight: '500',
  },
  photoHint: {
    fontSize: 12,
    textAlign: 'center',
  },
  photoActions: {
    gap: spacing.sm,
  },
  helperText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
