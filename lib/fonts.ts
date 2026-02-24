import { Platform } from 'react-native';

const isAndroid = Platform.OS === 'android';

export const Fonts = {
  regular: isAndroid ? 'Poppins_400Regular' : 'GilroyBold',
  medium: isAndroid ? 'Poppins_500Medium' : 'GilroyBold',
  semibold: isAndroid ? 'Poppins_600SemiBold' : 'GilroyBold',
  bold: isAndroid ? 'Poppins_700Bold' : 'GilroyBold',
  extraBold: isAndroid ? 'Poppins_900Black' : 'GilroyBlack',
  serif: isAndroid ? 'DMSerifDisplay_400Regular' : 'CirkaBold',
};
