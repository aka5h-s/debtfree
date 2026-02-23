import { Platform, TextStyle } from 'react-native';

const isAndroid = Platform.OS === 'android';

export const Fonts = {
  regular: isAndroid ? 'sans-serif' : 'Outfit_400Regular',
  medium: isAndroid ? 'sans-serif-medium' : 'Outfit_500Medium',
  semibold: isAndroid ? 'sans-serif-medium' : 'Outfit_600SemiBold',
  bold: isAndroid ? 'sans-serif' : 'Outfit_700Bold',
  extraBold: isAndroid ? 'sans-serif' : 'Outfit_800ExtraBold',
  serif: isAndroid ? 'serif' : 'DMSerifDisplay_400Regular',
};
