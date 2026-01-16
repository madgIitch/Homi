import { Dimensions, StyleSheet } from 'react-native';
import type { Theme } from '../../theme';

export const styles = (theme: Theme) => {
  const { colors, spacing, sizes, borderRadius, semanticRadii, semanticSizes, shadows } =
    theme;
  return StyleSheet.create({
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
    justifyContent: 'space-between',
  },
  header: {
    paddingBottom: spacing.s8,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s12,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s10,
  },
  title: {
    fontSize: Dimensions.get('window').width < 360 ? 18 : 20,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: colors.textStrong,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: Dimensions.get('window').width < 360 ? 11 : 12.5,
    color: colors.textLight,
  },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s6,
    paddingHorizontal: spacing.s10,
    height: sizes.s32,
    borderRadius: borderRadius.s18,
    backgroundColor: colors.glassOverlayStrong,
  },
  counterBadgePremium: {
    backgroundColor: colors.glassSurface,
  },
  counterText: {
    fontSize: Dimensions.get('window').width < 360 ? 12 : 13,
    fontWeight: '600',
    color: colors.textStrong,
  },
  counterTextPremium: {
    color: colors.textStrong,
  },
  filterButton: {
    width: semanticSizes.control,
    height: semanticSizes.control,
    borderRadius: borderRadius.s18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassOverlayStrong,
  },
  deckStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  cardShell: {
    flex: 1,
    borderRadius: borderRadius.s28,
    backgroundColor: colors.glassUltraLightAlt,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    ...shadows.card,
    position: 'relative',
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cardImageRadius: {
    borderTopLeftRadius: borderRadius.s28,
    borderTopRightRadius: borderRadius.s28,
  },
  cardImagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassOverlayStrong,
    gap: spacing.s8,
  },
  cardImagePlaceholderText: {
    fontSize: Dimensions.get('window').width < 360 ? 11 : 12,
    fontWeight: '600',
    color: colors.textLight,
  },
  photoIndicators: {
    position: 'absolute',
    top: spacing.s12,
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
  cardInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.s18,
    paddingVertical: spacing.s12,
    gap: spacing.s10,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorderSoft,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s10,
  },
  profileName: {
    fontSize: Dimensions.get('window').width < 360 ? 18 : 20,
    fontWeight: '700',
    color: colors.textStrong,
  },
  badge: {
    paddingHorizontal: spacing.s8,
    paddingVertical: spacing.xs,
    borderRadius: semanticRadii.pill,
    backgroundColor: colors.glassOverlay,
  },
  badgeText: {
    fontSize: Dimensions.get('window').width < 360 ? 10 : 11,
    fontWeight: '600',
    color: colors.textSubtle,
  },
  imageBadge: {
    position: 'absolute',
    top: spacing.s12,
    right: spacing.s12,
    paddingHorizontal: spacing.s10,
    paddingVertical: spacing.xs,
    borderRadius: semanticRadii.pill,
    backgroundColor: colors.glassOverlayStrong,
  },
  imageBadgeText: {
    fontSize: Dimensions.get('window').width < 360 ? 10 : 11,
    fontWeight: '600',
    color: colors.textStrong,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  roomPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s10,
  },
  roomPreviewThumb: {
    width: sizes.s48,
    height: sizes.s48,
    borderRadius: borderRadius.s12,
  },
  roomPreviewPlaceholder: {
    width: sizes.s48,
    height: sizes.s48,
    borderRadius: borderRadius.s12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassOverlay,
  },
  roomPreviewInfo: {
    flex: 1,
  },
  roomPreviewTitle: {
    fontSize: Dimensions.get('window').width < 360 ? 11 : 12,
    fontWeight: '600',
    color: colors.textStrong,
  },
  roomPreviewMeta: {
    marginTop: spacing.xs,
    fontSize: Dimensions.get('window').width < 360 ? 10 : 11,
    color: colors.textSubtle,
  },
  roomPreviewCount: {
    paddingHorizontal: spacing.s8,
    paddingVertical: spacing.xs,
    borderRadius: semanticRadii.pill,
    backgroundColor: colors.glassOverlay,
  },
  roomPreviewCountText: {
    fontSize: Dimensions.get('window').width < 360 ? 10 : 11,
    fontWeight: '600',
    color: colors.textStrong,
  },
  tag: {
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
  },
  tagText: {
    fontSize: Dimensions.get('window').width < 360 ? 11 : 12,
    fontWeight: '600',
    color: colors.textStrong,
  },
  profileBio: {
    fontSize: Dimensions.get('window').width < 360 ? 12 : 13.5,
    color: colors.textSubtle,
    lineHeight: 18,
  },
  profileButton: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileButtonGlass: {
    flex: 1,
    paddingVertical: spacing.s10,
    paddingHorizontal: spacing.s12,
    borderRadius: borderRadius.s18,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glassPanel: {
    borderBottomLeftRadius: borderRadius.s28,
    borderBottomRightRadius: borderRadius.s28,
    overflow: 'hidden',
  },
  glassChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s10,
    paddingVertical: spacing.xs,
    borderRadius: semanticRadii.pill,
    overflow: 'hidden',
  },
  glassButton: {
    overflow: 'hidden',
  },
  glassFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glassLight,
  },
  profileButtonText: {
    fontSize: Dimensions.get('window').width < 360 ? 12 : 13,
    fontWeight: '600',
    color: colors.textStrong,
  },
  actionDock: {
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: spacing.s18,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
  },
  requestModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.s20,
    backgroundColor: colors.overlayDark,
  },
  requestModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  requestModalCard: {
    width: '100%',
    borderRadius: semanticRadii.sheet,
    padding: spacing.s18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.s12,
  },
  requestModalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  requestModalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  requestModalInput: {
    minHeight: sizes.s86,
    borderRadius: borderRadius.s14,
    borderWidth: 1,
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s10,
    fontSize: 14,
    textAlignVertical: 'top',
    backgroundColor: colors.surfaceLight,
  },
  requestModalActions: {
    flexDirection: 'row',
    gap: spacing.s10,
  },
  requestModalButton: {
    flex: 1,
    paddingVertical: spacing.s10,
    borderRadius: semanticRadii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestModalCancel: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestModalSend: {
    backgroundColor: colors.primary,
  },
  requestModalButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requestModalSendText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.background,
  },
  requestModalButtonDisabled: {
    opacity: 0.7,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyTitle: {
    fontSize: Dimensions.get('window').width < 360 ? 16 : 18,
    fontWeight: '600',
    color: colors.textStrong,
    marginTop: spacing.s12,
  },
  emptySubtitle: {
    fontSize: Dimensions.get('window').width < 360 ? 12 : 13,
    color: colors.textLight,
    marginTop: spacing.s6,
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: spacing.s12,
    paddingVertical: spacing.s10,
    paddingHorizontal: spacing.s12,
    borderRadius: borderRadius.s18,
    borderWidth: 1,
    borderColor: colors.textBorderSoft,
  },
  clearFiltersText: {
    fontSize: Dimensions.get('window').width < 360 ? 12 : 13,
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
    fontSize: Dimensions.get('window').width < 360 ? 11 : 12,
    fontWeight: '600',
    color: colors.textStrong,
  },
  });
};
