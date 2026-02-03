import React from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import { ROOMMATES_MAX, ROOMMATES_MIN } from '../constants/swipeFilters';
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

type RoommatesRangeSliderProps = {
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

export const RoommatesRangeSlider: React.FC<RoommatesRangeSliderProps> = ({
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
    rangeMin={ROOMMATES_MIN}
    rangeMax={ROOMMATES_MAX}
    step={1}
    showTicks={showTicks}
    tickCount={ROOMMATES_MAX - ROOMMATES_MIN + 1}
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
