import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme, { fonts } from '../../lib/theme';

const TABS = [
  { name: 'index',   label: 'Budget',  color: theme.heroCard },
  { name: 'prices',  label: 'Prices',  color: theme.heroPrices },
  { name: 'pantry',  label: 'Pantry',  color: theme.heroPantry },
  { name: 'recipes', label: 'Recipes', color: theme.heroRecipes },
];

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.tabBar, { paddingBottom: insets.bottom }]}>
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
            style={[s.tabBtn, { borderTopColor: focused ? tab.color : theme.border }]}
            activeOpacity={0.7}
          >
            <Text style={[s.tabLabel, { color: focused ? tab.color : theme.textFaint }]}>
              {tab.label}
            </Text>
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
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 10,
    borderTopWidth: 2,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: fonts.display,
    letterSpacing: 0.2,
  },
});
