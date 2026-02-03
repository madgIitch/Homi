import React from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import { BUDGET_MAX, BUDGET_MIN, BUDGET_STEP } from '../constants/swipeFilters';
import { DualRangeSlider } from './DualRangeSlider';

type SliderStyles = {
  sliderContainer: ViewStyle;
  sliderTrack: ViewStyle;
  sliderTrackActive: ViewStyle;
  sliderThumb: ViewStyle;
  sliderTicks?: ViewStyle;
  sliderTick?: ViewStyle;
  sliderLabels?: ViewStyle;
  sliderLabel?: TextStyle;
};

type BudgetRangeSliderProps = {
  styles: SliderStyles;
  minValue: number;
  maxValue: number;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
  onDragStateChange?: (isDragging: boolean) => void;
  showTicks?: boolean;
  showLabels?: boolean;
  labels?: string[];
  hitSlopSize?: number;
  thumbOffset?: number;
};

export const BudgetRangeSlider: React.FC<BudgetRangeSliderProps> = ({
  styles,
  minValue,
  maxValue,
  onChangeMin,
  onChangeMax,
  onDragStateChange,
  showTicks = false,
  showLabels = true,
  labels,
  hitSlopSize,
  thumbOffset,
}) => (
  <DualRangeSlider
    minValue={minValue}
    maxValue={maxValue}
    onChangeMin={onChangeMin}
    onChangeMax={onChangeMax}
    rangeMin={BUDGET_MIN}
    rangeMax={BUDGET_MAX}
    step={BUDGET_STEP}
    showTicks={showTicks}
    tickCount={Math.floor((BUDGET_MAX - BUDGET_MIN) / BUDGET_STEP) + 1}
    labels={labels}
    showLabels={showLabels}
    onDragStateChange={onDragStateChange}
    containerStyle={{ paddingVertical: 0 }}
    sliderContainerStyle={styles.sliderContainer}
    trackStyle={styles.sliderTrack}
    activeTrackStyle={styles.sliderTrackActive}
    thumbStyle={styles.sliderThumb}
    tickStyle={styles.sliderTick}
    ticksContainerStyle={styles.sliderTicks}
    labelStyle={styles.sliderLabel}
    labelsContainerStyle={styles.sliderLabels}
    hitSlopSize={hitSlopSize}
    thumbOffset={thumbOffset}
  />
);
