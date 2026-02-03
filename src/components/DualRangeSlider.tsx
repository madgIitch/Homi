import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface DualRangeSliderProps {
  // Values
  minValue: number;
  maxValue: number;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;

  // Range configuration
  rangeMin: number;
  rangeMax: number;
  step: number;

  // Visual configuration
  showTicks?: boolean;
  tickCount?: number;
  labels?: string[];
  showLabels?: boolean;

  // Callbacks
  onDragStateChange?: (isDragging: boolean) => void;

  // Style overrides
  containerStyle?: ViewStyle;
  sliderContainerStyle?: ViewStyle;
  trackStyle?: ViewStyle;
  activeTrackStyle?: ViewStyle;
  thumbStyle?: ViewStyle;
  labelStyle?: TextStyle;
  tickStyle?: ViewStyle;
  ticksContainerStyle?: ViewStyle;
  labelsContainerStyle?: ViewStyle;

  // Hit slop configuration
  hitSlopSize?: number;

  // Thumb offset (for fine-tuning positioning)
  thumbOffset?: number;

  // Debug mode
  debug?: boolean;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  minValue,
  maxValue,
  onChangeMin,
  onChangeMax,
  rangeMin,
  rangeMax,
  step,
  showTicks = false,
  tickCount,
  labels,
  showLabels = true,
  onDragStateChange,
  containerStyle,
  sliderContainerStyle,
  trackStyle,
  activeTrackStyle,
  thumbStyle,
  labelStyle,
  tickStyle,
  ticksContainerStyle,
  labelsContainerStyle,
  hitSlopSize = 10,
  thumbOffset = 10,
  debug = false,
}) => {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const minValueRef = useRef(minValue);
  const maxValueRef = useRef(maxValue);
  const activeThumbRef = useRef<'min' | 'max' | null>(null);
  const startTouchRef = useRef(0);
  const minStartRef = useRef(0);
  const maxStartRef = useRef(0);

  useEffect(() => {
    minValueRef.current = minValue;
    maxValueRef.current = maxValue;
  }, [minValue, maxValue]);

  const snapToStep = (value: number) => Math.round(value / step) * step;

  const valueToX = (value: number) => {
    if (!trackWidth) return 0;
    return ((value - rangeMin) / (rangeMax - rangeMin)) * trackWidth;
  };

  const xToValue = (x: number) => {
    if (!trackWidth) return rangeMin;
    const raw = rangeMin + (x / trackWidth) * (rangeMax - rangeMin);
    return clamp(snapToStep(raw), rangeMin, rangeMax);
  };

  const minX = valueToX(minValue);
  const maxX = valueToX(maxValue);

  // Calculate tick count
  const calculatedTickCount = tickCount ?? Math.floor((rangeMax - rangeMin) / step) + 1;

  // Default styles
  const defaultTrackStyle: ViewStyle = {
    height: 4,
    backgroundColor: theme.colors.glassBorderSoft,
    borderRadius: theme.borderRadius.full,
  };

  const defaultActiveTrackStyle: ViewStyle = {
    position: 'absolute',
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  };

  const defaultThumbStyle: ViewStyle = {
    position: 'absolute',
    width: theme.spacing.s20,
    height: theme.spacing.s20,
    borderRadius: theme.borderRadius.full / 2,
    backgroundColor: theme.colors.text,
    borderWidth: 2,
    borderColor: theme.colors.background,
  };

  const defaultLabelStyle: TextStyle = {
    fontSize: 12,
    color: theme.colors.textSecondary,
  };

  const defaultTickStyle: ViewStyle = {
    width: 1,
    height: 8,
    backgroundColor: theme.colors.glassBorderSoft,
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View
        style={[styles.sliderContainer, sliderContainerStyle]}
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          if (debug) {
            console.log('[DualRangeSlider] layout width', width);
          }
          setTrackWidth(width);
        }}
        pointerEvents="box-only"
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => {
          if (!trackWidth) {
            if (debug) {
              console.log('[DualRangeSlider] grant blocked, trackWidth=0');
            }
            return;
          }
          onDragStateChange?.(true);
          const touchX = event.nativeEvent.locationX;
          if (debug) {
            console.log('[DualRangeSlider] grant', {
              trackWidth,
              touchX,
              minValue: minValueRef.current,
              maxValue: maxValueRef.current,
            });
          }
          startTouchRef.current = touchX;
          const minPos = valueToX(minValueRef.current);
          const maxPos = valueToX(maxValueRef.current);
          activeThumbRef.current =
            Math.abs(touchX - minPos) <= Math.abs(touchX - maxPos) ? 'min' : 'max';
          if (debug) {
            console.log('[DualRangeSlider] activeThumb', activeThumbRef.current, {
              minPos,
              maxPos,
            });
          }
          minStartRef.current = minPos;
          maxStartRef.current = maxPos;
        }}
        onResponderMove={(event) => {
          if (!trackWidth || !activeThumbRef.current) return;
          const nextX = clamp(event.nativeEvent.locationX, 0, trackWidth);
          if (activeThumbRef.current === 'min') {
            const bounded = clamp(nextX, 0, valueToX(maxValueRef.current));
            onChangeMin(xToValue(bounded));
          } else {
            const bounded = clamp(nextX, valueToX(minValueRef.current), trackWidth);
            onChangeMax(xToValue(bounded));
          }
        }}
        onResponderRelease={() => {
          activeThumbRef.current = null;
          onDragStateChange?.(false);
        }}
        onResponderTerminate={() => {
          activeThumbRef.current = null;
          onDragStateChange?.(false);
        }}
      >
        {/* Track */}
        <View style={[defaultTrackStyle, trackStyle]} />

        {/* Active track */}
        <View
          style={[
            defaultActiveTrackStyle,
            activeTrackStyle,
            { left: minX, width: Math.max(0, maxX - minX) },
          ]}
        />

        {/* Min thumb */}
        <View
          style={[defaultThumbStyle, thumbStyle, { left: minX - thumbOffset }]}
          hitSlop={{
            top: hitSlopSize,
            bottom: hitSlopSize,
            left: hitSlopSize,
            right: hitSlopSize,
          }}
        />

        {/* Max thumb */}
        <View
          style={[defaultThumbStyle, thumbStyle, { left: maxX - thumbOffset }]}
          hitSlop={{
            top: hitSlopSize,
            bottom: hitSlopSize,
            left: hitSlopSize,
            right: hitSlopSize,
          }}
        />
      </View>

      {/* Ticks */}
      {showTicks && (
        <View style={[styles.ticksContainer, ticksContainerStyle]}>
          {Array.from({ length: calculatedTickCount }).map((_, index) => (
            <View key={`tick-${index}`} style={[defaultTickStyle, tickStyle]} />
          ))}
        </View>
      )}

      {/* Labels */}
      {showLabels && labels && labels.length > 0 && (
        <View style={[styles.labelsContainer, labelsContainerStyle]}>
          {labels.map((label, index) => (
            <Text key={`label-${index}`} style={[defaultLabelStyle, labelStyle]}>
              {label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  sliderContainer: {
    height: 32,
    justifyContent: 'center',
  },
  ticksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 0,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
});
