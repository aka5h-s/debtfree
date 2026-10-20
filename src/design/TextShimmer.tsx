import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, TextStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { C, T, formatRupees } from './tokens';

export interface TextShimmerProps {
  amount: number;
  fontSize?: number;
  style?: TextStyle;
}

export function TextShimmer({
  amount,
  fontSize = 48,
  style,
}: TextShimmerProps) {
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useSharedValue(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const isNegative = amount < 0;
  const formattedText = formatRupees(amount);

  const scheduleNextSweep = () => {
    if (!isMountedRef.current || textWidth <= 0 || isNegative) return;

    // random pause between 1.5s and 4.0s
    const randomPause = 1500 + Math.random() * 2500;

    timeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      // Start at -textWidth * 1.5, sweep left -> right to 0 in 1.2s
      translateX.value = -textWidth * 1.5;
      translateX.value = withTiming(
        0,
        {
          duration: 1200,
          easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        },
        (finished) => {
          if (finished) {
            runOnJS(scheduleNextSweep)();
          }
        }
      );
    }, randomPause);
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (textWidth > 0 && !isNegative) {
      // Start immediately on first mount or layout
      translateX.value = -textWidth * 1.5;
      translateX.value = withTiming(
        0,
        {
          duration: 1200,
          easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        },
        (finished) => {
          if (finished) {
            runOnJS(scheduleNextSweep)();
          }
        }
      );
    }

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [textWidth, isNegative, amount]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - textWidth) > 2) {
      setTextWidth(w);
    }
  };

  const animatedGradientStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // If negative, plain red without shimmer
  if (isNegative) {
    return (
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={[
          T.display,
          {
            fontSize,
            color: C.negative,
          },
          style,
        ]}
      >
        {formattedText}
      </Text>
    );
  }

  // Measure pass if width not yet known
  if (textWidth === 0) {
    return (
      <View style={{ opacity: 0 }}>
        <Text
          onLayout={onLayout}
          numberOfLines={1}
          style={[
            T.display,
            {
              fontSize,
              color: C.foreground,
            },
            style,
          ]}
        >
          {formattedText}
        </Text>
      </View>
    );
  }

  const gradientWidth = textWidth * 2.5;

  return (
    <View style={{ width: textWidth, height: fontSize * 1.25, overflow: 'hidden' }}>
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <View style={[StyleSheet.absoluteFill, { justifyContent: 'center' }]}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={[
                T.display,
                {
                  fontSize,
                  color: '#000000',
                },
                style,
              ]}
            >
              {formattedText}
            </Text>
          </View>
        }
      >
        <Animated.View
          style={[
            {
              width: gradientWidth,
              height: '100%',
            },
            animatedGradientStyle,
          ]}
        >
          <LinearGradient
            colors={[
              C.foreground,
              C.foreground,
              C.primary,
              C.foreground,
              C.foreground,
            ]}
            locations={[0, 0.35, 0.5, 0.65, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </MaskedView>
    </View>
  );
}
