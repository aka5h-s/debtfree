import { Platform } from 'react-native';

const isAndroid = Platform.OS === 'android';

export const Fonts = {
  regular: isAndroid ? 'sans-serif' : 'GilroyBold',
  medium: isAndroid ? 'sans-serif-medium' : 'GilroyBold',
  semibold: isAndroid ? 'sans-serif-medium' : 'GilroyBold',
  bold: isAndroid ? 'sans-serif-medium' : 'GilroyBold',
  extraBold: isAndroid ? 'sans-serif-medium' : 'GilroyBlack',
  serif: isAndroid ? 'serif' : 'CirkaBold',
};
