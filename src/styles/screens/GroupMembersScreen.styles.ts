import { StyleSheet } from 'react-native';
import type { Theme } from '../../theme';
import { createCommonStyles } from '../common';

export const styles = (theme: Theme) => {
  const commonStyles = createCommonStyles(theme);
  const { colors, spacing, sizes, borderRadius, semanticRadii } = theme;
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.surfaceMutedAlt,
    },
    container: {
      flex: 1,
      backgroundColor: colors.surfaceMutedAlt,
    },
    background: {
      ...StyleSheet.absoluteFillObject,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorderSoft,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    headerSpacer: {
      width: sizes.s32,
    },
    headerButton: {
      width: sizes.s32,
      height: sizes.s32,
      borderRadius: semanticRadii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.glassBorderSoft,
      backgroundColor: colors.glassSurface,
    },
    content: {
      padding: spacing.s20,
      gap: spacing.s12,
    },
    infoCard: {
      borderRadius: semanticRadii.card,
      borderWidth: 1,
      borderColor: colors.glassBorderSoft,
      backgroundColor: colors.glassUltraLightAlt,
      padding: spacing.s16,
      gap: spacing.xs,
    },
    infoText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    memberCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.s12,
      padding: spacing.s12,
      borderRadius: semanticRadii.card,
      borderWidth: 1,
      borderColor: colors.glassBorderSoft,
      backgroundColor: colors.glassSurface,
    },
    avatar: {
      width: sizes.s40,
      height: sizes.s40,
      borderRadius: semanticRadii.pill,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.glassBorderSoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: semanticRadii.pill,
    },
    avatarText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
    },
    memberInfo: {
      flex: 1,
      gap: spacing.xs,
    },
    memberName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    roleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    roleBadge: {
      paddingHorizontal: spacing.s10,
      paddingVertical: spacing.xxs,
      borderRadius: semanticRadii.pill,
      borderWidth: 1,
    },
    roleOwner: {
      borderColor: colors.primaryMuted,
      backgroundColor: colors.primarySoft,
    },
    roleAdmin: {
      borderColor: colors.warningLight,
      backgroundColor: colors.warningLight,
    },
    roleMember: {
      borderColor: colors.glassBorderSoft,
      backgroundColor: colors.glassUltraLightAlt,
    },
    roleText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textStrong,
    },
    youBadge: {
      ...commonStyles.chip,
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.s10,
      borderColor: colors.primaryMuted,
      backgroundColor: colors.primarySoft,
    },
    youText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
    },
    memberActions: {
      alignItems: 'flex-end',
      gap: spacing.xs,
    },
    removeButton: {
      paddingHorizontal: spacing.s10,
      paddingVertical: spacing.xxs,
      borderRadius: semanticRadii.pill,
      borderWidth: 1,
      borderColor: colors.errorBorder,
      backgroundColor: colors.errorSoft,
    },
    removeButtonText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.error,
    },
    footer: {
      paddingHorizontal: spacing.s20,
      paddingBottom: spacing.s20,
    },
    leaveButton: {
      paddingVertical: spacing.s10,
      borderRadius: semanticRadii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.errorBorder,
      backgroundColor: colors.errorSoft,
    },
    leaveButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.error,
    },
    loadingRow: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
  });
};
