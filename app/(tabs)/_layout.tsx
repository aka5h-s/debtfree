import React from 'react';
import { Tabs } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutGrid, Wallet, UserRound } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { C, T, haptic } from '@/src/design';

function NeoTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          paddingBottom: bottomPadding,
          height: 64 + bottomPadding,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        let label = 'Home';
        let IconComponent = LayoutGrid;

        if (route.name === 'index') {
          label = 'Home';
          IconComponent = LayoutGrid;
        } else if (route.name === 'cards') {
          label = 'Finances';
          IconComponent = Wallet;
        } else if (route.name === 'cloud') {
          label = 'Profile';
          IconComponent = UserRound;
        }

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            haptic('light');
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            android_ripple={null}
            style={styles.tabItem}
          >
            <IconComponent
              size={20}
              color={isFocused ? C.primary : C.mutedFg}
              strokeWidth={isFocused ? 2.5 : 1.8}
            />

            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? C.primary : C.mutedFg },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <NeoTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="cards" options={{ title: 'Finances' }} />
      <Tabs.Screen name="cloud" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: C.background,
    borderTopWidth: 1,
    borderTopColor: C.border,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
    gap: 4,
  },
  tabLabel: {
    ...T.caps,
    fontSize: 9,
    letterSpacing: 1.5,
  },
});
