import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../../lib/theme';

const TABS = [
  { name: 'index',   label: 'Budget',  color: theme.heroCard },
  { name: 'prices',  label: 'Prices',  color: theme.heroPrices },
  { name: 'pantry',  label: 'Pantry',  color: theme.heroPantry },
  { name: 'recipes', label: 'Recipes', color: theme.heroRecipes },
];

// Cast to any so TypeScript doesn't complain about SVG elements in RN context.
// On web (PWA) these render as real SVG; on native falls back to View-based mark.
const Svg = 'svg' as any;
const Path = 'path' as any;

function PenMark({ color }: { color: string }) {
  if (Platform.OS !== 'web') {
    return (
      <View style={s.penWrap}>
        <View style={[s.penBody, { backgroundColor: color }]} />
        <View style={[s.penTip, { borderLeftColor: color }]} />
      </View>
    );
  }
  return (
    <View style={s.penWrap}>
      <Svg width="68" height="12" viewBox="0 0 68 12">
        {/*
          M 3,4         — start at top of left cap
          A 2 2 0 0 0 3,8 — semicircle arc curving left (rounded pen nib)
          Q 46,7 62,6   — bottom edge curling toward tip
          L 68,6        — tip point
          Q 32,0 3,4    — top edge arching upward back to start
          Z
        */}
        <Path
          d="M 3,4 A 2 2 0 0 0 3,8 Q 46,7 62,6 L 68,6 Q 32,0 3,4 Z"
          fill={color}
        />
      </Svg>
    </View>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
      {TABS.map((tab, index) => {
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes[index].key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(tab.name);
        };
        return (
          <TouchableOpacity
            key={tab.name}
            onPress={onPress}
            style={s.tabBtn}
            activeOpacity={0.7}
          >
            <Text style={[s.tabLabel, { color: focused ? tab.color : theme.textFaint }]}>
              {tab.label}
            </Text>
            <View style={s.underlineSlot}>
              {focused && <PenMark color={tab.color} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Budget' }} />
      <Tabs.Screen name="prices"  options={{ title: 'Prices' }} />
      <Tabs.Screen name="pantry"  options={{ title: 'Pantry' }} />
      <Tabs.Screen name="recipes" options={{ title: 'Recipes' }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    paddingTop: 16,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  underlineSlot: {
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  penWrap: {
    transform: [{ rotate: '-1.5deg' }],
  },
  // Native fallback only
  penBody: {
    height: 3,
    width: 44,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  penTip: {
    width: 0,
    height: 0,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderLeftWidth: 11,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
});
