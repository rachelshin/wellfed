import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../../lib/theme';

const TABS = [
  { name: 'index',   label: 'Budget',  color: theme.heroCard },
  { name: 'prices',  label: 'Prices',  color: theme.heroPrices },
  { name: 'pantry',  label: 'Pantry',  color: theme.heroPantry },
  { name: 'recipes', label: 'Recipes', color: theme.heroRecipes },
];

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
              {focused && (
                <View style={[s.activeBar, { backgroundColor: tab.color }]} />
              )}
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
    height: 6,
    width: 40,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 5,
  },
  activeBar: {
    position: 'absolute',
    bottom: 0,
    left: 2,
    right: 0,
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: '-2deg' }, { scaleX: 0.85 }],
  },
});
