import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { C, FACE, FaceVariant } from '@/theme/neo';
import { tap } from '@/lib/tap';

export interface ExtrudedProps {
  face?: FaceVariant | { right: string; bottom: string };
  depth?: number;
  pressable?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  bg?: string;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  disabled?: boolean;
}

export function Extruded({
  face = 'dark',
  depth = 3,
  pressable = false,
  onPress,
  onLongPress,
  bg = C.surface,
  borderColor = C.border,
  style,
  contentStyle,
  children,
  disabled = false,
}: ExtrudedProps) {
  const isPressed = useSharedValue(0);

  const faceColors = typeof face === 'string' ? (FACE[face] || FACE.dark) : face;
  const d = disabled ? 0 : depth;

  const handlePressIn = () => {
    if (disabled || !pressable) return;
    isPressed.value = withTiming(1, {
      duration: 60,
      easing: Easing.out(Easing.ease),
    });
  };

  const handlePressOut = () => {
    if (disabled || !pressable) return;
    isPressed.value = withTiming(0, {
      duration: 80,
      easing: Easing.out(Easing.ease),
    });
  };

  const animatedContentStyle = useAnimatedStyle(() => {
    if (!pressable) return {};
    const offset = d * isPressed.value;
    return {
      transform: [
        { translateX: offset },
        { translateY: offset },
      ],
    };
  });

  const animatedFacesStyle = useAnimatedStyle(() => {
    if (!pressable) return {};
    return {
      opacity: 1 - isPressed.value,
    };
  });

  const contentBox = (
    <Animated.View
      style={[
        styles.content,
        {
          backgroundColor: disabled ? C.surface2 : bg,
          borderColor: disabled ? C.border : borderColor,
        },
        contentStyle,
        pressable && animatedContentStyle,
      ]}
    >
      {children}
    </Animated.View>
  );

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingRight: d,
          paddingBottom: d,
        },
        style,
      ]}
    >
      {/* 3D Extrusion Faces - Pure Native Views (0ms layout, 120fps) */}
      {d > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, animatedFacesStyle]}
        >
          {/* Right Face (Full height, width d, with 45° chamfers) */}
          <View
            style={[
              styles.rightFaceContainer,
              { width: d },
            ]}
          >
            {/* Top 45° Chamfer */}
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: d,
                borderLeftColor: 'transparent',
                borderBottomWidth: d,
                borderBottomColor: disabled ? C.border : faceColors.right,
              }}
            />
            {/* Main Right Slab */}
            <View
              style={{
                flex: 1,
                backgroundColor: disabled ? C.border : faceColors.right,
              }}
            />
            {/* Bottom 45° Chamfer */}
            <View
              style={{
                width: 0,
                height: 0,
                borderRightWidth: d,
                borderRightColor: 'transparent',
                borderTopWidth: d,
                borderTopColor: disabled ? C.border : faceColors.right,
              }}
            />
          </View>

          {/* Bottom Face (Full width, height d, with 45° chamfers) */}
          <View
            style={[
              styles.bottomFaceContainer,
              { height: d },
            ]}
          >
            {/* Left 45° Chamfer */}
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: d,
                borderLeftColor: 'transparent',
                borderBottomWidth: d,
                borderBottomColor: disabled ? C.border : faceColors.bottom,
              }}
            />
            {/* Main Bottom Slab */}
            <View
              style={{
                flex: 1,
                backgroundColor: disabled ? C.border : faceColors.bottom,
              }}
            />
            {/* Right 45° Chamfer */}
            <View
              style={{
                width: 0,
                height: 0,
                borderRightWidth: d,
                borderRightColor: 'transparent',
                borderTopWidth: d,
                borderTopColor: disabled ? C.border : faceColors.bottom,
              }}
            />
          </View>
        </Animated.View>
      )}

      {pressable ? (
        <Pressable
          disabled={disabled}
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.pressable}
        >
          {contentBox}
        </Pressable>
      ) : (
        contentBox
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  pressable: {
    width: '100%',
  },
  content: {
    borderRadius: 0,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rightFaceContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'column',
  },
  bottomFaceContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
});
