import { Dimensions, StyleSheet } from 'react-native';
import type { Theme } from '../../theme';

export const styles = (theme: Theme) => {
  const { colors, spacing, sizes, borderRadius, semanticRadii, shadows } = theme;
  return StyleSheet.create({
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
      gap: spacing.sm,
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
    cardNameOverlay: {
      position: 'absolute',
      bottom: 175,
      left: spacing.s18,
      right: spacing.s18,
      paddingVertical: spacing.s12,
      zIndex: 10,
    },
    cardNameText: {
      fontSize: Dimensions.get('window').width < 360 ? 20 : 24,
      fontWeight: '700',
      color: '#FFFFFF',
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
    imageBadge: {
      position: 'absolute',
      top: spacing.s12,
      left: spacing.s12,
      paddingHorizontal: spacing.s10,
      paddingVertical: spacing.xs,
      borderRadius: semanticRadii.pill,
      backgroundColor: colors.glassOverlayStrong,
    },
    budgetBadge: {
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
    budgetBadgeText: {
      fontSize: Dimensions.get('window').width < 360 ? 10 : 11,
      fontWeight: '600',
      color: colors.textStrong,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    tagRowNoWrap: {
      flexWrap: 'nowrap',
    },
    tag: {
      borderWidth: 1,
      borderColor: colors.glassBorderSoft,
    },
    tagContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    tagText: {
      fontSize: Dimensions.get('window').width < 360 ? 11 : 12,
      fontWeight: '600',
      color: colors.textStrong,
    },
    roomPreviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.s10,
    },
    roomPreviewThumb: {
      width: sizes.s48,
      height: sizes.s48,
      borderRadius: borderRadius.md,
    },
    roomPreviewPlaceholder: {
      width: sizes.s48,
      height: sizes.s48,
      borderRadius: borderRadius.md,
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
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: semanticRadii.pill,
      backgroundColor: colors.glassOverlay,
    },
    roomPreviewCountText: {
      fontSize: Dimensions.get('window').width < 360 ? 10 : 11,
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
    profileButtonText: {
      fontSize: Dimensions.get('window').width < 360 ? 12 : 13,
      fontWeight: '600',
      color: colors.textStrong,
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
  });
};
