import React from 'react';
import { Text, Platform } from 'react-native';

const ioniconsGlyphMap: Record<string, number> = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
const materialCommunityGlyphMap: Record<string, number> = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');
const featherGlyphMap: Record<string, number> = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Feather.json');

type IconFamily = 'ionicons' | 'material-community' | 'feather';

const isAndroid = Platform.OS === 'android';

const FONT_MAP: Record<IconFamily, { glyphMap: Record<string, number>; fontFamily: string }> = {
  ionicons: {
    glyphMap: ioniconsGlyphMap,
    fontFamily: isAndroid ? 'Ionicons' : 'ionicons',
  },
  'material-community': {
    glyphMap: materialCommunityGlyphMap,
    fontFamily: isAndroid ? 'Material Design Icons' : 'material-community',
  },
  feather: {
    glyphMap: featherGlyphMap,
    fontFamily: isAndroid ? 'Feather' : 'feather',
  },
};

interface IconProps {
  family?: IconFamily;
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export function Icon({ family = 'ionicons', name, size = 24, color = '#FFFFFF', style }: IconProps) {
  const config = FONT_MAP[family];
  if (!config) return null;

  const glyphCode = config.glyphMap[name];
  if (glyphCode === undefined) {
    if (__DEV__) {
      console.warn(`Icon "${name}" not found in "${family}" glyph map`);
    }
    return null;
  }

  const glyph = String.fromCodePoint(glyphCode);

  return (
    <Text
      selectable={false}
      allowFontScaling={false}
      style={[
        {
          fontSize: size,
          color,
          fontFamily: config.fontFamily,
          fontWeight: 'normal',
          fontStyle: 'normal',
        },
        style,
      ]}
    >
      {glyph}
    </Text>
  );
}
