import { StyleSheet } from 'react-native';
import { borderRadius, colors, semanticRadii, sizes, spacing } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceMutedAlt,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  headerFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glassUltraLightAlt,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  matchesSection: {
    paddingHorizontal: spacing.s20,
    paddingBottom: spacing.s16,
  },
  matchesSectionEmpty: {
    paddingHorizontal: spacing.s20,
    paddingBottom: spacing.s6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.s10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.glassBorderSoft,
    marginTop: spacing.s12,
  },
  matchesRow: {
    gap: spacing.s12,
  },
  matchItem: {
    alignItems: 'center',
    width: sizes.s90,
  },
  avatarWrapper: {
    width: sizes.s86,
    height: sizes.s86,
    borderRadius: semanticRadii.pill,
    borderWidth: 1,
    borderColor: colors.lavenderBorder,
    padding: 2,
    marginBottom: spacing.s6,
    backgroundColor: colors.glassSurface,
    shadowOpacity: 0,
    elevation: 0,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: semanticRadii.pill,
    resizeMode: 'cover',
  },
  matchName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chatList: {
    paddingHorizontal: spacing.s20,
    paddingBottom: spacing.lg,
  },
  chatRow: {
    flexDirection: 'row',
    paddingVertical: spacing.s14,
    paddingHorizontal: spacing.s16,
    marginBottom: spacing.s12,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glassSurface,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    shadowOpacity: 0,
    elevation: 0,
  },
  chatAvatar: {
    width: sizes.s48,
    height: sizes.s48,
    borderRadius: semanticRadii.pill,
    marginLeft: spacing.s6,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    resizeMode: 'cover',
  },
  chatBody: {
    flex: 1,
    marginLeft: spacing.s14,
    paddingRight: spacing.s6,
    gap: spacing.s6,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
  },
  chatTime: {
    fontSize: 11,
  },
  chatPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chatPreview: {
    flex: 1,
    fontSize: 12,
  },
  unreadBadge: {
    minWidth: spacing.s18,
    height: spacing.s18,
    borderRadius: semanticRadii.pill,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  unreadText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
