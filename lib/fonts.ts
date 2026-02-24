import { Platform } from 'react-native';

const isAndroid = Platform.OS === 'android';

export const Fonts = {
  regular: isAndroid ? 'sans-serif' : 'Inter_400Regular',
  medium: isAndroid ? 'sans-serif-medium' : 'Inter_500Medium',
  semibold: isAndroid ? 'sans-serif-medium' : 'GilroyBold',
  bold: isAndroid ? 'sans-serif-medium' : 'GilroyBold',
  extraBold: isAndroid ? 'sans-serif-medium' : 'GilroyBlack',
  serif: isAndroid ? 'serif' : 'CirkaBold',
  serifRegular: isAndroid ? 'serif' : 'CirkaRegular',
};
