import { StyleSheet } from 'react-native';
import {
  borderRadius,
  colors,
  semanticRadii,
  semanticSizes,
  sizes,
  spacing,
} from '../../theme';
import { commonStyles } from '../common';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s20,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: spacing.s20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.s10,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s10,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.s10,
    borderRadius: semanticRadii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  segmentButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentButtonTextActive: {
    color: colors.background,
  },
  budgetValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  footer: {
    padding: spacing.s20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  noticeCard: {
    borderRadius: semanticRadii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.sm,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  noticeText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  rulesList: {
    gap: spacing.s12,
  },
  ruleBlock: {
    gap: spacing.sm,
  },
  ruleTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  ruleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s10,
  },
  ruleChip: {
    ...commonStyles.chip,
  },
  ruleChipActive: {
    borderColor: colors.text,
    backgroundColor: colors.text,
  },
  ruleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  ruleChipTextActive: {
    color: colors.background,
  },
  sliderTrack: {
    height: spacing.s6,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.border,
  },
  sliderContainer: {
    paddingVertical: spacing.s12,
    position: 'relative',
    minHeight: semanticSizes.control,
  },
  sliderTrackActive: {
    position: 'absolute',
    height: spacing.s6,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.text,
  },
  sliderThumb: {
    position: 'absolute',
    width: spacing.s20,
    height: spacing.s20,
    borderRadius: borderRadius.s10,
    backgroundColor: colors.text,
    borderWidth: 2,
    borderColor: colors.background,
    top: -7,
  },
  sliderTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sliderTick: {
    width: spacing.xxs,
    height: spacing.s6,
    backgroundColor: colors.disabled,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.s6,
  },
  sliderLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
