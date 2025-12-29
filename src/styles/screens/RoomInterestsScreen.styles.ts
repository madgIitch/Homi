import { StyleSheet } from 'react-native';
import {
  borderRadius,
  colors,
  semanticRadii,
  semanticSizes,
  spacing,
} from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: spacing.lg,
  },
  roomBanner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.s12,
    backgroundColor: colors.surfaceLight,
  },
  roomLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  roomTitle: {
    marginTop: spacing.xs,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.s10,
    fontSize: 14,
    color: colors.textSecondary,
  },
  content: {
    padding: spacing.s20,
    gap: spacing.s20,
  },
  section: {
    gap: spacing.s12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  emptyStateInline: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  emptyTitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: spacing.s6,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  assignmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.s14,
    borderRadius: semanticRadii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.s14,
    borderRadius: semanticRadii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  avatar: {
    width: semanticSizes.avatarSm,
    height: semanticSizes.avatarSm,
    borderRadius: borderRadius.xxl,
    backgroundColor: colors.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.s12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontWeight: '700',
    color: colors.indigo,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  cardSubtitle: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textSecondary,
  },
  assignButton: {
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.sm,
    borderRadius: semanticRadii.pill,
    backgroundColor: colors.primary,
  },
  assignButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.background,
  },
  assignOwnerButton: {
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.sm,
    borderRadius: semanticRadii.pill,
    backgroundColor: colors.primary,
  },
  assignOwnerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.background,
  },
  removeButton: {
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.sm,
    borderRadius: semanticRadii.pill,
    backgroundColor: colors.errorLight,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
