import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { C, FONT } from '@/theme/neo';
import { formatIndianCurrency } from './Amount';

export interface NetShimmerAmountProps {
  value: number;
  style?: StyleProp<ViewStyle>;
}

export function NetShimmerAmount({ value, style }: NetShimmerAmountProps) {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  const formatted = `${isNegative ? '−' : ''}${formatIndianCurrency(absValue)}`;

  const [textWidth, setTextWidth] = useState(0);
  const [textHeight, setTextHeight] = useState(0);
  const translateX = useSharedValue(-500);
  const isMountedRef = useRef(true);
  const timeoutRef = useRef<any>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && Math.abs(width - textWidth) > 2) {
      setTextWidth(width);
      setTextHeight(height);
    }
  };

  const scheduleNextSweep = useCallback((pauseMs: number) => {
    if (!isMountedRef.current) return;
    timeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      startSweep();
    }, pauseMs);
  }, [textWidth]);

  const startSweep = useCallback(() => {
    if (textWidth <= 0 || !isMountedRef.current || isNegative) return;

    const startX = -textWidth * 1.5;
    const endX = textWidth * 1.2;
    translateX.value = startX;

    // Random duration between 2.8s and 4.2s (avg 3.5s)
    const sweepDuration = 2800 + Math.random() * 1400;

    translateX.value = withTiming(
      endX,
      {
        duration: sweepDuration,
        easing: Easing.linear,
      },
      (finished) => {
        if (finished) {
          // Random pause between 0.8s and 3.0s
          const pauseMs = 800 + Math.random() * 2200;
          runOnJS(scheduleNextSweep)(pauseMs);
        }
      }
    );
  }, [textWidth, isNegative, scheduleNextSweep]);

  useEffect(() => {
    isMountedRef.current = true;
    if (textWidth > 0 && !isNegative) {
      startSweep();
    }
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [textWidth, isNegative, startSweep]);

  const animatedGradientStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // If negative, render plain red with leading "−", no shimmer
  if (isNegative) {
    return (
      <View style={[styles.container, style]}>
        <Text
          numberOfLines={1}
          style={[styles.amountText, { color: C.red }]}
        >
          {formatted}
        </Text>
      </View>
    );
  }

  // Base rendered text while calculating width
  const maskText = (
    <Text
      numberOfLines={1}
      onLayout={onLayout}
      style={[styles.amountText, { color: '#000000' }]}
    >
      {formatted}
    </Text>
  );

  return (
    <View style={[styles.container, style]}>
      {textWidth > 0 ? (
        <MaskedView
          style={{ width: textWidth, height: textHeight || 58 }}
          maskElement={maskText}
        >
          {/* Base white text background to guarantee full opacity at all times */}
          <Text
            numberOfLines={1}
            style={[styles.amountText, { position: 'absolute', left: 0, top: 0, color: C.white }]}
          >
            {formatted}
          </Text>

          {/* Sweeping LinearGradient with yellow light band */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: textWidth * 2.5,
              },
              animatedGradientStyle,
            ]}
          >
            <LinearGradient
              colors={[
                '#FFFFFF',
                '#FFFFFF',
                '#E5FE40',
                '#FFFFFF',
                '#FFFFFF',
              ]}
              locations={[0, 0.35, 0.50, 0.65, 1.0]}
              start={{ x: 0, y: 0.1 }}
              end={{ x: 1, y: 0.9 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </MaskedView>
      ) : (
        <Text
          numberOfLines={1}
          onLayout={onLayout}
          style={[styles.amountText, { color: C.white }]}
        >
          {formatted}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  amountText: {
    fontFamily: FONT.display,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
});
