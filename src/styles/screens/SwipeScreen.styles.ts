import { StyleSheet } from 'react-native';
import {
  borderRadius,
  colors,
  semanticRadii,
  semanticSizes,
  sizes,
  spacing,
} from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceMutedAlt,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.s20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textStrong,
    letterSpacing: -0.3,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s10,
  },
  glassCard: {
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  glassChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s6,
    paddingHorizontal: spacing.s12,
    height: semanticSizes.chipHeight,
    borderRadius: semanticRadii.chip,
    overflow: 'hidden',
  },
  glassButton: {
    height: semanticSizes.buttonHeight,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.s12,
    overflow: 'hidden',
  },
  glassFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glassLight,
  },
  counterChip: {
    height: sizes.s32,
  },
  counterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textStrong,
  },
  filterButton: {
    width: semanticSizes.control,
    height: semanticSizes.control,
    borderRadius: borderRadius.s18,
    paddingHorizontal: 0,
  },
  cardsArea: {
    flex: 1,
    justifyContent: 'center',
  },
  stack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: {
    position: 'absolute',
  },
  profileCard: {
    flex: 1,
  },
  profileImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  profileImageRadius: {
    borderRadius: borderRadius.xxl,
  },
  photoIndicators: {
    position: 'absolute',
    bottom: spacing.s12,
    left: spacing.s12,
    right: spacing.s12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.s6,
  },
  photoDot: {
    width: sizes.s18,
    height: spacing.xs,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.glassMid,
  },
  photoDotActive: {
    backgroundColor: colors.glassStrong,
  },
  photoTapOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  photoTapZone: {
    flex: 1,
  },
  profileOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.s18,
    paddingVertical: spacing.md,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  profileOverlayBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  profileOverlayFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glassSubtle,
  },
  overlayContent: {
    gap: spacing.s10,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textStrong,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textStrong,
  },
  profileBio: {
    fontSize: 14.5,
    color: colors.textSubtle,
    lineHeight: 20,
  },
  profileButton: {
    justifyContent: 'space-between',
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textStrong,
  },
  actionDock: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.s12,
    paddingVertical: spacing.s12,
    paddingHorizontal: spacing.s18,
    borderRadius: borderRadius.s28,
    zIndex: 10,
    elevation: 6,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  actionButton: {
    width: semanticSizes.ctaButton,
    height: semanticSizes.ctaButton,
    borderRadius: borderRadius.s27,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textStrong,
    marginTop: spacing.s12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: spacing.s6,
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: spacing.s12,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textStrong,
  },
  limitOverlay: {
    position: 'absolute',
    bottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.s10,
    borderRadius: semanticRadii.pill,
    backgroundColor: colors.glassOverlay,
  },
  limitText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textStrong,
  },
});
