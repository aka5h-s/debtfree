import { Platform } from 'react-native';

const isAndroid = Platform.OS === 'android';

export const Fonts = {
  regular: isAndroid ? 'Gilroy-Bold' : 'GilroyBold',
  medium: isAndroid ? 'Gilroy-Bold' : 'GilroyBold',
  semibold: isAndroid ? 'Gilroy-Bold' : 'GilroyBold',
  bold: isAndroid ? 'Gilroy-Bold' : 'GilroyBold',
  extraBold: isAndroid ? 'Gilroy-Black' : 'GilroyBlack',
  serif: isAndroid ? 'Cirka-Bold' : 'CirkaBold',
};
